# Invoice & Receipt Creation Implementation Guide

## Overview

This guide shows how to implement **3 flexible options** for creating invoices and receipts:

1. **Create Invoice Only** - Generate just the invoice
2. **Create Receipt Only** - Generate just the receipt (without creating an invoice)
3. **Create Invoice + Receipt** - Generate both at the same time

---

## Backend Support

✅ **Already Implemented** - The backend supports all three options:

### POST `/api/invoices`
```json
{
  "invoice": { ... },
  "invoiceDetails": [ ... ],
  "createReceipt": true/false  // ← Controls if receipt is also created
}
```

### POST `/api/receipts/from-invoice`
```json
{
  "invoice": { ... },
  "invoiceDetails": [ ... ]
}
```

---

## Redux Slice Updates

✅ **Already Updated** - The `invoiceSlice.ts` now tracks:
- `createdWithReceipt` - Flag indicating if receipt was created with invoice
- Returns `receiptCode` when invoice+receipt are created together

---

## Frontend Implementation Steps

### Step 1: Import Redux in InvoiceAndReceiptPage.tsx

Add these imports at the top:

```typescript
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import {
  fetchInvoiceOrApplication,
  createInvoice,
  createReceipt,
  clearCurrentData,
  CreateInvoicePayload,
  CreateReceiptPayload
} from '../store/invoiceSlice';
```

### Step 2: Add Redux Hooks

Inside the component:

```typescript
export function InvoiceAndReceiptPage() {
  const dispatch = useDispatch<AppDispatch>();
  const { 
    currentData, 
    loading: invoiceLoading, 
    creatingInvoice, 
    creatingReceipt,
    createInvoiceSuccess,
    createReceiptSuccess,
    lastCreatedInvoiceCode,
    lastCreatedReceiptCode,
    createdWithReceipt,
    error: invoiceError 
  } = useSelector((state: RootState) => state.invoice);
  
  // ... existing code
}
```

### Step 3: Handle Application Number Change

```typescript
const handleApplicationNumberChange = async (value: string) => {
  setApplicationNumber(value);
  
  // Clear previous data
  dispatch(clearCurrentData());
  clearFormFields();
  
  // Fetch new data if valid
  if (value.trim().length >= 4) {
    try {
      await dispatch(fetchInvoiceOrApplication(value.trim())).unwrap();
    } catch (error) {
      console.error('Failed to fetch:', error);
    }
  }
};
```

### Step 4: Add Clear Form Function

```typescript
const clearFormFields = () => {
  setInvoiceNumber('');
  setPayeeName('');
  setAddressBlock('Block');
  setAddressNumber('');
  setAddressStreet('');
  setAddressUnit('');
  setAddressPostalCode('');
  setAddressCountry('Singapore');
  setPaymentMode('Cash');
  setItems([]);
};
```

### Step 5: Add useEffect for Form Population

```typescript
useEffect(() => {
  if (!currentData) {
    clearFormFields();
    return;
  }
  
  // Clear first to prevent stale data
  clearFormFields();
  
  // Populate from current data
  if (currentData.isInvoice) {
    // This is an invoice
    setInvoiceNumber(currentData.code || '');
    setPayeeName(currentData.customerName || '');
    setTransactionDate(formatDate(currentData.transactionDate));
    
    if (currentData.address) {
      parseAndSetAddress(currentData.address);
    }
    
    // Populate items
    const invoiceItems = currentData.details.map((detail, index) => ({
      id: `item-${index}`,
      selectItem: detail.itemName || 'N/A',
      reference: detail.refDocNumber || '',
      defaultAmount: detail.unitAmount || 0,
      amountPaying: detail.payingAmount || 0,
      quantity: detail.quantity || 1,
      totalNoTax: detail.lineTotalAmount || 0,
      taxPercent: detail.lineTaxPercent || 9,
      taxAmount: detail.lineTaxAmount || 0,
      totalAmount: detail.totalPayingAmount || 0,
    }));
    setItems(invoiceItems);
    
  } else if (currentData.isApplicationData) {
    // This is application data
    setApplicationNumber(currentData.applicationCode || '');
    setPayeeName(currentData.customerName || '');
    setTransactionDate(formatDate(currentData.transactionDate || new Date()));
    
    if (currentData.address) {
      parseAndSetAddress(currentData.address);
    }
    
    // Populate items from application
    const applicationItems = currentData.details.map((detail, index) => ({
      id: `item-${index}`,
      selectItem: detail.itemName || 'Niche',
      reference: detail.refDocNumber || currentData.applicationCode || '',
      defaultAmount: detail.unitAmount || 0,
      amountPaying: detail.payingAmount || 0,
      quantity: detail.quantity || 1,
      totalNoTax: detail.lineTotalAmount || 0,
      taxPercent: detail.lineTaxPercent || 9,
      taxAmount: detail.lineTaxAmount || 0,
      totalAmount: detail.totalPayingAmount || 0,
    }));
    setItems(applicationItems);
  }
}, [currentData]);
```

