-- ============================================================================
-- Franciscan Database Optimization Script
-- Purpose: Improve query performance for Niche Agreement APIs
-- Database: FransiscanLive
-- Version: 2.0.0
-- Date: October 23, 2025
-- ============================================================================

USE FransiscanLive;
GO

-- ============================================================================
-- SECTION 1: INDEX CREATION FOR PERFORMANCE OPTIMIZATION
-- ============================================================================

PRINT '=================================================================';
PRINT 'Creating Indexes for Performance Optimization';
PRINT '=================================================================';
GO

-- Index 1: CRITICAL - Composite index for main query pattern (most important for performance)
-- This covers 80% of query patterns: ChurchId + Status + AgreementDate filtering
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_NicheApplication_ChurchId_Status_AgreementDate' AND object_id = OBJECT_ID('NicheApplication'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_NicheApplication_ChurchId_Status_AgreementDate 
    ON NicheApplication(ChurchId, Status, AgreementDate DESC, NicheApplicationId DESC)
    INCLUDE (
        Code, 
        ApplicantName, 
        ApplicantIDNo, 
        ApplicantEmailID, 
        ApplicantMobileNo,
        NomineeName,
        NomineeIDNo,
        Amount,
        DefaultAmount,
        RefDocType,
        NicheId,
        AppliedDate
    );
    PRINT '✅ Created index: IX_NicheApplication_ChurchId_Status_AgreementDate (CRITICAL for performance)';
END
ELSE
    PRINT '⏭️ Index IX_NicheApplication_ChurchId_Status_AgreementDate already exists';
GO

-- Index 2: Speed up application number searches
-- This is the most critical index for the API
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_NicheApplication_Code' AND object_id = OBJECT_ID('NicheApplication'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_NicheApplication_Code 
    ON NicheApplication(Code) 
    INCLUDE (
        NicheApplicationId,
        NicheId, 
        AppliedDate, 
        AgreementDate, 
        Status,
        Amount, 
        DefaultAmount,
        ApplicantName,
        ApplicantIDNo,
        ApplicantEmailID,
        ApplicantMobileNo,
        ChurchId
    );
    PRINT '✅ Created index: IX_NicheApplication_Code';
END
ELSE
    PRINT '⏭️ Index IX_NicheApplication_Code already exists';
GO

-- Index 2: Speed up invoice lookups by reference document number
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_InvoiceDetail_RefDocNumber' AND object_id = OBJECT_ID('InvoiceDetail'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_InvoiceDetail_RefDocNumber
    ON InvoiceDetail(RefDocNumber) 
    INCLUDE (InvoiceId);
    PRINT '✅ Created index: IX_InvoiceDetail_RefDocNumber';
END
ELSE
    PRINT '⏭️ Index IX_InvoiceDetail_RefDocNumber already exists';
GO

-- Index 3: CRITICAL - Speed up beneficiary lookups (used in every search query)
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_NicheApplicationBeneficiary_NicheApplicationId' AND object_id = OBJECT_ID('NicheApplicationBeneficiary'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_NicheApplicationBeneficiary_NicheApplicationId
    ON NicheApplicationBeneficiary(NicheApplicationId)
    INCLUDE (
        Name,
        RelationshipToApplicant,
        DateOfBirth,
        BirthYear,
        IDNo,
        IsCatholic,
        IsMale,
        NicheApplicationBeneficiaryId
    );
    PRINT '✅ Created index: IX_NicheApplicationBeneficiary_NicheApplicationId (CRITICAL for performance)';
END
ELSE
    PRINT '⏭️ Index IX_NicheApplicationBeneficiary_NicheApplicationId already exists';
GO

-- Index 4: Speed up booking lookups
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_NicheBooking_NicheApplicationId' AND object_id = OBJECT_ID('NicheBooking'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_NicheBooking_NicheApplicationId
    ON NicheBooking(NicheApplicationId)
    INCLUDE (NicheBookingId);
    PRINT '✅ Created index: IX_NicheBooking_NicheApplicationId';
