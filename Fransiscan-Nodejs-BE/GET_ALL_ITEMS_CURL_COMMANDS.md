# Get All Invoice & Receipt Items - Complete cURL Commands

Complete guide with all cURL commands to get all selected items from invoices and receipts with example responses.

---

## 🔑 Authentication Setup

First, get your authentication token:

```bash
# Login to get token
curl -X POST "http://localhost:3000/api/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "your_username",
    "password": "your_password"
  }'

# Save token to variable (Linux/Mac)
TOKEN="your_token_here"

# Or in PowerShell (Windows)
$token = "your_token_here"
```

---

## 📋 1. Get Invoice with ALL Items (Complete Details)

### Endpoint
```
GET /api/invoices/:code
```

### Description
Gets complete invoice information including:
- Invoice header (all fields)
- All invoice line items (details)
- Item names and codes for each line item
- Related receipt information
- Address and payee information

### cURL Command
```bash
curl -X GET "http://localhost:3000/api/invoices/00001" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  | jq '.'
```

### PowerShell Command
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/invoices/00001" `
  -Method Get `
  -Headers @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
  } | ConvertTo-Json -Depth 10
```

### Example Response (All Items Shown)
```json
{
  "success": true,
  "data": {
    "invoiceId": 123,
    "code": "00001",
    "transactionDate": "2025-01-15T10:30:00.000Z",
    "refDocNumber": "22274",
    "refDocName": "NAPP",
    "customerName": "John Doe",
    "totalAmount": 1500.00,
    "payingAmount": 1500.00,
    "paymentMode": "Cash",
    "paymentModeDocNo": null,
    "userId": 1,
    "churchId": 1,
    "status": 2,
    "nicheApplicationId": 456,
    "taxCode": null,
    "taxPercentage": 0.00,
    "taxAmount": 0.00,
    "addressNo": "123",
    "address": "Main Street",
    "address2": "Apt 4B",
    "addressCity": "Singapore",
    "districtCode": "SG-01",
    "country": "Singapore",
    "payeeName": "John Doe",
    "receipt": {
      "receiptId": 567,
      "receiptCode": "000001",
      "receiptDate": "2025-01-15T10:30:00.000Z",
      "payeeName": "John Doe",
      "receiptTotalAmount": 1500.00,
      "receiptPayingAmount": 1500.00
    },
    "details": [
      {
        "invoiceDetailId": 1001,
        "invoiceId": 123,
        "itemId": 10,
        "itemName": "Niche Application",
        "itemCode": "NICH",
        "quantity": 1,
        "unitAmount": 1000.00,
        "payingAmount": 1000.00,
        "totalPayingAmount": 1000.00,
        "refDocNumber": "22274",
        "refDocName": "NAPP",
        "refType": "NAPP",
        "outstandingAmount": 0.00,
        "lineTotalAmount": 1000.00,
        "lineTaxPercent": 0.00,
        "lineTaxAmount": 0.00
      },
      {
        "invoiceDetailId": 1002,
        "invoiceId": 123,
        "itemId": 11,
        "itemName": "Engraving Service",
        "itemCode": "ENGR",
        "quantity": 1,
        "unitAmount": 500.00,
        "payingAmount": 500.00,
        "totalPayingAmount": 500.00,
        "refDocNumber": "22274",
        "refDocName": "NAPP",
        "refType": "NAPP",
        "outstandingAmount": 0.00,
        "lineTotalAmount": 500.00,
        "lineTaxPercent": 0.00,
        "lineTaxAmount": 0.00
      }
    ]
  },
  "message": "Invoice retrieved successfully"
}
```

### Get Invoice by Application Code
```bash
# Use niche application code instead of invoice code
curl -X GET "http://localhost:3000/api/invoices/22274" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  | jq '.data.details'
```

---

## 📋 2. Get Receipt with ALL Items (Complete Details)

### Endpoint
```
GET /api/receipts/:code
```

### Description
Gets complete receipt information including:
- Receipt header (all fields)
- All receipt line items (details)
- Related invoice information
- Invoice items (if linked)

### cURL Command
```bash
curl -X GET "http://localhost:3000/api/receipts/000001" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  | jq '.'
```

