# Invoice and Receipt API - cURL Examples

## Base Configuration
- **Base URL**: `http://localhost:3001`
- **Authentication**: Bearer Token (JWT) required for all endpoints
- **Content-Type**: `application/json`

## Authentication
All endpoints require a Bearer token in the Authorization header:
```bash
Authorization: Bearer YOUR_JWT_TOKEN
```

---

## INVOICE APIs

### 1. Get All Invoices
```bash
curl -X GET "http://localhost:3001/api/invoices?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### 2. Get Invoice by Code (Invoice Code or Application Code)
```bash
# Get by Invoice Code
curl -X GET "http://localhost:3001/api/invoices/INV-123456" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"

# Get by Application Code (NAPP)
curl -X GET "http://localhost:3001/api/invoices/NAPP-52?applicationCode=NAPP" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"

# Get by Application Code (numeric format)
curl -X GET "http://localhost:3001/api/invoices/4652-0?applicationCode=NAPP" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### 3. Get Invoice by ID
```bash
curl -X GET "http://localhost:3001/api/invoices/id/123" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### 4. Create Invoice (Full Invoice Creation)
```bash
curl -X POST "http://localhost:3001/api/invoices" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "invoice": {
      "transactionDate": "2024-01-15T00:00:00.000Z",
      "refDocNumber": "NAPP-52",
      "refDocName": "NAPP",
      "customerName": "John Doe",
      "totalAmount": 1000.00,
      "payingAmount": 1000.00,
      "paymentMode": "CASH",
      "paymentModeDocNo": null,
      "taxCode": "GST",
      "taxPercentage": 9,
      "taxAmount": 90.00
    },
    "invoiceDetails": [
      {
        "itemId": 1,
        "quantity": 1,
        "unitAmount": 1000.00,
        "payingAmount": 1000.00,
        "totalPayingAmount": 1090.00,
        "refDocNumber": "NAPP-52",
        "refDocName": "NAPP",
        "refType": "NAPP",
        "outstandingAmount": 0,
        "lineTotalAmount": 1000.00,
        "lineTaxPercent": 9,
        "lineTaxAmount": 90.00
      }
    ],
    "createReceipt": false
  }'
```

### 5. Create Invoice by Application Code (Auto-generate from Application)
```bash
# Create invoice for Niche Application (NAPP)
curl -X POST "http://localhost:3001/api/invoices/NAPP-52" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"

# Create invoice with custom details
curl -X POST "http://localhost:3001/api/invoices/4652-0" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "transactionDate": "2024-01-15T00:00:00.000Z",
    "customerName": "John Doe",
    "payingAmount": 1000.00,
    "paymentMode": "CASH",
    "details": [
      {
        "itemId": 1,
        "quantity": 1,
        "unitAmount": 1000.00,
        "lineTotalAmount": 1000.00,
        "lineTaxPercent": 9,
        "lineTaxAmount": 90.00,
        "totalPayingAmount": 1090.00
      }
    ]
  }'
```

### 6. Update Invoice
```bash
curl -X PUT "http://localhost:3001/api/invoices/123" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "customerName": "Jane Doe Updated",
    "totalAmount": 1200.00,
    "payingAmount": 1200.00
  }'
```

### 7. Cancel Invoice (Soft Delete - Status = 0)
```bash
# Cancel by Invoice Code
curl -X POST "http://localhost:3001/api/invoices/INV-123456/cancel" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"

# Cancel by Application Code
curl -X POST "http://localhost:3001/api/invoices/NAPP-52/cancel" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### 8. Record Payment for Invoice
```bash
curl -X POST "http://localhost:3001/api/invoices/INV-123456/payments" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "paymentAmount": 500.00,
    "paymentMode": "CASH",
    "paymentModeDocNo": "CHQ-12345",
    "paymentDate": "2024-01-15T00:00:00.000Z"
  }'
```

