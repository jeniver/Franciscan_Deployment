-- ============================================================================
-- Grant Windows User Access to SQL Server and Database
-- Run this in SQL Server Management Studio as Administrator
-- ============================================================================
-- This script grants your Windows user (JENIVER\geniv) access to SQL Server
-- ============================================================================

USE master;
GO

-- Get the current Windows user (you may need to adjust this)
-- Replace 'JENIVER\geniv' with your actual Windows username if different
DECLARE @WindowsUser NVARCHAR(128) = 'JENIVER\geniv';

PRINT '============================================================================';
PRINT 'Granting Windows Authentication Access';
PRINT '============================================================================';
PRINT 'Windows User: ' + @WindowsUser;
PRINT '';

-- Check if Windows login already exists
IF EXISTS (SELECT * FROM sys.server_principals WHERE name = @WindowsUser AND type = 'U')
BEGIN
    PRINT '✅ Windows login [' + @WindowsUser + '] already exists.';
END
ELSE
BEGIN
    -- Create Windows login
    DECLARE @CreateLoginSQL NVARCHAR(MAX) = 'CREATE LOGIN [' + @WindowsUser + '] FROM WINDOWS;';
    EXEC sp_executesql @CreateLoginSQL;
    PRINT '✅ Created Windows login [' + @WindowsUser + '].';
END
GO

-- Switch to the application database
USE [FransiscanTest];
GO

DECLARE @WindowsUser NVARCHAR(128) = 'JENIVER\geniv';

-- Check if database user already exists
IF EXISTS (SELECT * FROM sys.database_principals WHERE name = @WindowsUser)
BEGIN
    PRINT '✅ Database user [' + @WindowsUser + '] already exists.';
    
    -- Ensure user is mapped to the login
    DECLARE @MapUserSQL NVARCHAR(MAX) = 'ALTER USER [' + @WindowsUser + '] WITH LOGIN = [' + @WindowsUser + '];';
    EXEC sp_executesql @MapUserSQL;
    PRINT '✅ User mapped to login.';
END
ELSE
BEGIN
    -- Create database user
    DECLARE @CreateUserSQL NVARCHAR(MAX) = 'CREATE USER [' + @WindowsUser + '] FOR LOGIN [' + @WindowsUser + '];';
    EXEC sp_executesql @CreateUserSQL;
    PRINT '✅ Created database user [' + @WindowsUser + '].';
END
GO

-- Grant permissions
DECLARE @WindowsUser NVARCHAR(128) = 'JENIVER\geniv';

BEGIN TRY
    DECLARE @GrantReadSQL NVARCHAR(MAX) = 'ALTER ROLE db_datareader ADD MEMBER [' + @WindowsUser + '];';
    EXEC sp_executesql @GrantReadSQL;
    PRINT '✅ Granted db_datareader role.';
END TRY
BEGIN CATCH
    IF ERROR_NUMBER() = 15151
        PRINT 'ℹ️  User already has db_datareader role.';
    ELSE
        PRINT '⚠️  Error granting db_datareader: ' + ERROR_MESSAGE();
END CATCH
GO

BEGIN TRY
    DECLARE @WindowsUser NVARCHAR(128) = 'JENIVER\geniv';
    DECLARE @GrantWriteSQL NVARCHAR(MAX) = 'ALTER ROLE db_datawriter ADD MEMBER [' + @WindowsUser + '];';
    EXEC sp_executesql @GrantWriteSQL;
    PRINT '✅ Granted db_datawriter role.';
END TRY
BEGIN CATCH
    IF ERROR_NUMBER() = 15151
        PRINT 'ℹ️  User already has db_datawriter role.';
    ELSE
        PRINT '⚠️  Error granting db_datawriter: ' + ERROR_MESSAGE();
END CATCH
GO

BEGIN TRY
    DECLARE @WindowsUser NVARCHAR(128) = 'JENIVER\geniv';
    DECLARE @GrantDDLSQL NVARCHAR(MAX) = 'ALTER ROLE db_ddladmin ADD MEMBER [' + @WindowsUser + '];';
    EXEC sp_executesql @GrantDDLSQL;
    PRINT '✅ Granted db_ddladmin role.';
END TRY
BEGIN CATCH
    IF ERROR_NUMBER() = 15151
        PRINT 'ℹ️  User already has db_ddladmin role.';
    ELSE
        PRINT '⚠️  Error granting db_ddladmin: ' + ERROR_MESSAGE();
END CATCH
GO

-- Verify the setup
PRINT '';
PRINT '============================================================================';
PRINT 'Verification:';
PRINT '============================================================================';

SELECT 
    'Windows Login Status' AS CheckType,
    CASE 
        WHEN EXISTS (SELECT * FROM sys.server_principals WHERE name = 'JENIVER\geniv' AND type = 'U') 
        THEN '✅ EXISTS' 
        ELSE '❌ MISSING' 
    END AS Status
UNION ALL
SELECT 
    'Database User Status' AS CheckType,
    CASE 
        WHEN EXISTS (SELECT * FROM sys.database_principals WHERE name = 'JENIVER\geniv') 
        THEN '✅ EXISTS' 
        ELSE '❌ MISSING' 
    END AS Status
UNION ALL
SELECT 
    'Has db_datareader' AS CheckType,
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM sys.database_role_members rm
            INNER JOIN sys.database_principals r ON rm.role_principal_id = r.principal_id
            INNER JOIN sys.database_principals m ON rm.member_principal_id = m.principal_id
            WHERE r.name = 'db_datareader' AND m.name = 'JENIVER\geniv'
        )
        THEN '✅ YES' 
        ELSE '❌ NO' 
    END AS Status
UNION ALL
SELECT 
    'Has db_datawriter' AS CheckType,
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM sys.database_role_members rm
            INNER JOIN sys.database_principals r ON rm.role_principal_id = r.principal_id
            INNER JOIN sys.database_principals m ON rm.member_principal_id = m.principal_id
            WHERE r.name = 'db_datawriter' AND m.name = 'JENIVER\geniv'
        )
        THEN '✅ YES' 
        ELSE '❌ NO' 
    END AS Status;
GO

PRINT '';
PRINT '============================================================================';
PRINT '✅ Setup complete!';
PRINT '   Your Windows user (JENIVER\geniv) now has access to SQL Server.';
PRINT '   Restart your application and test the connection.';
PRINT '============================================================================';
GO

