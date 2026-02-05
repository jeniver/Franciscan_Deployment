const BaseRepository = require('./BaseRepository');
const { executeQuery, getPool } = require('../config/database');
const logger = require('../utils/logger');
const Invoice = require('../models/Invoice');
const InvoiceDetail = require('../models/InvoiceDetail');
const sql = require('mssql');

/**
 * Invoice repository for database operations
 */
class InvoiceRepository extends BaseRepository {
  constructor() {
    super('Invoices');
  }

  getPrimaryKey() {
    return 'InvoiceId';
  }

  /**
   * Find invoices by person
   * @param {number} personId - Person ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of invoices
   * @deprecated This method uses legacy schema. PersonId column does not exist in ASP.NET Invoice table.
   */
  async findByPerson(personId, options = {}) {
    try {
      const { page = 1, limit = 10 } = options;
      const offset = (page - 1) * limit;

      // NOTE: Using correct table name "Invoice" (not "Invoices")
      // WARNING: PersonId column does not exist in ASP.NET schema
      const query = `
        SELECT * FROM Invoice 
        WHERE PersonId = @personId
        ORDER BY TransactionDate DESC
        OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY
      `;

      const result = await executeQuery(query, { personId });
      return result.recordset.map(invoice => new Invoice(invoice));
    } catch (error) {
      logger.error('Error finding invoices by person:', error);
      throw error;
    }
  }

  /**
   * Find invoices by church
   * @param {number} churchId - Church ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of invoices
   */
  async findByChurch(churchId, options = {}) {
    try {
      const { page = 1, limit = 10 } = options;
      const offset = (page - 1) * limit;

      // NOTE: Using correct table name "Invoice" (not "Invoices")
      const query = `
        SELECT * FROM Invoice 
        WHERE ChurchId = @churchId
          AND Status > 0
        ORDER BY TransactionDate DESC
        OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY
      `;

      const result = await executeQuery(query, { churchId });
      return result.recordset.map(invoice => new Invoice(invoice));
    } catch (error) {
      logger.error('Error finding invoices by church:', error);
      throw error;
    }
  }

  /**
   * Find overdue invoices
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of overdue invoices
   * @deprecated This method uses legacy schema. DueDate column does not exist in ASP.NET Invoice table.
   */
  async findOverdue(options = {}) {
    try {
      const { page = 1, limit = 10 } = options;
      const offset = (page - 1) * limit;

      // NOTE: Using correct table name "Invoice" (not "Invoices")
      // WARNING: DueDate column does not exist in ASP.NET schema
      // In ASP.NET schema: Status 0=Deleted, 1=Active, 2=Paid
      const query = `
        SELECT * FROM Invoice 
        WHERE Status = 1
        ORDER BY TransactionDate ASC
        OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY
      `;

      const result = await executeQuery(query);
      return result.recordset.map(invoice => new Invoice(invoice));
    } catch (error) {
      logger.error('Error finding overdue invoices:', error);
      throw error;
    }
  }

  /**
   * Mark invoice as paid
   * @param {number} invoiceId - Invoice ID
   * @returns {Promise<Invoice|null>} Updated invoice or null
   */
  async markAsPaid(invoiceId) {
    try {
      // NOTE: Using correct table name "Invoice" (not "Invoices")
      // In ASP.NET schema: Status 0=Deleted, 1=Active, 2=Paid
      const query = `
        UPDATE Invoice 
        SET Status = 2
        OUTPUT INSERTED.*
        WHERE InvoiceId = @invoiceId
      `;

      const result = await executeQuery(query, { invoiceId });
      return result.recordset[0] ? new Invoice(result.recordset[0]) : null;
    } catch (error) {
      logger.error('Error marking invoice as paid:', error);
      throw error;
    }
  }

  /**
   * Get last invoice code (matching ASP.NET GetLastInvoiceCode)
   * Returns the highest numeric invoice code
   * @returns {Promise<number>} Last invoice code number (0 if none found)
   */
  async getLastInvoiceCode() {
    try {
      // Try to get max numeric code first (more efficient)
      // ⚠️ CRITICAL FIX: Use UPDLOCK + HOLDLOCK to prevent race conditions
      // This ensures exclusive access while generating the next code
      // Matches document recommendation from ASP.NET analysis
      const maxQuery = `
        SELECT MAX(CAST(Code AS INT)) AS MaxCode
        FROM Invoice WITH(UPDLOCK, HOLDLOCK)
        WHERE ISNUMERIC(Code) = 1
          AND Status > 0
      `;

      const maxResult = await executeQuery(maxQuery);

      if (maxResult.recordset.length > 0 && maxResult.recordset[0].MaxCode !== null) {
        const maxCode = maxResult.recordset[0].MaxCode;
        return maxCode || 0;
      }

      // Fallback: Get last invoice by InvoiceId and parse code
      // ⚠️ CRITICAL FIX: Use UPDLOCK + HOLDLOCK to prevent race conditions
      const query = `
        SELECT TOP 1 Code
        FROM Invoice WITH(UPDLOCK, HOLDLOCK)
        WHERE Status > 0
        ORDER BY InvoiceId DESC
      `;

      const result = await executeQuery(query);

      if (result.recordset.length > 0) {
        const lastCode = result.recordset[0].Code;
        // Parse to integer
        const lastNumber = parseInt(lastCode, 10);
        return isNaN(lastNumber) ? 0 : lastNumber;
      }

      return 0;
    } catch (error) {
      logger.error('Error getting last invoice code:', error);
      // Return 0 on error to allow first invoice creation
      return 0;
    }
  }

  /**
   * Generate next invoice code (5-digit format: "00001", "00002", etc.)
   * Matching ASP.NET format: String.Format("{0:D5}", lastNumber + 1)
   * @returns {Promise<string>} Next invoice code
   */
  async generateInvoiceCode() {
    try {
      const lastNumber = await this.getLastInvoiceCode();
      const nextNumber = lastNumber + 1;
      // Format as 5-digit zero-padded string
      return String(nextNumber).padStart(5, '0');
    } catch (error) {
      logger.error('Error generating invoice code:', error);
      throw error;
    }
  }

