// Script Bulk Index semua produk dari MongoDB ke Elasticsearch
// Jalankan SATU KALI setelah setup Elasticsearch: go run cmd/index-es/main.go

package main

import (
	"context"
	"encoding/json"
	"ecom-backend-go/config"
	"ecom-backend-go/models"
	"ecom-backend-go/services"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/joho/godotenv"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func main() {
	if err := godotenv.Load(".env"); err != nil {
		log.Println("File .env tidak ditemukan, menggunakan env sistem...")
	}

	// ── Koneksi MongoDB ───────────────────────────────────────────────────────
	mongoURI := os.Getenv("MONGO_URI")
	if mongoURI == "" {
		mongoURI = "mongodb://localhost:27017"
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	mongoClient, err := mongo.Connect(ctx, options.Client().ApplyURI(mongoURI))
	if err != nil {
		log.Fatalf("Gagal terhubung ke MongoDB: %v", err)
	}
	defer mongoClient.Disconnect(ctx)

	config.DB = mongoClient.Database("ecom_db")
	fmt.Println("✅ Terhubung ke MongoDB!")

	// ── Koneksi Elasticsearch ─────────────────────────────────────────────────
	config.ConnectElasticsearch()
	if !services.ESIsAvailable() {
		log.Fatal("❌ Elasticsearch tidak tersedia. Pastikan Elasticsearch sudah berjalan di", os.Getenv("ELASTICSEARCH_URL"))
	}

	// Pastikan index ada
	services.EnsureProductIndex()

	// ── Ambil semua produk dari MongoDB ───────────────────────────────────────
	queryCtx, queryCancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer queryCancel()

	cursor, err := config.DB.Collection("products").Find(queryCtx, bson.M{})
	if err != nil {
		log.Fatalf("Gagal membaca produk dari MongoDB: %v", err)
	}
	defer cursor.Close(queryCtx)

	var products []models.Product
	if err = cursor.All(queryCtx, &products); err != nil {
		log.Fatalf("Gagal decode produk: %v", err)
	}

	fmt.Printf("\n🚀 Ditemukan %d produk. Memulai bulk indexing ke Elasticsearch...\n", len(products))

	// ── Index setiap produk ───────────────────────────────────────────────────
	success := 0
	failed := 0

	for _, p := range products {
		doc := map[string]interface{}{
			"id":          p.ID.Hex(),
			"name":        p.Name,
			"description": p.Description,
			"price":       p.Price,
			"stock":       p.Stock,
			"image_url":   p.ImageURL,
			"category_id": p.CategoryID.Hex(),
		}

		body, _ := json.Marshal(doc)

		resp, err := services.ESDoRequest("PUT", fmt.Sprintf("/products/_doc/%s", p.ID.Hex()), body)
		if err != nil {
			log.Printf("  ⚠️  Gagal index '%s': %v", p.Name, err)
			failed++
			continue
		}
		resp.Body.Close()

		if resp.StatusCode >= 400 {
			log.Printf("  ⚠️  Error index '%s': HTTP %d", p.Name, resp.StatusCode)
			failed++
			continue
		}

		fmt.Printf("  ✅ Indexed: %s\n", p.Name)
		success++
	}

	fmt.Println("\n==================================================")
	fmt.Printf("🎉 Bulk indexing selesai!\n")
	fmt.Printf("   Berhasil : %d produk\n", success)
	fmt.Printf("   Gagal    : %d produk\n", failed)
}

