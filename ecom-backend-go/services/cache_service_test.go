package services

import (
	"context"
	"ecom-backend-go/config"
	"testing"
	"time"

	"github.com/alicebob/miniredis/v2"
	"github.com/redis/go-redis/v9"
)

// setupTestRedis membuat miniredis in-memory server dan menghubungkannya
// ke config.RedisClient agar CacheService bisa ditest tanpa Redis asli.
func setupTestRedis(t *testing.T) (*miniredis.Miniredis, func()) {
	t.Helper()

	mr, err := miniredis.Run()
	if err != nil {
		t.Fatalf("Gagal menjalankan miniredis: %v", err)
	}

	// Override global Redis client dengan client yang mengarah ke miniredis
	config.RedisClient = redis.NewClient(&redis.Options{
		Addr: mr.Addr(),
	})

	// Return cleanup function
	teardown := func() {
		config.RedisClient.Close()
		config.RedisClient = nil
		mr.Close()
	}

	return mr, teardown
}

// ─── Test Set & Get ───────────────────────────────────────────────────────────

func TestCacheService_SetAndGet(t *testing.T) {
	_, teardown := setupTestRedis(t)
	defer teardown()

	ctx := context.Background()
	svc := CacheService{}

	// Set key
	err := svc.Set(ctx, "test:key", "hello redis", 1*time.Minute)
	if err != nil {
		t.Fatalf("Set gagal: %v", err)
	}

	// Get key
	val, err := svc.Get(ctx, "test:key")
	if err != nil {
		t.Fatalf("Get gagal: %v", err)
	}
	if val != "hello redis" {
		t.Errorf("Nilai tidak sesuai: dapat '%s', harap 'hello redis'", val)
	}
}

func TestCacheService_GetMiss(t *testing.T) {
	_, teardown := setupTestRedis(t)
	defer teardown()

	ctx := context.Background()
	svc := CacheService{}

	// Key yang belum pernah di-set
	_, err := svc.Get(ctx, "test:nonexistent")
	if err != ErrCacheMiss {
		t.Errorf("Harap ErrCacheMiss, dapat: %v", err)
	}
}

// ─── Test Delete ──────────────────────────────────────────────────────────────

func TestCacheService_Delete(t *testing.T) {
	_, teardown := setupTestRedis(t)
	defer teardown()

	ctx := context.Background()
	svc := CacheService{}

	svc.Set(ctx, "test:todelete", "value", 1*time.Minute)

	err := svc.Delete(ctx, "test:todelete")
	if err != nil {
		t.Fatalf("Delete gagal: %v", err)
	}

	// Pastikan key sudah tidak ada
	_, err = svc.Get(ctx, "test:todelete")
	if err != ErrCacheMiss {
		t.Errorf("Setelah delete, harap ErrCacheMiss, dapat: %v", err)
	}
}

// ─── Test DeleteByPattern ─────────────────────────────────────────────────────

func TestCacheService_DeleteByPattern(t *testing.T) {
	_, teardown := setupTestRedis(t)
	defer teardown()

	ctx := context.Background()
	svc := CacheService{}

	// Set beberapa key dengan prefix yang sama
	svc.Set(ctx, "products:all", "data1", 1*time.Minute)
	svc.Set(ctx, "products:search:tomat", "data2", 1*time.Minute)
	svc.Set(ctx, "categories:all", "data3", 1*time.Minute) // key lain, tidak boleh terhapus

	err := svc.DeleteByPattern(ctx, "products:*")
	if err != nil {
		t.Fatalf("DeleteByPattern gagal: %v", err)
	}

	// products:all harus hilang
	_, err = svc.Get(ctx, "products:all")
	if err != ErrCacheMiss {
		t.Error("products:all seharusnya sudah terhapus")
	}

	// products:search:tomat harus hilang
	_, err = svc.Get(ctx, "products:search:tomat")
	if err != ErrCacheMiss {
		t.Error("products:search:tomat seharusnya sudah terhapus")
	}

	// categories:all TIDAK boleh terhapus
	val, err := svc.Get(ctx, "categories:all")
	if err != nil || val != "data3" {
		t.Error("categories:all tidak seharusnya terhapus oleh pattern products:*")
	}
}

// ─── Test Exists ──────────────────────────────────────────────────────────────

func TestCacheService_Exists(t *testing.T) {
	_, teardown := setupTestRedis(t)
	defer teardown()

	ctx := context.Background()
	svc := CacheService{}

	svc.Set(ctx, "test:exist", "ada", 1*time.Minute)

	exists, err := svc.Exists(ctx, "test:exist")
	if err != nil {
		t.Fatalf("Exists gagal: %v", err)
	}
	if !exists {
		t.Error("Key seharusnya ada")
	}

	notExists, err := svc.Exists(ctx, "test:tidak_ada")
	if err != nil {
		t.Fatalf("Exists gagal: %v", err)
	}
	if notExists {
		t.Error("Key seharusnya tidak ada")
	}
}

