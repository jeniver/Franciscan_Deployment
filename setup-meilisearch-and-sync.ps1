# Script to setup Meilisearch and sync all data
# Run this script from PowerShell as Administrator

Write-Host "=== Meilisearch Setup and Data Sync Script ===" -ForegroundColor Green

# Check if Chocolatey is installed
if (!(Get-Command choco -ErrorAction SilentlyContinue)) {
    Write-Host "Installing Chocolatey package manager..." -ForegroundColor Yellow
    Set-ExecutionPolicy Bypass -Scope Process -Force
    [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
    iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
}

# Install Meilisearch using Chocolatey
Write-Host "Installing Meilisearch..." -ForegroundColor Yellow
choco install meilisearch -y

# Create Meilisearch data directory
$meilisearchDataDir = "C:\meilisearch-data"
if (!(Test-Path $meilisearchDataDir)) {
    New-Item -ItemType Directory -Path $meilisearchDataDir
    Write-Host "Created Meilisearch data directory: $meilisearchDataDir" -ForegroundColor Green
}

# Start Meilisearch as a service
Write-Host "Starting Meilisearch service..." -ForegroundColor Yellow
meilisearch --db-path="$meilisearchDataDir" --http-addr="127.0.0.1:7700" --master-key="masterKey" --no-analytics &

# Wait for Meilisearch to start
Write-Host "Waiting for Meilisearch to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Test Meilisearch connection
try {
    $response = Invoke-WebRequest -Uri "http://127.0.0.1:7700/health" -Method GET
    if ($response.StatusCode -eq 200) {
        Write-Host "Meilisearch is running successfully!" -ForegroundColor Green
    }
} catch {
    Write-Host "Failed to connect to Meilisearch. Please check if it's running." -ForegroundColor Red
    exit 1
}

# Navigate to the Node.js backend directory
Set-Location "Fransiscan-Nodejs-BE"

# Install Node.js dependencies if needed
if (!(Test-Path "node_modules")) {
    Write-Host "Installing Node.js dependencies..." -ForegroundColor Yellow
    npm install
}

# Set environment variables for Meilisearch
$env:MEILISEARCH_HOST = "http://127.0.0.1:7700"
$env:MEILISEARCH_API_KEY = "masterKey"
$env:MEILISEARCH_ENABLED = "true"

Write-Host "Environment variables set:" -ForegroundColor Green
Write-Host "MEILISEARCH_HOST: $env:MEILISEARCH_HOST"
Write-Host "MEILISEARCH_API_KEY: $env:MEILISEARCH_API_KEY"
Write-Host "MEILISEARCH_ENABLED: $env:MEILISEARCH_ENABLED"

# Start the Node.js application
Write-Host "Starting Node.js application..." -ForegroundColor Yellow
npm start &

# Wait for the application to start
Write-Host "Waiting for application to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

# Test the application
try {
    $appResponse = Invoke-WebRequest -Uri "http://localhost:3000/api/search/health" -Method GET -ErrorAction SilentlyContinue
    if ($appResponse.StatusCode -eq 200) {
        Write-Host "Application is running successfully!" -ForegroundColor Green
    }
} catch {
    Write-Host "Application may still be starting up..." -ForegroundColor Yellow
}

Write-Host "`n=== Setup Complete ===" -ForegroundColor Green
Write-Host "Meilisearch is running on http://127.0.0.1:7700" -ForegroundColor Cyan
Write-Host "Application is running on http://localhost:3000" -ForegroundColor Cyan
Write-Host "`nTo sync all data to Meilisearch, use the following endpoints:" -ForegroundColor Yellow
Write-Host "1. Initialize index: POST http://localhost:3000/api/search/initialize-index" -ForegroundColor White
Write-Host "2. Force full sync: POST http://localhost:3000/api/search/force-sync?fullSync=true" -ForegroundColor White
Write-Host "3. Check health: GET http://localhost:3000/api/search/health" -ForegroundColor White

Write-Host "`nExample curl commands:" -ForegroundColor Yellow
Write-Host "curl -X POST http://localhost:3000/api/search/initialize-index" -ForegroundColor White
Write-Host "curl -X POST http://localhost:3000/api/search/force-sync?fullSync=true" -ForegroundColor White
Write-Host "curl -X GET http://localhost:3000/api/search/health" -ForegroundColor White