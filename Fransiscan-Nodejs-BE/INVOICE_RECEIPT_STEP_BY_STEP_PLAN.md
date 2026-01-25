# Invoice & Receipt System - Step-by-Step Implementation Plan

## Document Overview

**Version**: 1.0  
**Date**: 2025-01-25  
**Purpose**: Detailed step-by-step implementation guide with cURL commands  
**Approach**: Implement one task at a time, verify before proceeding

---

## Prerequisites

### Environment Setup
- Node.js backend running on `http://localhost:3000`
- Database connection configured
- Authentication token available (for protected endpoints)

### Get Authentication Token
```bash
# Login to get JWT token
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "your_username",
    "password": "your_password"
  }'

# Save token as environment variable
export TOKEN="your_jwt_token_here"
```

---

## Implementation Steps

### Step 1: Create InvoiceDetail Model

**File**: `src/models/InvoiceDetail.js`

**Purpose**: Model for invoice line items matching ASP.NET structure

**Fields Required**:
- `invoiceDetailId` (int, PK)
- `invoiceId` (int, FK)
- `itemId` (int, FK)
- `quantity` (decimal)
- `unitAmount` (decimal)
- `payingAmount` (decimal, nullable)
- `totalPayingAmount` (decimal, nullable)
- `refDocNumber` (string, nullable)
- `refDocName` (string, nullable)
- `refType` (string, nullable) - "NAPP", "WAPP", "INCR", "GOLA", "DONA", "OTHERS"
- `outstandingAmount` (decimal)
- `lineTotalAmount` (decimal, nullable)
- `lineTaxPercent` (decimal, nullable)
- `lineTaxAmount` (decimal, nullable)

**Verification**:
```bash
# No API endpoint yet, verify by checking model file exists
ls src/models/InvoiceDetail.js
```

---

### Step 2: Enhance Invoice Model

**File**: `src/models/Invoice.js`

**Purpose**: Update Invoice model to match ASP.NET structure

**Changes Required**:
- Add ASP.NET fields: `code`, `transactionDate`, `refDocNumber`, `refDocName`, `customerName`, `totalAmount`, `payingAmount`, `paymentMode`, `paymentModeDocNo`, `taxCode`, `taxPercentage`, `taxAmount`, `status` (int: 0,1,2)
- Update validation to match ASP.NET rules
- Add status constants
- Keep backward compatibility with existing fields

**Verification**:
```bash
# Test model validation (no API yet)
node -e "const Invoice = require('./src/models/Invoice'); const inv = new Invoice({code: '00001', status: 1}); console.log('Model loaded:', inv.code);"
```

---

### Step 3: Implement Invoice Code Generation

**File**: `src/repositories/InvoiceRepository.js`

**Purpose**: Add method to generate 5-digit invoice codes

**Method**: `getLastInvoiceCode()` and `generateInvoiceCode()`

**Implementation**:
```javascript
async getLastInvoiceCode() {
  // SELECT TOP 1 Code FROM Invoice ORDER BY InvoiceId DESC
  // Parse to int, return max
}

async generateInvoiceCode() {
  const lastNumber = await this.getLastInvoiceCode();
  return String(lastNumber + 1).padStart(5, '0');
}
```

**Verification**:
```bash
# Test code generation (internal test)
# No API endpoint yet, verify by checking repository method exists
```

---

### Step 4: Implement Duplicate Invoice Check

**File**: `src/repositories/InvoiceRepository.js`

**Purpose**: Check for duplicate invoices before creation

**Method**: `getDuplicateInvoice(customerName, itemId, refDocNumber, transactionDate)`

**SQL Query**:
```sql
SELECT TOP 1 i.*
FROM Invoice i WITH(NOLOCK)
INNER JOIN InvoiceDetail id ON i.InvoiceId = id.InvoiceId
WHERE i.CustomerName = @customerName
  AND id.ItemId = @itemId
  AND id.RefDocNumber = @refDocNumber
  AND CAST(i.TransactionDate AS DATE) = CAST(@transactionDate AS DATE)
  AND i.Status = 1
```

**Verification**:
```bash
# No API endpoint yet, verify by checking repository method exists
```

---

### Step 5: Create Reference Document Validation Service

**File**: `src/services/ReferenceDocumentValidator.js`

**Purpose**: Validate that reference documents exist before creating invoice

