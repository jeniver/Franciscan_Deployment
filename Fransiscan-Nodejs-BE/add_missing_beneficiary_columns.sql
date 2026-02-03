-- Add missing RelationshipToNominee columns to NicheApplicationBeneficiary table
-- For FransiscanTest database

USE [FransiscanTest];
GO

PRINT '============================================';
PRINT 'Adding Missing Beneficiary Columns';
PRINT '============================================';
PRINT '';

-- Add RelationshipToNominee1 column
IF NOT EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID('NicheApplicationBeneficiary') 
    AND name = 'RelationshipToNominee1'
)
BEGIN
    ALTER TABLE NicheApplicationBeneficiary
    ADD RelationshipToNominee1 NVARCHAR(100) NULL;
    
    PRINT '✅ Added column: RelationshipToNominee1';
END
ELSE
BEGIN
    PRINT '⏭️  Column RelationshipToNominee1 already exists';
END
GO

-- Add RelationshipToNominee2 column
IF NOT EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID('NicheApplicationBeneficiary') 
    AND name = 'RelationshipToNominee2'
)
BEGIN
    ALTER TABLE NicheApplicationBeneficiary
    ADD RelationshipToNominee2 NVARCHAR(100) NULL;
    
    PRINT '✅ Added column: RelationshipToNominee2';
END
ELSE
BEGIN
    PRINT '⏭️  Column RelationshipToNominee2 already exists';
END
GO

-- Verify columns were added
PRINT '';
PRINT '============================================';
PRINT 'Verification';
PRINT '============================================';
PRINT '';

SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    CHARACTER_MAXIMUM_LENGTH,
    IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'NicheApplicationBeneficiary'
ORDER BY ORDINAL_POSITION;
GO

PRINT '';
PRINT '✅ Migration Complete!';
PRINT '';
PRINT 'Next step: Restart your backend server';
GO