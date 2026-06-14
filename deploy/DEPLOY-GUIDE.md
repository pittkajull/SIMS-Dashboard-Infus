# 🚀 Panduan Deploy SIMS Infus ke AWS EC2

## 📋 Prasyarat

- [ ] Akun AWS (ada free tier untuk EC2)
- [ ] Key Pair (.pem file) sudah didownload
- [ ] Source code sudah di-push ke GitHub

---

## 📁 Struktur File Deploy

```
deploy/
├── 01-server-setup.sh      # Setup server (install PHP, MySQL, dll)
├── 02-deploy-app.sh        # Deploy Laravel app
├── sims-infus.conf         # Nginx configuration
└── DEPLOY-GUIDE.md         # Dokumentasi ini
```

---

## 🅰️ STEP 1: Buat EC2 Instance

### 1.1 Login AWS Console
1. Buka https://console.aws.amazon.com
2. Login ke akun AWS Anda

### 1.2 Buat EC2 Instance
1. Klik **Services** → **EC2** → **Launch Instance**
2. Isi konfigurasi:
   - **Name**: `sims-infus-server`
   - **AMI**: `Ubuntu Server 22.04 LTS (Free tier eligible)`
   - **Instance type**: `t2.micro` (free tier) atau `t3.small` (recommended)
   - **Key pair**: Pilih atau buat baru → Download .pem file
   - **Network settings**: Klik **Edit**
     - **Allow SSH**: Port 22, Source `My IP`
     - **Allow HTTP**: Port 80, Source `Anywhere (0.0.0.0/0)`
     - **Allow HTTPS**: Port 443, Source `Anywhere (0.0.0.0/0)`
3. Klik **Launch Instance**
4. Klik **View all instances** → Tunggu status `Running`

### 1.3 Catat Public IP
- Di halaman EC2, klik instance yang baru dibuat
- Copy **Public IPv4 address** (contoh: `54.123.45.67`)

---

## 🅱️ STEP 2: Setup Server

### 2.1 Connect via SSH
```bash
# Buka terminal, navigasi ke folder key pair
cd ~/Downloads

# Connect ke server (ganti dengan IP dan nama .pem Anda)
chmod 400 your-key.pem
ssh -i your-key.pem ubuntu@YOUR_EC2_PUBLIC_IP
```

### 2.2 Upload Scripts
```bash
# Dari terminal LOCAL (bukan di server)
# Upload folder deploy ke server
scp -i your-key.pem -r deploy/* ubuntu@YOUR_EC2_PUBLIC_IP:/home/ubuntu/
```

### 2.3 Run Setup Script
```bash
# SSH ke server dulu
ssh -i your-key.pem ubuntu@YOUR_EC2_PUBLIC_IP

# Jalankan setup script
cd /home/ubuntu
chmod +x 01-server-setup.sh
sudo bash 01-server-setup.sh
```

**Saat menjalankan, Anda akan diminta:**
1. Set MySQL root password → **INGAT PASSWORD INI!**
2. Press Enter untuk pertanyaan secure installation lainnya

---

## 🅲 STEP 3: Upload Project

### 3.1 Dari Local Machine
```bash
# Upload project ke server
# Ganti YOUR_IP dengan IP EC2 Anda
scp -i your-key.pem -r ./* ubuntu@YOUR_EC2_PUBLIC_IP:/var/www/sims-infus/
```

**Atau menggunakan Git:**
```bash
# SSH ke server
ssh -i your-key.pem ubuntu@YOUR_EC2_PUBLIC_IP

# Clone repository
cd /var/www/sims-infus
git clone https://github.com/YOUR_USERNAME/SIMS-Development.git .
```

---

## 🅳 STEP 4: Deploy Application

### 4.1 SSH ke Server
```bash
ssh -i your-key.pem ubuntu@YOUR_EC2_PUBLIC_IP
```

