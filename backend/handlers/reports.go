package handlers

import (
	"encoding/json"
	"math"
	"net/http"
	"sort"
	"time"

	"portfoliopro-backend/database"
	"portfoliopro-backend/models"

	"github.com/gin-gonic/gin"
)

type customerStat struct {
	UserID      uint    `json:"user_id"`
	Name        string  `json:"name"`
	Email       string  `json:"email"`
	OrderCount  int     `json:"order_count"`
	Revenue     float64 `json:"revenue"`
	AmountDue   float64 `json:"amount_due"`
}

// AdminReports returns sales + customer analytics for a date range.
// Query: from=YYYY-MM-DD&to=YYYY-MM-DD (inclusive, Bangkok/local TZ)
func AdminReports(c *gin.Context) {
	start, end, err := parseReportRange(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var ordersInRange []models.Order
	database.DB.Where("created_at >= ? AND created_at < ?", start, end).
		Order("created_at DESC").Find(&ordersInRange)

	revenueCollected := collectedRevenueInRange(start, end)

	var ordersPaidInRange int64
	database.DB.Model(&models.Order{}).
		Where("paid_at IS NOT NULL AND paid_at >= ? AND paid_at < ?", start, end).
		Where("status IN ?", []string{"successful", "deposit_paid"}).
		Count(&ordersPaidInRange)

	var contactsInRange int64
	database.DB.Model(&models.Contact{}).
		Where("created_at >= ? AND created_at < ?", start, end).Count(&contactsInRange)

	var quotationsInRange int64
	database.DB.Model(&models.Quotation{}).
		Where("created_at >= ? AND created_at < ?", start, end).Count(&quotationsInRange)

	var projectsInRange int64
	database.DB.Model(&models.Project{}).
		Where("created_at >= ? AND created_at < ?", start, end).Count(&projectsInRange)

	avgOrder := 0.0
	if ordersPaidInRange > 0 {
		avgOrder = math.Round(revenueCollected/float64(ordersPaidInRange)*100) / 100
	}

	conversionRate := 0.0
	if len(ordersInRange) > 0 {
		conversionRate = math.Round(float64(ordersPaidInRange)/float64(len(ordersInRange))*1000) / 10
	}

	leadToPaid := 0.0
	leads := contactsInRange + quotationsInRange
	if leads > 0 {
		leadToPaid = math.Round(float64(ordersPaidInRange)/float64(leads)*1000) / 10
	}

	topPackages := topPackagesInRange(start, end, 10)
	byStatus := orderStatusBreakdown(ordersInRange)
	byPayment := paymentMethodBreakdown(ordersInRange)
	daily := dailyRevenueInRange(start, end)
	topCustomers := topCustomersByRevenue(start, end, 10)
	repeatCustomers := countRepeatCustomers(start, end)
	balanceDue := fetchBalanceDueCustomers(10)

	rfmAll := computeRFM(50)

	c.JSON(http.StatusOK, gin.H{
		"from": start.Format("2006-01-02"),
		"to":   end.Add(-24 * time.Hour).Format("2006-01-02"),
		"summary": gin.H{
			"revenue_collected": revenueCollected,
			"orders_created":    len(ordersInRange),
			"orders_paid":       ordersPaidInRange,
			"avg_order_value":   avgOrder,
			"conversion_rate":   conversionRate,
			"lead_to_paid_rate": leadToPaid,
		},
		"funnel": gin.H{
			"contacts":   contactsInRange,
			"quotations": quotationsInRange,
			"orders":     int64(len(ordersInRange)),
			"paid":       ordersPaidInRange,
			"projects":   projectsInRange,
		},
		"web_funnel":          webFunnelInRange(start, end),
		"top_pages":           topPagesInRange(start, end, 10),
		"top_packages":        topPackages,
		"by_status":           byStatus,
		"by_payment_method":   byPayment,
		"daily_revenue":       daily,
		"top_customers":       topCustomers,
		"repeat_customers":    repeatCustomers,
		"balance_due":         balanceDue,
		"clv":                 computeCLVSummary(),
		"rfm":                 rfmAll,
		"rfm_segments":        rfmSegmentSummary(rfmAll),
		"cohorts":             computeCohorts(6),
	})
}

func parseReportRange(c *gin.Context) (time.Time, time.Time, error) {
	loc := time.Now().Location()
	now := time.Now()

	parseDay := func(s string) (time.Time, error) {
		t, err := time.ParseInLocation("2006-01-02", s, loc)
		if err != nil {
			return time.Time{}, err
		}
		return t, nil
	}

	fromStr := c.Query("from")
	toStr := c.Query("to")

	var start, end time.Time
	if fromStr == "" && toStr == "" {
		start = time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, loc)
		end = time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, loc).AddDate(0, 0, 1)
		return start, end, nil
	}

	if fromStr != "" {
		var err error
		start, err = parseDay(fromStr)
		if err != nil {
			return time.Time{}, time.Time{}, errInvalidDate("from")
		}
	} else {
		start = time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, loc)
	}

	if toStr != "" {
		t, err := parseDay(toStr)
		if err != nil {
			return time.Time{}, time.Time{}, errInvalidDate("to")
		}
		end = t.AddDate(0, 0, 1)
	} else {
		end = now.AddDate(0, 0, 1)
	}

	if !end.After(start) {
		return time.Time{}, time.Time{}, errInvalidDate("range")
	}
	if end.Sub(start) > 366*24*time.Hour {
		return time.Time{}, time.Time{}, errRangeTooLong()
	}
	return start, end, nil
}

func errInvalidDate(field string) error {
	return &reportDateError{msg: "รูปแบบวันที่ไม่ถูกต้อง (" + field + ") — ใช้ YYYY-MM-DD"}
}

