### RefDocNumber Deep Analysis and Nichi Booking → Invoice Mapping

This document explains how **`refDocNumber`** and **`refDocName`** are handled end‑to‑end, and how the Nichi Booking Create API generates invoices equivalent to calling:

```bash
curl -X POST http://localhost:3000/api/invoices/4652-0 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "paymentMode": "Cash",
    "details": [
      {
        "itemId": 6,
        "quantity": 1,
        "unitAmount": 4000,
        "refDocNumber": "4652-0",
        "refDocName": "NAPP",
        "lineTaxPercent": 9
      }
    ]
  }'
```

---

### 1. Where invoices are created

- **Endpoint**: `POST /api/niche-bookings` (Nichi Booking Create API).
- **Service**: `NicheBookingService.createBooking(...)`.
- **Invoice orchestration block**: near the end of `createBooking`, in the section labeled:
  - _“Auto-create invoice & receipt for the niche application / booking”_.

Flow inside `createBooking`:
- Resolve or create a **`NicheApplication`** for the booking.
- Confirm the booking and persist `NicheBooking`.
- Build `invoiceData` and `invoiceDetails` using the resolved application code and niche information.
- Call **`InvoiceService.saveInvoice(invoiceData, invoiceDetails, userId, churchId)`**.
- Verify that the invoice is retrievable via `InvoiceRepository.getInvoiceByCode(...)`.

This means **invoice creation is already integrated into the Nichi Booking Create API**, not via the `InvoiceController` directly.

---

### 2. Code formats and `refDocNumber` rules

- **Application code format (new)**: `XXXX-0` (e.g. `4652-0`, `7477-0`).
  - Generated and stored in `NicheApplication.Code`.
- **Legacy format (still supported for lookup only)**: `NAPP-XXXX` (e.g. `NAPP-52`).

For invoices:
- **Niche invoice lines**  
  - `refDocNumber` = application code, e.g. `"4652-0"`.  
  - `refDocName` = `"NAPP"`.
  - Used to tie `InvoiceDetail` to `NicheApplication`.

- **Inscription invoice lines**  
  - `refDocNumber` = `"I-" + applicationCode`, e.g. `"I-4652-0"`.  
  - `refDocName` = `"INCR"`.
  - Used by inscription/invoice flows while still validating against the same `NicheApplication`.

Header vs detail:
- **Invoice header**  
  - `Invoice.RefDocNumber` = **base application code** (e.g. `"4652-0"`).
  - `Invoice.RefDocName` = document type (`"NAPP"`, `"INCR"`, etc.).
- **Invoice detail**  
  - `InvoiceDetail.RefDocNumber` = per‑line reference (`"4652-0"` or `"I-4652-0"`).
  - `InvoiceDetail.RefDocName` = `"NAPP"` for niche, `"INCR"` for inscription, etc.

Normalization:
- All `refDocNumber` / `refDocName` are **trimmed** and uppercased (where relevant) before save and during lookup.

---

### 3. Current invoice service behaviour

**`InvoiceService.saveInvoice(invoiceData, invoiceDetails, userId, churchId)`**:

- Validates that:
  - At least one detail is present.
  - First detail contains `itemId` and `refDocNumber`.
- Derives **base reference** for the invoice header:
  - If first detail `refDocNumber` starts with `"I-"`, it strips the `"I-"` prefix to get the base application code (e.g. `"I-4652-0"` → `"4652-0"`).
  - Otherwise, uses the detail’s `refDocNumber` as‑is.
- Performs **duplicate check** using `InvoiceRepository.getDuplicateInvoice(...)`.
- Runs **reference validation** via `ReferenceDocumentValidator.validateInvoiceDetails(...)`, with retry to handle fresh inserts.
- Calls **`InvoiceRepository.addInvoiceAndDetail(...)`** to persist header + details in a single transaction.
- Returns `{ success, data: { invoiceId, invoiceCode } }` and logs all `RefDocNumber` values.

`InvoiceRepository.getInvoiceByCode(code, churchId, applicationCode)`:
- Looks up by **invoice code** or **RefDocNumber** (either header or details).
- Uses `LTRIM(RTRIM(...))` and `UPPER(...)` for robust matching.
- Returns:
  - Full header,
  - All `InvoiceDetail`s with item info,
  - Optional `Receipt` info,
  - A `summary` block (`totalItems`, `subtotal`, `totalTax`, `grandTotal`).

This is the same shape returned by `GET /api/invoices/:code`.

---

### 4. Mapping: Nichi booking → invoice fields

In `NicheBookingService.createBooking(...)` (after booking is created successfully):

- **Application code resolution**:
  - `normalizedApplicationCode` is computed from:
    - `application.code` / `application.Code`, or
    - `nicheApplicationCode` from the request.
  - It is expected to be in the new `XXXX-0` format.

- **Item determination (`determineInvoiceItems`)**:
  - Reads niche row (`NicheRow`) for:
    - `NicheLevel` (to select correct itemId like `6` for Level 6).
    - `DefaultAmount` (base price).
  - Applies priority rules:
    1. Explicit `itemId` in booking/nicheDetails.
    2. Item whose `ItemId` == `NicheLevel`.
    3. Items in `NICHES` category.
    4. Small IDs `ItemId <= 7` as fallback.
    5. Finally: any active item for the church as emergency fallback.
  - Builds multiple items:
    - Niche line (slot price).
    - Inscription line(s).
    - Urn.
    - Setting of tables.
    - Sealing of niche.
  - For each, calculates:
    - `unitAmount`, `quantity`, `lineTotalAmount`.
    - `lineTaxPercent` = `9`.
    - `lineTaxAmount` = `lineTotalAmount * 0.09`.
    - `totalPayingAmount` = `lineTotalAmount + lineTaxAmount`.
  - Assigns **per‑line refs**:
    - Niche line:
      - `refDocNumber` = application code (e.g. `"4652-0"`).
      - `refDocName` = `"NAPP"`.
    - Inscription related lines:
      - `refDocNumber` = `"I-" + applicationCode` (e.g. `"I-4652-0"`).
      - `refDocName` = `"INCR"`.

