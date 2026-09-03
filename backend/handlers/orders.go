package handlers

import (
	"encoding/json"
	"net/http"
	"strings"

	"portfoliopro-backend/database"
	"portfoliopro-backend/models"

	"github.com/gin-gonic/gin"
)

func MyListOrders(c *gin.Context) {
	userID := c.GetUint("userID")

	var orders []models.Order
	database.DB.Where("user_id = ?", userID).Order("created_at DESC").Limit(50).Find(&orders)

	items := make([]gin.H, 0, len(orders))
	for _, order := range orders {
		var cartItems []CartItem
		_ = json.Unmarshal([]byte(order.Items), &cartItems)

		entry := gin.H{
			"id":             order.ID,
			"items":          cartItems,
			"subtotal":       order.Subtotal,
			"discount_amount": order.DiscountAmount,
			"coupon_code":    order.CouponCode,
			"total":          order.Total,
			"status":         order.Status,
			"payment_method": order.PaymentMethod,
			"created_at":     order.CreatedAt,
			"paid_at":        order.PaidAt,
			"has_slip":       strings.TrimSpace(order.SlipFilename) != "",
			"reject_reason":  order.RejectReason,
			"slip_uploaded_at": order.SlipUploadedAt,
		}
		for k, v := range orderPaymentFields(order) {
			entry[k] = v
		}
		items = append(items, entry)
	}

	c.JSON(http.StatusOK, gin.H{"items": items})
}
