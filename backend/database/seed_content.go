package database

import (
	_ "embed"
	"encoding/json"
	"log"

	"portfoliopro-backend/models"
)

//go:embed defaults.json
var defaultsJSON []byte

type seedDefaults struct {
	Portfolio []seedPortfolio `json:"portfolio"`
	Blog      []seedBlog      `json:"blog"`
	Site      json.RawMessage `json:"site"`
}

type seedPortfolio struct {
	Slug         string   `json:"slug"`
	Category     string   `json:"category"`
	Tag          string   `json:"tag"`
	Title        string   `json:"title"`
	Description  string   `json:"description"`
	Price        float64  `json:"price"`
	DeliveryTime string   `json:"deliveryTime"`
	Image        string   `json:"image"`
	Gradient     string   `json:"gradient"`
	Features     []string `json:"features"`
	SortOrder    int      `json:"sort_order"`
	Published    bool     `json:"published"`
}

type seedBlog struct {
	Slug      string `json:"slug"`
	Title     string `json:"title"`
	Excerpt   string `json:"excerpt"`
	Date      string `json:"date"`
	Tag       string `json:"tag"`
	Image     string `json:"image"`
	Content   string `json:"content"`
	SortOrder int    `json:"sort_order"`
	Published bool   `json:"published"`
}

func seedContent() {
	refreshTestTransferPackage()

	var count int64
	DB.Model(&models.PortfolioItem{}).Count(&count)
	if count > 0 {
		return
	}

	var defaults seedDefaults
	if err := json.Unmarshal(defaultsJSON, &defaults); err != nil {
		log.Printf("seed content skipped: %v", err)
		return
	}

	for _, p := range defaults.Portfolio {
		features, _ := json.Marshal(p.Features)
		item := models.PortfolioItem{
			Slug:         p.Slug,
			Category:     p.Category,
			Tag:          p.Tag,
			Title:        p.Title,
			Description:  p.Description,
			Price:        p.Price,
			DeliveryTime: p.DeliveryTime,
			Image:        p.Image,
			Gradient:     p.Gradient,
			Features:     string(features),
			SortOrder:    p.SortOrder,
			Published:    p.Published,
		}
		if err := DB.Create(&item).Error; err != nil {
			log.Printf("seed portfolio %s: %v", p.Slug, err)
		}
	}

	for _, b := range defaults.Blog {
		post := models.BlogPost{
			Slug:      b.Slug,
			Title:     b.Title,
			Excerpt:   b.Excerpt,
			Date:      b.Date,
			Tag:       b.Tag,
			Image:     b.Image,
			Content:   b.Content,
			SortOrder: b.SortOrder,
			Published: b.Published,
		}
		if err := DB.Create(&post).Error; err != nil {
			log.Printf("seed blog %s: %v", b.Slug, err)
		}
	}

	var siteCount int64
	DB.Model(&models.SiteConfig{}).Count(&siteCount)
	if siteCount == 0 && len(defaults.Site) > 0 {
		DB.Create(&models.SiteConfig{ID: 1, Data: string(defaults.Site)})
	}

	log.Println("Seeded portfolio, blog, and site config defaults")
}

func refreshTestTransferPackage() {
	features, _ := json.Marshal([]string{
		"ทดสอบสแกน QR PromptPay",
		"แนบสลิปให้แอดมินตรวจ",
		"ยืนยันคำสั่งซื้อด้วยมือ",
	})
	DB.Model(&models.PortfolioItem{}).Where("slug = ?", "test-transfer-omise").Updates(map[string]interface{}{
		"title":       "ทดสอบโอนเงิน (฿20)",
		"description": "สินค้าสำหรับทดสอบระบบโอนเงินแนบสลิป — โอนแล้วรอแอดมินยืนยัน",
		"features":    string(features),
	})
}
