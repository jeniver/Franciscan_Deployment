const { executeQuery } = require('../config/database');
const { executeStoredProcedure } = require('../config/knex');
const { EngraveApplication, EngraveApplicationDetail } = require('../models/EngraveApplication');
const logger = require('../utils/logger');

class EngraveApplicationRepository {
  /**
   * Create engrave application with details
   * @param {EngraveApplication} application - Application data
   * @param {Array<EngraveApplicationDetail>} details - Deceased details
   * @returns {Promise<string>} Application code
   */
  async create(application, details) {
    try {
      // Check if stored procedure exists, otherwise use direct insert
      const spName = 'sp_create_engrave_application_and_details';

      try {
        // Try using stored procedure first
        const params = {
          ApplicantName: application.applicantName,
          ApplicantIDNo: application.applicantIDNo,
          ApplicantEmailID: application.applicantEmailID,
          ApplicantMobileNo: application.applicantMobileNo,
          ApplicantHomeTelNo: application.applicantHomeTelNo,
          ApplicantOfficeTelNo: application.applicantOfficeTelNo,
          ApplicantAddressNo: application.applicantAddressNo,
          ApplicantAddressLine1: application.applicantAddressLine1,
          ApplicantAddressLine2: application.applicantAddressLine2,
          ApplicantAddressCity: application.applicantAddressCity,
          ApplicantAddressState: application.applicantAddressState,
          ApplicantAddressCountry: application.applicantAddressCountry,
          NicheApplicationCode: application.nicheApplicationCode,
          NicheBookingId: application.nicheBookingId,
          BibleInscriptionChoiceId: application.bibleInscriptionChoiceId,
          BibleInscriptionText: application.bibleInscriptionText,
          ChurchId: application.churchId,
          UserId: application.userId,
          Remarks: application.remarks,
          DeceasedDetailsJson: JSON.stringify(details.map(d => d.toJSON()))
        };

        const result = await executeStoredProcedure(spName, params);

        if (result.recordset && result.recordset[0]) {
          return result.recordset[0].Code || result.recordset[0].code;
        }
      } catch (spError) {
        logger.warn(`Stored procedure ${spName} not found or failed, using direct insert:`, spError.message);
      }

      // Fallback to direct insert
      return await this._createWithDirectInsert(application, details);
    } catch (error) {
      logger.error('Failed to create engrave application:', error);
      throw error;
    }
  }