### Step 6: Add Handler - Create Invoice Only

```typescript
const handleGenerateInvoiceOnly = async () => {
  if (!currentData || !currentData.isApplicationData) {
    showError('Error', 'No application data available');
    return;
  }
  
  if (!paymentMode) {
    showError('Error', 'Please select a payment mode');
    return;
  }
  
  try {
    const payload: CreateInvoicePayload = {
      invoice: {
        transactionDate: new Date().toISOString(),
        refDocNumber: currentData.applicationCode || currentData.refDocNumber || '',
        refDocName: currentData.refDocName || 'NAPP',
        customerName: currentData.customerName,
        totalAmount: currentData.totalAmount,
        payingAmount: currentData.payingAmount,
        taxAmount: currentData.taxAmount,
        taxPercentage: currentData.taxPercentage,
        taxCode: currentData.taxCode,
        nicheApplicationId: currentData.nicheApplicationId,
        addressNo: currentData.addressNo,
        address: currentData.address,
        address2: currentData.address2,
        addressCity: currentData.addressCity,
        districtCode: currentData.districtCode,
        country: currentData.country,
        paymentMode: paymentMode,
      },
      invoiceDetails: currentData.details.map(detail => ({
        itemId: detail.itemId,
        quantity: detail.quantity,
        unitAmount: detail.unitAmount,
        payingAmount: detail.payingAmount,
        totalPayingAmount: detail.totalPayingAmount,
        refDocNumber: detail.refDocNumber,
        refDocName: detail.refDocName,
        lineTotalAmount: detail.lineTotalAmount,
        lineTaxPercent: detail.lineTaxPercent,
        lineTaxAmount: detail.lineTaxAmount,
      })),
      createReceipt: false, // ← Only create invoice
    };
    
    const result = await dispatch(createInvoice(payload)).unwrap();
    
    showSuccess('Success', 
      `Invoice created successfully!\n` +
      `Invoice Code: ${result.invoiceCode}`
    );
    
    // Refresh data
    await dispatch(fetchInvoiceOrApplication(currentData.applicationCode || '')).unwrap();
    
  } catch (error: any) {
    showError('Error', error || 'Failed to create invoice');
  }
};
```

### Step 7: Add Handler - Create Receipt Only

```typescript
const handleGenerateReceiptOnly = async () => {
  if (!currentData) {
    showError('Error', 'No data available');
    return;
  }
  
  if (!paymentMode) {
    showError('Error', 'Please select a payment mode');
    return;
  }
  
  try {
    const payload: CreateReceiptPayload = {
      invoice: {
        invoiceId: currentData.invoiceId || undefined,
        invoiceCode: currentData.code || currentData.applicationCode || '',
        customerName: currentData.customerName,
        totalAmount: currentData.totalAmount,
        payingAmount: currentData.payingAmount,
        paymentMode: paymentMode,
      },
      invoiceDetails: currentData.details.map(detail => ({
        description: detail.itemName || 'Item',
        quantity: detail.quantity,
        unitPrice: detail.unitAmount,
        amount: detail.totalPayingAmount,
      })),
    };
    
    const result = await dispatch(createReceipt(payload)).unwrap();
    
    showSuccess('Success', 
      `Receipt created successfully!\n` +
      `Receipt Code: ${result.receiptCode}`
    );
    
  } catch (error: any) {
    showError('Error', error || 'Failed to create receipt');
  }
};
```

