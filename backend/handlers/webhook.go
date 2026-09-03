package handlers

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"io"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"portfoliopro-backend/config"
	"portfoliopro-backend/database"
	"portfoliopro-backend/models"

	"github.com/gin-gonic/gin"
)

type omiseEventPayload struct {
	Object string `json:"object"`
	ID     string `json:"id"`
	Key    string `json:"key"`
	Data   struct {
		Object string `json:"object"`
		ID     string `json:"id"`
		Status string `json:"status"`
	} `json:"data"`
}

// OmiseWebhook receives Omise events (charge.complete / charge.update / etc.).
// Always re-fetches the charge from Omise API before updating the order.
func OmiseWebhook(c *gin.Context) {
	rawBody, err := io.ReadAll(c.Request.Body)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid body"})
		return
	}

	webhookSecret := strings.TrimSpace(os.Getenv("OMISE_WEBHOOK_SECRET"))
	if webhookSecret == "" {
		if config.IsProduction() {
			c.JSON(http.StatusServiceUnavailable, gin.H{"error": "webhook not configured"})
			return
		}
		log.Println("[webhook] WARNING: OMISE_WEBHOOK_SECRET not set — accepting unsigned webhooks (dev only)")
	} else {
		sig := c.GetHeader("Omise-Signature")
		ts := c.GetHeader("Omise-Signature-Timestamp")
		if !verifyOmiseSignature(webhookSecret, sig, ts, rawBody) {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid signature"})
			return
		}
		if ts != "" {
			if unix, err := strconv.ParseInt(ts, 10, 64); err == nil {
				if diff := time.Now().Unix() - unix; diff > 300 || diff < -60 {
					c.JSON(http.StatusUnauthorized, gin.H{"error": "stale webhook"})
					return
				}
			}
		}
	}

	var event omiseEventPayload
	if err := json.Unmarshal(rawBody, &event); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid json"})
		return
	}

	if event.Data.Object != "charge" || event.Data.ID == "" {
		c.JSON(http.StatusOK, gin.H{"ok": true, "ignored": true})
		return
	}

	chargeData, statusCode, err := omiseRequest("GET", "/charges/"+event.Data.ID, nil)
	if err != nil || statusCode >= 400 {
		log.Printf("[webhook] failed to verify charge %s: %v status=%d", event.Data.ID, err, statusCode)
		c.JSON(http.StatusBadGateway, gin.H{"error": "charge verification failed"})
		return
	}

	var charge omiseChargeResponse
	if err := json.Unmarshal(chargeData, &charge); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "invalid charge"})
		return
	}

	var order models.Order
	if err := database.DB.Where("omise_charge_id = ?", charge.ID).First(&order).Error; err != nil {
		log.Printf("[webhook] no order for charge %s (event=%s)", charge.ID, event.Key)
		c.JSON(http.StatusOK, gin.H{"ok": true, "order_found": false})
		return
	}

	applyOmiseStatus(&order, charge.Status)
	log.Printf("[webhook] order #%d → %s (event=%s charge=%s)", order.ID, charge.Status, event.Key, charge.ID)
	c.JSON(http.StatusOK, gin.H{"ok": true, "order_id": order.ID, "status": order.Status})
}

func verifyOmiseSignature(secretB64, signatureHeader, timestamp string, rawBody []byte) bool {
	if signatureHeader == "" || timestamp == "" {
		return false
	}
	secret, err := base64.StdEncoding.DecodeString(secretB64)
	if err != nil || len(secret) == 0 {
		log.Printf("[webhook] invalid OMISE_WEBHOOK_SECRET encoding")
		return false
	}

	mac := hmac.New(sha256.New, secret)
	mac.Write([]byte(timestamp))
	mac.Write([]byte("."))
	mac.Write(rawBody)
	expected := mac.Sum(nil)

	for _, part := range strings.Split(signatureHeader, ",") {
		part = strings.TrimSpace(part)
		got, err := hex.DecodeString(part)
		if err != nil || len(got) != len(expected) {
			continue
		}
		if hmac.Equal(got, expected) {
			return true
		}
	}
	return false
}