### 9. Mark Invoice as Paid
```bash
curl -X PATCH "http://localhost:3001/api/invoices/123/paid" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### 10. Delete Invoice (Hard Delete - Admin Only)
```bash
curl -X DELETE "http://localhost:3001/api/invoices/123" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### 11. Search Invoices
```bash
# Search with multiple filters
curl -X GET "http://localhost:3001/api/invoices/search?searchTerm=John&fromDate=2024-01-01&toDate=2024-12-31&page=1&limit=10&sortBy=TransactionDate&sortOrder=desc" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"

# Search by customer name
curl -X GET "http://localhost:3001/api/invoices/search?customerName=John%20Doe&page=1&limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"

# Search by invoice code
curl -X GET "http://localhost:3001/api/invoices/search?invoiceCode=INV-123&page=1&limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"

# Search by reference document
curl -X GET "http://localhost:3001/api/invoices/search?refDocNumber=NAPP-52&refDocName=NAPP&page=1&limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"

# Search by payment mode
curl -X GET "http://localhost:3001/api/invoices/search?paymentMode=CASH&page=1&limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### 12. Get Invoices by Person
```bash
curl -X GET "http://localhost:3001/api/invoices/person/456?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### 13. Get Invoices by Church
```bash
curl -X GET "http://localhost:3001/api/invoices/church/1?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### 14. Get Overdue Invoices
```bash
curl -X GET "http://localhost:3001/api/invoices/overdue?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

---

## RECEIPT APIs

### 1. Get Receipt by Code
```bash
# Get receipt by code
curl -X GET "http://localhost:3001/api/receipts/RCP-123456" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"

# Get receipt with application code filter
curl -X GET "http://localhost:3001/api/receipts/RCP-123456?applicationCode=NAPP" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### 2. Create Receipt
```bash
curl -X POST "http://localhost:3001/api/receipts" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "receiptCode": "RCP-123456",
    "invoiceCode": "INV-123456",
    "customerName": "John Doe",
    "receiptDate": "2024-01-15T00:00:00.000Z",
    "totalAmount": 1090.00,
    "paymentMode": "CASH",
    "paymentModeDocNo": null,
    "remarks": "Payment received in full"
  }'
```

### 3. Create Receipt from Invoice
```bash
curl -X POST "http://localhost:3001/api/receipts/from-invoice" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "invoice": {
      "code": "INV-123456",
      "invoiceId": 123,
      "customerName": "John Doe",
      "totalAmount": 1090.00,
      "payingAmount": 1090.00,
      "paymentMode": "CASH",
      "transactionDate": "2024-01-15T00:00:00.000Z"
    },
    "invoiceDetails": [
      {
        "itemId": 1,
        "quantity": 1,
        "unitAmount": 1000.00,
        "totalPayingAmount": 1090.00
      }
    ]
  }'
```

### 4. Get Last Receipt Number
```bash
curl -X GET "http://localhost:3001/api/receipts/last-number" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### 5. Get Last Miscellaneous Receipt Number
```bash
curl -X GET "http://localhost:3001/api/receipts/last-misc-number" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### 6. Get Receipt Report
```bash
# Basic receipt report
curl -X GET "http://localhost:3001/api/receipts/report?fromDate=2024-01-01&toDate=2024-12-31&page=1&limit=50" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"

# Receipt report with search and sorting
curl -X GET "http://localhost:3001/api/receipts/report?fromDate=2024-01-01&toDate=2024-12-31&page=1&limit=50&sortBy=ReceiptDate&sortOrder=desc&searchTerm=John" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### 7. Get Receipts by Date Range
```bash
curl -X GET "http://localhost:3001/api/receipts?fromDate=2024-01-01&toDate=2024-12-31&page=1&limit=50" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### 8. Search Receipts
```bash
# Search by receipt code
curl -X GET "http://localhost:3001/api/receipts/search?receiptCode=RCP-123&page=1&limit=20" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"

# Search by customer name
curl -X GET "http://localhost:3001/api/receipts/search?customerName=John%20Doe&page=1&limit=20" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"

# Search by invoice code
curl -X GET "http://localhost:3001/api/receipts/search?invoiceCode=INV-123&page=1&limit=20" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"

