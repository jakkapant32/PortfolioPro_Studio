package models

import (
	"time"

	"gorm.io/gorm"
)

const AdminStatusNew = "new"
const AdminStatusInProgress = "in_progress"
const AdminStatusDone = "done"

type Quotation struct {
	ID          uint           `json:"id" gorm:"primaryKey"`
	Name        string         `json:"name"`
	Email       string         `json:"email"`
	Phone       string         `json:"phone"`
	Service     string         `json:"service"`
	Message     string         `json:"message"`
	Items       string         `json:"items" gorm:"type:text"`
	Total       float64        `json:"total"`
	Source      string         `json:"source"`
	AdminStatus string         `json:"admin_status" gorm:"default:new;index"`
	AdminNote   string         `json:"admin_note" gorm:"type:text"`
	CreatedAt   time.Time      `json:"created_at"`
	DeletedAt   gorm.DeletedAt `json:"-" gorm:"index"`
}

type Contact struct {
	ID          uint           `json:"id" gorm:"primaryKey"`
	Name        string         `json:"name" binding:"required"`
	Email       string         `json:"email" binding:"required,email"`
	Phone       string         `json:"phone"`
	Service     string         `json:"service"`
	Message     string         `json:"message"`
	Items       string         `json:"items" gorm:"type:text"`
	Total       float64        `json:"total"`
	AdminStatus string         `json:"admin_status" gorm:"default:new;index"`
	AdminNote   string         `json:"admin_note" gorm:"type:text"`
	CreatedAt   time.Time      `json:"created_at"`
	DeletedAt   gorm.DeletedAt `json:"-" gorm:"index"`
}
