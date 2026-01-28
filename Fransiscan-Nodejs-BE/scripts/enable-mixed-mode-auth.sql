-- Enable Mixed Mode Authentication (Windows + SQL Server)
-- Run this in SSMS as Administrator, then RESTART SQL Server service

USE master;
GO

-- Enable Mixed Mode Authentication (2 = Mixed Mode, 1 = Windows Only)
EXEC xp_instance_regwrite 
    N'HKEY_LOCAL_MACHINE', 
    N'Software\Microsoft\MSSQLServer\MSSQLServer', 
    N'LoginMode', 
    REG_DWORD, 
    2;
GO

PRINT '✅ Mixed Mode Authentication enabled!';
PRINT '';
PRINT '⚠️  IMPORTANT: You must RESTART SQL Server service for changes to take effect!';
PRINT '   Run this in PowerShell as Administrator:';
PRINT '   Restart-Service MSSQL$SQLEXPRESS';
PRINT '';
PRINT '   Or use Services.msc:';
PRINT '   1. Press Win+R, type: services.msc';
PRINT '   2. Find "SQL Server (SQLEXPRESS)"';
PRINT '   3. Right-click → Restart';
GO

