# Quick Reference: Invoice & Application Flags

## 🚦 Response Flags

Every response from `/api/invoices/:code` includes these 4 flags:

| Flag | Type | Description |
|------|------|-------------|
| `isApplicationData` | boolean | This is application data (not invoice yet) |
| `isInvoice` | boolean | This is an invoice |
| `hasInvoice` | boolean | Invoice exists for this application |
| `canCreateInvoice` | boolean | Show "Generate Invoice/Receipt" buttons |

---

## 🎯 Flag Combinations

### Scenario 1: Application Found, No Invoice Yet
```json
{
  "isApplicationData": true,
  "isInvoice": false,
  "hasInvoice": false,
  "canCreateInvoice": true
}
```
**UI Action:** 
- ⚠️ Show yellow warning "Invoice Not Created Yet"
- 🔘 Show "Generate Invoice" button
- 🔘 Show "Generate Receipt" button
- ✅ Clear form and populate with application data

---

### Scenario 2: Invoice Found
```json
{
  "isApplicationData": false,
  "isInvoice": true,
  "hasInvoice": true,
  "canCreateInvoice": false
}
```
**UI Action:**
- ✅ Show green success "Invoice Loaded"
- ❌ Don't show generate buttons
- ✅ Populate form with invoice data

---

### Scenario 3: Application with Existing Invoice
```json
{
  "isApplicationData": false,
  "isInvoice": true,
  "hasInvoice": true,
  "canCreateInvoice": false
}
```
**UI Action:**
- ℹ️ Show info "Invoice already exists"
- ❌ Don't show generate buttons
- ✅ Show invoice details

---

## 💡 Quick Decision Tree

```
Enter Code
    |
    ├─ Is this application data?
    │   ├─ YES (isApplicationData = true)
    │   │   ├─ Has invoice? (hasInvoice = true)
    │   │   │   ├─ YES → Show invoice, no buttons
    │   │   │   └─ NO → Show warning + buttons
    │   │   └─ Can create? (canCreateInvoice = true)
    │   │       └─ YES → Show "Generate Invoice" & "Generate Receipt"
    │   └─ NO (isInvoice = true)
    │       └─ Show invoice details, no buttons
```

---

## 🧪 Testing with Real Codes

### Test Application (No Invoice)
```
Code: "7977-0"
Expected:
  isApplicationData: true
  canCreateInvoice: true
  
Result: Yellow warning + Generate buttons
```

### Test Invoice
```
Code: "00123"
Expected:
  isInvoice: true
  canCreateInvoice: false
  
Result: Green success, no buttons
```

---

## 🔧 Code Examples

### Check and Show Buttons
```typescript
// In your JSX:
{currentData?.canCreateInvoice && (
  <div className="generate-buttons">
    <button onClick={handleGenerateInvoice}>
      Generate Invoice
    </button>
    <button onClick={handleGenerateReceipt}>
      Generate Receipt
    </button>
  </div>
)}
```

### Clear Form When Code Changes
```typescript
const handleApplicationNumberChange = (value: string) => {
  setApplicationNumber(value);
  
  // IMPORTANT: Clear previous data immediately
  dispatch(clearCurrentData());
  clearFormFields();
  
  // Fetch new data
  if (value.trim().length >= 4) {
    dispatch(fetchInvoiceOrApplication(value.trim()));
  }
};
```

### Populate Form Based on Flags
```typescript
useEffect(() => {
  if (!currentData) {
    clearFormFields(); // Clear if no data
    return;
  }
  
  // Clear first (prevent stale data)
  clearFormFields();
  
  // Populate form
  if (currentData.isApplicationData) {
    // This is application - use application fields
    populateFromApplication(currentData);
  } else if (currentData.isInvoice) {
    // This is invoice - use invoice fields
    populateFromInvoice(currentData);
  }
}, [currentData]);
```

---

## 🎨 Visual Indicators

### Application Data (Yellow)
```html
<div style="background: #fff3cd; border: 2px solid #ffc107;">
  ⚠️ Invoice Not Created Yet
  <p>This is an application. Create invoice:</p>
  <button>Generate Invoice</button>
  <button>Generate Receipt</button>
</div>
```

