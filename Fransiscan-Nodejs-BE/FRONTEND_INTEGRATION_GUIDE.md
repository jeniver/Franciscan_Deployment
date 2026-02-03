# Frontend Integration Guide: Invoice Lookup with Application Fallback

## Overview

This guide explains how to integrate the enhanced `getInvoiceByCode` API endpoint in your frontend application. The endpoint now returns either **invoice data** or **application data** with clear flags to differentiate between them.

---

## Key Problem Solved

### Before:
- When switching between codes, previous invoice details remained visible
- No clear way to know if response is an invoice or application
- No guidance on when to show "Create Invoice" button

### After:
- Clear flags indicate response type (`isInvoice` vs `isApplicationData`)
- Frontend can properly clear previous data
- Clear indication when to show "Create Invoice" button

---

## Response Flags (CRITICAL)

Every response from `GET /api/invoices/:code` includes these flags:

| Flag | Type | Description |
|------|------|-------------|
| `isApplicationData` | boolean | `true` = Application data, `false` = Invoice data |
| `isInvoice` | boolean | `true` = Invoice exists, `false` = No invoice |
| `hasInvoice` | boolean | `true` = Invoice exists, `false` = No invoice |
| `canCreateInvoice` | boolean | `true` = Show create button, `false` = Don't show |
| `invoiceId` | number\|null | Invoice ID if exists, `null` if application |
| `code` | string\|null | Invoice code if exists, `null` if application |

---

## Response Types

### Type 1: Invoice Found (Existing Invoice)

```json
{
  "isApplicationData": false,
  "isInvoice": true,
  "hasInvoice": true,
  "canCreateInvoice": false,
  
  "invoiceId": 12345,
  "code": "00123",
  "customerName": "John Doe",
  "totalAmount": 7000.00,
  "details": [
    {
      "itemId": 6,
      "itemName": "Niche Level 6",
      "unitAmount": 7000.00
    }
  ],
  "summary": {
    "totalItems": 1,
    "grandTotal": 7000.00
  }
}
```

**Frontend Action:**
- ✅ Show invoice details
- ✅ Show invoice code and ID
- ❌ Don't show "Create Invoice" button (already exists)
- ✅ Show edit/cancel invoice options

### Type 2: Application Found (No Invoice Yet)

```json
{
  "isApplicationData": true,
  "isInvoice": false,
  "hasInvoice": false,
  "canCreateInvoice": true,
  
  "invoiceId": null,
  "code": null,
  "applicationCode": "7977-0",
  "customerName": "John Doe",
  "totalAmount": 7000.00,
  "niche": {
    "nicheCode": "N-123",
    "wallName": "Memorial Wall A",
    "chapelName": "Chapel of Peace"
  },
  "details": [
    {
      "itemId": 6,
      "itemName": "Niche Level 6",
      "unitAmount": 7000.00
    }
  ],
  "summary": {
    "totalItems": 1,
    "grandTotal": 7000.00
  }
}
```

**Frontend Action:**
- ✅ Show application details
- ✅ Show application code (not invoice code)
- ✅ **Show "Create Invoice" button** ⬅️ IMPORTANT
- ✅ Show niche/wall/chapel information
- ✅ Pre-fill invoice creation form with this data

### Type 3: Not Found

```json
null
```

**Frontend Action:**
- ✅ Clear all previous data
- ✅ Show "Not Found" message
- ❌ Don't show any buttons

---

## Frontend Implementation Steps

### Step 1: Create Type Definitions (TypeScript)

