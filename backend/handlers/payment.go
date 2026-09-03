package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"portfoliopro-backend/database"
	"portfoliopro-backend/models"

	"github.com/gin-gonic/gin"
)

const omiseAPIBase = "https://api.omise.co"
const omiseMinSatang int64 = 2000 // Omise ขั้นต่ำ ฿20

var omiseHTTPClient = &http.Client{Timeout: 30 * time.Second}

var allowedPaymentMethods = map[string]string{
	"bank_transfer": "bank_transfer",
	"promptpay":     "bank_transfer",
}

type CreatePaymentRequest struct {
	Items          []CartItem `json:"items" binding:"required"`
	Total          float64    `json:"total"` // ignored — computed server-side from DB prices
	Method         string     `json:"method"`
	DepositPercent int        `json:"deposit_percent"`
	CouponCode     string     `json:"coupon_code"`
	OmiseToken     string     `json:"omise_token"`
	ReturnURI      string     `json:"return_uri"`
}

type PayBalanceRequest struct {
	Method     string `json:"method" binding:"required"`
	OmiseToken string `json:"omise_token"`
	ReturnURI  string `json:"return_uri"`
}

type orderPricing struct {
	Subtotal       float64
	DiscountAmount float64
	Total          float64
	CouponCode     string
	AmountSatang   int64
	Items          []CartItem
}

func prepareOrderPricing(items []CartItem, couponCode string) (*orderPricing, error) {
	validated, subtotal, err := validateCartItems(items)
	if err != nil {
		return nil, err
	}

	total, discount, code, err := applyCouponToSubtotal(couponCode, subtotal)
	if err != nil {
		return nil, err
	}

	amountSatang, err := satangFromBaht(total)
	if err != nil {
		return nil, err
	}

	return &orderPricing{
		Subtotal:       subtotal,
		DiscountAmount: discount,
		Total:          total,
		CouponCode:     code,
		AmountSatang:   amountSatang,
		Items:          validated,
	}, nil
}

type omiseSourceResponse struct {
	ID            string `json:"id"`
	ChargeStatus  string `json:"charge_status"`
	AuthorizeURI  string `json:"authorize_uri"`
	ScannableCode struct {
		Image struct {
			DownloadURI string `json:"download_uri"`
		} `json:"image"`
	} `json:"scannable_code"`
}

type omiseChargeResponse struct {
	ID     string `json:"id"`
	Status string `json:"status"`
	Source struct {
		ScannableCode struct {
			Image struct {
				DownloadURI string `json:"download_uri"`
			} `json:"image"`
		} `json:"scannable_code"`
	} `json:"source"`
}

func omiseSecretKey() string {
	return os.Getenv("OMISE_SECRET_KEY")
}

func omisePublicKey() string {
	return os.Getenv("OMISE_PUBLIC_KEY")
}

func omiseRequest(method, path string, body interface{}) ([]byte, int, error) {
	secret := omiseSecretKey()
	if secret == "" {
		return nil, 0, fmt.Errorf("OMISE_SECRET_KEY is not configured")
	}

	var payload []byte
	if body != nil {
		var err error
		payload, err = json.Marshal(body)
		if err != nil {
			return nil, 0, err
		}
	}

	var lastErr error
	for attempt := 0; attempt < 2; attempt++ {
		var reqBody io.Reader
		if payload != nil {
			reqBody = bytes.NewReader(payload)
		}
		req, err := http.NewRequest(method, omiseAPIBase+path, reqBody)
		if err != nil {
			return nil, 0, err
		}
		req.SetBasicAuth(secret, "")
		req.Header.Set("Content-Type", "application/json")

		resp, err := omiseHTTPClient.Do(req)
		if err != nil {
			lastErr = err
			continue
		}

		data, readErr := io.ReadAll(resp.Body)
		resp.Body.Close()
		if readErr != nil {
			lastErr = readErr
			continue
		}
		return data, resp.StatusCode, nil
	}

	if lastErr != nil {
		return nil, 0, fmt.Errorf("ไม่สามารถเชื่อมต่อระบบชำระเงินได้ — ลองใหม่อีกครั้ง")
	}
	return nil, 0, fmt.Errorf("ไม่สามารถเชื่อมต่อระบบชำระเงินได้")
}

func satangFromBaht(total float64) (int64, error) {
	if total < 1 {
		return 0, fmt.Errorf("ยอดขั้นต่ำ ฿1")
	}
	satang := int64(total*100 + 0.5)
	if satang < 100 {
		return 0, fmt.Errorf("ยอดขั้นต่ำ ฿1")
	}
	return satang, nil
}

func isRedirectMethod(method string) bool {
	return method != "promptpay" && method != "card"
}

