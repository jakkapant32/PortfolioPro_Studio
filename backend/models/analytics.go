package models

import (
	"time"

	"gorm.io/gorm"
)

const (
	EventPageView       = "page_view"
	EventPortfolioView  = "portfolio_view"
	EventProductView    = "product_view"
	EventAddToCart      = "add_to_cart"
	EventCheckoutStart  = "checkout_start"
	EventPaymentSuccess = "payment_success"
)

type AnalyticsEvent struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	EventType string         `json:"event_type" gorm:"index;not null"`
	Path      string         `json:"path" gorm:"index"`
	ItemID    int            `json:"item_id"`
	ItemTitle string         `json:"item_title"`
	SessionID string         `json:"session_id" gorm:"index"`
	UserID    *uint          `json:"user_id,omitempty" gorm:"index"`
	CreatedAt time.Time      `json:"created_at" gorm:"index"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`
}