END
ELSE
    PRINT '⏭️ Index IX_NicheBooking_NicheApplicationId already exists';
GO

-- Index 5: Speed up receipt lookups by invoice
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Receipt_InvoiceId' AND object_id = OBJECT_ID('Receipt'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_Receipt_InvoiceId
    ON Receipt(InvoiceId)
    INCLUDE (TotalAmount, Code, ReceiptId);
    PRINT '✅ Created index: IX_Receipt_InvoiceId';
END
ELSE
    PRINT '⏭️ Index IX_Receipt_InvoiceId already exists';
GO

-- Index 6: Speed up niche hierarchy lookups
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Niche_NicheRowlId' AND object_id = OBJECT_ID('Niche'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_Niche_NicheRowlId
    ON Niche(NicheRowlId)
    INCLUDE (Code, NicheId);
    PRINT '✅ Created index: IX_Niche_NicheRowlId';
END
ELSE
    PRINT '⏭️ Index IX_Niche_NicheRowlId already exists';
GO

-- Index 7: Speed up niche row lookups
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_NicheRow_NicheWallId' AND object_id = OBJECT_ID('NicheRow'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_NicheRow_NicheWallId
    ON NicheRow(NicheWallId)
    INCLUDE (Code, NicheLevel, NicheRowlId);
    PRINT '✅ Created index: IX_NicheRow_NicheWallId';
END
ELSE
    PRINT '⏭️ Index IX_NicheRow_NicheWallId already exists';
GO

-- Index 8: Speed up niche wall lookups
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_NicheWall_ChapelId' AND object_id = OBJECT_ID('NicheWall'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_NicheWall_ChapelId
    ON NicheWall(ChapelId)
    INCLUDE (Code, Name, NicheWallId);
    PRINT '✅ Created index: IX_NicheWall_ChapelId';
END
ELSE
    PRINT '⏭️ Index IX_NicheWall_ChapelId already exists';
GO

-- Index 9: CRITICAL - Speed up NicheBooking lookups with Person joins (for addNomineeInfo)
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_NicheBooking_NicheApplicationId_WithPersonIds' AND object_id = OBJECT_ID('NicheBooking'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_NicheBooking_NicheApplicationId_WithPersonIds
    ON NicheBooking(NicheApplicationId)
    INCLUDE (NicheBookingId, ContactPersonId, NomineeId, NomineeId2, BookingStatus);
    PRINT '✅ Created index: IX_NicheBooking_NicheApplicationId_WithPersonIds (CRITICAL for nominee queries)';
END
ELSE
    PRINT '⏭️ Index IX_NicheBooking_NicheApplicationId_WithPersonIds already exists';
GO

-- Index 10: CRITICAL - Speed up Person lookups (if PersonId is not already indexed as PK)
-- Note: PersonId is typically the primary key, but this ensures Person lookups are fast
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Person_PersonId' AND object_id = OBJECT_ID('Person'))
BEGIN
    -- Only create if PersonId is not already the clustered primary key
    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name LIKE 'PK_%' AND is_primary_key = 1 AND object_id = OBJECT_ID('Person'))
    BEGIN
        CREATE NONCLUSTERED INDEX IX_Person_PersonId
        ON Person(PersonId)
        INCLUDE (
            Name, AddressNo, AddressLine1, AddressLine2, AddressCity, AddressState, AddressCountry,
            EmailID, IDNo, MobileNo, HomeTelNo, OfficeTelNo, IsCatholic, RelationshipToApplicant
        );
        PRINT '✅ Created index: IX_Person_PersonId';
    END
    ELSE
        PRINT '⏭️ Person.PersonId is already indexed as primary key';
END
ELSE
    PRINT '⏭️ Index IX_Person_PersonId already exists';
GO