### Example Response (All Items Shown)
```json
{
  "success": true,
  "data": {
    "receiptId": 567,
    "invoiceId": 123,
    "transactionDate": "2025-01-15T10:30:00.000Z",
    "customerName": "John Doe",
    "code": "000001",
    "totalAmount": 1500.00,
    "payingAmount": 1500.00,
    "paymentMode": 1,
    "userId": 1,
    "churchId": 1,
    "status": 2,
    "paymentModeDocNo": null,
    "payeeName": "John Doe",
    "addressNo": "123",
    "address": "Main Street",
    "address2": "Apt 4B",
    "addressCity": "Singapore",
    "districtCode": "SG-01",
    "country": "Singapore",
    "outstandingAmount": 0.00,
    "invoice": {
      "InvoiceId": 123,
      "Code": "00001",
      "TransactionDate": "2025-01-15T10:30:00.000Z",
      "CustomerName": "John Doe",
      "TotalAmount": 1500.00,
      "PayingAmount": 1500.00,
      "details": [
        {
          "invoiceDetailId": 1001,
          "itemId": 10,
          "quantity": 1,
          "unitAmount": 1000.00,
          "totalPayingAmount": 1000.00,
          "refDocNumber": "22274",
          "refDocName": "NAPP"
        },
        {
          "invoiceDetailId": 1002,
          "itemId": 11,
          "quantity": 1,
          "unitAmount": 500.00,
          "totalPayingAmount": 500.00,
          "refDocNumber": "22274",
          "refDocName": "NAPP"
        }
      ]
    },
    "details": [
      {
        "ReceiptDetailId": 2001,
        "ReceiptId": 567,
        "ItemId": 10,
        "Quantity": 1,
        "UnitAmount": 1000.00,
        "PayingAmount": 1000.00,
        "TotalPayingAmount": 1000.00,
        "RefDocNumber": "22274",
        "RefDocName": "NAPP",
        "InvoiceId": 123,
        "RefType": "NAPP"
      },
      {
        "ReceiptDetailId": 2002,
        "ReceiptId": 567,
        "ItemId": 11,
        "Quantity": 1,
        "UnitAmount": 500.00,
        "PayingAmount": 500.00,
        "TotalPayingAmount": 500.00,
        "RefDocNumber": "22274",
        "RefDocName": "NAPP",
        "InvoiceId": 123,
        "RefType": "NAPP"
      }
    ]
  },
  "message": "Receipt retrieved successfully"
}
```

---

## 📋 3. Get ALL Receipt Items (Detailed with Item Info)

### Endpoint
```
GET /api/receipts/:receiptId/items
```

### Description
Gets all receipt items for a specific receipt with optional item information (name, code).

### cURL Command (WITH Item Info - Recommended)
```bash
curl -X GET "http://localhost:3000/api/receipts/567/items?includeItemInfo=true" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  | jq '.'
```

### Example Response (All Items with Item Names)
```json
{
  "success": true,
  "data": [
    {
      "receiptDetailId": 2001,
      "receiptId": 567,
      "itemId": 10,
      "itemName": "Niche Application",
      "itemCode": "NICH",
      "quantity": 1,
      "unitAmount": 1000.00,
      "payingAmount": 1000.00,
      "totalPayingAmount": 1000.00,
      "refDocNumber": "22274",
      "refDocName": "NAPP",
      "refType": "NAPP",
      "invoiceId": 123
    },
    {
      "receiptDetailId": 2002,
      "receiptId": 567,
      "itemId": 11,
      "itemName": "Engraving Service",
      "itemCode": "ENGR",
      "quantity": 1,
      "unitAmount": 500.00,
      "payingAmount": 500.00,
      "totalPayingAmount": 500.00,
      "refDocNumber": "22274",
      "refDocName": "NAPP",
      "refType": "NAPP",
      "invoiceId": 123
    },
    {
      "receiptDetailId": 2003,
      "receiptId": 567,
      "itemId": 12,
      "itemName": "Storage Fee",
      "itemCode": "STOR",
      "quantity": 1,
      "unitAmount": 200.00,
      "payingAmount": 200.00,
      "totalPayingAmount": 200.00,
      "refDocNumber": "22274",
      "refDocName": "NAPP",
      "refType": "NAPP",
      "invoiceId": 123
    }
  ],
  "message": "Receipt items retrieved successfully"
}
```

### cURL Command (WITHOUT Item Info)
```bash
curl -X GET "http://localhost:3000/api/receipts/567/items" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  | jq '.'
```

---

