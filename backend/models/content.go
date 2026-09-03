package models

import (
	"time"

	"gorm.io/gorm"
)

type PortfolioItem struct {
	ID           uint           `json:"id" gorm:"primaryKey"`
	Slug         string         `json:"slug" gorm:"uniqueIndex;not null"`
	Category     string         `json:"category" gorm:"index"`
	Tag          string         `json:"tag"`
	Title        string         `json:"title"`
	Description  string         `json:"description" gorm:"type:text"`
	Price        float64        `json:"price"`
	DeliveryTime string         `json:"delivery_time"`
	Image        string         `json:"image"`
	Gradient     string         `json:"gradient"`
	Features     string         `json:"features" gorm:"type:text"`
	SortOrder    int            `json:"sort_order"`
	Published    bool           `json:"published" gorm:"default:true"`
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
	DeletedAt    gorm.DeletedAt `json:"-" gorm:"index"`
}

type BlogPost struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	Slug      string         `json:"slug" gorm:"uniqueIndex;not null"`
	Title     string         `json:"title"`
	Excerpt   string         `json:"excerpt" gorm:"type:text"`
	Date      string         `json:"date"`
	Tag       string         `json:"tag"`
	Image     string         `json:"image"`
	Content   string         `json:"content" gorm:"type:text"`
	Published bool           `json:"published" gorm:"default:true"`
	SortOrder int            `json:"sort_order"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`
}

type SiteConfig struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	Data      string    `json:"data" gorm:"type:text"`
	UpdatedAt time.Time `json:"updated_at"`
}
