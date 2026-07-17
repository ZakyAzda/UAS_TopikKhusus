package middleware

import (
	"context"
	"ecom-backend-go/services"
	"os"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
)

var tokenCache = services.CacheService{}

func Protected() fiber.Handler {
	return func(c *fiber.Ctx) error {
		authHeader := c.Get("Authorization")
		if authHeader == "" {
			return c.Status(401).JSON(fiber.Map{"error": "Login dulu lek!"})
		}

		tokenString := strings.Replace(authHeader, "Bearer ", "", 1)
		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			return []byte(os.Getenv("JWT_SECRET")), nil // ✅ dari env
		})

		if err != nil || !token.Valid {
			return c.Status(401).JSON(fiber.Map{"error": "Token lu busuk!"})
		}

		// ── Cek JWT Blacklist (Token sudah di-logout) ─────────────────────────
		// Jika Redis down → IsTokenBlacklisted return false (fail open),
		// sehingga pengguna tidak terkunci meski Redis tidak tersedia.
		ctx := context.Background()
		if blacklisted, _ := tokenCache.IsTokenBlacklisted(ctx, tokenString); blacklisted {
			return c.Status(401).JSON(fiber.Map{"error": "Token sudah tidak berlaku (sudah logout). Silakan login ulang."})
		}

		claims := token.Claims.(jwt.MapClaims)
		c.Locals("user_id", claims["user_id"])
		return c.Next()
	}
}

func IsAdmin() fiber.Handler {
	return func(c *fiber.Ctx) error {
		authHeader := c.Get("Authorization")
		tokenString := strings.Replace(authHeader, "Bearer ", "", 1)
		token, _ := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			return []byte(os.Getenv("JWT_SECRET")), nil // ✅ dari env
		})

		if token == nil || !token.Valid {
			return c.Status(401).JSON(fiber.Map{"error": "Akses ditolak, token ga valid!"})
		}

		claims := token.Claims.(jwt.MapClaims)
		role, _ := claims["role"].(string)

		if role != "ADMIN" {
			return c.Status(403).JSON(fiber.Map{"error": "Hayo mau ngapain? Ini cuma buat Admin lek!"})
		}

		return c.Next()
	}
}