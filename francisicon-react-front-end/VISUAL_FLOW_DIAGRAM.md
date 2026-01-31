# Visual Flow Diagram

## 🎨 Complete System Architecture

```
┌────────────────────────────────────────────────────────────────────────────┐
│                              USER INTERFACE                                 │
│                       InvoiceAndReceiptPage.tsx                             │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │  INPUT: Application/Invoice Number                                   │  │
│  │  [_____________] 🔍                                                  │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                             ↓                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │  SCENARIO 1: Application Data (No Invoice)                          │  │
│  │  ┌──────────────────────────────────────────────────────────────┐  │  │
│  │  │ ⚠️  INVOICE NOT CREATED YET                                  │  │  │
│  │  │                                                               │  │  │
│  │  │  Applicant: John Doe                                         │  │  │
│  │  │  Application: 7977-0                                         │  │  │
│  │  │  Niche: A01-01 (St. Francis Wall)                           │  │  │
│  │  │  Amount: $5,000.00                                           │  │  │
│  │  │                                                               │  │  │
│  │  │  Payment Mode: [Cash ▼]                                      │  │  │
│  │  │                                                               │  │  │
│  │  │  [📄 Generate Invoice]  [🧾 Generate Receipt]               │  │  │
│  │  └──────────────────────────────────────────────────────────────┘  │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │  SCENARIO 2: Invoice Data (Invoice Exists)                          │  │
│  │  ┌──────────────────────────────────────────────────────────────┐  │  │
│  │  │ ✅ INVOICE LOADED                                            │  │  │
│  │  │                                                               │  │  │
│  │  │  Customer: John Doe                                          │  │  │
│  │  │  Invoice: 00123                                              │  │  │
│  │  │  Date: 30/01/2026                                            │  │  │
│  │  │  Amount: $5,000.00                                           │  │  │
│  │  │                                                               │  │  │
│  │  │  Payment Mode: Cash                                          │  │  │
│  │  │                                                               │  │  │
│  │  │  (No buttons - invoice already created)                      │  │  │
│  │  └──────────────────────────────────────────────────────────────┘  │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└────────────────────────────────────────────────────────────────────────────┘
                                    ↕
                              REDUX STATE
┌────────────────────────────────────────────────────────────────────────────┐
│                            Invoice Slice                                    │
├────────────────────────────────────────────────────────────────────────────┤
│  currentData: {                                                             │
│    isApplicationData: true/false,                                           │
│    isInvoice: true/false,                                                   │
│    hasInvoice: true/false,                                                  │
│    canCreateInvoice: true/false,                                            │
│    customerName: "...",                                                     │
│    details: [...]                                                           │
│  }                                                                          │
│  loading: false                                                             │
│  creatingInvoice: false                                                     │
│  creatingReceipt: false                                                     │
│  error: null                                                                │
└────────────────────────────────────────────────────────────────────────────┘
                                    ↕
                              REDUX ACTIONS
┌────────────────────────────────────────────────────────────────────────────┐
│  fetchInvoiceOrApplication(code)  →  GET /api/invoices/:code               │
│  createInvoice(payload)           →  POST /api/invoices                    │
│  createReceipt(payload)           →  POST /api/receipts/from-invoice       │
│  clearCurrentData()               →  Clear state                           │
└────────────────────────────────────────────────────────────────────────────┘
                                    ↕
                              BACKEND API
┌────────────────────────────────────────────────────────────────────────────┐
│                       InvoiceRepository.js                                  │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  getInvoiceByCode(code)                                                     │
│      ↓                                                                      │
│  1. Try: Find invoice by code                                               │
│      ↓                                                                      │
│  2. Not found? Try: Find by RefDocNumber in details                         │
│      ↓                                                                      │
│  3. Not found? Try: Find by RefDocNumber in header                          │
│      ↓                                                                      │
│  4. Not found? Call: getApplicationDetailsByCode()                          │
│                                                                             │
│  getApplicationDetailsByCode(code)                                          │
│      ↓                                                                      │
│  1. Find NicheApplication                                                   │
│  2. Join Niche → NicheRow → NicheWall → Chapel                              │
│  3. Find NicheBooking (if exists)                                           │
│  4. Find Item (by level, DocType, or fallback)                              │
│  5. Calculate prices and amounts                                            │
│  6. Return with flags                                                       │
│                                                                             │
└────────────────────────────────────────────────────────────────────────────┘
                                    ↕
                              DATABASE
┌────────────────────────────────────────────────────────────────────────────┐
│  Invoice          InvoiceDetail      NicheApplication                       │
│  Receipt          ReceiptDetail      NicheBooking                           │
│  Niche            NicheRow           NicheWall                              │
│  Chapel           Item               Person                                 │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Data Flow: Fetch Invoice/Application

```
USER
  │ Types "7977-0"
  ↓