## 📋 4. Get Receipt Items by Reference Document

### Endpoint
```
GET /api/receipt-items/by-ref-doc
```

### Description
Gets all receipt items for a specific reference document (e.g., niche application code).

### cURL Command
```bash
curl -X GET "http://localhost:3000/api/receipt-items/by-ref-doc?refDocNumber=22274&refDocName=NAPP" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  | jq '.'
```

### Example Response (All Items for Application)
```json
{
  "success": true,
  "data": [
    {
      "receiptDetailId": 2001,
      "receiptId": 567,
      "receiptCode": "000001",
      "receiptDate": "2025-01-15T10:30:00.000Z",
      "itemId": 10,
      "itemName": "Niche Application",
      "itemCode": "NICH",
      "quantity": 1,
      "unitAmount": 1000.00,
      "totalPayingAmount": 1000.00,
      "refDocNumber": "22274",
      "refDocName": "NAPP"
    },
    {
      "receiptDetailId": 2002,
      "receiptId": 567,
      "receiptCode": "000001",
      "receiptDate": "2025-01-15T10:30:00.000Z",
      "itemId": 11,
      "itemName": "Engraving Service",
      "itemCode": "ENGR",
      "quantity": 1,
      "unitAmount": 500.00,
      "totalPayingAmount": 500.00,
      "refDocNumber": "22274",
      "refDocName": "NAPP"
    }
  ],
  "message": "Receipt items retrieved successfully"
}
```

---

## 📋 5. Get Invoice Items Summary (Just Items Array)

### Extract Only Items from Invoice Response
```bash
# Get invoice and extract only the details array
curl -X GET "http://localhost:3000/api/invoices/00001" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  | jq '.data.details'
```

### Example Output (Items Only)
```json
[
  {
    "invoiceDetailId": 1001,
    "invoiceId": 123,
    "itemId": 10,
    "itemName": "Niche Application",
    "itemCode": "NICH",
    "quantity": 1,
    "unitAmount": 1000.00,
    "totalPayingAmount": 1000.00,
    "refDocNumber": "22274",
    "refDocName": "NAPP"
  },
  {
    "invoiceDetailId": 1002,
    "invoiceId": 123,
    "itemId": 11,
    "itemName": "Engraving Service",
    "itemCode": "ENGR",
    "quantity": 1,
    "unitAmount": 500.00,
    "totalPayingAmount": 500.00,
    "refDocNumber": "22274",
    "refDocName": "NAPP"
  }
]
```

---

## 📋 6. Get Receipt Items Summary (Just Items Array)

### Extract Only Items from Receipt Items Response
```bash
# Get receipt items and extract only the data array
curl -X GET "http://localhost:3000/api/receipts/567/items?includeItemInfo=true" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  | jq '.data'
```

### Example Output (Items Only)
```json
[
  {
    "receiptDetailId": 2001,
    "receiptId": 567,
    "itemId": 10,
    "itemName": "Niche Application",
    "itemCode": "NICH",
    "quantity": 1,
    "unitAmount": 1000.00,
    "totalPayingAmount": 1000.00
  },
  {
    "receiptDetailId": 2002,
    "receiptId": 567,
    "itemId": 11,
    "itemName": "Engraving Service",
    "itemCode": "ENGR",
    "quantity": 1,
    "unitAmount": 500.00,
    "totalPayingAmount": 500.00
  }
]
```

---

## 🔍 Complete Testing Workflow

### Step-by-Step Test All Endpoints

```bash
#!/bin/bash

# Set your token
TOKEN="YOUR_TOKEN_HERE"
BASE_URL="http://localhost:3000/api"

echo "=========================================="
echo "Testing Invoice & Receipt Items APIs"
echo "=========================================="
echo ""

# Test 1: Get Invoice with All Items
echo "1. Getting Invoice with All Items..."
echo "-----------------------------------"
curl -s -X GET "$BASE_URL/invoices/00001" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  | jq '{
    invoiceCode: .data.code,
    customerName: .data.customerName,
    totalAmount: .data.totalAmount,
    itemCount: (.data.details | length),
    items: .data.details | map({
      itemName,
      itemCode,
      quantity,
      unitAmount,
      totalPayingAmount
    })
  }'

echo ""
echo ""

# Test 2: Get Receipt Items
echo "2. Getting Receipt Items..."
echo "-----------------------------------"
curl -s -X GET "$BASE_URL/receipts/567/items?includeItemInfo=true" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  | jq '{
    itemCount: (.data | length),
    items: .data | map({
      itemName,
      itemCode,
      quantity,
      unitAmount,
      totalPayingAmount
    }),
    total: (.data | map(.totalPayingAmount) | add)
  }'

echo ""
echo ""

# Test 3: Get Items by Reference Document
echo "3. Getting Items by Reference Document..."
echo "-----------------------------------"
curl -s -X GET "$BASE_URL/receipt-items/by-ref-doc?refDocNumber=22274&refDocName=NAPP" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  | jq '{
    itemCount: (.data | length),
    items: .data | map({
      receiptCode,
      itemName,
      itemCode,
      quantity,
      unitAmount,
      totalPayingAmount
    })
  }'

echo ""
echo "=========================================="
echo "Testing Complete"
echo "=========================================="
```

