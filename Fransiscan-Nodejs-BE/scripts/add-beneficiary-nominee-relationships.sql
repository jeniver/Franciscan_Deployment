USE [fms_db_new];
GO

-- Check if columns exist before adding them
IF NOT EXISTS (
    SELECT 1 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'NicheApplicationBeneficiary' 
    AND COLUMN_NAME = 'RelationshipToNominee1'
)
BEGIN
    ALTER TABLE NicheApplicationBeneficiary
    ADD RelationshipToNominee1 NVARCHAR(100) NULL;
    
    PRINT 'Added RelationshipToNominee1 column to NicheApplicationBeneficiary';
END
ELSE
BEGIN
    PRINT 'RelationshipToNominee1 column already exists';
END

IF NOT EXISTS (
    SELECT 1 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'NicheApplicationBeneficiary' 
    AND COLUMN_NAME = 'RelationshipToNominee2'
)
BEGIN
    ALTER TABLE NicheApplicationBeneficiary
    ADD RelationshipToNominee2 NVARCHAR(100) NULL;
    
    PRINT 'Added RelationshipToNominee2 column to NicheApplicationBeneficiary';
END
ELSE
BEGIN
    PRINT 'RelationshipToNominee2 column already exists';
END

-- Verify the columns were added
SELECT 
    COLUMN_NAME, 
    DATA_TYPE, 
    CHARACTER_MAXIMUM_LENGTH, 
    IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'NicheApplicationBeneficiary'
AND COLUMN_NAME IN ('RelationshipToNominee1', 'RelationshipToNominee2')
ORDER BY ORDINAL_POSITION;

PRINT 'Schema update completed successfully!';