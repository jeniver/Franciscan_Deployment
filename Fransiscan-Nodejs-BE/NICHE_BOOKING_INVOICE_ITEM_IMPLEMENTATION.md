# Niche Booking Invoice Item Implementation

## Problem
New niche bookings (e.g., NAPP-50) were not generating invoices that could be viewed via `/api/invoices/NAPP-50`. The invoice creation logic needed to:
1. Use items from the niche booking data when provided
2. Ensure invoices are always created for new niche bookings
3. Use proper items from the niche booking instead of generic fallback items

## Solution Implemented

### 1. Item Selection Priority

The invoice creation now follows a priority-based item selection:

**Priority 1: Item from Booking Data**
- Checks if `itemId` is provided in the booking request:
  - `data.itemId`
  - `data.nicheDetails.itemId`
  - `data.nicheDetails.item.itemId`
  - `application.itemId`
- If found, validates the item exists in the database for the church
- Uses this item for invoice creation

**Priority 2: NICHES Category Items**
- Falls back to items with category 'NICHES' (DocType = 'NAPP' or Code LIKE 'NICH%')
- Uses the first available item from this category

**Priority 3: Fallback Items (ItemId <= 7)**
- Tries to get any item with ItemId <= 7 (niche-related items per analysis document)
- These are typically niche-specific items

**Priority 4: Last Resort (Any Item)**
- Gets any available item for the church
- This ensures invoice creation never fails due to missing items

**Priority 5: Emergency Fallback**
- If all above fail, tries one more time with a very permissive query
- Logs critical error if this also fails

### 2. Enhanced Error Handling

- **Comprehensive Logging**: Added detailed logging at each step of item selection
- **Error Tracking**: Tracks which fallback was used and why
- **Critical Alerts**: Logs critical errors if no items are found
- **Invoice Verification**: After invoice creation, verifies it can be found by application code

### 3. Invoice Creation Flow

```
1. Resolve application code
2. Calculate total amount from booking data
3. Select item (Priority 1-5 as above)
4. Create invoice using InvoiceService.saveInvoice()
5. Verify invoice is findable by application code
6. Create receipt if amount > 0
7. Log success/failure with details
```

## Code Changes

### File: `src/services/NicheBookingService.js`

**Changes:**
1. **Item Selection Logic** (lines ~1682-1732):
   - Added priority-based item selection
   - Checks for `itemId` in booking data first
   - Falls back through multiple levels if not found
   - Added comprehensive logging at each step

2. **Error Handling** (lines ~1734-1740):
   - Enhanced error messages
   - Added emergency fallback
   - Better logging for debugging

3. **Logging** (lines ~1975-1995):
   - Added detailed logging for invoice creation status
   - Logs success, failure, and skip reasons
   - Includes all relevant IDs and codes

## Usage

### Frontend Request Format

When creating a niche booking, you can optionally include `itemId`:

```json
{
  "nicheDetails": {
    "nicheId": 123,
    "amount": 5000,
    "itemId": 5  // Optional: specific item to use for invoice
  },
  "contact": { ... },
  "nominee": { ... }
}
```

If `itemId` is not provided, the system will automatically select an appropriate item using the priority system above.

## Testing

### Test Case 1: With itemId in Request
```bash
POST /api/niche-bookings
{
  "nicheDetails": {
    "nicheId": 123,
    "amount": 5000,
    "itemId": 5
  },
  ...
}

# Expected: Invoice created with ItemId = 5
# Verify: GET /api/invoices/NAPP-XX should return invoice
```

### Test Case 2: Without itemId (Auto-selection)
```bash
POST /api/niche-bookings
{
  "nicheDetails": {
    "nicheId": 123,
    "amount": 5000
  },
  ...
}

# Expected: Invoice created with auto-selected item from NICHES category
# Verify: GET /api/invoices/NAPP-XX should return invoice
```

### Test Case 3: Verify Invoice Retrieval
```bash
# After creating booking NAPP-51
GET /api/invoices/NAPP-51

# Expected: Returns invoice with details including:
# - invoiceId
# - invoiceCode
# - refDocNumber: "NAPP-51"
# - details[0].itemId: (selected item)
# - details[0].refDocNumber: "NAPP-51"
```

## Logging

The system now logs detailed information:

**Item Selection:**
```
INFO: Using item from niche booking data: ItemId=5, Name=Niche Level 1
INFO: Using NICHES category item: ItemId=3, Name=Niche Application
WARN: Using fallback item for invoice: ItemId=2
ERROR: EMERGENCY: Using any available item for invoice: ItemId=1
```

**Invoice Creation:**
```
INFO: Invoice created successfully for niche booking: NAPP-51
INFO: Invoice verification successful: Found by application code NAPP-51
INFO: Invoice successfully created for niche booking NAPP-51
```

**Errors:**
```
ERROR: CRITICAL: No suitable item found for invoice creation after all fallbacks
ERROR: CRITICAL: Invoice not created for niche booking NAPP-51: No suitable item found
```

## Backward Compatibility

✅ **All changes are backward compatible:**
- Existing bookings without `itemId` will work as before
- Fallback logic ensures invoices are always created
- No breaking changes to API contracts
- Existing invoices are not affected

## Notes

1. **Item Selection**: The system prioritizes items from booking data, but always has fallbacks to ensure invoice creation succeeds
2. **Invoice Verification**: After creation, the system verifies the invoice can be found by application code
3. **Error Recovery**: Multiple fallback levels ensure invoice creation rarely fails
4. **Logging**: Comprehensive logging helps identify issues quickly

## Future Enhancements

1. **Item Validation**: Could add validation to ensure selected item matches niche type
2. **Price Override**: Could allow price override in booking data
3. **Multiple Items**: Could support multiple items per invoice
4. **Item Recommendations**: Could suggest appropriate items based on niche details

