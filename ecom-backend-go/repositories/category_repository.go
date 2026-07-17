package repositories

import (
	"context"
	"ecom-backend-go/config"
	"ecom-backend-go/models"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type CategoryRepository struct{}

func (r *CategoryRepository) GetAll() ([]models.Category, error) {
	var categories []models.Category

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	cursor, err := config.DB.Collection("categories").Find(ctx, bson.M{})
	if err != nil {
		return categories, err
	}
	defer cursor.Close(ctx)

	err = cursor.All(ctx, &categories)
	return categories, err
}

func (r *CategoryRepository) Create(category *models.Category) error {
	category.ID = primitive.NewObjectID()
	category.CreatedAt = time.Now()
	category.UpdatedAt = time.Now()

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	_, err := config.DB.Collection("categories").InsertOne(ctx, category)
	return err
}

func (r *CategoryRepository) Delete(id string) error {
	objID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	_, err = config.DB.Collection("categories").DeleteOne(ctx, bson.M{"_id": objID})
	return err
}