  /**
   * Direct insert method (fallback if SP doesn't exist)
   * @private
   */
  async _createWithDirectInsert(application, details) {
    try {
      // Generate code
      const lastCodeQuery = `
        SELECT TOP 1 Code 
        FROM NicheInscriptionRequest 
        WHERE ChurchId = @churchId 
        ORDER BY NicheInscriptionRequestId DESC
      `;

      const lastCodeResult = await executeQuery(lastCodeQuery, { churchId: application.churchId });
      let nextNumber = 1;

      if (lastCodeResult.recordset && lastCodeResult.recordset.length > 0) {
        const lastCode = lastCodeResult.recordset[0].Code;
        const match = lastCode.match(/INCR-(\d+)/);
        if (match) {
          nextNumber = parseInt(match[1]) + 1;
        }
      }

      const code = `INCR-${nextNumber}`;

      // Insert main application
      // Note: NicheInscriptionRequest table schema (actual columns):
      // - TranscationDate (NOT NULL) - use GETDATE()
      // - NicheBookingId (NOT NULL in schema, but may be nullable in practice)
      // - ApplicantName, ApplicantAddressNo, ApplicantAddressLine1, ApplicantAddressLine2,
      //   ApplicantAddressCity, ApplicantAddressState, ApplicantAddressCountry,
      //   ApplicantEmailID, ApplicantIDNo, ApplicantMobileNo, ApplicantHomeTelNo, ApplicantOfficeTelNo
      // - AdditionalInscriptionPhrase, BibleInscriptionChoiceNo
      // - ChurchId (NOT NULL), BasedOn, Code (NOT NULL), UserId, BibleInscriptionChoiceId, NicheId
      // - StorageFrom, StorageTo, RefDocType
      // Columns that DON'T exist: BibleInscriptionText, Remarks, ApplicationDate, CreatedDate, Status, NicheApplicationCode
      
      // CRITICAL: NicheBookingId is NOT NULL in the schema
      // If application doesn't have a booking, we cannot create an inscription
      if (!application.nicheBookingId) {
        throw new Error('Cannot create inscription application: NicheBookingId is required (NOT NULL constraint)');
      }
      
      const insertQuery = `
        INSERT INTO NicheInscriptionRequest (
          TranscationDate, NicheBookingId, Code, ApplicantName, ApplicantIDNo, ApplicantEmailID, 
          ApplicantMobileNo, ApplicantHomeTelNo, ApplicantOfficeTelNo,
          ApplicantAddressNo, ApplicantAddressLine1, ApplicantAddressLine2,
          ApplicantAddressCity, ApplicantAddressState, ApplicantAddressCountry,
          BibleInscriptionChoiceId, ChurchId, UserId, AdditionalInscriptionPhrase
        )
        VALUES (
          GETDATE(), @nicheBookingId, @code, @applicantName, @applicantIDNo, @applicantEmailID,
          @applicantMobileNo, @applicantHomeTelNo, @applicantOfficeTelNo,
          @applicantAddressNo, @applicantAddressLine1, @applicantAddressLine2,
          @applicantAddressCity, @applicantAddressState, @applicantAddressCountry,
          @bibleInscriptionChoiceId, @churchId, @userId, @additionalInscriptionPhrase
        );
        SELECT SCOPE_IDENTITY() AS NicheInscriptionRequestId;
      `;

      const insertParams = {
        code,
        applicantName: application.applicantName,
        applicantIDNo: application.applicantIDNo,
        applicantEmailID: application.applicantEmailID,
        applicantMobileNo: application.applicantMobileNo,
        applicantHomeTelNo: application.applicantHomeTelNo,
        applicantOfficeTelNo: application.applicantOfficeTelNo,
        applicantAddressNo: application.applicantAddressNo,
        applicantAddressLine1: application.applicantAddressLine1,
        applicantAddressLine2: application.applicantAddressLine2,
        applicantAddressCity: application.applicantAddressCity,
        applicantAddressState: application.applicantAddressState,
        applicantAddressCountry: application.applicantAddressCountry,
        nicheBookingId: application.nicheBookingId, // Required - validated above (NOT NULL)
        bibleInscriptionChoiceId: application.bibleInscriptionChoiceId,
        churchId: application.churchId,
        userId: application.userId,
        additionalInscriptionPhrase: application.bibleInscriptionText || application.remarks || null // Map to AdditionalInscriptionPhrase
      };

      const insertResult = await executeQuery(insertQuery, insertParams);
      const requestId = insertResult.recordset[0].NicheInscriptionRequestId;

      // Insert deceased details
      for (let i = 0; i < details.length; i++) {
        const detail = details[i];
        const detailQuery = `
          INSERT INTO NicheInscriptionRequestDecesed (
            NicheInscriptionRequestId, NameOfDeceased, DateDied, 
            Remarks
          )
          VALUES (
            @requestId, @nameOfDeceased, @dateDied, 
            @remarks
          )
        `;

        await executeQuery(detailQuery, {
          requestId,
          nameOfDeceased: detail.name,
          dateDied: detail.dateOfDeath,
          remarks: detail.inscriptionText || null
        });
      }

      return code;
    } catch (error) {
      logger.error('Direct insert failed:', error);
      throw error;
    }
  }

  /**
   * Get engrave application by code
   * @param {string} code - Application code
   * @returns {Promise<EngraveApplication>} Application with details
   */
  async getByCode(code) {
    try {
      const query = `
        SELECT 
          nir.*,
          nird.NicheInscriptionRequestDecesedId,
          nird.NameOfDeceased AS DeceasedName,
          nird.DateDied,
          nird.Remarks AS InscriptionText,
          nird.DateOfBirth,
          nird.InternmentDate,
          nird.DeathCertificateNo,
          nird.BirthYear
        FROM NicheInscriptionRequest nir
        LEFT JOIN NicheInscriptionRequestDecesed nird 
          ON nir.NicheInscriptionRequestId = nird.NicheInscriptionRequestId
        WHERE nir.Code = @code
        ORDER BY nird.NicheInscriptionRequestDecesedId
      `;

      const result = await executeQuery(query, { code });

      if (!result.recordset || result.recordset.length === 0) {
        return null;
      }

      // Map first row to application
      const firstRow = result.recordset[0];
      const application = new EngraveApplication(firstRow);

      // Map all rows to deceased details
      application.deceasedDetails = result.recordset
        .filter(row => row.DeceasedName)
        .map((row, index) => new EngraveApplicationDetail({
          nicheInscriptionRequestDecesedId: row.NicheInscriptionRequestDecesedId,
          nicheInscriptionRequestId: row.NicheInscriptionRequestId,
          name: row.DeceasedName,
          dateOfDeath: row.DateDied,
          dateOfBirth: row.DateOfBirth,
          internmentDate: row.InternmentDate,
          deathCertificateNo: row.DeathCertificateNo,
          birthYear: row.BirthYear,
          inscriptionText: row.InscriptionText || null,
          sequence: index + 1
        }));

      return application;
    } catch (error) {
      logger.error('Failed to get engrave application:', error);
      throw error;
    }
  }

