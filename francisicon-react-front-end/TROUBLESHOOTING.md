# Troubleshooting Guide - Invoice & Receipt Feature

## 🔧 Common Issues and Solutions

---

## ❌ Issue 1: "Buttons are not showing"

### Symptoms:
- Enter application code and click "View Data"
- Form populates but no "Generate Invoice" buttons appear

### Possible Causes & Solutions:

#### 1. Backend not returning `canCreateInvoice: true`
**Check**:
```javascript
// Open browser console (F12)
// Look for the API response:
GET /api/invoices/7977-0

// Response should include:
{
  "isApplicationData": true,
  "isInvoice": false,
  "hasInvoice": false,
  "canCreateInvoice": true  // ← This MUST be true
}
```

**Solution**: If `canCreateInvoice` is `false`, check backend `getInvoiceByCode` function

#### 2. Invoice already exists
**Check**: Look for `isInvoice: true` in the response

**Solution**: This is expected behavior. Once an invoice exists, the buttons should NOT appear.

#### 3. Redux state not updating
**Check**: Open Redux DevTools
- Look for `invoice` state
- Check `currentData` object
- Verify flags are present

**Solution**: Refresh the page and try again

---

## ❌ Issue 2: "Form is not populating"

### Symptoms:
- Click "View Data"
- Loading spinner appears
- Form remains empty

### Possible Causes & Solutions:

#### 1. API returns empty or invalid data
**Check**:
```javascript
// Browser console
// Look for:
console.log('[currentData]:', currentData);
```

**Solution**: Verify backend is returning proper data structure

#### 2. useEffect not triggering
**Check**: 
- Open browser console
- Add temporary console.log in useEffect
- Reload and check if it fires

**Solution**: Ensure `currentData` has values

#### 3. Field mapping error
**Check**: Individual fields like:
```javascript
currentData.customerName  // → should map to payeeName
currentData.code          // → should map to invoiceNumber
currentData.address       // → should parse and set address fields
```

**Solution**: Check field names match between API response and component

---

## ❌ Issue 3: "Yellow/Green banners not appearing"

### Symptoms:
- Data loads correctly
- But no colored warning/success banners

### Possible Causes & Solutions:

#### 1. Icons not imported
**Check**: Top of `InvoiceAndReceiptPage.tsx`
```typescript
import { 
  PrinterIcon, 
  EyeIcon, 
  LoaderIcon, 
  AlertTriangle,   // ← Must be present
  CheckCircle,     // ← Must be present
  FileText         // ← Must be present
} from 'lucide-react';
```

**Solution**: Add missing imports

#### 2. Conditional rendering issue
**Check**: Console for errors
```javascript
// Look for errors like:
// "Cannot read property 'isApplicationData' of null"
```

**Solution**: Ensure `currentData` is not null before rendering

---

## ❌ Issue 4: "Generate Invoice button does nothing"

### Symptoms:
- Click "Generate Invoice"
- No loading spinner
- No error message
- Nothing happens

### Possible Causes & Solutions:

#### 1. Handler not connected
**Check**: Button's `onClick` prop
```typescript
<button
  onClick={handleGenerateInvoice}  // ← Must be present
  ...
>
```

**Solution**: Verify handler is correctly attached

#### 2. Payment mode not selected
**Check**: 
```typescript
if (!paymentMode || paymentMode.trim() === '') {
  // Button should be disabled
}
```

**Solution**: Select a payment mode from dropdown

#### 3. Missing Redux dispatch
**Check**: Console for Redux actions
```javascript
// Should see:
invoice/createInvoice/pending
invoice/createInvoice/fulfilled  // or rejected
```

**Solution**: Ensure `dispatch(createInvoice(...))` is called

---

## ❌ Issue 5: "Error: Invalid column name 'Category'"

### Symptoms:
- Backend error in logs
- "Invalid column name 'Category'" or "Invalid column name 'Status'"

### Solution:
✅ **This was already fixed!** The backend no longer queries these columns.

If you still see this error:
1. Check you're using the latest backend code
2. Restart the backend server
3. Clear any cached queries

---

## ❌ Issue 6: "Form doesn't clear when changing application number"

### Symptoms:
- Enter application code "7977-0"
- Load data
- Change to "8888-0"
- Old data still visible

### Solution:

**Check**: `handleApplicationNumberChange` is being called
```typescript
<input
  value={applicationNumber}
  onChange={(e) => handleApplicationNumberChange(e.target.value)}
  // NOT: onChange={(e) => setApplicationNumber(e.target.value)}
/>
```

