# Invoice API Testing Guide with cURL Commands

## Prerequisites

1. **Get Authentication Token**
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

2. **Set Base URL**
   ```bash
   export BASE_URL="http://localhost:3000"
   ```

---

## Test 1: Create Invoice (Basic)

**Endpoint**: `POST /api/invoices`

**cURL Command**:
```bash
curl -X POST $BASE_URL/api/invoices \
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

---

## Test 2: Create Invoice with Receipt

**Endpoint**: `POST /api/invoices`

**cURL Command**:
```bash
curl -X POST $BASE_URL/api/invoices \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "invoice": {
      "transactionDate": "2025-01-25T10:00:00Z",
      "customerName": "Jane Smith",
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

---

## Test 3: Test Duplicate Invoice Detection

**Endpoint**: `POST /api/invoices`

**cURL Command** (Same invoice as Test 1):
```bash
curl -X POST $BASE_URL/api/invoices \
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

**Expected Response** (409):
```json
{
  "success": false,
  "error": {
    "code": "DUPLICATE_INVOICE",
    "message": "Duplicate Invoice Found"
  }
}
```

---

## Test 4: Test Invalid Reference Document

**Endpoint**: `POST /api/invoices`

**cURL Command** (Invalid ref doc):
```bash
curl -X POST $BASE_URL/api/invoices \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "invoice": {
      "transactionDate": "2025-01-25T10:00:00Z",
      "customerName": "Test User",
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

---

## Test 5: Get Invoice by Code

**Endpoint**: `GET /api/invoices/:code`

**cURL Command**:
```bash
curl -X GET $BASE_URL/api/invoices/00001 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```

**Expected Response** (200):
```json
{
  "success": true,
  "data": {
    "InvoiceId": 123,
    "Code": "00001",
    "TransactionDate": "2025-01-25T10:00:00.000Z",
    "CustomerName": "John Doe",
    "TotalAmount": 1000.00,
    "PayingAmount": 1000.00,
    "Status": 1,
    "details": [
      {
        "InvoiceDetailId": 1,
        "ItemId": 1,
        "Quantity": 1,
        "UnitAmount": 1000.00,
        "TotalPayingAmount": 1000.00,
        "RefDocNumber": "3795-1",
        "RefType": "NAPP"
      }
    ]
  },
  "message": "Invoice retrieved successfully"
}
```

---

## Test 6: Search Invoices

**Endpoint**: `GET /api/invoices/search`

**cURL Command**:
```bash
curl -X GET "$BASE_URL/api/invoices/search?customerName=John&status=1&page=1&limit=10" \
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
        "InvoiceId": 123,
        "Code": "00001",
        "CustomerName": "John Doe",
        "TotalAmount": 1000.00,
        "Status": 1
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 1,
      "totalPages": 1
    }
  },
  "message": "Invoices retrieved successfully"
}
```

---

## Test 7: Test Different Reference Document Types

### Test 7a: WAPP (Wake Room Booking)
```bash
curl -X POST $BASE_URL/api/invoices \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "invoice": {
      "transactionDate": "2025-01-25T10:00:00Z",
      "customerName": "Wake Room User",
      "totalAmount": 500.00,
      "payingAmount": 500.00,
      "paymentMode": "Cash",
      "refDocNumber": "WRB-001",
      "refDocName": "WAPP",
      "churchId": 1
    },
    "invoiceDetails": [
      {
        "itemId": 2,
        "quantity": 1,
        "unitAmount": 500.00,
        "totalPayingAmount": 500.00,
        "refDocNumber": "WRB-001",
        "refDocName": "WAPP",
        "refType": "WAPP"
      }
    ]
  }'
```

### Test 7b: GOLA (Gate of Life Application)
```bash
curl -X POST $BASE_URL/api/invoices \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "invoice": {
      "transactionDate": "2025-01-25T10:00:00Z",
      "customerName": "GOLA User",
      "totalAmount": 750.00,
      "payingAmount": 750.00,
      "paymentMode": "Cash",
      "refDocNumber": "GOLA-001",
      "refDocName": "GOLA",
      "churchId": 1
    },
    "invoiceDetails": [
      {
        "itemId": 3,
        "quantity": 1,
        "unitAmount": 750.00,
        "totalPayingAmount": 750.00,
        "refDocNumber": "GOLA-001",
        "refDocName": "GOLA",
        "refType": "GOLA"
      }
    ]
  }'
```

### Test 7c: OTHERS (No Validation)
```bash
curl -X POST $BASE_URL/api/invoices \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "invoice": {
      "transactionDate": "2025-01-25T10:00:00Z",
      "customerName": "Other User",
      "totalAmount": 300.00,
      "payingAmount": 300.00,
      "paymentMode": "Cash",
      "refDocNumber": "ANY-CODE",
      "refDocName": "OTHERS",
      "churchId": 1
    },
    "invoiceDetails": [
      {
        "itemId": 4,
        "quantity": 1,
        "unitAmount": 300.00,
        "totalPayingAmount": 300.00,
        "refDocNumber": "ANY-CODE",
        "refDocName": "OTHERS",
        "refType": "OTHERS"
      }
    ]
  }'
```

---

## Test 8: Record Payment

**Endpoint**: `POST /api/invoices/:code/payments`

**cURL Command**:
```bash
curl -X POST $BASE_URL/api/invoices/00001/payments \
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

---

## Verification Checklist

After running all tests, verify:

- [ ] Invoice created with 5-digit code format (00001, 00002, etc.)
- [ ] Invoice details saved correctly
- [ ] Duplicate invoice detection works
- [ ] Invalid reference documents rejected
- [ ] Receipt created when `createReceipt: true`
- [ ] Receipt code matches invoice code when created from invoice
- [ ] Invoice retrieval by code works
- [ ] Invoice search with filters works
- [ ] Payment recording works
- [ ] All reference document types validated correctly (NAPP, WAPP, GOLA, OTHERS)

---

## Troubleshooting

### Error: "Authentication required"
- Make sure you have a valid JWT token
- Check that token is included in Authorization header

### Error: "Invoice code is required"
- Invoice code is auto-generated, but check that invoice data is valid

### Error: "Duplicate Invoice Found"
- This is expected behavior - invoice with same customer, item, ref doc, and date already exists

### Error: "Wrong Ref Document Number"
- Reference document doesn't exist in database
- Verify the refDocNumber exists for the specified refDocName type

---

**Document End**

