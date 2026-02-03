# Quick Reference: Response Flags

## 🎯 Four Critical Flags

Every response from `GET /api/invoices/:code` now includes these 4 flags:

```typescript
{
  isApplicationData: boolean,  // Is this application data?
  isInvoice: boolean,          // Is this an invoice?
  hasInvoice: boolean,         // Does invoice exist?
  canCreateInvoice: boolean    // Should show create button?
}
```

---

## 📊 Flag Combinations

### Scenario 1: Invoice Found ✅

```json
{
  "isApplicationData": false,
  "isInvoice": true,
  "hasInvoice": true,
  "canCreateInvoice": false,
  
  "invoiceId": 12345,
  "code": "00123"
}
```

**Frontend Action:**
- ✅ Show invoice UI (green background)
- ✅ Show invoice code and ID
- ❌ Don't show "Create Invoice" button
- ✅ Show "Edit" and "Cancel" buttons

---

### Scenario 2: Application Found (No Invoice) ⚠️

```json
{
  "isApplicationData": true,
  "isInvoice": false,
  "hasInvoice": false,
  "canCreateInvoice": true,
  
  "invoiceId": null,
  "code": null,
  "applicationCode": "7977-0"
}
```

**Frontend Action:**
- ✅ Show application UI (yellow background)
- ✅ Show warning "Invoice Not Created"
- ✅ **Show "Create Invoice" button** ⬅️ IMPORTANT
- ✅ Show niche/wall/chapel info
- ❌ Don't show invoice code/ID

---

### Scenario 3: Not Found ❌

```json
null
```

**Frontend Action:**
- ✅ Clear all previous data
- ✅ Show "Not Found" message
- ❌ Don't show any buttons

---

## 🚦 Decision Flow for Frontend

```
┌─────────────────┐
│   Search Code   │
└────────┬────────┘
         │
         ▼
    ┌────────┐
    │ Result │
    └───┬────┘
        │
        ├─ null ──────────────────────────┐
        │                                  ▼
        │                          ┌──────────────┐
        │                          │  Show Error  │
        │                          └──────────────┘
        │
        ├─ isInvoice = true ───────────────┐
        │                                   ▼
        │                          ┌──────────────────┐
        │                          │  Show Invoice UI │
        │                          │  ✅ Green        │
        │                          │  ❌ No Create Btn│
        │                          └──────────────────┘
        │
        └─ isApplicationData = true ───────┐
                                           ▼
                                  ┌────────────────────┐
                                  │ Show Application UI│
                                  │ ⚠️ Yellow          │
                                  │ ✅ Create Btn      │
                                  └────────────────────┘
```

---

## 💻 Frontend Code Template

### Check Flags (TypeScript)

```typescript
function renderInvoiceOrApplication(data: InvoiceResponse | null) {
  // 1. No data
  if (!data) {
    return <NotFoundMessage />;
  }
  
  // 2. Invoice exists
  if (data.isInvoice) {
    return (
      <div className="invoice-view">
        <h2>Invoice #{data.code}</h2>
        <p>ID: {data.invoiceId}</p>
        {/* No create button */}
      </div>
    );
  }
  
  // 3. Application (no invoice)
  if (data.isApplicationData) {
    return (
      <div className="application-view">
        <div className="warning">⚠️ Invoice Not Created</div>
        <h2>Application {data.applicationCode}</h2>
        
        {/* Show niche info */}
        {data.niche && (
          <div>
            <p>Niche: {data.niche.nicheCode}</p>
            <p>Wall: {data.niche.wallName}</p>
          </div>
        )}
        
        {/* Show create button */}
        {data.canCreateInvoice && (
          <button onClick={() => createInvoice(data)}>
            Create Invoice
          </button>
        )}
      </div>
    );
  }
  
  return <ErrorMessage />;
}
```

### Clear Previous Data

```typescript
async function searchInvoice(code: string) {
  // CRITICAL: Clear first!
  setData(null);
  setError(null);
  
  try {
    const response = await fetch(`/api/invoices/${code}`);
    const data = await response.json();
    setData(data);
  } catch (error) {
    setError(error.message);
  }
}
```

---

## 🎨 CSS Classes

```css
/* Invoice - Green */
.invoice-view {
  background: #d4edda;
  border: 2px solid #28a745;
}

/* Application - Yellow */
.application-view {
  background: #fff3cd;
  border: 2px solid #ffc107;
}

/* Create Button */
.btn-create-invoice {
  background: #007bff;
  color: white;
  padding: 12px 24px;
  width: 100%;
  font-size: 16px;
  font-weight: bold;
}
```

---

## ✅ Checklist

### Backend ✅
- [x] Added `isApplicationData` flag
- [x] Added `isInvoice` flag
- [x] Added `hasInvoice` flag
- [x] Added `canCreateInvoice` flag
- [x] Set `invoiceId = null` for applications
- [x] Set `code = null` for applications

### Frontend Todo 📝
- [ ] Check flags before rendering
- [ ] Clear previous data on new search
- [ ] Show green UI for invoices
- [ ] Show yellow UI for applications
- [ ] Show "Create Invoice" button when `canCreateInvoice = true`
- [ ] Hide "Create Invoice" button when `canCreateInvoice = false`
- [ ] Show niche/wall/chapel info for applications
- [ ] Implement createInvoice function
- [ ] Test switching between codes

---

## 🧪 Test Cases

```javascript
// Test 1: Invoice
const invoice = await searchCode("00123");
assert(invoice.isInvoice === true);
assert(invoice.isApplicationData === false);
assert(invoice.canCreateInvoice === false);
assert(invoice.invoiceId !== null);
assert(invoice.code !== null);

// Test 2: Application  
const app = await searchCode("7977-0");
assert(app.isApplicationData === true);
assert(app.isInvoice === false);
assert(app.canCreateInvoice === true);
assert(app.invoiceId === null);
assert(app.code === null);
assert(app.applicationCode !== null);

// Test 3: Not Found
const notFound = await searchCode("99999");
assert(notFound === null);
```

---

## 🎯 Quick Tips

### ✅ DO:
```typescript
// 1. Clear previous data
setData(null);

// 2. Check flags
if (data.isInvoice) { /* ... */ }

// 3. Show button conditionally
{data.canCreateInvoice && <button>Create</button>}
```

### ❌ DON'T:
```typescript
// 1. Assume it's always invoice
console.log(data.invoiceId); // Could be null!

// 2. Forget to clear
setData(newData); // Old data still visible

// 3. Show button always
<button>Create Invoice</button> // Wrong!
```

---

## 📱 Mobile Responsive

```css
@media (max-width: 768px) {
  .invoice-view,
  .application-view {
    padding: 12px;
    margin: 10px;
  }
  
  .btn-create-invoice {
    font-size: 14px;
    padding: 10px 20px;
  }
}
```

---

## 🔗 Related Files

- **Backend Implementation:** `src/repositories/InvoiceRepository.js`
- **Frontend Guide:** `FRONTEND_INTEGRATION_GUIDE.md`
- **Step-by-Step:** `IMPLEMENTATION_STEP_BY_STEP.md`
- **Bug Fixes:** `BUGFIX_ITEM_TABLE_COLUMNS.md`

---

**Print this page and keep it at your desk!** 📄✨

