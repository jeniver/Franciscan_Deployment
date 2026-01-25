# Receipt Items API Documentation

Complete API documentation for Receipt Items endpoints with cURL examples.

## Base URL
```
http://localhost:3000/api
```

## Authentication
All endpoints require authentication. Include the JWT token in the Authorization header:
```
Authorization: Bearer <your-token>
```

---

## Endpoints

### 1. Get All Receipt Items

Get all receipt items for a specific receipt.

**Endpoint**: `GET /api/receipts/:receiptId/items`

**Path Parameters**:
- `receiptId` (number, required): Receipt ID

**Query Parameters**:
- `includeItemInfo` (boolean, optional): Include item name and code (default: false)
- `includeRefDoc` (boolean, optional): Include reference document info (default: false)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "receiptDetailId": 1234,
      "receiptId": 567,
      "itemId": 10,
      "quantity": 1,
      "unitAmount": 1000.00,
      "payingAmount": 1000.00,
      "totalPayingAmount": 1000.00,
      "refDocNumber": "22274",
      "refDocName": "NAPP",
      "refType": "NAPP",
      "invoiceId": 890
    }
  ],
  "message": "Receipt items retrieved successfully"
}
```

**cURL Command**:
```bash
curl -X GET "http://localhost:3000/api/receipts/567/items?includeItemInfo=true" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json"
```

**cURL Command (with item info)**:
```bash
curl -X GET "http://localhost:3000/api/receipts/567/items?includeItemInfo=true&includeRefDoc=true" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json"
```

---

### 2. Get Single Receipt Item

Get a specific receipt item by ID.

**Endpoint**: `GET /api/receipts/:receiptId/items/:itemId`

**Path Parameters**:
- `receiptId` (number, required): Receipt ID
- `itemId` (number, required): Receipt detail ID

**Response**:
```json
{
  "success": true,
  "data": {
    "receiptDetailId": 1234,
    "receiptId": 567,
    "itemId": 10,
    "quantity": 1,
    "unitAmount": 1000.00,
    "payingAmount": 1000.00,
    "totalPayingAmount": 1000.00,
    "refDocNumber": "22274",
    "refDocName": "NAPP",
    "refType": "NAPP",
    "invoiceId": 890
  },
  "message": "Receipt item retrieved successfully"
}
```

**cURL Command**:
```bash
curl -X GET "http://localhost:3000/api/receipts/567/items/1234" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json"
```

---

### 3. Create Receipt Item

Create a new receipt item for a receipt.

**Endpoint**: `POST /api/receipts/:receiptId/items`

**Path Parameters**:
- `receiptId` (number, required): Receipt ID

**Request Body**:
```json
{
  "itemId": 10,
  "quantity": 1,
  "unitAmount": 1000.00,
  "payingAmount": 1000.00,
  "refDocNumber": "22274",
  "refDocName": "NAPP",
  "refType": "NAPP",
  "invoiceId": 890
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "receiptDetailId": 1234,
    "receiptId": 567,
    "itemId": 10,
    "quantity": 1,
    "unitAmount": 1000.00,
    "payingAmount": 1000.00,
    "totalPayingAmount": 1000.00,
    "refDocNumber": "22274",
    "refDocName": "NAPP",
    "refType": "NAPP",
    "invoiceId": 890
  },
  "message": "Receipt item created successfully"
}
```

**cURL Command**:
```bash
curl -X POST "http://localhost:3000/api/receipts/567/items" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "itemId": 10,
    "quantity": 1,
    "unitAmount": 1000.00,
    "payingAmount": 1000.00,
    "refDocNumber": "22274",
    "refDocName": "NAPP",
    "refType": "NAPP",
    "invoiceId": 890
  }'
```

**cURL Command (minimal)**:
```bash
curl -X POST "http://localhost:3000/api/receipts/567/items" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "itemId": 10,
    "quantity": 1,
    "unitAmount": 1000.00
  }'
```

---

### 4. Update Receipt Item

Update an existing receipt item.

**Endpoint**: `PUT /api/receipts/:receiptId/items/:itemId`

**Path Parameters**:
- `receiptId` (number, required): Receipt ID
- `itemId` (number, required): Receipt detail ID

**Request Body** (all fields optional):
```json
{
  "quantity": 2,
  "unitAmount": 1200.00,
  "payingAmount": 2400.00,
  "refDocNumber": "22275",
  "refDocName": "NAPP"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "receiptDetailId": 1234,
    "receiptId": 567,
    "itemId": 10,
    "quantity": 2,
    "unitAmount": 1200.00,
    "payingAmount": 2400.00,
    "totalPayingAmount": 2400.00,
    "refDocNumber": "22275",
    "refDocName": "NAPP",
    "refType": "NAPP",
    "invoiceId": 890
  },
  "message": "Receipt item updated successfully"
}
```

**cURL Command**:
```bash
curl -X PUT "http://localhost:3000/api/receipts/567/items/1234" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "quantity": 2,
    "unitAmount": 1200.00,
    "payingAmount": 2400.00
  }'
