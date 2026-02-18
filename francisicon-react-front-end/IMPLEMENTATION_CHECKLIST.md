# Implementation Checklist

## ✅ Completed (Backend & Redux)

- [x] Backend: Added flags to invoice/application response
  - `isApplicationData`, `isInvoice`, `hasInvoice`, `canCreateInvoice`
- [x] Backend: Database column fixes
- [x] Frontend: Created `invoiceSlice.ts` with Redux
- [x] Frontend: Added invoice reducer to store
- [x] Frontend: Created comprehensive integration guide

---

## 📝 TODO: Update InvoiceAndReceiptPage.tsx

Follow these steps in order:

### Step 1: Add Imports ⏱️ 2 minutes
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

### Step 2: Add Redux Hooks ⏱️ 1 minute
```typescript
const dispatch = useDispatch<AppDispatch>();
const { 
  currentData, 
  creatingInvoice, 
  creatingReceipt,
  createInvoiceSuccess,
  lastCreatedInvoiceCode
} = useSelector((state: RootState) => state.invoice);
```

### Step 3: Update Application Number Handler ⏱️ 5 minutes
- Clear previous data when input changes
- Fetch new data when code entered
- Use `dispatch(fetchInvoiceOrApplication(code))`

### Step 4: Add useEffect for Form Population ⏱️ 10 minutes
- Clear form when `currentData` changes
- Populate form from `currentData.details`
- Handle both invoice and application data

### Step 5: Add Generate Invoice Function ⏱️ 5 minutes
- Build `CreateInvoicePayload` from `currentData`
- Call `dispatch(createInvoice(payload))`
- Show success/error messages

### Step 6: Add Generate Receipt Function ⏱️ 5 minutes
- Build `CreateReceiptPayload` from `currentData`
- Call `dispatch(createReceipt(payload))`
- Show success/error messages

### Step 7: Add Buttons to JSX ⏱️ 5 minutes
- Show buttons when `currentData.canCreateInvoice === true`
- Show warning "Invoice Not Created Yet"
- Add loading states to buttons

### Step 8: Test Everything ⏱️ 10 minutes
- Test with application code
- Test with invoice code
- Test switching between codes
- Test creating invoice
- Test creating receipt

---

## Total Estimated Time: ~45 minutes

---

## Quick Reference: Key Code Snippets

### Check if Application Data
```typescript
if (currentData?.isApplicationData) {
  // This is application - show create buttons
}
```

### Check if Invoice
```typescript
if (currentData?.isInvoice) {
  // This is invoice - don't show create buttons
}
```

### Fetch Data
```typescript
await dispatch(fetchInvoiceOrApplication(code)).unwrap();
```

### Create Invoice
```typescript
const payload: CreateInvoicePayload = { /* ... */ };
await dispatch(createInvoice(payload)).unwrap();
```

### Create Receipt
```typescript
const payload: CreateReceiptPayload = { /* ... */ };
await dispatch(createReceipt(payload)).unwrap();
```

### Clear Data
```typescript
dispatch(clearCurrentData());
```

---

## Files to Modify

### Frontend Files
1. `src/pages/InvoiceAndReceiptPage.tsx` ⬅️ MAIN FILE TO UPDATE
   - Follow steps 1-8 above
   - See `INVOICE_RECEIPT_INTEGRATION_GUIDE.md` for detailed code

---

## Testing Scenarios

### Scenario 1: Application → Invoice Creation
```
1. Enter "7977-0" (application)
2. Form populates with application data
3. Yellow warning shows "Invoice Not Created Yet"
4. Click "Generate Invoice"
5. Success! Invoice code shows
6. Form reloads showing invoice (green)
7. Buttons disappear
```

### Scenario 2: Switch Codes
```
1. Enter "00123" (invoice)
2. Shows invoice data (green)
3. Enter "7977-0" (application)
4. Form clears completely ⬅️ IMPORTANT
5. Shows application data (yellow)
6. No previous invoice data visible
```

### Scenario 3: Create Receipt
```
1. Enter any code (invoice or application)
2. Select payment mode
3. Click "Generate Receipt"
4. Success! Receipt code shows
```

---

## Common Issues & Solutions

### Issue: Form not clearing when switching codes
**Solution:** Make sure `useEffect` calls `clearFormFields()` before populating

### Issue: Buttons not showing for application
**Solution:** Check `currentData?.canCreateInvoice === true`

### Issue: "Payment mode required" error
**Solution:** Make sure `paymentMode` state is set before generating

### Issue: Previous data still visible
**Solution:** Call `dispatch(clearCurrentData())` when input changes

---

## Success Criteria

✅ Form clears when application number changes
✅ Form populates correctly from application data
✅ Warning shows when `isApplicationData: true`
✅ Generate buttons show when `canCreateInvoice: true`
✅ Invoice creates successfully
✅ Receipt creates successfully
✅ Success messages display
✅ Form reloads with new invoice after creation
✅ No previous data remains when switching codes

---

## Need Help?

See detailed code examples in:
- `INVOICE_RECEIPT_INTEGRATION_GUIDE.md` - Complete integration guide
- `FRONTEND_INTEGRATION_GUIDE.md` - Backend flag documentation
- `QUICK_REFERENCE_FLAGS.md` - Flag reference card

---

**Ready to implement?** Start with Step 1! 🚀

