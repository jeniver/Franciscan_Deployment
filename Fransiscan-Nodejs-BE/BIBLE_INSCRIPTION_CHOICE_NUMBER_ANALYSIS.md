# Bible Inscription Choice Number - Deep Analysis & Implementation Guide

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Business Context](#business-context)
3. [ASP.NET Implementation - Deep Analysis](#aspnet-implementation---deep-analysis)
4. [Database Design & Schema](#database-design--schema)
5. [Frontend Implementation (ASP.NET)](#frontend-implementation-aspnet)
6. [Backend Implementation (ASP.NET)](#backend-implementation-aspnet)
7. [Node.js + React Implementation Roadmap](#nodejs--react-implementation-roadmap)
8. [Complete Implementation Code](#complete-implementation-code)

---

## Executive Summary

The **Bible Inscription Choice Number** feature allows users to select from a predefined list of Bible verses/phrases when creating a Niche Inscription Request. Each choice has:
- A **Choice Number** (e.g., "No1-Psalm 4:8")
- A **Description/Value** (the actual Bible verse text)
- **Church-specific** configuration (multi-tenant)

This feature is integrated into the Inscription workflow and stored as part of the `NicheInscriptionRequest` entity.

---

## Business Context

### Purpose
When creating a niche inscription, applicants can:
1. **Select a predefined Bible verse** from a dropdown (Bible Inscription Choice Number)
2. **View the full verse text** automatically populated in the inscription phrase field
3. **Optionally customize** the phrase (up to 90 characters)
4. **Save the choice** along with the inscription request

### Key Business Rules
- Bible choices are **church-specific** (filtered by `ChurchId`)
- Each choice has a **unique number** (e.g., "No1-Psalm 4:8")
- The **description/value** is the full Bible verse text
- Users can select a choice OR enter a custom phrase
- The choice is stored in both `BibleInscriptionChoiceId` (FK) and `BibleInscriptionChoiceNo` (string) for reporting

---

## ASP.NET Implementation - Deep Analysis

### 1. Entity Structure

#### 1.1 `BibleInscriptionChoice` Entity

**Location**: `Src/TGS.BPOp.Franciscans.Entity/BibleInscriptionChoice.cs`

```csharp
public class BibleInscriptionChoice
{
    public int BibleInscriptionChoiceId { get; set; }        // Primary Key (Identity)
    public string BibleInscriptionChoiceNo { get; set; }     // Choice Number (e.g., "No1-Psalm 4:8")
    public string BibleInscriptionChoiceNoValue { get; set; } // Full verse text/description
    public int? ChurchId { get; set; }                       // Multi-tenant identifier
}
```

**Field Details**:

| Property | Type | Max Length | Description | Example |
|----------|------|------------|-------------|---------|
| `BibleInscriptionChoiceId` | int | - | Primary key, auto-increment | `1`, `2`, `3` |
| `BibleInscriptionChoiceNo` | string | 30 | Display number/reference | `"No1-Psalm 4:8"`, `"No2-Psalm 23:1"` |
| `BibleInscriptionChoiceNoValue` | string | 500 | Full Bible verse text | `"I will lie down & sleep in peace, for you alone, O Lord, make me dwell in safety"` |
| `ChurchId` | int? | - | Church/tenant identifier | `1`, `2` |

#### 1.2 Integration with `NicheInscriptionRequest`

**Location**: `Src/TGS.BPOp.Franciscans.Entity/NicheInscriptionRequest.cs`

The `NicheInscriptionRequest` entity stores Bible choice information:

```csharp
public class NicheInscriptionRequest
{
    // ... other properties ...
    public string AdditionalInscriptionPhrase { get; set; }  // Custom phrase (max 90 chars)
    public string BibleInscriptionChoiceNo { get; set; }     // Choice number string (nvarchar(10))
    public int? BibleInscriptionChoiceId { get; set; }      // FK to BibleInscriptionChoice
    // ... other properties ...
}
```

**Storage Strategy**:
- **`BibleInscriptionChoiceId`**: Foreign key reference (nullable)
- **`BibleInscriptionChoiceNo`**: String copy for reporting/searching (e.g., "No1-Psalm 4:8")
- **`AdditionalInscriptionPhrase`**: The actual text displayed (from `BibleInscriptionChoiceNoValue` or custom)

---

### 2. Database Design & Schema

#### 2.1 `BibleInscriptionChoice` Table

**Table Name**: `BibleInscriptionChoice`

**Schema** (from Entity Framework EDMX):

```sql
CREATE TABLE [dbo].[BibleInscriptionChoice](
    [BibleInscriptionChoiceId] INT IDENTITY(1,1) PRIMARY KEY,
    [BibleInscriptionChoiceNo] NVARCHAR(30) NULL,           -- e.g., "No1-Psalm 4:8"
    [BibleInscriptionChoiceNoValue] NVARCHAR(500) NULL,     -- Full verse text
    [ChurchId] INT NULL                                      -- Multi-tenant filter
);

-- Index for performance
CREATE INDEX IX_BibleInscriptionChoice_ChurchId 
    ON [BibleInscriptionChoice] ([ChurchId]);
```

**Sample Data**:

| BibleInscriptionChoiceId | BibleInscriptionChoiceNo | BibleInscriptionChoiceNoValue | ChurchId |
|-------------------------|--------------------------|-------------------------------|----------|
| 1 | No1-Psalm 4:8 | I will lie down & sleep in peace, for you alone, O Lord, make me dwell in safety | 1 |
| 2 | No2-Psalm 23:1 | The Lord is my Shepherd, there is nothing I shall want | 1 |
| 3 | No3-Psalm 23 | In the Lord's own house shall I dwell for ever and ever | 1 |
| 4 | No4-Psalm 23:6 | Surely goodness and love will follow me all the days of my life | 1 |
| 5 | No5-Psalm 27:1 | The Lord is my light and my salvation | 1 |
| 6 | No6-Psalm 28:7 | The Lord is my strength and my shield | 1 |
| 7 | No7-Psalm 34:8 | Blessed is the man who takes refuge in Him | 1 |
| 8 | No8-Psalm 55:22 | Cast your cares on the Lord and he will sustain you | 1 |
| 9 | No9-John 3:16 | For God so loved the world that he gave his one and only Son. | 1 |
| 10 | No10-John 14:6 | I am the Way, the Truth and the Life | 1 |
| 11 | No11-John 14:1 | Do not let your hearts be troubled. Believe in God, believe also in Me | 1 |
| 12 | No12-1 John 3:1 | See what love the Father has given us, that we should be called God's children. | 1 |

#### 2.2 Relationship with `NicheInscriptionRequest`

**Foreign Key Relationship**:

```sql
-- Foreign key in NicheInscriptionRequest table
ALTER TABLE [dbo].[NicheInscriptionRequest]
ADD CONSTRAINT FK_NicheInscriptionRequest_BibleInscriptionChoice
    FOREIGN KEY ([BibleInscriptionChoiceId])
    REFERENCES [dbo].[BibleInscriptionChoice]([BibleInscriptionChoiceId]);

-- Columns in NicheInscriptionRequest
[BibleInscriptionChoiceId] INT NULL,           -- FK (nullable)
[BibleInscriptionChoiceNo] NVARCHAR(10) NULL,  -- String copy
[AdditionalInscriptionPhrase] NVARCHAR(90) NULL -- Actual phrase text
```

**Relationship Type**: **One-to-Many**
- One `BibleInscriptionChoice` can be used by many `NicheInscriptionRequest` records
- `BibleInscriptionChoiceId` in `NicheInscriptionRequest` is **nullable** (optional)

---

### 3. Data Access Layer (DAL)

#### 3.1 `GetBibleInscriptionChoice` Method

**Location**: `Src/TGS.BPOp.Franciscans.DA/MSSQLHelper.cs` (Line 5701-5722)

```csharp
public List<Entity.BibleInscriptionChoice> GetBibleInscriptionChoice(int _ChurchId)
{
    List<Entity.BibleInscriptionChoice> BibleList = new List<Entity.BibleInscriptionChoice>();

    // LINQ to SQL query - filters by ChurchId
    var dbBibleInscriptionChoices = from bible in db.BibleInscriptionChoices
                                    where bible.ChurchId == (_ChurchId)
                                    select bible;

    if (dbBibleInscriptionChoices != null)
    {
        if (dbBibleInscriptionChoices.Count() > 0)
        {
            foreach (var dbBibleInscription in dbBibleInscriptionChoices)
            {
                Entity.BibleInscriptionChoice BibleChoice = this.ConvertToBible(dbBibleInscription);
                BibleList.Add(BibleChoice);
            }
        }
    }

    return BibleList;
}
```

**Key Points**:
- Uses **LINQ to SQL** (Entity Framework) - **NO stored procedure**
- Filters by `ChurchId` for multi-tenant isolation
- Returns all Bible choices for a church

#### 3.2 Entity Conversion Method

**Location**: `Src/TGS.BPOp.Franciscans.DA/MSSQLHelper.cs` (Line 11069-11078)

```csharp
private Entity.BibleInscriptionChoice ConvertToBible(DA.BibleInscriptionChoice _BibleInscriptionChoice)
{
    Entity.BibleInscriptionChoice bible = new Entity.BibleInscriptionChoice();
    bible.BibleInscriptionChoiceId = _BibleInscriptionChoice.BibleInscriptionChoiceId;
    bible.BibleInscriptionChoiceNo = _BibleInscriptionChoice.BibleInscriptionChoiceNo;
    bible.BibleInscriptionChoiceNoValue = _BibleInscriptionChoice.BibleInscriptionChoiceNoValue;
    bible.ChurchId = _BibleInscriptionChoice.ChurchId;

    return bible;
}
```

**SQL Equivalent** (if using raw SQL):

```sql
SELECT 
    BibleInscriptionChoiceId,
    BibleInscriptionChoiceNo,
    BibleInscriptionChoiceNoValue,
    ChurchId
FROM BibleInscriptionChoice WITH (NOLOCK)
WHERE ChurchId = @ChurchId
ORDER BY BibleInscriptionChoiceNo ASC;
```

---

### 4. Business Logic Layer (BL)

#### 4.1 `BibleInsChoiceBL` Class

**Location**: `Src/TGS.BPOp.Franciscans.BL/BibleInsChoiceBL.cs`

```csharp
public class BibleInsChoiceBL
{
    DA.MSSQLHelper mSSQLHelper = new DA.MSSQLHelper();
    public int _ChurchId;

    public BibleInsChoiceBL(int _ChurchId)
    {
        mSSQLHelper.ChurchId = _ChurchId;
    }

    public List<Entity.BibleInscriptionChoice> GetBibleInscriptionChoice(int _ChurchId)
    {
        List<Entity.BibleInscriptionChoice> BibleInscriptionChoiceList = 
            mSSQLHelper.GetBibleInscriptionChoice(_ChurchId);
        return BibleInscriptionChoiceList;
    }
}
```

**Responsibilities**:
- Wraps DAL calls
- Maintains `ChurchId` context
- Returns list of Bible choices for a church

---

### 5. Frontend Implementation (ASP.NET)

#### 5.1 WebMethod - Load Bible Choices

**Location**: `Src/TGS.BPOp.Franciscans.WebUI/Columbarium/Inscription/Capture.aspx.cs` (Line 39-58)

```csharp
[System.Web.Services.WebMethod]
public static string LoadBibleInsChoiceNo()
{
    string returnString = "serverError";
    try
    {
        BibleInsChoiceBL bibleInsChoiceBL = new BibleInsChoiceBL(CurrentUser.ChurchId.Value);
        List<BibleInscriptionChoice> BibleInscriptionChoiceList = 
            bibleInsChoiceBL.GetBibleInscriptionChoice(CurrentUser.ChurchId.Value);
        
        if (BibleInscriptionChoiceList.Count > 0)
        {
            JavaScriptSerializer javaScriptSerializer = new JavaScriptSerializer();
            returnString = javaScriptSerializer.Serialize(BibleInscriptionChoiceList);
        }
    }
    catch (Exception ex)
    {
        returnString = "serverError";
    }
    return returnString;
}
```

**Response Format** (JSON):

```json
[
    {
        "BibleInscriptionChoiceId": 1,
        "BibleInscriptionChoiceNo": "No1-Psalm 4:8",
        "BibleInscriptionChoiceNoValue": "I will lie down & sleep in peace, for you alone, O Lord, make me dwell in safety",
        "ChurchId": 1
    },
    {
        "BibleInscriptionChoiceId": 2,
        "BibleInscriptionChoiceNo": "No2-Psalm 23:1",
        "BibleInscriptionChoiceNoValue": "The Lord is my Shepherd, there is nothing I shall want",
        "ChurchId": 1
    }
]
```

#### 5.2 HTML Structure

**Location**: `Src/TGS.BPOp.Franciscans.WebUI/Columbarium/Inscription/Capture.aspx` (Line 1556-1613)

```html
<div data-role="collapsible" data-collapsed="true">
    <h3>Additional details of Inscription</h3>
    <div id="BibleSelect">
        <table>
            <tr>
                <td>
                    <label>Bible Inscription of Choice number</label>
                </td>
                <td>
                    <!-- Hidden field stores BibleInscriptionChoiceId -->
                    <input type="hidden" 
                           name="bibleInscriptionId" 
                           id="bibleInscriptionId" 
                           value="" />
                </td>
                <td>
                    <!-- Dropdown populated via JavaScript -->
                    <select id="bibleSelect" 
                            name="bibleSelect" 
                            onchange="selectItemBible()">
                        <option value="" id="bibleSelectOpt0">Select</option>
                    </select>
                </td>
                <td>
                    <label id="defaultValue">"Please choose the choice Number"</label>
                </td>
                <td>
                    <input type="button" 
                           id="biblebutton" 
                           value="Choice No Details" />
                </td>
            </tr>
        </table>
    </div>
    <table>
        <tr>
            <td>
                <label onclick="openBibleSelect()">
                    Bible Inscription phrases of applicant's choice :
                </label>
            </td>
        </tr>
    </table>
    <!-- Textbox for inscription phrase (max 90 chars) -->
    <asp:TextBox MaxLength="90" 
                 name="bibleInscriptionPhrase" 
                 ID="bibleInscriptionPhrase"
                 runat="server" 
                 ClientIDMode="Static"
                 onkeyup="count(this)" />
    <span id="cnt"></span>
    <asp:RegularExpressionValidator 
        ValidationExpression="^[a-zA-Z](\s?[a-zA-Z]){0,80}$"
        ErrorMessage="Inscription Phrase must be no longer than 100 characters."
        ControlToValidate="bibleInscriptionPhrase" />
</div>
```

**Key UI Elements**:
- **Hidden field** (`bibleInscriptionId`): Stores selected `BibleInscriptionChoiceId`
- **Dropdown** (`bibleSelect`): Displays `BibleInscriptionChoiceNo` (e.g., "No1-Psalm 4:8")
- **Textbox** (`bibleInscriptionPhrase`): Displays/edits the verse text (max 90 chars)
- **Button** (`biblebutton`): Opens details modal/popup
- **Character counter** (`cnt`): Shows remaining characters

#### 5.3 JavaScript Functions

**Location**: `Src/TGS.BPOp.Franciscans.WebUI/Columbarium/Inscription/Capture.aspx` (Line 296-338)

##### 5.3.1 Load Bible Choices

```javascript
var BibleInsChoice = [];  // Global array to store choices
var itemsOptionStr = "";

function LoadBibleInsChoiceNo() {
    $.ajax({
        type: "POST",
        url: "Capture.aspx/LoadBibleInsChoiceNo",
        data: "{}",
        contentType: "application/json; charset=utf-8",
        datatype: "JSON",
        success: function (msg) {
            BibleInsChoice = [];
            BibleInsChoice = eval("(" + msg.d + ")");

            // Build dropdown options
            itemsOptionStr = "";
            for (var a = 1; a <= BibleInsChoice.length; a++) {
                var crntRecStr = "<option value='" + 
                    BibleInsChoice[a - 1].BibleInscriptionChoiceId + "'>" + 
                    BibleInsChoice[a - 1].BibleInscriptionChoiceNo + 
                    "</option>";
                itemsOptionStr += crntRecStr;
            }
            $("#bibleSelectOpt0").after(itemsOptionStr);
        },
        error: function (err) {
            console.error("Error loading Bible choices:", err);
        }
    });
}
```

**Flow**:
1. AJAX call to `LoadBibleInsChoiceNo` WebMethod
2. Receives JSON array of Bible choices
3. Populates dropdown with `<option>` elements
4. Each option: `value = BibleInscriptionChoiceId`, `text = BibleInscriptionChoiceNo`

##### 5.3.2 Select Bible Choice Handler

```javascript
function selectItemBible() {
    $("#bibleSelect option:selected").each(function () {
        var LineItemIndex = -1;
        
        if ($(this).val() == 0 || $(this).val() == "") {
            // Clear selection
            LineItemIndex = 0;
            $("#bibleInscriptionPhrase").val("");
            $("#bibleInscriptionId").val("");
        }
        else {
            // Find matching choice in global array
            for (var j = 0; j < BibleInsChoice.length; j++) {
                if (BibleInsChoice[j].BibleInscriptionChoiceNo == $(this).text()) {
                    LineItemIndex = j;
                    if (LineItemIndex >= 0) {
                        // Populate hidden field with ID
                        $("#bibleInscriptionId").val(
                            BibleInsChoice[LineItemIndex].BibleInscriptionChoiceId
                        );
                        
                        // Populate textbox with verse text
                        $("#bibleInscriptionPhrase").val(
                            BibleInsChoice[LineItemIndex].BibleInscriptionChoiceNoValue
                        );
                    }
                    break;
                }
            }
        }
    });
}
```

**Behavior**:
- When user selects a choice from dropdown:
  1. Finds matching choice in `BibleInsChoice` array
  2. Sets `bibleInscriptionId` hidden field = `BibleInscriptionChoiceId`
  3. Sets `bibleInscriptionPhrase` textbox = `BibleInscriptionChoiceNoValue`
- User can then **edit** the phrase if needed (max 90 chars)

#### 5.4 Static Reference Table (UI Display)

**Location**: `Src/TGS.BPOp.Franciscans.WebUI/Columbarium/Inscription/Capture.aspx` (Line 1721-1828)

The UI includes a **static HTML table** showing all Bible choice numbers and descriptions (for reference):

```html
<div id="BibleChoiceNoDeatils">
    <table>
        <tr>
            <th>Bible Choice No</th>
            <th>Description</th>
        </tr>
        <tr>
            <td>No1-Psalm 4:8</td>
            <td>I will lie down & sleep in peace, for you alone, O Lord, make me dwell in safety</td>
        </tr>
        <tr>
            <td>No2-Psalm 23:1</td>
            <td>The Lord is my Shepherd, there is nothing I shall want</td>
        </tr>
        <!-- ... more rows ... -->
    </table>
</div>
```

**Note**: This is **hardcoded HTML** for display purposes. The actual data comes from the database via the WebMethod.

---

### 6. Data Flow Summary

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Page Load (Capture.aspx)                                 │
│    └── $(document).ready() → LoadBibleInsChoiceNo()        │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│ 2. JavaScript AJAX Call                                     │
│    └── POST Capture.aspx/LoadBibleInsChoiceNo               │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│ 3. WebMethod (Capture.aspx.cs)                             │
│    ├── BibleInsChoiceBL.GetBibleInscriptionChoice()         │
│    └── Serialize to JSON                                    │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│ 4. Business Logic (BibleInsChoiceBL.cs)                     │
│    └── mSSQLHelper.GetBibleInscriptionChoice(ChurchId)      │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│ 5. Data Access (MSSQLHelper.cs)                             │
│    ├── LINQ Query: db.BibleInscriptionChoices               │
│    │   .Where(ChurchId == _ChurchId)                        │
│    ├── Convert DA.BibleInscriptionChoice → Entity           │
│    └── Return List<Entity.BibleInscriptionChoice>          │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│ 6. JSON Response to Frontend                                │
│    └── [{BibleInscriptionChoiceId, BibleInscriptionChoiceNo,│
│         BibleInscriptionChoiceNoValue, ChurchId}, ...]      │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│ 7. Populate Dropdown                                        │
│    └── Build <option> elements and append to <select>      │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│ 8. User Selects Choice                                     │
│    └── selectItemBible() → Populate textbox & hidden field │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│ 9. Save Inscription Request                                 │
│    └── BibleInscriptionChoiceId stored in DB               │
│    └── BibleInscriptionChoiceNo stored as string            │
│    └── AdditionalInscriptionPhrase stored (edited text)     │
└─────────────────────────────────────────────────────────────┘
```

---

## Node.js + React Implementation Roadmap

### Phase 1: Database Design

#### 1.1 Create `BibleInscriptionChoice` Table

```sql
CREATE TABLE [dbo].[BibleInscriptionChoice](
    [BibleInscriptionChoiceId] INT IDENTITY(1,1) PRIMARY KEY,
    [BibleInscriptionChoiceNo] NVARCHAR(30) NOT NULL,
    [BibleInscriptionChoiceNoValue] NVARCHAR(500) NOT NULL,
    [ChurchId] INT NOT NULL
);

-- Index for performance
CREATE INDEX IX_BibleInscriptionChoice_ChurchId 
    ON [BibleInscriptionChoice] ([ChurchId]);

-- Sample data insertion
INSERT INTO BibleInscriptionChoice 
    (BibleInscriptionChoiceNo, BibleInscriptionChoiceNoValue, ChurchId)
VALUES
    ('No1-Psalm 4:8', 'I will lie down & sleep in peace, for you alone, O Lord, make me dwell in safety', 1),
    ('No2-Psalm 23:1', 'The Lord is my Shepherd, there is nothing I shall want', 1),
    ('No3-Psalm 23', 'In the Lord''s own house shall I dwell for ever and ever', 1),
    ('No4-Psalm 23:6', 'Surely goodness and love will follow me all the days of my life', 1),
    ('No5-Psalm 27:1', 'The Lord is my light and my salvation', 1),
    ('No6-Psalm 28:7', 'The Lord is my strength and my shield', 1),
    ('No7-Psalm 34:8', 'Blessed is the man who takes refuge in Him', 1),
    ('No8-Psalm 55:22', 'Cast your cares on the Lord and he will sustain you', 1),
    ('No9-John 3:16', 'For God so loved the world that he gave his one and only Son.', 1),
    ('No10-John 14:6', 'I am the Way, the Truth and the Life', 1),
    ('No11-John 14:1', 'Do not let your hearts be troubled. Believe in God, believe also in Me', 1),
    ('No12-1 John 3:1', 'See what love the Father has given us, that we should be called God''s children.', 1);
```

#### 1.2 Ensure `NicheInscriptionRequest` Table Has Required Columns

```sql
-- Verify these columns exist in NicheInscriptionRequest
ALTER TABLE [dbo].[NicheInscriptionRequest]
ADD [BibleInscriptionChoiceId] INT NULL,
    [BibleInscriptionChoiceNo] NVARCHAR(10) NULL,
    [AdditionalInscriptionPhrase] NVARCHAR(90) NULL;

-- Foreign key constraint
ALTER TABLE [dbo].[NicheInscriptionRequest]
ADD CONSTRAINT FK_NicheInscriptionRequest_BibleInscriptionChoice
    FOREIGN KEY ([BibleInscriptionChoiceId])
    REFERENCES [dbo].[BibleInscriptionChoice]([BibleInscriptionChoiceId]);
```

---

### Phase 2: Backend Implementation (Node.js)

#### 2.1 Model

**File**: `src/models/BibleInscriptionChoice.js`

```javascript
class BibleInscriptionChoice {
    constructor(data = {}) {
        this.bibleInscriptionChoiceId = data.bibleInscriptionChoiceId ?? null;
        this.bibleInscriptionChoiceNo = data.bibleInscriptionChoiceNo ?? '';
        this.bibleInscriptionChoiceNoValue = data.bibleInscriptionChoiceNoValue ?? '';
        this.churchId = data.churchId ?? null;
    }

    static fromDatabase(row) {
        return new BibleInscriptionChoice({
            bibleInscriptionChoiceId: row.BibleInscriptionChoiceId,
            bibleInscriptionChoiceNo: row.BibleInscriptionChoiceNo,
            bibleInscriptionChoiceNoValue: row.BibleInscriptionChoiceNoValue,
            churchId: row.ChurchId
        });
    }
}

module.exports = BibleInscriptionChoice;
```

#### 2.2 Repository

**File**: `src/repositories/BibleInscriptionChoiceRepository.js`

```javascript
const { executeQuery } = require('../config/database');
const BibleInscriptionChoice = require('../models/BibleInscriptionChoice');
const logger = require('../utils/logger');

class BibleInscriptionChoiceRepository {
    /**
     * Get all Bible inscription choices for a church
     * @param {number} churchId - Church ID
     * @returns {Promise<Array<BibleInscriptionChoice>>} List of Bible choices
     */
    async getAllBibleChoices(churchId) {
        try {
            const query = `
                SELECT 
                    BibleInscriptionChoiceId,
                    BibleInscriptionChoiceNo,
                    BibleInscriptionChoiceNoValue,
                    ChurchId
                FROM BibleInscriptionChoice WITH (NOLOCK)
                WHERE ChurchId = @churchId
                ORDER BY BibleInscriptionChoiceNo ASC
            `;

            const result = await executeQuery(query, { churchId });

            if (!result.recordset || result.recordset.length === 0) {
                return [];
            }

            return result.recordset.map(row => 
                BibleInscriptionChoice.fromDatabase(row)
            );
        } catch (error) {
            logger.error('Error in getAllBibleChoices:', error);
            throw error;
        }
    }

    /**
     * Get Bible choice by ID
     * @param {number} choiceId - Bible Inscription Choice ID
     * @param {number} churchId - Church ID (for security)
     * @returns {Promise<BibleInscriptionChoice|null>} Bible choice or null
     */
    async getBibleChoiceById(choiceId, churchId) {
        try {
            const query = `
                SELECT 
                    BibleInscriptionChoiceId,
                    BibleInscriptionChoiceNo,
                    BibleInscriptionChoiceNoValue,
                    ChurchId
                FROM BibleInscriptionChoice WITH (NOLOCK)
                WHERE BibleInscriptionChoiceId = @choiceId
                  AND ChurchId = @churchId
            `;

            const result = await executeQuery(query, { 
                choiceId, 
                churchId 
            });

            if (!result.recordset || result.recordset.length === 0) {
                return null;
            }

            return BibleInscriptionChoice.fromDatabase(result.recordset[0]);
        } catch (error) {
            logger.error('Error in getBibleChoiceById:', error);
            throw error;
        }
    }
}

module.exports = BibleInscriptionChoiceRepository;
```

#### 2.3 Service

**File**: `src/services/BibleInscriptionChoiceService.js`

```javascript
const BibleInscriptionChoiceRepository = require('../repositories/BibleInscriptionChoiceRepository');
const logger = require('../utils/logger');

class BibleInscriptionChoiceService {
    constructor() {
        this.repository = new BibleInscriptionChoiceRepository();
    }

    /**
     * Get all Bible choices for a church
     * @param {number} churchId - Church ID
     * @returns {Promise<Object>} Service result with choices array
     */
    async getAllBibleChoices(churchId) {
        try {
            if (!churchId) {
                throw new Error('ChurchId is required');
            }

            const choices = await this.repository.getAllBibleChoices(churchId);

            return {
                success: true,
                data: choices,
                count: choices.length
            };
        } catch (error) {
            logger.error('Error in BibleInscriptionChoiceService.getAllBibleChoices:', error);
            return {
                success: false,
                error: {
                    code: 'GET_BIBLE_CHOICES_ERROR',
                    message: error.message
                }
            };
        }
    }

    /**
     * Get Bible choice by ID
     * @param {number} choiceId - Bible Inscription Choice ID
     * @param {number} churchId - Church ID
     * @returns {Promise<Object>} Service result with choice
     */
    async getBibleChoiceById(choiceId, churchId) {
        try {
            if (!choiceId || !churchId) {
                throw new Error('ChoiceId and ChurchId are required');
            }

            const choice = await this.repository.getBibleChoiceById(choiceId, churchId);

            if (!choice) {
                return {
                    success: false,
                    error: {
                        code: 'BIBLE_CHOICE_NOT_FOUND',
                        message: 'Bible choice not found'
                    }
                };
            }

            return {
                success: true,
                data: choice
            };
        } catch (error) {
            logger.error('Error in BibleInscriptionChoiceService.getBibleChoiceById:', error);
            return {
                success: false,
                error: {
                    code: 'GET_BIBLE_CHOICE_ERROR',
                    message: error.message
                }
            };
        }
    }
}

module.exports = BibleInscriptionChoiceService;
```

#### 2.4 Controller

**File**: `src/controllers/BibleInscriptionChoiceController.js`

```javascript
const BibleInscriptionChoiceService = require('../services/BibleInscriptionChoiceService');
const asyncHandler = require('../middleware/asyncHandler');

class BibleInscriptionChoiceController {
    constructor() {
        this.service = new BibleInscriptionChoiceService();
    }

    /**
     * Get all Bible choices for current user's church
     * GET /api/bible-choices
     */
    getAllBibleChoices = asyncHandler(async (req, res) => {
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

        const result = await this.service.getAllBibleChoices(churchId);

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
     * Get Bible choice by ID
     * GET /api/bible-choices/:choiceId
     */
    getBibleChoiceById = asyncHandler(async (req, res) => {
        const user = req.user;
        const churchId = user.churchId;
        const { choiceId } = req.params;
        const choiceIdNum = parseInt(choiceId, 10);

        if (isNaN(choiceIdNum)) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'INVALID_CHOICE_ID',
                    message: 'Invalid ChoiceId'
                }
            });
        }

        const result = await this.service.getBibleChoiceById(choiceIdNum, churchId);

        if (!result.success) {
            return res.status(404).json(result);
        }

        return res.json({
            success: true,
            data: result.data
        });
    });
}

module.exports = BibleInscriptionChoiceController;
```

#### 2.5 Routes

**File**: `src/routes/bibleChoices.js`

```javascript
const express = require('express');
const router = express.Router();
const BibleInscriptionChoiceController = require('../controllers/BibleInscriptionChoiceController');
const { authenticate } = require('../middleware/auth');

const controller = new BibleInscriptionChoiceController();

/**
 * @route   GET /api/bible-choices
 * @desc    Get all Bible choices for current user's church
 * @access  Private
 */
router.get('/', authenticate, controller.getAllBibleChoices);

/**
 * @route   GET /api/bible-choices/:choiceId
 * @desc    Get Bible choice by ID
 * @access  Private
 */
router.get('/:choiceId', authenticate, controller.getBibleChoiceById);

module.exports = router;
```

**Register in main app** (`src/app.js` or `src/server.js`):

```javascript
const bibleChoicesRoutes = require('./routes/bibleChoices');
app.use('/api/bible-choices', bibleChoicesRoutes);
```

---

### Phase 3: Frontend Implementation (React)

#### 3.1 API Client

**File**: `src/api/bibleChoices.js`

```javascript
import api from './client';

/**
 * Get all Bible inscription choices for current church
 * @returns {Promise<Array>} Array of Bible choices
 */
export async function getBibleChoices() {
    const res = await api.get('/bible-choices');
    return res.data.data;
}

/**
 * Get Bible choice by ID
 * @param {number} choiceId - Bible Inscription Choice ID
 * @returns {Promise<Object>} Bible choice object
 */
export async function getBibleChoiceById(choiceId) {
    const res = await api.get(`/bible-choices/${choiceId}`);
    return res.data.data;
}
```

#### 3.2 React Component - Bible Choice Selector

**File**: `src/components/BibleChoiceSelector.jsx`

```javascript
import React, { useState, useEffect } from 'react';
import { getBibleChoices } from '../api/bibleChoices';

function BibleChoiceSelector({ 
    value, 
    onChange, 
    onPhraseChange,
    phraseValue = '',
    maxPhraseLength = 90 
}) {
    const [choices, setChoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedChoice, setSelectedChoice] = useState(null);

    useEffect(() => {
        loadBibleChoices();
    }, []);

    useEffect(() => {
        // When value (choiceId) changes, find and set selected choice
        if (value && choices.length > 0) {
            const choice = choices.find(c => c.bibleInscriptionChoiceId === value);
            if (choice) {
                setSelectedChoice(choice);
                // Auto-populate phrase if not already set
                if (!phraseValue && onPhraseChange) {
                    onPhraseChange(choice.bibleInscriptionChoiceNoValue);
                }
            }
        } else {
            setSelectedChoice(null);
        }
    }, [value, choices]);

    const loadBibleChoices = async () => {
        try {
            setLoading(true);
            const data = await getBibleChoices();
            setChoices(data);
        } catch (error) {
            console.error('Error loading Bible choices:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectChange = (e) => {
        const choiceId = parseInt(e.target.value, 10);
        
        if (choiceId === 0 || isNaN(choiceId)) {
            // Clear selection
            setSelectedChoice(null);
            onChange(null);
            if (onPhraseChange) {
                onPhraseChange('');
            }
        } else {
            // Find selected choice
            const choice = choices.find(c => c.bibleInscriptionChoiceId === choiceId);
            if (choice) {
                setSelectedChoice(choice);
                onChange(choiceId);
                // Auto-populate phrase
                if (onPhraseChange) {
                    onPhraseChange(choice.bibleInscriptionChoiceNoValue);
                }
            }
        }
    };

    const handlePhraseChange = (e) => {
        const newPhrase = e.target.value;
        if (newPhrase.length <= maxPhraseLength) {
            if (onPhraseChange) {
                onPhraseChange(newPhrase);
            }
        }
    };

    const remainingChars = maxPhraseLength - (phraseValue?.length || 0);

    return (
        <div className="bible-choice-selector">
            <div className="form-group">
                <label htmlFor="bibleSelect">
                    Bible Inscription of Choice number
                </label>
                <select
                    id="bibleSelect"
                    name="bibleSelect"
                    value={value || ''}
                    onChange={handleSelectChange}
                    disabled={loading}
                    className="form-control"
                >
                    <option value="">Select</option>
                    {choices.map(choice => (
                        <option
                            key={choice.bibleInscriptionChoiceId}
                            value={choice.bibleInscriptionChoiceId}
                        >
                            {choice.bibleInscriptionChoiceNo}
                        </option>
                    ))}
                </select>
                {loading && <span>Loading...</span>}
            </div>

            <div className="form-group">
                <label htmlFor="bibleInscriptionPhrase">
                    Bible Inscription phrases of applicant's choice:
                </label>
                <textarea
                    id="bibleInscriptionPhrase"
                    name="bibleInscriptionPhrase"
                    value={phraseValue || ''}
                    onChange={handlePhraseChange}
                    maxLength={maxPhraseLength}
                    rows={3}
                    className="form-control"
                    placeholder="Please choose the choice Number"
                />
                <div className="char-counter">
                    <span className={remainingChars < 10 ? 'text-warning' : ''}>
                        {remainingChars} characters remaining
                    </span>
                </div>
            </div>

            {selectedChoice && (
                <div className="selected-choice-info">
                    <strong>Selected:</strong> {selectedChoice.bibleInscriptionChoiceNo}
                </div>
            )}
        </div>
    );
}

export default BibleChoiceSelector;
```

#### 3.3 Usage in Inscription Form

**File**: `src/pages/InscriptionFormPage.jsx` (Example integration)

```javascript
import React, { useState } from 'react';
import BibleChoiceSelector from '../components/BibleChoiceSelector';

function InscriptionFormPage() {
    const [formData, setFormData] = useState({
        bibleInscriptionChoiceId: null,
        bibleInscriptionChoiceNo: '',
        additionalInscriptionPhrase: ''
    });

    const handleBibleChoiceChange = (choiceId) => {
        setFormData(prev => ({
            ...prev,
            bibleInscriptionChoiceId: choiceId
        }));
    };

    const handlePhraseChange = (phrase) => {
        setFormData(prev => ({
            ...prev,
            additionalInscriptionPhrase: phrase
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Find choice number string for storage
        const choice = choices.find(c => 
            c.bibleInscriptionChoiceId === formData.bibleInscriptionChoiceId
        );
        
        const payload = {
            ...formData,
            bibleInscriptionChoiceNo: choice?.bibleInscriptionChoiceNo || ''
        };

        // Submit to API
        // await createInscriptionRequest(payload);
    };

    return (
        <form onSubmit={handleSubmit}>
            <h2>Create Niche Inscription Request</h2>
            
            {/* Other form fields... */}
            
            <div className="collapsible-section">
                <h3>Additional details of Inscription</h3>
                <BibleChoiceSelector
                    value={formData.bibleInscriptionChoiceId}
                    onChange={handleBibleChoiceChange}
                    phraseValue={formData.additionalInscriptionPhrase}
                    onPhraseChange={handlePhraseChange}
                />
            </div>

            <button type="submit">Save</button>
        </form>
    );
}

export default InscriptionFormPage;
```

---

### Phase 4: Integration with NicheInscriptionRequest

#### 4.1 Update NicheInscriptionRequest Model

**File**: `src/models/NicheInscriptionRequest.js` (add fields)

```javascript
class NicheInscriptionRequest {
    constructor(data = {}) {
        // ... existing fields ...
        this.additionalInscriptionPhrase = data.additionalInscriptionPhrase ?? '';
        this.bibleInscriptionChoiceNo = data.bibleInscriptionChoiceNo ?? '';
        this.bibleInscriptionChoiceId = data.bibleInscriptionChoiceId ?? null;
        // ... other fields ...
    }
}
```

#### 4.2 Update Repository to Save Bible Choice

**File**: `src/repositories/NicheInscriptionRequestRepository.js` (update save method)

```javascript
async createInscriptionRequest(data) {
    const query = `
        INSERT INTO NicheInscriptionRequest
            (ChurchId, ApplicantName, NicheId, 
             BibleInscriptionChoiceId, BibleInscriptionChoiceNo, 
             AdditionalInscriptionPhrase, ...)
        OUTPUT INSERTED.*
        VALUES 
            (@churchId, @applicantName, @nicheId,
             @bibleInscriptionChoiceId, @bibleInscriptionChoiceNo,
             @additionalInscriptionPhrase, ...)
    `;
    
    const result = await executeQuery(query, {
        churchId: data.churchId,
        applicantName: data.applicantName,
        nicheId: data.nicheId,
        bibleInscriptionChoiceId: data.bibleInscriptionChoiceId || null,
        bibleInscriptionChoiceNo: data.bibleInscriptionChoiceNo || null,
        additionalInscriptionPhrase: data.additionalInscriptionPhrase || null,
        // ... other params
    });
    
    return result.recordset[0];
}
```

---

## Complete Implementation Checklist

### Backend (Node.js)

- [ ] Create `BibleInscriptionChoice` table in database
- [ ] Seed sample Bible choices data
- [ ] Implement `BibleInscriptionChoice` model
- [ ] Implement `BibleInscriptionChoiceRepository`
- [ ] Implement `BibleInscriptionChoiceService`
- [ ] Implement `BibleInscriptionChoiceController`
- [ ] Create routes (`/api/bible-choices`)
- [ ] Register routes in main app
- [ ] Update `NicheInscriptionRequest` model to include Bible choice fields
- [ ] Update `NicheInscriptionRequestRepository` to save Bible choice data
- [ ] Test API endpoints

### Frontend (React)

- [ ] Create API client functions (`getBibleChoices`, `getBibleChoiceById`)
- [ ] Create `BibleChoiceSelector` component
- [ ] Integrate component into Inscription form
- [ ] Add character counter for phrase textbox
- [ ] Add validation (max 90 characters)
- [ ] Handle save/update with Bible choice data
- [ ] Test user flow (select choice → auto-populate phrase → edit → save)

---

## API Response Examples

### GET /api/bible-choices

**Request**: `GET /api/bible-choices` (with auth token)

**Response**:
```json
{
    "success": true,
    "data": [
        {
            "bibleInscriptionChoiceId": 1,
            "bibleInscriptionChoiceNo": "No1-Psalm 4:8",
            "bibleInscriptionChoiceNoValue": "I will lie down & sleep in peace, for you alone, O Lord, make me dwell in safety",
            "churchId": 1
        },
        {
            "bibleInscriptionChoiceId": 2,
            "bibleInscriptionChoiceNo": "No2-Psalm 23:1",
            "bibleInscriptionChoiceNoValue": "The Lord is my Shepherd, there is nothing I shall want",
            "churchId": 1
        }
    ],
    "count": 2
}
```

### GET /api/bible-choices/:choiceId

**Request**: `GET /api/bible-choices/1` (with auth token)

**Response**:
```json
{
    "success": true,
    "data": {
        "bibleInscriptionChoiceId": 1,
        "bibleInscriptionChoiceNo": "No1-Psalm 4:8",
        "bibleInscriptionChoiceNoValue": "I will lie down & sleep in peace, for you alone, O Lord, make me dwell in safety",
        "churchId": 1
    }
}
```

---

## Summary

This document provides a **complete analysis** of the Bible Inscription Choice Number feature in the ASP.NET application and a **detailed roadmap** for implementing the same functionality in Node.js + React.

**Key Takeaways**:
1. **Database**: Simple table with 4 columns (ID, ChoiceNo, ChoiceNoValue, ChurchId)
2. **No Stored Procedures**: Uses LINQ to SQL (can be replaced with parameterized queries in Node.js)
3. **Multi-tenant**: All queries filtered by `ChurchId`
4. **Frontend Flow**: Load choices → Populate dropdown → Select choice → Auto-fill phrase → User can edit → Save
5. **Storage**: Both `BibleInscriptionChoiceId` (FK) and `BibleInscriptionChoiceNo` (string) stored for reporting

The Node.js + React implementation follows the same patterns and provides full feature parity with the ASP.NET version.

---

**Document Version**: 1.0  
**Last Updated**: 2025-01-25  
**Author**: Deep Analysis from ASP.NET Codebase

