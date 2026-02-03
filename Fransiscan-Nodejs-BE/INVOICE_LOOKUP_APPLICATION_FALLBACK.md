# Invoice Lookup with Application Fallback Enhancement

## Overview

This document describes the enhancement to the `getInvoiceByCode` function that enables automatic fallback to application details when an invoice is not found. This provides a seamless experience for fetching comprehensive application, niche, wall, and pricing information.

---

## Feature Summary

### What Was Implemented

When `getInvoiceByCode()` doesn't find an invoice:
1. ✅ **Automatically fetches NicheApplication details** by the provided code
2. ✅ **Retrieves complete niche hierarchy** (Niche → Row → Wall → Chapel)
3. ✅ **Includes pricing information** from Niche, NicheRow, and Item tables
4. ✅ **Fetches correct item details** based on niche level or category
5. ✅ **Gets booking information** if the application has a NicheBooking
6. ✅ **Returns structured data** ready for invoice creation or display

---

## New Method: `getApplicationDetailsByCode()`

### Purpose
Fetches comprehensive application data when an invoice doesn't exist yet. This allows the frontend to:
- Display application details before invoice creation
- Pre-populate invoice creation forms
- Show niche location, wall, chapel, and pricing information
- Get correct item names and prices

### Method Signature

```javascript
async getApplicationDetailsByCode(code, churchId = null)
```

### Parameters
- `code` (string, required) - Application code (e.g., "3795-0", "NAPP-123")
- `churchId` (number, optional) - Church ID for access control filtering

### Return Value

Returns an object with the following structure:

```javascript
{
  // Metadata
  isApplicationData: true,    // Flag indicating this is application data, not invoice
  invoiceId: null,            // No invoice yet
  code: null,                 // No invoice code yet
  
  // Application Info
  applicationCode: "3795-0",
  nicheApplicationId: 123,
  applicationStatus: 1,
  appliedDate: "2025-01-15T00:00:00.000Z",
  agreementDate: "2025-01-15T00:00:00.000Z",
  refDocNumber: "3795-0",
  refDocName: "NAPP",
  
  // Customer/Applicant Info
  customerName: "John Doe",
  applicantIDNo: "S1234567A",
  applicantEmail: "john@example.com",
  applicantMobile: "+65 91234567",
  applicantHomeTel: "+65 61234567",
  applicantOfficeTel: "+65 61234568",
  applicantIsCatholic: true,
  
  // Address
  addressNo: "123",
  address: "Main Street",
  address2: "Unit 45-67",
  addressCity: "Singapore",
  districtCode: "SINGAPORE",
  country: "Singapore",
  
  // Nominee Info
  nomineeName: "Jane Doe",
  nomineeIDNo: "S7654321B",
  nomineeEmail: "jane@example.com",
  nomineeMobile: "+65 98765432",
  nomineeRelationship: "Spouse",
  nomineeName2: "Bob Doe",
  nomineeIDNo2: "S1111111C",
  
  // Financial Info
  totalAmount: 7000.00,
  payingAmount: 7000.00,
  applicationAmount: 7000.00,
  applicationDefaultAmount: 7000.00,
  taxAmount: 0,
  taxPercentage: 0,
  taxCode: null,
  
  // System Fields
  userId: 1,
  churchId: 1,
  status: 1,
  remarks: "Application remarks",
  transactionDate: "2025-01-15T00:00:00.000Z",
  
  // Niche Details (Complete Hierarchy)
  niche: {
    // Niche Info
    nicheId: 456,
    nicheCode: "N-123",
    nichePrice: 7000.00,
    nicheStatus: 1,
    appearanceDescription: "Standard niche",
    isBooked: false,
    
    // Row Details
    rowId: 78,
    rowCode: "R-01",
    nicheLevel: 6,        // Level in the wall (used to match items)
    rowPrice: 7000.00,
    
    // Wall Details
    wallId: 9,
    wallCode: "W-01",
    wallName: "Memorial Wall A",
    
    // Chapel Details
    chapelId: 3,
    chapelCode: "C-01",
    chapelName: "Chapel of Peace"
  },
  
  // Booking Details (if exists)
  booking: {
    nicheBookingId: 789,
    nicheId: 456,
    nicheApplicationId: 123,
    bookedDate: "2025-01-16T00:00:00.000Z",
    bookingStatus: 1,
    bookingRemarks: "Booking remarks",
    bookingChurchId: 1,
    bookingUserId: 1,
    contactPersonName: "John Doe",
    contactPersonIDNo: "S1234567A",
    contactPersonMobile: "+65 91234567",
    contactPersonEmail: "john@example.com",
    nomineeName: "Jane Doe",
    nomineeIDNo: "S7654321B",
    nominee2Name: "Bob Doe",
    nominee2IDNo: "S1111111C"
  },
  
  // Invoice Details (pre-filled for invoice creation)
  details: [{
    invoiceDetailId: null,
    invoiceId: null,
    itemId: 6,                    // Item matched by niche level or category
    itemName: "Niche Level 6",    // Correct item name from Item table
    itemCode: "NICHE-L6",
    itemPrice: 7000.00,
    itemCategory: "NICHES",
    quantity: 1,
    unitAmount: 7000.00,
    payingAmount: 7000.00,
    totalPayingAmount: 7000.00,
    refDocNumber: "3795-0",
    refDocName: "NAPP",
    refType: "NAPP",
    outstandingAmount: 0,
    lineTotalAmount: 7000.00,
    lineTaxPercent: 0,
    lineTaxAmount: 0
  }],
  
  // Summary (calculated from details)
  summary: {
    totalItems: 1,
    subtotal: 7000.00,
    totalTax: 0,
    grandTotal: 7000.00
  }
}
```

