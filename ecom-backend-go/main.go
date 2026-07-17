package main

import (
	"ecom-backend-go/config"
	"ecom-backend-go/controllers"
	"ecom-backend-go/middleware"
	"ecom-backend-go/services"
	"log"
	"os"
	"os/signal"
	"syscall"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/joho/godotenv"
)

func main() {
	// Load .env — tidak fatal jika tidak ada (misal di production pakai env asli)
	if err := godotenv.Load(); err != nil {
		log.Println("File .env tidak ditemukan, pakai environment variable sistem")
	}

	// ── Inisialisasi koneksi eksternal ────────────────────────────────────────
	config.ConnectDB()
	config.ConnectRedis() // ✅ Redis: tidak fatal jika gagal, app tetap jalan tanpa cache
	config.ConnectRabbitMQ()
	services.StartNotificationConsumer()
	config.ConnectElasticsearch()
	services.EnsureProductIndex()


	// Inisialisasi Midtrans (akan Fatal jika MIDTRANS_SERVER_KEY kosong)
	config.InitMidtrans()

	app := fiber.New()

	app.Use(cors.New(cors.Config{
		AllowOrigins: "*",
		AllowHeaders: "Origin, Content-Type, Accept, Authorization",
		AllowMethods: "GET, POST, PUT, DELETE",
	}))

	app.Static("/uploads", "./uploads")

	// ── Rute Publik ──────────────────────────────────────────────────────────
	app.Post("/api/register", controllers.Register)
	app.Post("/api/login", controllers.Login)

	// Produk & Kategori: pakai middleware cache untuk GET publik
	app.Get("/api/products", middleware.CacheResponse(0), controllers.GetProducts)
	app.Get("/api/product-categories", middleware.CacheResponse(0), controllers.GetProductCategories)
	app.Get("/api/products/:id", controllers.GetProduct)

	// Health check — untuk Railway deployment monitoring
	app.Get("/api/health", func(c *fiber.Ctx) error {
		redisStatus := "unavailable"
		if config.IsRedisAvailable() {
			redisStatus = "connected"
		}
		return c.JSON(fiber.Map{
			"status":  "ok",
			"service": "ecom-backend-go",
			"redis":   redisStatus,
		})
	})

	// Webhook Midtrans — PUBLIK, tidak pakai JWT
	app.Post("/api/payment/notification", controllers.MidtransWebhook)

	// DEV ONLY — hapus di production!
	app.Post("/api/dev/make-admin", controllers.SetAdminRole)

	// ── Rute Terproteksi (JWT) ───────────────────────────────────────────────
	api := app.Group("/api", middleware.Protected())

	api.Post("/logout", controllers.Logout) // ✅ JWT blacklist via Redis
	api.Post("/cart", controllers.AddToCart)
	api.Get("/cart", controllers.GetMyCart)
	api.Delete("/cart/:id", controllers.RemoveFromCart)
	api.Post("/checkout", controllers.Checkout)
	api.Get("/orders", controllers.GetMyOrders)
	api.Put("/change-password", controllers.ChangePassword)
	api.Post("/payment/update-status", controllers.UpdateOrderStatusAfterPayment)
	api.Post("/payment/snap-token", controllers.CreateSnapToken)
	api.Get("/payment/status/:order_id", controllers.GetPaymentStatus)
	api.Post("/detect", controllers.DetectDisease)
	api.Get("/detect/health", controllers.CheckMLServerHealth)

	// ── Rute Admin ───────────────────────────────────────────────────────────
	admin := api.Group("/admin", middleware.IsAdmin())

	admin.Get("/orders", controllers.GetAllOrders)
	admin.Put("/orders/:id", controllers.UpdateOrderStatus)
	admin.Post("/products", controllers.CreateProduct)
	admin.Post("/products/upload", controllers.UploadImage)
	admin.Put("/products/:id", controllers.UpdateProduct)
	admin.Delete("/products/:id", controllers.DeleteProduct)
	admin.Post("/product-categories", controllers.CreateProductCategory)
	admin.Delete("/product-categories/:id", controllers.DeleteProductCategory)
	admin.Get("/users", controllers.GetAllUsers)
	admin.Put("/users/:id/role", controllers.UpdateUserRole)

	// ── Graceful Shutdown ─────────────────────────────────────────────────────
	// Tangkap sinyal OS (Ctrl+C / SIGTERM dari Docker/Railway)
	// Tutup semua koneksi eksternal sebelum proses mati
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt, syscall.SIGTERM)

	go func() {
		<-quit
		log.Println("🔄 Menerima sinyal shutdown, menutup koneksi...")
		config.CloseRabbitMQ()
		config.CloseRedis()
		config.DisconnectDB()
		log.Println("👋 Sampai jumpa! Server mati dengan elegan.")
		os.Exit(0)
	}()

	port := os.Getenv("PORT")
	if port == "" {
		port = "3001"
	}
	log.Fatal(app.Listen("0.0.0.0:" + port))
}