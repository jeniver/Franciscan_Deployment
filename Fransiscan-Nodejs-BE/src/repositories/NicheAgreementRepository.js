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

      // Enhanced query - Include Chapel, Wall, and Row information
      const query = `
        SELECT TOP 1 
          na.*,
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
        FROM NicheApplication na WITH (NOLOCK)
        LEFT JOIN Niche n WITH (NOLOCK) ON na.NicheId = n.NicheId
        LEFT JOIN NicheRow r WITH (NOLOCK) ON n.NicheRowlId = r.NicheRowlId
        LEFT JOIN NicheWall w WITH (NOLOCK) ON r.NicheWallId = w.NicheWallId
        LEFT JOIN Chapel c WITH (NOLOCK) ON w.ChapelId = c.ChapelId
        WHERE na.Code = @applicationCode
      `;

      // This query can touch several joined tables; give it a slightly higher
      // timeout than the global default to avoid occasional ETIMEOUT on large
      // datasets, without changing any functional behaviour.
      const result = await executeQuery(
        query,
        { applicationCode },
        { timeout: 120000 }
      );

      if (result.recordset.length === 0) {
        logger.warn(`No application found for code: ${applicationCode}`);
        return null;
      }

      const na = result.recordset[0];
      logger.info(`Found application: ${na.Code} in Chapel: ${na.ChapelCode || 'N/A'}, Wall: ${na.WallCode || 'N/A'}`);

      // Build the niche agreement object using data from NicheApplication
      const nicheAgreement = new NicheAgreement({
        applicationCode: na.Code,
        appliedDate: na.AppliedDate,
        agreementDate: na.AgreementDate,

        // Applicant (all data is in NicheApplication table)
        applicantName: na.ApplicantName,
        applicantAddressNo: na.ApplicantAddressNo,
        applicantAddressLine1: na.ApplicantAddressLine1,
        applicantAddressLine2: na.ApplicantAddressLine2,
        applicantAddressCity: na.ApplicantAddressCity,
        applicantAddressCountry: na.ApplicantAddressCountry,
        applicantAddressState: na.ApplicantAddressState,
        applicantEmailID: na.ApplicantEmailID,
        applicantIDNo: na.ApplicantIDNo,
        applicantMobileNo: na.ApplicantMobileNo,
        applicantHomeTelNo: na.ApplicantHomeTelNo,
        applicantOfficeTelNo: na.ApplicantOfficeTelNo,
        applicantIsCatholic: na.ApplicantIsCatholic,

        // Nominee (all data is in NicheApplication table)
        nomineeName: na.NomineeName,
        nomineeAddressNo: na.NomineeAddressNo,
        nomineeAddressLine1: na.NomineeAddressLine1,
        nomineeAddressLine2: na.NomineeAddressLine2,
        nomineeAddressCity: na.NomineeAddressCity,
        nomineeAddressCountry: na.NomineeAddressCountry,
        nomineeAddressState: na.NomineeAddressState,
        nomineeEmailID: na.NomineeEmailID,
        nomineeIDNo: na.NomineeIDNo,
        nomineeMobileNo: na.NomineeMobileNo,
        nomineeHomeTelNo: na.NomineeHomeTelNo,
        nomineeOfficeTelNo: na.NomineeOfficeTelNo,
        nomineeRelationship: na.NomineeRelationship,

        // Second Nominee (all data is in NicheApplication table)
        nominee2Name: na.NomineeName2,
        nominee2AddressNo: na.NomineeAddressNo2,
        nominee2AddressLine1: na.NomineeAddressLine12,
        nominee2AddressLine2: na.NomineeAddressLine22,
        nominee2AddressCity: na.NomineeAddressCity2,
        nominee2AddressCountry: na.NomineeAddressCountry2,
        nominee2AddressState: na.NomineeAddressState2,
        nominee2EmailID: na.NomineeEmailID2,
        nominee2IDNo: na.NomineeIDNo2,
        nominee2MobileNo: na.NomineeMobileNo2,
        nominee2HomeTelNo: na.NomineeHomeTelNo2,
        nominee2OfficeTelNo: na.NomineeOfficeTelNo2,
        nominee2Relationship: na.NomineeRelationship2,

        // Niche details with enhanced location information
        nicheNumber: na.NicheId ? na.NicheId.toString() : null,
        nicheCode: na.NicheCode || null,
        nicheTotalAmount: na.Amount || 0,
        nicheLineAmount: na.DefaultAmount || 0,

        // Niche location hierarchy (NEW)
        nicheLocation: {
          chapel: {
            chapelId: na.ChapelId || null,
            chapelCode: na.ChapelCode || null,
            chapelName: na.ChapelName || null,
            description: na.ChapelDescription || null
          },
          wall: {
            wallId: na.NicheWallId || null,
            wallCode: na.WallCode || null,
            wallName: na.WallName || null
          },
          row: {
            rowId: na.NicheRowlId || null,
            rowCode: na.RowCode || null,
            level: na.NicheLevel || null
          }
        },

        // Basic info
        refDocNumber: na.Code
      });

      // Get beneficiaries separately (simple query)
      await this.addBeneficiaries(na.NicheApplicationId, nicheAgreement);

      // Get nominee information from Person table via NicheBooking
      await this.addNomineeInfo(na.NicheApplicationId, nicheAgreement);

      // Get deceased information and storage period
      await this.addDeceasedAndStorageInfo(na.NicheApplicationId, nicheAgreement);

      // Get invoice info separately (if needed)
      await this.addInvoiceInfo(applicationCode, nicheAgreement);

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

      const result = await executeQuery(query, { nicheApplicationId });

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

      const result = await executeQuery(query, { nicheApplicationId });

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
   */
  async addDeceasedAndStorageInfo(nicheApplicationId, nicheAgreement) {
    try {
      // First get NicheBookingId
      const bookingQuery = `
        SELECT TOP 1 NicheBookingId
        FROM NicheBooking WITH (NOLOCK)
        WHERE NicheApplicationId = @nicheApplicationId
      `;
      const bookingResult = await executeQuery(bookingQuery, { nicheApplicationId });

      if (bookingResult.recordset.length === 0) {
        logger.info(`No booking found for application: ${nicheApplicationId}`);
        return;
      }

      const nicheBookingId = bookingResult.recordset[0].NicheBookingId;

      // Get inscription request with storage period
      const inscriptionQuery = `
        SELECT TOP 1
          StorageFrom,
          StorageTo,
          NicheInscriptionRequestId
        FROM NicheInscriptionRequest WITH (NOLOCK)
        WHERE NicheBookingId = @nicheBookingId
        ORDER BY NicheInscriptionRequestId DESC
      `;

      const inscriptionResult = await executeQuery(inscriptionQuery, { nicheBookingId });

      if (inscriptionResult.recordset.length > 0) {
        const ins = inscriptionResult.recordset[0];
        nicheAgreement.storageFrom = ins.StorageFrom;
        nicheAgreement.storageTo = ins.StorageTo;

        // Get deceased information
        if (ins.NicheInscriptionRequestId) {
          const deceasedQuery = `
            SELECT TOP 2
              NameOfDeceased,
              DateDied,
              InternmentDate,
              DeathCertificateNo
            FROM NicheInscriptionRequestDecesed WITH (NOLOCK)
            WHERE NicheInscriptionRequestId = @nicheInscriptionRequestId
            ORDER BY NicheInscriptionRequestDecesedId
          `;

          const deceasedResult = await executeQuery(deceasedQuery, { 
            nicheInscriptionRequestId: ins.NicheInscriptionRequestId 
          });

          if (deceasedResult.recordset.length > 0) {
            const dec1 = deceasedResult.recordset[0];
            nicheAgreement.nameOfDeceased1 = dec1.NameOfDeceased;
            nicheAgreement.dateDied1 = dec1.DateDied;
            nicheAgreement.internmentDate1 = dec1.InternmentDate;
            nicheAgreement.deathCertificateNo1 = dec1.DeathCertificateNo;
          }

          if (deceasedResult.recordset.length > 1) {
            const dec2 = deceasedResult.recordset[1];
            nicheAgreement.nameOfDeceased2 = dec2.NameOfDeceased;
            nicheAgreement.dateDied2 = dec2.DateDied;
            nicheAgreement.internmentDate2 = dec2.InternmentDate;
            nicheAgreement.deathCertificateNo2 = dec2.DeathCertificateNo;
          }
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

      const invoiceResult = await executeQuery(invoiceQuery, { applicationCode });

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
        const invoiceResultNoStatus = await executeQuery(invoiceQueryNoStatus, { applicationCode });
        
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

          const receiptResult = await executeQuery(receiptQuery, { invoiceId });

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

        const miscReceiptResult = await executeQuery(miscReceiptQuery, { applicationCode });

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

      const result = await executeQuery(query, { prefix });

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
