package services

import (
	"bytes"
	"encoding/json"
	"net/http"
	"os"
	"fmt"
)

type WahaPayload struct {
	ChatId  string `json:"chatId"`
	Text    string `json:"text"`
	Session string `json:"session"`
}

// SendMessage akan mengirim HTTP POST ke endpoint Waha
func SendWaMessage(phone string, message string) error {
	wahaURL := os.Getenv("WAHA_BASE_URL") + "/api/sendText"
	
	// Format phone number sesuai requirement Waha (biasanya butuh suffix @c.us)
	chatId := fmt.Sprintf("%s@c.us", phone)

	payload := WahaPayload{
		ChatId:  chatId,
		Text:    message,
		Session: "default", // Sesuaikan dengan nama session Waha kamu
	}

	jsonPayload, _ := json.Marshal(payload)

	req, err := http.NewRequest("POST", wahaURL, bytes.NewBuffer(jsonPayload))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	// req.Header.Set("X-Api-Key", "API_KEY_JIKA_ADA")
	apiKey := os.Getenv("WAHA_API_KEY")
	if apiKey != "" {
		req.Header.Set("X-Api-Key", apiKey)
	}
	
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 201 && resp.StatusCode != 200 {
		return fmt.Errorf("failed to send message, status: %d", resp.StatusCode)
	}

	return nil
}