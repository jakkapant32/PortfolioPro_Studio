package middleware

import (
	"fmt"
	"net/http"
	"strings"

	"portfoliopro-backend/config"
	"portfoliopro-backend/handlers"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

func AuthRequired() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "กรุณาเข้าสู่ระบบก่อนดำเนินการ"})
			c.Abort()
			return
		}

		tokenStr := strings.TrimSpace(strings.TrimPrefix(authHeader, "Bearer "))
		if tokenStr == "" || strings.Contains(tokenStr, " ") {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "เซสชันไม่ถูกต้อง กรุณาเข้าสู่ระบบใหม่"})
			c.Abort()
			return
		}

		token, err := jwt.ParseWithClaims(tokenStr, &handlers.JWTClaims{}, func(t *jwt.Token) (interface{}, error) {
			if t.Method != jwt.SigningMethodHS256 {
				return nil, fmt.Errorf("unexpected signing method")
			}
			return config.JWTSecret(), nil
		})

		if err != nil || !token.Valid {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่"})
			c.Abort()
			return
		}

		claims, ok := token.Claims.(*handlers.JWTClaims)
		if !ok || claims.UserID == 0 {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "เซสชันไม่ถูกต้อง กรุณาเข้าสู่ระบบใหม่"})
			c.Abort()
			return
		}

		c.Set("userID", claims.UserID)
		c.Next()
	}
}

// OptionalAuth sets userID when a valid Bearer token is present; never blocks.
func OptionalAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
			c.Next()
			return
		}
		tokenStr := strings.TrimSpace(strings.TrimPrefix(authHeader, "Bearer "))
		if tokenStr == "" || strings.Contains(tokenStr, " ") {
			c.Next()
			return
		}
		token, err := jwt.ParseWithClaims(tokenStr, &handlers.JWTClaims{}, func(t *jwt.Token) (interface{}, error) {
			if t.Method != jwt.SigningMethodHS256 {
				return nil, fmt.Errorf("unexpected signing method")
			}
			return config.JWTSecret(), nil
		})
		if err == nil && token.Valid {
			if claims, ok := token.Claims.(*handlers.JWTClaims); ok && claims.UserID > 0 {
				c.Set("userID", claims.UserID)
			}
		}
		c.Next()
	}
}