### 4.2 Upload & Edit Deploy Script
```bash
# Upload 02-deploy-app.sh ke server
# Edit bagian yang perlu diubah
nano /home/ubuntu/02-deploy-app.sh
```

**Edit bagian ini:**
```bash
APP_URL="http://YOUR_EC2_PUBLIC_IP"  # Ganti dengan IP EC2
sed -i 's/DB_PASSWORD=.*/DB_PASSWORD=YOUR_MYSQL_PASSWORD/' .env  # Ganti password
```

### 4.3 Jalankan Deploy
```bash
# Copy script ke project directory
cp /home/ubuntu/02-deploy-app.sh /var/www/sims-infus/
cd /var/www/sims-infus

# Jalankan deploy
chmod +x 02-deploy-app.sh
sudo bash 02-deploy-app.sh
```

---

## 🅴 STEP 5: Setup Nginx

### 5.1 Upload Config
```bash
# Dari local machine
scp -i your-key.pem deploy/sims-infus.conf ubuntu@YOUR_EC2_PUBLIC_IP:/home/ubuntu/

# SSH ke server
ssh -i your-key.pem ubuntu@YOUR_EC2_PUBLIC_IP

# Copy config ke Nginx
sudo cp /home/ubuntu/sims-infus.conf /etc/nginx/sites-available/
sudo ln -sf /etc/nginx/sites-available/sims-infus.conf /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test & restart Nginx
sudo nginx -t
sudo systemctl restart nginx
```

---

## 🅵 STEP 6: Final Configuration

### 6.1 Edit .env di Server
```bash
cd /var/www/sims-infus
nano .env
```

**Pastikan setting ini benar:**
```env
APP_NAME="SIMS Infus"
APP_ENV=production
APP_KEY=base64:xxx  # Sudah di-generate otomatis
APP_DEBUG=false
APP_URL=http://YOUR_EC2_PUBLIC_IP

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=sims_infus
DB_USERNAME=root
DB_PASSWORD=YOUR_MYSQL_PASSWORD  # ⚠️ GANTI!

SESSION_DRIVER=database
QUEUE_CONNECTION=redis
CACHE_STORE=redis
```

### 6.2 Clear Cache
```bash
php artisan config:clear
php artisan cache:clear
php artisan route:clear
php artisan view:clear
php artisan config:cache
php artisan route:cache
```

### 6.3 Run Migrations
```bash
php artisan migrate --force
```

---

## ✅ STEP 7: Test Aplikasi

### 7.1 Cek Status Services
```bash
# Cek Nginx
sudo systemctl status nginx

# Cek MySQL
sudo systemctl status mysql

# Cek Queue Worker
sudo systemctl status sims-queue

# Cek PHP-FPM
sudo systemctl status php8.2-fpm
```

### 7.2 Akses Aplikasi
Buka browser, akses:
```
http://YOUR_EC2_PUBLIC_IP
```

### 7.3 Cek Log Jika Error
```bash
# Laravel log
tail -f /var/www/sims-infus/storage/logs/laravel.log

# Nginx error log
sudo tail -f /var/log/nginx/sims-infus-error.log

# Nginx access log
sudo tail -f /var/log/nginx/sims-infus-access.log
```

---

## 🔧 STEP 8: Setup SSL (Optional tapi Recommended)

### 8.1 Install Certbot
```bash
sudo apt-get install -y certbot python3-certbot-nginx
```

### 8.2 Dapatkan SSL Certificate
```bash
# Jalankan certbot
sudo certbot --nginx -d yourdomain.com

# Pilih redirect ke HTTPS (angka 2)
```

> **Note:** SSL butuh domain. Untuk IP langsung, SSL tidak bisa dipasang.

---

## 🔧 STEP 9: Setup ESP32 API

