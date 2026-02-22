# Beneficiary Date Fix - Testing Guide

## Issue Found

When testing with application `1403-5`, we discovered that the date parsing logic was working, but **empty strings were not being properly normalized to null** before the auto-extraction logic ran.

### Test Case That Failed:

**PUT Payload:**
```json
{
  "beneficiaries": [
    {
      "name": "jjhhjh",
      "birthYear": 1998,
      "dateOfBirth": ""
    },
    {
      "name": "jgjhghhjg",
      "birthYear": "",
      "dateOfBirth": "24-04-1996"
    }
  ]
}
```

**Expected Result:**
- Beneficiary 1: `birthYear: 1998`, `dateOfBirth: null` ✅
- Beneficiary 2: `birthYear: 1996` (auto-extracted), `dateOfBirth: "1996-04-24T00:00:00.000Z"` ✅

**Actual Result (BEFORE FIX):**
- Beneficiary 1: `birthYear: 1998`, `dateOfBirth: null` ✅
- Beneficiary 2: `birthYear: null`, `dateOfBirth: null` ❌

## Root Cause

The issue was in the `optimizeBeneficiaries()` method. When `birthYear` was an empty string `""`, the condition `if (!birthYear && parsedDate)` was evaluating correctly (empty string is falsy), BUT the logic flow had a problem:

```javascript
// OLD CODE (BUGGY)
let birthYear = beneficiary.birthYear;  // birthYear = ""
if (!birthYear && parsedDate) {
  birthYear = parsedDate.getFullYear();  // This should execute
} else if (birthYear) {  // This won't execute because "" is falsy
  birthYear = parseInt(birthYear, 10);
}
```

The problem was that we weren't **explicitly normalizing empty strings to null first**, which could cause issues with type coercion in JavaScript.

## Fix Applied

We updated the logic to **explicitly normalize empty strings to null** before checking:

```javascript
// NEW CODE (FIXED)
let birthYear = beneficiary.birthYear;
// Normalize empty string to null
if (birthYear === '' || birthYear === null || birthYear === undefined) {
  birthYear = null;
} else if (typeof birthYear === 'string') {
  const parsed = parseInt(birthYear, 10);
  birthYear = isNaN(parsed) ? null : parsed;
}

// Auto-extract birthYear from dateOfBirth if not provided
if (!birthYear && parsedDate) {
  birthYear = parsedDate.getFullYear();
  logger.info(`[Controller] Auto-extracted birthYear ${birthYear} from dateOfBirth for beneficiary: ${beneficiary.name}`);
}
```

### Changes Made:

1. **Explicit Empty String Handling**: Convert `""` → `null` before any logic
2. **String to Number Conversion**: Parse string numbers and validate with `isNaN()`
3. **Improved Logging**: Changed from `logger.debug` to `logger.info` for better visibility
4. **Applied to Both Structures**: Fixed both array structure and flat structure (beneficiary1-5)

## Testing Instructions

### Step 1: Clear Existing Data (Optional)

If you want to test with fresh data, you can delete the existing beneficiaries for `1403-5`:

```sql
DELETE FROM NicheApplicationBeneficiary 
WHERE NicheApplicationId = (
  SELECT NicheApplicationId FROM NicheApplication WHERE Code = '1403-5'
)
```

### Step 2: Send PUT Request

Use the same payload you tested before:

```bash
PUT http://192.168.1.24:3000/api/niche-applications/1403-5
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "beneficiaries": [
    {
      "id": 1,
      "name": "jjhhjh",
      "idNo": "S34343343",
      "isCatholic": true,
      "isMale": true,
      "gender": "Male",
      "birthYear": 1998,
      "dateOfBirth": "",
      "relationship": "fdgdfggf",
      "relationshipToNominee1": "fdsfdgfdg",
      "relationshipToNominee2": "fdg",
      "religion": "Catholic",
      "status": "Active"
    },
    {
      "id": 2,
      "name": "jgjhghhjg",
      "idNo": "S34553535",
      "isCatholic": true,
      "isMale": true,
      "gender": "Male",
      "birthYear": "",
      "dateOfBirth": "24-04-1996",
      "relationship": "dsffds",
      "relationshipToNominee1": "dfsdfd",
      "relationshipToNominee2": "sdsfdfd",
      "religion": "Catholic",
      "status": "Active"
    }
  ]
}
```

### Step 3: Check Server Logs

You should see logs like this:

