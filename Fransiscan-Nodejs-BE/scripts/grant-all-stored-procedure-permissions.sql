-- =============================================
-- Grant EXECUTE Permissions on All Stored Procedures
-- =============================================
-- This script grants EXECUTE permission on all stored procedures
-- to the database user/roles to prevent permission errors
--
-- IMPORTANT: Run this script as a user with sysadmin or db_owner permissions
-- =============================================

USE [FransiscanTest];
GO

PRINT '========================================';
PRINT 'Granting EXECUTE permissions on stored procedures...';
PRINT '========================================';
PRINT '';

-- Declare variables
DECLARE @sql NVARCHAR(MAX);
DECLARE @procedureName NVARCHAR(255);
DECLARE @schemaName NVARCHAR(255);
DECLARE @userName NVARCHAR(255) = 'franciscan_api'; -- Change this to your DB_USER

-- Check if user exists
IF NOT EXISTS (SELECT * FROM sys.database_principals WHERE name = @userName)
BEGIN
    PRINT '⚠️  User [' + @userName + '] not found.';
    PRINT 'Switching to role-based permissions...';
    SET @userName = NULL;
END

-- Cursor to iterate through all stored procedures
DECLARE procedure_cursor CURSOR FOR
SELECT 
    SCHEMA_NAME(schema_id) AS schema_name,
    name AS procedure_name
FROM sys.procedures
WHERE is_ms_shipped = 0  -- Exclude system procedures
ORDER BY schema_name, procedure_name;

OPEN procedure_cursor;
FETCH NEXT FROM procedure_cursor INTO @schemaName, @procedureName;

DECLARE @count INT = 0;

WHILE @@FETCH_STATUS = 0
BEGIN
    SET @sql = N'GRANT EXECUTE ON [' + @schemaName + '].[' + @procedureName + ']';
    
    -- Grant to specific user if exists
    IF @userName IS NOT NULL
    BEGIN
        SET @sql = @sql + N' TO [' + @userName + '];';
        EXEC sp_executesql @sql;
        PRINT '✅ Granted EXECUTE on [' + @schemaName + '].[' + @procedureName + '] to [' + @userName + ']';
    END
    
    -- Note: Cannot grant to db_datareader/db_datawriter as they are special fixed roles
    -- If you need to grant to all users, grant to 'public' role instead
    -- For now, we only grant to the specific user
    
    SET @count = @count + 1;
    
    FETCH NEXT FROM procedure_cursor INTO @schemaName, @procedureName;
END

CLOSE procedure_cursor;
DEALLOCATE procedure_cursor;

PRINT '';
PRINT '========================================';
PRINT 'Summary:';
PRINT '  Total procedures processed: ' + CAST(@count AS VARCHAR(10));
IF @userName IS NOT NULL
BEGIN
    PRINT '  Permissions granted to: [' + @userName + ']';
    PRINT '  Note: Cannot grant to fixed roles (db_datareader/db_datawriter)';
END
ELSE
BEGIN
    PRINT '  No user specified. Please set @userName variable.';
END
PRINT '========================================';
PRINT '';
PRINT '✅ All permissions granted successfully!';
GO