```

---

### 5. Delete Receipt Item

Delete a receipt item.

**Endpoint**: `DELETE /api/receipts/:receiptId/items/:itemId`

**Path Parameters**:
- `receiptId` (number, required): Receipt ID
- `itemId` (number, required): Receipt detail ID

**Response**:
```json
{
  "success": true,
  "data": {
    "receiptDetailId": 1234
  },
  "message": "Receipt item deleted successfully"
}
```

**cURL Command**:
```bash
curl -X DELETE "http://localhost:3000/api/receipts/567/items/1234" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json"
```

---

### 6. Batch Create/Update Receipt Items

Create or update multiple receipt items in a single request.

**Endpoint**: `POST /api/receipts/:receiptId/items/batch`

**Path Parameters**:
- `receiptId` (number, required): Receipt ID

**Request Body**:
```json
{
  "operation": "create",
  "items": [
    {
      "itemId": 10,
      "quantity": 1,
      "unitAmount": 1000.00,
      "payingAmount": 1000.00,
      "refDocNumber": "22274",
      "refDocName": "NAPP"
    },
    {
      "itemId": 11,
      "quantity": 1,
      "unitAmount": 500.00,
      "payingAmount": 500.00,
      "refDocNumber": "22274",
      "refDocName": "NAPP"
    }
  ]
}
```

**Response (create)**:
```json
{
  "success": true,
  "data": {
    "created": 2,
    "items": [
      {
        "receiptDetailId": 1234,
        "receiptId": 567,
        "itemId": 10,
        "quantity": 1,
        "unitAmount": 1000.00,
        "totalPayingAmount": 1000.00
      },
      {
        "receiptDetailId": 1235,
        "receiptId": 567,
        "itemId": 11,
        "quantity": 1,
        "unitAmount": 500.00,
        "totalPayingAmount": 500.00
      }
    ]
  },
  "message": "Receipt items created successfully"
}
```

**Response (update)**:
```json
{
  "success": true,
  "data": {
    "updated": 2,
    "items": [
      {
        "receiptDetailId": 1234,
        "receiptId": 567,
        "itemId": 10,
        "quantity": 2,
        "unitAmount": 1200.00,
        "totalPayingAmount": 2400.00
      }
    ]
  },
  "message": "Receipt items updated successfully"
}
```

**cURL Command (create)**:
```bash
curl -X POST "http://localhost:3000/api/receipts/567/items/batch" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "create",
    "items": [
      {
        "itemId": 10,
        "quantity": 1,
        "unitAmount": 1000.00,
        "payingAmount": 1000.00,
        "refDocNumber": "22274",
        "refDocName": "NAPP"
      },
      {
        "itemId": 11,
        "quantity": 1,
        "unitAmount": 500.00,
        "payingAmount": 500.00,
        "refDocNumber": "22274",
        "refDocName": "NAPP"
      }
    ]
  }'
```

**cURL Command (update)**:
```bash
curl -X POST "http://localhost:3000/api/receipts/567/items/batch" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "update",
    "items": [
      {
        "receiptDetailId": 1234,
        "quantity": 2,
        "unitAmount": 1200.00,
        "payingAmount": 2400.00
      },
      {
        "receiptDetailId": 1235,
        "quantity": 1,
        "unitAmount": 600.00,
        "payingAmount": 600.00
      }
    ]
  }'
```

---

### 7. Get Receipt Items by Reference Document

Query receipt items by reference document number and type.

**Endpoint**: `GET /api/receipt-items/by-ref-doc`

**Query Parameters**:
- `refDocNumber` (string, required): Reference document number (e.g., "22274")
- `refDocName` (string, optional): Reference document type (e.g., "NAPP", "WAPP", "INCR", "GOLA", "DONA")
- `churchId` (number, optional): Church ID filter (automatically applied from auth token)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "receiptDetailId": 1234,
      "receiptId": 567,
      "receiptCode": "000001",
      "receiptDate": "2025-01-15T00:00:00.000Z",
      "itemId": 10,
      "itemName": "Niche Application",
      "itemCode": "NICH",
      "quantity": 1,
      "unitAmount": 1000.00,
      "totalPayingAmount": 1000.00,
      "refDocNumber": "22274",
      "refDocName": "NAPP"
    }
  ],
  "message": "Receipt items retrieved successfully"
}
```

**cURL Command**:
```bash
curl -X GET "http://localhost:3000/api/receipt-items/by-ref-doc?refDocNumber=22274&refDocName=NAPP" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json"
```

**cURL Command (without refDocName)**:
```bash
curl -X GET "http://localhost:3000/api/receipt-items/by-ref-doc?refDocNumber=22274" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json"
```

---

## Error Responses

### Validation Error (400)
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      "Item ID is required",
      "Quantity must be greater than 0",
      "Unit amount must be non-negative"
    ]
  }
}
```

**cURL Example (validation error)**:
```bash
curl -X POST "http://localhost:3000/api/receipts/567/items" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "itemId": null,
    "quantity": -1
  }'
