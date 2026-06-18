// ============================================================
//   SIMS - Smart Infusion Monitoring System
//   Firmware ESP32 | Kelompok 7 T4C - Universitas Brawijaya
//   Mata Kuliah : Analisis Perancangan Sistem (VTI52421)
// ============================================================

#include <WiFi.h>
#include <HTTPClient.h>
#include <HX711.h>
#include <ArduinoJson.h> 

// ============================================================
//   KONFIGURASI HARDWARE
// ============================================================
#define HX711_DT_PIN    22    
#define HX711_SCK_PIN   21   
#define IR_SENSOR_PIN   16 

// ============================================================
//   KONFIGURASI WIFI & BACKEND LARAVEL (ALUR BARU)
// ============================================================
const char* WIFI_SSID     = "Fianz";       
const char* WIFI_PASSWORD = "njirlah123";    

// URL dibuat UNIVERSAL / SENTRAL (Tidak pakai /ID_PASIEN di ujungnya)
const char* BACKEND_URL   = "http://192.168.137.119:8000/api/update-infusion";

// ID Perangkat dibuat STATIS (Cukup ganti "01", "02", "03" saat flash alat berbeda)
const char* DEVICE_ID     = "01"; 

// ============================================================
//   SISTEM CONFIGURATION
// ============================================================
float CALIBRATION_FACTOR  = 1160.0;  // Hasil kalibrasi stabil
float BERAT_BOTOL_KOSONG  = 65.0;    // Beban botol kosong (gram)
float VOLUME_BOTOL_ML     = 500.0;   // Kapasitas botol infus (ml)
float BATAS_KRITIS_PERSEN = 10.0;    // Alert limit (%)

unsigned long INTERVAL_KIRIM_MS = 5000;   // Kirim data setiap 5 detik
unsigned long INTERVAL_TPM_MS   = 10000;  // Update TPM setiap 10 detik

// ============================================================
//   VARIABEL GLOBAL
// ============================================================
HX711 loadCell;

volatile int           jumlahTetesan    = 0;   
volatile bool          statusIRSebelum  = HIGH; 
volatile unsigned long waktuTetesanTerakhir = 0; 
unsigned long          waktuTPMAkhir    = 0;
float                  nilaiTPM         = 0.0;

#define DEBOUNCE_MS 50
#define TPM_MAX_REALISTIS 500

unsigned long   waktuKirimAkhir  = 0;
float beratBotolPenuh = 0.0;   
bool  sudahKalibrasi  = false;

// ============================================================
//   INTERRUPT SERVICE ROUTINE - Sensor Tetesan IR
// ============================================================
void IRAM_ATTR onTetesan() {
  unsigned long sekarang = millis();
  if (sekarang - waktuTetesanTerakhir < DEBOUNCE_MS) return;

  bool statusSekarang = digitalRead(IR_SENSOR_PIN);
  if (statusIRSebelum == HIGH && statusSekarang == LOW) {
    jumlahTetesan++;
    waktuTetesanTerakhir = sekarang;
  }
  statusIRSebelum = statusSekarang;
}

// ============================================================
//   FUNGSI: Koneksi WiFi
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
    Serial.println("\n[WiFi] GAGAL terhubung.");
  }
}

// ============================================================
//   FUNGSI: Baca Timbangan
// ============================================================
float bacaBerat() {
  if (!loadCell.is_ready()) return -1.0;
  float berat = loadCell.get_units(5);  
  if (berat < 0) berat = 0;             
  return berat;
}

// ============================================================
//   FUNGSI: Hitung TPM
// ============================================================
float hitungTPM() {
  unsigned long sekarang = millis();
  unsigned long selisih  = sekarang - waktuTPMAkhir;

  if (selisih >= INTERVAL_TPM_MS) {
    int snapshot   = jumlahTetesan;
    jumlahTetesan  = 0;
    waktuTPMAkhir  = sekarang;

    float menitBerlalu = selisih / 60000.0;
    float tpmBaru = snapshot / menitBerlalu;

    if (tpmBaru > TPM_MAX_REALISTIS) {
      Serial.printf("[IR] TPM noise ditolak: %.1f\n", tpmBaru);
    } else {
      nilaiTPM = tpmBaru;
    }
  }
  return nilaiTPM;
}

// ============================================================
//   FUNGSI: Estimasi Waktu
// ============================================================
float hitungEstimasiMenit(float sisaVolumeMl, float tpm, int faktorTetes) {
  if (tpm <= 0) return -1.0;  
  float mlPerMenit = tpm / faktorTetes;  
  if (mlPerMenit <= 0) return -1.0;
  return sisaVolumeMl / mlPerMenit;      
}

