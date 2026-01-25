# Receipt API Documentation

Complete API documentation for Receipt endpoints with cURL examples, responses, and frontend promise examples.

## Base URL
```
http://localhost:3000/api/receipts
```

## Authentication
All endpoints require JWT authentication. Include the token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

---

## 1. Get Receipt by Code

### Endpoint
```
GET /api/receipts/:code
```

### cURL Example
```bash
curl -X GET "http://localhost:3000/api/receipts/000123" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### Response (Success - 200)
```json
{
  "success": true,
  "data": {
    "receiptId": 1,
    "invoiceId": 5,
    "transactionDate": "2025-01-15T10:30:00.000Z",
    "customerName": "John Doe",
    "code": "000123",
    "totalAmount": 5000.00,
    "payingAmount": 5000.00,
    "paymentMode": 1,
    "userId": 10,
    "churchId": 1,
    "status": 2,
    "paymentModeDocNo": null,
    "payeeName": "John Doe",
    "addressNo": "123",
    "address": "Main Street",
    "address2": "Apt 4B",
    "addressCity": "Colombo",
    "districtCode": "001",
    "country": "Sri Lanka",
    "outstandingAmount": 0.00,
    "details": [
      {
        "receiptDetailId": 1,
        "itemId": 10,
        "quantity": 1,
        "unitAmount": 5000.00,
        "payingAmount": 5000.00,
        "totalPayingAmount": 5000.00,
        "invoiceId": 5,
        "refDocName": "NAPP",
        "refDocNumber": "NAPP-001",
        "refType": null
      }
    ]
  }
}
```

### Response (Not Found - 404)
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Receipt not found"
  }
}
```

### Frontend Promise Example
```javascript
// Using fetch
const getReceipt = async (receiptCode) => {
  try {
    const response = await fetch(`http://localhost:3000/api/receipts/${receiptCode}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    if (data.success) {
      return data.data;
    } else {
      throw new Error(data.error.message);
    }
  } catch (error) {
    console.error('Error fetching receipt:', error);
    throw error;
  }
};

// Usage
getReceipt('000123')
  .then(receipt => {
    console.log('Receipt:', receipt);
  })
  .catch(error => {
    console.error('Failed:', error);
  });
```

---

## 2. Create Receipt

### Endpoint
```
POST /api/receipts
```

### cURL Example
```bash
curl -X POST "http://localhost:3000/api/receipts" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "invoiceId": 5,
    "customerName": "John Doe",
    "totalAmount": 5000.00,
    "payingAmount": 5000.00,
    "paymentMode": "Cash",
    "paymentModeDocNo": null,
    "payeeName": "John Doe",
    "addressNo": "123",
    "address": "Main Street",
    "address2": "Apt 4B",
    "addressCity": "Colombo",
    "districtCode": "001",
    "country": "Sri Lanka",
    "outstandingAmount": 0.00
  }'
```

### Response (Success - 201)
```json
{
  "success": true,
  "code": "000124",
  "message": "Receipt created successfully"
}
```

### Response (Validation Error - 400)
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      "Invoice ID is required",
      "Customer name is required"
    ]
  }
}
```

### Frontend Promise Example
```javascript
const createReceipt = async (receiptData) => {
  try {
    const response = await fetch('http://localhost:3000/api/receipts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(receiptData)
    });
    
    const data = await response.json();
    
    if (data.success) {
      return {
        receiptCode: data.code,
        message: data.message
      };
    } else {
      throw new Error(data.error.message);
    }
  } catch (error) {
    console.error('Error creating receipt:', error);
    throw error;
  }
};

// Usage
const receiptData = {
  invoiceId: 5,
  customerName: "John Doe",
  totalAmount: 5000.00,
  payingAmount: 5000.00,
  paymentMode: "Cash",
  payeeName: "John Doe",
  address: "Main Street",
  addressCity: "Colombo"
};

createReceipt(receiptData)
  .then(result => {
    console.log('Receipt created:', result.receiptCode);
    alert(`Receipt ${result.receiptCode} created successfully!`);
  })
  .catch(error => {
    console.error('Failed:', error);
    alert('Failed to create receipt: ' + error.message);
  });
```

---

## 3. Create Receipt from Invoice

### Endpoint
```
POST /api/receipts/from-invoice
```

