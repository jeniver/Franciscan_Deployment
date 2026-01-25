# NAPP-45 Invoice & Receipt Access Analysis

## Problem Statement
Cannot view invoice and receipt for niche booking with code `NAPP-45` via:
- `GET /api/invoices/NAPP-45`
- `GET /api/receipts/NAPP-45`

## Root Cause Analysis

### Current Implementation Status

#### ✅ What Works:
1. **InvoiceRepository.getInvoiceByCode()** (lines 190-417)
   - ✅ Has fallback logic to search by `InvoiceDetail.RefDocNumber` (lines 243-268)
   - ✅ Searches when invoice code not found
   - ❌ **ISSUE**: Doesn't filter by `RefDocName = 'NAPP'` in fallback query
   - ❌ **ISSUE**: May return wrong invoice if multiple document types use same RefDocNumber

2. **ReceiptRepository.getInvoiceByCode()** (lines 1422-1703)
   - ✅ Has sophisticated fallback logic with `applicationCode` parameter
   - ✅ Filters by `RefDocName` when `applicationCode` provided
   - ✅ Works correctly for NAPP codes when called with `applicationCode=NAPP`

3. **Receipt Lookup** (lines 690-1122)
   - ✅ Has fallback to search by invoice code
   - ✅ Handles NAPP codes via invoice lookup

#### ❌ What's Missing:

### Issue 1: InvoiceRepository Fallback Query Missing RefDocName Filter

**Location**: `src/repositories/InvoiceRepository.js` lines 247-261

**Current Query**:
```sql
SELECT TOP 1 i.*
FROM Invoice i WITH(NOLOCK)
INNER JOIN InvoiceDetail id ON i.InvoiceId = id.InvoiceId
WHERE id.RefDocNumber = @code
  AND i.Status > 0
ORDER BY i.TransactionDate DESC, i.InvoiceId DESC
```

**Problem**: 
- Doesn't filter by `RefDocName = 'NAPP'`
- Could return invoice from WAPP, INCR, or GOLA if they share the same RefDocNumber
- Doesn't handle case-insensitive matching for RefDocNumber

**Solution**: Add RefDocName filter and improve matching

### Issue 2: InvoiceController Doesn't Accept applicationCode Parameter

**Location**: `src/controllers/InvoiceController.js` line 127

**Current Code**:
```javascript
const invoice = await this.invoiceRepository.getInvoiceByCode(code, churchId);
```

**Problem**:
- Doesn't accept `applicationCode` query parameter
- Can't leverage RefDocName filtering
- Users must know the actual invoice code, not the NAPP code

**Solution**: Add optional `applicationCode` query parameter support

### Issue 3: Receipt Lookup May Not Work for NAPP Codes Directly

**Location**: `src/repositories/ReceiptRepository.js` lines 690-1122

**Current Logic**:
- First searches by Receipt.Code
- Then searches by Invoice.Code
- Then searches by InvoiceDetail.RefDocNumber (but only if applicationCode provided)

**Problem**:
- If receipt code is different from NAPP code, won't find it
- Needs to search by RefDocNumber even without applicationCode

## Database Schema Understanding

### Invoice Table
- `Invoice.Code` - The actual invoice code (e.g., "00001", "63059")
- `Invoice.RefDocNumber` - Reference document number (can be NAPP code)
- `Invoice.RefDocName` - Reference document type (e.g., "NAPP", "WAPP", "INCR", "GOLA")

### InvoiceDetail Table
- `InvoiceDetail.RefDocNumber` - **This is where NAPP-45 is stored**
- `InvoiceDetail.RefDocName` - Document type (e.g., "NAPP")
- `InvoiceDetail.InvoiceId` - Links to Invoice

### Receipt Table
- `Receipt.Code` - Receipt code (usually same as invoice code)
- `Receipt.InvoiceId` - Links to Invoice

### Relationship Flow:
```
NAPP-45 (NicheApplication.Code)
  ↓
InvoiceDetail.RefDocNumber = "NAPP-45"
InvoiceDetail.RefDocName = "NAPP"
  ↓
Invoice.InvoiceId (via InvoiceDetail.InvoiceId)
  ↓
Receipt.InvoiceId (links to Invoice)
```

## Why It's Not Working

### Scenario 1: Invoice Not Created Yet
- If NAPP-45 booking exists but invoice hasn't been created
- **Solution**: Check if invoice exists first, provide helpful error message

