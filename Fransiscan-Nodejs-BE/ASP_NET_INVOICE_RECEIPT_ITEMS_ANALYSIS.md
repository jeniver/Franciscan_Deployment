# ASP.NET Invoice & Receipt Items - Deep Analysis

## Table of Contents
1. [Item System Overview](#item-system-overview)
2. [Item Entity Structure](#item-entity-structure)
3. [Item Database Schema](#item-database-schema)
4. [Item Dropdown Loading Mechanism](#item-dropdown-loading-mechanism)
5. [Item Selection in Invoices](#item-selection-in-invoices)
6. [Item Selection in Receipts](#item-selection-in-receipts)
7. [Task-Based Item Mapping](#task-based-item-mapping)
8. [Item Usage in Business Logic](#item-usage-in-business-logic)
9. [Invoice & Receipt Calculations](#invoice--receipt-calculations)
10. [Node.js Implementation Guide](#nodejs-implementation-guide)

---

## Item System Overview

The Item system in the ASP.NET project manages all chargeable items/services that can be added to invoices and receipts. Items are church-specific and can be:
- **Direct Selection**: Items selected directly from a dropdown list
- **Task-Mapped Items**: Items automatically suggested based on the task/document type
- **Reference Type Items**: Items that require a reference document

### Key Concepts
- **Item**: A chargeable service/product (e.g., "Niche Application Fee", "Urn", "Inscription")
- **Item Dropdown**: List of all available items for a church, populated on page load
- **Task Item Mapping**: Maps items to specific tasks based on document parameters
- **Church Isolation**: Items are filtered by ChurchId (multi-tenant)

---

## Item Entity Structure

### Item Class (Entity Layer)

**Location**: `Src/TGS.BPOp.Franciscans.Entity/Item.cs`

```csharp
public class Item
{
    public int ItemId { get; set; }          // Primary Key
    public string Name { get; set; }         // Item display name (e.g., "Niche Application Fee")
    public string Code { get; set; }         // Item code (e.g., "ITEM001")
    public decimal? Price { get; set; }      // Default/standard price
    public int ChurchId { get; set; }        // Church identifier (multi-tenant)
    public bool IsRefType { get; set; }      // Whether item requires reference document
    public string DocType { get; set; }      // Document type associated (e.g., "NAPP", "WAPP")
}
```

### Item Properties Details

| Property | Type | Description | Example |
|----------|------|-------------|---------|
| `ItemId` | int | Unique identifier | `1`, `2`, `3` |
| `Name` | string | Display name for dropdown | `"Niche Application Fee"`, `"Urn"`, `"Inscription"` |
| `Code` | string | Item code | `"ITEM001"`, `"URN01"` |
| `Price` | decimal? | Default unit price | `5000.00`, `1000.00` |
| `ChurchId` | int | Church/tenant identifier | `1`, `2` |
| `IsRefType` | bool | Requires reference document | `true`, `false` |
| `DocType` | string | Associated document type | `"NAPP"`, `"WAPP"`, `"INCR"`, `"GOLA"`, `"DONA"` |

---

## Item Database Schema

### Item Table Structure

```sql
CREATE TABLE [dbo].[Item](
    [ItemId] [int] NOT NULL PRIMARY KEY,
    [Name] [nvarchar](100) NULL,              -- Item display name
    [Code] [nvarchar](50) NULL,               -- Item code
    [Price] [decimal](18, 2) NULL,            -- Default price
    [ChurchId] [int] NOT NULL,                -- Multi-tenant identifier
    [IsRefType] [bit] NOT NULL,               -- Reference type flag
    [DocType] [nvarchar](50) NULL             -- Document type
)
```

### Item Table Relationships

```
Item
├── One-to-Many → InvoiceDetail (ItemId)
├── One-to-Many → MisalaniousReceiptDetail (ItemId)
└── One-to-Many → TaskItemMapping (ItemId)
```

### Sample Item Data

Based on code analysis, typical items might include:

| ItemId | Name | Code | Price | ChurchId | IsRefType | DocType |
|--------|------|------|-------|----------|-----------|---------|
| 1 | Niche Application Fee | ITEM001 | 5000.00 | 1 | true | NAPP |
| 2 | Wake Room Booking Fee | ITEM002 | 3000.00 | 1 | true | WAPP |
| 3 | Urn | URN01 | 800.00 | 1 | false | INCR |
| 4 | Inscription | INSC01 | 500.00 | 1 | false | INCR |
| 5 | Gate of Life Application | GOLA01 | 2000.00 | 1 | true | GOLA |
| 6 | Donation | DONA01 | 0.00 | 1 | false | DONA |

---

## Item Dropdown Loading Mechanism

### Frontend: JavaScript Loading

**Location**: `Src/TGS.BPOp.Franciscans.WebUI/Invoice/Capture.aspx` (Line 85-114)

```javascript
var items = []; // Global array to store items

function LoadItems() {
    $.ajax({
        type: "POST",
        url: "Capture.aspx/LoadItems",
        data: "{}",
        contentType: "application/json; charset=utf-8",
        datatype: "JSON",
        success: function (msg) {
            items = eval("(" + msg.d + ")");
            itemsOptionsStr = "";
            
            // Build dropdown options
            for (var i = 1; i <= items.length; i++) {
                var crntRecStr = "<option value='" + items[i - 1].ItemId + "'>" 
                    + items[i - 1].Name + "</option>";
                itemsOptionsStr += crntRecStr;
            }
            
            // Populate dropdown
            $("#itemDropdown").html(itemsOptionsStr);
        },
        error: function (error) {
            console.error("Error loading items:", error);
        }
    });
}

// Call on page load
$(document).ready(function() {
    LoadItems();
});
```

### Backend: WebMethod

**Location**: `Src/TGS.BPOp.Franciscans.WebUI/Invoice/Capture.aspx.cs` (Line 149-168)

```csharp
[System.Web.Services.WebMethod]
public static string LoadItems()
{
    string returnString = "serverError";
    try
    {
        InvoiceBL invoiceBL = new InvoiceBL(CurrentUser.ChurchId.Value);
        List<Item> itemlist = invoiceBL.GetAllItems();
        
        if (itemlist.Count > 0)
        {
            JavaScriptSerializer javaScriptSerializer = new JavaScriptSerializer();
            returnString = javaScriptSerializer.Serialize(itemlist);
        }
    }
    catch (Exception ex)
    {
        returnString = "serverError";
    }
    return returnString;
}
```

### Business Logic Layer

**Location**: `Src/TGS.BPOp.Franciscans.BL/InvoiceBL.cs` (Line 20-23)

```csharp
public List<Entity.Item> GetAllItems()
{
    return mSSQLHelper.GetItems();
}
```

### Data Access Layer

**Location**: `Src/TGS.BPOp.Franciscans.DA/MSSQLHelper.cs` (Line 6222-6237)

```csharp
public List<Entity.Item> GetItems()
{
    List<Entity.Item> itemlist = new List<Entity.Item>();
    
    // LINQ query filtered by ChurchId (multi-tenant)
    var dbItems = from itms in db.Items
                  where itms.ChurchId.Equals(ChurchId)
                  select itms;
    
    // Convert DA objects to Entity objects
    foreach (var dbItem in dbItems)
    {
        DA.Item daItem = dbItem;
        itemlist.Add(this.ConvertToItem(daItem));
    }
    
    return itemlist;
}
```

### Entity Conversion

**Location**: `Src/TGS.BPOp.Franciscans.DA/MSSQLHelper.cs` (Line 10640-10651)

```csharp
private Entity.Item ConvertToItem(DA.Item _Item)
{
    Entity.Item item = new Entity.Item();
    item.ItemId = _Item.ItemId;
    item.Code = _Item.Code;
    item.Name = _Item.Name;
    item.Price = _Item.Price;
    item.ChurchId = _Item.ChurchId;
    item.IsRefType = _Item.IsRefType;
    item.DocType = _Item.DocType;
    return item;
}
```

### Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────┐
│  1. Page Load (Capture.aspx)                            │
│     └── $(document).ready() → LoadItems()               │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│  2. JavaScript AJAX Call                                │
│     └── POST Capture.aspx/LoadItems                     │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│  3. WebMethod (Capture.aspx.cs)                         │
│     ├── InvoiceBL invoiceBL = new InvoiceBL(ChurchId)  │
│     ├── List<Item> itemlist = invoiceBL.GetAllItems()  │
│     └── Serialize to JSON                              │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│  4. Business Logic (InvoiceBL.cs)                       │
│     └── return mSSQLHelper.GetItems()                   │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│  5. Data Access (MSSQLHelper.cs)                        │
│     ├── LINQ Query: db.Items.Where(ChurchId)           │
│     ├── Convert DA.Item to Entity.Item                 │
│     └── Return List<Entity.Item>                       │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│  6. JSON Response to Frontend                           │
│     └── [{ItemId: 1, Name: "Item 1", ...}, ...]        │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│  7. Populate Dropdown                                   │
│     └── Build <option> elements and append to <select> │
└─────────────────────────────────────────────────────────┘
```

---

## Item Selection in Invoices

### Invoice Capture Page

**Location**: `Src/TGS.BPOp.Franciscans.WebUI/Invoice/Capture.aspx`

**Process**:
1. Page loads with `dropdownData` server-side variable
2. JavaScript `LoadItems()` called on page ready
3. Items loaded via AJAX into global `items[]` array
4. Dropdown populated with `<option value="ItemId">Item Name</option>`

**Code Example**:
```javascript
// Server-side data (if available)
itemsOptionsArrStr = '<%=dropdownData %>';

// Client-side loading (if server-side empty)
if (itemsOptionsStr == "") {
    LoadItems();
}

// Dropdown structure
<select id="itemDropdown" name="itemDropdown">
    <!-- Populated dynamically -->
    <option value="1">Niche Application Fee</option>
    <option value="2">Wake Room Booking Fee</option>
    <option value="3">Urn</option>
    <!-- ... more items ... -->
</select>
```

### Invoice Detail Line Item

When a user selects an item from the dropdown:
1. **ItemId** is stored in `InvoiceDetail.ItemId`
2. **Item Name** is displayed in the invoice line
3. **Item Price** can be used as default `UnitAmount`
4. **Reference Document** may be required if `IsRefType = true`

### Item Usage in InvoiceDetail

**InvoiceDetail Entity** includes:
- `ItemId` - Foreign key to Item table
- `Quantity` - Number of units
- `UnitAmount` - Price per unit (may come from Item.Price)
- `TotalPayingAmount` - Calculated: Quantity × UnitAmount

**SQL Relationship**:
```sql
InvoiceDetail
├── ItemId (FK) → Item.ItemId
└── Line Item displays: Item.Name, Item.Price (optional)
```

---

## Item Selection in Receipts

### Receipt Entry Page

**Location**: `Src/TGS.BPOp.Franciscans.WebUI/Invoice/ReceiptEntry.aspx.cs`

**Process**: Same as Invoice - uses `LoadItems()` WebMethod

```csharp
[System.Web.Services.WebMethod]
public static string LoadItems()
{
    string returnString = "serverError";
    try
    {
        InvoiceBL invoiceBL = new InvoiceBL(CurrentUser.ChurchId.Value);
        List<Item> itemlist = invoiceBL.GetAllItems();
        
        if (itemlist.Count > 0)
        {
            JavaScriptSerializer javaScriptSerializer = new JavaScriptSerializer();
            returnString = javaScriptSerializer.Serialize(itemlist);
        }
    }
    catch (Exception ex)
    {
        returnString = "serverError";
    }
    return returnString;
}
```

### Miscellaneous Receipt Detail

**Location**: `MisalaniousReceiptDetail` table

Items selected in miscellaneous receipts are stored in:
- `MisalaniousReceiptDetail.ItemId` - Foreign key to Item
- `MisalaniousReceiptDetail.Quantity`
- `MisalaniousReceiptDetail.UnitAmount`
- `MisalaniousReceiptDetail.TotalPayingAmount`

### Receipt Item Flow

```
1. User opens Receipt Entry page
   └── LoadItems() called

2. Dropdown populated with all items
   └── <select> shows Item.Name

3. User selects item
   └── ItemId stored

4. User enters quantity and amount
   └── Line item created

5. Receipt saved
   └── MisalaniousReceiptDetail.ItemId = selected ItemId
```

---

## Task-Based Item Mapping

### Overview

Task-based item mapping automatically suggests items based on:
- **Task Type**: Niche Application (TaskId=1), Wake Room (TaskId=7), etc.
- **Task Parameters**: Specific document attributes (e.g., NicheRowId, WakeRoomId)

### TaskItemMapping Entity

**Location**: `Src/TGS.BPOp.Franciscans.Entity/TaskItemMapping.cs`

```csharp
public class TaskItemMapping
{
    public int TaskItemMappingId { get; set; }
    public int TaskId { get; set; }                    // 1=NAPP, 4=INCR, 5=GOLA, 6=DONA, 7=WAPP
    public string TaskParameterName { get; set; }      // e.g., "NicheRowId", "WakeRoomId"
    public string TaskParameterValue { get; set; }     // e.g., "1", "2"
    public int ItemId { get; set; }                    // Mapped item
    public string Remarks { get; set; }
}
```

### GetTaskMappedItems Method

**Location**: `Src/TGS.BPOp.Franciscans.BL/InvoiceBL.cs` (Line 318-407)

**Purpose**: Get items mapped to a specific task/document

**Process**:
```csharp
public List<Entity.Item> GetTaskMappedItems(int _TaskId, string _TaskDocumentCode)
{
    List<Entity.Item> itemList = new List<Entity.Item>();
    List<Entity.TaskItemMapping> taskItemMapping_ParametersList = new List<Entity.TaskItemMapping>();
    List<Entity.TaskItemMapping> taskItemMappingList = new List<Entity.TaskItemMapping>();

    // Task 1: Niche Application (NAPP)
    if (_TaskId == 1)
    {
        Entity.NicheApplication nicheApplication = 
            mSSQLHelper.GetNicheApplication(_TaskDocumentCode);
        
        Entity.TaskItemMapping taskItemMapping = new Entity.TaskItemMapping();
        taskItemMapping.TaskId = 1;
        taskItemMapping.TaskParameterName = "NicheRowId";
        int nicheRowId = mSSQLHelper.GetNicheRow(nicheApplication.NicheId).NicheLevel;
        taskItemMapping.TaskParameterValue = nicheRowId.ToString();
        taskItemMapping_ParametersList.Add(taskItemMapping);
    }

    // Task 7: Wake Room Application (WAPP)
    if (_TaskId == 7)
    {
        Entity.WakeRoomBooking wakeRoomBooking = 
            mSSQLHelper.GetWakeRoomBooking(_TaskDocumentCode);
        
        Entity.TaskItemMapping taskItemMapping = new Entity.TaskItemMapping();
        taskItemMapping.TaskId = 7;
        taskItemMapping.TaskParameterName = "WakeRoomId";
        taskItemMapping.TaskParameterValue = wakeRoomBooking.WakeRoomId.ToString();
        taskItemMapping_ParametersList.Add(taskItemMapping);
    }

    // Task 4: Niche Inscription (INCR)
    if (_TaskId == 4)
    {
        Entity.TaskItemMapping taskItemMapping = new Entity.TaskItemMapping();
        taskItemMapping.TaskId = 4;
        taskItemMapping.TaskParameterName = "_ForInscriptiond";
        taskItemMapping.TaskParameterValue = "0";
        taskItemMapping_ParametersList.Add(taskItemMapping);
        
        taskItemMapping = new Entity.TaskItemMapping();
        taskItemMapping.TaskId = 4;
        taskItemMapping.TaskParameterName = "_ForUrn";
        taskItemMapping.TaskParameterValue = "0";
        taskItemMapping_ParametersList.Add(taskItemMapping);
    }

    // Task 5: Gate of Life Application (GOLA)
    if (_TaskId == 5)
    {
        Entity.EngraveWallApplication engraveWallApplication = 
            mSSQLHelper.GetEngraveWallApplication(_TaskDocumentCode);
        
        Entity.TaskItemMapping taskItemMapping = new Entity.TaskItemMapping();
        taskItemMapping.TaskId = 5;
        taskItemMapping.TaskParameterName = "NameCount";
        if (engraveWallApplication.EngraveWallApplicationDetailList.Count == 1)
            taskItemMapping.TaskParameterValue = "1";
        else if (engraveWallApplication.EngraveWallApplicationDetailList.Count > 1)
            taskItemMapping.TaskParameterValue = "2";
        taskItemMapping_ParametersList.Add(taskItemMapping);
    }

    // Task 6: Donation (DONA)
    if (_TaskId == 6)
    {
        Entity.TaskItemMapping taskItemMapping = new Entity.TaskItemMapping();
        taskItemMapping.TaskId = 6;
        taskItemMapping.TaskParameterName = "Donation";
        taskItemMapping.TaskParameterValue = "1";
        taskItemMapping_ParametersList.Add(taskItemMapping);
    }

    // Get TaskItemMapping records from database
    if (taskItemMapping_ParametersList.Count > 0)
    {
        foreach (Entity.TaskItemMapping taskItemMapping_Parameter in taskItemMapping_ParametersList)
        {
            Entity.TaskItemMapping taskItemMapping = 
                mSSQLHelper.GetTaskItemMapping(
                    taskItemMapping_Parameter.TaskId, 
                    taskItemMapping_Parameter.TaskParameterName, 
                    taskItemMapping_Parameter.TaskParameterValue
                );
            taskItemMappingList.Add(taskItemMapping);
        }
    }

    // Get Items from TaskItemMappings
    if (taskItemMappingList.Count > 0)
    {
        foreach (Entity.TaskItemMapping taskItemMapping in taskItemMappingList)
        {
            itemList.Add(mSSQLHelper.GetItem(taskItemMapping.ItemId));
        }
    }

    return itemList;
}
```

### Task ID Reference

| TaskId | Task Name | Document Type | Parameter Name | Example |
|--------|-----------|---------------|----------------|---------|
| 1 | Niche Application | NAPP | NicheRowId | "1", "2", "3" |
| 4 | Niche Inscription | INCR | _ForInscriptiond, _ForUrn | "0" |
| 5 | Gate of Life | GOLA | NameCount | "1" (single), "2" (multiple) |
| 6 | Donation | DONA | Donation | "1" |
| 7 | Wake Room Booking | WAPP | WakeRoomId | "1", "2", "3" |

### GetTaskItemMapping Method

**Location**: `Src/TGS.BPOp.Franciscans.DA/MSSQLHelper.cs` (Line 9299)

```csharp
public Entity.TaskItemMapping GetTaskItemMapping(
    int _TaskId, 
    string _TaskParameterName, 
    string _TaskParametervalue
)
{
    Entity.TaskItemMapping taskItemMapping = null;
    
    var daTaskItemMapping = (from tim in db.TaskItemMappings
                            where tim.TaskId.Equals(_TaskId)
                            && tim.TaskParameterName.Equals(_TaskParameterName)
                            && tim.TaskParameterValue.Equals(_TaskParametervalue)
                            select tim).FirstOrDefault();
    
    if (daTaskItemMapping != null)
        taskItemMapping = this.ConvertToTaskItemMapping(daTaskItemMapping);

    return taskItemMapping;
}
```

---

## Item Usage in Business Logic

### Item in Invoice Validation

Items are used in duplicate invoice checking:

**Location**: `Src/TGS.BPOp.Franciscans.BL/InvoiceBL.cs` (Line 250-268)

```csharp
public Entity.Invoice GetDuplicateInvoice(
    string _ApplicantName, 
    int Item,              // ItemId from InvoiceDetail
    string RefDoc, 
    DateTime? _InvoiceDate
)
{
    Entity.Invoice invoice = null;
    invoice = mSSQLHelper.GetDuplicateInvoice(
        _ApplicantName, 
        Item, 
        RefDoc, 
        _InvoiceDate
    );
    return invoice;
}
```

### Item Price Usage

Item price may be used as default `UnitAmount` in invoice details, though the system allows manual entry.

### Item in Report Generation

Items are displayed in invoice/receipt reports:

**Location**: `Src/TGS.BPOp.Franciscans.BL/InvoiceBL.cs` (Line 454)

```csharp
List<Entity.InvoicePrint> invoicePrintList = 
    mSSQLHelper.GetInvoicePrintList(_InvoiceCode);

// InvoicePrint includes:
// - LineItem_ItemCode
// - LineItem_ItemName
```

---

## Invoice & Receipt Calculations

This section explains how ASP.NET uses the selected item, quantity, tax, and reference documents to calculate invoice and receipt totals, and how to mirror this in Node.js.

### Line-Level Calculations (Invoice & Misc Invoice)

On the invoice screens (`Capture.aspx`, `MiscInvCapture.aspx`), each line has:

- `lineItem{rowId}Amount` – unit amount (before tax)
- `lineItem{rowId}Quantity` – quantity
- `lineItem{rowId}TotalAmount` – line subtotal without tax
- `lineItem{rowId}taxlinecode` – tax amount for that line
- `lineItem{rowId}Total` – line total **including** tax

The JavaScript function `calculateTtls(rwId)` computes per-line and overall totals:

```javascript
function calculateTtls(rwId) {
  // 1. Line subtotal (without tax)
  var rwTotal = $("#lineItem" + rwId + "Amount").val() *
                $("#lineItem" + rwId + "Quantity").val();
  $("#lineItem" + rwId + "TotalAmount").text(rwTotal.toFixed(2));

  // 2. Calculate tax and line total with tax
  calculateTtlstax(rwId);

  // 3. Aggregate gross totals (including tax) across all lines
  var totalPayableAmount = 0;
  for (var i = 0; i <= lastLineItemTRIndex; i++) {
    var hasRow = ($("#lineItemSelect" + i).val() != undefined);
    if (hasRow) {
      totalPayableAmount += Number($("#lineItem" + i + "Total").text());
    }
  }

  // 4. Aggregate net item totals (without tax) across all lines
  var totalAmount = 0;
  for (var i = 0; i <= lastLineItemTRIndex; i++) {
    var hasRow = ($("#lineItemSelect" + i).val() != undefined);
    if (hasRow) {
      totalAmount += Number($("#lineItem" + i + "TotalAmount").text());
    }
  }

  // 5. Tax total = gross - net
  var taxtotal = totalPayableAmount - totalAmount;

  // 6. Update summary fields
  $("#txttotal").val(totalAmount.toFixed(2));        // net amount (sum of line subtotals)
  $("#txttaxamount").val(taxtotal.toFixed(2));       // total tax
  $("#payableTotal").val(totalPayableAmount.toFixed(2)); // gross total (net + tax)
  $("#donationAmount").val(totalPayableAmount.toFixed(2)); // reused for donation
}
```

Tax per line is handled by `calculateTtlstax(rwId)`:

```javascript
function calculateTtlstax(rwId) {
  var taxPercent = $("#taxcodecmblist" + rwId).val();           // e.g. 8%
  var lineNet = $("#lineItem" + rwId + "TotalAmount").text();   // subtotal
  var taxAmount = Number(lineNet) * taxPercent / 100;

  $("#lineItem" + rwId + "taxlinecode").val(taxAmount.toFixed(2));

  var lineGross = Number(lineNet) + Number(taxAmount);
  $("#lineItem" + rwId + "Total").text(lineGross.toFixed(2));   // subtotal + tax
}
```

**Summary of ASP.NET logic:**

- **Net line total** = `Amount × Quantity`
- **Line tax** = `Net line total × Tax% / 100`
- **Line gross total** = `Net line total + Line tax`
- **Invoice net total (`txttotal`)** = sum of all net line totals
- **Invoice tax total (`txttaxamount`)** = sum of all line tax amounts
- **Invoice gross total (`payableTotal`)** = sum of all line gross totals
- **Donation amount (`donationAmount`)** = same as gross total (for donation-based invoices)

### Item Selection and Defaults

When the user selects an item from the dropdown:

- The `<option value>` is **`ItemId`**
- The visible text is **`Item.Name`**
- The application may:
  - Auto-set `Amount` from `Item.Price` for some flows (or let the user type it)
  - Require a reference document if `IsRefType = true` and `DocType` is one of `NAPP`, `INCR`, `GOLA`, `WAPP`, `DONA`

For **miscellaneous invoices/receipts**, the price is usually entered manually; for **task-based flows** (NAPP/INCR/GOLA/WAPP) the amount often comes from the underlying application or invoice (via BL/DA calls).

### Receipt Calculations and Invoice Linking

On the receipt screens (`ReceiptEntry.aspx`), items and amounts can be driven by existing invoices:

- `LoadItems` uses the same `InvoiceBL.GetAllItems()` as invoices to populate the dropdown.
- The user provides a **reference invoice code**, and the system calls:

```csharp
[WebMethod]
public static string Getinvoiceamount(string invoicecode)
{
    InvoiceBL invoiceBL = new InvoiceBL(CurrentUser.ChurchId.Value);
    Invoice invoice = invoiceBL.GetInvoice(invoicecode);
    if (invoice != null)
    {
        return new JavaScriptSerializer().Serialize(invoice.TotalAmount);
    }
    return "serverError";
}
```

On success, the client sets the line defaults:

```javascript
function Loadinvoiceamount(refDocCodeTxt, id) {
  var refDocNum = $("#lineItem" + id + "RefDocCodeTxt").val();
  $.ajax({
    type: "POST",
    url: "ReceiptEntry.aspx/Getinvoiceamount",
    data: "{'invoicecode':'" + refDocNum + "'}",
    ...
    success: function (msg) {
      if (msg.d != "serverError") {
        $("#lineItem" + id + "DefaultAmount").text(msg.d); // invoice total
        $("#lineItem" + id + "Amount").val(msg.d);         // receipt line amount
        // additional JS (e.g. calculateoninv) updates totals/outstanding
      }
    }
  });
}
```

It can also load detailed invoice line info via `GetinvoiceDetaillistcode` so the receipt can show or validate `PayingAmount`, `TotalPayingAmount`, and `UnitAmount` per line.

### Mapping This Logic to Node.js

To replicate these calculations and item behaviours in the Node.js backend and your docs:

- **Line model**: Your invoice/receipt line DTOs should carry:
  - `itemId`, `quantity`, `unitAmount`, `lineNetAmount`, `lineTaxPercent`, `lineTaxAmount`, `lineGrossAmount`.
- **Server-side calculation** (Node.js service), using the same formulas:

```javascript
function calculateLine(line) {
  const qty = Number(line.quantity || 0);
  const unit = Number(line.unitAmount || 0);
  const taxPct = Number(line.taxPercent || 0);

  const net = qty * unit;
  const tax = net * taxPct / 100;
  const gross = net + tax;

  return {
    ...line,
    lineNetAmount: net,
    lineTaxAmount: tax,
    lineGrossAmount: gross
  };
}

function calculateInvoice(lines) {
  const calcLines = lines.map(calculateLine);
  const totalNet = calcLines.reduce((s, l) => s + l.lineNetAmount, 0);
  const totalGross = calcLines.reduce((s, l) => s + l.lineGrossAmount, 0);
  const totalTax = totalGross - totalNet;

  return {
    lines: calcLines,
    totalAmount: totalNet,       // txttotal
    taxAmount: totalTax,         // txttaxamount
    payableTotal: totalGross,    // payableTotal
    donationAmount: totalGross   // mirrors ASP.NET behaviour when needed
  };
}
```

- **Invoice → Receipt**:
  - When creating a receipt from an invoice code, fetch the invoice and:
    - Set default receipt `amount` from `invoice.totalAmount` (as ASP.NET does in `Getinvoiceamount`).
    - Optionally, load invoice detail lines to drive more granular receipt logic (mirror `GetinvoiceDetaillistcode`).

These rules, combined with the **item loading and task-based mapping** described earlier, give you a full parity implementation of the ASP.NET invoice/receipt item dropdown and calculation behaviour in Node.js.

---

## Node.js Implementation Guide

### Item Model

**Location**: `Fransiscan-Nodejs-BE/src/models/Item.js`

```javascript
class Item {
    constructor(data = {}) {
        this.itemId = data.itemId || null;
        this.name = data.name || '';
        this.code = data.code || '';
        this.price = data.price || 0;
        this.churchId = data.churchId || null;
        this.isRefType = data.isRefType || false;
        this.docType = data.docType || null;
    }

    static fromDatabase(row) {
        return new Item({
            itemId: row.ItemId,
            name: row.Name,
            code: row.Code,
            price: row.Price,
            churchId: row.ChurchId,
            isRefType: row.IsRefType,
            docType: row.DocType
        });
    }
}

module.exports = Item;
```

### Item Repository

**Location**: `Fransiscan-Nodejs-BE/src/repositories/ItemRepository.js`

```javascript
const { executeQuery } = require('../config/database');
const Item = require('../models/Item');
const logger = require('../utils/logger');

class ItemRepository {
    /**
     * Get all items for a church
     * @param {number} churchId - Church ID
     * @returns {Promise<Array<Item>>} List of items
     */
    async getAllItems(churchId) {
        try {
            const query = `
                SELECT 
                    ItemId,
                    Name,
                    Code,
                    Price,
                    ChurchId,
                    IsRefType,
                    DocType
                FROM Item WITH(NOLOCK)
                WHERE ChurchId = @churchId
                ORDER BY Name ASC
            `;

            const result = await executeQuery(query, { churchId });

            if (!result.recordset || result.recordset.length === 0) {
                return [];
            }

            return result.recordset.map(row => Item.fromDatabase(row));
        } catch (error) {
            logger.error('Error in getAllItems:', error);
            throw error;
        }
    }

    /**
     * Get item by ID
     * @param {number} itemId - Item ID
     * @returns {Promise<Item|null>} Item or null if not found
     */
    async getItemById(itemId) {
        try {
            const query = `
                SELECT 
                    ItemId,
                    Name,
                    Code,
                    Price,
                    ChurchId,
                    IsRefType,
                    DocType
                FROM Item WITH(NOLOCK)
                WHERE ItemId = @itemId
            `;

            const result = await executeQuery(query, { itemId });

            if (!result.recordset || result.recordset.length === 0) {
                return null;
            }

            return Item.fromDatabase(result.recordset[0]);
        } catch (error) {
            logger.error('Error in getItemById:', error);
            throw error;
        }
    }

    /**
     * Get task-mapped items
     * @param {number} taskId - Task ID
     * @param {string} taskParameterName - Parameter name
     * @param {string} taskParameterValue - Parameter value
     * @returns {Promise<Array<Item>>} List of mapped items
     */
    async getTaskMappedItems(taskId, taskParameterName, taskParameterValue) {
        try {
            const query = `
                SELECT 
                    i.ItemId,
                    i.Name,
                    i.Code,
                    i.Price,
                    i.ChurchId,
                    i.IsRefType,
                    i.DocType
                FROM TaskItemMapping tim WITH(NOLOCK)
                INNER JOIN Item i WITH(NOLOCK) ON tim.ItemId = i.ItemId
                WHERE tim.TaskId = @taskId
                  AND tim.TaskParameterName = @taskParameterName
                  AND tim.TaskParameterValue = @taskParameterValue
            `;

            const result = await executeQuery(query, {
                taskId,
                taskParameterName,
                taskParameterValue
            });

            if (!result.recordset || result.recordset.length === 0) {
                return [];
            }

            return result.recordset.map(row => Item.fromDatabase(row));
        } catch (error) {
            logger.error('Error in getTaskMappedItems:', error);
            throw error;
        }
    }
}

module.exports = ItemRepository;
```

### Item Service

**Location**: `Fransiscan-Nodejs-BE/src/services/ItemService.js`

```javascript
const ItemRepository = require('../repositories/ItemRepository');
const logger = require('../utils/logger');

class ItemService {
    constructor() {
        this.repository = new ItemRepository();
    }

    /**
     * Get all items for a church
     * @param {number} churchId - Church ID
     * @returns {Promise<Object>} Service result with items array
     */
    async getAllItems(churchId) {
        try {
            if (!churchId) {
                throw new Error('ChurchId is required');
            }

            const items = await this.repository.getAllItems(churchId);

            return {
                success: true,
                data: items,
                count: items.length
            };
        } catch (error) {
            logger.error('Error in ItemService.getAllItems:', error);
            return {
                success: false,
                error: {
                    code: 'GET_ITEMS_ERROR',
                    message: error.message
                }
            };
        }
    }

    /**
     * Get item by ID
     * @param {number} itemId - Item ID
     * @returns {Promise<Object>} Service result with item
     */
    async getItemById(itemId) {
        try {
            if (!itemId) {
                throw new Error('ItemId is required');
            }

            const item = await this.repository.getItemById(itemId);

            if (!item) {
                return {
                    success: false,
                    error: {
                        code: 'ITEM_NOT_FOUND',
                        message: 'Item not found'
                    }
                };
            }

            return {
                success: true,
                data: item
            };
        } catch (error) {
            logger.error('Error in ItemService.getItemById:', error);
            return {
                success: false,
                error: {
                    code: 'GET_ITEM_ERROR',
                    message: error.message
                }
            };
        }
    }

    /**
     * Get task-mapped items
     * @param {number} taskId - Task ID (1=NAPP, 4=INCR, 5=GOLA, 6=DONA, 7=WAPP)
     * @param {string} taskDocumentCode - Document code (e.g., "NAPP12345")
     * @param {number} churchId - Church ID
     * @returns {Promise<Object>} Service result with mapped items
     */
    async getTaskMappedItems(taskId, taskDocumentCode, churchId) {
        try {
            // This would need integration with other services
            // to get document details and determine parameters
            
            // Example for Task 1 (Niche Application)
            if (taskId === 1) {
                // Get niche application to determine NicheRowId
                // Then call repository.getTaskMappedItems(1, "NicheRowId", nicheRowId)
            }

            // For now, return empty array
            return {
                success: true,
                data: [],
                count: 0
            };
        } catch (error) {
            logger.error('Error in ItemService.getTaskMappedItems:', error);
            return {
                success: false,
                error: {
                    code: 'GET_TASK_ITEMS_ERROR',
                    message: error.message
                }
            };
        }
    }
}

module.exports = ItemService;
```

### Item Controller

**Location**: `Fransiscan-Nodejs-BE/src/controllers/ItemController.js`

```javascript
const ItemService = require('../services/ItemService');
const logger = require('../utils/logger');

class ItemController {
    constructor() {
        this.itemService = new ItemService();
        this.asyncHandler = require('../middleware/asyncHandler');
    }

    /**
     * Get all items for current user's church
     * GET /api/items
     */
    getAllItems = this.asyncHandler(async (req, res) => {
        const user = req.user;
        const churchId = user.churchId;

        if (!churchId) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'MISSING_CHURCH_ID',
                    message: 'ChurchId is required'
                }
            });
        }

        const result = await this.itemService.getAllItems(churchId);

        if (!result.success) {
            return res.status(400).json(result);
        }

        return res.json({
            success: true,
            data: result.data,
            count: result.count
        });
    });

    /**
     * Get item by ID
     * GET /api/items/:itemId
     */
    getItemById = this.asyncHandler(async (req, res) => {
        const { itemId } = req.params;
        const itemIdNum = parseInt(itemId, 10);

        if (isNaN(itemIdNum)) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'INVALID_ITEM_ID',
                    message: 'Invalid ItemId'
                }
            });
        }

        const result = await this.itemService.getItemById(itemIdNum);

        if (!result.success) {
            return res.status(404).json(result);
        }

        return res.json({
            success: true,
            data: result.data
        });
    });
}

module.exports = ItemController;
```

### Item Routes

**Location**: `Fransiscan-Nodejs-BE/src/routes/items.js`

```javascript
const express = require('express');
const router = express.Router();
const ItemController = require('../controllers/ItemController');
const { authenticate } = require('../middleware/auth');

const itemController = new ItemController();

/**
 * @route   GET /api/items
 * @desc    Get all items for current user's church
 * @access  Private
 */
router.get('/', authenticate, itemController.getAllItems);

/**
 * @route   GET /api/items/:itemId
 * @desc    Get item by ID
 * @access  Private
 */
router.get('/:itemId', authenticate, itemController.getItemById);

module.exports = router;
```

### API Response Format

**GET /api/items**
```json
{
    "success": true,
    "data": [
        {
            "itemId": 1,
            "name": "Niche Application Fee",
            "code": "ITEM001",
            "price": 5000.00,
            "churchId": 1,
            "isRefType": true,
            "docType": "NAPP"
        },
        {
            "itemId": 2,
            "name": "Wake Room Booking Fee",
            "code": "ITEM002",
            "price": 3000.00,
            "churchId": 1,
            "isRefType": true,
            "docType": "WAPP"
        }
    ],
    "count": 2
}
```

---

## Summary

### Key Points

1. **Item Loading**: Items are loaded via `GetAllItems()` method, filtered by `ChurchId`
2. **Dropdown Population**: JavaScript populates dropdown on page load via AJAX
3. **Task Mapping**: Items can be automatically suggested based on task/document type
4. **Reference Types**: Some items require reference documents (`IsRefType = true`)
5. **Multi-tenant**: Items are church-specific (filtered by `ChurchId`)
6. **No Stored Procedures**: Uses LINQ to SQL queries (Entity Framework)

### Implementation Checklist

- [x] Item entity structure
- [x] Item dropdown loading mechanism
- [x] Item selection in invoices
- [x] Item selection in receipts
- [x] Task-based item mapping
- [x] Node.js repository implementation
- [x] Node.js service implementation
- [x] Node.js controller implementation
- [x] API endpoints

---

**Document Version**: 1.0  
**Last Updated**: 2025-01-25  
**Author**: Analysis from ASP.NET Codebase