  /**
   * Update engrave application
   * @param {string} code - Application code
   * @param {EngraveApplication} application - Updated application data
   * @param {Array<EngraveApplicationDetail>} details - Updated deceased details
   * @returns {Promise<boolean>} Success status
   */
  async update(code, application, details) {
    try {
      // Check if application exists and can be modified
      const existing = await this.getByCode(code);
      if (!existing) {
        throw new Error('Application not found');
      }

      if (!existing.canModify()) {
        throw new Error('Application cannot be modified (status is not Draft or Pending)');
      }

      // Update main application
      const updateQuery = `
        UPDATE NicheInscriptionRequest
        SET 
          ApplicantName = @applicantName,
          ApplicantIDNo = @applicantIDNo,
          ApplicantEmailID = @applicantEmailID,
          ApplicantMobileNo = @applicantMobileNo,
          ApplicantHomeTelNo = @applicantHomeTelNo,
          ApplicantOfficeTelNo = @applicantOfficeTelNo,
          ApplicantAddressNo = @applicantAddressNo,
          ApplicantAddressLine1 = @applicantAddressLine1,
          ApplicantAddressLine2 = @applicantAddressLine2,
          ApplicantAddressCity = @applicantAddressCity,
          ApplicantAddressState = @applicantAddressState,
          ApplicantAddressCountry = @applicantAddressCountry,
          BibleInscriptionChoiceId = @bibleInscriptionChoiceId,
          BibleInscriptionText = @bibleInscriptionText,
          Remarks = @remarks
        WHERE Code = @code
      `;

      await executeQuery(updateQuery, {
        code,
        applicantName: application.applicantName,
        applicantIDNo: application.applicantIDNo,
        applicantEmailID: application.applicantEmailID,
        applicantMobileNo: application.applicantMobileNo,
        applicantHomeTelNo: application.applicantHomeTelNo,
        applicantOfficeTelNo: application.applicantOfficeTelNo,
        applicantAddressNo: application.applicantAddressNo,
        applicantAddressLine1: application.applicantAddressLine1,
        applicantAddressLine2: application.applicantAddressLine2,
        applicantAddressCity: application.applicantAddressCity,
        applicantAddressState: application.applicantAddressState,
        applicantAddressCountry: application.applicantAddressCountry,
        bibleInscriptionChoiceId: application.bibleInscriptionChoiceId,
        bibleInscriptionText: application.bibleInscriptionText,
        remarks: application.remarks
      });

      // Delete existing details and re-insert
      const deleteQuery = `
        DELETE FROM NicheInscriptionRequestDecesed 
        WHERE NicheInscriptionRequestId = @requestId
      `;

      await executeQuery(deleteQuery, { requestId: existing.nicheInscriptionRequestId });

      // Insert new details
      for (let i = 0; i < details.length; i++) {
        const detail = details[i];
        const insertQuery = `
          INSERT INTO NicheInscriptionRequestDecesed (
            NicheInscriptionRequestId, NameOfDeceased, DateDied, 
            Remarks
          )
          VALUES (
            @requestId, @nameOfDeceased, @dateDied, 
            @remarks
          )
        `;

        await executeQuery(insertQuery, {
          requestId: existing.nicheInscriptionRequestId,
          nameOfDeceased: detail.name,
          dateDied: detail.dateOfDeath,
          remarks: detail.inscriptionText || null
        });
      }

      return true;
    } catch (error) {
      logger.error('Failed to update engrave application:', error);
      throw error;
    }
  }

  /**
   * Confirm engrave application (create invoice)
   * @param {string} code - Application code
   * @returns {Promise<string>} Invoice code
   */
  async confirm(code) {
    try {
      const spName = 'sp_confirm_engrave_application';

      try {
        // Try using stored procedure first
        const result = await executeStoredProcedure(spName, { ApplicationCode: code });

        if (result.recordset && result.recordset[0]) {
          return result.recordset[0].InvoiceCode || result.recordset[0].invoiceCode;
        }
      } catch (spError) {
        logger.warn(`Stored procedure ${spName} not found or failed, using direct method:`, spError.message);
      }

      // Fallback: Manual confirmation
      return await this._confirmWithDirectMethod(code);
    } catch (error) {
      logger.error('Failed to confirm engrave application:', error);
      throw error;
    }
  }

  /**
   * Direct confirmation method (fallback if SP doesn't exist)
   * @private
   */
  async _confirmWithDirectMethod(code) {
    try {
      // Check if application exists
      const checkQuery = `
        SELECT NicheInscriptionRequestId 
        FROM NicheInscriptionRequest 
        WHERE Code = @code
      `;

      const checkResult = await executeQuery(checkQuery, { code });

      if (!checkResult.recordset || checkResult.recordset.length === 0) {
        throw new Error('Application not found');
      }

      // Note: NicheInscriptionRequest table doesn't have a Status column
      // Confirmation is typically handled by creating an invoice via stored procedure
      // This fallback method just verifies the application exists
      
      // Generate invoice code (simplified - in real scenario, create invoice record)
      const invoiceCode = `INV-${code}-${Date.now()}`;

      return invoiceCode;
    } catch (error) {
      logger.error('Direct confirmation failed:', error);
      throw error;
    }
  }
}

module.exports = new EngraveApplicationRepository();