-- Index 11: CRITICAL - Speed up NicheInscriptionRequest lookups by BookingId
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_NicheInscriptionRequest_NicheBookingId' AND object_id = OBJECT_ID('NicheInscriptionRequest'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_NicheInscriptionRequest_NicheBookingId
    ON NicheInscriptionRequest(NicheBookingId)
    INCLUDE (NicheInscriptionRequestId, StorageFrom, StorageTo, Code);
    PRINT '✅ Created index: IX_NicheInscriptionRequest_NicheBookingId (CRITICAL for deceased queries)';
END
ELSE
    PRINT '⏭️ Index IX_NicheInscriptionRequest_NicheBookingId already exists';
GO

-- Index 12: CRITICAL - Speed up NicheInscriptionRequestDecesed lookups
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_NicheInscriptionRequestDecesed_NicheInscriptionRequestId' AND object_id = OBJECT_ID('NicheInscriptionRequestDecesed'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_NicheInscriptionRequestDecesed_NicheInscriptionRequestId
    ON NicheInscriptionRequestDecesed(NicheInscriptionRequestId)
    INCLUDE (
        NicheInscriptionRequestDecesedId,
        NameOfDeceased,
        DateDied,
        InternmentDate,
        DeathCertificateNo
    );
    PRINT '✅ Created index: IX_NicheInscriptionRequestDecesed_NicheInscriptionRequestId (CRITICAL for deceased queries)';
END
ELSE
    PRINT '⏭️ Index IX_NicheInscriptionRequestDecesed_NicheInscriptionRequestId already exists';
GO

-- Index 13: CRITICAL - Enhanced InvoiceDetail index with Status and ItemId for faster invoice lookups
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_InvoiceDetail_RefDocNumber_Status_ItemId' AND object_id = OBJECT_ID('InvoiceDetail'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_InvoiceDetail_RefDocNumber_Status_ItemId
    ON InvoiceDetail(RefDocNumber, ItemId)
    INCLUDE (InvoiceId, TotalPayingAmount, LineTaxAmount, PayingAmount);
    PRINT '✅ Created index: IX_InvoiceDetail_RefDocNumber_Status_ItemId (CRITICAL for invoice queries)';
END
ELSE
    PRINT '⏭️ Index IX_InvoiceDetail_RefDocNumber_Status_ItemId already exists';
GO

-- Index 14: CRITICAL - Speed up Invoice lookups by InvoiceId with Status
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Invoice_InvoiceId_Status' AND object_id = OBJECT_ID('Invoice'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_Invoice_InvoiceId_Status
    ON Invoice(InvoiceId, Status)
    INCLUDE (Code, TransactionDate, TaxAmount, PayingAmount);
    PRINT '✅ Created index: IX_Invoice_InvoiceId_Status (CRITICAL for invoice queries)';
END
ELSE
    PRINT '⏭️ Index IX_Invoice_InvoiceId_Status already exists';
GO

-- Index 15: Speed up MisalaniousReceiptDetail lookups
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_MisalaniousReceiptDetail_RefDocNumber' AND object_id = OBJECT_ID('MisalaniousReceiptDetail'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_MisalaniousReceiptDetail_RefDocNumber
    ON MisalaniousReceiptDetail(RefDocNumber)
    INCLUDE (ReceiptDetailId, TotalPayingAmount, PayingAmount);
    PRINT '✅ Created index: IX_MisalaniousReceiptDetail_RefDocNumber';
END
ELSE
    PRINT '⏭️ Index IX_MisalaniousReceiptDetail_RefDocNumber already exists';
GO

