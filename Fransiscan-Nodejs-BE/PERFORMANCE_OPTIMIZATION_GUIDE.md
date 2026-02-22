# Performance Optimization Guide for Niche Agreements API

## Overview
This guide documents the comprehensive performance optimizations applied to the `/api/niche-agreements/:applicationNumber` endpoint to address slow response times.

## Problem
The API endpoint `http://192.168.1.24:3000/api/niche-agreements/7980-0` was experiencing slow performance, taking 60+ seconds or timing out.

## Solution Summary

### 1. Database Indexes (CRITICAL)
Added 9 new critical indexes to optimize query performance:

#### New Indexes Created:
- **IX_NicheBooking_NicheApplicationId_WithPersonIds** - Optimizes nominee/person lookups
- **IX_Person_PersonId** - Ensures fast Person table lookups (if not already PK)
- **IX_NicheInscriptionRequest_NicheBookingId** - Optimizes deceased/storage queries
- **IX_NicheInscriptionRequestDecesed_NicheInscriptionRequestId** - Fast deceased detail lookups
- **IX_InvoiceDetail_RefDocNumber_Status_ItemId** - Enhanced invoice lookups
- **IX_Invoice_InvoiceId_Status** - Fast invoice status checks
- **IX_MisalaniousReceiptDetail_RefDocNumber** - Receipt detail lookups
- **IX_NicheBookingBeneficiary_NicheBookingId** - Beneficiary queries
- **IX_Niche_NicheId** - Niche lookups (if not already PK)

### 2. Query Optimizations

#### Reduced Timeouts
- Application query: 20s → 10s (should complete in < 1s with index)
- Beneficiaries query: 15s → 10s
- Nominee query: 15s → 10s
- Invoice queries: 15s → 10s
- All other queries: 10s (already optimized)

#### Query Structure Improvements
- Split complex CTE queries into simpler sequential queries
- Removed expensive table scans
- Added `WITH (NOLOCK)` hints for better concurrency
- Used `TOP 1` and `TOP 2` to limit result sets

### 3. Statistics Updates
Added statistics updates for:
- Person
- NicheInscriptionRequest
- NicheInscriptionRequestDecesed
- MisalaniousReceiptDetail

## How to Apply Optimizations

### Step 1: Run Database Optimization Script
```bash
# Connect to SQL Server and run:
sqlcmd -S your_server -d FransiscanTest -i DATABASE_OPTIMIZATION.sql
```

Or execute the script in SQL Server Management Studio (SSMS).

### Step 2: Verify Indexes Were Created
```sql
-- Check if indexes exist
SELECT 
    OBJECT_NAME(object_id) AS TableName,
    name AS IndexName,
    type_desc AS IndexType
FROM sys.indexes
WHERE name LIKE 'IX_%'
    AND OBJECT_NAME(object_id) IN (
        'NicheApplication',
        'NicheBooking',
        'Person',
        'NicheInscriptionRequest',
        'NicheInscriptionRequestDecesed',
        'InvoiceDetail',
        'Invoice',
        'MisalaniousReceiptDetail',
        'NicheBookingBeneficiary'
    )
ORDER BY TableName, IndexName;
```

### Step 3: Enable Index Hints (Optional)
If you want to force SQL Server to use specific indexes, set:
```env
USE_INDEX_HINTS=true
```

**Note:** Only enable this AFTER confirming indexes exist in the database.

### Step 4: Monitor Performance
Check the API response time:
```bash
# Test the endpoint
curl -X GET "http://192.168.1.24:3000/api/niche-agreements/7980-0" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Expected performance:
- **Before:** 60+ seconds or timeout
- **After:** 2-5 seconds (first request), < 0.01s (cached)

## Performance Metrics

### Expected Query Times (with indexes):
| Query Type | Before | After | Improvement |
|------------|--------|-------|-------------|
| Application lookup | 20-60s | < 1s | 20-60x faster |
| Beneficiaries | 15-30s | < 1s | 15-30x faster |
| Nominee info | 15-30s | < 1s | 15-30x faster |
| Deceased info | 15-30s | < 1s | 15-30x faster |
| Invoice info | 15-30s | < 1s | 15-30x faster |
| **Total API** | **60+ s** | **2-5s** | **12-30x faster** |

### Cached Performance:
- First request: 2-5 seconds
- Subsequent requests (within 5 min): < 0.01 seconds (cache hit)

## Maintenance

### Weekly
- Check index fragmentation:
  ```sql
  -- Run Section 3 of DATABASE_OPTIMIZATION.sql
  ```

### Monthly
- Rebuild fragmented indexes (>30% fragmentation)
- Update statistics:
  ```sql
  UPDATE STATISTICS NicheApplication WITH FULLSCAN;
  UPDATE STATISTICS NicheBooking WITH FULLSCAN;
  UPDATE STATISTICS Person WITH FULLSCAN;
  -- ... etc
  ```

### Monitoring
- Check slow query logs for queries > 5 seconds
- Monitor cache hit rates via `/api/utils/cache-stats`
- Review missing index recommendations in SQL Server

## Troubleshooting

### If API is still slow:

1. **Verify indexes exist:**
   ```sql
   SELECT name FROM sys.indexes WHERE name LIKE 'IX_%';
   ```

2. **Check index fragmentation:**
   ```sql
   -- Run fragmentation analysis from DATABASE_OPTIMIZATION.sql
   ```

3. **Verify statistics are up to date:**
   ```sql
   SELECT 
       OBJECT_NAME(object_id) AS TableName,
       last_updated
   FROM sys.dm_db_stats_properties(object_id('NicheApplication'), NULL);
   ```

4. **Check for blocking queries:**
   ```sql
   SELECT * FROM sys.dm_exec_requests WHERE blocking_session_id > 0;
   ```

5. **Review query execution plans:**
   - Enable `SET STATISTICS IO ON`
   - Check if indexes are being used

## Files Modified

1. **DATABASE_OPTIMIZATION.sql** - Added 9 new critical indexes
2. **NicheAgreementRepository.js** - Reduced timeouts, optimized queries
3. **EngraveApplicationRepository.js** - Already optimized in previous update

## Notes

- All optimizations are backward compatible
- No breaking changes to API contracts
- Caching is enabled by default (5-minute TTL)
- Index hints are OPT-IN (disabled by default)

## Support

If issues persist after applying optimizations:
1. Check database server resources (CPU, memory, disk I/O)
2. Verify network latency between app and database
3. Review SQL Server error logs
4. Consider increasing cache TTL if data changes infrequently