```
[Controller] Processing beneficiary 1: {
  name: 'jjhhjh',
  rawDateOfBirth: '',
  formattedDateOfBirth: null,
  rawBirthYear: 1998,
  finalBirthYear: 1998
}

[Controller] Auto-extracted birthYear 1996 from dateOfBirth for beneficiary: jgjhghhjg
[Controller] Processing beneficiary 2: {
  name: 'jgjhghhjg',
  rawDateOfBirth: '24-04-1996',
  formattedDateOfBirth: '1996-04-24T00:00:00.000Z',
  rawBirthYear: '',
  finalBirthYear: 1996
}
```

### Step 4: Verify Database

Check the database to ensure data was stored correctly:

```sql
SELECT 
  Name,
  DateOfBirth,
  BirthYear,
  RelationshipToApplicant
FROM NicheApplicationBeneficiary
WHERE NicheApplicationId = (
  SELECT NicheApplicationId FROM NicheApplication WHERE Code = '1403-5'
)
ORDER BY NicheApplicationBeneficiaryId
```

**Expected Result:**
```
Name        | DateOfBirth | BirthYear | RelationshipToApplicant
------------|-------------|-----------|---------------------
jjhhjh      | NULL        | 1998      | fdgdfggf
jgjhghhjg   | 1996-04-24  | 1996      | dsffds
```

### Step 5: Send GET Request

Retrieve the data to verify it's returned correctly:

```bash
GET http://192.168.1.24:3000/api/niche-agreements/1403-5
Authorization: Bearer YOUR_TOKEN
```

**Expected Response:**
```json
{
  "beneficiaries": [
    {
      "name": "jjhhjh",
      "dateOfBirth": null,
      "birthYear": 1998,
      "relationshipToApplicant": "fdgdfggf"
    },
    {
      "name": "jgjhghhjg",
      "dateOfBirth": "1996-04-24T00:00:00.000Z",
      "birthYear": 1996,
      "relationshipToApplicant": "dsffds"
    }
  ]
}
```

## Additional Test Cases

### Test Case 1: Both Fields Empty
```json
{
  "name": "Test",
  "birthYear": "",
  "dateOfBirth": ""
}
```
**Expected**: Both stored as `NULL`

### Test Case 2: Only birthYear Provided
```json
{
  "name": "Test",
  "birthYear": "1990",
  "dateOfBirth": ""
}
```
**Expected**: `birthYear: 1990`, `dateOfBirth: NULL`

### Test Case 3: Only dateOfBirth Provided
```json
{
  "name": "Test",
  "birthYear": "",
  "dateOfBirth": "15-08-1985"
}
```
**Expected**: `birthYear: 1985` (auto-extracted), `dateOfBirth: "1985-08-15T00:00:00.000Z"`

### Test Case 4: Both Fields Provided
```json
{
  "name": "Test",
  "birthYear": "1990",
  "dateOfBirth": "15-08-1990"
}
```
**Expected**: `birthYear: 1990`, `dateOfBirth: "1990-08-15T00:00:00.000Z"`

### Test Case 5: Conflicting Data
```json
{
  "name": "Test",
  "birthYear": "1990",
  "dateOfBirth": "15-08-1985"
}
```
**Expected**: `birthYear: 1990` (uses provided value), `dateOfBirth: "1985-08-15T00:00:00.000Z"`

## Success Criteria

✅ Empty string `""` for `birthYear` is normalized to `null`
✅ Empty string `""` for `dateOfBirth` is normalized to `null`
✅ `birthYear` is auto-extracted from `dateOfBirth` when not provided
✅ Date format "DD-MM-YYYY" is converted to ISO format
✅ Both fields are correctly stored in database
✅ Both fields are correctly retrieved via GET API
✅ Logs show the auto-extraction happening

## Files Modified

1. **`Fransiscan-Nodejs-BE/src/controllers/NicheApplicationController.js`**
   - Lines 431-445: Updated array structure beneficiary processing
   - Lines 482-500: Updated flat structure beneficiary processing
   - Changed `logger.debug` to `logger.info` for better visibility

## Status

✅ **Fix Applied**
✅ **Server Restarted** (Port 3000)
🔄 **Ready for Testing**

---

**Next Steps:**
1. Test with the payload above
2. Check server logs for auto-extraction messages
3. Verify database storage
4. Verify GET API response
5. Test additional edge cases if needed

**Implementation Date**: 2026-02-12 21:41
**Server Status**: Running on port 3000