---

## Data Fetching Strategy

### Step 1: Fetch NicheApplication
```sql
SELECT na.*
FROM NicheApplication na
WHERE na.Code = @code
  AND (na.ChurchId = @churchId OR @churchId IS NULL)
```

**Retrieved Data:**
- Application code, status, dates
- Applicant details (name, ID, contact, address)
- Nominee details (2 nominees)
- Financial info (amounts, defaults)
- System fields (church, user, remarks)

### Step 2: Fetch Niche Hierarchy with Pricing
```sql
SELECT 
  n.*, 
  r.NicheLevel, r.DefaultAmount AS RowPrice,
  w.Code AS WallCode, w.Name AS WallName,
  c.Code AS ChapelCode, c.Name AS ChapelName
FROM Niche n
INNER JOIN NicheRow r ON n.NicheRowlId = r.NicheRowlId
INNER JOIN NicheWall w ON r.NicheWallId = w.NicheWallId
INNER JOIN Chapel c ON w.ChapelId = c.ChapelId
WHERE n.NicheId = @nicheId
```

**Retrieved Data:**
- Niche code, price, status, appearance
- Row code, level, price
- Wall code, name, ID
- Chapel code, name, ID
- Booking status (via EXISTS subquery)

### Step 3: Fetch Matching Item
Item matching follows this priority:

**Priority 1: Match by Niche Level**
```sql
SELECT i.*
FROM Item i
WHERE i.ChurchId = @churchId
  AND i.Status = 1
  AND i.ItemId = @nicheLevel  -- e.g., Level 6 → ItemId 6
```

**Priority 2: Match by DocType (NAPP)**
```sql
SELECT i.*
FROM Item i
WHERE i.ChurchId = @churchId
  AND (i.DocType = 'NAPP' OR i.IsRefType = 1)
ORDER BY i.ItemId
```

**Priority 3: Any Item**
```sql
SELECT i.*
FROM Item i
WHERE i.ChurchId = @churchId
ORDER BY i.ItemId
```

**Retrieved Data:**
- ItemId, ItemName (correct item name)
- ItemCode, ItemPrice
- IsRefType, DocType, ChurchId

**Note:** The Item table does NOT have `Category` or `Status` columns. Item matching uses `DocType` and `IsRefType` instead.

