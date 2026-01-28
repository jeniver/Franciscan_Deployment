-- =============================================
-- Grant EXECUTE Permission on ReceiptReport Stored Procedure
-- =============================================
-- This script grants EXECUTE permission on the ReceiptReport stored procedure
-- to the database user specified in your .env file (DB_USER)
--
-- IMPORTANT: Run this script as a user with sysadmin or db_owner permissions
-- =============================================

USE [FransiscanTest];
GO

-- Check if the stored procedure exists
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[ReceiptReport]') AND type in (N'P', N'PC'))
BEGIN
    PRINT 'Stored procedure [dbo].[ReceiptReport] found.';
    
    -- Grant EXECUTE permission to the database user
    -- Replace 'franciscan_api' with your actual DB_USER from .env file
    -- For Windows Authentication, use format: [DOMAIN\username] or [SERVER\username]
    
    -- Option 1: If using SQL Server Authentication (DB_USER = franciscan_api)
    IF EXISTS (SELECT * FROM sys.database_principals WHERE name = 'franciscan_api')
    BEGIN
        GRANT EXECUTE ON [dbo].[ReceiptReport] TO [franciscan_api];
        PRINT '✅ EXECUTE permission granted to [franciscan_api]';
    END
    ELSE
    BEGIN
        PRINT '⚠️  User [franciscan_api] not found. Checking for Windows Auth user...';
    END
    
    -- Option 2: If using Windows Authentication (DB_USER = JENIVER\geniv or similar)
    -- Uncomment and modify the line below based on your actual Windows user
    -- IF EXISTS (SELECT * FROM sys.database_principals WHERE name = 'JENIVER\geniv')
    -- BEGIN
    --     GRANT EXECUTE ON [dbo].[ReceiptReport] TO [JENIVER\geniv];
    --     PRINT '✅ EXECUTE permission granted to [JENIVER\geniv]';
    -- END
    
    -- Option 3: Grant to public role (less secure, but works for all users)
    -- Uncomment only if you want all database users to execute this procedure
    -- GRANT EXECUTE ON [dbo].[ReceiptReport] TO [public];
    -- PRINT '✅ EXECUTE permission granted to [public] role';
    
    -- Option 4: Note - Cannot grant to db_datareader/db_datawriter as they are special fixed roles
    -- If your user is a member of these roles, they will inherit permissions automatically
    -- To grant to all users, you can grant to the 'public' role instead (see Option 3 above)
    PRINT '💡 Note: Cannot grant to fixed database roles (db_datareader/db_datawriter)';
    PRINT '💡 If user is in those roles, they will inherit permissions automatically';
    
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
END
ELSE
BEGIN
    PRINT '❌ ERROR: Stored procedure [dbo].[ReceiptReport] not found!';
    PRINT 'Please ensure the stored procedure exists in the database.';
END
GO

