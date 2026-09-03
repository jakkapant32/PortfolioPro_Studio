package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"portfoliopro-backend/config"
	"portfoliopro-backend/database"
	"portfoliopro-backend/models"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
)

func GetPublicPortfolio(c *gin.Context) {
	var items []models.PortfolioItem
	database.DB.Where("published = ?", true).Order("sort_order ASC, id ASC").Find(&items)
	c.JSON(http.StatusOK, gin.H{"items": mapPortfolioItems(items)})
}

func GetPublicPortfolioBySlug(c *gin.Context) {
	var item models.PortfolioItem
	if err := database.DB.Where("slug = ? AND published = ?", c.Param("slug"), true).First(&item).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}
	c.JSON(http.StatusOK, mapPortfolioItem(item))
}

func GetPublicBlog(c *gin.Context) {
	var posts []models.BlogPost
	database.DB.Where("published = ?", true).Order("sort_order ASC, id ASC").Find(&posts)
	c.JSON(http.StatusOK, gin.H{"items": posts})
}

func GetPublicBlogBySlug(c *gin.Context) {
	var post models.BlogPost
	if err := database.DB.Where("slug = ? AND published = ?", c.Param("slug"), true).First(&post).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}
	c.JSON(http.StatusOK, post)
}

func GetPublicSiteConfig(c *gin.Context) {
	var cfg models.SiteConfig
	if err := database.DB.First(&cfg, 1).Error; err != nil {
		c.JSON(http.StatusOK, defaultSiteConfig())
		return
	}
	var data map[string]interface{}
	if err := json.Unmarshal([]byte(cfg.Data), &data); err != nil {
		c.JSON(http.StatusOK, defaultSiteConfig())
		return
	}
	c.JSON(http.StatusOK, data)
}

func defaultSiteConfig() gin.H {
	return gin.H{
		"name": "PortfolioPro Studio", "tagline": "WEBSITE • SYSTEM • SOLUTION",
		"email": "jakkapant32@gmail.com", "phone": "064-523-8150", "phoneTel": "0645238150",
		"promptPayPhone": "0645238150", "phoneHours": "จันทร์–ศุกร์ 9:00–18:00",
		"bankName": "พร้อมเพย์", "bankAccountName": "PortfolioPro Studio", "bankAccountNumber": "0645238150",
		"lineId": "@897ruanb", "lineUrl": "https://lin.ee/WTC1UGK",
		"siteUrl": "https://portfoliopro.studio",
		"social": gin.H{"facebook": "https://www.facebook.com/jjakkapan.cchinsopa/", "instagram": "https://www.instagram.com/lm_jakk/"},
	}
}

func mapPortfolioItems(items []models.PortfolioItem) []gin.H {
	out := make([]gin.H, 0, len(items))
	for _, item := range items {
		out = append(out, mapPortfolioItem(item))
	}
	return out
}

func mapPortfolioItem(item models.PortfolioItem) gin.H {
	var features []string
	_ = json.Unmarshal([]byte(item.Features), &features)
	return gin.H{
		"id": item.ID, "slug": item.Slug, "category": item.Category, "tag": item.Tag,
		"title": item.Title, "description": item.Description, "price": item.Price,
		"deliveryTime": item.DeliveryTime, "image": item.Image, "gradient": item.Gradient,
		"features": features, "published": item.Published, "sort_order": item.SortOrder,
	}
}

type portfolioPayload struct {
	Slug         string   `json:"slug" binding:"required"`
	Category     string   `json:"category" binding:"required"`
	Tag          string   `json:"tag"`
	Title        string   `json:"title" binding:"required"`
	Description  string   `json:"description"`
	Price        float64  `json:"price"`
	DeliveryTime string   `json:"delivery_time"`
	Image        string   `json:"image"`
	Gradient     string   `json:"gradient"`
	Features     []string `json:"features"`
	SortOrder    int      `json:"sort_order"`
	Published    bool     `json:"published"`
}

func AdminListPortfolio(c *gin.Context) {
	var items []models.PortfolioItem
	database.DB.Order("sort_order ASC, id ASC").Find(&items)
	c.JSON(http.StatusOK, gin.H{"items": mapPortfolioItems(items)})
}

func AdminCreatePortfolio(c *gin.Context) {
	var req portfolioPayload
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	features, _ := json.Marshal(req.Features)
	item := models.PortfolioItem{
		Slug: strings.TrimSpace(req.Slug), Category: req.Category, Tag: req.Tag, Title: req.Title,
		Description: req.Description, Price: req.Price, DeliveryTime: req.DeliveryTime,
		Image: req.Image, Gradient: req.Gradient, Features: string(features),
		SortOrder: req.SortOrder, Published: req.Published,
	}
	if err := database.DB.Create(&item).Error; err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "slug ซ้ำหรือบันทึกไม่สำเร็จ"})
		return
	}
	c.JSON(http.StatusCreated, mapPortfolioItem(item))
}