### cURL Example
```bash
curl -X POST "http://localhost:3000/api/receipts/from-invoice" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "invoice": {
      "invoiceId": 5,
      "code": "INV-001",
      "customerName": "John Doe",
      "totalAmount": 5000.00,
      "payingAmount": 5000.00,
      "paymentMode": "Cash",
      "paymentModeDocNo": null,
      "payeeName": "John Doe",
      "address": "Main Street",
      "addressCity": "Colombo"
    },
    "invoiceDetails": [
      {
        "itemId": 10,
        "quantity": 1,
        "unitAmount": 5000.00,
        "payingAmount": 5000.00,
        "totalPayingAmount": 5000.00,
        "refDocName": "NAPP",
        "refDocNumber": "NAPP-001"
      }
    ]
  }'
```

### Response (Success - 201)
```json
{
  "success": true,
  "code": "000125",
  "receiptId": 2,
  "message": "Receipt created successfully from invoice"
}
```

### Frontend Promise Example
```javascript
const createReceiptFromInvoice = async (invoiceData, invoiceDetails) => {
  try {
    const response = await fetch('http://localhost:3000/api/receipts/from-invoice', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        invoice: invoiceData,
        invoiceDetails: invoiceDetails
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      return {
        receiptCode: data.code,
        receiptId: data.receiptId,
        message: data.message
      };
    } else {
      throw new Error(data.error.message);
    }
  } catch (error) {
    console.error('Error creating receipt from invoice:', error);
    throw error;
  }
};

// Usage
const invoice = {
  invoiceId: 5,
  code: "INV-001",
  customerName: "John Doe",
  totalAmount: 5000.00,
  payingAmount: 5000.00,
  paymentMode: "Cash"
};

const details = [
  {
    itemId: 10,
    quantity: 1,
    unitAmount: 5000.00,
    payingAmount: 5000.00,
    totalPayingAmount: 5000.00,
    refDocName: "NAPP",
    refDocNumber: "NAPP-001"
  }
];

createReceiptFromInvoice(invoice, details)
  .then(result => {
    console.log('Receipt created:', result.receiptCode);
  })
  .catch(error => {
    console.error('Failed:', error);
  });
```

---

## 4. Get Last Receipt Number

### Endpoint
```
GET /api/receipts/last-number
```

### cURL Example
```bash
curl -X GET "http://localhost:3000/api/receipts/last-number" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### Response (Success - 200)
```json
{
  "success": true,
  "data": {
    "lastReceiptNumber": "000126"
  }
}
```

### Frontend Promise Example
```javascript
const getLastReceiptNumber = async () => {
  try {
    const response = await fetch('http://localhost:3000/api/receipts/last-number', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    if (data.success) {
      return data.data.lastReceiptNumber;
    } else {
      throw new Error('Failed to get last receipt number');
    }
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
};

// Usage
getLastReceiptNumber()
  .then(lastNumber => {
    console.log('Next receipt number:', lastNumber);
    document.getElementById('receiptCode').value = lastNumber;
  })
  .catch(error => {
    console.error('Failed:', error);
  });
```

---

## 5. Get Last Miscellaneous Receipt Number

### Endpoint
```
GET /api/receipts/last-misc-number
```

### cURL Example
```bash
curl -X GET "http://localhost:3000/api/receipts/last-misc-number" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### Response (Success - 200)
```json
{
  "success": true,
  "data": {
    "lastMiscReceiptNumber": "000127"
  }
}
```

### Frontend Promise Example
```javascript
const getLastMiscReceiptNumber = async () => {
  const response = await fetch('http://localhost:3000/api/receipts/last-misc-number', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
      'Content-Type': 'application/json'
    }
  });
  
  const data = await response.json();
  return data.success ? data.data.lastMiscReceiptNumber : null;
};
```

---

## 6. Get Receipt Report

### Endpoint
```
GET /api/receipts/report?fromDate=2025-01-01&toDate=2025-01-31
```

### cURL Example
```bash
curl -X GET "http://localhost:3000/api/receipts/report?fromDate=2025-01-01&toDate=2025-01-31" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### Response (Success - 200)
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "TransactionDate": "2025-01-15T10:30:00.000Z",
        "Code": "000123",
        "CustomerName": "John Doe",
        "TotalAmount": 5000.00,
        "PaymentModeDocNo": null,
        "PaymentMode": "Cash",
        "RefDocNumber": "NAPP-001",
        "RefDocName": "NAPP",
        "Item": "Level 1",
        "Total": 5000.00,
        "Status": "",
        "Tot_Niche": 5000.00,
        "Tot_Wapp": 0.00,
        "Tot_Goa": 0.00,
        "Tot_Incr": 0.00,
        "Tot_Donation": 0.00,
        "Tot_Urn": 0.00,
        "Tot_Marble": 0.00,
        "Tot_Others": 0.00,
        "Total_val": 5000.00
      }
    ],
    "totals": {
      "totNiche": 5000.00,
      "totWapp": 0.00,
      "totGoa": 0.00,
      "totIncr": 0.00,
      "totDonation": 0.00,
      "totUrn": 0.00,
      "totMarble": 0.00,
      "totOthers": 0.00,
      "totalVal": 5000.00
    }
  }
}
```

### Frontend Promise Example
```javascript
const getReceiptReport = async (fromDate, toDate) => {
  try {
    const params = new URLSearchParams({
      fromDate: fromDate,
      toDate: toDate
    });
    
    const response = await fetch(`http://localhost:3000/api/receipts/report?${params}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    if (data.success) {
      return {
        items: data.data.data,
        totals: data.data.totals
      };
    } else {
      throw new Error('Failed to get receipt report');
    }
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
};