┌──────────────────────┐
│ handleApplicationNo  │
│ Change()             │
└──────────────────────┘
  │ setApplicationNumber("7977-0")
  │ dispatch(clearCurrentData())
  │ clearFormFields()
  ↓
┌──────────────────────┐
│ Redux Action         │
│ fetchInvoiceOr       │
│ Application()        │
└──────────────────────┘
  │ Async thunk starts
  │ state.loading = true
  ↓
┌──────────────────────┐
│ HTTP Request         │
│ GET /api/invoices/   │
│ 7977-0               │
└──────────────────────┘
  │
  ↓
┌──────────────────────┐
│ Backend              │
│ InvoiceRepository    │
│ .getInvoiceByCode()  │
└──────────────────────┘
  │ 1. Search invoice table
  │ 2. Not found? Search application
  │ 3. Add flags
  ↓
┌──────────────────────┐
│ Response             │
│ {                    │
│   isApplicationData  │
│   canCreateInvoice   │
│   details: [...]     │
│ }                    │
└──────────────────────┘
  │
  ↓
┌──────────────────────┐
│ Redux Reducer        │
│ state.currentData =  │
│ response             │
└──────────────────────┘
  │
  ↓
┌──────────────────────┐
│ useEffect()          │
│ detects change       │
└──────────────────────┘
  │ clearFormFields()
  │ populateForm(currentData)
  ↓
┌──────────────────────┐
│ UI Updates           │
│ - Form populated     │
│ - Buttons shown      │
│ - Warning displayed  │
└──────────────────────┘
  │
  ↓
USER sees populated form
```

---

## 🏗️ Data Flow: Create Invoice

```
USER
  │ Clicks "Generate Invoice"
  ↓
┌──────────────────────┐
│ handleGenerateInvoice│
└──────────────────────┘
  │ Build payload
  │ {
  │   invoice: {...},
  │   invoiceDetails: [...]
  │ }
  ↓
┌──────────────────────┐
│ Redux Action         │
│ createInvoice()      │
└──────────────────────┘
  │ state.creatingInvoice = true
  │ (Button disabled)
  ↓
┌──────────────────────┐
│ HTTP Request         │
│ POST /api/invoices   │
│ Body: payload        │
└──────────────────────┘
  │
  ↓
┌──────────────────────┐
│ Backend              │
│ InvoiceController    │
│ .createInvoice()     │
└──────────────────────┘
  │ 1. Validate payload
  │ 2. Check duplicates
  │ 3. Create Invoice record
  │ 4. Create InvoiceDetail records
  │ 5. Return invoice code
  ↓
┌──────────────────────┐
│ Response             │
│ {                    │
│   invoiceId: 456,    │
│   invoiceCode: 00123 │
│ }                    │
└──────────────────────┘
  │
  ↓
┌──────────────────────┐
│ Redux Reducer        │
│ state.createInvoice  │
│ Success = true       │
│ state.lastCreated    │
│ InvoiceCode = 00123  │
└──────────────────────┘
  │
  ↓
┌──────────────────────┐
│ Component            │
│ showSuccess()        │
│ "Invoice created!"   │
└──────────────────────┘
  │
  ↓
┌──────────────────────┐
│ Refresh Data         │
│ fetchInvoiceOr       │
│ Application()        │
└──────────────────────┘
  │ Now returns invoice (not app)
  │ canCreateInvoice = false
  ↓
┌──────────────────────┐
│ UI Updates           │
│ - Buttons hidden     │
│ - Shows invoice data │
│ - Green success      │
└──────────────────────┘
  │
  ↓
