# NAPP-45 Invoice & Receipt Access Fix Summary

## Problem
Cannot view invoice and receipt for niche booking with code `NAPP-45` via:
- `GET /api/invoices/NAPP-45` ❌
- `GET /api/receipts/NAPP-45` ❌

## Root Causes Identified

1. **InvoiceRepository.getInvoiceByCode()** fallback query didn't filter by `RefDocName`
   - Could return wrong invoice if multiple document types share same RefDocNumber
   - No case-insensitive matching for RefDocNumber

2. **InvoiceController** didn't accept `applicationCode` query parameter
   - Users couldn't explicitly specify document type (NAPP, WAPP, etc.)

3. **ReceiptRepository** didn't search by `InvoiceDetail.RefDocNumber` as fallback
   - Only searched by Receipt.Code and Invoice.Code
   - Missing lookup for application codes like NAPP-45

## Fixes Implemented

### Fix 1: Enhanced InvoiceRepository.getInvoiceByCode()
**File**: `src/repositories/InvoiceRepository.js`

**Changes**:
- ✅ Added `applicationCode` parameter to method signature
- ✅ Auto-detects RefDocName from code pattern (NAPP-*, WAPP-*, INCR-*, GOLA-*)
- ✅ Added RefDocName filter to fallback query
- ✅ Added case-insensitive RefDocNumber matching
- ✅ Improved logging for debugging

**Code Pattern Detection**:
```javascript
// Automatically detects document type from code:
// NAPP-45 → RefDocName = 'NAPP'
// WAPP-123 → RefDocName = 'WAPP'
// INCR-789 → RefDocName = 'INCR'
// GOLA-456 → RefDocName = 'GOLA'
```

### Fix 2: Updated InvoiceController.getInvoiceByCode()
**File**: `src/controllers/InvoiceController.js`

**Changes**:
- ✅ Added support for optional `applicationCode` query parameter
- ✅ Passes `applicationCode` to repository method
- ✅ Updated documentation comments

**Usage**:
```
GET /api/invoices/NAPP-45
GET /api/invoices/NAPP-45?applicationCode=NAPP  (explicit)
```

### Fix 3: Enhanced ReceiptRepository.getReceiptWithInvoiceAndDetails()
**File**: `src/repositories/ReceiptRepository.js`

**Changes**:
- ✅ Added final fallback to search by `InvoiceDetail.RefDocNumber`
- ✅ Auto-detects RefDocName from code pattern
- ✅ Filters by RefDocName when detected
- ✅ Case-insensitive RefDocNumber matching
- ✅ Improved logging

**Search Order**:
1. Receipt.Code (exact match)
2. Receipt.Code (case-insensitive)
3. Invoice.Code (fallback)
4. **InvoiceDetail.RefDocNumber (NEW - for NAPP codes)**

### Fix 4: Updated ReceiptService and ReceiptController
**Files**: 
- `src/services/ReceiptService.js`
- `src/controllers/ReceiptController.js`

**Changes**:
- ✅ Added `applicationCode` parameter support throughout the chain
- ✅ ReceiptController accepts optional `applicationCode` query parameter

## How It Works Now

### Invoice Lookup Flow:
```
GET /api/invoices/NAPP-45
  ↓
1. Try Invoice.Code = "NAPP-45" (unlikely)
  ↓
2. Fallback: InvoiceDetail.RefDocNumber = "NAPP-45" 
   AND RefDocName = "NAPP" (auto-detected)
   AND case-insensitive matching
  ↓
3. Return invoice with all details
```

### Receipt Lookup Flow:
```
GET /api/receipts/NAPP-45
  ↓
1. Try Receipt.Code = "NAPP-45" (unlikely)
  ↓
2. Try Invoice.Code = "NAPP-45" (fallback)
  ↓
3. NEW: Try InvoiceDetail.RefDocNumber = "NAPP-45"
   AND RefDocName = "NAPP" (auto-detected)
  ↓
4. Return receipt with invoice details
```

## Testing

