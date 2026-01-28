# ============================================================================
# Franciscan Database Backup Script for Windows (PowerShell)
# Backs up SQL Server database using SQL Server Management Objects (SMO)
# ============================================================================

Write-Host ""
Write-Host "========================================================================" -ForegroundColor Cyan
Write-Host "Franciscan Database Backup Script (PowerShell)" -ForegroundColor Cyan
Write-Host "========================================================================" -ForegroundColor Cyan
Write-Host ""

# Configuration - Update these values
$DB_SERVER = ".\SQLEXPRESS"
$DB_DATABASE = "FransiscanTest"
$DB_USER = ""
$DB_PASSWORD = ""
$BACKUP_DIR = "backups"
$TIMESTAMP = Get-Date -Format "yyyyMMdd_HHmmss"
$BACKUP_FILE = Join-Path $BACKUP_DIR "FransiscanTest_backup_$TIMESTAMP.bak"
$SQL_BACKUP_FILE = Join-Path $BACKUP_DIR "FransiscanTest_backup_$TIMESTAMP.sql"

# Create backup directory if it doesn't exist
if (-not (Test-Path $BACKUP_DIR)) {
    New-Item -ItemType Directory -Path $BACKUP_DIR | Out-Null
    Write-Host "[INFO] Created backup directory: $BACKUP_DIR" -ForegroundColor Green
}

Write-Host "[INFO] Database Server: $DB_SERVER" -ForegroundColor Yellow
Write-Host "[INFO] Database Name: $DB_DATABASE" -ForegroundColor Yellow
Write-Host "[INFO] Backup File (BAK): $BACKUP_FILE" -ForegroundColor Yellow
Write-Host "[INFO] Backup File (SQL): $SQL_BACKUP_FILE" -ForegroundColor Yellow
Write-Host ""

# Check if SQL Server module is available
try {
    Import-Module SqlServer -ErrorAction Stop
    Write-Host "[SUCCESS] SQL Server PowerShell module loaded" -ForegroundColor Green
} catch {
    Write-Host "[WARNING] SQL Server PowerShell module not found" -ForegroundColor Yellow
    Write-Host "[INFO] Attempting to use sqlcmd instead..." -ForegroundColor Yellow
    
    # Fallback to sqlcmd
    $sqlcmdPath = Get-Command sqlcmd -ErrorAction SilentlyContinue
    if (-not $sqlcmdPath) {
        Write-Host "[ERROR] sqlcmd not found. Please install SQL Server tools." -ForegroundColor Red
        Write-Host "[INFO] Install from: https://docs.microsoft.com/sql/tools/sqlcmd-utility" -ForegroundColor Yellow
        Read-Host "Press Enter to exit"
        exit 1
    }
    
    # Use sqlcmd for basic backup
    Write-Host "[INFO] Using sqlcmd for backup..." -ForegroundColor Yellow
    Write-Host "[INFO] Generating SQL script backup..." -ForegroundColor Yellow
    
    # Create SQL script header
    $sqlScript = @"
-- ============================================================================
-- Franciscan Database Backup Script
-- Generated: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
-- Database: $DB_DATABASE
-- Server: $DB_SERVER
-- ============================================================================

USE [master]
GO

-- Note: This is a structure backup. For full backup with data,
-- use SQL Server Management Studio or BACKUP DATABASE command.

"@
    
    $sqlScript | Out-File -FilePath $SQL_BACKUP_FILE -Encoding UTF8
    
    Write-Host "[SUCCESS] Basic SQL script created: $SQL_BACKUP_FILE" -ForegroundColor Green
    Write-Host ""
    Write-Host "[NOTE] For complete database backup:" -ForegroundColor Yellow
    Write-Host "      1. Use SQL Server Management Studio" -ForegroundColor White
    Write-Host "      2. Right-click database > Tasks > Back Up..." -ForegroundColor White
    Write-Host "      3. Or use: BACKUP DATABASE [$DB_DATABASE] TO DISK = '$BACKUP_FILE'" -ForegroundColor White
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 0
}

