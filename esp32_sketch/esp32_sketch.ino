// ============================================================
//  SIMS - Smart Infusion Monitoring System (Mayapada Hospital)
//  Firmware ESP32 | Kelompok 7 T4C - Universitas Brawijaya
//  Mata Kuliah : Analisis Perancangan Sistem (VTI52421)
// ============================================================

//  ALUR UTAMA:
//    Baca berat (Load Cell) + hitung tetesan (IR)
//    -> Hitung TPM (tetesan per menit)
//    -> Kirim TPM ke backend Laravel via HTTP POST (JSON)
//    -> Backend hitung sisa volume dari TPM & flowrate
// ============================================================

#include <WiFi.h>
#include <HTTPClient.h>
#include <HX711.h>
#include <ArduinoJson.h> 

// KONFIGURASI HARDWARE

// HX711
#define HX711_DT_PIN    22    
#define HX711_SCK_PIN   21   
// INFRARED SENSOR
#define IR_SENSOR_PIN   16 

// BACKEND CONFIGURATION

const char* WIFI_SSID     = "KOST PUTRA 3 DECO";       
const char* WIFI_PASSWORD = "Kotamalang3";    

// End Point Laravel 
// IP PC Anda terdeteksi: 10.10.10.23
const char* BACKEND_URL = "http://10.10.10.23:8000/api/update-infusion/6";

// ID perangkat
const char* DEVICE_ID     = "BED-06";               // ini diganti sesuai id pasien di dashboardnya ya!

// System config
// Kalibrasi Load Cell
//   Cara mendapatkan nilai ini:
//   1. Upload sketch kalibrasi HX711 terpisah
//   2. Letakkan beban yang diketahui (misal botol 500ml = 500 gram)
//   3. Bagi raw_reading / berat_sebenarnya = calibration_factor
float CALIBRATION_FACTOR  = 1160.0;   // << GANTI setelah kalibrasi

// Berat botol kosong (gram) - diukur dulu sebelum dipakai
float BERAT_BOTOL_KOSONG  = 65.0;    // << GANTI: timbang botol infus kosong kamu

// Volume botol infus yang dipasang (ml) - diinput dari dashboard/hardcode sementara
// Nanti nilai ini bisa dikirim dari dashboard ke ESP32 via endpoint terpisah
float VOLUME_BOTOL_ML     = 500.0;   // << Sesuaikan: 100 / 500 / 1000 ml

// Ambang batas kritis (persen sisa cairan)
float BATAS_KRITIS_PERSEN = 10.0;    // Kirim alert jika sisa <= 10%

// Interval pengiriman data ke server (millisecond)
unsigned long INTERVAL_KIRIM_MS = 5000;   // Setiap 5 detik

// Interval hitung TPM (millisecond) — jendela waktu penghitungan tetesan
unsigned long INTERVAL_TPM_MS   = 10000;  // Hitung TPM setiap 10 detik

// ============================================================
//  VARIABEL GLOBAL
// ============================================================

HX711 loadCell;

// --- State Sensor IR ---
volatile int    jumlahTetesan    = 0;   // Counter tetesan (dari interrupt)
volatile bool   statusIRSebelum  = HIGH; // State sebelumnya untuk edge detection
volatile unsigned long waktuTetesanTerakhir = 0; // Debounce
unsigned long   waktuTPMAkhir    = 0;
float           nilaiTPM         = 0.0;

// Debounce: minimal 50ms antar tetesan (maks ~1200 TPM)
#define DEBOUNCE_MS 50

// Batas TPM realistis (infus normal: 10-300 TPM)
#define TPM_MAX_REALISTIS 500

// --- State Pengiriman ---
unsigned long   waktuKirimAkhir  = 0;

// --- Data Infus ---
float beratBotolPenuh = 0.0;   // Diset saat pertama kali baca (asumsi botol baru)
bool  sudahKalibrasi  = false;

// ============================================================
//  INTERRUPT SERVICE ROUTINE - Sensor Tetesan IR
// ============================================================
// Dipanggil setiap ada perubahan sinyal pada pin IR
// Sensor IR: LOW = ada tetesan melewati sensor (beam terputus)

void IRAM_ATTR onTetesan() {
  unsigned long sekarang = millis();
  // Debounce: abaikan sinyal yang terlalu cepat (noise)
  if (sekarang - waktuTetesanTerakhir < DEBOUNCE_MS) return;

  bool statusSekarang = digitalRead(IR_SENSOR_PIN);
  // Deteksi falling edge (HIGH -> LOW) = 1 tetesan
  if (statusIRSebelum == HIGH && statusSekarang == LOW) {
    jumlahTetesan++;
    waktuTetesanTerakhir = sekarang;
  }
  statusIRSebelum = statusSekarang;
}

