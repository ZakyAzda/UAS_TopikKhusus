package controllers

import (
	"context"
	"ecom-backend-go/models"
	"ecom-backend-go/services"
	"encoding/json"
	"log"

	"github.com/gofiber/fiber/v2"
)

var categoryService = services.CategoryService{}
var categoryCache = services.CacheService{}

const categoryCacheKey = services.PrefixCategory + "all"

func GetProductCategories(c *fiber.Ctx) error {
	ctx := context.Background()

	// ── Cache HIT: ambil dari Redis ───────────────────────────────────────────
	if cached, err := categoryCache.Get(ctx, categoryCacheKey); err == nil {
		c.Set("X-Cache", "HIT")
		var categories []models.Category
		if jsonErr := json.Unmarshal([]byte(cached), &categories); jsonErr == nil {
			return c.JSON(categories) // Tetap array, Next.js aman!
		}
		// JSON korup, hapus cache dan fallback ke DB
		_ = categoryCache.Delete(ctx, categoryCacheKey)
	}

	// ── Cache MISS: query dari database ──────────────────────────────────────
	categories, _ := categoryService.GetAllCategories()

	// Simpan ke cache (TTL 10 menit — kategori jarang berubah)
	if jsonBytes, jsonErr := json.Marshal(categories); jsonErr == nil {
		if cacheErr := categoryCache.SetWithTTL(ctx, categoryCacheKey, string(jsonBytes), services.CategoryTTL); cacheErr != nil {
			log.Printf("⚠️  Gagal menyimpan kategori ke cache: %v\n", cacheErr)
		}
	}

	c.Set("X-Cache", "MISS")
	return c.JSON(categories) // Tetap array, Next.js aman!
}

func CreateProductCategory(c *fiber.Ctx) error {
	var category models.Category
	if err := c.BodyParser(&category); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Input salah lek!"})
	}

	createdCategory, _ := categoryService.CreateCategory(category)

	// Invalidasi cache kategori karena ada data baru
	invalidateCategoryCache()

	return c.JSON(createdCategory)
}

func DeleteProductCategory(c *fiber.Ctx) error {
	id := c.Params("id")
	categoryService.DeleteCategory(id)

	// Invalidasi cache kategori karena ada data yang dihapus
	invalidateCategoryCache()

	return c.JSON(fiber.Map{"message": "Kategori berhasil dihapus"})
}

// ─── Private Helper ───────────────────────────────────────────────────────────

func invalidateCategoryCache() {
	ctx := context.Background()
	if err := categoryCache.Delete(ctx, categoryCacheKey); err != nil {
		log.Printf("⚠️  Gagal invalidasi cache kategori: %v\n", err)
	}
}