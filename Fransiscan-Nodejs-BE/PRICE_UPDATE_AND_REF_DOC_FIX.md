# Price Update and Reference Document Number Fix

## Summary
This document describes the implementation of:
1. Price list update (35 items)
2. Reference document number fixes for invoices
3. Status change from Draft to Booked when receipt is printed

---

## 1. Price List Update

### SQL Script
**File:** `Fransiscan-Nodejs-BE/db-Backup/update_item_prices.sql`

This script updates all 35 item prices according to the new price list provided.

**Usage:**
```sql
-- Review the script first, then execute:
-- 1. Review the SELECT statement at the end to see current prices
-- 2. Uncomment COMMIT TRANSACTION when ready
-- 3. Execute the script
```

**Items Updated:**
- Level 1-7 Niches: $3000-$7000
- Booking of La Verna Room: $850
- Gates Of Life Inscription: $300
- Urn variants: $100-$450
- Inscription charges: $300-$600
- Admin fees, clearing fees, stipends, etc.

---

## 2. Reference Document Numbers in Invoices

### Current Implementation Status

#### ✅ Niche Applications (NAPP)
- **Status:** Already correct
- **Implementation:** Uses application code (e.g., "7980-0", "NAPP-52") as `refDocNumber`
- **Location:** `InvoiceController.createInvoiceByCode()`, `NicheBookingService.determineInvoiceItems()`

#### ✅ Inscription Requests (INCR)
- **Status:** Already correct for standalone invoices
- **Implementation:** 
  - Standalone inscription invoices use inscription code (e.g., "INCR-123") via `InscriptionInvoiceService`
  - Niche booking inscription items use derived format "I-NAPP-XX" which is acceptable per validation logic
- **Location:** `InscriptionInvoiceService.createInvoiceForInscription()`, `NicheBookingService.determineInvoiceItems()`

#### ✅ Wake Room Bookings (WAPP)
- **Status:** Already correct
- **Implementation:** Uses wake room booking code (e.g., "WAPP-123") as `refDocNumber`
- **Location:** `InvoiceController.createInvoiceByCode()` (detects WAPP from code pattern)

#### ✅ Gate of Life Applications (GOLA)
- **Status:** Already correct
- **Implementation:** Uses gate of life application code (e.g., "GOLA-123") as `refDocNumber`
- **Location:** `InvoiceController.createInvoiceByCode()` (detects GOLA from code pattern)

### Reference Document Number Logic

The system uses the following logic for reference document numbers:

1. **Invoice Header:**
   - `RefDocNumber`: Base application code (e.g., "7980-0", "NAPP-52", "WAPP-123", "GOLA-456", "INCR-789")
   - `RefDocName`: Document type ("NAPP", "WAPP", "INCR", "GOLA", "DONA", "OTHERS")

2. **Invoice Details:**
   - Each detail line can have its own `RefDocNumber` and `RefDocName`
   - For inscription-related items in niche bookings: Uses "I-NAPP-XX" format (derived reference)
   - For standalone inscription invoices: Uses actual "INCR-XX" code
   - For niche items: Uses application code (e.g., "NAPP-52")
   - For wake room items: Uses wake room booking code (e.g., "WAPP-123")
   - For gate of life items: Uses gate of life application code (e.g., "GOLA-456")

3. **Normalization:**
   - All `RefDocNumber` values are trimmed (whitespace removed)
   - All `RefDocName` values are trimmed and uppercased
   - Ensures consistent lookup and validation

---

## 3. Status Change: Draft → Booked on Receipt Creation

### Implementation
**File:** `Fransiscan-Nodejs-BE/src/services/ReceiptService.js`
**Method:** `createReceiptFromInvoice()`

### Changes Made

Added automatic status update when a receipt is created from an invoice:

