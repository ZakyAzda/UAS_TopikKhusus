package config

import (
	"log"
	"os"

	"github.com/midtrans/midtrans-go"
	"github.com/midtrans/midtrans-go/snap"
)

var SnapClient snap.Client

func InitMidtrans() {
	serverKey := os.Getenv("MIDTRANS_SERVER_KEY")
	if serverKey == "" {
		log.Fatal("MIDTRANS_SERVER_KEY belum diset di environment variable!")
	}

	env := midtrans.Sandbox
	if os.Getenv("MIDTRANS_ENV") == "production" {
		env = midtrans.Production
	}

	SnapClient = snap.Client{}
	SnapClient.New(serverKey, env)
}