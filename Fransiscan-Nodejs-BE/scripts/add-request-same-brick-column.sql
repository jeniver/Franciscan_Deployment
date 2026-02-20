-- Add RequestSameBrick column to EngraveWallApplication for Gate of Life
-- Run this script if the column does not exist

IF NOT EXISTS (
    SELECT 1
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'EngraveWallApplication'
    AND COLUMN_NAME = 'RequestSameBrick'
)
BEGIN
    ALTER TABLE EngraveWallApplication
    ADD RequestSameBrick BIT NULL DEFAULT 0;

    PRINT 'Added RequestSameBrick column to EngraveWallApplication';
END
ELSE
BEGIN
    PRINT 'RequestSameBrick column already exists in EngraveWallApplication';
END
GO
