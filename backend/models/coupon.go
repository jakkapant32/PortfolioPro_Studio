package models

import (
	"time"

	"gorm.io/gorm"
)

const (
	CouponTypePercent = "percent"
	CouponTypeFixed   = "fixed"
)

type Coupon struct {
	ID          uint           `json:"id" gorm:"primaryKey"`
	Code        string         `json:"code" gorm:"uniqueIndex;not null"`
	Type        string         `json:"type" gorm:"not null;default:percent"`
	Value       float64        `json:"value" gorm:"not null"`
	MinPurchase float64        `json:"min_purchase" gorm:"default:0"`
	MaxUses     int            `json:"max_uses" gorm:"default:0"`
	UsedCount   int            `json:"used_count" gorm:"default:0"`
	ExpiresAt   *time.Time     `json:"expires_at,omitempty"`
	Active      bool           `json:"active" gorm:"default:true"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `json:"-" gorm:"index"`
}
