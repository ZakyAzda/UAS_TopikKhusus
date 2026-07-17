package services

import (
	"context"
	"crypto/sha256"
	"ecom-backend-go/config"
	"errors"
	"fmt"
	"log"
	"time"

	"github.com/redis/go-redis/v9"
)

// ErrCacheMiss dikembalikan saat key tidak ditemukan di cache.
// Caller bisa membedakan antara "tidak ada" vs error teknis.
var ErrCacheMiss = errors.New("cache miss")

// CacheService menyediakan operasi Redis yang aman dengan fallback graceful.
// Jika RedisClient nil (Redis down), semua method langsung return ErrCacheMiss / error
// tanpa crash — caller tinggal fallback ke database.
type CacheService struct{}

// ─── Prefix Key ──────────────────────────────────────────────────────────────

const (
	PrefixProduct    = "products:"
	PrefixCategory   = "categories:"
	PrefixBlacklist  = "blacklist:"
	PrefixHTTPCache  = "http_cache:"

	DefaultTTL       = 5 * time.Minute
	CategoryTTL      = 10 * time.Minute
	BlacklistTTL     = 72 * time.Hour // Sesuai masa berlaku JWT (72 jam)
	HTTPCacheTTL     = 5 * time.Minute
)

// ─── Core Operations ─────────────────────────────────────────────────────────

// Set menyimpan value string ke Redis dengan TTL.
// Return nil jika sukses, atau error jika Redis tidak tersedia.
func (s *CacheService) Set(ctx context.Context, key string, value string, ttl time.Duration) error {
	if !config.IsRedisAvailable() {
		return fmt.Errorf("redis tidak tersedia")
	}

	if err := config.RedisClient.Set(ctx, key, value, ttl).Err(); err != nil {
		log.Printf("⚠️  Cache Set gagal untuk key '%s': %v\n", key, err)
		return err
	}
	return nil
}

// Get mengambil value dari Redis.
// Return ErrCacheMiss jika key tidak ditemukan (redis.Nil).
// Return error teknis lain jika Redis bermasalah.
func (s *CacheService) Get(ctx context.Context, key string) (string, error) {
	if !config.IsRedisAvailable() {
		return "", ErrCacheMiss
	}

	val, err := config.RedisClient.Get(ctx, key).Result()
	if err == redis.Nil {
		return "", ErrCacheMiss
	}
	if err != nil {
		log.Printf("⚠️  Cache Get gagal untuk key '%s': %v\n", key, err)
		return "", err
	}
	return val, nil
}

// Delete menghapus satu key dari Redis.
func (s *CacheService) Delete(ctx context.Context, key string) error {
	if !config.IsRedisAvailable() {
		return nil // Redis tidak ada, tidak perlu hapus
	}

	if err := config.RedisClient.Del(ctx, key).Err(); err != nil {
		log.Printf("⚠️  Cache Delete gagal untuk key '%s': %v\n", key, err)
		return err
	}
	return nil
}

// DeleteByPattern menghapus semua key yang cocok dengan pattern (misal "products:*").
// Menggunakan SCAN (bukan KEYS) supaya aman di production.
func (s *CacheService) DeleteByPattern(ctx context.Context, pattern string) error {
	if !config.IsRedisAvailable() {
		return nil
	}

	var cursor uint64
	var deletedCount int64

	for {
		keys, nextCursor, err := config.RedisClient.Scan(ctx, cursor, pattern, 100).Result()
		if err != nil {
			log.Printf("⚠️  Cache SCAN gagal untuk pattern '%s': %v\n", pattern, err)
			return err
		}

		if len(keys) > 0 {
			deleted, err := config.RedisClient.Del(ctx, keys...).Result()
			if err != nil {
				log.Printf("⚠️  Cache DEL gagal untuk pattern '%s': %v\n", pattern, err)
				return err
			}
			deletedCount += deleted
		}

		cursor = nextCursor
		if cursor == 0 {
			break
		}
	}

	if deletedCount > 0 {
		log.Printf("🗑️  Cache invalidasi: %d key dihapus (pattern: %s)\n", deletedCount, pattern)
	}
	return nil
}

