# Invoice & Receipt Integration Guide with Redux

## Overview

This guide shows how to integrate invoice and receipt creation with Redux in the InvoiceAndReceiptPage component.

---

## What Was Implemented

### 1. Redux Invoice Slice (`src/store/invoiceSlice.ts`)
- ✅ Complete Redux slice for invoice/application data
- ✅ Async thunks for fetching and creating invoices/receipts
- ✅ Proper handling of application data vs invoice data
- ✅ Loading states and error handling

### 2. Updated Redux Store (`src/store/index.ts`)
- ✅ Added invoice reducer to store

---

## Key Features

### Flags in Response
Every response includes these flags:
- `isApplicationData` - Is this application data? (true/false)
- `isInvoice` - Is this an invoice? (true/false)
- `hasInvoice` - Does invoice exist? (true/false)
- `canCreateInvoice` - Show create buttons? (true/false)

---

## Step-by-Step Integration for InvoiceAndReceiptPage.tsx

### Step 1: Add Redux Imports

At the top of your file, add these imports:

```typescript
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import {
  fetchInvoiceOrApplication,
  createInvoice,
  createReceipt,
  clearCurrentData,
  resetCreateStatus,
  CreateInvoicePayload,
  CreateReceiptPayload
} from '../store/invoiceSlice';
```

### Step 2: Setup Redux in Component

Add this inside your component (after existing hooks):

```typescript
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
  error: invoiceError 
} = useSelector((state: RootState) => state.invoice);
```

### Step 3: Handle Application Number Change

Replace or update your application number input handler:

```typescript
const handleApplicationNumberChange = async (value: string) => {
  setApplicationNumber(value);
  
  // Clear previous data when input changes
  if (!value.trim()) {
    dispatch(clearCurrentData());
    clearFormFields(); // Your existing clear function
    return;
  }
  
  // Fetch invoice or application when user enters code
  if (value.trim().length >= 4) { // Adjust minimum length as needed
    try {
      await dispatch(fetchInvoiceOrApplication(value.trim())).unwrap();
    } catch (error) {
      console.error('Failed to fetch:', error);
    }
  }
};
```

### Step 4: Populate Form with Data

Add useEffect to populate form when data arrives:

```typescript
useEffect(() => {
  if (!currentData) {
    clearFormFields();
    return;
  }
  
  // CRITICAL: Clear all fields first
  clearFormFields();
  
  // Populate form with current data
  if (currentData.isInvoice) {
    // This is an invoice - populate invoice fields
    setInvoiceNumber(currentData.code || '');
    setPayeeName(currentData.customerName || '');
    setTransactionDate(formatDate(currentData.transactionDate));
    
    // Populate address
    if (currentData.address) {
      applyParsedAddress(currentData.address);
    }
    
    // Populate items from invoice details
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
    // This is application data - populate application fields
    setApplicationNumber(currentData.applicationCode || '');
    setPayeeName(currentData.customerName || '');
    setTransactionDate(formatDate(currentData.transactionDate || new Date()));
    
    // Populate address from application
    if (currentData.address) {
      applyParsedAddress(currentData.address);
    }
    
    // Populate items from application details
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
    
    // Show niche information if available
    if (currentData.niche) {
      showSuccess('Application Found', 
        `Niche: ${currentData.niche.nicheCode}\n` +
        `Wall: ${currentData.niche.wallName}\n` +
        `Chapel: ${currentData.niche.chapelName}`
      );
    }
  }
}, [currentData]);
```

### Step 5: Add Clear Form Function

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