### Step 8: Add Handler - Create Invoice + Receipt

```typescript
const handleGenerateInvoiceAndReceipt = async () => {
  if (!currentData || !currentData.isApplicationData) {
    showError('Error', 'No application data available');
    return;
  }
  
  if (!paymentMode) {
    showError('Error', 'Please select a payment mode');
    return;
  }
  
  try {
    const payload: CreateInvoicePayload = {
      invoice: {
        transactionDate: new Date().toISOString(),
        refDocNumber: currentData.applicationCode || currentData.refDocNumber || '',
        refDocName: currentData.refDocName || 'NAPP',
        customerName: currentData.customerName,
        totalAmount: currentData.totalAmount,
        payingAmount: currentData.payingAmount,
        taxAmount: currentData.taxAmount,
        taxPercentage: currentData.taxPercentage,
        taxCode: currentData.taxCode,
        nicheApplicationId: currentData.nicheApplicationId,
        addressNo: currentData.addressNo,
        address: currentData.address,
        address2: currentData.address2,
        addressCity: currentData.addressCity,
        districtCode: currentData.districtCode,
        country: currentData.country,
        paymentMode: paymentMode,
      },
      invoiceDetails: currentData.details.map(detail => ({
        itemId: detail.itemId,
        quantity: detail.quantity,
        unitAmount: detail.unitAmount,
        payingAmount: detail.payingAmount,
        totalPayingAmount: detail.totalPayingAmount,
        refDocNumber: detail.refDocNumber,
        refDocName: detail.refDocName,
        lineTotalAmount: detail.lineTotalAmount,
        lineTaxPercent: detail.lineTaxPercent,
        lineTaxAmount: detail.lineTaxAmount,
      })),
      createReceipt: true, // ← Create both invoice and receipt
    };
    
    const result = await dispatch(createInvoice(payload)).unwrap();
    
    if (result.receiptCreated && result.receiptCode) {
      showSuccess('Success', 
        `Invoice and Receipt created successfully!\n` +
        `Invoice Code: ${result.invoiceCode}\n` +
        `Receipt Code: ${result.receiptCode}`
      );
    } else {
      showSuccess('Success', 
        `Invoice created successfully!\n` +
        `Invoice Code: ${result.invoiceCode}`
      );
    }
    
    // Refresh data
    await dispatch(fetchInvoiceOrApplication(currentData.applicationCode || '')).unwrap();
    
  } catch (error: any) {
    showError('Error', error || 'Failed to create invoice and receipt');
  }
};
```

### Step 9: Add Buttons to JSX

