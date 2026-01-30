# Invoice Creation Flow - Backend Application

## Overview

This document explains how invoice creation currently works in the backend application, including the complete flow from API request to database persistence.

---

## 1. API ENDPOINTS

### Primary Endpoint: `POST /api/invoices`
**Controller**: `InvoiceController.createInvoice()`

**Request Body**:
```json
{
  "invoice": {
    "transactionDate": "2025-01-15",
    "refDocNumber": "3795-1",
    "refDocName": "NAPP",
    "customerName": "John Doe",
    "totalAmount": 7630.00,
    "payingAmount": 7630.00,
    "paymentMode": "Cash",
    "paymentModeDocNo": null,
    "taxCode": "GST",
    "taxPercentage": 9,
    "taxAmount": 630.00,
    "nicheApplicationId": 123
  },
  "invoiceDetails": [ 
      "itemId": 1,
      "quantity": 1,
      "unitAmount": 7000.00,
      "payingAmount": 7000.00,
      "totalPayingAmount": 7630.00,
      "refDocNumber": "3795-1",
      "refDocName": "NAPP",
      "refType": "NAPP",
      "lineTotalAmount": 7000.00,
      "lineTaxPercent": 9,
      "lineTaxAmount": 630.00,
      "outstandingAmount": 0
    }
  ],
  "createReceipt": false
}
```

### Alternative Endpoint: `POST /api/invoices/:code`
**Controller**: `InvoiceController.createInvoiceByCode()`

- Creates invoice from application code (e.g., "3795-1", "NAPP-52")
- Auto-resolves application details
- Supports both auto-generated and custom invoice details

---

## 2. INVOICE CREATION FLOW

### Step-by-Step Process

