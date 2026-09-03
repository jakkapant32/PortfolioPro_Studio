package handlers

import (
	"fmt"

	"portfoliopro-backend/database"
	"portfoliopro-backend/models"
)

// validateCartItems loads published portfolio prices from DB — never trust client prices.
func validateCartItems(items []CartItem) ([]CartItem, float64, error) {
	if len(items) == 0 {
		return nil, 0, fmt.Errorf("กรุณาเลือกบริการอย่างน้อย 1 รายการ")
	}

	validated := make([]CartItem, 0, len(items))
	seen := map[int]bool{}
	var subtotal float64

	for _, item := range items {
		if item.ID <= 0 {
			return nil, 0, fmt.Errorf("รายการไม่ถูกต้อง")
		}
		if seen[item.ID] {
			continue
		}

		var product models.PortfolioItem
		if err := database.DB.Where("id = ? AND published = ?", item.ID, true).First(&product).Error; err != nil {
			return nil, 0, fmt.Errorf("ไม่พบบริการที่เลือก (ID %d)", item.ID)
		}
		if product.Price <= 0 {
			return nil, 0, fmt.Errorf("บริการ \"%s\" ยังไม่พร้อมสำหรับชำระเงิน", product.Title)
		}

		seen[item.ID] = true
		line := CartItem{
			ID:    int(product.ID),
			Title: product.Title,
			Price: product.Price,
		}
		validated = append(validated, line)
		subtotal += product.Price
	}

	if len(validated) == 0 {
		return nil, 0, fmt.Errorf("กรุณาเลือกบริการอย่างน้อย 1 รายการ")
	}

	return validated, subtotal, nil
}
