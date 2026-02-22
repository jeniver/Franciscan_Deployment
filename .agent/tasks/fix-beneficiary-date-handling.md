# Task: Fix Beneficiary Date Handling (dateOfBirth & birthYear)

## Problem Statement
When storing beneficiary data via `PUT /api/niche-applications/:code`, the `dateOfBirth` field (format: "13-04-1998") is not being properly converted before database storage. When retrieving data via `GET /api/niche-agreements/:applicationNumber`, only `birthYear` is returned, and `dateOfBirth` is often missing or incorrectly formatted.

## Root Cause Analysis

### Data Flow
1. **Frontend → Backend (PUT)**: `dateOfBirth: "13-04-1998"`, `birthYear: ""`
2. **Backend Processing**: Controller → Service → Repository → Database
3. **Database Storage**: Both `DateOfBirth` (NVARCHAR/DATE) and `BirthYear` (NVARCHAR/INT) columns
4. **Backend Retrieval (GET)**: Database → Repository → Service → Controller → Frontend
5. **Frontend Display**: Often shows only `birthYear`, missing `dateOfBirth`

### Issues Identified

1. **Date Format Conversion Missing**:
   - Input: "13-04-1998" (DD-MM-YYYY string)
   - Database expects: ISO date or SQL-compatible format
   - Current code: No conversion happening in `NicheApplicationController.optimizeBeneficiaries()`

2. **BirthYear Extraction Missing**:
   - When `dateOfBirth` is provided, `birthYear` should be auto-extracted
   - Currently: `birthYear` remains empty if not explicitly provided

3. **Retrieval Logic Issues**:
   - `NicheApplicationRepository.getByCode()` has date formatting (lines 969-1010)
   - `NicheAgreementRepository` has `formatBirthYear()` helper but may not handle `dateOfBirth` correctly

## Solution Plan

### Phase 1: Fix Data Storage (PUT /api/niche-applications/:code)

**File**: `Fransiscan-Nodejs-BE/src/controllers/NicheApplicationController.js`

**Changes in `optimizeBeneficiaries()` method** (lines 340-401):

1. Add date parsing utility function
2. Convert `dateOfBirth` from "DD-MM-YYYY" to ISO format
3. Auto-extract `birthYear` from `dateOfBirth` if not provided
4. Validate date formats

```javascript
// Add helper function at class level
parseBeneficiaryDate(dateString) {
  if (!dateString || dateString.trim() === '') return null;
  
  // Handle DD-MM-YYYY format (e.g., "13-04-1998")
  const ddmmyyyyMatch = dateString.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (ddmmyyyyMatch) {
    const [_, day, month, year] = ddmmyyyyMatch;
    return new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
  }
  
  // Handle ISO format or other standard formats
  const parsed = new Date(dateString);
  return isNaN(parsed.getTime()) ? null : parsed;
}

extractBirthYear(dateOfBirth) {
  if (!dateOfBirth) return null;
  
  // If it's already a Date object
  if (dateOfBirth instanceof Date) {
    return dateOfBirth.getFullYear();
  }
  
  // If it's a string in DD-MM-YYYY format
  const ddmmyyyyMatch = String(dateOfBirth).match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (ddmmyyyyMatch) {
    return parseInt(ddmmyyyyMatch[3], 10);
  }
  
  // Try parsing as date
  const parsed = new Date(dateOfBirth);
  return isNaN(parsed.getTime()) ? null : parsed.getFullYear();
}

// Update optimizeBeneficiaries() method
optimizeBeneficiaries(payload) {
  const beneficiaries = [];
  
  if (Array.isArray(payload.beneficiaries) && payload.beneficiaries.length > 0) {
    payload.beneficiaries.forEach((beneficiary, index) => {
      // Parse dateOfBirth
      const parsedDate = this.parseBeneficiaryDate(beneficiary.dateOfBirth);
      const formattedDateOfBirth = parsedDate ? parsedDate.toISOString() : null;
      
      // Extract or use birthYear
      let birthYear = beneficiary.birthYear;
      if (!birthYear && parsedDate) {
        birthYear = parsedDate.getFullYear();
      } else if (birthYear) {
        birthYear = parseInt(birthYear, 10);
      }
      
      beneficiaries.push({
        id: beneficiary.id,
        name: beneficiary.name || beneficiary.fullName,
        idNo: beneficiary.idNo || beneficiary.nric,
        isCatholic: beneficiary.isCatholic,
        isMale: beneficiary.isMale,
        gender: beneficiary.gender || (beneficiary.isMale ? 'Male' : 'Female'),
        relationship: beneficiary.relationship || beneficiary.relationshipToApplicant,
        dateOfBirth: formattedDateOfBirth,
        birthYear: birthYear,
        status: beneficiary.status,
        relationshipToNominee1: beneficiary.relationshipToNominee1,
        relationshipToNominee2: beneficiary.relationshipToNominee2,
        religion: beneficiary.religion
      });
    });
  } else {
    // Handle flat structure (existing code with same date parsing logic)
    // ... apply same date parsing to beneficiary1-5 fields
  }
  
  return beneficiaries;
}
```

