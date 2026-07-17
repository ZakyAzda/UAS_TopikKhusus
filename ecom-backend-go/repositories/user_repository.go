package repositories

import (
	"context"
	"ecom-backend-go/config"
	"ecom-backend-go/models"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type UserRepository struct{}

func (r *UserRepository) GetByID(id string) (models.User, error) {
	var user models.User
	objID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return user, err
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	err = config.DB.Collection("users").FindOne(ctx, bson.M{"_id": objID}).Decode(&user)
	return user, err
}

func (r *UserRepository) UpdatePassword(id string, hashedPassword string) error {
	objID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	_, err = config.DB.Collection("users").UpdateOne(
		ctx,
		bson.M{"_id": objID},
		bson.M{"$set": bson.M{"password": hashedPassword, "updated_at": time.Now()}},
	)
	return err
}