package services

import (
	"ecom-backend-go/models"
	"ecom-backend-go/repositories"
	"errors"
	"fmt"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type CartService struct {
	Repo repositories.CartRepository
}

func (s *CartService) AddToCart(userID string, productID string, quantity int) error {
	product, err := s.Repo.GetProductByID(productID)
	if err != nil {
		return errors.New("Produk ga ketemu!")
	}

	if product.Stock < quantity {
		return errors.New(fmt.Sprintf("Stok ga cukup, sisa: %d", product.Stock))
	}

	existing, err := s.Repo.GetCartItemByProduct(userID, productID)

	if err != nil {
		uID, _ := primitive.ObjectIDFromHex(userID)
		pID, _ := primitive.ObjectIDFromHex(productID)
		
		cart := models.Cart{
			UserID:    uID,
			ProductID: pID,
			Quantity:  quantity,
		}
		
		return s.Repo.Create(&cart)
	}

	newQty := existing.Quantity + quantity
	if product.Stock < newQty {
		return errors.New(fmt.Sprintf("Stok ga cukup buat nambah lagi, sisa: %d, di keranjang: %d", product.Stock, existing.Quantity))
	}
	return s.Repo.UpdateCartQuantity(existing.ID.Hex(), newQty)
}

func (s *CartService) GetMyCart(userID string) ([]models.Cart, error) {
	return s.Repo.GetMyCart(userID)
}

func (s *CartService) RemoveFromCart(userID string, cartID string) error {
	return s.Repo.DeleteFromCart(userID, cartID)
}