// ============================================================
//   FUNGSI: Kirim Data ke Backend Laravel (JSON POST)
// ============================================================
void kirimDataKeServer(float tpm, float beratGram, float sisaVolumeMl, float persenSisa, bool statusKritis) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[HTTP] WiFi terputus, mencoba reconnect...");
    koneksiWiFi();
    if (WiFi.status() != WL_CONNECTED) return;
  }

  // MEMBUAT PAYLOAD JSON BARU YANG DINAMIS
  JsonDocument doc;
  doc["device_id"]     = DEVICE_ID;       // Identitas alat (Misal: "01")
  doc["tpm"]           = tpm;             // Data sensor IR
  doc["berat_raw"]     = beratGram;       // Data Berat Total
  doc["sisa_volume"]   = sisaVolumeMl;    // Sisa Volume (ml)
  doc["persen_sisa"]   = persenSisa;      // Persentase sisa (%)
  doc["status_kritis"] = statusKritis;    // Flag Kritis (true/false)

  String jsonBody;
  serializeJson(doc, jsonBody);

  Serial.printf("[HTTP] >>> Mengirim ke: %s\n", BACKEND_URL);
  Serial.printf("[HTTP] >>> Body: %s\n", jsonBody.c_str());

  HTTPClient http;
  http.begin(BACKEND_URL);
  http.addHeader("Content-Type", "application/json");
  http.setConnectTimeout(5000); 
  http.setTimeout(5000);

  int httpCode = http.POST(jsonBody);

  if (httpCode > 0) {
    String response = http.getString();
    Serial.printf("[HTTP] <<< Response code: %d\n", httpCode);
    if (httpCode == HTTP_CODE_OK || httpCode == 201) {
      Serial.println("[HTTP] ✓ Data berhasil sinkron dengan Laravel!");
    } else {
      Serial.printf("[HTTP] ⚠ Server merespon code: %d\n", httpCode);
    }
  } else {
    Serial.printf("[HTTP] ✗ Gagal kirim. Error: %s\n", http.errorToString(httpCode).c_str());
  }
  http.end();
}

// ============================================================
//   SETUP
// ============================================================
void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println("\n===== SIMS - Smart Infusion Monitoring System =====");
  Serial.printf("[INFO] Device ID : %s\n", DEVICE_ID);
  Serial.printf("[INFO] Endpoint  : %s\n", BACKEND_URL);

  loadCell.begin(HX711_DT_PIN, HX711_SCK_PIN);
  loadCell.set_scale(CALIBRATION_FACTOR);
  loadCell.tare();  
  Serial.println("[HX711] Load Cell siap. Tare selesai.");

  pinMode(IR_SENSOR_PIN, INPUT);
  attachInterrupt(digitalPinToInterrupt(IR_SENSOR_PIN), onTetesan, CHANGE);
  Serial.println("[IR] Sensor tetesan siap.");

  koneksiWiFi();

  waktuTPMAkhir   = millis();
  waktuKirimAkhir = millis();
  Serial.println("[SIMS] Monitoring dimulai...\n");
}

// ============================================================
//   LOOP UTAMA
// ============================================================
void loop() {
  unsigned long sekarang = millis();

  float tpm = hitungTPM();

  if (sekarang - waktuKirimAkhir >= INTERVAL_KIRIM_MS) {
    waktuKirimAkhir = sekarang;

    float beratSekarang = bacaBerat();
    if (beratSekarang < 0) return;

    if (!sudahKalibrasi) {
      beratBotolPenuh = beratSekarang;
      sudahKalibrasi  = true;
    }

    float beratCairan = beratSekarang - BERAT_BOTOL_KOSONG;
    if (beratCairan < 0) beratCairan = 0;

    float sisaVolumeMl = beratCairan;
    float persenSisa = (sisaVolumeMl / VOLUME_BOTOL_ML) * 100.0;
    if (persenSisa > 100.0) persenSisa = 100.0;
    if (persenSisa < 0.0)   persenSisa = 0.0;

    int faktorTetes = 20;  
    float estimasiMenit = hitungEstimasiMenit(sisaVolumeMl, tpm, faktorTetes);
    bool statusKritis = (persenSisa <= BATAS_KRITIS_PERSEN);

    // Debug print di Serial Monitor
    Serial.println("========================================");
    Serial.printf("[DEVICE] ID: %s\n", DEVICE_ID);
    Serial.printf("[SENSOR] Berat: %.1f g | Sisa: %.1f ml (%.1f%%)\n", beratSekarang, sisaVolumeMl, persenSisa);
    Serial.printf("[SENSOR] TPM  : %.1f tetes/menit\n", tpm);
    Serial.printf("[STATUS] Kritis: %s\n", statusKritis ? "YA ⚠️" : "Aman ✓");

    // Kirim data lengkap ke Laravel
    kirimDataKeServer(tpm, beratSekarang, sisaVolumeMl, persenSisa, statusKritis);
  }
}