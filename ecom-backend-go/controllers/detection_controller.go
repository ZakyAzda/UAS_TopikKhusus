package controllers

// controllers/detection_controller.go
// Proxy controller: meneruskan gambar dari React Native ke Python ONNX server

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
)

// ─── Structs: Python Server Response ─────────────────────────────────────────

// Detection merepresentasikan satu bounding box hasil deteksi YOLOv8
type Detection struct {
	X1         int     `json:"x1"`
	Y1         int     `json:"y1"`
	X2         int     `json:"x2"`
	Y2         int     `json:"y2"`
	Confidence float64 `json:"confidence"`
	ClassName  string  `json:"class_name"`
	ClassKey   string  `json:"class_key"`
}

// PythonPredictResponse - struct untuk parse response dari Python server
type PythonPredictResponse struct {
	Success         bool               `json:"success"`
	Disease         string             `json:"disease"`
	Confidence      float64            `json:"confidence"`
	IsConfident     bool               `json:"is_confident"`
	AllProbabilities map[string]float64 `json:"all_probabilities"`
	Recommendation  string             `json:"recommendation"`
	Severity        string             `json:"severity"`
	ProcessedAt     string             `json:"processed_at"`
	DetectionCount  int                `json:"detection_count"`
	Detections      []Detection        `json:"detections"`
	ImageWidth      int                `json:"image_width"`
	ImageHeight     int                `json:"image_height"`
}

// ─── Struct: Response ke React Native ────────────────────────────────────────

// DetectionResult - struct yang dikirim balik ke React Native
type DetectionResult struct {
	Success          bool               `json:"success"`
	Disease          string             `json:"disease"`
	Confidence       float64            `json:"confidence"`
	IsConfident      bool               `json:"is_confident"`
	AllProbabilities map[string]float64 `json:"all_probabilities"`
	Recommendation   string             `json:"recommendation"`
	Severity         string             `json:"severity"`
	ProcessedAt      string             `json:"processed_at"`
	DetectionCount   int                `json:"detection_count"`
	Detections       []Detection        `json:"detections"`
	ImageWidth       int                `json:"image_width"`
	ImageHeight      int                `json:"image_height"`
}

// ─── Helper Functions ─────────────────────────────────────────────────────────

// getPythonServerURL - URL Python inference server, bisa diset via environment variable
func getPythonServerURL() string {
	url := os.Getenv("ML_SERVER_URL")
	if url == "" {
		// Default: localhost saat development
		// Di production, ganti dengan IP/domain server Python
		return "http://localhost:8000"
	}
	return url
}

// getRecommendation - berikan rekomendasi berdasarkan hasil deteksi
// Digunakan sebagai fallback jika Python server tidak mengembalikan recommendation
func getRecommendation(disease string, confidence float64) string {
	recommendations := map[string]string{
		"Sehat": "Tanaman Anda dalam kondisi sehat! Pertahankan perawatan rutin: " +
			"siram secara teratur, pastikan nutrisi cukup, dan jaga sirkulasi udara.",

		"Bacterial Leaf Spot": "Terdeteksi Bercak Daun Bakteri. Tindakan: " +
			"(1) Kurangi kelembaban berlebih, (2) Hindari membasahi daun saat menyiram, " +
			"(3) Aplikasikan bakterisida berbahan tembaga, " +
			"(4) Segera buang daun yang terinfeksi parah.",

		"Downy Mildew": "Terdeteksi Embun Bulu (Downy Mildew). Tindakan: " +
			"(1) Tingkatkan sirkulasi udara, (2) Kurangi kelembaban di sekitar tanaman, " +
			"(3) Aplikasikan fungisida sistemik, " +
			"(4) Hindari irigasi overhead, gunakan irigasi tetes.",

		"Fungal Leaf Spot": "Terdeteksi Bercak Daun Jamur. Tindakan: " +
			"(1) Buang dan musnahkan daun yang terinfeksi, " +
			"(2) Aplikasikan fungisida berbahan aktif mancozeb atau chlorothalonil, " +
			"(3) Pastikan jarak tanam cukup untuk sirkulasi udara.",

		"Tip Burn": "Terdeteksi Tip Burn (Ujung Daun Terbakar). Ini bukan penyakit menular, " +
			"melainkan gangguan fisiologis. Tindakan: " +
			"(1) Periksa dan seimbangkan nutrisi kalsium, " +
			"(2) Pastikan aliran udara merata ke seluruh tanaman, " +
			"(3) Jaga konsistensi kelembaban.",
	}

	if rec, ok := recommendations[disease]; ok {
		return rec
	}
	return fmt.Sprintf("Penyakit '%s' terdeteksi. Konsultasikan dengan ahli pertanian untuk penanganan lebih lanjut.", disease)
}

// getSeverity - tentukan tingkat keparahan berdasarkan confidence
func getSeverity(disease string, confidence float64) string {
	if disease == "Sehat" {
		return "none"
	}
	if confidence >= 0.85 {
		return "high"   // Parah
	} else if confidence >= 0.65 {
		return "medium" // Sedang
	}
	return "low" // Ringan / tidak yakin
}

// ─── Handler Utama ────────────────────────────────────────────────────────────

