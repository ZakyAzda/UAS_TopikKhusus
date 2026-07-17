package controllers

import (
	"context"
	"ecom-backend-go/config"
	"ecom-backend-go/models"
	"ecom-backend-go/services"
	"os"
	"time"

	"github.com/gofiber/fiber/v2"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

var userService = services.UserService{}

func ChangePassword(c *fiber.Ctx) error {
	userID, err := getUserID(c)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"error": err.Error()})
	}

	var input struct {
		CurrentPassword string `json:"current_password"`
		NewPassword     string `json:"new_password"`
	}

	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Input tidak valid"})
	}

	if input.CurrentPassword == "" || input.NewPassword == "" {
		return c.Status(400).JSON(fiber.Map{"error": "Password lama dan baru wajib diisi"})
	}

	if len(input.NewPassword) < 6 {
		return c.Status(400).JSON(fiber.Map{"error": "Password baru minimal 6 karakter"})
	}

	if input.CurrentPassword == input.NewPassword {
		return c.Status(400).JSON(fiber.Map{"error": "Password baru tidak boleh sama dengan password lama"})
	}

	if err := userService.ChangePassword(userID, input.CurrentPassword, input.NewPassword); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"message": "Password berhasil diubah!"})
}

func UpdateUserRole(c *fiber.Ctx) error {
	id := c.Params("id")

	var input struct {
		Role string `json:"role"`
	}
	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Input tidak valid"})
	}

	if input.Role != "ADMIN" && input.Role != "CUSTOMER" {
		return c.Status(400).JSON(fiber.Map{"error": "Role tidak valid. Gunakan ADMIN atau CUSTOMER"})
	}

	objID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid ID"})
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var user models.User
	if err := config.DB.Collection("users").FindOne(ctx, bson.M{"_id": objID}).Decode(&user); err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "User tidak ditemukan"})
	}

	if _, err := config.DB.Collection("users").UpdateOne(ctx, bson.M{"_id": objID}, bson.M{"$set": bson.M{"role": input.Role}}); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Gagal update role"})
	}

	return c.JSON(fiber.Map{
		"message": "Role berhasil diubah menjadi " + input.Role,
		"user": fiber.Map{
			"id":   user.ID,
			"name": user.Name,
			"role": input.Role,
		},
	})
}

func GetAllUsers(c *fiber.Ctx) error {
	var users []models.User
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	cursor, err := config.DB.Collection("users").Find(ctx, bson.M{})
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Gagal ambil data user dari DB"})
	}
	defer cursor.Close(ctx)

	if err := cursor.All(ctx, &users); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Gagal baca data user"})
	}

	return c.JSON(users)
}

func SetAdminRole(c *fiber.Ctx) error {
	var input struct {
		Email  string `json:"email"`
		DevKey string `json:"dev_key"`
	}
	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Input salah"})
	}

	expectedKey := os.Getenv("DEV_ADMIN_KEY")
	if expectedKey == "" || input.DevKey != expectedKey {
		return c.Status(403).JSON(fiber.Map{"error": "Dev key salah!"})
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var user models.User
	if err := config.DB.Collection("users").FindOne(ctx, bson.M{"email": input.Email}).Decode(&user); err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "User dengan email itu tidak ditemukan"})
	}

	config.DB.Collection("users").UpdateOne(ctx, bson.M{"_id": user.ID}, bson.M{"$set": bson.M{"role": "ADMIN"}})

	return c.JSON(fiber.Map{
		"message": "Berhasil! Role user " + user.Name + " diset jadi ADMIN",
		"user": fiber.Map{
			"id":    user.ID,
			"name":  user.Name,
			"email": user.Email,
			"role":  "ADMIN",
		},
	})
}