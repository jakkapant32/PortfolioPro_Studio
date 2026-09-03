package handlers

import (
	"fmt"
	"math"

	"portfoliopro-backend/models"

	"github.com/gin-gonic/gin"
)

var allowedDepositPercents = map[int]bool{30: true, 50: true, 100: true}

func normalizeDepositPercent(p int) int {
	if allowedDepositPercents[p] {
		return p
	}
	return 100
}

func chargeAmountForDeposit(total float64, percent int) float64 {
	return math.Round(total * float64(normalizeDepositPercent(percent)) / 100)
}

func normalizedAmountPaid(order *models.Order) float64 {
	if order == nil {
		return 0
	}
	if order.AmountPaid > 0 {
		return order.AmountPaid
	}
	if order.Status == "successful" {
		return order.Total
	}
	return 0
}

func orderAmountDue(order *models.Order) float64 {
	if order == nil {
		return 0
	}
	paid := normalizedAmountPaid(order)
	due := order.Total - paid
	if due < 0 {
		return 0
	}
	return math.Round(due*100) / 100
}

func orderFullyPaid(order *models.Order) bool {
	if order == nil {
		return false
	}
	if order.Status == "successful" {
		return true
	}
	return normalizedAmountPaid(order) >= order.Total-0.01
}

func slaLabelForDeposit(percent int) string {
	switch normalizeDepositPercent(percent) {
	case 100:
		return "คิวด่วน · เริ่มภายใน 1–2 วันทำการ"
	case 50:
		return "คิวปกติ · เริ่มภายใน 3–5 วันทำการ"
	case 30:
		return "คิวรอ · เริ่มภายใน 7–14 วันทำการ"
	default:
		return ""
	}
}

func depositOptionsJSON() []gin.H {
	return []gin.H{
		{"percent": 100, "label": "ชำระเต็ม 100%", "sla": slaLabelForDeposit(100), "recommended": true},
		{"percent": 50, "label": "มัดจำ 50%", "sla": slaLabelForDeposit(50)},
		{"percent": 30, "label": "มัดจำ 30%", "sla": slaLabelForDeposit(30)},
	}
}

func validateDepositCharge(total float64, percent int) (chargeBaht float64, err error) {
	chargeBaht = chargeAmountForDeposit(total, percent)
	if chargeBaht <= 0 {
		return 0, fmt.Errorf("ยอดมัดจำไม่ถูกต้อง")
	}
	if chargeBaht > total {
		return 0, fmt.Errorf("ยอดมัดจำเกินยอดรวม")
	}
	return chargeBaht, nil
}

func orderPaymentFields(order models.Order) gin.H {
	chargeAmount := float64(order.AmountSatang) / 100
	paid := normalizedAmountPaid(&order)
	return gin.H{
		"deposit_percent": normalizeDepositPercent(order.DepositPercent),
		"amount_paid":     paid,
		"amount_due":      orderAmountDue(&order),
		"charge_amount":   chargeAmount,
		"sla_label":       slaLabelForDeposit(order.DepositPercent),
		"fully_paid":      orderFullyPaid(&order),
	}
}