```
┌─────────────────────────────────────────────────────────────┐
│ 1. API Request (POST /api/invoices)                         │
│    - Invoice header data                                     │
│    - Invoice details array                                  │
│    - User authentication (userId, churchId)                 │
└──────────────────┬──────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. InvoiceController.createInvoice()                         │
│    - Validates authentication                                │
│    - Validates request body                                  │
│    - Calls InvoiceService.saveInvoice()                     │
└──────────────────┬──────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. InvoiceService.saveInvoice()                             │
│    ┌─────────────────────────────────────────────────────┐  │
│    │ 3.1 Input Validation                                │  │
│    │     - Check invoiceData exists                       │  │
│    │     - Check invoiceDetails array not empty           │  │
│    │     - Extract ItemId and RefDocNumber from details  │  │
│    └─────────────────────────────────────────────────────┘  │
│    ┌─────────────────────────────────────────────────────┐  │
│    │ 3.2 RefDocNumber Normalization                      │  │
│    │     - Extract base code from detail RefDocNumber     │  │
│    │     - Handle "I-NAPP-XX" → "NAPP-XX" conversion      │  │
│    │     - Trim whitespace                                │  │
│    └─────────────────────────────────────────────────────┘  │
│    ┌─────────────────────────────────────────────────────┐  │
│    │ 3.3 Duplicate Check                                 │  │
│    │     - Check: customerName + itemId + refDocNumber   │  │
│    │       + transactionDate (same day)                  │  │
│    │     - Returns error if duplicate found              │  │
│    └─────────────────────────────────────────────────────┘  │
│    ┌─────────────────────────────────────────────────────┐  │
│    │ 3.4 Reference Document Validation                   │  │
│    │     - Validates each invoice detail's RefDocNumber   │  │
│    │     - Uses ReferenceDocumentValidator service       │  │
│    │     - Retries once (150ms delay) if fails           │  │
│    │       (handles newly created applications)          │  │
│    └─────────────────────────────────────────────────────┘  │
│    ┌─────────────────────────────────────────────────────┐  │
│    │ 3.5 Generate Invoice Code                           │  │
│    │     - Gets last invoice code number                  │  │
│    │     - Increments by 1                                │  │
│    │     - Formats as 5-digit zero-padded (e.g., "00001") │  │
│    └─────────────────────────────────────────────────────┘  │
│    ┌─────────────────────────────────────────────────────┐  │
│    │ 3.6 Create Invoice Model                            │  │
│    │     - Validates invoice data                        │  │
│    │     - Validates each invoice detail                 │  │
│    └─────────────────────────────────────────────────────┘  │
│    ┌─────────────────────────────────────────────────────┐  │
│    │ 3.7 Save to Database (Transaction)                  │  │
│    │     - Calls InvoiceRepository.addInvoiceAndDetail() │  │
│    └─────────────────────────────────────────────────────┘  │
└──────────────────┬──────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. InvoiceRepository.addInvoiceAndDetail()                  │
│    ┌─────────────────────────────────────────────────────┐  │
│    │ 4.1 Begin Transaction                               │  │
│    └─────────────────────────────────────────────────────┘  │
│    ┌─────────────────────────────────────────────────────┐  │
│    │ 4.2 Insert Invoice Header                           │  │
│    │     INSERT INTO Invoice (...)                       │  │
│    │     OUTPUT INSERTED.InvoiceId                       │  │
│    │     - Normalizes RefDocNumber (trim)                │  │
│    │     - Normalizes RefDocName (trim + uppercase)      │  │
│    └─────────────────────────────────────────────────────┘  │
│    ┌─────────────────────────────────────────────────────┐  │
│    │ 4.3 Insert Invoice Details (Loop)                  │  │
│    │     INSERT INTO InvoiceDetail (...)                 │  │
│    │     - For each detail in invoiceDetails array       │  │
│    │     - Normalizes RefDocNumber and RefDocName        │  │
│    └─────────────────────────────────────────────────────┘  │
│    ┌─────────────────────────────────────────────────────┐  │
│    │ 4.4 Commit Transaction                              │  │
│    │     - Returns InvoiceId                             │  │
│    └─────────────────────────────────────────────────────┘  │
└──────────────────┬──────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Optional: Create Receipt                                  │
│    - If createReceipt = true and payingAmount > 0          │
│    - Calls ReceiptService.createReceiptFromInvoice()        │
└──────────────────┬──────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. Return Response                                           │
│    {                                                         │
│      "success": true,                                        │
│      "data": {                                               │
│        "invoiceId": 12345,                                   │
│        "invoiceCode": "00001"                                │
│      },                                                      │
│      "message": "Invoice created successfully"               │
│    }                                                         │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. DETAILED COMPONENT BREAKDOWN

### 3.1 InvoiceController (`src/controllers/InvoiceController.js`)

**Responsibilities**:
- HTTP request handling
- Authentication validation
- Request body validation
- Calls InvoiceService
- Optional receipt creation
- Error handling and HTTP status codes

**Key Methods**:
- `createInvoice()` - Main invoice creation endpoint
- `createInvoiceByCode()` - Create from application code
- `getInvoiceByCode()` - Retrieve invoice
- `cancelInvoiceByCode()` - Soft delete invoice
- `searchInvoices()` - Search/filter invoices

### 3.2 InvoiceService (`src/services/InvoiceService.js`)

**Responsibilities**:
- Business logic validation
- Duplicate checking
- Reference document validation
- Invoice code generation
- Model validation
- Transaction orchestration

**Key Method: `saveInvoice()`**

**Flow**:
1. **Input Validation**
   ```javascript
   - Validates invoiceData exists
   - Validates invoiceDetails array not empty
   - Extracts ItemId and RefDocNumber from first detail
   ```

2. **RefDocNumber Normalization**
   ```javascript
   // Handles "I-NAPP-56" → "NAPP-56" conversion
   if (refDocNumber.startsWith('I-')) {
     baseRefDocNumber = refDocNumber.substring(2);
   }
   ```

3. **Duplicate Check**
   ```javascript
   // Checks: customerName + itemId + refDocNumber + transactionDate
   const duplicate = await repository.getDuplicateInvoice(
     customerName, itemId, refDocNumber, transactionDate
   );
   ```

4. **Reference Document Validation**
   ```javascript
   // Validates each invoice detail's RefDocNumber exists
   const validationResult = await ReferenceDocumentValidator
     .validateInvoiceDetails(invoiceDetails, churchId);
   
   // Retries once if fails (handles newly created applications)
   if (!validationResult.isValid) {
     await delay(150);
     validationResult = await ReferenceDocumentValidator
       .validateInvoiceDetails(invoiceDetails, churchId);
   }
   ```

5. **Invoice Code Generation**
   ```javascript
   // Gets last invoice code, increments by 1, formats as 5-digit
   const invoiceCode = await repository.generateInvoiceCode();
   // Example: "00001", "00002", etc.
   ```

6. **Model Validation**
   ```javascript
   const invoice = new Invoice({...});
   const invoiceErrors = invoice.validate();
   // Validates each detail
   ```

7. **Save to Database**
   ```javascript
   const invoiceId = await repository.addInvoiceAndDetail(invoice, invoiceDetails);
   ```

### 3.3 InvoiceRepository (`src/repositories/InvoiceRepository.js`)

**Responsibilities**:
- Database operations
- Transaction management
- Data normalization
- Query execution

**Key Method: `addInvoiceAndDetail()`**

**Transaction Flow**:
```sql
BEGIN TRANSACTION
  -- 1. Insert Invoice Header
  INSERT INTO Invoice (
    Code, TransactionDate, RefDocNumber, RefDocName,
    CustomerName, TotalAmount, PayingAmount,
    PaymentMode, PaymentModeDocNo, UserId, ChurchId, Status,
    TaxCode, TaxPercentage, TaxAmount, NicheApplicationId
  )
  OUTPUT INSERTED.InvoiceId
  VALUES (...)
  
  -- 2. Insert Invoice Details (for each detail)
  INSERT INTO InvoiceDetail (
    InvoiceId, ItemId, Quantity, UnitAmount,
    PayingAmount, TotalPayingAmount, RefDocNumber,
    RefDocName, LineTotalAmount, LineTaxPercent, LineTaxAmount
  )
  VALUES (...)
