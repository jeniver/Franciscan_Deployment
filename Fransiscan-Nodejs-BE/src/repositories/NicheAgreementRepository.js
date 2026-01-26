const BaseRepository = require('./BaseRepository');
const { executeQuery } = require('../config/database');
const logger = require('../utils/logger');
const NicheAgreement = require('../models/NicheAgreement');

/**
 * Niche Agreement repository - ULTRA SIMPLIFIED VERSION
 * Gets data directly from NicheApplication table (no JOINs)
 */
class NicheAgreementRepository extends BaseRepository {
  constructor() {
    super('NicheApplication');
  }

  getPrimaryKey() {
    return 'NicheApplicationId';
  }

  /**
   * Get niche agreement details by application code
   * @param {string} applicationCode - Application code (e.g., "3795-1")
   * @returns {Promise<NicheAgreement|null>} Niche agreement or null
   */
  async getNicheAgreementDetailsCopy(applicationCode) {
    try {
      if (!applicationCode || applicationCode.trim() === '') {
        throw new Error('Application code is required');
      }

      logger.info(`Querying NicheApplication for code: ${applicationCode}`);

      // CRITICAL OPTIMIZATION: Split complex query into two simpler queries
      // This avoids expensive JOINs that can cause timeouts
      // Step 1: Get application data first (fast, indexed lookup)
      const useIndexHints = process.env.USE_INDEX_HINTS === 'true';
      const indexHint = useIndexHints ? 'WITH (NOLOCK, INDEX(IX_NicheApplication_Code))' : 'WITH (NOLOCK)';
      
      const applicationQuery = `
        SELECT TOP 1 na.*
        FROM NicheApplication na ${indexHint}
        WHERE na.Code = @applicationCode
      `;

      // Fast query with 10s timeout (should be < 1s with proper index)
      const applicationResult = await executeQuery(
        applicationQuery,
        { applicationCode },
        { timeout: 10000 }
      );

      if (applicationResult.recordset.length === 0) {
        logger.warn(`No application found for code: ${applicationCode}`);
        return null;
      }

      const na = applicationResult.recordset[0];
      
      // Step 2: Get location hierarchy separately (only if NicheId exists)
      // This query runs in parallel with other queries, so it doesn't block
      let locationData = {
        NicheCode: null,
        NicheRowlId: null,
        RowCode: null,
        NicheLevel: null,
        NicheWallId: null,
        WallCode: null,
        WallName: null,
        ChapelId: null,
        ChapelCode: null,
        ChapelName: null,
        ChapelDescription: null
      };

      if (na.NicheId) {
        try {
          const locationQuery = `
            SELECT TOP 1
              n.Code AS NicheCode,
              n.NicheRowlId,
              r.Code AS RowCode,
              r.NicheLevel,
              r.NicheWallId,
              w.Code AS WallCode,
              w.Name AS WallName,
              w.ChapelId,
              c.Code AS ChapelCode,
              c.Name AS ChapelName,
              c.Description AS ChapelDescription
            FROM Niche n WITH (NOLOCK)
            LEFT JOIN NicheRow r WITH (NOLOCK) ON n.NicheRowlId = r.NicheRowlId
            LEFT JOIN NicheWall w WITH (NOLOCK) ON r.NicheWallId = w.NicheWallId
            LEFT JOIN Chapel c WITH (NOLOCK) ON w.ChapelId = c.ChapelId
            WHERE n.NicheId = @nicheId
          `;

          const locationResult = await executeQuery(
            locationQuery,
            { nicheId: na.NicheId },
            { timeout: 10000 }
          );

          if (locationResult.recordset.length > 0) {
            locationData = locationResult.recordset[0];
          }
        } catch (locationError) {
          logger.warn(`Could not fetch location hierarchy for niche ${na.NicheId}:`, locationError.message);
          // Continue without location data - it's optional
        }
      }

      // Merge location data into application data
      const mergedData = {
        ...na,
        ...locationData
      };

      logger.info(`Found application: ${mergedData.Code} in Chapel: ${mergedData.ChapelCode || 'N/A'}, Wall: ${mergedData.WallCode || 'N/A'}`);

      // Build the niche agreement object using data from NicheApplication
      const nicheAgreement = new NicheAgreement({
        applicationCode: mergedData.Code,
        appliedDate: mergedData.AppliedDate,
        agreementDate: mergedData.AgreementDate,

        // Applicant (all data is in NicheApplication table)
        applicantName: mergedData.ApplicantName,
        applicantAddressNo: mergedData.ApplicantAddressNo,
        applicantAddressLine1: mergedData.ApplicantAddressLine1,
        applicantAddressLine2: mergedData.ApplicantAddressLine2,
        applicantAddressCity: mergedData.ApplicantAddressCity,
        applicantAddressCountry: mergedData.ApplicantAddressCountry,
        applicantAddressState: mergedData.ApplicantAddressState,
        applicantEmailID: mergedData.ApplicantEmailID,
        applicantIDNo: mergedData.ApplicantIDNo,
        applicantMobileNo: mergedData.ApplicantMobileNo,
        applicantHomeTelNo: mergedData.ApplicantHomeTelNo,
        applicantOfficeTelNo: mergedData.ApplicantOfficeTelNo,
        applicantIsCatholic: mergedData.ApplicantIsCatholic,

        // Nominee (all data is in NicheApplication table)
        nomineeName: mergedData.NomineeName,
        nomineeAddressNo: mergedData.NomineeAddressNo,
        nomineeAddressLine1: mergedData.NomineeAddressLine1,
        nomineeAddressLine2: mergedData.NomineeAddressLine2,
        nomineeAddressCity: mergedData.NomineeAddressCity,
        nomineeAddressCountry: mergedData.NomineeAddressCountry,
        nomineeAddressState: mergedData.NomineeAddressState,
        nomineeEmailID: mergedData.NomineeEmailID,
        nomineeIDNo: mergedData.NomineeIDNo,
        nomineeMobileNo: mergedData.NomineeMobileNo,
        nomineeHomeTelNo: mergedData.NomineeHomeTelNo,
        nomineeOfficeTelNo: mergedData.NomineeOfficeTelNo,
        nomineeRelationship: mergedData.NomineeRelationship,

        // Second Nominee (all data is in NicheApplication table)
        nominee2Name: mergedData.NomineeName2,
        nominee2AddressNo: mergedData.NomineeAddressNo2,
        nominee2AddressLine1: mergedData.NomineeAddressLine12,
        nominee2AddressLine2: mergedData.NomineeAddressLine22,
        nominee2AddressCity: mergedData.NomineeAddressCity2,
        nominee2AddressCountry: mergedData.NomineeAddressCountry2,
        nominee2AddressState: mergedData.NomineeAddressState2,
        nominee2EmailID: mergedData.NomineeEmailID2,
        nominee2IDNo: mergedData.NomineeIDNo2,
        nominee2MobileNo: mergedData.NomineeMobileNo2,
        nominee2HomeTelNo: mergedData.NomineeHomeTelNo2,
        nominee2OfficeTelNo: mergedData.NomineeOfficeTelNo2,
        nominee2Relationship: mergedData.NomineeRelationship2,

        // Niche details with enhanced location information
        nicheNumber: mergedData.NicheId ? mergedData.NicheId.toString() : null,
        nicheCode: mergedData.NicheCode || null,
        nicheTotalAmount: mergedData.Amount || 0,
        nicheLineAmount: mergedData.DefaultAmount || 0,

        // Niche location hierarchy (NEW)
        nicheLocation: {
          chapel: {
            chapelId: mergedData.ChapelId || null,
            chapelCode: mergedData.ChapelCode || null,
            chapelName: mergedData.ChapelName || null,
            description: mergedData.ChapelDescription || null
          },
          wall: {
            wallId: mergedData.NicheWallId || null,
            wallCode: mergedData.WallCode || null,
            wallName: mergedData.WallName || null
          },
          row: {
            rowId: mergedData.NicheRowlId || null,
            rowCode: mergedData.RowCode || null,
            level: mergedData.NicheLevel || null
          }
        },

        // Basic info
        refDocNumber: mergedData.Code
      });

      // CRITICAL OPTIMIZATION: Execute all independent queries in parallel
      // This reduces total time from sum of all queries to max of all queries
      const [beneficiariesResult, nomineeResult, deceasedResult, invoiceResult] = await Promise.allSettled([
        this.addBeneficiaries(mergedData.NicheApplicationId, nicheAgreement),
        this.addNomineeInfo(mergedData.NicheApplicationId, nicheAgreement),
        this.addDeceasedAndStorageInfo(mergedData.NicheApplicationId, nicheAgreement),
        this.addInvoiceInfo(applicationCode, nicheAgreement)
      ]);

      // Log any failures (non-critical, as these are optional data)
      if (beneficiariesResult.status === 'rejected') {
        logger.warn('Failed to fetch beneficiaries:', beneficiariesResult.reason?.message);
      }
      if (nomineeResult.status === 'rejected') {
        logger.warn('Failed to fetch nominee info:', nomineeResult.reason?.message);
      }
      if (deceasedResult.status === 'rejected') {
        logger.warn('Failed to fetch deceased info:', deceasedResult.reason?.message);
      }
      if (invoiceResult.status === 'rejected') {
        logger.warn('Failed to fetch invoice info:', invoiceResult.reason?.message);
      }

      logger.info(`Successfully retrieved agreement for: ${applicationCode}`);
      return nicheAgreement;
    } catch (error) {
      logger.error(`Error getting niche agreement for ${applicationCode}:`, error.message);
      throw error;
    }
  }

