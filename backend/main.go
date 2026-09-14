package main

import (
	"log"
	"net"
	"net/url"
	"os"
	"strings"
	"time"

	"portfoliopro-backend/config"
	"portfoliopro-backend/database"
	"portfoliopro-backend/handlers"
	"portfoliopro-backend/middleware"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	_ = godotenv.Load()
	config.ValidateStartup()

	if config.IsProduction() {
		gin.SetMode(gin.ReleaseMode)
	}

	database.Connect()

	r := gin.New()
	r.MaxMultipartMemory = 16 << 20
	r.Use(gin.Logger(), gin.Recovery())
	r.Use(middleware.SecurityHeaders())
	r.Use(middleware.BodyLimit(12 << 20))

	if os.Getenv("RENDER") == "true" {
		_ = r.SetTrustedProxies([]string{"0.0.0.0/0", "::/0"})
	}

	allowedOrigins := []string{
		"http://localhost:5173",
		"http://localhost:5174",
		"https://portfoliopro.studio",
		"https://www.portfoliopro.studio",
	}
	if extra := os.Getenv("ALLOWED_ORIGINS"); extra != "" {
		for _, origin := range strings.Split(extra, ",") {
			origin = strings.TrimSpace(origin)
			if origin != "" {
				allowedOrigins = append(allowedOrigins, origin)
			}
		}
	}

	corsCfg := cors.Config{
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		AllowCredentials: true,
	}
	if config.IsProduction() {
		corsCfg.AllowOrigins = allowedOrigins
	} else {
		corsCfg.AllowOriginFunc = func(origin string) bool {
			if origin == "" {
				return true
			}
			for _, allowed := range allowedOrigins {
				if origin == allowed {
					return true
				}
			}
			return isDevLANOrigin(origin)
		}
	}
	r.Use(cors.New(corsCfg))

	api := r.Group("/api")
	{
		api.GET("/health", handlers.HealthCheck)
		api.POST("/auth/register", middleware.RateLimit(10, 15*time.Minute), handlers.Register)
		api.POST("/auth/login", middleware.RateLimit(15, 15*time.Minute), handlers.Login)
		api.GET("/auth/me", middleware.AuthRequired(), handlers.Me)
		api.PATCH("/auth/profile", middleware.AuthRequired(), handlers.UpdateProfile)
		api.POST("/quotations", middleware.AuthRequired(), middleware.RateLimit(10, time.Hour), handlers.CreateQuotation)
		api.POST("/contact", middleware.RateLimit(5, time.Hour), handlers.CreateContact)
		api.POST("/satisfaction", middleware.OptionalAuth(), middleware.RateLimit(10, time.Hour), handlers.CreateSatisfaction)
		api.POST("/coupons/validate", middleware.AuthRequired(), handlers.ValidateCoupon)
		api.GET("/payments/config", handlers.GetPaymentConfig)
		api.POST("/payments/webhook", middleware.RateLimit(120, time.Hour), handlers.OmiseWebhook)
		api.POST("/payments", middleware.AuthRequired(), middleware.RateLimit(30, time.Hour), handlers.CreatePayment)
		api.POST("/payments/:id/slip", middleware.AuthRequired(), middleware.RateLimit(20, time.Hour), handlers.UploadPaymentSlip)
		api.GET("/payments/:id/slip", middleware.AuthRequired(), handlers.GetPaymentSlip)
		api.POST("/payments/:id/complete", middleware.AuthRequired(), middleware.RateLimit(30, time.Hour), handlers.CompletePayment)
		api.POST("/payments/:id/balance", middleware.AuthRequired(), middleware.RateLimit(30, time.Hour), handlers.PayOrderBalance)
		api.GET("/payments/:id/status", middleware.AuthRequired(), handlers.GetPaymentStatus)
		api.GET("/payments/:id/qr", middleware.AuthRequired(), handlers.GetPaymentQR)

		api.GET("/my-orders", middleware.AuthRequired(), handlers.MyListOrders)

		api.GET("/portfolio", handlers.GetPublicPortfolio)
		api.GET("/portfolio/:slug", handlers.GetPublicPortfolioBySlug)
		api.GET("/blog", handlers.GetPublicBlog)
		api.GET("/blog/:slug", handlers.GetPublicBlogBySlug)
		api.GET("/site-config", handlers.GetPublicSiteConfig)
		api.POST("/analytics/event", middleware.OptionalAuth(), middleware.RateLimit(200, time.Hour), handlers.TrackEvent)

		api.GET("/my-projects", middleware.AuthRequired(), handlers.MyListProjects)
		api.GET("/my-projects/:id", middleware.AuthRequired(), handlers.MyGetProject)
		api.POST("/my-projects/:id/contract/accept", middleware.AuthRequired(), handlers.MyAcceptContract)
		api.POST("/my-projects/:id/delivery/receive", middleware.AuthRequired(), handlers.MyReceiveDelivery)

		admin := api.Group("/admin", middleware.AuthRequired(), middleware.AdminRequired())
		{
			admin.GET("/dashboard", handlers.AdminDashboard)
			admin.GET("/reports", handlers.AdminReports)
			admin.GET("/coupons", handlers.AdminListCoupons)
			admin.POST("/coupons", handlers.AdminCreateCoupon)
			admin.PUT("/coupons/:id", handlers.AdminUpdateCoupon)
			admin.DELETE("/coupons/:id", handlers.AdminDeleteCoupon)
			admin.GET("/orders", handlers.AdminListOrders)
			admin.GET("/orders/:id", handlers.AdminGetOrder)
			admin.PATCH("/orders/:id", handlers.AdminUpdateOrder)
			admin.DELETE("/orders/:id", handlers.AdminDeleteOrder)
			admin.POST("/orders/:id/confirm-payment", handlers.AdminConfirmPayment)
			admin.POST("/orders/:id/reject-payment", handlers.AdminRejectPayment)
			admin.GET("/orders/:id/slip", handlers.AdminGetPaymentSlip)
			admin.POST("/orders/:id/project", handlers.AdminCreateProjectFromOrder)
			admin.GET("/projects", handlers.AdminListProjects)
			admin.POST("/projects", handlers.AdminCreateProject)
			admin.GET("/projects/:id", handlers.AdminGetProject)
			admin.PATCH("/projects/:id", handlers.AdminUpdateProject)
			admin.DELETE("/projects/:id", handlers.AdminDeleteProject)
			admin.PUT("/projects/:id/contract", handlers.AdminSaveContract)
			admin.POST("/projects/:id/contract/send", handlers.AdminSendContract)
			admin.PUT("/projects/:id/delivery", handlers.AdminSaveDelivery)
			admin.POST("/projects/:id/delivery/send", handlers.AdminSendDelivery)
			admin.GET("/satisfaction", handlers.AdminListSatisfactions)
			admin.DELETE("/satisfaction/:id", handlers.AdminDeleteSatisfaction)
			admin.GET("/contacts", handlers.AdminListContacts)
			admin.GET("/contacts/:id", handlers.AdminGetContact)
			admin.PATCH("/contacts/:id", handlers.AdminUpdateContact)
			admin.DELETE("/contacts/:id", handlers.AdminDeleteContact)
			admin.GET("/quotations", handlers.AdminListQuotations)
			admin.GET("/quotations/:id", handlers.AdminGetQuotation)
			admin.PATCH("/quotations/:id", handlers.AdminUpdateQuotation)
			admin.DELETE("/quotations/:id", handlers.AdminDeleteQuotation)
			admin.GET("/users", handlers.AdminListUsers)
			admin.POST("/users", handlers.AdminCreateUser)
			admin.PATCH("/users/:id", handlers.AdminUpdateUser)
			admin.DELETE("/users/:id", handlers.AdminDeleteUser)
			admin.GET("/portfolio", handlers.AdminListPortfolio)
			admin.POST("/portfolio", handlers.AdminCreatePortfolio)
			admin.PUT("/portfolio/:id", handlers.AdminUpdatePortfolio)
			admin.DELETE("/portfolio/:id", handlers.AdminDeletePortfolio)
			admin.GET("/blog", handlers.AdminListBlog)
			admin.POST("/blog", handlers.AdminCreateBlog)
			admin.PUT("/blog/:id", handlers.AdminUpdateBlog)
			admin.DELETE("/blog/:id", handlers.AdminDeleteBlog)
			admin.GET("/site-config", handlers.AdminGetSiteConfig)
			admin.PUT("/site-config", handlers.AdminUpdateSiteConfig)
		}
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("PortfolioPro Studio API running on port %s", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}

func isDevLANOrigin(origin string) bool {
	u, err := url.Parse(origin)
	if err != nil {
		return false
	}

	host := u.Hostname()
	if host == "localhost" || host == "127.0.0.1" {
		return true
	}

	ip := net.ParseIP(host)
	if ip == nil {
		return false
	}

	return ip.IsLoopback() || ip.IsPrivate()
}
