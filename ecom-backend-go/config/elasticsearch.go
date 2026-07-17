package config

import (
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"time"
)

// ESBaseURL menyimpan URL dasar Elasticsearch
var ESBaseURL string

// ESHTTPClient adalah HTTP client yang digunakan untuk berkomunikasi dengan Elasticsearch
var ESHTTPClient *http.Client

func ConnectElasticsearch() {
	url := os.Getenv("ELASTICSEARCH_URL")
	if url == "" {
		url = "http://localhost:9200"
	}

	client := &http.Client{Timeout: 10 * time.Second}

	// Ping ke Elasticsearch untuk cek koneksi
	resp, err := client.Get(url)
	if err != nil {
		log.Printf("⚠️  Elasticsearch tidak dapat dijangkau di %s: %v — Fitur pencarian canggih dinonaktifkan.", url, err)
		return
	}
	defer resp.Body.Close()
	io.Copy(io.Discard, resp.Body)

	if resp.StatusCode >= 400 {
		log.Printf("⚠️  Elasticsearch response error: HTTP %d — Fitur pencarian canggih dinonaktifkan.", resp.StatusCode)
		return
	}

	ESBaseURL = url
	ESHTTPClient = client
	fmt.Printf("Berhasil terhubung ke Elasticsearch di %s!\n", url)
}

