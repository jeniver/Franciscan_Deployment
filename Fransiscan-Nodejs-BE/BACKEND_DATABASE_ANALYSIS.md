# Backend Database Analysis Report

## Executive Summary

This document provides a comprehensive analysis of:
1. **Table Creation Queries** - How tables are created in the backend
2. **Reference Types System** - How RefDocType/RefDocName/RefDocNumber work
3. **Foreign Key Relationships** - Database referential integrity

---

## 1. TABLE CREATION QUERIES

### Finding: **NO Dynamic Table Creation in Application Code**

✅ **All tables are created via static SQL scripts**, not dynamically in the application code.

### Table Creation Sources:

1. **Primary Source**: `db-Backup/script.sql`
   - Contains all CREATE TABLE statements
   - Database: `FransiscanTest`
   - Created: November 18, 2025

2. **Optimization Script**: `DATABASE_OPTIMIZATION.sql`
   - Creates indexes only (no tables)
   - Performance optimization queries

### Key Tables Created:

| Table Name | Purpose | Primary Key |
|------------|---------|-------------|
| `NicheApplication` | Main niche booking applications | `NicheApplicationId` |
| `NicheBooking` | Booked niches | `NicheBookingId` |
| `Invoice` | Invoice headers | `InvoiceId` |
| `InvoiceDetail` | Invoice line items | `InvoiceDetailId` |
| `Receipt` | Payment receipts | `ReceiptId` |
| `Person` | Contact persons, nominees, beneficiaries | `PersonId` |
| `Niche` | Individual niche records | `NicheId` |
| `NicheRow` | Niche row hierarchy | `NicheRowlId` |
| `NicheWall` | Niche wall hierarchy | `NicheWallId` |
| `Chapel` | Chapel information | `ChapelId` |
| `Church` | Church information | `ChurchId` |
| `User` | System users | `UserId` |
| `NicheInscriptionRequest` | Inscription requests | `NicheInscriptionRequestId` |
| `NicheInscriptionRequestDecesed` | Deceased information | `NicheInscriptionRequestDecesedId` |
| `WakeRoom` | Wake room information | `WakeRoomId` |
| `WakeRoomBooking` | Wake room bookings | `WakeRoomBookingId` |
| `EngraveWallApplication` | Engrave wall applications | `EngraveWallApplicationId` |
| `GateOfLifeApplication` | Gate of Life applications | `GateOfLifeApplicationId` |
| `BibleInscriptionChoice` | Bible inscription choices | `BibleInscriptionChoiceId` |

### Important Note:
- **No CREATE TABLE queries found in application code** (`src/` directory)
- All schema changes must be done via SQL scripts
- Application uses existing tables only

---

## 2. REFERENCE TYPES SYSTEM

### Overview

The backend uses a **Reference Document System** to link invoices/receipts to source documents (applications, bookings, etc.).

### Reference Document Fields

#### In `Invoice` Table:
- `RefDocNumber` (nvarchar(50)) - Reference document number (e.g., "3795-1", "NAPP-123")
- `RefDocName` (nvarchar(50)) - Reference document type (e.g., "NAPP", "WAPP", "INCR", "GOLA")

#### In `InvoiceDetail` Table:
- `RefDocNumber` (nvarchar(50)) - Reference document number
- `RefDocName` (nvarchar(50)) - Reference document type

### Reference Document Types (RefDocName)

| Type | Full Name | Validates Against | Description |
|------|-----------|-------------------|-------------|
| **NAPP** | Niche Application | `NicheApplication.Code` | Standard niche booking application |
| **WAPP** | Wake Room Application | `WakeRoomBooking.Code` | Wake room booking |
| **INCR** | Inscription Request | `NicheInscriptionRequest.Code` | Niche inscription request |
| **GOLA** | Gate of Life Application | `GateOfLifeApplication.Code` | Engrave wall application |
| **DONA** | Donation | `NicheApplication.Code` | Donation (uses Niche Application) |
| **OTHERS** | Others | No validation | Miscellaneous invoices |

### Reference Document Validation

**Service**: `ReferenceDocumentValidator` (`src/services/ReferenceDocumentValidator.js`)

**Validation Flow**:
1. Invoice creation requires `refDocName` and `refDocNumber`
2. Validator checks if the referenced document exists
3. Validates church access control
4. Returns `true` if valid, `false` if invalid

