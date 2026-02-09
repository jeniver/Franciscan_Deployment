@echo off
echo === Installing and Setting up Meilisearch ===

REM Check if Chocolatey is installed
where choco >nul 2>&1
if %errorlevel% neq 0 (
    echo Installing Chocolatey...
    powershell -Command "Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))"
)

REM Install Meilisearch
echo Installing Meilisearch...
choco install meilisearch -y

REM Create data directory
if not exist "C:\meilisearch-data" mkdir "C:\meilisearch-data"

REM Start Meilisearch in background
echo Starting Meilisearch...
start /b meilisearch --db-path="C:\meilisearch-data" --http-addr="127.0.0.1:7700" --master-key="masterKey" --no-analytics

REM Wait for Meilisearch to start
echo Waiting for Meilisearch to start...
timeout /t 10 /nobreak >nul

REM Test connection
echo Testing Meilisearch connection...
powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://127.0.0.1:7700/health' -Method GET; if ($response.StatusCode -eq 200) { Write-Host 'Meilisearch is running!' -ForegroundColor Green } } catch { Write-Host 'Failed to connect to Meilisearch' -ForegroundColor Red }"

echo.
echo === Meilisearch Setup Complete ===
echo Meilisearch should now be running on http://127.0.0.1:7700
echo.
echo Next steps:
echo 1. Make sure your Node.js application is running
echo 2. Set environment variables:
echo    set MEILISEARCH_HOST=http://127.0.0.1:7700
echo    set MEILISEARCH_API_KEY=masterKey  
echo    set MEILISEARCH_ENABLED=true
echo 3. Initialize index: POST /api/search/initialize-index
echo 4. Sync data: POST /api/search/force-sync?fullSync=true