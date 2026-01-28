-- =============================================
-- Quick Fix: Grant EXECUTE Permission on ReceiptReport to PUBLIC
-- =============================================
-- This is the simplest solution - grants permission to PUBLIC role
-- which all database users inherit automatically
--
-- IMPORTANT: Run this script as a user with sysadmin or db_owner permissions
-- =============================================

USE [FransiscanTest];
GO

-- Check if the stored procedure exists
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[ReceiptReport]') AND type in (N'P', N'PC'))
BEGIN
    PRINT 'Stored procedure [dbo].[ReceiptReport] found.';
    
    -- Grant EXECUTE permission to PUBLIC role (all users inherit this)
    GRANT EXECUTE ON [dbo].[ReceiptReport] TO [public];
    PRINT '✅ EXECUTE permission granted to [public] role';
    PRINT '💡 All database users can now execute ReceiptReport';
    
    -- Also try to grant to specific users if they exist
    DECLARE @userName NVARCHAR(255);
    DECLARE @sql NVARCHAR(MAX);
    
    -- List of possible users to grant to
    DECLARE user_cursor CURSOR FOR
    SELECT name FROM sys.database_principals 
    WHERE type IN ('S', 'U', 'G')  -- SQL user, Windows user, Windows group
      AND name NOT IN ('dbo', 'guest', 'INFORMATION_SCHEMA', 'sys')
      AND name NOT LIKE '##%'  -- Exclude system principals
      AND principal_id > 4;  -- Exclude system principals
    
    OPEN user_cursor;
    FETCH NEXT FROM user_cursor INTO @userName;
    
    WHILE @@FETCH_STATUS = 0
    BEGIN
        SET @sql = N'GRANT EXECUTE ON [dbo].[ReceiptReport] TO [' + QUOTENAME(@userName) + N'];';
        BEGIN TRY
            EXEC sp_executesql @sql;
            PRINT '✅ EXECUTE permission granted to [' + @userName + ']';
        END TRY
        BEGIN CATCH
            PRINT '⚠️  Could not grant to [' + @userName + ']: ' + ERROR_MESSAGE();
        END CATCH
        
        FETCH NEXT FROM user_cursor INTO @userName;
    END
    
    CLOSE user_cursor;
    DEALLOCATE user_cursor;
    
    -- Verify permissions
    PRINT '';
    PRINT 'Verifying permissions...';
    SELECT 
        p.name AS principal_name,
        p.type_desc AS principal_type,
        perm.permission_name,
        perm.state_desc AS permission_state,
        obj.name AS object_name
    FROM sys.database_permissions perm
    INNER JOIN sys.objects obj ON perm.major_id = obj.object_id
    INNER JOIN sys.database_principals p ON perm.grantee_principal_id = p.principal_id
    WHERE obj.name = 'ReceiptReport'
        AND perm.type = 'EX'
    ORDER BY p.name;
    
    PRINT '';
    PRINT '✅ Permission grant completed successfully!';
    PRINT '💡 If you still see permission errors, restart your Node.js application';
END
ELSE
BEGIN
    PRINT '❌ ERROR: Stored procedure [dbo].[ReceiptReport] not found!';
    PRINT 'Please ensure the stored procedure exists in the database.';
END
GO

