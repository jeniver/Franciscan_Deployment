# Bible Inscription Choice Implementation Roadmap

## Overview
This document outlines the step-by-step implementation plan for the Bible Inscription Choice feature in the Node.js backend, based on the ASP.NET implementation analysis.

## Current State Analysis

### ✅ What Already Exists:
1. **Database Table**: `BibleInscriptionChoice` table exists in database (from script.sql)
2. **Model Reference**: `EngraveApplication` model has `bibleInscriptionChoiceId` field
3. **Repository Reference**: `EngraveApplicationRepository` stores `BibleInscriptionChoiceId` in INSERT/UPDATE queries

### ❌ What's Missing:
1. **Model**: No `BibleInscriptionChoice` model class
2. **Repository**: No `BibleInscriptionChoiceRepository` for CRUD operations
3. **Service**: No `BibleInscriptionChoiceService` for business logic
4. **Controller**: No `BibleInscriptionChoiceController` for API endpoints
5. **Routes**: No `/api/bible-choices` route
6. **API Integration**: No way to GET Bible choices for frontend dropdown

## Implementation Phases

### Phase 1: Core Backend Infrastructure (Foundation)
**Goal**: Create the basic model, repository, service, and controller layers

#### Task 1.1: Create BibleInscriptionChoice Model
- [ ] Create `src/models/BibleInscriptionChoice.js`
- [ ] Implement constructor with all fields
- [ ] Add `fromDatabase()` static method
- [ ] Add `toJSON()` method
- [ ] Add validation methods

#### Task 1.2: Create BibleInscriptionChoiceRepository
- [ ] Create `src/repositories/BibleInscriptionChoiceRepository.js`
- [ ] Implement `getAllBibleChoices(churchId)` method
- [ ] Implement `getBibleChoiceById(choiceId, churchId)` method
- [ ] Add proper error handling and logging
- [ ] Use parameterized queries for security

#### Task 1.3: Create BibleInscriptionChoiceService
- [ ] Create `src/services/BibleInscriptionChoiceService.js`
- [ ] Implement `getAllBibleChoices(churchId)` method
- [ ] Implement `getBibleChoiceById(choiceId, churchId)` method
- [ ] Add validation and error handling
- [ ] Return standardized response format

#### Task 1.4: Create BibleInscriptionChoiceController
- [ ] Create `src/controllers/BibleInscriptionChoiceController.js`
- [ ] Implement `getAllBibleChoices` endpoint handler
- [ ] Implement `getBibleChoiceById` endpoint handler
- [ ] Add authentication middleware
- [ ] Add proper error responses

#### Task 1.5: Create Routes
- [ ] Create `src/routes/bibleChoices.js`
- [ ] Define GET `/api/bible-choices` route
- [ ] Define GET `/api/bible-choices/:choiceId` route
- [ ] Add authentication middleware
- [ ] Register routes in `src/app.js`

### Phase 2: Integration with EngraveApplication (Enhancement)
**Goal**: Ensure Bible choice data is properly saved and retrieved with inscription requests

#### Task 2.1: Update EngraveApplication Model
- [ ] Verify `bibleInscriptionChoiceId` field exists (already exists)
- [ ] Add `bibleInscriptionChoiceNo` field (string copy for reporting)
- [ ] Add `additionalInscriptionPhrase` field (max 90 chars)
- [ ] Update `toJSON()` to include Bible choice data

#### Task 2.2: Update EngraveApplicationRepository
- [ ] Verify `getByCode()` includes Bible choice fields in SELECT
- [ ] Ensure INSERT includes `BibleInscriptionChoiceId` and `BibleInscriptionChoiceNo`
- [ ] Ensure UPDATE includes Bible choice fields
- [ ] Add JOIN to `BibleInscriptionChoice` table for full data retrieval

#### Task 2.3: Update EngraveApplicationService (if exists)
- [ ] Ensure service methods handle Bible choice data
- [ ] Add validation for Bible choice when provided

### Phase 3: Testing & Validation
**Goal**: Ensure all functionality works correctly without breaking existing features

#### Task 3.1: Unit Testing
- [ ] Test BibleInscriptionChoiceRepository methods
- [ ] Test BibleInscriptionChoiceService methods
- [ ] Test BibleInscriptionChoiceController endpoints
- [ ] Test integration with EngraveApplication

#### Task 3.2: Integration Testing
- [ ] Test GET `/api/bible-choices` endpoint
- [ ] Test GET `/api/bible-choices/:choiceId` endpoint
- [ ] Test creating inscription with Bible choice
- [ ] Test updating inscription with Bible choice
- [ ] Test retrieving inscription with Bible choice data

#### Task 3.3: Regression Testing
- [ ] Verify existing inscription endpoints still work
- [ ] Verify existing engrave application endpoints still work
- [ ] Verify no breaking changes to existing API contracts

### Phase 4: Documentation & Cleanup
**Goal**: Document the implementation and ensure code quality

#### Task 4.1: Code Documentation
- [ ] Add JSDoc comments to all methods
- [ ] Document API endpoints
- [ ] Add usage examples

#### Task 4.2: API Documentation
- [ ] Document request/response formats
- [ ] Add example curl commands
- [ ] Document error codes

## Implementation Order (Sequential)

1. **Phase 1.1** → Create Model (Foundation)
2. **Phase 1.2** → Create Repository (Data Access)
3. **Phase 1.3** → Create Service (Business Logic)
4. **Phase 1.4** → Create Controller (API Layer)
5. **Phase 1.5** → Create Routes (Routing)
6. **Phase 2.1** → Update EngraveApplication Model
7. **Phase 2.2** → Update EngraveApplicationRepository
8. **Phase 3** → Testing
9. **Phase 4** → Documentation

## Risk Mitigation

### Breaking Changes Prevention:
1. **Additive Only**: All new code is additive - no modifications to existing working code
2. **Optional Fields**: Bible choice fields are nullable/optional in database
3. **Backward Compatible**: Existing API endpoints remain unchanged
4. **Incremental Testing**: Test after each phase

### Rollback Plan:
- Each phase is independent and can be rolled back
- Database changes are minimal (table already exists)
- No modifications to existing tables

## Success Criteria

✅ **Phase 1 Complete When:**
- GET `/api/bible-choices` returns list of Bible choices for church
- GET `/api/bible-choices/:choiceId` returns single Bible choice
- All endpoints require authentication
- All endpoints filter by ChurchId

✅ **Phase 2 Complete When:**
- Creating inscription with Bible choice saves correctly
- Retrieving inscription includes Bible choice data
- Updating inscription preserves Bible choice data

✅ **Phase 3 Complete When:**
- All tests pass
- No regression in existing functionality
- API responses match expected format

## Notes

- Database table `BibleInscriptionChoice` already exists - no migration needed
- Existing `EngraveApplication` code already references `BibleInscriptionChoiceId` - we're just adding the GET API
- Implementation follows existing code patterns in the project
- All queries use parameterized statements for security
- All endpoints require JWT authentication