### Test Case 1: Invoice by NAPP Code
```bash
# Should work now
curl -X GET "http://localhost:3000/api/invoices/NAPP-45" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

### Test Case 2: Invoice with Explicit applicationCode
```bash
# Explicit document type
curl -X GET "http://localhost:3000/api/invoices/NAPP-45?applicationCode=NAPP" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

### Test Case 3: Receipt by NAPP Code
```bash
# Should work now
curl -X GET "http://localhost:3000/api/receipts/NAPP-45" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

### Test Case 4: Receipt with Explicit applicationCode
```bash
# Explicit document type
curl -X GET "http://localhost:3000/api/receipts/NAPP-45?applicationCode=NAPP" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

## Database Query Examples

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

## Expected Behavior

### ✅ Success Response (200)
```json
{
  "success": true,
  "data": {
    "invoiceId": 123,
    "code": "00001",
    "refDocNumber": "NAPP-45",
    "refDocName": "NAPP",
    "customerName": "John Doe",
    "totalAmount": 5000.00,
    "details": [...]
  },
  "message": "Invoice retrieved successfully"
}
```

### ❌ Not Found Response (404)
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Invoice not found"
  }
}
```

**Note**: If invoice/receipt doesn't exist for NAPP-45, you'll get a 404. This means:
- Invoice hasn't been created yet for this booking
- Or invoice exists but RefDocNumber doesn't match exactly
- Check database using SQL queries above

## Stored Procedures

**No stored procedures needed** ✅
- All fixes use direct SQL queries
- No database changes required
- Backward compatible with existing code

## Backward Compatibility

✅ **All changes are backward compatible**:
- Existing invoice code lookups still work
- Existing receipt code lookups still work
- New functionality is additive (fallback only)
- No breaking changes to API contracts

## Files Modified

1. `src/repositories/InvoiceRepository.js` - Enhanced fallback query
2. `src/controllers/InvoiceController.js` - Added applicationCode support
3. `src/repositories/ReceiptRepository.js` - Added RefDocNumber fallback
4. `src/services/ReceiptService.js` - Added applicationCode parameter
5. `src/controllers/ReceiptController.js` - Added applicationCode support

## Next Steps

1. ✅ Test with NAPP-45
2. ✅ Test with other NAPP codes
3. ✅ Test with WAPP, INCR, GOLA codes
4. ✅ Verify no regressions with regular invoice/receipt codes
5. ✅ Check logs for any errors

## Troubleshooting

### Still Getting 404?

1. **Check if invoice exists**:
   ```sql
   SELECT * FROM InvoiceDetail WHERE RefDocNumber = 'NAPP-45'
   ```

2. **Check invoice status**:
   ```sql
   SELECT i.*, id.RefDocNumber, id.RefDocName 
   FROM Invoice i
   INNER JOIN InvoiceDetail id ON i.InvoiceId = id.InvoiceId
   WHERE id.RefDocNumber = 'NAPP-45'
   ```
   - If `Status = 0`, invoice is inactive/deleted
   - Fix: Update status or check why it's inactive

3. **Check churchId**:
   - Ensure your JWT token has correct `churchId`
   - Invoice must belong to same church

4. **Check RefDocName**:
   ```sql
   SELECT DISTINCT RefDocName FROM InvoiceDetail WHERE RefDocNumber LIKE 'NAPP-%'
   ```
   - Should be 'NAPP', not 'napp' or 'Napp'
   - Fix: Update RefDocName if incorrect

## Summary

✅ **Fixed**: Invoice lookup by NAPP codes
✅ **Fixed**: Receipt lookup by NAPP codes  
✅ **Added**: Auto-detection of document type from code pattern
✅ **Added**: Explicit applicationCode parameter support
✅ **Added**: Case-insensitive matching
✅ **Added**: RefDocName filtering for accuracy
✅ **No Breaking Changes**: All existing functionality preserved
✅ **No Stored Procedures Required**: Uses direct SQL queries

The system should now correctly find invoices and receipts for NAPP-45 and other application codes! 🎉

