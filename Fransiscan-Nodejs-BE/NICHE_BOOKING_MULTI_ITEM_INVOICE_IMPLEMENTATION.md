# Niche Booking Multi-Item Invoice Implementation

## Overview
This implementation creates comprehensive invoices for niche bookings with multiple items (niche, inscription, urn, sealing, etc.), proper tax calculations (9% GST), and correct RefDocNumber/RefDocName mapping.

## Features Implemented

### 1. **Niche Row Level and Price Fetching**
- Fetches niche row level (`NicheLevel`) and price (`DefaultAmount`) from database
- Queries `Niche` and `NicheRow` tables to get complete niche information
- Uses this information to determine appropriate niche item and pricing

### 2. **Multi-Item Invoice Creation**
The system now creates invoices with multiple items based on booking data:

#### **Niche Item** (RefDocName: "NAPP")
- Determined by niche level or explicitly provided `itemId`
- RefDocNumber: Application code (e.g., "NAPP-52")
- Price: From niche details, niche row, or item default price

#### **Inscription Item** (ItemId: 12, RefDocName: "INCR")
- Included by default unless `hasInscription: false`
- RefDocNumber: "I-" + Application code (e.g., "I-NAPP-52")
- Price: From Item table (default: 400)

#### **Urn Item** (ItemId: 10, RefDocName: "INCR")
- Included by default unless `hasUrn: false`
- RefDocNumber: "I-" + Application code (e.g., "I-NAPP-52")
- Price: From Item table (default: 150)

#### **Setting of Tables** (ItemId: 33, RefDocName: "INCR")
- Included by default unless `hasSettingOfTables: false`
- RefDocNumber: "I-" + Application code (e.g., "I-NAPP-52")
- Price: From Item table (default: 20)

#### **Sealing of Niche** (ItemId: 34, RefDocName: "INCR")
- Included by default unless `hasSealing: false`
- RefDocNumber: "I-" + Application code (e.g., "I-NAPP-52")
- Price: From Item table (default: 20)

### 3. **Tax Calculations**
- **9% GST** applied to each invoice item
- Tax calculated per line: `lineTaxAmount = (lineTotalAmount * 9) / 100`
- Total tax amount: Sum of all line tax amounts
- Total paying amount: Sum of all line amounts + tax amounts

### 4. **RefDocNumber and RefDocName Mapping**
- **Niche items**: `RefDocNumber = "NAPP-XX"`, `RefDocName = "NAPP"`
- **Inscription-related items**: `RefDocNumber = "I-NAPP-XX"`, `RefDocName = "INCR"`

## Implementation Details

### Helper Functions

#### `fetchNicheRowInfo(nicheId)`
Fetches niche row level and price from database:
```javascript
{
  nicheLevel: 6,
  nichePrice: 4000,
  rowPrice: 4000
}
```

#### `getItemById(itemId, churchId)`
Retrieves item details from Item table:
```javascript
{
  ItemId: 6,
  Name: "Level 6 Niche",
  Code: "06",
  Price: 4000,
  ChurchId: 1,
  DocType: "NAPP"
}
```

#### `determineInvoiceItems(bookingData, nicheInfo, churchId, appCode)`
Determines which items to include in invoice based on:
- Booking data (`inscription`, `urn`, `sealing`, etc.)
- Niche information (level, price)
- Item availability in database

### Invoice Data Structure

```javascript
{
  transactionDate: Date,
  refDocNumber: "NAPP-52",
  refDocName: "NAPP",
  customerName: "Customer Name",
  totalAmount: 5003.1, // Including tax
  payingAmount: 5003.1,
  paymentMode: "TT" | "Cash" | etc.,
  paymentModeDocNo: "dd 2/6/25 & 3/6/25",
  nicheApplicationId: 10715,
  taxCode: "GST",
  taxPercentage: 9,
  taxAmount: 413.1
}
```

### Invoice Details Structure

```javascript
[
  {
    itemId: 6,
    quantity: 1,
    unitAmount: 4000,
    payingAmount: 4000,
    totalPayingAmount: 4360, // Including tax
    refDocNumber: "NAPP-52",
    refDocName: "NAPP",
    refType: "NAPP",
    outstandingAmount: 0,
    lineTotalAmount: 4000,
    lineTaxPercent: 9,
    lineTaxAmount: 360
  },
  {
    itemId: 12,
    quantity: 1,
    unitAmount: 400,
    payingAmount: 400,
    totalPayingAmount: 436,
    refDocNumber: "I-NAPP-52",
    refDocName: "INCR",
    refType: "INCR",
    outstandingAmount: 0,
    lineTotalAmount: 400,
    lineTaxPercent: 9,
    lineTaxAmount: 36
  },
  // ... more items
]
```