### 9.1 Pastikan Endpoint Aktif
Test endpoint dari browser atau curl:
```bash
# Cek status device
curl http://YOUR_EC2_PUBLIC_IP/api/esp32/status

# Kirim data dari ESP32
curl -X POST http://YOUR_EC2_PUBLIC_IP/api/esp32/data \
  -H "Content-Type: application/json" \
  -H "X-Device-ID: DEV001" \
  -d '{"device_id":"DEV001","volume":100,"drips":15}'
```

### 9.2 Update ESP32 Code
Di file Arduino ESP32, update IP address:
```cpp
const char* serverURL = "http://YOUR_EC2_PUBLIC_IP/api/esp32/data";
```

---

## 📊 Monitoring & Maintenance

### Cek Queue Worker
```bash
# Status
sudo systemctl status sims-queue

# Restart jika perlu
sudo systemctl restart sims-queue

# View logs
tail -f /var/www/sims-infus/storage/logs/laravel.log
```

### Backup Database
```bash
# Manual backup
mysqldump -u root -p sims_infus > backup_$(date +%Y%m%d).sql

# Restore
mysql -u root -p sims_infus < backup_20260614.sql
```

### Update Application
```bash
cd /var/www/sims-infus

# Pull latest code
git pull origin main

# Install dependencies
composer install --no-dev --optimize-autoloader
npm install && npm run build

# Run migrations
php artisan migrate --force

# Clear & optimize cache
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Restart services
sudo systemctl restart php8.2-fpm
sudo systemctl restart sims-queue
```

---

## 🐛 Troubleshooting

### Error 502 Bad Gateway
```bash
# Cek PHP-FPM status
sudo systemctl status php8.2-fpm

# Restart
sudo systemctl restart php8.2-fpm
```

### Error Permission Denied
```bash
# Fix permissions
sudo chown -R www-data:www-data /var/www/sims-infus/storage
sudo chown -R www-data:www-data /var/www/sims-infus/bootstrap/cache
sudo chmod -R 775 /var/www/sims-infus/storage
sudo chmod -R 775 /var/www/sims-infus/bootstrap/cache
```

### Database Connection Failed
```bash
# Cek MySQL
sudo systemctl status mysql

# Login MySQL test
mysql -u root -p

# Cek database
SHOW DATABASES;
```

### ESP32 Tidak Bisa Connect
1. Cek IP address di ESP32 code
2. Cek Security Group EC2 (port 80 harus terbuka)
3. Cek Laravel log untuk error
4. Test API dari browser/curl dulu

---

## 💰 Estimasi Biaya AWS

| Item | Spec | Estimasi/Bulan |
|------|------|----------------|
| EC2 t2.micro | 1 vCPU, 1GB RAM | ~$0 (Free tier) |
| EC2 t3.small | 2 vCPU, 2GB RAM | ~$15 |
| EBS Storage | 20GB GP3 | ~$2 |
| Data Transfer | 1GB traffic | ~$0.10 |
| **Total** | | **~$0 - $17** |

---

## 📝 Quick Commands Reference

```bash
# Connect to server
ssh -i your-key.pem ubuntu@YOUR_IP

# Restart all services
sudo systemctl restart nginx php8.2-fpm mysql sims-queue

# View Laravel logs
tail -100 /var/www/sims-infus/storage/logs/laravel.log

# Run artisan commands
cd /var/www/sims-infus
php artisan migrate --force
php artisan cache:clear
php artisan config:cache

# Check disk usage
df -h

# Check memory
free -m
```

---

## ⚠️ Security Checklist

- [ ] MySQL root password sudah di-set
- [ ] APP_DEBUG=false di .env
- [ ] APP_KEY sudah di-generate
- [ ] AWS Security Group hanya buka port 22, 80, 443
- [ ] SSH key file (.pem) disimpan aman
- [ ] .env tidak di-push ke GitHub (cek .gitignore)
- [ ] Database password kuat

---

**Selesai! 🎉**

Untuk pertanyaan atau masalah, cek log atau buka issue di GitHub.
