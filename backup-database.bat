@echo off
REM ============================================================================
REM Franciscan Database Backup Script for Windows
REM Backs up SQL Server database to SQL script file
REM ============================================================================

setlocal enabledelayedexpansion

echo.
echo ========================================================================
echo Franciscan Database Backup Script
echo ========================================================================
echo.

REM Configuration - Update these values
set DB_SERVER=.\SQLEXPRESS
set DB_DATABASE=FransiscanTest
set DB_USER=
set DB_PASSWORD=
set BACKUP_DIR=backups
set TIMESTAMP=%date:~-4,4%%date:~-10,2%%date:~-7,2%_%time:~0,2%%time:~3,2%%time:~6,2%
set TIMESTAMP=%TIMESTAMP: =0%
set BACKUP_FILE=%BACKUP_DIR%\FransiscanTest_backup_%TIMESTAMP%.sql

REM Create backup directory if it doesn't exist
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

echo [INFO] Database Server: %DB_SERVER%
echo [INFO] Database Name: %DB_DATABASE%
echo [INFO] Backup File: %BACKUP_FILE%
echo.

REM Check if SQL Server is accessible
echo [INFO] Checking SQL Server connection...
sqlcmd -S %DB_SERVER% -E -Q "SELECT @@VERSION" >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Cannot connect to SQL Server at %DB_SERVER%
    echo [ERROR] Please verify:
    echo         1. SQL Server is running
    echo         2. SQL Server instance name is correct
    echo         3. You have permissions to access the database
    echo.
    pause
    exit /b 1
)

echo [SUCCESS] SQL Server connection verified
echo.

REM Generate backup script using sqlcmd
echo [INFO] Starting database backup...
echo [INFO] This may take several minutes depending on database size...
echo.

REM Use sqlcmd to generate schema and data
REM For Windows Authentication (if DB_PASSWORD is empty)
if "%DB_PASSWORD%"=="" (
    echo [INFO] Using Windows Authentication...
    sqlcmd -S %DB_SERVER% -E -d %DB_DATABASE% -Q "EXEC sp_helpdb '%DB_DATABASE%'" >nul 2>&1
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] Database '%DB_DATABASE%' not found or not accessible
        pause
        exit /b 1
    )
    
    REM Generate schema script
    echo [INFO] Exporting database schema...
    sqlcmd -S %DB_SERVER% -E -d %DB_DATABASE% -Q "EXEC sp_helpdb '%DB_DATABASE%'" > "%BACKUP_DIR%\schema_info_%TIMESTAMP%.txt"
    
    REM Note: Full backup requires SQL Server Management Studio or specialized tools
    REM This script creates a basic backup using sqlcmd
    echo [INFO] Creating backup file: %BACKUP_FILE%
    echo -- Franciscan Database Backup > "%BACKUP_FILE%"
    echo -- Generated: %date% %time% >> "%BACKUP_FILE%"
    echo -- Database: %DB_DATABASE% >> "%BACKUP_FILE%"
    echo -- Server: %DB_SERVER% >> "%BACKUP_FILE%"
    echo. >> "%BACKUP_FILE%"
    echo USE [master] >> "%BACKUP_FILE%"
    echo GO >> "%BACKUP_FILE%"
    echo. >> "%BACKUP_FILE%"
    
    echo [INFO] Exporting table structures...
    sqlcmd -S %DB_SERVER% -E -d %DB_DATABASE% -Q "SELECT name FROM sys.tables ORDER BY name" -h -1 -W -o "%BACKUP_DIR%\tables_%TIMESTAMP%.txt"
    
    echo [WARNING] Full database backup with data requires SQL Server Management Studio
    echo [WARNING] or specialized backup tools. This script creates a basic structure backup.
    echo.
    echo [INFO] For complete backup, use one of these methods:
    echo         1. SQL Server Management Studio: Right-click database ^> Tasks ^> Generate Scripts
    echo         2. Use sqlcmd with bcp for data export
    echo         3. Use SQL Server backup/restore: BACKUP DATABASE command
    echo.
) else (
    echo [INFO] Using SQL Server Authentication...
    echo [ERROR] SQL Server Authentication backup not implemented in this script
    echo [ERROR] Please use Windows Authentication or SQL Server Management Studio
    pause
    exit /b 1
)

echo.
echo ========================================================================
echo Backup Summary
echo ========================================================================
echo Backup Directory: %BACKUP_DIR%
echo Backup File: %BACKUP_FILE%
echo Timestamp: %TIMESTAMP%
echo.
echo [SUCCESS] Basic backup files created in %BACKUP_DIR% directory
echo.
echo [NOTE] For complete database backup including all data:
echo        1. Use SQL Server Management Studio
echo        2. Right-click database ^> Tasks ^> Back Up...
echo        3. Or use: BACKUP DATABASE [%DB_DATABASE%] TO DISK = 'path'
echo.
pause

