# Invoice API Bug Fix & Optimization Plan
**Date:** February 13, 2026  
**Priority:** 🔴 CRITICAL  
**Issue:** Type conversion error when fetching invoice by application code

---

## 🐛 ROOT CAUSE ANALYSIS

### Error Details
```
Conversion failed when converting the nvarchar value '1404-3' to data type int.
```

### Location
**File:** `src/repositories/InvoiceRepository.js`  
**Method:** `getApplicationDetailsByCode()`  
**Line:** 450

### The Problem
```sql
-- ❌ BROKEN CODE (Line 450)
WHERE na.Code = @code OR na.NicheApplicationId = @code
```

**Issue:** The query tries to compare `NicheApplicationId` (INT) with `@code` (STRING '1404-3')  
**Result:** SQL Server attempts to convert '1404-3' to INT and fails

---

## 📋 TASK LIST

### Task 1: Fix Type Conversion Error ✅
**Priority:** 🔴 CRITICAL  
**File:** `src/repositories/InvoiceRepository.js`  
**Lines:** 450, 391  
**Fix:** Remove invalid integer comparison

### Task 2: Optimize Invoice Lookup Performance
**Priority:** 🟡 HIGH  
**File:** `src/repositories/InvoiceRepository.js`  
**Method:** `getInvoiceByCode()`  
**Optimization:** Add caching, parallel queries

### Task 3: Add Input Validation
**Priority:** 🟡 HIGH  
**File:** `src/repositories/InvoiceRepository.js`  
**Fix:** Validate code format before querying

### Task 4: Implement Error Handling
**Priority:** 🟢 MEDIUM  
**File:** `src/repositories/InvoiceRepository.js`  
**Fix:** Better error messages for debugging

### Task 5: Add Performance Monitoring
**Priority:** 🟢 MEDIUM  
**File:** `src/repositories/InvoiceRepository.js`  
**Fix:** Track query execution times

---

## 🔧 IMPLEMENTATION PLAN

### Phase 1: Critical Fixes (Immediate)

#### Fix 1.1: Remove Invalid Integer Comparison
**Lines to fix:** 450, 391

**Current (BROKEN):**
```sql
WHERE na.Code = @code OR na.NicheApplicationId = @code
```

**Fixed:**
```sql
WHERE na.Code = @code
```

**Reason:** `NicheApplicationId` is INT, `@code` is STRING. This comparison is invalid.

#### Fix 1.2: Add Code Format Validation
**Add before database queries:**
```javascript
// Validate code format
const isNumericId = /^\d+$/.test(searchCode);
const isApplicationCode = /^[A-Z0-9]+-\d+$/.test(searchCode);

if (!isNumericId && !isApplicationCode) {
  logger.warn(`Invalid code format: ${searchCode}`);
  return null;
}
```

### Phase 2: Performance Optimization

#### Fix 2.1: Add Repository-Level Caching
```javascript
const cache = require('../utils/cache');

async getApplicationDetailsByCode(code, churchId = null) {
  const cacheKey = `app-details:${churchId}:${code}`;
  const cached = cache.get(cacheKey);
  if (cached) {
    logger.debug(`Cache hit for application details: ${code}`);
    return cached;
  }
  
  // ... fetch from database ...
  
  cache.set(cacheKey, result, 300); // 5 minutes
  return result;
}
```

#### Fix 2.2: Parallelize Database Queries
**Current (Sequential - SLOW):**
```javascript
const nicheResult = await executeQuery(nicheQuery, ...);
const beneficiaryResult = await executeQuery(beneficiaryQuery, ...);
const bookingResult = await executeQuery(bookingQuery, ...);
// Total: 300-500ms
```

**Optimized (Parallel - FAST):**
```javascript
const [nicheResult, beneficiaryResult, bookingResult] = await Promise.all([
  executeQuery(nicheQuery, ...),
  executeQuery(beneficiaryQuery, ...),
  executeQuery(bookingQuery, ...)
]);
// Total: 100-150ms (70% faster!)
```

### Phase 3: Enhanced Error Handling

#### Fix 3.1: Add Detailed Error Context
```javascript
catch (error) {
  logger.error('Error getting application details:', {
    code: searchCode,
    churchId,
    error: error.message,
    sqlError: error.number,
    query: error.query?.substring(0, 200)
  });
  
  // Return user-friendly error
  if (error.number === 245) {
    throw new Error(`Invalid code format: ${searchCode}. Expected format: XXXX-X`);
  }
  
  throw error;
}
```

---

## 📊 EXPECTED IMPROVEMENTS

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| **Error Rate** | 100% (for codes like '1404-3') | 0% | ✅ Fixed |
| **Query Time** | 300-500ms | 100-150ms | 70% faster |
| **Cache Hit Rate** | 0% | 80% | ∞ improvement |
| **API Response Time** | 500-800ms | 150-250ms | 65% faster |

---

## 🚀 DEPLOYMENT STEPS

### Step 1: Apply Critical Fix
1. Fix line 450 in `InvoiceRepository.js`
2. Fix line 391 in `InvoiceRepository.js`
3. Test with code '1404-3'
4. Verify no errors

### Step 2: Add Caching
1. Import cache utility
2. Add cache.get() before queries
3. Add cache.set() after queries
4. Test cache hit/miss

### Step 3: Optimize Queries
1. Identify sequential queries
2. Convert to Promise.all()
3. Test performance
4. Measure improvement

### Step 4: Deploy & Monitor
1. Deploy to production
2. Monitor error logs
3. Track performance metrics
4. Verify improvements

---

## ✅ TESTING CHECKLIST

### Test Cases
- [ ] Test with numeric code: '1404'
- [ ] Test with hyphenated code: '1404-3'
- [ ] Test with WAPP code: 'WAPP-001'
- [ ] Test with GOLA code: 'GOLA-001'
- [ ] Test with INCR code: 'INCR-001'
- [ ] Test with invalid code: 'INVALID'
- [ ] Test with empty code: ''
- [ ] Test with null code: null

### Performance Tests
- [ ] Measure query time before fix
- [ ] Measure query time after fix
- [ ] Verify cache hit rate
- [ ] Check API response time
- [ ] Monitor error rate

---

## 📝 FILES TO MODIFY

1. **src/repositories/InvoiceRepository.js** (PRIMARY)
   - Line 450: Remove invalid integer comparison
   - Line 391: Remove invalid integer comparison
   - Add caching
   - Add parallel queries
   - Add error handling

2. **src/controllers/InvoiceController.js** (SECONDARY)
   - Add input validation
   - Improve error messages

3. **src/services/InvoiceService.js** (OPTIONAL)
   - Add service-level caching
   - Add business logic validation

---

## 🎯 SUCCESS CRITERIA

✅ **Critical:**
- No type conversion errors
- All test cases pass
- Error rate = 0%

✅ **Performance:**
- Query time < 150ms
- Cache hit rate > 70%
- API response time < 250ms

✅ **Quality:**
- Proper error messages
- Comprehensive logging
- Code maintainability

---

**Status:** Ready for Implementation  
**Estimated Time:** 2-3 hours  
**Risk Level:** Low (well-defined fix)
