package repositories

import (
	"context"
	"ecom-backend-go/config"
	"ecom-backend-go/models"
	"errors"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type OrderRepository struct{}

func (r *OrderRepository) CheckoutTransaction(userID string, cartIDs []string, productID string, quantity int, address string, paymentMethod string, initialStatus string) (models.Order, error) {
	var totalAmount int
	var orderItems []models.OrderItem
	var order models.Order

	userObjID, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return order, err
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if len(cartIDs) > 0 {
		for _, cartIDStr := range cartIDs {
			cartID, _ := primitive.ObjectIDFromHex(cartIDStr)
			var cart models.Cart
			if err := config.DB.Collection("carts").FindOne(ctx, bson.M{"_id": cartID, "user_id": userObjID}).Decode(&cart); err != nil {
				return order, errors.New("Item keranjang ga ketemu!")
			}

			var product models.Product
			if err := config.DB.Collection("products").FindOne(ctx, bson.M{"_id": cart.ProductID}).Decode(&product); err != nil {
				return order, errors.New("Produk sudah tidak ada!")
			}

			if product.Stock < cart.Quantity {
				return order, errors.New("Stok " + product.Name + " habis lek!")
			}

			totalAmount += product.Price * cart.Quantity
			
			// Update stock
			config.DB.Collection("products").UpdateOne(ctx, bson.M{"_id": product.ID}, bson.M{"$inc": bson.M{"stock": -cart.Quantity}})

			orderItems = append(orderItems, models.OrderItem{
				ProductID: cart.ProductID,
				Quantity:  cart.Quantity,
				Price:     product.Price,
			})

			// Delete cart
			config.DB.Collection("carts").DeleteOne(ctx, bson.M{"_id": cart.ID})
		}
	} else if productID != "" {
		if quantity <= 0 {
			return order, errors.New("Jumlah barang minimal 1 lek!")
		}

		prodID, _ := primitive.ObjectIDFromHex(productID)
		var product models.Product
		if err := config.DB.Collection("products").FindOne(ctx, bson.M{"_id": prodID}).Decode(&product); err != nil {
			return order, errors.New("Produk ga ketemu!")
		}

		if product.Stock < quantity {
			return order, errors.New("Stok " + product.Name + " nggak cukup lek!")
		}

		totalAmount = product.Price * quantity
		
		// Update stock
		config.DB.Collection("products").UpdateOne(ctx, bson.M{"_id": product.ID}, bson.M{"$inc": bson.M{"stock": -quantity}})

		orderItems = append(orderItems, models.OrderItem{
			ProductID: product.ID,
			Quantity:  quantity,
			Price:     product.Price,
		})
	}

	order = models.Order{
		ID:            primitive.NewObjectID(),
		UserID:        userObjID,
		TotalAmount:   totalAmount,
		Address:       address,
		PaymentMethod: paymentMethod,
		Status:        initialStatus,
		Items:         orderItems,
		CreatedAt:     time.Now(),
		UpdatedAt:     time.Now(),
	}

	_, err = config.DB.Collection("orders").InsertOne(ctx, order)
	if err != nil {
		return order, errors.New("Gagal bikin order")
	}

	return order, nil
}

func (r *OrderRepository) GetMyOrders(userID string) ([]models.Order, error) {
	var orders []models.Order
	userObjID, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return orders, err
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	cursor, err := config.DB.Collection("orders").Find(ctx, bson.M{"user_id": userObjID})
	if err != nil {
		return orders, err
	}
	defer cursor.Close(ctx)

	err = cursor.All(ctx, &orders)
	return orders, err
}

func (r *OrderRepository) GetAllOrders() ([]models.Order, error) {
	var orders []models.Order

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	cursor, err := config.DB.Collection("orders").Find(ctx, bson.M{})
	if err != nil {
		return orders, err
	}
	defer cursor.Close(ctx)

	err = cursor.All(ctx, &orders)
	return orders, err
}

func (r *OrderRepository) UpdateStatus(id string, status string) (models.Order, error) {
	var order models.Order
	objID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return order, errors.New("Invalid ID")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	err = config.DB.Collection("orders").FindOne(ctx, bson.M{"_id": objID}).Decode(&order)
	if err != nil {
		return order, errors.New("Pesanan nggak ketemu!")
	}

	_, err = config.DB.Collection("orders").UpdateOne(
		ctx,
		bson.M{"_id": objID},
		bson.M{"$set": bson.M{"status": status, "updated_at": time.Now()}},
	)
	
	order.Status = status
	return order, err
}