// Exists mengecek apakah key ada di Redis.
// Return false jika Redis tidak tersedia atau key tidak ditemukan.
func (s *CacheService) Exists(ctx context.Context, key string) (bool, error) {
	if !config.IsRedisAvailable() {
		return false, nil
	}

	count, err := config.RedisClient.Exists(ctx, key).Result()
	if err != nil {
		log.Printf("⚠️  Cache Exists gagal untuk key '%s': %v\n", key, err)
		return false, err
	}
	return count > 0, nil
}

// SetWithTTL adalah alias dari Set — disediakan agar lebih ekspresif saat TTL penting.
func (s *CacheService) SetWithTTL(ctx context.Context, key string, value string, ttl time.Duration) error {
	return s.Set(ctx, key, value, ttl)
}

// Increment menambahkan counter atomic di Redis.
// Berguna untuk rate limiting, hit counter, dsb.
func (s *CacheService) Increment(ctx context.Context, key string) (int64, error) {
	if !config.IsRedisAvailable() {
		return 0, fmt.Errorf("redis tidak tersedia")
	}

	val, err := config.RedisClient.Incr(ctx, key).Result()
	if err != nil {
		log.Printf("⚠️  Cache Increment gagal untuk key '%s': %v\n", key, err)
		return 0, err
	}
	return val, nil
}

// ─── JWT Token Blacklist ──────────────────────────────────────────────────────

// BlacklistToken menyimpan token ke Redis dengan TTL.
// Key menggunakan SHA256 hash dari token supaya key tidak terlalu panjang.
// TTL disesuaikan dengan sisa masa berlaku token — setelah expired, Redis
// otomatis hapus key sehingga tidak ada memory leak.
func (s *CacheService) BlacklistToken(ctx context.Context, token string, ttl time.Duration) error {
	if !config.IsRedisAvailable() {
		log.Println("⚠️  Redis tidak tersedia — token blacklist tidak disimpan (logout tetap valid di sisi client)")
		return nil // Tetap anggap logout berhasil di sisi client
	}

	key := s.tokenKey(token)
	return s.Set(ctx, key, "blacklisted", ttl)
}

// IsTokenBlacklisted mengecek apakah token sudah di-blacklist (sudah logout).
// Return false jika Redis tidak tersedia — fail open (izinkan request lanjut).
// Pilihan ini disengaja agar Redis down tidak mengunci semua pengguna.
func (s *CacheService) IsTokenBlacklisted(ctx context.Context, token string) (bool, error) {
	if !config.IsRedisAvailable() {
		return false, nil // fail open: Redis down → anggap token valid
	}

	key := s.tokenKey(token)
	exists, err := s.Exists(ctx, key)
	if err != nil {
		log.Printf("⚠️  Gagal cek blacklist token: %v — request diteruskan\n", err)
		return false, nil // fail open
	}
	return exists, nil
}

// tokenKey menghasilkan Redis key dari token JWT.
// SHA256 dipakai supaya key pendek & tidak expose token asli ke Redis.
func (s *CacheService) tokenKey(token string) string {
	hash := sha256.Sum256([]byte(token))
	return fmt.Sprintf("%s%x", PrefixBlacklist, hash)
}

// ─── HTTP Cache Key Builder ───────────────────────────────────────────────────

// BuildHTTPCacheKey membuat cache key untuk HTTP response cache.
// Format: "http_cache:<method>:<path>:<query_hash>"
func BuildHTTPCacheKey(method, path, query string) string {
	if query == "" {
		return fmt.Sprintf("%s%s:%s", PrefixHTTPCache, method, path)
	}
	queryHash := sha256.Sum256([]byte(query))
	return fmt.Sprintf("%s%s:%s:%x", PrefixHTTPCache, method, path, queryHash[:8])
}
