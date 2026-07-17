package controllers

import (
	"context"
	"ecom-backend-go/models"
	"ecom-backend-go/services"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/gofiber/fiber/v2"
)

var productService = services.ProductService{}
var productCache = services.CacheService{}

// ==========================================
// FUNGSI PUBLIK (Bisa diakses tanpa login)
// ==========================================

func GetProducts(c *fiber.Ctx) error {
	search := c.Query("search")
	categoryId := c.Query("categoryId")
	ctx := context.Background()

	// Buat cache key unik berdasarkan parameter query
	cacheKey := buildProductCacheKey(search, categoryId)

	// ── Cache HIT: ambil dari Redis ───────────────────────────────────────────
	if cached, err := productCache.Get(ctx, cacheKey); err == nil {
		c.Set("X-Cache", "HIT")
		var products []models.Product
		if jsonErr := json.Unmarshal([]byte(cached), &products); jsonErr == nil {
			return c.JSON(products)
		}
		// Jika JSON korup, hapus cache dan fallback ke DB
		_ = productCache.Delete(ctx, cacheKey)
	}

	// ── Cache MISS: query dari database / Elasticsearch ─────────────────────
	var products []models.Product
	var err error

	// Jika ada parameter search, gunakan Elasticsearch (full-text search)
	if search != "" {
		productIDs := services.SearchProductIDs(search)
		if productIDs != nil {
			// ES tersedia: ambil data produk dari MongoDB berdasarkan ID hasil ES
			c.Set("X-Search-Engine", "elasticsearch")
			products, err = productService.GetProductsByIDs(productIDs, categoryId)
		} else {
			// ES tidak tersedia: fallback ke MongoDB regex
			c.Set("X-Search-Engine", "mongodb-fallback")
			products, err = productService.GetAllProducts(search, categoryId)
		}
	} else {
		// Tidak ada search: pakai MongoDB biasa
		c.Set("X-Search-Engine", "mongodb")
		products, err = productService.GetAllProducts(search, categoryId)
	}

	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Gagal mengambil data produk"})
	}

	// Simpan ke cache untuk request berikutnya (TTL 5 menit)
	if jsonBytes, jsonErr := json.Marshal(products); jsonErr == nil {
		if cacheErr := productCache.SetWithTTL(ctx, cacheKey, string(jsonBytes), services.DefaultTTL); cacheErr != nil {
			log.Printf("⚠️  Gagal menyimpan produk ke cache: %v\n", cacheErr)
		}
	}

	c.Set("X-Cache", "MISS")
	return c.JSON(products)
}

func GetProduct(c *fiber.Ctx) error {
	id := c.Params("id")

	product, err := productService.GetProductByID(id)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"data": product})
}

// ==========================================
// FUNGSI ADMIN (Wajib login & Role ADMIN)
// ==========================================

func CreateProduct(c *fiber.Ctx) error {
	var input models.Product
	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Data produk ga valid"})
	}

	product, err := productService.CreateProduct(input)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}

	// Invalidasi semua cache produk karena ada data baru
	invalidateProductCache()

	// Sync produk baru ke Elasticsearch (async agar tidak memperlambat response)
	go services.IndexProduct(product)

	return c.JSON(fiber.Map{"message": "Produk berhasil ditambah!", "data": product})
}

// Upload Gambar (Fungsi Bawaan Fiber)
func UploadImage(c *fiber.Ctx) error {
	file, err := c.FormFile("image")
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Mana gambarnya lek? Gagal ambil file."})
	}

	uniqueName := fmt.Sprintf("%d-%s", time.Now().Unix(), file.Filename)
	filePath := fmt.Sprintf("./uploads/%s", uniqueName)

	if err := c.SaveFile(file, filePath); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Gagal nyimpen gambar ke server."})
	}

	imageUrl := fmt.Sprintf("http://localhost:3000/uploads/%s", uniqueName)

	return c.JSON(fiber.Map{
		"message":   "Gambar berhasil diupload!",
		"image_url": imageUrl, // TETAP PAKE image_url BIAR DRAG & DROP NEXT.JS JALAN 🔥
	})
}

func UpdateProduct(c *fiber.Ctx) error {
	id := c.Params("id")

	// Pakai Map biar fleksibel nangkep apapun dari Next.js
	var input map[string]interface{}

	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Format input salah!"})
	}

	if img, ok := input["image"]; ok {
		input["image_url"] = img
		delete(input, "image")
	}
	if img, ok := input["imageUrl"]; ok {
		input["image_url"] = img
		delete(input, "imageUrl")
	}

	product, err := productService.UpdateProduct(id, input)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"error": err.Error()})
	}

	// Invalidasi semua cache produk karena ada data yang berubah
	invalidateProductCache()

	// Sync perubahan ke Elasticsearch (async)
	go services.IndexProduct(product)

	return c.JSON(fiber.Map{
		"message": "Mantap, barang berhasil diupdate!",
		"data":    product,
	})
}

func DeleteProduct(c *fiber.Ctx) error {
	id := c.Params("id")

	if err := productService.DeleteProduct(id); err != nil {
		return c.Status(404).JSON(fiber.Map{"error": err.Error()})
	}

	// Invalidasi semua cache produk karena ada data yang dihapus
	invalidateProductCache()

	// Hapus dari Elasticsearch index (async)
	go services.DeleteProductIndex(id)

	return c.JSON(fiber.Map{"message": "Barang berhasil dihapus (ditarik dari etalase)!"})
}

// ─── Private Helpers ──────────────────────────────────────────────────────────

// buildProductCacheKey membuat cache key berdasarkan parameter query.
// Contoh: "products:all", "products:search:tomat", "products:cat:2", "products:search:tomat:cat:2"
func buildProductCacheKey(search, categoryId string) string {
	key := services.PrefixProduct
	if search == "" && categoryId == "" {
		return key + "all"
	}
	if search != "" {
		key += "search:" + search
	}
	if categoryId != "" {
		if search != "" {
			key += ":"
		}
		key += "cat:" + categoryId
	}
	return key
}

// invalidateProductCache menghapus semua cache yang berkaitan dengan produk.
// Dipanggil setelah Create, Update, atau Delete produk.
func invalidateProductCache() {
	ctx := context.Background()
	if err := productCache.DeleteByPattern(ctx, services.PrefixProduct+"*"); err != nil {
		log.Printf("⚠️  Gagal invalidasi cache produk: %v\n", err)
	}
	// Invalidasi juga HTTP cache level agar middleware cache ikut bersih
	if err := productCache.DeleteByPattern(ctx, services.PrefixHTTPCache+"GET:/api/products*"); err != nil {
		log.Printf("⚠️  Gagal invalidasi HTTP cache produk: %v\n", err)
	}
}