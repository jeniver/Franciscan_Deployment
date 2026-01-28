# Complete fix for SQL Server user franciscan_api
# Run as Administrator

param(
    [string]$Server = "localhost\SQLEXPRESS",
    [string]$Database = "FransiscanTest",
    [string]$LoginName = "franciscan_api",
    [string]$Password = "Franciscan@2024!",
    [string]$SqlAdminUser = "",
    [string]$SqlAdminPassword = ""
)

Write-Host "Fixing SQL Server user configuration..." -ForegroundColor Cyan
Write-Host ""

# Check if sqlcmd is available
$sqlcmdPath = Get-Command sqlcmd -ErrorAction SilentlyContinue
if (-not $sqlcmdPath) {
    Write-Host "sqlcmd not found. Please install SQL Server Command Line Utilities." -ForegroundColor Red
    exit 1
}

# Build SQL script
$sqlScript = "USE master;`nGO`nIF EXISTS (SELECT * FROM sys.sql_logins WHERE name = '$LoginName')`nBEGIN`n    ALTER LOGIN [$LoginName] WITH PASSWORD = '$Password';`n    PRINT 'Password reset for login';`nEND`nELSE`nBEGIN`n    CREATE LOGIN [$LoginName] WITH PASSWORD = '$Password', DEFAULT_DATABASE = [$Database], CHECK_EXPIRATION = OFF, CHECK_POLICY = ON;`n    PRINT 'Created login';`nEND`nGO`n`nUSE [$Database];`nGO`nIF EXISTS (SELECT * FROM sys.database_principals WHERE name = '$LoginName')`nBEGIN`n    ALTER USER [$LoginName] WITH LOGIN = [$LoginName];`n    PRINT 'User mapped to login';`nEND`nELSE`nBEGIN`n    CREATE USER [$LoginName] FOR LOGIN [$LoginName];`n    PRINT 'Created database user';`nEND`nGO`n`nALTER ROLE db_datareader ADD MEMBER [$LoginName];`nALTER ROLE db_datawriter ADD MEMBER [$LoginName];`nALTER ROLE db_ddladmin ADD MEMBER [$LoginName];`nGO`n`nPRINT 'Setup complete!';`nGO"

# Save to temp file
$tempFile = [System.IO.Path]::GetTempFileName() + ".sql"
$sqlScript | Out-File -FilePath $tempFile -Encoding UTF8

Write-Host "Configuration:" -ForegroundColor Yellow
Write-Host "   Server: $Server"
Write-Host "   Database: $Database"
Write-Host "   Login: $LoginName"
Write-Host ""

# Execute SQL
Write-Host "Executing SQL script..." -ForegroundColor Cyan
try {
    if ($SqlAdminUser -and $SqlAdminPassword) {
        $result = sqlcmd -S $Server -U $SqlAdminUser -P $SqlAdminPassword -i $tempFile -b 2>&1
    } else {
        $result = sqlcmd -S $Server -i $tempFile -b 2>&1
    }
    
    Write-Host ""
    Write-Host $result
    Write-Host ""
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Setup complete!" -ForegroundColor Green
        Write-Host "   User [$LoginName] is now configured with password [$Password]"
        Write-Host ""
        Write-Host "Next steps:" -ForegroundColor Yellow
        Write-Host "   1. Restart your application"
        Write-Host "   2. Test: npm run test-db"
    } else {
        Write-Host "SQL execution returned exit code: $LASTEXITCODE" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "If you got permission errors, provide SQL admin credentials:" -ForegroundColor Yellow
        Write-Host "   npm run fix-sql-user -- -SqlAdminUser sa -SqlAdminPassword YourPassword"
    }
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}

# Clean up
Remove-Item $tempFile -ErrorAction SilentlyContinue