### Scenario 2: Invoice Exists But Query Doesn't Match
- Invoice exists with `InvoiceDetail.RefDocNumber = "NAPP-45"`
- But `InvoiceRepository.getInvoiceByCode("NAPP-45")` fallback query:
  - May not match if RefDocNumber has different format
  - May return wrong invoice if multiple types share same number
  - Doesn't check RefDocName

### Scenario 3: Status Filter Too Restrictive
- Query filters `i.Status > 0`
- If invoice status is 0 (deleted/inactive), won't be found
- **Solution**: Add status fallback option

## Required Fixes

### Fix 1: Enhance InvoiceRepository.getInvoiceByCode() Fallback Query

**File**: `src/repositories/InvoiceRepository.js`

**Changes Needed**:
1. Add RefDocName filter when searching by RefDocNumber
2. Add case-insensitive RefDocNumber matching
3. Try to infer RefDocName from code pattern (NAPP-*, WAPP-*, etc.)
4. Add better logging for debugging

### Fix 2: Add applicationCode Parameter to InvoiceController

**File**: `src/controllers/InvoiceController.js`

**Changes Needed**:
1. Accept optional `applicationCode` query parameter
2. Pass it to repository method
3. Update repository method signature

### Fix 3: Enhance Receipt Lookup for NAPP Codes

**File**: `src/repositories/ReceiptRepository.js`

**Changes Needed**:
1. Add fallback to search by RefDocNumber even without applicationCode
2. Try to infer document type from code pattern
3. Improve error messages

## Implementation Plan

### Step 1: Fix InvoiceRepository Fallback Query
- Add RefDocName detection from code pattern
- Add RefDocName filter to fallback query
- Add case-insensitive RefDocNumber matching
- Add status fallback option

### Step 2: Update InvoiceController
- Add applicationCode query parameter support
- Pass to repository

### Step 3: Test
- Test with NAPP-45
- Test with other NAPP codes
- Test with invoice codes
- Verify no regressions

## Testing Queries

### Check if Invoice Exists for NAPP-45:
```sql
SELECT 
  i.InvoiceId,
  i.Code AS InvoiceCode,
  i.Status,
  id.RefDocNumber,
  id.RefDocName
FROM Invoice i
INNER JOIN InvoiceDetail id ON i.InvoiceId = id.InvoiceId
WHERE id.RefDocNumber = 'NAPP-45'
  AND id.RefDocName = 'NAPP'
ORDER BY i.TransactionDate DESC
```

### Check if Receipt Exists:
```sql
SELECT 
  r.ReceiptId,
  r.Code AS ReceiptCode,
  r.InvoiceId,
  i.Code AS InvoiceCode
FROM Receipt r
INNER JOIN Invoice i ON r.InvoiceId = i.InvoiceId
INNER JOIN InvoiceDetail id ON i.InvoiceId = id.InvoiceId
WHERE id.RefDocNumber = 'NAPP-45'
  AND id.RefDocName = 'NAPP'
ORDER BY r.ReceiptId DESC
```

## Expected Behavior After Fix

### GET /api/invoices/NAPP-45
**Should**:
1. Try to find invoice by Invoice.Code = "NAPP-45" (unlikely)
2. Fallback: Find invoice by InvoiceDetail.RefDocNumber = "NAPP-45" AND RefDocName = "NAPP"
3. Return invoice with all details

### GET /api/receipts/NAPP-45
**Should**:
1. Try to find receipt by Receipt.Code = "NAPP-45" (unlikely)
2. Fallback: Find receipt via invoice lookup
3. Return receipt with invoice details

### GET /api/invoices/NAPP-45?applicationCode=NAPP
**Should**:
1. Use RefDocName filter explicitly
2. More reliable matching

## Stored Procedures Check

### No Stored Procedures Needed
- All queries use direct SQL
- No stored procedures required for this functionality
- Current implementation uses parameterized queries (secure)

## Summary

**Main Issues**:
1. ✅ InvoiceRepository has fallback but missing RefDocName filter
2. ✅ InvoiceController doesn't accept applicationCode parameter
3. ✅ Receipt lookup may need enhancement for NAPP codes

**No Stored Procedures Required** - All can be done with direct SQL queries

**Priority**: High - This blocks users from viewing invoices/receipts for niche bookings

