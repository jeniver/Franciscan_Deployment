-- Alternative SQL Server Port Configuration
-- This script uses SQL Server's configuration system instead of direct registry access

USE [master];
GO

-- Enable advanced options
EXEC sp_configure 'show advanced options', 1;
RECONFIGURE;
GO

-- Configure default instance port (MSSQLSERVER)
-- This sets the default instance to use port 1433
EXEC xp_instance_regwrite 
    N'HKEY_LOCAL_MACHINE',
    N'Software\Microsoft\Microsoft SQL Server\MSSQLSERVER\MSSQLServer\SuperSocketNetLib\Tcp\IPAll',
    N'TcpPort',
    REG_SZ,
    N'1433';
GO

-- Configure SQLEXPRESS02 port
-- Try multiple possible registry paths
DECLARE @Success BIT = 0;

-- Try SQL Server 2019 path (MSSQL15)
BEGIN TRY
    EXEC xp_instance_regwrite 
        N'HKEY_LOCAL_MACHINE',
        N'Software\Microsoft\Microsoft SQL Server\MSSQL15.SQLEXPRESS02\MSSQLServer\SuperSocketNetLib\Tcp\IPAll',
        N'TcpPort',
        REG_SZ,
        N'1434';
    EXEC xp_instance_regwrite 
        N'HKEY_LOCAL_MACHINE',
        N'Software\Microsoft\Microsoft SQL Server\MSSQL15.SQLEXPRESS02\MSSQLServer\SuperSocketNetLib\Tcp\IPAll',
        N'TcpDynamicPorts',
        REG_SZ,
        N'';
    SET @Success = 1;
    PRINT 'Successfully configured SQLEXPRESS02 on SQL Server 2019 path';
END TRY
BEGIN CATCH
    PRINT 'Failed to configure SQL Server 2019 path';
END CATCH

-- If first attempt failed, try SQL Server 2016 path (MSSQL13)
IF @Success = 0
BEGIN
    BEGIN TRY
        EXEC xp_instance_regwrite 
            N'HKEY_LOCAL_MACHINE',
            N'Software\Microsoft\Microsoft SQL Server\MSSQL13.SQLEXPRESS02\MSSQLServer\SuperSocketNetLib\Tcp\IPAll',
            N'TcpPort',
            REG_SZ,
            N'1434';
        EXEC xp_instance_regwrite 
            N'HKEY_LOCAL_MACHINE',
            N'Software\Microsoft\Microsoft SQL Server\MSSQL13.SQLEXPRESS02\MSSQLServer\SuperSocketNetLib\Tcp\IPAll',
            N'TcpDynamicPorts',
            REG_SZ,
            N'';
        SET @Success = 1;
        PRINT 'Successfully configured SQLEXPRESS02 on SQL Server 2016 path';
    END TRY
    BEGIN CATCH
        PRINT 'Failed to configure SQL Server 2016 path';
    END CATCH
END

-- If still failed, try generic path
IF @Success = 0
BEGIN
    BEGIN TRY
        EXEC xp_instance_regwrite 
            N'HKEY_LOCAL_MACHINE',
            N'Software\Microsoft\Microsoft SQL Server\SQLEXPRESS02\MSSQLServer\SuperSocketNetLib\Tcp\IPAll',
            N'TcpPort',
            REG_SZ,
            N'1434';
        EXEC xp_instance_regwrite 
            N'HKEY_LOCAL_MACHINE',
            N'Software\Microsoft\Microsoft SQL Server\SQLEXPRESS02\MSSQLServer\SuperSocketNetLib\Tcp\IPAll',
            N'TcpDynamicPorts',
            REG_SZ,
            N'';
        SET @Success = 1;
        PRINT 'Successfully configured SQLEXPRESS02 on generic path';
    END TRY
    BEGIN CATCH
        PRINT 'Failed to configure generic path';
    END CATCH
END

-- Verify configuration
PRINT '=== VERIFICATION ===';

-- Check SQLEXPRESS02 configuration
BEGIN TRY
    DECLARE @TcpPort NVARCHAR(10);
    EXEC xp_instance_regread 
        N'HKEY_LOCAL_MACHINE',
        N'Software\Microsoft\Microsoft SQL Server\MSSQL15.SQLEXPRESS02\MSSQLServer\SuperSocketNetLib\Tcp\IPAll',
        N'TcpPort',
        @TcpPort OUTPUT;
    PRINT 'SQLEXPRESS02 TcpPort: ' + ISNULL(@TcpPort, 'NOT SET');
END TRY
BEGIN CATCH
    PRINT 'Could not read SQLEXPRESS02 configuration';
END CATCH

-- Check default instance configuration
BEGIN TRY
    DECLARE @DefaultPort NVARCHAR(10);
    EXEC xp_instance_regread 
        N'HKEY_LOCAL_MACHINE',
        N'Software\Microsoft\Microsoft SQL Server\MSSQLSERVER\MSSQLServer\SuperSocketNetLib\Tcp\IPAll',
        N'TcpPort',
        @DefaultPort OUTPUT;
    PRINT 'MSSQLSERVER TcpPort: ' + ISNULL(@DefaultPort, 'NOT SET');
END TRY
BEGIN CATCH
    PRINT 'Could not read MSSQLSERVER configuration';
END CATCH

PRINT '';
IF @Success = 1
BEGIN
    PRINT '=== CONFIGURATION COMPLETE ===';
    PRINT '✅ Port configuration applied successfully';
    PRINT '';
    PRINT 'IMPORTANT: RESTART SQL SERVER SERVICES FOR CHANGES TO TAKE EFFECT';
    PRINT 'Run: PowerShell -ExecutionPolicy Bypass -File scripts\restart-sql-services.ps1';
    PRINT '';
    PRINT 'After restart, test with:';
    PRINT 'sqlcmd -S localhost,1434 -U franciscan_api -P "Franciscan@2024!" -d FransiscanTest -Q "SELECT 1"';
END
ELSE
BEGIN
    PRINT '=== CONFIGURATION FAILED ===';
    PRINT '❌ Could not configure ports through SQL Server';
    PRINT 'Manual configuration required through SQL Server Configuration Manager';
END