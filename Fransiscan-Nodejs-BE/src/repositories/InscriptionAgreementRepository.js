const { executeQuery } = require('../config/database');
const logger = require('../utils/logger');

/**
 * Repository for Inscription Agreement operations
 */
class InscriptionAgreementRepository {
  /**
   * Get inscription agreement details by inscription code
   * @param {string} inscriptionCode - Inscription request code
   * @param {number} churchId - Church ID for filtering (optional)
   * @returns {Promise<Object|null>} Inscription agreement details or null
   */
  async getAgreementDetailsByCode(inscriptionCode, churchId = null) {
    try {
      if (!inscriptionCode || inscriptionCode.trim().length === 0) {
        logger.warn('getAgreementDetailsByCode called with empty inscription code');
        return null;
      }

      const searchCode = inscriptionCode.trim();
      logger.info(`Fetching inscription agreement details for code: ${searchCode}, churchId: ${churchId}`);

      // Log detailed search information
      logger.info(`[DEBUG] Searching for inscription code: ${searchCode}`);
      if (churchId) {
        logger.info(`[DEBUG] Filtering by churchId: ${churchId}`);
      }

      // Handle ID-based lookup for INCR-ID format
      let query;
      let params;

      if (searchCode.match(/^INCR-\d+$/)) {
        // ID-based lookup: INCR-20623 format
        const inscriptionId = parseInt(searchCode.replace('INCR-', ''));
        logger.info(`Using ID-based lookup for inscription ID: ${inscriptionId}`);

        query = `
          SELECT 
            nir.NicheInscriptionRequestId,
            nir.Code AS InscriptionCode,
            nir.TranscationDate AS InscriptionCreatedOn,
            
            -- Applicant information from NicheInscriptionRequest (primary source)
            nir.ApplicantName,
            nir.ApplicantIDNo,
            nir.ApplicantEmailID,
            nir.ApplicantMobileNo,
            nir.ApplicantHomeTelNo,
            nir.ApplicantAddressNo,
            nir.ApplicantAddressLine1,
            nir.ApplicantAddressLine2,
            nir.ApplicantAddressCity,
            nir.ApplicantAddressState,
            nir.ApplicantAddressCountry,
            
            -- Niche information
            n.Code AS NicheCode,
            n.AppearanceDescription,
            r.Code AS RowCode,
            r.Name AS RowName,
            w.Code AS WallCode,
            w.Name AS WallName,
            c.Code AS ChapelCode,
            c.Name AS ChapelName,
            
            -- Booking information
            nb.BookedDate,
            nb.BookingStatus,
            
            -- Contact person information
            cp.Name AS ContactPersonName,
            cp.IDNo AS ContactPersonIDNo,
            cp.MobileNo AS ContactPersonMobile,
            cp.EmailID AS ContactPersonEmail,
            
            -- Nominee information
            nom1.Name AS NomineeName,
            nom1.IDNo AS NomineeIDNo,
            nom2.Name AS Nominee2Name,
            nom2.IDNo AS Nominee2IDNo,
            
            -- Deceased details
            nid.NameOfDeceased AS DeceasedName,
            nid.DateOfBirth AS DeceasedDateOfBirth,
            nid.DateDied AS DeceasedDateOfDeath,
            nid.InternmentDate AS DeceasedInternmentDate,
            nid.DeathCertificateNo AS DeceasedDeathCertificateNo,
            
            -- Inscription details
            nir.BibleInscriptionChoiceId,
            nir.BibleInscriptionChoiceNo,
            nir.AdditionalInscriptionPhrase,
            
            -- Bible choice information
            bic.BibleInscriptionChoiceNoValue,
            
            -- Storage period
            nir.StorageFrom,
            nir.StorageTo
            
          FROM NicheInscriptionRequest nir WITH(NOLOCK)
          INNER JOIN NicheBooking nb WITH(NOLOCK) ON nir.NicheBookingId = nb.NicheBookingId
          INNER JOIN NicheApplication na WITH(NOLOCK) ON nb.NicheApplicationId = na.NicheApplicationId
          INNER JOIN Niche n WITH(NOLOCK) ON na.NicheId = n.NicheId
          INNER JOIN NicheRow r WITH(NOLOCK) ON n.NicheRowlId = r.NicheRowlId
          INNER JOIN NicheWall w WITH(NOLOCK) ON r.NicheWallId = w.NicheWallId
          INNER JOIN Chapel c WITH(NOLOCK) ON w.ChapelId = c.ChapelId
          LEFT JOIN Person cp WITH(NOLOCK) ON nb.ContactPersonId = cp.PersonId
          LEFT JOIN Person nom1 WITH(NOLOCK) ON nb.NomineeId = nom1.PersonId
          LEFT JOIN Person nom2 WITH(NOLOCK) ON nb.NomineeId2 = nom2.PersonId
          LEFT JOIN NicheInscriptionRequestDecesed nid WITH(NOLOCK) ON nir.NicheInscriptionRequestId = nid.NicheInscriptionRequestId
          LEFT JOIN BibleInscriptionChoice bic WITH(NOLOCK) ON nir.BibleInscriptionChoiceId = bic.BibleInscriptionChoiceId
          WHERE nir.NicheInscriptionRequestId = @inscriptionId
            AND (
              nir.RefDocType = 'INCR' 
              OR (nir.Code LIKE 'I-%' AND nir.RefDocType IS NULL)
              OR nir.Code LIKE 'INCR-%'
            )
        `;

        params = { inscriptionId: inscriptionId };
      } else {
        // Code-based lookup (original logic)
        query = `
          SELECT 
            nir.NicheInscriptionRequestId,
            nir.Code AS InscriptionCode,
            nir.TranscationDate AS InscriptionCreatedOn,
            
            -- Applicant information from NicheInscriptionRequest (primary source)
            nir.ApplicantName,
            nir.ApplicantIDNo,
            nir.ApplicantEmailID,
            nir.ApplicantMobileNo,
            nir.ApplicantHomeTelNo,
            nir.ApplicantAddressNo,
            nir.ApplicantAddressLine1,
            nir.ApplicantAddressLine2,
            nir.ApplicantAddressCity,
            nir.ApplicantAddressState,
            nir.ApplicantAddressCountry,
            
            -- Niche information
            n.Code AS NicheCode,
            n.AppearanceDescription,
            r.Code AS RowCode,
            r.Name AS RowName,
            w.Code AS WallCode,
            w.Name AS WallName,
            c.Code AS ChapelCode,
            c.Name AS ChapelName,
            
            -- Booking information
            nb.BookedDate,
            nb.BookingStatus,
            
            -- Contact person information
            cp.Name AS ContactPersonName,
            cp.IDNo AS ContactPersonIDNo,
            cp.MobileNo AS ContactPersonMobile,
            cp.EmailID AS ContactPersonEmail,
            
            -- Nominee information
            nom1.Name AS NomineeName,
            nom1.IDNo AS NomineeIDNo,
            nom2.Name AS Nominee2Name,
            nom2.IDNo AS Nominee2IDNo,
            
            -- Deceased details
            nid.NameOfDeceased AS DeceasedName,
            nid.DateOfBirth AS DeceasedDateOfBirth,
            nid.DateDied AS DeceasedDateOfDeath,
            nid.InternmentDate AS DeceasedInternmentDate,
            nid.DeathCertificateNo AS DeceasedDeathCertificateNo,
            
            -- Inscription details
            nir.BibleInscriptionChoiceId,
            nir.BibleInscriptionChoiceNo,
            nir.AdditionalInscriptionPhrase,
            
            -- Bible choice information
            bic.BibleInscriptionChoiceNoValue,
            
            -- Storage period
            nir.StorageFrom,
            nir.StorageTo
            
          FROM NicheInscriptionRequest nir WITH(NOLOCK)
          INNER JOIN NicheBooking nb WITH(NOLOCK) ON nir.NicheBookingId = nb.NicheBookingId
          INNER JOIN NicheApplication na WITH(NOLOCK) ON nb.NicheApplicationId = na.NicheApplicationId
          INNER JOIN Niche n WITH(NOLOCK) ON na.NicheId = n.NicheId
          INNER JOIN NicheRow r WITH(NOLOCK) ON n.NicheRowlId = r.NicheRowlId
          INNER JOIN NicheWall w WITH(NOLOCK) ON r.NicheWallId = w.NicheWallId
          INNER JOIN Chapel c WITH(NOLOCK) ON w.ChapelId = c.ChapelId
          LEFT JOIN Person cp WITH(NOLOCK) ON nb.ContactPersonId = cp.PersonId
          LEFT JOIN Person nom1 WITH(NOLOCK) ON nb.NomineeId = nom1.PersonId
          LEFT JOIN Person nom2 WITH(NOLOCK) ON nb.NomineeId2 = nom2.PersonId
          LEFT JOIN NicheInscriptionRequestDecesed nid WITH(NOLOCK) ON nir.NicheInscriptionRequestId = nid.NicheInscriptionRequestId
          LEFT JOIN BibleInscriptionChoice bic WITH(NOLOCK) ON nir.BibleInscriptionChoiceId = bic.BibleInscriptionChoiceId
          WHERE nir.Code = @inscriptionCode
            AND (
              nir.RefDocType = 'INCR' 
              OR (nir.Code LIKE 'I-%' AND nir.RefDocType IS NULL)
              OR nir.Code LIKE 'INCR-%'
            )
        `;

        params = { inscriptionCode: searchCode };
      }

      if (churchId) {
        query += ' AND na.ChurchId = @churchId';
        params.churchId = churchId;
      }

      logger.info(`[DEBUG] Executing query with params:`, params);
      logger.info(`[DEBUG] Query: ${query}`);

      const result = await executeQuery(query, params, { timeout: 15000 });

      if (!result.recordset || result.recordset.length === 0) {
        logger.info(`No inscription agreement found for code: ${searchCode}`);

        // Debug: Log what we actually found in the database
        try {
          const debugQuery = `
            SELECT TOP 10 
              nir.Code, 
              nir.RefDocType, 
              nir.NicheInscriptionRequestId,
              na.ChurchId
            FROM NicheInscriptionRequest nir WITH(NOLOCK)
            LEFT JOIN NicheBooking nb WITH(NOLOCK) ON nir.NicheBookingId = nb.NicheBookingId
            LEFT JOIN NicheApplication na WITH(NOLOCK) ON nb.NicheApplicationId = na.NicheApplicationId
            WHERE nir.Code LIKE '%${searchCode}%'
            ORDER BY nir.NicheInscriptionRequestId DESC
          `;

          const debugResult = await executeQuery(debugQuery, {}, { timeout: 10000 });
          if (debugResult.recordset && debugResult.recordset.length > 0) {
            logger.info(`[DEBUG] Found similar records for code ${searchCode}:`,
              debugResult.recordset.map(r => ({
                code: r.Code,
                refDocType: r.RefDocType,
                id: r.NicheInscriptionRequestId,
                churchId: r.ChurchId
              }))
            );
          } else {
            logger.info(`[DEBUG] No similar records found for code ${searchCode}`);
          }
        } catch (debugError) {
          logger.warn(`[DEBUG] Failed to run debug query:`, debugError.message);
        }

        return null;
      }

      // Group results by inscription request (in case there are multiple deceased)
      const groupedResults = {};
      result.recordset.forEach(row => {
        const key = row.NicheInscriptionRequestId;
        if (!groupedResults[key]) {
          groupedResults[key] = {
            ...row,
            deceasedDetails: []
          };
        }

        // Add deceased details if present
        if (row.DeceasedName) {
          groupedResults[key].deceasedDetails.push({
            name: row.DeceasedName,
            dateOfBirth: row.DeceasedDateOfBirth,
            dateOfDeath: row.DeceasedDateOfDeath,
            internmentDate: row.DeceasedInternmentDate,
            deathCertificateNo: row.DeceasedDeathCertificateNo,
            inscriptionText: row.DeceasedInscriptionText
          });
        }
      });

      // Return the first (and typically only) inscription request
      const agreementDetails = Object.values(groupedResults)[0];

      // Try to fetch CrossType separately (column may not exist in all schemas)
      try {
        const ctResult = await executeQuery(
          `SELECT CrossType FROM NicheInscriptionRequest WITH(NOLOCK) WHERE NicheInscriptionRequestId = @id`,
          { id: agreementDetails.NicheInscriptionRequestId },
          { timeout: 3000 }
        );
        if (ctResult.recordset && ctResult.recordset.length > 0) {
          agreementDetails.CrossType = ctResult.recordset[0].CrossType || null;
        }
      } catch {
        agreementDetails.CrossType = null;
      }

      logger.info(`Found inscription agreement details for code: ${searchCode}`, {
        inscriptionId: agreementDetails.NicheInscriptionRequestId,
        code: agreementDetails.InscriptionCode,
        refDocType: agreementDetails.RefDocType,
        churchId: agreementDetails.ChurchId,
        deceasedCount: agreementDetails.deceasedDetails?.length || 0
      });

      return agreementDetails;
    } catch (error) {
      logger.error('Failed to get inscription agreement details:', error);
      throw error;
    }
  }

