package handlers

import (
	"encoding/json"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"time"

	"portfoliopro-backend/database"
	"portfoliopro-backend/models"

	"github.com/gin-gonic/gin"
)

type adminStatusUpdate struct {
	AdminStatus string `json:"admin_status"`
	AdminNote   string `json:"admin_note"`
}

type packageStat struct {
	ID      int     `json:"id"`
	Title   string  `json:"title"`
	Count   int     `json:"count"`
	Revenue float64 `json:"revenue"`
}

type monthlyStat struct {
	Month   string  `json:"month"`
	Revenue float64 `json:"revenue"`
	Orders  int     `json:"orders"`
}

func AdminDashboard(c *gin.Context) {
	var stats struct {
		OrdersTotal      int64   `json:"orders_total"`
		OrdersSuccessful int64   `json:"orders_successful"`
		OrdersPending    int64   `json:"orders_pending"`
		RevenueTotal     float64 `json:"revenue_total"`
		ContactsNew      int64   `json:"contacts_new"`
		ContactsTotal    int64   `json:"contacts_total"`
		QuotationsNew    int64   `json:"quotations_new"`
		QuotationsTotal  int64   `json:"quotations_total"`
		UsersTotal       int64   `json:"users_total"`
	}

	database.DB.Model(&models.Order{}).Count(&stats.OrdersTotal)
	database.DB.Model(&models.Order{}).Where("status = ?", "successful").Count(&stats.OrdersSuccessful)
	database.DB.Model(&models.Order{}).Where("status NOT IN ?", []string{"successful", "failed", "expired"}).Count(&stats.OrdersPending)
	database.DB.Model(&models.Order{}).Where("status = ?", "successful").Select("COALESCE(SUM(total), 0)").Scan(&stats.RevenueTotal)
	database.DB.Model(&models.Contact{}).Where("admin_status = ?", models.AdminStatusNew).Count(&stats.ContactsNew)
	database.DB.Model(&models.Contact{}).Count(&stats.ContactsTotal)
	database.DB.Model(&models.Quotation{}).Where("admin_status = ?", models.AdminStatusNew).Count(&stats.QuotationsNew)
	database.DB.Model(&models.Quotation{}).Count(&stats.QuotationsTotal)
	database.DB.Model(&models.User{}).Count(&stats.UsersTotal)

	var pipeline struct {
		ProjectsTotal           int64 `json:"projects_total"`
		ProjectsPendingContract int64 `json:"projects_pending_contract"`
		ProjectsAwaitAccept     int64 `json:"projects_await_accept"`
		ProjectsInProgress      int64 `json:"projects_in_progress"`
		ProjectsAwaitReceive    int64 `json:"projects_await_receive"`
		OrdersBalanceDue        int64 `json:"orders_balance_due"`
	}

	database.DB.Model(&models.Project{}).Count(&pipeline.ProjectsTotal)
	database.DB.Model(&models.Project{}).Where("status = ?", models.ProjectStatusPending).Count(&pipeline.ProjectsPendingContract)
	database.DB.Model(&models.Project{}).Where("status = ?", models.ProjectStatusContractSent).Count(&pipeline.ProjectsAwaitAccept)
	database.DB.Model(&models.Project{}).Where("status IN ?", []string{
		models.ProjectStatusContractAccepted,
		models.ProjectStatusInProgress,
	}).Count(&pipeline.ProjectsInProgress)
	database.DB.Model(&models.Project{}).Where("status = ?", models.ProjectStatusDelivered).Count(&pipeline.ProjectsAwaitReceive)
	database.DB.Model(&models.Order{}).Where("status = ?", "deposit_paid").Count(&pipeline.OrdersBalanceDue)

	topPackages := computeTopPackages(5)
	monthlyRevenue := computeMonthlyRevenue(6)

	thisStart, thisEnd := monthBounds(0)
	lastStart, lastEnd := monthBounds(-1)

	revenueThisMonth := collectedRevenueInRange(thisStart, thisEnd)
	revenueLastMonth := collectedRevenueInRange(lastStart, lastEnd)

	var ordersThisMonth int64
	database.DB.Model(&models.Order{}).
		Where("created_at >= ? AND created_at < ?", thisStart, thisEnd).
		Count(&ordersThisMonth)

	pipelineActionTotal := pipeline.ProjectsPendingContract +
		pipeline.ProjectsAwaitAccept +
		pipeline.ProjectsInProgress +
		pipeline.ProjectsAwaitReceive +
		pipeline.OrdersBalanceDue

	c.JSON(http.StatusOK, gin.H{
		"orders_total":        stats.OrdersTotal,
		"orders_successful":   stats.OrdersSuccessful,
		"orders_pending":      stats.OrdersPending,
		"orders_this_month":   ordersThisMonth,
		"revenue_total":       stats.RevenueTotal,
		"revenue_this_month":  revenueThisMonth,
		"revenue_last_month":  revenueLastMonth,
		"contacts_new":        stats.ContactsNew,
		"contacts_total":      stats.ContactsTotal,
		"quotations_new":      stats.QuotationsNew,
		"quotations_total":    stats.QuotationsTotal,
		"users_total":         stats.UsersTotal,
		"top_packages":        topPackages,
		"monthly_revenue":     monthlyRevenue,
		"pipeline":            pipeline,
		"pipeline_action_total": pipelineActionTotal,
		"recent_orders":       fetchRecentOrders(6),
		"recent_contacts":     fetchRecentContacts(5),
		"recent_quotations":   fetchRecentQuotations(5),
	})
}

