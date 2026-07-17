package controllers

import (
	"ecom-backend-go/services"
	"github.com/gofiber/fiber/v2"
)

var cartService = services.CartService{}

func AddToCart(c *fiber.Ctx) error {
	rawUserID := c.Locals("user_id")
	if rawUserID == nil {
		return c.Status(401).JSON(fiber.Map{"error": "User tidak terautentikasi"})
	}

	userID, ok := rawUserID.(string)
	if !ok {
		return c.Status(401).JSON(fiber.Map{"error": "Format user_id tidak valid"})
	}

	var input struct {
		ProductID string `json:"product_id"`
		Quantity  int    `json:"quantity"`
	}

	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Input salah lek"})
	}

	if input.ProductID == "" {
		return c.Status(400).JSON(fiber.Map{"error": "product_id tidak boleh kosong"})
	}
	if input.Quantity <= 0 {
		input.Quantity = 1
	}

	if err := cartService.AddToCart(userID, input.ProductID, input.Quantity); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"message": "Masuk keranjang bos!"})
}

func GetMyCart(c *fiber.Ctx) error {
	rawUserID := c.Locals("user_id")
	if rawUserID == nil {
		return c.Status(401).JSON(fiber.Map{"error": "User tidak terautentikasi"})
	}

	userID, ok := rawUserID.(string)
	if !ok {
		return c.Status(401).JSON(fiber.Map{"error": "Format user_id tidak valid"})
	}

	carts, err := cartService.GetMyCart(userID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Gagal ambil cart"})
	}

	return c.JSON(fiber.Map{"data": carts})
}

func RemoveFromCart(c *fiber.Ctx) error {
	rawUserID := c.Locals("user_id")
	if rawUserID == nil {
		return c.Status(401).JSON(fiber.Map{"error": "User tidak terautentikasi"})
	}

	userID, ok := rawUserID.(string)
	if !ok {
		return c.Status(401).JSON(fiber.Map{"error": "Format user_id tidak valid"})
	}

	cartID := c.Params("id")
	if cartID == "" {
		return c.Status(400).JSON(fiber.Map{"error": "cart ID tidak valid"})
	}

	if err := cartService.RemoveFromCart(userID, cartID); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"message": "Item dihapus bos!"})
}