```typescript
// types/invoice.ts

export interface InvoiceFlags {
  isApplicationData: boolean;
  isInvoice: boolean;
  hasInvoice: boolean;
  canCreateInvoice: boolean;
}

export interface InvoiceDetail {
  invoiceDetailId?: number | null;
  invoiceId?: number | null;
  itemId: number;
  itemName: string;
  itemCode: string | null;
  itemPrice: number;
  itemDocType?: string | null;
  itemIsRefType?: boolean;
  quantity: number;
  unitAmount: number;
  payingAmount: number;
  totalPayingAmount: number;
  refDocNumber: string;
  refDocName: string;
  refType: string;
  lineTotalAmount: number;
  lineTaxPercent: number;
  lineTaxAmount: number;
}

export interface NicheInfo {
  nicheId: number;
  nicheCode: string;
  nichePrice: number;
  nicheLevel: number;
  rowCode: string;
  rowPrice: number;
  wallId: number;
  wallCode: string;
  wallName: string;
  chapelId: number;
  chapelCode: string;
  chapelName: string;
}

export interface BookingInfo {
  nicheBookingId: number;
  nicheId: number;
  nicheApplicationId: number;
  bookedDate: string;
  bookingStatus: number;
  bookingRemarks: string | null;
  contactPersonName: string;
  nomineeName: string;
}

export interface InvoiceResponse extends InvoiceFlags {
  // Invoice/Application ID
  invoiceId: number | null;
  code: string | null;
  applicationCode?: string;
  nicheApplicationId?: number;
  
  // Customer Info
  customerName: string;
  applicantIDNo?: string;
  applicantEmail?: string;
  applicantMobile?: string;
  
  // Address
  addressNo?: string;
  address?: string;
  address2?: string;
  addressCity?: string;
  districtCode?: string;
  country?: string;
  
  // Financial
  totalAmount: number;
  payingAmount: number;
  taxAmount: number;
  taxPercentage: number;
  taxCode: string | null;
  
  // System
  userId: number;
  churchId: number;
  status: number;
  transactionDate: string;
  
  // Niche Info (only in application data)
  niche?: NicheInfo | null;
  
  // Booking Info (only in application data)
  booking?: BookingInfo | null;
  
  // Details
  details: InvoiceDetail[];
  
  // Summary
  summary: {
    totalItems: number;
    subtotal: number;
    totalTax: number;
    grandTotal: number;
  };
}
```

### Step 2: Create Invoice Service

```typescript
// services/invoiceService.ts

import axios from 'axios';
import { InvoiceResponse } from '../types/invoice';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

export class InvoiceService {
  /**
   * Search for invoice or application by code
   */
  static async searchByCode(code: string): Promise<InvoiceResponse | null> {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/invoices/${code}`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }
  
  /**
   * Create invoice from application data
   */
  static async createInvoice(invoiceData: any): Promise<any> {
    const response = await axios.post(`${API_BASE_URL}/api/invoices`, invoiceData);
    return response.data;
  }
}
```

### Step 3: Create Invoice Display Component

```typescript
// components/InvoiceDisplay.tsx

import React from 'react';
import { InvoiceResponse } from '../types/invoice';

interface InvoiceDisplayProps {
  data: InvoiceResponse;
  onCreateInvoice?: (data: InvoiceResponse) => void;
  onEditInvoice?: (invoiceId: number) => void;
  onCancelInvoice?: (invoiceId: number) => void;
}