func AdminUpdatePortfolio(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 64)
	var item models.PortfolioItem
	if err := database.DB.First(&item, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}
	var req portfolioPayload
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	features, _ := json.Marshal(req.Features)
	item.Slug = strings.TrimSpace(req.Slug)
	item.Category = req.Category
	item.Tag = req.Tag
	item.Title = req.Title
	item.Description = req.Description
	item.Price = req.Price
	item.DeliveryTime = req.DeliveryTime
	item.Image = req.Image
	item.Gradient = req.Gradient
	item.Features = string(features)
	item.SortOrder = req.SortOrder
	item.Published = req.Published
	if err := database.DB.Save(&item).Error; err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "บันทึกไม่สำเร็จ"})
		return
	}
	c.JSON(http.StatusOK, mapPortfolioItem(item))
}

func AdminDeletePortfolio(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 64)
	if err := database.DB.Delete(&models.PortfolioItem{}, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

type blogPayload struct {
	Slug      string `json:"slug" binding:"required"`
	Title     string `json:"title" binding:"required"`
	Excerpt   string `json:"excerpt"`
	Date      string `json:"date"`
	Tag       string `json:"tag"`
	Image     string `json:"image"`
	Content   string `json:"content"`
	SortOrder int    `json:"sort_order"`
	Published bool   `json:"published"`
}

func AdminListBlog(c *gin.Context) {
	var posts []models.BlogPost
	database.DB.Order("sort_order ASC, id ASC").Find(&posts)
	c.JSON(http.StatusOK, gin.H{"items": posts})
}

func AdminCreateBlog(c *gin.Context) {
	var req blogPayload
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	post := models.BlogPost{
		Slug: strings.TrimSpace(req.Slug), Title: req.Title, Excerpt: req.Excerpt,
		Date: req.Date, Tag: req.Tag, Image: req.Image, Content: req.Content,
		SortOrder: req.SortOrder, Published: req.Published,
	}
	if err := database.DB.Create(&post).Error; err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "slug ซ้ำหรือบันทึกไม่สำเร็จ"})
		return
	}
	c.JSON(http.StatusCreated, post)
}

func AdminUpdateBlog(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 64)
	var post models.BlogPost
	if err := database.DB.First(&post, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}
	var req blogPayload
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	post.Slug = strings.TrimSpace(req.Slug)
	post.Title = req.Title
	post.Excerpt = req.Excerpt
	post.Date = req.Date
	post.Tag = req.Tag
	post.Image = req.Image
	post.Content = req.Content
	post.SortOrder = req.SortOrder
	post.Published = req.Published
	if err := database.DB.Save(&post).Error; err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "บันทึกไม่สำเร็จ"})
		return
	}
	c.JSON(http.StatusOK, post)
}

func AdminDeleteBlog(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 64)
	database.DB.Delete(&models.BlogPost{}, id)
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

func AdminGetSiteConfig(c *gin.Context) {
	var cfg models.SiteConfig
	if err := database.DB.First(&cfg, 1).Error; err != nil {
		c.JSON(http.StatusOK, defaultSiteConfig())
		return
	}
	var data map[string]interface{}
	json.Unmarshal([]byte(cfg.Data), &data)
	c.JSON(http.StatusOK, data)
}

func AdminUpdateSiteConfig(c *gin.Context) {
	var data map[string]interface{}
	if err := c.ShouldBindJSON(&data); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	raw, _ := json.Marshal(data)
	var cfg models.SiteConfig
	if err := database.DB.First(&cfg, 1).Error; err != nil {
		cfg = models.SiteConfig{ID: 1, Data: string(raw)}
		database.DB.Create(&cfg)
	} else {
		cfg.Data = string(raw)
		database.DB.Save(&cfg)
	}
	c.JSON(http.StatusOK, data)
}