COMMIT TRANSACTION
```

**Critical Normalization**:
- **RefDocNumber**: Trimmed (removes leading/trailing whitespace)
- **RefDocName**: Trimmed + Uppercase (e.g., "NAPP", "WAPP")

### 3.4 ReferenceDocumentValidator (`src/services/ReferenceDocumentValidator.js`)

**Responsibilities**:
- Validates reference documents exist
- Checks church access control
- Supports multiple document types

**Validation Types**:
- **NAPP**: Validates against `NicheApplication.Code`
- **WAPP**: Validates against `WakeRoomBooking.Code`
- **INCR**: Validates against `NicheInscriptionRequest.Code` (or base NAPP if "I-NAPP-XX")
- **GOLA**: Validates against `GateOfLifeApplication.Code`
- **DONA**: Validates against `NicheApplication.Code`
- **OTHERS**: No validation required

**Special Handling**:
- **I-NAPP-XX format**: Extracts base code ("NAPP-XX") and validates against NicheApplication
- Allows invoice creation before inscription request exists

---

## 4. INVOICE CODE GENERATION

### Process

1. **Get Last Invoice Code**
   ```sql
   SELECT MAX(CAST(Code AS INT)) AS MaxCode
   FROM Invoice
   WHERE ISNUMERIC(Code) = 1 AND Status > 0
   ```

2. **Increment and Format**
   ```javascript
   const lastNumber = await getLastInvoiceCode();
   const nextNumber = lastNumber + 1;
   return String(nextNumber).padStart(5, '0');
   // Example: 1 → "00001", 123 → "00123"
   ```

### Invoice Code Format
- **Format**: 5-digit zero-padded number
- **Examples**: "00001", "00002", "00123", "01234"
- **Uniqueness**: Enforced by database (Code column)

---

## 5. REFERENCE DOCUMENT SYSTEM

### How RefDocNumber Works

**Invoice Header**:
- `RefDocNumber`: Base application code (e.g., "3795-1", "NAPP-56")
- `RefDocName`: Document type (e.g., "NAPP", "WAPP", "INCR")

**Invoice Details**:
- Each detail can have its own `RefDocNumber` and `RefDocName`
- For inscription items: `RefDocNumber` = "I-NAPP-3795-1"
- For regular items: `RefDocNumber` = "3795-1"

**Normalization**:
- All RefDocNumber values are **trimmed** (whitespace removed)
- All RefDocName values are **trimmed + uppercase**
- Ensures consistent lookup

### Reference Document Lookup

When retrieving invoices by application code:
1. Try invoice code match
2. Try RefDocNumber in InvoiceDetail
3. Try RefDocNumber in Invoice header
4. Pattern matching (e.g., "3795-1" → detect as NAPP)

---

## 6. DUPLICATE INVOICE CHECK

### Criteria

An invoice is considered duplicate if:
- Same `customerName`
- Same `itemId` (from InvoiceDetail)
- Same `refDocNumber` (from InvoiceDetail)
- Same `transactionDate` (same day)
- Status = 1 (Active)

### SQL Query
```sql
SELECT TOP 1 i.*
FROM Invoice i
INNER JOIN InvoiceDetail id ON i.InvoiceId = id.InvoiceId
WHERE i.CustomerName = @customerName
  AND id.ItemId = @itemId
  AND id.RefDocNumber = @refDocNumber
  AND CAST(i.TransactionDate AS DATE) = CAST(@transactionDate AS DATE)
  AND i.Status = 1
