# NAPP-53 Invoice 404 Deep Fix

## Problem Analysis

Based on the terminal logs, the issue is:
1. **SQL Syntax Error**: Diagnostic query 2 has a syntax error - "Incorrect syntax near the keyword 'AND'"
2. **Invoice Not Found**: "DIAGNOSTIC: No invoices found with RefDocNumber matching "NAPP-53" (searched without any filters)"
3. **Invoice Creation Status Unknown**: No logs showing "Invoice created successfully for niche booking: NAPP-53"

## Root Causes

### 1. SQL Syntax Error in Diagnostic Query
The diagnostic query was appending `AND i.ChurchId = @churchId` after `ORDER BY`, which is invalid SQL syntax.

### 2. Invoice May Not Be Created
The diagnostic shows no invoices exist with RefDocNumber "NAPP-53", which suggests:
- Invoice creation is failing silently
- Invoice creation is not being triggered
- RefDocNumber is not being saved correctly

### 3. Missing Logging
Insufficient logging to track:
- When invoice creation is attempted
- What RefDocNumber values are being saved
- Why invoice creation might fail

## Fixes Implemented

### 1. Fixed SQL Syntax Error

**File**: `src/repositories/InvoiceRepository.js`

**Fix**: Moved `ORDER BY` clause to after the conditional `AND i.ChurchId` filter, and wrapped diagnostic query 2 in proper try-catch.

```javascript
// Before (BROKEN):
diagnosticQuery2 += ' ORDER BY i.TransactionDate DESC';
if (churchId) {
  diagnosticQuery2 += ' AND i.ChurchId = @churchId'; // ERROR: Can't add AND after ORDER BY
}

// After (FIXED):
if (churchId) {
  diagnosticQuery2 += ' AND i.ChurchId = @churchId';
}
diagnosticQuery2 += ' ORDER BY i.TransactionDate DESC';
```

### 2. Enhanced Logging for Invoice Creation

**File**: `src/services/NicheBookingService.js`

**Added**:
- Log each invoice detail being prepared with RefDocNumber
- Log all details before saving to invoice service
- Ensure RefDocNumber is trimmed string

```javascript
const invoiceDetails = invoiceItems.map(item => {
  const detail = {
    // ... other fields ...
    refDocNumber: String(item.refDocNumber || '').trim(), // Ensure it's a string and trimmed
    // ...
  };
  
  logger.debug(`Preparing invoice detail: ItemId=${detail.itemId}, RefDocNumber="${detail.refDocNumber}", RefDocName="${detail.refDocName}"`);
  
  return detail;
});

logger.info(`Prepared ${invoiceDetails.length} invoice details for ${normalizedApplicationCode}:`, 
  invoiceDetails.map(d => ({
    itemId: d.itemId,
    refDocNumber: d.refDocNumber,
    refDocName: d.refDocName
  }))
);
```

### 3. Enhanced Logging in InvoiceRepository

**File**: `src/repositories/InvoiceRepository.js`

**Added**:
- Log each InvoiceDetail RefDocNumber being saved
- Log all RefDocNumbers after invoice creation
- Better error handling for diagnostic queries

```javascript
// Log each detail being saved
const refDocNumberValue = detail.refDocNumber || null;
logger.debug(`Saving InvoiceDetail: ItemId=${detail.itemId}, RefDocNumber="${refDocNumberValue}", RefDocName="${detail.refDocName}"`);

// Log all details after commit
const refDocNumbers = invoiceDetails?.map(d => ({
  itemId: d.itemId,
  refDocNumber: d.refDocNumber,
  refDocName: d.refDocName
})) || [];

logger.info(`Invoice and details saved successfully. InvoiceId: ${invoiceId}`, {
  invoiceId,
  invoiceCode: invoice.code,
  invoiceRefDocNumber: invoice.refDocNumber,
  detailRefDocNumbers: refDocNumbers
});
```

## Testing Steps