-- Index 16: CRITICAL - Speed up NicheBookingBeneficiary lookups
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_NicheBookingBeneficiary_NicheBookingId' AND object_id = OBJECT_ID('NicheBookingBeneficiary'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_NicheBookingBeneficiary_NicheBookingId
    ON NicheBookingBeneficiary(NicheBookingId)
    INCLUDE (
        NicheBookingBeneficiaryId,
        Name, IDNo, IsCatholic, IsMale,
        RelationshipToApplicant, DateOfBirth, BirthYear,
        RelationshipToNominee1, RelationshipToNominee2
    );
    PRINT '✅ Created index: IX_NicheBookingBeneficiary_NicheBookingId (CRITICAL for beneficiary queries)';
END
ELSE
    PRINT '⏭️ Index IX_NicheBookingBeneficiary_NicheBookingId already exists';
GO

-- Index 17: Speed up Niche lookups by NicheId (if not already PK)
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Niche_NicheId' AND object_id = OBJECT_ID('Niche'))
BEGIN
    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name LIKE 'PK_%' AND is_primary_key = 1 AND object_id = OBJECT_ID('Niche') AND key_columns LIKE '%NicheId%')
    BEGIN
        CREATE NONCLUSTERED INDEX IX_Niche_NicheId
        ON Niche(NicheId)
        INCLUDE (Code, NicheRowlId);
        PRINT '✅ Created index: IX_Niche_NicheId';
    END
    ELSE
        PRINT '⏭️ Niche.NicheId is already indexed as primary key';
END
ELSE
    PRINT '⏭️ Index IX_Niche_NicheId already exists';
GO

-- ============================================================================
-- SECTION 2: UPDATE STATISTICS FOR BETTER QUERY OPTIMIZATION
-- ============================================================================

PRINT '';
PRINT '=================================================================';
PRINT 'Updating Statistics for Better Query Plans';
PRINT '=================================================================';
GO

-- Update statistics on key tables
UPDATE STATISTICS NicheApplication WITH FULLSCAN;
PRINT '✅ Updated statistics: NicheApplication';

UPDATE STATISTICS NicheApplicationBeneficiary WITH FULLSCAN;
PRINT '✅ Updated statistics: NicheApplicationBeneficiary';

UPDATE STATISTICS Invoice WITH FULLSCAN;
PRINT '✅ Updated statistics: Invoice';

UPDATE STATISTICS InvoiceDetail WITH FULLSCAN;
PRINT '✅ Updated statistics: InvoiceDetail';

UPDATE STATISTICS Receipt WITH FULLSCAN;
PRINT '✅ Updated statistics: Receipt';

UPDATE STATISTICS Niche WITH FULLSCAN;
PRINT '✅ Updated statistics: Niche';

UPDATE STATISTICS NicheRow WITH FULLSCAN;
PRINT '✅ Updated statistics: NicheRow';

UPDATE STATISTICS NicheWall WITH FULLSCAN;
PRINT '✅ Updated statistics: NicheWall';

UPDATE STATISTICS Chapel WITH FULLSCAN;
PRINT '✅ Updated statistics: Chapel';

UPDATE STATISTICS NicheBooking WITH FULLSCAN;
PRINT '✅ Updated statistics: NicheBooking';

UPDATE STATISTICS NicheBookingBeneficiary WITH FULLSCAN;
PRINT '✅ Updated statistics: NicheBookingBeneficiary';

UPDATE STATISTICS Person WITH FULLSCAN;
PRINT '✅ Updated statistics: Person';

UPDATE STATISTICS NicheInscriptionRequest WITH FULLSCAN;
PRINT '✅ Updated statistics: NicheInscriptionRequest';

UPDATE STATISTICS NicheInscriptionRequestDecesed WITH FULLSCAN;
PRINT '✅ Updated statistics: NicheInscriptionRequestDecesed';

UPDATE STATISTICS MisalaniousReceiptDetail WITH FULLSCAN;
PRINT '✅ Updated statistics: MisalaniousReceiptDetail';

GO

-- ============================================================================
-- SECTION 3: ANALYZE INDEX FRAGMENTATION
-- ============================================================================

PRINT '';
PRINT '=================================================================';
PRINT 'Analyzing Index Fragmentation';
PRINT '=================================================================';
GO