  /**
   * Get crystal reports information for inscription agreement
   * @param {string} inscriptionCode - Inscription request code
   * @param {number} churchId - Church ID for filtering (optional)
   * @returns {Promise<Object|null>} Crystal reports data or null
   */
  async getCrystalReportsInfo(inscriptionCode, churchId = null) {
    try {
      const agreementDetails = await this.getAgreementDetailsByCode(inscriptionCode, churchId);

      if (!agreementDetails) {
        return null;
      }

      // Format data specifically for Crystal Reports
      const crystalData = {
        // Header information
        InscriptionCode: agreementDetails.InscriptionCode,
        ApplicationCode: agreementDetails.ApplicationCode,
        AgreementDate: agreementDetails.InscriptionCreatedOn,

        // Applicant information
        ApplicantName: agreementDetails.ApplicantName,
        ApplicantNRIC: agreementDetails.ApplicantIDNo,
        ApplicantEmail: agreementDetails.ApplicantEmailID,
        ApplicantMobile: agreementDetails.ApplicantMobileNo,
        ApplicantPhone: agreementDetails.ApplicantHomeTelNo,
        ApplicantAddress: this.formatFullAddress(
          agreementDetails.ApplicantAddressNo,
          agreementDetails.ApplicantAddressLine1,
          agreementDetails.ApplicantAddressLine2,
          agreementDetails.ApplicantAddressCity,
          agreementDetails.ApplicantAddressState,
          agreementDetails.ApplicantAddressCountry
        ),

        // Niche information
        NicheCode: agreementDetails.NicheCode,
        Chapel: agreementDetails.ChapelName,
        Wall: agreementDetails.WallName,
        Row: agreementDetails.RowCode,
        NicheDescription: agreementDetails.AppearanceDescription,

        // Contact person
        ContactPersonName: agreementDetails.ContactPersonName,
        ContactPersonNRIC: agreementDetails.ContactPersonIDNo,
        ContactPersonMobile: agreementDetails.ContactPersonMobile,
        ContactPersonEmail: agreementDetails.ContactPersonEmail,

        // Nominees
        Nominee1Name: agreementDetails.NomineeName,
        Nominee1NRIC: agreementDetails.NomineeIDNo,
        Nominee2Name: agreementDetails.Nominee2Name,
        Nominee2NRIC: agreementDetails.Nominee2IDNo,

        // Inscription details
        BibleInscriptionChoice: agreementDetails.BibleInscriptionChoiceNoValue,
        BibleInscriptionText: agreementDetails.BibleInscriptionText,
        AdditionalInscriptionPhrase: agreementDetails.AdditionalInscriptionPhrase,
        InscriptionRemarks: agreementDetails.InscriptionRemarks,

        // Deceased details (formatted for report)
        DeceasedCount: agreementDetails.deceasedDetails.length,
        DeceasedDetails: agreementDetails.deceasedDetails.map(deceased => ({
          Name: deceased.name,
          DateOfBirth: deceased.dateOfBirth,
          DateOfDeath: deceased.dateOfDeath,
          InternmentDate: deceased.internmentDate,
          DeathCertificateNo: deceased.deathCertificateNo,
          InscriptionText: deceased.inscriptionText
        }))
      };

      logger.info(`Prepared Crystal Reports data for inscription: ${inscriptionCode}`);
      return crystalData;
    } catch (error) {
      logger.error('Failed to get Crystal Reports info:', error);
      throw error;
    }
  }