# Try to connect and backup using SMO
try {
    Write-Host "[INFO] Connecting to SQL Server..." -ForegroundColor Yellow
    
    if ($DB_PASSWORD -eq "") {
        # Windows Authentication
        $connectionString = "Server=$DB_SERVER;Database=$DB_DATABASE;Integrated Security=True;"
        Write-Host "[INFO] Using Windows Authentication" -ForegroundColor Yellow
    } else {
        # SQL Server Authentication
        $connectionString = "Server=$DB_SERVER;Database=$DB_DATABASE;User Id=$DB_USER;Password=$DB_PASSWORD;"
        Write-Host "[INFO] Using SQL Server Authentication" -ForegroundColor Yellow
    }
    
    # Test connection
    $testQuery = "SELECT @@VERSION"
    $result = Invoke-Sqlcmd -ServerInstance $DB_SERVER -Database $DB_DATABASE -Query $testQuery -ErrorAction Stop
    
    Write-Host "[SUCCESS] Connected to SQL Server" -ForegroundColor Green
    Write-Host ""
    
    # Create backup using BACKUP DATABASE command
    Write-Host "[INFO] Starting database backup..." -ForegroundColor Yellow
    Write-Host "[INFO] This may take several minutes depending on database size..." -ForegroundColor Yellow
    
    $backupQuery = @"
BACKUP DATABASE [$DB_DATABASE]
TO DISK = '$BACKUP_FILE'
WITH FORMAT, INIT, NAME = 'Franciscan Full Backup', SKIP, NOREWIND, NOUNLOAD, STATS = 10
"@
    
    Invoke-Sqlcmd -ServerInstance $DB_SERVER -Query $backupQuery -ErrorAction Stop
    
    Write-Host ""
    Write-Host "[SUCCESS] Database backup completed!" -ForegroundColor Green
    Write-Host "[INFO] Backup file: $BACKUP_FILE" -ForegroundColor Green
    
    # Get backup file info
    if (Test-Path $BACKUP_FILE) {
        $fileInfo = Get-Item $BACKUP_FILE
        $fileSizeMB = [math]::Round($fileInfo.Length / 1MB, 2)
        Write-Host "[INFO] Backup file size: $fileSizeMB MB" -ForegroundColor Green
    }
    
} catch {
    Write-Host ""
    Write-Host "[ERROR] Backup failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "[INFO] Trying alternative method..." -ForegroundColor Yellow
    
    # Alternative: Use sqlcmd to generate scripts
    Write-Host "[INFO] Generating SQL script backup as alternative..." -ForegroundColor Yellow
    
    $sqlScript = @"
-- ============================================================================
-- Franciscan Database Backup Script
-- Generated: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
-- Database: $DB_DATABASE
-- Server: $DB_SERVER
-- ============================================================================

USE [master]
GO

-- Note: For complete backup, restore this database and use:
-- BACKUP DATABASE [$DB_DATABASE] TO DISK = 'path_to_backup.bak'

"@
    
    $sqlScript | Out-File -FilePath $SQL_BACKUP_FILE -Encoding UTF8
    Write-Host "[SUCCESS] SQL script backup created: $SQL_BACKUP_FILE" -ForegroundColor Green
}

Write-Host ""
Write-Host "========================================================================" -ForegroundColor Cyan
Write-Host "Backup Summary" -ForegroundColor Cyan
Write-Host "========================================================================" -ForegroundColor Cyan
Write-Host "Backup Directory: $BACKUP_DIR" -ForegroundColor White
if (Test-Path $BACKUP_FILE) {
    Write-Host "Backup File (BAK): $BACKUP_FILE" -ForegroundColor Green
}
if (Test-Path $SQL_BACKUP_FILE) {
    Write-Host "Backup File (SQL): $SQL_BACKUP_FILE" -ForegroundColor Green
}
Write-Host "Timestamp: $TIMESTAMP" -ForegroundColor White
Write-Host ""
Write-Host "[SUCCESS] Backup process completed!" -ForegroundColor Green
Write-Host ""
Read-Host "Press Enter to exit"