export const InvoiceDisplay: React.FC<InvoiceDisplayProps> = ({
  data,
  onCreateInvoice,
  onEditInvoice,
  onCancelInvoice
}) => {
  // Render application data (no invoice created yet)
  if (data.isApplicationData) {
    return (
      <div className="application-view">
        <div className="status-badge warning">
          ⚠️ Invoice Not Created
        </div>
        
        <h2>Application Details</h2>
        
        <div className="info-section">
          <h3>Application Code: {data.applicationCode}</h3>
          <p><strong>Customer:</strong> {data.customerName}</p>
          <p><strong>Mobile:</strong> {data.applicantMobile}</p>
          <p><strong>Email:</strong> {data.applicantEmail}</p>
        </div>
        
        {data.niche && (
          <div className="niche-section">
            <h3>Niche Information</h3>
            <p><strong>Niche Code:</strong> {data.niche.nicheCode}</p>
            <p><strong>Wall:</strong> {data.niche.wallName}</p>
            <p><strong>Chapel:</strong> {data.niche.chapelName}</p>
            <p><strong>Level:</strong> {data.niche.nicheLevel}</p>
            <p><strong>Price:</strong> ${data.niche.nichePrice.toFixed(2)}</p>
          </div>
        )}
        
        <div className="items-section">
          <h3>Items</h3>
          {data.details.map((item, index) => (
            <div key={index} className="item-row">
              <span>{item.itemName}</span>
              <span>Qty: {item.quantity}</span>
              <span>${item.unitAmount.toFixed(2)}</span>
            </div>
          ))}
        </div>
        
        <div className="summary-section">
          <h3>Total: ${data.summary.grandTotal.toFixed(2)}</h3>
        </div>
        
        {data.canCreateInvoice && onCreateInvoice && (
          <button 
            className="btn-primary btn-large"
            onClick={() => onCreateInvoice(data)}
          >
            📄 Create Invoice
          </button>
        )}
      </div>
    );
  }
  
  // Render invoice data (invoice exists)
  return (
    <div className="invoice-view">
      <div className="status-badge success">
        ✅ Invoice Created
      </div>
      
      <h2>Invoice Details</h2>
      
      <div className="info-section">
        <h3>Invoice Code: {data.code}</h3>
        <p><strong>Invoice ID:</strong> {data.invoiceId}</p>
        <p><strong>Customer:</strong> {data.customerName}</p>
        <p><strong>Date:</strong> {new Date(data.transactionDate).toLocaleDateString()}</p>
      </div>
      
      <div className="items-section">
        <h3>Items</h3>
        {data.details.map((item, index) => (
          <div key={index} className="item-row">
            <span>{item.itemName}</span>
            <span>Qty: {item.quantity}</span>
            <span>${item.unitAmount.toFixed(2)}</span>
          </div>
        ))}
      </div>
      
      <div className="summary-section">
        <h3>Total: ${data.summary.grandTotal.toFixed(2)}</h3>
      </div>
      
      <div className="action-buttons">
        {onEditInvoice && (
          <button 
            className="btn-secondary"
            onClick={() => onEditInvoice(data.invoiceId!)}
          >
            ✏️ Edit Invoice
          </button>
        )}
        {onCancelInvoice && (
          <button 
            className="btn-danger"
            onClick={() => onCancelInvoice(data.invoiceId!)}
          >
            ❌ Cancel Invoice
          </button>
        )}
      </div>
    </div>
  );
};
```

### Step 4: Create Invoice Search Component

```typescript
// components/InvoiceSearch.tsx

import React, { useState } from 'react';
import { InvoiceService } from '../services/invoiceService';
import { InvoiceDisplay } from './InvoiceDisplay';
import { InvoiceResponse } from '../types/invoice';

