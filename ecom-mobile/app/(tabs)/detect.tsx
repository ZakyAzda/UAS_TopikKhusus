// app/(tabs)/detect.tsx
// ═══════════════════════════════════════════════════════════════════════════
// PERUBAHAN UTAMA vs versi sebelumnya:
//  1. BoundingBoxOverlay LANGSUNG di dalam CameraView (bukan di halaman statis)
//  2. runDetectionLoop() — while-loop async yang capture → API → update bbox
//     terus-menerus selama isDetecting = true
//  3. Tidak ada lagi AppMode 'camera' | 'result' untuk live mode
//  4. Gallery mode tetap ada (analisis gambar statis dengan halaman detail)
//  5. BoundingBoxOverlay: koordinat dihitung dengan logika "cover" (bukan
//     linear naïf) agar bbox sejajar dengan apa yang terlihat di kamera
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
  Dimensions, StatusBar, Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/use-theme';
import { BASE_URL } from '@/services/api';


const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const PREVIEW_SIZE = SCREEN_W - 48;
/**
 * Alur request deteksi:
 *   Mobile → Go Backend (BASE_URL/api/detect)
 *           → ML Server di Railway (modelpenyakitselada-production.up.railway.app)
 *
 * URL ML server dikonfigurasi di Go backend via env var ML_SERVER_URL.
 * Mobile TIDAK langsung ke ML server — semua melalui Go backend.
 */
const ML_DETECT_URL = `${BASE_URL}/predict`;

/**
 * Jeda antar frame deteksi (ms).
 * Kurangi untuk lebih responsif, tambah jika server lambat.
 * Nilai ini adalah waktu TUNGGU setelah respons API diterima, bukan interval tetap.
 */
const DETECT_DELAY_MS = 500;

// ─── Types ────────────────────────────────────────────────────────────────────

type Detection = {
  x1: number; y1: number; x2: number; y2: number;
  confidence: number; class_name: string; class_key: string;
};

type DetectionResult = {
  success: boolean; disease: string; confidence: number;
  is_confident: boolean; all_probabilities: Record<string, number>;
  recommendation: string; severity: 'none' | 'low' | 'medium' | 'high';
  processed_at: string; detection_count: number; detections: Detection[];
  // Dimensi gambar yang BENAR-BENAR dipakai saat inferensi di server.
  // Penting untuk menghitung posisi bounding box secara akurat.
  image_width?: number;
  image_height?: number;
};

// Bentuk respons MENTAH dari backend FastAPI (mem-proxy Roboflow Cloud API).
// Ini BUKAN bentuk `DetectionResult` yang dipakai di seluruh UI — lihat
// `mapPredictionsToResult()` di bawah untuk konversinya.
type RoboflowPrediction = {
  x: number; y: number; width: number; height: number;
  class: string; confidence: number;
};

type ActualApiResponse = {
  success: boolean;
  disease: string;
  confidence: number;
  is_confident: boolean;
  all_probabilities: Record<string, number>;
  recommendation: string;
  severity: 'none' | 'low' | 'medium' | 'high';
  processed_at: string;
  detection_count: number;
  detections: Detection[];
  image_width?: number;
  image_height?: number;
  error?: string;
  message?: string;
};

