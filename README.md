<p align="center">
  <img src="public/mayapada_logo.png" width="200" alt="Mayapada Hospital Logo" />
</p>

<h1 align="center">SIMS — Smart Infusion Monitoring System</h1>
<h3 align="center">Mayapada Hospital × Universitas Brawijaya</h3>

<p align="center">
  <img src="https://img.shields.io/badge/Laravel-v13-FF2D20?style=flat-square&logo=laravel&logoColor=white" alt="Laravel" />
  <img src="https://img.shields.io/badge/React-Inertia.js-61DAFB?style=flat-square&logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/ESP32-Firmware-3C3C3C?style=flat-square&logo=espressif&logoColor=E7352C" alt="ESP32" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-v3-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white" alt="Tailwind" />
  <img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" alt="License" />
</p>

<p align="center">
  Sistem pemantauan infus berbasis IoT secara <strong>real-time</strong> yang menggabungkan hardware ESP32 (HX711 Load Cell + Sensor IR) dengan dashboard web Laravel + React untuk tenaga medis Mayapada Hospital.
</p>

---

## ✨ Fitur Utama

| Fitur | Keterangan |
|---|---|
| 📡 **Real-time Monitoring** | Data cairan infus diperbarui otomatis setiap 2 detik |
| ⚠️ **Peringatan Kritis** | Alarm audio + visual otomatis saat cairan hampir habis |
| 📊 **Digital Charting** | Riwayat lengkap log tetesan per pasien |
| 🔄 **Ganti Infus** | Fitur ganti infus langsung dari dashboard |
| 📁 **Ekspor CSV** | Export data charting pasien ke file CSV |
| 🧊 **3D Digital Twin** | Visualisasi 3D kantong infus real-time di halaman Recap |
| 📱 **Responsive Design** | Tampilan optimal di semua ukuran layar |

---

## 🛠️ Teknologi yang Digunakan

### Backend & Frontend
- **Laravel 13** — Backend framework (REST API + Web)
- **Inertia.js + React** — Frontend SPA tanpa API terpisah
- **Tailwind CSS** — Styling
- **Three.js / React Three Fiber** — Visualisasi 3D kantong infus
- **SQLite / MySQL** — Database

### Hardware (ESP32)
- **ESP32 Dev Module**
- **HX711** — Load Cell (pembaca berat botol infus)
- **Sensor Infrared (IR)** — Penghitung tetesan
- **Library:** `HX711`, `ArduinoJson`, `WiFi`, `HTTPClient`

---

## 🚀 Cara Menjalankan (Development)

### Prasyarat
- PHP 8.2+
- Composer
- Node.js 18+
- npm

### Instalasi

```bash
# 1. Clone repository
git clone https://github.com/Zenqirtz/Smart-Infusion-Monitoring-System.git
cd Smart-Infusion-Monitoring-System

# 2. Install dependencies PHP
composer install

# 3. Install dependencies Node
npm install

# 4. Salin file environment
cp .env.example .env
php artisan key:generate

# 5. Migrasi database
php artisan migrate

# 6. Jalankan server (di dua terminal berbeda)
php artisan serve          # Terminal 1 — Backend Laravel
npm run dev                # Terminal 2 — Vite (frontend)
```

Buka browser ke: `http://localhost:8000`

---

## 🔌 Konfigurasi ESP32

Sketch firmware tersedia di folder `esp32_sketch/esp32_sketch.ino`.

Sesuaikan variabel berikut sebelum upload ke ESP32:

```cpp
// Sesuaikan SSID dan password WiFi
const char* WIFI_SSID     = "NAMA_WIFI";
const char* WIFI_PASSWORD = "PASSWORD_WIFI";

// Ganti dengan IP PC yang menjalankan Laravel + ID infus pasien
const char* BACKEND_URL = "http://<IP_PC>:8000/api/update-infusion/<ID_INFUS>";

// Kalibrasi sensor
float CALIBRATION_FACTOR  = 1160.0;   // Sesuaikan hasil kalibrasi
float BERAT_BOTOL_KOSONG  = 65.0;     // Berat botol kosong (gram)
float VOLUME_BOTOL_ML     = 500.0;    // Volume cairan awal (ml)
```

**Library yang dibutuhkan (Arduino IDE Library Manager):**
- `HX711` by Bogdan Necula
- `ArduinoJson` by Benoit Blanchon (v7.x)

---

## 📡 API Endpoint (ESP32 → Laravel)

| Method | URL | Deskripsi |
|---|---|---|
| `POST` | `/api/update-infusion/{id}` | Kirim data TPM dari ESP32 |

**Request Body (JSON):**
```json
{
  "tpm": 60.0
}
```

---

## 👥 Tim Pengembang

**Kelompok 7 T4C — Universitas Brawijaya**  
Mata Kuliah: Analisis Perancangan Sistem (VTI52421)

---

## 📄 Lisensi

Proyek ini bersifat open-source dan dilisensikan di bawah [MIT License](https://opensource.org/licenses/MIT).
# ESP32 Integration Branch
