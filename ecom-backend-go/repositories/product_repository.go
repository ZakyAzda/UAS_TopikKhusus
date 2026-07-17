package repositories

import (
	"context"
	"ecom-backend-go/config"
	"ecom-backend-go/models"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type ProductRepository struct{}

func (r *ProductRepository) GetAll(search string, categoryId string) ([]models.Product, error) {
	var products []models.Product
	filter := bson.M{}

	if search != "" {
		filter["name"] = bson.M{"$regex": primitive.Regex{Pattern: search, Options: "i"}}
	}
	if categoryId != "" {
		objID, err := primitive.ObjectIDFromHex(categoryId)
		if err == nil {
			filter["category_id"] = objID
		}
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	cursor, err := config.DB.Collection("products").Find(ctx, filter)
	if err != nil {
		return products, err
	}
	defer cursor.Close(ctx)

	err = cursor.All(ctx, &products)
	return products, err
}

func (r *ProductRepository) GetByID(id string) (models.Product, error) {
	var product models.Product
	objID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return product, err
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	err = config.DB.Collection("products").FindOne(ctx, bson.M{"_id": objID}).Decode(&product)
	return product, err
}

func (r *ProductRepository) Create(product *models.Product) error {
	product.ID = primitive.NewObjectID()
	product.CreatedAt = time.Now()
	product.UpdatedAt = time.Now()

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	_, err := config.DB.Collection("products").InsertOne(ctx, product)
	return err
}

func (r *ProductRepository) Update(product *models.Product, updateData map[string]interface{}) error {
	updateData["updated_at"] = time.Now()
	
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	_, err := config.DB.Collection("products").UpdateOne(
		ctx,
		bson.M{"_id": product.ID},
		bson.M{"$set": updateData},
	)
	return err
}

func (r *ProductRepository) Delete(id string) error {
	objID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	_, err = config.DB.Collection("products").DeleteOne(ctx, bson.M{"_id": objID})
	return err
}