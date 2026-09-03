package config

import (
	"log"
	"os"
	"strings"
	"unicode"
)

const DevJWTDefault = "portfoliopro-dev-secret-change-in-production"

func IsProduction() bool {
	return strings.EqualFold(os.Getenv("GIN_MODE"), "release") ||
		strings.EqualFold(os.Getenv("APP_ENV"), "production")
}

func JWTSecret() []byte {
	secret := strings.TrimSpace(os.Getenv("JWT_SECRET"))
	if secret == "" {
		secret = DevJWTDefault
	}
	return []byte(secret)
}

func OmiseConfigured() bool {
	return strings.TrimSpace(os.Getenv("OMISE_SECRET_KEY")) != "" &&
		strings.TrimSpace(os.Getenv("OMISE_PUBLIC_KEY")) != ""
}

// ValidateStartup exits on missing critical secrets in production.
func ValidateStartup() {
	if IsProduction() {
		secret := strings.TrimSpace(os.Getenv("JWT_SECRET"))
		if secret == "" || len(secret) < 32 {
			log.Fatal("JWT_SECRET must be a random string of at least 32 characters in production")
		}
		if secret == DevJWTDefault {
			log.Fatal("JWT_SECRET must not use the default dev value in production")
		}
		if OmiseConfigured() && strings.TrimSpace(os.Getenv("OMISE_WEBHOOK_SECRET")) == "" {
			log.Fatal("OMISE_WEBHOOK_SECRET is required in production when Omise is configured")
		}
		return
	}

	if strings.TrimSpace(os.Getenv("JWT_SECRET")) == "" {
		log.Println("WARNING: JWT_SECRET not set — using insecure dev default (set before production)")
	}
}

func ValidatePassword(password string) string {
	if len(password) < 8 {
		return "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร"
	}
	var hasLetter, hasDigit bool
	for _, r := range password {
		if unicode.IsLetter(r) {
			hasLetter = true
		}
		if unicode.IsDigit(r) {
			hasDigit = true
		}
	}
	if !hasLetter || !hasDigit {
		return "รหัสผ่านต้องมีทั้งตัวอักษรและตัวเลข"
	}
	return ""
}
