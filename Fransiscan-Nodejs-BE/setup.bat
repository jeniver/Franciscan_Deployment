@echo off
REM Franciscan Node.js Backend Setup Script for Windows
REM This script helps set up the development environment

echo 🚀 Franciscan Node.js Backend Setup
echo ====================================

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js 18+ first.
    pause
    exit /b 1
)

echo ✅ Node.js version: 
node --version

REM Check if npm is installed
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ npm is not installed. Please install npm first.
    pause
    exit /b 1
)

echo ✅ npm version: 
npm --version

REM Create logs directory
echo 📁 Creating logs directory...
if not exist logs mkdir logs
echo ✅ Logs directory created

REM Install dependencies
echo 📦 Installing dependencies...
npm install

if %errorlevel% equ 0 (
    echo ✅ Dependencies installed successfully
) else (
    echo ❌ Failed to install dependencies
    pause
    exit /b 1
)

REM Copy environment file if it doesn't exist
if not exist .env (
    echo 📝 Creating .env file from template...
    copy env.example .env
    echo ✅ .env file created. Please update it with your configuration.
) else (
    echo ✅ .env file already exists
)

REM Check if Docker is installed (optional)
docker --version >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Docker is available
    docker-compose --version >nul 2>&1
    if %errorlevel% equ 0 (
        echo ✅ Docker Compose is available
    ) else (
        echo ⚠️  Docker Compose not found. Install it for containerized deployment.
    )
) else (
    echo ⚠️  Docker not found. Install it for containerized deployment.
)

REM Run linting
echo 🔍 Running code linting...
npm run lint

if %errorlevel% equ 0 (
    echo ✅ Code linting passed
) else (
    echo ⚠️  Code linting found issues. Run 'npm run lint:fix' to fix them.
)

REM Run tests
echo 🧪 Running tests...
npm test

if %errorlevel% equ 0 (
    echo ✅ Tests passed
) else (
    echo ⚠️  Some tests failed. Check the output above.
)

echo.
echo 🎉 Setup completed successfully!
echo.
echo Next steps:
echo 1. Update .env file with your database configuration
echo 2. Ensure SQL Server is running and accessible
echo 3. Run 'npm run dev' to start the development server
echo 4. Visit http://192.168.1.24:3000/health to check if the API is running
echo.
echo For Docker deployment:
echo 1. Run 'npm run docker:compose' to start with Docker Compose
echo 2. Run 'npm run docker:build' to build Docker image
echo.
echo For more information, see README.md
pause
