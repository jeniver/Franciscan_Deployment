# Niche Application Test Scenarios

This document outlines comprehensive test scenarios for the Niche Application system, focusing on recent fast-fixes and enhancements.

## 1. Niche Application Creation

### Scenario 1.1: Create Standard Application
**Steps:**
1. Navigate to "New Application".
2. Select a Niche interactively.
3. Fill in Applicant Details (Name, NRIC, Phone, Address).
4. Fill in Nominee Details (Name, NRIC, Phone).
5. Add 1 Beneficiary.
6. Submit Application.
**Expected Result:**
- Application created successfully.
- Status is "Booked" (or "Draft" depending on workflow).
- Emails (Invoice & Confirmation) sent to Applicant.

### Scenario 1.2: Create Application with Two Nominees
**Steps:**
1. Follow steps in 1.1.
2. In Nominee Details, fill in "Name for Nominee 2", "NRIC for Nominee 2".
3. Submit.
**Expected Result:**
- Application created with BOTH nominees.
- Verify in "View Application" that Nominee 2 details are present.

### Scenario 1.3: Create Application with Duplicate Person Roles
**Steps:**
1. Use "John Doe" (same NRIC) as Applicant.
2. Use "John Doe" (same NRIC) as Nominee 1.
3. Use "John Doe" (same NRIC) as Beneficiary 1.
**Expected Result:**
- Application created successfully.
- System allows valid consolidation of person records (or separate records depending on backend logic), but NO validation error blocking submission.

## 2. Niche Application Updates

### Scenario 2.1: Update Contact Person (Applicant) Details
**Steps:**
1. Open an existing application in "Edit" mode.
2. Change Applicant's "Home Phone" to a different number.
3. Change Applicant's "Address Line 1".
4. Click "Update Application".
**Expected Result:**
- Application updates successfully.
- Reload application/view details: New Home Phone and Address are visible.

### Scenario 2.2: Clear Contact Person Fields (Fix Verification)
**Steps:**
1. Open an existing application with a "Home Phone" set.
2. **Clear** the "Home Phone" field (make it empty).
3. Click "Update Application".
**Expected Result:**
- Application updates successfully.
- Reload application: "Home Phone" is empty/blank. (Previously, this would revert to the old value due to backend logic).

### Scenario 2.3: Update Nominee Details
**Steps:**
1. Open application.
2. Change Nominee 1 Name and Email.
3. Click "Update Application".
**Expected Result:**
- Changes saved successfully.

### Scenario 2.4: Add Second Nominee to Existing Application
**Steps:**
1. Open application that has only 1 Nominee.
2. Fill in Nominee 2 details.
3. Click "Update Application".
**Expected Result:**
- Nominee 2 details saved.

### Scenario 2.5: Remove Second Nominee (Fix Verification)
**Steps:**
1. Open application that has 2 Nominees.
2. Clear ALL fields for Nominee 2 (Name, NRIC, etc.).
3. Click "Update Application".
**Expected Result:**
- Nominee 2 is removed from the application.
- Verify in View mode that Nominee 2 section is hidden or empty. (Previously, this would persist the old Nominee 2).

## 3. Beneficiary Management

### Scenario 3.1: Add Multiple Beneficiaries
**Steps:**
1. Edit Application.
2. Add Beneficiary 1 ("Alice").
3. Add Beneficiary 2 ("Bob").
4. Update.
**Expected Result:**
- Both beneficiaries saved.

### Scenario 3.2: Update Existing Beneficiary
**Steps:**
1. Edit Application.
2. Change Beneficiary 1's "Date of Birth" or "Relationship".
3. Update.
**Expected Result:**
- Changes saved correctly.

### Scenario 3.3: Remove Beneficiary
**Steps:**
1. Edit Application with 3 beneficiaries.
2. Remove Beneficiary 2.
3. Update.
**Expected Result:**
- Application now has 2 beneficiaries (Alice and the 3rd one).
- Order is preserved or re-indexed correctly.

### Scenario 3.4: Duplicate Beneficiaries (Fix Verification)
**Steps:**
1. Edit Application.
2. Add Beneficiary ("John Doe", NRIC: S1234567A).
3. Add **another** Beneficiary with EXACT SAME Name and NRIC ("John Doe", S1234567A).
4. Update.
**Expected Result:**
- Updates SUCCESSFULLY. (Previously, this returned "400 Bad Request").
- Both entries appear in the list.

## 4. Error Handling

### Scenario 4.1: Missing Required Fields
**Steps:**
1. Edit Application.
2. Clear "Applicant Name" (Required field).
3. Update.
**Expected Result:**
- Frontend validation error shown immediately (Toast or field highlight).
- Request NOT sent to backend.

### Scenario 4.2: Backend Validation (if any remains)
**Steps:**
1. Bypass frontend validation (if possible) or trigger a backend-only rule (e.g., invalid Niche ID).
**Expected Result:**
- Backend returns error.
- Frontend handles error gracefully (displays message from backend).