  /**
   * Get invoice by code (supports both invoice code and niche application code)
   * @param {string} code - Invoice code OR niche application code
   * @param {number} churchId - Church ID for access control (optional)
   * @param {string} applicationCode - Optional application code type (NAPP, WAPP, INCR, GOLA) for filtering
   * @returns {Promise<Object|null>} Invoice with details, receipt info, and all fields or null
   */
  /**
   * Get application details by code (NicheApplication, Booking, Niche, Wall, Item info)
   * This is called when invoice is not found - returns application data for invoice creation
   * @param {string} code - Application code
   * @param {number} churchId - Church ID for filtering
   * @returns {Promise<Object|null>} Application details or null
   */
  async getApplicationDetailsByCode(code, churchId = null) {
    try {
      if (!code || code.trim().length === 0) {
        logger.warn('getApplicationDetailsByCode called with empty code');
        return null;
      }

      const searchCode = code.trim();
      logger.info(`Fetching application details for code: ${searchCode}, churchId: ${churchId}`);

      // Step 1: Get NicheApplication data
      let applicationQuery = `
        SELECT TOP 1
          na.NicheApplicationId,
          na.Code AS ApplicationCode,
          na.NicheId,
          na.AppliedDate,
          na.AgreementDate,
          na.Status AS ApplicationStatus,
          na.ApplicantName,
          na.ApplicantIDNo,
          na.ApplicantEmailID,
          na.ApplicantMobileNo,
          na.ApplicantHomeTelNo,
          na.ApplicantOfficeTelNo,
          na.ApplicantIsCatholic,
          na.ApplicantAddressNo,
          na.ApplicantAddressLine1,
          na.ApplicantAddressLine2,
          na.ApplicantAddressCity,
          na.ApplicantAddressState,
          na.ApplicantAddressCountry,
          na.NomineeName,
          na.NomineeIDNo,
          na.NomineeEmailID,
          na.NomineeMobileNo,
          na.NomineeHomeTelNo,
          na.NomineeOfficeTelNo,
          na.NomineeRelationship,
          na.NomineeIsCatholic,
          na.NomineeAddressNo,
          na.NomineeAddressLine1,
          na.NomineeAddressLine2,
          na.NomineeAddressCity,
          na.NomineeAddressState,
          na.NomineeAddressCountry,
          na.NomineeName2,
          na.NomineeIDNo2,
          na.Amount AS ApplicationAmount,
          na.DefaultAmount AS ApplicationDefaultAmount,
          na.ChurchId,
          na.UserId,
          na.Remarks,
          na.RefDocType
        FROM NicheApplication na WITH(NOLOCK)
        WHERE na.Code = @code
      `;

      const applicationParams = { code: searchCode };

      if (churchId) {
        applicationQuery += ' AND na.ChurchId = @churchId';
        applicationParams.churchId = churchId;
      }

      const applicationResult = await executeQuery(applicationQuery, applicationParams, { timeout: 10000 });

      if (!applicationResult.recordset || applicationResult.recordset.length === 0) {
        logger.info(`No application found for code: ${searchCode}`);
        return null;
      }

      const application = applicationResult.recordset[0];

      // Step 2: Get Niche details with Wall, Row, Chapel hierarchy and pricing
      let nicheDetails = null;
      if (application.NicheId) {
        const nicheQuery = `
          SELECT 
            n.NicheId,
            n.Code AS NicheCode,
            n.DefaultAmount AS NichePrice,
            n.AppearanceDescription,
            n.Status AS NicheStatus,
            n.ChurchId AS NicheChurchId,
            r.NicheRowlId,
            r.Code AS RowCode,
            r.NicheLevel,
            r.DefaultAmount AS RowPrice,
            w.NicheWallId,
            w.Code AS WallCode,
            w.Name AS WallName,
            c.ChapelId,
            c.Code AS ChapelCode,
            c.Name AS ChapelName,
            CASE WHEN EXISTS (
              SELECT 1 FROM NicheBooking nb WITH (NOLOCK)
              WHERE nb.NicheId = n.NicheId AND nb.BookingStatus = 1
            ) THEN 1 ELSE 0 END AS IsBooked
          FROM Niche n WITH (NOLOCK)
          INNER JOIN NicheRow r WITH (NOLOCK) ON n.NicheRowlId = r.NicheRowlId
          INNER JOIN NicheWall w WITH (NOLOCK) ON r.NicheWallId = w.NicheWallId
          INNER JOIN Chapel c WITH (NOLOCK) ON w.ChapelId = c.ChapelId
          WHERE n.NicheId = @nicheId
        `;

        const nicheResult = await executeQuery(nicheQuery, { nicheId: application.NicheId }, { timeout: 10000 });

        if (nicheResult.recordset && nicheResult.recordset.length > 0) {
          nicheDetails = nicheResult.recordset[0];
        }
      }

      // Step 3: Get matching Item based on niche level or DocType
      let item = null;
      if (nicheDetails && nicheDetails.NicheLevel && application.ChurchId) {
        // Try to get item by niche level (e.g., Level 6 -> ItemId 6)
        const levelItemQuery = `
          SELECT TOP 1
            i.ItemId,
            i.Name AS ItemName,
            i.Code AS ItemCode,
            i.Price AS ItemPrice,
            i.IsRefType,
            i.DocType,
            i.ChurchId
          FROM Item i WITH(NOLOCK)
          WHERE i.ChurchId = @churchId
            AND i.ItemId = @itemId
        `;
        const levelItemResult = await executeQuery(levelItemQuery, { 
          churchId: application.ChurchId, 
          itemId: nicheDetails.NicheLevel 
        }, { timeout: 5000 });
        
        if (levelItemResult.recordset && levelItemResult.recordset.length > 0) {
          item = levelItemResult.recordset[0];
        }
      }

      // Fallback: Get item with DocType = 'NAPP' (Niche Application)
      if (!item && application.ChurchId) {
        const itemQuery = `
          SELECT TOP 1
            i.ItemId,
            i.Name AS ItemName,
            i.Code AS ItemCode,
            i.Price AS ItemPrice,
            i.IsRefType,
            i.DocType,
            i.ChurchId
          FROM Item i WITH(NOLOCK)
          WHERE i.ChurchId = @churchId
            AND (i.DocType = 'NAPP' OR i.IsRefType = 1)
          ORDER BY i.ItemId
        `;
        const itemResult = await executeQuery(itemQuery, { churchId: application.ChurchId }, { timeout: 5000 });
        
        if (itemResult.recordset && itemResult.recordset.length > 0) {
          item = itemResult.recordset[0];
        }
      }

      // Last resort: Get any item for the church
      if (!item && application.ChurchId) {
        const fallbackItemQuery = `
          SELECT TOP 1
            i.ItemId,
            i.Name AS ItemName,
            i.Code AS ItemCode,
            i.Price AS ItemPrice,
            i.IsRefType,
            i.DocType,
            i.ChurchId
          FROM Item i WITH(NOLOCK)
          WHERE i.ChurchId = @churchId
          ORDER BY i.ItemId
        `;
        const fallbackItemResult = await executeQuery(fallbackItemQuery, { churchId: application.ChurchId }, { timeout: 5000 });
        
        if (fallbackItemResult.recordset && fallbackItemResult.recordset.length > 0) {
          item = fallbackItemResult.recordset[0];
        }
      }

      // Step 4: Get NicheBooking if exists
      let booking = null;
      const bookingQuery = `
        SELECT TOP 1
          nb.NicheBookingId,
          nb.NicheId,
          nb.NicheApplicationId,
          nb.BookedDate,
          nb.BookingStatus,
          nb.Remarks AS BookingRemarks,
          nb.ChurchId AS BookingChurchId,
          nb.UserId AS BookingUserId,
          cp.Name AS ContactPersonName,
          cp.IDNo AS ContactPersonIDNo,
          cp.MobileNo AS ContactPersonMobile,
          cp.EmailID AS ContactPersonEmail,
          nom1.Name AS NomineeName,
          nom1.IDNo AS NomineeIDNo,
          nom2.Name AS Nominee2Name,
          nom2.IDNo AS Nominee2IDNo
        FROM NicheBooking nb WITH(NOLOCK)
        LEFT JOIN Person cp WITH(NOLOCK) ON nb.ContactPersonId = cp.PersonId
        LEFT JOIN Person nom1 WITH(NOLOCK) ON nb.NomineeId = nom1.PersonId
        LEFT JOIN Person nom2 WITH(NOLOCK) ON nb.NomineeId2 = nom2.PersonId
        WHERE nb.NicheApplicationId = @nicheApplicationId
          AND nb.BookingStatus > 0
        ORDER BY nb.BookedDate DESC
      `;

      const bookingResult = await executeQuery(bookingQuery, { 
        nicheApplicationId: application.NicheApplicationId 
      }, { timeout: 10000 });

      if (bookingResult.recordset && bookingResult.recordset.length > 0) {
        booking = bookingResult.recordset[0];
      }

      // Step 5: Calculate pricing
      const nichePrice = nicheDetails?.NichePrice || nicheDetails?.RowPrice || application.ApplicationDefaultAmount || application.ApplicationAmount || 0;
      const itemPrice = item?.ItemPrice || nichePrice;

      // ✅ FIX: Step 5.5: Check for inscription items if inscription exists for this application
      let inscriptionItems = [];
      try {
        const inscriptionQuery = `
          SELECT TOP 1
            nir.Code AS InscriptionCode,
            nir.NicheBookingId
          FROM NicheInscriptionRequest nir WITH(NOLOCK)
          INNER JOIN NicheBooking nb WITH(NOLOCK) ON nir.NicheBookingId = nb.NicheBookingId
          WHERE nb.NicheApplicationId = @nicheApplicationId
          ORDER BY nir.NicheInscriptionRequestId DESC
        `;
        const inscriptionResult = await executeQuery(inscriptionQuery, { 
          nicheApplicationId: application.NicheApplicationId 
        }, { timeout: 5000 });

        if (inscriptionResult.recordset && inscriptionResult.recordset.length > 0) {
          const inscriptionCode = inscriptionResult.recordset[0].InscriptionCode;
          logger.info(`[getApplicationDetailsByCode] Found inscription for application ${application.ApplicationCode}: ${inscriptionCode}`);
          
          // Fetch inscription items using InscriptionInvoiceService
          try {
            const InscriptionInvoiceService = require('../services/InscriptionInvoiceService');
            const inscriptionData = await InscriptionInvoiceService.getInscriptionItems(inscriptionCode, application.ChurchId);
            
            if (inscriptionData && inscriptionData.items && Array.isArray(inscriptionData.items) && inscriptionData.items.length > 0) {
              // Map inscription items to invoice detail format
              inscriptionItems = inscriptionData.items.map(inscriptionItem => ({
                invoiceDetailId: null,
                invoiceId: null,
                itemId: inscriptionItem.ItemId || null,
                itemName: inscriptionItem.Name || inscriptionItem.ItemName || 'Inscription Item',
                itemCode: inscriptionItem.Code || inscriptionItem.ItemCode || null,
                itemPrice: inscriptionItem.Price || 0,
                itemDocType: inscriptionItem.DocType || 'INCR',
                itemIsRefType: inscriptionItem.IsRefType || false,
                quantity: 1,
                unitAmount: inscriptionItem.Price || 0,
                payingAmount: inscriptionItem.Price || 0,
                totalPayingAmount: inscriptionItem.Price || 0,
                refDocNumber: inscriptionCode, // Use inscription code as reference
                refDocName: 'INCR',
                refType: 'INCR',
                outstandingAmount: 0,
                lineTotalAmount: inscriptionItem.Price || 0,
                lineTaxPercent: 9, // Default 9% GST for inscription items
                lineTaxAmount: ((inscriptionItem.Price || 0) * 9) / 100
              }));
              logger.info(`[getApplicationDetailsByCode] Added ${inscriptionItems.length} inscription items to invoice details`);
            }
          } catch (inscriptionError) {
            logger.warn(`[getApplicationDetailsByCode] Failed to fetch inscription items (non-critical):`, inscriptionError.message);
            // Continue without inscription items - non-critical
          }
        }
      } catch (inscriptionQueryError) {
        logger.warn(`[getApplicationDetailsByCode] Failed to query inscription (non-critical):`, inscriptionQueryError.message);
        // Continue without inscription items - non-critical
      }

      // Build details array: niche item + inscription items
      const allDetails = [{
        invoiceDetailId: null,
        invoiceId: null,
        itemId: item?.ItemId || null,
        itemName: item?.ItemName || 'Niche',
        itemCode: item?.ItemCode || null,
        itemPrice: itemPrice,
        itemDocType: item?.DocType || null,
        itemIsRefType: item?.IsRefType || false,
        quantity: 1,
        unitAmount: itemPrice,
        payingAmount: itemPrice,
        totalPayingAmount: itemPrice,
        refDocNumber: application.ApplicationCode,
        refDocName: 'NAPP',
        refType: 'NAPP',
        outstandingAmount: 0,
        lineTotalAmount: itemPrice,
        lineTaxPercent: 0,
        lineTaxAmount: 0
      }];

      // Add inscription items to details
      if (inscriptionItems.length > 0) {
        allDetails.push(...inscriptionItems);
      }

      // Check for additional inscription items that might exist for this application
      try {
        // Query for any inscription requests directly linked to this application (without booking)
        const additionalInscriptionQuery = `
          SELECT 
            nir.Code AS InscriptionCode
          FROM NicheInscriptionRequest nir WITH(NOLOCK)
          WHERE nir.NicheApplicationCode = @appCode
          UNION
          SELECT 
            nir.Code AS InscriptionCode
          FROM NicheInscriptionRequest nir WITH(NOLOCK)
          INNER JOIN NicheBooking nb WITH(NOLOCK) ON nir.NicheBookingId = nb.NicheBookingId
          WHERE nb.NicheApplicationId = @nicheApplicationId
        `;
        
        const additionalInscriptionResult = await executeQuery(additionalInscriptionQuery, { 
          appCode: application.ApplicationCode,
          nicheApplicationId: application.NicheApplicationId
        }, { timeout: 5000 });

        if (additionalInscriptionResult.recordset && additionalInscriptionResult.recordset.length > 0) {
          for (const inscrRecord of additionalInscriptionResult.recordset) {
            const inscrCode = inscrRecord.InscriptionCode;
            
            // Skip if already added above
            if (inscriptionItems.some(item => item.refDocNumber === inscrCode)) {
              continue;
            }
            
            logger.info(`[getApplicationDetailsByCode] Found additional inscription for application ${application.ApplicationCode}: ${inscrCode}`);
            
            try {
              const InscriptionInvoiceService = require('../services/InscriptionInvoiceService');
              const inscriptionData = await InscriptionInvoiceService.getInscriptionItems(inscrCode, application.ChurchId);
              
              if (inscriptionData && inscriptionData.items && Array.isArray(inscriptionData.items) && inscriptionData.items.length > 0) {
                // Map additional inscription items to invoice detail format
                const additionalInscriptionItems = inscriptionData.items.map(inscriptionItem => ({
                  invoiceDetailId: null,
                  invoiceId: null,
                  itemId: inscriptionItem.ItemId || null,
                  itemName: inscriptionItem.Name || inscriptionItem.ItemName || 'Inscription Item',
                  itemCode: inscriptionItem.Code || inscriptionItem.ItemCode || null,
                  itemPrice: inscriptionItem.Price || 0,
                  itemDocType: inscriptionItem.DocType || 'INCR',
                  itemIsRefType: inscriptionItem.IsRefType || false,
                  quantity: 1,
                  unitAmount: inscriptionItem.Price || 0,
                  payingAmount: inscriptionItem.Price || 0,
                  totalPayingAmount: inscriptionItem.Price || 0,
                  refDocNumber: inscrCode, // Use inscription code as reference
                  refDocName: 'INCR',
                  refType: 'INCR',
                  outstandingAmount: 0,
                  lineTotalAmount: inscriptionItem.Price || 0,
                  lineTaxPercent: 9, // Default 9% GST for inscription items
                  lineTaxAmount: ((inscriptionItem.Price || 0) * 9) / 100
                }));
                
                allDetails.push(...additionalInscriptionItems);
                logger.info(`[getApplicationDetailsByCode] Added ${additionalInscriptionItems.length} additional inscription items from ${inscrCode}`);
              }
            } catch (additionalInscriptionError) {
              logger.warn(`[getApplicationDetailsByCode] Failed to fetch additional inscription items from ${inscrCode} (non-critical):`, additionalInscriptionError.message);
            }
          }
        }
      } catch (additionalInscriptionQueryError) {
        logger.warn(`[getApplicationDetailsByCode] Failed to query additional inscriptions (non-critical):`, additionalInscriptionQueryError.message);
      }

      // Calculate totals including all items
      const subtotal = allDetails.reduce((sum, d) => sum + (d.lineTotalAmount || 0), 0);
      const totalTax = allDetails.reduce((sum, d) => sum + (d.lineTaxAmount || 0), 0);
      const grandTotal = subtotal + totalTax;

      // Step 6: Build comprehensive response
      const response = {
        // CRITICAL FLAGS for Frontend
        isApplicationData: true,        // This is application data, NOT an invoice
        isInvoice: false,               // Explicitly mark as not an invoice
        hasInvoice: false,              // No invoice exists for this application
        canCreateInvoice: true,         // Frontend should show "Create Invoice" button
        invoiceId: null,                // No invoice ID
        code: null,                     // No invoice code yet
        
        // Application info
        applicationCode: application.ApplicationCode,
        nicheApplicationId: application.NicheApplicationId,
        applicationStatus: application.ApplicationStatus,
        appliedDate: application.AppliedDate,
        agreementDate: application.AgreementDate,
        refDocNumber: application.ApplicationCode,
        refDocName: 'NAPP',
        
        // Customer/Applicant info
        customerName: application.ApplicantName,
        applicantIDNo: application.ApplicantIDNo,
        applicantEmail: application.ApplicantEmailID,
        applicantMobile: application.ApplicantMobileNo,
        applicantHomeTel: application.ApplicantHomeTelNo,
        applicantOfficeTel: application.ApplicantOfficeTelNo,
        applicantIsCatholic: application.ApplicantIsCatholic,
        
        // Address fields
        
        addressNo: application.ApplicantAddressNo,
        address: application.ApplicantAddressLine1,
        address2: application.ApplicantAddressLine2,
        addressCity: application.ApplicantAddressCity,
        districtCode: application.ApplicantAddressState,
        country: application.ApplicantAddressCountry,
        
        // Nominee info
        nomineeName: application.NomineeName,
        nomineeIDNo: application.NomineeIDNo,
        nomineeEmail: application.NomineeEmailID,
        nomineeMobile: application.NomineeMobileNo,
        nomineeRelationship: application.NomineeRelationship,
        nomineeName2: application.NomineeName2,
        nomineeIDNo2: application.NomineeIDNo2,
        
        // Financial info (updated to include inscription items)
        totalAmount: grandTotal,
        payingAmount: grandTotal,
        applicationAmount: application.ApplicationAmount,
        applicationDefaultAmount: application.ApplicationDefaultAmount,
        taxAmount: totalTax,
        taxPercentage: subtotal > 0 ? (totalTax / subtotal) * 100 : 0,
        taxCode: totalTax > 0 ? 'GST' : null,
        
        // System fields
        userId: application.UserId,
        churchId: application.ChurchId,
        status: application.ApplicationStatus,
        remarks: application.Remarks,
        transactionDate: application.AppliedDate || new Date(),
        
        // Niche details
        niche: nicheDetails ? {
          nicheId: nicheDetails.NicheId,
          nicheCode: nicheDetails.NicheCode,
          nichePrice: nicheDetails.NichePrice,
          nicheStatus: nicheDetails.NicheStatus,
          appearanceDescription: nicheDetails.AppearanceDescription,
          isBooked: nicheDetails.IsBooked === 1,
          
          // Row details
          rowId: nicheDetails.NicheRowlId,
          rowCode: nicheDetails.RowCode,
          nicheLevel: nicheDetails.NicheLevel,
          rowPrice: nicheDetails.RowPrice,
          
          // Wall details
          wallId: nicheDetails.NicheWallId,
          wallCode: nicheDetails.WallCode,
          wallName: nicheDetails.WallName,
          
          // Chapel details
          chapelId: nicheDetails.ChapelId,
          chapelCode: nicheDetails.ChapelCode,
          chapelName: nicheDetails.ChapelName
        } : null,
        
        // Booking details
        booking: booking ? {
          nicheBookingId: booking.NicheBookingId,
          nicheId: booking.NicheId,
          nicheApplicationId: booking.NicheApplicationId,
          bookedDate: booking.BookedDate,
          bookingStatus: booking.BookingStatus,
          bookingRemarks: booking.BookingRemarks,
          bookingChurchId: booking.BookingChurchId,
          bookingUserId: booking.BookingUserId,
          contactPersonName: booking.ContactPersonName,
          contactPersonIDNo: booking.ContactPersonIDNo,
          contactPersonMobile: booking.ContactPersonMobile,
          contactPersonEmail: booking.ContactPersonEmail,
          nomineeName: booking.NomineeName,
          nomineeIDNo: booking.NomineeIDNo,
          nominee2Name: booking.Nominee2Name,
          nominee2IDNo: booking.Nominee2IDNo
        } : null,
        
        // Invoice details: niche item + inscription items
        details: allDetails,
        
        // Summary (updated to include inscription items)
        summary: {
          totalItems: allDetails.length,
          subtotal: subtotal,
          totalTax: totalTax,
          grandTotal: grandTotal
        }
      };

   

      logger.info(`Application details retrieved: ApplicationCode=${response.applicationCode}, NicheCode=${nicheDetails?.NicheCode || 'N/A'}, Price=${nichePrice}, ItemName=${item?.ItemName || 'N/A'}`);

      return response;
    } catch (error) {
      logger.error('Error getting application details by code:', error);
      throw error;
    }
  }