- **Invoice data building**:
  - Totals are computed from `invoiceItems`:
    - `totalAmount` / `totalPayingAmount` = sum of `totalPayingAmount` across all items.
    - `totalTaxAmount` = sum of `lineTaxAmount`.
  - `invoiceData` fields:
    - `transactionDate` = `bookedDate` (or agreement date).
    - `refDocNumber` = `normalizedApplicationCode` (e.g. `"4652-0"`).
    - `refDocName` = `"NAPP"`.
    - `customerName` = booking contact name.
    - `totalAmount` = total INCLUDING tax.
    - `payingAmount` = same as totalAmount (unless overridden).
    - `paymentMode`, `paymentModeDocNo` from booking payload.
    - `nicheApplicationId` = current application’s ID.
    - `taxCode` = `"GST"`.
    - `taxPercentage` = `9`.
    - `taxAmount` = `totalTaxAmount`.

- **Invoice details mapping**:
  - Each `invoiceItems` entry is transformed into an `invoiceDetails` object:
    - `itemId`, `quantity`, `unitAmount`,
    - `payingAmount`, `totalPayingAmount`,
    - `lineTotalAmount`, `lineTaxPercent`, `lineTaxAmount`,
    - `outstandingAmount` (usually `0`),
    - `refDocNumber` (trimmed; base or `"I-"` variant),
    - `refDocName` (uppercased),
    - `refType` (same as `refDocName`).

This internal payload is **functionally equivalent** to posting the `details` array in the cURL example, but it is generated automatically from the booking and niche data.

---

### 5. Behaviour equivalent to the cURL service

The user‑facing service call:

```bash
curl -X POST http://localhost:3000/api/invoices/4652-0 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "paymentMode": "Cash",
    "details": [
      {
        "itemId": 6,
        "quantity": 1,
        "unitAmount": 4000,
        "refDocNumber": "4652-0",
        "refDocName": "NAPP",
        "lineTaxPercent": 9
      }
    ]
  }'
```

is conceptually mirrored inside **`NicheBookingService.createBooking`**:

- `refDocNumber` for the **niche line** is the application code (`"4652-0"`).
- `refDocName` is `"NAPP"`.
- GST at **9%** is applied per line.
- The invoice header uses the same base application code and type.
- After save, `GET /api/invoices/4652-0` (or using the generated invoice code) returns an invoice structure including:
  - header,
  - all details,
  - tax breakdown,
  - optional receipt,
  - `summary` block.

The only difference is **who supplies the details**:
- Manual POST via `InvoiceController.createInvoiceByCode` when the client sends `details` in the body.
- Automatic derivation from booking data via `NicheBookingService.createBooking`.

---

### 6. Inscription and invoice API compatibility

The following services rely on `refDocNumber` / `refDocName`:

- **Invoice retrieval**  
  - `GET /api/invoices/:code` (`InvoiceController.getInvoiceByCode`)  
  - Looks up by invoice code or `RefDocNumber` (invoice or details), using normalized comparison.

- **Receipt / payment handling**  
  - `POST /api/receipts/from-invoice` and `ReceiptService.getInvoiceByCode` internally use the same repository method, so they see the same invoice header + details.

- **Inscription invoice flows**  
  - `InscriptionInvoiceService` and `ReferenceDocumentValidator`:
    - accept both `"XXXX-0"` and `"NAPP-XXXX"` formats for compatibility.
    - treat `"I-XXXX-0"` as inscription items whose base application is `"XXXX-0"`.

Because:
- **Header** always uses the base code (`"XXXX-0"`).
- **Detail lines** use either base (`"XXXX-0"`) or `"I-XXXX-0"` for inscription.
- All values are normalized on write and read.

→ existing **inscription APIs** and **invoice retrieval** continue to work with both newly created and legacy data.

---

### 7. Summary

- The **Nichi Booking Create API** already generates invoices using the new `XXXX-0` application code format and consistent `refDocNumber` / `refDocName` rules.
- The behaviour is aligned with the manual service call:
  - `paymentMode`, `details[].itemId`, `quantity`, `unitAmount`, `refDocNumber`, `refDocName`, `lineTaxPercent` → all have direct counterparts in the internal mapping.
- Invoices are created via a single, shared **`InvoiceService.saveInvoice`** entry point:
  - Ensures validation,
  - Prevents duplicates,
  - Enforces reference document checks,
  - Persists header + detail atomically.
- Invoice and inscription related APIs remain compatible because they all rely on the same normalized `refDocNumber` / `refDocName` conventions and repository lookup logic.

# RefDocNumber Deep Analysis: How Reference Document Linking Works in ASP.NET