const formatDate = (date: string | Date) => {
  const d = new Date(date);
  return d.toLocaleDateString('en-GB');
};
```

### Step 6: Handle Invoice Creation

Add this function to create invoice:

```typescript
const handleGenerateInvoice = async () => {
  if (!currentData || !currentData.isApplicationData) {
    showError('Error', 'No application data available');
    return;
  }
  
  if (!paymentMode) {
    showError('Error', 'Please select a payment mode');
    return;
  }
  
  try {
    // Build invoice payload from current data
    const invoicePayload: CreateInvoicePayload = {
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
      createReceipt: false, // Don't auto-create receipt
    };
    
    // Dispatch create invoice action
    const result = await dispatch(createInvoice(invoicePayload)).unwrap();
    
    showSuccess('Success', 
      `Invoice created successfully!\n` +
      `Invoice Code: ${result.invoiceCode}`
    );
    
    // Refresh data to show created invoice
    await dispatch(fetchInvoiceOrApplication(currentData.applicationCode || '')).unwrap();
    
  } catch (error: any) {
    showError('Error', error || 'Failed to create invoice');
  }
};
```

### Step 7: Handle Receipt Creation

Add this function to create receipt:

```typescript
const handleGenerateReceipt = async () => {
  if (!currentData) {
    showError('Error', 'No data available');
    return;
  }
  
  if (!paymentMode) {
    showError('Error', 'Please select a payment mode');
    return;
  }
  
  try {
    // Build receipt payload
    const receiptPayload: CreateReceiptPayload = {
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
    
    // Dispatch create receipt action
    const result = await dispatch(createReceipt(receiptPayload)).unwrap();
    
    showSuccess('Success', 
      `Receipt created successfully!\n` +
      `Receipt Code: ${result.receiptCode}`
    );
    
  } catch (error: any) {
    showError('Error', error || 'Failed to create receipt');
  }
};
```

### Step 8: Add Generate Buttons in JSX

Add these buttons after your payment mode field:

```tsx
{/* Generate Invoice & Receipt Buttons */}
{currentData && currentData.canCreateInvoice && (
  <div className="button-group" style={{ 
    display: 'flex', 
    gap: '16px', 
    marginTop: '20px',
    padding: '16px',
    background: '#fff3cd',
    border: '2px solid #ffc107',
    borderRadius: '8px'
  }}>
    <div style={{ flex: 1 }}>
      <strong style={{ color: '#856404' }}>
        ⚠️ Invoice Not Created Yet
      </strong>
      <p style={{ fontSize: '14px', color: '#856404', margin: '8px 0' }}>
        This is an application. Create invoice and receipt:
      </p>
    </div>
    
    <button
      onClick={handleGenerateInvoice}
      disabled={creatingInvoice || !paymentMode}
      style={{
        padding: '12px 24px',
        background: '#007bff',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        fontSize: '16px',
        fontWeight: 'bold',
        cursor: creatingInvoice ? 'not-allowed' : 'pointer',
        opacity: creatingInvoice || !paymentMode ? 0.6 : 1,
      }}
    >
      {creatingInvoice ? '⏳ Creating...' : '📄 Generate Invoice'}
    </button>
    
    <button
      onClick={handleGenerateReceipt}
      disabled={creatingReceipt || !paymentMode}
      style={{
        padding: '12px 24px',
        background: '#28a745',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        fontSize: '16px',
        fontWeight: 'bold',
        cursor: creatingReceipt ? 'not-allowed' : 'pointer',
        opacity: creatingReceipt || !paymentMode ? 0.6 : 1,
      }}
    >
      {creatingReceipt ? '⏳ Creating...' : '🧾 Generate Receipt'}
    </button>
  </div>
)}

{/* Show success messages */}
{createInvoiceSuccess && lastCreatedInvoiceCode && (
  <div style={{ 
    padding: '12px', 
    background: '#d4edda', 
    border: '1px solid #c3e6cb',
    borderRadius: '4px',
    marginTop: '12px'
  }}>
    ✅ Invoice created: <strong>{lastCreatedInvoiceCode}</strong>
  </div>
)}

{createReceiptSuccess && lastCreatedReceiptCode && (
  <div style={{ 
    padding: '12px', 
    background: '#d4edda', 
    border: '1px solid #c3e6cb',
    borderRadius: '4px',
    marginTop: '12px'
  }}>
    ✅ Receipt created: <strong>{lastCreatedReceiptCode}</strong>
  </div>
)}
```

---

## Testing Checklist

### Test 1: Search Application (No Invoice)
1. Enter application code (e.g., "7977-0")
2. ✅ Should clear previous data
3. ✅ Should populate form with application data
4. ✅ Should show warning "Invoice Not Created Yet"
5. ✅ Should show "Generate Invoice" and "Generate Receipt" buttons

### Test 2: Generate Invoice
1. Search application code
2. Select payment mode
3. Click "Generate Invoice"
4. ✅ Should create invoice
5. ✅ Should show success message with invoice code
6. ✅ Should reload and show invoice data (green)
7. ✅ Buttons should disappear

### Test 3: Generate Receipt
1. Search application code or invoice code
2. Select payment mode
3. Click "Generate Receipt"
4. ✅ Should create receipt
5. ✅ Should show success message with receipt code

### Test 4: Switch Between Codes
1. Search "00123" (invoice) - should show invoice
2. Search "7977-0" (application) - should clear and show application
3. ✅ Previous invoice data should NOT remain
4. ✅ Form should clear completely before new data loads

---

## Error Handling

The Redux slice handles these errors:
- ✅ 404: Invoice/Application not found
- ✅ 409: Duplicate invoice
- ✅ Network errors
- ✅ Validation errors

Errors are displayed via toast notifications automatically.

---

## Summary

### What Happens Now:

1. **User Enters Application Code**
   - Redux fetches data from `/api/invoices/:code`
   - Form clears completely
   - Form populates with new data

2. **If Application Data** (`isApplicationData: true`)
   - Shows yellow warning box
   - Shows "Generate Invoice" and "Generate Receipt" buttons
   - User can create invoice and/or receipt

3. **If Invoice Data** (`isInvoice: true`)
   - Shows green success indicator  
   - No generate buttons
   - Shows existing invoice details

4. **Form Always Clears**
   - When input changes
   - Before new data loads
   - No stale data remains

---

## Files Modified/Created

1. ✅ `src/store/invoiceSlice.ts` - Created (Redux slice)
2. ✅ `src/store/index.ts` - Updated (added invoice reducer)
3. 📝 `src/pages/InvoiceAndReceiptPage.tsx` - To be updated (follow steps above)

---

**Next Step:** Follow the step-by-step guide above to update `InvoiceAndReceiptPage.tsx`

