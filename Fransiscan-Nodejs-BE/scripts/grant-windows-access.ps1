# PowerShell script to grant Windows user SQL Server access
# Run as Administrator

param(
    [string]$Server = "localhost\SQLEXPRESS",
    [string]$Database = "FransiscanTest",
    [string]$WindowsUser = "JENIVER\geniv",
    [string]$SqlAdminUser = "",
    [string]$SqlAdminPassword = ""
)

Write-Host "Granting Windows user SQL Server access..." -ForegroundColor Cyan
Write-Host ""

# Check if sqlcmd is available
$sqlcmdPath = Get-Command sqlcmd -ErrorAction SilentlyContinue
if (-not $sqlcmdPath) {
    Write-Host "sqlcmd not found. Please install SQL Server Command Line Utilities." -ForegroundColor Red
    exit 1
}

# Build SQL commands as a single string
$sqlScript = "USE master;`nGO`nIF NOT EXISTS (SELECT * FROM sys.server_principals WHERE name = '$WindowsUser' AND type = 'U')`nBEGIN`n    CREATE LOGIN [$WindowsUser] FROM WINDOWS;`n    PRINT 'Created Windows login';`nEND`nELSE`nBEGIN`n    PRINT 'Windows login already exists';`nEND`nGO`n`nUSE [$Database];`nGO`nIF NOT EXISTS (SELECT * FROM sys.database_principals WHERE name = '$WindowsUser')`nBEGIN`n    CREATE USER [$WindowsUser] FOR LOGIN [$WindowsUser];`n    PRINT 'Created database user';`nEND`nELSE`nBEGIN`n    PRINT 'Database user already exists';`nEND`nGO`n`nALTER ROLE db_datareader ADD MEMBER [$WindowsUser];`nALTER ROLE db_datawriter ADD MEMBER [$WindowsUser];`nALTER ROLE db_ddladmin ADD MEMBER [$WindowsUser];`nGO`n`nPRINT 'Permissions granted successfully!';`nGO"

# Save to temp file
$tempFile = [System.IO.Path]::GetTempFileName() + ".sql"
$sqlScript | Out-File -FilePath $tempFile -Encoding UTF8

Write-Host "Configuration:" -ForegroundColor Yellow
Write-Host "   Server: $Server"
Write-Host "   Database: $Database"
Write-Host "   Windows User: $WindowsUser"
Write-Host ""

# Execute SQL
Write-Host "Executing SQL script..." -ForegroundColor Cyan
try {
    if ($SqlAdminUser -and $SqlAdminPassword) {
        # Use SQL authentication
        $result = sqlcmd -S $Server -U $SqlAdminUser -P $SqlAdminPassword -i $tempFile -b 2>&1
    } else {
        # Use Windows authentication (current user must be admin)
        $result = sqlcmd -S $Server -i $tempFile -b 2>&1
    }
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host $result
        Write-Host ""
        Write-Host "Setup complete!" -ForegroundColor Green
        Write-Host "   Windows user [$WindowsUser] now has access to SQL Server."
        Write-Host ""
        Write-Host "Next steps:" -ForegroundColor Yellow
        Write-Host "   1. Restart your application"
        Write-Host "   2. Test: npm run test-db"
    } else {
        Write-Host "SQL execution returned exit code: $LASTEXITCODE" -ForegroundColor Yellow
        Write-Host "   Output: $result" -ForegroundColor Gray
        Write-Host ""
        Write-Host "If you got permission errors, try:" -ForegroundColor Yellow
        Write-Host "   npm run switch-to-sql-auth"
    }
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Alternative: Switch to SQL Server Authentication" -ForegroundColor Yellow
    Write-Host "   npm run switch-to-sql-auth"
}

# Clean up
Remove-Item $tempFile -ErrorAction SilentlyContinue
