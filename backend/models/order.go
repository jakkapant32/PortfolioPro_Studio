package models

import (
	"time"

	"gorm.io/gorm"
)

type Order struct {
	ID             uint           `json:"id" gorm:"primaryKey"`
	UserID         uint           `json:"user_id" gorm:"index;not null"`
	CustomerName   string         `json:"customer_name"`
	CustomerEmail  string         `json:"customer_email"`
	Items          string         `json:"items" gorm:"type:text"`
	Subtotal       float64        `json:"subtotal"`
	DiscountAmount float64        `json:"discount_amount"`
	CouponCode     string         `json:"coupon_code"`
	CouponRedeemed bool           `json:"coupon_redeemed" gorm:"default:false"`
	Total          float64        `json:"total"`
	DepositPercent int            `json:"deposit_percent" gorm:"default:100"`
	AmountPaid     float64        `json:"amount_paid" gorm:"default:0"`
	LastPaidChargeID string       `json:"last_paid_charge_id"`
	AmountSatang   int64          `json:"amount_satang"`
	PaymentMethod  string         `json:"payment_method"`
	Status         string         `json:"status" gorm:"index;default:pending"`
	OmiseSourceID  string         `json:"omise_source_id"`
	OmiseChargeID  string         `json:"omise_charge_id"`
	QRImageURL     string         `json:"qr_image_url"`
	AuthorizeURI   string         `json:"authorize_uri"`
	PaidAt         *time.Time     `json:"paid_at,omitempty"`
	NotifiedAt     *time.Time     `json:"notified_at,omitempty"`
	SlipFilename     string     `json:"slip_filename,omitempty"`
	SlipOriginalName string     `json:"slip_original_name,omitempty"`
	SlipUploadedAt   *time.Time `json:"slip_uploaded_at,omitempty"`
	RejectReason     string     `json:"reject_reason,omitempty"`
	CreatedAt      time.Time      `json:"created_at"`
	UpdatedAt      time.Time      `json:"updated_at"`
	DeletedAt      gorm.DeletedAt `json:"-" gorm:"index"`
}
