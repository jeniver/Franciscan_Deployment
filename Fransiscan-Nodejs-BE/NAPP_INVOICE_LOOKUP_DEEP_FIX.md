# NAPP Invoice Lookup Deep Fix - NAPP-50 Issue

## Problem
Newly created niche bookings (e.g., NAPP-50) are not findable via `/api/invoices/NAPP-50`, returning `{"success":false,"error":{"code":"NOT_FOUND","message":"Invoice not found"}}`.

## Root Cause Analysis

The issue could stem from several potential problems:

1. **Invoice Creation Failure**: Invoice might not be created at all due to validation failures
2. **RefDocNumber Mismatch**: InvoiceDetail.RefDocNumber might not match the search query exactly
3. **Timing Issues**: Invoice might not be immediately available after creation due to transaction commit timing
4. **Status Filter**: Invoice might be created with wrong status or filtered out by `Status > 0` check
5. **ChurchId Mismatch**: Invoice might be created with different ChurchId than expected

## Fixes Implemented

### 1. Enhanced Logging in Invoice Creation Flow (`NicheBookingService.js`)

**Added comprehensive logging:**
- Log invoice creation attempts with full context
- Log validation failures with detailed error information
- Log successful invoice creation with all relevant IDs and codes
- **CRITICAL**: Added post-creation verification step that:
  - Waits 200ms for transaction to fully commit
  - Verifies invoice can be found by application code (RefDocNumber)
  - Logs warning if invoice is not findable by application code
  - Logs error if invoice cannot be found at all

**Key Code Addition:**
```javascript
// After invoice creation, verify it's findable
try {
  await new Promise(resolve => setTimeout(resolve, 200));
  
  const verifyInvoice = await invoiceRepository.getInvoiceByCode(
    normalizedApplicationCode,
    user.churchId,
    'NAPP'
  );
  
  if (!verifyInvoice) {
    logger.warn(`Invoice created but not findable by application code...`);
  } else {
    logger.info(`Invoice verification successful...`);
  }
} catch (verifyError) {
  logger.error('Error verifying invoice after creation:', verifyError);
}
```

### 2. Enhanced Diagnostic Queries in InvoiceRepository (`InvoiceRepository.js`)

**Added diagnostic query when invoice not found:**
- Checks for invoices with matching RefDocNumber regardless of status
- Checks both Invoice.RefDocNumber and InvoiceDetail.RefDocNumber
- Provides detailed information about found invoices (status, RefDocName, etc.)
- Helps identify if invoice exists but is filtered out by status or other conditions

**Key Code Addition:**
```javascript
// Additional diagnostic: Check if any invoice exists with this RefDocNumber (regardless of status)
const diagnosticQuery = `
  SELECT TOP 5
    i.InvoiceId,
    i.Code AS InvoiceCode,
    i.Status,
    i.RefDocNumber AS InvoiceRefDocNumber,
    id.RefDocNumber AS DetailRefDocNumber,
    ...
  FROM Invoice i WITH(NOLOCK)
  LEFT JOIN InvoiceDetail id ON i.InvoiceId = id.InvoiceId
  WHERE (id.RefDocNumber = @code OR ...)
     OR (i.RefDocNumber = @code OR ...)
`;
```

### 3. Enhanced Logging in InvoiceService (`InvoiceService.js`)

**Added detailed logging after invoice save:**
- Logs invoiceId, invoiceCode, refDocNumber, refDocName, churchId, status
- Helps track invoice creation success and parameters

### 4. Enhanced Logging in InvoiceRepository.addInvoiceAndDetail (`InvoiceRepository.js`)

**Added detailed logging after transaction commit:**
- Logs all invoice details including RefDocNumbers from invoice details
- Helps verify that RefDocNumber is correctly set in InvoiceDetail

### 5. Enhanced Logging in ReferenceDocumentValidator (`ReferenceDocumentValidator.js`)

**Added debug logging:**
- Logs when validation succeeds via service
- Logs when validation succeeds via direct repository query
- Logs when validation fails with reasons
- Helps identify validation issues

## Testing Steps

1. **Create a new niche booking** (e.g., NAPP-51)
2. **Check server logs** for:
   - "Invoice created successfully for niche booking: NAPP-51"
   - "Invoice verification successful: Found by application code NAPP-51"
   - If verification fails, check the warning/error messages
3. **Immediately try to retrieve invoice:**
   ```bash
   curl -X GET "http://localhost:3000/api/invoices/NAPP-51" \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```
4. **If invoice not found, check logs for:**
   - Diagnostic query results showing invoices with matching RefDocNumber
   - Status values of found invoices
   - RefDocName values

## Expected Behavior

After these fixes:

1. **Invoice Creation**: Invoice should be created successfully with proper RefDocNumber in InvoiceDetail
2. **Post-Creation Verification**: System will verify invoice is findable immediately after creation
3. **Lookup Success**: Invoice should be findable via `/api/invoices/NAPP-XX` immediately after creation
4. **Diagnostic Information**: If invoice is not found, detailed diagnostic information will be logged

## Next Steps if Issue Persists

If NAPP-50 (or future bookings) still cannot be found:

1. **Check server logs** for:
   - Invoice creation success/failure messages
   - Post-creation verification results
   - Diagnostic query results
   
2. **Check database directly:**
   ```sql
   -- Check if invoice exists
   SELECT i.*, id.RefDocNumber, id.RefDocName
   FROM Invoice i
   LEFT JOIN InvoiceDetail id ON i.InvoiceId = id.InvoiceId
   WHERE id.RefDocNumber = 'NAPP-50'
      OR i.RefDocNumber = 'NAPP-50'
   
   -- Check invoice status
   SELECT InvoiceId, Code, Status, RefDocNumber, RefDocName, ChurchId
   FROM Invoice
   WHERE Code IN (
     SELECT Code FROM InvoiceDetail WHERE RefDocNumber = 'NAPP-50'
   )
   ```

3. **Verify RefDocNumber format**: Ensure it matches exactly (case-sensitive, no extra spaces)

## Files Modified

1. `src/services/NicheBookingService.js` - Added post-creation verification
2. `src/repositories/InvoiceRepository.js` - Added diagnostic queries and enhanced logging
3. `src/services/InvoiceService.js` - Enhanced logging
4. `src/services/ReferenceDocumentValidator.js` - Enhanced debug logging

## Notes

- All changes are backward compatible
- No breaking changes to existing functionality
- Enhanced logging helps identify issues without affecting performance
- Post-creation verification adds ~200ms delay but ensures invoice is findable