  /**
   * Add beneficiaries information (simple query)
   */
  async addBeneficiaries(nicheApplicationId, nicheAgreement) {
    try {
      const query = `
        SELECT TOP 2
          Name,
          IDNo,
          IsCatholic,
          IsMale,
          RelationshipToApplicant,
          DateOfBirth,
          BirthYear,
          RelationshipToNominee1,
          RelationshipToNominee2
        FROM NicheBooking nb WITH (NOLOCK)
        INNER JOIN NicheBookingBeneficiary nbb WITH (NOLOCK) ON nb.NicheBookingId = nbb.NicheBookingId
        WHERE nb.NicheApplicationId = @nicheApplicationId
        ORDER BY nbb.NicheBookingBeneficiaryId
      `;

      // Reduced timeout - should complete in < 2s with proper index on NicheBookingBeneficiary
      const result = await executeQuery(query, { nicheApplicationId }, { timeout: 10000 });

      if (result.recordset.length > 0) {
        const bene1 = result.recordset[0];
        nicheAgreement.beneName_1 = bene1.Name;
        nicheAgreement.beneIDNo_1 = bene1.IDNo;
        nicheAgreement.beneIsCatholic_1 = bene1.IsCatholic;
        nicheAgreement.beneIsMale_1 = bene1.IsMale;
        nicheAgreement.beneRelationshipToApplicant_1 = bene1.RelationshipToApplicant;
        nicheAgreement.beneDateOfBirth_1 = bene1.DateOfBirth;
        nicheAgreement.beneBirthYear_1 = bene1.BirthYear;
        nicheAgreement.ben1_NomineeRelationship = bene1.RelationshipToNominee1;
        nicheAgreement.ben1_Nominee2Relationship = bene1.RelationshipToNominee2;
      }

      if (result.recordset.length > 1) {
        const bene2 = result.recordset[1];
        nicheAgreement.beneName_2 = bene2.Name;
        nicheAgreement.beneIDNo_2 = bene2.IDNo;
        nicheAgreement.beneIsCatholic_2 = bene2.IsCatholic;
        nicheAgreement.beneIsMale_2 = bene2.IsMale;
        nicheAgreement.beneRelationshipToApplicant_2 = bene2.RelationshipToApplicant;
        nicheAgreement.beneDateOfBirth_2 = bene2.DateOfBirth;
        nicheAgreement.beneBirthYear_2 = bene2.BirthYear;
        nicheAgreement.ben2_NomineeRelationship = bene2.RelationshipToNominee1;
        nicheAgreement.ben2_Nominee2Relationship = bene2.RelationshipToNominee2;
      }
    } catch (error) {
      logger.warn('Could not fetch beneficiaries:', error.message);
      // Don't throw - beneficiaries are optional
    }
  }

