package services

import (
	"context"
	"ecom-backend-go/config"
	"encoding/json"
	"fmt"
	"log"
	"time"

	amqp "github.com/rabbitmq/amqp091-go"
)

const NotificationQueue = "order_notifications"

type NotificationPayload struct {
	Message string `json:"message"`
}

// PublishNotification mengirimkan pesan ke RabbitMQ (Producer)
func PublishNotification(message string) error {
	if config.RabbitMQConn == nil || config.RabbitMQConn.IsClosed() {
		// Fallback: Jika RabbitMQ tidak ada, jalankan seperti sebelumnya dengan Goroutine
		go func() {
			log.Printf("[NOTIFIKASI FALLBACK] %s\n", message)
		}()
		return nil
	}

	ch, err := config.RabbitMQConn.Channel()
	if err != nil {
		return fmt.Errorf("gagal membuka channel RabbitMQ: %w", err)
	}
	defer ch.Close()

	// Pastikan antrean (queue) ada
	q, err := ch.QueueDeclare(
		NotificationQueue, // name
		true,                // durable
		false,               // delete when unused
		false,               // exclusive
		false,               // no-wait
		nil,                 // arguments
	)
	if err != nil {
		return fmt.Errorf("gagal mendeklarasikan queue: %w", err)
	}

	payload := NotificationPayload{
		Message: message,
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("gagal marshal payload: %w", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	err = ch.PublishWithContext(ctx,
		"",     // exchange
		q.Name, // routing key
		false,  // mandatory
		false,  // immediate
		amqp.Publishing{
			ContentType:  "application/json",
			Body:         body,
			DeliveryMode: amqp.Persistent, // Agar pesan tidak hilang saat server RabbitMQ restart
		})
	
	if err != nil {
		return fmt.Errorf("gagal publish pesan ke queue: %w", err)
	}

	return nil
}

// StartNotificationConsumer menjalankan worker untuk mendengarkan pesan dari antrean RabbitMQ (Consumer)
func StartNotificationConsumer() {
	if config.RabbitMQConn == nil || config.RabbitMQConn.IsClosed() {
		return
	}

	ch, err := config.RabbitMQConn.Channel()
	if err != nil {
		log.Printf("⚠️ Gagal membuka channel consumer RabbitMQ: %v", err)
		return
	}
	// Catatan: channel tidak di-defer close karena goroutine ini berjalan terus menerus

	q, err := ch.QueueDeclare(
		NotificationQueue,
		true,
		false,
		false,
		false,
		nil,
	)
	if err != nil {
		log.Printf("⚠️ Gagal mendeklarasikan queue consumer: %v", err)
		return
	}

	// Fair dispatch (worker tidak ambil terlalu banyak antrean sekaligus)
	err = ch.Qos(
		1,     // prefetch count
		0,     // prefetch size
		false, // global
	)
	if err != nil {
		log.Printf("⚠️ Gagal set QoS: %v", err)
	}

	msgs, err := ch.Consume(
		q.Name, // queue
		"",     // consumer
		false,  // auto-ack (kita pakai manual ack agar aman)
		false,  // exclusive
		false,  // no-local
		false,  // no-wait
		nil,    // args
	)
	if err != nil {
		log.Printf("⚠️ Gagal mendaftarkan consumer: %v", err)
		return
	}

	go func() {
		log.Println("👷 Menjalankan RabbitMQ Worker untuk antrean Notifikasi...")
		for d := range msgs {
			var payload NotificationPayload
			if err := json.Unmarshal(d.Body, &payload); err != nil {
				log.Printf("Gagal membaca payload RabbitMQ: %v", err)
				d.Ack(false)
				continue
			}

			// Dummy eksekusi notifikasi (bisa diganti Email/SMS nantinya)
			log.Printf("✅ Worker memproses notifikasi: %s", payload.Message)
			
			// Konfirmasi pesan telah sukses diproses
			d.Ack(false)
		}
	}()
}

