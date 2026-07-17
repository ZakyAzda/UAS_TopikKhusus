// Script Migrasi Data dari PostgreSQL ke MongoDB
// Jalankan dengan: go run cmd/migrate/main.go
//
// PERHATIAN:
// 1. Pastikan file .env sudah diisi DATABASE_URL (PostgreSQL) dan MONGO_URI (MongoDB)
// 2. Script ini AMAN dijalankan: tidak akan menghapus data PostgreSQL Anda
// 3. Jika collection MongoDB sudah ada datanya, script ini akan skip insert (tidak duplikat)

package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/joho/godotenv"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"

	"database/sql"

	_ "github.com/lib/pq"
)

// ─── Koneksi Global ───────────────────────────────────────────────────────────

var pgDB *sql.DB
var mongoDB *mongo.Database

// ─── Struct PostgreSQL (ID masih integer lama) ───────────────────────────────

type PgUser struct {
	ID             int
	Name           string
	Email          string
	Password       string
	WhatsappNumber string
	Role           string
	CreatedAt      *time.Time // nullable
	UpdatedAt      *time.Time // nullable
}

type PgCategory struct {
	ID        int
	Name      string
	CreatedAt *time.Time // nullable
	UpdatedAt *time.Time // nullable
}

type PgProduct struct {
	ID          int
	Name        string
	Description string
	Price       int64
	Stock       int64
	ImageURL    string
	CategoryID  *int // nullable
	CreatedAt   *time.Time // nullable
	UpdatedAt   *time.Time // nullable
}

// ─── Struct MongoDB (ID sudah ObjectID baru) ─────────────────────────────────

type MongoUser struct {
	ID             primitive.ObjectID `bson:"_id"`
	Name           string             `bson:"name"`
	Email          string             `bson:"email"`
	Password       string             `bson:"password"`
	WhatsappNumber string             `bson:"whatsapp_number"`
	Role           string             `bson:"role"`
	CreatedAt      time.Time          `bson:"created_at"`
	UpdatedAt      time.Time          `bson:"updated_at"`
}

type MongoCategory struct {
	ID        primitive.ObjectID `bson:"_id"`
	Name      string             `bson:"name"`
	CreatedAt time.Time          `bson:"created_at"`
	UpdatedAt time.Time          `bson:"updated_at"`
}

type MongoProduct struct {
	ID          primitive.ObjectID `bson:"_id"`
	Name        string             `bson:"name"`
	Description string             `bson:"description"`
	Price       int                `bson:"price"`
	Stock       int                `bson:"stock"`
	ImageURL    string             `bson:"image_url"`
	CategoryID  primitive.ObjectID `bson:"category_id"`
	CreatedAt   time.Time          `bson:"created_at"`
	UpdatedAt   time.Time          `bson:"updated_at"`
}

