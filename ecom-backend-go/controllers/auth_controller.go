package controllers

import (
	"context"
	"ecom-backend-go/config"
	"ecom-backend-go/models"
	"ecom-backend-go/services"
	"os"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"golang.org/x/crypto/bcrypt"
)

var authCache = services.CacheService{}

func Register(c *fiber.Ctx) error {
	var input struct {
		Name           string `json:"name"`
		Email          string `json:"email"`
		Password       string `json:"password"`
		WhatsappNumber string `json:"whatsapp_number"`
	}

	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Data ga valid lek!"})
	}

	hashedPassword, _ := bcrypt.GenerateFromPassword([]byte(input.Password), 10)

	user := models.User{
		ID:             primitive.NewObjectID(),
		Name:           input.Name,
		Email:          input.Email,
		Password:       string(hashedPassword),
		WhatsappNumber: input.WhatsappNumber,
		Role:           "CUSTOMER",
		CreatedAt:      time.Now(),
		UpdatedAt:      time.Now(),
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if _, err := config.DB.Collection("users").InsertOne(ctx, user); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Gagal daftar akun"})
	}

	return c.JSON(fiber.Map{"message": "Daftar sukses!"})
}

func Login(c *fiber.Ctx) error {
	var input struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	c.BodyParser(&input)

	var user models.User
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := config.DB.Collection("users").FindOne(ctx, bson.M{"email": input.Email}).Decode(&user); err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "User ga ketemu!"})
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(input.Password)); err != nil {
		return c.Status(401).JSON(fiber.Map{"error": "Password salah!"})
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id": user.ID.Hex(),
		"role":    user.Role,
		"name":    user.Name,
		"exp":     time.Now().Add(time.Hour * 72).Unix(),
	})

	t, err := token.SignedString([]byte(os.Getenv("JWT_SECRET")))
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Gagal generate token"})
	}

	return c.JSON(fiber.Map{"token": t})
}

func Logout(c *fiber.Ctx) error {
	authHeader := c.Get("Authorization")
	tokenString := strings.Replace(authHeader, "Bearer ", "", 1)
	if tokenString == "" {
		return c.Status(400).JSON(fiber.Map{"error": "Token tidak ditemukan di header"})
	}

	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		return []byte(os.Getenv("JWT_SECRET")), nil
	})
	if err != nil || !token.Valid {
		return c.Status(401).JSON(fiber.Map{"error": "Token tidak valid"})
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return c.Status(500).JSON(fiber.Map{"error": "Gagal membaca claims token"})
	}

	var ttl time.Duration
	if expFloat, ok := claims["exp"].(float64); ok {
		expTime := time.Unix(int64(expFloat), 0)
		remaining := time.Until(expTime)
		if remaining > 0 {
			ttl = remaining
		} else {
			return c.JSON(fiber.Map{"message": "Logout berhasil (token sudah expired)"})
		}
	} else {
		ttl = services.BlacklistTTL
	}

	ctx := context.Background()
	if err := authCache.BlacklistToken(ctx, tokenString, ttl); err != nil {
		return c.JSON(fiber.Map{
			"message": "Logout berhasil (catatan: Redis tidak tersedia, token akan expired otomatis)",
		})
	}

	return c.JSON(fiber.Map{"message": "Logout berhasil! Token sudah tidak berlaku."})
}