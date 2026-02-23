const BaseRepository = require('./BaseRepository');
const { executeQuery } = require('../config/database');
const logger = require('../utils/logger');
const NicheAgreement = require('../models/NicheAgreement');
const NicheConcentForm = require('../models/NicheConcentForm');
const AddressUtils = require('../utils/AddressUtils');

// NOTE: Storage period is derived from 1st Interment Date only (StorageFrom = IntermentDate, StorageTo = IntermentDate + 30y + 30d). Not from NicheInscriptionRequest/NicheBooking.

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
              n.DefaultAmount AS NichePrice,
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

      // Storage period is derived from 1st Interment Date: StorageFrom = IntermentDate1, StorageTo = IntermentDate1 + 30 years + 30 days.
      // Do NOT use NicheApplication.StorageFrom/StorageTo or inscription StorageFrom/StorageTo.
      const intermentDate1 = mergedData.InternmentDate1 || null;
      const applicationStorageFrom = intermentDate1;
      const applicationStorageTo = null; // Will be calculated in addDeceasedAndStorageInfo / processNicheAgreementData (IntermentDate + 30y + 30d)

      // Build the niche agreement object using data from NicheApplication
      const nicheAgreement = new NicheAgreement({
        Status: mergedData.Status,
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
        nicheRowNumber: mergedData.RowCode || null,
        nicheWallName: mergedData.WallName || null,
        chapelName: mergedData.ChapelName || null,
        nicheTotalAmount: mergedData.Amount || 0,
        nicheLineAmount: mergedData.DefaultAmount || 0,
        nichePrice: mergedData.NichePrice || 0,

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
        this.addInscriptionInfo(applicationCode, mergedData.NicheApplicationId, nicheAgreement, mergedData.ChurchId),
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
          END AS RelationshipToNominee2
        FROM NicheApplicationBeneficiary WITH (NOLOCK)
        WHERE NicheApplicationId = @nicheApplicationId
        ORDER BY NicheApplicationBeneficiaryId
      `;

      const primaryResult = await executeQuery(
        primaryQuery,
        { nicheApplicationId },
        { timeout: 10000 }
      );

      if (primaryResult.recordset.length > 0) {
        const bene1 = primaryResult.recordset[0];

        nicheAgreement.beneName_1 = bene1.Name;
        nicheAgreement.beneIDNo_1 = bene1.IDNo;
        nicheAgreement.beneIsCatholic_1 = bene1.IsCatholic;
        nicheAgreement.beneIsMale_1 = bene1.IsMale;
        nicheAgreement.beneRelationshipToApplicant_1 = bene1.RelationshipToApplicant;
        nicheAgreement.ben1_NomineeRelationship = bene1.RelationshipToNominee1;
        nicheAgreement.ben1_Nominee2Relationship = bene1.RelationshipToNominee2;

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

        // ✅ FIX: Format DateOfBirth properly
        nicheAgreement.beneDateOfBirth_2 = this.formatDateOfBirth(bene2.DateOfBirth);

        // ✅ FIX: Format BirthYear properly
        nicheAgreement.beneBirthYear_2 = this.formatBirthYear(bene2.BirthYear);
      }

      // Supplementary: Read BeneficiaryStatus from NicheBookingBeneficiary
      try {
        const statusQuery = `
          SELECT TOP 2 nbb.Name, nbb.BeneficiaryStatus
          FROM NicheBooking nb WITH (NOLOCK)
          INNER JOIN NicheBookingBeneficiary nbb WITH (NOLOCK) ON nb.NicheBookingId = nbb.NicheBookingId
          WHERE nb.NicheApplicationId = @nicheApplicationId
            AND nbb.BeneficiaryStatus >= 0
          ORDER BY nbb.NicheBookingBeneficiaryId
        `;
        const statusResult = await executeQuery(statusQuery, { nicheApplicationId }, { timeout: 10000 });
        if (statusResult.recordset.length > 0) {
          nicheAgreement.beneStatus_1 = statusResult.recordset[0].BeneficiaryStatus === 1 ? 'Occupied' : 'Not Occupied';
        }
        if (statusResult.recordset.length > 1) {
          nicheAgreement.beneStatus_2 = statusResult.recordset[1].BeneficiaryStatus === 1 ? 'Occupied' : 'Not Occupied';
        }
      } catch (statusError) {
        logger.warn('[addBeneficiaries] Could not fetch beneficiary status from NicheBookingBeneficiary:', statusError.message);
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
            nbb.BeneficiaryStatus
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

          // ✅ FIX: Format DateOfBirth properly (handles DATETIME)
          nicheAgreement.beneDateOfBirth_1 = this.formatDateOfBirth(bene1.DateOfBirth);

          // ✅ FIX: Format BirthYear properly (handles INT)
          nicheAgreement.beneBirthYear_1 = this.formatBirthYear(bene1.BirthYear);

          nicheAgreement.ben1_NomineeRelationship = bene1.RelationshipToNominee1 || null;
          nicheAgreement.ben1_Nominee2Relationship = bene1.RelationshipToNominee2 || null;
          nicheAgreement.beneStatus_1 = bene1.BeneficiaryStatus === 1 ? 'Occupied' : 'Not Occupied';
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

          // ✅ FIX: Format DateOfBirth properly
          nicheAgreement.beneDateOfBirth_2 = this.formatDateOfBirth(bene2.DateOfBirth);

          // ✅ FIX: Format BirthYear properly
          nicheAgreement.beneBirthYear_2 = this.formatBirthYear(bene2.BirthYear);

          nicheAgreement.ben2_NomineeRelationship = bene2.RelationshipToNominee1 || null;
          nicheAgreement.ben2_Nominee2Relationship = bene2.RelationshipToNominee2 || null;
          nicheAgreement.beneStatus_2 = bene2.BeneficiaryStatus === 1 ? 'Occupied' : 'Not Occupied';
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

        // Person table is a FALLBACK only — NicheApplication is the authoritative source.
        // Only fill fields that are null/empty in NicheApplication data to avoid
        // overwriting freshly-updated NicheApplication values with stale Person records.
        const fallback = (current, personValue) =>
          (current !== null && current !== undefined && current !== '') ? current : personValue;

        if (row.ApplicantName) {
          nicheAgreement.applicantName = fallback(nicheAgreement.applicantName, row.ApplicantName);
          nicheAgreement.applicantAddressNo = fallback(nicheAgreement.applicantAddressNo, row.ApplicantAddressNo);
          nicheAgreement.applicantAddressLine1 = fallback(nicheAgreement.applicantAddressLine1, row.ApplicantAddressLine1);
          nicheAgreement.applicantAddressLine2 = fallback(nicheAgreement.applicantAddressLine2, row.ApplicantAddressLine2);
          nicheAgreement.applicantAddressCity = fallback(nicheAgreement.applicantAddressCity, row.ApplicantAddressCity);
          nicheAgreement.applicantAddressState = fallback(nicheAgreement.applicantAddressState, row.ApplicantAddressState);
          nicheAgreement.applicantAddressCountry = fallback(nicheAgreement.applicantAddressCountry, row.ApplicantAddressCountry);
          nicheAgreement.applicantEmailID = fallback(nicheAgreement.applicantEmailID, row.ApplicantEmailID);
          nicheAgreement.applicantIDNo = fallback(nicheAgreement.applicantIDNo, row.ApplicantIDNo);
          nicheAgreement.applicantMobileNo = fallback(nicheAgreement.applicantMobileNo, row.ApplicantMobileNo);
          nicheAgreement.applicantHomeTelNo = fallback(nicheAgreement.applicantHomeTelNo, row.ApplicantHomeTelNo);
          nicheAgreement.applicantOfficeTelNo = fallback(nicheAgreement.applicantOfficeTelNo, row.ApplicantOfficeTelNo);
          nicheAgreement.applicantIsCatholic = nicheAgreement.applicantIsCatholic !== null && nicheAgreement.applicantIsCatholic !== undefined
            ? nicheAgreement.applicantIsCatholic : row.ApplicantIsCatholic;

          // Build full address from the winning field values
          nicheAgreement.applicantFullAddress = AddressUtils.formatAddress({
            AddressNo: nicheAgreement.applicantAddressNo,
            Address: nicheAgreement.applicantAddressLine1,
            Address2: nicheAgreement.applicantAddressLine2,
            AddressCity: nicheAgreement.applicantAddressCity,
            DistrictCode: nicheAgreement.applicantAddressState,
            Country: nicheAgreement.applicantAddressCountry
          });
        }

        if (row.NomineeName) {
          nicheAgreement.nomineeName = fallback(nicheAgreement.nomineeName, row.NomineeName);
          nicheAgreement.nomineeAddressNo = fallback(nicheAgreement.nomineeAddressNo, row.NomineeAddressNo);
          nicheAgreement.nomineeAddressLine1 = fallback(nicheAgreement.nomineeAddressLine1, row.NomineeAddressLine1);
          nicheAgreement.nomineeAddressLine2 = fallback(nicheAgreement.nomineeAddressLine2, row.NomineeAddressLine2);
          nicheAgreement.nomineeAddressCity = fallback(nicheAgreement.nomineeAddressCity, row.NomineeAddressCity);
          nicheAgreement.nomineeAddressState = fallback(nicheAgreement.nomineeAddressState, row.NomineeAddressState);
          nicheAgreement.nomineeAddressCountry = fallback(nicheAgreement.nomineeAddressCountry, row.NomineeAddressCountry);
          nicheAgreement.nomineeEmailID = fallback(nicheAgreement.nomineeEmailID, row.NomineeEmailID);
          nicheAgreement.nomineeIDNo = fallback(nicheAgreement.nomineeIDNo, row.NomineeIDNo);
          nicheAgreement.nomineeMobileNo = fallback(nicheAgreement.nomineeMobileNo, row.NomineeMobileNo);
          nicheAgreement.nomineeHomeTelNo = fallback(nicheAgreement.nomineeHomeTelNo, row.NomineeHomeTelNo);
          nicheAgreement.nomineeOfficeTelNo = fallback(nicheAgreement.nomineeOfficeTelNo, row.NomineeOfficeTelNo);
          nicheAgreement.nomineeRelationship = fallback(nicheAgreement.nomineeRelationship, row.NomineeRelationship);

          nicheAgreement.nomineeFullAddress = AddressUtils.formatAddress({
            AddressNo: nicheAgreement.nomineeAddressNo,
            Address: nicheAgreement.nomineeAddressLine1,
            Address2: nicheAgreement.nomineeAddressLine2,
            AddressCity: nicheAgreement.nomineeAddressCity,
            DistrictCode: nicheAgreement.nomineeAddressState,
            Country: nicheAgreement.nomineeAddressCountry
          });
        }

        if (row.Nominee2Name) {
          nicheAgreement.nominee2Name = fallback(nicheAgreement.nominee2Name, row.Nominee2Name);
          nicheAgreement.nominee2AddressNo = fallback(nicheAgreement.nominee2AddressNo, row.Nominee2AddressNo);
          nicheAgreement.nominee2AddressLine1 = fallback(nicheAgreement.nominee2AddressLine1, row.Nominee2AddressLine1);
          nicheAgreement.nominee2AddressLine2 = fallback(nicheAgreement.nominee2AddressLine2, row.Nominee2AddressLine2);
          nicheAgreement.nominee2AddressCity = fallback(nicheAgreement.nominee2AddressCity, row.Nominee2AddressCity);
          nicheAgreement.nominee2AddressState = fallback(nicheAgreement.nominee2AddressState, row.Nominee2AddressState);
          nicheAgreement.nominee2AddressCountry = fallback(nicheAgreement.nominee2AddressCountry, row.Nominee2AddressCountry);
          nicheAgreement.nominee2EmailID = fallback(nicheAgreement.nominee2EmailID, row.Nominee2EmailID);
          nicheAgreement.nominee2IDNo = fallback(nicheAgreement.nominee2IDNo, row.Nominee2IDNo);
          nicheAgreement.nominee2MobileNo = fallback(nicheAgreement.nominee2MobileNo, row.Nominee2MobileNo);
          nicheAgreement.nominee2HomeTelNo = fallback(nicheAgreement.nominee2HomeTelNo, row.Nominee2HomeTelNo);
          nicheAgreement.nominee2OfficeTelNo = fallback(nicheAgreement.nominee2OfficeTelNo, row.Nominee2OfficeTelNo);
          nicheAgreement.nominee2Relationship = fallback(nicheAgreement.nominee2Relationship, row.Nominee2Relationship);

          nicheAgreement.nominee2FullAddress = AddressUtils.formatAddress({
            AddressNo: nicheAgreement.nominee2AddressNo,
            Address: nicheAgreement.nominee2AddressLine1,
            Address2: nicheAgreement.nominee2AddressLine2,
            AddressCity: nicheAgreement.nominee2AddressCity,
            DistrictCode: nicheAgreement.nominee2AddressState,
            Country: nicheAgreement.nominee2AddressCountry
          });
        }
      }
    } catch (error) {
      logger.warn('Could not fetch nominee info from Person table:', error.message);
      // Don't throw - nominee info from Person is optional, fallback to NicheApplication data
    }
  }

  /**
   * Add deceased information from NicheInscriptionRequest.
   * Storage period: StorageFrom = 1st Interment Date, StorageTo = 1st Interment Date + 30 years + 30 days.
   * Do NOT use NicheInscriptionRequest.StorageFrom/StorageTo or NicheBooking.StorageFrom.
   */
  async addDeceasedAndStorageInfo(nicheApplicationId, nicheAgreement) {
    try {
      const bookingResult = await executeQuery(
        `SELECT TOP 1 NicheBookingId FROM NicheBooking WITH (NOLOCK)
         WHERE NicheApplicationId = @nicheApplicationId
         ORDER BY NicheBookingId DESC`,
        { nicheApplicationId },
        { timeout: 10000 }
      );

      if (!bookingResult.recordset || bookingResult.recordset.length === 0) {
        this._setStorageFromIntermentDate(nicheAgreement);
        return;
      }

      const nicheBookingId = bookingResult.recordset[0].NicheBookingId;

      const inscriptionResult = await executeQuery(
        `SELECT TOP 1 NicheInscriptionRequestId FROM NicheInscriptionRequest WITH (NOLOCK)
         WHERE NicheBookingId = @nicheBookingId
         ORDER BY NicheInscriptionRequestId DESC`,
        { nicheBookingId },
        { timeout: 10000 }
      );

      let inscriptionRequestId = inscriptionResult.recordset?.length > 0
        ? inscriptionResult.recordset[0].NicheInscriptionRequestId
        : null;

      if (inscriptionRequestId) {
        try {
          const deceasedResult = await executeQuery(
            `SELECT TOP 2 NameOfDeceased, DateDied, InternmentDate, DeathCertificateNo
             FROM NicheInscriptionRequestDecesed WITH (NOLOCK)
             WHERE NicheInscriptionRequestId = @inscriptionRequestId
             ORDER BY NicheInscriptionRequestDecesedId`,
            { inscriptionRequestId },
            { timeout: 10000 }
          );

          if (deceasedResult.recordset?.length > 0) {
            const deceased1 = deceasedResult.recordset[0];
            nicheAgreement.nameOfDeceased1 = deceased1.NameOfDeceased;
            nicheAgreement.dateDied1 = deceased1.DateDied;
            nicheAgreement.internmentDate1 = deceased1.InternmentDate;
            nicheAgreement.deathCertificateNo1 = deceased1.DeathCertificateNo;
          }
          if (deceasedResult.recordset?.length > 1) {
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

      this._setStorageFromIntermentDate(nicheAgreement);
    } catch (error) {
      logger.warn('Could not fetch deceased and storage info:', error.message);
      this._setStorageFromIntermentDate(nicheAgreement);
    }
  }

  /**
   * Set storageFrom = 1st Interment Date, storageTo = 1st Interment Date + 30 years + 30 days.
   */
  _setStorageFromIntermentDate(nicheAgreement) {
    const d = nicheAgreement.internmentDate1;
    if (!d) return;
    nicheAgreement.storageFrom = d;
    try {
      const fromDate = d instanceof Date ? d : new Date(d);
      if (!isNaN(fromDate.getTime())) {
        const toDate = new Date(fromDate);
        toDate.setFullYear(toDate.getFullYear() + 30);
        toDate.setDate(toDate.getDate() + 30);
        nicheAgreement.storageTo = toDate.toISOString ? toDate.toISOString() : toDate;
      }
    } catch (e) {
      logger.warn('[addDeceasedAndStorageInfo] Could not calculate storageTo:', e?.message);
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
          idl.Quantity,
          idl.UnitAmount,
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
          itemName: detail.ItemName || 'Service Item',
          itemCode: detail.ItemCode,
          quantity: detail.Quantity || 1,
          unitPrice: detail.UnitAmount || detail.UnitPrice || 0,
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
  async addInscriptionInfo(applicationCode, nicheApplicationId, nicheAgreement, churchId) {
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
          const inscriptionData = await InscriptionInvoiceService.getInscriptionItems(inscription.InscriptionCode, churchId);

          if (inscriptionData && inscriptionData.items && Array.isArray(inscriptionData.items) && inscriptionData.items.length > 0) {
            const inscriptionItems = inscriptionData.items.map(inscriptionItem => {
              const price = inscriptionItem.Price || 0;
              const tax = (price * 9) / 100;
              return {
                itemId: inscriptionItem.ItemId || null,
                itemName: inscriptionItem.Name || inscriptionItem.ItemName || 'Inscription Item',
                itemCode: inscriptionItem.Code || inscriptionItem.ItemCode || null,
                itemPrice: price,
                itemDocType: inscriptionItem.DocType || 'INCR',
                quantity: 1,
                unitPrice: price,
                taxAmount: tax,
                lineTotal: price + tax,
                lineNet: price,
                unitAmount: price,
                payingAmount: price,
                totalPayingAmount: price,
                refDocNumber: inscription.InscriptionCode,
                refDocName: 'INCR',
                refType: 'INCR',
                outstandingAmount: 0,
                lineTotalAmount: price,
                lineTaxPercent: 9,
                lineTaxAmount: tax
              };
            });

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