// ─── Test Increment ───────────────────────────────────────────────────────────

func TestCacheService_Increment(t *testing.T) {
	_, teardown := setupTestRedis(t)
	defer teardown()

	ctx := context.Background()
	svc := CacheService{}

	val1, err := svc.Increment(ctx, "test:counter")
	if err != nil {
		t.Fatalf("Increment pertama gagal: %v", err)
	}
	if val1 != 1 {
		t.Errorf("Harap 1, dapat %d", val1)
	}

	val2, _ := svc.Increment(ctx, "test:counter")
	val3, _ := svc.Increment(ctx, "test:counter")

	if val2 != 2 || val3 != 3 {
		t.Errorf("Counter tidak increment dengan benar: %d, %d", val2, val3)
	}
}

// ─── Test JWT Blacklist ───────────────────────────────────────────────────────

func TestCacheService_BlacklistToken(t *testing.T) {
	_, teardown := setupTestRedis(t)
	defer teardown()

	ctx := context.Background()
	svc := CacheService{}

	token := "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.signature"

	// Token belum di-blacklist
	blacklisted, err := svc.IsTokenBlacklisted(ctx, token)
	if err != nil {
		t.Fatalf("IsTokenBlacklisted gagal: %v", err)
	}
	if blacklisted {
		t.Error("Token seharusnya belum di-blacklist")
	}

	// Blacklist token
	err = svc.BlacklistToken(ctx, token, 1*time.Minute)
	if err != nil {
		t.Fatalf("BlacklistToken gagal: %v", err)
	}

	// Token sekarang harus blacklisted
	blacklisted, err = svc.IsTokenBlacklisted(ctx, token)
	if err != nil {
		t.Fatalf("IsTokenBlacklisted setelah blacklist gagal: %v", err)
	}
	if !blacklisted {
		t.Error("Token seharusnya sudah di-blacklist")
	}
}

func TestCacheService_BlacklistTokenExpiry(t *testing.T) {
	mr, teardown := setupTestRedis(t)
	defer teardown()

	ctx := context.Background()
	svc := CacheService{}

	token := "expiring.token.here"

	// Blacklist dengan TTL sangat pendek
	err := svc.BlacklistToken(ctx, token, 1*time.Second)
	if err != nil {
		t.Fatalf("BlacklistToken gagal: %v", err)
	}

	// Simulasikan waktu berlalu menggunakan miniredis FastForward
	mr.FastForward(2 * time.Second)

	// Token sudah expired, seharusnya tidak lagi blacklisted
	blacklisted, _ := svc.IsTokenBlacklisted(ctx, token)
	if blacklisted {
		t.Error("Token sudah expired, seharusnya tidak blacklisted lagi")
	}
}

// ─── Test Fallback saat Redis nil ─────────────────────────────────────────────

func TestCacheService_FallbackWhenRedisNil(t *testing.T) {
	// Pastikan RedisClient nil
	originalClient := config.RedisClient
	config.RedisClient = nil
	defer func() { config.RedisClient = originalClient }()

	ctx := context.Background()
	svc := CacheService{}

	// Set harus return error (tapi tidak panic)
	err := svc.Set(ctx, "key", "val", 1*time.Minute)
	if err == nil {
		t.Error("Set seharusnya return error saat Redis nil")
	}

	// Get harus return ErrCacheMiss (bukan panic)
	_, err = svc.Get(ctx, "key")
	if err != ErrCacheMiss {
		t.Errorf("Get saat Redis nil harap ErrCacheMiss, dapat: %v", err)
	}

	// IsTokenBlacklisted harus return false (fail open, tidak panic)
	blacklisted, err := svc.IsTokenBlacklisted(ctx, "sometoken")
	if err != nil || blacklisted {
		t.Error("IsTokenBlacklisted saat Redis nil harap (false, nil)")
	}

	// Exists harus return false (tidak panic)
	exists, err := svc.Exists(ctx, "key")
	if err != nil || exists {
		t.Error("Exists saat Redis nil harap (false, nil)")
	}
}

// ─── Test SetWithTTL (alias) ──────────────────────────────────────────────────

func TestCacheService_SetWithTTL(t *testing.T) {
	mr, teardown := setupTestRedis(t)
	defer teardown()

	ctx := context.Background()
	svc := CacheService{}

	err := svc.SetWithTTL(ctx, "test:ttl", "data", 2*time.Second)
	if err != nil {
		t.Fatalf("SetWithTTL gagal: %v", err)
	}

	// Data harusnya ada sekarang
	val, err := svc.Get(ctx, "test:ttl")
	if err != nil || val != "data" {
		t.Error("Data seharusnya ada setelah SetWithTTL")
	}

	// Maju 3 detik
	mr.FastForward(3 * time.Second)

	// Data harus hilang
	_, err = svc.Get(ctx, "test:ttl")
	if err != ErrCacheMiss {
		t.Error("Data seharusnya sudah expire")
	}
}