  async getInvoiceByCode(code, churchId = null, applicationCode = null) {
    try {
      if (!code || code.trim().length === 0) {
        logger.warn('getInvoiceByCode called with empty code');
        return null;
      }

      const searchCode = code.trim();
      const normalizedSearchCode = searchCode;
      const normalizedSearchCodeUpper = normalizedSearchCode.toUpperCase();
      const looksLikeRefDoc = /^\\d+-0$/.test(normalizedSearchCodeUpper)
        || normalizedSearchCodeUpper.startsWith('NAPP-')
        || normalizedSearchCodeUpper.startsWith('WAPP-')
        || normalizedSearchCodeUpper.startsWith('INCR-')
        || normalizedSearchCodeUpper.startsWith('GOLA-')
        || normalizedSearchCodeUpper.startsWith('I-');
      logger.info(`Looking up invoice: code=${searchCode}, churchId=${churchId}, applicationCode=${applicationCode}`);

      // Build a set of candidate code values to handle different user inputs
      // (e.g. numeric \"63059\" vs stored as \"063059\" or \"00063059\").
      const codeCandidates = new Set();
      codeCandidates.add(searchCode);
      if (/^\\d+$/.test(searchCode)) {
        const numeric = parseInt(searchCode, 10);
        if (!Number.isNaN(numeric)) {
          const base = String(numeric);
          codeCandidates.add(base);
          if (base.length < 5) {
            codeCandidates.add(base.padStart(5, '0'));
          }
          if (base.length < 6) {
            codeCandidates.add(base.padStart(6, '0'));
          }
        }
      }

      const candidateList = Array.from(codeCandidates);
      const codeConditions = candidateList
        .map((_, idx) => `i.Code = @code${idx}`)
        .join(' OR ');

      const findByInvoiceCode = async () => {
        let query = `
          SELECT TOP 1
            i.*
          FROM Invoice i WITH(NOLOCK)
          WHERE (${codeConditions})
            AND i.Status > 0
        `;

        const params = {};
        candidateList.forEach((val, idx) => {
          params[`code${idx}`] = val;
        });

        if (churchId) {
          query += ' AND i.ChurchId = @churchId';
          params.churchId = churchId;
        }

        return executeQuery(query, params, { timeout: 10000 });
      };

      let result = { recordset: [] };
      let invoice = null;

      // Avoid expensive Invoice table scans when the code clearly looks like a RefDocNumber
      if (!looksLikeRefDoc) {
        result = await findByInvoiceCode();
        if (result.recordset.length > 0) {
          invoice = result.recordset[0];
        }
      }

      // If not found by invoice code, try to find by niche application code (RefDocNumber)
      if (result.recordset.length === 0) {
        logger.info(`Invoice not found by code, trying niche application code: ${searchCode}`);

        // Detect RefDocName from code pattern or use provided applicationCode
        let refDocName = applicationCode ? String(applicationCode).trim().toUpperCase() : null;
        if (!refDocName) {
          if (normalizedSearchCodeUpper.startsWith('NAPP-')) {
            refDocName = 'NAPP';
          } else if (normalizedSearchCodeUpper.startsWith('WAPP-')) {
            refDocName = 'WAPP';
          } else if (normalizedSearchCodeUpper.startsWith('INCR-')) {
            refDocName = 'INCR';
          } else if (normalizedSearchCodeUpper.startsWith('GOLA-')) {
            refDocName = 'GOLA';
          }
        }

        // 1) Detail-first search
        let appCodeQuery = `
          SELECT TOP 1
            i.*
          FROM InvoiceDetail id WITH(NOLOCK)
          INNER JOIN Invoice i WITH(NOLOCK) ON id.InvoiceId = i.InvoiceId
          WHERE (
            id.RefDocNumber = @code
            OR id.RefDocNumber = @codeUpper
          )
          AND i.Status > 0
        `;

        const appParams = {
          code: normalizedSearchCode,
          codeUpper: normalizedSearchCodeUpper
        };

        if (refDocName) {
          appCodeQuery += ` AND (
            id.RefDocName = @refDocName
            OR i.RefDocName = @refDocName
          )`;
          appParams.refDocName = refDocName.trim();
        }

        if (churchId) {
          appCodeQuery += ' AND i.ChurchId = @churchId';
          appParams.churchId = churchId;
        }

        appCodeQuery += ' ORDER BY i.TransactionDate DESC, i.InvoiceId DESC';

        let appResult = await executeQuery(appCodeQuery, appParams, { timeout: 10000 });

        if (appResult.recordset.length > 0) {
          invoice = appResult.recordset[0];
          logger.info(`Invoice found by niche application code: ${searchCode}${refDocName ? ` (RefDocName: ${refDocName})` : ''}, InvoiceId: ${invoice.InvoiceId}`);
        } else {
          // 2) Header-only search as fallback
          let appHeaderQuery = `
            SELECT TOP 1
              i.*
            FROM Invoice i WITH(NOLOCK)
            WHERE (
              i.RefDocNumber = @code
              OR i.RefDocNumber = @codeUpper
            )
            AND i.Status > 0
          `;

          const appHeaderParams = {
            code: normalizedSearchCode,
            codeUpper: normalizedSearchCodeUpper
          };

          if (refDocName) {
            appHeaderQuery += ' AND i.RefDocName = @refDocName';
            appHeaderParams.refDocName = refDocName.trim();
          }

          if (churchId) {
            appHeaderQuery += ' AND i.ChurchId = @churchId';
            appHeaderParams.churchId = churchId;
          }

          appHeaderQuery += ' ORDER BY i.TransactionDate DESC, i.InvoiceId DESC';

          appResult = await executeQuery(appHeaderQuery, appHeaderParams, { timeout: 10000 });

          if (appResult.recordset.length > 0) {
            invoice = appResult.recordset[0];
            logger.info(`Invoice found by header RefDocNumber: ${searchCode}${refDocName ? ` (RefDocName: ${refDocName})` : ''}, InvoiceId: ${invoice.InvoiceId}`);
          } else if (refDocName) {
            // 3) Last-resort fallback without RefDocName filter
            logger.warn(`Invoice not found with RefDocName filter, trying without filter: ${searchCode}, RefDocName: ${refDocName}`);

            const fallbackParams = {
              code: normalizedSearchCode,
              codeUpper: normalizedSearchCodeUpper,
              codePrefix: normalizedSearchCodeUpper.startsWith('I-')
                ? normalizedSearchCodeUpper
                : `I-${normalizedSearchCodeUpper}`
            };

            let fallbackHeaderQuery = `
              SELECT TOP 1
                i.*
              FROM Invoice i WITH(NOLOCK)
              WHERE (
                i.RefDocNumber = @code
                OR i.RefDocNumber = @codeUpper
              )
              AND i.Status > 0
            `;

            if (churchId) {
              fallbackHeaderQuery += ' AND i.ChurchId = @churchId';
              fallbackParams.churchId = churchId;
            }

            fallbackHeaderQuery += ' ORDER BY i.TransactionDate DESC, i.InvoiceId DESC';

            const fallbackHeaderResult = await executeQuery(fallbackHeaderQuery, fallbackParams, { timeout: 10000 });

            if (fallbackHeaderResult.recordset.length > 0) {
              invoice = fallbackHeaderResult.recordset[0];
              logger.warn(`Invoice found without RefDocName filter (header): ${searchCode}, InvoiceId: ${invoice.InvoiceId}`);
            } else {
              let fallbackDetailQuery = `
                SELECT TOP 1
                  i.*
                FROM InvoiceDetail id WITH(NOLOCK)
                INNER JOIN Invoice i WITH(NOLOCK) ON id.InvoiceId = i.InvoiceId
                WHERE (
                  id.RefDocNumber = @code
                  OR id.RefDocNumber = @codeUpper
                  OR (id.RefDocNumber LIKE @codePrefix AND id.RefDocNumber LIKE 'I-%')
                )
                AND i.Status > 0
              `;

              if (churchId) {
                fallbackDetailQuery += ' AND i.ChurchId = @churchId';
              }

              fallbackDetailQuery += ' ORDER BY i.TransactionDate DESC, i.InvoiceId DESC';

              const fallbackDetailResult = await executeQuery(fallbackDetailQuery, fallbackParams, { timeout: 10000 });

              if (fallbackDetailResult.recordset.length > 0) {
                invoice = fallbackDetailResult.recordset[0];
                logger.warn(`Invoice found without RefDocName filter (detail): ${searchCode}, InvoiceId: ${invoice.InvoiceId}`);
              } else {
                // Diagnostic: Check if invoice exists but with different RefDocName
                let diagnosticQuery = `
                  SELECT TOP 5
                    i.InvoiceId,
                    i.Code AS InvoiceCode,
                    i.Status,
                    id.RefDocNumber,
                    id.RefDocName,
                    i.ChurchId
                  FROM Invoice i WITH(NOLOCK)
                  INNER JOIN InvoiceDetail id ON i.InvoiceId = id.InvoiceId
                  WHERE (id.RefDocNumber = @code OR id.RefDocNumber = @codeUpper)
                    AND i.Status > 0
                `;

                const diagnosticParams = {
                  code: searchCode,
                  codeUpper: searchCode.toUpperCase().trim()
                };

                if (churchId) {
                  diagnosticQuery += ' AND i.ChurchId = @churchId';
                  diagnosticParams.churchId = churchId;
                }

                try {
                  const diagnosticResult = await executeQuery(diagnosticQuery, diagnosticParams, { timeout: 5000 });
                  if (diagnosticResult.recordset.length > 0) {
                    logger.warn(`Invoice exists but RefDocName mismatch. Found:`, diagnosticResult.recordset.map(r => ({
                      invoiceId: r.InvoiceId,
                      invoiceCode: r.InvoiceCode,
                      refDocNumber: r.RefDocNumber,
                      refDocName: r.RefDocName,
                      status: r.Status,
                      churchId: r.ChurchId
                    })));
                  }
                } catch (diagError) {
                  logger.warn('Failed to run diagnostic query:', diagError);
                }
              }
            }
          }
        }
      } else {
        invoice = result.recordset[0];
      }

      // If this looked like a RefDocNumber but still not found, try invoice code search as a last fallback
      if (!invoice && looksLikeRefDoc) {
        result = await findByInvoiceCode();
        if (result.recordset.length > 0) {
          invoice = result.recordset[0];
          logger.info(`Invoice found by invoice code after RefDocNumber attempts: ${searchCode}, InvoiceId: ${invoice.InvoiceId}`);
        }
      }

      if (!invoice) {
        // Enhanced logging for debugging
        logger.warn(`Invoice not found for code: ${searchCode}`, {
          churchId,
          applicationCode,
          searchedByRefDocNumber: looksLikeRefDoc || result.recordset.length === 0
        });
        
        // FEATURE: Fetch application details if invoice doesn't exist
        logger.info(`Attempting to fetch application details for code: ${searchCode}`);
        
        try {
          const applicationDetails = await this.getApplicationDetailsByCode(searchCode, churchId);
          
          if (applicationDetails) {
            logger.info(`Application found for code: ${searchCode}, returning application details`);
            return applicationDetails;
          }
        } catch (appError) {
          logger.warn('Failed to fetch application details:', appError);
          }
          
        // FEATURE: Check if there's an existing invoice for this application code with additional items
        logger.info(`Attempting to find invoice by application code with expanded search: ${searchCode}`);
        
        try {
          // Look for invoices that might exist for this application code
          const invoiceQuery = `
            SELECT TOP 1
              i.*
            FROM Invoice i WITH(NOLOCK)
            WHERE (
              i.RefDocNumber = @code
              OR i.Code = @code
            )
            AND i.Status > 0
          `;
          
          const invoiceParams = {
            code: searchCode
          };
          
          if (churchId) {
            invoiceQuery += ' AND i.ChurchId = @churchId';
            invoiceParams.churchId = churchId;
          }
          
          const invoiceResult = await executeQuery(invoiceQuery, invoiceParams, { timeout: 10000 });
          
          if (invoiceResult.recordset && invoiceResult.recordset.length > 0) {
            invoice = invoiceResult.recordset[0];
            
            // Get invoice details
            const detailsQuery = `
              SELECT *
              FROM InvoiceDetail id WITH(NOLOCK)
              WHERE id.InvoiceId = @invoiceId
              ORDER BY id.InvoiceDetailId
            `;
            
            const detailsResult = await executeQuery(detailsQuery, { invoiceId: invoice.InvoiceId }, { timeout: 10000 });
            
            // Add details to invoice
            invoice.Details = detailsResult.recordset || [];
            
            // Check for inscription items that might be related to this application
            try {
              const inscriptionQuery = `
                SELECT TOP 1
                  nir.Code AS InscriptionCode,
                  nir.NicheBookingId
                FROM NicheInscriptionRequest nir WITH(NOLOCK)
                INNER JOIN NicheBooking nb WITH(NOLOCK) ON nir.NicheBookingId = nb.NicheBookingId
                INNER JOIN NicheApplication na WITH(NOLOCK) ON nb.NicheApplicationId = na.NicheApplicationId
                WHERE na.Code = @appCode
                ORDER BY nir.NicheInscriptionRequestId DESC
              `;
              
              const inscriptionResult = await executeQuery(inscriptionQuery, { appCode: searchCode }, { timeout: 10000 });
              
              if (inscriptionResult.recordset && inscriptionResult.recordset.length > 0) {
                const inscriptionCode = inscriptionResult.recordset[0].InscriptionCode;
                logger.info(`Found inscription for application ${searchCode}: ${inscriptionCode}`);
                
                // Fetch inscription items to potentially add to invoice
                try {
                  const InscriptionInvoiceService = require('../services/InscriptionInvoiceService');
                  const inscriptionData = await InscriptionInvoiceService.getInscriptionItems(inscriptionCode, churchId);
                  
                  if (inscriptionData && inscriptionData.items && Array.isArray(inscriptionData.items) && inscriptionData.items.length > 0) {
                    // Add inscription items to the invoice details if they're not already present
                    const existingDetailRefNumbers = new Set(invoice.Details.map(d => d.RefDocNumber));
                    
                    for (const inscriptionItem of inscriptionData.items) {
                      if (!existingDetailRefNumbers.has(inscriptionCode)) {
                        // Add inscription item to details
                        invoice.Details.push({
                          InvoiceDetailId: null,
                          InvoiceId: invoice.InvoiceId,
                          ItemId: inscriptionItem.ItemId || null,
                          ItemName: inscriptionItem.Name || inscriptionItem.ItemName || 'Inscription Item',
                          ItemCode: inscriptionItem.Code || inscriptionItem.ItemCode || null,
                          Quantity: 1,
                          UnitAmount: inscriptionItem.Price || 0,
                          PayingAmount: inscriptionItem.Price || 0,
                          TotalPayingAmount: inscriptionItem.Price || 0,
                          RefDocNumber: inscriptionCode,
                          RefDocName: 'INCR',
                          RefType: 'INCR',
                          OutstandingAmount: 0,
                          LineTotalAmount: inscriptionItem.Price || 0,
                          LineTaxPercent: 9,
                          LineTaxAmount: ((inscriptionItem.Price || 0) * 9) / 100
                        });
                      }
                    }
                    
                    // Also check for any other inscriptions linked to this application
                    try {
                      const additionalInscriptionQuery = `
                        SELECT 
                          nir.Code AS InscriptionCode
                        FROM NicheInscriptionRequest nir WITH(NOLOCK)
                        WHERE nir.NicheApplicationCode = @appCode
                        UNION
                        SELECT 
                          nir.Code AS InscriptionCode
                        FROM NicheInscriptionRequest nir WITH(NOLOCK)
                        INNER JOIN NicheBooking nb WITH(NOLOCK) ON nir.NicheBookingId = nb.NicheBookingId
                        INNER JOIN NicheApplication na WITH(NOLOCK) ON nb.NicheApplicationId = na.NicheApplicationId
                        WHERE na.Code = @appCode
                      `;
                      
                      const additionalInscriptionResult = await executeQuery(additionalInscriptionQuery, { appCode: searchCode }, { timeout: 10000 });
                      
                      if (additionalInscriptionResult.recordset && additionalInscriptionResult.recordset.length > 0) {
                        for (const inscrRecord of additionalInscriptionResult.recordset) {
                          const additionalInscrCode = inscrRecord.InscriptionCode;
                          
                          // Skip if already added
                          if (existingDetailRefNumbers.has(additionalInscrCode)) {
                            continue;
                          }
                          
                          logger.info(`Found additional inscription for application ${searchCode}: ${additionalInscrCode}`);
                          
                          try {
                            const InscriptionInvoiceService = require('../services/InscriptionInvoiceService');
                            const additionalInscriptionData = await InscriptionInvoiceService.getInscriptionItems(additionalInscrCode, churchId);
                            
                            if (additionalInscriptionData && additionalInscriptionData.items && Array.isArray(additionalInscriptionData.items) && additionalInscriptionData.items.length > 0) {
                              for (const additionalItem of additionalInscriptionData.items) {
                                invoice.Details.push({
                                  InvoiceDetailId: null,
                                  InvoiceId: invoice.InvoiceId,
                                  ItemId: additionalItem.ItemId || null,
                                  ItemName: additionalItem.Name || additionalItem.ItemName || 'Inscription Item',
                                  ItemCode: additionalItem.Code || additionalItem.ItemCode || null,
                                  Quantity: 1,
                                  UnitAmount: additionalItem.Price || 0,
                                  PayingAmount: additionalItem.Price || 0,
                                  TotalPayingAmount: additionalItem.Price || 0,
                                  RefDocNumber: additionalInscrCode,
                                  RefDocName: 'INCR',
                                  RefType: 'INCR',
                                  OutstandingAmount: 0,
                                  LineTotalAmount: additionalItem.Price || 0,
                                  LineTaxPercent: 9,
                                  LineTaxAmount: ((additionalItem.Price || 0) * 9) / 100
                                });
                              }
                              logger.info(`Added ${additionalInscriptionData.items.length} items from additional inscription ${additionalInscrCode}`);
                            }
                          } catch (additionalInscriptionError) {
                            logger.warn(`Failed to fetch additional inscription items for ${additionalInscrCode}:`, additionalInscriptionError.message);
                          }
                        }
                      }
                    } catch (additionalInscriptionLookupError) {
                      logger.warn('Failed to look up additional inscriptions for application:', additionalInscriptionLookupError.message);
                    }
                  }
                } catch (inscriptionError) {
                  logger.warn(`Failed to fetch inscription items for ${inscriptionCode}:`, inscriptionError.message);
                }
              }
            } catch (inscriptionLookupError) {
              logger.warn('Failed to look up inscription for application:', inscriptionLookupError.message);
            }
            
            logger.info(`Returning existing invoice for application code: ${searchCode}, InvoiceId: ${invoice.InvoiceId}`);
            
            // Format the invoice to match expected response structure
            return {
              isApplicationData: false,
              isInvoice: true,
              hasInvoice: true,
              canCreateInvoice: false,
              invoiceId: invoice.InvoiceId,
              code: invoice.Code,
              applicationCode: searchCode,
              customerName: invoice.CustomerName,
              totalAmount: invoice.TotalAmount,
              payingAmount: invoice.PayingAmount,
              transactionDate: invoice.TransactionDate,
              refDocNumber: invoice.RefDocNumber,
              refDocName: invoice.RefDocName,
              status: invoice.Status,
              details: invoice.Details,
              churchId: invoice.ChurchId,
              userId: invoice.UserId,
              paymentMode: invoice.PaymentMode,
              paymentModeDocNo: invoice.PaymentModeDocNo,
              taxCode: invoice.TaxCode,
              taxPercentage: invoice.TaxPercentage,
              taxAmount: invoice.TaxAmount
            };
          }
        } catch (invoiceSearchError) {
          logger.warn('Failed to search for existing invoice by application code:', invoiceSearchError.message);
        }
        
        // Comprehensive diagnostic: Check multiple scenarios
        try {
          // Diagnostic 1: Check if invoice exists with this RefDocNumber (any status, any church)
          let diagnosticQuery1 = `
            SELECT TOP 10
              i.InvoiceId,
              i.Code AS InvoiceCode,
              i.Status,
              i.RefDocNumber AS InvoiceRefDocNumber,
              i.RefDocName AS InvoiceRefDocName,
              id.RefDocNumber AS DetailRefDocNumber,
              id.RefDocName AS DetailRefDocName,
              id.ItemId,
              i.ChurchId,
              i.TransactionDate,
              i.CustomerName
            FROM Invoice i WITH(NOLOCK)
            LEFT JOIN InvoiceDetail id ON i.InvoiceId = id.InvoiceId
            WHERE (
              id.RefDocNumber = @code
              OR UPPER(id.RefDocNumber) = @codeUpper
            )
            OR (
              i.RefDocNumber = @code
              OR UPPER(i.RefDocNumber) = @codeUpper
            )
            ORDER BY i.TransactionDate DESC, i.InvoiceId DESC
          `;
          
          const diagnosticParams1 = {
            code: searchCode,
            codeUpper: searchCode.toUpperCase().trim()
          };
          
          const diagnosticResult1 = await executeQuery(diagnosticQuery1, diagnosticParams1, { timeout: 5000 });
          if (diagnosticResult1.recordset && diagnosticResult1.recordset.length > 0) {
            logger.warn(`DIAGNOSTIC: Found ${diagnosticResult1.recordset.length} invoice(s) with matching RefDocNumber (any status/church):`, 
              diagnosticResult1.recordset.map(r => ({
                invoiceId: r.InvoiceId,
                invoiceCode: r.InvoiceCode,
                status: r.Status,
                statusIssue: r.Status === 0 ? 'DELETED (Status=0)' : r.Status > 0 ? 'ACTIVE' : 'UNKNOWN',
                invoiceRefDocNumber: r.InvoiceRefDocNumber,
                invoiceRefDocName: r.InvoiceRefDocName,
                detailRefDocNumber: r.DetailRefDocNumber,
                detailRefDocName: r.DetailRefDocName,
                itemId: r.ItemId,
                churchId: r.ChurchId,
                churchIdMismatch: churchId && r.ChurchId !== churchId ? `Expected ${churchId}, found ${r.ChurchId}` : churchId ? 'MATCH' : 'NO_FILTER',
                transactionDate: r.TransactionDate,
                customerName: r.CustomerName
              }))
            );
          } else {
            logger.warn(`DIAGNOSTIC: No invoices found with RefDocNumber matching "${searchCode}" (searched without any filters)`);
          }

          // Diagnostic 2: Check if any invoice exists with similar RefDocNumber (partial match)
          let diagnosticQuery2 = `
            SELECT TOP 5
              i.InvoiceId,
              i.Code AS InvoiceCode,
              i.Status,
              id.RefDocNumber AS DetailRefDocNumber,
              id.RefDocName AS DetailRefDocName,
              i.ChurchId,
              i.TransactionDate
            FROM Invoice i WITH(NOLOCK)
            INNER JOIN InvoiceDetail id ON i.InvoiceId = id.InvoiceId
            WHERE id.RefDocNumber LIKE @codePattern
              AND i.Status > 0
          `;
          
          const diagnosticParams2 = {
            codePattern: `%${searchCode}%`
          };
          
          if (churchId) {
            diagnosticQuery2 += ' AND i.ChurchId = @churchId';
            diagnosticParams2.churchId = churchId;
          }
          
          diagnosticQuery2 += ' ORDER BY i.TransactionDate DESC';
          
          try {
            const diagnosticResult2 = await executeQuery(diagnosticQuery2, diagnosticParams2, { timeout: 5000 });
            if (diagnosticResult2.recordset && diagnosticResult2.recordset.length > 0) {
              logger.warn(`DIAGNOSTIC: Found invoices with similar RefDocNumber (contains "${searchCode}"):`, 
                diagnosticResult2.recordset.map(r => ({
                  invoiceId: r.InvoiceId,
                  invoiceCode: r.InvoiceCode,
                  detailRefDocNumber: r.DetailRefDocNumber,
                  detailRefDocName: r.DetailRefDocName,
                  churchId: r.ChurchId
                }))
              );
            }
          } catch (diag2Error) {
            logger.warn('DIAGNOSTIC: Failed to run diagnostic query 2 (similar RefDocNumber):', diag2Error.message);
          }

          // Diagnostic 3: Check recent invoices for this church to see if invoice creation is working
          if (churchId) {
            let diagnosticQuery3 = `
              SELECT TOP 5
                i.InvoiceId,
                i.Code AS InvoiceCode,
                i.Status,
                i.RefDocNumber AS InvoiceRefDocNumber,
                i.TransactionDate,
                (SELECT TOP 1 id.RefDocNumber FROM InvoiceDetail id WHERE id.InvoiceId = i.InvoiceId ORDER BY id.InvoiceDetailId) AS FirstDetailRefDocNumber,
                (SELECT TOP 1 id.RefDocName FROM InvoiceDetail id WHERE id.InvoiceId = i.InvoiceId ORDER BY id.InvoiceDetailId) AS FirstDetailRefDocName
              FROM Invoice i WITH(NOLOCK)
              WHERE i.ChurchId = @churchId
              ORDER BY i.TransactionDate DESC, i.InvoiceId DESC
            `;
            
            const diagnosticResult3 = await executeQuery(diagnosticQuery3, { churchId }, { timeout: 5000 });
            if (diagnosticResult3.recordset && diagnosticResult3.recordset.length > 0) {
              logger.info(`DIAGNOSTIC: Recent invoices for church ${churchId}:`, 
                diagnosticResult3.recordset.map(r => ({
                  invoiceId: r.InvoiceId,
                  invoiceCode: r.InvoiceCode,
                  status: r.Status,
                  invoiceRefDocNumber: r.InvoiceRefDocNumber,
                  firstDetailRefDocNumber: r.FirstDetailRefDocNumber,
                  firstDetailRefDocName: r.FirstDetailRefDocName,
                  transactionDate: r.TransactionDate
                }))
              );
            }
          }

          // Diagnostic 4: Check if NicheApplication exists for this code
          try {
            const { executeQuery: executeQueryDiag } = require('../config/database');
            const appQuery = `
              SELECT TOP 1
                NicheApplicationId,
                Code,
                Status,
                ChurchId
              FROM NicheApplication WITH(NOLOCK)
              WHERE Code = @code
            `;
            const appResult = await executeQueryDiag(appQuery, { code: searchCode }, { timeout: 5000 });
            if (appResult.recordset && appResult.recordset.length > 0) {
              logger.info(`DIAGNOSTIC: NicheApplication found for code "${searchCode}":`, appResult.recordset[0]);
            } else {
              logger.warn(`DIAGNOSTIC: NicheApplication NOT found for code "${searchCode}"`);
            }
          } catch (appError) {
            logger.warn('DIAGNOSTIC: Failed to check NicheApplication:', appError);
          }
        } catch (diagError) {
          logger.error('Failed to run diagnostic queries:', diagError);
        }
        
        return null;
      }

      // Get invoice details with item information
      // CRITICAL: Select all InvoiceDetail fields explicitly to ensure nothing is missing
      // NOTE: RefType and OutstandingAmount are not columns in InvoiceDetail table
      const detailsQuery = `
        SELECT 
          id.InvoiceDetailId,
          id.InvoiceId,
          id.ItemId,
          id.Quantity,
          id.UnitAmount,
          id.PayingAmount,
          id.TotalPayingAmount,
          id.RefDocNumber,
          id.RefDocName,
          id.LineTotalAmount,
          id.LineTaxPercent,
          id.LineTaxAmount,
          i.Name AS ItemName,
          i.Code AS ItemCode,
          i.Price AS ItemPrice,
          i.ChurchId AS ItemChurchId
        FROM InvoiceDetail id WITH(NOLOCK)
        LEFT JOIN Item i WITH(NOLOCK) ON id.ItemId = i.ItemId
        WHERE id.InvoiceId = @invoiceId
        ORDER BY id.InvoiceDetailId
      `;

      const detailsResult = await executeQuery(detailsQuery, { invoiceId: invoice.InvoiceId }, { timeout: 10000 });
      
      logger.debug(`Retrieved ${detailsResult.recordset?.length || 0} invoice details for InvoiceId: ${invoice.InvoiceId}`);

      // Get related receipt for PayeeName and additional address info
      let receipt = null;
      const receiptQuery = `
        SELECT TOP 1
          ReceiptId,
          Code AS ReceiptCode,
          TransactionDate AS ReceiptDate,
          PayeeName,
          AddressNo AS ReceiptAddressNo,
          Address AS ReceiptAddress,
          Address2 AS ReceiptAddress2,
          AddressCity AS ReceiptAddressCity,
          DistrictCode AS ReceiptDistrictCode,
          Country AS ReceiptCountry,
          TotalAmount AS ReceiptTotalAmount,
          PayingAmount AS ReceiptPayingAmount,
          PaymentMode AS ReceiptPaymentMode,
          PaymentModeDocNo AS ReceiptPaymentModeDocNo
        FROM Receipt WITH(NOLOCK)
        WHERE InvoiceId = @invoiceId
        ORDER BY ReceiptId DESC
      `;

      const receiptResult = await executeQuery(receiptQuery, { invoiceId: invoice.InvoiceId }, { timeout: 10000 });
      if (receiptResult.recordset.length > 0) {
        receipt = receiptResult.recordset[0];
      }

      // Build comprehensive invoice response with all fields
      // CRITICAL: Normalize RefDocNumber and RefDocName for consistent response
      const normalizedInvoiceRefDocNumber = invoice.RefDocNumber ? String(invoice.RefDocNumber).trim() : null;
      const normalizedInvoiceRefDocName = invoice.RefDocName ? String(invoice.RefDocName).trim().toUpperCase() : null;
      
      // Create initial response object
      let invoiceResponse = {
        // CRITICAL FLAGS for Frontend
        isApplicationData: false,       // This is an actual invoice, NOT application data
        isInvoice: true,                // Explicitly mark as invoice
        hasInvoice: true,               // Invoice exists
        canCreateInvoice: false,        // No need to create invoice - already exists
        
        // Invoice header fields
        invoiceId: invoice.InvoiceId,
        code: invoice.Code,
        transactionDate: invoice.TransactionDate,
        refDocNumber: normalizedInvoiceRefDocNumber, // Normalized: trimmed
        refDocName: normalizedInvoiceRefDocName, // Normalized: trimmed and uppercase
        customerName: invoice.CustomerName,
        totalAmount: invoice.TotalAmount || 0,
        payingAmount: invoice.PayingAmount || 0,
        paymentMode: invoice.PaymentMode,
        paymentModeDocNo: invoice.PaymentModeDocNo,
        userId: invoice.UserId,
        churchId: invoice.ChurchId,
        status: invoice.Status,
        nicheApplicationId: invoice.NicheApplicationId,
        taxCode: invoice.TaxCode || null,
        taxPercentage: invoice.TaxPercentage || null,
        taxAmount: invoice.TaxAmount || 0,
        invType: invoice.InvType,
        
        // Address fields from Invoice table
        addressNo: invoice.AddressNo,
        address: invoice.Address,
        address2: invoice.Address2,
        addressCity: invoice.AddressCity,
        districtCode: invoice.DistrictCode,
        country: invoice.Country,
        
        // Receipt information (if exists)
        receipt: receipt ? {
          receiptId: receipt.ReceiptId,
          receiptCode: receipt.ReceiptCode,
          receiptDate: receipt.ReceiptDate,
          payeeName: receipt.PayeeName,
          receiptTotalAmount: receipt.ReceiptTotalAmount,
          receiptPayingAmount: receipt.ReceiptPayingAmount,
          receiptPaymentMode: receipt.ReceiptPaymentMode,
          receiptPaymentModeDocNo: receipt.ReceiptPaymentModeDocNo,
          // Use receipt address if invoice address is null
          receiptAddressNo: receipt.ReceiptAddressNo,
          receiptAddress: receipt.ReceiptAddress,
          receiptAddress2: receipt.ReceiptAddress2,
          receiptAddressCity: receipt.ReceiptAddressCity,
          receiptDistrictCode: receipt.ReceiptDistrictCode,
          receiptCountry: receipt.ReceiptCountry
        } : null,
        
        // PayeeName - from receipt if available, otherwise null
        payeeName: receipt ? receipt.PayeeName : null,
        
        // Invoice details with item information
        // CRITICAL: Normalize all RefDocNumber values and ensure all fields are included
        // NOTE: RefType and OutstandingAmount are not stored in InvoiceDetail table
        // They are derived/computed fields, so we set them to null/0 for backward compatibility
        details: (detailsResult.recordset || []).map(detail => {
          // Normalize RefDocNumber to handle trailing spaces
          const normalizedRefDocNumber = detail.RefDocNumber ? String(detail.RefDocNumber).trim() : null;
          const normalizedRefDocName = detail.RefDocName ? String(detail.RefDocName).trim().toUpperCase() : null;
          // RefType is not a column in InvoiceDetail - derive from RefDocName if needed
          const normalizedRefType = normalizedRefDocName || null;
          
          return {
            invoiceDetailId: detail.InvoiceDetailId,
            invoiceId: detail.InvoiceId,
            itemId: detail.ItemId,
            itemName: detail.ItemName || null,
            itemCode: detail.ItemCode || null,
            itemPrice: detail.ItemPrice || null, // Include item price for reference
            quantity: detail.Quantity || 0,
            unitAmount: detail.UnitAmount || 0,
            payingAmount: detail.PayingAmount || 0,
            totalPayingAmount: detail.TotalPayingAmount || 0,
            refDocNumber: normalizedRefDocNumber, // Normalized: trimmed
            refDocName: normalizedRefDocName, // Normalized: trimmed and uppercase
            refType: normalizedRefType, // Derived from RefDocName (not stored in DB)
            outstandingAmount: 0, // Not stored in InvoiceDetail table - always 0
            lineTotalAmount: detail.LineTotalAmount || 0,
            lineTaxPercent: detail.LineTaxPercent || 0,
            lineTaxAmount: detail.LineTaxAmount || 0
          };
        })
      };

      // If address fields are null in invoice but exist in receipt, use receipt values
      if (!invoiceResponse.addressNo && receipt && receipt.ReceiptAddressNo) {
        invoiceResponse.addressNo = receipt.ReceiptAddressNo;
      }
      if (!invoiceResponse.address && receipt && receipt.ReceiptAddress) {
        invoiceResponse.address = receipt.ReceiptAddress;
      }
      if (!invoiceResponse.address2 && receipt && receipt.ReceiptAddress2) {
        invoiceResponse.address2 = receipt.ReceiptAddress2;
      }
      if (!invoiceResponse.addressCity && receipt && receipt.ReceiptAddressCity) {
        invoiceResponse.addressCity = receipt.ReceiptAddressCity;
      }
      if (!invoiceResponse.districtCode && receipt && receipt.ReceiptDistrictCode) {
        invoiceResponse.districtCode = receipt.ReceiptDistrictCode;
      }
      if (!invoiceResponse.country && receipt && receipt.ReceiptCountry) {
        invoiceResponse.country = receipt.ReceiptCountry;
      }

      // ENHANCEMENT: If address fields are still null and this is a NAPP invoice, try to populate from application
      if (invoiceResponse.refDocName === 'NAPP' && invoiceResponse.refDocNumber) {
        if (!invoiceResponse.addressNo || !invoiceResponse.address || !invoiceResponse.address2 || 
            !invoiceResponse.addressCity || !invoiceResponse.districtCode || !invoiceResponse.country) {
          
          logger.info(`[getInvoiceByCode] Populating address fields from NAPP: ${invoiceResponse.refDocNumber}`);
          
          try {
            // Get the niche application details to populate address
            const appQuery = `
              SELECT 
                ApplicantAddressNo,
                ApplicantAddressLine1,
                ApplicantAddressLine2,
                ApplicantAddressCity,
                ApplicantAddressState,
                ApplicantAddressCountry
              FROM NicheApplication WITH(NOLOCK)
              WHERE Code = @code
            `;
            
            const appResult = await executeQuery(appQuery, { code: invoiceResponse.refDocNumber }, { timeout: 5000 });
            
            if (appResult.recordset && appResult.recordset.length > 0) {
              const app = appResult.recordset[0];
              
              // Populate address fields only if they're still null
              if (!invoiceResponse.addressNo && app.ApplicantAddressNo) {
                invoiceResponse.addressNo = app.ApplicantAddressNo;
              }
              if (!invoiceResponse.address && app.ApplicantAddressLine1) {
                invoiceResponse.address = app.ApplicantAddressLine1;
              }
              if (!invoiceResponse.address2 && app.ApplicantAddressLine2) {
                invoiceResponse.address2 = app.ApplicantAddressLine2;
              }
              if (!invoiceResponse.addressCity && app.ApplicantAddressCity) {
                invoiceResponse.addressCity = app.ApplicantAddressCity;
              }
              if (!invoiceResponse.districtCode && app.ApplicantAddressState) {
                invoiceResponse.districtCode = app.ApplicantAddressState;
              }
              if (!invoiceResponse.country && app.ApplicantAddressCountry) {
                invoiceResponse.country = app.ApplicantAddressCountry;
              }
              
              logger.info(`[getInvoiceByCode] Updated address fields from NAPP application: ${invoiceResponse.refDocNumber}`);
            }
          } catch (addressError) {
            logger.warn(`[getInvoiceByCode] Failed to populate address fields from NAPP:`, addressError.message);
          }
        }
      }

      // ENHANCEMENT: Check for inscription items if this is a niche application invoice
      if (invoiceResponse.refDocName === 'NAPP' && invoiceResponse.refDocNumber) {
        try {
          logger.info(`[getInvoiceByCode] Checking for inscription items for NAPP: ${invoiceResponse.refDocNumber}`);
          
          // Get niche application ID if not already available
          let nicheApplicationId = invoiceResponse.nicheApplicationId;
          if (!nicheApplicationId) {
            // Try to get it from the database
            const appQuery = `SELECT NicheApplicationId FROM NicheApplication WITH(NOLOCK) WHERE Code = @code`;
            const appResult = await executeQuery(appQuery, { code: invoiceResponse.refDocNumber }, { timeout: 5000 });
            if (appResult.recordset && appResult.recordset.length > 0) {
              nicheApplicationId = appResult.recordset[0].NicheApplicationId;
            }
          }
          
          if (nicheApplicationId) {
            // Check for ALL inscription items associated with this niche application (not just the first one)
            const inscriptionQuery = `
              SELECT 
                nir.Code AS InscriptionCode,
                nir.NicheBookingId
              FROM NicheInscriptionRequest nir WITH(NOLOCK)
              INNER JOIN NicheBooking nb WITH(NOLOCK) ON nir.NicheBookingId = nb.NicheBookingId
              WHERE nb.NicheApplicationId = @nicheApplicationId
              ORDER BY nir.NicheInscriptionRequestId
            `;
            const inscriptionResult = await executeQuery(inscriptionQuery, { 
              nicheApplicationId: nicheApplicationId 
            }, { timeout: 5000 });

            if (inscriptionResult.recordset && inscriptionResult.recordset.length > 0) {
              for (const inscrRecord of inscriptionResult.recordset) {
                const inscriptionCode = inscrRecord.InscriptionCode;
                logger.info(`[getInvoiceByCode] Found inscription for NAPP ${invoiceResponse.refDocNumber}: ${inscriptionCode}`);
                
                // Fetch inscription items using InscriptionInvoiceService
                try {
                  const InscriptionInvoiceService = require('../services/InscriptionInvoiceService');
                  const inscriptionData = await InscriptionInvoiceService.getInscriptionItems(inscriptionCode, invoiceResponse.churchId);
                  
                  if (inscriptionData && inscriptionData.items && Array.isArray(inscriptionData.items) && inscriptionData.items.length > 0) {
                    // Check if any of these inscription items already exist in the invoice details
                    const existingDetailRefNumbers = new Set(invoiceResponse.details.map(d => d.refDocNumber));
                    
                    // Check if inscription items for this specific inscription code are already included
                    const inscriptionItemsAlreadyExist = invoiceResponse.details.some(detail => 
                      detail.refDocNumber === inscriptionCode
                    );
                    
                    if (!inscriptionItemsAlreadyExist) {
                      // Map inscription items to invoice detail format
                      const newInscriptionItems = inscriptionData.items.map(inscriptionItem => ({
                        invoiceDetailId: null, // Will be set when saved
                        invoiceId: invoiceResponse.invoiceId, // Link to existing invoice
                        itemId: inscriptionItem.ItemId || null,
                        itemName: inscriptionItem.Name || inscriptionItem.ItemName || 'Inscription Item',
                        itemCode: inscriptionItem.Code || inscriptionItem.ItemCode || null,
                        itemPrice: inscriptionItem.Price || 0,
                        itemDocType: inscriptionItem.DocType || 'INCR',
                        itemIsRefType: inscriptionItem.IsRefType || false,
                        quantity: 1,
                        unitAmount: inscriptionItem.Price || 0,
                        payingAmount: inscriptionItem.Price || 0,
                        totalPayingAmount: inscriptionItem.Price || 0,
                        refDocNumber: inscriptionCode, // Use inscription code as reference
                        refDocName: 'INCR',
                        refType: 'INCR',
                        outstandingAmount: 0,
                        lineTotalAmount: inscriptionItem.Price || 0,
                        lineTaxPercent: 9, // Default 9% GST for inscription items
                        lineTaxAmount: ((inscriptionItem.Price || 0) * 9) / 100
                      }));
                      
                      // Add to response details
                      invoiceResponse.details = [...invoiceResponse.details, ...newInscriptionItems];
                      logger.info(`[getInvoiceByCode] Added ${newInscriptionItems.length} inscription items from ${inscriptionCode}`);
                    } else {
                      logger.info(`[getInvoiceByCode] Inscription items for ${inscriptionCode} already exist in invoice details`);
                    }
                  }
                } catch (inscriptionError) {
                  logger.warn(`[getInvoiceByCode] Failed to fetch inscription items:`, inscriptionError.message);
                  // Continue without inscription items - non-critical
                }
              }
            }
          }
          
          // Also check for additional inscription requests directly linked to this application code
          try {
            const additionalInscriptionQuery = `
              SELECT 
                nir.Code AS InscriptionCode
              FROM NicheInscriptionRequest nir WITH(NOLOCK)
              WHERE nir.NicheApplicationCode = @appCode
              UNION
              SELECT 
                nir.Code AS InscriptionCode
              FROM NicheInscriptionRequest nir WITH(NOLOCK)
              INNER JOIN NicheBooking nb WITH(NOLOCK) ON nir.NicheBookingId = nb.NicheBookingId
              INNER JOIN NicheApplication na WITH(NOLOCK) ON nb.NicheApplicationId = na.NicheApplicationId
              WHERE na.Code = @appCode
            `;
            
            const additionalInscriptionResult = await executeQuery(additionalInscriptionQuery, { 
              appCode: invoiceResponse.refDocNumber
            }, { timeout: 5000 });

            if (additionalInscriptionResult.recordset && additionalInscriptionResult.recordset.length > 0) {
              for (const inscrRecord of additionalInscriptionResult.recordset) {
                const inscrCode = inscrRecord.InscriptionCode;
                
                // Check if inscription items for this code already exist in the details
                const inscriptionItemsAlreadyExist = invoiceResponse.details.some(item => item.refDocNumber === inscrCode);
                if (inscriptionItemsAlreadyExist) {
                  logger.info(`[getInvoiceByCode] Skipping inscription ${inscrCode} - already exists in details`);
                  continue;
                }
                
                logger.info(`[getInvoiceByCode] Found additional inscription for NAPP ${invoiceResponse.refDocNumber}: ${inscrCode}`);
                
                try {
                  const InscriptionInvoiceService = require('../services/InscriptionInvoiceService');
                  const inscriptionData = await InscriptionInvoiceService.getInscriptionItems(inscrCode, invoiceResponse.churchId);
                  
                  if (inscriptionData && inscriptionData.items && Array.isArray(inscriptionData.items) && inscriptionData.items.length > 0) {
                    const additionalInscriptionItems = inscriptionData.items.map(inscriptionItem => ({
                      invoiceDetailId: null, // Will be set when saved
                      invoiceId: invoiceResponse.invoiceId, // Link to existing invoice
                      itemId: inscriptionItem.ItemId || null,
                      itemName: inscriptionItem.Name || inscriptionItem.ItemName || 'Inscription Item',
                      itemCode: inscriptionItem.Code || inscriptionItem.ItemCode || null,
                      itemPrice: inscriptionItem.Price || 0,
                      itemDocType: inscriptionItem.DocType || 'INCR',
                      itemIsRefType: inscriptionItem.IsRefType || false,
                      quantity: 1,
                      unitAmount: inscriptionItem.Price || 0,
                      payingAmount: inscriptionItem.Price || 0,
                      totalPayingAmount: inscriptionItem.Price || 0,
                      refDocNumber: inscrCode, // Use inscription code as reference
                      refDocName: 'INCR',
                      refType: 'INCR',
                      outstandingAmount: 0,
                      lineTotalAmount: inscriptionItem.Price || 0,
                      lineTaxPercent: 9, // Default 9% GST for inscription items
                      lineTaxAmount: ((inscriptionItem.Price || 0) * 9) / 100
                    }));
                    
                    // Add to response details
                    invoiceResponse.details = [...invoiceResponse.details, ...additionalInscriptionItems];
                    logger.info(`[getInvoiceByCode] Added ${additionalInscriptionItems.length} additional inscription items from ${inscrCode}`);
                  }
                } catch (additionalInscriptionError) {
                  logger.warn(`[getInvoiceByCode] Failed to fetch additional inscription items from ${inscrCode}:`, additionalInscriptionError.message);
                }
              }
            }
          } catch (additionalInscriptionQueryError) {
            logger.warn(`[getInvoiceByCode] Failed to query additional inscriptions:`, additionalInscriptionQueryError.message);
          }
        } catch (inscriptionCheckError) {
          logger.warn(`[getInvoiceByCode] Failed to check for inscription items:`, inscriptionCheckError.message);
          // Continue without inscription items - non-critical
        }
      }

      // Recalculate summary totals after adding any inscription items
      const detailsSummary = {
        totalItems: invoiceResponse.details.length,
        subtotal: invoiceResponse.details.reduce((sum, d) => sum + (d.lineTotalAmount || 0), 0),
        totalTax: invoiceResponse.details.reduce((sum, d) => sum + (d.lineTaxAmount || 0), 0),
        grandTotal: invoiceResponse.details.reduce((sum, d) => sum + (d.totalPayingAmount || 0), 0)
      };
      
      // Update the invoice response with recalculated totals
      invoiceResponse.totalAmount = detailsSummary.grandTotal;
      invoiceResponse.payingAmount = detailsSummary.grandTotal;
      
      // Add summary to response (for frontend convenience)
      invoiceResponse.summary = detailsSummary;
      
      // Log successful retrieval with summary
      logger.info(`Invoice retrieved successfully: InvoiceId=${invoiceResponse.invoiceId}, Code=${invoiceResponse.code}, RefDocNumber="${invoiceResponse.refDocNumber}", Details=${detailsSummary.totalItems} items, Total=${detailsSummary.grandTotal}`);

      return invoiceResponse;
    } catch (error) {
      logger.error('Error getting invoice by code:', error);
      throw error;
    }
  }

