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
        echo "          - MSSQL_SA_PASSWORD"
        echo "          - MSSQL_BACKUP_FILE (place .bak in mssql-backups/)"
        echo "          - DB_USER / DB_PASSWORD"
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

# Create mssql-backups directory
if [ ! -d "mssql-backups" ]; then
    echo "[INFO] Creating mssql-backups directory..."
    mkdir -p mssql-backups
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
echo "4. SQL Server: localhost:1433"
echo ""
echo "[SUCCESS] Setup complete!"
echo ""