**Special Cases**:
- **I-NAPP-XX format**: Derived reference for inscription items
  - Extracts base code (removes "I-" prefix)
  - Validates against `NicheApplication` instead of `NicheInscriptionRequest`
  - Allows invoice creation before inscription request exists

### Reference Document Usage Patterns

#### Pattern 1: Direct Reference
```sql
-- InvoiceDetail references NicheApplication directly
RefDocName = 'NAPP'
RefDocNumber = '3795-1'  -- Matches NicheApplication.Code
```

#### Pattern 2: Derived Reference
```sql
-- InvoiceDetail references inscription via application
RefDocName = 'INCR'
RefDocNumber = 'I-NAPP-3795-1'  -- Derived from NicheApplication.Code
```

#### Pattern 3: No Reference
```sql
-- Miscellaneous invoice
RefDocName = 'OTHERS'
RefDocNumber = NULL or custom value
```

### Reference Document Lookup Logic

**In InvoiceRepository** (`src/repositories/InvoiceRepository.js`):

1. **Primary Lookup**: By Invoice Code
2. **Fallback 1**: By RefDocNumber in InvoiceDetail
3. **Fallback 2**: By RefDocNumber in Invoice header
4. **Fallback 3**: Pattern matching (e.g., "3795-1" → "NAPP")

**Code Pattern Detection**:
```javascript
// Detects RefDocName from code pattern
if (code.startsWith('NAPP-')) refDocName = 'NAPP';
if (code.startsWith('WAPP-')) refDocName = 'WAPP';
if (code.startsWith('INCR-')) refDocName = 'INCR';
if (code.startsWith('GOLA-')) refDocName = 'GOLA';
```

---

## 3. FOREIGN KEY RELATIONSHIPS

### Complete Foreign Key Map

#### Core Hierarchy (Niche Structure)
```
Church
  └── Chapel (FK: ChurchId → Church.ChurchId)
      └── NicheWall (FK: ChapelId → Chapel.ChapelId)
          └── NicheRow (FK: NicheWallId → NicheWall.NicheWallId)
              └── Niche (FK: NicheRowlId → NicheRow.NicheRowlId)
```

#### Application & Booking Relationships
```
NicheApplication
  ├── FK: NicheId → Niche.NicheId
  └── FK: UserId → User.UserId

NicheBooking
  ├── FK: NicheId → Niche.NicheId
  ├── FK: ContactPersonId → Person.PersonId
  ├── FK: NomineeId → Person.PersonId
  ├── FK: NomineeId2 → Person.PersonId
  └── FK: UserId → User.UserId

NicheBookingBeneficiary
  ├── FK: NicheBookingId → NicheBooking.NicheBookingId
  ├── FK: NicheId → Niche.NicheId
  └── FK: PersonId → Person.PersonId
```

#### Invoice & Receipt Relationships
```
Invoice
  ├── FK: UserId → User.UserId
  └── (No FK to NicheApplication - uses RefDocNumber instead)

InvoiceDetail
  ├── FK: InvoiceId → Invoice.InvoiceId
  └── FK: ItemId → Item.ItemId

Receipt
  └── FK: InvoiceId → Invoice.InvoiceId
```

#### Inscription Relationships
```
NicheInscriptionRequest
  ├── FK: NicheId → Niche.NicheId
  ├── FK: BibleInscriptionChoiceId → BibleInscriptionChoice.BibleInscriptionChoiceId
  └── FK: UserId → User.UserId

NicheInscriptionRequestDecesed
  └── FK: NicheInscriptionRequestId → NicheInscriptionRequest.NicheInscriptionRequestId
```

#### Other Relationships
```
User
  ├── FK: RoleId → AppRole.RoleId
  └── FK: ChurchId → Church.ChurchId (optional)

WakeRoom
  └── FK: ChurchId → Church.ChurchId

WakeRoomBooking
  ├── FK: WakeRoomId → WakeRoom.WakeRoomId
  └── FK: UserId → User.UserId

EngraveWallApplication
  └── FK: UserId → User.UserId

EngraveWallApplicationDetail
  └── FK: EngraveWallApplicationId → EngraveWallApplication.EngraveWallApplicationId

TaskItemMapping
  ├── FK: TaskId → AppTask.TaskId
  └── FK: ItemId → Item.ItemId
```

### Important Notes on Foreign Keys

