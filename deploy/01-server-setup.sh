#!/bin/bash
# ============================================
# SIMS Infus - Server Setup Script
# Run this ONCE on fresh Ubuntu EC2 instance
# ============================================
# Usage: bash 01-server-setup.sh
# ============================================

set -e

echo "🚀 Starting server setup for SIMS Infus..."
echo "============================================"

# -------------------------------------------
# 1. System Update
# -------------------------------------------
echo ""
echo "📦 [1/8] Updating system packages..."
sudo apt-get update -y
sudo apt-get upgrade -y

# -------------------------------------------
# 2. Install PHP 8.2 + Extensions
# -------------------------------------------
echo ""
echo "🐘 [2/8] Installing PHP 8.2 and extensions..."
sudo apt-get install -y software-properties-common
sudo add-apt-repository -y ppa:ondrej/php
sudo apt-get update -y

sudo apt-get install -y \
    php8.2-fpm \
    php8.2-cli \
    php8.2-mysql \
    php8.2-curl \
    php8.2-gd \
    php8.2-mbstring \
    php8.2-xml \
    php8.2-zip \
    php8.2-bcmath \
    php8.2-imagick \
    php8.2-readline \
    php8.2-opcache \
    php8.2-dom

echo "   ✅ PHP 8.2 installed"

# -------------------------------------------
# 3. Install MySQL
# -------------------------------------------
echo ""
echo "🐬 [3/8] Installing MySQL..."
sudo apt-get install -y mysql-server

# Start MySQL
sudo systemctl start mysql
sudo systemctl enable mysql

# Secure MySQL installation
echo ""
echo "⚠️  MySQL secure installation..."
echo "Please set root password when prompted (remember it!)"
echo "You can press Enter for all other questions."
echo ""
sudo mysql_secure_installation

echo "   ✅ MySQL installed"

# -------------------------------------------
# 4. Create Database
# -------------------------------------------
echo ""
echo "🗄️  [4/8] Creating database 'sims_infus'..."
echo "Enter MySQL root password when prompted:"
echo ""
sudo mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS sims_infus CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
echo "   ✅ Database created"

# -------------------------------------------
# 5. Install Nginx
# -------------------------------------------
echo ""
echo "🌐 [5/8] Installing Nginx..."
sudo apt-get install -y nginx

sudo systemctl start nginx
sudo systemctl enable nginx

# Configure firewall
sudo ufw allow 'Nginx Full'
sudo ufw allow OpenSSH
sudo ufw --force enable

echo "   ✅ Nginx installed"

# -------------------------------------------
# 6. Install Composer
# -------------------------------------------
echo ""
echo "🎼 [6/8] Installing Composer..."
curl -sS https://getcomposer.org/installer | php
sudo mv composer.phar /usr/local/bin/composer
composer --version

echo "   ✅ Composer installed"

# -------------------------------------------
# 7. Install Node.js (for frontend build)
# -------------------------------------------
echo ""
echo "📗 [7/8] Installing Node.js 20.x..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node --version
npm --version

echo "   ✅ Node.js installed"

# -------------------------------------------
# 8. Install Redis (optional, for queue/cache)
# -------------------------------------------
echo ""
echo "🔴 [8/8] Installing Redis..."
sudo apt-get install -y redis-server

sudo systemctl start redis
sudo systemctl enable redis

echo "   ✅ Redis installed"

# -------------------------------------------
# Setup Project Directory
# -------------------------------------------
echo ""
echo "📁 Creating project directory..."
sudo mkdir -p /var/www/sims-infus
sudo chown -R $USER:www-data /var/www/sims-infus
sudo chmod -R 775 /var/www/sims-infus

# -------------------------------------------
# Summary
# -------------------------------------------
echo ""
echo "============================================"
echo "✅ Server setup completed!"
echo "============================================"
echo ""
echo "Installed:"
echo "  - PHP 8.2 + FPM"
echo "  - MySQL"
echo "  - Nginx"
echo "  - Composer"
echo "  - Node.js 20.x"
echo "  - Redis"
echo ""
echo "Next steps:"
echo "  1. Configure MySQL root password"
echo "  2. Upload your project to /var/www/sims-infus"
echo "  3. Run: bash 02-deploy-app.sh"
echo ""
echo "Don't forget to:"
echo "  - Set AWS Security Group: open ports 80, 443, 22"
echo "  - Get your public IP from EC2 dashboard"
echo ""
