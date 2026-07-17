package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type User struct {
	ID             primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Name           string             `bson:"name" json:"name"`
	Email          string             `bson:"email" json:"email"`
	Password       string             `bson:"password" json:"-"` // "-" agar tidak ikut terkirim di response JSON
	WhatsappNumber string             `bson:"whatsapp_number" json:"whatsapp_number"`
	Role           string             `bson:"role" json:"role"`  // Default value "CUSTOMER" di-set saat insert di controller
	CreatedAt      time.Time          `bson:"created_at" json:"created_at"`
	UpdatedAt      time.Time          `bson:"updated_at" json:"updated_at"`
}

type Category struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Name      string             `bson:"name" json:"name"`
	CreatedAt time.Time          `bson:"created_at" json:"created_at"`
	UpdatedAt time.Time          `bson:"updated_at" json:"updated_at"`
}

type Product struct {
	ID          primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Name        string             `bson:"name" json:"name"`
	Description string             `bson:"description" json:"description"`
	Price       int                `bson:"price" json:"price"`
	Stock       int                `bson:"stock" json:"stock"`
	ImageURL    string             `bson:"image_url" json:"image_url"`
	CategoryID  primitive.ObjectID `bson:"category_id" json:"category_id"` // Menggunakan Reference
	CreatedAt   time.Time          `bson:"created_at" json:"created_at"`
	UpdatedAt   time.Time          `bson:"updated_at" json:"updated_at"`
}

type Cart struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	UserID    primitive.ObjectID `bson:"user_id" json:"user_id"`
	ProductID primitive.ObjectID `bson:"product_id" json:"product_id"`
	Quantity  int                `bson:"quantity" json:"quantity"`
	CreatedAt time.Time          `bson:"created_at" json:"created_at"`
	UpdatedAt time.Time          `bson:"updated_at" json:"updated_at"`
}

// OrderItem tidak perlu menjadi koleksi/tabel terpisah.
// Di MongoDB, strukturnya di-embed langsung ke dalam Order.
type OrderItem struct {
	ProductID primitive.ObjectID `bson:"product_id" json:"product_id"`
	Quantity  int                `bson:"quantity" json:"quantity"`
	Price     int                `bson:"price" json:"price"` // Harga saat beli
}

type Order struct {
	ID                 primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	UserID             primitive.ObjectID `bson:"user_id" json:"user_id"`
	TotalAmount        int                `bson:"total_amount" json:"total_amount"`
	Address            string             `bson:"address" json:"address"`
	Status             string             `bson:"status" json:"status"`
	PaymentMethod      string             `bson:"payment_method" json:"payment_method"`
	SnapToken          string             `bson:"snap_token" json:"snap_token"`
	SnapTokenExpiredAt *time.Time         `bson:"snap_token_expired_at" json:"snap_token_expired_at"`
	Items              []OrderItem        `bson:"items" json:"items"` // Array of Embedded Document
	CreatedAt          time.Time          `bson:"created_at" json:"created_at"`
	UpdatedAt          time.Time          `bson:"updated_at" json:"updated_at"`
}