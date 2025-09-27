#!/bin/bash

# BookScanner Deployment Script for Ubuntu Server
# This script sets up the BookScanner application on an Ubuntu server

set -e  # Exit on any error

echo "🚀 Starting BookScanner deployment..."

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   echo "❌ This script should not be run as root for security reasons"
   exit 1
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    echo "Run: curl -fsSL https://get.docker.com -o get-docker.sh && sh get-docker.sh"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    echo "Run: sudo curl -L \"https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-\$(uname -s)-\$(uname -m)\" -o /usr/local/bin/docker-compose && sudo chmod +x /usr/local/bin/docker-compose"
    exit 1
fi

# Create project directory
PROJECT_DIR="/srv/bookscanner"
echo "📁 Setting up project directory at $PROJECT_DIR..."

sudo mkdir -p $PROJECT_DIR
sudo chown $USER:$USER $PROJECT_DIR

# Copy project files
echo "📋 Copying project files..."
cp -r . $PROJECT_DIR/
cd $PROJECT_DIR

# Set up environment file
echo "⚙️  Setting up environment configuration..."
if [ ! -f .env ]; then
    echo "❌ .env file not found. Please create one with your configuration."
    echo "Required variables:"
    echo "  - POSTGRES_URL (your Neon database URL)"
    echo "  - REDIS_URL (your Upstash Redis URL)"
    echo "  - GROQ_API_KEY"
    echo "  - GOOGLE_VISION_API_KEY"
    echo "  - GOOGLEBOOKS_API_KEY"
    echo "  - NVIDIA_API_KEY"
    echo "  - ADMIN_TOKEN (secure random token)"
    echo "  - JWT_SECRET (secure random secret)"
    exit 1
fi

# Create nginx directory
mkdir -p nginx

# Set proper permissions
echo "🔐 Setting up permissions..."
sudo chown -R $USER:$USER $PROJECT_DIR
chmod +x deploy.sh

# Build and start services
echo "🔨 Building and starting services..."
docker-compose down --remove-orphans || true
docker-compose build --no-cache
docker-compose up -d

# Wait for services to be healthy
echo "⏳ Waiting for services to start..."
sleep 30

# Check if services are running
echo "🔍 Checking service status..."
docker-compose ps

# Test the application
echo "🧪 Testing application..."
if curl -f http://localhost/health > /dev/null 2>&1; then
    echo "✅ Application is running successfully!"
    echo "🌐 Access your application at: http://$(curl -s ifconfig.me)/"
else
    echo "❌ Application health check failed. Check logs with: docker-compose logs"
    exit 1
fi

echo "🎉 Deployment completed successfully!"
echo ""
echo "📋 Useful commands:"
echo "  View logs: docker-compose logs -f"
echo "  Restart: docker-compose restart"
echo "  Stop: docker-compose down"
echo "  Update: git pull && docker-compose up -d --build"
echo ""
echo "🔧 Configuration files:"
echo "  Nginx config: $PROJECT_DIR/nginx/default.conf"
echo "  Environment: $PROJECT_DIR/.env"
echo "  Docker Compose: $PROJECT_DIR/docker-compose.yml"