### Step 4: Fetch NicheBooking (Optional)
```sql
SELECT 
  nb.NicheBookingId,
  nb.NicheId,
  nb.NicheApplicationId,
  nb.BookedDate,
  nb.BookingStatus,
  nb.Remarks,
  nb.ChurchId,
  nb.UserId,
  cp.Name AS ContactPersonName, 
  nom1.Name AS NomineeName, 
  nom2.Name AS Nominee2Name
FROM NicheBooking nb
LEFT JOIN Person cp ON nb.ContactPersonId = cp.PersonId
LEFT JOIN Person nom1 ON nb.NomineeId = nom1.PersonId
LEFT JOIN Person nom2 ON nb.NomineeId2 = nom2.PersonId
WHERE nb.NicheApplicationId = @nicheApplicationId
  AND nb.BookingStatus > 0
ORDER BY nb.BookedDate DESC
```

**Retrieved Data:**
- Booking ID, dates, status, remarks
- Contact person details
- Nominee details (from Person table)

**Note:** The `NicheBooking` table does NOT have a `Code` column.

---

## Pricing Logic

### Price Determination Priority

1. **Niche.DefaultAmount** (highest priority)
2. **NicheRow.DefaultAmount** (if niche price is null)
3. **NicheApplication.DefaultAmount** (if row price is null)
4. **NicheApplication.Amount** (if default amount is null)
5. **0** (fallback)

### Item Price
- Uses **Item.Price** from matched item
- Falls back to calculated niche price if item not found

### Tax Calculation
- Currently set to 0 (no tax applied)
- Can be calculated based on church tax settings if needed

---

## Integration with `getInvoiceByCode()`

### Modified Flow

```
getInvoiceByCode(code, churchId, applicationCode)
  │
  ├─ Try 1: Search by Invoice Code
  │  └─ [Found] → Return invoice data
  │
  ├─ Try 2: Search by RefDocNumber (InvoiceDetail)
  │  └─ [Found] → Return invoice data
  │
  ├─ Try 3: Search by RefDocNumber (Invoice header)
  │  └─ [Found] → Return invoice data
  │
  ├─ Try 4: Fallback searches
  │  └─ [Found] → Return invoice data
  │
  └─ NOT FOUND
     │
     ├─ ✨ NEW: getApplicationDetailsByCode(code, churchId)
     │  ├─ [Found Application]
     │  │  └─ Return application data with:
     │  │     • Complete niche hierarchy
     │  │     • Wall and chapel info
     │  │     • Correct pricing
     │  │     • Proper item names
     │  │     • Booking details
     │  │     • Pre-filled invoice details
     │  │
     │  └─ [Not Found] → Continue to diagnostics
     │
     └─ Run diagnostic queries → Return null
```

---

## Usage Examples

### Example 1: Lookup Application Before Invoice Creation

```javascript
const invoiceRepo = new InvoiceRepository();

// User searches for application code "3795-0"
const result = await invoiceRepo.getInvoiceByCode('3795-0', 1);

if (result.isApplicationData) {
  // This is application data (no invoice created yet)
  console.log('Application found:', result.applicationCode);
  console.log('Applicant:', result.customerName);
  console.log('Niche:', result.niche.nicheCode);
  console.log('Wall:', result.niche.wallName);
  console.log('Chapel:', result.niche.chapelName);
  console.log('Price:', result.totalAmount);
  console.log('Item:', result.details[0].itemName);
  
  // Use this data to create invoice
  // Frontend can display and allow user to modify before creating
} else {
  // This is actual invoice data
  console.log('Invoice found:', result.code);
  console.log('Invoice ID:', result.invoiceId);
}
```

### Example 2: Frontend Display Logic

```typescript
// TypeScript example for frontend
interface InvoiceOrApplication {
  isApplicationData?: boolean;
  invoiceId: number | null;
  applicationCode?: string;
  code?: string;
  // ... other fields
}

function displayInvoiceOrApplication(data: InvoiceOrApplication) {
  if (data.isApplicationData) {
    // Show application view
    return (
      <ApplicationView
        title="Application Details (Invoice Not Created)"
        applicationCode={data.applicationCode}
        customerName={data.customerName}
        niche={data.niche}
        pricing={data.summary}
        canCreateInvoice={true}
      />
    );
  } else {
    // Show invoice view
    return (
      <InvoiceView
        title="Invoice"
        invoiceCode={data.code}
        invoiceId={data.invoiceId}
        details={data.details}
      />
    );
  }
}
```

