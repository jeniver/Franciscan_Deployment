# SQL Injection Warning Fix (Completed)

## Issue
The application was throwing a `RequestError: SQL injection warning for param 'code0 '` when searching for invoices (e.g., `I-1402-11`). This was caused by a malformed parameter name generation in `InvoiceRepository.js`.

## Fix Applied
I updated `src/repositories/InvoiceRepository.js` to remove the trailing space from dynamic parameter names.

## Verification
I ran a test script which confirmed that `getInvoiceByCode` now executes correctly without throwing the warning.

The Invoice API should now work as expected.