```tsx
{/* Show buttons when canCreateInvoice is true */}
{currentData?.canCreateInvoice && (
  <div style={{ 
    marginTop: '20px',
    padding: '20px',
    background: '#fff3cd',
    border: '2px solid #ffc107',
    borderRadius: '8px'
  }}>
    {/* Warning Message */}
    <div style={{ marginBottom: '16px' }}>
      <strong style={{ color: '#856404', fontSize: '16px' }}>
        ⚠️ Invoice Not Created Yet
      </strong>
      <p style={{ fontSize: '14px', color: '#856404', margin: '8px 0' }}>
        This is an application. Choose how to proceed:
      </p>
    </div>
    
    {/* Button Group */}
    <div style={{ 
      display: 'flex', 
      gap: '12px', 
      flexWrap: 'wrap' 
    }}>
      {/* Button 1: Create Invoice Only */}
      <button
        onClick={handleGenerateInvoiceOnly}
        disabled={creatingInvoice || !paymentMode}
        style={{
          flex: '1 1 auto',
          minWidth: '180px',
          padding: '12px 20px',
          background: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          fontSize: '15px',
          fontWeight: '600',
          cursor: creatingInvoice || !paymentMode ? 'not-allowed' : 'pointer',
          opacity: creatingInvoice || !paymentMode ? 0.6 : 1,
          transition: 'all 0.3s',
        }}
      >
        {creatingInvoice ? '⏳ Creating...' : '📄 Create Invoice Only'}
      </button>
      
      {/* Button 2: Create Receipt Only */}
      <button
        onClick={handleGenerateReceiptOnly}
        disabled={creatingReceipt || !paymentMode}
        style={{
          flex: '1 1 auto',
          minWidth: '180px',
          padding: '12px 20px',
          background: '#28a745',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          fontSize: '15px',
          fontWeight: '600',
          cursor: creatingReceipt || !paymentMode ? 'not-allowed' : 'pointer',
          opacity: creatingReceipt || !paymentMode ? 0.6 : 1,
          transition: 'all 0.3s',
        }}
      >
        {creatingReceipt ? '⏳ Creating...' : '🧾 Create Receipt Only'}
      </button>
      
      {/* Button 3: Create Invoice + Receipt */}
      <button
        onClick={handleGenerateInvoiceAndReceipt}
        disabled={creatingInvoice || !paymentMode}
        style={{
          flex: '1 1 auto',
          minWidth: '220px',
          padding: '12px 20px',
          background: '#6f42c1',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          fontSize: '15px',
          fontWeight: '600',
          cursor: creatingInvoice || !paymentMode ? 'not-allowed' : 'pointer',
          opacity: creatingInvoice || !paymentMode ? 0.6 : 1,
          transition: 'all 0.3s',
        }}
      >
        {creatingInvoice ? '⏳ Creating...' : '📄🧾 Create Invoice + Receipt'}
      </button>
    </div>
    
    {/* Helper Text */}
    {!paymentMode && (
      <p style={{ 
        fontSize: '12px', 
        color: '#856404', 
        marginTop: '12px',
        fontStyle: 'italic' 
      }}>
        ℹ️ Please select a payment mode to enable buttons
      </p>
    )}
  </div>
)}

{/* Success Messages */}
{createInvoiceSuccess && lastCreatedInvoiceCode && (
  <div style={{ 
    padding: '12px', 
    background: '#d4edda', 
    border: '1px solid #c3e6cb',
    borderRadius: '6px',
    marginTop: '12px'
  }}>
    ✅ Invoice created: <strong>{lastCreatedInvoiceCode}</strong>
    {createdWithReceipt && lastCreatedReceiptCode && (
      <>
        <br />
        ✅ Receipt created: <strong>{lastCreatedReceiptCode}</strong>
      </>
    )}
  </div>
)}

{createReceiptSuccess && lastCreatedReceiptCode && !createdWithReceipt && (
  <div style={{ 
    padding: '12px', 
    background: '#d4edda', 
    border: '1px solid #c3e6cb',
    borderRadius: '6px',
    marginTop: '12px'
  }}>
    ✅ Receipt created: <strong>{lastCreatedReceiptCode}</strong>
  </div>
)}
```

---

## Visual Design

### Application State (Yellow Warning + 3 Buttons)

```
┌────────────────────────────────────────────────────────────┐
│ ⚠️ Invoice Not Created Yet                                 │
│                                                            │
│ This is an application. Choose how to proceed:            │
│                                                            │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────────┐   │
│ │ 📄 Create     │ │ 🧾 Create    │ │ 📄🧾 Create       │   │
│ │ Invoice Only │ │ Receipt Only │ │ Invoice+Receipt  │   │
│ └──────────────┘ └──────────────┘ └──────────────────┘   │
│                                                            │
│ ℹ️ Please select a payment mode to enable buttons         │
└────────────────────────────────────────────────────────────┘
Background: #fff3cd (Light Yellow)
Border: #ffc107 (Gold)
```