**Document Types**:
- NAPP → NicheApplication
- WAPP → WakeRoomBooking
- INCR → NicheInscriptionRequest
- GOLA → EngraveWallApplication
- DONA → NicheApplication
- OTHERS → No validation

**Method**: `validateReferenceDocument(refDocName, refDocNumber, churchId)`

**Verification**:
```bash
# No API endpoint yet, verify by checking service file exists
```

---

### Step 6: Implement addInvoiceAndDetail with Transaction

**File**: `src/repositories/InvoiceRepository.js`

**Purpose**: Save invoice header and details atomically

**Method**: `addInvoiceAndDetail(invoice, invoiceDetails)`

**Implementation**:
- Use SQL Server transaction
- Insert invoice first
- Get InvoiceId from OUTPUT
- Insert all invoice details
- Commit or rollback on error

**Verification**:
```bash
# No API endpoint yet, verify by checking repository method exists
```

---

### Step 7: Enhance InvoiceService - saveInvoice Method

**File**: `src/services/InvoiceService.js`

**Purpose**: Implement complete invoice creation flow

**Method**: `saveInvoice(invoiceData, invoiceDetails, userId, churchId)`

**Flow**:
1. Validate input
2. Check for duplicate
3. Validate reference documents
4. Generate invoice code
5. Save invoice + details (transaction)
6. Return invoice code

**Verification**:
```bash
# No API endpoint yet, verify by checking service method exists
```

---

### Step 8: Create InvoiceController

**File**: `src/controllers/InvoiceController.js`

**Purpose**: Handle HTTP requests for invoice operations

**Methods**:
- `createInvoice(req, res)` - Create new invoice
- `getInvoiceByCode(req, res)` - Get invoice by code
- `searchInvoices(req, res)` - Search invoices with filters

**Verification**:
```bash
# Check controller file exists
ls src/controllers/InvoiceController.js
```

---

### Step 9: Update Invoice Routes

**File**: `src/routes/invoices.js`

**Purpose**: Add new invoice endpoints

**Endpoints**:
- `POST /api/invoices` - Create invoice (enhanced)
- `GET /api/invoices/:code` - Get invoice by code
- `GET /api/invoices/search` - Search invoices

**Verification**:
```bash
# Test route registration
curl -X GET http://localhost:3000/api/invoices \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```

---

### Step 10: Test Invoice Creation - Step 1

**Endpoint**: `POST /api/invoices`

**cURL Command**:
```bash
curl -X POST http://localhost:3000/api/invoices \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "invoice": {
      "transactionDate": "2025-01-25T10:00:00Z",
      "customerName": "John Doe",
      "totalAmount": 1000.00,
      "payingAmount": 1000.00,
      "paymentMode": "Cash",
      "refDocNumber": "3795-1",
      "refDocName": "NAPP",
      "churchId": 1
    },
    "invoiceDetails": [
      {
        "itemId": 1,
        "quantity": 1,
        "unitAmount": 1000.00,
        "payingAmount": 1000.00,
        "totalPayingAmount": 1000.00,
        "refDocNumber": "3795-1",
        "refDocName": "NAPP",
        "refType": "NAPP",
        "outstandingAmount": 0,
        "lineTotalAmount": 1000.00,
        "lineTaxPercent": 0,
        "lineTaxAmount": 0
      }
    ],
    "createReceipt": false
  }'
```

**Expected Response** (201):
```json
{
  "success": true,
  "data": {
    "invoiceId": 123,
    "invoiceCode": "00001"
  },
  "message": "Invoice created successfully"
}
```

**Verification Checklist**:
- [ ] Invoice created with 5-digit code
- [ ] Invoice details saved
- [ ] No duplicate invoice error
- [ ] Reference document validated

---

### Step 11: Test Duplicate Invoice Detection

**Endpoint**: `POST /api/invoices`

**cURL Command** (Same invoice again):
```bash
curl -X POST http://localhost:3000/api/invoices \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "invoice": {
      "transactionDate": "2025-01-25T10:00:00Z",
      "customerName": "John Doe",
      "totalAmount": 1000.00,
      "payingAmount": 1000.00,
      "paymentMode": "Cash",
      "refDocNumber": "3795-1",
      "refDocName": "NAPP",
      "churchId": 1
    },
    "invoiceDetails": [
      {
        "itemId": 1,
        "quantity": 1,
        "unitAmount": 1000.00,
        "totalPayingAmount": 1000.00,
        "refDocNumber": "3795-1",
        "refDocName": "NAPP",
        "refType": "NAPP"
      }
    ]
  }'
```

