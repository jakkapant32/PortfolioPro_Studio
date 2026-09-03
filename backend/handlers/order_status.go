package handlers

import (
	"time"

	"portfoliopro-backend/database"
	"portfoliopro-backend/models"
	"portfoliopro-backend/notify"
)

// applyOmiseStatus syncs order from Omise charge result and handles deposit/balance.
func applyOmiseStatus(order *models.Order, omiseStatus string) {
	if order == nil || omiseStatus == "" {
		return
	}

	if omiseStatus != "successful" {
		if order.Status != "deposit_paid" && order.Status != "successful" {
			order.Status = omiseStatus
			database.DB.Save(order)
		}
		return
	}

	if order.LastPaidChargeID != "" && order.OmiseChargeID != "" && order.LastPaidChargeID == order.OmiseChargeID {
		return
	}

	wasPaid := order.Status == "deposit_paid" || order.Status == "successful"
	wasFullyPaid := order.Status == "successful"

	paidThisTime := float64(order.AmountSatang) / 100
	order.AmountPaid += paidThisTime
	if order.OmiseChargeID != "" {
		order.LastPaidChargeID = order.OmiseChargeID
	}

	if order.AmountPaid >= order.Total-0.01 {
		order.Status = "successful"
	} else {
		order.Status = "deposit_paid"
	}

	if order.PaidAt == nil {
		now := time.Now()
		order.PaidAt = &now
	}

	database.DB.Save(order)

	if !wasPaid {
		redeemCouponForOrder(order)
		ensureProjectForOrder(order)
		notify.OrderPaidAsync(*order)
		recordPaymentSuccessEvent(order.UserID, order.ID)
	} else if order.Status == "successful" && !wasFullyPaid {
		notify.OrderBalancePaidAsync(*order)
		if order.Status == "successful" {
			recordPaymentSuccessEvent(order.UserID, order.ID)
		}
	}
}

func confirmTransferPayment(order *models.Order) {
	if order == nil {
		return
	}
	if order.Status == "successful" {
		return
	}

	alreadyPaid := normalizedAmountPaid(order)
	wasPaid := alreadyPaid > 0.01
	wasFullyPaid := order.Status == "successful" || alreadyPaid >= order.Total-0.01

	paidThisTime := float64(order.AmountSatang) / 100
	if paidThisTime <= 0 {
		paidThisTime = order.Total - normalizedAmountPaid(order)
	}
	order.AmountPaid = alreadyPaid + paidThisTime
	if order.AmountPaid >= order.Total-0.01 {
		order.AmountPaid = order.Total
		order.Status = "successful"
	} else {
		order.Status = "deposit_paid"
	}

	if order.PaidAt == nil {
		now := time.Now()
		order.PaidAt = &now
	}
	order.RejectReason = ""
	database.DB.Save(order)

	if !wasPaid {
		redeemCouponForOrder(order)
		ensureProjectForOrder(order)
		notify.OrderPaidAsync(*order)
		recordPaymentSuccessEvent(order.UserID, order.ID)
	} else if order.Status == "successful" && !wasFullyPaid {
		notify.OrderBalancePaidAsync(*order)
		recordPaymentSuccessEvent(order.UserID, order.ID)
	}
}

func markOrderSuccessful(order *models.Order) {
	if order == nil {
		return
	}
	hadPaid := order.Status == "deposit_paid" || order.Status == "successful"
	wasFullyPaid := order.Status == "successful"

	order.AmountPaid = order.Total
	order.Status = "successful"
	if order.PaidAt == nil {
		now := time.Now()
		order.PaidAt = &now
	}
	database.DB.Save(order)

	if !hadPaid {
		redeemCouponForOrder(order)
		ensureProjectForOrder(order)
		notify.OrderPaidAsync(*order)
		recordPaymentSuccessEvent(order.UserID, order.ID)
	} else if !wasFullyPaid {
		notify.OrderBalancePaidAsync(*order)
		recordPaymentSuccessEvent(order.UserID, order.ID)
	}
}
