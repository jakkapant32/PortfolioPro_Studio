package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"portfoliopro-backend/database"
	"portfoliopro-backend/models"
	"portfoliopro-backend/notify"

	"github.com/gin-gonic/gin"
)

const (
	slipMaxBytes = 5 << 20
	slipDir      = "uploads/slips"
)

var allowedSlipTypes = map[string]string{
	"image/jpeg": ".jpg",
	"image/png":  ".png",
	"image/webp": ".webp",
}

func bankTransferDetails() gin.H {
	details := gin.H{
		"bank_name":        getenvDefault("BANK_NAME", "พร้อมเพย์"),
		"account_name":     getenvDefault("BANK_ACCOUNT_NAME", "PortfolioPro Studio"),
		"account_number":   getenvDefault("BANK_ACCOUNT_NUMBER", promptPayPhone()),
		"promptpay_phone":  promptPayPhone(),
	}

	var cfg models.SiteConfig
	if err := database.DB.First(&cfg, 1).Error; err == nil && cfg.Data != "" {
		var data map[string]interface{}
		if json.Unmarshal([]byte(cfg.Data), &data) == nil {
			if v, ok := data["bankName"].(string); ok && strings.TrimSpace(v) != "" {
				details["bank_name"] = strings.TrimSpace(v)
			}
			if v, ok := data["bankAccountName"].(string); ok && strings.TrimSpace(v) != "" {
				details["account_name"] = strings.TrimSpace(v)
			}
			if v, ok := data["bankAccountNumber"].(string); ok && strings.TrimSpace(v) != "" {
				details["account_number"] = strings.TrimSpace(v)
			}
			if v, ok := data["promptPayPhone"].(string); ok && strings.TrimSpace(v) != "" {
				details["promptpay_phone"] = strings.TrimSpace(v)
			}
		}
	}
	return details
}

func getenvDefault(key, fallback string) string {
	if v := strings.TrimSpace(os.Getenv(key)); v != "" {
		return v
	}
	return fallback
}

func attachSlipFlags(resp gin.H, order models.Order) gin.H {
	resp["has_slip"] = strings.TrimSpace(order.SlipFilename) != ""
	resp["slip_uploaded_at"] = order.SlipUploadedAt
	resp["reject_reason"] = order.RejectReason
	if resp["has_slip"] == true {
		resp["slip_url"] = fmt.Sprintf("/api/payments/%d/slip", order.ID)
	}
	return resp
}

func createBankTransferOrder(c *gin.Context, req CreatePaymentRequest) {
	pricing, err := prepareOrderPricing(req.Items, req.CouponCode)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	depositPercent := normalizeDepositPercent(req.DepositPercent)
	chargeBaht, err := validateDepositCharge(pricing.Total, depositPercent)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	chargeSatang, err := satangFromBaht(chargeBaht)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID := c.GetUint("userID")
	var user models.User
	if err := database.DB.First(&user, userID).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "user not found"})
		return
	}

	itemsJSON, _ := json.Marshal(pricing.Items)
	order := models.Order{
		UserID:         userID,
		CustomerName:   user.Name,
		CustomerEmail:  user.Email,
		Items:          string(itemsJSON),
		Subtotal:       pricing.Subtotal,
		DiscountAmount: pricing.DiscountAmount,
		CouponCode:     pricing.CouponCode,
		Total:          pricing.Total,
		DepositPercent: depositPercent,
		AmountSatang:   chargeSatang,
		PaymentMethod:  "bank_transfer",
		Status:         "awaiting_payment",
	}

	if err := database.DB.Create(&order).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save order"})
		return
	}

	c.JSON(http.StatusCreated, buildBankTransferResponse(order))
}

func buildBankTransferResponse(order models.Order) gin.H {
	chargeAmount := float64(order.AmountSatang) / 100
	resp := gin.H{
		"order_id":        order.ID,
		"method":          "bank_transfer",
		"mode":            "bank_transfer",
		"amount":          chargeAmount,
		"subtotal":        order.Subtotal,
		"discount_amount": order.DiscountAmount,
		"coupon_code":     order.CouponCode,
		"status":          order.Status,
		"total":           order.Total,
		"deposit_percent": normalizeDepositPercent(order.DepositPercent),
		"amount_due":      orderAmountDue(&order),
		"sla_label":       slaLabelForDeposit(order.DepositPercent),
	}
	for k, v := range orderPaymentFields(order) {
		resp[k] = v
	}
	for k, v := range bankTransferDetails() {
		resp[k] = v
	}
	return attachSlipFlags(resp, order)
}