### Invoice State (Green Success, No Buttons)

```
┌────────────────────────────────────────────────────────────┐
│ ✅ INVOICE LOADED: 00123                                   │
│                                                            │
│ Invoice Date: 30/01/2026                                  │
│ Customer: John Doe                                        │
│ Amount: $5,000.00                                         │
│                                                            │
│ (No create buttons - invoice already exists)              │
└────────────────────────────────────────────────────────────┘
Background: #d4edda (Light Green)
Border: #c3e6cb (Green)
```

---

## User Flows

### Flow 1: Create Invoice Only
```
1. User enters application code
2. Form populates with application data
3. Yellow warning shows with 3 buttons
4. User clicks "Create Invoice Only"
5. Invoice created
6. Success message: "Invoice created: 00123"
7. Form refreshes, buttons disappear (invoice exists now)
```

### Flow 2: Create Receipt Only
```
1. User enters application code
2. Form populates with application data
3. Yellow warning shows with 3 buttons
4. User clicks "Create Receipt Only"
5. Receipt created (no invoice)
6. Success message: "Receipt created: R-00456"
7. Buttons remain (can still create invoice if needed)
```

### Flow 3: Create Invoice + Receipt Together
```
1. User enters application code
2. Form populates with application data
3. Yellow warning shows with 3 buttons
4. User clicks "Create Invoice + Receipt"
5. Both invoice and receipt created
6. Success message: 
   "Invoice created: 00123
    Receipt created: R-00456"
7. Form refreshes, buttons disappear
```

---

## Error Handling

### Missing Payment Mode
```typescript
if (!paymentMode) {
  showError('Error', 'Please select a payment mode');
  return;
}
```

### Duplicate Invoice
```typescript
catch (error: any) {
  if (error.includes('Duplicate')) {
    showError('Error', 'Invoice already exists for this application');
  } else {
    showError('Error', error || 'Failed to create invoice');
  }
}
```

---

## Testing Checklist

### Test Case 1: Create Invoice Only
- [ ] Enter application code
- [ ] See 3 buttons
- [ ] Click "Create Invoice Only"
- [ ] Verify invoice created
- [ ] Verify NO receipt created
- [ ] Buttons disappear after creation

### Test Case 2: Create Receipt Only
- [ ] Enter application code
- [ ] See 3 buttons
- [ ] Click "Create Receipt Only"
- [ ] Verify receipt created
- [ ] Verify NO invoice created
- [ ] Buttons remain visible

### Test Case 3: Create Invoice + Receipt
- [ ] Enter application code
- [ ] See 3 buttons
- [ ] Click "Create Invoice + Receipt"
- [ ] Verify BOTH created
- [ ] Verify success shows both codes
- [ ] Buttons disappear after creation

### Test Case 4: Payment Mode Required
- [ ] Enter application code
- [ ] DON'T select payment mode
- [ ] All buttons disabled
- [ ] Helper text shows

### Test Case 5: Existing Invoice
- [ ] Enter invoice code (e.g., "00123")
- [ ] NO buttons show
- [ ] Green success indicator
- [ ] Form shows invoice data

---

## Summary

### What You Get

✅ **3 Flexible Options** for creating invoices and receipts
✅ **Smart UI** that shows options only when appropriate
✅ **Clear Visual Feedback** with color-coded states
✅ **Error Handling** for all edge cases
✅ **No Breaking Changes** - all existing features preserved

### Button Colors

- **Blue (#007bff)** - Create Invoice Only
- **Green (#28a745)** - Create Receipt Only
- **Purple (#6f42c1)** - Create Invoice + Receipt

### When Buttons Show

✅ Show buttons: `currentData?.canCreateInvoice === true`
❌ Hide buttons: `currentData?.isInvoice === true` (invoice exists)

---

**Ready to implement!** Follow the steps above to add the 3-button system to your InvoiceAndReceiptPage component.

