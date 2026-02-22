#!/bin/bash

# Franciscan Node.js Backend Setup Script
# This script helps set up the development environment

echo "🚀 Franciscan Node.js Backend Setup"
echo "===================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js version: $(node -v)"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ npm version: $(npm -v)"

# Create logs directory
echo "📁 Creating logs directory..."
mkdir -p logs
echo "✅ Logs directory created"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -eq 0 ]; then
    echo "✅ Dependencies installed successfully"
else
    echo "❌ Failed to install dependencies"
    exit 1
fi

# Copy environment file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp env.example .env
    echo "✅ .env file created. Please update it with your configuration."
else
    echo "✅ .env file already exists"
fi

# Check if Docker is installed (optional)
if command -v docker &> /dev/null; then
    echo "✅ Docker is available"
    if command -v docker-compose &> /dev/null; then
        echo "✅ Docker Compose is available"
    else
        echo "⚠️  Docker Compose not found. Install it for containerized deployment."
    fi
else
    echo "⚠️  Docker not found. Install it for containerized deployment."
fi

# Run linting
echo "🔍 Running code linting..."
npm run lint

if [ $? -eq 0 ]; then
    echo "✅ Code linting passed"
else
    echo "⚠️  Code linting found issues. Run 'npm run lint:fix' to fix them."
fi

# Run tests
echo "🧪 Running tests..."
npm test

if [ $? -eq 0 ]; then
    echo "✅ Tests passed"
else
    echo "⚠️  Some tests failed. Check the output above."
fi

echo ""
echo "🎉 Setup completed successfully!"
echo ""
echo "Next steps:"
echo "1. Update .env file with your database configuration"
echo "2. Ensure SQL Server is running and accessible"
echo "3. Run 'npm run dev' to start the development server"
echo "4. Visit http://192.168.1.24:3000/health to check if the API is running"
echo ""
echo "For Docker deployment:"
echo "1. Run 'npm run docker:compose' to start with Docker Compose"
echo "2. Run 'npm run docker:build' to build Docker image"
echo ""
echo "For more information, see README.md"