```

### Not Found Error (404)
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Receipt item not found"
  }
}
```

**cURL Example (not found)**:
```bash
curl -X GET "http://localhost:3000/api/receipts/567/items/99999" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json"
```

### Invalid Reference Document Error (400)
```json
{
  "success": false,
  "error": {
    "code": "INVALID_REF_DOCUMENT",
    "message": "Reference document not found",
    "details": {
      "refDocNumber": "22274",
      "refDocName": "NAPP"
    }
  }
}
```

**cURL Example (invalid reference document)**:
```bash
curl -X POST "http://localhost:3000/api/receipts/567/items" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "itemId": 10,
    "quantity": 1,
    "unitAmount": 1000.00,
    "refDocNumber": "INVALID_CODE",
    "refDocName": "NAPP"
  }'
```

### Unauthorized Error (401)
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

**cURL Example (unauthorized)**:
```bash
curl -X GET "http://localhost:3000/api/receipts/567/items" \
  -H "Content-Type: application/json"
```

---

## Complete Testing Workflow

### Step 1: Get Authentication Token
```bash
# Login to get token (adjust endpoint as needed)
TOKEN=$(curl -X POST "http://localhost:3000/api/login" \
  -H "Content-Type: application/json" \
  -d '{"username": "your_username", "password": "your_password"}' \
  | jq -r '.token')

echo "Token: $TOKEN"
```

### Step 2: Create Receipt Item
```bash
curl -X POST "http://localhost:3000/api/receipts/567/items" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "itemId": 10,
    "quantity": 1,
    "unitAmount": 1000.00,
    "payingAmount": 1000.00,
    "refDocNumber": "22274",
    "refDocName": "NAPP",
    "refType": "NAPP"
  }'
```

### Step 3: Get All Receipt Items
```bash
curl -X GET "http://localhost:3000/api/receipts/567/items?includeItemInfo=true" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```

### Step 4: Get Single Receipt Item
```bash
# Use receiptDetailId from step 2 response
curl -X GET "http://localhost:3000/api/receipts/567/items/1234" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```

### Step 5: Update Receipt Item
```bash
curl -X PUT "http://localhost:3000/api/receipts/567/items/1234" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "quantity": 2,
    "unitAmount": 1200.00,
    "payingAmount": 2400.00
  }'
```

### Step 6: Query by Reference Document
```bash
curl -X GET "http://localhost:3000/api/receipt-items/by-ref-doc?refDocNumber=22274&refDocName=NAPP" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```

### Step 7: Batch Create Items
```bash
curl -X POST "http://localhost:3000/api/receipts/567/items/batch" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "create",
    "items": [
      {
        "itemId": 10,
        "quantity": 1,
        "unitAmount": 1000.00,
        "refDocNumber": "22274",
        "refDocName": "NAPP"
      },
      {
        "itemId": 11,
        "quantity": 1,
        "unitAmount": 500.00,
        "refDocNumber": "22274",
        "refDocName": "NAPP"
      }
    ]
  }'
```

### Step 8: Delete Receipt Item
```bash
curl -X DELETE "http://localhost:3000/api/receipts/567/items/1234" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```

---

## Field Descriptions

### ReceiptDetail Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `receiptDetailId` | number | No (auto) | Primary key, auto-generated |
| `receiptId` | number | Yes | Foreign key to Receipt table |
| `itemId` | number | Yes | Foreign key to Item table |
| `quantity` | number | Yes | Quantity of items (must be > 0) |
| `unitAmount` | number | Yes | Price per unit (must be >= 0) |
| `payingAmount` | number | No | Amount being paid for this line |
| `totalPayingAmount` | number | No | Calculated: quantity × unitAmount |
| `refDocNumber` | string | No | Reference document code (e.g., "22274") |
| `refDocName` | string | No | Reference document type (NAPP, WAPP, INCR, GOLA, DONA) |
| `refType` | string | No | Reference type (legacy field) |
| `invoiceId` | number | No | Foreign key to Invoice (if receipt is from invoice) |

### Reference Document Types

- **NAPP**: Niche Application
- **WAPP**: Wake Room Application/Booking
- **INCR**: Niche Inscription Request
- **GOLA**: Gate of Life Application (Engrave Wall)
- **DONA**: Donation
- **OTHERS**: Other (no validation required)

---

## Notes

1. **Authentication**: All endpoints require a valid JWT token in the Authorization header
2. **Church ID**: Automatically extracted from the authenticated user's token
3. **Calculations**: `totalPayingAmount` is automatically calculated as `quantity × unitAmount` if not provided
4. **Validation**: Reference documents are validated if `refDocName` is not "OTHERS"
5. **Transactions**: Batch operations use database transactions for atomicity
6. **Item Info**: Use `includeItemInfo=true` to get item name and code in responses

---

**Last Updated**: 2025-01-18  
**API Version**: 1.0