USER sees created invoice
```

---

## 🎭 State Transitions

```
┌─────────────────┐
│  INITIAL STATE  │
│  (No Data)      │
└────────┬────────┘
         │ User enters code
         ↓
    ┌─────────┐
    │ LOADING │
    └────┬────┘
         │
    ┌────┴─────────────────────────────┐
    │                                   │
    ↓ Invoice found                     ↓ Application found
┌──────────────────┐          ┌──────────────────────┐
│ INVOICE STATE    │          │ APPLICATION STATE    │
│                  │          │                      │
│ isInvoice: true  │          │ isApplicationData:   │
│ canCreateInvoice │          │   true               │
│   : false        │          │ canCreateInvoice:    │
│                  │          │   true               │
│ UI: Green        │          │                      │
│ Buttons: Hidden  │          │ UI: Yellow           │
└──────────────────┘          │ Buttons: Visible     │
                              └──────┬───────────────┘
                                     │ User clicks "Generate"
                                     ↓
                              ┌─────────────┐
                              │  CREATING   │
                              │  INVOICE    │
                              └──────┬──────┘
                                     │ Success
                                     ↓
                              ┌──────────────────┐
                              │ INVOICE CREATED  │
                              │                  │
                              │ → Refresh data   │
                              │ → Becomes INVOICE│
                              │    STATE         │
                              └──────────────────┘
```

---

## 🎯 Component Structure

```
InvoiceAndReceiptPage
│
├── Redux Hooks
│   ├── useDispatch()
│   └── useSelector(state.invoice)
│
├── State Variables
│   ├── applicationNumber
│   ├── payeeName
│   ├── address fields
│   ├── items array
│   └── paymentMode
│
├── Effects
│   └── useEffect([currentData])
│       ├── Clear form
│       └── Populate from currentData
│
├── Handlers
│   ├── handleApplicationNumberChange()
│   ├── handleGenerateInvoice()
│   ├── handleGenerateReceipt()
│   └── clearFormFields()
│
└── JSX
    ├── Input: Application Number
    │   └── onChange → handleApplicationNumberChange
    │
    ├── Form Fields
    │   ├── Payee Name
    │   ├── Address
    │   ├── Payment Mode
    │   └── Items Table
    │
    ├── Conditional: Application Warning
    │   └── if (currentData?.isApplicationData)
    │
    └── Conditional: Generate Buttons
        └── if (currentData?.canCreateInvoice)
            ├── Button: Generate Invoice
            │   ├── onClick → handleGenerateInvoice
            │   └── disabled={creatingInvoice}
            │
            └── Button: Generate Receipt
                ├── onClick → handleGenerateReceipt
                └── disabled={creatingReceipt}
```

---

## 📦 Redux Store Structure

```
store
├── application/
├── auth/
├── chapel/
├── niche/
├── wakeRoom/
├── gateOfLife/
├── receipt/
├── report/
├── address/
├── inscription/
├── nichibooking/
└── invoice/  ⭐ NEW
    ├── currentData
    │   ├── isApplicationData: boolean
    │   ├── isInvoice: boolean
    │   ├── hasInvoice: boolean
    │   ├── canCreateInvoice: boolean
    │   ├── customerName: string
    │   ├── totalAmount: number
    │   ├── details: array
    │   ├── niche: object
    │   └── booking: object
    │
    ├── loading: boolean
    ├── error: string | null
    ├── creatingInvoice: boolean
    ├── creatingReceipt: boolean
    ├── createInvoiceSuccess: boolean
    ├── createReceiptSuccess: boolean
    ├── lastCreatedInvoiceCode: string | null
    └── lastCreatedReceiptCode: string | null
```

---

## 🔀 Decision Tree: Show Buttons?

```
                    Start
                      │
                      ↓
            ┌─────────────────┐
            │ currentData      │
            │ exists?          │
            └─────┬───────────┘
                  │
         ┌────────┴────────┐
         │                 │
        YES               NO
         │                 │
         ↓                 ↓
    ┌─────────────┐   ┌──────────┐
    │ canCreate   │   │ Hide     │
    │ Invoice?    │   │ Buttons  │
    └─────┬───────┘   └──────────┘
          │
    ┌─────┴─────┐
    │           │
   YES         NO
    │           │
    ↓           ↓
