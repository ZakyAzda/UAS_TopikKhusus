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

// GetByIDs mengambil list produk berdasarkan kumpulan ID string (hasil dari Elasticsearch)
// Urutan hasil mengikuti urutan relevance dari Elasticsearch
func (r *ProductRepository) GetByIDs(ids []string, categoryId string) ([]models.Product, error) {
	if len(ids) == 0 {
		return []models.Product{}, nil
	}

	// Konversi string IDs ke ObjectIDs
	var objectIDs []primitive.ObjectID
	for _, id := range ids {
		oid, err := primitive.ObjectIDFromHex(id)
		if err == nil {
			objectIDs = append(objectIDs, oid)
		}
	}

	filter := bson.M{"_id": bson.M{"$in": objectIDs}}

	// Filter tambahan berdasarkan kategori (opsional)
	if categoryId != "" {
		catOID, err := primitive.ObjectIDFromHex(categoryId)
		if err == nil {
			filter["category_id"] = catOID
		}
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	cursor, err := config.DB.Collection("products").Find(ctx, filter)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var products []models.Product
	if err = cursor.All(ctx, &products); err != nil {
		return nil, err
	}

	// Urutkan ulang sesuai urutan relevance dari Elasticsearch
	productMap := make(map[string]models.Product)
	for _, p := range products {
		productMap[p.ID.Hex()] = p
	}

	var ordered []models.Product
	for _, id := range ids {
		if p, ok := productMap[id]; ok {
			ordered = append(ordered, p)
		}
	}

	return ordered, nil
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