// DetectDisease - handler utama untuk deteksi penyakit selada
// POST /api/detect
// Content-Type: multipart/form-data
// Field: image (file gambar)
func DetectDisease(c *fiber.Ctx) error {
	// 1. Ambil file gambar dari request
	fileHeader, err := c.FormFile("image")
	if err != nil {
		return c.Status(400).JSON(fiber.Map{
			"error": "Gambar tidak ditemukan. Sertakan field 'image' berupa file gambar.",
		})
	}

	// 2. Validasi ukuran file (max 10MB)
	if fileHeader.Size > 10*1024*1024 {
		return c.Status(400).JSON(fiber.Map{
			"error": "Ukuran gambar terlalu besar. Maksimal 10MB.",
		})
	}

	// 3. Validasi tipe file
	contentType := fileHeader.Header.Get("Content-Type")
	if contentType == "" {
		// Coba deteksi dari nama file
		name := strings.ToLower(fileHeader.Filename)
		if strings.HasSuffix(name, ".jpg") || strings.HasSuffix(name, ".jpeg") {
			contentType = "image/jpeg"
		} else if strings.HasSuffix(name, ".png") {
			contentType = "image/png"
		} else if strings.HasSuffix(name, ".webp") {
			contentType = "image/webp"
		}
	}
	if !strings.HasPrefix(contentType, "image/") {
		return c.Status(400).JSON(fiber.Map{
			"error": "File harus berupa gambar (jpg, png, webp).",
		})
	}

	// 4. Buka file
	file, err := fileHeader.Open()
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Gagal membaca file gambar."})
	}
	defer file.Close()

	fileBytes, err := io.ReadAll(file)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Gagal membaca konten gambar."})
	}

	// 5. Forward ke Python server
	pythonResult, err := forwardToPythonServer(fileBytes, fileHeader.Filename, contentType)
	if err != nil {
		return c.Status(502).JSON(fiber.Map{
			"error": fmt.Sprintf("Gagal menghubungi inference server: %s", err.Error()),
		})
	}

	// 6. Gunakan recommendation dan severity dari Python jika ada,
	//    fallback ke fungsi lokal jika tidak ada
	recommendation := pythonResult.Recommendation
	if recommendation == "" {
		recommendation = getRecommendation(pythonResult.Disease, pythonResult.Confidence)
	}
	severity := pythonResult.Severity
	if severity == "" {
		severity = getSeverity(pythonResult.Disease, pythonResult.Confidence)
	}

	// Pastikan Detections tidak nil (kirim array kosong, bukan null)
	detections := pythonResult.Detections
	if detections == nil {
		detections = []Detection{}
	}

	// 7. Susun response yang informatif untuk React Native
	response := DetectionResult{
		Success:          true,
		Disease:          pythonResult.Disease,
		Confidence:       pythonResult.Confidence,
		IsConfident:      pythonResult.IsConfident,
		AllProbabilities: pythonResult.AllProbabilities,
		Recommendation:   recommendation,
		Severity:         severity,
		ProcessedAt:      pythonResult.ProcessedAt,
		DetectionCount:   pythonResult.DetectionCount,
		Detections:       detections,
		ImageWidth:       pythonResult.ImageWidth,
		ImageHeight:      pythonResult.ImageHeight,
	}

	// Isi ProcessedAt dengan waktu sekarang jika Python tidak mengembalikannya
	if response.ProcessedAt == "" {
		response.ProcessedAt = time.Now().Format(time.RFC3339)
	}

	return c.JSON(response)
}

// ─── Forward ke Python ────────────────────────────────────────────────────────

// forwardToPythonServer - kirim gambar ke Python FastAPI server
func forwardToPythonServer(fileBytes []byte, filename string, contentType string) (*PythonPredictResponse, error) {
	pythonURL := getPythonServerURL() + "/predict"

	// Buat multipart form body
	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)

	part, err := writer.CreateFormFile("image", filename)
	if err != nil {
		return nil, fmt.Errorf("gagal membuat form file: %w", err)
	}

	if _, err = part.Write(fileBytes); err != nil {
		return nil, fmt.Errorf("gagal menulis bytes ke form: %w", err)
	}
	writer.Close()

	// Buat HTTP request ke Python server
	req, err := http.NewRequest("POST", pythonURL, body)
	if err != nil {
		return nil, fmt.Errorf("gagal membuat HTTP request: %w", err)
	}
	req.Header.Set("Content-Type", writer.FormDataContentType())

	// Kirim request — timeout 90 detik untuk mengakomodasi:
	// 1. Cold start Railway (server baru bangun + download model dari HuggingFace)
	// 2. Network latency ke server remote
	// 3. Waktu inferensi CPU di Railway
	client := &http.Client{Timeout: 90 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("Python server tidak bisa dihubungi: %w. Pastikan server berjalan di %s", err, getPythonServerURL())
	}
	defer resp.Body.Close()

	respBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("gagal membaca response dari Python server: %w", err)
	}

	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("Python server error (HTTP %d): %s", resp.StatusCode, string(respBytes))
	}

	// Parse response JSON
	var result PythonPredictResponse
	if err := json.Unmarshal(respBytes, &result); err != nil {
		return nil, fmt.Errorf("gagal parse response JSON: %w", err)
	}

	return &result, nil
}

// ─── Health Check ─────────────────────────────────────────────────────────────

// CheckMLServerHealth - cek apakah Python server berjalan
// GET /api/detect/health
func CheckMLServerHealth(c *fiber.Ctx) error {
	pythonURL := getPythonServerURL() + "/health"

	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Get(pythonURL)
	if err != nil {
		return c.Status(503).JSON(fiber.Map{
			"status":    "unavailable",
			"ml_server": getPythonServerURL(),
			"error":     "Python inference server tidak bisa dihubungi",
		})
	}
	defer resp.Body.Close()

	var pythonHealth map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&pythonHealth)

	return c.JSON(fiber.Map{
		"status":    "ok",
		"ml_server": getPythonServerURL(),
		"ml_status": pythonHealth,
	})
}