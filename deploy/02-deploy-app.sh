#!/bin/bash
# ============================================
# SIMS Infus - Deploy Laravel App
# Run this AFTER server setup
# ============================================
# Usage: bash 02-deploy-app.sh
# ============================================

set -e

PROJECT_DIR="/var/www/sims-infus"
APP_URL="http://YOUR_IP_HERE"  # ⚠️ GANTI dengan IP EC2 Anda

echo "🚀 Deploying SIMS Infus..."
echo "============================================"

# -------------------------------------------
# 1. Setup Project Directory
# -------------------------------------------
echo ""
echo "📁 [1/6] Setting up project directory..."
cd $PROJECT_DIR

# If using Git deployment
if [ ! -d ".git" ]; then
    echo "   ⚠️  No git repo found. Please upload your project first:"
    echo "   scp -r /path/to/SIMS-Development/* ubuntu@YOUR_IP:/var/www/sims-infus/"
    echo ""
    echo "   Or clone from GitHub:"
    echo "   git clone https://github.com/YOUR_USERNAME/SIMS-Development.git ."
    exit 1
fi

# -------------------------------------------
# 2. Install Dependencies
# -------------------------------------------
echo ""
echo "📦 [2/6] Installing PHP dependencies..."
composer install --no-dev --optimize-autoloader --no-interaction

echo ""
echo "📦 Installing Node dependencies & building..."
npm install
npm run build

echo "   ✅ Dependencies installed"

# -------------------------------------------
# 3. Environment Configuration
# -------------------------------------------
echo ""
echo "⚙️  [3/6] Configuring environment..."

if [ ! -f ".env" ]; then
    cp .env.example .env
    echo "   📝 Created .env from .env.example"
fi

# Generate app key if not set
php artisan key:generate --force

# Update .env for production
echo ""
echo "   Updating .env for production..."

# Backup original .env
cp .env .env.backup

# Update DB settings (using sed)
sed -i 's/DB_CONNECTION=.*/DB_CONNECTION=mysql/' .env
sed -i 's/DB_HOST=.*/DB_HOST=127.0.0.1/' .env
sed -i 's/DB_PORT=.*/DB_PORT=3306/' .env
sed -i 's/DB_DATABASE=.*/DB_DATABASE=sims_infus/' .env
sed -i 's/DB_USERNAME=.*/DB_USERNAME=root/' .env
sed -i 's/DB_PASSWORD=.*/DB_PASSWORD=YOUR_MYSQL_PASSWORD/' .env  # ⚠️ GANTI

# Update APP_URL
sed -i "s|APP_URL=.*|APP_URL=$APP_URL|g" .env

# Set production settings
sed -i 's/APP_DEBUG=.*/APP_DEBUG=false/' .env
sed -i 's/SESSION_DRIVER=.*/SESSION_DRIVER=database/' .env
sed -i 's/QUEUE_CONNECTION=.*/QUEUE_CONNECTION=redis/' .env
sed -i 's/CACHE_STORE=.*/CACHE_STORE=redis/' .env

echo "   ✅ Environment configured"
echo ""
echo "   ⚠️  IMPORTANT: Edit .env manually to set:"
echo "      - DB_PASSWORD"
echo "      - APP_URL (your server IP)"
echo ""

# -------------------------------------------
# 4. Run Migrations
# -------------------------------------------
echo ""
echo "🗄️  [4/6] Running database migrations..."
php artisan migrate --force

# -------------------------------------------
# 5. Storage & Permissions
# -------------------------------------------
echo ""
echo "🔐 [5/6] Setting permissions..."

# Create storage link
php artisan storage:link --force

# Set proper permissions
sudo chown -R www-data:www-data storage bootstrap/cache
sudo chmod -R 775 storage bootstrap/cache
sudo chmod -R 775 public

echo "   ✅ Permissions set"

# -------------------------------------------
# 6. Optimize
# -------------------------------------------
echo ""
echo "⚡ [6/6] Optimizing Laravel..."
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache

echo "   ✅ Laravel optimized"

# -------------------------------------------
# Setup Queue Worker (systemd)
# -------------------------------------------
echo ""
echo "🔧 Setting up queue worker..."

sudo tee /etc/systemd/system/sims-queue.service > /dev/null <<EOF
[Unit]
Description=SIMS Infus Queue Worker
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=$PROJECT_DIR
ExecStart=/usr/bin/php artisan queue:work redis --sleep=3 --tries=3 --max-time=3600
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable sims-queue
sudo systemctl start sims-queue

echo "   ✅ Queue worker configured"

# -------------------------------------------
# Summary
# -------------------------------------------
echo ""
echo "============================================"
echo "✅ Deployment completed!"
echo "============================================"
echo ""
echo "🌐 Access your app at: $APP_URL"
echo ""
echo "Next steps:"
echo "  1. Set correct DB_PASSWORD in .env"
echo "  2. Set correct APP_URL in .env"
echo "  3. Open AWS Security Group ports:"
echo "     - Port 22 (SSH)"
echo "     - Port 80 (HTTP)"
echo "     - Port 443 (HTTPS - for SSL)"
echo "  4. Access via: http://YOUR_EC2_PUBLIC_IP"
echo ""
echo "Useful commands:"
echo "  sudo systemctl restart nginx"
echo "  sudo systemctl restart sims-queue"
echo "  php artisan tinker"
echo "  tail -f storage/logs/laravel.log"
echo ""