## Usage

### Frontend Request Format

```json
{
  "nicheDetails": {
    "nicheId": 123,
    "amount": 4000,
    "itemId": 6,  // Optional: specific niche item
    "inscription": true,  // Optional: default true
    "urn": true,  // Optional: default true
    "sealing": true,  // Optional: default true
    "settingOfTables": true  // Optional: default true
  },
  "paymentMode": "TT",  // Optional: default "Cash"
  "paymentModeDocNo": "dd 2/6/25 & 3/6/25",  // Optional
  "contact": { ... },
  "nominee": { ... }
}
```

### Excluding Items

To exclude specific items, set them to `false`:

```json
{
  "nicheDetails": {
    "nicheId": 123,
    "inscription": false,  // Exclude inscription
    "urn": false,  // Exclude urn
    "sealing": false  // Exclude sealing
  }
}
```

## API Response

After creating a booking, the invoice can be retrieved via:

```
GET /api/invoices/NAPP-52
```

Response structure matches the example provided:
- Multiple invoice detail items
- Proper tax calculations (9% GST)
- Correct RefDocNumber and RefDocName for each item
- Receipt information if amount > 0

## Database Queries

### Fetch Niche Row Info
```sql
SELECT 
  n.NicheId,
  n.DefaultAmount,
  r.NicheLevel,
  r.DefaultAmount AS RowDefaultAmount
FROM Niche n WITH(NOLOCK)
INNER JOIN NicheRow r WITH(NOLOCK) ON n.NicheRowlId = r.NicheRowlId
WHERE n.NicheId = @nicheId
```

### Get Item by ID
```sql
SELECT ItemId, Name, Code, Price, ChurchId, DocType
FROM Item WITH(NOLOCK)
WHERE ItemId = @itemId AND ChurchId = @churchId
```

## Tax Calculation Logic

For each item:
1. Get base amount from item price or booking data
2. Calculate tax: `taxAmount = (baseAmount * 9) / 100`
3. Calculate total with tax: `totalWithTax = baseAmount + taxAmount`
4. Sum all totals for invoice total

## Error Handling

- If niche row info cannot be fetched, falls back to item default prices
- If specific items are not found, logs warning but continues with other items
- If no items can be determined, invoice creation is aborted with detailed error logging
- All errors are logged with context for debugging

## Backward Compatibility

✅ **All changes are backward compatible:**
- Existing bookings without item details will work (defaults to including common items)
- Single-item invoices still work (if only niche item is determined)
- No breaking changes to API contracts
- Existing invoices are not affected

## Logging

The system logs:
- Niche row info fetch results
- Item determination process
- Invoice creation with item counts and totals
- Tax calculations
- Receipt creation status

Example log:
```
INFO: Determined 5 invoice items for niche booking: {
  applicationCode: "NAPP-52",
  items: [
    { itemId: 6, itemName: "Level 6 Niche", amount: 4000, tax: 360 },
    { itemId: 12, itemName: "Niche Inscription 1st Name", amount: 400, tax: 36 },
    ...
  ],
  totalAmount: 4590,
  totalTaxAmount: 413.1,
  totalPayingAmount: 5003.1
}
```

## Testing

### Test Case 1: Full Invoice with All Items
```bash
POST /api/niche-bookings
{
  "nicheDetails": {
    "nicheId": 123,
    "amount": 4000
  },
  ...
}

# Expected: Invoice with niche, inscription, urn, sealing, setting of tables
# Verify: GET /api/invoices/NAPP-XX returns invoice with 5 items
```

### Test Case 2: Minimal Invoice (Niche Only)
```bash
POST /api/niche-bookings
{
  "nicheDetails": {
    "nicheId": 123,
    "amount": 4000,
    "inscription": false,
    "urn": false,
    "sealing": false,
    "settingOfTables": false
  },
  ...
}

# Expected: Invoice with only niche item
# Verify: GET /api/invoices/NAPP-XX returns invoice with 1 item
```

### Test Case 3: Verify Tax Calculations
```bash
# Check that each item has 9% tax
# Total tax = sum of all lineTaxAmount
# Total amount = sum of all lineTotalAmount + lineTaxAmount
```

## Notes

1. **Item Selection**: System prioritizes explicit itemId, then niche level, then category items
2. **Default Behavior**: Common items (inscription, urn, sealing) are included by default
3. **Tax Rate**: Currently hardcoded to 9% GST (can be made configurable in future)
4. **RefDocNumber Format**: 
   - Niche items: Application code (e.g., "NAPP-52")
   - Inscription items: "I-" + Application code (e.g., "I-NAPP-52")
5. **Price Sources**: Priority order:
   - Booking data amount/price
   - Niche row default amount
   - Item default price
   - Fallback to 0