  /**
   * Get invoice ID by code
   * @param {string} code - Invoice code
   * @returns {Promise<number|null>} Invoice ID or null
   */
  async getInvoiceIdByCode(code) {
    try {
      const query = `
        SELECT TOP 1 InvoiceId
        FROM Invoice WITH(NOLOCK)
        WHERE Code = @code
          AND Status > 0
      `;

      const result = await executeQuery(query, { code });

      if (result.recordset.length > 0) {
        return result.recordset[0].InvoiceId;
      }

      return null;
    } catch (error) {
      logger.error('Error getting invoice ID by code:', error);
      throw error;
    }
  }

  /**
   * Soft-cancel invoice by code (set Status = 0, keep row and details)
   * Mirrors ASP.NET UpdateInvoice_Status behavior.
   * @param {string} code - Invoice code
   * @param {number|null} churchId - Optional church filter for access control
   * @returns {Promise<boolean>} True if an invoice was updated
   */
  async cancelInvoiceByCode(code, churchId = null) {
    try {
      if (!code || !code.trim()) {
        return false;
      }

      let query = `
        UPDATE Invoice
        SET Status = 0
        WHERE Code = @code
          AND Status > 0
      `;

      const params = { code: code.trim() };

      if (churchId) {
        query += ' AND ChurchId = @churchId';
        params.churchId = churchId;
      }

      const result = await executeQuery(query, params);
      // rowsAffected is an array; first element is the count for this statement
      return Array.isArray(result.rowsAffected) && result.rowsAffected[0] > 0;
    } catch (error) {
      logger.error('Error cancelling invoice by code:', error);
      throw error;
    }
  }