// Usage
getReceiptReport('2025-01-01', '2025-01-31')
  .then(report => {
    console.log('Report items:', report.items);
    console.log('Totals:', report.totals);
  })
  .catch(error => {
    console.error('Failed:', error);
  });
```

---

## 7. Get GOA Monthly List

### Endpoint
```
GET /api/receipts/goa-monthly?fromDate=2025-01-01&toDate=2025-01-31
```

### cURL Example
```bash
curl -X GET "http://localhost:3000/api/receipts/goa-monthly?fromDate=2025-01-01&toDate=2025-01-31" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### Response (Success - 200)
```json
{
  "success": true,
  "data": [
    {
      "ReceptTransactionDate": "2025-01-15T00:00:00.000Z",
      "PayingAmount": 1000.00,
      "InvoiceId": 10,
      "InvoiceCode": "INV-010",
      "PaymentMode": "Cash",
      "PaymentModeDocNumber": null,
      "RefDocNumber": "GOLA-001",
      "CustomerName": "Jane Smith",
      "DonationAmount": 1000.00,
      "NameToEngrave": "In Memory of John"
    }
  ]
}
```

### Frontend Promise Example
```javascript
const getGOAMonthlyList = async (fromDate, toDate) => {
  const params = new URLSearchParams({ fromDate, toDate });
  const response = await fetch(`http://localhost:3000/api/receipts/goa-monthly?${params}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
      'Content-Type': 'application/json'
    }
  });
  
  const data = await response.json();
  return data.success ? data.data : [];
};
```

---

## 8. Get Inscription Monthly List

### Endpoint
```
GET /api/receipts/inscription-monthly?fromDate=2025-01-01&toDate=2025-01-31
```

### cURL Example
```bash
curl -X GET "http://localhost:3000/api/receipts/inscription-monthly?fromDate=2025-01-01&toDate=2025-01-31" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### Response (Success - 200)
```json
{
  "success": true,
  "data": [
    {
      "NicheBookingId": 5,
      "NicheInscriptionRequestId": 3,
      "NicheInscriptionRequestDecesedId": 7,
      "NicheBookingBeneficiaryId": 2,
      "InvoiceId": 8,
      "RefDocNumber": "INCR-001",
      "NameOfDeceased": "John Doe",
      "DateDied": "2024-12-15T00:00:00.000Z",
      "DateOfBirth": "1950-05-20T00:00:00.000Z",
      "BirthYear": "1950",
      "BibleInscriptionChoiceId": 1,
      "PayingAmount": 2000.00,
      "TransactionDate": "2025-01-10T00:00:00.000Z",
      "ApplicantName": "Jane Doe",
      "ApplicantAddressLine1": "123 Main St",
      "ApplicantAddressLine2": "Apt 4B",
      "ApplicantAddressNo": "123",
      "Code": "NICHE-001",
      "InscCode": "INCR-001",
      "InsTransactionDate": "2025-01-10T00:00:00.000Z"
    }
  ]
}
```

