@echo off
REM ============================================================================
REM Franciscan Application Deployment Setup Script for Windows
REM ============================================================================

echo.
echo ========================================================================
echo Franciscan Application Deployment Setup
echo ========================================================================
echo.

REM Check if Docker is installed
where docker >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Docker is not installed. Please install Docker Desktop first.
    echo         Download from: https://www.docker.com/products/docker-desktop
    pause
    exit /b 1
)

REM Check if Docker Compose is installed
where docker-compose >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Docker Compose is not installed.
    pause
    exit /b 1
)

echo [SUCCESS] Docker and Docker Compose are installed
echo.

REM Check if .env file exists
if not exist .env (
    echo [INFO] Creating .env file from template...
    if exist env-template.txt (
        copy env-template.txt .env >nul
        echo [SUCCESS] .env file created
        echo [WARNING] Please edit .env file and update:
        echo           - MSSQL_SA_PASSWORD
        echo           - MSSQL_BACKUP_FILE (place .bak in mssql-backups/)
        echo           - DB_USER / DB_PASSWORD
        echo           - JWT_SECRET
        echo.
        pause
    ) else (
        echo [ERROR] env-template.txt not found
        pause
        exit /b 1
    )
) else (
    echo [INFO] .env file already exists
)

REM Create mssql-backups directory
if not exist mssql-backups (
    echo [INFO] Creating mssql-backups directory...
    mkdir mssql-backups
)

echo.
echo ========================================================================
echo Building and Starting Docker Containers
echo ========================================================================
echo.
echo [INFO] This may take several minutes on first run...
echo.

docker-compose up -d --build

if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to start containers
    pause
    exit /b 1
)

echo.
echo [INFO] Waiting for services to initialize...
timeout /t 15 /nobreak >nul

echo.
echo ========================================================================
echo Deployment Status
echo ========================================================================
echo.

docker-compose ps

echo.
echo ========================================================================
echo Next Steps
echo ========================================================================
echo.
echo 1. Check logs: docker-compose logs -f
echo 2. Backend API: http://localhost:3000
echo 3. Frontend: http://localhost:3001
echo 4. SQL Server: localhost:1433
echo.
echo [SUCCESS] Setup complete!
echo.
pause

