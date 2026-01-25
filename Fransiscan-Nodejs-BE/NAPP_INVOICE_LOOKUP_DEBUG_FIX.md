# NAPP-48 Invoice Lookup Debug Fix

## Problem
`GET /api/invoices/NAPP-48` returns `{"success":false,"error":"Invoice not found"}` for newly created invoice.

## Root Cause Analysis

### Possible Issues:
1. **Invoice not created** - Invoice creation might have failed silently
2. **RefDocNumber mismatch** - RefDocNumber in InvoiceDetail might not match exactly
3. **RefDocName mismatch** - RefDocName might not be "NAPP"
4. **Status filter** - Invoice status might not be > 0
5. **ChurchId filter** - Invoice might belong to different church
6. **Timing issue** - Invoice might not be committed yet

## Fixes Implemented

### Fix 1: Enhanced Fallback Logic in InvoiceRepository
**File**: `src/repositories/InvoiceRepository.js`

**Changes**:
1. Added fallback to search without RefDocName filter if not found with filter
2. Added diagnostic query to check if invoice exists with different RefDocName
3. Enhanced logging for debugging

**Code**:
```javascript
// If not found with RefDocName filter, try without it
if (refDocName && appResult.recordset.length === 0) {
  // Try without RefDocName filter
  // ... fallback query
  
  // Diagnostic query to check for RefDocName mismatch
  // ... diagnostic query
}
```

### Fix 2: Enhanced Error Messages in InvoiceController
**File**: `src/controllers/InvoiceController.js`

**Changes**:
1. Added diagnostic check to see if invoice exists but belongs to different church
2. Enhanced error response with diagnostic information
3. Better logging for debugging

**Code**:
```javascript
if (!invoice) {
  // Try to find invoice without churchId filter for diagnostics
  const invoiceWithoutChurch = await this.invoiceRepository.getInvoiceByCode(code, null, applicationCode);
  if (invoiceWithoutChurch) {
    diagnosticInfo = {
      message: 'Invoice exists but belongs to a different church',
      foundChurchId: invoiceWithoutChurch.churchId,
      requestedChurchId: churchId
    };
  }
}
```

## Diagnostic Queries

### Check if Invoice Exists for NAPP-48:
```sql
SELECT 
  i.InvoiceId,
  i.Code AS InvoiceCode,
  i.Status,
  i.ChurchId,
  id.RefDocNumber,
  id.RefDocName,
  id.ItemId
FROM Invoice i
INNER JOIN InvoiceDetail id ON i.InvoiceId = id.InvoiceId
WHERE id.RefDocNumber = 'NAPP-48'
ORDER BY i.TransactionDate DESC
```

### Check All Invoices for NAPP-48 (without filters):
```sql
SELECT 
  i.InvoiceId,
  i.Code AS InvoiceCode,
  i.Status,
  i.ChurchId,
  id.RefDocNumber,
  id.RefDocName
FROM Invoice i
INNER JOIN InvoiceDetail id ON i.InvoiceId = id.InvoiceId
WHERE id.RefDocNumber LIKE '%NAPP-48%'
  OR UPPER(id.RefDocNumber) LIKE '%NAPP-48%'
ORDER BY i.TransactionDate DESC
```

### Check if Invoice was Created:
```sql
SELECT TOP 1
  i.InvoiceId,
  i.Code AS InvoiceCode,
  i.Status,
  i.ChurchId,
  i.TransactionDate,
  i.RefDocNumber AS InvoiceRefDocNumber,
  i.RefDocName AS InvoiceRefDocName
FROM Invoice i
WHERE i.RefDocNumber = 'NAPP-48'
   OR i.Code = 'NAPP-48'
ORDER BY i.TransactionDate DESC
```

## Testing Steps

### Step 1: Verify Invoice Creation
1. Check server logs when creating booking for NAPP-48
2. Look for: `Invoice created successfully for niche booking: NAPP-48`
3. If not found, invoice creation failed

### Step 2: Check Database
Run diagnostic queries above to verify:
- Invoice exists
- RefDocNumber matches exactly
- RefDocName is "NAPP"
- Status is 1 (or > 0)
- ChurchId matches

### Step 3: Test Invoice Lookup
```bash
# Test with applicationCode parameter
GET /api/invoices/NAPP-48?applicationCode=NAPP

# Test without applicationCode (should auto-detect)
GET /api/invoices/NAPP-48
```

### Step 4: Check Logs
Look for these log messages:
- `Invoice not found by code, trying niche application code: NAPP-48`
- `Invoice found by niche application code: NAPP-48 (RefDocName: NAPP)`
- `Invoice not found with RefDocName filter, trying without filter`
- `Invoice exists but RefDocName mismatch`

## Expected Behavior

### Successful Lookup:
```
GET /api/invoices/NAPP-48
  ↓
1. Try Invoice.Code = "NAPP-48" (unlikely)
  ↓
2. Fallback: InvoiceDetail.RefDocNumber = "NAPP-48"
   AND RefDocName = "NAPP" (auto-detected)
   AND Invoice.Status > 0
  ↓
3. If not found, try without RefDocName filter
  ↓
4. Return invoice with all details ✅
```

### If Invoice Not Found:
Response includes diagnostic information:
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Invoice not found"
  },
  "diagnostic": {
    "message": "Invoice exists but belongs to a different church",
    "foundChurchId": 2,
    "requestedChurchId": 1
  }
}
```

## Common Issues and Solutions

### Issue 1: Invoice Not Created
**Symptom**: No invoice in database
**Solution**: Check booking creation logs, verify invoice creation succeeded

### Issue 2: RefDocNumber Mismatch
**Symptom**: Invoice exists but RefDocNumber doesn't match
**Solution**: Check if RefDocNumber is stored correctly (case-sensitive)

### Issue 3: RefDocName Mismatch
**Symptom**: Invoice exists but RefDocName is not "NAPP"
**Solution**: Fix will try without RefDocName filter as fallback

### Issue 4: Status = 0
**Symptom**: Invoice exists but Status = 0 (deleted)
**Solution**: Check why invoice was deleted, restore if needed

### Issue 5: ChurchId Mismatch
**Symptom**: Invoice exists but belongs to different church
**Solution**: Diagnostic will show this in error response

## Next Steps

1. **Check Server Logs**: Look for invoice creation and lookup logs
2. **Run Diagnostic Queries**: Verify invoice exists in database
3. **Test with applicationCode Parameter**: `GET /api/invoices/NAPP-48?applicationCode=NAPP`
4. **Check ChurchId**: Verify user's churchId matches invoice's churchId

## Files Modified

1. `src/repositories/InvoiceRepository.js` - Enhanced fallback and diagnostic logic
2. `src/controllers/InvoiceController.js` - Enhanced error messages with diagnostics

## Summary

✅ **Enhanced**: Fallback logic to search without RefDocName filter
✅ **Added**: Diagnostic queries to identify mismatches
✅ **Improved**: Error messages with diagnostic information
✅ **Better**: Logging for debugging

The system should now:
- Find invoices even if RefDocName doesn't match exactly
- Provide helpful diagnostic information when invoice not found
- Log detailed information for debugging

If invoice still not found after these fixes, check:
1. Invoice was actually created (check database)
2. RefDocNumber matches exactly (case-sensitive)
3. Invoice Status > 0
4. ChurchId matches