func monthBounds(monthOffset int) (time.Time, time.Time) {
	now := time.Now()
	loc := now.Location()
	start := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, loc).AddDate(0, monthOffset, 0)
	return start, start.AddDate(0, 1, 0)
}

func collectedRevenueInRange(start, end time.Time) float64 {
	var rev float64
	database.DB.Model(&models.Order{}).
		Where("status IN ? AND paid_at IS NOT NULL AND paid_at >= ? AND paid_at < ?",
			[]string{"successful", "deposit_paid"}, start, end).
		Select("COALESCE(SUM(amount_paid), 0)").Scan(&rev)
	return rev
}

func fetchRecentOrders(limit int) []gin.H {
	var orders []models.Order
	database.DB.Order("created_at DESC").Limit(limit).Find(&orders)
	out := make([]gin.H, 0, len(orders))
	for _, o := range orders {
		title := orderSummaryTitle(o.Items)
		out = append(out, gin.H{
			"id":             o.ID,
			"customer_name":  o.CustomerName,
			"customer_email": o.CustomerEmail,
			"title":          title,
			"total":          o.Total,
			"amount_paid":    o.AmountPaid,
			"status":         o.Status,
			"deposit_percent": o.DepositPercent,
			"created_at":     o.CreatedAt,
		})
	}
	return out
}

func orderSummaryTitle(itemsJSON string) string {
	var items []CartItem
	if err := json.Unmarshal([]byte(itemsJSON), &items); err != nil || len(items) == 0 {
		return "คำสั่งซื้อ"
	}
	if len(items) == 1 {
		return items[0].Title
	}
	return items[0].Title + " +" + strconv.Itoa(len(items)-1)
}

func fetchRecentContacts(limit int) []gin.H {
	var contacts []models.Contact
	database.DB.Where("admin_status = ?", models.AdminStatusNew).
		Order("created_at DESC").Limit(limit).Find(&contacts)
	out := make([]gin.H, 0, len(contacts))
	for _, c := range contacts {
		out = append(out, gin.H{
			"id":         c.ID,
			"name":       c.Name,
			"email":      c.Email,
			"service":    c.Service,
			"created_at": c.CreatedAt,
		})
	}
	return out
}

func fetchRecentQuotations(limit int) []gin.H {
	var quotations []models.Quotation
	database.DB.Where("admin_status = ?", models.AdminStatusNew).
		Order("created_at DESC").Limit(limit).Find(&quotations)
	out := make([]gin.H, 0, len(quotations))
	for _, q := range quotations {
		out = append(out, gin.H{
			"id":         q.ID,
			"name":       q.Name,
			"email":      q.Email,
			"service":    q.Service,
			"total":      q.Total,
			"created_at": q.CreatedAt,
		})
	}
	return out
}

func computeTopPackages(limit int) []packageStat {
	var orders []models.Order
	database.DB.Where("status = ?", "successful").Find(&orders)

	agg := map[int]*packageStat{}
	for _, order := range orders {
		var items []CartItem
		if err := json.Unmarshal([]byte(order.Items), &items); err != nil {
			continue
		}
		share := 1.0 / float64(len(items))
		if len(items) == 0 {
			continue
		}
		for _, item := range items {
			if _, ok := agg[item.ID]; !ok {
				agg[item.ID] = &packageStat{ID: item.ID, Title: item.Title}
			}
			agg[item.ID].Count++
			agg[item.ID].Revenue += order.Total * share
		}
	}

	out := make([]packageStat, 0, len(agg))
	for _, stat := range agg {
		out = append(out, *stat)
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

func computeMonthlyRevenue(months int) []monthlyStat {
	now := time.Now()
	out := make([]monthlyStat, 0, months)
	for i := months - 1; i >= 0; i-- {
		t := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location()).AddDate(0, -i, 0)
		start := t
		end := t.AddDate(0, 1, 0)
		var revenue float64
		var count int64
		database.DB.Model(&models.Order{}).
			Where("status = ? AND created_at >= ? AND created_at < ?", "successful", start, end).
			Select("COALESCE(SUM(total), 0)").Scan(&revenue)
		database.DB.Model(&models.Order{}).
			Where("status = ? AND created_at >= ? AND created_at < ?", "successful", start, end).
			Count(&count)
		out = append(out, monthlyStat{
			Month:   t.Format("2006-01"),
			Revenue: revenue,
			Orders:  int(count),
		})
	}
	return out
}

func AdminListOrders(c *gin.Context) {
	status := c.Query("status")
	limit, offset := paginationParams(c)

	query := database.DB.Model(&models.Order{}).Order("created_at DESC")
	if status != "" {
		query = query.Where("status = ?", status)
	}

	var total int64
	query.Count(&total)

	var orders []models.Order
	query.Limit(limit).Offset(offset).Find(&orders)

	c.JSON(http.StatusOK, gin.H{
		"items":  orders,
		"total":  total,
		"limit":  limit,
		"offset": offset,
	})
}

func AdminGetOrder(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	var order models.Order
	if err := database.DB.First(&order, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "order not found"})
		return
	}

	var items []CartItem
	_ = json.Unmarshal([]byte(order.Items), &items)

	c.JSON(http.StatusOK, gin.H{
		"order":    order,
		"items":    items,
		"has_slip": strings.TrimSpace(order.SlipFilename) != "",
	})
}