  /**
   * Get PDF data for frontend generation
   * @param {string} inscriptionCode - Inscription request code
   * @param {number} churchId - Church ID for filtering (optional)
   * @returns {Promise<Object|null>} PDF generation data or null
   */
  async getPdfData(inscriptionCode, churchId = null) {
    try {
      const agreementDetails = await this.getAgreementDetailsByCode(inscriptionCode, churchId);

      if (!agreementDetails) {
        return null;
      }

      // Format data for PDF generation
      const pdfData = {
        // Document metadata
        documentTitle: 'Inscription Agreement',
        inscriptionCode: agreementDetails.InscriptionCode,
        applicationCode: agreementDetails.ApplicationCode,
        createdDate: agreementDetails.InscriptionCreatedOn,

        // Applicant section (include structured address fields for proper formatting)
        applicant: {
          name: agreementDetails.ApplicantName,
          nric: agreementDetails.ApplicantIDNo,
          email: agreementDetails.ApplicantEmailID,
          mobile: agreementDetails.ApplicantMobileNo,
          phone: agreementDetails.ApplicantHomeTelNo,
          address: this.formatFullAddress(
            agreementDetails.ApplicantAddressNo,
            agreementDetails.ApplicantAddressLine1,
            agreementDetails.ApplicantAddressLine2,
            agreementDetails.ApplicantAddressCity,
            agreementDetails.ApplicantAddressState,
            agreementDetails.ApplicantAddressCountry
          ),
          addressNo: agreementDetails.ApplicantAddressNo,
          addressLine1: agreementDetails.ApplicantAddressLine1,
          addressLine2: agreementDetails.ApplicantAddressLine2,
          addressCity: agreementDetails.ApplicantAddressCity,
          addressState: agreementDetails.ApplicantAddressState,
          addressCountry: agreementDetails.ApplicantAddressCountry
        },

        // Niche details
        niche: {
          code: agreementDetails.NicheCode,
          chapel: agreementDetails.ChapelName,
          wall: agreementDetails.WallName,
          row: agreementDetails.RowCode,
          description: agreementDetails.AppearanceDescription
        },

        // Contact person
        contactPerson: {
          name: agreementDetails.ContactPersonName,
          nric: agreementDetails.ContactPersonIDNo,
          mobile: agreementDetails.ContactPersonMobile,
          email: agreementDetails.ContactPersonEmail
        },

        // Nominees
        nominees: [
          agreementDetails.NomineeName ? {
            name: agreementDetails.NomineeName,
            nric: agreementDetails.NomineeIDNo
          } : null,
          agreementDetails.Nominee2Name ? {
            name: agreementDetails.Nominee2Name,
            nric: agreementDetails.Nominee2IDNo
          } : null
        ].filter(Boolean),

        // Inscription details
        inscription: {
          bibleChoiceId: agreementDetails.BibleInscriptionChoiceId,
          bibleChoiceText: agreementDetails.BibleInscriptionChoiceNoValue,
          bibleText: agreementDetails.BibleInscriptionText,
          additionalPhrase: agreementDetails.AdditionalInscriptionPhrase,
          remarks: agreementDetails.InscriptionRemarks,
          crossType: agreementDetails.CrossType || 'Crucifix'
        },

        // Deceased details
        deceased: agreementDetails.deceasedDetails,

        // Storage period (using internmentDate as fallback)
        storage: {
          storageFrom: agreementDetails.StorageFrom || agreementDetails.deceasedDetails?.[0]?.internmentDate || null,
          storageTo: agreementDetails.StorageTo || agreementDetails.deceasedDetails?.[0]?.internmentDate || null
        },

        // Status information
        status: this.getStatusText(agreementDetails.InscriptionStatus),
        formattedDate: new Date(agreementDetails.InscriptionCreatedOn).toLocaleDateString('en-SG', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
      };

      logger.info(`Prepared PDF data for inscription: ${inscriptionCode}`);
      return pdfData;
    } catch (error) {
      logger.error('Failed to get PDF data:', error);
      throw error;
    }
  }

  /**
   * Helper method to format full address
   * @private
   */
  formatFullAddress(no, line1, line2, city, state, country) {
    const parts = [];
    if (no) parts.push(no);
    if (line1) parts.push(line1);
    if (line2) parts.push(line2);
    if (city) parts.push(city);
    if (state) parts.push(state);
    if (country) parts.push(country);
    return parts.join(', ') || '';
  }

  /**
   * Helper method to get status text
   * @private
   */
  getStatusText(status) {
    switch (status) {
      case 1: return 'Draft';
      case 2: return 'Pending';
      case 3: return 'Confirmed';
      default: return 'Unknown';
    }
  }
}

module.exports = new InscriptionAgreementRepository();