  /**
   * Add nominee information from Person table via NicheBooking
   * This fetches the actual Person records for ContactPersonId, NomineeId, and NomineeId2
   */
  async addNomineeInfo(nicheApplicationId, nicheAgreement) {
    try {
      const query = `
        SELECT TOP 1
          nb.ContactPersonId,
          nb.NomineeId,
          nb.NomineeId2,
          -- Applicant (ContactPerson)
          prns.Name AS ApplicantName,
          prns.AddressNo AS ApplicantAddressNo,
          prns.AddressLine1 AS ApplicantAddressLine1,
          prns.AddressLine2 AS ApplicantAddressLine2,
          prns.AddressCity AS ApplicantAddressCity,
          prns.AddressState AS ApplicantAddressState,
          prns.AddressCountry AS ApplicantAddressCountry,
          prns.EmailID AS ApplicantEmailID,
          prns.IDNo AS ApplicantIDNo,
          prns.MobileNo AS ApplicantMobileNo,
          prns.HomeTelNo AS ApplicantHomeTelNo,
          prns.OfficeTelNo AS ApplicantOfficeTelNo,
          prns.IsCatholic AS ApplicantIsCatholic,
          -- Nominee 1
          prns2.Name AS NomineeName,
          prns2.AddressNo AS NomineeAddressNo,
          prns2.AddressLine1 AS NomineeAddressLine1,
          prns2.AddressLine2 AS NomineeAddressLine2,
          prns2.AddressCity AS NomineeAddressCity,
          prns2.AddressState AS NomineeAddressState,
          prns2.AddressCountry AS NomineeAddressCountry,
          prns2.EmailID AS NomineeEmailID,
          prns2.IDNo AS NomineeIDNo,
          prns2.MobileNo AS NomineeMobileNo,
          prns2.HomeTelNo AS NomineeHomeTelNo,
          prns2.OfficeTelNo AS NomineeOfficeTelNo,
          prns2.RelationshipToApplicant AS NomineeRelationship,
          -- Nominee 2
          prns3.Name AS Nominee2Name,
          prns3.AddressNo AS Nominee2AddressNo,
          prns3.AddressLine1 AS Nominee2AddressLine1,
          prns3.AddressLine2 AS Nominee2AddressLine2,
          prns3.AddressCity AS Nominee2AddressCity,
          prns3.AddressState AS Nominee2AddressState,
          prns3.AddressCountry AS Nominee2AddressCountry,
          prns3.EmailID AS Nominee2EmailID,
          prns3.IDNo AS Nominee2IDNo,
          prns3.MobileNo AS Nominee2MobileNo,
          prns3.HomeTelNo AS Nominee2HomeTelNo,
          prns3.OfficeTelNo AS Nominee2OfficeTelNo,
          prns3.RelationshipToApplicant AS Nominee2Relationship
        FROM NicheBooking nb WITH (NOLOCK)
        LEFT JOIN Person prns WITH (NOLOCK) ON nb.ContactPersonId = prns.PersonId
        LEFT JOIN Person prns2 WITH (NOLOCK) ON nb.NomineeId = prns2.PersonId
        LEFT JOIN Person prns3 WITH (NOLOCK) ON nb.NomineeId2 = prns3.PersonId
        WHERE nb.NicheApplicationId = @nicheApplicationId
      `;

      // Reduced timeout - should complete in < 2s with proper indexes on NicheBooking and Person
      const result = await executeQuery(query, { nicheApplicationId }, { timeout: 10000 });

      if (result.recordset.length > 0) {
        const row = result.recordset[0];
        
        // Update applicant info from Person table (if available)
        if (row.ApplicantName) {
          nicheAgreement.applicantName = row.ApplicantName;
          nicheAgreement.applicantAddressNo = row.ApplicantAddressNo;
          nicheAgreement.applicantAddressLine1 = row.ApplicantAddressLine1;
          nicheAgreement.applicantAddressLine2 = row.ApplicantAddressLine2;
          nicheAgreement.applicantAddressCity = row.ApplicantAddressCity;
          nicheAgreement.applicantAddressState = row.ApplicantAddressState;
          nicheAgreement.applicantAddressCountry = row.ApplicantAddressCountry;
          nicheAgreement.applicantEmailID = row.ApplicantEmailID;
          nicheAgreement.applicantIDNo = row.ApplicantIDNo;
          nicheAgreement.applicantMobileNo = row.ApplicantMobileNo;
          nicheAgreement.applicantHomeTelNo = row.ApplicantHomeTelNo;
          nicheAgreement.applicantOfficeTelNo = row.ApplicantOfficeTelNo;
          nicheAgreement.applicantIsCatholic = row.ApplicantIsCatholic;
        }

        // Update nominee 1 info from Person table (if available)
        if (row.NomineeName) {
          nicheAgreement.nomineeName = row.NomineeName;
          nicheAgreement.nomineeAddressNo = row.NomineeAddressNo;
          nicheAgreement.nomineeAddressLine1 = row.NomineeAddressLine1;
          nicheAgreement.nomineeAddressLine2 = row.NomineeAddressLine2;
          nicheAgreement.nomineeAddressCity = row.NomineeAddressCity;
          nicheAgreement.nomineeAddressState = row.NomineeAddressState;
          nicheAgreement.nomineeAddressCountry = row.NomineeAddressCountry;
          nicheAgreement.nomineeEmailID = row.NomineeEmailID;
          nicheAgreement.nomineeIDNo = row.NomineeIDNo;
          nicheAgreement.nomineeMobileNo = row.NomineeMobileNo;
          nicheAgreement.nomineeHomeTelNo = row.NomineeHomeTelNo;
          nicheAgreement.nomineeOfficeTelNo = row.NomineeOfficeTelNo;
          nicheAgreement.nomineeRelationship = row.NomineeRelationship;
        }

        // Update nominee 2 info from Person table (if available)
        if (row.Nominee2Name) {
          nicheAgreement.nominee2Name = row.Nominee2Name;
          nicheAgreement.nominee2AddressNo = row.Nominee2AddressNo;
          nicheAgreement.nominee2AddressLine1 = row.Nominee2AddressLine1;
          nicheAgreement.nominee2AddressLine2 = row.Nominee2AddressLine2;
          nicheAgreement.nominee2AddressCity = row.Nominee2AddressCity;
          nicheAgreement.nominee2AddressState = row.Nominee2AddressState;
          nicheAgreement.nominee2AddressCountry = row.Nominee2AddressCountry;
          nicheAgreement.nominee2EmailID = row.Nominee2EmailID;
          nicheAgreement.nominee2IDNo = row.Nominee2IDNo;
          nicheAgreement.nominee2MobileNo = row.Nominee2MobileNo;
          nicheAgreement.nominee2HomeTelNo = row.Nominee2HomeTelNo;
          nicheAgreement.nominee2OfficeTelNo = row.Nominee2OfficeTelNo;
          nicheAgreement.nominee2Relationship = row.Nominee2Relationship;
        }
      }
    } catch (error) {
      logger.warn('Could not fetch nominee info from Person table:', error.message);
      // Don't throw - nominee info from Person is optional, fallback to NicheApplication data
    }
  }

