# PowerShell script to install Meilisearch manually
# This bypasses Chocolatey lock issues

Write-Host "=== Meilisearch Manual Installation ===" -ForegroundColor Green

# Create installation directory
$installDir = "C:\meilisearch"
$dataDir = "C:\meilisearch-data"
$configDir = "C:\meilisearch-config"

if (!(Test-Path $installDir)) {
    New-Item -ItemType Directory -Path $installDir -Force
    Write-Host "Created installation directory: $installDir" -ForegroundColor Yellow
}

if (!(Test-Path $dataDir)) {
    New-Item -ItemType Directory -Path $dataDir -Force
    Write-Host "Created data directory: $dataDir" -ForegroundColor Yellow
}

if (!(Test-Path $configDir)) {
    New-Item -ItemType Directory -Path $configDir -Force
    Write-Host "Created config directory: $configDir" -ForegroundColor Yellow
}

# Download Meilisearch binary directly from GitHub
Write-Host "Downloading Meilisearch..." -ForegroundColor Yellow

$downloadUrl = "https://github.com/meilisearch/meilisearch/releases/download/v1.8.3/meilisearch-windows-amd64.exe"
$exePath = "$installDir\meilisearch.exe"

try {
    Invoke-WebRequest -Uri $downloadUrl -OutFile $exePath -ErrorAction Stop
    Write-Host "Download completed successfully!" -ForegroundColor Green
} catch {
    Write-Host "Failed to download from GitHub. Trying alternative method..." -ForegroundColor Red
    
    # Alternative: Use curl if available
    if (Get-Command curl -ErrorAction SilentlyContinue) {
        curl -L $downloadUrl -o $exePath
        if (Test-Path $exePath) {
            Write-Host "Download completed with curl!" -ForegroundColor Green
        } else {
            Write-Host "Failed to download Meilisearch. Please download manually from:" -ForegroundColor Red
            Write-Host "https://github.com/meilisearch/meilisearch/releases/latest" -ForegroundColor Cyan
            Write-Host "And place the exe file in: $installDir" -ForegroundColor Cyan
            exit 1
        }
    } else {
        Write-Host "curl not available. Please download manually from:" -ForegroundColor Red
        Write-Host "https://github.com/meilisearch/meilisearch/releases/latest" -ForegroundColor Cyan
        Write-Host "And place the exe file in: $installDir" -ForegroundColor Cyan
        exit 1
    }
}

# Verify the download
if (Test-Path $exePath) {
    $fileInfo = Get-Item $exePath
    Write-Host "Downloaded file size: $($fileInfo.Length) bytes" -ForegroundColor Yellow
    
    # Make executable
    Unblock-File $exePath -ErrorAction SilentlyContinue
    Write-Host "File permissions set successfully" -ForegroundColor Green
} else {
    Write-Host "Download failed - file not found!" -ForegroundColor Red
    exit 1
}

# Create configuration file
$configContent = @"
# Meilisearch Configuration
db_path = '$dataDir'
http_addr = '127.0.0.1:7700'
master_key = 'masterKey123'
environment = 'development'
log_level = 'INFO'
"@

$configPath = "$configDir\meilisearch.toml"
$configContent | Out-File -FilePath $configPath -Encoding UTF8
Write-Host "Configuration file created: $configPath" -ForegroundColor Green

# Create Windows service or startup script
$startupScript = @"
@echo off
echo Starting Meilisearch...
echo Database path: $dataDir
echo Config file: $configPath
echo Press Ctrl+C to stop

cd /d "$installDir"
meilisearch.exe --config-file="$configPath"

pause
"@

$startupPath = "$installDir\start-meilisearch.bat"
$startupScript | Out-File -FilePath $startupPath -Encoding ASCII
Write-Host "Startup script created: $startupPath" -ForegroundColor Green

# Test the installation
Write-Host "`n=== Testing Installation ===" -ForegroundColor Green
Write-Host "Starting Meilisearch briefly to test..." -ForegroundColor Yellow

# Start Meilisearch in background for testing
Start-Process -FilePath $exePath -ArgumentList "--config-file=`"$configPath`"" -WindowStyle Hidden

# Wait a moment for startup
Start-Sleep -Seconds 3

# Test if it's running
try {
    $response = Invoke-WebRequest -Uri "http://127.0.0.1:7700/health" -UseBasicParsing -TimeoutSec 5
    if ($response.StatusCode -eq 200) {
        Write-Host "SUCCESS: Meilisearch is running and accessible!" -ForegroundColor Green
        Write-Host "Health check response: $($response.Content)" -ForegroundColor Yellow
    } else {
        Write-Host "Meilisearch started but returned status: $($response.StatusCode)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "Could not verify Meilisearch is running. You may need to start it manually." -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Stop the test instance
Get-Process meilisearch -ErrorAction SilentlyContinue | Stop-Process -Force

Write-Host "`n=== Installation Complete ===" -ForegroundColor Green
Write-Host "Installation Location: $installDir" -ForegroundColor Yellow
Write-Host "Data Directory: $dataDir" -ForegroundColor Yellow
Write-Host "Config File: $configPath" -ForegroundColor Yellow
Write-Host "Startup Script: $startupPath" -ForegroundColor Yellow
Write-Host ""
Write-Host "To start Meilisearch:" -ForegroundColor Cyan
Write-Host "  Method 1: Run '$startupPath'" -ForegroundColor White
Write-Host "  Method 2: Run 'meilisearch.exe --config-file=`"$configPath`"' from $installDir" -ForegroundColor White
Write-Host "  Method 3: Add $installDir to your PATH and run 'meilisearch'" -ForegroundColor White
Write-Host ""
Write-Host "Meilisearch will be accessible at: http://127.0.0.1:7700" -ForegroundColor Green
Write-Host "Master Key: masterKey123" -ForegroundColor Green