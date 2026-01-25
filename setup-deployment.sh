#!/bin/bash
# ============================================================================
# Franciscan Application Deployment Setup Script for Linux/Mac
# ============================================================================

set -e

echo ""
echo "========================================================================"
echo "Franciscan Application Deployment Setup"
echo "========================================================================"
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "[ERROR] Docker is not installed. Please install Docker first."
    echo "        Download from: https://www.docker.com/products/docker-desktop"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "[ERROR] Docker Compose is not installed."
    exit 1
fi

echo "[SUCCESS] Docker and Docker Compose are installed"
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "[INFO] Creating .env file from template..."
    if [ -f env-template.txt ]; then
        cp env-template.txt .env
        echo "[SUCCESS] .env file created"
        echo "[WARNING] Please edit .env file and update:"
        echo "          - MYSQL_ROOT_PASSWORD"
        echo "          - MYSQL_PASSWORD"
        echo "          - JWT_SECRET"
        echo ""
        read -p "Press Enter to continue after editing .env file..."
    else
        echo "[ERROR] env-template.txt not found"
        exit 1
    fi
else
    echo "[INFO] .env file already exists"
fi

# Create mysql-init directory if it doesn't exist
if [ ! -d "mysql-init" ]; then
    echo "[INFO] Creating mysql-init directory..."
    mkdir -p mysql-init
    echo "[INFO] Place SQL initialization scripts here"
fi

# Create mysql-backups directory
if [ ! -d "mysql-backups" ]; then
    echo "[INFO] Creating mysql-backups directory..."
    mkdir -p mysql-backups
fi

echo ""
echo "========================================================================"
echo "Building and Starting Docker Containers"
echo "========================================================================"
echo ""
echo "[INFO] This may take several minutes on first run..."
echo ""

docker-compose up -d --build

echo ""
echo "[INFO] Waiting for services to initialize..."
sleep 15

echo ""
echo "========================================================================"
echo "Deployment Status"
echo "========================================================================"
echo ""

docker-compose ps

echo ""
echo "========================================================================"
echo "Next Steps"
echo "========================================================================"
echo ""
echo "1. Check logs: docker-compose logs -f"
echo "2. Backend API: http://localhost:3000"
echo "3. Frontend: http://localhost:3001"
echo "4. MySQL: localhost:3306"
echo ""
echo "[SUCCESS] Setup complete!"
echo ""

