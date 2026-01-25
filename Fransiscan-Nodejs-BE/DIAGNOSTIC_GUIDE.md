# Diagnostic Guide for Niche Booking Invoice Creation

## Overview

This guide helps diagnose why invoices are not being created or found for new niche bookings.

## What Was Added

### 1. Comprehensive Diagnostic Logging

Added detailed logging at every critical step of the invoice creation process:

- **Application Code Resolution**: Logs how the application code is resolved
- **Booking Data Analysis**: Logs all booking data used for invoice item determination
- **Item Selection Process**: Logs each step of item selection (niche, inscription, urn, etc.)
- **Invoice Data Preparation**: Logs the complete invoice data before saving
- **Invoice Creation Result**: Logs success/failure of invoice creation with detailed error information
- **Invoice Verification**: Logs multiple verification attempts to ensure invoice is findable
- **Final Summary**: Logs a comprehensive summary of the entire invoice creation attempt

### 2. Inscription API Diagnostic Logging

Added logging to the inscription items API endpoint:
- Logs when the API is called
- Logs application resolution results
- Logs item retrieval results
- Logs the final response structure

### 3. Diagnostic Script

Created a standalone diagnostic script (`scripts/diagnose-niche-booking.js`) that:
- Checks if NicheApplication exists
- Checks if NicheBooking exists
- Checks if Invoice exists (by RefDocNumber)
- Checks for similar invoices (with trailing spaces)
- Lists recent invoices for the church
- Checks for inscription requests
- Provides recommendations based on findings

## How to Use

### 1. Check Application Logs

When creating a new niche booking, look for log entries with the `DIAGNOSTIC:` prefix:

```bash
# Example log entries to look for:
DIAGNOSTIC: Application code resolution for invoice creation
DIAGNOSTIC: Booking data for invoice item determination
DIAGNOSTIC: Invoice item determination result
DIAGNOSTIC: Invoice data prepared for saving
DIAGNOSTIC: Invoice creation result (first attempt)
DIAGNOSTIC: Final invoice creation summary
```

### 2. Run Diagnostic Script

For a specific application code (e.g., `NAPP-52`):

```bash
cd Fransiscan-Nodejs-BE
node scripts/diagnose-niche-booking.js NAPP-52
```

This will show:
- ✅ What exists (Application, Booking, Invoice)
- ❌ What's missing
- ⚠️ Potential issues (trailing spaces, case differences)

### 3. Check Invoice API

After creating a booking, immediately test the invoice API:

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/invoices/NAPP-52
```

### 4. Check Inscription API

To verify inscription items are accessible:

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/inscriptions/NAPP-52/items
```

## Common Issues and Solutions

### Issue 1: Invoice Not Created

**Symptoms:**
- Log shows `CRITICAL: Invoice not created for niche booking`
- Diagnostic script shows no invoice exists

**Possible Causes:**
1. **Missing Application Code**: Application code not resolved correctly
   - Check: `DIAGNOSTIC: Application code resolution` log
   - Solution: Ensure application is created before booking

2. **No Items Found**: No invoice items determined
   - Check: `DIAGNOSTIC: Invoice item determination result` log
   - Solution: Verify items exist in Item table for the church

3. **Validation Failure**: Reference document validation failed
   - Check: `DIAGNOSTIC: Invoice creation result` log for error code `INVALID_REF_DOCUMENT`
   - Solution: Check if application exists in database immediately after creation

### Issue 2: Invoice Created But Not Findable

**Symptoms:**
- Log shows invoice created successfully
- But API returns "Invoice not found"

**Possible Causes:**
1. **RefDocNumber Mismatch**: RefDocNumber in InvoiceDetail doesn't match application code
   - Check: Diagnostic script output for RefDocNumber values
   - Solution: Ensure RefDocNumber normalization is working

2. **Trailing Spaces**: RefDocNumber has trailing spaces in database
   - Check: Diagnostic script shows similar invoices with trailing spaces
   - Solution: The normalization fix should handle this, but may need to clean existing data

3. **Transaction Timing**: Invoice not yet committed when lookup happens
   - Check: Invoice verification logs show multiple attempts
   - Solution: The verification retry logic should handle this

### Issue 3: Inscription Items Not Found

**Symptoms:**
- API returns 404 or empty items array

**Possible Causes:**
1. **Inscription Request Not Created**: No NicheInscriptionRequest exists for the booking
   - Check: Diagnostic script section 5
   - Solution: Inscription request must be created separately

2. **Application Code Mismatch**: Inscription uses different code format
   - Check: `DIAGNOSTIC: Application resolution result` log
   - Solution: Use the correct inscription code (may be different from NAPP code)

## Log Analysis Checklist

When debugging, check these log entries in order:

1. ✅ `DIAGNOSTIC: Application code resolution` - Is application code resolved?
2. ✅ `DIAGNOSTIC: Booking data for invoice item determination` - Is booking data present?
3. ✅ `DIAGNOSTIC: Invoice item determination result` - Are items found?
4. ✅ `DIAGNOSTIC: Invoice data prepared for saving` - Is invoice data valid?
5. ✅ `DIAGNOSTIC: Invoice creation result` - Did invoice creation succeed?
6. ✅ `DIAGNOSTIC: Invoice verification successful` - Can invoice be found?
7. ✅ `DIAGNOSTIC: Final invoice creation summary` - Overall status

## Next Steps

1. **Create a new niche booking** and watch the logs
2. **Run the diagnostic script** for the application code
3. **Check the invoice API** to see if invoice is accessible
4. **Review the diagnostic output** and follow recommendations
5. **Share the diagnostic output** if issues persist

## Files Modified

- `src/services/NicheBookingService.js` - Added comprehensive diagnostic logging
- `src/services/InscriptionInvoiceService.js` - Added diagnostic logging
- `src/controllers/InscriptionInvoiceController.js` - Added diagnostic logging
- `scripts/diagnose-niche-booking.js` - New diagnostic script
- `NICHE_BOOKING_INVOICE_CREATION_FLOW_ANALYSIS.md` - Flow analysis document

