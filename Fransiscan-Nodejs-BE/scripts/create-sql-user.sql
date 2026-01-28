-- ============================================================================
-- SQL Script to Create franciscan_api User for Franciscan Application
-- ============================================================================
-- Run this script as SQL Server administrator (sa or Windows admin)
-- Usage: sqlcmd -S localhost -i create-sql-user.sql
-- Or execute in SQL Server Management Studio
-- ============================================================================

USE master;
GO

-- Check if login already exists
IF EXISTS (SELECT * FROM sys.sql_logins WHERE name = 'franciscan_api')
BEGIN
    PRINT 'Login [franciscan_api] already exists.';
    -- Optionally drop and recreate:
    -- DROP LOGIN [franciscan_api];
END
GO

-- Create the SQL Server login
-- ⚠️  CHANGE THE PASSWORD BELOW TO A SECURE PASSWORD!
CREATE LOGIN [franciscan_api] 
WITH PASSWORD = 'Franciscan@2024!SecurePassword',
     DEFAULT_DATABASE = [FransiscanTest],
     CHECK_EXPIRATION = OFF,
     CHECK_POLICY = ON;
GO

PRINT 'Login [franciscan_api] created successfully.';
GO

-- Switch to the application database
USE [FransiscanTest];
GO

-- Check if user already exists
IF EXISTS (SELECT * FROM sys.database_principals WHERE name = 'franciscan_api')
BEGIN
    PRINT 'User [franciscan_api] already exists in database.';
    -- Optionally drop and recreate:
    -- DROP USER [franciscan_api];
END
GO

-- Create the database user and map it to the login
CREATE USER [franciscan_api] FOR LOGIN [franciscan_api];
GO

-- Grant necessary permissions
ALTER ROLE db_datareader ADD MEMBER [franciscan_api];
ALTER ROLE db_datawriter ADD MEMBER [franciscan_api];
ALTER ROLE db_ddladmin ADD MEMBER [franciscan_api]; -- For schema changes if needed
GO

PRINT 'User [franciscan_api] created and granted permissions successfully.';
GO

-- Verify the setup
SELECT 
    'Login' AS Type,
    name AS Name,
    create_date AS CreatedDate
FROM sys.sql_logins
WHERE name = 'franciscan_api'
UNION ALL
SELECT 
    'Database User' AS Type,
    name AS Name,
    create_date AS CreatedDate
FROM sys.database_principals
WHERE name = 'franciscan_api';
GO

PRINT '';
PRINT '============================================================================';
PRINT 'Setup complete!';
PRINT 'Update your .env file with:';
PRINT '  DB_USER=franciscan_api';
PRINT '  DB_PASSWORD=Franciscan@2024!SecurePassword';
PRINT '============================================================================';
GO

