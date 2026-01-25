# ASP.NET Invoice & Receipt System - Deep Analysis & Node.js Implementation Guide

## Table of Contents
1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Database Schema](#database-schema)
4. [Invoice System](#invoice-system)
5. [Receipt System](#receipt-system)
6. [Application Code Generation](#application-code-generation)
7. [Business Logic Flow](#business-logic-flow)
8. [Data Access Layer](#data-access-layer)
9. [Node.js Implementation Guide](#nodejs-implementation-guide)
10. [Code Examples](#code-examples)

---

## System Overview

The Invoice and Receipt system in the ASP.NET project is a financial transaction management system that handles:
- **Invoice Generation**: Creating invoices for various services (Niche Applications, Wake Room Bookings, Engrave Wall Applications, Niche Inscription Requests, etc.)
- **Receipt Generation**: Creating receipts for payments against invoices
- **Miscellaneous Receipts**: Standalone receipts not linked to invoices
- **Payment Tracking**: Tracking payment modes (Cash, Cheque, Credit Card, TT/Others)
- **Document Relationships**: Linking invoices/receipts to reference documents (NAPP, WAPP, INCR, GOLA, DONA, OTHERS)

### Key Entities
- **Invoice**: Main invoice record with header information
- **InvoiceDetail**: Line items for each invoice
- **Receipt**: Payment receipt linked to an invoice
- **MisalaniousReceiptDetail**: Line items for miscellaneous receipts

---

## Architecture

### 3-Tier Architecture
```
┌─────────────────────────────────────┐
│   WebUI (ASP.NET WebForms)          │
│   - Capture.aspx.cs                 │
│   - ReceiptEntry.aspx.cs            │
│   - MiscInvCapture.aspx.cs          │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│   Business Logic (BL)               │
│   - InvoiceBL.cs                    │
│   - PaymentBL.cs                    │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│   Data Access (DA)                  │
│   - MSSQLHelper.cs                  │
│   - Entity Framework (LINQ to SQL)  │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│   Database (SQL Server)             │
│   - Invoice                         │
│   - InvoiceDetail                   │
│   - Receipt                         │
│   - MisalaniousReceiptDetail        │
└─────────────────────────────────────┘
```

---

## Database Schema

### Invoice Table
```sql
Invoice
├── InvoiceId (int, PK, Identity)
├── TransactionDate (datetime, nullable)
├── RefDocNumber (nvarchar(50), nullable)      -- Reference document code (e.g., "NAPP12345")
├── RefDocName (nvarchar(50), nullable)        -- Reference document type (e.g., "NAPP", "WAPP")
├── CustomerName (nvarchar(100), nullable)
├── Code (nvarchar(50), NOT NULL, Unique)      -- Generated invoice number (e.g., "00001")
├── TotalAmount (decimal(18,2), nullable)
├── PayingAmount (decimal(18,2), nullable)
├── PaymentMode (nvarchar(50), nullable)       -- "Cash", "Cheque", "TT", etc.
├── PaymentModeDocNo (nvarchar(50), nullable)  -- Cheque number, TT reference, etc.
├── UserId (int, nullable)
├── ChurchId (int, nullable)
├── Status (int, NOT NULL)                     -- 0=Deleted, 1=Active, 2=Paid
├── NicheApplicationId (int, nullable)
├── TaxCode (nvarchar(50), nullable)
├── TaxPercentage (decimal(18,2), nullable)
└── TaxAmount (decimal(18,2), nullable)
```

### InvoiceDetail Table
```sql
InvoiceDetail
├── InvoiceDetailId (int, PK, Identity)
├── InvoiceId (int, FK → Invoice.InvoiceId)
├── ItemId (int, FK → Item.ItemId)
├── Quantity (decimal(18,2), NOT NULL)
├── UnitAmount (decimal(18,2), NOT NULL)
├── PayingAmount (decimal(18,2), nullable)
├── TotalPayingAmount (decimal(18,2), nullable)
├── RefDocNumber (nvarchar(50), nullable)      -- Line-level reference document
├── RefDocName (nvarchar(50), nullable)        -- Line-level document type
├── RefType (nvarchar(50), nullable)           -- "NAPP", "WAPP", "INCR", "GOLA", "DONA", "OTHERS"
├── OutstandingAmount (decimal(18,2))
├── LineTotalAmount (decimal(18,2), nullable)
├── LineTaxPercent (decimal(18,2), nullable)
└── LineTaxAmount (decimal(18,2), nullable)
```

### Receipt Table
```sql
Receipt
├── ReceiptId (int, PK, Identity)
├── InvoiceId (int, FK → Invoice.InvoiceId)
├── TransactionDate (datetime, nullable)
├── CustomerName (nvarchar(100), nullable)
├── Code (nvarchar(50), NOT NULL, Unique)      -- Generated receipt number (e.g., "000001")
├── TotalAmount (decimal(18,2), nullable)
├── PayingAmount (decimal(18,2), nullable)
├── PaymentMode (int, nullable)                -- 1=Cash, 2=Cheque, 3=TT, 4=Others
├── PaymentModeDocNo (nvarchar(50), nullable)
├── UserId (int, nullable)
├── ChurchId (int, nullable)
└── Status (int, NOT NULL)                     -- 2=Paid (default)
```

### MisalaniousReceiptDetail Table
```sql
MisalaniousReceiptDetail
├── MisalaniousReceiptDetailId (int, PK, Identity)
├── ReceiptId (int, FK → Receipt.ReceiptId)
├── ItemId (int, FK → Item.ItemId)
├── Quantity (decimal(18,2))
├── UnitAmount (decimal(18,2))
├── PayingAmount (decimal(18,2), nullable)
├── TotalPayingAmount (decimal(18,2))
├── RefDocNumber (nvarchar(50), nullable)
├── RefDocName (nvarchar(50), nullable)
└── RefType (nvarchar(50), nullable)
```

---

## Invoice System

### Invoice Creation Flow

```
1. User Input (Capture.aspx.cs)
   ├── Invoice Header Data
   │   ├── CustomerName
   │   ├── TransactionDate
   │   ├── PaymentMode
   │   ├── PaymentModeDocNo
   │   ├── TotalAmount
   │   └── PayingAmount
   └── Invoice Detail Lines
       ├── ItemId
       ├── Quantity
       ├── UnitAmount
       ├── RefDocNumber
       ├── RefDocName
       └── RefType

2. Business Logic Validation (InvoiceBL.SaveInvoice)
   ├── Duplicate Check
   │   └── GetDuplicateInvoice(CustomerName, ItemId, RefDocNumber, TransactionDate)
   └── Reference Document Validation
       └── ValidateInvoiceDetailsSave
           ├── Check if RefDocNumber exists for each RefDocName
           │   ├── "GOLA" → EngraveWallApplication
           │   ├── "INCR" → NicheInscriptionRequest
           │   ├── "NAPP" → NicheApplication
           │   ├── "WAPP" → WakeRoomBooking
           │   ├── "DONA" → NicheApplication
           │   └── "OTHERS" → No validation
           └── Return error if document not found

3. Invoice Code Generation
   ├── GetLastInvoiceCode() → Returns last numeric invoice code
   ├── Format: String.Format("{0:D5}", lastNumber + 1)
   └── Example: "00001", "00002", "00003"

4. Data Persistence (MSSQLHelper.AddInvoiceAndDetail)
   ├── Save Invoice Header
   │   └── db.Invoices.AddObject(daInvoice)
   ├── Save Invoice Details
   │   └── For each detail: db.InvoiceDetails.AddObject(daInvoiceDetail)
   └── db.SaveChanges()

5. Receipt Auto-Creation (Capture.aspx.cs)
   ├── Get InvoiceId by Code
   ├── Create Receipt Object
   ├── Set Receipt.Code = Invoice.Code (Same code)
   ├── Create MisalaniousReceiptDetail records
   └── Save Receipt + Details
```

### InvoiceBL.SaveInvoice Method

**Purpose**: Save invoice with validation and duplicate checking

**Parameters**:
- `_Invoice` (Entity.Invoice): Invoice header data
- `_InvoiceDetail` (List<Entity.InvoiceDetail>): Invoice line items
- `currentUser` (User): Current logged-in user

**Process**:
```csharp
public string SaveInvoice(Entity.Invoice _Invoice, List<Entity.InvoiceDetail> _InvoiceDetail, User currentUser)
{
    // 1. Extract ItemId and RefDocNumber from first detail
    int ItemIdF = invDtl.ItemId;
    string RefDocNum = invDtl.RefDocNumber;

    // 2. Duplicate Check
    var DuplicateChecking = GetDuplicateInvoice(
        _Invoice.CustomerName, 
        ItemIdF, 
        RefDocNum, 
        _Invoice.TransactionDate
    );

    if (DuplicateChecking != null) {
        return "Duplicate Invoice Found";
    }

    // 3. Reference Document Validation
    bool validate = ValidateInvoiceDetailsSave(_InvoiceDetail, currentUser, out savingStatus);
    if (!validate) {
        return "Wrong Ref Document Number";
    }

    // 4. Generate Invoice Code
    if (_Invoice.InvoiceId == null || _Invoice.InvoiceId == 0) {
        _Invoice.Status = 1; // Active
        int lastNumber = mSSQLHelper.GetLastInvoiceCode();
        string number = String.Format("{0:D5}", lastNumber + 1);
        _Invoice.Code = number; // e.g., "00001"
        
        // 5. Save Invoice and Details
        int inssRqstId = mSSQLHelper.AddInvoiceAndDetail(_Invoice, _InvoiceDetail);
        savingStatus = (inssRqstId > 0) ? _Invoice.Code : "";
    }

    return savingStatus; // Returns invoice code on success
}
```

### ValidateInvoiceDetailsSave Method

**Purpose**: Validate that reference documents exist

**Process**:
```csharp
private bool ValidateInvoiceDetailsSave(List<Entity.InvoiceDetail> invDtls, User currentUser, out string docCode)
{
    bool returnBool = true;
    docCode = string.Empty;

    foreach (var invDtl in invDtls) {
        if (invDtl.RefType.ToUpper() == "OTHERS") {
            // No validation for "OTHERS"
            returnBool = true;
        } else {
            switch (invDtl.RefDocName) {
                case "GOLA":
                    EngraveWallApplication engraveWall = 
                        new EngraveWallBL(currentUser.ChurchId.Value)
                        .GetEngraveWallApplication(invDtl.RefDocNumber);
                    if (engraveWall == null) {
                        docCode = invDtl.RefDocNumber;
                        returnBool = false;
                    }
                    break;
                case "INCR":
                    NicheInscriptionRequest nicheInscrption = 
                        new NicheApplicationBL(currentUser.ChurchId.Value)
                        .GetNicheInscriptionRequest(invDtl.RefDocNumber);
                    if (nicheInscrption == null) {
                        docCode = invDtl.RefDocNumber;
                        returnBool = false;
                    }
                    break;
                case "NAPP":
                    NicheApplication nicheApplication = 
                        new NicheApplicationBL(currentUser.ChurchId.Value)
                        .GetNicheApplication(invDtl.RefDocNumber);
                    if (nicheApplication == null) {
                        docCode = invDtl.RefDocNumber;
                        returnBool = false;
                    }
                    break;
                case "WAPP":
                    WakeRoomBooking wakeRoom = 
                        new WakeRoomBL(currentUser.ChurchId.Value)
                        .GetWakeRoomBooking(invDtl.RefDocNumber);
                    if (wakeRoom == null) {
                        docCode = invDtl.RefDocNumber;
                        returnBool = false;
                    }
                    break;
                case "DONA":
                    nicheApplication = 
                        new NicheApplicationBL(currentUser.ChurchId.Value)
                        .GetNicheApplication(invDtl.RefDocNumber);
                    if (nicheApplication == null) {
                        docCode = invDtl.RefDocNumber;
                        returnBool = false;
                    }
                    break;
            }
        }
    }

    return returnBool;
}
```

### GetDuplicateInvoice Method

**Purpose**: Check if an invoice already exists with same customer, item, reference document, and date

**Process**:
```csharp
public Entity.Invoice GetDuplicateInvoice(
    string _ApplicantName, 
    int Item, 
    string RefDoc, 
    DateTime? _InvoiceDate
)
{
    return mSSQLHelper.GetDuplicateInvoice(
        _ApplicantName, 
        Item, 
        RefDoc, 
        _InvoiceDate
    );
}
```

---

## Receipt System

### Receipt Creation Flow

#### Scenario 1: Receipt from Invoice (Automatic)
```
1. Invoice Created (Capture.aspx.cs)
   ├── Invoice Code Generated (e.g., "00001")
   ├── InvoiceId Retrieved
   └── Receipt Auto-Created
       ├── Receipt.Code = Invoice.Code (Same code)
       ├── Receipt.InvoiceId = Invoice.InvoiceId
       ├── Receipt.Status = 2 (Paid)
       ├── PaymentMode Mapped:
       │   ├── "Cash" → 1
       │   ├── "Cheque" → 2
       │   ├── "TT" → 3
       │   └── Others → 4
       └── MisalaniousReceiptDetail Created
           └── For each InvoiceDetail:
               ├── ReceiptId
               ├── ItemId
               ├── Quantity
               ├── UnitAmount
               ├── PayingAmount
               ├── TotalPayingAmount
               ├── RefDocNumber
               ├── RefDocName
               └── RefType
```

#### Scenario 2: Manual Receipt Entry (ReceiptEntry.aspx.cs)
```
1. User Selects Invoice
   ├── InvoiceId Retrieved
   └── Invoice Details Loaded

2. User Creates Receipt
   ├── Receipt Header Data
   ├── Receipt Code Generated
   └── Receipt Details Created
```

#### Scenario 3: Miscellaneous Receipt (MiscInvCapture.aspx.cs)
```
1. Standalone Receipt (No Invoice)
   ├── Receipt Code Generated
   ├── Receipt.Status = 2 (Paid)
   └── MisalaniousReceiptDetail Created
```

### Receipt Code Generation

**Method**: `PaymentBL.SaveReceipt`

**Process**:
```csharp
public string SaveReceipt(Entity.Receipt _Receipt)
{
    if (_Receipt.ReceiptId == null || _Receipt.ReceiptId == 0) {
        _Receipt.TransactionDate = DateTime.Now;
        _Receipt.Status = 2; // Paid
        
        // Generate Receipt Code
        int maxCode = mSSQLHelper.GetMaxReceiptIdFromCode();
        _Receipt.Code = (maxCode + 1).ToString().PadLeft(6, '0');
        // Example: "000001", "000002", "000003"
        
        // Save Receipt
        int ecptId = mSSQLHelper.AddReceipt(_Receipt);
        savingStatus = (ecptId > 0) ? _Receipt.Code : "";
    }
    
    return savingStatus; // Returns receipt code on success
}
```

### GetMaxReceiptIdFromCode Method

**Purpose**: Get the maximum receipt code (numeric) from existing receipts

**Process**:
```csharp
public int GetMaxReceiptIdFromCode()
{
    try {
        // Try to get max code directly
        var dbReceipts = (from rcpts in db.Receipts
                         select rcpts).Max(o => o.Code);
        return Convert.ToInt16(dbReceipts);
    } catch {
        try {
            // Fallback: Get last receipt and parse code
            var dbReceipts = (from rcpts in db.Receipts
                             select rcpts)
                            .OrderByDescending(x => x.ReceiptId)
                            .FirstOrDefault();
            if (dbReceipts != null) {
                Int32.TryParse(dbReceipts.Code.ToString(), out returnvalue);
            }
        } catch {
            returnvalue = 0;
        }
    }
    return returnvalue;
}
```

---

## Application Code Generation

### Invoice Code Generation

**Method**: `MSSQLHelper.GetLastInvoiceCode()`

**Process**:
```csharp
public int GetLastInvoiceCode()
{
    // Get last invoice code (ordered by InvoiceId descending)
    string lastCode = (from invc in db.Invoices
                      orderby invc.InvoiceId descending
                      select invc.Code).FirstOrDefault();

    // Parse to integer
    int lastNumber = 0;
    if (int.TryParse(lastCode, out lastNumber)) {
        return lastNumber;
    } else {
        return 0;
    }
}
```

**Usage in InvoiceBL**:
```csharp
int lastNumber = mSSQLHelper.GetLastInvoiceCode();
string number = String.Format("{0:D5}", lastNumber + 1);
_Invoice.Code = number; // "00001", "00002", etc.
```

**Format**: `{0:D5}` = 5-digit zero-padded number

### Receipt Code Generation

**Method**: `MSSQLHelper.GetMaxReceiptIdFromCode()`

**Process**:
```csharp
public int GetMaxReceiptIdFromCode()
{
    try {
        // Get max code value directly
        var dbReceipts = (from rcpts in db.Receipts
                         select rcpts).Max(o => o.Code);
        return Convert.ToInt16(dbReceipts);
    } catch {
        // Fallback: Get last receipt and parse
        var dbReceipts = (from rcpts in db.Receipts
                         select rcpts)
                        .OrderByDescending(x => x.ReceiptId)
                        .FirstOrDefault();
        if (dbReceipts != null) {
            Int32.TryParse(dbReceipts.Code.ToString(), out returnvalue);
        }
    }
    return returnvalue;
}
```

**Usage in PaymentBL**:
```csharp
int maxCode = mSSQLHelper.GetMaxReceiptIdFromCode();
_Receipt.Code = (maxCode + 1).ToString().PadLeft(6, '0');
// "000001", "000002", etc.
```

**Format**: 6-digit zero-padded number

### Miscellaneous Receipt Code

**Method**: `MSSQLHelper.GetLastmiscReceiptNumber()`

**Process**:
```csharp
public string GetLastmiscReceiptNumber()
{
    string lastNumber = "";
    using (DA.FransciscansEntities sqlHelper = new FransciscansEntities()) {
        try {
            lastNumber = (from rcpts in sqlHelper.Receipts
                         where rcpts.ChurchId == ChurchId
                         orderby rcpts.Code descending
                         select rcpts).FirstOrDefault().Code;
        } catch {
            // Return empty string on error
        }
    }
    return lastNumber;
}
```

**Method**: `MSSQLHelper.GetLastRcptumber()`

**Process**:
```csharp
public string GetLastRcptumber()
{
    string lastNumber = "";
    using (DA.FransciscansEntities sqlHelper = new FransciscansEntities()) {
        try {
            lastNumber = (from rcpts in sqlHelper.Invoices
                         where rcpts.ChurchId == ChurchId
                         orderby rcpts.InvoiceId descending
                         select rcpts).FirstOrDefault().Code;
        } catch {
            // Return empty string on error
        }
    }
    return lastNumber;
}
```

---

## Business Logic Flow

### Invoice Creation with Receipt

```
┌─────────────────────────────────────────────────────────────┐
│  1. Capture Invoice (Capture.aspx.cs)                       │
│     ├── Deserialize Invoice JSON                            │
│     ├── Deserialize InvoiceDetail[] JSON                    │
│     └── Set UserId from CurrentUser                         │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│  2. InvoiceBL.SaveInvoice                                   │
│     ├── Extract ItemId and RefDocNumber                     │
│     ├── Duplicate Check                                     │
│     │   └── GetDuplicateInvoice(...)                        │
│     ├── Reference Document Validation                       │
│     │   └── ValidateInvoiceDetailsSave(...)                 │
│     ├── Generate Invoice Code                               │
│     │   ├── GetLastInvoiceCode()                            │
│     │   └── Format: "{0:D5}", lastNumber + 1                │
│     ├── Save Invoice + Details                              │
│     │   └── AddInvoiceAndDetail(...)                        │
│     └── Return Invoice Code                                 │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│  3. Get InvoiceId by Code                                   │
│     └── InvoiceBL.GetInvoiceIdByCode(invoiceCode)           │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│  4. Create Receipt Object                                   │
│     ├── Receipt.InvoiceId = InvoiceId                       │
│     ├── Receipt.Code = Invoice.Code (Same code)             │
│     ├── Receipt.TransactionDate = DateTime.Now              │
│     ├── Receipt.CustomerName = Invoice.CustomerName         │
│     ├── Receipt.TotalAmount = Invoice.TotalAmount           │
│     ├── Receipt.PayingAmount = Invoice.PayingAmount         │
│     ├── Receipt.PaymentMode = MapPaymentMode(...)           │
│     ├── Receipt.UserId = Invoice.UserId                     │
│     ├── Receipt.ChurchId = Invoice.ChurchId                 │
│     └── Receipt.Status = 2 (Paid)                           │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│  5. PaymentBL.SaveReceiptreceiptid                          │
│     ├── Generate Receipt Code (if not set)                  │
│     │   ├── GetMaxReceiptIdFromCode()                       │
│     │   └── Format: (maxCode + 1).PadLeft(6, '0')           │
│     ├── Save Receipt                                        │
│     │   └── AddReceipt(...)                                 │
│     └── Return ReceiptId                                    │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│  6. Create MisalaniousReceiptDetail Records                 │
│     ├── For each InvoiceDetail:                             │
│     │   ├── MisRecpt.ReceiptId = ReceiptId                  │
│     │   ├── MisRecpt.ItemId = InvoiceDetail.ItemId          │
│     │   ├── MisRecpt.Quantity = InvoiceDetail.Quantity      │
│     │   ├── MisRecpt.UnitAmount = InvoiceDetail.UnitAmount  │
│     │   ├── MisRecpt.PayingAmount = InvoiceDetail.PayingAmount
│     │   ├── MisRecpt.TotalPayingAmount = InvoiceDetail.TotalPayingAmount
│     │   ├── MisRecpt.RefDocNumber = InvoiceDetail.RefDocNumber
│     │   ├── MisRecpt.RefDocName = InvoiceDetail.RefDocName  │
│     │   └── MisRecpt.RefType = InvoiceDetail.RefType        │
│     └── Save Receipt Details                                │
│         └── PaymentBL.SaveReceiptDetails(...)               │
└─────────────────────────────────────────────────────────────┘
```

### Payment Mode Mapping

**String to Integer**:
- `"Cash"` → `1`
- `"Cheque"` → `2`
- `"TT"` → `3`
- `"Others"` / `"Credit Card"` → `4`

**Integer to String**:
- `1` → `"Cash"`
- `2` → `"Cheque"`
- `3` → `"TT"` or `"Credit Card"`
- `4` → `"Others"`

---

## Data Access Layer

### MSSQLHelper Methods

#### AddInvoiceAndDetail
**Purpose**: Save invoice header and all detail lines in a transaction

**Process**:
```csharp
public int AddInvoiceAndDetail(
    Entity.Invoice _Invoice, 
    List<Entity.InvoiceDetail> _InvoiceDetailList
)
{
    int savingResult = -1;
    
    if (_Invoice != null) {
        // 1. Convert Entity to DA (Data Access) object
        DA.Invoice daInvoice = this.ConvertToDaInvoice(_Invoice);
        
        // 2. Add invoice header
        db.Invoices.AddObject(daInvoice);
        db.SaveChanges();
        savingResult = daInvoice.InvoiceId;
        
        // 3. Add invoice details
        if (savingResult > 0) {
            foreach (Entity.InvoiceDetail invoiceDetail in _InvoiceDetailList) {
                DA.InvoiceDetail daInvoiceDetail = 
                    this.ConvertToDaInvoiceDetail(invoiceDetail);
                daInvoiceDetail.InvoiceId = savingResult;
                db.InvoiceDetails.AddObject(daInvoiceDetail);
            }
            db.SaveChanges();
        }
    }
    
    return savingResult; // Returns InvoiceId
}
```

#### AddReceipt
**Purpose**: Save receipt header

**Process**:
```csharp
public int AddReceipt(Entity.Receipt _Receipt)
{
    int savingResult = -1;
    
    if (_Receipt != null) {
        DA.Receipt daReceipt = this.ConvertToDaReceipt(_Receipt);
        db.Receipts.AddObject(daReceipt);
        db.SaveChanges();
        savingResult = daReceipt.ReceiptId;
    }
    
    return savingResult; // Returns ReceiptId
}
```

#### AddMisaniousReceiptDetail
**Purpose**: Save miscellaneous receipt detail records

**Process**:
```csharp
public int AddMisaniousReceiptDetail(
    List<Entity.MisalaniousReceiptDetail> _ReceiptDetailList
)
{
    int savingResult = -1;
    
    if (_ReceiptDetailList != null && _ReceiptDetailList.Count > 0) {
        foreach (Entity.MisalaniousReceiptDetail recptDetail in _ReceiptDetailList) {
            DA.MisalaniousReceiptDetail daMisRecptDetail = 
                this.ConvertToDaMisalaniousReceiptDetail(recptDetail);
            db.MisalaniousReceiptDetails.AddObject(daMisRecptDetail);
        }
        db.SaveChanges();
        savingResult = 1; // Success
    }
    
    return savingResult;
}
```

#### GetInvoice
**Purpose**: Retrieve invoice by code

**Process**:
```csharp
public Entity.Invoice GetInvoice(string _InvoiceCode)
{
    // LINQ query with joins for related entities
    var dbInvcs = from invcs in db.Invoices
                  join invcDetls in db.InvoiceDetails 
                      on invcs.InvoiceId equals invcDetls.InvoiceId
                  join itm in db.Items 
                      on invcDetls.ItemId equals itm.ItemId
                  // ... more joins for related data
                  where invcs.Code.Equals(_InvoiceCode)
                  select new { invoice = invcs, ... };
    
    // Convert to Entity and return
}
```

#### GetReceipt
**Purpose**: Retrieve receipt by code

**Process**:
```csharp
public Entity.Receipt GetReceipt(string _ReceiptCode)
{
    // Similar LINQ query structure
    var dbRecpts = from recpts in db.Receipts
                   join invcs in db.Invoices 
                       on recpts.InvoiceId equals invcs.InvoiceId
                   // ... more joins
                   where recpts.Code.Equals(_ReceiptCode)
                   select new { receipt = recpts, ... };
    
    // Convert to Entity and return
}
```

#### GetDuplicateInvoice
**Purpose**: Check for duplicate invoice

**SQL Equivalent**:
```sql
SELECT TOP 1 *
FROM Invoice i
INNER JOIN InvoiceDetail id ON i.InvoiceId = id.InvoiceId
WHERE i.CustomerName = @CustomerName
  AND id.ItemId = @ItemId
  AND id.RefDocNumber = @RefDocNumber
  AND i.TransactionDate = @TransactionDate
  AND i.Status = 1
```

---

## Node.js Implementation Guide

### Project Structure

```
Fransiscan-Nodejs-BE/
├── src/
│   ├── models/
│   │   ├── Invoice.js
│   │   ├── InvoiceDetail.js
│   │   ├── Receipt.js
│   │   └── MisalaniousReceiptDetail.js
│   ├── repositories/
│   │   ├── InvoiceRepository.js
│   │   └── ReceiptRepository.js
│   ├── services/
│   │   ├── InvoiceService.js
│   │   └── ReceiptService.js
│   ├── controllers/
│   │   ├── InvoiceController.js
│   │   └── ReceiptController.js
│   └── routes/
│       ├── invoices.js
│       └── receipts.js
```

### Key Implementation Points

#### 1. Invoice Code Generation

**Location**: `InvoiceRepository.js`

```javascript
async getLastInvoiceCode() {
    const query = `
        SELECT TOP 1 Code
        FROM Invoice WITH(NOLOCK)
        ORDER BY InvoiceId DESC
    `;
    
    const result = await executeQuery(query);
    
    if (result.recordset.length > 0) {
        const lastCode = result.recordset[0].Code;
        const lastNumber = parseInt(lastCode, 10);
        return isNaN(lastNumber) ? 0 : lastNumber;
    }
    
    return 0;
}

async generateInvoiceCode() {
    const lastNumber = await this.getLastInvoiceCode();
    const nextNumber = lastNumber + 1;
    return String(nextNumber).padStart(5, '0'); // "00001", "00002"
}
```

#### 2. Receipt Code Generation

**Location**: `ReceiptRepository.js`

```javascript
async getMaxReceiptCode() {
    const query = `
        SELECT MAX(CAST(Code AS INT)) AS MaxCode
        FROM Receipt WITH(NOLOCK)
        WHERE ISNUMERIC(Code) = 1
    `;
    
    const result = await executeQuery(query);
    
    if (result.recordset.length > 0) {
        const maxCode = result.recordset[0].MaxCode;
        return maxCode || 0;
    }
    
    return 0;
}

async generateReceiptCode() {
    const maxCode = await this.getMaxReceiptCode();
    const nextNumber = maxCode + 1;
    return String(nextNumber).padStart(6, '0'); // "000001", "000002"
}
```

#### 3. Invoice Creation

**Location**: `InvoiceService.js`

```javascript
async saveInvoice(invoiceData, invoiceDetails, userId, churchId) {
    // 1. Duplicate Check
    const duplicate = await this.getDuplicateInvoice(
        invoiceData.customerName,
        invoiceDetails[0].itemId,
        invoiceDetails[0].refDocNumber,
        invoiceData.transactionDate
    );
    
    if (duplicate) {
        throw new Error('Duplicate Invoice Found');
    }
    
    // 2. Reference Document Validation
    const validationResult = await this.validateInvoiceDetails(
        invoiceDetails,
        churchId
    );
    
    if (!validationResult.isValid) {
        throw new Error(`Wrong Ref Document Number: ${validationResult.docCode}`);
    }
    
    // 3. Generate Invoice Code
    const invoiceCode = await this.repository.generateInvoiceCode();
    
    // 4. Prepare Invoice
    const invoice = {
        code: invoiceCode,
        transactionDate: invoiceData.transactionDate || new Date(),
        customerName: invoiceData.customerName,
        totalAmount: invoiceData.totalAmount,
        payingAmount: invoiceData.payingAmount,
        paymentMode: invoiceData.paymentMode,
        paymentModeDocNo: invoiceData.paymentModeDocNo,
        userId: userId,
        churchId: churchId,
        status: 1, // Active
        refDocNumber: invoiceData.refDocNumber,
        refDocName: invoiceData.refDocName,
        taxCode: invoiceData.taxCode,
        taxPercentage: invoiceData.taxPercentage,
        taxAmount: invoiceData.taxAmount
    };
    
    // 5. Save Invoice and Details
    const invoiceId = await this.repository.addInvoiceAndDetail(
        invoice,
        invoiceDetails
    );
    
    return {
        invoiceId,
        invoiceCode
    };
}
```

#### 4. Reference Document Validation

**Location**: `InvoiceService.js`

```javascript
async validateInvoiceDetails(invoiceDetails, churchId) {
    for (const detail of invoiceDetails) {
        if (detail.refType.toUpperCase() === 'OTHERS') {
            continue; // No validation for OTHERS
        }
        
        let documentExists = false;
        
        switch (detail.refDocName) {
            case 'GOLA':
                documentExists = await this.engraveWallService
                    .getEngraveWallApplication(detail.refDocNumber, churchId);
                break;
            case 'INCR':
                documentExists = await this.nicheApplicationService
                    .getNicheInscriptionRequest(detail.refDocNumber, churchId);
                break;
            case 'NAPP':
                documentExists = await this.nicheApplicationService
                    .getNicheApplication(detail.refDocNumber, churchId);
                break;
            case 'WAPP':
                documentExists = await this.wakeRoomService
                    .getWakeRoomBooking(detail.refDocNumber, churchId);
                break;
            case 'DONA':
                documentExists = await this.nicheApplicationService
                    .getNicheApplication(detail.refDocNumber, churchId);
                break;
            default:
                documentExists = true; // Unknown type, allow
        }
        
        if (!documentExists) {
            return {
                isValid: false,
                docCode: detail.refDocNumber
            };
        }
    }
    
    return {
        isValid: true
    };
}
```

#### 5. Receipt Creation from Invoice

**Location**: `ReceiptService.js`

```javascript
async createReceiptFromInvoice(invoiceId, invoiceData, invoiceDetails, userId, churchId) {
    // 1. Get Invoice by ID to get Invoice Code
    const invoice = await this.invoiceRepository.getInvoiceById(invoiceId);
    
    // 2. Map Payment Mode String to Integer
    const paymentModeMap = {
        'Cash': 1,
        'Cheque': 2,
        'TT': 3,
        'Credit Card': 3,
        'Others': 4
    };
    
    const paymentMode = paymentModeMap[invoiceData.paymentMode] || 4;
    
    // 3. Create Receipt Object
    const receipt = {
        invoiceId: invoiceId,
        code: invoice.code, // Same code as invoice
        transactionDate: new Date(),
        customerName: invoiceData.customerName,
        totalAmount: invoiceData.totalAmount,
        payingAmount: invoiceData.payingAmount,
        paymentMode: paymentMode,
        paymentModeDocNo: invoiceData.paymentModeDocNo,
        userId: userId,
        churchId: churchId,
        status: 2 // Paid
    };
    
    // 4. Save Receipt
    const receiptId = await this.repository.addReceipt(receipt);
    
    // 5. Create MisalaniousReceiptDetail Records
    if (invoiceDetails && invoiceDetails.length > 0) {
        const receiptDetails = invoiceDetails.map(detail => ({
            receiptId: receiptId,
            itemId: detail.itemId,
            quantity: detail.quantity,
            unitAmount: detail.unitAmount,
            payingAmount: detail.payingAmount,
            totalPayingAmount: detail.totalPayingAmount,
            refDocNumber: detail.refDocNumber,
            refDocName: detail.refDocName,
            refType: detail.refType
        }));
        
        await this.repository.addMisaniousReceiptDetail(receiptDetails);
    }
    
    return {
        receiptId,
        receiptCode: receipt.code
    };
}
```

#### 6. Database Queries

**Location**: `InvoiceRepository.js`

```javascript
async addInvoiceAndDetail(invoice, invoiceDetails) {
    const connection = await this.getConnection();
    const transaction = connection.transaction();
    
    try {
        await transaction.begin();
        
        // 1. Insert Invoice
        const insertInvoiceQuery = `
            INSERT INTO Invoice (
                Code, TransactionDate, RefDocNumber, RefDocName,
                CustomerName, TotalAmount, PayingAmount,
                PaymentMode, PaymentModeDocNo, UserId, ChurchId, Status,
                TaxCode, TaxPercentage, TaxAmount
            )
            OUTPUT INSERTED.InvoiceId
            VALUES (
                @code, @transactionDate, @refDocNumber, @refDocName,
                @customerName, @totalAmount, @payingAmount,
                @paymentMode, @paymentModeDocNo, @userId, @churchId, @status,
                @taxCode, @taxPercentage, @taxAmount
            )
        `;
        
        const invoiceResult = await transaction
            .request()
            .input('code', invoice.code)
            .input('transactionDate', invoice.transactionDate)
            .input('refDocNumber', invoice.refDocNumber)
            .input('refDocName', invoice.refDocName)
            .input('customerName', invoice.customerName)
            .input('totalAmount', invoice.totalAmount)
            .input('payingAmount', invoice.payingAmount)
            .input('paymentMode', invoice.paymentMode)
            .input('paymentModeDocNo', invoice.paymentModeDocNo)
            .input('userId', invoice.userId)
            .input('churchId', invoice.churchId)
            .input('status', invoice.status)
            .input('taxCode', invoice.taxCode)
            .input('taxPercentage', invoice.taxPercentage)
            .input('taxAmount', invoice.taxAmount)
            .query(insertInvoiceQuery);
        
        const invoiceId = invoiceResult.recordset[0].InvoiceId;
        
        // 2. Insert Invoice Details
        for (const detail of invoiceDetails) {
            const insertDetailQuery = `
                INSERT INTO InvoiceDetail (
                    InvoiceId, ItemId, Quantity, UnitAmount,
                    PayingAmount, TotalPayingAmount, RefDocNumber,
                    RefDocName, RefType, OutstandingAmount,
                    LineTotalAmount, LineTaxPercent, LineTaxAmount
                )
                VALUES (
                    @invoiceId, @itemId, @quantity, @unitAmount,
                    @payingAmount, @totalPayingAmount, @refDocNumber,
                    @refDocName, @refType, @outstandingAmount,
                    @lineTotalAmount, @lineTaxPercent, @lineTaxAmount
                )
            `;
            
            await transaction
                .request()
                .input('invoiceId', invoiceId)
                .input('itemId', detail.itemId)
                .input('quantity', detail.quantity)
                .input('unitAmount', detail.unitAmount)
                .input('payingAmount', detail.payingAmount)
                .input('totalPayingAmount', detail.totalPayingAmount)
                .input('refDocNumber', detail.refDocNumber)
                .input('refDocName', detail.refDocName)
                .input('refType', detail.refType)
                .input('outstandingAmount', detail.outstandingAmount || 0)
                .input('lineTotalAmount', detail.lineTotalAmount)
                .input('lineTaxPercent', detail.lineTaxPercent)
                .input('lineTaxAmount', detail.lineTaxAmount)
                .query(insertDetailQuery);
        }
        
        await transaction.commit();
        
        return invoiceId;
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
}
```

#### 7. Duplicate Invoice Check

**Location**: `InvoiceRepository.js`

```javascript
async getDuplicateInvoice(customerName, itemId, refDocNumber, transactionDate) {
    const query = `
        SELECT TOP 1 i.*
        FROM Invoice i WITH(NOLOCK)
        INNER JOIN InvoiceDetail id ON i.InvoiceId = id.InvoiceId
        WHERE i.CustomerName = @customerName
          AND id.ItemId = @itemId
          AND id.RefDocNumber = @refDocNumber
          AND CAST(i.TransactionDate AS DATE) = CAST(@transactionDate AS DATE)
          AND i.Status = 1
    `;
    
    const result = await executeQuery(query, {
        customerName,
        itemId,
        refDocNumber,
        transactionDate
    });
    
    return result.recordset.length > 0 ? result.recordset[0] : null;
}
```

### API Endpoints

#### Invoice Endpoints

**POST** `/api/invoices`
- Create new invoice
- Request body: `{ invoice: {...}, invoiceDetails: [...] }`
- Response: `{ invoiceId, invoiceCode }`

**GET** `/api/invoices/:code`
- Get invoice by code
- Response: Invoice with details

**GET** `/api/invoices/search`
- Search invoices with filters
- Query params: `customerName`, `refDocNumber`, `transactionDate`, etc.

#### Receipt Endpoints

**POST** `/api/receipts`
- Create new receipt
- Request body: `{ receipt: {...}, receiptDetails: [...] }`
- Response: `{ receiptId, receiptCode }`

**GET** `/api/receipts/:code`
- Get receipt by code
- Response: Receipt with details and invoice information

**GET** `/api/receipts/:code/pdf`
- Generate receipt PDF
- Response: PDF file or PDF URL

---

## Code Examples

### Complete Invoice Creation Flow

```javascript
// Controller
async createInvoice(req, res) {
    try {
        const { invoice, invoiceDetails } = req.body;
        const userId = req.user.userId;
        const churchId = req.user.churchId;
        
        // 1. Save Invoice
        const result = await invoiceService.saveInvoice(
            invoice,
            invoiceDetails,
            userId,
            churchId
        );
        
        // 2. Get InvoiceId
        const invoiceId = await invoiceService.getInvoiceIdByCode(result.invoiceCode);
        
        // 3. Create Receipt (if payment made)
        if (invoice.payingAmount > 0) {
            const receiptResult = await receiptService.createReceiptFromInvoice(
                invoiceId,
                invoice,
                invoiceDetails,
                userId,
                churchId
            );
            
            return res.json({
                success: true,
                data: {
                    invoiceId: result.invoiceId,
                    invoiceCode: result.invoiceCode,
                    receiptId: receiptResult.receiptId,
                    receiptCode: receiptResult.receiptCode
                }
            });
        }
        
        return res.json({
            success: true,
            data: {
                invoiceId: result.invoiceId,
                invoiceCode: result.invoiceCode
            }
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            error: error.message
        });
    }
}
```

### Payment Mode Conversion

```javascript
// Utility function
function paymentModeToNumber(paymentMode) {
    const map = {
        'Cash': 1,
        'Cheque': 2,
        'TT': 3,
        'Credit Card': 3,
        'Others': 4
    };
    return map[paymentMode] || 4;
}

function paymentModeToString(paymentMode) {
    const map = {
        1: 'Cash',
        2: 'Cheque',
        3: 'TT',
        4: 'Others'
    };
    return map[paymentMode] || 'Others';
}
```

---

## Summary

### Key Takeaways

1. **Invoice Code Format**: 5-digit zero-padded (`00001`, `00002`, ...)
2. **Receipt Code Format**: 6-digit zero-padded (`000001`, `000002`, ...)
3. **Receipt Auto-Creation**: When invoice is created with payment, receipt is automatically created with same code
4. **Payment Mode Mapping**: String to Integer conversion required
5. **Reference Document Validation**: Must validate that referenced documents exist before saving invoice
6. **Duplicate Check**: Check for duplicate invoices based on customer, item, reference document, and date
7. **Transaction Management**: Invoice header and details must be saved in a transaction
8. **Status Values**:
   - Invoice: `0` = Deleted, `1` = Active, `2` = Paid
   - Receipt: `2` = Paid (default)

### Implementation Checklist

- [x] Invoice code generation (5-digit format)
- [x] Receipt code generation (6-digit format)
- [x] Duplicate invoice check
- [x] Reference document validation
- [x] Invoice creation with details
- [x] Receipt creation from invoice
- [x] Miscellaneous receipt creation
- [x] Payment mode conversion
- [x] Database transaction management
- [x] Error handling
- [x] API endpoints
- [x] PDF generation support

---

**Document Version**: 1.0  
**Last Updated**: 2025-01-25  
**Author**: Analysis from ASP.NET Codebase

