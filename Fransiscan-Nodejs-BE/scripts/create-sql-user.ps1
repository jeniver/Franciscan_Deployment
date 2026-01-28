# PowerShell script to create SQL Server user for Franciscan application
# Run this script as Administrator

param(
    [string]$Server = "localhost",
    [string]$Database = "FransiscanTest",
    [string]$LoginName = "franciscan_api",
    [string]$Password = "Franciscan@2024!",
    [string]$SqlAdminUser = "sa",
    [string]$SqlAdminPassword = ""
)

Write-Host "🔧 Creating SQL Server user for Franciscan application..." -ForegroundColor Cyan
Write-Host ""

# Check if sqlcmd is available
$sqlcmdPath = Get-Command sqlcmd -ErrorAction SilentlyContinue
if (-not $sqlcmdPath) {
    Write-Host "❌ sqlcmd not found. Please install SQL Server Command Line Utilities." -ForegroundColor Red
    Write-Host "   Download from: https://docs.microsoft.com/en-us/sql/tools/sqlcmd-utility" -ForegroundColor Yellow
    exit 1
}

Write-Host "📋 Configuration:" -ForegroundColor Yellow
Write-Host "   Server: $Server"
Write-Host "   Database: $Database"
Write-Host "   Login: $LoginName"
Write-Host ""

# Create login
Write-Host "1️⃣ Creating SQL Server login..." -ForegroundColor Cyan
$createLoginQuery = @"
IF NOT EXISTS (SELECT * FROM sys.sql_logins WHERE name = '$LoginName')
BEGIN
    CREATE LOGIN [$LoginName] 
    WITH PASSWORD = '$Password',
         DEFAULT_DATABASE = [$Database],
         CHECK_EXPIRATION = OFF,
         CHECK_POLICY = ON;
    PRINT 'Login [$LoginName] created successfully.';
END
ELSE
BEGIN
    PRINT 'Login [$LoginName] already exists.';
END
"@

try {
    if ($SqlAdminPassword) {
        $result = sqlcmd -S $Server -U $SqlAdminUser -P $SqlAdminPassword -Q $createLoginQuery -b
    } else {
        $result = sqlcmd -S $Server -Q $createLoginQuery -b
    }
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ Login created successfully" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  Login creation returned exit code: $LASTEXITCODE" -ForegroundColor Yellow
        Write-Host "   Output: $result" -ForegroundColor Gray
        Write-Host "   💡 Tip: You may need to provide SQL admin credentials:" -ForegroundColor Yellow
        Write-Host "      powershell -File scripts/create-sql-user.ps1 -SqlAdminUser sa -SqlAdminPassword YourPassword" -ForegroundColor Gray
    }
} catch {
    Write-Host "   ❌ Error creating login: $_" -ForegroundColor Red
    Write-Host "   💡 Tip: You may need to provide SQL admin credentials:" -ForegroundColor Yellow
    Write-Host "      powershell -File scripts/create-sql-user.ps1 -SqlAdminUser sa -SqlAdminPassword YourPassword" -ForegroundColor Gray
    exit 1
}

Write-Host ""

# Create database user and grant permissions
Write-Host "2️⃣ Creating database user and granting permissions..." -ForegroundColor Cyan
$createUserQuery = @"
USE [$Database];
GO

IF NOT EXISTS (SELECT * FROM sys.database_principals WHERE name = '$LoginName')
BEGIN
    CREATE USER [$LoginName] FOR LOGIN [$LoginName];
    ALTER ROLE db_datareader ADD MEMBER [$LoginName];
    ALTER ROLE db_datawriter ADD MEMBER [$LoginName];
    ALTER ROLE db_ddladmin ADD MEMBER [$LoginName];
    PRINT 'User [$LoginName] created and granted permissions successfully.';
END
ELSE
BEGIN
    PRINT 'User [$LoginName] already exists in database.';
    -- Grant permissions if not already granted
    ALTER ROLE db_datareader ADD MEMBER [$LoginName];
    ALTER ROLE db_datawriter ADD MEMBER [$LoginName];
    ALTER ROLE db_ddladmin ADD MEMBER [$LoginName];
    PRINT 'Permissions granted to existing user.';
END
"@

try {
    if ($SqlAdminPassword) {
        $result = sqlcmd -S $Server -d $Database -U $SqlAdminUser -P $SqlAdminPassword -Q $createUserQuery -b
    } else {
        $result = sqlcmd -S $Server -d $Database -Q $createUserQuery -b
    }
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ User created and permissions granted" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  User creation returned exit code: $LASTEXITCODE" -ForegroundColor Yellow
        Write-Host "   Output: $result" -ForegroundColor Gray
        Write-Host "   💡 Tip: You may need to provide SQL admin credentials:" -ForegroundColor Yellow
        Write-Host "      powershell -File scripts/create-sql-user.ps1 -SqlAdminUser sa -SqlAdminPassword YourPassword" -ForegroundColor Gray
    }
} catch {
    Write-Host "   ❌ Error creating user: $_" -ForegroundColor Red
    Write-Host "   💡 Tip: You may need to provide SQL admin credentials:" -ForegroundColor Yellow
    Write-Host "      powershell -File scripts/create-sql-user.ps1 -SqlAdminUser sa -SqlAdminPassword YourPassword" -ForegroundColor Gray
    exit 1
}

Write-Host ''
Write-Host 'Setup complete!' -ForegroundColor Green
Write-Host ''
Write-Host 'Next steps:' -ForegroundColor Yellow
Write-Host '   1. Your .env file should already be configured:' -ForegroundColor White
Write-Host "      DB_USER=$LoginName" -ForegroundColor Gray
Write-Host "      DB_PASSWORD=$Password" -ForegroundColor Gray
Write-Host '   2. Restart your application' -ForegroundColor White
Write-Host '   3. Test connection: npm run test-db' -ForegroundColor White
Write-Host ''

