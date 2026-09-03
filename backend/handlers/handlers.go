package handlers

import (
	"encoding/json"
	"net/http"

	"portfoliopro-backend/database"
	"portfoliopro-backend/models"

	"github.com/gin-gonic/gin"
)

type CartItem struct {
	ID    int     `json:"id"`
	Title string  `json:"title"`
	Price float64 `json:"price"`
}

type QuotationRequest struct {
	Items  []CartItem `json:"items"`
	Total  float64    `json:"total"`
	Source string     `json:"source"`
	Name   string     `json:"name"`
	Email  string     `json:"email"`
	Phone  string     `json:"phone"`
}

type ContactRequest struct {
	Name    string     `json:"name" binding:"required"`
	Email   string     `json:"email" binding:"required"`
	Phone   string     `json:"phone"`
	Service string     `json:"service"`
	Message string     `json:"message"`
	Items   []CartItem `json:"items"`
	Total   float64    `json:"total"`
}

func HealthCheck(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"status": "ok", "service": "PortfolioPro Studio API"})
}

func CreateQuotation(c *gin.Context) {
	var req QuotationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if len(req.Items) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "items are required"})
		return
	}

	itemsJSON, _ := json.Marshal(req.Items)

	quotation := models.Quotation{
		Name:    req.Name,
		Email:   req.Email,
		Phone:   req.Phone,
		Items:   string(itemsJSON),
		Total:   req.Total,
		Source:  req.Source,
		Message: "Quotation request from cart",
	}

	if err := database.DB.Create(&quotation).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save quotation"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Quotation submitted successfully",
		"id":      quotation.ID,
	})
}

func CreateContact(c *gin.Context) {
	var req ContactRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	itemsJSON := ""
	if len(req.Items) > 0 {
		data, _ := json.Marshal(req.Items)
		itemsJSON = string(data)
	}

	contact := models.Contact{
		Name:    req.Name,
		Email:   req.Email,
		Phone:   req.Phone,
		Service: req.Service,
		Message: req.Message,
		Items:   itemsJSON,
		Total:   req.Total,
	}

	if err := database.DB.Create(&contact).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save contact"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Contact form submitted successfully",
		"id":      contact.ID,
	})
}
