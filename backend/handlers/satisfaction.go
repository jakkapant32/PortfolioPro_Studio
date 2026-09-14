package handlers

import (
	"net/http"
	"strconv"
	"strings"

	"portfoliopro-backend/database"
	"portfoliopro-backend/models"

	"github.com/gin-gonic/gin"
)

type SatisfactionRequest struct {
	Name    string `json:"name" binding:"required"`
	Email   string `json:"email" binding:"required,email"`
	Service string `json:"service"`
	Rating  int    `json:"rating" binding:"required"`
	Comment string `json:"comment"`
}

func CreateSatisfaction(c *gin.Context) {
	var req SatisfactionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.Rating < 1 || req.Rating > 5 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "rating must be between 1 and 5"})
		return
	}

	survey := models.SatisfactionSurvey{
		Name:    strings.TrimSpace(req.Name),
		Email:   strings.ToLower(strings.TrimSpace(req.Email)),
		Service: strings.TrimSpace(req.Service),
		Rating:  req.Rating,
		Comment: strings.TrimSpace(req.Comment),
	}

	if uid, ok := c.Get("userID"); ok {
		id := uid.(uint)
		survey.UserID = &id
	}

	if err := database.DB.Create(&survey).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save survey"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "ขอบคุณสำหรับการประเมิน",
		"id":      survey.ID,
	})
}

func AdminListSatisfactions(c *gin.Context) {
	limit, offset := paginationParams(c)

	query := database.DB.Model(&models.SatisfactionSurvey{}).Order("created_at DESC")

	var total int64
	query.Count(&total)

	var avgRating float64
	database.DB.Model(&models.SatisfactionSurvey{}).Select("COALESCE(AVG(rating), 0)").Scan(&avgRating)

	var items []models.SatisfactionSurvey
	query.Limit(limit).Offset(offset).Find(&items)

	c.JSON(http.StatusOK, gin.H{
		"items":      items,
		"total":      total,
		"avg_rating": avgRating,
		"limit":      limit,
		"offset":     offset,
	})
}

func AdminDeleteSatisfaction(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	if err := database.DB.Delete(&models.SatisfactionSurvey{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "deleted"})
}
