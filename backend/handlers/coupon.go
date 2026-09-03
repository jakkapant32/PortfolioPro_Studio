package handlers

import (
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"portfoliopro-backend/database"
	"portfoliopro-backend/models"

	"github.com/gin-gonic/gin"
)

type couponValidateRequest struct {
	Code     string  `json:"code" binding:"required"`
	Subtotal float64 `json:"subtotal" binding:"required"`
}

type couponPayload struct {
	Code        string     `json:"code" binding:"required"`
	Type        string     `json:"type" binding:"required"`
	Value       float64    `json:"value" binding:"required"`
	MinPurchase float64    `json:"min_purchase"`
	MaxUses     int        `json:"max_uses"`
	ExpiresAt   *time.Time `json:"expires_at"`
	Active      *bool      `json:"active"`
}

type couponResult struct {
	Code           string  `json:"code"`
	Type           string  `json:"type"`
	Value          float64 `json:"value"`
	Subtotal       float64 `json:"subtotal"`
	DiscountAmount float64 `json:"discount_amount"`
	Total          float64 `json:"total"`
}

func normalizeCouponCode(code string) string {
	return strings.ToUpper(strings.TrimSpace(code))
}

func findCoupon(code string) (*models.Coupon, error) {
	var coupon models.Coupon
	if err := database.DB.Where("UPPER(code) = ?", normalizeCouponCode(code)).First(&coupon).Error; err != nil {
		return nil, fmt.Errorf("โค้ดส่วนลดไม่ถูกต้องหรือหมดอายุ")
	}
	return &coupon, nil
}

func validateCoupon(coupon *models.Coupon, subtotal float64) (*couponResult, error) {
	if coupon == nil {
		return nil, fmt.Errorf("โค้ดส่วนลดไม่ถูกต้อง")
	}
	if !coupon.Active {
		return nil, fmt.Errorf("โค้ดส่วนลดนี้ถูกปิดใช้งาน")
	}
	if coupon.ExpiresAt != nil && time.Now().After(*coupon.ExpiresAt) {
		return nil, fmt.Errorf("โค้ดส่วนลดหมดอายุแล้ว")
	}
	if coupon.MaxUses > 0 && coupon.UsedCount >= coupon.MaxUses {
		return nil, fmt.Errorf("โค้ดส่วนลดถูกใช้ครบจำนวนแล้ว")
	}
	if subtotal < coupon.MinPurchase {
		return nil, fmt.Errorf("ยอดขั้นต่ำ ฿%.0f เพื่อใช้โค้ดนี้", coupon.MinPurchase)
	}

	discount := calculateDiscount(coupon, subtotal)
	total := subtotal - discount
	if total < 1 {
		total = 1
	}

	return &couponResult{
		Code:           coupon.Code,
		Type:           coupon.Type,
		Value:          coupon.Value,
		Subtotal:       subtotal,
		DiscountAmount: discount,
		Total:          total,
	}, nil
}

func calculateDiscount(coupon *models.Coupon, subtotal float64) float64 {
	var discount float64
	switch coupon.Type {
	case models.CouponTypeFixed:
		discount = coupon.Value
	case models.CouponTypePercent:
		discount = subtotal * coupon.Value / 100
	default:
		discount = 0
	}
	if discount > subtotal {
		discount = subtotal
	}
	if discount < 0 {
		discount = 0
	}
	return discount
}

func applyCouponToSubtotal(code string, subtotal float64) (float64, float64, string, error) {
	code = strings.TrimSpace(code)
	if code == "" {
		return subtotal, 0, "", nil
	}
	coupon, err := findCoupon(code)
	if err != nil {
		return 0, 0, "", err
	}
	result, err := validateCoupon(coupon, subtotal)
	if err != nil {
		return 0, 0, "", err
	}
	return result.Total, result.DiscountAmount, coupon.Code, nil
}

func redeemCouponForOrder(order *models.Order) {
	if order == nil || order.CouponCode == "" || order.CouponRedeemed || order.Status != "successful" {
		return
	}
	var coupon models.Coupon
	if err := database.DB.Where("UPPER(code) = ?", normalizeCouponCode(order.CouponCode)).First(&coupon).Error; err != nil {
		return
	}
	coupon.UsedCount++
	database.DB.Save(&coupon)
	order.CouponRedeemed = true
	database.DB.Model(order).Update("coupon_redeemed", true)
}

func ValidateCoupon(c *gin.Context) {
	var req couponValidateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if req.Subtotal <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ยอดไม่ถูกต้อง"})
		return
	}
	coupon, err := findCoupon(req.Code)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	result, err := validateCoupon(coupon, req.Subtotal)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, result)
}

func AdminListCoupons(c *gin.Context) {
	var coupons []models.Coupon
	database.DB.Order("created_at DESC").Find(&coupons)
	c.JSON(http.StatusOK, gin.H{"items": coupons})
}

func AdminCreateCoupon(c *gin.Context) {
	var req couponPayload
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	code := normalizeCouponCode(req.Code)
	if code == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "กรุณาระบุโค้ด"})
		return
	}
	if req.Type != models.CouponTypePercent && req.Type != models.CouponTypeFixed {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ประเภทส่วนลดไม่ถูกต้อง"})
		return
	}
	if req.Value <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "มูลค่าส่วนลดต้องมากกว่า 0"})
		return
	}
	if req.Type == models.CouponTypePercent && req.Value > 100 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ส่วนลดเปอร์เซ็นต์ต้องไม่เกิน 100"})
		return
	}

	active := true
	if req.Active != nil {
		active = *req.Active
	}

	coupon := models.Coupon{
		Code:        code,
		Type:        req.Type,
		Value:       req.Value,
		MinPurchase: req.MinPurchase,
		MaxUses:     req.MaxUses,
		ExpiresAt:   req.ExpiresAt,
		Active:      active,
	}
	if err := database.DB.Create(&coupon).Error; err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "โค้ดนี้มีอยู่แล้ว"})
		return
	}
	c.JSON(http.StatusCreated, coupon)
}

func AdminUpdateCoupon(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	var coupon models.Coupon
	if err := database.DB.First(&coupon, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}
	var req couponPayload
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if req.Type != models.CouponTypePercent && req.Type != models.CouponTypeFixed {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ประเภทส่วนลดไม่ถูกต้อง"})
		return
	}
	if req.Value <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "มูลค่าส่วนลดต้องมากกว่า 0"})
		return
	}
	if req.Type == models.CouponTypePercent && req.Value > 100 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ส่วนลดเปอร์เซ็นต์ต้องไม่เกิน 100"})
		return
	}

	coupon.Code = normalizeCouponCode(req.Code)
	coupon.Type = req.Type
	coupon.Value = req.Value
	coupon.MinPurchase = req.MinPurchase
	coupon.MaxUses = req.MaxUses
	coupon.ExpiresAt = req.ExpiresAt
	if req.Active != nil {
		coupon.Active = *req.Active
	}
	if err := database.DB.Save(&coupon).Error; err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "โค้ดนี้มีอยู่แล้ว"})
		return
	}
	c.JSON(http.StatusOK, coupon)
}

func AdminDeleteCoupon(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	if err := database.DB.Delete(&models.Coupon{}, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}
