# Niche Booking Invoice Creation Flow - Deep Analysis

## Complete Function Call Flow

### 1. API Entry Point
```
POST /api/niche-bookings
  ↓
NicheBookingController.createBooking()
  ↓
NicheBookingService.createBooking(data, user)
```

### 2. NicheBookingService.createBooking() Flow

#### Phase 1: Validation & Preparation
1. **Input Validation** (lines 936-971)
   - Checks: data exists, niche selection, contact info, nominee info
   - Returns error if validation fails

2. **Application Resolution** (lines 973-1473)
   - If `nicheApplicationCode` provided → Get existing application
   - If not provided → Create new application via `NicheApplicationRepository.create()`
   - Sets `applicationWasCreatedInThisRequest = true` if created

3. **Person Resolution** (lines 1100-1355)
   - Resolve/Create contact person
   - Resolve/Create nominee
   - Resolve/Create nominee2 (optional)
   - Build beneficiary records

4. **Booking Creation** (lines 1508-1531)
   - `NicheBookingRepository.createBooking(bookingPayload)`
   - **CRITICAL**: This commits a transaction and updates:
     - NicheBooking table
     - Niche.Status = 3 (Booked)
     - NicheApplication.Status = 3 (Confirmed)

#### Phase 2: Post-Booking Operations
5. **Beneficiary Persistence** (lines 1541-1585)
   - Persists beneficiaries if provided
   - **If this fails, booking is rolled back**

6. **Consent Form** (lines 1587-1611)
   - Creates/updates consent form if provided
   - **Errors are logged but don't fail booking**

7. **Email Notification** (lines 1613-1643)
   - Sends confirmation email if emails provided
   - **Errors are logged but don't fail booking**

#### Phase 3: Invoice Creation (lines 1645-2214) ⚠️ CRITICAL SECTION
8. **Invoice Creation Logic**
   ```javascript
   // Line 1659: Initialize
   let billingInfo = null;
   let invoiceCreationError = null;
   
   // Line 1662: Try block starts
   try {
     // Line 1664-1666: Resolve application code
     const applicationCode = 
       (application && (application.code || application.Code)) ||
       nicheApplicationCode;
     
     // Line 1668-1670: Check if application code exists
     if (!applicationCode) {
       invoiceCreationError = 'Missing application code';
     } else {
       // Line 1673: Normalize code
       const normalizedApplicationCode = String(applicationCode).trim();
       
       // Line 1925-1930: Determine invoice items
       const invoiceItems = await determineInvoiceItems(...);
       
       // Line 1932-1938: Check if items found
       if (invoiceItems.length === 0) {
         invoiceCreationError = 'No invoice items determined';
         // NEW: Emergency fallback now creates invoice anyway
       }
       
       // Line 1940-1972: Calculate totals and prepare invoice data
       // Line 2006-2015: Prepare invoice details
       // Line 2020-2044: Call invoiceService.saveInvoice() with retries
       // Line 2046-2053: Check if invoice creation succeeded
       // Line 2054-2176: If successful, verify invoice and create receipt
     }
   } catch (billingError) {
     // Line 2180-2188: Catch all errors
     invoiceCreationError = billingError.message;
     // ⚠️ ERROR: Errors are logged but booking still succeeds!
   }
   ```

### 3. Critical Issues Identified

#### Issue 1: Invoice Creation Errors Don't Fail Booking
- **Location**: Lines 2180-2188
- **Problem**: Invoice creation errors are caught and logged, but booking still returns `success: true`
- **Impact**: Booking succeeds even if invoice creation fails

#### Issue 2: Application Code Resolution
- **Location**: Lines 1664-1666
- **Problem**: If `application.code` is null/undefined, falls back to `nicheApplicationCode`
- **Risk**: If both are null, invoice creation is skipped silently

#### Issue 3: Item Selection Failure
- **Location**: Lines 1932-1938
- **Problem**: If no items found, invoice creation is skipped
- **Fix Applied**: Emergency fallback now creates invoice with default item