  /**
   * Check for duplicate invoice (matching ASP.NET GetDuplicateInvoice)
   * Checks if an invoice already exists with same customer, item, reference document, and date
   * @param {string} customerName - Customer name
   * @param {number} itemId - Item ID
   * @param {string} refDocNumber - Reference document number
   * @param {Date|string} transactionDate - Transaction date
   * @returns {Promise<Object|null>} Duplicate invoice or null
   */
  async getDuplicateInvoice(customerName, itemId, refDocNumber, transactionDate) {
    try {
      const query = `
        SELECT TOP 1 i.*
        FROM Invoice i WITH(NOLOCK)
        INNER JOIN InvoiceDetail id ON i.InvoiceId = id.InvoiceId
        WHERE i.CustomerName = @customerName
          AND id.ItemId = @itemId
          AND id.RefDocNumber = @refDocNumber
          AND CAST(i.TransactionDate AS DATE) = CAST(@transactionDate AS DATE)
          AND i.Status = 1
      `;

      const result = await executeQuery(query, {
        customerName,
        itemId,
        refDocNumber,
        transactionDate
      });

      if (result.recordset.length > 0) {
        return result.recordset[0];
      }

      return null;
    } catch (error) {
      logger.error('Error checking for duplicate invoice:', error);
      throw error;
    }
  }

