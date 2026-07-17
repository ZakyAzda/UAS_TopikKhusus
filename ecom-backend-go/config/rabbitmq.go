package config

import (
	"fmt"
	"log"
	"os"

	amqp "github.com/rabbitmq/amqp091-go"
)

var RabbitMQConn *amqp.Connection

func ConnectRabbitMQ() *amqp.Connection {
	url := os.Getenv("RABBITMQ_URL")
	if url == "" {
		url = "amqp://guest:guest@localhost:5672/"
	}

	conn, err := amqp.Dial(url)
	if err != nil {
		log.Printf("⚠️  Gagal terhubung ke RabbitMQ: %v (Aplikasi akan berjalan tanpa antrean eksternal jika ini disengaja)", err)
		return nil
	}

	RabbitMQConn = conn
	fmt.Println("Berhasil terhubung ke RabbitMQ!")
	return conn
}

func CloseRabbitMQ() {
	if RabbitMQConn != nil && !RabbitMQConn.IsClosed() {
		if err := RabbitMQConn.Close(); err != nil {
			log.Printf("Error saat menutup koneksi RabbitMQ: %v", err)
		} else {
			fmt.Println("Koneksi RabbitMQ ditutup.")
		}
	}
}