```

---

## 7. VALIDATION RULES

### Invoice Header Validation

**Required Fields**:
- `code` (or `invoiceNumber` for backward compatibility)
- `churchId` (must be > 0)
- `totalAmount` (must be >= 0)

**Optional Fields**:
- `refDocNumber`, `refDocName`
- `customerName`
- `paymentMode`, `paymentModeDocNo`
- `taxCode`, `taxPercentage`, `taxAmount`

**Status Values**:
- `0` = Deleted (soft delete)
- `1` = Active (default)
- `2` = Paid

### Invoice Detail Validation

**Required Fields**:
- `invoiceId` (set after invoice creation)
- `itemId` (must be > 0)
- `quantity` (must be >= 0)
- `unitAmount` (must be >= 0)

**Optional Fields**:
- `refDocNumber`, `refDocName`, `refType`
- `lineTotalAmount`, `lineTaxPercent`, `lineTaxAmount`
- `payingAmount`, `totalPayingAmount`

---

## 8. ERROR HANDLING

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `DUPLICATE_INVOICE` | 409 | Invoice already exists with same criteria |
| `INVALID_REF_DOCUMENT` | 400 | Reference document not found or invalid |
| `VALIDATION_ERROR` | 400 | Invoice or detail validation failed |
| `NOT_FOUND` | 404 | Invoice not found (for GET operations) |
| `ACCESS_DENIED` | 403 | Church ID mismatch |
| `INTERNAL_ERROR` | 500 | Server error |

### Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "DUPLICATE_INVOICE",
    "message": "Duplicate Invoice Found",
    "details": {
      "docCode": "3795-1",
      "docType": "NAPP"
    }
  }
}
```

---

## 9. TRANSACTION MANAGEMENT

### Atomicity

Invoice creation uses **SQL Server transactions**:
- **BEGIN TRANSACTION**: Before any inserts
- **INSERT Invoice**: Gets InvoiceId via OUTPUT clause
- **INSERT InvoiceDetails**: Loop through all details
- **COMMIT**: If all operations succeed
- **ROLLBACK**: If any operation fails

### Benefits
- **Atomicity**: All or nothing - invoice and details saved together
- **Consistency**: No partial invoices in database
- **Isolation**: Prevents concurrent modification issues

---

## 10. RECEIPT CREATION (OPTIONAL)

### Automatic Receipt Creation

If `createReceipt = true` in request body:
1. Invoice is created first
2. Receipt is created from invoice
3. Receipt links to invoice via `InvoiceId`

**Receipt Creation**:
- Uses `ReceiptService.createReceiptFromInvoice()`
- Creates receipt with same amounts as invoice
- Links receipt to invoice

---

## 11. INTEGRATION WITH OTHER SERVICES

### NicheBookingService Integration

When creating a niche booking:
1. Booking is created
2. Invoice is automatically created
3. Uses `InvoiceService.saveInvoice()`
4. Handles validation retries for newly created applications

### InscriptionInvoiceService Integration

For inscription requests:
- Creates invoice with `RefDocNumber = "I-NAPP-XX"`
- Base code extraction: "I-NAPP-3795-1" → "NAPP-3795-1"
- Validates against base NicheApplication

---

## 12. DATABASE SCHEMA

### Invoice Table
```sql
CREATE TABLE Invoice (
  InvoiceId INT IDENTITY(1,1) PRIMARY KEY,
  Code NVARCHAR(50) NOT NULL,              -- Invoice code (e.g., "00001")
  TransactionDate DATETIME,
  RefDocNumber NVARCHAR(50),               -- Reference document number
  RefDocName NVARCHAR(50),                 -- Reference document type
  CustomerName NVARCHAR(100),
  TotalAmount DECIMAL(18,2),
  PayingAmount DECIMAL(18,2),
  PaymentMode NVARCHAR(50),
  PaymentModeDocNo NVARCHAR(50),
  UserId INT,
  ChurchId INT,
  Status INT NOT NULL,                      -- 0=Deleted, 1=Active, 2=Paid
  TaxCode VARCHAR(50),
  TaxPercentage DECIMAL(18,2),
  TaxAmount DECIMAL(18,2),
  NicheApplicationId INT
)
```

### InvoiceDetail Table
```sql
CREATE TABLE InvoiceDetail (
  InvoiceDetailId INT IDENTITY(1,1) PRIMARY KEY,
  InvoiceId INT NOT NULL,                   -- FK to Invoice
  ItemId INT NOT NULL,                      -- FK to Item
  Quantity DECIMAL(18,2) NOT NULL,
  UnitAmount DECIMAL(18,2) NOT NULL,
  PayingAmount DECIMAL(18,2),
  TotalPayingAmount DECIMAL(18,2),
  RefDocNumber NVARCHAR(50),               -- Reference document number
  RefDocName NVARCHAR(50),                 -- Reference document type
  LineTotalAmount DECIMAL(18,2),
  LineTaxPercent DECIMAL(18,2),
  LineTaxAmount DECIMAL(18,2)
)
```