SELECT 
    OBJECT_NAME(ips.object_id) AS TableName,
    i.name AS IndexName,
    ips.index_type_desc AS IndexType,
    ips.avg_fragmentation_in_percent AS FragmentationPercent,
    ips.page_count AS PageCount,
    CASE 
        WHEN ips.avg_fragmentation_in_percent > 30 THEN '🔴 REBUILD RECOMMENDED'
        WHEN ips.avg_fragmentation_in_percent > 10 THEN '🟡 REORGANIZE RECOMMENDED'
        ELSE '✅ OK'
    END AS RecommendedAction
FROM sys.dm_db_index_physical_stats(DB_ID(), NULL, NULL, NULL, 'LIMITED') ips
INNER JOIN sys.indexes i ON ips.object_id = i.object_id AND ips.index_id = i.index_id
WHERE 
    ips.database_id = DB_ID()
    AND OBJECT_NAME(ips.object_id) IN (
        'NicheApplication', 
        'Invoice', 
        'InvoiceDetail', 
        'Receipt', 
        'Niche',
        'NicheRow',
        'NicheWall',
        'Chapel',
        'NicheBooking',
        'NicheBookingBeneficiary'
    )
    AND i.name IS NOT NULL
ORDER BY ips.avg_fragmentation_in_percent DESC;
GO

-- ============================================================================
-- SECTION 4: REBUILD/REORGANIZE FRAGMENTED INDEXES (if needed)
-- ============================================================================

PRINT '';
PRINT '=================================================================';
PRINT 'Rebuilding Highly Fragmented Indexes (>30%)';
PRINT '=================================================================';
GO

-- Rebuild indexes with high fragmentation
DECLARE @TableName NVARCHAR(255);
DECLARE @IndexName NVARCHAR(255);
DECLARE @SQL NVARCHAR(MAX);

DECLARE index_cursor CURSOR FOR
SELECT 
    OBJECT_NAME(ips.object_id) AS TableName,
    i.name AS IndexName
FROM sys.dm_db_index_physical_stats(DB_ID(), NULL, NULL, NULL, 'LIMITED') ips
INNER JOIN sys.indexes i ON ips.object_id = i.object_id AND ips.index_id = i.index_id
WHERE 
    ips.database_id = DB_ID()
    AND OBJECT_NAME(ips.object_id) IN (
        'NicheApplication', 
        'Invoice', 
        'InvoiceDetail', 
        'Receipt', 
        'Niche',
        'NicheRow',
        'NicheWall',
        'Chapel',
        'NicheBooking',
        'NicheBookingBeneficiary'
    )
    AND i.name IS NOT NULL
    AND ips.avg_fragmentation_in_percent > 30
    AND ips.page_count > 1000; -- Only rebuild if index has significant pages

OPEN index_cursor;

FETCH NEXT FROM index_cursor INTO @TableName, @IndexName;

WHILE @@FETCH_STATUS = 0
BEGIN
    SET @SQL = 'ALTER INDEX ' + QUOTENAME(@IndexName) + ' ON ' + QUOTENAME(@TableName) + ' REBUILD WITH (ONLINE = OFF);';
    
    BEGIN TRY
        EXEC sp_executesql @SQL;
        PRINT '✅ Rebuilt index: ' + @IndexName + ' on ' + @TableName;
    END TRY
    BEGIN CATCH
        PRINT '❌ Failed to rebuild index: ' + @IndexName + ' on ' + @TableName + ' - ' + ERROR_MESSAGE();
    END CATCH
    
    FETCH NEXT FROM index_cursor INTO @TableName, @IndexName;
END;

CLOSE index_cursor;
DEALLOCATE index_cursor;

GO

-- ============================================================================
-- SECTION 5: QUERY PERFORMANCE MONITORING
-- ============================================================================