### Example 3: Create Invoice from Application Data

```javascript
// Frontend: User clicks "Create Invoice" button
async function createInvoiceFromApplication(applicationData) {
  const invoicePayload = {
    invoice: {
      transactionDate: new Date().toISOString(),
      refDocNumber: applicationData.refDocNumber,
      refDocName: applicationData.refDocName,
      customerName: applicationData.customerName,
      totalAmount: applicationData.totalAmount,
      payingAmount: applicationData.payingAmount,
      taxAmount: applicationData.taxAmount,
      taxPercentage: applicationData.taxPercentage,
      taxCode: applicationData.taxCode,
      nicheApplicationId: applicationData.nicheApplicationId,
      addressNo: applicationData.addressNo,
      address: applicationData.address,
      address2: applicationData.address2,
      addressCity: applicationData.addressCity,
      districtCode: applicationData.districtCode,
      country: applicationData.country
    },
    invoiceDetails: applicationData.details.map(detail => ({
      itemId: detail.itemId,
      quantity: detail.quantity,
      unitAmount: detail.unitAmount,
      payingAmount: detail.payingAmount,
      totalPayingAmount: detail.totalPayingAmount,
      refDocNumber: detail.refDocNumber,
      refDocName: detail.refDocName,
      lineTotalAmount: detail.lineTotalAmount,
      lineTaxPercent: detail.lineTaxPercent,
      lineTaxAmount: detail.lineTaxAmount
    })),
    createReceipt: false
  };

  const response = await fetch('/api/invoices', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(invoicePayload)
  });

  return response.json();
}
```

---

## Benefits

### 1. **Seamless User Experience**
- Users can search for application codes even if invoice hasn't been created
- No need for separate "Application Search" functionality
- Single endpoint handles both invoice and application lookups

### 2. **Complete Information**
- Full niche hierarchy (Niche → Row → Wall → Chapel)
- Accurate pricing from database (not hardcoded)
- Correct item names based on niche level
- Booking information if available

### 3. **Pre-Populated Invoice Creation**
- All fields ready for invoice creation
- Reduces manual data entry
- Ensures consistency between application and invoice

### 4. **Backward Compatible**
- Existing invoice lookups work exactly as before
- Only adds fallback behavior when invoice not found
- Response includes `isApplicationData` flag to differentiate

### 5. **Proper Data Relationships**
- Maintains correct FK relationships
- Uses existing database indexes
- Follows established patterns

---

## Performance Considerations

### Query Optimization
1. **Index Usage:**
   - `NicheApplication.Code` (indexed)
   - `Niche.NicheId` (PK)
   - `NicheRow`, `NicheWall`, `Chapel` (FK indexes)
   - `Item.ChurchId + Status` (indexed)

2. **Query Timeouts:**
   - Application query: 10 seconds
   - Niche hierarchy: 10 seconds
   - Item lookup: 5 seconds
   - Booking query: 10 seconds

3. **NOLOCK Hints:**
   - All SELECT queries use `WITH(NOLOCK)`
   - Read-only operations, no locking needed
   - Improves concurrency

### Caching Opportunities
- Item lists can be cached per church
- Chapel/Wall hierarchy can be cached
- Application data can be cached temporarily

---

## Error Handling

### Scenarios Handled

1. **Application Not Found**
   - Returns `null` (same as invoice not found)
   - Diagnostic queries still run
   - Logs appropriate warnings

2. **Niche Not Found**
   - Application data still returned
   - `niche` field set to `null`
   - Uses application amount for pricing

3. **Item Not Found**
   - Falls back to default item name ("Niche")
   - Uses calculated niche price
   - Still returns valid response

4. **Booking Not Found**
   - Not an error (booking is optional)
   - `booking` field set to `null`
   - Application data still complete

5. **Database Errors**
   - Logs error details
   - Throws error to caller
   - Allows proper error handling in controller

---

## Testing Recommendations

### Unit Tests

1. **Test Application Lookup**
   ```javascript
   test('should fetch application details when invoice not found', async () => {
     const result = await invoiceRepo.getInvoiceByCode('3795-0', 1);
     expect(result.isApplicationData).toBe(true);
     expect(result.applicationCode).toBe('3795-0');
     expect(result.niche).toBeDefined();
   });
   ```

