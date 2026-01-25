const { executeQuery } = require('../config/database');
const NicheConcentForm = require('../models/NicheConcentForm');
const logger = require('../utils/logger');

class NicheConcentFormRepository {
  async getByCode(code) {
    try {
      // CRITICAL OPTIMIZATION: Add WITH (NOLOCK) and timeout for better performance
      // Use shorter timeout for consent form query (5s should be enough)
      // This prevents connection pool exhaustion and improves response times
      const query = `
        SELECT TOP 1 *
        FROM NicheConcentForm WITH (NOLOCK)
        WHERE Code = @code
      `;

      const result = await executeQuery(query, { code }, { timeout: 5000 });
      if (!result.recordset || result.recordset.length === 0) {
        return null;
      }

      return new NicheConcentForm(result.recordset[0]);
    } catch (error) {
      // Don't fail if consent form query fails - it's optional data
      // Log warning and return null instead of throwing
      const isTimeoutError = 
        error.code === 'ETIMEOUT' ||
        error.code === 'ETIMEDOUT' ||
        error.message?.includes('timeout') ||
        error.message?.includes('Timeout');
      
      if (isTimeoutError) {
        logger.warn(`Consent form query timed out for code ${code}:`, error.message);
      } else {
        logger.warn(`Failed to fetch niche consent form by code ${code}:`, error.message);
      }
      
      // Return null instead of throwing to prevent breaking the main query
      return null;
    }
  }

  async upsert(formData) {
    try {
      const form = formData instanceof NicheConcentForm ? formData : new NicheConcentForm(formData);

      const validation = form.validate();
      if (!validation.isValid) {
        const error = new Error(`Consent form validation failed: ${validation.errors.join(', ')}`);
        error.code = 'CONSENT_FORM_VALIDATION_FAILED';
        throw error;
      }

      const existing = await this.getByCode(form.code);
      const persistence = form.toPersistence();

      if (existing && existing.nicheConcentFormId) {
        const updateQuery = `
          UPDATE NicheConcentForm
          SET
            Status = @status,
            AppliedDate = @appliedDate,
            AgreementDate = @agreementDate,
            ApplicantName = @applicantName,
            ApplicantIDNo = @applicantIDNo,
            ApplicantRelationship = @applicantRelationship,
            NicheId = @nicheId,
            NomineeName = @nomineeName,
            NomineeIDNo = @nomineeIDNo,
            NomineeRelationship = @nomineeRelationship,
            NomineeName2 = @nomineeName2,
            NomineeIDNo2 = @nomineeIDNo2,
            NomineeRelationship2 = @nomineeRelationship2,
            ChurchId = @churchId,
            UserId = @userId,
            Bene1Name = @bene1Name,
            Bene1RelationshipToApplicant = @bene1RelationshipToApplicant,
            Bene1IDNo = @bene1IDNo,
            Bene2Name = @bene2Name,
            Bene2RelationshipToApplicant = @bene2RelationshipToApplicant,
            Bene2IDNo = @bene2IDNo,
            Bene3Name = @bene3Name,
            Bene3RelationshipToApplicant = @bene3RelationshipToApplicant,
            Bene3IDNo = @bene3IDNo
          OUTPUT INSERTED.*
          WHERE NicheConcentFormId = @nicheConcentFormId
        `;

        const updateParams = {
          ...persistence,
          nicheConcentFormId: existing.nicheConcentFormId
        };

        const updateResult = await executeQuery(updateQuery, updateParams);
        return new NicheConcentForm(updateResult.recordset[0]);
      }

      const insertQuery = `
        INSERT INTO NicheConcentForm (
          Status,
          AppliedDate,
          AgreementDate,
          ApplicantName,
          ApplicantIDNo,
          ApplicantRelationship,
          NicheId,
          NomineeName,
          NomineeIDNo,
          NomineeRelationship,
          NomineeName2,
          NomineeIDNo2,
          NomineeRelationship2,
          Code,
          ChurchId,
          UserId,
          Bene1Name,
          Bene1RelationshipToApplicant,
          Bene1IDNo,
          Bene2Name,
          Bene2RelationshipToApplicant,
          Bene2IDNo,
          Bene3Name,
          Bene3RelationshipToApplicant,
          Bene3IDNo
        )
        OUTPUT INSERTED.*
        VALUES (
          @status,
          @appliedDate,
          @agreementDate,
          @applicantName,
          @applicantIDNo,
          @applicantRelationship,
          @nicheId,
          @nomineeName,
          @nomineeIDNo,
          @nomineeRelationship,
          @nomineeName2,
          @nomineeIDNo2,
          @nomineeRelationship2,
          @code,
          @churchId,
          @userId,
          @bene1Name,
          @bene1RelationshipToApplicant,
          @bene1IDNo,
          @bene2Name,
          @bene2RelationshipToApplicant,
          @bene2IDNo,
          @bene3Name,
          @bene3RelationshipToApplicant,
          @bene3IDNo
        )
      `;

      const insertParams = {
        ...persistence,
        code: form.code
      };

      const insertResult = await executeQuery(insertQuery, insertParams);
      return new NicheConcentForm(insertResult.recordset[0]);
    } catch (error) {
      logger.error('Failed to upsert niche consent form:', error);
      throw error;
    }
  }
}

module.exports = new NicheConcentFormRepository();