**Expected Response** (400):
```json
{
  "success": false,
  "error": {
    "code": "DUPLICATE_INVOICE",
    "message": "Duplicate Invoice Found"
  }
}
```

**Verification Checklist**:
- [ ] Duplicate detected correctly
- [ ] Error message clear
- [ ] No invoice created

---

### Step 12: Test Get Invoice by Code

**Endpoint**: `GET /api/invoices/:code`

**cURL Command**:
```bash
curl -X GET http://localhost:3000/api/invoices/00001 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```

**Expected Response** (200):
```json
{
  "success": true,
  "data": {
    "invoiceId": 123,
    "code": "00001",
    "transactionDate": "2025-01-25T10:00:00Z",
    "customerName": "John Doe",
    "totalAmount": 1000.00,
    "payingAmount": 1000.00,
    "status": 1,
    "details": [
      {
        "invoiceDetailId": 1,
        "itemId": 1,
        "quantity": 1,
        "unitAmount": 1000.00,
        "totalPayingAmount": 1000.00,
        "refDocNumber": "3795-1",
        "refType": "NAPP"
      }
    ]
  }
}
```

**Verification Checklist**:
- [ ] Invoice retrieved correctly
- [ ] Invoice details included
- [ ] All fields present

---

### Step 13: Test Invalid Reference Document

**Endpoint**: `POST /api/invoices`

**cURL Command** (Invalid ref doc):
```bash
curl -X POST http://localhost:3000/api/invoices \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "invoice": {
      "transactionDate": "2025-01-25T10:00:00Z",
      "customerName": "Jane Doe",
      "totalAmount": 500.00,
      "payingAmount": 500.00,
      "paymentMode": "Cash",
      "refDocNumber": "INVALID-999",
      "refDocName": "NAPP",
      "churchId": 1
    },
    "invoiceDetails": [
      {
        "itemId": 1,
        "quantity": 1,
        "unitAmount": 500.00,
        "totalPayingAmount": 500.00,
        "refDocNumber": "INVALID-999",
        "refDocName": "NAPP",
        "refType": "NAPP"
      }
    ]
  }'
```

**Expected Response** (400):
```json
{
  "success": false,
  "error": {
    "code": "INVALID_REF_DOCUMENT",
    "message": "Wrong Ref Document Number: INVALID-999"
  }
}
```

**Verification Checklist**:
- [ ] Invalid reference detected
- [ ] Error message clear
- [ ] No invoice created

---

### Step 14: Enhance Receipt Code Generation

**File**: `src/repositories/ReceiptRepository.js`

**Purpose**: Ensure receipt code generation matches ASP.NET (6-digit format)

**Method**: `getMaxReceiptCode()` and `generateReceiptCode()`

**Verification**:
```bash
# Check existing receipt code generation
# Verify it returns 6-digit format
```

---

### Step 15: Enhance Receipt Creation from Invoice

**File**: `src/services/ReceiptService.js`

**Purpose**: Ensure receipt code matches invoice code when created from invoice

**Changes**:
- When creating receipt from invoice, use invoice code as receipt code
- Only generate new code for miscellaneous receipts

**Verification**:
```bash
# Test receipt creation from invoice
curl -X POST http://localhost:3000/api/receipts/from-invoice \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "invoice": {
      "code": "00001"
    }
  }'
```

---

### Step 16: Test Complete Invoice + Receipt Flow

**Endpoint**: `POST /api/invoices` (with createReceipt: true)

**cURL Command**:
```bash
curl -X POST http://localhost:3000/api/invoices \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "invoice": {
      "transactionDate": "2025-01-25T10:00:00Z",
      "customerName": "Test User",
      "totalAmount": 2000.00,
      "payingAmount": 2000.00,
      "paymentMode": "Cash",
      "refDocNumber": "3795-2",
      "refDocName": "NAPP",
      "churchId": 1
    },
    "invoiceDetails": [
      {
        "itemId": 1,
        "quantity": 1,
        "unitAmount": 2000.00,
        "payingAmount": 2000.00,
        "totalPayingAmount": 2000.00,
        "refDocNumber": "3795-2",
        "refDocName": "NAPP",
        "refType": "NAPP",
        "outstandingAmount": 0,
        "lineTotalAmount": 2000.00,
        "lineTaxPercent": 0,
        "lineTaxAmount": 0
      }
    ],
    "createReceipt": true
  }'
```