func AdminUpdateOrder(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 64)
	var req struct {
		Status        *string  `json:"status"`
		CustomerName  *string  `json:"customer_name"`
		CustomerEmail *string  `json:"customer_email"`
		PaymentMethod *string  `json:"payment_method"`
		Total         *float64 `json:"total"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	var order models.Order
	if err := database.DB.First(&order, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}
	if req.CustomerName != nil {
		order.CustomerName = strings.TrimSpace(*req.CustomerName)
	}
	if req.CustomerEmail != nil {
		order.CustomerEmail = strings.ToLower(strings.TrimSpace(*req.CustomerEmail))
	}
	if req.PaymentMethod != nil {
		order.PaymentMethod = strings.TrimSpace(*req.PaymentMethod)
	}
	if req.Total != nil && *req.Total > 0 {
		order.Total = *req.Total
		if order.Subtotal <= 0 {
			order.Subtotal = *req.Total
		}
		order.AmountSatang = int64(*req.Total*100 + 0.5)
	}
	if req.Status != nil && *req.Status != "" {
		if *req.Status == "successful" {
			markOrderSuccessful(&order)
			c.JSON(http.StatusOK, order)
			return
		}
		order.Status = *req.Status
	}
	database.DB.Save(&order)
	c.JSON(http.StatusOK, order)
}

func AdminDeleteOrder(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 64)
	if err := database.DB.Delete(&models.Order{}, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

func AdminCreateUser(c *gin.Context) {
	var req struct {
		Name     string `json:"name" binding:"required"`
		Email    string `json:"email" binding:"required,email"`
		Password string `json:"password" binding:"required,min=8"`
		Role     string `json:"role"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	email := strings.ToLower(strings.TrimSpace(req.Email))
	name := strings.TrimSpace(req.Name)
	role := req.Role
	if role == "" {
		role = models.RoleCustomer
	}
	if role != models.RoleCustomer && role != models.RoleAdmin {
		c.JSON(http.StatusBadRequest, gin.H{"error": "บทบาทไม่ถูกต้อง"})
		return
	}
	var existing models.User
	if err := database.DB.Where("email = ?", email).First(&existing).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "อีเมลนี้ถูกใช้งานแล้ว"})
		return
	}
	if msg := config.ValidatePassword(req.Password); msg != "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": msg})
		return
	}
	hashed, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to hash password"})
		return
	}
	user := models.User{
		Name:     name,
		Email:    email,
		Password: string(hashed),
		Role:     role,
	}
	if err := database.DB.Create(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "สร้างสมาชิกไม่สำเร็จ"})
		return
	}
	c.JSON(http.StatusCreated, userResponse(user))
}

func AdminUpdateUser(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 64)
	adminID := c.GetUint("userID")
	var req struct {
		Name     *string `json:"name"`
		Email    *string `json:"email"`
		Password *string `json:"password"`
		Role     *string `json:"role"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	var user models.User
	if err := database.DB.First(&user, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}
	if req.Role != nil {
		if uint(id) == adminID {
			c.JSON(http.StatusBadRequest, gin.H{"error": "ไม่สามารถเปลี่ยนบทบาทตัวเองได้"})
			return
		}
		if *req.Role != models.RoleCustomer && *req.Role != models.RoleAdmin {
			c.JSON(http.StatusBadRequest, gin.H{"error": "บทบาทไม่ถูกต้อง"})
			return
		}
		user.Role = *req.Role
	}
	if req.Name != nil {
		name := strings.TrimSpace(*req.Name)
		if name == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "กรุณาระบุชื่อ"})
			return
		}
		user.Name = name
	}
	if req.Email != nil {
		email := strings.ToLower(strings.TrimSpace(*req.Email))
		if email == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "กรุณาระบุอีเมล"})
			return
		}
		var existing models.User
		if err := database.DB.Where("email = ? AND id != ?", email, user.ID).First(&existing).Error; err == nil {
			c.JSON(http.StatusConflict, gin.H{"error": "อีเมลนี้ถูกใช้งานแล้ว"})
			return
		}
		user.Email = email
	}
	if req.Password != nil && *req.Password != "" {
		if msg := config.ValidatePassword(*req.Password); msg != "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": msg})
			return
		}
		hashed, err := bcrypt.GenerateFromPassword([]byte(*req.Password), bcrypt.DefaultCost)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to hash password"})
			return
		}
		user.Password = string(hashed)
	}
	database.DB.Save(&user)
	c.JSON(http.StatusOK, userResponse(user))
}

func AdminDeleteUser(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 64)
	adminID := c.GetUint("userID")
	if uint(id) == adminID {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ไม่สามารถลบบัญชีตัวเองได้"})
		return
	}
	if err := database.DB.Delete(&models.User{}, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

func AdminDeleteContact(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 64)
	database.DB.Delete(&models.Contact{}, id)
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

func AdminDeleteQuotation(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 64)
	database.DB.Delete(&models.Quotation{}, id)
	c.JSON(http.StatusOK, gin.H{"ok": true})
}
