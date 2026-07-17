package controllers

import (
	"ecom-backend-go/services"
	"fmt"

	"github.com/gofiber/fiber/v2"
)

var orderService = services.OrderService{}

func getUserID(c *fiber.Ctx) (string, error) {
	rawUserID := c.Locals("user_id")
	if rawUserID == nil {
		return "", fiber.NewError(401, "User tidak terautentikasi")
	}
	userID, ok := rawUserID.(string)
	if !ok {
		return "", fiber.NewError(401, "Format user_id tidak valid")
	}
	return userID, nil
}

func Checkout(c *fiber.Ctx) error {
	userID, err := getUserID(c)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"error": err.Error()})
	}

	var input services.CheckoutInput
	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Input checkout salah lek!"})
	}

	order, err := orderService.Checkout(userID, input)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}

	pesanAdmin := fmt.Sprintf("🚨 Pesanan Baru Masuk! ID Pesanan: %v. Segera proses pesanan ini!", order.ID.Hex())

	// Publish pesan notifikasi ke RabbitMQ Queue
	errNotif := services.PublishNotification(pesanAdmin)
	if errNotif != nil {
		fmt.Println("Gagal publish antrean Notifikasi:", errNotif)
	}

	return c.JSON(fiber.Map{
		"message": "Pesanan berhasil dibuat lek!",
		"order":   order,
	})
}

func GetMyOrders(c *fiber.Ctx) error {
	userID, err := getUserID(c)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"error": err.Error()})
	}

	orders, _ := orderService.GetMyOrders(userID)
	return c.JSON(fiber.Map{
		"data": orders,
	})
}

func GetAllOrders(c *fiber.Ctx) error {
	orders, _ := orderService.GetAllOrders()
	return c.JSON(fiber.Map{
		"data": orders,
	})
}

func UpdateOrderStatus(c *fiber.Ctx) error {
	orderID := c.Params("id")

	var input struct {
		Status string `json:"status"`
	}

	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Input status salah lek!"})
	}

	order, err := orderService.UpdateOrderStatus(orderID, input.Status)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{
		"message": "Status pesanan berhasil diupdate jadi " + input.Status,
		"order":   order,
	})
}