  /**
   * Add deceased information and storage period from NicheInscriptionRequest
   * OPTIMIZED: Combined queries to reduce round trips
   */
  async addDeceasedAndStorageInfo(nicheApplicationId, nicheAgreement) {
    try {
      // CRITICAL OPTIMIZATION: Split into two queries to avoid CTE scanning entire table
      // Step 1: Get booking and inscription info first (fast lookup)
      const bookingQuery = `
        SELECT TOP 1
          nb.NicheBookingId,
          nir.StorageFrom,
          nir.StorageTo,
          nir.NicheInscriptionRequestId
        FROM NicheBooking nb WITH (NOLOCK)
        LEFT JOIN NicheInscriptionRequest nir WITH (NOLOCK) 
          ON nb.NicheBookingId = nir.NicheBookingId
        WHERE nb.NicheApplicationId = @nicheApplicationId
        ORDER BY nir.NicheInscriptionRequestId DESC
      `;

      const bookingResult = await executeQuery(bookingQuery, { nicheApplicationId }, { timeout: 10000 });

      if (!bookingResult.recordset || bookingResult.recordset.length === 0) {
        logger.info(`No booking found for application: ${nicheApplicationId}`);
        return;
      }

      const bookingRow = bookingResult.recordset[0];
      const inscriptionRequestId = bookingRow.NicheInscriptionRequestId;

      // Set storage info if available
      if (bookingRow.StorageFrom) {
        nicheAgreement.storageFrom = bookingRow.StorageFrom;
      }
      if (bookingRow.StorageTo) {
        nicheAgreement.storageTo = bookingRow.StorageTo;
      }

      // Step 2: Get deceased details separately (only if inscription exists)
      if (inscriptionRequestId) {
        try {
          const deceasedQuery = `
            SELECT TOP 2
              NameOfDeceased,
              DateDied,
              InternmentDate,
              DeathCertificateNo
            FROM NicheInscriptionRequestDecesed WITH (NOLOCK)
            WHERE NicheInscriptionRequestId = @inscriptionRequestId
            ORDER BY NicheInscriptionRequestDecesedId
          `;

          const deceasedResult = await executeQuery(
            deceasedQuery,
            { inscriptionRequestId },
            { timeout: 10000 }
          );

          if (deceasedResult.recordset.length > 0) {
            const deceased1 = deceasedResult.recordset[0];
            nicheAgreement.nameOfDeceased1 = deceased1.NameOfDeceased;
            nicheAgreement.dateDied1 = deceased1.DateDied;
            nicheAgreement.internmentDate1 = deceased1.InternmentDate;
            nicheAgreement.deathCertificateNo1 = deceased1.DeathCertificateNo;
          }

          if (deceasedResult.recordset.length > 1) {
            const deceased2 = deceasedResult.recordset[1];
            nicheAgreement.nameOfDeceased2 = deceased2.NameOfDeceased;
            nicheAgreement.dateDied2 = deceased2.DateDied;
            nicheAgreement.internmentDate2 = deceased2.InternmentDate;
            nicheAgreement.deathCertificateNo2 = deceased2.DeathCertificateNo;
          }
        } catch (deceasedError) {
          logger.warn(`Could not fetch deceased details for inscription ${inscriptionRequestId}:`, deceasedError.message);
          // Continue without deceased details - they're optional
        }
      }
    } catch (error) {
      logger.warn('Could not fetch deceased and storage info:', error.message);
      // Don't throw - deceased info is optional
    }
  }