---

## 13. KEY FEATURES

### 1. Reference Document Validation
- Validates that referenced documents exist
- Supports multiple document types (NAPP, WAPP, INCR, GOLA, DONA)
- Retry logic for newly created applications

### 2. Duplicate Prevention
- Checks for duplicate invoices before creation
- Based on customer, item, reference, and date

### 3. Normalization
- All RefDocNumber values trimmed
- All RefDocName values trimmed + uppercase
- Ensures consistent lookup

### 4. Transaction Safety
- Atomic operations (all or nothing)
- Rollback on errors

### 5. Flexible Reference System
- Supports derived references ("I-NAPP-XX")
- Base code extraction for inscription items
- Multiple reference types per invoice

---

## 14. EXAMPLE SCENARIOS

### Scenario 1: Create Invoice for Niche Application

**Request**:
```json
POST /api/invoices
{
  "invoice": {
    "refDocNumber": "3795-1",
    "refDocName": "NAPP",
    "customerName": "John Doe",
    "totalAmount": 7630.00,
    "taxAmount": 630.00
  },
  "invoiceDetails": [{
    "itemId": 1,
    "quantity": 1,
    "unitAmount": 7000.00,
    "refDocNumber": "3795-1",
    "refDocName": "NAPP"
  }]
}
```

**Flow**:
1. Validates NicheApplication with code "3795-1" exists
2. Checks for duplicate invoice
3. Generates invoice code (e.g., "00001")
4. Saves invoice and detail
5. Returns invoiceId and invoiceCode

### Scenario 2: Create Invoice for Inscription Request

**Request**:
```json
{
  "invoiceDetails": [{
    "refDocNumber": "I-NAPP-3795-1",
    "refDocName": "INCR"
  }]
}
```

**Flow**:
1. Extracts base code: "I-NAPP-3795-1" → "NAPP-3795-1"
2. Validates base NicheApplication exists
3. Invoice header uses base code: "NAPP-3795-1"
4. Invoice detail uses full code: "I-NAPP-3795-1"

---

## 15. TROUBLESHOOTING

### Common Issues

1. **"Wrong Ref Document Number" Error**
   - **Cause**: Reference document doesn't exist or church mismatch
   - **Solution**: Verify application code exists and belongs to correct church
   - **Retry**: System automatically retries once (150ms delay)

2. **"Duplicate Invoice Found" Error**
   - **Cause**: Invoice already exists with same criteria
   - **Solution**: Check existing invoices or use different transaction date

3. **Invoice Code Generation Issues**
   - **Cause**: Non-numeric invoice codes in database
   - **Solution**: System handles fallback to InvoiceId-based lookup

4. **RefDocNumber Lookup Failures**
   - **Cause**: Whitespace or case mismatch
   - **Solution**: System normalizes all values (trim + uppercase)

---

## 16. PERFORMANCE CONSIDERATIONS

### Indexes Used

1. **IX_InvoiceDetail_RefDocNumber** (CRITICAL)
   - Fast lookup by application code
   - Includes InvoiceId for joins

2. **IX_Invoice_InvoiceId_Status**
   - Fast invoice retrieval
   - Includes Code, TransactionDate

3. **IX_NicheApplication_Code**
   - Fast reference document validation
   - Includes multiple fields

### Optimization Tips

1. **Batch Operations**: Use transactions for multiple details
2. **Normalization**: Always normalize RefDocNumber/RefDocName
3. **Index Usage**: Ensure indexes exist on RefDocNumber columns
4. **Validation Caching**: ReferenceDocumentValidator may use cached results

---

## 17. SUMMARY

### Invoice Creation Process

1. **API Request** → InvoiceController
2. **Validation** → InvoiceService (input, duplicate, reference)
3. **Code Generation** → InvoiceRepository (auto-increment)
4. **Database Save** → Transaction (Invoice + InvoiceDetails)
5. **Optional Receipt** → ReceiptService
6. **Response** → InvoiceId and InvoiceCode

### Key Points

- ✅ **Transaction-based**: Atomic operations
- ✅ **Validation**: Duplicate check + reference document validation
- ✅ **Normalization**: Consistent RefDocNumber/RefDocName handling
- ✅ **Flexible**: Supports multiple reference types
- ✅ **Safe**: Rollback on errors
- ✅ **Retry Logic**: Handles newly created applications

---

**Last Updated**: Based on current codebase analysis
**Version**: 1.0.0