### Frontend Promise Example
```javascript
const getInscriptionMonthlyList = async (fromDate, toDate) => {
  const params = new URLSearchParams({ fromDate, toDate });
  const response = await fetch(`http://localhost:3000/api/receipts/inscription-monthly?${params}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
      'Content-Type': 'application/json'
    }
  });
  
  const data = await response.json();
  return data.success ? data.data : [];
};
```

---

## 9. Get Wake Room Monthly List

### Endpoint
```
GET /api/receipts/wake-room-monthly?fromDate=2025-01-01&toDate=2025-01-31
```

### cURL Example
```bash
curl -X GET "http://localhost:3000/api/receipts/wake-room-monthly?fromDate=2025-01-01&toDate=2025-01-31" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### Response (Success - 200)
```json
{
  "success": true,
  "data": [
    {
      "ReceptTransactionDate": "2025-01-20T00:00:00.000Z",
      "PayingAmount": 3000.00,
      "InvoiceId": 12,
      "InvoiceCode": "INV-012",
      "PaymentMode": "Cheque",
      "PaymentModeDocNo": "CHQ-123456",
      "RefDocNumber": "WAPP-001",
      "CustomerName": "Robert Brown",
      "DonationAmount": 3000.00,
      "NoOfDays": 2,
      "NameOfDeceased": "Mary Brown",
      "UsingTimeFrom": "2025-01-25T09:00:00.000Z",
      "UsingTimeTo": "2025-01-26T18:00:00.000Z",
      "WakeRoomBookingNo": "WAPP-001"
    }
  ]
}
```

### Frontend Promise Example
```javascript
const getWakeRoomMonthlyList = async (fromDate, toDate) => {
  const params = new URLSearchParams({ fromDate, toDate });
  const response = await fetch(`http://localhost:3000/api/receipts/wake-room-monthly?${params}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
      'Content-Type': 'application/json'
    }
  });
  
  const data = await response.json();
  return data.success ? data.data : [];
};
```

---

## 10. Get Receipts by Date Range

### Endpoint
```
GET /api/receipts?fromDate=2025-01-01&toDate=2025-01-31&page=1&limit=50
```

### cURL Example
```bash
curl -X GET "http://localhost:3000/api/receipts?fromDate=2025-01-01&toDate=2025-01-31&page=1&limit=50" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### Response (Success - 200)
```json
{
  "success": true,
  "data": [
    {
      "receiptId": 1,
      "invoiceId": 5,
      "transactionDate": "2025-01-15T10:30:00.000Z",
      "customerName": "John Doe",
      "code": "000123",
      "totalAmount": 5000.00,
      "payingAmount": 5000.00,
      "paymentMode": 1,
      "userId": 10,
      "churchId": 1,
      "status": 2,
      "paymentModeDocNo": null,
      "payeeName": "John Doe",
      "address": "Main Street",
      "addressCity": "Colombo",
      "outstandingAmount": 0.00
    }
  ]
}
```

### Frontend Promise Example
```javascript
const getReceiptsByDateRange = async (fromDate, toDate, page = 1, limit = 50) => {
  const params = new URLSearchParams({
    fromDate,
    toDate,
    page: page.toString(),
    limit: limit.toString()
  });
  
  const response = await fetch(`http://localhost:3000/api/receipts?${params}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
      'Content-Type': 'application/json'
    }
  });
  
  const data = await response.json();
  return data.success ? data.data : [];
};
```

---

## 11. Get Invoice by Code (for Receipt Creation)

### Endpoint
```
GET /api/receipts/invoice/:code
```

### cURL Example
```bash
curl -X GET "http://localhost:3000/api/receipts/invoice/INV-001" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### Response (Success - 200)
```json
{
  "success": true,
  "docPrefix": "INV",
  "document": {
    "InvoiceId": 5,
    "TransactionDate": "2025-01-10T00:00:00.000Z",
    "RefDocNumber": "NAPP-001",
    "RefDocName": "NAPP",
    "CustomerName": "John Doe",
    "Code": "INV-001",
    "TotalAmount": 5000.00,
    "PayingAmount": 0.00,
    "PaymentMode": null,
    "PaymentModeDocNo": null,
    "UserId": 10,
    "ChurchId": 1,
    "Status": 1,
    "details": [
      {
        "invoiceDetailId": 10,
        "itemId": 5,
        "quantity": 1,
        "unitAmount": 5000.00,
        "payingAmount": 5000.00,
        "totalPayingAmount": 5000.00,
        "refDocNumber": "NAPP-001",
        "refDocName": "NAPP",
        "lineTotalAmount": 5000.00,
        "lineTaxPercent": 0.00,
        "lineTaxAmount": 0.00
      }
    ]
  }
}
```

### Frontend Promise Example
```javascript
const getInvoiceByCode = async (invoiceCode) => {
  try {
    const response = await fetch(`http://localhost:3000/api/receipts/invoice/${invoiceCode}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    if (data.success) {
      return {
        docPrefix: data.docPrefix,
        invoice: data.document
      };
    } else {
      throw new Error(data.error.message);
    }
  } catch (error) {
    console.error('Error fetching invoice:', error);
    throw error;
  }
};

