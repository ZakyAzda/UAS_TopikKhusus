package middleware

import (
	"context"
	"ecom-backend-go/services"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
)

var cacheService = services.CacheService{}

// CacheResponse adalah middleware HTTP-level response cache untuk endpoint GET publik.
// Cara kerja (Cache-Aside):
//  1. Cek apakah ada cached response di Redis untuk key yang cocok
//  2. Jika HIT  → langsung return JSON dari cache (skip controller & DB)
//  3. Jika MISS → teruskan ke controller, simpan response ke cache setelah selesai
//
// Parameter:
//   - ttl: durasi cache. Gunakan 0 untuk pakai default (5 menit)
//
// Middleware ini otomatis di-skip jika:
//   - Method bukan GET
//   - Header "Cache-Control: no-cache" dikirim oleh client
//   - Redis tidak tersedia (fallback transparan ke controller)
func CacheResponse(ttl time.Duration) fiber.Handler {
	if ttl == 0 {
		ttl = services.HTTPCacheTTL
	}

	return func(c *fiber.Ctx) error {
		// Hanya cache request GET
		if c.Method() != fiber.MethodGet {
			return c.Next()
		}

		// Hormati Cache-Control: no-cache dari client (misal browser dev tools)
		cacheControl := c.Get("Cache-Control")
		if strings.Contains(cacheControl, "no-cache") || strings.Contains(cacheControl, "no-store") {
			return c.Next()
		}

		ctx := context.Background()
		cacheKey := services.BuildHTTPCacheKey(c.Method(), c.Path(), string(c.Request().URI().QueryString()))

		// ── Cache HIT ────────────────────────────────────────────────────────
		if cached, err := cacheService.Get(ctx, cacheKey); err == nil {
			c.Set("X-Cache", "HIT")
			c.Set("Content-Type", "application/json")
			return c.SendString(cached)
		}

		// ── Cache MISS → teruskan ke controller ──────────────────────────────
		// Intercept response body menggunakan fiber locals
		if err := c.Next(); err != nil {
			return err
		}

		// Hanya cache jika response sukses (status 2xx)
		if c.Response().StatusCode() >= 200 && c.Response().StatusCode() < 300 {
			body := string(c.Response().Body())
			if body != "" && body != "null" {
				// Simpan ke cache — error diabaikan (Redis opsional)
				_ = cacheService.Set(ctx, cacheKey, body, ttl)
				c.Set("X-Cache", "MISS")
			}
		}

		return nil
	}
}
