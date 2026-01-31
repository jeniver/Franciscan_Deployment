-- =============================================
-- Add RelationshipToNominee1 and RelationshipToNominee2 columns
-- to NicheApplicationBeneficiary table
-- =============================================

USE [fms_db_new];
GO

-- Check if columns already exist before adding them
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
    PRINT '⏭️ Column RelationshipToNominee1 already exists';
END
GO

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
    PRINT '⏭️ Column RelationshipToNominee2 already exists';
END
GO

-- Verify the columns were added
SELECT 
    COLUMN_NAME, 
    DATA_TYPE, 
    CHARACTER_MAXIMUM_LENGTH, 
    IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'NicheApplicationBeneficiary'
ORDER BY ORDINAL_POSITION;
GO

PRINT '✅ Schema update completed successfully!';
GO