```javascript
// ✅ FIX: Update NicheApplication status from Draft (1) to Booked (3) when receipt is created
// This ensures that once payment is received (receipt printed), the niche moves to booked state
try {
  const { executeQuery } = require('../config/database');
  const refDocName = invoice.RefDocName || invoice.refDocName;
  const refDocNumber = invoice.RefDocNumber || invoice.refDocNumber;

  if (refDocName && refDocNumber) {
    const normalizedRefDocName = String(refDocName).trim().toUpperCase();
    const normalizedRefDocNumber = String(refDocNumber).trim();

    // Only update status for Niche Applications (NAPP)
    if (normalizedRefDocName === 'NAPP') {
      const updateStatusQuery = `
        UPDATE NicheApplication
        SET Status = 3
        WHERE Code = @code
          AND Status = 1
      `;

      await executeQuery(updateStatusQuery, { code: normalizedRefDocNumber });
      logger.info(`[ReceiptService] Updated NicheApplication status from Draft (1) to Booked (3) for code: ${normalizedRefDocNumber}`);
    }
  }
} catch (statusUpdateError) {
  // Log but don't fail receipt creation if status update fails
  logger.warn('[ReceiptService] Failed to update NicheApplication status after receipt creation (non-critical):', {
    error: statusUpdateError.message,
    refDocName: invoice.RefDocName || invoice.refDocName,
    refDocNumber: invoice.RefDocNumber || invoice.refDocNumber
  });
}
```

### Behavior

1. **Trigger:** When a receipt is successfully created from an invoice
2. **Condition:** Only updates if:
   - Invoice `RefDocName` is "NAPP" (Niche Application)
   - Invoice `RefDocNumber` is provided
   - Current application status is 1 (Draft)
3. **Action:** Updates `NicheApplication.Status` from 1 (Draft) to 3 (Booked)
4. **Error Handling:** Non-critical - receipt creation succeeds even if status update fails (logged as warning)

### Status Values

- **0:** Deleted
- **1:** Draft (initial state)
- **2:** Pending
- **3:** Booked (set when receipt is printed)
- **4:** Completed

---

## 4. Testing Checklist

### Price Updates
- [ ] Execute `update_item_prices.sql` script
- [ ] Verify all 35 items have correct prices
- [ ] Test invoice generation with updated prices
- [ ] Verify GST calculations are correct (9%)

### Reference Document Numbers
- [ ] Test niche application invoice creation - verify `refDocNumber` = application code
- [ ] Test inscription invoice creation - verify `refDocNumber` = inscription code (INCR-XX)
- [ ] Test wake room invoice creation - verify `refDocNumber` = wake room booking code (WAPP-XX)
- [ ] Test gate of life invoice creation - verify `refDocNumber` = gate of life application code (GOLA-XX)
- [ ] Verify invoice details use correct reference numbers

### Status Change
- [ ] Create a niche application (status = 1, Draft)
- [ ] Create an invoice for the application
- [ ] Create a receipt from the invoice
- [ ] Verify application status changed from 1 (Draft) to 3 (Booked)
- [ ] Verify receipt creation still works if status update fails (non-critical)

---

## 5. Files Modified

1. **Fransiscan-Nodejs-BE/db-Backup/update_item_prices.sql** (NEW)
   - SQL script to update all 35 item prices

2. **Fransiscan-Nodejs-BE/src/services/ReceiptService.js** (MODIFIED)
   - Added status update logic in `createReceiptFromInvoice()`

---

## 6. Notes

- The reference document number system is already correctly implemented for all document types
- The status update is non-critical and won't fail receipt creation if it encounters an error
- Price updates should be reviewed and tested in a development environment before applying to production
- The status change only applies to Niche Applications (NAPP), not to other document types

---

## 7. Future Enhancements (Optional)

1. **Inscription Code Lookup:** Enhance `NicheBookingService.determineInvoiceItems()` to look up actual inscription code (INCR-XX) if it exists, instead of using derived "I-NAPP-XX" format
2. **Status Update for Other Types:** Extend status update logic to handle Wake Room Bookings and Gate of Life Applications if they have status fields
3. **Price History:** Add price history tracking for audit purposes

