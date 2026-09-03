package main

import (
	"log"
	"strings"

	"portfoliopro-backend/database"
	"portfoliopro-backend/models"

	"github.com/joho/godotenv"
	"golang.org/x/crypto/bcrypt"
)

func main() {
	_ = godotenv.Load()

	database.Connect()

	accounts := []struct {
		name, email, password, role string
	}{
		{"Admin PortfolioPro", "jakkapant32@gmail.com", "Admin123456", models.RoleAdmin},
		{"ลูกค้าทดสอบ", "customer@test.com", "User123456", models.RoleCustomer},
	}

	for _, acc := range accounts {
		hash, err := bcrypt.GenerateFromPassword([]byte(acc.password), bcrypt.DefaultCost)
		if err != nil {
			log.Fatalf("hash password: %v", err)
		}

		email := strings.ToLower(strings.TrimSpace(acc.email))
		var user models.User
		if err := database.DB.Where("email = ?", email).First(&user).Error; err == nil {
			user.Name = acc.name
			user.Password = string(hash)
			user.Role = acc.role
			if err := database.DB.Save(&user).Error; err != nil {
				log.Fatalf("update %s: %v", email, err)
			}
			log.Printf("updated: %s (%s)", email, acc.role)
			continue
		}

		user = models.User{
			Name:     acc.name,
			Email:    email,
			Password: string(hash),
			Role:     acc.role,
		}
		if err := database.DB.Create(&user).Error; err != nil {
			log.Fatalf("create %s: %v", email, err)
		}
		log.Printf("created: %s (%s)", email, acc.role)
	}

	log.Println("done — accounts ready")
}