export const InvoiceSearch: React.FC = () => {
  const [searchCode, setSearchCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<InvoiceResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const handleSearch = async () => {
    if (!searchCode.trim()) {
      setError('Please enter a code');
      return;
    }
    
    setLoading(true);
    setError(null);
    setData(null); // CRITICAL: Clear previous data
    
    try {
      const result = await InvoiceService.searchByCode(searchCode.trim());
      
      if (result === null) {
        setError(`No invoice or application found for code: ${searchCode}`);
      } else {
        setData(result);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to search');
    } finally {
      setLoading(false);
    }
  };
  
  const handleCreateInvoice = async (applicationData: InvoiceResponse) => {
    // Prepare invoice payload from application data
    const invoicePayload = {
      invoice: {
        transactionDate: new Date().toISOString(),
        refDocNumber: applicationData.refDocNumber,
        refDocName: applicationData.refDocName,
        customerName: applicationData.customerName,
        totalAmount: applicationData.totalAmount,
        payingAmount: applicationData.payingAmount,
        taxAmount: applicationData.taxAmount,
        taxPercentage: applicationData.taxPercentage,
        taxCode: applicationData.taxCode,
        nicheApplicationId: applicationData.nicheApplicationId,
        addressNo: applicationData.addressNo,
        address: applicationData.address,
        address2: applicationData.address2,
        addressCity: applicationData.addressCity,
        districtCode: applicationData.districtCode,
        country: applicationData.country
      },
      invoiceDetails: applicationData.details.map(detail => ({
        itemId: detail.itemId,
        quantity: detail.quantity,
        unitAmount: detail.unitAmount,
        payingAmount: detail.payingAmount,
        totalPayingAmount: detail.totalPayingAmount,
        refDocNumber: detail.refDocNumber,
        refDocName: detail.refDocName,
        lineTotalAmount: detail.lineTotalAmount,
        lineTaxPercent: detail.lineTaxPercent,
        lineTaxAmount: detail.lineTaxAmount
      })),
      createReceipt: false
    };
    
    try {
      setLoading(true);
      const result = await InvoiceService.createInvoice(invoicePayload);
      
      // Success! Refresh the data to show the created invoice
      if (result.success) {
        await handleSearch(); // Reload to get the created invoice
        alert('Invoice created successfully!');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create invoice');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="invoice-search">
      <div className="search-bar">
        <input
          type="text"
          value={searchCode}
          onChange={(e) => setSearchCode(e.target.value)}
          placeholder="Enter invoice or application code"
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
        />
        <button onClick={handleSearch} disabled={loading}>
          {loading ? 'Searching...' : 'Search'}
        </button>
      </div>
      
      {error && (
        <div className="error-message">
          ❌ {error}
        </div>
      )}
      
      {data && (
        <InvoiceDisplay
          data={data}
          onCreateInvoice={handleCreateInvoice}
          onEditInvoice={(id) => console.log('Edit invoice:', id)}
          onCancelInvoice={(id) => console.log('Cancel invoice:', id)}
        />
      )}
    </div>
  );
};
```

### Step 5: CSS Styling

```css
/* styles/invoice.css */

.application-view,
.invoice-view {
  padding: 20px;
  border-radius: 8px;
  margin: 20px 0;
}

.application-view {
  background: #fff3cd;
  border: 2px solid #ffc107;
}

.invoice-view {
  background: #d4edda;
  border: 2px solid #28a745;
}

.status-badge {
  display: inline-block;
  padding: 8px 16px;
  border-radius: 4px;
  font-weight: bold;
  margin-bottom: 16px;
}

.status-badge.warning {
  background: #ffc107;
  color: #856404;
}

.status-badge.success {
  background: #28a745;
  color: white;
}

.info-section,
.niche-section,
.items-section,
.summary-section {
  margin: 16px 0;
  padding: 12px;
  background: white;
  border-radius: 4px;
}

.item-row {
  display: flex;
  justify-content: space-between;
  padding: 8px;
  border-bottom: 1px solid #eee;
}

.btn-primary {
  background: #007bff;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  font-weight: bold;
}

.btn-primary:hover {
  background: #0056b3;
}

.btn-large {
  width: 100%;
  padding: 16px;
  font-size: 18px;
  margin-top: 20px;
}

.action-buttons {
  display: flex;
  gap: 12px;
  margin-top: 20px;
}

.error-message {
  padding: 12px;
  background: #f8d7da;
  color: #721c24;
  border-radius: 4px;
  margin: 16px 0;
}
```

---

## Key Points for Frontend Developers

### 1. **Always Clear Previous Data**

```typescript
// ❌ BAD - Previous data remains
const handleSearch = () => {
  const result = await searchInvoice(code);
  setData(result);
}

// ✅ GOOD - Clear first, then set new data
const handleSearch = () => {
  setData(null); // Clear previous data
  setError(null); // Clear previous errors
  const result = await searchInvoice(code);
  setData(result);
}
```

### 2. **Check Flags Before Rendering**

```typescript
// ✅ Proper flag checking
if (data.isInvoice) {
  // Show invoice UI
  return <InvoiceView data={data} />;
}

if (data.isApplicationData) {
  // Show application UI with create button
  return <ApplicationView data={data} onCreateInvoice={handleCreate} />;
}

// Neither flag - something wrong
return <ErrorView />;
```

### 3. **Show Create Button Only When Appropriate**

```typescript
// ✅ Show button only when allowed
{data.canCreateInvoice && (
  <button onClick={() => createInvoice(data)}>
    Create Invoice
  </button>
)}
```

### 4. **Handle All Three States**

```typescript
// State 1: Loading
if (loading) return <LoadingSpinner />;

// State 2: Error
if (error) return <ErrorMessage message={error} />;

// State 3: No data
if (!data) return <EmptyState />;

// State 4: Has data
if (data.isInvoice) {
  return <InvoiceDisplay data={data} />;
} else if (data.isApplicationData) {
  return <ApplicationDisplay data={data} />;
}
```

---

## Testing Checklist

### Test Case 1: Search Existing Invoice
```
1. Search code "00123" (existing invoice)
2. ✅ Should show invoice data
3. ✅ Should NOT show "Create Invoice" button
4. ✅ Should show invoice code and ID
```

### Test Case 2: Search Application (No Invoice)
```
1. Search code "7977-0" (application code)
2. ✅ Should show application data
3. ✅ Should show "Create Invoice" button
4. ✅ Should show niche/wall/chapel info
5. ✅ Should NOT show invoice code/ID
```

### Test Case 3: Switch Between Codes
```
1. Search "00123" (invoice) - should show invoice
2. Search "7977-0" (application) - should clear invoice and show application
3. Search "00456" (different invoice) - should clear application and show new invoice
4. ✅ Previous data should NOT remain visible
```

### Test Case 4: Create Invoice from Application
```
1. Search "7977-0" (application)
2. Click "Create Invoice"
3. ✅ Should create invoice
4. ✅ Should refresh and show created invoice
5. ✅ "Create Invoice" button should disappear
```

### Test Case 5: Not Found
```
1. Search "99999-99" (doesn't exist)
2. ✅ Should show "Not Found" message
3. ✅ Should clear all previous data
4. ✅ Should NOT show any buttons
```

---

## API Endpoint Reference

### GET /api/invoices/:code

**Request:**
```
GET /api/invoices/7977-0
```

**Response (Application):**
```json
{
  "isApplicationData": true,
  "isInvoice": false,
  "hasInvoice": false,
  "canCreateInvoice": true,
  "invoiceId": null,
  "code": null,
  "applicationCode": "7977-0",
  "customerName": "John Doe",
  "totalAmount": 7000.00,
  "niche": { ... },
  "details": [ ... ],
  "summary": { ... }
}
```

**Response (Invoice):**
```json
{
  "isApplicationData": false,
  "isInvoice": true,
  "hasInvoice": true,
  "canCreateInvoice": false,
  "invoiceId": 12345,
  "code": "00123",
  "customerName": "John Doe",
  "totalAmount": 7000.00,
  "details": [ ... ],
  "summary": { ... }
}
```

**Response (Not Found):**
```
Status: 404
Body: null
```

### POST /api/invoices

**Request:**
```json
{
  "invoice": {
    "refDocNumber": "7977-0",
    "refDocName": "NAPP",
    "customerName": "John Doe",
    "totalAmount": 7000.00,
    "nicheApplicationId": 123
  },
  "invoiceDetails": [
    {
      "itemId": 6,
      "quantity": 1,
      "unitAmount": 7000.00,
      "refDocNumber": "7977-0",
      "refDocName": "NAPP"
    }
  ],
  "createReceipt": false
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "invoiceId": 12345,
    "invoiceCode": "00123"
  },
  "message": "Invoice created successfully"
}
```

---

## Common Pitfalls to Avoid

### ❌ Don't: Assume response is always invoice
```typescript
// BAD
const data = await searchInvoice(code);
console.log(data.invoiceId); // Could be null!
```

### ✅ Do: Check flags first
```typescript
// GOOD
const data = await searchInvoice(code);
if (data.isInvoice) {
  console.log(data.invoiceId);
} else {
  console.log(data.applicationCode);
}
```

### ❌ Don't: Forget to clear previous data
```typescript
// BAD - previous invoice remains visible
setData(newData);
```

### ✅ Do: Clear before setting
```typescript
// GOOD
setData(null);
setData(newData);
```

### ❌ Don't: Show create button for invoices
```typescript
// BAD
<button onClick={createInvoice}>Create Invoice</button>
```

### ✅ Do: Check canCreateInvoice flag
```typescript
// GOOD
{data.canCreateInvoice && (
  <button onClick={createInvoice}>Create Invoice</button>
)}
```

---

## Summary

### Backend Changes:
✅ Added 4 clear flags to every response
✅ `isApplicationData` - Is this application data?
✅ `isInvoice` - Is this an actual invoice?
✅ `hasInvoice` - Does invoice exist?
✅ `canCreateInvoice` - Should show create button?

### Frontend Requirements:
✅ Always clear previous data before new search
✅ Check flags to determine what to display
✅ Show "Create Invoice" button only when `canCreateInvoice: true`
✅ Pre-fill invoice form with application data
✅ Handle all three states (invoice, application, not found)

### Result:
✅ No more stale data when switching codes
✅ Clear indication of response type
✅ Proper UI for each state
✅ Seamless invoice creation from applications

---

**Version:** 1.0.0  
**Last Updated:** January 30, 2026  
**Status:** ✅ Production Ready

