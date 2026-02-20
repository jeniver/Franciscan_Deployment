# Database Optimization Scripts

This directory contains SQL scripts for optimizing the Invoice and Receipt APIs.

## Scripts

### 01_create_indexes.sql
Creates 12 performance indexes on key tables:
- **Invoice Table**: 4 indexes for faster lookups by RefDocNumber, Code, TransactionDate, and Status
- **Receipt Table**: 3 indexes for faster lookups by Code, InvoiceId, and TransactionDate
- **InvoiceDetail Table**: 2 indexes for faster detail fetching
- **MisalaniousReceiptDetail Table**: 1 index for receipt items
- **NicheApplication Table**: 1 index for application lookups
- **Item Table**: 1 index for item selection

**Expected Impact**: 30-50% faster queries

### 02_create_stored_procedures.sql
Creates 3 stored procedures for optimized operations:
- `sp_CreateInvoiceWithDetails`: Single-call invoice creation (replaces 10-12 queries)
- `sp_CreateReceiptWithDetails`: Single-call receipt creation (replaces 5-6 queries)
- `sp_GetInvoiceWithDetails`: Optimized invoice retrieval with JOINs

**Expected Impact**:
- Invoice creation: 1200ms → 200ms (83% faster)
- Receipt creation: 1000ms → 150ms (85% faster)
- Invoice retrieval: 500ms → 100ms (80% faster)

## How to Run

### Option 1: Using SQL Server Management Studio (SSMS)
1. Open SSMS and connect to your SQL Server instance
2. Open each script file
3. Execute the scripts in order (01, 02)

### Option 2: Using sqlcmd Command Line
```bash
# Run from the project root directory
sqlcmd -S localhost\\SQLEXPRESS -d FranciscanDB -i database/optimizations/01_create_indexes.sql
sqlcmd -S localhost\\SQLEXPRESS -d FranciscanDB -i database/optimizations/02_create_stored_procedures.sql
```

### Option 3: Using PowerShell
```powershell
# Run from the project root directory
Invoke-Sqlcmd -ServerInstance "localhost\\SQLEXPRESS" -Database "FranciscanDB" -InputFile "database/optimizations/01_create_indexes.sql"
Invoke-Sqlcmd -ServerInstance "localhost\\SQLEXPRESS" -Database "FranciscanDB" -InputFile "database/optimizations/02_create_stored_procedures.sql"
```

## Verification

After running the scripts, verify the changes:

### Check Indexes
```sql
SELECT 
    t.name AS TableName,
    i.name AS IndexName,
    i.type_desc AS IndexType,
    CAST(ROUND(((SUM(a.used_pages) * 8) / 1024.00), 2) AS NUMERIC(36, 2)) AS IndexSizeMB
FROM sys.indexes i
INNER JOIN sys.tables t ON i.object_id = t.object_id
INNER JOIN sys.partitions p ON i.object_id = p.object_id AND i.index_id = p.index_id
INNER JOIN sys.allocation_units a ON p.partition_id = a.container_id
WHERE t.name IN ('Invoice', 'Receipt', 'InvoiceDetail', 'MisalaniousReceiptDetail')
    AND i.name LIKE 'IX_%'
GROUP BY t.name, i.name, i.type_desc
ORDER BY t.name, i.name;
```

### Check Stored Procedures
```sql
SELECT name, create_date, modify_date
FROM sys.procedures
WHERE name IN ('sp_CreateInvoiceWithDetails', 'sp_CreateReceiptWithDetails', 'sp_GetInvoiceWithDetails');
```

## Rollback

If you need to rollback these changes:

### Drop Indexes
```sql
-- Invoice indexes
DROP INDEX IF EXISTS IX_Invoice_RefDocNumber_ChurchId ON Invoice;
DROP INDEX IF EXISTS IX_Invoice_Code_ChurchId ON Invoice;
DROP INDEX IF EXISTS IX_Invoice_ChurchId_TransactionDate ON Invoice;
DROP INDEX IF EXISTS IX_Invoice_Status_ChurchId ON Invoice;

-- Receipt indexes
DROP INDEX IF EXISTS IX_Receipt_Code_ChurchId ON Receipt;
DROP INDEX IF EXISTS IX_Receipt_InvoiceId_ChurchId ON Receipt;
DROP INDEX IF EXISTS IX_Receipt_ChurchId_TransactionDate ON Receipt;

-- Detail indexes
DROP INDEX IF EXISTS IX_InvoiceDetail_InvoiceId ON InvoiceDetail;
DROP INDEX IF EXISTS IX_InvoiceDetail_RefDocNumber ON InvoiceDetail;
DROP INDEX IF EXISTS IX_MisalaniousReceiptDetail_ReceiptId ON MisalaniousReceiptDetail;

-- Application indexes
DROP INDEX IF EXISTS IX_NicheApplication_Code_ChurchId ON NicheApplication;
DROP INDEX IF EXISTS IX_Item_ChurchId_DocType ON Item;
```

### Drop Stored Procedures
```sql
DROP PROCEDURE IF EXISTS sp_CreateInvoiceWithDetails;
DROP PROCEDURE IF EXISTS sp_CreateReceiptWithDetails;
DROP PROCEDURE IF EXISTS sp_GetInvoiceWithDetails;
```

## Notes

- These scripts are **idempotent** - they can be run multiple times safely
- All indexes use `IF NOT EXISTS` checks to prevent errors
- Stored procedures are dropped and recreated if they already exist
- No data is modified or deleted by these scripts
- These changes are **backward compatible** - existing code will continue to work