┌─────────┐  ┌──────────┐
│ Show    │  │ Hide     │
│ Buttons │  │ Buttons  │
│         │  │          │
│ Yellow  │  │ Green    │
│ Warning │  │ Success  │
└─────────┘  └──────────┘
```

---

## 🎨 UI State Visualization

### Application State (Yellow)
```
┌────────────────────────────────────────────────────┐
│ ⚠️  INVOICE NOT CREATED YET                        │
├────────────────────────────────────────────────────┤
│                                                    │
│  This is an application. Create invoice:          │
│                                                    │
│  ┌──────────────────┐  ┌──────────────────┐      │
│  │ 📄 Generate      │  │ 🧾 Generate      │      │
│  │    Invoice       │  │    Receipt       │      │
│  └──────────────────┘  └──────────────────┘      │
│                                                    │
└────────────────────────────────────────────────────┘
Background: #fff3cd (Yellow)
Border: #ffc107 (Orange)
```

### Invoice State (Green)
```
┌────────────────────────────────────────────────────┐
│ ✅ INVOICE LOADED: 00123                           │
├────────────────────────────────────────────────────┤
│                                                    │
│  Invoice Date: 30/01/2026                         │
│  Customer: John Doe                               │
│  Amount: $5,000.00                                │
│                                                    │
│  (No buttons - invoice already created)           │
│                                                    │
└────────────────────────────────────────────────────┘
Background: #d4edda (Light Green)
Border: #c3e6cb (Green)
```

### Creating State (Blue)
```
┌────────────────────────────────────────────────────┐
│  ┌──────────────────┐  ┌──────────────────┐       │
│  │ ⏳ Creating...   │  │ 🧾 Generate      │       │
│  │                  │  │    Receipt       │       │
│  └──────────────────┘  └──────────────────┘       │
│  (Button disabled)     (Available)                │
└────────────────────────────────────────────────────┘
Button: Disabled, opacity: 0.6
```

### Success State (Green Banner)
```
┌────────────────────────────────────────────────────┐
│ ✅ Invoice created: 00123                          │
└────────────────────────────────────────────────────┘
Background: #d4edda
Border: #c3e6cb
Animation: Fade in
```

---

## 🔧 Component Lifecycle

```
1. MOUNT
   ↓
   Initialize state
   Setup Redux hooks
   
2. USER TYPES CODE
   ↓
   handleApplicationNumberChange()
   ├── setApplicationNumber(value)
   ├── dispatch(clearCurrentData())
   ├── clearFormFields()
   └── dispatch(fetchInvoiceOrApplication(value))
   
3. FETCH STARTS
   ↓
   Redux: loading = true
   
4. FETCH COMPLETE
   ↓
   Redux: currentData = response
   Redux: loading = false
   
5. USEEFFECT TRIGGERS
   ↓
   useEffect(() => { ... }, [currentData])
   ├── if (!currentData) clearFormFields()
   └── if (currentData) populateForm()
   
6. COMPONENT RE-RENDERS
   ↓
   Show form with data
   Show/hide buttons based on flags
   
7. USER CLICKS BUTTON
   ↓
   handleGenerateInvoice()
   ├── Build payload
   ├── dispatch(createInvoice(payload))
   └── Wait for result
   
8. CREATE COMPLETE
   ↓
   Redux: createInvoiceSuccess = true
   Redux: lastCreatedInvoiceCode = "00123"
   
9. COMPONENT SHOWS SUCCESS
   ↓
   Toast: "Invoice created!"
   Banner: "✅ Invoice created: 00123"
   
10. COMPONENT REFRESHES
    ↓
    dispatch(fetchInvoiceOrApplication(code))
    → Now returns invoice (not application)
    → Buttons hidden
    
11. UNMOUNT
    ↓
    Cleanup (if needed)
```

---

## 🎯 Summary

This visual guide shows:
- ✅ Complete data flow from UI to database
- ✅ Redux state management
- ✅ Backend processing
- ✅ UI state transitions
- ✅ Decision logic
- ✅ Component structure

**Use this as a reference while implementing!** 📌