// Usage
getInvoiceByCode('INV-001')
  .then(result => {
    console.log('Invoice:', result.invoice);
    console.log('Document prefix:', result.docPrefix);
  })
  .catch(error => {
    console.error('Failed:', error);
  });
```

---

## Complete Frontend Service Example

```javascript
// receiptService.js - Complete service for frontend

class ReceiptService {
  constructor(baseURL = 'http://localhost:3000/api', tokenGetter) {
    this.baseURL = baseURL;
    this.getToken = tokenGetter || (() => localStorage.getItem('token'));
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}/receipts${endpoint}`;
    const token = this.getToken();
    
    const config = {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error?.message || 'Request failed');
      }
      
      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  // Get receipt by code
  async getReceipt(code) {
    const data = await this.request(`/${code}`);
    return data.data;
  }

  // Create receipt
  async createReceipt(receiptData) {
    const data = await this.request('', {
      method: 'POST',
      body: JSON.stringify(receiptData)
    });
    return data.code;
  }

  // Create receipt from invoice
  async createReceiptFromInvoice(invoice, invoiceDetails) {
    const data = await this.request('/from-invoice', {
      method: 'POST',
      body: JSON.stringify({ invoice, invoiceDetails })
    });
    return { code: data.code, receiptId: data.receiptId };
  }

  // Get last receipt number
  async getLastReceiptNumber() {
    const data = await this.request('/last-number');
    return data.data.lastReceiptNumber;
  }

  // Get last miscellaneous receipt number
  async getLastMiscReceiptNumber() {
    const data = await this.request('/last-misc-number');
    return data.data.lastMiscReceiptNumber;
  }

  // Get receipt report
  async getReceiptReport(fromDate, toDate) {
    const params = new URLSearchParams({ fromDate, toDate });
    const data = await this.request(`/report?${params}`);
    return { items: data.data.data, totals: data.data.totals };
  }

  // Get GOA monthly list
  async getGOAMonthlyList(fromDate, toDate) {
    const params = new URLSearchParams({ fromDate, toDate });
    const data = await this.request(`/goa-monthly?${params}`);
    return data.data;
  }

  // Get inscription monthly list
  async getInscriptionMonthlyList(fromDate, toDate) {
    const params = new URLSearchParams({ fromDate, toDate });
    const data = await this.request(`/inscription-monthly?${params}`);
    return data.data;
  }

  // Get wake room monthly list
  async getWakeRoomMonthlyList(fromDate, toDate) {
    const params = new URLSearchParams({ fromDate, toDate });
    const data = await this.request(`/wake-room-monthly?${params}`);
    return data.data;
  }

  // Get receipts by date range
  async getReceiptsByDateRange(fromDate, toDate, page = 1, limit = 50) {
    const params = new URLSearchParams({
      fromDate,
      toDate,
      page: page.toString(),
      limit: limit.toString()
    });
    const data = await this.request(`?${params}`);
    return data.data;
  }

  // Get invoice by code
  async getInvoiceByCode(code) {
    const data = await this.request(`/invoice/${code}`);
    return { docPrefix: data.docPrefix, invoice: data.document };
  }
}

// Usage example
const receiptService = new ReceiptService();

// Get receipt
receiptService.getReceipt('000123')
  .then(receipt => console.log('Receipt:', receipt))
  .catch(error => console.error('Error:', error));

// Create receipt
receiptService.createReceipt({
  invoiceId: 5,
  customerName: "John Doe",
  totalAmount: 5000.00,
  payingAmount: 5000.00,
  paymentMode: "Cash"
})
  .then(code => console.log('Created receipt:', code))
  .catch(error => console.error('Error:', error));
```

---

## Payment Mode Values

- `1` or `"Cash"` - Cash payment
- `2` or `"Cheque"` - Cheque payment
- `3` or `"TT"` - Telegraphic Transfer
- `4` or `"Others"` - Other payment methods

## Status Values

- `0` - Cancel
- `1` - Active
- `2` - Paid

---

## Error Responses

All endpoints may return these error responses:

### 401 Unauthorized
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required with church ID"
  }
}
```

### 400 Bad Request
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": ["Field error 1", "Field error 2"]
  }
}
```

### 404 Not Found
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Receipt not found"
  }
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Failed to process request"
  }
}
```

