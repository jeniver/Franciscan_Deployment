const BaseRepository = require('./BaseRepository');
const { executeQuery } = require('../config/database');
const logger = require('../utils/logger');
const NicheAgreement = require('../models/NicheAgreement');
const NicheConcentForm = require('../models/NicheConcentForm');

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

      // BYPASS CACHE FOR DEBUGGING
      const bypassCache = true;

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
              r.DefaultAmount AS RowPrice,
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
      console.log("Adresss finder", mergedData)

      // Prefer application-level storage/deceased values before inscription exists.
      // This ensures agreement APIs return storageFrom for pre-inscription records.
      const applicationStorageFrom = mergedData.StorageFrom || mergedData.InternmentDate1 || null;
      const applicationStorageTo = mergedData.StorageTo || mergedData.InternmentDate1 || null;

      // Build the niche agreement object using data from NicheApplication
      const nicheAgreement = new NicheAgreement({
        Status: mergedData.Status,
        applicationCode: mergedData.Code,
        appliedDate: mergedData.AppliedDate,
        agreementDate: mergedData.AgreementDate,

        // Applicant (all data is in NicheApplication table)
        applicantName: mergedData.ApplicantName,
        applicantAddressNo: mergedData.ApplicantAddressNo,
        applicantAddressLine1: this.extractStreetAddress(mergedData.ApplicantAddressLine1),
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
        nomineeAddressLine1: this.extractStreetAddress(mergedData.NomineeAddressLine1),
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
        nominee2AddressLine1: this.extractStreetAddress(mergedData.NomineeAddressLine12),
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
        nicheRowNumber: mergedData.RowCode || null,
        nicheWallName: mergedData.WallName || null,
        chapelName: mergedData.ChapelName || null,
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
            level: mergedData.NicheLevel || null,
            rowPrice: mergedData.RowPrice || 0
          }
        },

        // Deceased details from NicheApplication (fallback until inscription is created)
        nameOfDeceased1: mergedData.NameOfDeceased1 || null,
        dateDied1: mergedData.DateDied1 || null,
        internmentDate1: mergedData.InternmentDate1 || null,
        deathCertificateNo1: mergedData.DeathCertificateNo1 || null,
        nameOfDeceased2: mergedData.NameOfDeceased2 || null,
        dateDied2: mergedData.DateDied2 || null,
        internmentDate2: mergedData.InternmentDate2 || null,
        deathCertificateNo2: mergedData.DeathCertificateNo2 || null,

        // Storage period from application-level data
        storageFrom: applicationStorageFrom,
        storageTo: applicationStorageTo,

        // Basic info
        refDocNumber: mergedData.Code
      });

      // CRITICAL OPTIMIZATION: Execute all independent queries in parallel
      // This reduces total time from sum of all queries to max of all queries
      const [beneficiariesResult, nomineeResult, deceasedResult, invoiceResult, inscriptionResult, consentResult, receiptInfoResult] = await Promise.allSettled([
        this.addBeneficiaries(mergedData.NicheApplicationId, nicheAgreement),
        this.addNomineeInfo(mergedData.NicheApplicationId, nicheAgreement),
        this.addDeceasedAndStorageInfo(mergedData.NicheApplicationId, nicheAgreement),
        this.addInvoiceInfo(applicationCode, nicheAgreement),
        this.addInscriptionInfo(applicationCode, mergedData.NicheApplicationId, nicheAgreement),
        this.addConsentFormInfo(applicationCode, nicheAgreement),
        this.addReceiptInfo(applicationCode, nicheAgreement)
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
      if (inscriptionResult.status === 'rejected') {
        logger.warn('Failed to fetch inscription info:', inscriptionResult.reason?.message);
      }
      if (consentResult.status === 'rejected') {
        logger.warn('Failed to fetch consent form info:', consentResult.reason?.message);
      }
      if (receiptInfoResult.status === 'rejected') {
        logger.warn('Failed to fetch standalone receipt info:', receiptInfoResult.reason?.message);
      }

      logger.info(`Successfully retrieved agreement for: ${applicationCode}`);

      // Final fallback for storage dates: if still null, use receipt date or invoice date
      if (!nicheAgreement.storageFrom) {
        if (nicheAgreement.receiptDate) {
          nicheAgreement.storageFrom = nicheAgreement.receiptDate;
          logger.info(`[getNicheAgreementDetailsCopy] Fallback: Set storageFrom to receiptDate for ${applicationCode}`);
        } else if (nicheAgreement.invoiceDate) {
          nicheAgreement.storageFrom = nicheAgreement.invoiceDate;
          logger.info(`[getNicheAgreementDetailsCopy] Fallback: Set storageFrom to invoiceDate for ${applicationCode}`);
        }
      }

      return nicheAgreement;
    } catch (error) {
      logger.error(`Error getting niche agreement for ${applicationCode}:`, error.message);
      throw error;
    }
  }

  /**
   * Helper function to format DateOfBirth from database
   * Handles both DATETIME (NicheBookingBeneficiary) and NVARCHAR (NicheApplicationBeneficiary)
   * ENHANCED: Better handling of edge cases and logging
   */
  formatDateOfBirth(dbValue) {
    if (!dbValue) return null;

    // If it's already a Date object
    if (dbValue instanceof Date) {
      return isNaN(dbValue.getTime()) ? null : dbValue.toISOString();
    }

    if (typeof dbValue === 'string') {
      const trimmed = dbValue.trim();
      if (!trimmed || trimmed.toLowerCase() === 'null') return null;

      // Handle DD-MM-YYYY (Primary format for storage now)
      const dateParts = trimmed.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
      if (dateParts) {
        return trimmed; // Already in desired string format
      }

      // Handle ISO strings or other parseable formats
      const parsed = new Date(trimmed);
      if (!isNaN(parsed.getTime())) {
        // Stop 4-digit years from becoming Jan 1st
        if (/^\d{4}$/.test(trimmed)) return null;

        const day = String(parsed.getDate()).padStart(2, '0');
        const month = String(parsed.getMonth() + 1).padStart(2, '0');
        const year = parsed.getFullYear();
        return `${day}-${month}-${year}`;
      }

      return trimmed;
    }

    try {
      const d = new Date(dbValue);
      return isNaN(d.getTime()) ? null : d.toISOString();
    } catch (e) {
      return null;
    }
  }

  /**
   * Helper function to format BirthYear from database
   * Handles both INT (NicheBookingBeneficiary) and NVARCHAR (NicheApplicationBeneficiary)
   */
  formatBirthYear(dbValue) {
    if (dbValue === null || dbValue === undefined) return null;

    // If it's already a number
    if (typeof dbValue === 'number') {
      return dbValue;
    }

    // If it's a string, try to parse
    if (typeof dbValue === 'string') {
      const trimmed = dbValue.trim();
      if (!trimmed) return null;

      const parsed = parseInt(trimmed, 10);
      if (!isNaN(parsed)) {
        return parsed;
      }

      // Return as string if can't parse to number
      return trimmed;
    }

    return null;
  }

  /**
   * Add beneficiaries information
   * FIXED: Query NicheApplicationBeneficiary directly (primary source)
   * Fallback to NicheBookingBeneficiary only if no data found
   * ENHANCED: Proper date formatting for both tables
   */
  async addBeneficiaries(nicheApplicationId, nicheAgreement) {
    try {
      logger.info(`[addBeneficiaries] Starting for nicheApplicationId: ${nicheApplicationId}`);

      // PRIMARY: Query NicheApplicationBeneficiary first (this is where POST data is saved)
      const primaryQuery = `
        SELECT TOP 2
          Name,
          IDNo,
          IsCatholic,
          IsMale,
          RelationshipToApplicant,
          DateOfBirth,
          BirthYear,
          CASE 
            WHEN COL_LENGTH('NicheApplicationBeneficiary', 'RelationshipToNominee1') IS NOT NULL 
            THEN RelationshipToNominee1 
            ELSE NULL 
          END AS RelationshipToNominee1,
          CASE 
            WHEN COL_LENGTH('NicheApplicationBeneficiary', 'RelationshipToNominee2') IS NOT NULL 
            THEN RelationshipToNominee2 
            ELSE NULL 
          END AS RelationshipToNominee2,
          CASE 
            WHEN COL_LENGTH('NicheApplicationBeneficiary', 'LifeStatus') IS NOT NULL 
            THEN LifeStatus 
            ELSE NULL 
          END AS LifeStatus
        FROM NicheApplicationBeneficiary WITH (NOLOCK)
        WHERE NicheApplicationId = @nicheApplicationId
        ORDER BY NicheApplicationBeneficiaryId
      `;

      const primaryResult = await executeQuery(
        primaryQuery,
        { nicheApplicationId },
        { timeout: 10000 }
      );

      logger.info(`[addBeneficiaries] Primary query result count: ${primaryResult.recordset.length}`);
      if (primaryResult.recordset.length > 0) {
        logger.info(`[addBeneficiaries] Primary Beneficiary data found:`, JSON.stringify(primaryResult.recordset, null, 2));
      }

      if (primaryResult.recordset.length > 0) {
        const bene1 = primaryResult.recordset[0];

        nicheAgreement.beneName_1 = bene1.Name;
        nicheAgreement.beneIDNo_1 = bene1.IDNo;
        nicheAgreement.beneIsCatholic_1 = bene1.IsCatholic;
        nicheAgreement.beneIsMale_1 = bene1.IsMale;
        nicheAgreement.beneRelationshipToApplicant_1 = bene1.RelationshipToApplicant;
        nicheAgreement.ben1_NomineeRelationship = bene1.RelationshipToNominee1;
        nicheAgreement.ben1_Nominee2Relationship = bene1.RelationshipToNominee2;
        nicheAgreement.beneLifeStatus_1 = bene1.LifeStatus || null;

        // ✅ FIX: Format DateOfBirth properly (handles NVARCHAR string)
        nicheAgreement.beneDateOfBirth_1 = this.formatDateOfBirth(bene1.DateOfBirth);

        // ✅ FIX: Format BirthYear properly (handles NVARCHAR string)
        nicheAgreement.beneBirthYear_1 = this.formatBirthYear(bene1.BirthYear);
      }

      if (primaryResult.recordset.length > 1) {
        const bene2 = primaryResult.recordset[1];

        nicheAgreement.beneName_2 = bene2.Name;
        nicheAgreement.beneIDNo_2 = bene2.IDNo;
        nicheAgreement.beneIsCatholic_2 = bene2.IsCatholic;
        nicheAgreement.beneIsMale_2 = bene2.IsMale;
        nicheAgreement.beneRelationshipToApplicant_2 = bene2.RelationshipToApplicant;
        nicheAgreement.ben2_NomineeRelationship = bene2.RelationshipToNominee1;
        nicheAgreement.ben2_Nominee2Relationship = bene2.RelationshipToNominee2;
        nicheAgreement.beneLifeStatus_2 = bene2.LifeStatus || null;

        // ✅ FIX: Format DateOfBirth properly
        nicheAgreement.beneDateOfBirth_2 = this.formatDateOfBirth(bene2.DateOfBirth);

        // ✅ FIX: Format BirthYear properly
        nicheAgreement.beneBirthYear_2 = this.formatBirthYear(bene2.BirthYear);
      }

      // FALLBACK: If no data found, try NicheBookingBeneficiary (legacy/booking data)
      if (!nicheAgreement.beneName_1 && !nicheAgreement.beneName_2) {
        logger.info(`[addBeneficiaries] No data in NicheApplicationBeneficiary, trying NicheBookingBeneficiary`);

        const fallbackQuery = `
          SELECT TOP 2
            Name,
            IDNo,
            IsCatholic,
            IsMale,
            RelationshipToApplicant,
            DateOfBirth,
            BirthYear,
            RelationshipToNominee1,
            RelationshipToNominee2,
            CASE 
              WHEN COL_LENGTH('NicheBookingBeneficiary', 'LifeStatus') IS NOT NULL 
              THEN LifeStatus 
              ELSE NULL 
            END AS LifeStatus
          FROM NicheBooking nb WITH (NOLOCK)
          INNER JOIN NicheBookingBeneficiary nbb WITH (NOLOCK) ON nb.NicheBookingId = nbb.NicheBookingId
          WHERE nb.NicheApplicationId = @nicheApplicationId
          ORDER BY nbb.NicheBookingBeneficiaryId
        `;

        const fallbackResult = await executeQuery(fallbackQuery, { nicheApplicationId }, { timeout: 10000 });

        if (fallbackResult.recordset.length > 0) {
          const bene1 = fallbackResult.recordset[0];
          logger.info(`[addBeneficiaries] Fallback Beneficiary 1 raw data:`, {
            Name: bene1.Name,
            DateOfBirth: bene1.DateOfBirth,
            DateOfBirthType: typeof bene1.DateOfBirth,
            BirthYear: bene1.BirthYear,
            BirthYearType: typeof bene1.BirthYear
          });

          nicheAgreement.beneName_1 = bene1.Name;
          nicheAgreement.beneIDNo_1 = bene1.IDNo;
          nicheAgreement.beneIsCatholic_1 = bene1.IsCatholic;
          nicheAgreement.beneIsMale_1 = bene1.IsMale;
          nicheAgreement.beneRelationshipToApplicant_1 = bene1.RelationshipToApplicant;
          nicheAgreement.beneLifeStatus_1 = bene1.LifeStatus || null;

          // ✅ FIX: Format DateOfBirth properly (handles DATETIME)
          nicheAgreement.beneDateOfBirth_1 = this.formatDateOfBirth(bene1.DateOfBirth);

          // ✅ FIX: Format BirthYear properly (handles INT)
          nicheAgreement.beneBirthYear_1 = this.formatBirthYear(bene1.BirthYear);

          nicheAgreement.ben1_NomineeRelationship = bene1.RelationshipToNominee1 || null;
          nicheAgreement.ben1_Nominee2Relationship = bene1.RelationshipToNominee2 || null;
        }

        if (fallbackResult.recordset.length > 1) {
          const bene2 = fallbackResult.recordset[1];
          logger.info(`[addBeneficiaries] Fallback Beneficiary 2 raw data:`, {
            Name: bene2.Name,
            DateOfBirth: bene2.DateOfBirth,
            DateOfBirthType: typeof bene2.DateOfBirth,
            BirthYear: bene2.BirthYear,
            BirthYearType: typeof bene2.BirthYear
          });

          nicheAgreement.beneName_2 = bene2.Name;
          nicheAgreement.beneIDNo_2 = bene2.IDNo;
          nicheAgreement.beneIsCatholic_2 = bene2.IsCatholic;
          nicheAgreement.beneIsMale_2 = bene2.IsMale;
          nicheAgreement.beneRelationshipToApplicant_2 = bene2.RelationshipToApplicant;
          nicheAgreement.beneLifeStatus_2 = bene2.LifeStatus || null;

          // ✅ FIX: Format DateOfBirth properly
          nicheAgreement.beneDateOfBirth_2 = this.formatDateOfBirth(bene2.DateOfBirth);

          // ✅ FIX: Format BirthYear properly
          nicheAgreement.beneBirthYear_2 = this.formatBirthYear(bene2.BirthYear);

          nicheAgreement.ben2_NomineeRelationship = bene2.RelationshipToNominee1 || null;
          nicheAgreement.ben2_Nominee2Relationship = bene2.RelationshipToNominee2 || null;
        }
      }

    } catch (error) {
      logger.warn('Could not fetch beneficiaries:', error.message);
      logger.error('[addBeneficiaries] Error details:', error);
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
          nicheAgreement.applicantAddressLine1 = this.extractStreetAddress(row.ApplicantAddressLine1);
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
          nicheAgreement.nomineeAddressLine1 = this.extractStreetAddress(row.NomineeAddressLine1);
          // CRITICAL FIX: Ensure that if Person table has nominee address data, it overrides the NicheApplication data
          nicheAgreement.nomineeAddressLine2 = row.NomineeAddressLine2 !== null ? row.NomineeAddressLine2 : nicheAgreement.nomineeAddressLine2;
          nicheAgreement.nomineeAddressCity = row.NomineeAddressCity !== null ? row.NomineeAddressCity : nicheAgreement.nomineeAddressCity;
          nicheAgreement.nomineeAddressState = row.NomineeAddressState !== null ? row.NomineeAddressState : nicheAgreement.nomineeAddressState;
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
          nicheAgreement.nominee2AddressLine1 = this.extractStreetAddress(row.Nominee2AddressLine1);
          // CRITICAL FIX: Ensure that if Person table has nominee2 address data, it overrides the NicheApplication data
          nicheAgreement.nominee2AddressLine2 = row.Nominee2AddressLine2 !== null ? row.Nominee2AddressLine2 : nicheAgreement.nominee2AddressLine2;
          nicheAgreement.nominee2AddressCity = row.Nominee2AddressCity !== null ? row.Nominee2AddressCity : nicheAgreement.nominee2AddressCity;
          nicheAgreement.nominee2AddressState = row.Nominee2AddressState !== null ? row.Nominee2AddressState : nicheAgreement.nominee2AddressState;
          nicheAgreement.nominee2AddressCountry = row.Nominee2AddressCountry;
          nicheAgreement.nominee2EmailID = row.Nominee2EmailID;
          nicheAgreement.nominee2IDNo = row.Nominee2IDNo;
          nicheAgreement.nominee2MobileNo = row.Nominee2MobileNo;
          nicheAgreement.nominee2HomeTelNo = row.Nominee2HomeTelNo;
          nicheAgreement.nominee2OfficeTelNo = row.Nominee2OfficeTelNo;
          nicheAgreement.nominee2Relationship = row.Nominee2Relationship;
        }
      } else {
        // If no NicheBooking record exists, log this as it might explain why address fields are null
      }
    } catch (error) {
      logger.warn('Could not fetch nominee info from Person table:', error.message);
      // Don't throw - nominee info from Person is optional, fallback to NicheApplication data
    }
  }

  /**
   * Add deceased information and storage period from NicheInscriptionRequest
   * OPTIMIZED: Robust query strategy
   */
  async addDeceasedAndStorageInfo(nicheApplicationId, nicheAgreement) {
    try {
      const hasBookingStorageFromResult = await executeQuery(
        `
          SELECT CASE
            WHEN COL_LENGTH('NicheBooking', 'StorageFrom') IS NOT NULL THEN 1
            ELSE 0
          END AS HasStorageFrom
        `,
        {},
        { timeout: 5000 }
      );
      const hasBookingStorageFrom = Boolean(hasBookingStorageFromResult.recordset?.[0]?.HasStorageFrom);

      // Step 1: Get booking info first (Foundational)
      const bookingQuery = hasBookingStorageFrom ? `
        SELECT TOP 1
          NicheBookingId,
          StorageFrom
        FROM NicheBooking WITH (NOLOCK)
        WHERE NicheApplicationId = @nicheApplicationId
        ORDER BY NicheBookingId DESC
      ` : `
        SELECT TOP 1
          NicheBookingId
        FROM NicheBooking WITH (NOLOCK)
        WHERE NicheApplicationId = @nicheApplicationId
        ORDER BY NicheBookingId DESC
      `;
      const bookingResult = await executeQuery(
        bookingQuery,
        { nicheApplicationId },
        { timeout: 10000 }
      );

      if (!bookingResult.recordset || bookingResult.recordset.length === 0) {
        return;
      }

      const bookingRow = bookingResult.recordset[0];
      const nicheBookingId = bookingRow.NicheBookingId;

      if (hasBookingStorageFrom && bookingRow.StorageFrom) {
        nicheAgreement.storageFrom = bookingRow.StorageFrom;
      }

      const hasInscriptionStorageFromResult = await executeQuery(
        `
          SELECT CASE
            WHEN COL_LENGTH('NicheInscriptionRequest', 'StorageFrom') IS NOT NULL THEN 1
            ELSE 0
          END AS HasStorageFrom
        `,
        {},
        { timeout: 5000 }
      );
      const hasInscriptionStorageFrom = Boolean(hasInscriptionStorageFromResult.recordset?.[0]?.HasStorageFrom);

      // Step 2: Get Inscription Request info
      const inscriptionQuery = hasInscriptionStorageFrom ? `
        SELECT TOP 1
          NicheInscriptionRequestId,
          StorageFrom,
          TranscationDate
        FROM NicheInscriptionRequest WITH (NOLOCK)
        WHERE NicheBookingId = @nicheBookingId
        ORDER BY NicheInscriptionRequestId DESC
      ` : `
        SELECT TOP 1
          NicheInscriptionRequestId,
          TranscationDate
        FROM NicheInscriptionRequest WITH (NOLOCK)
        WHERE NicheBookingId = @nicheBookingId
        ORDER BY NicheInscriptionRequestId DESC
      `;
      const inscriptionResult = await executeQuery(
        inscriptionQuery,
        { nicheBookingId },
        { timeout: 10000 }
      );
      let inscriptionRequestId = null;

      if (inscriptionResult.recordset.length > 0) {
        const insRow = inscriptionResult.recordset[0];
        inscriptionRequestId = insRow.NicheInscriptionRequestId;

        // Override/Set storage from Inscription if available (it's arguably more recent/specific)
        if (hasInscriptionStorageFrom && insRow.StorageFrom) {
          nicheAgreement.storageFrom = insRow.StorageFrom;
        }

        // If still no StorageFrom, use TranscationDate of inscription as a last-resort fallback for FROM
        if (!nicheAgreement.storageFrom && insRow.TranscationDate) {
          nicheAgreement.storageFrom = insRow.TranscationDate;
        }
      }

      // Step 3: Get deceased details (only if inscription exists)
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

            // Set storage from internment date if missing
            if (!nicheAgreement.storageFrom && deceased1.InternmentDate) {
              nicheAgreement.storageFrom = deceased1.InternmentDate;
              logger.info(`[addDeceasedAndStorageInfo] Fallback: Set storageFrom to internmentDate for ${nicheApplicationId}`);
            }
            if (!nicheAgreement.storageTo && deceased1.InternmentDate) {
              // Usually storageTo is 30 years later, but for agreements we often just show the date
              // User specifically asked to use internmentDate
              nicheAgreement.storageTo = deceased1.InternmentDate;
              logger.info(`[addDeceasedAndStorageInfo] Fallback: Set storageTo to internmentDate for ${nicheApplicationId}`);
            }
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
        }
      }
    } catch (error) {
      logger.warn('Could not fetch deceased and storage info:', error.message);
    }
  }

  /**
   * Add invoice information separately (optimized query with timeout)
   * Enhanced to include MisalaniousReceiptDetail and Receipt code
   */
  async addInvoiceInfo(applicationCode, nicheAgreement) {
    try {
      const trimmedCode = String(applicationCode || '').trim();
      const prefixedCode = `I-${trimmedCode}`;

      // Find the main invoice linked to this application code
      const invoiceHeaderQuery = `
        SELECT TOP 1
          inv.InvoiceId,
          inv.Code as InvoiceNo,
          inv.TransactionDate as InvoiceDate,
          inv.TaxAmount as InvoiceTaxAmount,
          inv.TotalAmount as InvoiceTotalAmount,
          inv.PayingAmount as InvoicePayingAmount,
          inv.PaymentMode,
          inv.PaymentModeDocNo,
          inv.Status
        FROM Invoice inv WITH(NOLOCK)
        LEFT JOIN InvoiceDetail idl WITH(NOLOCK) ON inv.InvoiceId = idl.InvoiceId
        WHERE inv.RefDocNumber IN (@applicationCode, @prefixedCode)
           OR idl.RefDocNumber IN (@applicationCode, @prefixedCode)
        ORDER BY inv.TransactionDate DESC
      `;

      const headerResult = await executeQuery(
        invoiceHeaderQuery,
        { applicationCode: trimmedCode, prefixedCode },
        { timeout: 10000 }
      );

      if (headerResult.recordset.length === 0) {
        return;
      }

      const inv = headerResult.recordset[0];
      const invoiceId = inv.InvoiceId;

      // Set header info
      nicheAgreement.invoiceNo = inv.InvoiceNo;
      nicheAgreement.invoiceDate = inv.InvoiceDate;
      nicheAgreement.taxAmount = inv.InvoiceTaxAmount || 0;
      nicheAgreement.totalAmount = inv.InvoiceTotalAmount || 0;
      nicheAgreement.invoicePayingAmount = inv.InvoicePayingAmount || 0;
      nicheAgreement.paymentMode = inv.PaymentMode;
      nicheAgreement.paymentModeDocNo = inv.PaymentModeDocNo;

      // Fetch ALL details for this invoice
      const detailsQuery = `
        SELECT 
          idl.InvoiceDetailId,
          idl.ItemId,
          idl.Description,
          idl.Quantity,
          idl.UnitPrice,
          idl.LineTaxAmount,
          idl.TotalPayingAmount as LineTotal,
          idl.PayingAmount as LineNet,
          i.Name as ItemName,
          i.Code as ItemCode
        FROM InvoiceDetail idl WITH(NOLOCK)
        LEFT JOIN Item i WITH(NOLOCK) ON idl.ItemId = i.ItemId
        WHERE idl.InvoiceId = @invoiceId
      `;

      const detailsResult = await executeQuery(detailsQuery, { invoiceId }, { timeout: 10000 });

      if (detailsResult.recordset.length > 0) {
        nicheAgreement.invoiceDetails = detailsResult.recordset.map(detail => ({
          itemId: detail.ItemId,
          itemName: detail.ItemName || detail.Description || 'Service Item',
          itemCode: detail.ItemCode,
          description: detail.Description,
          quantity: detail.Quantity || 1,
          unitPrice: detail.UnitPrice || 0,
          taxAmount: detail.LineTaxAmount || 0,
          lineTotal: detail.LineTotal || 0,
          lineNet: detail.LineNet || 0
        }));

        // Set nicheLineAmount from the niche item (usually ItemId <= 7)
        const nicheItem = nicheAgreement.invoiceDetails.find(d => d.itemId <= 7);
        if (nicheItem) {
          nicheAgreement.nicheLineAmount = nicheItem.lineNet;
        } else {
          nicheAgreement.nicheLineAmount = nicheAgreement.invoiceDetails[0].lineNet;
        }
      }

      // Get receipt information
      try {
        const receiptQuery = `
          SELECT TOP 1
            Code as ReceiptNo,
            TransactionDate as ReceiptDate,
            TotalAmount as ReceiptAmount,
            PayingAmount as ReceiptPayingAmount,
            PaymentMode,
            PaymentModeDocNo
          FROM Receipt WITH(NOLOCK)
          WHERE InvoiceId = @invoiceId
            AND Status > 0
          ORDER BY ReceiptId DESC
        `;

        const receiptResult = await executeQuery(receiptQuery, { invoiceId }, { timeout: 10000 });

        if (receiptResult.recordset.length > 0) {
          const rec = receiptResult.recordset[0];
          nicheAgreement.receiptNo = rec.ReceiptNo;
          nicheAgreement.receiptDate = rec.ReceiptDate;
          nicheAgreement.receiptAmount = rec.ReceiptAmount || 0;
          nicheAgreement.receiptPayingAmount = rec.ReceiptPayingAmount || rec.ReceiptAmount || 0;

          if (rec.PaymentMode) nicheAgreement.paymentMode = rec.PaymentMode;
          if (rec.PaymentModeDocNo) nicheAgreement.paymentModeDocNo = rec.PaymentModeDocNo;
        }
      } catch (receiptError) {
        // ignore standalone receipt error
      }
    } catch (error) {
      // ignore overall invoice error
    }
  }

  /**
   * Add receipt information (standalone fallback)
   * This fetches receipts linked via MisalaniousReceiptDetail for individual receipts
   */
  async addReceiptInfo(applicationCode, nicheAgreement) {
    try {
      const trimmedCode = String(applicationCode || '').trim();
      const prefixedCode = `I-${trimmedCode}`;

      // Search for standalone receipt linked via Application Code in MisalaniousReceiptDetail
      // This handles cases where no invoice exists or individual receipts (without InvoiceId)
      const receiptQuery = `
        SELECT TOP 1
          r.Code as ReceiptNo,
          r.TransactionDate as ReceiptDate,
          r.TotalAmount as ReceiptAmount,
          r.PayingAmount as ReceiptPayingAmount,
          r.PaymentMode,
          r.PaymentModeDocNo
        FROM Receipt r WITH(NOLOCK)
        INNER JOIN MisalaniousReceiptDetail rd WITH(NOLOCK) ON r.ReceiptId = rd.ReceiptId
        WHERE rd.RefDocNumber IN (@applicationCode, @prefixedCode)
        AND r.Status > 0
        ORDER BY r.ReceiptId DESC
      `;

      const result = await executeQuery(
        receiptQuery,
        { applicationCode: trimmedCode, prefixedCode },
        { timeout: 10000 }
      );

      if (result.recordset.length > 0) {
        const rec = result.recordset[0];
        // Only set if not already set by addInvoiceInfo (to avoid duplicates/conflicts)
        if (!nicheAgreement.receiptNo) {
          logger.info(`[addReceiptInfo] Found standalone receipt ${rec.ReceiptNo} for application ${applicationCode}`);
          nicheAgreement.receiptNo = rec.ReceiptNo;
          nicheAgreement.receiptDate = rec.ReceiptDate;
          nicheAgreement.receiptAmount = rec.ReceiptAmount || 0;
          nicheAgreement.receiptPayingAmount = rec.ReceiptPayingAmount || rec.ReceiptAmount || 0;

          // Use receipt payment mode if not already set
          if (rec.PaymentMode && !nicheAgreement.paymentMode) {
            nicheAgreement.paymentMode = rec.PaymentMode;
          }
          if (rec.PaymentModeDocNo && !nicheAgreement.paymentModeDocNo) {
            nicheAgreement.paymentModeDocNo = rec.PaymentModeDocNo;
          }
        } else {
          logger.info(`[addReceiptInfo] Receipt already populated for ${applicationCode}, skipping standalone check`);
        }
      }
    } catch (error) {
      logger.warn(`[addReceiptInfo] Error fetching standalone receipt info for ${applicationCode}:`, error.message);
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

  /**
   * Add inscription information to the niche agreement
   * This fetches inscription data linked to the application
   */
  async addInscriptionInfo(applicationCode, nicheApplicationId, nicheAgreement) {
    try {
      // Query for inscription linked to this application via NicheBooking
      const inscriptionQuery = `
        SELECT TOP 1
          nir.Code AS InscriptionCode,
          nir.NicheBookingId,
          nir.BibleInscriptionChoiceId,
          nir.BibleInscriptionChoiceNo,
          nir.AdditionalInscriptionPhrase,
          nir.TranscationDate
        FROM NicheInscriptionRequest nir WITH(NOLOCK)
        INNER JOIN NicheBooking nb WITH(NOLOCK) ON nir.NicheBookingId = nb.NicheBookingId
        WHERE nb.NicheApplicationId = @nicheApplicationId
        ORDER BY nir.NicheInscriptionRequestId DESC
      `;

      const inscriptionResult = await executeQuery(inscriptionQuery, { nicheApplicationId }, { timeout: 10000 });

      if (inscriptionResult.recordset.length > 0) {
        const inscription = inscriptionResult.recordset[0];

        // Store inscription information in the niche agreement object
        nicheAgreement.inscription = {
          code: inscription.InscriptionCode,
          status: 1, // Default status since Status column doesn't exist in NicheInscriptionRequest table
          bibleInscriptionChoiceId: inscription.BibleInscriptionChoiceId,
          bibleInscriptionChoiceNo: inscription.BibleInscriptionChoiceNo,
          additionalInscriptionPhrase: inscription.AdditionalInscriptionPhrase,
          createdDate: inscription.TranscationDate
        };

        // Now fetch inscription items using InscriptionInvoiceService
        try {
          const InscriptionInvoiceService = require('../services/InscriptionInvoiceService');
          const inscriptionData = await InscriptionInvoiceService.getInscriptionItems(inscription.InscriptionCode, null);

          if (inscriptionData && inscriptionData.items && Array.isArray(inscriptionData.items) && inscriptionData.items.length > 0) {
            const inscriptionItems = inscriptionData.items.map(inscriptionItem => ({
              itemId: inscriptionItem.ItemId || null,
              itemName: inscriptionItem.Name || inscriptionItem.ItemName || 'Inscription Item',
              itemCode: inscriptionItem.Code || inscriptionItem.ItemCode || null,
              itemPrice: inscriptionItem.Price || 0,
              itemDocType: inscriptionItem.DocType || 'INCR',
              quantity: 1,
              unitAmount: inscriptionItem.Price || 0,
              payingAmount: inscriptionItem.Price || 0,
              totalPayingAmount: inscriptionItem.Price || 0,
              refDocNumber: inscription.InscriptionCode,
              refDocName: 'INCR',
              refType: 'INCR',
              outstandingAmount: 0,
              lineTotalAmount: inscriptionItem.Price || 0,
              lineTaxPercent: 9,
              lineTaxAmount: ((inscriptionItem.Price || 0) * 9) / 100
            }));

            nicheAgreement.inscriptionItems = inscriptionItems;
          }
        } catch (inscriptionServiceError) {
          // ignore inscription service error
        }
      }
    } catch (error) {
      // ignore overall inscription info error
    }
  }

  /**
   * Add consent form information and beneficiary life status
   */
  async addConsentFormInfo(applicationCode, nicheAgreement) {
    try {
      const query = `
        SELECT TOP 1 Status, AgreementDate, AppliedDate
        FROM NicheConcentForm WITH (NOLOCK)
        WHERE Code = @applicationCode
        ORDER BY NicheConcentFormId DESC
      `;

      const result = await executeQuery(query, { applicationCode }, { timeout: 10000 });

      if (result.recordset && result.recordset.length > 0) {
        const row = result.recordset[0];
        const status = row.Status;

        const decoded = NicheConcentForm.decodeConsentSelections(status);

        nicheAgreement.beneLifeStatus_1 = decoded.firstBeneficiary;
        nicheAgreement.beneLifeStatus_2 = decoded.secondBeneficiary;

        nicheAgreement.consentFormStatus = status;
        nicheAgreement.consentFormTimestamp = row.AgreementDate || row.AppliedDate || null;
      }
    } catch (error) {
      // ignore consent info error
    }
  }

  /**
   * Helper function to extract street address from full address
   */
  extractStreetAddress(fullAddress) {
    if (!fullAddress || typeof fullAddress !== 'string') {
      return fullAddress;
    }

    let cleanedAddress = fullAddress.replace(/^\s*Block\s+\d+\s*,?\s*/i, '');
    const unitPattern = /[#\-]\d+[\-\/]\d+/;
    const unitMatch = cleanedAddress.match(unitPattern);

    if (unitMatch) {
      const parts = cleanedAddress.split(unitMatch[0]);
      cleanedAddress = parts[0].trim();
    }

    cleanedAddress = cleanedAddress.replace(/\s+\d{6}\s*$/, '').trim();
    cleanedAddress = cleanedAddress.replace(/\s*,?\s*Singapore\s*$/i, '').trim();

    return cleanedAddress;
  }
}

module.exports = NicheAgreementRepository;