// ============================================================
//  FUNGSI: Koneksi WiFi
// ============================================================
void koneksiWiFi() {
  Serial.print("[WiFi] Menghubungkan ke ");
  Serial.println(WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int coba = 0;
  while (WiFi.status() != WL_CONNECTED && coba < 20) {
    delay(500);
    Serial.print(".");
    coba++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[WiFi] Terhubung!");
    Serial.print("[WiFi] IP Address: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\n[WiFi] GAGAL terhubung. Cek SSID/password.");
  }
}

// Loadcell Fungsi semua disini yo guys
float bacaBerat() {
  if (!loadCell.is_ready()) return -1.0;

  float berat = loadCell.get_units(5);  // rata rata baca
  if (berat < 0) berat = 0;             // ini buat ngehindarin nilai minus 
  return berat;
}

// IR Fungsi semua disini 
float hitungTPM() {
  unsigned long sekarang = millis();
  unsigned long selisih  = sekarang - waktuTPMAkhir;

  if (selisih >= INTERVAL_TPM_MS) {
    int snapshot   = jumlahTetesan;
    jumlahTetesan  = 0;
    waktuTPMAkhir  = sekarang;

    // Konversi ke tetes per menit
    float menitBerlalu = selisih / 60000.0;
    float tpmBaru = snapshot / menitBerlalu;

    // Filter: noise TPM 
    if (tpmBaru > TPM_MAX_REALISTIS) {
      Serial.printf("[IR] TPM noise ditolak: %.1f (maks %d)\n", tpmBaru, TPM_MAX_REALISTIS);
      // diubah ke nilai sebelumnya
    } else {
      nilaiTPM = tpmBaru;
    }
  }
  return nilaiTPM;
}

//  FUNGSI: Hitung Estimasi Waktu Habis (menit)
//  Rumus: sisa_volume_ml / laju_ml_per_menit
//  Laju dihitung dari TPM dan faktor tetes (makro=20, mikro=60)

float hitungEstimasiMenit(float sisaVolumeMl, float tpm, int faktorTetes) {
  if (tpm <= 0) return -1.0;  // Tidak bisa dihitung jika tetes = 0

  float mlPerMenit = tpm / faktorTetes;  // ml/menit
  if (mlPerMenit <= 0) return -1.0;

  return sisaVolumeMl / mlPerMenit;      // Estimasi dalam menit
}

// ============================================================
//  FUNGSI: Kirim TPM ke Backend Laravel (HTTP POST JSON)
//  Backend hitung sisa volume dari TPM & flowrate
// ============================================================
void kirimDataKeServer(float tpm, float beratGram, float sisaVolumeMl) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[HTTP] WiFi tidak terhubung, mencoba reconnect...");
    koneksiWiFi();
    if (WiFi.status() != WL_CONNECTED) {
      Serial.println("[HTTP] WiFi masih gagal, skip kirim.");
      return;
    }
  }

  // Kirim TPM ke backend — backend hitung sisa volume dari waktu & flowrate
  JsonDocument doc;
  doc["tpm"] = tpm;

  String jsonBody;
  serializeJson(doc, jsonBody);

  Serial.printf("[HTTP] >>> Mengirim ke: %s\n", BACKEND_URL);
  Serial.printf("[HTTP] >>> Body: %s\n", jsonBody.c_str());

  HTTPClient http;
  http.begin(BACKEND_URL);
  http.addHeader("Content-Type", "application/json");
  http.setConnectTimeout(5000);  // Timeout 5 detik
  http.setTimeout(5000);

  int httpCode = http.POST(jsonBody);

  if (httpCode > 0) {
    String response = http.getString();
    Serial.printf("[HTTP] <<< Response code: %d\n", httpCode);
    Serial.printf("[HTTP] <<< Response: %s\n", response.c_str());
    if (httpCode == HTTP_CODE_OK || httpCode == 201) {
      Serial.println("[HTTP] ✓ Data berhasil dikirim ke server!");
    } else {
      Serial.printf("[HTTP] ⚠ Response bukan 200: %d\n", httpCode);
    }
  } else {
    Serial.printf("[HTTP] ✗ GAGAL kirim! Error: %s\n", http.errorToString(httpCode).c_str());
    Serial.println("[HTTP] ✗ Cek: 1) Laravel jalan? 2) IP benar? 3) Same WiFi?");
  }
  http.end();
}