### Phase 2: Fix Data Retrieval (GET /api/niche-agreements/:applicationNumber)

**File**: `Fransiscan-Nodejs-BE/src/repositories/NicheAgreementRepository.js`

**Changes**:

1. Ensure `DateOfBirth` is selected in SQL queries (lines 366, 470)
2. Add `formatDateOfBirth()` helper similar to `formatBirthYear()`
3. Map both fields in response (lines 412-416, 503-507)

```javascript
// Add helper function
formatDateOfBirth(dbValue) {
  if (!dbValue) return null;
  
  if (dbValue instanceof Date) {
    return dbValue.toISOString().split('T')[0]; // YYYY-MM-DD
  }
  
  if (typeof dbValue === 'string') {
    const trimmed = dbValue.trim();
    if (!trimmed) return null;
    
    const parsed = new Date(trimmed);
    return isNaN(parsed.getTime()) ? trimmed : parsed.toISOString().split('T')[0];
  }
  
  return null;
}

// Update beneficiary mapping (around line 412)
nicheAgreement.beneDateOfBirth_1 = this.formatDateOfBirth(bene1.DateOfBirth);
nicheAgreement.beneBirthYear_1 = this.formatBirthYear(bene1.BirthYear);

// Include in response
beneficiary1: {
  dateOfBirth: nicheAgreement.beneDateOfBirth_1,
  birthYear: nicheAgreement.beneBirthYear_1
}
```

### Phase 3: Testing Plan

1. **Test Date Storage**:
   ```bash
   # PUT request with dateOfBirth in DD-MM-YYYY format
   curl -X PUT http://192.168.1.24:3000/api/niche-applications/1402-11 \
     -H "Content-Type: application/json" \
     -d '{
       "beneficiaries": [{
         "name": "Test Beneficiary",
         "dateOfBirth": "13-04-1998",
         "birthYear": ""
       }]
     }'
   ```

2. **Verify Database**:
   ```sql
   SELECT Name, DateOfBirth, BirthYear 
   FROM NicheApplicationBeneficiary 
   WHERE NicheApplicationId = (
     SELECT NicheApplicationId FROM NicheApplication WHERE Code = '1402-11'
   )
   ```

3. **Test Data Retrieval**:
   ```bash
   # GET request to verify both fields are returned
   curl http://192.168.1.24:3000/api/niche-agreements/1402-11
   ```

4. **Expected Results**:
   - Database: `DateOfBirth = '1998-04-13'`, `BirthYear = 1998`
   - API Response: `{ "dateOfBirth": "1998-04-13", "birthYear": 1998 }`

### Phase 4: Edge Cases to Handle

1. **Empty/Null Values**: Both fields empty → store as NULL
2. **Only dateOfBirth**: Extract birthYear automatically
3. **Only birthYear**: Store birthYear, dateOfBirth as NULL
4. **Invalid Formats**: Log warning, store as NULL
5. **Different Date Formats**: Support DD-MM-YYYY, YYYY-MM-DD, ISO

## Implementation Checklist

- [x] Add `parseBeneficiaryDate()` helper to NicheApplicationController
- [x] Add `extractBirthYear()` helper to NicheApplicationController
- [x] Update `optimizeBeneficiaries()` for array structure
- [x] Update `optimizeBeneficiaries()` for flat structure (beneficiary1-5)
- [x] Add `formatDateOfBirth()` to NicheAgreementRepository (already exists)
- [x] Update SQL queries to select DateOfBirth (already correct)
- [x] Update beneficiary mapping in NicheAgreementRepository (already correct)
- [x] Add logging for date conversion issues
- [ ] Test with sample data (1402-11) - **READY FOR USER TESTING**
- [ ] Verify database storage
- [ ] Verify API retrieval
- [ ] Test edge cases

## Files to Modify

1. `Fransiscan-Nodejs-BE/src/controllers/NicheApplicationController.js` (lines 340-401)
2. `Fransiscan-Nodejs-BE/src/repositories/NicheAgreementRepository.js` (lines 319-560)

## Success Criteria

✅ `dateOfBirth` "13-04-1998" → stored as `1998-04-13` in database
✅ `birthYear` auto-extracted as `1998` when not provided
✅ GET `/api/niche-agreements/:code` returns both `dateOfBirth` and `birthYear`
✅ No data loss during conversion
✅ Backward compatible with existing data
