package main

import (
	"fmt"
	"log"
	"os"
	"strings"

	"portfoliopro-backend/database"
	"portfoliopro-backend/models"

	"github.com/joho/godotenv"
	"golang.org/x/crypto/bcrypt"
)

func main() {
	_ = godotenv.Load()

	email := strings.ToLower(strings.TrimSpace(getEnv("ADMIN_EMAIL", "jakkapant32@gmail.com")))
	password := getEnv("ADMIN_PASSWORD", "Admin@123456")
	name := getEnv("ADMIN_NAME", "PortfolioPro Admin")

	database.Connect()

	hashed, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		log.Fatal(err)
	}

	var user models.User
	err = database.DB.Where("email = ?", email).First(&user).Error
	if err != nil {
		user = models.User{
			Name:     name,
			Email:    email,
			Password: string(hashed),
			Role:     models.RoleAdmin,
		}
		if err := database.DB.Create(&user).Error; err != nil {
			log.Fatal(err)
		}
		fmt.Println("Created admin user:", email)
	} else {
		user.Name = name
		user.Password = string(hashed)
		user.Role = models.RoleAdmin
		if err := database.DB.Save(&user).Error; err != nil {
			log.Fatal(err)
		}
		fmt.Println("Updated admin user:", email)
	}

	fmt.Println("Role:", user.Role)
	fmt.Println("Password:", password)
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
