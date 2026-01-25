# NAPP-53 Invoice 404 Fix

## Problem
After implementing multi-item invoice creation, invoices for new niche bookings (e.g., NAPP-53) are still returning 404 Not Found when accessed via `/api/invoices/NAPP-53`.

## Root Cause Analysis

### Issue 1: Reference Document Validation Failure
**Problem**: When creating invoices with inscription items, the system sets `RefDocNumber = "I-NAPP-53"` and `RefDocName = "INCR"`. The `ReferenceDocumentValidator` tries to validate "I-NAPP-53" as an actual INCR document, but this code doesn't exist - it's just a derived reference format.

**Impact**: Invoice creation fails during validation, preventing the invoice from being created.

**Solution**: Updated `ReferenceDocumentValidator.validateNicheInscriptionRequest()` to:
- Detect "I-NAPP-XX" format
- Extract base code "NAPP-XX" 
- Validate the base niche application instead
- Accept the reference if base application exists (even if INCR doesn't exist yet)

### Issue 2: Invoice Lookup Query Optimization
**Problem**: The lookup query uses `INNER JOIN` which might not efficiently find invoices when multiple InvoiceDetail rows exist.

**Solution**: Changed to use `EXISTS` subquery for better performance and to ensure invoices are found when ANY InvoiceDetail matches the RefDocNumber.

### Issue 3: Missing Comprehensive Diagnostics
**Problem**: When invoice lookup fails, insufficient diagnostic information is provided.

**Solution**: Enhanced diagnostic queries to check:
- Invoices with matching RefDocNumber (any status/church)
- Invoices with similar RefDocNumber (partial match)
- Recent invoices for the church
- NicheApplication existence

## Fixes Implemented

### 1. ReferenceDocumentValidator Enhancement

**File**: `src/services/ReferenceDocumentValidator.js`

**Changes**:
- Updated `validateNicheInscriptionRequest()` to handle "I-NAPP-XX" format
- Extracts base code and validates niche application
- Accepts derived references if base application exists

**Key Code**:
```javascript
// Handle "I-NAPP-XX" format - this is a derived reference, not an actual INCR code
if (code && code.toUpperCase().startsWith('I-NAPP-')) {
  const baseCode = code.substring(2); // Remove "I-" prefix to get "NAPP-XX"
  // Validate the base niche application instead
  const baseAppValid = await this.validateNicheApplication(baseCode, churchId);
  if (baseAppValid) {
    return true; // Accept if base application exists
  }
}
```

### 2. Invoice Lookup Query Optimization

**File**: `src/repositories/InvoiceRepository.js`

**Changes**:
- Changed from `INNER JOIN` to `EXISTS` subquery
- More efficient for finding invoices with multiple detail rows
- Better handles cases where invoice has both niche and inscription items

**Key Code**:
```sql
SELECT TOP 1 i.*
FROM Invoice i WITH(NOLOCK)
WHERE EXISTS (
  SELECT 1 
  FROM InvoiceDetail id WITH(NOLOCK)
  WHERE id.InvoiceId = i.InvoiceId
    AND (
      id.RefDocNumber = @code 
      OR UPPER(LTRIM(RTRIM(id.RefDocNumber))) = @codeUpper
      OR LTRIM(RTRIM(id.RefDocNumber)) = LTRIM(RTRIM(@code))
    )
    AND id.RefDocName = @refDocName  -- If provided
)
AND i.Status > 0
```

### 3. Enhanced Diagnostic Queries

**File**: `src/repositories/InvoiceRepository.js`

**Changes**:
- Added comprehensive diagnostic queries when invoice not found
- Checks multiple scenarios:
  - Invoices with matching RefDocNumber (any status/church)
  - Invoices with similar RefDocNumber
  - Recent invoices for the church
  - NicheApplication existence

**File**: `src/controllers/InvoiceController.js`

**Changes**:
- Enhanced error response with diagnostic information
- Provides helpful context when invoice not found

### 4. Enhanced Logging

**File**: `src/repositories/InvoiceRepository.js`

**Changes**:
- Added logging at start of `getInvoiceByCode()` method
- Logs search parameters for debugging

## Testing

### Test Case 1: Create New Niche Booking
```bash
POST /api/niche-bookings
{
  "nicheDetails": {
    "nicheId": 123,
    "amount": 4000
  },
  ...
}

# Expected: Invoice created successfully
# Verify: Check server logs for "Invoice created successfully for niche booking: NAPP-53"
```

### Test Case 2: Retrieve Invoice
```bash
GET /api/invoices/NAPP-53

# Expected: Returns invoice with multiple items
# If 404: Check server logs for diagnostic information
```

### Test Case 3: Check Server Logs
Look for:
- `"Invoice created successfully for niche booking: NAPP-53"`
- `"Invoice verification successful: Found by application code NAPP-53"`
- `"DIAGNOSTIC: Found X invoice(s) with matching RefDocNumber"` (if invoice not found)

## Expected Behavior After Fix

1. **Invoice Creation**: 
   - Invoices are created successfully even with "I-NAPP-XX" format references
   - Validation accepts derived references if base application exists

2. **Invoice Lookup**:
   - Invoices are found efficiently using EXISTS subquery
   - Works correctly even when invoice has multiple detail rows

3. **Error Diagnostics**:
   - Comprehensive diagnostic information when invoice not found
   - Helps identify root cause (status, churchId, RefDocNumber format, etc.)

## Diagnostic Information

When invoice lookup fails, the system now provides:

1. **Invoices with matching RefDocNumber** (any status/church):
   - Shows invoiceId, invoiceCode, status, RefDocNumber, churchId
   - Identifies status issues (Status = 0 = deleted)
   - Identifies churchId mismatches

2. **Invoices with similar RefDocNumber**:
   - Partial matches to help identify formatting issues

3. **Recent invoices for church**:
   - Verifies invoice creation is working
   - Shows actual RefDocNumber values in database

4. **NicheApplication existence**:
   - Confirms if application exists for the code

## Next Steps if Issue Persists

If NAPP-53 still returns 404:

1. **Check Server Logs** for:
   - Invoice creation success/failure messages
   - Validation errors
   - Diagnostic query results

2. **Check Database Directly**:
   ```sql
   -- Check if invoice exists
   SELECT i.*, id.RefDocNumber, id.RefDocName
   FROM Invoice i
   LEFT JOIN InvoiceDetail id ON i.InvoiceId = id.InvoiceId
   WHERE id.RefDocNumber LIKE '%NAPP-53%'
      OR i.RefDocNumber LIKE '%NAPP-53%'
   ORDER BY i.TransactionDate DESC
   
   -- Check invoice status
   SELECT InvoiceId, Code, Status, RefDocNumber, ChurchId
   FROM Invoice
   WHERE InvoiceId IN (
     SELECT InvoiceId FROM InvoiceDetail WHERE RefDocNumber LIKE '%NAPP-53%'
   )
   ```

3. **Verify Invoice Creation**:
   - Check if "Invoice created successfully" log appears
   - Check if validation errors occurred
   - Verify invoiceId and invoiceCode in logs

## Files Modified

1. `src/services/ReferenceDocumentValidator.js` - Fixed "I-NAPP-XX" validation
2. `src/repositories/InvoiceRepository.js` - Optimized lookup query, added diagnostics
3. `src/controllers/InvoiceController.js` - Enhanced error diagnostics

## Notes

- All changes are backward compatible
- No breaking changes to existing functionality
- Enhanced diagnostics help identify issues quickly
- Validation now correctly handles derived reference formats