## Table of Contents
1. [Overview](#overview)
2. [What is RefDocNumber?](#what-is-refdocnumber)
3. [Database Schema](#database-schema)
4. [Document Types (RefDocName)](#document-types-refdocname)
5. [How RefDocNumber is Set](#how-refdocnumber-is-set)
6. [Validation Logic](#validation-logic)
7. [Duplicate Invoice Checking](#duplicate-invoice-checking)
8. [Query Operations & Linking](#query-operations--linking)
9. [Receipt Creation & Preservation](#receipt-creation--preservation)
10. [Frontend Usage](#frontend-usage)
11. [Backend Usage](#backend-usage)
12. [Complete Flow Examples](#complete-flow-examples)
13. [Database Indexes](#database-indexes)
14. [Summary](#summary)

---

## Overview

**RefDocNumber** is a critical linking mechanism in the ASP.NET application that connects invoices and receipts to their source documents (Niche Applications, Inscription Requests, Wake Room Bookings, etc.). It acts as a **foreign key reference** without using actual database foreign key constraints, enabling flexible document relationships.

**Key Characteristics:**
- **Purpose**: Links invoices/receipts to source documents
- **Type**: `nvarchar(50)` in database
- **Location**: Stored in `InvoiceDetail`, `MisalaniousReceiptDetail`, and `Invoice` tables
- **Companion Field**: `RefDocName` identifies the document type (NAPP, INCR, WAPP, GOLA, etc.)
- **Validation**: System validates that referenced documents exist before allowing invoice creation
- **Indexing**: Database has non-clustered index on `RefDocNumber` for performance

---

## What is RefDocNumber?

### Definition

`RefDocNumber` stores the **unique code** of the source document that an invoice or receipt is created for. It's a **string-based reference** that links financial documents (invoices/receipts) to business documents (applications, bookings, requests).

### Example Values

| RefDocNumber | RefDocName | Source Document |
|--------------|------------|-----------------|
| `NAPP-0001` | `NAPP` | NicheApplication.Code |
| `INCR-0001` | `INCR` | NicheInscriptionRequest.Code |
| `WAPP-0001` | `WAPP` | WakeRoomBooking.Code |
| `GOLA-0001` | `GOLA` | EngraveWallApplication.Code |
| `DONA-0001` | `DONA` | Donation (uses NicheApplication) |
| `CUSTOM-123` | `OTHERS` | Custom/Manual entry (no validation) |

### Storage Locations

1. **InvoiceDetail.RefDocNumber**: Links invoice line items to source documents
2. **MisalaniousReceiptDetail.RefDocNumber**: Preserves source document reference in receipts
3. **Invoice.RefDocNumber**: (Optional) Stores reference at invoice header level

---

## Database Schema

### InvoiceDetail Table

```sql
CREATE TABLE [dbo].[InvoiceDetail](
    [InvoiceDetailId] [int] IDENTITY(1,1) NOT NULL,
    [InvoiceId] [int] NOT NULL,
    [ItemId] [int] NOT NULL,
    [Quantity] [decimal](18, 2) NOT NULL,
    [UnitAmount] [decimal](18, 2) NOT NULL,
    [PayingAmount] [decimal](18, 2) NULL,
    [TotalPayingAmount] [decimal](18, 2) NULL,
    [RefDocNumber] [nvarchar](50) NULL,  -- Source document code
    [RefDocName] [nvarchar](50) NULL,    -- Document type (NAPP, INCR, etc.)
    [RefType] [nvarchar](50) NULL,        -- Additional type info
    [LineTotalAmount] [decimal](18, 2) NULL,
    [LineTaxPercent] [decimal](18, 2) NULL,
    [LineTaxAmount] [decimal](18, 2) NULL,
    ...
)
```

### MisalaniousReceiptDetail Table

```sql
CREATE TABLE [dbo].[MisalaniousReceiptDetail](
    [MisalaniousReceiptDetailId] [int] IDENTITY(1,1) NOT NULL,
    [ReceiptId] [int] NOT NULL,
    [ItemId] [int] NOT NULL,
    [Quantity] [decimal](18, 2) NOT NULL,
    [UnitAmount] [decimal](18, 2) NOT NULL,
    [PayingAmount] [decimal](18, 2) NULL,
    [TotalPayingAmount] [decimal](18, 2) NOT NULL,
    [RefDocNumber] [nvarchar](50) NULL,  -- Preserved from InvoiceDetail
    [RefDocName] [nvarchar](50) NULL,    -- Preserved from InvoiceDetail
    [RefType] [nvarchar](50) NULL,       -- Preserved from InvoiceDetail
    ...
)
```

### Invoice Table (Optional Reference)

```sql
CREATE TABLE [dbo].[Invoice](
    [InvoiceId] [int] IDENTITY(1,1) NOT NULL,
    [Code] [nvarchar](50) NOT NULL,
    [TransactionDate] [datetime] NULL,
    [RefDocNumber] [nvarchar](50) NULL,  -- Optional header-level reference
    [RefDocName] [nvarchar](50) NULL,
    [CustomerName] [nvarchar](100) NULL,
    ...
)
```

### Database Index

**Performance Optimization**: A non-clustered index exists on `RefDocNumber` for fast lookups:

```sql
CREATE NONCLUSTERED INDEX [IX_InvoiceDetail_RefDocNumber] 
ON [dbo].[InvoiceDetail]
(
    [RefDocNumber] ASC
)
```

---

## Document Types (RefDocName)

The `RefDocName` field identifies the **type** of source document. This determines:
1. Which validation method to use
2. Which business logic layer to call
3. Which entity type to retrieve

### Supported Document Types

| RefDocName | Full Name | Source Table | Code Format | TaskId |
|------------|-----------|--------------|-------------|--------|
| **NAPP** | Niche Application | `NicheApplication` | `NAPP-XXXX` | 1 |
| **INCR** | Inscription Request | `NicheInscriptionRequest` | `INCR-XXXX` | 4 |
| **WAPP** | Wake Room Application | `WakeRoomBooking` | `WAPP-XXXX` | 2 |
| **GOLA** | Engrave Wall Application | `EngraveWallApplication` | `GOLA-XXXX` | 3 |
| **DONA** | Donation | `NicheApplication` | `DONA-XXXX` | (Uses NAPP) |
| **OTHERS** | Custom/Manual | N/A | Any | (No validation) |

### TaskId Mapping

The `TaskId` is used in `TaskItemMapping` to determine which items should be automatically loaded when creating an invoice for a specific document type:

```csharp
// From NicheApplicationBL.CreateInvoiceForBooking()
List<Entity.Item> mappedItems = invoiceBL.GetTaskMappedItems(1, nicheApplication.Code);
// TaskId = 1 for NAPP
```

---

## How RefDocNumber is Set

### 1. Manual Invoice Creation (Frontend)

**Location**: `Src/TGS.BPOp.Franciscans.WebUI/Invoice/Capture.aspx`

**Flow**:
1. User enters a reference document code (e.g., "NAPP-0001") in `refDocCodeTxt`
2. JavaScript calls `LoadRefDocument(refDocCode)`
3. Backend identifies document type from code prefix (first 4 characters)
4. Backend retrieves document and returns it
5. Frontend sets `RefDocNumber` and `RefDocName` in invoice details

**JavaScript Code**:
```javascript
function loadRefDocument() {
    var refDocCode = $("#refDocCodeTxt").val();
    if (refDocCode != "") {
        $.ajax({
            type: "POST",
            url: "Capture.aspx/LoadRefDocument",
            data: "{'refDocCode':'" + refDocCode + "'}",
            success: function (msg) {
                refDocEntity = eval("(" + msg.d + ")");
                if (refDocEntity.DocPrefix == "NAPP") {
                    $("#refDocId").val(refDocEntity.Document.Code);
                    $("#refDocName").val("NAPP");
                    refTaskId = 1;
                }
                // ... similar for INCR, WAPP, GOLA
            }
        });
    }
}
```

**Backend WebMethod**:
```csharp
[System.Web.Services.WebMethod]
public static string LoadRefDocument(string refDocCode)
{
    string docPrefix = "";
    dynamic retrunEntity = null;
    
    if (!string.IsNullOrEmpty(refDocCode))
    {
        switch (refDocCode.Trim().Substring(0, 4))
        {
            case "INCR":
                docPrefix = "INCR";
                retrunEntity = nicheApplicationBL.GetNicheInscriptionRequest(refDocCode.Trim());
                break;
            case "NAPP":
                docPrefix = "NAPP";
                retrunEntity = nicheApplicationBL.GetNicheApplication(refDocCode.Trim());
                break;
            case "WAPP":
                docPrefix = "WAPP";
                retrunEntity = wakeRoomBL.GetWakeRoomBooking(refDocCode.Trim());
                break;
            case "GOLA":
                docPrefix = "GOLA";
                retrunEntity = engraveWallBL.GetEngraveWallApplication(refDocCode.Trim());
                break;
        }
    }
    return javaScriptSerializer.Serialize(retrunEntity);
}
```

### 2. Automatic Invoice Creation (Backend)

**Location**: `Src/TGS.BPOp.Franciscans.BL/NicheApplicationBL.cs`

**Method**: `CreateInvoiceForBooking()`

**Code**:
```csharp
private void CreateInvoiceForBooking(Entity.NicheApplication nicheApplication, int? userId)
{
    // ... get mapped items ...
    
    foreach (Entity.Item item in mappedItems)
    {
        Entity.InvoiceDetail invoiceDetail = new Entity.InvoiceDetail();
        invoiceDetail.ItemId = item.ItemId;
        invoiceDetail.Quantity = 1;
        invoiceDetail.UnitAmount = item.Price ?? nicheApplication.Amount;
        invoiceDetail.RefDocNumber = nicheApplication.Code;  // ← Set here
        invoiceDetail.RefDocName = "NAPP";                   // ← Set here
        invoiceDetail.RefType = "NAPP";                      // ← Set here
        invoiceDetail.PayingAmount = invoiceDetail.UnitAmount;
        invoiceDetail.TotalPayingAmount = invoiceDetail.UnitAmount;
        invoiceDetail.LineTotalAmount = invoiceDetail.UnitAmount;
        
        invoiceDetailList.Add(invoiceDetail);
    }
    
    // ... save invoice ...
}
```

### 3. Receipt Creation (Preservation)

**Location**: `Src/TGS.BPOp.Franciscans.WebUI/Invoice/InduvidualReceiptCapture.aspx.cs`

**Method**: `CaptureReceipt()`

**Code**:
```csharp
foreach (var recpt in invoiceDetailList)
{
    MisalaniousReceiptDetail MisRecpt = new MisalaniousReceiptDetail();
    MisRecpt.ReceiptId = ReceiptId;
    MisRecpt.ItemId = recpt.ItemId;
    MisRecpt.PayingAmount = recpt.PayingAmount;
    MisRecpt.Quantity = recpt.Quantity;
    MisRecpt.RefDocName = recpt.RefDocName;        // ← Preserved from InvoiceDetail
    MisRecpt.RefDocNumber = recpt.RefDocNumber;    // ← Preserved from InvoiceDetail
    MisRecpt.RefType = recpt.RefType;              // ← Preserved from InvoiceDetail
    MisRecpt.TotalPayingAmount = recpt.TotalPayingAmount.Value;
    MisRecpt.UnitAmount = recpt.UnitAmount;
    MisRecptList.Add(MisRecpt);
}
```

**Key Point**: Receipt details **preserve** the `RefDocNumber` from the original invoice, maintaining the link back to the source document even after payment.

---

## Validation Logic

### Purpose

Before an invoice can be saved, the system **validates** that the referenced document (RefDocNumber) actually exists in the database. This prevents:
- Creating invoices for non-existent applications
- Typos in document codes
- Orphaned invoice records

### Validation Method

**Location**: `Src/TGS.BPOp.Franciscans.BL/InvoiceBL.cs`

**Method**: `ValidateInvoiceDetailsSave()`

**Code**:
```csharp
private bool ValidateInvoiceDetailsSave(
    List<Entity.InvoiceDetail> invDtls, 
    User currentUser, 
    out string docCode)
{
    bool returnBool = true;
    docCode = string.Empty;
    
    foreach (var invDtl in invDtls)
    {
        // Skip validation for "OTHERS" type
        if (invDtl.RefType.ToUpper() == "OTHERS")
        {
            returnBool = true;
            continue;
        }
        
        // Validate based on RefDocName
        if (invDtl.RefDocName != null && invDtl.RefDocName != string.Empty)
        {
            switch (invDtl.RefDocName)
            {
                case "GOLA":
                    EngraveWallApplication engraveWall = 
                        new EngraveWallBL(currentUser.ChurchId.Value)
                            .GetEngraveWallApplication(invDtl.RefDocNumber);
                    if (engraveWall == null)
                    {
                        docCode = invDtl.RefDocNumber;
                        returnBool = false;  // Document not found
                    }
                    break;
                    
                case "INCR":
                    NicheInscriptionRequest nicheInscrption = 
                        new NicheApplicationBL(currentUser.ChurchId.Value)
                            .GetNicheInscriptionRequest(invDtl.RefDocNumber);
                    if (nicheInscrption == null)
                    {
                        docCode = invDtl.RefDocNumber;
                        returnBool = false;
                    }
                    break;
                    
                case "NAPP":
                    NicheApplication nicheApplication = 
                        new NicheApplicationBL(currentUser.ChurchId.Value)
                            .GetNicheApplication(invDtl.RefDocNumber);
                    if (nicheApplication == null)
                    {
                        docCode = invDtl.RefDocNumber;
                        returnBool = false;
                    }
                    break;
                    
                case "WAPP":
                    WakeRoomBooking wakeRoom = 
                        new WakeRoomBL(currentUser.ChurchId.Value)
                            .GetWakeRoomBooking(invDtl.RefDocNumber);
                    if (wakeRoom == null)
                    {
                        docCode = invDtl.RefDocNumber;
                        returnBool = false;
                    }
                    break;
                    
                case "DONA":
                    nicheApplication = 
                        new NicheApplicationBL(currentUser.ChurchId.Value)
                            .GetNicheApplication(invDtl.RefDocNumber);
                    if (nicheApplication == null)
                    {
                        docCode = invDtl.RefDocNumber;
                        returnBool = false;
                    }
                    break;
            }
            
            // If validation failed, break and return error
            if (docCode != string.Empty)
            {
                returnBool = false;
                break;
            }
        }
    }
    
    return returnBool;
}
```

### Validation Flow in SaveInvoice

**Location**: `Src/TGS.BPOp.Franciscans.BL/InvoiceBL.cs`

**Method**: `SaveInvoice()`

**Flow**:
```csharp
public string SaveInvoice(Entity.Invoice _Invoice, List<Entity.InvoiceDetail> _InvoiceDetail, User currentUser)
{
    // 1. Extract RefDocNumber from first invoice detail
    string RefDocNum = string.Empty;
    foreach (var invDtl in _InvoiceDetail)
    {
        RefDocNum = invDtl.RefDocNumber;
        break;  // Get first one
    }
    
    // 2. Check for duplicate invoice
    var DuplicateChecking = GetDuplicateInvoice(
        _Invoice.CustomerName, 
        ItemIdF, 
        RefDocNum, 
        _Invoice.TransactionDate
    );
    
    if (DuplicateChecking != null)
    {
        return "Duplicate Invoice Found";
    }
    
    // 3. Validate that referenced documents exist
    bool validate = ValidateInvoiceDetailsSave(_InvoiceDetail, currentUser, out savingStatus);
    
    if (validate == true)
    {
        // Save invoice
        int inssRqstId = mSSQLHelper.AddInvoiceAndDetail(_Invoice, _InvoiceDetail);
        savingStatus = (inssRqstId > 0) ? _Invoice.Code : "";
    }
    else
    {
        savingStatus = "Wrong Ref Document Number";  // ← Validation failed
    }
    
    return savingStatus;
}
```

### Error Messages

| Error Message | Cause |
|---------------|-------|
| `"Wrong Ref Document Number"` | Referenced document (RefDocNumber) does not exist |
| `"Duplicate Invoice Found"` | Invoice already exists for same RefDocNumber + CustomerName + ItemId + Date |

---

## Duplicate Invoice Checking

### Purpose

Prevents creating multiple invoices for the same source document on the same day with the same item.

### Duplicate Check Method

**Location**: `Src/TGS.BPOp.Franciscans.DA/MSSQLHelper.cs`

**Method**: `GetDuplicateInvoice()`

**Code**:
```csharp
public Entity.Invoice GetDuplicateInvoice(
    string _ApplicantName, 
    int Item, 
    string RefDoc, 
    DateTime? _InvoiceDate)
{
    Entity.Invoice invoice = null;
    
    var dbInvoicesWthDtls = from invcs in db.Invoices
                            join invcDtls in db.InvoiceDetails on invcs.InvoiceId equals invcDtls.InvoiceId
                            where invcs.CustomerName == _ApplicantName
                            && invcs.TransactionDate == _InvoiceDate
                            && invcDtls.ItemId == Item
                            && invcDtls.RefDocNumber == RefDoc  // ← Key check
                            && invcs.ChurchId.Value.Equals(ChurchId)
                            select new { invcs, invcDtls };
    
    if (dbInvoicesWthDtls != null && dbInvoicesWthDtls.Count() > 0)
    {
        invoice = this.ConvertToInvoice(dbInvoicesWthDtls.FirstOrDefault().invcs);
        // ... populate details ...
    }
    
    return invoice;
}
```

### Duplicate Check Criteria

An invoice is considered a duplicate if **ALL** of the following match:
1. ✅ **CustomerName** (same customer)
2. ✅ **ItemId** (same item)
3. ✅ **RefDocNumber** (same source document)
4. ✅ **TransactionDate** (same date)
5. ✅ **ChurchId** (same church/tenant)

**Note**: The check uses `RefDocNumber` from `InvoiceDetail`, not from `Invoice` header.

---

## Query Operations & Linking

### 1. Finding Invoices by RefDocNumber

**Use Case**: Get all invoices created for a specific NicheApplication

**Location**: `Src/TGS.BPOp.Franciscans.DA/MSSQLHelper.cs`

**Query Pattern**:
```csharp
var dbInvoicesWthDtls = from invcs in db.Invoices
                        join invcDtls in db.InvoiceDetails on invcs.InvoiceId equals invcDtls.InvoiceId
                        where invcDtls.RefDocNumber.Equals("NAPP-0001")  // ← Filter by RefDocNumber
                        && invcs.ChurchId.Value.Equals(ChurchId)
                        select new { invcs, invcDtls };
```

### 2. Joining Source Documents with Invoices

**Use Case**: Get NicheApplication with its associated invoices

**Location**: `Src/TGS.BPOp.Franciscans.DA/MSSQLHelper.cs`

**Query Pattern**:
```csharp
var dbNicheAgreements = from nicheApp in db.NicheApplications
                       join invdtls in db.InvoiceDetails 
                           on nicheApp.Code equals invdtls.RefDocNumber  // ← Join on RefDocNumber
                       into invdetilsprnt
                       from invdtls in invdetilsprnt.DefaultIfEmpty()
                       where nicheApp.Code.Equals(_NichAppCode)
                       && nicheApp.ChurchId.Value.Equals(ChurchId)
                       select new { nicheApp, invdtls };
```

**Result**: Returns NicheApplication with its linked InvoiceDetails (if any).

### 3. Finding Receipts by RefDocNumber

**Use Case**: Get all receipts for invoices linked to a specific NicheApplication

**Query Pattern**:
```csharp
var dbNicheAgreements = from nicheApp in db.NicheApplications
                       join invdtls in db.InvoiceDetails 
                           on nicheApp.Code equals invdtls.RefDocNumber
                       join miscrec in db.MisalaniousReceiptDetails 
                           on invdtls.RefDocNumber equals miscrec.RefDocNumber  // ← Join receipts
                       into miscrecprint
                       where nicheApp.Code.Equals(_NichAppCode)
                       select new { nicheApp, invdtls, miscrec };
```

**Key Point**: Receipts preserve `RefDocNumber` from invoices, enabling direct linking.

### 4. Populating RefDocNumber in Print Objects

**Use Case**: Display RefDocNumber in printed reports

**Location**: `Src/TGS.BPOp.Franciscans.DA/MSSQLHelper.cs`

**Code**:
```csharp
nicheAgreement.RefDocNumber = dbNicheAgreement.invdtls != null 
    ? dbNicheAgreement.invdtls.RefDocNumber 
    : null;
```

This populates the `RefDocNumber` field in print/view objects for display purposes.

---

## Receipt Creation & Preservation

### Flow

1. **User creates Receipt from Invoice**
2. **System retrieves InvoiceDetails** (which contain RefDocNumber)
3. **System creates MisalaniousReceiptDetail** records
4. **System copies RefDocNumber** from InvoiceDetail to MisalaniousReceiptDetail

### Code Implementation

**Location**: `Src/TGS.BPOp.Franciscans.WebUI/Invoice/InduvidualReceiptCapture.aspx.cs`

**Method**: `CaptureReceipt()`

**Code**:
```csharp
public static string CaptureReceipt(string invoiceEntityDescription, string lineItemArrayEntityDescription)
{
    // 1. Deserialize invoice and details
    Invoice invoice = javaScriptSerializer.Deserialize<Invoice>(invoiceEntityDescription);
    List<InvoiceDetail> invoiceDetailList = 
        javaScriptSerializer.Deserialize<List<InvoiceDetail>>(lineItemArrayEntityDescription);
    
    // 2. Create Receipt header
    Receipt ObjReceipt = new Receipt();
    ObjReceipt.InvoiceId = invoice.InvoiceId;
    ObjReceipt.TransactionDate = System.DateTime.Now;
    // ... other fields ...
    
    var retval = paymentBl.SaveReceipt(ObjReceipt);
    receiptCode = retval;
    ReceiptId = paymentBl.getReceiptIdByCode(receiptCode);
    
    // 3. Create Receipt details (preserving RefDocNumber)
    if (invoiceDetailList != null && invoiceDetailList.Count > 0)
    {
        List<MisalaniousReceiptDetail> MisRecptList = new List<MisalaniousReceiptDetail>();
        foreach (var recpt in invoiceDetailList)
        {
            MisalaniousReceiptDetail MisRecpt = new MisalaniousReceiptDetail();
            MisRecpt.ReceiptId = ReceiptId;
            MisRecpt.ItemId = recpt.ItemId;
            MisRecpt.PayingAmount = recpt.PayingAmount;
            MisRecpt.Quantity = recpt.Quantity;
            
            // ← PRESERVE RefDocNumber from InvoiceDetail
            MisRecpt.RefDocName = recpt.RefDocName;
            MisRecpt.RefDocNumber = recpt.RefDocNumber;  // ← Key preservation
            MisRecpt.RefType = recpt.RefType;
            
            MisRecpt.TotalPayingAmount = recpt.TotalPayingAmount.Value;
            MisRecpt.UnitAmount = recpt.UnitAmount;
            MisRecptList.Add(MisRecpt);
        }
        if (MisRecptList.Count > 0)
        {
            paymentBl.SaveReceiptDetails(ReceiptId, MisRecptList);
        }
    }
    
    return receiptCode;
}
```

### Why Preserve RefDocNumber?

1. **Audit Trail**: Track which source document a receipt is for
2. **Reporting**: Generate reports showing receipts by source document
3. **Linking**: Join receipts directly to source documents without going through invoices
4. **Data Integrity**: Maintain referential integrity even if invoice is deleted

---

## Frontend Usage

### 1. Document Loading

**File**: `Src/TGS.BPOp.Franciscans.WebUI/Invoice/Index.aspx`

**JavaScript Function**: `loadRefDocument()`

**Purpose**: Loads source document when user enters RefDocNumber

```javascript
function loadRefDocument() {
    var refDocCode = $("#refDocCodeTxt").val();
    if (refDocCode != "") {
        $.ajax({
            type: "POST",
            url: "Capture.aspx/LoadRefDocument",
            data: "{'refDocCode':'" + refDocCode + "'}",
            success: function (msg) {
                refDocEntity = eval("(" + msg.d + ")");
                
                // Set RefDocName based on prefix
                if (refDocEntity.DocPrefix == "INCR") {
                    $("#refDocName").val("INCR");
                    refTaskId = 4;
                }
                else if (refDocEntity.DocPrefix == "NAPP") {
                    $("#refDocName").val("NAPP");
                    refTaskId = 1;
                }
                else if (refDocEntity.DocPrefix == "WAPP") {
                    $("#refDocName").val("WAPP");
                    refTaskId = 2;
                }
                else if (refDocEntity.DocPrefix == "GOLA") {
                    $("#refDocName").val("GOLA");
                    refTaskId = 3;
                }
            }
        });
    }
}
```

### 2. Setting RefDocNumber in Invoice Details

**File**: `Src/TGS.BPOp.Franciscans.WebUI/Invoice/Capture.aspx`

**JavaScript**: When adding invoice line items, RefDocNumber is set from the loaded document:

```javascript
// When creating invoice detail row
function addNewDecReord() {
    // ... create row ...
    
    // Set RefDocNumber from loaded document
    $("#lineItem" + lastLineItemTRIndex + "RefDocNumber").val(refDocEntity.Code);
    $("#lineItem" + lastLineItemTRIndex + "RefDocName").val(refDocEntity.DocPrefix);
    $("#lineItem" + lastLineItemTRIndex + "RefType").val(refDocEntity.DocPrefix);
}
```

### 3. Invoice Submission

**JavaScript**: When submitting invoice, RefDocNumber is included in JSON:

```javascript
function saveInvoice() {
    var invoiceDetails = [];
    
    for (var i = 0; i <= lastLineItemTRIndex; i++) {
        if ($("#lineItemSelect" + i).val() != undefined) {
            var invoiceDetail = {
                ItemId: $("#lineItemSelect" + i).val(),
                Quantity: $("#lineItem" + i + "Quantity").val(),
                UnitAmount: $("#lineItem" + i + "Amount").val(),
                RefDocNumber: $("#lineItem" + i + "RefDocNumber").val(),  // ← Included
                RefDocName: $("#lineItem" + i + "RefDocName").val(),      // ← Included
                RefType: $("#lineItem" + i + "RefType").val()              // ← Included
            };
            invoiceDetails.push(invoiceDetail);
        }
    }
    
    $.ajax({
        type: "POST",
        url: "Capture.aspx/SaveInvoice",
        data: JSON.stringify({
            invoiceEntityDescription: JSON.stringify(invoice),
            lineItemArrayEntityDescription: JSON.stringify(invoiceDetails)
        }),
        success: function (msg) {
            // Handle response
        }
    });
}
```

---

## Backend Usage

### 1. Invoice Creation (Business Logic)

**File**: `Src/TGS.BPOp.Franciscans.BL/InvoiceBL.cs`

**Method**: `SaveInvoice()`

**Key Operations**:
1. Extract RefDocNumber from invoice details
2. Check for duplicates using RefDocNumber
3. Validate RefDocNumber exists
4. Save invoice with RefDocNumber

### 2. Automatic Invoice Creation

**File**: `Src/TGS.BPOp.Franciscans.BL/NicheApplicationBL.cs`

**Method**: `CreateInvoiceForBooking()`

**Key Operations**:
1. Get NicheApplication code
2. Set RefDocNumber = NicheApplication.Code
3. Set RefDocName = "NAPP"
4. Create invoice details with RefDocNumber

### 3. Data Access Layer

**File**: `Src/TGS.BPOp.Franciscans.DA/MSSQLHelper.cs`

**Method**: `AddInvoiceAndDetail()`

**Operation**: Saves Invoice and InvoiceDetail records, including RefDocNumber

**Code**:
```csharp
public int AddInvoiceAndDetail(Entity.Invoice _Invoice, List<Entity.InvoiceDetail> _InvoiceDetailList)
{
    int savingResult = -1;
    if (_Invoice != null)
    {
        DA.Invoice daInvoice = this.ConvertToDaInvoice(_Invoice);
        db.Invoices.AddObject(daInvoice);
        db.SaveChanges();
        savingResult = daInvoice.InvoiceId;
        
        if (savingResult > 0)
        {
            foreach (Entity.InvoiceDetail invoiceDetail in _InvoiceDetailList)
            {
                DA.InvoiceDetail daInvoiceDetail = this.ConvertToDaInvoiceDetail(invoiceDetail);
                daInvoiceDetail.InvoiceId = savingResult;
                // RefDocNumber is included in conversion
                db.InvoiceDetails.AddObject(daInvoiceDetail);
            }
            db.SaveChanges();
        }
    }
    return savingResult;
}
```

### 4. Query Operations

**Common Query Patterns**:

**Pattern 1**: Find invoices by RefDocNumber
```csharp
var invoices = from inv in db.Invoices
               join invDtl in db.InvoiceDetails on inv.InvoiceId equals invDtl.InvoiceId
               where invDtl.RefDocNumber == "NAPP-0001"
               select inv;
```

**Pattern 2**: Join source documents with invoices
```csharp
var agreements = from app in db.NicheApplications
                 join invDtl in db.InvoiceDetails on app.Code equals invDtl.RefDocNumber
                 where app.Code == "NAPP-0001"
                 select new { app, invDtl };
```

**Pattern 3**: Find receipts by RefDocNumber
```csharp
var receipts = from rec in db.Receipts
               join recDtl in db.MisalaniousReceiptDetails on rec.ReceiptId equals recDtl.ReceiptId
               where recDtl.RefDocNumber == "NAPP-0001"
               select rec;
```

---

## Complete Flow Examples

### Example 1: Manual Invoice Creation for NicheApplication

**Scenario**: User creates invoice for NicheApplication "NAPP-0001"

**Flow**:
```
1. User enters "NAPP-0001" in refDocCodeTxt
   ↓
2. JavaScript calls LoadRefDocument("NAPP-0001")
   ↓
3. Backend identifies prefix "NAPP" and calls GetNicheApplication("NAPP-0001")
   ↓
4. Backend returns NicheApplication entity
   ↓
5. Frontend sets:
   - refDocId = "NAPP-0001"
   - refDocName = "NAPP"
   - refTaskId = 1
   ↓
6. Frontend loads task-mapped items (TaskId=1)
   ↓
7. User adds line items, RefDocNumber is set to "NAPP-0001" for each
   ↓
8. User clicks "Save Invoice"
   ↓
9. JavaScript sends invoice details with RefDocNumber="NAPP-0001"
   ↓
10. Backend SaveInvoice():
    - Extracts RefDocNumber = "NAPP-0001"
    - Checks duplicate (CustomerName + ItemId + RefDocNumber + Date)
    - Validates NicheApplication exists (GetNicheApplication("NAPP-0001"))
    - Saves Invoice and InvoiceDetail with RefDocNumber="NAPP-0001"
   ↓
11. Database stores:
    - InvoiceDetail.RefDocNumber = "NAPP-0001"
    - InvoiceDetail.RefDocName = "NAPP"
```

### Example 2: Automatic Invoice Creation on Booking

**Scenario**: System automatically creates invoice when NicheBooking is created

**Flow**:
```
1. User creates NicheBooking from NicheApplication "NAPP-0001"
   ↓
2. Backend CreateNichBooking() is called
   ↓
3. Backend calls CreateInvoiceForBooking(nicheApplication, userId)
   ↓
4. CreateInvoiceForBooking():
    - Gets task-mapped items (TaskId=1 for NAPP)
    - For each item, creates InvoiceDetail:
      * RefDocNumber = nicheApplication.Code ("NAPP-0001")
      * RefDocName = "NAPP"
      * RefType = "NAPP"
   ↓
5. Backend calls InvoiceBL.SaveInvoice()
   ↓
6. SaveInvoice():
    - Validates NicheApplication exists
    - Checks for duplicates
    - Saves Invoice and InvoiceDetail
   ↓
7. Database stores:
    - InvoiceDetail.RefDocNumber = "NAPP-0001"
    - InvoiceDetail.RefDocName = "NAPP"
```

### Example 3: Receipt Creation from Invoice

**Scenario**: User creates receipt for invoice linked to "NAPP-0001"

**Flow**:
```
1. User selects Invoice "00001" (linked to NAPP-0001)
   ↓
2. System loads InvoiceDetails (RefDocNumber="NAPP-0001")
   ↓
3. User clicks "Save Receipt"
   ↓
4. JavaScript sends invoice details (with RefDocNumber) to CaptureReceipt()
   ↓
5. Backend CaptureReceipt():
    - Creates Receipt header
    - For each InvoiceDetail, creates MisalaniousReceiptDetail:
      * RefDocNumber = recpt.RefDocNumber ("NAPP-0001")  ← Preserved
      * RefDocName = recpt.RefDocName ("NAPP")            ← Preserved
      * RefType = recpt.RefType ("NAPP")                  ← Preserved
   ↓
6. Database stores:
    - MisalaniousReceiptDetail.RefDocNumber = "NAPP-0001"
    - MisalaniousReceiptDetail.RefDocName = "NAPP"
```

### Example 4: Querying Invoices by RefDocNumber

**Scenario**: Get all invoices for NicheApplication "NAPP-0001"

**Flow**:
```
1. Backend calls GetNicheAgreementPrint("NAPP-0001")
   ↓
2. Query joins:
   - NicheApplication.Code = "NAPP-0001"
   - InvoiceDetail.RefDocNumber = "NAPP-0001"
   ↓
3. Returns:
   - NicheApplication details
   - Associated InvoiceDetails (with RefDocNumber)
   - Associated ReceiptDetails (with RefDocNumber)
```

---

## Database Indexes

### Index on RefDocNumber

**Purpose**: Optimize queries that filter or join on RefDocNumber

**Definition**:
```sql
CREATE NONCLUSTERED INDEX [IX_InvoiceDetail_RefDocNumber] 
ON [dbo].[InvoiceDetail]
(
    [RefDocNumber] ASC
)
```

**Benefits**:
- Fast lookups: `WHERE RefDocNumber = 'NAPP-0001'`
- Fast joins: `JOIN ... ON app.Code = invDtl.RefDocNumber`
- Improved performance for reports and queries

**Usage**: Automatically used by SQL Server when queries filter or join on RefDocNumber

---

## Summary

### Key Points

1. **RefDocNumber is a String-Based Foreign Key**
   - Links invoices/receipts to source documents
   - Stored as `nvarchar(50)` in database
   - No actual database foreign key constraint (flexible design)

2. **RefDocName Identifies Document Type**
   - NAPP, INCR, WAPP, GOLA, DONA, OTHERS
   - Determines validation method and business logic

3. **Validation Ensures Data Integrity**
   - System validates RefDocNumber exists before saving invoice
   - Prevents orphaned records and typos

4. **Duplicate Checking Uses RefDocNumber**
   - Prevents multiple invoices for same document on same day
   - Checks: CustomerName + ItemId + RefDocNumber + Date

5. **Receipts Preserve RefDocNumber**
   - MisalaniousReceiptDetail copies RefDocNumber from InvoiceDetail
   - Maintains audit trail and enables direct queries

6. **Database Index Optimizes Performance**
   - Non-clustered index on RefDocNumber for fast lookups and joins

7. **No Stored Procedures**
   - All operations use Entity Framework (LINQ to SQL)
   - Direct SQL queries for complex joins

### Complete Data Flow

```
Source Document (NAPP-0001)
    ↓ [User creates Invoice]
InvoiceDetail.RefDocNumber = "NAPP-0001"
    ↓ [User creates Receipt]
MisalaniousReceiptDetail.RefDocNumber = "NAPP-0001"  (preserved)
```

### Query Capabilities

- ✅ Find all invoices for a NicheApplication
- ✅ Find all receipts for a NicheApplication
- ✅ Join source documents with financial documents
- ✅ Generate reports by source document
- ✅ Track payment history by source document

---

**End of Document**

