package models

import (
	"time"

	"gorm.io/gorm"
)

type SatisfactionSurvey struct {
	ID          uint           `json:"id" gorm:"primaryKey"`
	UserID      *uint          `json:"user_id" gorm:"index"`
	Name        string         `json:"name"`
	Email       string         `json:"email"`
	Service     string         `json:"service"`
	Rating      int            `json:"rating" gorm:"index"`
	Comment     string         `json:"comment" gorm:"type:text"`
	CreatedAt   time.Time      `json:"created_at"`
	DeletedAt   gorm.DeletedAt `json:"-" gorm:"index"`
}