# General search query
curl -X GET "http://localhost:3001/api/receipts/search?query=John&page=1&limit=20&sortBy=ReceiptDate&sortOrder=desc" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### 9. Get Invoice by Code (for Receipt Creation)
```bash
curl -X GET "http://localhost:3001/api/receipts/invoice/INV-123456" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"

# With application code filter
curl -X GET "http://localhost:3001/api/receipts/invoice/NAPP-52?applicationCode=NAPP" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### 10. Get Receipt PDF
```bash
# Get PDF as file (default behavior)
curl -X GET "http://localhost:3001/api/receipts/RCP-123456/pdf?download=true" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Accept: application/pdf" \
  --output receipt.pdf

# Get PDF URL as JSON
curl -X GET "http://localhost:3001/api/receipts/RCP-123456/pdf" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"

# Get receipt data as JSON for frontend PDF generation
curl -X GET "http://localhost:3001/api/receipts/RCP-123456/pdf?data=true" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"

# With application code filter
curl -X GET "http://localhost:3001/api/receipts/RCP-123456/pdf?applicationCode=NAPP" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### 11. Get Invoice PDF
```bash
# Get PDF as file
curl -X GET "http://localhost:3001/api/receipts/invoice/INV-123456/pdf?download=true" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Accept: application/pdf" \
  --output invoice.pdf

# Get PDF URL as JSON
curl -X GET "http://localhost:3001/api/receipts/invoice/INV-123456/pdf" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"

# Get invoice data as JSON for frontend PDF generation
curl -X GET "http://localhost:3001/api/receipts/invoice/INV-123456/pdf?data=true" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### 12. Get GOA Monthly List
```bash
curl -X GET "http://localhost:3001/api/receipts/goa-monthly?fromDate=2024-01-01&toDate=2024-12-31" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### 13. Get Inscription Monthly List
```bash
curl -X GET "http://localhost:3001/api/receipts/inscription-monthly?fromDate=2024-01-01&toDate=2024-12-31" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### 14. Get Wake Room Monthly List
```bash
curl -X GET "http://localhost:3001/api/receipts/wake-room-monthly?fromDate=2024-01-01&toDate=2024-12-31" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

---

## Reference Document Types (RefDocName)

The system supports the following reference document types:

- **NAPP**: Niche Application
- **WAPP**: Wake Room Booking
- **INCR**: Niche Inscription Request
- **GOLA**: Gate of Life Application (EngraveWallApplication)
- **DONA**: Niche Application (Donation)

---

## Common Response Formats

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully"
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Error description"
  }
}
```

### Paginated Response
```json
{
  "success": true,
  "data": {
    "invoices": [ ... ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 100,
      "totalPages": 10
    }
  },
  "message": "Invoices retrieved successfully"
}
```

---

## Notes

1. **Authentication**: All endpoints require a valid JWT token in the `Authorization` header as `Bearer TOKEN`
2. **Church ID**: The user's `churchId` is automatically extracted from the JWT token and used for data filtering
3. **Date Format**: Use ISO 8601 format for dates (e.g., `2024-01-15T00:00:00.000Z`)
4. **Pagination**: Default page size is usually 10-50 items, configurable via `limit` parameter
5. **Soft Delete**: Canceling an invoice sets `Status = 0` (soft delete), not a hard delete
6. **Duplicate Check**: Creating an invoice checks for duplicates based on:
   - Applicant Name
   - Item ID
   - Reference Document Number
   - Transaction Date
7. **PDF Generation**: PDF endpoints can return either:
   - Direct PDF file (when `Accept: application/pdf` or `?download=true`)
   - JSON with PDF URL (default)
   - JSON data for frontend generation (when `?data=true`)

---

## Testing Tips

1. **Get a Token First**: Use the login endpoint to get a JWT token before testing other endpoints
2. **Use Application Codes**: For niche-related invoices, use application codes like `NAPP-52` or `4652-0`
3. **Check Status Codes**: 
   - `200`: Success
   - `201`: Created
   - `400`: Bad Request / Validation Error
   - `401`: Unauthorized
   - `403`: Forbidden
   - `404`: Not Found
   - `409`: Conflict (Duplicate)
   - `500`: Internal Server Error
4. **Diagnostic Information**: When an invoice/receipt is not found, the API may return diagnostic information to help troubleshoot