1. **No FK from Invoice to NicheApplication**
   - Uses `RefDocNumber` string reference instead
   - Allows flexibility for different document types
   - No referential integrity enforced at DB level

2. **Person Table is Central**
   - Used for: Applicants, Nominees, Beneficiaries
   - Referenced by: `NicheBooking` (ContactPersonId, NomineeId, NomineeId2)
   - Referenced by: `NicheBookingBeneficiary` (PersonId)

3. **Cascade Behavior**
   - Most FKs use `WITH CHECK` constraint
   - No explicit CASCADE DELETE defined
   - Manual cleanup required for related records

---

## 4. REFERENCE TYPE IMPLEMENTATION DETAILS

### How RefDocNumber is Used

#### 1. Invoice Creation
```javascript
// In InvoiceRepository.saveInvoice()
invoiceRequest.input('refDocNumber', sql.NVarChar, normalizedRefDocNumber);
invoiceRequest.input('refDocName', sql.NVarChar, normalizedRefDocName);
```

#### 2. Invoice Lookup
```sql
-- Primary lookup by RefDocNumber
SELECT * FROM InvoiceDetail id
WHERE id.RefDocNumber = @applicationCode
```

#### 3. Receipt Lookup
```sql
-- Receipt lookup via Invoice → InvoiceDetail
SELECT r.*, i.*
FROM InvoiceDetail id
INNER JOIN Invoice i ON id.InvoiceId = i.InvoiceId
INNER JOIN Receipt r ON i.InvoiceId = r.InvoiceId
WHERE id.RefDocNumber = @refDocNumber
```

### Reference Type Normalization

**Critical**: All RefDocNumber values are normalized:
- **Trimmed**: Removes leading/trailing whitespace
- **Case-insensitive**: Uppercase for RefDocName
- **Consistent**: Same normalization in save and lookup

```javascript
// Normalization pattern
const normalizedRefDocNumber = refDocNumber ? String(refDocNumber).trim() : null;
const normalizedRefDocName = refDocName ? String(refDocName).trim().toUpperCase() : null;
```

---

## 5. DATABASE INDEXES FOR REFERENCES

### Critical Indexes for Reference Lookups

1. **IX_InvoiceDetail_RefDocNumber** (CRITICAL)
   - Indexes: `RefDocNumber`
   - Includes: `InvoiceId`
   - Used for: Fast invoice lookup by application code

2. **IX_InvoiceDetail_RefDocNumber_Status_ItemId**
   - Indexes: `RefDocNumber`, `ItemId`
   - Includes: `InvoiceId`, `TotalPayingAmount`, `LineTaxAmount`, `PayingAmount`
   - Used for: Enhanced invoice queries with status filtering

3. **IX_NicheApplication_Code** (CRITICAL)
   - Indexes: `Code`
   - Includes: Multiple fields
   - Used for: Fast application lookup for validation

---

## 6. SUMMARY & RECOMMENDATIONS

### Key Findings

1. ✅ **No dynamic table creation** - All tables are static, created via SQL scripts
2. ✅ **Reference system is string-based** - Uses RefDocNumber/RefDocName instead of FKs
3. ✅ **Validation is application-level** - ReferenceDocumentValidator ensures integrity
4. ✅ **Flexible reference types** - Supports NAPP, WAPP, INCR, GOLA, DONA, OTHERS

### Recommendations

1. **Consider adding FK constraints** for commonly referenced documents
   - Add FK from InvoiceDetail to NicheApplication (if RefDocName = 'NAPP')
   - This would require schema changes and data migration

2. **Maintain reference normalization** - Current trimming/uppercase logic is critical

3. **Index maintenance** - Ensure indexes on RefDocNumber are maintained for performance

4. **Documentation** - Keep this analysis updated when adding new reference types

---

## 7. REFERENCE TYPE QUICK REFERENCE

### Adding a New Reference Type

1. **Add to ReferenceDocumentValidator**:
   ```javascript
   case 'NEWTYPE':
     return await this.validateNewType(refDocNumber, churchId);
   ```

2. **Add validation method**:
   ```javascript
   async validateNewType(code, churchId) {
     // Validate against appropriate table
   }
   ```

3. **Update lookup patterns** in InvoiceRepository if needed

4. **Update documentation** (this file)

---

**Last Updated**: Based on codebase analysis as of current date
**Database**: FransiscanTest (SQL Server)
**Application**: Node.js/Express backend







