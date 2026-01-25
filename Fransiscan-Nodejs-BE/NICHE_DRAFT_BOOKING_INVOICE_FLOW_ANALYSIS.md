# Niche Draft → Booking → Invoice Flow: Deep Analysis

## Table of Contents
1. [Overview](#overview)
2. [Status Definitions](#status-definitions)
3. [Complete Flow Cycle](#complete-flow-cycle)
4. [Phase 1: Draft Creation (NicheApplication)](#phase-1-draft-creation-nicheapplication)
5. [Phase 2: Invoice Creation](#phase-2-invoice-creation)
6. [Phase 3: Booking Creation](#phase-3-booking-creation)
7. [State Transitions](#state-transitions)
8. [Database Schema & Status Fields](#database-schema--status-fields)
9. [Code Flow Analysis](#code-flow-analysis)
10. [Key Business Rules](#key-business-rules)

---

## Overview

The niche booking system follows a three-phase lifecycle:
1. **Draft (NicheApplication)** - Initial application with Status = 1 (Captured/Draft)
2. **Invoice** - Financial document created from application, Status = 1 (Active)
3. **Booking (NicheBooking)** - Confirmed booking, Status changes to 3 (Booked)

The system ensures data integrity through status transitions and transaction-based operations.

**Important Note:** The detailed flow sections below were originally documented from the legacy ASP.NET implementation. The current Node.js flow differs in several areas (code formats, booking + invoice coupling, and schema). The next section summarizes the current behavior.

---

## Current Node.js Flow (Fransiscan-Nodejs-BE)

This section reflects the current implementation in the Node.js backend:

1. **Draft/Application creation (optional)**  
   - If `nicheApplicationCode` is not provided, the booking API creates a new NicheApplication.
   - Application code format is now `XXXX-0` (numeric + `-0`), not `NAPP-XXXX`.

2. **Booking creation**  
   - Booking is created via `NicheBookingRepository.createBooking`.
   - `Niche.Status` and `NicheApplication.Status` are updated to `3` in the same transaction.
   - Booking code format is `NBK-00001` when the `Code` column exists.

3. **Auto-invoice (after booking creation)**  
   - Invoice items are derived from niche + optional inscription/urn/setting/sealing details.
   - 9% GST is applied per line and totals are calculated.
   - Invoice creation is handled by `InvoiceService.saveInvoice` with retry logic.
   - Receipt is created only when total paying amount > 0.

4. **Retrieval**  
   - Invoices are fetched by invoice code or by `RefDocNumber` (application code `XXXX-0`).

---

## Gap Summary (Legacy vs Current)

- Application code format changed from `NAPP-XXXX` to `XXXX-0`.
- Booking creation now auto-creates invoices (and can create the application if no code is supplied).
- Invoice item structure uses `UnitAmount`, `LineTotalAmount`, `LineTaxAmount` instead of legacy `UnitPrice/NetAmount/GrossAmount`.
- `RefType` and `OutstandingAmount` are not stored in `InvoiceDetail` in the current schema.
- Booking code format is `NBK-00001` (if column exists), not `NBOOK-XXXX`.

---

## Status Definitions

### NicheApplication Status (Core.cs enum)
```csharp
public enum NicheApplicationStatus
{ 
    New = 0,        // Not used in practice
    Captured = 1,   // Draft state - application created but not invoiced
    Invoiced = 2,   // Application has invoice (not commonly used)
    Confirmed = 3,  // Application converted to booking
    Cancelled = 4   // Application cancelled
}
```

### Niche Status
```csharp
public enum NicheStatus
{ 
    Reserved = 1,   // Niche reserved for application
    Booked = 3      // Niche confirmed as booked
}
```

### Invoice Status
- `0` = Deleted/Cancelled
- `1` = Active/Valid

### NicheBooking BookingStatus
- `0` = Cancelled
- `1` = Active/Confirmed

---

## Complete Flow Cycle

```
┌─────────────────────────────────────────────────────────────┐
│                    NICHE BOOKING LIFECYCLE                   │
└─────────────────────────────────────────────────────────────┘

1. DRAFT CREATION (NicheApplication)
   ├─ User fills application form
   ├─ SaveNicheApplication() called
   ├─ Status = 1 (Captured/Draft)
   ├─ Code generated: NAPP-XXXX
   └─ Niche Status = 1 (Reserved) or remains Vacant

2. INVOICE CREATION
   ├─ User creates invoice from application
   ├─ SaveInvoice() called
   ├─ Invoice Status = 1 (Active)
   ├─ Invoice Code generated: XXXXX (5-digit)
   ├─ InvoiceDetail links to NicheApplication via RefDocNumber
   └─ NicheApplication Status remains 1 (Draft)

3. BOOKING CREATION (NicheBooking)
   ├─ User confirms application (ConfirmNicheApplication)
   ├─ CreateNichBooking() called
   ├─ NicheBooking created with BookingStatus = 1
   ├─ NicheApplication Status → 3 (Confirmed/Booked)
   ├─ Niche Status → 3 (Booked)
   └─ Booking Code generated: NBOOK-XXXX (if Code column exists)

4. PAYMENT PROCESSING (Optional)
   ├─ Receipt created against Invoice
   ├─ Receipt Status = 2 (Paid)
   └─ Invoice Status remains 1 (Active)
```

---

## Phase 1: Draft Creation (NicheApplication)

### Frontend Flow
**File:** `Capture1.aspx.cs` / `Capture.aspx.cs`

```csharp
[System.Web.Services.WebMethod]
public static string CaptureNewNicheApplication(
    string nicheApplicationEntityDescription, 
    string beneficiary1EntityDescription, 
    string beneficiary2EntityDescription, 
    string beneficiary3EntityDescription)
{
    // 1. Deserialize JSON entities
    NicheApplication newNicheApplication = 
        javaScriptSerializer.Deserialize<NicheApplication>(nicheApplicationEntityDescription);
    newNicheApplication.UserId = CurrentUser.UserId;
    
    // 2. Build beneficiary list
    List<NicheApplicationBeneficiary> nicheApplicationBeneficiaryList = new List<NicheApplicationBeneficiary>();
    // ... add beneficiaries
    
    // 3. Filter out empty beneficiaries
    nicheApplicationBeneficiaryList = nicheApplicationBeneficiaryList.FindAll(o => o.Name != "");
    
    // 4. Call BL layer
    NicheApplicationBL nicheApplicationBL = new NicheApplicationBL(CurrentUser.ChurchId.Value);
    string applicationCode = nicheApplicationBL.SaveNicheApplication(
        newNicheApplication, 
        nicheApplicationBeneficiaryList);
    
    return applicationCode; // Returns "NAPP-XXXX" or empty string
}
```

### Business Logic Layer
**File:** `NicheApplicationBL.cs`

The `SaveNicheApplication` method (not visible in current file, but referenced) performs:
1. Validates application data
2. Generates application code: `NAPP-XXXX`
3. Sets initial Status = 1 (Captured/Draft)
4. Calls DAL to persist

### Data Access Layer
**File:** `MSSQLHelper.cs`

**Method:** `AddNicheApplicationAndBeneficiaries` (Line 10358)

```csharp
public int AddNicheApplicationAndBeneficiaries(
    Entity.NicheApplication _NicheApplication, 
    List<Entity.NicheApplicationBeneficiary> _NicheApplicationBeneficiaryList)
{
    int savingResult = -1;
    if (_NicheApplication != null)
    {
        // 1. Convert Entity to DA (Data Access) object
        DA.NicheApplication daNicheApplication = 
            this.ConvertToDaNicheApplication(_NicheApplication);
        
        // 2. Add to Entity Framework context
        db.NicheApplications.AddObject(daNicheApplication);
        db.SaveChanges();
        savingResult = daNicheApplication.NicheApplicationId;
        
        // 3. Insert beneficiaries if application saved successfully
        if (savingResult > 0)
        {
            foreach (Entity.NicheApplicationBeneficiary nicheApplicationBeneficiary 
                in _NicheApplicationBeneficiaryList)
            {
                DA.NicheApplicationBeneficiary daNicheApplicationBeneficiary = 
                    this.ConvertToDaNicheApplicationBeneficiary(nicheApplicationBeneficiary);
                daNicheApplicationBeneficiary.NicheApplicationId = savingResult;
                db.NicheApplicationBeneficiaries.AddObject(daNicheApplicationBeneficiary);
            }
            db.SaveChanges();
        }
    }
    return savingResult;
}
```

**Key Points:**
- Application created with `Status = 1` (Captured/Draft)
- Code format: `NAPP-XXXX` (generated in BL layer)
- Niche status may be updated to Reserved (Status = 1) if applicable
- Beneficiaries linked via `NicheApplicationId`

---

## Phase 2: Invoice Creation

### Frontend Flow
**File:** `Capture1.aspx.cs`

```csharp
[System.Web.Services.WebMethod]
public static string CaptureInvoice(
    string invoiceEntityDescription, 
    string lineItemArrayEntityDescription)
{
    // 1. Deserialize invoice and details
    Invoice invoice = javaScriptSerializer.Deserialize<Invoice>(invoiceEntityDescription);
    invoice.UserId = CurrentUser.UserId;
    
    List<InvoiceDetail> invoiceDetailList = 
        javaScriptSerializer.Deserialize<List<InvoiceDetail>>(lineItemArrayEntityDescription);
    
    // 2. Call BL layer
    InvoiceBL invoiceBL = new InvoiceBL(CurrentUser.ChurchId.Value);
    string invoiceCode = invoiceBL.SaveInvoice(invoice, invoiceDetailList, CurrentUser);
    
    return invoiceCode; // Returns invoice code or error message
}
```

### Business Logic Layer
**File:** `InvoiceBL.cs`

**Method:** `SaveInvoice` (Line 47)

```csharp
public string SaveInvoice(
    Entity.Invoice _Invoice, 
    List<Entity.InvoiceDetail> _InvoiceDetail, 
    User currentUser)
{
    string savingStatus = string.Empty;
    
    // 1. Extract RefDocNumber from invoice details
    string RefDocNum = string.Empty;
    int ItemIdF = 0;
    foreach (var invDtl in _InvoiceDetail)
    {
        ItemIdF = invDtl.ItemId;
        RefDocNum = invDtl.RefDocNumber; // e.g., "NAPP-0001"
    }
    
    // 2. Check for duplicate invoice
    var DuplicateChecking = GetDuplicateInvoice(
        _Invoice.CustomerName, ItemIdF, RefDocNum, _Invoice.TransactionDate);
    
    if (DuplicateChecking != null)
    {
        return "Duplicate Invoice Found";
    }
    
    // 3. Validate invoice details (check if RefDoc exists)
    bool validate = ValidateInvoiceDetailsSave(_InvoiceDetail, currentUser, out savingStatus);
    
    if (validate == true)
    {
        if (_Invoice.InvoiceId == null || _Invoice.InvoiceId == 0)
        {
            // NEW INVOICE
            _Invoice.Status = 1; // Active
            
            // Generate invoice code (5-digit number)
            int lastNumber = mSSQLHelper.GetLastInvoiceCode();
            string number = String.Format("{0:D5}", lastNumber + 1);
            _Invoice.Code = number; // e.g., "00001"
            
            // Save invoice and details
            int inssRqstId = mSSQLHelper.AddInvoiceAndDetail(_Invoice, _InvoiceDetail);
            savingStatus = (inssRqstId > 0) ? _Invoice.Code : "";
        }
        else if (_Invoice.InvoiceId > 0)
        {
            // UPDATE - Not allowed
            savingStatus = "Cannot edit invoice";
        }
    }
    else
    {
        savingStatus = "Wrong Ref Document Number";
    }
    
    return savingStatus;
}
```

**Validation Method:** `ValidateInvoiceDetailsSave` (Line 118)

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
        if (invDtl.RefType.ToUpper() == "OTHERS")
        {
            returnBool = true; // No validation for "OTHERS"
        }
        else
        {
            // Validate based on RefDocName
            switch (invDtl.RefDocName)
            {
                case "NAPP":
                    // Validate NicheApplication exists
                    NicheApplication nicheApplication = 
                        new NicheApplicationBL(currentUser.ChurchId.Value)
                            .GetNicheApplication(invDtl.RefDocNumber);
                    if (nicheApplication == null)
                    {
                        docCode = invDtl.RefDocNumber;
                        returnBool = false; // Document not found
                    }
                    break;
                case "INCR":
                    // Validate NicheInscriptionRequest exists
                    // ...
                    break;
                case "WAPP":
                    // Validate WakeRoomBooking exists
                    // ...
                    break;
                case "GOLA":
                    // Validate EngraveWallApplication exists
                    // ...
                    break;
            }
        }
    }
    
    return returnBool;
}
```

### Data Access Layer
**File:** `MSSQLHelper.cs`

**Method:** `AddInvoiceAndDetail` (Line 9847)

```csharp
public int AddInvoiceAndDetail(
    Entity.Invoice _Invoice, 
    List<Entity.InvoiceDetail> _InvoiceDetailList)
{
    int savingResult = -1;
    if (_Invoice != null)
    {
        // 1. Convert and save Invoice
        DA.Invoice daInvoice = this.ConvertToDaInvoice(_Invoice);
        db.Invoices.AddObject(daInvoice);
        db.SaveChanges();
        savingResult = daInvoice.InvoiceId;
        
        // 2. Save InvoiceDetails
        if (savingResult > 0)
        {
            foreach (Entity.InvoiceDetail invoiceDetail in _InvoiceDetailList)
            {
                DA.InvoiceDetail daInvoiceDetail = 
                    this.ConvertToDaInvoiceDetail(invoiceDetail);
                daInvoiceDetail.InvoiceId = savingResult;
                db.InvoiceDetails.AddObject(daInvoiceDetail);
            }
            db.SaveChanges();
        }
    }
    return savingResult;
}
```

**Key Points:**
- Invoice created with `Status = 1` (Active)
- Invoice Code: 5-digit number (e.g., "00001")
- InvoiceDetail contains:
  - `RefDocName`: "NAPP" (for NicheApplication)
  - `RefDocNumber`: Application code (e.g., "NAPP-0001")
  - `ItemId`: Item being invoiced
- **NicheApplication Status remains 1 (Draft)** - Invoice creation does NOT change application status

---

## Phase 3: Booking Creation

### Frontend Flow
**File:** `Capture1.aspx.cs`

```csharp
[System.Web.Services.WebMethod]
public static string ConfirmNicheApplication(string nicheApplicationCode)
{
    string returnValue = "serverError";
    
    try
    {
        NicheApplicationBL nicheApplicationBL = 
            new NicheApplicationBL(CurrentUser.ChurchId.Value);
        
        // Call BL to create booking from application
        if (nicheApplicationBL.CreateNichBooking(nicheApplicationCode, CurrentUser.UserId))
        {
            returnValue = "success";
        }
        else
        {
            returnValue = "alreadyConfirmed"; // Booking already exists
        }
    }
    catch (Exception ex)
    {
        returnValue = "serverError";
    }
    
    return returnValue;
}
```

### Business Logic Layer
**File:** `NicheApplicationBL.cs`

**Method:** `CreateNichBooking` (not fully visible, but referenced)

The method performs:
1. Retrieves NicheApplication by code
2. Validates application exists and is in correct state
3. Creates NicheBooking entity
4. Updates NicheApplication Status to 3 (Confirmed/Booked)
5. Updates Niche Status to 3 (Booked)
6. Creates NicheBookingBeneficiary records

### Data Access Layer
**File:** `MSSQLHelper.cs`

**Method:** `AddNicheBooking` (Line 9378)

```csharp
public int AddNicheBooking(Entity.NicheBooking _NicheBooking)
{
    int savingResult = -1;
    if (_NicheBooking != null)
    {
        DA.NicheBooking daNicheBooking = this.ConvertToDaNicheBooking(_NicheBooking);
        db.NicheBookings.AddObject(daNicheBooking);
        db.SaveChanges();
        savingResult = daNicheBooking.NicheBookingId;
    }
    return savingResult;
}
```

**Status Update Methods:**

**UpdateNicheApplication_StatusforUpdrade** (Line 10124)
```csharp
public bool UpdateNicheApplication_StatusforUpdrade(
    int _NicheApplicationId, 
    int _StatusId)
{
    var dbBookApp = (from nchApps in db.NicheApplications
                     where nchApps.NicheApplicationId.Equals(_NicheApplicationId)
                     select nchApps).FirstOrDefault();
    dbBookApp.Status = _StatusId; // Set to 3 (Confirmed/Booked)
    db.NicheApplications.ApplyCurrentValues(dbBookApp);
    db.SaveChanges();
    return true;
}
```

**UpdateNiche_StatusforUpdrade** (Line 10109)
```csharp
public bool UpdateNiche_StatusforUpdrade(int _NicheId, int _StatusId)
{
    var dbBookApp = (from nchApps in db.Niches
                     where nchApps.NicheId.Equals(_NicheId)
                     select nchApps).FirstOrDefault();
    dbBookApp.Status = _StatusId; // Set to 3 (Booked)
    db.Niches.ApplyCurrentValues(dbBookApp);
    db.SaveChanges();
    return true;
}
```

**Key Points:**
- NicheBooking created with `BookingStatus = 1` (Active)
- **NicheApplication Status → 3** (Confirmed/Booked)
- **Niche Status → 3** (Booked)
- Booking Code: `NBOOK-XXXX` (if Code column exists in NicheBooking table)
- All status updates happen in a transaction to ensure data integrity

---

## State Transitions

### NicheApplication Status Flow

```
┌─────────────┐
│   Status 1  │  ← Draft/Captured (Initial state after SaveNicheApplication)
│  (Captured) │
└──────┬──────┘
       │
       │ [Invoice Created]
       │ (Status remains 1)
       │
       ▼
┌─────────────┐
│   Status 1  │  ← Still Draft, but has Invoice
│  (Captured) │
└──────┬──────┘
       │
       │ [ConfirmNicheApplication / CreateNichBooking]
       │
       ▼
┌─────────────┐
│   Status 3  │  ← Confirmed/Booked (Final state)
│ (Confirmed) │
└─────────────┘
```

### Niche Status Flow

```
┌─────────────┐
│  Status 1   │  ← Vacant (Initial)
│  (Vacant)   │
└──────┬──────┘
       │
       │ [Application Created]
       │ (May set to Reserved = 1, or remain Vacant)
       │
       ▼
┌─────────────┐
│  Status 1/2 │  ← Reserved (if applicable)
│ (Reserved)  │
└──────┬──────┘
       │
       │ [Booking Created]
       │
       ▼
┌─────────────┐
│   Status 3  │  ← Booked (Final state)
│  (Booked)   │
└─────────────┘
```

### Invoice Status Flow

```
┌─────────────┐
│   Status 1  │  ← Active (Created)
│  (Active)   │
└──────┬──────┘
       │
       │ [Receipt Created]
       │ (Status remains 1)
       │
       ▼
┌─────────────┐
│   Status 1  │  ← Still Active (with payment)
│  (Active)   │
└──────┬──────┘
       │
       │ [DeleteInvoice]
       │
       ▼
┌─────────────┐
│   Status 0  │  ← Deleted/Cancelled
│  (Deleted)  │
└─────────────┘
```

---

## Database Schema & Status Fields

### NicheApplication Table
```sql
CREATE TABLE NicheApplication (
    NicheApplicationId INT PRIMARY KEY IDENTITY(1,1),
    Code NVARCHAR(50),              -- Format: "NAPP-XXXX"
    Status INT,                      -- 1=Captured, 2=Invoiced, 3=Confirmed, 4=Cancelled
    NicheId INT,
    AppliedDate DATETIME,
    AgreementDate DATETIME,
    -- ... applicant, nominee, beneficiary fields
    ChurchId INT,
    UserId INT
)
```

### Niche Table
```sql
CREATE TABLE Niche (
    NicheId INT PRIMARY KEY IDENTITY(1,1),
    Code NVARCHAR(50),
    Status INT,                      -- 1=Vacant/Reserved, 3=Booked, 4=Occupied, 5=PartiallyOccupied
    -- ... other fields
)
```

### Invoice Table
```sql
CREATE TABLE Invoice (
    InvoiceId INT PRIMARY KEY IDENTITY(1,1),
    Code NVARCHAR(50),              -- Format: "00001" (5-digit)
    Status INT,                      -- 0=Deleted, 1=Active
    TransactionDate DATETIME,
    CustomerName NVARCHAR(250),
    -- ... other fields
    ChurchId INT,
    UserId INT
)
```

### InvoiceDetail Table
```sql
CREATE TABLE InvoiceDetail (
    InvoiceDetailId INT PRIMARY KEY IDENTITY(1,1),
    InvoiceId INT,
    ItemId INT,
    RefDocName NVARCHAR(50),        -- "NAPP", "INCR", "WAPP", "GOLA", "OTHERS"
    RefDocNumber NVARCHAR(50),      -- Application code (e.g., "NAPP-0001")
    Quantity DECIMAL(18,2),
    UnitPrice DECIMAL(18,2),
    NetAmount DECIMAL(18,2),
    TaxAmount DECIMAL(18,2),
    GrossAmount DECIMAL(18,2)
)
```

### NicheBooking Table
```sql
CREATE TABLE NicheBooking (
    NicheBookingId INT PRIMARY KEY IDENTITY(1,1),
    Code NVARCHAR(50),              -- Format: "NBOOK-XXXX" (if column exists)
    NicheApplicationId INT,
    NicheId INT,
    ContactPersonId INT,
    NomineeId INT,
    NomineeId2 INT,
    BookedDate DATETIME,
    BookingStatus INT,              -- 0=Cancelled, 1=Active
    Remarks NVARCHAR(MAX),
    ChurchId INT,
    UserId INT
)
```

---

## Code Flow Analysis

### Complete Sequence Diagram

```
User                    Frontend              BL Layer              DAL Layer              Database
 │                        │                     │                     │                      │
 │──[Fill Form]──────────>│                     │                     │                      │
 │                        │                     │                     │                      │
 │──[Save Application]───>│                     │                     │                      │
 │                        │──[SaveNicheApplication]──────────────────>│                      │
 │                        │                     │                     │──[INSERT]────────────>│
 │                        │                     │                     │                      │ Status=1
 │                        │                     │                     │<──[ID]───────────────│
 │                        │                     │                     │──[INSERT Beneficiaries]>│
 │                        │                     │                     │<──[Success]──────────│
 │                        │<──[Code: NAPP-0001]──│                     │                      │
 │<──[NAPP-0001]──────────│                     │                     │                      │
 │                        │                     │                     │                      │
 │──[Create Invoice]─────>│                     │                     │                      │
 │                        │──[SaveInvoice]─────>│                     │                      │
 │                        │                     │──[Validate RefDoc]──>│                      │
 │                        │                     │<──[Valid]───────────│                      │
 │                        │                     │──[AddInvoiceAndDetail]>│                  │
 │                        │                     │                     │──[INSERT Invoice]───>│
 │                        │                     │                     │                      │ Status=1
 │                        │                     │                     │──[INSERT Details]───>│
 │                        │                     │                     │<──[Success]──────────│
 │                        │<──[Code: 00001]──────│                     │                      │
 │<──[00001]──────────────│                     │                     │                      │
 │                        │                     │                     │                      │
 │──[Confirm Booking]────>│                     │                     │                      │
 │                        │──[CreateNichBooking]>│                    │                      │
 │                        │                     │──[Get Application]──>│                      │
 │                        │                     │<──[Application]──────│                      │
 │                        │                     │──[AddNicheBooking]──>│                      │
 │                        │                     │                     │──[INSERT Booking]───>│
 │                        │                     │                     │                      │ BookingStatus=1
 │                        │                     │                     │──[UPDATE Application]>│
 │                        │                     │                     │                      │ Status=3
 │                        │                     │                     │──[UPDATE Niche]──────>│
 │                        │                     │                     │                      │ Status=3
 │                        │                     │                     │<──[Success]──────────│
 │                        │<──[Success]─────────│                     │                      │
 │<──[Success]────────────│                     │                     │                      │
```

---

## Key Business Rules

### 1. Application Creation Rules
- **Status Initialization**: All new applications start with `Status = 1` (Captured/Draft)
- **Code Generation**: Format `NAPP-XXXX` where XXXX is auto-incremented
- **Niche Reservation**: Niche may be set to Reserved (Status = 1) or remain Vacant
- **Beneficiaries**: Can have up to 3 beneficiaries (filtered to remove empty entries)

### 2. Invoice Creation Rules
- **Validation**: Invoice can only be created if RefDocNumber (Application Code) exists
- **Duplicate Check**: System prevents duplicate invoices for same customer, item, and date
- **Status**: Invoice created with `Status = 1` (Active)
- **Code Generation**: 5-digit numeric code (e.g., "00001")
- **Application Status**: **Invoice creation does NOT change NicheApplication status** (remains 1)

### 3. Booking Creation Rules
- **Prerequisite**: Application must exist (Status = 1 or 2)
- **Status Updates**: 
  - NicheApplication Status → 3 (Confirmed/Booked)
  - Niche Status → 3 (Booked)
  - NicheBooking BookingStatus = 1 (Active)
- **Transaction Safety**: All status updates happen in a single transaction
- **Idempotency**: System checks if booking already exists before creating

### 4. State Transition Rules
- **Draft → Booking**: Direct transition possible via `CreateNichBooking`
- **Draft → Invoice → Booking**: Common flow where invoice is created first
- **No Rollback**: Once Status = 3 (Booked), application cannot revert to Draft
- **Cancellation**: Applications can be cancelled (Status = 4), which releases the niche

### 5. Invoice-Application Relationship
- **Linking**: InvoiceDetail.RefDocNumber contains Application Code
- **Multiple Invoices**: One application can theoretically have multiple invoices (though uncommon)
- **Status Independence**: Invoice status is independent of application status
- **Payment**: Receipt creation does not change application status (only invoice status)

---

## Summary

The niche booking system follows a clear three-phase lifecycle:

1. **Draft Phase (Status = 1)**: Application created, can be edited, niche may be reserved
2. **Invoice Phase**: Financial document created, application status unchanged
3. **Booking Phase (Status = 3)**: Application confirmed, niche booked, statuses updated atomically

**Critical Insight**: Invoice creation is **independent** of application status. The application remains in Draft (Status = 1) even after invoice creation. Only when `CreateNichBooking` is called do the statuses transition to Booked (Status = 3).

This design allows for:
- Flexible workflow (invoice can be created before or after booking confirmation)
- Data integrity (transaction-based status updates)
- Audit trail (clear status progression)
- Business flexibility (multiple invoices per application if needed)

