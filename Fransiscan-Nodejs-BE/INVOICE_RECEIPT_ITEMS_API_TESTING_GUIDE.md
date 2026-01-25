# Invoice & Receipt Items API Testing Guide

Complete testing guide with cURL commands and example responses for getting all items from invoices and receipts.

## Base URL
```
http://localhost:3000/api
```

## Authentication
All endpoints require JWT token in Authorization header:
```
Authorization: Bearer <your-token>
```

---

## 1. Get Invoice with All Items

Get complete invoice information including all line items with item details.

### Endpoint
```
GET /api/invoices/:code
```

### Parameters
- `code` (path parameter): Invoice code (e.g., "00001") OR niche application code (e.g., "22274")

### Query Parameters
- None (all items are included by default)

### cURL Command
```bash
curl -X GET "http://localhost:3000/api/invoices/00001" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json"
```

### Example Response
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
    "invType": null,
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
      "receiptPayingAmount": 1500.00,
      "receiptPaymentMode": 1,
      "receiptPaymentModeDocNo": null
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

### Get Invoice by Niche Application Code
```bash
curl -X GET "http://localhost:3000/api/invoices/22274" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json"
```

---

## 2. Get Receipt with All Items

Get complete receipt information including all receipt items with item details.

### Endpoint
```
GET /api/receipts/:code
```

### Parameters
- `code` (path parameter): Receipt code (e.g., "000001")

### Query Parameters
- None (all items are included by default)

### cURL Command
```bash
curl -X GET "http://localhost:3000/api/receipts/000001" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json"
```