**Expected Response** (201):
```json
{
  "success": true,
  "data": {
    "invoiceId": 124,
    "invoiceCode": "00002",
    "receiptId": 456,
    "receiptCode": "00002"
  },
  "message": "Invoice and receipt created successfully"
}
```

**Verification Checklist**:
- [ ] Invoice created
- [ ] Receipt created automatically
- [ ] Receipt code matches invoice code
- [ ] MisalaniousReceiptDetail created

---

### Step 17: Test Search Invoices

**Endpoint**: `GET /api/invoices/search`

**cURL Command**:
```bash
curl -X GET "http://localhost:3000/api/invoices/search?customerName=John&status=1&page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```

**Expected Response** (200):
```json
{
  "success": true,
  "data": {
    "invoices": [
      {
        "invoiceId": 123,
        "code": "00001",
        "customerName": "John Doe",
        "totalAmount": 1000.00,
        "status": 1
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 1,
      "totalPages": 1
    }
  }
}
```

**Verification Checklist**:
- [ ] Search works correctly
- [ ] Filters applied
- [ ] Pagination works

---

### Step 18: Test Payment Recording

**Endpoint**: `POST /api/invoices/:code/payments`

**cURL Command**:
```bash
curl -X POST http://localhost:3000/api/invoices/00001/payments \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 1000.00,
    "paymentMode": "Cash",
    "paymentModeDocNo": null
  }'
```

**Expected Response** (200):
```json
{
  "success": true,
  "data": {
    "invoiceCode": "00001",
    "invoiceId": 123,
    "amount": 1000.00,
    "linkedEntity": {
      "type": "NAPP",
      "code": "3795-1"
    }
  },
  "message": "Payment recorded successfully"
}
```

**Verification Checklist**:
- [ ] Invoice status updated to 2 (Paid)
- [ ] Linked entity status updated
- [ ] Payment recorded correctly

---

## Testing Checklist Summary

### Functional Tests
- [ ] Invoice creation with valid data
- [ ] Duplicate invoice detection
- [ ] Invalid reference document rejection
- [ ] Invoice code generation (5-digit)
- [ ] Receipt code generation (6-digit)
- [ ] Receipt creation from invoice
- [ ] Receipt code matches invoice code
- [ ] Payment recording
- [ ] Invoice search with filters
- [ ] Get invoice by code

### Integration Tests
- [ ] Complete invoice + receipt flow
- [ ] Transaction rollback on error
- [ ] Reference document validation for all types
- [ ] Church ID access control

### Edge Cases
- [ ] Empty invoice details array
- [ ] Missing required fields
- [ ] Invalid payment mode
- [ ] Invalid status values
- [ ] Non-existent invoice code

---

## Rollback Plan

If any step fails:

1. **Revert Code Changes**
   ```bash
   git checkout src/models/Invoice.js
   git checkout src/repositories/InvoiceRepository.js
   # etc.
   ```

2. **Verify Existing Functionality**
   ```bash
   # Test existing endpoints still work
   curl -X GET http://localhost:3000/api/invoices \
     -H "Authorization: Bearer $TOKEN"
   ```

3. **Check Database State**
   ```sql
   -- Verify no orphaned records
   SELECT * FROM Invoice WHERE Code IS NULL;
   SELECT * FROM InvoiceDetail WHERE InvoiceId NOT IN (SELECT InvoiceId FROM Invoice);
   ```

---

## Next Steps After Implementation

1. **Performance Testing**
   - Load test invoice creation
   - Test concurrent code generation
   - Optimize slow queries

2. **Documentation**
   - Update API documentation
   - Add code examples
   - Document error codes

3. **Monitoring**
   - Add logging for invoice creation
   - Monitor error rates
   - Track performance metrics

---

## Notes

- All cURL commands assume server running on `localhost:3000`
- Replace `$TOKEN` with actual JWT token
- Adjust `churchId` and `refDocNumber` based on your test data
- Test with real database data when possible
- Verify backward compatibility after each step

---

**Document End**