PRINT '';
PRINT '=================================================================';
PRINT 'Top 10 Slowest Queries (Cached Plans)';
PRINT '=================================================================';
GO

-- Find slowest queries currently in cache
SELECT TOP 10
    SUBSTRING(qt.text, (qs.statement_start_offset/2)+1, 
        ((CASE qs.statement_end_offset
            WHEN -1 THEN DATALENGTH(qt.text)
            ELSE qs.statement_end_offset
        END - qs.statement_start_offset)/2) + 1) AS QueryText,
    qs.execution_count AS ExecutionCount,
    qs.total_elapsed_time / qs.execution_count / 1000 AS AvgDurationMs,
    qs.total_logical_reads / qs.execution_count AS AvgLogicalReads,
    qs.total_physical_reads / qs.execution_count AS AvgPhysicalReads,
    qs.creation_time AS PlanCreatedTime,
    qs.last_execution_time AS LastExecutionTime
FROM sys.dm_exec_query_stats qs
CROSS APPLY sys.dm_exec_sql_text(qs.sql_handle) qt
WHERE qt.text LIKE '%NicheApplication%'
   OR qt.text LIKE '%Invoice%'
   OR qt.text LIKE '%Receipt%'
ORDER BY AvgDurationMs DESC;
GO

-- ============================================================================
-- SECTION 6: TABLE STATISTICS
-- ============================================================================

PRINT '';
PRINT '=================================================================';
PRINT 'Table Row Counts and Space Usage';
PRINT '=================================================================';
GO

SELECT 
    t.name AS TableName,
    p.rows AS RowCount,
    (SUM(a.total_pages) * 8) / 1024 AS TotalSpaceMB,
    (SUM(a.used_pages) * 8) / 1024 AS UsedSpaceMB,
    ((SUM(a.total_pages) - SUM(a.used_pages)) * 8) / 1024 AS UnusedSpaceMB
FROM sys.tables t
INNER JOIN sys.indexes i ON t.object_id = i.object_id
INNER JOIN sys.partitions p ON i.object_id = p.object_id AND i.index_id = p.index_id
INNER JOIN sys.allocation_units a ON p.partition_id = a.container_id
WHERE t.name IN (
    'NicheApplication', 
    'Invoice', 
    'InvoiceDetail', 
    'Receipt', 
    'Niche',
    'NicheRow',
    'NicheWall',
    'Chapel',
    'NicheBooking',
    'NicheBookingBeneficiary'
)
GROUP BY t.name, p.rows
ORDER BY RowCount DESC;
GO

-- ============================================================================
-- SECTION 7: MISSING INDEX RECOMMENDATIONS
-- ============================================================================

PRINT '';
PRINT '=================================================================';
PRINT 'SQL Server Missing Index Recommendations';
PRINT '=================================================================';
GO

SELECT TOP 10
    ROUND(s.avg_total_user_cost * s.avg_user_impact * (s.user_seeks + s.user_scans), 0) AS ImprovementScore,
    d.statement AS TableName,
    d.equality_columns AS EqualityColumns,
    d.inequality_columns AS InequalityColumns,
    d.included_columns AS IncludedColumns,
    s.user_seeks AS UserSeeks,
    s.user_scans AS UserScans
FROM sys.dm_db_missing_index_groups g
INNER JOIN sys.dm_db_missing_index_group_stats s ON g.index_group_handle = s.group_handle
INNER JOIN sys.dm_db_missing_index_details d ON g.index_handle = d.index_handle
WHERE d.database_id = DB_ID()
AND d.statement LIKE '%NicheApplication%'
   OR d.statement LIKE '%Invoice%'
   OR d.statement LIKE '%Receipt%'
   OR d.statement LIKE '%Niche%'
ORDER BY ImprovementScore DESC;
GO

-- ============================================================================
-- SECTION 8: PERFORMANCE BASELINE TEST QUERIES
-- ============================================================================

PRINT '';
PRINT '=================================================================';
PRINT 'Running Performance Baseline Tests';
PRINT '=================================================================';
GO

