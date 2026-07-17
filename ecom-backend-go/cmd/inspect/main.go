package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"

	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
)

func main() {
	godotenv.Load(".env")

	pgURL := os.Getenv("DATABASE_URL")
	db, err := sql.Open("postgres", pgURL)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	// 1. Lihat semua nama tabel
	fmt.Println("=== DAFTAR TABEL ===")
	rows, _ := db.Query(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`)
	defer rows.Close()
	for rows.Next() {
		var t string
		rows.Scan(&t)
		fmt.Println(" -", t)
	}

	// 2. Lihat kolom tabel users
	fmt.Println("\n=== KOLOM TABEL users ===")
	rows2, _ := db.Query(`SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name='users' ORDER BY ordinal_position`)
	defer rows2.Close()
	for rows2.Next() {
		var col, dtype, nullable string
		rows2.Scan(&col, &dtype, &nullable)
		fmt.Printf("  %s | %s | nullable: %s\n", col, dtype, nullable)
	}

	// 3. Lihat kolom tabel products
	fmt.Println("\n=== KOLOM TABEL products ===")
	rows3, _ := db.Query(`SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name='products' ORDER BY ordinal_position`)
	defer rows3.Close()
	for rows3.Next() {
		var col, dtype, nullable string
		rows3.Scan(&col, &dtype, &nullable)
		fmt.Printf("  %s | %s | nullable: %s\n", col, dtype, nullable)
	}
}