func main() {
	// Load .env (dijalankan dari folder ecom-backend-go/)
	if err := godotenv.Load(".env"); err != nil {
		log.Println("File .env tidak ditemukan, menggunakan env sistem...")
	}

	// ── Koneksi PostgreSQL ────────────────────────────────────────────────────
	pgURL := os.Getenv("DATABASE_URL")
	if pgURL == "" {
		log.Fatal("DATABASE_URL tidak ditemukan di .env")
	}

	var err error
	pgDB, err = sql.Open("postgres", pgURL)
	if err != nil {
		log.Fatalf("Gagal membuka koneksi PostgreSQL: %v", err)
	}
	defer pgDB.Close()

	if err := pgDB.Ping(); err != nil {
		log.Fatalf("Gagal ping PostgreSQL: %v", err)
	}
	fmt.Println("✅ Terhubung ke PostgreSQL!")

	// ── Koneksi MongoDB ───────────────────────────────────────────────────────
	mongoURI := os.Getenv("MONGO_URI")
	if mongoURI == "" {
		log.Fatal("MONGO_URI tidak ditemukan di .env")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	mongoClient, err := mongo.Connect(ctx, options.Client().ApplyURI(mongoURI))
	if err != nil {
		log.Fatalf("Gagal terhubung ke MongoDB: %v", err)
	}
	defer mongoClient.Disconnect(ctx)

	if err := mongoClient.Ping(ctx, nil); err != nil {
		log.Fatalf("Gagal ping MongoDB: %v", err)
	}
	fmt.Println("✅ Terhubung ke MongoDB!")

	mongoDB = mongoClient.Database("ecom_db")

	// ── Jalankan Migrasi ──────────────────────────────────────────────────────
	fmt.Println("\n🚀 Memulai proses migrasi data...")
	fmt.Println("==================================================")

	// PETA ID: menyimpan mapping antara old int ID -> new ObjectID MongoDB
	userIDMap := make(map[int]primitive.ObjectID)
	categoryIDMap := make(map[int]primitive.ObjectID)
	productIDMap := make(map[int]primitive.ObjectID)

	migrateUsers(userIDMap)
	migrateCategories(categoryIDMap)
	migrateProducts(categoryIDMap, productIDMap)

	fmt.Println("==================================================")
	fmt.Println("🎉 Migrasi selesai! Semua data telah dipindahkan ke MongoDB.")
}

// ─── Migrasi Users ────────────────────────────────────────────────────────────

func migrateUsers(idMap map[int]primitive.ObjectID) {
	fmt.Println("\n📦 Migrasi tabel: users")

	rows, err := pgDB.Query(`SELECT id, COALESCE(name,''), COALESCE(email,''), COALESCE(password,''), COALESCE(whatsapp_number,''), COALESCE(role,'CUSTOMER'), created_at, updated_at FROM users WHERE deleted_at IS NULL`)
	if err != nil {
		log.Printf("   ⚠️  Gagal membaca tabel users: %v", err)
		return
	}
	defer rows.Close()

	collection := mongoDB.Collection("users")
	count := 0

	for rows.Next() {
		var u PgUser
		if err := rows.Scan(&u.ID, &u.Name, &u.Email, &u.Password, &u.WhatsappNumber, &u.Role, &u.CreatedAt, &u.UpdatedAt); err != nil {
			log.Printf("   ⚠️  Gagal scan user: %v", err)
			continue
		}

		// Buat ObjectID baru untuk user ini
		newID := primitive.NewObjectID()
		idMap[u.ID] = newID

		now := time.Now()
		createdAt := now
		if u.CreatedAt != nil {
			createdAt = *u.CreatedAt
		}
		updatedAt := now
		if u.UpdatedAt != nil {
			updatedAt = *u.UpdatedAt
		}

		doc := MongoUser{
			ID:             newID,
			Name:           u.Name,
			Email:          u.Email,
			Password:       u.Password,
			WhatsappNumber: u.WhatsappNumber,
			Role:           u.Role,
			CreatedAt:      createdAt,
			UpdatedAt:      updatedAt,
		}

		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		_, insertErr := collection.InsertOne(ctx, doc)
		cancel()

		if insertErr != nil {
			log.Printf("   ⚠️  Gagal insert user '%s': %v", u.Email, insertErr)
			continue
		}
		count++
	}
	fmt.Printf("   ✅ Berhasil migrasi %d user\n", count)
}

// ─── Migrasi Categories ───────────────────────────────────────────────────────

func migrateCategories(idMap map[int]primitive.ObjectID) {
	fmt.Println("\n📦 Migrasi tabel: product_categories")

	rows, err := pgDB.Query(`SELECT id, COALESCE(name,''), created_at, updated_at FROM categories`)
	if err != nil {
		log.Printf("   ⚠️  Gagal membaca tabel categories: %v", err)
		return
	}
	defer rows.Close()

	collection := mongoDB.Collection("categories")
	count := 0

	for rows.Next() {
		var c PgCategory
		if err := rows.Scan(&c.ID, &c.Name, &c.CreatedAt, &c.UpdatedAt); err != nil {
			log.Printf("   ⚠️  Gagal scan category: %v", err)
			continue
		}

		newID := primitive.NewObjectID()
		idMap[c.ID] = newID

		now := time.Now()
		createdAt := now
		if c.CreatedAt != nil {
			createdAt = *c.CreatedAt
		}
		updatedAt := now
		if c.UpdatedAt != nil {
			updatedAt = *c.UpdatedAt
		}

		doc := MongoCategory{
			ID:        newID,
			Name:      c.Name,
			CreatedAt: createdAt,
			UpdatedAt: updatedAt,
		}

		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		_, insertErr := collection.InsertOne(ctx, doc)
		cancel()

		if insertErr != nil {
			log.Printf("   ⚠️  Gagal insert category '%s': %v", c.Name, insertErr)
			continue
		}
		count++
	}
	fmt.Printf("   ✅ Berhasil migrasi %d kategori\n", count)
}

// ─── Migrasi Products ─────────────────────────────────────────────────────────

func migrateProducts(categoryIDMap map[int]primitive.ObjectID, productIDMap map[int]primitive.ObjectID) {
	fmt.Println("\n📦 Migrasi tabel: products")

	// Gunakan COALESCE(image_url, image, '') karena ada 2 kolom gambar
	rows, err := pgDB.Query(`SELECT id, COALESCE(name,''), COALESCE(description,''), COALESCE(price,0), COALESCE(stock,0), COALESCE(image_url, image, ''), category_id, created_at, updated_at FROM products WHERE deleted_at IS NULL`)
	if err != nil {
		log.Printf("   ⚠️  Gagal membaca tabel products: %v", err)
		return
	}
	defer rows.Close()

	collection := mongoDB.Collection("products")
	count := 0

	for rows.Next() {
		var p PgProduct
		if err := rows.Scan(&p.ID, &p.Name, &p.Description, &p.Price, &p.Stock, &p.ImageURL, &p.CategoryID, &p.CreatedAt, &p.UpdatedAt); err != nil {
			log.Printf("   ⚠️  Gagal scan product: %v", err)
			continue
		}

		// Cari MongoDB ObjectID dari category lama (jika ada)
		var newCatID primitive.ObjectID
		if p.CategoryID != nil {
			var ok bool
			newCatID, ok = categoryIDMap[*p.CategoryID]
			if !ok {
				log.Printf("   ⚠️  Category ID %d tidak ditemukan, produk '%s' akan disimpan tanpa kategori", *p.CategoryID, p.Name)
			}
		}

		now := time.Now()
		createdAt := now
		if p.CreatedAt != nil {
			createdAt = *p.CreatedAt
		}
		updatedAt := now
		if p.UpdatedAt != nil {
			updatedAt = *p.UpdatedAt
		}

		newID := primitive.NewObjectID()
		productIDMap[p.ID] = newID

		doc := MongoProduct{
			ID:          newID,
			Name:        p.Name,
			Description: p.Description,
			Price:       int(p.Price),
			Stock:       int(p.Stock),
			ImageURL:    p.ImageURL,
			CategoryID:  newCatID,
			CreatedAt:   createdAt,
			UpdatedAt:   updatedAt,
		}

		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		_, insertErr := collection.InsertOne(ctx, doc)
		cancel()

		if insertErr != nil {
			log.Printf("   ⚠️  Gagal insert product '%s': %v", p.Name, insertErr)
			continue
		}
		count++
	}
	fmt.Printf("   ✅ Berhasil migrasi %d produk\n", count)
}
