-- =============================================
-- Update Item Prices Script
-- Date: 2025-01-XX
-- Description: Updates all item prices according to the new price list
-- =============================================

-- IMPORTANT: This script updates prices for ALL churches
-- If you need to update prices for a specific church, add WHERE ChurchId = @churchId

BEGIN TRANSACTION;

-- Update prices by ItemId (matching the provided price list)
UPDATE Item SET Price = 3000.00 WHERE ItemId = 1 AND Name LIKE '%Level 1 Niche%';
UPDATE Item SET Price = 4000.00 WHERE ItemId = 2 AND Name LIKE '%Level 2 Niche%';
UPDATE Item SET Price = 5500.00 WHERE ItemId = 3 AND Name LIKE '%Level 3 Niche%';
UPDATE Item SET Price = 7000.00 WHERE ItemId = 4 AND Name LIKE '%Level 4 Niche%';
UPDATE Item SET Price = 7000.00 WHERE ItemId = 5 AND Name LIKE '%Level 5 Niche%';
UPDATE Item SET Price = 4000.00 WHERE ItemId = 6 AND Name LIKE '%Level 6 Niche%';
UPDATE Item SET Price = 3000.00 WHERE ItemId = 7 AND Name LIKE '%Level 7 Niche%';
UPDATE Item SET Price = 850.00 WHERE ItemId = 8 AND Name LIKE '%Booking of La Verna Room%';
UPDATE Item SET Price = 300.00 WHERE ItemId = 9 AND Name LIKE '%Gates Of Life Incription Charge%';
UPDATE Item SET Price = 150.00 WHERE ItemId = 10 AND Name LIKE '%Urn (Marble)%';
UPDATE Item SET Price = 250.00 WHERE ItemId = 10 AND Name LIKE '%Urn (Onyx)%';
UPDATE Item SET Price = 400.00 WHERE ItemId = 12 AND Name LIKE '%Niche Inscription 1st Name%';
UPDATE Item SET Price = 300.00 WHERE ItemId = 13 AND Name LIKE '%Niche Inscription 2nd Name%';
UPDATE Item SET Price = 550.00 WHERE ItemId = 14 AND Name LIKE '%Niche Inscription Both Name%';
UPDATE Item SET Price = 30.00 WHERE ItemId = 15 AND Name LIKE '%With 1 Chinese Character%';
UPDATE Item SET Price = 60.00 WHERE ItemId = 16 AND Name LIKE '%with 2 Chinese Character%';
UPDATE Item SET Price = 600.00 WHERE ItemId = 17 AND Name LIKE '%Gates Of Life Inscription Charge 2 Names%';
UPDATE Item SET Price = 0.00 WHERE ItemId = 18 AND Name LIKE '%Donation for maint of columbarium%';
UPDATE Item SET Price = 0.00 WHERE ItemId = 19 AND Name LIKE '%Others%';
UPDATE Item SET Price = 80.00 WHERE ItemId = 20 AND Name LIKE '%Re-do Photo%';
UPDATE Item SET Price = 30.00 WHERE ItemId = 21 AND Name LIKE '%Gates Of Life with 1 Chinese Character%';
UPDATE Item SET Price = 60.00 WHERE ItemId = 22 AND Name LIKE '%Gates Of Life with 2 Chinese Character%';
UPDATE Item SET Price = 350.00 WHERE ItemId = 23 AND Name LIKE '%Urn (Brass praying hands)%';
UPDATE Item SET Price = 450.00 WHERE ItemId = 24 AND Name LIKE '%Urn (Pearl)%';
UPDATE Item SET Price = 100.00 WHERE ItemId = 25 AND Name LIKE '%Urn (Baby [Marble]%';
UPDATE Item SET Price = 350.00 WHERE ItemId = 26 AND Name LIKE '%Urn (Baby Swarovski)%';
UPDATE Item SET Price = 700.00 WHERE ItemId = 27 AND Name LIKE '%Booking of Transitus Room%';
UPDATE Item SET Price = 150.00 WHERE ItemId = 28 AND Name LIKE '%Re-do plaque - 1st name%';
UPDATE Item SET Price = 200.00 WHERE ItemId = 29 AND Name LIKE '%Re-do plaque - 2 names%';
UPDATE Item SET Price = 200.00 WHERE ItemId = 30 AND Name LIKE '%Admin Fees%';
UPDATE Item SET Price = 0.00 WHERE ItemId = 31 AND Name LIKE '%Clearing fees%';
UPDATE Item SET Price = 100.00 WHERE ItemId = 32 AND Name LIKE '%Stipends for prayers%';
UPDATE Item SET Price = 20.00 WHERE ItemId = 33 AND Name LIKE '%Setting of tables%';
UPDATE Item SET Price = 20.00 WHERE ItemId = 34 AND Name LIKE '%Sealing of niche%';
UPDATE Item SET Price = 8.00 WHERE ItemId = 35 AND Name LIKE '%Rosary%';

