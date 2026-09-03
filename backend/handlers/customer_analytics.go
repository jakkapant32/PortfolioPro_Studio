package handlers

import (
	"math"
	"sort"
	"time"

	"portfoliopro-backend/database"
	"portfoliopro-backend/models"

	"github.com/gin-gonic/gin"
)

type rfmCustomer struct {
	UserID      uint    `json:"user_id"`
	Name        string  `json:"name"`
	Email       string  `json:"email"`
	RecencyDays int     `json:"recency_days"`
	Frequency   int     `json:"frequency"`
	Monetary    float64 `json:"monetary"`
	Segment     string  `json:"segment"`
}

func computeCLVSummary() gin.H {
	var totalCLV float64
	var customers int64
	database.DB.Model(&models.Order{}).
		Where("status IN ?", []string{"successful", "deposit_paid"}).
		Distinct("user_id").Count(&customers)
	database.DB.Model(&models.Order{}).
		Where("status IN ?", []string{"successful", "deposit_paid"}).
		Select("COALESCE(SUM(amount_paid), 0)").Scan(&totalCLV)

	avg := 0.0
	if customers > 0 {
		avg = math.Round(totalCLV/float64(customers)*100) / 100
	}
	return gin.H{
		"total_clv":      math.Round(totalCLV*100) / 100,
		"avg_clv":        avg,
		"customer_count": customers,
	}
}

func rfmSegment(recencyDays, frequency int, monetary float64) string {
	if recencyDays <= 30 && frequency >= 2 && monetary >= 3000 {
		return "VIP"
	}
	if recencyDays <= 60 && frequency >= 2 {
		return "ลูกค้าประจำ"
	}
	if recencyDays <= 30 && frequency == 1 {
		return "ลูกค้าใหม่"
	}
	if recencyDays <= 90 {
		return "Active"
	}
	if recencyDays <= 180 {
		return "เสี่ยงหลุด"
	}
	return "หายไป"
}

func computeRFM(limit int) []rfmCustomer {
	var orders []models.Order
	database.DB.Where("status IN ? AND paid_at IS NOT NULL",
		[]string{"successful", "deposit_paid"}).Find(&orders)

	type agg struct {
		name      string
		email     string
		frequency int
		monetary  float64
		lastPaid  time.Time
	}
	byUser := map[uint]*agg{}
	for _, o := range orders {
		if _, ok := byUser[o.UserID]; !ok {
			byUser[o.UserID] = &agg{name: o.CustomerName, email: o.CustomerEmail}
		}
		a := byUser[o.UserID]
		a.frequency++
		a.monetary += orderAmountPaid(&o)
		if o.PaidAt != nil && o.PaidAt.After(a.lastPaid) {
			a.lastPaid = *o.PaidAt
		}
	}

	now := time.Now()
	out := make([]rfmCustomer, 0, len(byUser))
	for uid, a := range byUser {
		recency := 999
		if !a.lastPaid.IsZero() {
			recency = int(now.Sub(a.lastPaid).Hours() / 24)
		}
		monetary := math.Round(a.monetary*100) / 100
		out = append(out, rfmCustomer{
			UserID:      uid,
			Name:        a.name,
			Email:       a.email,
			RecencyDays: recency,
			Frequency:   a.frequency,
			Monetary:    monetary,
			Segment:     rfmSegment(recency, a.frequency, monetary),
		})
	}

	sort.Slice(out, func(i, j int) bool {
		if out[i].Monetary == out[j].Monetary {
			return out[i].Frequency > out[j].Frequency
		}
		return out[i].Monetary > out[j].Monetary
	})
	if len(out) > limit {
		out = out[:limit]
	}
	return out
}

func rfmSegmentSummary(customers []rfmCustomer) []gin.H {
	counts := map[string]int{}
	for _, c := range customers {
		counts[c.Segment]++
	}
	order := []string{"VIP", "ลูกค้าประจำ", "ลูกค้าใหม่", "Active", "เสี่ยงหลุด", "หายไป"}
	out := make([]gin.H, 0, len(counts))
	for _, seg := range order {
		if counts[seg] > 0 {
			out = append(out, gin.H{"segment": seg, "count": counts[seg]})
		}
	}
	return out
}

func computeCohorts(months int) []gin.H {
	now := time.Now()
	loc := now.Location()
	out := make([]gin.H, 0, months)

	for i := months - 1; i >= 0; i-- {
		cohortStart := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, loc).AddDate(0, -i, 0)
		cohortEnd := cohortStart.AddDate(0, 1, 0)

		var userIDs []uint
		database.DB.Model(&models.User{}).
			Where("created_at >= ? AND created_at < ?", cohortStart, cohortEnd).
			Pluck("id", &userIDs)

		retention := make([]int, 7)
		for m := 0; m < 7; m++ {
			if len(userIDs) == 0 {
				continue
			}
			periodStart := cohortStart.AddDate(0, m, 0)
			periodEnd := periodStart.AddDate(0, 1, 0)
			var count int64
			database.DB.Model(&models.Order{}).
				Where("user_id IN ? AND status IN ? AND paid_at IS NOT NULL AND paid_at >= ? AND paid_at < ?",
					userIDs, []string{"successful", "deposit_paid"}, periodStart, periodEnd).
				Distinct("user_id").Count(&count)
			retention[m] = int(count)
		}

		out = append(out, gin.H{
			"cohort":    cohortStart.Format("2006-01"),
			"size":      len(userIDs),
			"retention": retention,
		})
	}
	return out
}
