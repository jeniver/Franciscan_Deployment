# PowerShell script to add RelationshipToNominee columns to NicheApplicationBeneficiary table
# This script runs the SQL migration to fix beneficiary null values

Write-Host "================================" -ForegroundColor Cyan
Write-Host "Beneficiary Schema Update" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Get SQL Server connection details from .env or use defaults
$envFile = Join-Path $PSScriptRoot "..\\.env"
if (Test-Path $envFile) {
    Write-Host "📄 Reading database configuration from .env..." -ForegroundColor Yellow
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^DB_SERVER=(.*)$') { $dbServer = $matches[1] }
        if ($_ -match '^DB_DATABASE=(.*)$') { $dbName = $matches[1] }
        if ($_ -match '^DB_USER=(.*)$') { $dbUser = $matches[1] }
        if ($_ -match '^DB_PASSWORD=(.*)$') { $dbPassword = $matches[1] }
    }
}

# Set defaults if not found in .env
if (-not $dbServer) { $dbServer = "localhost" }
if (-not $dbName) { $dbName = "fms_db_new" }
if (-not $dbUser) { $dbUser = "fms_user" }

Write-Host "📊 Database Server: $dbServer" -ForegroundColor Gray
Write-Host "📊 Database Name: $dbName" -ForegroundColor Gray
Write-Host "📊 Database User: $dbUser" -ForegroundColor Gray
Write-Host ""

$sqlScript = Join-Path $PSScriptRoot "add-beneficiary-nominee-relationships.sql"

if (-not (Test-Path $sqlScript)) {
    Write-Host "❌ Error: SQL script not found at: $sqlScript" -ForegroundColor Red
    exit 1
}

Write-Host "🚀 Running database migration..." -ForegroundColor Green
Write-Host ""

try {
    if ($dbPassword) {
        # SQL Authentication
        sqlcmd -S $dbServer -d $dbName -U $dbUser -P $dbPassword -i $sqlScript -b
    } else {
        # Windows Authentication
        sqlcmd -S $dbServer -d $dbName -E -i $sqlScript -b
    }
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ Migration completed successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Next steps:" -ForegroundColor Cyan
        Write-Host "  1. Restart the backend server" -ForegroundColor White
        Write-Host "  2. Test creating a beneficiary via the API" -ForegroundColor White
        Write-Host "  3. Verify that relationshipToNominee1 and relationshipToNominee2 are no longer null" -ForegroundColor White
    } else {
        Write-Host ""
        Write-Host "❌ Migration failed with exit code: $LASTEXITCODE" -ForegroundColor Red
        Write-Host ""
        Write-Host "Troubleshooting:" -ForegroundColor Yellow
        Write-Host "  - Check if SQL Server is running" -ForegroundColor White
        Write-Host "  - Verify database name: $dbName" -ForegroundColor White
        Write-Host "  - Verify connection settings in .env file" -ForegroundColor White
        Write-Host "  - Check SQL Server authentication (Windows vs SQL Auth)" -ForegroundColor White
        exit 1
    }
} catch {
    Write-Host ""
    Write-Host "❌ Error running migration: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Make sure sqlcmd is installed:" -ForegroundColor Yellow
    Write-Host "  - Download from: https://docs.microsoft.com/en-us/sql/tools/sqlcmd-utility" -ForegroundColor White
    exit 1
}

Write-Host ""
Write-Host "================================" -ForegroundColor Cyan