// ============================================================
//  SETUP
// ============================================================
void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println("\n===== SIMS - Smart Infusion Monitoring System =====");
  Serial.printf("[INFO] Device: %s\n", DEVICE_ID);
  Serial.printf("[INFO] Backend: %s\n", BACKEND_URL);

  // --- Init HX711 ---
  loadCell.begin(HX711_DT_PIN, HX711_SCK_PIN);
  loadCell.set_scale(CALIBRATION_FACTOR);
  loadCell.tare();  // Set nol (taruh sensor tanpa beban dulu)
  Serial.println("[HX711] Load Cell siap. Tare selesai.");

  // --- Init Sensor IR ---
  pinMode(IR_SENSOR_PIN, INPUT);
  attachInterrupt(digitalPinToInterrupt(IR_SENSOR_PIN), onTetesan, CHANGE);
  Serial.println("[IR] Sensor tetesan siap (interrupt aktif).");

  // --- Koneksi WiFi ---
  koneksiWiFi();

  // --- Set waktu awal ---
  waktuTPMAkhir   = millis();
  waktuKirimAkhir = millis();

  Serial.println("[SIMS] Sistem berjalan. Mulai monitoring...\n");
}

// ============================================================
//  LOOP UTAMA
// ============================================================
void loop() {
  unsigned long sekarang = millis();

  // ----- 1. Hitung TPM (update setiap INTERVAL_TPM_MS) -----
  float tpm = hitungTPM();

  // ----- 2. Kirim data ke server (setiap INTERVAL_KIRIM_MS) -----
  if (sekarang - waktuKirimAkhir >= INTERVAL_KIRIM_MS) {
    waktuKirimAkhir = sekarang;

    // Baca berat botol saat ini
    float beratSekarang = bacaBerat();

    if (beratSekarang < 0) {
      Serial.println("[HX711] Sensor tidak siap, skip.");
      return;
    }

    // Simpan berat awal saat pertama kali (dianggap botol penuh)
    if (!sudahKalibrasi) {
      beratBotolPenuh = beratSekarang;
      sudahKalibrasi  = true;
      Serial.printf("[KALIBRASI] Berat awal botol: %.1f gram\n", beratBotolPenuh);
    }

    // Hitung berat cairan bersih (kurangi berat botol kosong)
    float beratCairan = beratSekarang - BERAT_BOTOL_KOSONG;
    if (beratCairan < 0) beratCairan = 0;

    // Konversi berat ke volume (1 gram air ≈ 1 ml untuk cairan infus NaCl/RL)
    float sisaVolumeMl = beratCairan;

    // Hitung persentase sisa
    float persenSisa = (sisaVolumeMl / VOLUME_BOTOL_ML) * 100.0;
    if (persenSisa > 100.0) persenSisa = 100.0;
    if (persenSisa < 0.0)   persenSisa = 0.0;

    // Estimasi waktu habis (asumsi selang makro=20 tetes/ml, mikro=60 tetes/ml)
    // Ganti faktorTetes sesuai tipe selang yang digunakan
    int faktorTetes = 20;  // << GANTI: 20 (makro) atau 60 (mikro)
    float estimasiMenit = hitungEstimasiMenit(sisaVolumeMl, tpm, faktorTetes);

    // Cek status kritis
    bool statusKritis = (persenSisa <= BATAS_KRITIS_PERSEN);

    // Debug Serial Monitor
    Serial.println("========================================");
    Serial.printf("[DEVICE] %s\n", DEVICE_ID);
    Serial.printf("[SERVER] %s\n", BACKEND_URL);
    Serial.println("----------------------------------------");
    Serial.printf("[SENSOR] Berat       : %.1f gram\n", beratSekarang);
    Serial.printf("[SENSOR] Cairan bersih: %.1f gram\n", beratCairan);
    Serial.printf("[SENSOR] Sisa volume : %.1f ml (%.1f%%)\n", sisaVolumeMl, persenSisa);
    Serial.printf("[SENSOR] TPM         : %.1f tetes/menit\n", tpm);
    if (estimasiMenit > 0)
      Serial.printf("[SENSOR] Est. habis  : %.0f menit (%.1f jam)\n",
                     estimasiMenit, estimasiMenit / 60.0);
    else
      Serial.println("[SENSOR] Est. habis  : Tidak dapat dihitung (TPM=0)");
    Serial.printf("[STATUS] Kritis      : %s\n", statusKritis ? "YA ⚠️" : "Aman ✓");

    // Kirim TPM ke Laravel
    kirimDataKeServer(tpm, beratSekarang, sisaVolumeMl);
  }
}
// ============================================================
//  note guys baca cok!
//  1. HX711 by Bogdan Necula (atau HX711 Arduino Library by Rob Tillaart)
//  2. ArduinoJson by Benoit Blanchon (versi 7.x — gunakan JsonDocument)
//  Board: ESP32 Dev Module
//  Upload Speed: 115200
//
//  CARA MENYESUAIKAN DENGAN PASIEN:
//  1. Buka dashboard Laravel, catat ID infus yang aktif
//  2. Ganti BACKEND_URL: .../api/update-infusion/<ID_INFUS>
//  3. Pastikan VOLUME_BOTOL_ML sesuai dengan yang diinput di dashboard
//  4. Sesuaikan faktorTetes: 20 (Makro) atau 60 (Mikro)
// ============================================================
