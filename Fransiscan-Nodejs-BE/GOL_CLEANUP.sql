-- GOL_CLEANUP.sql
-- Reverses GOL_OPTIMIZATION.sql and removes extra fields as requested.

PRINT 'Starting Gates of Life Cleanup...';

-- 1. DROP COLUMNS: Remove fields from EngraveWallApplicationDetail
IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[EngraveWallApplicationDetail]') AND name = 'DateOfBirth')
BEGIN
    PRINT 'Removing DateOfBirth from EngraveWallApplicationDetail...';
    ALTER TABLE [dbo].[EngraveWallApplicationDetail] DROP COLUMN [DateOfBirth];
END

IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[EngraveWallApplicationDetail]') AND name = 'DateOfDeath')
BEGIN
    PRINT 'Removing DateOfDeath from EngraveWallApplicationDetail...';
    ALTER TABLE [dbo].[EngraveWallApplicationDetail] DROP COLUMN [DateOfDeath];
END

IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[EngraveWallApplicationDetail]') AND name = 'AdditionalInfo')
BEGIN
    PRINT 'Removing AdditionalInfo from EngraveWallApplicationDetail...';
    ALTER TABLE [dbo].[EngraveWallApplicationDetail] DROP COLUMN [AdditionalInfo];
END

-- Relationship was stored in Remarks. If we don't need relationship, we keep Remarks as a generic field or remove it.
-- The user said "Relationship to Applicant" is not needed.
IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[EngraveWallApplicationDetail]') AND name = 'Remarks')
BEGIN
    PRINT 'Removing Remarks (Relationship) from EngraveWallApplicationDetail...';
    -- We'll keep the column but clear the data in the app, or drop it if specifically asked. 
    -- "remove this fields... at db level" - okay, dropping it.
    ALTER TABLE [dbo].[EngraveWallApplicationDetail] DROP COLUMN [Remarks];
END

-- 2. DROP COLUMNS: Remove fields from EngraveWallApplication
-- ApplicantIDNo, Address Lines
IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[EngraveWallApplication]') AND name = 'ApplicantIDNo')
BEGIN
    PRINT 'Removing ApplicantIDNo from EngraveWallApplication...';
    -- Check if it's used in indexes first
    IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_EngraveWallApplication_ApplicantName_IdNo' AND object_id = OBJECT_ID(N'[dbo].[EngraveWallApplication]'))
    BEGIN
        DROP INDEX IX_EngraveWallApplication_ApplicantName_IdNo ON [dbo].[EngraveWallApplication];
    END
    ALTER TABLE [dbo].[EngraveWallApplication] DROP COLUMN [ApplicantIDNo];
END

IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[EngraveWallApplication]') AND name = 'ApplicantAddressLine1')
BEGIN
    PRINT 'Removing Address lines from EngraveWallApplication...';
    ALTER TABLE [dbo].[EngraveWallApplication] DROP COLUMN [ApplicantAddressLine1];
    ALTER TABLE [dbo].[EngraveWallApplication] DROP COLUMN [ApplicantAddressLine2];
    ALTER TABLE [dbo].[EngraveWallApplication] DROP COLUMN [ApplicantAddressCity];
    ALTER TABLE [dbo].[EngraveWallApplication] DROP COLUMN [ApplicantAddressState];
    ALTER TABLE [dbo].[EngraveWallApplication] DROP COLUMN [ApplicantAddressCountry];
END

PRINT 'Gates of Life Cleanup complete.';
GO