**Fix**: Use `handleApplicationNumberChange` instead of direct `setApplicationNumber`

---

## ❌ Issue 7: "Buttons stay visible after invoice created"

### Symptoms:
- Generate invoice successfully
- Success message appears
- But buttons don't disappear

### Solution:

**Check**: Conditional rendering logic
```typescript
{currentData && 
 currentData.canCreateInvoice && 
 !currentData.isInvoice &&  // ← This should become true after invoice created
 (
   // Buttons
 )}
```

**Fix**: Ensure `fetchInvoiceOrApplication` is re-called after invoice creation to update flags

---

## 🔍 Debug Checklist

Use this checklist to diagnose issues:

### Frontend Checks
- [ ] Redux DevTools shows `invoice` state
- [ ] `currentData` is populated in Redux
- [ ] All flags present (`isApplicationData`, `isInvoice`, `hasInvoice`, `canCreateInvoice`)
- [ ] Browser console shows no errors
- [ ] Network tab shows successful API calls
- [ ] React DevTools shows component props updated

### Backend Checks
- [ ] Backend server running on correct port
- [ ] Database connection established
- [ ] `/api/invoices/:code` endpoint returns flags
- [ ] No SQL errors in backend logs
- [ ] Authentication token valid

### Component Checks
- [ ] All imports correct (`lucide-react` icons)
- [ ] Redux hooks initialized (`useDispatch`, `useSelector`)
- [ ] Handlers defined (`handleGenerateInvoice`, etc.)
- [ ] useEffect dependencies correct
- [ ] Conditional rendering logic correct

---

## 🛠️ Debugging Tools

### 1. Redux DevTools
```
Open: F12 → Redux tab
Check: 
- State → invoice → currentData
- Actions → invoice/fetchInvoiceOrApplication/fulfilled
```

### 2. React DevTools
```
Open: F12 → Components tab
Find: InvoiceAndReceiptPage
Check: Props and State
```

### 3. Network Tab
```
Open: F12 → Network tab
Filter: XHR
Look for:
- GET /api/invoices/7977-0
- POST /api/invoices
- POST /api/receipts/from-invoice
```

### 4. Console Logging
Add temporary logs:
```typescript
// In InvoiceAndReceiptPage.tsx
useEffect(() => {
  console.log('[DEBUG] currentData:', currentData);
  console.log('[DEBUG] flags:', {
    isApplicationData: currentData?.isApplicationData,
    isInvoice: currentData?.isInvoice,
    hasInvoice: currentData?.hasInvoice,
    canCreateInvoice: currentData?.canCreateInvoice
  });
}, [currentData]);
```

---

## 🚨 Critical Errors

### "Cannot read property of undefined"
**Meaning**: Accessing property on null/undefined object
**Solution**: Add optional chaining (`?.`) or null checks

### "Maximum update depth exceeded"
**Meaning**: Infinite re-render loop in useEffect
**Solution**: Check useEffect dependencies

### "Actions must be plain objects"
**Meaning**: Redux async action not properly configured
**Solution**: Ensure using `createAsyncThunk` correctly

---

## 📞 Getting Help

If issue persists:

1. **Check backend logs**:
   ```bash
   # Look for errors in backend console
   # Common errors: SQL errors, missing columns, auth errors
   ```

2. **Check frontend console**:
   ```bash
   # Look for errors in browser console
   # Common errors: undefined properties, API errors, Redux errors
   ```

3. **Verify data flow**:
   ```
   API Response → Redux Action → Redux State → Component Props → UI Render
   ```

4. **Test with known working code**:
   - Application code: `7977-0` (should have application data)
   - Invoice code: `00123` (should have invoice data, if exists)

---

## ✅ Verification Script

Run this in browser console to verify setup:

```javascript
// Check Redux store
console.log('Redux Store:', window.store.getState());

// Check invoice state
console.log('Invoice State:', window.store.getState().invoice);

// Check current data
console.log('Current Data:', window.store.getState().invoice.currentData);

// Check flags
const data = window.store.getState().invoice.currentData;
if (data) {
  console.log('Flags:', {
    isApplicationData: data.isApplicationData,
    isInvoice: data.isInvoice,
    hasInvoice: data.hasInvoice,
    canCreateInvoice: data.canCreateInvoice
  });
}
```

---

## 📝 Known Limitations

1. **Payment mode required**: Must be selected before generating documents
2. **Single invoice per application**: Cannot create duplicate invoices
3. **Auto-clear on code change**: Form clears when application number changes
4. **Print requires data**: Must load data before printing

---

**Most issues can be resolved by checking Redux state and API responses!** 🔍