func UploadPaymentSlip(c *gin.Context) {
	userID := c.GetUint("userID")
	orderID, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid order id"})
		return
	}

	var order models.Order
	if err := database.DB.Where("id = ? AND user_id = ?", orderID, userID).First(&order).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "order not found"})
		return
	}

	if order.Status != "awaiting_payment" && order.Status != "rejected" && order.Status != "slip_submitted" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ออเดอร์นี้ไม่สามารถแนบสลิปได้"})
		return
	}

	file, header, err := c.Request.FormFile("slip")
	if err != nil {
		msg := "กรุณาเลือกไฟล์สลิป"
		if strings.Contains(strings.ToLower(err.Error()), "too large") {
			msg = "ไฟล์ใหญ่เกินไป กรุณาใช้รูปไม่เกิน 5MB"
		}
		c.JSON(http.StatusBadRequest, gin.H{"error": msg})
		return
	}
	defer file.Close()

	if header.Size > slipMaxBytes {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ไฟล์ใหญ่เกิน 5MB"})
		return
	}

	head := make([]byte, 512)
	n, _ := file.Read(head)
	contentType := http.DetectContentType(head[:n])
	ext, ok := allowedSlipTypes[contentType]
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "รองรับเฉพาะไฟล์ JPG, PNG หรือ WEBP"})
		return
	}

	if err := os.MkdirAll(slipDir, 0o755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "ไม่สามารถบันทึกสลิปได้"})
		return
	}

	token := make([]byte, 8)
	if _, err := rand.Read(token); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "ไม่สามารถบันทึกสลิปได้"})
		return
	}
	filename := fmt.Sprintf("%d_%s%s", order.ID, hex.EncodeToString(token), ext)
	dest := filepath.Join(slipDir, filename)

	out, err := os.Create(dest)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "ไม่สามารถบันทึกสลิปได้"})
		return
	}
	defer out.Close()

	seeked := false
	if _, err := file.Seek(0, io.SeekStart); err == nil {
		seeked = true
	}
	if !seeked {
		if _, err := out.Write(head[:n]); err != nil {
			_ = os.Remove(dest)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "ไม่สามารถบันทึกสลิปได้"})
			return
		}
	}
	if _, err := io.Copy(out, file); err != nil {
		_ = os.Remove(dest)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "ไม่สามารถบันทึกสลิปได้"})
		return
	}

	if old := strings.TrimSpace(order.SlipFilename); old != "" {
		_ = os.Remove(filepath.Join(slipDir, filepath.Base(old)))
	}

	now := time.Now()
	order.SlipFilename = filename
	order.SlipOriginalName = header.Filename
	order.SlipUploadedAt = &now
	order.Status = "slip_submitted"
	order.RejectReason = ""
	if err := database.DB.Save(&order).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update order"})
		return
	}

	notify.SlipSubmittedAsync(order)
	c.JSON(http.StatusOK, buildBankTransferResponse(order))
}

func GetPaymentSlip(c *gin.Context) {
	userID := c.GetUint("userID")
	servePaymentSlip(c, func(order *models.Order) bool {
		return order.UserID == userID
	})
}

func AdminGetPaymentSlip(c *gin.Context) {
	servePaymentSlip(c, func(order *models.Order) bool { return true })
}

func servePaymentSlip(c *gin.Context, allow func(*models.Order) bool) {
	orderID, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid order id"})
		return
	}

	var order models.Order
	if err := database.DB.First(&order, orderID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "order not found"})
		return
	}
	if !allow(&order) {
		c.JSON(http.StatusForbidden, gin.H{"error": "ไม่มีสิทธิ์ดูสลิปนี้"})
		return
	}
	if strings.TrimSpace(order.SlipFilename) == "" {
		c.JSON(http.StatusNotFound, gin.H{"error": "ยังไม่มีสลิป"})
		return
	}

	name := filepath.Base(order.SlipFilename)
	path := filepath.Join(slipDir, name)
	if _, err := os.Stat(path); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "ไม่พบไฟล์สลิป"})
		return
	}
	c.File(path)
}

func AdminConfirmPayment(c *gin.Context) {
	orderID, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid order id"})
		return
	}

	var order models.Order
	if err := database.DB.First(&order, orderID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "order not found"})
		return
	}
	if order.Status != "slip_submitted" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ยืนยันได้เฉพาะออเดอร์ที่ลูกค้าแนบสลิปแล้ว"})
		return
	}
	if strings.TrimSpace(order.SlipFilename) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ยังไม่มีสลิปให้ตรวจสอบ"})
		return
	}

	confirmTransferPayment(&order)
	database.DB.First(&order, order.ID)
	c.JSON(http.StatusOK, gin.H{"order": order, "ok": true})
}

func AdminRejectPayment(c *gin.Context) {
	orderID, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid order id"})
		return
	}

	var req struct {
		Reason string `json:"reason"`
	}
	_ = c.ShouldBindJSON(&req)

	var order models.Order
	if err := database.DB.First(&order, orderID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "order not found"})
		return
	}
	if order.Status != "slip_submitted" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ปฏิเสธได้เฉพาะออเดอร์ที่รอตรวจสอบสลิป"})
		return
	}

	reason := strings.TrimSpace(req.Reason)
	if reason == "" {
		reason = "สลิปไม่ถูกต้อง กรุณาโอนใหม่แล้วแนบสลิปอีกครั้ง"
	}
	order.Status = "rejected"
	order.RejectReason = reason
	if err := database.DB.Save(&order).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update order"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"order": order, "ok": true})
}