func promptPayPhone() string {
	if phone := os.Getenv("PROMPTPAY_PHONE"); phone != "" {
		return phone
	}
	return "0645238150"
}

func omiseConfigured() bool {
	return omiseSecretKey() != "" && omisePublicKey() != ""
}

func omiseTestMode() bool {
	return strings.HasPrefix(omisePublicKey(), "pkey_test_")
}

func GetPaymentConfig(c *gin.Context) {
	details := bankTransferDetails()
	methods := []gin.H{
		{
			"id":          "bank_transfer",
			"label":       "โอนเงิน / PromptPay",
			"description": "โอนแล้วแนบสลิป ให้แอดมินตรวจสอบ",
			"type":        "transfer",
			"available":   true,
		},
	}

	c.JSON(http.StatusOK, gin.H{
		"configured":        true,
		"promptpay_phone":   details["promptpay_phone"],
		"bank_name":         details["bank_name"],
		"account_name":      details["account_name"],
		"account_number":    details["account_number"],
		"methods":           methods,
		"deposit_options":   depositOptionsJSON(),
		"slip_max_mb":       5,
	})
}

func createFallbackPayment(c *gin.Context, req CreatePaymentRequest) {
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
		PaymentMethod:  "promptpay",
		Status:         "awaiting_payment",
	}

	if err := database.DB.Create(&order).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save order"})
		return
	}

	resp := gin.H{
		"order_id":        order.ID,
		"method":          "promptpay",
		"mode":            "fallback",
		"promptpay_phone": promptPayPhone(),
		"amount":          chargeBaht,
		"subtotal":        pricing.Subtotal,
		"discount_amount": pricing.DiscountAmount,
		"coupon_code":     pricing.CouponCode,
		"status":          order.Status,
		"total":           pricing.Total,
		"deposit_percent": depositPercent,
		"amount_due":      orderAmountDue(&order),
		"sla_label":       slaLabelForDeposit(depositPercent),
	}
	c.JSON(http.StatusCreated, resp)
}

func CreatePayment(c *gin.Context) {
	var req CreatePaymentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.Method == "" {
		req.Method = "bank_transfer"
	}
	if _, ok := allowedPaymentMethods[req.Method]; !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ช่องทางชำระเงินไม่รองรับ — ใช้การโอนเงินแนบสลิป"})
		return
	}

	createBankTransferOrder(c, req)
}

func CompletePayment(c *gin.Context) {
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

	c.JSON(http.StatusOK, buildBankTransferResponse(order))
}

func GetPaymentStatus(c *gin.Context) {
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

	c.JSON(http.StatusOK, buildBankTransferResponse(order))
}

func GetPaymentQR(c *gin.Context) {
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

	qrURL := order.QRImageURL
	if qrURL == "" && order.OmiseChargeID != "" {
		if fetched, err := fetchChargeQRURL(order.OmiseChargeID); err == nil && fetched != "" {
			qrURL = fetched
			order.QRImageURL = fetched
			database.DB.Save(&order)
		}
	}
	if qrURL == "" {
		c.JSON(http.StatusNotFound, gin.H{"error": "qr code not available"})
		return
	}

	req, err := http.NewRequest("GET", qrURL, nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load qr code"})
		return
	}
	req.SetBasicAuth(omiseSecretKey(), "")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": "ไม่สามารถโหลด QR Code ได้"})
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		c.JSON(http.StatusBadGateway, gin.H{"error": "ไม่สามารถโหลด QR Code ได้"})
		return
	}

	contentType := resp.Header.Get("Content-Type")
	if contentType == "" {
		contentType = "image/png"
	}
	c.DataFromReader(http.StatusOK, resp.ContentLength, contentType, resp.Body, nil)
}

func createSourceOnly(amountSatang int64, sourceType, returnURI string) (*omiseSourceResponse, error) {
	sourceBody := map[string]interface{}{
		"amount":   amountSatang,
		"currency": "thb",
		"type":     sourceType,
	}
	if returnURI != "" {
		sourceBody["return_uri"] = returnURI
	}

	sourceData, sourceStatus, err := omiseRequest("POST", "/sources", sourceBody)
	if err != nil {
		return nil, err
	}
	if sourceStatus >= 400 {
		return nil, fmt.Errorf("%s", parseOmiseError(sourceData))
	}

	var source omiseSourceResponse
	if err := json.Unmarshal(sourceData, &source); err != nil {
		return nil, fmt.Errorf("invalid payment response")
	}
	return &source, nil
}

func createSourceCharge(amountSatang int64, sourceType, returnURI string) (*omiseSourceResponse, *omiseChargeResponse, error) {
	source, err := createSourceOnly(amountSatang, sourceType, returnURI)
	if err != nil {
		return nil, nil, err
	}

	charge, err := createChargeFromSource(amountSatang, source.ID)
	if err != nil {
		return nil, nil, err
	}
	return source, charge, nil
}