---

## 📊 Response Field Reference

### Invoice Detail Item Fields
```json
{
  "invoiceDetailId": 1001,           // Primary key
  "invoiceId": 123,                  // Foreign key to Invoice
  "itemId": 10,                      // Foreign key to Item
  "itemName": "Niche Application",  // Item name (from Item table)
  "itemCode": "NICH",                // Item code (from Item table)
  "quantity": 1,                     // Quantity
  "unitAmount": 1000.00,             // Price per unit
  "payingAmount": 1000.00,           // Amount being paid
  "totalPayingAmount": 1000.00,      // Total: quantity × unitAmount
  "refDocNumber": "22274",          // Reference document code
  "refDocName": "NAPP",              // Reference document type
  "refType": "NAPP",                 // Reference type
  "outstandingAmount": 0.00,          // Outstanding amount
  "lineTotalAmount": 1000.00,        // Line total
  "lineTaxPercent": 0.00,            // Tax percentage
  "lineTaxAmount": 0.00              // Tax amount
}
```

### Receipt Detail Item Fields
```json
{
  "receiptDetailId": 2001,           // Primary key
  "receiptId": 567,                  // Foreign key to Receipt
  "itemId": 10,                      // Foreign key to Item
  "itemName": "Niche Application",  // Item name (when includeItemInfo=true)
  "itemCode": "NICH",                // Item code (when includeItemInfo=true)
  "quantity": 1,                     // Quantity
  "unitAmount": 1000.00,             // Price per unit
  "payingAmount": 1000.00,           // Amount being paid
  "totalPayingAmount": 1000.00,      // Total: quantity × unitAmount
  "refDocNumber": "22274",          // Reference document code
  "refDocName": "NAPP",              // Reference document type
  "refType": "NAPP",                 // Reference type
  "invoiceId": 123                   // Foreign key to Invoice (if linked)
}
```

---

## 🎯 Quick Reference Commands

### Get Invoice Items
```bash
curl -X GET "http://localhost:3000/api/invoices/00001" \
  -H "Authorization: Bearer $TOKEN" \
  | jq '.data.details'
```

### Get Receipt Items
```bash
curl -X GET "http://localhost:3000/api/receipts/567/items?includeItemInfo=true" \
  -H "Authorization: Bearer $TOKEN" \
  | jq '.data'
```

### Get Items by Application Code
```bash
curl -X GET "http://localhost:3000/api/invoices/22274" \
  -H "Authorization: Bearer $TOKEN" \
  | jq '.data.details'
```

### Get Receipt Items by Ref Doc
```bash
curl -X GET "http://localhost:3000/api/receipt-items/by-ref-doc?refDocNumber=22274&refDocName=NAPP" \
  -H "Authorization: Bearer $TOKEN" \
  | jq '.data'
```

---

## ✅ Summary

**To get all invoice items:**
- Use: `GET /api/invoices/:code`
- Returns: Invoice header + all details with item names and codes
- Code can be: Invoice code (e.g., "00001") OR application code (e.g., "22274")

**To get all receipt items:**
- Use: `GET /api/receipts/:receiptId/items?includeItemInfo=true`
- Returns: All receipt items with item names and codes
- Always use `includeItemInfo=true` to get item information

**To get items by reference document:**
- Use: `GET /api/receipt-items/by-ref-doc?refDocNumber=22274&refDocName=NAPP`
- Returns: All receipt items for that reference document

---

**Last Updated**: 2025-01-18  
**All endpoints tested and working** ✅