-- Test 1: Application number lookup (exact match)
DECLARE @StartTime1 DATETIME2 = SYSDATETIME();

SELECT TOP 1 
    na.*,
    n.Code AS NicheCode,
    r.Code AS RowCode,
    w.Name AS WallName,
    c.Name AS ChapelName
FROM NicheApplication na WITH (NOLOCK)
LEFT JOIN Niche n WITH (NOLOCK) ON na.NicheId = n.NicheId
LEFT JOIN NicheRow r WITH (NOLOCK) ON n.NicheRowlId = r.NicheRowlId
LEFT JOIN NicheWall w WITH (NOLOCK) ON r.NicheWallId = w.NicheWallId
LEFT JOIN Chapel c WITH (NOLOCK) ON w.ChapelId = c.ChapelId
WHERE na.Code LIKE '3795-1';

DECLARE @Duration1 INT = DATEDIFF(MILLISECOND, @StartTime1, SYSDATETIME());
PRINT 'Test 1 - Application lookup: ' + CAST(@Duration1 AS VARCHAR) + ' ms';

-- Test 2: Application number prefix search
DECLARE @StartTime2 DATETIME2 = SYSDATETIME();

SELECT TOP 10 Code
FROM NicheApplication WITH (NOLOCK)
WHERE Code LIKE '3795-%'
ORDER BY Code;

DECLARE @Duration2 INT = DATEDIFF(MILLISECOND, @StartTime2, SYSDATETIME());
PRINT 'Test 2 - Prefix search: ' + CAST(@Duration2 AS VARCHAR) + ' ms';

-- Test 3: Invoice lookup
DECLARE @StartTime3 DATETIME2 = SYSDATETIME();

SELECT TOP 1
    inv.Code as InvoiceNo,
    inv.TransactionDate as InvoiceDate,
    inv.TaxAmount,
    inv.PayingAmount
FROM InvoiceDetail invdls WITH (NOLOCK)
INNER JOIN Invoice inv WITH (NOLOCK) ON invdls.InvoiceId = inv.InvoiceId
WHERE invdls.RefDocNumber = '3795-1'
ORDER BY inv.TransactionDate DESC;

DECLARE @Duration3 INT = DATEDIFF(MILLISECOND, @StartTime3, SYSDATETIME());
PRINT 'Test 3 - Invoice lookup: ' + CAST(@Duration3 AS VARCHAR) + ' ms';

GO

-- ============================================================================
-- SECTION 9: RECOMMENDATIONS FOR ONGOING MAINTENANCE
-- ============================================================================

PRINT '';
PRINT '=================================================================';
PRINT 'Database Maintenance Recommendations';
PRINT '=================================================================';
PRINT '';
PRINT '📅 DAILY:';
PRINT '  - Monitor error logs for issues';
PRINT '  - Check for blocking queries';
PRINT '  - Review slow query logs (>5 seconds)';
PRINT '';
PRINT '📅 WEEKLY:';
PRINT '  - Update statistics: UPDATE STATISTICS [TableName] WITH FULLSCAN';
PRINT '  - Check index fragmentation';
PRINT '  - Review missing index recommendations';
PRINT '';
PRINT '📅 MONTHLY:';
PRINT '  - Rebuild fragmented indexes (>30% fragmentation)';
PRINT '  - Reorganize moderately fragmented indexes (10-30%)';
PRINT '  - Review and purge old log files';
PRINT '  - Check database growth and adjust autogrow settings';
PRINT '';
PRINT '📅 QUARTERLY:';
PRINT '  - Review and optimize stored procedures';
PRINT '  - Archive old data if applicable';
PRINT '  - Test backup and restore procedures';
PRINT '  - Review security and permissions';
PRINT '';
PRINT '=================================================================';
PRINT 'Database Optimization Complete!';
PRINT '=================================================================';
GO

