-- =============================================
-- Remove Duplicate Invoice/Receipt Tables
-- Aligns database with ASP.NET schema from document
-- =============================================

USE [fms_db_new];
GO

PRINT '============================================';
PRINT 'Removing Duplicate Invoice Tables';
PRINT '============================================';
PRINT '';

-- =============================================
-- STEP 1: Backup existing data from duplicate tables (if needed)
-- =============================================

-- Check if Invoices table has data
IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Invoices')
BEGIN
    DECLARE @InvoicesCount INT;
    SELECT @InvoicesCount = COUNT(*) FROM Invoices;
    
    IF @InvoicesCount > 0
    BEGIN
        PRINT '⚠️  WARNING: Invoices table contains ' + CAST(@InvoicesCount AS NVARCHAR) + ' records!';
        PRINT '⚠️  These records will be LOST if you drop this table.';
        PRINT '⚠️  Please backup or migrate data before proceeding.';
        PRINT '';
        
        -- Optional: Create backup table
        IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Invoices_Backup')
        BEGIN
            SELECT * INTO Invoices_Backup FROM Invoices;
            PRINT '✅ Created backup table: Invoices_Backup';
        END
    END
    ELSE
    BEGIN
        PRINT '✅ Invoices table is empty, safe to drop.';
    END
END
GO

-- Check if InvoiceDetails table has data
IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'InvoiceDetails')
BEGIN
    DECLARE @InvoiceDetailsCount INT;
    SELECT @InvoiceDetailsCount = COUNT(*) FROM InvoiceDetails;
    
    IF @InvoiceDetailsCount > 0
    BEGIN
        PRINT '⚠️  WARNING: InvoiceDetails table contains ' + CAST(@InvoiceDetailsCount AS NVARCHAR) + ' records!';
        PRINT '⚠️  These records will be LOST if you drop this table.';
        PRINT '';
        
        -- Optional: Create backup table
        IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'InvoiceDetails_Backup')
        BEGIN
            SELECT * INTO InvoiceDetails_Backup FROM InvoiceDetails;
            PRINT '✅ Created backup table: InvoiceDetails_Backup';
        END
    END
    ELSE
    BEGIN
        PRINT '✅ InvoiceDetails table is empty, safe to drop.';
    END
END
GO

PRINT '';
PRINT '============================================';
PRINT 'STEP 2: Verify Correct Tables Exist';
PRINT '============================================';
PRINT '';

-- Verify correct Invoice table exists
IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Invoice')
BEGIN
    PRINT '✅ Correct table exists: Invoice';
    
    -- Show row count
    DECLARE @InvoiceCount INT;
    SELECT @InvoiceCount = COUNT(*) FROM Invoice;
    PRINT '   Records: ' + CAST(@InvoiceCount AS NVARCHAR);
END
ELSE
BEGIN
    PRINT '❌ ERROR: Correct table "Invoice" does NOT exist!';
    PRINT '   Cannot proceed - this table is required.';
    RAISERROR('Required table "Invoice" does not exist', 16, 1);
END
GO

-- Verify correct InvoiceDetail table exists
IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'InvoiceDetail')
BEGIN
    PRINT '✅ Correct table exists: InvoiceDetail';
    
    -- Show row count
    DECLARE @InvoiceDetailCount INT;
    SELECT @InvoiceDetailCount = COUNT(*) FROM InvoiceDetail;
    PRINT '   Records: ' + CAST(@InvoiceDetailCount AS NVARCHAR);
END
ELSE
BEGIN
    PRINT '❌ ERROR: Correct table "InvoiceDetail" does NOT exist!';
    PRINT '   Cannot proceed - this table is required.';
    RAISERROR('Required table "InvoiceDetail" does not exist', 16, 1);
END
GO

-- Verify correct Receipt table exists
IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Receipt')
BEGIN
    PRINT '✅ Correct table exists: Receipt';
    
    -- Show row count
    DECLARE @ReceiptCount INT;
    SELECT @ReceiptCount = COUNT(*) FROM Receipt;
    PRINT '   Records: ' + CAST(@ReceiptCount AS NVARCHAR);
END
ELSE
BEGIN
    PRINT '❌ ERROR: Correct table "Receipt" does NOT exist!';
    RAISERROR('Required table "Receipt" does not exist', 16, 1);
END
GO

-- Verify correct MisalaniousReceiptDetail table exists
IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'MisalaniousReceiptDetail')
BEGIN
    PRINT '✅ Correct table exists: MisalaniousReceiptDetail';
    
    -- Show row count
    DECLARE @MisalaniousCount INT;
    SELECT @MisalaniousCount = COUNT(*) FROM MisalaniousReceiptDetail;
    PRINT '   Records: ' + CAST(@MisalaniousCount AS NVARCHAR);
END
ELSE
BEGIN
    PRINT '❌ ERROR: Correct table "MisalaniousReceiptDetail" does NOT exist!';
    RAISERROR('Required table "MisalaniousReceiptDetail" does not exist', 16, 1);
END
GO

PRINT '';
PRINT '============================================';
PRINT 'STEP 3: Drop Duplicate Tables';
PRINT '============================================';
PRINT '';

-- Drop InvoiceDetails table (DUPLICATE)
IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'InvoiceDetails')
BEGIN
    DROP TABLE InvoiceDetails;
    PRINT '✅ Dropped duplicate table: InvoiceDetails';
END
ELSE
BEGIN
    PRINT '⏭️  Table InvoiceDetails already does not exist';
END
GO

-- Drop Invoices table (DUPLICATE)
IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Invoices')
BEGIN
    DROP TABLE Invoices;
    PRINT '✅ Dropped duplicate table: Invoices';
END
ELSE
BEGIN
    PRINT '⏭️  Table Invoices already does not exist';
END
GO

PRINT '';
PRINT '============================================';
PRINT 'STEP 4: Verify Schema Alignment';
PRINT '============================================';
PRINT '';

-- Verify Invoice table schema matches document
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    CHARACTER_MAXIMUM_LENGTH,
    IS_NULLABLE,
    COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'Invoice'
ORDER BY ORDINAL_POSITION;
GO

PRINT '';
PRINT '============================================';
PRINT 'Schema Cleanup Complete!';
PRINT '============================================';
PRINT '';
PRINT 'Next Steps:';
PRINT '1. Update backend code to use correct table names';
PRINT '2. Test invoice/receipt creation';
PRINT '3. Verify all existing data is accessible';
PRINT '';
PRINT '✅ Database schema now matches ASP.NET document!';
GO

