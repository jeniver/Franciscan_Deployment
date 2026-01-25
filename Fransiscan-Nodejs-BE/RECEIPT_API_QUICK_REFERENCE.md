# Receipt API Quick Reference

## Quick cURL Commands

Replace `YOUR_JWT_TOKEN` with your actual JWT token.

### 1. Get Receipt by Code
```bash
curl -X GET "http://localhost:3000/api/receipts/000123" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 2. Create Receipt
```bash
curl -X POST "http://localhost:3000/api/receipts" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "invoiceId": 5,
    "customerName": "John Doe",
    "totalAmount": 5000.00,
    "payingAmount": 5000.00,
    "paymentMode": "Cash"
  }'
```

### 3. Create Receipt from Invoice
```bash
curl -X POST "http://localhost:3000/api/receipts/from-invoice" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "invoice": {
      "invoiceId": 5,
      "customerName": "John Doe",
      "totalAmount": 5000.00,
      "payingAmount": 5000.00,
      "paymentMode": "Cash"
    },
    "invoiceDetails": []
  }'
```

### 4. Get Last Receipt Number
```bash
curl -X GET "http://localhost:3000/api/receipts/last-number" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 5. Get Last Misc Receipt Number
```bash
curl -X GET "http://localhost:3000/api/receipts/last-misc-number" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 6. Get Receipt Report (paginated + searchable)
**Flat format (recommended):**
```bash
curl -X GET "http://localhost:3000/api/receipts/report?fromDate=2019-01-03&toDate=2025-11-29&page=1&limit=50&sortBy=TransactionDate&sortOrder=desc&search=" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**With search term:**
```bash
curl -X GET "http://localhost:3000/api/receipts/report?fromDate=2019-01-03&toDate=2025-11-29&page=1&limit=50&sortBy=TransactionDate&sortOrder=desc&search=john" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Note:** The API now supports both flat format (above) and nested format (fromDate[fromDate]=...). The controller automatically detects and handles both formats.

### 7. Get GOA Monthly List
```bash
curl -X GET "http://localhost:3000/api/receipts/goa-monthly?fromDate=2025-01-01&toDate=2025-01-31" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 8. Get Inscription Monthly List
```bash
curl -X GET "http://localhost:3000/api/receipts/inscription-monthly?fromDate=2025-01-01&toDate=2025-01-31" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 9. Get Wake Room Monthly List
```bash
curl -X GET "http://localhost:3000/api/receipts/wake-room-monthly?fromDate=2025-01-01&toDate=2025-01-31" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 10. Get Receipts by Date Range
```bash
curl -X GET "http://localhost:3000/api/receipts?fromDate=2025-01-01&toDate=2025-01-31&page=1&limit=50" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 11. Get Invoice by Code
```bash
curl -X GET "http://localhost:3000/api/receipts/invoice/INV-001" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 12. Get Receipt PDF link
```bash
curl -X GET "http://localhost:3000/api/receipts/000123/pdf" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Stream receipt PDF directly (download/open in browser)
```bash
curl -L -X GET "http://localhost:3000/api/receipts/000123/pdf?download=true" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  --output receipt-000123.pdf
```

### 13. Get Invoice PDF link
```bash
curl -X GET "http://localhost:3000/api/receipts/invoice/INV-001/pdf" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Stream invoice PDF directly
```bash
curl -L -X GET "http://localhost:3000/api/receipts/invoice/INV-001/pdf?download=true" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  --output invoice-INV-001.pdf
```

## Test Script (Bash)

Save as `test-receipt-api.sh`:

```bash
#!/bin/bash

# Configuration
BASE_URL="http://localhost:3000/api/receipts"
TOKEN="YOUR_JWT_TOKEN"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "Testing Receipt API..."

# Test 1: Get Last Receipt Number
echo -e "\n${GREEN}Test 1: Get Last Receipt Number${NC}"
curl -s -X GET "${BASE_URL}/last-number" \
  -H "Authorization: Bearer ${TOKEN}" | jq '.'

# Test 2: Get Invoice by Code
echo -e "\n${GREEN}Test 2: Get Invoice by Code${NC}"
curl -s -X GET "${BASE_URL}/invoice/INV-001" \
  -H "Authorization: Bearer ${TOKEN}" | jq '.'

# Test 3: Get Receipt Report
echo -e "\n${GREEN}Test 3: Get Receipt Report${NC}"
curl -s -X GET "${BASE_URL}/report?fromDate=2025-01-01&toDate=2025-01-31" \
  -H "Authorization: Bearer ${TOKEN}" | jq '.'

echo -e "\n${GREEN}Tests completed!${NC}"
```

Make executable: `chmod +x test-receipt-api.sh`