type GalleryState = {
  uri: string;
  size: { w: number; h: number };
  result: DetectionResult | null;
  loading: boolean;
  error: string | null;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const SEV = {
  none: { color: '#059669', bg: '#D1FAE5', label: 'Sehat', icon: 'check-circle' as const },
  low: { color: '#D97706', bg: '#FEF3C7', label: 'Ringan', icon: 'info' as const },
  medium: { color: '#EA580C', bg: '#FFEDD5', label: 'Sedang', icon: 'warning' as const },
  high: { color: '#DC2626', bg: '#FEE2E2', label: 'Parah', icon: 'error' as const },
};

const BOX_COLORS: Record<string, string> = {
  'Bacterial Leaf Spot': '#DC2626',
  'Downy Mildew': '#7C3AED',
  'Lettuce Mosaic Virus': '#D97706',
  'Powdery Mildew': '#2563EB',
  'Septoria Blight': '#059669',
};
const BOX_DEFAULT = '#EA580C';

const CORNER_STYLES: any[] = [
  { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3 },
  { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3 },
  { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3 },
  { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3 },
];

// ─── Disease Treatment Database ───────────────────────────────────────────────
// Sumber: Panduan pengendalian penyakit tanaman selada dari literatur pertanian
type DiseaseInfo = {
  cause: string;
  symptoms: string;
  urgency: string;
  steps: { icon: string; title: string; desc: string }[];
  prevention: string[];
};

const DISEASE_INFO: Record<string, DiseaseInfo> = {
  'Bacterial Leaf Spot': {
    cause: 'Bakteri Xanthomonas campestris',
    symptoms: 'Bercak cokelat atau kehitaman pada daun yang bisa meluas dan menyebabkan daun mengering, layu, lalu gugur.',
    urgency: 'Tangani segera — bakteri dapat menyebar lewat percikan air dan angin.',
    steps: [
      { icon: 'delete-sweep', title: 'Pangkas Daun Sakit', desc: 'Segera potong dan musnahkan semua daun yang menunjukkan bercak agar tidak menulari daun sehat.' },
      { icon: 'water-drop', title: 'Ubah Pola Penyiraman', desc: 'Hindari menyiram langsung ke permukaan daun. Siram di pangkal tanaman atau gunakan sistem tetes (drip irrigation).' },
      { icon: 'air', title: 'Perbaiki Sirkulasi Udara', desc: 'Atur jarak antar tanaman agar udara dapat bergerak bebas dan daun cepat kering setelah hujan atau penyiraman.' },
      { icon: 'science', title: 'Semprot Bakterisida', desc: 'Gunakan bakterisida berbahan aktif tembaga (copper hydroxide) sesuai dosis anjuran jika serangan sudah meluas.' },
      { icon: 'sanitizer', title: 'Sanitasi Alat Tanam', desc: 'Sterilkan gunting, cangkul, dan alat lain setelah kontak dengan tanaman sakit menggunakan larutan alkohol 70%.' },
    ],
    prevention: [
      'Gunakan varietas tahan penyakit bakteri',
      'Rotasi tanaman — jangan tanam selada di tempat sama berulang kali',
      'Jaga lahan tetap bersih dari gulma dan sisa tanaman lama',
    ],
  },
  'Downy Mildew': {
    cause: 'Jamur air (Oomycetes) Bremia lactucae',
    symptoms: 'Bercak kuning pucat di atas permukaan daun, disertai lapisan seperti bulu halus berwarna putih-keabu-abuan di bawah daun.',
    urgency: 'Tangani cepat — berkembang pesat saat kelembapan tinggi (>85%) dan suhu 10–18°C.',
    steps: [
      { icon: 'thermostat', title: 'Kendalikan Kelembapan', desc: 'Pastikan ventilasi kebun atau greenhouse cukup baik. Hindari menyiram sore/malam hari agar daun tidak lembap semalaman.' },
      { icon: 'delete-sweep', title: 'Buang Tanaman Terinfeksi', desc: 'Cabut dan kubur atau bakar tanaman yang terinfeksi parah — jangan dikompos agar spora tidak tersebar.' },
      { icon: 'science', title: 'Fungisida Oomycetes', desc: 'Gunakan fungisida sistemik khusus Oomycetes (berbahan Metalaxyl, Cyanofamid, atau Mandipropamid) sesuai dosis pada label.' },
      { icon: 'wb-sunny', title: 'Optimalkan Pencahayaan', desc: 'Pastikan tanaman mendapat sinar matahari cukup agar permukaan daun cepat kering dan lingkungan tidak lembap.' },
    ],
    prevention: [
      'Pilih varietas selada yang tahan Downy Mildew',
      'Atur jarak tanam minimal 25–30 cm antar tanaman',
      'Hindari genangan air di sekitar bedengan',
    ],
  },
  'Lettuce Mosaic Virus': {
    cause: 'Virus LMV (Lettuce Mosaic Virus) — ditularkan oleh kutu daun (aphid)',
    symptoms: 'Daun berwarna belang-belang (mosaik hijau muda & tua), berkerut, menggulung, pertumbuhan terhambat, dan ukuran tanaman jauh lebih kecil dari normal.',
    urgency: 'TIDAK ADA OBAT — tanaman harus segera dicabut. Fokus pada pencegahan penyebaran.',
    steps: [
      { icon: 'remove-circle', title: 'Cabut & Musnahkan', desc: 'Segera cabut seluruh tanaman yang terinfeksi virus dan bakar — jangan dijadikan kompos karena virus tetap aktif.' },
      { icon: 'pest-control', title: 'Basmi Kutu Daun (Aphid)', desc: 'Semprotkan insektisida sistemik (imidacloprid) atau organik (campuran sabun insektisida + air) untuk membunuh vektor pembawa virus.' },
      { icon: 'grass', title: 'Bersihkan Gulma', desc: 'Gulma di sekitar kebun sering menjadi inang kutu daun. Bersihkan secara rutin untuk memutus rantai penularan.' },
      { icon: 'shield', title: 'Pasang Jaring Serangga', desc: 'Tutup bedengan dengan mulsa atau jaring anti-serangga (insect net) untuk mencegah kutu daun mendekati tanaman baru.' },
    ],
    prevention: [
      'Gunakan benih bersertifikat bebas virus (seed tested)',
      'Periksa tanaman setiap hari untuk deteksi kutu daun sejak dini',
      'Tanam tanaman pengusir kutu daun seperti mint atau basil di sekitar kebun',
    ],
  },
  'Powdery Mildew': {
    cause: 'Jamur Erysiphe cichoracearum / Golovinomyces cichoracearum',
    symptoms: 'Lapisan tepung putih seperti bedak di permukaan atas daun yang mengganggu fotosintesis, menyebabkan daun menguning dan kering.',
    urgency: 'Tangani sedini mungkin — spora menyebar lewat angin dan sangat cepat meluas.',
    steps: [
      { icon: 'content-cut', title: 'Pangkas Daun Terinfeksi', desc: 'Potong bagian daun berlapisan putih secara hati-hati. Masukkan ke kantong plastik langsung — jangan kibas-kibas agar spora tidak terbang.' },
      { icon: 'opacity', title: 'Semprotkan Larutan Organik', desc: 'Campurkan 1 sdt soda kue (baking soda) + 1 sdt sabun cuci piring cair ke dalam 1 liter air. Semprotkan ke seluruh permukaan daun setiap 3 hari.' },
      { icon: 'science', title: 'Fungisida Sulfur', desc: 'Jika organik tidak mempan, gunakan fungisida berbahan aktif sulfur atau trifloksistrobin sesuai dosis pada label produk.' },
      { icon: 'wb-sunny', title: 'Kurangi Kelembapan', desc: 'Pastikan area tanam tidak terlalu lembap. Jamur embun tepung tumbuh subur di lingkungan hangat & lembap tanpa sinar matahari langsung.' },
    ],
    prevention: [
      'Pilih varietas selada yang tahan embun tepung',
      'Jangan menyiram berlebihan terutama di sore hari',
      'Semprot larutan soda kue secara preventif seminggu sekali',
    ],
  },
  'Septoria Blight': {
    cause: 'Jamur Septoria lactucae',
    symptoms: 'Bercak bulat dengan bagian tengah berwarna abu-abu/cokelat muda, tepi bercak gelap, dan sering terdapat titik-titik hitam kecil (piknidia) di tengahnya.',
    urgency: 'Tangani sebelum musim hujan — jamur menyebar cepat melalui percikan air hujan.',
    steps: [
      { icon: 'delete-sweep', title: 'Singkirkan Daun Sakit', desc: 'Pangkas dan buang semua daun yang menunjukkan bercak abu-abu. Lakukan di pagi hari saat daun kering.' },
      { icon: 'loop', title: 'Rotasi Tanaman', desc: 'Jangan tanam selada atau tanaman dari famili yang sama (Asteraceae) di bedengan yang sama minimal 2–3 musim tanam berturut-turut.' },
      { icon: 'water', title: 'Perbaiki Drainase', desc: 'Pastikan bedengan tidak tergenang air. Tanah yang selalu basah mempercepat perkembangan spora Septoria.' },
      { icon: 'science', title: 'Fungisida Kontak', desc: 'Semprotkan fungisida kontak berbahan mancozeb atau chlorothalonil secara merata ke seluruh permukaan daun saat gejala pertama muncul.' },
    ],
    prevention: [
      'Hindari penyiraman overhead (dari atas) — gunakan selang tetes',
      'Bersihkan sisa tanaman setelah panen secara menyeluruh',
      'Tanam di bedengan dengan drainase baik atau gunakan pot/wadah berdrainase',
    ],
  },
  'Healthy': {
    cause: '',
    symptoms: 'Tanaman terlihat segar, daun berwarna hijau merata, tidak ada bercak, perubahan warna, atau tanda kelainan lainnya.',
    urgency: 'Tidak ada tindakan darurat diperlukan.',
    steps: [
      { icon: 'water-drop', title: 'Jaga Pola Penyiraman', desc: 'Siram tanaman secara teratur di pagi hari. Hindari daun basah saat malam hari untuk mencegah jamur.' },
      { icon: 'wb-sunny', title: 'Pastikan Pencahayaan', desc: 'Selada membutuhkan sinar matahari 6–8 jam per hari untuk tumbuh optimal.' },
      { icon: 'monitor-heart', title: 'Pantau Secara Rutin', desc: 'Periksa tanaman setiap 2–3 hari untuk mendeteksi gejala awal penyakit sebelum menyebar.' },
    ],
    prevention: [
      'Pertahankan kebersihan lahan dari gulma dan sisa tanaman',
      'Gunakan pupuk sesuai takaran untuk menjaga kekebalan tanaman',
      'Lakukan rotasi tanaman setiap musim tanam',
    ],
  },
};

// ─── Helper ───────────────────────────────────────────────────────────────────

const delay = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

/**
 * Roboflow mengembalikan tiap prediksi sebagai TITIK TENGAH (x, y) + lebar/tinggi,
 * sedangkan `BoundingBoxOverlay` dan `GalleryResultPage` di file ini dibangun di
 * atas koordinat sudut (x1, y1, x2, y2). Fungsi ini:
 *   1. Mengonversi setiap prediction → Detection (x1/y1/x2/y2)
 *   2. Membungkusnya jadi `DetectionResult` agar runDetectionLoop, kartu hasil
 *      live, dan GalleryResultPage tetap berjalan tanpa perlu ditulis ulang.
 *
 * CATATAN: Roboflow tidak mengirim "disease/severity/recommendation" — field-
 * field itu di sini DIDERIVE dari prediction dengan confidence tertinggi
 * (heuristik sementara). Ganti dengan logika dari backend Anda kalau sudah ada.
 */
function mapPredictionsToResult(predictions: RoboflowPrediction[]): DetectionResult {
  const detections: Detection[] = predictions.map((p) => ({
    x1: p.x - p.width / 2,
    y1: p.y - p.height / 2,
    x2: p.x + p.width / 2,
    y2: p.y + p.height / 2,
    confidence: p.confidence,
    class_name: p.class,
    class_key: p.class.toLowerCase().replace(/\s+/g, '_'),
  }));

  // predictions kosong → kamera tidak mendeteksi apa pun. Jangan crash,
  // anggap saja "Sehat" supaya UI (kartu hasil, halaman galeri) tetap valid.
  if (detections.length === 0) {
    return {
      success: true,
      disease: 'Sehat',
      confidence: 1,
      is_confident: true,
      all_probabilities: { Sehat: 1 },
      recommendation: 'Tidak ada tanda penyakit terdeteksi. Lanjutkan perawatan rutin.',
      severity: 'none',
      processed_at: new Date().toISOString(),
      detection_count: 0,
      detections: [],
    };
  }

  // Deteksi dengan confidence tertinggi dipakai sebagai "hasil utama".
  const top = detections.reduce((a, b) => (b.confidence > a.confidence ? b : a));

  // Confidence tertinggi per kelas → dipakai sebagai distribusi probabilitas.
  const all_probabilities: Record<string, number> = {};
  for (const d of detections) {
    all_probabilities[d.class_name] = Math.max(all_probabilities[d.class_name] ?? 0, d.confidence);
  }

  const severity: DetectionResult['severity'] =
    top.confidence >= 0.85 || detections.length >= 3 ? 'high'
      : top.confidence >= 0.65 ? 'medium'
        : 'low';

  return {
    success: true,
    disease: top.class_name,
    confidence: top.confidence,
    is_confident: top.confidence >= 0.5,
    all_probabilities,
    recommendation:
      `Terdeteksi ${top.class_name.toLowerCase()} dengan keyakinan ${(top.confidence * 100).toFixed(0)}%. ` +
      `Segera periksa tanaman secara langsung dan lakukan penanganan yang sesuai.`,
    severity,
    processed_at: new Date().toISOString(),
    detection_count: detections.length,
    detections,
  };
}

// ─── BoundingBoxOverlay ───────────────────────────────────────────────────────
/**
 * Menggambar bounding box di atas CameraView atau gambar preview.
 *
 * Koordinat (x1,y1,x2,y2) dari server adalah pixel di gambar ASLI (foto).
 * CameraView dan expo-image dengan contentFit="cover" menampilkan gambar dengan
 * skala seragam sehingga gambar MEMENUHI container — sisi yang kelebihan dipotong.
 *
 * Rumus "cover":
 *   scale   = max(displayW / photoW, displayH / photoH)
 *   offsetX = (displayW - photoW * scale) / 2   ← negatif jika gambar overflow
 *   offsetY = (displayH - photoH * scale) / 2
 *   screenX = photoX * scale + offsetX
 *   screenY = photoY * scale + offsetY
 */
function BoundingBoxOverlay({
  detections, photoW, photoH, displayW, displayH,
}: {
  detections: Detection[];
  photoW: number; photoH: number;
  displayW: number; displayH: number;
}) {
  if (!detections.length || !photoW || !photoH) return null;

  const scale = Math.max(displayW / photoW, displayH / photoH);
  const offsetX = (displayW - photoW * scale) / 2;
  const offsetY = (displayH - photoH * scale) / 2;

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      {detections.map((d, i) => {
        const left = d.x1 * scale + offsetX;
        const top = d.y1 * scale + offsetY;
        const width = (d.x2 - d.x1) * scale;
        const height = (d.y2 - d.y1) * scale;
        const color = BOX_COLORS[d.class_name] ?? BOX_DEFAULT;
        return (
          <View key={i} style={[styles.bbox, { left, top, width, height, borderColor: color }]}>
            <View style={[styles.bboxLabel, { backgroundColor: color }]}>
              <Text style={styles.bboxLabelText}>
                {d.class_name}  {(d.confidence * 100).toFixed(0)}%
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function DetectScreen() {
  const { C, brand, scheme } = useTheme();
  const router = useRouter();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();

  const [facing, setFacing] = useState<CameraType>('back');

  // ── Live detection state ──────────────────────────────────────────────────
  const [isDetecting, setIsDetecting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [latestResult, setLatestResult] = useState<DetectionResult | null>(null);
  const [photoSize, setPhotoSize] = useState({ w: 1080, h: 1920 });
  const [liveError, setLiveError] = useState<string | null>(null);

  // Ref untuk photoSize agar loop async selalu punya dimensi terkini TANPA
  // menunggu re-render (setState bersifat async, ref bersifat sync)
  const photoSizeRef = useRef({ w: 1080, h: 1920 });

  /**
   * Ref digunakan agar closure di dalam while-loop async selalu membaca
   * nilai terbaru (bukan nilai saat fungsi dibuat).
   */
  const isDetectingRef = useRef(false);
  const isProcessingRef = useRef(false);

  // ── Gallery / static analysis ─────────────────────────────────────────────
  const [gallery, setGallery] = useState<GalleryState | null>(null);

  // ── Shared API call ───────────────────────────────────────────────────────
  const callAPI = useCallback(async (uri: string): Promise<DetectionResult> => {
    const filename = uri.split('/').pop() ?? 'photo.jpg';
    const ext = (filename.split('.').pop() ?? 'jpg').toLowerCase();
    const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';

    const fd = new FormData();
    // ✅ FIX: Pastikan nama field adalah 'image' (sesuai FastAPI) dan
    // content_type selalu diset eksplisit — tanpa ini Go/React Native
    // bisa mengirim 'application/octet-stream' yang diabaikan FastAPI.
    fd.append('image', {
      uri: Platform.OS === 'android' ? uri : uri.replace('file://', ''),
      type: mime,
      name: filename,
    } as any);

    const token = await AsyncStorage.getItem('token');
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), 25000);

    const res = await fetch(`${BASE_URL}/api/detect`, {
      method: 'POST',
      body: fd,
      signal: ctrl.signal,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    clearTimeout(tid);

    // =========================================================================
    // PERBAIKAN: Baca sebagai teks mentah dulu untuk mendebug Error "C"
    // =========================================================================
    const rawText = await res.text();

    // ✅ FIX: Log selalu aktif untuk debug — hapus setelah production
    console.log("🔍 RAW RESPONSE FROM GO /api/detect:", rawText.substring(0, 500));

    let raw: ActualApiResponse;
    try {
      raw = JSON.parse(rawText);
    } catch (parseError) {
      console.error("Gagal parse JSON:", rawText);
      throw new Error(`Server tidak mengembalikan JSON. Status: ${res.status}`);
    }
    if (!res.ok) throw new Error(raw?.error ?? raw?.message ?? `HTTP ${res.status}`);
    if (!raw?.success) throw new Error(raw?.message ?? raw?.error ?? 'Server gagal memproses gambar');
    // ✅ Response sudah dalam format DetectionResult — langsung pakai
    return {
      success: raw.success,
      disease: raw.disease ?? 'Sehat',
      confidence: raw.confidence ?? 0,
      is_confident: raw.is_confident ?? false,
      all_probabilities: raw.all_probabilities ?? {},
      recommendation: raw.recommendation ?? '',
      severity: raw.severity ?? 'none',
      processed_at: raw.processed_at ?? new Date().toISOString(),
      detection_count: raw.detection_count ?? 0,
      detections: raw.detections ?? [],
      // Dimensi gambar yang dipakai server untuk inferensi.
      // Wajib dipakai frontend untuk scaling koordinat bbox secara akurat.
      image_width: raw.image_width,
      image_height: raw.image_height,
    };
  }, []);

  // ── Detection Loop ────────────────────────────────────────────────────────
  /**
   * Loop utama real-time detection.
   *
   * Menggunakan while-loop + await (bukan setInterval) agar:
   * - Tidak ada request concurrent yang bertumpuk
   * - Otomatis berhenti ketika isDetectingRef = false
   * - Latensi bervariasi sesuai kecepatan server
   */
  const runDetectionLoop = useCallback(async () => {
    while (isDetectingRef.current) {
      // Tunggu jika masih ada request yang berjalan
      if (isProcessingRef.current || !cameraRef.current) {
        await delay(200);
        continue;
      }

      isProcessingRef.current = true;
      setIsProcessing(true);

      try {
        // ✅ FIX: Naikkan quality ke 0.72 — 0.35 terlalu rendah untuk deteksi penyakit.
        // Model Roboflow butuh gambar yang cukup tajam untuk mengenali bercak/pola penyakit.
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.72,
          base64: false,
        });

        // Keluar dari loop jika stop dipanggil saat await
        if (!photo?.uri || !isDetectingRef.current) break;

        // Simpan dimensi foto ke REF (sync) DAN state (async untuk render)
        // Gunakan ref agar BoundingBoxOverlay pakai dimensi benar di frame ini
        if (photo.width && photo.height) {
          photoSizeRef.current = { w: photo.width, h: photo.height };
          setPhotoSize({ w: photo.width, h: photo.height });
        }

        const result = await callAPI(photo.uri);

        // Hanya update state jika deteksi masih aktif
        if (isDetectingRef.current) {
          setDetections(result.detections ?? []);
          setLatestResult(result);
          setLiveError(null);
        }
      } catch (err: any) {
        if (isDetectingRef.current && err.name !== 'AbortError') {
          setLiveError(err.message ?? 'Gagal terhubung ke server');
        }
      } finally {
        isProcessingRef.current = false;
        setIsProcessing(false);
      }

      // Jeda sebelum frame berikutnya
      if (isDetectingRef.current) await delay(DETECT_DELAY_MS);
    }
  }, [callAPI]);

  const startDetection = useCallback(() => {
    if (isDetectingRef.current) return; // Jangan mulai dobel
    setLiveError(null);
    isDetectingRef.current = true;
    setIsDetecting(true);
    runDetectionLoop();
  }, [runDetectionLoop]);

  const stopDetection = useCallback(() => {
    isDetectingRef.current = false;
    isProcessingRef.current = false;
    setIsDetecting(false);
    setIsProcessing(false);
    // Bbox terakhir tetap terlihat → user bisa lihat hasil akhir
  }, []);

  const clearResults = useCallback(() => {
    setDetections([]);
    setLatestResult(null);
    setLiveError(null);
  }, []);

  // ── Gallery ───────────────────────────────────────────────────────────────
  const pickFromGallery = useCallback(async () => {
    // Hentikan live detection sebelum buka galeri
    if (isDetectingRef.current) stopDetection();

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;

    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.85,
    });

    if (!res.canceled && res.assets[0]?.uri) {
      const a = res.assets[0];
      setGallery({
        uri: a.uri,
        size: { w: a.width ?? 1080, h: a.height ?? 1080 },
        result: null,
        loading: true,
        error: null,
      });
      try {
        const r = await callAPI(a.uri);
        setGallery(g => g ? { ...g, result: r, loading: false } : null);
      } catch (err: any) {
        setGallery(g => g ? { ...g, loading: false, error: err.message ?? 'Gagal' } : null);
      }
    }
  }, [stopDetection, callAPI]);

  // Cleanup saat component unmount
  useEffect(() => () => { isDetectingRef.current = false; }, []);

  // ── Permission screens ────────────────────────────────────────────────────
  if (!permission) return (
    <View style={styles.centered}>
      <ActivityIndicator color={brand?.primary} />
    </View>
  );

  if (!permission.granted) return (
    <SafeAreaView style={[styles.centered, { backgroundColor: C?.background ?? '#f9fafb' }]}>
      <View style={[styles.permIconWrap, { backgroundColor: brand?.primaryMuted }]}>
        <MaterialIcons name="camera-alt" size={40} color={brand?.primary} />
      </View>
      <Text style={[styles.permTitle, { color: C?.text }]}>Izin Kamera Diperlukan</Text>
      <Text style={[styles.permSub, { color: C?.textSecondary }]}>
        Izinkan akses kamera untuk mendeteksi penyakit daun selada secara real-time.
      </Text>
      <TouchableOpacity
        style={[styles.permBtn, { backgroundColor: brand?.primary }]}
        onPress={requestPermission}
      >
        <Text style={styles.permBtnText}>Izinkan Kamera</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.galleryOnlyBtn} onPress={pickFromGallery}>
        <MaterialIcons name="photo-library" size={18} color={brand?.primary} />
        <Text style={[styles.galleryOnlyText, { color: brand?.primary }]}>Pilih dari Galeri</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );

  // ── Gallery result page ───────────────────────────────────────────────────
  if (gallery) {
    return (
      <GalleryResultPage
        C={C} brand={brand} scheme={scheme}
        gallery={gallery}
        onBack={() => setGallery(null)}
        onGallery={pickFromGallery}
      />
    );
  }

  // ── Live Camera (Real-time Detection) ─────────────────────────────────────
  const sev = latestResult ? (SEV[latestResult.severity] ?? SEV.low) : null;

  return (
    <View style={styles.cameraContainer}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      <CameraView ref={cameraRef} style={StyleSheet.absoluteFillObject} facing={facing}>

        {/* ════════════════════════════════════════════════════════════════
            BOUNDING BOX OVERLAY — child langsung dari CameraView
            Ini adalah kunci real-time detection: bbox overlay di kamera
            bukan di gambar statis.
            ════════════════════════════════════════════════════════════════ */}
        <BoundingBoxOverlay
          detections={detections}
          photoW={latestResult?.image_width ?? photoSizeRef.current.w}
          photoH={latestResult?.image_height ?? photoSizeRef.current.h}
          displayW={SCREEN_W}
          displayH={SCREEN_H}
        />

        {/* UI overlay layout */}
        <View style={styles.cameraOverlay}>

          {/* Header */}
          <SafeAreaView>
            <View style={styles.cameraHeader}>
              {/* Tombol Back ke Home */}
              <TouchableOpacity
                style={styles.backBtn}
                onPress={() => {
                  if (isDetectingRef.current) stopDetection();
                  router.push('/');
                }}
              >
                <MaterialIcons name="arrow-back" size={20} color="#fff" />
              </TouchableOpacity>

              <View style={styles.cameraHeaderLeft}>
                <MaterialIcons name="eco" size={22} color="#fff" />
                <Text style={styles.cameraTitle}>Deteksi Selada</Text>
                {/* Badge LIVE — hanya tampil saat deteksi aktif */}
                {isDetecting && (
                  <View style={styles.liveBadge}>
                    <View style={styles.liveDot} />
                    <Text style={styles.liveText}>LIVE</Text>
                  </View>
                )}
              </View>
              <View style={styles.cameraHeaderRight}>
                {/* Spinner saat menunggu respons API */}
                {isProcessing && (
                  <ActivityIndicator size="small" color="#fff" style={{ marginRight: 10 }} />
                )}
                <TouchableOpacity
                  style={styles.flipBtn}
                  onPress={() => setFacing(f => f === 'back' ? 'front' : 'back')}
                >
                  <MaterialIcons name="flip-camera-ios" size={24} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          </SafeAreaView>

          {/* Tengah: frame guide (idle) atau kosong (detecting) */}
          <View style={styles.cameraMiddle}>
            {!isDetecting && !latestResult && (
              <View style={styles.frameWrapper}>
                <View style={styles.frame}>
                  {CORNER_STYLES.map((s, i) => (
                    <View key={i} style={[styles.corner, s, { borderColor: brand.primary }]} />
                  ))}
                </View>
                <View style={styles.frameHintWrap}>
                  <MaterialIcons name="center-focus-weak" size={14} color="rgba(255,255,255,0.9)" />
                  <Text style={styles.frameHint}>Tekan Mulai untuk deteksi otomatis</Text>
                </View>
              </View>
            )}
          </View>

          {/* Error banner */}
          {liveError && (
            <View style={styles.errorBanner}>
              <MaterialIcons name="wifi-off" size={15} color="#fff" />
              <Text style={styles.errorBannerText} numberOfLines={1}>{liveError}</Text>
            </View>
          )}

          {/* Kartu hasil live — muncul di atas controls saat ada deteksi */}
          {latestResult && sev && (
            <View style={styles.liveResultWrapper}>
              <View style={[styles.liveResultCard, {
                backgroundColor: sev.color + 'E0',
                borderColor: sev.color,
              }]}>
                <View style={styles.liveResultRow}>
                  <MaterialIcons name={sev.icon} size={18} color="#fff" />
                  <Text style={styles.liveResultDisease} numberOfLines={1}>
                    {latestResult.disease}
                  </Text>
                  <View style={styles.liveResultConfBadge}>
                    <Text style={styles.liveResultConf}>
                      {(latestResult.confidence * 100).toFixed(0)}%
                    </Text>
                  </View>
                  <View style={styles.liveResultSevBadge}>
                    <Text style={styles.liveResultSev}>{sev.label}</Text>
                  </View>
                </View>
                {latestResult.detection_count > 0 && (
                  <Text style={styles.liveResultCount}>
                    {latestResult.detection_count} area terdeteksi
                    {isProcessing ? '  •  Memperbarui...' : ''}
                  </Text>
                )}
              </View>
            </View>
          )}

          {/* Kontrol bawah */}
          <SafeAreaView edges={['bottom']}>
            <View style={styles.cameraControls}>

              {/* Galeri → analisis statis */}
              <TouchableOpacity style={styles.sideBtn} onPress={pickFromGallery}>
                <MaterialIcons name="photo-library" size={26} color="#fff" />
                <Text style={styles.sideBtnLabel}>Galeri</Text>
              </TouchableOpacity>

              {/* Tombol Mulai / Berhenti */}
              <TouchableOpacity
                style={[
                  styles.detectBtn,
                  { backgroundColor: isDetecting ? '#DC2626' : brand.primary },
                ]}
                onPress={isDetecting ? stopDetection : startDetection}
                activeOpacity={0.8}
              >
                <MaterialIcons
                  name={isDetecting ? 'stop' : 'play-arrow'}
                  size={34}
                  color="#fff"
                />
                <Text style={styles.detectBtnLabel}>
                  {isDetecting ? 'Berhenti' : 'Mulai'}
                </Text>
              </TouchableOpacity>

              {/* Reset bbox */}
              <TouchableOpacity
                style={[styles.sideBtn, !latestResult && { opacity: 0.35 }]}
                onPress={clearResults}
                disabled={!latestResult}
              >
                <MaterialIcons name="refresh" size={26} color="#fff" />
                <Text style={styles.sideBtnLabel}>Reset</Text>
              </TouchableOpacity>

            </View>
          </SafeAreaView>

        </View>{/* end cameraOverlay */}
      </CameraView>
    </View>
  );
}

// ─── Gallery Result Page ──────────────────────────────────────────────────────
// Halaman detail untuk analisis gambar dari galeri.
// Live detection tidak menggunakan halaman ini.

function GalleryResultPage({ C, brand, scheme, gallery, onBack, onGallery }: {
  C: any; brand: any; scheme: any;
  gallery: GalleryState;
  onBack: () => void;
  onGallery: () => void;
}) {
  const previewW = PREVIEW_SIZE;
  const previewH = PREVIEW_SIZE * 0.75;
  const sev = gallery.result ? (SEV[gallery.result.severity] ?? SEV.low) : null;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]}>
      <StatusBar barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={[styles.resultHeader, { backgroundColor: C.surface, borderBottomColor: C.border }]}>
        <TouchableOpacity
          style={[styles.headerIconBtn, { backgroundColor: C.surfaceAlt }]}
          onPress={onBack}
        >
          <MaterialIcons name="arrow-back" size={20} color={C.text} />
        </TouchableOpacity>
        <Text style={[styles.resultTitle, { color: C.text }]}>Analisis Gambar</Text>
        <TouchableOpacity
          style={[styles.headerIconBtn, { backgroundColor: brand.primaryMuted }]}
          onPress={onGallery}
        >
          <MaterialIcons name="photo-library" size={20} color={brand.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.resultScroll} showsVerticalScrollIndicator={false}>

        {/* Preview + bounding box overlay */}
        <View style={[styles.imageCard, { backgroundColor: C.surface }]}>
          <View style={{ width: previewW, height: previewH }}>
            <Image
              source={{ uri: gallery.uri }}
              style={{ width: previewW, height: previewH }}
              contentFit="cover"
              transition={300}
            />
            {gallery.result && gallery.result.detections.length > 0 && (
              <BoundingBoxOverlay
                detections={gallery.result.detections}
                photoW={gallery.size.w}
                photoH={gallery.size.h}
                displayW={previewW}
                displayH={previewH}
              />
            )}
          </View>
          {gallery.result && (
            <View style={[styles.detectionCountBadge, { backgroundColor: brand.primary }]}>
              <MaterialIcons name="search" size={13} color="#fff" />
              <Text style={styles.detectionCountText}>
                {gallery.result.detection_count > 0
                  ? `${gallery.result.detection_count} objek terdeteksi`
                  : 'Tidak ada objek'}
              </Text>
            </View>
          )}
        </View>

        {/* Loading */}
        {gallery.loading && (
          <View style={[styles.card, { backgroundColor: C.surface, alignItems: 'center', padding: 40, gap: 16 }]}>
            <ActivityIndicator size="large" color={brand.primary} />
            <Text style={[styles.loadingTitle, { color: C.text }]}>Menganalisis gambar...</Text>
            <Text style={[styles.loadingSub, { color: C.textMuted }]}>
              Model AI sedang memproses daun selada
            </Text>
          </View>
        )}

        {/* Error */}
        {!gallery.loading && gallery.error && (
          <View style={[styles.card, { backgroundColor: '#FEF2F2', borderColor: '#FECACA', borderWidth: 1.5 }]}>
            <View style={styles.errorHeader}>
              <View style={[styles.errorIconWrap, { backgroundColor: '#DC2626' }]}>
                <MaterialIcons name="error-outline" size={24} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.errorTitle, { color: '#DC2626' }]}>Deteksi Gagal</Text>
                <Text style={[styles.errorMsg, { color: '#7F1D1D' }]}>{gallery.error}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Result detail */}
        {!gallery.loading && gallery.result && sev && (
          <>
            {/* Status card */}
            <View style={[styles.statusCard, { backgroundColor: sev.bg, borderColor: sev.color + '50' }]}>
              <View style={styles.statusTop}>
                <View style={[styles.statusIconWrap, { backgroundColor: sev.color }]}>
                  <MaterialIcons name={sev.icon} size={28} color="#fff" />
                </View>
                <View style={{ flex: 1, gap: 6 }}>
                  <Text style={[styles.diseaseName, { color: sev.color }]}>
                    {gallery.result.disease}
                  </Text>
                  <View style={[styles.severityBadge, { backgroundColor: sev.color }]}>
                    <Text style={styles.severityText}>Tingkat: {sev.label}</Text>
                  </View>
                </View>
              </View>
              <View style={styles.confSection}>
                <View style={styles.confRow}>
                  <Text style={[styles.confLabel, { color: sev.color }]}>Keyakinan Model</Text>
                  <Text style={[styles.confValue, { color: sev.color }]}>
                    {(gallery.result.confidence * 100).toFixed(1)}%
                  </Text>
                </View>
                <View style={[styles.confBarBg, { backgroundColor: sev.color + '30' }]}>
                  <View style={[styles.confBarFill, {
                    width: `${gallery.result.confidence * 100}%` as any,
                    backgroundColor: sev.color,
                  }]} />
                </View>
                {!gallery.result.is_confident && (
                  <Text style={[styles.lowConfNote, { color: sev.color }]}>
                    ⚠️ Keyakinan rendah — coba foto dengan pencahayaan lebih baik
                  </Text>
                )}
              </View>
            </View>

            {/* Daftar deteksi */}
            {gallery.result.detections.length > 0 && (
              <View style={[styles.card, { backgroundColor: C.surface }]}>
                <View style={styles.cardHeaderRow}>
                  <MaterialIcons name="crop-free" size={18} color={brand.primary} />
                  <Text style={[styles.cardTitle, { color: C.text }]}>
                    Objek Terdeteksi ({gallery.result.detection_count})
                  </Text>
                </View>
                {gallery.result.detections.map((d, i) => {
                  const col = BOX_COLORS[d.class_name] ?? BOX_DEFAULT;
                  return (
                    <View key={i} style={[styles.detectionRow, {
                      borderColor: col + '40', backgroundColor: col + '08',
                    }]}>
                      <View style={[styles.detectionColorDot, { backgroundColor: col }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.detectionClassName, { color: C.text }]}>
                          {d.class_name}
                        </Text>
                        <Text style={[styles.detectionCoords, { color: C.textMuted }]}>
                          ({Math.round(d.x1)}, {Math.round(d.y1)}) → ({Math.round(d.x2)}, {Math.round(d.y2)})
                        </Text>
                      </View>
                      <View style={[styles.detectionConfBadge, { backgroundColor: col }]}>
                        <Text style={styles.detectionConfText}>
                          {(d.confidence * 100).toFixed(1)}%
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Distribusi probabilitas */}
            <View style={[styles.card, { backgroundColor: C.surface }]}>
              <View style={styles.cardHeaderRow}>
                <MaterialIcons name="bar-chart" size={18} color={brand.primary} />
                <Text style={[styles.cardTitle, { color: C.text }]}>Distribusi Probabilitas</Text>
              </View>
              {Object.entries(gallery.result.all_probabilities)
                .sort(([, a], [, b]) => (b as number) - (a as number))
                .map(([label, prob]) => {
                  const isMain = label === gallery.result!.disease;
                  return (
                    <View key={label} style={styles.probRow}>
                      <Text style={[styles.probLabel, {
                        color: isMain ? C.text : C.textSecondary,
                        fontWeight: isMain ? '700' : '400',
                      }]} numberOfLines={1}>
                        {label}
                      </Text>
                      <View style={styles.probBarRow}>
                        <View style={[styles.probBarBg, { backgroundColor: C.surfaceAlt }]}>
                          <View style={[styles.probBarFill, {
                            width: `${(prob as number) * 100}%` as any,
                            backgroundColor: isMain ? sev.color : C.border,
                          }]} />
                        </View>
                        <Text style={[styles.probPercent, { color: isMain ? C.text : C.textMuted }]}>
                          {((prob as number) * 100).toFixed(1)}%
                        </Text>
                      </View>
                    </View>
                  );
                })}
            </View>

            {/* Rekomendasi Detail Penanganan Penyakit */}
            {(() => {
              const diseaseKey = gallery.result.disease;
              const info = DISEASE_INFO[diseaseKey] ?? DISEASE_INFO['Healthy'];
              const isHealthy = diseaseKey === 'Healthy' || diseaseKey === 'Sehat';
              const accentColor = isHealthy ? '#059669' : (BOX_COLORS[diseaseKey] ?? BOX_DEFAULT);
              return (
                <View style={[styles.card, { backgroundColor: C.surface }]}>
                  {/* Header */}
                  <View style={styles.cardHeaderRow}>
                    <MaterialIcons name="healing" size={18} color={accentColor} />
                    <Text style={[styles.cardTitle, { color: C.text }]}>Panduan Penanganan</Text>
                  </View>

                  {/* Penyebab */}
                  {!isHealthy && (
                    <View style={[styles.infoChip, { backgroundColor: accentColor + '15', borderColor: accentColor + '40' }]}>
                      <MaterialIcons name="bug-report" size={14} color={accentColor} />
                      <Text style={[styles.infoChipText, { color: accentColor }]}>
                        <Text style={{ fontWeight: '700' }}>Penyebab: </Text>{info.cause}
                      </Text>
                    </View>
                  )}

                  {/* Gejala */}
                  <View style={[styles.infoChip, { backgroundColor: C.surfaceAlt, borderColor: C.border }]}>
                    <MaterialIcons name="info-outline" size={14} color={C.textSecondary} />
                    <Text style={[styles.infoChipText, { color: C.textSecondary }]}>
                      <Text style={{ fontWeight: '700', color: C.text }}>Gejala: </Text>{info.symptoms}
                    </Text>
                  </View>

                  {/* Tingkat Urgensi */}
                  {!isHealthy && (
                    <View style={[styles.urgencyBox, { backgroundColor: accentColor + '12', borderLeftColor: accentColor }]}>
                      <MaterialIcons name="priority-high" size={15} color={accentColor} />
                      <Text style={[styles.urgencyText, { color: accentColor }]}>{info.urgency}</Text>
                    </View>
                  )}

                  {/* Langkah Penanganan */}
                  <Text style={[styles.stepSectionTitle, { color: C.text }]}>
                    {isHealthy ? '✅ Tips Perawatan' : '🔧 Langkah Penanganan'}
                  </Text>
                  {info.steps.map((step, i) => (
                    <View key={i} style={[styles.stepRow, { borderColor: accentColor + '30', backgroundColor: accentColor + '07' }]}>
                      <View style={[styles.stepIconWrap, { backgroundColor: accentColor }]}>
                        <MaterialIcons name={step.icon as any} size={16} color="#fff" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.stepTitle, { color: C.text }]}>{i + 1}. {step.title}</Text>
                        <Text style={[styles.stepDesc, { color: C.textSecondary }]}>{step.desc}</Text>
                      </View>
                    </View>
                  ))}

                  {/* Pencegahan */}
                  <Text style={[styles.stepSectionTitle, { color: C.text, marginTop: 12 }]}>🛡️ Pencegahan</Text>
                  {info.prevention.map((p, i) => (
                    <View key={i} style={styles.preventionRow}>
                      <View style={[styles.preventionDot, { backgroundColor: accentColor }]} />
                      <Text style={[styles.preventionText, { color: C.textSecondary }]}>{p}</Text>
                    </View>
                  ))}

                  {/* Footer note */}
                  <View style={[styles.recoFooter, { backgroundColor: C.surfaceAlt }]}>
                    <MaterialIcons name="local-hospital" size={13} color={C.textMuted} />
                    <Text style={[styles.recoFooterText, { color: C.textMuted }]}>
                      Konsultasikan dengan penyuluh pertanian setempat untuk penanganan lanjutan.
                    </Text>
                  </View>
                </View>
              );
            })()}

            {/* Waktu analisis */}
            <View style={[styles.card, { backgroundColor: C.surface }]}>
              <View style={styles.cardHeaderRow}>
                <MaterialIcons name="access-time" size={16} color={C.textMuted} />
                <Text style={[styles.infoTime, { color: C.textMuted }]}>
                  Dianalisis {new Date(gallery.result.processed_at).toLocaleString('id-ID')}
                </Text>
              </View>
            </View>

            {/* Tombol aksi */}
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.btnPrimary, { backgroundColor: brand.primary }]}
                onPress={onBack}
              >
                <MaterialIcons name="camera-alt" size={18} color="#fff" />
                <Text style={styles.btnPrimaryText}>Deteksi Langsung</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btnOutline, { borderColor: brand.primary }]}
                onPress={onGallery}
              >
                <MaterialIcons name="photo-library" size={18} color={brand.primary} />
                <Text style={[styles.btnOutlineText, { color: brand.primary }]}>Galeri Lain</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 16 },

  // Permission
  permIconWrap: { width: 80, height: 80, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  permTitle: { fontSize: 20, fontWeight: '800', textAlign: 'center' },
  permSub: { fontSize: 14, textAlign: 'center', lineHeight: 22, maxWidth: 280 },
  permBtn: { borderRadius: 16, paddingHorizontal: 32, paddingVertical: 14, marginTop: 4 },
  permBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  galleryOnlyBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  galleryOnlyText: { fontSize: 14, fontWeight: '600' },

  // Camera layout
  cameraContainer: { flex: 1, backgroundColor: '#000' },
  cameraOverlay: { flex: 1, justifyContent: 'space-between' },

  // Camera header
  cameraHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    backgroundColor: 'rgba(0,0,0,0.55)',
    gap: 10,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center', alignItems: 'center',
    flexShrink: 0,
  },
  cameraHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  cameraHeaderRight: { flexDirection: 'row', alignItems: 'center' },
  cameraTitle: { color: '#fff', fontSize: 17, fontWeight: '800' },
  flipBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },

  // LIVE badge
  liveBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#DC2626', borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff' },
  liveText: { color: '#fff', fontSize: 10, fontWeight: '900', letterSpacing: 1 },

  // Middle area
  cameraMiddle: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  frameWrapper: { alignItems: 'center', gap: 16 },
  frame: { width: SCREEN_W * 0.72, height: SCREEN_W * 0.72, position: 'relative' },
  corner: { position: 'absolute', width: 28, height: 28 },
  frameHintWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
  },
  frameHint: { color: 'rgba(255,255,255,0.9)', fontSize: 13, fontWeight: '600' },

  // Error banner (floating)
  errorBanner: {
    marginHorizontal: 16, marginBottom: 8,
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(220,38,38,0.88)',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
  },
  errorBannerText: { color: '#fff', fontSize: 13, fontWeight: '600', flex: 1 },

  // Live result card
  liveResultWrapper: { paddingHorizontal: 16, paddingBottom: 8 },
  liveResultCard: {
    borderRadius: 16, padding: 14, borderWidth: 1.5,
  },
  liveResultRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  liveResultDisease: { flex: 1, color: '#fff', fontSize: 14, fontWeight: '800' },
  liveResultConfBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3,
  },
  liveResultConf: { color: '#fff', fontSize: 13, fontWeight: '800' },
  liveResultSevBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3,
  },
  liveResultSev: { color: '#fff', fontSize: 11, fontWeight: '700' },
  liveResultCount: { color: 'rgba(255,255,255,0.85)', fontSize: 11, marginTop: 6 },

  // Bottom controls
  cameraControls: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
    paddingHorizontal: 24, paddingVertical: 20,
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  sideBtn: { alignItems: 'center', gap: 5, minWidth: 60 },
  sideBtnLabel: { color: '#fff', fontSize: 11, fontWeight: '600' },
  detectBtn: {
    width: 84, height: 84, borderRadius: 42,
    justifyContent: 'center', alignItems: 'center', gap: 2,
  },
  detectBtnLabel: { color: '#fff', fontSize: 11, fontWeight: '800' },

  // Bounding box
  bbox: { position: 'absolute', borderWidth: 2.5, borderRadius: 4 },
  bboxLabel: {
    position: 'absolute', top: -22, left: -2,
    borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2,
  },
  bboxLabelText: { color: '#fff', fontSize: 10, fontWeight: '700' },

  // Result page header
  resultHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, borderBottomWidth: 1,
  },
  headerIconBtn: {
    width: 36, height: 36, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },
  resultTitle: { fontSize: 18, fontWeight: '800' },
  resultScroll: { padding: 16, gap: 14, paddingBottom: 60 },

  // Image preview
  imageCard: { borderRadius: 20, overflow: 'hidden' },
  detectionCountBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    alignSelf: 'flex-start', margin: 10,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
  },
  detectionCountText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  // Card
  card: { borderRadius: 20, padding: 18, gap: 12 },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { fontSize: 15, fontWeight: '800' },

  // Loading / error
  loadingTitle: { fontSize: 16, fontWeight: '700' },
  loadingSub: { fontSize: 13, textAlign: 'center' },
  errorHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  errorIconWrap: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  errorTitle: { fontSize: 15, fontWeight: '800', marginBottom: 4 },
  errorMsg: { fontSize: 13, lineHeight: 20 },

  // Status card
  statusCard: { borderRadius: 20, padding: 18, gap: 14, borderWidth: 1.5 },
  statusTop: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  statusIconWrap: { width: 58, height: 58, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  diseaseName: { fontSize: 18, fontWeight: '900', lineHeight: 24 },
  severityBadge: { alignSelf: 'flex-start', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  severityText: { color: '#fff', fontSize: 11, fontWeight: '800' },

  // Confidence bar
  confSection: { gap: 6 },
  confRow: { flexDirection: 'row', justifyContent: 'space-between' },
  confLabel: { fontSize: 12, fontWeight: '600' },
  confValue: { fontSize: 14, fontWeight: '800' },
  confBarBg: { height: 8, borderRadius: 4, overflow: 'hidden' },
  confBarFill: { height: '100%', borderRadius: 4 },
  lowConfNote: { fontSize: 11, lineHeight: 16, marginTop: 2 },

  // Detection list
  detectionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1, borderRadius: 12, padding: 10,
  },
  detectionColorDot: { width: 12, height: 12, borderRadius: 6 },
  detectionClassName: { fontSize: 13, fontWeight: '700', marginBottom: 2 },
  detectionCoords: { fontSize: 11, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  detectionConfBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  detectionConfText: { color: '#fff', fontSize: 12, fontWeight: '800' },

  // Probability bars
  probRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  probLabel: { width: 130, fontSize: 12, lineHeight: 18 },
  probBarRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  probBarBg: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  probBarFill: { height: '100%', borderRadius: 3 },
  probPercent: { width: 42, fontSize: 11, fontWeight: '600', textAlign: 'right' },

  // Recommendation
  recoBox: { borderRadius: 14, padding: 14 },
  recoText: { fontSize: 13, lineHeight: 22 },

  // Info time
  infoTime: { fontSize: 12 },

  // Action buttons
  actionRow: { flexDirection: 'row', gap: 12 },
  btnPrimary: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 16, paddingVertical: 15 },
  btnPrimaryText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  btnOutline: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 16, paddingVertical: 15, borderWidth: 2 },
  btnOutlineText: { fontWeight: '800', fontSize: 14 },

  // Disease Treatment Cards
  infoChip: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    borderWidth: 1, borderRadius: 12, padding: 10,
  },
  infoChipText: { flex: 1, fontSize: 12, lineHeight: 19 },

  urgencyBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    borderLeftWidth: 3, borderRadius: 8, padding: 10,
  },
  urgencyText: { flex: 1, fontSize: 12, fontWeight: '700', lineHeight: 18 },

  stepSectionTitle: { fontSize: 13, fontWeight: '800', marginBottom: 4, marginTop: 4 },

  stepRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    borderWidth: 1, borderRadius: 14, padding: 12,
  },
  stepIconWrap: {
    width: 34, height: 34, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
    flexShrink: 0,
  },
  stepTitle: { fontSize: 13, fontWeight: '700', marginBottom: 3 },
  stepDesc: { fontSize: 12, lineHeight: 18 },

  preventionRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 4 },
  preventionDot: { width: 7, height: 7, borderRadius: 4, marginTop: 5, flexShrink: 0 },
  preventionText: { flex: 1, fontSize: 12, lineHeight: 19 },

  recoFooter: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 7,
    borderRadius: 10, padding: 10, marginTop: 6,
  },
  recoFooterText: { flex: 1, fontSize: 11, lineHeight: 17, fontStyle: 'italic' },
});