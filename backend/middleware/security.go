package middleware

import (
	"net/http"

	"portfoliopro-backend/config"

	"github.com/gin-gonic/gin"
)

// SecurityHeaders sets standard HTTP security headers on every response.
func SecurityHeaders() gin.HandlerFunc {
	return func(c *gin.Context) {
		h := c.Writer.Header()
		h.Set("X-Content-Type-Options", "nosniff")
		h.Set("X-Frame-Options", "DENY")
		h.Set("Referrer-Policy", "strict-origin-when-cross-origin")
		h.Set("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
		h.Set("X-XSS-Protection", "0")
		if c.Request.Method != http.MethodGet && c.Request.Method != http.MethodHead {
			h.Set("Cache-Control", "no-store")
		}
		if config.IsProduction() {
			h.Set("Strict-Transport-Security", "max-age=63072000; includeSubDomains")
		}
		c.Next()
	}
}

// BodyLimit caps request body size to reduce abuse (JSON APIs).
func BodyLimit(maxBytes int64) gin.HandlerFunc {
	return func(c *gin.Context) {
		if maxBytes > 0 && c.Request.ContentLength > maxBytes {
			c.AbortWithStatusJSON(http.StatusRequestEntityTooLarge, gin.H{
				"error": "ไฟล์ใหญ่เกินไป กรุณาใช้รูปไม่เกิน 5MB",
			})
			return
		}
		if c.Request.Body != nil && maxBytes > 0 {
			c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, maxBytes)
		}
		c.Next()
	}
}
