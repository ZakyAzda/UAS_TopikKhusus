package services

import (
	"ecom-backend-go/models"
	"ecom-backend-go/repositories"
	"errors"
)

type OrderService struct {
	Repo repositories.OrderRepository
}

type CheckoutInput struct {
    CartIDs       []string `json:"cart_ids"`
    ProductID     string   `json:"product_id"`
    Quantity      int      `json:"quantity"`
    Address       string   `json:"address"`
    PaymentMethod string   `json:"payment_method"`
}

func (s *OrderService) Checkout(userID string, input CheckoutInput) (models.Order, error) {
	if len(input.CartIDs) == 0 && input.ProductID == "" {
		return models.Order{}, errors.New("Mau beli apa lek? Keranjang kosong & produk ga dipilih!")
	}

	initialStatus := "BELUM_BAYAR"
	if input.PaymentMethod == "COD" {
		initialStatus = "PENGIRIMAN"
	}

	return s.Repo.CheckoutTransaction(userID, input.CartIDs, input.ProductID, input.Quantity, input.Address, input.PaymentMethod, initialStatus)
}

func (s *OrderService) GetMyOrders(userID string) ([]models.Order, error) {
	return s.Repo.GetMyOrders(userID)
}

func (s *OrderService) GetAllOrders() ([]models.Order, error) {
	return s.Repo.GetAllOrders()
}

func (s *OrderService) UpdateOrderStatus(id string, status string) (models.Order, error) {
	return s.Repo.UpdateStatus(id, status)
}