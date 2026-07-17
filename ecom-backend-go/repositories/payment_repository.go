package repositories

import (
	"context"
	"ecom-backend-go/config"
	"ecom-backend-go/models"
	"errors"
	"fmt"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type PaymentRepository struct{}

func (r *PaymentRepository) GetOrderByIDAndUser(orderID string, userID string) (models.Order, error) {
	var order models.Order
	oID, _ := primitive.ObjectIDFromHex(orderID)
	uID, _ := primitive.ObjectIDFromHex(userID)

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	err := config.DB.Collection("orders").FindOne(ctx, bson.M{"_id": oID, "user_id": uID}).Decode(&order)
	if err != nil {
		return order, errors.New("order tidak ditemukan")
	}
	return order, nil
}

func (r *PaymentRepository) GetOrderByID(orderID string) (models.Order, error) {
	var order models.Order
	oID, _ := primitive.ObjectIDFromHex(orderID)

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	err := config.DB.Collection("orders").FindOne(ctx, bson.M{"_id": oID}).Decode(&order)
	if err != nil {
		return order, errors.New("order tidak ditemukan di database")
	}
	return order, nil
}

func (r *PaymentRepository) GetUserByID(userID string) (models.User, error) {
	var user models.User
	uID, _ := primitive.ObjectIDFromHex(userID)

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	err := config.DB.Collection("users").FindOne(ctx, bson.M{"_id": uID}).Decode(&user)
	return user, err
}

func (r *PaymentRepository) SaveSnapToken(orderID string, snapToken string, expiredAt time.Time) error {
	oID, _ := primitive.ObjectIDFromHex(orderID)

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	_, err := config.DB.Collection("orders").UpdateOne(
		ctx,
		bson.M{"_id": oID},
		bson.M{"$set": bson.M{
			"snap_token":            snapToken,
			"snap_token_expired_at": expiredAt,
			"updated_at":            time.Now(),
		}},
	)
	return err
}

func (r *PaymentRepository) UpdateOrderStatusAndPayment(orderID string, status string, paymentMethod string) error {
	fmt.Printf("[DB LOG] Eksekusi UpdateOrderStatusAndPayment untuk OrderID: %s | Status Baru: %s | Payment: %s\n", orderID, status, paymentMethod)

	oID, _ := primitive.ObjectIDFromHex(orderID)

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	_, err := config.DB.Collection("orders").UpdateOne(
		ctx,
		bson.M{"_id": oID},
		bson.M{"$set": bson.M{
			"status":         status,
			"payment_method": paymentMethod,
			"updated_at":     time.Now(),
		}},
	)
	return err
}