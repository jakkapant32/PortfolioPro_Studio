package database

import (
	"fmt"
	"log"
	"net/url"
	"os"
	"strings"

	"portfoliopro-backend/models"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

var DB *gorm.DB

func Connect() {
	dsn := buildDSN()

	var err error
	DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	if err := DB.AutoMigrate(
		&models.Quotation{}, &models.Contact{}, &models.User{}, &models.Order{},
		&models.PortfolioItem{}, &models.BlogPost{}, &models.SiteConfig{}, &models.Coupon{},
		&models.Project{}, &models.Contract{}, &models.Delivery{},
		&models.AnalyticsEvent{},
	); err != nil {
		log.Fatalf("Failed to migrate database: %v", err)
	}

	seedAdminUser()
	seedContent()

	log.Println("Database connected and migrated successfully")
}

func seedAdminUser() {
	adminEmail := strings.TrimSpace(os.Getenv("ADMIN_EMAIL"))
	if adminEmail == "" {
		return
	}
	adminEmail = strings.ToLower(adminEmail)
	result := DB.Model(&models.User{}).Where("email = ?", adminEmail).Update("role", models.RoleAdmin)
	if result.RowsAffected > 0 {
		log.Printf("Promoted %s to admin", adminEmail)
	}
}

func buildDSN() string {
	if databaseURL := os.Getenv("DATABASE_URL"); databaseURL != "" {
		return normalizeDatabaseURL(databaseURL)
	}

	host := getEnv("DB_HOST", "localhost")
	port := getEnv("DB_PORT", "5432")
	user := getEnv("DB_USER", "postgres")
	password := getEnv("DB_PASSWORD", "postgres")
	dbname := getEnv("DB_NAME", "portfoliopro")
	sslmode := getEnv("DB_SSLMODE", "disable")

	return fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		host, port, user, password, dbname, sslmode,
	)
}

func normalizeDatabaseURL(databaseURL string) string {
	if strings.HasPrefix(databaseURL, "postgres://") || strings.HasPrefix(databaseURL, "postgresql://") {
		parsed, err := url.Parse(databaseURL)
		if err != nil {
			log.Fatalf("Invalid DATABASE_URL: %v", err)
		}

		password, _ := parsed.User.Password()
		port := parsed.Port()
		if port == "" {
			port = "5432"
		}
		sslmode := "require"
		if parsed.Query().Get("sslmode") != "" {
			sslmode = parsed.Query().Get("sslmode")
		}

		return fmt.Sprintf(
			"host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
			parsed.Hostname(),
			port,
			parsed.User.Username(),
			password,
			strings.TrimPrefix(parsed.Path, "/"),
			sslmode,
		)
	}

	return databaseURL
}

func getEnv(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}