func AdminListContacts(c *gin.Context) {
	status := c.Query("status")
	limit, offset := paginationParams(c)

	query := database.DB.Model(&models.Contact{}).Order("created_at DESC")
	if status != "" {
		query = query.Where("admin_status = ?", status)
	}

	var total int64
	query.Count(&total)

	var contacts []models.Contact
	query.Limit(limit).Offset(offset).Find(&contacts)

	c.JSON(http.StatusOK, gin.H{
		"items":  contacts,
		"total":  total,
		"limit":  limit,
		"offset": offset,
	})
}

func AdminGetContact(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	var contact models.Contact
	if err := database.DB.First(&contact, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "contact not found"})
		return
	}

	c.JSON(http.StatusOK, contact)
}

func AdminUpdateContact(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	var req adminStatusUpdate
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var contact models.Contact
	if err := database.DB.First(&contact, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "contact not found"})
		return
	}

	if req.AdminStatus != "" {
		if !validAdminStatus(req.AdminStatus) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid admin_status"})
			return
		}
		contact.AdminStatus = req.AdminStatus
	}
	contact.AdminNote = req.AdminNote

	database.DB.Save(&contact)
	c.JSON(http.StatusOK, contact)
}

func AdminListQuotations(c *gin.Context) {
	status := c.Query("status")
	limit, offset := paginationParams(c)

	query := database.DB.Model(&models.Quotation{}).Order("created_at DESC")
	if status != "" {
		query = query.Where("admin_status = ?", status)
	}

	var total int64
	query.Count(&total)

	var quotations []models.Quotation
	query.Limit(limit).Offset(offset).Find(&quotations)

	c.JSON(http.StatusOK, gin.H{
		"items":  quotations,
		"total":  total,
		"limit":  limit,
		"offset": offset,
	})
}

func AdminGetQuotation(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	var quotation models.Quotation
	if err := database.DB.First(&quotation, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "quotation not found"})
		return
	}

	c.JSON(http.StatusOK, quotation)
}

func AdminUpdateQuotation(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	var req adminStatusUpdate
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var quotation models.Quotation
	if err := database.DB.First(&quotation, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "quotation not found"})
		return
	}

	if req.AdminStatus != "" {
		if !validAdminStatus(req.AdminStatus) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid admin_status"})
			return
		}
		quotation.AdminStatus = req.AdminStatus
	}
	quotation.AdminNote = req.AdminNote

	database.DB.Save(&quotation)
	c.JSON(http.StatusOK, quotation)
}

func AdminListUsers(c *gin.Context) {
	limit, offset := paginationParams(c)

	var total int64
	database.DB.Model(&models.User{}).Count(&total)

	var users []models.User
	database.DB.Order("created_at DESC").Limit(limit).Offset(offset).Find(&users)

	items := make([]gin.H, 0, len(users))
	for _, u := range users {
		items = append(items, userResponse(u))
	}

	c.JSON(http.StatusOK, gin.H{
		"items":  items,
		"total":  total,
		"limit":  limit,
		"offset": offset,
	})
}

func paginationParams(c *gin.Context) (int, int) {
	limit := 20
	offset := 0
	if v, err := strconv.Atoi(c.DefaultQuery("limit", "20")); err == nil && v > 0 && v <= 100 {
		limit = v
	}
	if v, err := strconv.Atoi(c.DefaultQuery("offset", "0")); err == nil && v >= 0 {
		offset = v
	}
	return limit, offset
}

func validAdminStatus(status string) bool {
	switch status {
	case models.AdminStatusNew, models.AdminStatusInProgress, models.AdminStatusDone:
		return true
	default:
		return false
	}
}