func errRangeTooLong() error {
	return &reportDateError{msg: "ช่วงวันที่ยาวเกิน 366 วัน"}
}

type reportDateError struct{ msg string }

func (e *reportDateError) Error() string { return e.msg }

func topPackagesInRange(start, end time.Time, limit int) []packageStat {
	var orders []models.Order
	database.DB.Where(
		"status IN ? AND paid_at IS NOT NULL AND paid_at >= ? AND paid_at < ?",
		[]string{"successful", "deposit_paid"}, start, end,
	).Find(&orders)

	agg := map[int]*packageStat{}
	for _, order := range orders {
		var items []CartItem
		if err := json.Unmarshal([]byte(order.Items), &items); err != nil || len(items) == 0 {
			continue
		}
		share := orderAmountPaid(&order) / float64(len(items))
		for _, item := range items {
			if _, ok := agg[item.ID]; !ok {
				agg[item.ID] = &packageStat{ID: item.ID, Title: item.Title}
			}
			agg[item.ID].Count++
			agg[item.ID].Revenue += share
		}
	}

	out := make([]packageStat, 0, len(agg))
	for _, s := range agg {
		s.Revenue = math.Round(s.Revenue*100) / 100
		out = append(out, *s)
	}
	sort.Slice(out, func(i, j int) bool {
		if out[i].Count == out[j].Count {
			return out[i].Revenue > out[j].Revenue
		}
		return out[i].Count > out[j].Count
	})
	if len(out) > limit {
		out = out[:limit]
	}
	return out
}

func orderAmountPaid(order *models.Order) float64 {
	if order == nil {
		return 0
	}
	if order.AmountPaid > 0 {
		return order.AmountPaid
	}
	if order.Status == "successful" {
		return order.Total
	}
	return 0
}

func orderStatusBreakdown(orders []models.Order) []gin.H {
	counts := map[string]int{}
	for _, o := range orders {
		counts[o.Status]++
	}
	out := make([]gin.H, 0, len(counts))
	for status, count := range counts {
		out = append(out, gin.H{"status": status, "count": count})
	}
	sort.Slice(out, func(i, j int) bool {
		return out[i]["count"].(int) > out[j]["count"].(int)
	})
	return out
}

func paymentMethodBreakdown(orders []models.Order) []gin.H {
	counts := map[string]int{}
	for _, o := range orders {
		m := o.PaymentMethod
		if m == "" {
			m = "unknown"
		}
		counts[m]++
	}
	out := make([]gin.H, 0, len(counts))
	for method, count := range counts {
		out = append(out, gin.H{"method": method, "count": count})
	}
	sort.Slice(out, func(i, j int) bool {
		return out[i]["count"].(int) > out[j]["count"].(int)
	})
	return out
}

func dailyRevenueInRange(start, end time.Time) []gin.H {
	out := []gin.H{}
	for d := start; d.Before(end); d = d.AddDate(0, 0, 1) {
		dayEnd := d.AddDate(0, 0, 1)
		rev := collectedRevenueInRange(d, dayEnd)
		var cnt int64
		database.DB.Model(&models.Order{}).
			Where("created_at >= ? AND created_at < ?", d, dayEnd).Count(&cnt)
		out = append(out, gin.H{
			"date":    d.Format("2006-01-02"),
			"revenue": rev,
			"orders":  cnt,
		})
	}
	return out
}

func topCustomersByRevenue(start, end time.Time, limit int) []customerStat {
	var orders []models.Order
	database.DB.Where(
		"status IN ? AND paid_at IS NOT NULL AND paid_at >= ? AND paid_at < ?",
		[]string{"successful", "deposit_paid"}, start, end,
	).Find(&orders)

	agg := map[uint]*customerStat{}
	for _, o := range orders {
		if _, ok := agg[o.UserID]; !ok {
			agg[o.UserID] = &customerStat{
				UserID: o.UserID,
				Name:   o.CustomerName,
				Email:  o.CustomerEmail,
			}
		}
		agg[o.UserID].OrderCount++
		agg[o.UserID].Revenue += orderAmountPaid(&o)
	}

	out := make([]customerStat, 0, len(agg))
	for _, s := range agg {
		s.Revenue = math.Round(s.Revenue*100) / 100
		out = append(out, *s)
	}
	sort.Slice(out, func(i, j int) bool {
		if out[i].Revenue == out[j].Revenue {
			return out[i].OrderCount > out[j].OrderCount
		}
		return out[i].Revenue > out[j].Revenue
	})
	if len(out) > limit {
		out = out[:limit]
	}
	return out
}

func countRepeatCustomers(start, end time.Time) int {
	var orders []models.Order
	database.DB.Where(
		"status IN ? AND paid_at IS NOT NULL AND paid_at >= ? AND paid_at < ?",
		[]string{"successful", "deposit_paid"}, start, end,
	).Find(&orders)

	counts := map[uint]int{}
	for _, o := range orders {
		counts[o.UserID]++
	}
	n := 0
	for _, c := range counts {
		if c >= 2 {
			n++
		}
	}
	return n
}

func fetchBalanceDueCustomers(limit int) []gin.H {
	var orders []models.Order
	database.DB.Where("status = ?", "deposit_paid").Order("created_at DESC").Limit(limit).Find(&orders)
	out := make([]gin.H, 0, len(orders))
	for _, o := range orders {
		due := orderAmountDue(&o)
		out = append(out, gin.H{
			"order_id":       o.ID,
			"user_id":        o.UserID,
			"customer_name":  o.CustomerName,
			"customer_email": o.CustomerEmail,
			"total":          o.Total,
			"amount_paid":    orderAmountPaid(&o),
			"amount_due":     due,
			"title":          orderSummaryTitle(o.Items),
		})
	}
	return out
}