### Example Response
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
      "TaxAmount": 0.00,
      "PaymentMode": "Cash",
      "PaymentModeDocNo": null,
      "RefDocNumber": "22274",
      "RefDocName": "NAPP",
      "Status": 2,
      "ChurchId": 1,
      "UserId": 1,
      "details": [
        {
          "invoiceDetailId": 1001,
          "itemId": 10,
          "quantity": 1,
          "unitAmount": 1000.00,
          "payingAmount": 1000.00,
          "totalPayingAmount": 1000.00,
          "refDocNumber": "22274",
          "refDocName": "NAPP",
          "lineTotalAmount": 1000.00,
          "lineTaxPercent": 0.00,
          "lineTaxAmount": 0.00
        },
        {
          "invoiceDetailId": 1002,
          "itemId": 11,
          "quantity": 1,
          "unitAmount": 500.00,
          "payingAmount": 500.00,
          "totalPayingAmount": 500.00,
          "refDocNumber": "22274",
          "refDocName": "NAPP",
          "lineTotalAmount": 500.00,
          "lineTaxPercent": 0.00,
          "lineTaxAmount": 0.00
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

## 3. Get All Receipt Items (Detailed)

Get all receipt items with item information (name, code).

### Endpoint
```
GET /api/receipts/:receiptId/items
```

### Parameters
- `receiptId` (path parameter): Receipt ID (number)

### Query Parameters
- `includeItemInfo` (boolean, optional): Include item name and code (default: false, but recommended: true)

### cURL Command (with item info)
```bash
curl -X GET "http://localhost:3000/api/receipts/567/items?includeItemInfo=true" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json"
```

### Example Response
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
    }
  ],
  "message": "Receipt items retrieved successfully"
}
```

### cURL Command (without item info)
```bash
curl -X GET "http://localhost:3000/api/receipts/567/items" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json"
```

---

## 4. Get Invoice Items by Reference Document

Get all invoice items for a specific reference document (e.g., niche application code).

### Endpoint
```
GET /api/invoices/:code
```

Where `code` can be:
- Invoice code (e.g., "00001")
- Niche application code (e.g., "22274")

### cURL Command (by application code)
```bash
curl -X GET "http://localhost:3000/api/invoices/22274" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json"
```

### Example Response (showing all items)
```json
{
  "success": true,
  "data": {
    "invoiceId": 123,
    "code": "00001",
    "transactionDate": "2025-01-15T10:30:00.000Z",
    "customerName": "John Doe",
    "totalAmount": 1500.00,
    "details": [
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
  },
  "message": "Invoice retrieved successfully"
}
```

---

## 5. Get Receipt Items by Reference Document

Get all receipt items for a specific reference document.

### Endpoint
```
GET /api/receipt-items/by-ref-doc
```

### Query Parameters
- `refDocNumber` (string, required): Reference document number (e.g., "22274")
- `refDocName` (string, optional): Reference document type (e.g., "NAPP", "WAPP", "INCR", "GOLA", "DONA")

### cURL Command
```bash
curl -X GET "http://localhost:3000/api/receipt-items/by-ref-doc?refDocNumber=22274&refDocName=NAPP" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json"
```

### Example Response
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

## Complete Testing Workflow

### Step 1: Get Authentication Token
```bash
# Login to get token
TOKEN=$(curl -X POST "http://localhost:3000/api/login" \
  -H "Content-Type: application/json" \
  -d '{"username": "your_username", "password": "your_password"}' \
  | jq -r '.token')

echo "Token: $TOKEN"
```

### Step 2: Get Invoice with All Items
```bash
# Replace 00001 with actual invoice code or use application code like 22274
curl -X GET "http://localhost:3000/api/invoices/00001" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  | jq '.'
```

**Expected Response Structure:**
```json
{
  "success": true,
  "data": {
    "invoiceId": 123,
    "code": "00001",
    "transactionDate": "2025-01-15T10:30:00.000Z",
    "customerName": "John Doe",
    "totalAmount": 1500.00,
    "details": [
      {
        "invoiceDetailId": 1001,
        "itemId": 10,
        "itemName": "Niche Application",
        "itemCode": "NICH",
        "quantity": 1,
        "unitAmount": 1000.00,
        "totalPayingAmount": 1000.00,
        "refDocNumber": "22274",
        "refDocName": "NAPP"
      }
    ]
  }
}
```

### Step 3: Get Receipt with All Items
```bash
# Replace 000001 with actual receipt code
curl -X GET "http://localhost:3000/api/receipts/000001" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  | jq '.'
```

**Expected Response Structure:**
```json
{
  "success": true,
  "data": {
    "receiptId": 567,
    "code": "000001",
    "totalAmount": 1500.00,
    "details": [
      {
        "ReceiptDetailId": 2001,
        "ItemId": 10,
        "Quantity": 1,
        "UnitAmount": 1000.00,
        "TotalPayingAmount": 1000.00
      }
    ]
  }
}
```

### Step 4: Get All Receipt Items (Detailed)
```bash
# Replace 567 with actual receiptId
curl -X GET "http://localhost:3000/api/receipts/567/items?includeItemInfo=true" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  | jq '.'
```

**Expected Response Structure:**
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
      "totalPayingAmount": 1000.00,
      "refDocNumber": "22274",
      "refDocName": "NAPP"
    }
  ]
}
```

### Step 5: Get Receipt Items by Reference Document
```bash
# Replace 22274 with actual application code
curl -X GET "http://localhost:3000/api/receipt-items/by-ref-doc?refDocNumber=22274&refDocName=NAPP" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  | jq '.'
```

---

## Response Field Descriptions

### Invoice Detail Fields
| Field | Type | Description |
|-------|------|-------------|
| `invoiceDetailId` | number | Primary key |
| `invoiceId` | number | Foreign key to Invoice |
| `itemId` | number | Foreign key to Item |
| `itemName` | string | Item name (from Item table) |
| `itemCode` | string | Item code (from Item table) |
| `quantity` | number | Quantity of items |
| `unitAmount` | number | Price per unit |
| `payingAmount` | number | Amount being paid |
| `totalPayingAmount` | number | Total: quantity × unitAmount |
| `refDocNumber` | string | Reference document code |
| `refDocName` | string | Reference document type |
| `lineTotalAmount` | number | Line total amount |
| `lineTaxPercent` | number | Tax percentage |
| `lineTaxAmount` | number | Tax amount |

### Receipt Detail Fields
| Field | Type | Description |
|-------|------|-------------|
| `receiptDetailId` | number | Primary key |
| `receiptId` | number | Foreign key to Receipt |
| `itemId` | number | Foreign key to Item |
| `itemName` | string | Item name (when includeItemInfo=true) |
| `itemCode` | string | Item code (when includeItemInfo=true) |
| `quantity` | number | Quantity of items |
| `unitAmount` | number | Price per unit |
| `payingAmount` | number | Amount being paid |
| `totalPayingAmount` | number | Total: quantity × unitAmount |
| `refDocNumber` | string | Reference document code |
| `refDocName` | string | Reference document type |
| `invoiceId` | number | Foreign key to Invoice (if linked) |

---

## Quick Test Script

Save this as `test_items.sh`:

```bash
#!/bin/bash

# Set your token here
TOKEN="YOUR_TOKEN_HERE"

# Test 1: Get Invoice with Items
echo "=== Test 1: Get Invoice with All Items ==="
curl -X GET "http://localhost:3000/api/invoices/00001" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  | jq '.'

echo -e "\n"

# Test 2: Get Receipt Items
echo "=== Test 2: Get Receipt Items ==="
curl -X GET "http://localhost:3000/api/receipts/567/items?includeItemInfo=true" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  | jq '.'

echo -e "\n"

# Test 3: Get Receipt Items by Reference Document
echo "=== Test 3: Get Receipt Items by Ref Doc ==="
curl -X GET "http://localhost:3000/api/receipt-items/by-ref-doc?refDocNumber=22274&refDocName=NAPP" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  | jq '.'
```

---

## PowerShell Test Script

Save this as `test_items.ps1`:

```powershell
# Set your token here
$token = "YOUR_TOKEN_HERE"
$baseUrl = "http://localhost:3000/api"

# Test 1: Get Invoice with Items
Write-Host "=== Test 1: Get Invoice with All Items ===" -ForegroundColor Green
$invoiceResponse = Invoke-RestMethod -Uri "$baseUrl/invoices/00001" `
  -Method Get `
  -Headers @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
  }
$invoiceResponse | ConvertTo-Json -Depth 10

Write-Host "`n"

# Test 2: Get Receipt Items
Write-Host "=== Test 2: Get Receipt Items ===" -ForegroundColor Green
$receiptItemsResponse = Invoke-RestMethod -Uri "$baseUrl/receipts/567/items?includeItemInfo=true" `
  -Method Get `
  -Headers @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
  }
$receiptItemsResponse | ConvertTo-Json -Depth 10

Write-Host "`n"

# Test 3: Get Receipt Items by Reference Document
Write-Host "=== Test 3: Get Receipt Items by Ref Doc ===" -ForegroundColor Green
$refDocResponse = Invoke-RestMethod -Uri "$baseUrl/receipt-items/by-ref-doc?refDocNumber=22274&refDocName=NAPP" `
  -Method Get `
  -Headers @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
  }
$refDocResponse | ConvertTo-Json -Depth 10
```

---

## Summary

### To Get All Invoice Items:
```bash
GET /api/invoices/:code
```
- Returns invoice header + all details with item names and codes
- `code` can be invoice code or application code

### To Get All Receipt Items:
```bash
GET /api/receipts/:receiptId/items?includeItemInfo=true
```
- Returns all receipt items with item names and codes
- Use `includeItemInfo=true` to get item information

### To Get Items by Reference Document:
```bash
GET /api/receipt-items/by-ref-doc?refDocNumber=22274&refDocName=NAPP
```
- Returns all receipt items for a specific reference document

---

**Last Updated**: 2025-01-18  
**API Version**: 1.0

