-- GOL_OPTIMIZATION.sql
-- Target Database: FransiscanTest

PRINT 'Starting Gates of Life Optimization...';

-- 1. FIX SCHEMA: Add missing columns to EngraveWallApplicationDetail
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[EngraveWallApplicationDetail]') AND name = 'DateOfBirth')
BEGIN
    PRINT 'Adding DateOfBirth to EngraveWallApplicationDetail...';
    ALTER TABLE [dbo].[EngraveWallApplicationDetail] ADD [DateOfBirth] [datetime] NULL;
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[EngraveWallApplicationDetail]') AND name = 'DateOfDeath')
BEGIN
    PRINT 'Adding DateOfDeath to EngraveWallApplicationDetail...';
    ALTER TABLE [dbo].[EngraveWallApplicationDetail] ADD [DateOfDeath] [datetime] NULL;
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[EngraveWallApplicationDetail]') AND name = 'AdditionalInfo')
BEGIN
    PRINT 'Adding AdditionalInfo to EngraveWallApplicationDetail...';
    ALTER TABLE [dbo].[EngraveWallApplicationDetail] ADD [AdditionalInfo] [nvarchar](max) NULL;
END

-- 2. ADD INDEXES: Improve search and fetch performance
PRINT 'Applying performance indexes...';

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_EngraveWallApplication_ChurchId_Code' AND object_id = OBJECT_ID(N'[dbo].[EngraveWallApplication]'))
BEGIN
    CREATE INDEX IX_EngraveWallApplication_ChurchId_Code ON [dbo].[EngraveWallApplication] (ChurchId, Code);
END

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_EngraveWallApplication_ApplicantName_IdNo' AND object_id = OBJECT_ID(N'[dbo].[EngraveWallApplication]'))
BEGIN
    CREATE INDEX IX_EngraveWallApplication_ApplicantName_IdNo ON [dbo].[EngraveWallApplication] (ApplicantName, ApplicantIDNo);
END

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_EngraveWallApplication_BookingDate' AND object_id = OBJECT_ID(N'[dbo].[EngraveWallApplication]'))
BEGIN
    CREATE INDEX IX_EngraveWallApplication_BookingDate ON [dbo].[EngraveWallApplication] (BookingDate);
END

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_EngraveWallApplicationDetail_AppId' AND object_id = OBJECT_ID(N'[dbo].[EngraveWallApplicationDetail]'))
BEGIN
    CREATE INDEX IX_EngraveWallApplicationDetail_AppId ON [dbo].[EngraveWallApplicationDetail] (EngraveWallApplicationId);
END

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_EngraveWallApplicationDetail_NameToEngrave' AND object_id = OBJECT_ID(N'[dbo].[EngraveWallApplicationDetail]'))
BEGIN
    CREATE INDEX IX_EngraveWallApplicationDetail_NameToEngrave ON [dbo].[EngraveWallApplicationDetail] (NameToEngrave);
END

PRINT 'Gates of Life Optimization complete.';
GO