### Step 1: Create New Niche Booking
```bash
POST /api/niche-bookings
{
  "nicheApplicationCode": "NAPP-54", // or let system generate
  "nicheDetails": {
    "nicheId": 123,
    "amount": 4000
  },
  ...
}
```

### Step 2: Check Server Logs

Look for these log messages in order:

1. **Invoice Creation Attempt**:
   ```
   Attempting to create comprehensive invoice for niche booking: NAPP-54
   ```

2. **Invoice Items Prepared**:
   ```
   Prepared X invoice details for NAPP-54: [array of details with RefDocNumbers]
   ```

3. **Invoice Details Being Saved**:
   ```
   Saving InvoiceDetail: ItemId=X, RefDocNumber="NAPP-54", RefDocName="NAPP"
   ```

4. **Invoice Created Successfully**:
   ```
   Invoice created successfully for niche booking: NAPP-54
   ```

5. **Invoice Saved to Database**:
   ```
   Invoice and details saved successfully. InvoiceId: XXXX
   detailRefDocNumbers: [{itemId: X, refDocNumber: "NAPP-54", refDocName: "NAPP"}, ...]
   ```

6. **Invoice Verification**:
   ```
   Invoice verification successful: Found by application code NAPP-54
   ```

### Step 3: Test Invoice Retrieval
```bash
GET /api/invoices/NAPP-54
```

**Expected**: Returns invoice with details

**If 404**: Check logs for:
- Was invoice created? (look for "Invoice created successfully")
- What RefDocNumbers were saved? (check "detailRefDocNumbers" in logs)
- Diagnostic query results (check "DIAGNOSTIC:" messages)

## Diagnostic Queries

If invoice still not found, the enhanced diagnostics will show:

1. **Invoices with matching RefDocNumber** (any status/church)
2. **Invoices with similar RefDocNumber** (partial match)
3. **Recent invoices for church** (to verify creation is working)
4. **NicheApplication existence** (to verify application exists)

## Common Issues and Solutions

### Issue 1: Invoice Creation Fails Silently
**Symptom**: No "Invoice created successfully" log
**Check**: 
- Look for "Failed to create invoice" errors
- Check if `invoiceItems.length === 0` (no items determined)
- Check if validation fails (INVALID_REF_DOCUMENT)

### Issue 2: RefDocNumber Not Saved
**Symptom**: Invoice created but RefDocNumber is null or empty
**Check**:
- Look for "Saving InvoiceDetail" logs - what RefDocNumber value is shown?
- Check "detailRefDocNumbers" in "Invoice and details saved successfully" log

### Issue 3: RefDocNumber Mismatch
**Symptom**: Invoice exists but RefDocNumber doesn't match search
**Check**:
- Compare RefDocNumber in logs vs. search code
- Check for extra spaces or different format
- Use diagnostic query to see actual RefDocNumber values in database

## Next Steps

1. **Create a new booking** (NAPP-54 or later)
2. **Monitor server logs** for the new logging messages
3. **Check if invoice is created** by looking for "Invoice created successfully"
4. **Verify RefDocNumber values** in the logs match what you're searching for
5. **Test invoice retrieval** with the new booking code

If the issue persists after these fixes, the enhanced logging will provide detailed information about:
- Whether invoice creation is being attempted
- What RefDocNumber values are being saved
- Why invoice lookup might be failing

## Files Modified

1. `src/repositories/InvoiceRepository.js`
   - Fixed SQL syntax error in diagnostic query 2
   - Added logging for RefDocNumber values being saved
   - Enhanced error handling for diagnostic queries

2. `src/services/NicheBookingService.js`
   - Added logging for invoice details preparation
   - Ensured RefDocNumber is trimmed string
   - Added comprehensive logging before invoice creation

## Notes

- All changes are backward compatible
- No breaking changes to existing functionality
- Enhanced logging helps identify root cause quickly
- Diagnostic queries provide comprehensive troubleshooting information