  /**
   * Add invoice and details in a transaction (matching ASP.NET AddInvoiceAndDetail)
   * Saves invoice header and all detail lines atomically
   * @param {Object} invoice - Invoice data
   * @param {Array} invoiceDetails - Array of invoice detail objects
   * @returns {Promise<number>} InvoiceId
   */
  async addInvoiceAndDetail(invoice, invoiceDetails) {
    const pool = await getPool();
    const transaction = new sql.Transaction(pool);

    try {
      await transaction.begin();

      // 1. Insert Invoice
      const insertInvoiceQuery = `
        INSERT INTO Invoice (
          Code, TransactionDate, RefDocNumber, RefDocName,
          CustomerName, TotalAmount, PayingAmount,
          PaymentMode, PaymentModeDocNo, UserId, ChurchId, Status,
          TaxCode, TaxPercentage, TaxAmount, NicheApplicationId
        )
        OUTPUT INSERTED.InvoiceId
        VALUES (
          @code, @transactionDate, @refDocNumber, @refDocName,
          @customerName, @totalAmount, @payingAmount,
          @paymentMode, @paymentModeDocNo, @userId, @churchId, @status,
          @taxCode, @taxPercentage, @taxAmount, @nicheApplicationId
        )
      `;

      const invoiceRequest = new sql.Request(transaction);
      invoiceRequest.input('code', sql.NVarChar, invoice.code);
      invoiceRequest.input('transactionDate', sql.DateTime, invoice.transactionDate || new Date());
      // CRITICAL: Normalize RefDocNumber and RefDocName - trim whitespace for consistent lookup
      const normalizedRefDocNumber = invoice.refDocNumber ? String(invoice.refDocNumber).trim() : null;
      const normalizedRefDocName = invoice.refDocName ? String(invoice.refDocName).trim().toUpperCase() : null;
      
      invoiceRequest.input('refDocNumber', sql.NVarChar, normalizedRefDocNumber);
      invoiceRequest.input('refDocName', sql.NVarChar, normalizedRefDocName);
      invoiceRequest.input('customerName', sql.NVarChar, invoice.customerName);
      invoiceRequest.input('totalAmount', sql.Decimal(18, 2), invoice.totalAmount || 0);
      invoiceRequest.input('payingAmount', sql.Decimal(18, 2), invoice.payingAmount);
      invoiceRequest.input('paymentMode', sql.NVarChar, invoice.paymentMode);
      invoiceRequest.input('paymentModeDocNo', sql.NVarChar, invoice.paymentModeDocNo);
      invoiceRequest.input('userId', sql.Int, invoice.userId);
      invoiceRequest.input('churchId', sql.Int, invoice.churchId);
      invoiceRequest.input('status', sql.Int, invoice.status || 1);
      invoiceRequest.input('taxCode', sql.NVarChar, invoice.taxCode);
      invoiceRequest.input('taxPercentage', sql.Decimal(18, 2), invoice.taxPercentage);
      invoiceRequest.input('taxAmount', sql.Decimal(18, 2), invoice.taxAmount);
      invoiceRequest.input('nicheApplicationId', sql.Int, invoice.nicheApplicationId);

      const invoiceResult = await invoiceRequest.query(insertInvoiceQuery);
      const invoiceId = invoiceResult.recordset[0].InvoiceId;

      // 2. Insert Invoice Details
      // NOTE: RefType and OutstandingAmount are not columns in InvoiceDetail table
      // They are derived/computed fields, so we don't insert them
      if (invoiceDetails && invoiceDetails.length > 0) {
        for (const detail of invoiceDetails) {
          const insertDetailQuery = `
            INSERT INTO InvoiceDetail (
              InvoiceId, ItemId, Quantity, UnitAmount,
              PayingAmount, TotalPayingAmount, RefDocNumber,
              RefDocName, LineTotalAmount, LineTaxPercent, LineTaxAmount
            )
            VALUES (
              @invoiceId, @itemId, @quantity, @unitAmount,
              @payingAmount, @totalPayingAmount, @refDocNumber,
              @refDocName, @lineTotalAmount, @lineTaxPercent, @lineTaxAmount
            )
          `;

          const detailRequest = new sql.Request(transaction);
          detailRequest.input('invoiceId', sql.Int, invoiceId);
          detailRequest.input('itemId', sql.Int, detail.itemId);
          detailRequest.input('quantity', sql.Decimal(18, 2), detail.quantity);
          detailRequest.input('unitAmount', sql.Decimal(18, 2), detail.unitAmount);
          detailRequest.input('payingAmount', sql.Decimal(18, 2), detail.payingAmount);
          detailRequest.input('totalPayingAmount', sql.Decimal(18, 2), detail.totalPayingAmount);
          
          // CRITICAL: Normalize RefDocNumber - trim whitespace to ensure consistent lookup
          const refDocNumberValue = detail.refDocNumber ? String(detail.refDocNumber).trim() : null;
          const refDocNameValue = detail.refDocName ? String(detail.refDocName).trim().toUpperCase() : null;
          logger.debug(`Saving InvoiceDetail: ItemId=${detail.itemId}, RefDocNumber="${refDocNumberValue}", RefDocName="${refDocNameValue}"`);
          
          detailRequest.input('refDocNumber', sql.NVarChar, refDocNumberValue);
          detailRequest.input('refDocName', sql.NVarChar, refDocNameValue);
          // NOTE: RefType and OutstandingAmount are not stored in InvoiceDetail table
          detailRequest.input('lineTotalAmount', sql.Decimal(18, 2), detail.lineTotalAmount);
          detailRequest.input('lineTaxPercent', sql.Decimal(18, 2), detail.lineTaxPercent);
          detailRequest.input('lineTaxAmount', sql.Decimal(18, 2), detail.lineTaxAmount);

          await detailRequest.query(insertDetailQuery);
        }
      }

      await transaction.commit();
      
      // Log all RefDocNumbers in details for debugging
      const refDocNumbers = invoiceDetails?.map(d => ({
        itemId: d.itemId,
        refDocNumber: d.refDocNumber ? String(d.refDocNumber).trim() : null,
        refDocName: d.refDocName ? String(d.refDocName).trim().toUpperCase() : null
      })) || [];

      logger.info(`Invoice and details saved successfully. InvoiceId: ${invoiceId}`, {
        invoiceId,
        invoiceCode: invoice.code,
        invoiceRefDocNumber: normalizedRefDocNumber,
        refDocName: normalizedRefDocName,
        churchId: invoice.churchId,
        status: invoice.status,
        detailCount: invoiceDetails?.length || 0,
        detailRefDocNumbers: refDocNumbers,
        // Log all RefDocNumbers for verification (normalized)
        allRefDocNumbers: refDocNumbers
      });

      return invoiceId;
    } catch (error) {
      await transaction.rollback();
      logger.error('Error saving invoice and details, transaction rolled back:', error);
      throw error;
    }
  }
}

module.exports = InvoiceRepository;
