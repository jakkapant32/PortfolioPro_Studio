package models

import (
	"time"

	"gorm.io/gorm"
)

const (
	ProjectStatusPending           = "pending"
	ProjectStatusContractSent      = "contract_sent"
	ProjectStatusContractAccepted  = "contract_accepted"
	ProjectStatusInProgress        = "in_progress"
	ProjectStatusDelivered         = "delivered"
	ProjectStatusCompleted         = "completed"

	ContractStatusDraft    = "draft"
	ContractStatusSent     = "sent"
	ContractStatusAccepted = "accepted"

	DeliveryStatusDraft    = "draft"
	DeliveryStatusSent     = "sent"
	DeliveryStatusReceived = "received"
)

type Project struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	OrderID   *uint          `json:"order_id,omitempty" gorm:"index"`
	UserID    uint           `json:"user_id" gorm:"index;not null"`
	Title     string         `json:"title" gorm:"not null"`
	Status         string         `json:"status" gorm:"index;default:pending"`
	AdminNote      string         `json:"admin_note" gorm:"type:text"`
	DepositPercent int            `json:"deposit_percent" gorm:"default:100"`
	CreatedAt      time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`
}

type Contract struct {
	ID         uint           `json:"id" gorm:"primaryKey"`
	ProjectID  uint           `json:"project_id" gorm:"uniqueIndex;not null"`
	Title      string         `json:"title"`
	Content    string         `json:"content" gorm:"type:text"`
	Version    int            `json:"version" gorm:"default:1"`
	Status     string         `json:"status" gorm:"default:draft"`
	SentAt     *time.Time     `json:"sent_at,omitempty"`
	AcceptedAt *time.Time     `json:"accepted_at,omitempty"`
	AcceptedIP string         `json:"accepted_ip"`
	CreatedAt  time.Time      `json:"created_at"`
	UpdatedAt  time.Time      `json:"updated_at"`
	DeletedAt  gorm.DeletedAt `json:"-" gorm:"index"`
}

type Delivery struct {
	ID         uint           `json:"id" gorm:"primaryKey"`
	ProjectID  uint           `json:"project_id" gorm:"uniqueIndex;not null"`
	Message    string         `json:"message" gorm:"type:text"`
	Links      string         `json:"links" gorm:"type:text"`
	Status     string         `json:"status" gorm:"default:draft"`
	SentAt     *time.Time     `json:"sent_at,omitempty"`
	ReceivedAt *time.Time     `json:"received_at,omitempty"`
	CreatedAt  time.Time      `json:"created_at"`
	UpdatedAt  time.Time      `json:"updated_at"`
	DeletedAt  gorm.DeletedAt `json:"-" gorm:"index"`
}
