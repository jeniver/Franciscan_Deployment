-- ============================================================================
-- Fix franciscan_api user permissions
-- This script ensures the user exists and has proper database access
-- Run in SQL Server Management Studio as Administrator
-- ============================================================================

USE master;
GO

-- Check if login exists and reset password if needed
IF EXISTS (SELECT * FROM sys.sql_logins WHERE name = 'franciscan_api')
BEGIN
    PRINT '✅ Login [franciscan_api] exists.';
    
    -- Reset password to ensure it matches .env file
    ALTER LOGIN [franciscan_api] WITH PASSWORD = 'Franciscan@2024!';
    PRINT '✅ Password reset for [franciscan_api].';
END
ELSE
BEGIN
    -- Create the login if it doesn't exist
    CREATE LOGIN [franciscan_api] 
    WITH PASSWORD = 'Franciscan@2024!',
         DEFAULT_DATABASE = [FransiscanTest],
         CHECK_EXPIRATION = OFF,
         CHECK_POLICY = ON;
    PRINT '✅ Login [franciscan_api] created.';
END
GO

-- Switch to the application database
USE [FransiscanTest];
GO

-- Check if database user exists
IF EXISTS (SELECT * FROM sys.database_principals WHERE name = 'franciscan_api')
BEGIN
    PRINT '✅ User [franciscan_api] exists in database.';
    
    -- Ensure user is mapped to the login
    ALTER USER [franciscan_api] WITH LOGIN = [franciscan_api];
    PRINT '✅ User mapped to login.';
END
ELSE
BEGIN
    -- Create the database user
    CREATE USER [franciscan_api] FOR LOGIN [franciscan_api];
    PRINT '✅ User [franciscan_api] created in database.';
END
GO

-- Grant all necessary permissions
BEGIN TRY
    ALTER ROLE db_datareader ADD MEMBER [franciscan_api];
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
    ALTER ROLE db_datawriter ADD MEMBER [franciscan_api];
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
    ALTER ROLE db_ddladmin ADD MEMBER [franciscan_api];
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
    'Login Status' AS CheckType,
    CASE 
        WHEN EXISTS (SELECT * FROM sys.sql_logins WHERE name = 'franciscan_api') 
        THEN '✅ EXISTS' 
        ELSE '❌ MISSING' 
    END AS Status
UNION ALL
SELECT 
    'Database User Status' AS CheckType,
    CASE 
        WHEN EXISTS (SELECT * FROM sys.database_principals WHERE name = 'franciscan_api') 
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
            WHERE r.name = 'db_datareader' AND m.name = 'franciscan_api'
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
            WHERE r.name = 'db_datawriter' AND m.name = 'franciscan_api'
        )
        THEN '✅ YES' 
        ELSE '❌ NO' 
    END AS Status;
GO

PRINT '';
PRINT '============================================================================';
PRINT '✅ Setup complete!';
PRINT '   Restart your application and test the connection.';
PRINT '============================================================================';
GO

