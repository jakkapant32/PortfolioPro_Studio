package handlers

import (
	"net/http"
	"strings"
	"time"

	"portfoliopro-backend/database"
	"portfoliopro-backend/models"

	"github.com/gin-gonic/gin"
)

var allowedAnalyticsEvents = map[string]bool{
	models.EventPageView:       true,
	models.EventPortfolioView:  true,
	models.EventProductView:    true,
	models.EventAddToCart:      true,
	models.EventCheckoutStart:  true,
	models.EventPaymentSuccess: true,
}

type trackEventRequest struct {
	EventType string `json:"event_type" binding:"required"`
	Path      string `json:"path"`
	ItemID    int    `json:"item_id"`
	ItemTitle string `json:"item_title"`
	SessionID string `json:"session_id" binding:"required"`
}

func TrackEvent(c *gin.Context) {
	var req trackEventRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	eventType := strings.TrimSpace(req.EventType)
	if !allowedAnalyticsEvents[eventType] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid event_type"})
		return
	}

	sessionID := strings.TrimSpace(req.SessionID)
	if len(sessionID) < 8 || len(sessionID) > 64 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid session_id"})
		return
	}

	path := strings.TrimSpace(req.Path)
	if len(path) > 500 {
		path = path[:500]
	}
	title := strings.TrimSpace(req.ItemTitle)
	if len(title) > 200 {
		title = title[:200]
	}

	var userID *uint
	if uid, exists := c.Get("userID"); exists {
		id := uid.(uint)
		userID = &id
	}

	event := models.AnalyticsEvent{
		EventType: eventType,
		Path:      path,
		ItemID:    req.ItemID,
		ItemTitle: title,
		SessionID: sessionID,
		UserID:    userID,
	}

	if err := database.DB.Create(&event).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to track"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"ok": true})
}

func recordPaymentSuccessEvent(userID uint, orderID uint) {
	uid := userID
	database.DB.Create(&models.AnalyticsEvent{
		EventType: models.EventPaymentSuccess,
		Path:      "/payment/return",
		ItemID:    int(orderID),
		ItemTitle: "order",
		SessionID: "server",
		UserID:    &uid,
	})
}

func countEventsInRange(start, end time.Time, eventType string) int64 {
	var n int64
	database.DB.Model(&models.AnalyticsEvent{}).
		Where("event_type = ? AND created_at >= ? AND created_at < ?", eventType, start, end).
		Count(&n)
	return n
}

func countUniqueSessionsInRange(start, end time.Time, eventType string) int64 {
	var n int64
	database.DB.Model(&models.AnalyticsEvent{}).
		Where("event_type = ? AND created_at >= ? AND created_at < ?", eventType, start, end).
		Distinct("session_id").Count(&n)
	return n
}

func topPagesInRange(start, end time.Time, limit int) []gin.H {
	type row struct {
		Path  string
		Count int64
	}
	var rows []row
	database.DB.Model(&models.AnalyticsEvent{}).
		Select("path, COUNT(*) as count").
		Where("event_type = ? AND created_at >= ? AND created_at < ? AND path != ''",
			models.EventPageView, start, end).
		Group("path").
		Order("count DESC").
		Limit(limit).
		Scan(&rows)

	out := make([]gin.H, 0, len(rows))
	for _, r := range rows {
		out = append(out, gin.H{"path": r.Path, "views": r.Count})
	}
	return out
}

func webFunnelInRange(start, end time.Time) gin.H {
	return gin.H{
		"page_views":       countEventsInRange(start, end, models.EventPageView),
		"portfolio_views":  countEventsInRange(start, end, models.EventPortfolioView),
		"product_views":    countEventsInRange(start, end, models.EventProductView),
		"add_to_cart":      countEventsInRange(start, end, models.EventAddToCart),
		"checkout_start":   countEventsInRange(start, end, models.EventCheckoutStart),
		"payment_success":  countEventsInRange(start, end, models.EventPaymentSuccess),
		"unique_sessions":  countUniqueSessionsInRange(start, end, models.EventPageView),
		"cart_sessions":    countUniqueSessionsInRange(start, end, models.EventAddToCart),
	}
}