func createChargeFromSource(amountSatang int64, sourceID string) (*omiseChargeResponse, error) {
	chargeBody := map[string]interface{}{
		"amount":   amountSatang,
		"currency": "thb",
		"source":   sourceID,
	}
	chargeData, chargeStatus, err := omiseRequest("POST", "/charges", chargeBody)
	if err != nil {
		return nil, fmt.Errorf("ไม่สามารถสร้างรายการชำระเงินได้")
	}
	if chargeStatus >= 400 {
		return nil, fmt.Errorf("%s", parseOmiseError(chargeData))
	}

	var charge omiseChargeResponse
	if err := json.Unmarshal(chargeData, &charge); err != nil {
		return nil, fmt.Errorf("invalid charge response")
	}
	return &charge, nil
}

func createCardCharge(amountSatang int64, token string) (*omiseChargeResponse, error) {
	chargeBody := map[string]interface{}{
		"amount":   amountSatang,
		"currency": "thb",
		"card":     token,
	}
	chargeData, chargeStatus, err := omiseRequest("POST", "/charges", chargeBody)
	if err != nil {
		return nil, fmt.Errorf("ไม่สามารถชำระด้วยบัตรได้")
	}
	if chargeStatus >= 400 {
		return nil, fmt.Errorf("%s", parseOmiseError(chargeData))
	}

	var charge omiseChargeResponse
	if err := json.Unmarshal(chargeData, &charge); err != nil {
		return nil, fmt.Errorf("invalid charge response")
	}
	return &charge, nil
}

func buildPaymentResponse(order models.Order) gin.H {
	chargeAmount := float64(order.AmountSatang) / 100
	resp := gin.H{
		"order_id":          order.ID,
		"charge_id":         order.OmiseChargeID,
		"method":            order.PaymentMethod,
		"amount":            chargeAmount,
		"total":             order.Total,
		"subtotal":          order.Subtotal,
		"discount_amount":   order.DiscountAmount,
		"coupon_code":       order.CouponCode,
		"amount_satang":     order.AmountSatang,
		"status":            order.Status,
		"paid_at":           order.PaidAt,
		"expires_in":        600,
		"authorize_uri":     order.AuthorizeURI,
		"requires_redirect": isRedirectMethod(order.PaymentMethod) && order.AuthorizeURI != "" && order.Status != "successful" && order.Status != "deposit_paid",
	}
	for k, v := range orderPaymentFields(order) {
		resp[k] = v
	}
	if order.PaymentMethod == "promptpay" && order.QRImageURL != "" {
		resp["qr_image_url"] = fmt.Sprintf("/api/payments/%d/qr", order.ID)
		resp["qr_requires_auth"] = true
	} else {
		resp["qr_image_url"] = order.QRImageURL
	}
	if omiseTestMode() && order.OmiseChargeID != "" {
		resp["omise_test_mode"] = true
		resp["omise_charge_id"] = order.OmiseChargeID
	}
	return resp
}

func qrURLFromCharge(charge *omiseChargeResponse) string {
	if charge == nil {
		return ""
	}
	return charge.Source.ScannableCode.Image.DownloadURI
}

func fetchChargeQRURL(chargeID string) (string, error) {
	data, status, err := omiseRequest("GET", "/charges/"+chargeID, nil)
	if err != nil {
		return "", err
	}
	if status >= 400 {
		return "", fmt.Errorf("%s", parseOmiseError(data))
	}
	var charge omiseChargeResponse
	if err := json.Unmarshal(data, &charge); err != nil {
		return "", err
	}
	return qrURLFromCharge(&charge), nil
}

func parseOmiseError(data []byte) string {
	var payload struct {
		Message string `json:"message"`
		Code    string `json:"code"`
	}
	if err := json.Unmarshal(data, &payload); err == nil && payload.Message != "" {
		return payload.Message
	}
	return "payment provider error"
}

func PayOrderBalance(c *gin.Context) {
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

	if order.Status != "deposit_paid" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ออเดอร์นี้ไม่มียอดค้างชำระ"})
		return
	}

	balanceBaht := orderAmountDue(&order)
	if balanceBaht <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ชำระครบแล้ว"})
		return
	}

	balanceSatang, err := satangFromBaht(balanceBaht)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	order.AmountSatang = balanceSatang
	order.PaymentMethod = "bank_transfer"
	order.Status = "awaiting_payment"
	order.SlipFilename = ""
	order.SlipOriginalName = ""
	order.SlipUploadedAt = nil
	order.RejectReason = ""
	if err := database.DB.Save(&order).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update order"})
		return
	}

	c.JSON(http.StatusOK, buildBankTransferResponse(order))
}
