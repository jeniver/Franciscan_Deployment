# Visual Guide - Invoice & Receipt Feature

## 🖼️ What You'll See on the Page

---

## 📸 Scenario 1: Application Data Loaded (can create invoice)

```
┌─────────────────────────────────────────────────────────────────┐
│ 📋 Invoice and Receipt Page                                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Application Number: [7977-0              ] [View Data]         │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ ⚠️ Application Data Loaded                                │  │
│  │ This is application data. You can generate an invoice     │  │
│  │ below.                                                     │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  Payee Name: [John Doe                                      ]   │
│  Address: [Block] [123] [Main Street] [#01-01] [123456] [SG]   │
│  Payment Mode: [Cash ▼]                                          │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ 📄 Generate Documents                                      │  │
│  ├───────────────────────────────────────────────────────────┤  │
│  │ [Generate Invoice] [Generate Receipt] [Invoice + Receipt] │  │
│  │      (Blue)             (Green)            (Purple)        │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  [Print Invoice]  [Print Receipt]                               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📸 Scenario 2: Invoice Data Loaded (already exists)

```
┌─────────────────────────────────────────────────────────────────┐
│ 📋 Invoice and Receipt Page                                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Application Number: [INV-00123          ] [View Data]          │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ ✅ Invoice Loaded                                          │  │
│  │ Invoice data loaded successfully. You can print or view   │  │
│  │ the invoice.                                               │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  Invoice Number: INV-00123                                       │
│                                                                  │
│  Payee Name: [Jane Smith                                    ]   │
│  Address: [Block] [456] [Second Ave] [#02-02] [654321] [SG]    │
│  Payment Mode: [Bank Transfer ▼]                                │
│                                                                  │
│  ⚠️ NO "Generate Documents" section appears                     │
│  (Invoice already exists - no need to generate again)           │
│                                                                  │
│  [Print Invoice]  [Print Receipt]                               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎨 Color Coding

### Yellow Warning (Application Data)
```
┌─────────────────────────────────────────────┐
│ ⚠️ Application Data Loaded                 │  ← Yellow background
│ This is application data. You can generate │  ← Yellow text
│ an invoice below.                           │
└─────────────────────────────────────────────┘
```

### Green Success (Invoice Data)
```
┌─────────────────────────────────────────────┐
│ ✅ Invoice Loaded                           │  ← Green background
│ Invoice data loaded successfully. You can   │  ← Green text
│ print or view the invoice.                  │
└─────────────────────────────────────────────┘
```

### Blue Generate Section (Only when canCreateInvoice = true)
```
┌─────────────────────────────────────────────────────┐
│ 📄 Generate Documents                               │  ← Blue background
├─────────────────────────────────────────────────────┤
│ [Generate Invoice]  [Generate Receipt]  [Invoice +  │
│      (Blue)              (Green)          Receipt]  │
│                                            (Purple)  │
└─────────────────────────────────────────────────────┘
```

---

## 🔘 Button States

### When Payment Mode is Selected
```
[Generate Invoice]     ← Enabled (clickable)
[Generate Receipt]     ← Enabled (clickable)
[Invoice + Receipt]    ← Enabled (clickable)
```

### When Payment Mode is NOT Selected
```
[Generate Invoice]     ← Disabled (grayed out)
[Generate Receipt]     ← Disabled (grayed out)
[Invoice + Receipt]    ← Disabled (grayed out)

⚠️ "Please select a payment mode to generate documents"
```

### During Creation (Loading State)
```
[⌛ Creating...]       ← Spinning loader icon
```

---

## 🔄 Button Visibility Matrix

| Scenario | isApplicationData | isInvoice | canCreateInvoice | Buttons Visible? |
|----------|-------------------|-----------|------------------|------------------|
| Application exists (no invoice) | ✅ true | ❌ false | ✅ true | ✅ **YES** |
| Invoice exists | ❌ false | ✅ true | ❌ false | ❌ **NO** |
| Application + Invoice exists | ✅ true | ✅ true | ❌ false | ❌ **NO** |
| Invalid code | ❌ false | ❌ false | ❌ false | ❌ **NO** |

---

## 📱 Item Details Table

```
┌────────────────────────────────────────────────────────────────────────────┐
│ Item Details                                                               │
├─────────────┬───────────┬──────────┬──────────┬────────┬─────────┬────────┤
│ Select Item │ Reference │ Default  │ Amount   │ Qty    │ Total   │ Action │
│             │           │ Amount   │ Paying   │        │ Amount  │        │
├─────────────┼───────────┼──────────┼──────────┼────────┼─────────┼────────┤
│ Level 3     │ NAPP-123  │ $5,000   │ $5,000   │   1    │ $5,450  │[Remove]│
│ Niche ▼     │           │          │          │        │         │        │
├─────────────┼───────────┼──────────┼──────────┼────────┼─────────┼────────┤
│ Inscription │ NAPP-123  │ $500     │ $500     │   1    │ $545    │[Remove]│
│ Both Name▼  │           │          │          │        │         │        │
└─────────────┴───────────┴──────────┴──────────┴────────┴─────────┴────────┘

[+ Add Item]
```

---

## 🧪 Test Flow - Step by Step

### 1️⃣ Start State (Empty Form)
```
Application Number: [                    ] [View Data]
                                             (disabled)
```

### 2️⃣ Enter Application Code
```
Application Number: [7977-0              ] [View Data]
                                             (enabled)
```

### 3️⃣ Click "View Data"
```
Application Number: [7977-0              ] [⌛ Loading...]
```

### 4️⃣ Data Loaded (Application)
```
Application Number: [7977-0              ] [View Data]

⚠️ Application Data Loaded
   This is application data. You can generate an invoice below.

Invoice Number: (not shown yet)
Payee Name: [John Doe]
...

📄 Generate Documents
[Generate Invoice] [Generate Receipt] [Invoice + Receipt]
```

### 5️⃣ Click "Generate Invoice"
```
📄 Generate Documents
[⌛ Creating...] [Generate Receipt] [Invoice + Receipt]
   (disabled)      (disabled)         (disabled)
```

### 6️⃣ Invoice Created Successfully
```
✅ Success: Invoice INV-7977-0 created successfully!

⚠️ Yellow warning disappears
✅ Green success appears: "Invoice Loaded"
📄 Generate Documents section disappears

Invoice Number: INV-7977-0 (now shown)
```

---

## 🎯 Key Visual Indicators

| Indicator | Meaning | Action |
|-----------|---------|--------|
| 🟡 **Yellow Banner** | Application data loaded | Can generate documents |
| 🟢 **Green Banner** | Invoice data loaded | Can print only |
| 🔵 **Blue Buttons** | Generate options available | Click to create |
| ⚪ **Gray Buttons** | Disabled (no payment mode) | Select payment first |
| ⌛ **Loading Spinner** | Processing request | Wait... |
| ✅ **Green Toast** | Success message | Operation completed |
| ❌ **Red Toast** | Error message | Fix issue and retry |

---

## 💡 Pro Tips

1. **Form Auto-Clears**: When you change the application number, the form automatically clears
2. **Buttons Auto-Hide**: Once an invoice is created, the generate buttons disappear
3. **Payment Required**: You must select a payment mode before generating documents
4. **Error Feedback**: All errors show as red toast notifications at the top
5. **Success Feedback**: All successes show as green toast notifications

---

## 🔍 What to Look For During Testing

✅ **Check these visually**:
- [ ] Yellow warning appears for application data
- [ ] Green success appears for invoice data
- [ ] 3 buttons appear in blue/green/purple
- [ ] Buttons disappear after invoice created
- [ ] Form clears when application number changes
- [ ] Loading spinners show during operations
- [ ] Toast messages appear for success/errors
- [ ] Invoice number displays after creation
- [ ] Items populate correctly in table

---

**This is what you should see when the feature is working correctly!** ✅

