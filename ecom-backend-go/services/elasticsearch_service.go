package services

import (
	"bytes"
	"encoding/json"
	"ecom-backend-go/config"
	"ecom-backend-go/models"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
)

const productIndex = "products"

// isESAvailable cek apakah Elasticsearch tersedia
func isESAvailable() bool {
	return config.ESHTTPClient != nil && config.ESBaseURL != ""
}

// doRequest melakukan HTTP request ke Elasticsearch
func doRequest(method, path string, body []byte) (*http.Response, error) {
	url := config.ESBaseURL + path
	var reqBody io.Reader
	if body != nil {
		reqBody = bytes.NewReader(body)
	}

	req, err := http.NewRequest(method, url, reqBody)
	if err != nil {
		return nil, err
	}
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}

	return config.ESHTTPClient.Do(req)
}

// IndexProduct menyimpan atau memperbarui satu produk di Elasticsearch
func IndexProduct(product models.Product) {
	if !isESAvailable() {
		return
	}

	doc := map[string]interface{}{
		"id":          product.ID.Hex(),
		"name":        product.Name,
		"description": product.Description,
		"price":       product.Price,
		"stock":       product.Stock,
		"image_url":   product.ImageURL,
		"category_id": product.CategoryID.Hex(),
	}

	body, err := json.Marshal(doc)
	if err != nil {
		log.Printf("ES: Gagal marshal produk %s: %v", product.ID.Hex(), err)
		return
	}

	resp, err := doRequest("PUT", fmt.Sprintf("/%s/_doc/%s", productIndex, product.ID.Hex()), body)
	if err != nil {
		log.Printf("ES: Gagal index produk %s: %v", product.ID.Hex(), err)
		return
	}
	defer resp.Body.Close()
	io.Copy(io.Discard, resp.Body)

	if resp.StatusCode >= 400 {
		log.Printf("ES: Error indexing produk %s: HTTP %d", product.ID.Hex(), resp.StatusCode)
	}
}

// DeleteProductIndex menghapus dokumen produk dari Elasticsearch
func DeleteProductIndex(productID string) {
	if !isESAvailable() {
		return
	}

	resp, err := doRequest("DELETE", fmt.Sprintf("/%s/_doc/%s", productIndex, productID), nil)
	if err != nil {
		log.Printf("ES: Gagal hapus index produk %s: %v", productID, err)
		return
	}
	defer resp.Body.Close()
	io.Copy(io.Discard, resp.Body)
}

// SearchProductIDs melakukan full-text search dan mengembalikan daftar ID produk yang cocok
func SearchProductIDs(query string) []string {
	if !isESAvailable() || query == "" {
		return nil
	}

	searchBody := map[string]interface{}{
		"query": map[string]interface{}{
			"multi_match": map[string]interface{}{
				"query":     query,
				"fields":    []string{"name^3", "description"},
				"fuzziness": "AUTO",
			},
		},
		"size": 50,
	}

	body, _ := json.Marshal(searchBody)

	resp, err := doRequest("POST", fmt.Sprintf("/%s/_search", productIndex), body)
	if err != nil {
		log.Printf("ES: Gagal search: %v", err)
		return nil
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		log.Printf("ES: Error search: HTTP %d", resp.StatusCode)
		return nil
	}

	var result map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil
	}

	hits, ok := result["hits"].(map[string]interface{})
	if !ok {
		return nil
	}
	hitsArr, ok := hits["hits"].([]interface{})
	if !ok {
		return nil
	}

	var ids []string
	for _, h := range hitsArr {
		hit, ok := h.(map[string]interface{})
		if !ok {
			continue
		}
		id, ok := hit["_id"].(string)
		if ok {
			ids = append(ids, id)
		}
	}

	return ids
}

// EnsureProductIndex memastikan index dengan mapping sudah ada
func EnsureProductIndex() {
	if !isESAvailable() {
		return
	}

	// Cek apakah index sudah ada
	resp, err := doRequest("HEAD", fmt.Sprintf("/%s", productIndex), nil)
	if err != nil {
		log.Printf("ES: Gagal cek index: %v", err)
		return
	}
	resp.Body.Close()

	// Index sudah ada (200 OK)
	if resp.StatusCode == 200 {
		return
	}

	// Buat index dengan mapping
	mapping := `{
		"mappings": {
			"properties": {
				"id":          { "type": "keyword" },
				"name":        { "type": "text", "analyzer": "standard" },
				"description": { "type": "text", "analyzer": "standard" },
				"price":       { "type": "integer" },
				"stock":       { "type": "integer" },
				"image_url":   { "type": "keyword" },
				"category_id": { "type": "keyword" }
			}
		}
	}`

	createResp, err := doRequest("PUT", fmt.Sprintf("/%s", productIndex), []byte(mapping))
	if err != nil {
		log.Printf("ES: Gagal membuat index: %v", err)
		return
	}
	defer createResp.Body.Close()
	io.Copy(io.Discard, createResp.Body)

	if createResp.StatusCode >= 400 {
		log.Printf("ES: Error membuat index: HTTP %d", createResp.StatusCode)
		return
	}

	fmt.Println("ES: Index 'products' berhasil dibuat!")
}

// isESAvailable ditambahkan agar bulk index script bisa menggunakannya
func ESIsAvailable() bool {
	return isESAvailable()
}

// ESDoRequest expose doRequest untuk cmd/index-es
func ESDoRequest(method, path string, body []byte) (*http.Response, error) {
	return doRequest(method, path, body)
}

// Pastikan strings ter-import
var _ = strings.NewReader