#### Issue 4: Validation Timing Issues
- **Location**: Lines 2020-2044
- **Problem**: Newly created applications might not be immediately findable
- **Fix Applied**: Retry logic with exponential backoff

#### Issue 5: Invoice Verification Timing
- **Location**: Lines 2074-2124
- **Problem**: Invoice might not be immediately findable after creation
- **Fix Applied**: Multi-attempt verification with increasing delays

### 4. Invoice Lookup Flow

```
GET /api/invoices/:code
  ↓
InvoiceController.getInvoiceByCode()
  ↓
InvoiceRepository.getInvoiceByCode(code, churchId, applicationCode)
  ↓
1. Try by invoice code (numeric)
2. Try by RefDocNumber in InvoiceDetail (EXISTS subquery)
3. Try by RefDocNumber in Invoice header
4. Fallback without RefDocName filter
5. Diagnostic queries if not found
```

### 5. Inscription Items API Flow

```
GET /api/inscriptions/:code/items
  ↓
InscriptionInvoiceController.getInscriptionItems()
  ↓
InscriptionInvoiceService.getInscriptionItems(code, churchId)
  ↓
1. Get EngraveApplication by code
2. Get task-mapped items
3. Return comprehensive response
```

## Potential Root Causes

### Root Cause 1: Application Code Not Resolved
- **Symptom**: `invoiceCreationError = 'Missing application code'`
- **Check**: Log `application.code`, `application.Code`, `nicheApplicationCode` values

### Root Cause 2: No Items Found
- **Symptom**: `invoiceCreationError = 'No invoice items determined'`
- **Check**: Log item selection process, verify items exist in database

### Root Cause 3: Validation Failure
- **Symptom**: `invoiceResult.success = false`, `error.code = 'INVALID_REF_DOCUMENT'`
- **Check**: Verify NicheApplication exists in database immediately after creation

### Root Cause 4: Invoice Created But Not Findable
- **Symptom**: Invoice created successfully but lookup fails
- **Check**: RefDocNumber values in Invoice and InvoiceDetail tables

### Root Cause 5: Transaction Timing
- **Symptom**: Invoice exists but not yet committed when lookup happens
- **Check**: Increase verification delays

## Diagnostic Steps

1. **Check Application Code Resolution**
   ```javascript
   logger.info('Application code resolution:', {
     application: application ? {
       code: application.code,
       Code: application.Code,
       hasCode: !!application.code,
       hasCodeAlt: !!application.Code
     } : null,
     nicheApplicationCode,
     resolved: applicationCode
   });
   ```

2. **Check Item Selection**
   ```javascript
   logger.info('Item selection process:', {
     nicheId,
     nicheInfo,
     itemCount: invoiceItems.length,
     items: invoiceItems.map(i => ({ itemId: i.itemId, name: i.itemName }))
   });
   ```

3. **Check Invoice Creation Result**
   ```javascript
   logger.info('Invoice creation result:', {
     success: invoiceResult.success,
     error: invoiceResult.error,
     data: invoiceResult.data
   });
   ```

4. **Check Database State**
   ```sql
   -- Check if invoice exists
   SELECT * FROM Invoice WHERE RefDocNumber = 'NAPP-52'
   
   -- Check invoice details
   SELECT * FROM InvoiceDetail WHERE RefDocNumber = 'NAPP-52' OR RefDocNumber = 'I-NAPP-52'
   
   -- Check application
   SELECT * FROM NicheApplication WHERE Code = 'NAPP-52'
   ```

## Recommended Fixes

1. **Make Invoice Creation Mandatory**
   - Throw error if invoice creation fails (don't silently skip)
   - OR: Retry invoice creation in background job

2. **Add Pre-Creation Validation**
   - Verify application exists before creating invoice
   - Verify items exist before creating invoice

3. **Enhance Logging**
   - Log every step of invoice creation
   - Log all variable values at critical points

4. **Add Health Check**
   - After booking creation, verify invoice exists
   - If not, attempt to create it again

5. **Database Transaction Alignment**
   - Ensure invoice creation happens in same transaction context
   - OR: Use proper transaction isolation

