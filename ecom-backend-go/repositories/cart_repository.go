package repositories

import (
	"context"
	"ecom-backend-go/config"
	"ecom-backend-go/models"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type CartRepository struct{}

func (r *CartRepository) GetProductByID(productID string) (models.Product, error) {
	var product models.Product
	objID, err := primitive.ObjectIDFromHex(productID)
	if err != nil {
		return product, err
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	err = config.DB.Collection("products").FindOne(ctx, bson.M{"_id": objID}).Decode(&product)
	return product, err
}

func (r *CartRepository) Create(cart *models.Cart) error {
	cart.ID = primitive.NewObjectID()
	cart.CreatedAt = time.Now()
	cart.UpdatedAt = time.Now()

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	_, err := config.DB.Collection("carts").InsertOne(ctx, cart)
	return err
}

func (r *CartRepository) GetMyCart(userID string) ([]models.Cart, error) {
	var carts []models.Cart
	userObjID, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return carts, err
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	cursor, err := config.DB.Collection("carts").Find(ctx, bson.M{"user_id": userObjID})
	if err != nil {
		return carts, err
	}
	defer cursor.Close(ctx)

	err = cursor.All(ctx, &carts)
	return carts, err
}

func (r *CartRepository) DeleteFromCart(userID string, cartID string) error {
	userObjID, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return err
	}
	cartObjID, err := primitive.ObjectIDFromHex(cartID)
	if err != nil {
		return err
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	_, err = config.DB.Collection("carts").DeleteOne(ctx, bson.M{"_id": cartObjID, "user_id": userObjID})
	return err
}

func (r *CartRepository) GetCartItemByProduct(userID string, productID string) (models.Cart, error) {
	var cart models.Cart
	userObjID, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return cart, err
	}
	prodObjID, err := primitive.ObjectIDFromHex(productID)
	if err != nil {
		return cart, err
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	err = config.DB.Collection("carts").FindOne(ctx, bson.M{"user_id": userObjID, "product_id": prodObjID}).Decode(&cart)
	return cart, err
}

func (r *CartRepository) UpdateCartQuantity(cartID string, newQty int) error {
	cartObjID, err := primitive.ObjectIDFromHex(cartID)
	if err != nil {
		return err
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	_, err = config.DB.Collection("carts").UpdateOne(
		ctx,
		bson.M{"_id": cartObjID},
		bson.M{"$set": bson.M{"quantity": newQty, "updated_at": time.Now()}},
	)
	return err
}