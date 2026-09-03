package middleware

import (
	"net/http"
	"strconv"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

type rateLimiter struct {
	mu      sync.Mutex
	entries map[string][]time.Time
}

func newRateLimiter() *rateLimiter {
	return &rateLimiter{entries: map[string][]time.Time{}}
}

func (rl *rateLimiter) allow(key string, max int, window time.Duration) bool {
	now := time.Now()
	cutoff := now.Add(-window)

	rl.mu.Lock()
	defer rl.mu.Unlock()

	times := rl.entries[key]
	filtered := times[:0]
	for _, t := range times {
		if t.After(cutoff) {
			filtered = append(filtered, t)
		}
	}
	if len(filtered) >= max {
		rl.entries[key] = filtered
		return false
	}
	filtered = append(filtered, now)
	rl.entries[key] = filtered
	return true
}

func clientKey(c *gin.Context) string {
	if uid, ok := c.Get("userID"); ok {
		return "user:" + strconv.FormatUint(uint64(uid.(uint)), 10)
	}
	ip := c.ClientIP()
	if ip == "" {
		ip = "unknown"
	}
	return "ip:" + ip
}

var globalLimiter = newRateLimiter()

// RateLimit returns middleware limiting requests per client key.
func RateLimit(max int, window time.Duration) gin.HandlerFunc {
	return func(c *gin.Context) {
		if !globalLimiter.allow(clientKey(c), max, window) {
			c.JSON(http.StatusTooManyRequests, gin.H{
				"error": "คำขอมากเกินไป กรุณารอสักครู่แล้วลองใหม่",
			})
			c.Abort()
			return
		}
		c.Next()
	}
}