  /**
   * Add invoice information separately (optimized query with timeout)
   * Enhanced to include MisalaniousReceiptDetail and Receipt code
   */
  async addInvoiceInfo(applicationCode, nicheAgreement) {
    try {
      // Simplified query - split into two queries to avoid timeout
      // First, get invoice details with InvoiceDetails
      const invoiceQuery = `
        SELECT TOP 1
          inv.Code as InvoiceNo,
          inv.TransactionDate as InvoiceDate,
          inv.TaxAmount,
          inv.PayingAmount as InvoicePayingAmount,
          inv.InvoiceId,
          invdls.TotalPayingAmount as NicheLineAmount,
          invdls.LineTaxAmount,
          invdls.PayingAmount as InvoiceDetailPayingAmount
        FROM InvoiceDetail invdls WITH(NOLOCK)
        INNER JOIN Invoice inv WITH(NOLOCK) ON invdls.InvoiceId = inv.InvoiceId
        WHERE invdls.RefDocNumber = @applicationCode
          AND inv.Status = 1
          AND invdls.ItemId <= 7
        ORDER BY inv.TransactionDate DESC
      `;

      // Reduced timeout - should complete in < 2s with proper index on InvoiceDetail.RefDocNumber
      const invoiceResult = await executeQuery(invoiceQuery, { applicationCode }, { timeout: 10000 });

      let inv = null;
      let invoiceId = null;

      if (invoiceResult.recordset.length === 0) {
        // Try without status filter (for unpaid applications)
        const invoiceQueryNoStatus = `
          SELECT TOP 1
            inv.Code as InvoiceNo,
            inv.TransactionDate as InvoiceDate,
            inv.TaxAmount,
            inv.PayingAmount as InvoicePayingAmount,
            inv.InvoiceId,
            invdls.TotalPayingAmount as NicheLineAmount,
            invdls.LineTaxAmount,
            invdls.PayingAmount as InvoiceDetailPayingAmount
          FROM InvoiceDetail invdls WITH(NOLOCK)
          LEFT JOIN Invoice inv WITH(NOLOCK) ON invdls.InvoiceId = inv.InvoiceId
          WHERE invdls.RefDocNumber = @applicationCode
          ORDER BY inv.TransactionDate DESC
        `;
        const invoiceResultNoStatus = await executeQuery(invoiceQueryNoStatus, { applicationCode }, { timeout: 10000 });
        
        if (invoiceResultNoStatus.recordset.length === 0) {
          logger.info(`No invoice found for application: ${applicationCode}`);
          return;
        }
        
        inv = invoiceResultNoStatus.recordset[0];
        invoiceId = inv.InvoiceId;
      } else {
        inv = invoiceResult.recordset[0];
        invoiceId = inv.InvoiceId;
      }

      // Set invoice information
      nicheAgreement.invoiceNo = inv.InvoiceNo;
      nicheAgreement.invoiceDate = inv.InvoiceDate;
      nicheAgreement.taxAmount = inv.LineTaxAmount || inv.TaxAmount || 0;
      nicheAgreement.invoicePayingAmount = inv.InvoiceDetailPayingAmount || inv.InvoicePayingAmount || 0;
      nicheAgreement.nicheLineAmount = inv.NicheLineAmount || 0;
      nicheAgreement.totalAmount = inv.NicheLineAmount || 0;

      // Get receipt information separately (optional - won't fail if timeout)
      try {
        if (invoiceId) {
          const receiptQuery = `
            SELECT TOP 1
              TotalAmount as ReceiptAmount,
              Code as ReceiptNo,
              TransactionDate as ReceiptDate,
              PaymentMode,
              PaymentModeDocNo,
              PayingAmount as ReceiptPayingAmount
            FROM Receipt WITH(NOLOCK)
            WHERE InvoiceId = @invoiceId
            ORDER BY ReceiptId DESC
          `;

          const receiptResult = await executeQuery(receiptQuery, { invoiceId }, { timeout: 10000 });

          if (receiptResult.recordset.length > 0) {
            const rec = receiptResult.recordset[0];
            nicheAgreement.receiptNo = rec.ReceiptNo;
            nicheAgreement.receiptDate = rec.ReceiptDate;
            nicheAgreement.receiptAmount = rec.ReceiptAmount || 0;
            nicheAgreement.receiptPayingAmount = rec.ReceiptPayingAmount || rec.ReceiptAmount || 0;
            nicheAgreement.paymentMode = rec.PaymentMode;
            nicheAgreement.paymentModeDocNo = rec.PaymentModeDocNo;
          }
        }
      } catch (receiptError) {
        logger.warn(`Could not fetch receipt info: `, receiptError.message);
        // Continue without receipt info
      }

      // Get MisalaniousReceiptDetail (priority over Receipt table)
      try {
        const miscReceiptQuery = `
          SELECT TOP 1
            TotalPayingAmount as ReceiptAmount,
            PayingAmount as ReceiptPayingAmount
          FROM MisalaniousReceiptDetail WITH(NOLOCK)
          WHERE RefDocNumber = @applicationCode
          ORDER BY ReceiptDetailId DESC
        `;

        const miscReceiptResult = await executeQuery(miscReceiptQuery, { applicationCode }, { timeout: 10000 });

        if (miscReceiptResult.recordset.length > 0) {
          const miscRec = miscReceiptResult.recordset[0];
          // Override receipt amount with miscellaneous receipt (priority)
          nicheAgreement.receiptAmount = miscRec.ReceiptAmount || nicheAgreement.receiptAmount || 0;
          nicheAgreement.receiptPayingAmount = miscRec.ReceiptPayingAmount || nicheAgreement.receiptPayingAmount || 0;
        }
      } catch (miscReceiptError) {
        logger.warn(`Could not fetch miscellaneous receipt info: `, miscReceiptError.message);
        // Continue without miscellaneous receipt info
      }

      logger.info(`Invoice info added for ${applicationCode}: ${nicheAgreement.invoiceNo || 'N/A'}`);
    } catch (error) {
      logger.warn('Could not fetch invoice info:', error.message);
      // Don't throw - invoice is optional
    }
  }

  /**
   * Find application numbers by prefix pattern
   * @param {string} prefix - Application number prefix (e.g., "3795-")
   * @returns {Promise<Array<string>>} Array of matching application numbers
   */
  async findApplicationNumbersByPrefix(prefix) {
    try {
      logger.info(`Searching for application numbers with prefix: ${prefix} `);

      const query = `
        SELECT TOP 10 Code
        FROM NicheApplication WITH(NOLOCK)
        WHERE Code LIKE @prefix + '%'
        ORDER BY Code
      `;

      const result = await executeQuery(query, { prefix }, { timeout: 10000 });

      const applicationNumbers = result.recordset.map(row => row.Code);
      logger.info(`Found ${applicationNumbers.length} application(s) matching prefix: ${prefix} `);

      return applicationNumbers;
    } catch (error) {
      logger.error(`Error finding application numbers by prefix ${prefix}: `, error.message);
      return [];
    }
  }

  // Keep the old code structure but update it
  _oldAddInvoiceInfo_backup(applicationCode, nicheAgreement) {
    // This is the old version - kept for reference
    return Promise.resolve();
  }
}

module.exports = NicheAgreementRepository;
