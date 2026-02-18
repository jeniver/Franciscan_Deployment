-- Performance Optimization SQL Script for Franciscan Application
-- This script creates indexes and optimizations for better API performance

-- 1. Indexes for Invoice table
-- Index on Code for faster lookup by invoice code
CREATE NONCLUSTERED INDEX IX_Invoice_Code 
ON Invoice (Code)
WHERE Status > 0;

-- Index on RefDocNumber for faster lookup by application code
CREATE NONCLUSTERED INDEX IX_Invoice_RefDocNumber 
ON Invoice (RefDocNumber)
WHERE Status > 0;

-- Composite index for common lookup patterns
CREATE NONCLUSTERED INDEX IX_Invoice_ChurchId_Status 
ON Invoice (ChurchId, Status)
INCLUDE (Code, RefDocNumber, TransactionDate, CustomerName, TotalAmount);

-- 2. Indexes for InvoiceDetail table
-- Index on InvoiceId for faster detail retrieval
CREATE NONCLUSTERED INDEX IX_InvoiceDetail_InvoiceId 
ON InvoiceDetail (InvoiceId);

-- Index on RefDocNumber for faster application-based lookups
CREATE NONCLUSTERED INDEX IX_InvoiceDetail_RefDocNumber 
ON InvoiceDetail (RefDocNumber)
INCLUDE (InvoiceId, ItemId, Quantity, UnitAmount);

-- 3. Indexes for Receipt table
-- Index on InvoiceId for faster receipt lookup by invoice
CREATE NONCLUSTERED INDEX IX_Receipt_InvoiceId 
ON Receipt (InvoiceId)
WHERE Status > 0;

-- Index on Code for faster receipt code lookups
CREATE NONCLUSTERED INDEX IX_Receipt_Code 
ON Receipt (Code)
WHERE Status > 0;

-- Composite index for common receipt queries
CREATE NONCLUSTERED INDEX IX_Receipt_ChurchId_Status 
ON Receipt (ChurchId, Status)
INCLUDE (Code, InvoiceId, TransactionDate, PayeeName, TotalAmount);

-- 4. Indexes for NicheApplication table
-- Index on Code for faster application lookups
CREATE NONCLUSTERED INDEX IX_NicheApplication_Code 
ON NicheApplication (Code)
WHERE Status > 0;

-- Index on ApplicantName for search functionality
CREATE NONCLUSTERED INDEX IX_NicheApplication_ApplicantName 
ON NicheApplication (ApplicantName)
INCLUDE (Code, Status, ChurchId);

-- 5. Indexes for NicheInscriptionRequest table
-- Index on Code for faster inscription lookups
CREATE NONCLUSTERED INDEX IX_NicheInscriptionRequest_Code 
ON NicheInscriptionRequest (Code)
WHERE Status > 0;

-- Index on NicheBookingId for faster joins
CREATE NONCLUSTERED INDEX IX_NicheInscriptionRequest_NicheBookingId 
ON NicheInscriptionRequest (NicheBookingId);

-- 6. Indexes for Item table
-- Index on ChurchId and ItemId for faster item lookups
CREATE NONCLUSTERED INDEX IX_Item_ChurchId_ItemId 
ON Item (ChurchId, ItemId)
INCLUDE (Name, Code, Price);

-- 7. Statistics update for better query optimization
-- Update statistics on frequently queried tables
UPDATE STATISTICS Invoice;
UPDATE STATISTICS InvoiceDetail;
UPDATE STATISTICS Receipt;
UPDATE STATISTICS NicheApplication;
UPDATE STATISTICS NicheInscriptionRequest;
UPDATE STATISTICS Item;

-- 8. Query optimization suggestions
-- Consider using query hints for complex joins
-- Example: OPTION (RECOMPILE) for dynamic queries
-- Example: WITH (NOLOCK) for read-heavy operations (already used in code)

-- 9. Memory optimization
-- Ensure SQL Server has adequate memory allocated
-- Consider enabling query store for performance monitoring
-- ALTER DATABASE [YourDatabase] SET QUERY_STORE = ON;

-- 10. Connection pooling optimization
-- The application already uses connection pooling with good configuration
-- Max pool size: 20 connections
-- Min pool size: 2 connections
-- Idle timeout: 30 seconds

PRINT 'Performance optimization indexes created successfully!';
PRINT 'Remember to monitor query performance and adjust indexes as needed.';