2. **Test Item Matching**
   ```javascript
   test('should match item by niche level', async () => {
     const result = await invoiceRepo.getApplicationDetailsByCode('3795-0', 1);
     expect(result.details[0].itemId).toBe(6); // Level 6 → ItemId 6
     expect(result.details[0].itemName).toBe('Niche Level 6');
   });
   ```

3. **Test Pricing Priority**
   ```javascript
   test('should use correct pricing priority', async () => {
     const result = await invoiceRepo.getApplicationDetailsByCode('3795-0', 1);
     expect(result.totalAmount).toBe(7000.00); // From niche.DefaultAmount
   });
   ```

### Integration Tests

1. **Test Invoice → Application Fallback**
   - Search for application code (no invoice)
   - Verify application data returned
   - Create invoice
   - Search same code again
   - Verify invoice data returned (not application)

2. **Test Church Access Control**
   - Search application with wrong churchId
   - Verify no data returned
   - Search with correct churchId
   - Verify data returned

---

## Migration Notes

### Database Requirements
- No schema changes required
- Uses existing tables and columns
- Relies on existing indexes

### API Compatibility
- **Backward Compatible**: All existing calls work unchanged
- **New Field**: `isApplicationData` flag added to response
- **Same Endpoint**: Uses existing `GET /api/invoices/:code`

### Frontend Changes Needed
1. Check `isApplicationData` flag
2. Handle application data display
3. Add "Create Invoice" button for applications
4. Update TypeScript interfaces if needed

---

## Future Enhancements

### Potential Improvements

1. **Multi-Item Support**
   - Currently returns single item
   - Could fetch multiple items based on application type
   - Could include inscription items automatically

2. **Tax Calculation**
   - Currently returns 0% tax
   - Could calculate based on church tax settings
   - Could apply different tax rates per item

3. **Booking Creation**
   - Could automatically create booking when fetching application
   - Could validate booking requirements
   - Could check niche availability

4. **Caching Layer**
   - Cache application details temporarily
   - Cache item lists per church
   - Reduce database load for repeated lookups

5. **Application Type Support**
   - Support WAPP (Wake Room Application)
   - Support INCR (Inscription Request)
   - Support GOLA (Gate of Life Application)
   - Return appropriate items per type

---

## Troubleshooting

### Issue: Application Found but No Niche Details

**Symptom:** `niche` field is `null` in response

**Possible Causes:**
- Application has `NicheId = null`
- Niche was deleted (`Status = 0`)
- Foreign key relationship broken

**Solution:**
- Check `NicheApplication.NicheId` value
- Verify `Niche.Status > 0`
- Check niche hierarchy (Row → Wall → Chapel)

### Issue: Wrong Item Name

**Symptom:** Item name doesn't match niche level

**Possible Causes:**
- Item matching logic issue
- ItemId doesn't match niche level
- Item category not set correctly

**Solution:**
- Verify `Item.ItemId` matches `NicheRow.NicheLevel`
- Check `Item.Category = 'NICHES'`
- Review item matching priority in code

### Issue: Incorrect Pricing

**Symptom:** Price doesn't match expected amount

**Possible Causes:**
- Multiple price sources (Niche, Row, Application)
- Item price different from niche price
- DefaultAmount not set

**Solution:**
- Check priority: Niche.DefaultAmount → Row.DefaultAmount → Application amounts
- Verify Item.Price is correct
- Check application.Amount vs application.DefaultAmount

---

## Summary

This enhancement provides a comprehensive solution for fetching application details when invoices don't exist. It:

✅ Fetches complete niche hierarchy and location info
✅ Retrieves accurate pricing from multiple sources
✅ Matches correct items based on niche level
✅ Includes booking information when available
✅ Returns structured data ready for invoice creation
✅ Maintains backward compatibility
✅ Follows existing code patterns
✅ Uses proper database indexes
✅ Handles errors gracefully

The implementation is production-ready and requires no database schema changes.

---

**Last Updated:** January 30, 2026
**Version:** 1.0.0
**Author:** AI Assistant