### Invoice Data (Green)
```html
<div style="background: #d4edda; border: 1px solid #c3e6cb;">
  ✅ Invoice Loaded: 00123
  <p>Invoice Date: 30/01/2026</p>
</div>
```

### Error (Red)
```html
<div style="background: #f8d7da; border: 1px solid #f5c6cb;">
  ❌ Not Found
  <p>Invoice or application not found</p>
</div>
```

---

## 🔄 State Flow

```
1. User enters code
   ↓
2. Redux: dispatch(fetchInvoiceOrApplication(code))
   ↓
3. API returns data with flags
   ↓
4. Redux: currentData updated
   ↓
5. useEffect: detects currentData change
   ↓
6. Component: clearFormFields()
   ↓
7. Component: populate based on flags
   ↓
8. Component: show/hide buttons based on canCreateInvoice
```

---

## 📊 Data Structure

### Application Response
```typescript
{
  isApplicationData: true,
  isInvoice: false,
  hasInvoice: false,
  canCreateInvoice: true,
  
  applicationCode: "7977-0",
  nicheApplicationId: 123,
  customerName: "John Doe",
  totalAmount: 5000,
  
  niche: {
    nicheCode: "A01-01",
    wallName: "St. Francis Wall",
    chapelName: "Main Chapel"
  },
  
  details: [
    {
      itemId: 4,
      itemName: "Level 3 Niche",
      quantity: 1,
      unitAmount: 4587.16,
      ...
    }
  ]
}
```

### Invoice Response
```typescript
{
  isApplicationData: false,
  isInvoice: true,
  hasInvoice: true,
  canCreateInvoice: false,
  
  invoiceId: 456,
  code: "00123",
  customerName: "John Doe",
  totalAmount: 5000,
  
  details: [
    {
      itemId: 4,
      itemName: "Level 3 Niche",
      quantity: 1,
      unitAmount: 4587.16,
      ...
    }
  ]
}
```

---

## 🚀 Quick Actions

### Generate Invoice
```typescript
const payload: CreateInvoicePayload = {
  invoice: {
    transactionDate: new Date().toISOString(),
    refDocNumber: currentData.applicationCode,
    refDocName: 'NAPP',
    customerName: currentData.customerName,
    totalAmount: currentData.totalAmount,
    payingAmount: currentData.payingAmount,
    taxAmount: currentData.taxAmount,
    taxPercentage: currentData.taxPercentage,
    taxCode: currentData.taxCode,
    nicheApplicationId: currentData.nicheApplicationId,
    paymentMode: paymentMode,
  },
  invoiceDetails: currentData.details.map(d => ({
    itemId: d.itemId,
    quantity: d.quantity,
    unitAmount: d.unitAmount,
    payingAmount: d.payingAmount,
    totalPayingAmount: d.totalPayingAmount,
    refDocNumber: d.refDocNumber,
    refDocName: d.refDocName,
    lineTotalAmount: d.lineTotalAmount,
    lineTaxPercent: d.lineTaxPercent,
    lineTaxAmount: d.lineTaxAmount,
  }))
};

await dispatch(createInvoice(payload)).unwrap();
```

### Generate Receipt
```typescript
const payload: CreateReceiptPayload = {
  invoice: {
    invoiceCode: currentData.code || currentData.applicationCode,
    customerName: currentData.customerName,
    totalAmount: currentData.totalAmount,
    payingAmount: currentData.payingAmount,
    paymentMode: paymentMode,
  },
  invoiceDetails: currentData.details.map(d => ({
    description: d.itemName,
    quantity: d.quantity,
    unitPrice: d.unitAmount,
    amount: d.totalPayingAmount,
  }))
};

await dispatch(createReceipt(payload)).unwrap();
```

---

## 🎯 Remember

1. **Always clear form** before populating new data
2. **Check canCreateInvoice** before showing buttons
3. **Use Redux** for all invoice/application operations
4. **Show loading states** during API calls
5. **Display errors** via toast notifications

---

**Print this page and keep it handy while coding!** 📌

