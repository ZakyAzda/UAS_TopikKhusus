package config

import (
	"context"
	"log"
	"os"
	"strconv"
	"time"

	"github.com/redis/go-redis/v9"
)

// RedisClient adalah singleton Redis client yang dipakai di seluruh aplikasi.
// Bisa nil jika Redis tidak tersedia — semua layer wajib handle kondisi ini.
var RedisClient *redis.Client

// ConnectRedis menginisialisasi koneksi ke Redis.
// Ikut pola ConnectDB() — dipanggil sekali di main.go saat startup.
// Tidak fatal jika gagal: aplikasi tetap jalan, Redis di-skip (fallback ke DB).
func ConnectRedis() {
	redisURL := os.Getenv("REDIS_URL")
	password := os.Getenv("REDIS_PASSWORD")
	dbNum := 0

	if dbStr := os.Getenv("REDIS_DB"); dbStr != "" {
		if parsed, err := strconv.Atoi(dbStr); err == nil {
			dbNum = parsed
		}
	}

	var opts *redis.Options
	var err error

	if redisURL != "" {
		// Kalau REDIS_URL disediakan (misal redis://user:pass@host:port/db), parse langsung
		opts, err = redis.ParseURL(redisURL)
		if err != nil {
			log.Printf("⚠️  Warning: REDIS_URL tidak valid (%v) — Redis dinonaktifkan\n", err)
			return
		}
		// Override password & db dari env terpisah jika ada
		if password != "" {
			opts.Password = password
		}
		opts.DB = dbNum
	} else {
		// Fallback ke REDIS_HOST + REDIS_PORT
		host := os.Getenv("REDIS_HOST")
		if host == "" {
			host = "localhost"
		}
		port := os.Getenv("REDIS_PORT")
		if port == "" {
			port = "6379"
		}
		opts = &redis.Options{
			Addr:     host + ":" + port,
			Password: password,
			DB:       dbNum,
		}
	}

	// Retry logic: coba connect maksimal 5 kali sebelum menyerah
	const maxRetries = 5
	for attempt := 1; attempt <= maxRetries; attempt++ {
		client := redis.NewClient(opts)
		ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)

		if pingErr := client.Ping(ctx).Err(); pingErr != nil {
			cancel()
			client.Close()
			log.Printf("⚠️  Redis attempt %d/%d gagal: %v\n", attempt, maxRetries, pingErr)
			if attempt < maxRetries {
				time.Sleep(time.Duration(attempt) * time.Second) // backoff sederhana
				continue
			}
			log.Println("⚠️  Redis tidak dapat dijangkau setelah 5 percobaan — aplikasi berjalan tanpa cache Redis")
			return
		}

		cancel()
		RedisClient = client
		log.Println("✅ Redis terkoneksi aman jaya!")
		return
	}
}

// CloseRedis menutup koneksi Redis dengan graceful.
// Dipanggil saat aplikasi mau shutdown (SIGINT/SIGTERM di main.go).
func CloseRedis() {
	if RedisClient != nil {
		if err := RedisClient.Close(); err != nil {
			log.Printf("⚠️  Error saat menutup koneksi Redis: %v\n", err)
		} else {
			log.Println("✅ Koneksi Redis ditutup dengan baik.")
		}
	}
}

// IsRedisAvailable adalah helper untuk cek apakah Redis siap digunakan.
// Dipakai di service layer untuk guard sebelum operasi Redis.
func IsRedisAvailable() bool {
	return RedisClient != nil
}