-- Alternative: Update by Code if Code column is more reliable
-- UPDATE Item SET Price = 3000.00 WHERE Code = '01';
-- UPDATE Item SET Price = 4000.00 WHERE Code = '02';
-- UPDATE Item SET Price = 5500.00 WHERE Code = '03';
-- UPDATE Item SET Price = 7000.00 WHERE Code = '04';
-- UPDATE Item SET Price = 7000.00 WHERE Code = '05';
-- UPDATE Item SET Price = 4000.00 WHERE Code = '06';
-- UPDATE Item SET Price = 3000.00 WHERE Code = '07';
-- UPDATE Item SET Price = 850.00 WHERE Code = '08';
-- UPDATE Item SET Price = 300.00 WHERE Code = '09';
-- UPDATE Item SET Price = 150.00 WHERE Code = '10' AND Name LIKE '%Marble%';
-- UPDATE Item SET Price = 250.00 WHERE Code = '10' AND Name LIKE '%Onyx%';
-- UPDATE Item SET Price = 400.00 WHERE Code = '12';
-- UPDATE Item SET Price = 300.00 WHERE Code = '13';
-- UPDATE Item SET Price = 550.00 WHERE Code = '14';
-- UPDATE Item SET Price = 30.00 WHERE Code = '15';
-- UPDATE Item SET Price = 60.00 WHERE Code = '16';
-- UPDATE Item SET Price = 600.00 WHERE Code = '17';
-- UPDATE Item SET Price = 0.00 WHERE Code = '18';
-- UPDATE Item SET Price = 0.00 WHERE Code = '19';
-- UPDATE Item SET Price = 80.00 WHERE Code = '20';
-- UPDATE Item SET Price = 30.00 WHERE Code = '21';
-- UPDATE Item SET Price = 60.00 WHERE Code = '22';
-- UPDATE Item SET Price = 350.00 WHERE Code = '23';
-- UPDATE Item SET Price = 450.00 WHERE Code = '24';
-- UPDATE Item SET Price = 100.00 WHERE Code = '25';
-- UPDATE Item SET Price = 350.00 WHERE Code = '26';
-- UPDATE Item SET Price = 700.00 WHERE Code = '27';
-- UPDATE Item SET Price = 150.00 WHERE Code = '28';
-- UPDATE Item SET Price = 200.00 WHERE Code = '29';
-- UPDATE Item SET Price = 200.00 WHERE Code = '30';
-- UPDATE Item SET Price = 0.00 WHERE Code = '31';
-- UPDATE Item SET Price = 100.00 WHERE Code = '32';
-- UPDATE Item SET Price = 20.00 WHERE Code = '33';
-- UPDATE Item SET Price = 20.00 WHERE Code = '34';
-- UPDATE Item SET Price = 8.00 WHERE Code = '35';

-- Verify updates
SELECT ItemId, Code, Name, Price, ChurchId 
FROM Item 
WHERE ItemId BETWEEN 1 AND 35
ORDER BY ItemId;

-- If everything looks good, commit the transaction
-- COMMIT TRANSACTION;

-- If there are issues, rollback
-- ROLLBACK TRANSACTION;

