const InscriptionAgreementRepository = require('../repositories/InscriptionAgreementRepository');
const logger = require('../utils/logger');
const MailService = require('./MailService');

/**
 * Service for Inscription Agreement operations
 */
class InscriptionAgreementService {
  /**
   * Get inscription agreement details by code
   * @param {string} inscriptionCode - Inscription request code
   * @param {number} churchId - Church ID for filtering (optional)
   * @returns {Promise<Object>} Inscription agreement details
   */
  async getAgreementDetails(inscriptionCode, churchId = null) {
    try {
      logger.info(`[InscriptionAgreementService.getAgreementDetails] Getting details for inscription: ${inscriptionCode}, churchId: ${churchId}`);

      const details = await InscriptionAgreementRepository.getAgreementDetailsByCode(inscriptionCode, churchId);

      if (!details) {
        const error = new Error(`Inscription agreement not found for code: ${inscriptionCode}`);
        error.code = 'NOT_FOUND';
        throw error;
      }

      logger.info(`[InscriptionAgreementService.getAgreementDetails] Successfully retrieved details for inscription: ${inscriptionCode}`);
      return details;
    } catch (error) {
      logger.error(`[InscriptionAgreementService.getAgreementDetails] Failed to get details:`, error);

      if (error.code === 'NOT_FOUND') {
        throw error;
      }

      const serviceError = new Error('Failed to retrieve inscription agreement details');
      serviceError.code = 'SERVICE_ERROR';
      serviceError.originalError = error;
      throw serviceError;
    }
  }

  /**
   * Get crystal reports information for inscription agreement
   * @param {string} inscriptionCode - Inscription request code
   * @param {number} churchId - Church ID for filtering (optional)
   * @returns {Promise<Object>} Crystal reports data
   */
  async getCrystalReportsInfo(inscriptionCode, churchId = null) {
    try {
      logger.info(`[InscriptionAgreementService.getCrystalReportsInfo] Getting Crystal Reports data for inscription: ${inscriptionCode}`);

      const reportsData = await InscriptionAgreementRepository.getCrystalReportsInfo(inscriptionCode, churchId);

      if (!reportsData) {
        const error = new Error(`Inscription agreement not found for Crystal Reports: ${inscriptionCode}`);
        error.code = 'NOT_FOUND';
        throw error;
      }

      logger.info(`[InscriptionAgreementService.getCrystalReportsInfo] Successfully prepared Crystal Reports data for inscription: ${inscriptionCode}`);
      return reportsData;
    } catch (error) {
      logger.error(`[InscriptionAgreementService.getCrystalReportsInfo] Failed to get Crystal Reports data:`, error);

      if (error.code === 'NOT_FOUND') {
        throw error;
      }

      const serviceError = new Error('Failed to prepare Crystal Reports data');
      serviceError.code = 'SERVICE_ERROR';
      serviceError.originalError = error;
      throw serviceError;
    }
  }

  /**
   * Get PDF data for frontend generation
   * @param {string} inscriptionCode - Inscription request code
   * @param {number} churchId - Church ID for filtering (optional)
   * @returns {Promise<Object>} PDF generation data
   */
  async getPdfData(inscriptionCode, churchId = null) {
    try {
      logger.info(`[InscriptionAgreementService.getPdfData] Getting PDF data for inscription: ${inscriptionCode}`);

      const pdfData = await InscriptionAgreementRepository.getPdfData(inscriptionCode, churchId);

      if (!pdfData) {
        const error = new Error(`Inscription agreement not found for PDF generation: ${inscriptionCode}`);
        error.code = 'NOT_FOUND';
        throw error;
      }

      // Add additional formatting for PDF generation
      const enhancedPdfData = this.enhancePdfData(pdfData);

      logger.info(`[InscriptionAgreementService.getPdfData] Successfully prepared PDF data for inscription: ${inscriptionCode}`);
      return enhancedPdfData;
    } catch (error) {
      logger.error(`[InscriptionAgreementService.getPdfData] Failed to get PDF data:`, error);

      if (error.code === 'NOT_FOUND') {
        throw error;
      }

      const serviceError = new Error('Failed to prepare PDF data');
      serviceError.code = 'SERVICE_ERROR';
      serviceError.originalError = error;
      throw serviceError;
    }
  }

  /**
   * Enhance PDF data with additional formatting and computed fields
   * @private
   */
  enhancePdfData(pdfData) {
    const formatSafeDate = (rawValue) => {
      if (!rawValue) return '';
      const value = String(rawValue).trim();
      const parsed = new Date(value);
      if (!isNaN(parsed.getTime())) {
        return parsed.toLocaleDateString('en-SG');
      }

      // Fallback for values like "17-Feb-2026" that can be locale-dependent
      const ddMmmYyyy = /^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/;
      const match = value.match(ddMmmYyyy);
      if (match) {
        const [, d, m, y] = match;
        const monthMap = {
          Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
          Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11
        };
        const month = monthMap[m];
        if (month !== undefined) {
          const dt = new Date(Number(y), month, Number(d));
          if (!isNaN(dt.getTime())) {
            return dt.toLocaleDateString('en-SG');
          }
        }
      }

      // Keep original instead of blank if parsing fails.
      return value;
    };

    // Add computed fields
    const enhanced = {
      ...pdfData,
      // Document settings
      document: {
        title: 'INSCRIPTION AGREEMENT',
        subtitle: 'Franciscan Cemetery',
        date: pdfData.formattedDate,
        reference: `Inscription: ${pdfData.inscriptionCode}`
      },

      // Enhanced applicant section
      applicant: {
        ...pdfData.applicant,
        fullContact: [
          pdfData.applicant.mobile,
          pdfData.applicant.phone,
          pdfData.applicant.email
        ].filter(Boolean).join(' | ')
      },

      // Enhanced niche section
      niche: {
        ...pdfData.niche,
        fullLocation: [
          pdfData.niche.chapel,
          pdfData.niche.wall ? `Wall ${pdfData.niche.wall}` : null,
          pdfData.niche.row ? `Row ${pdfData.niche.row}` : null,
          `Niche ${pdfData.niche.code}`
        ].filter(Boolean).join(' - ')
      },

      // Enhanced inscription details
      inscription: {
        ...pdfData.inscription,
        hasBibleText: !!pdfData.inscription.bibleText,
        hasAdditionalPhrase: !!pdfData.inscription.additionalPhrase,
        fullInscription: [
          pdfData.inscription.bibleChoiceText,
          pdfData.inscription.bibleText,
          pdfData.inscription.additionalPhrase
        ].filter(Boolean).join('\n\n')
      },

      // Enhanced deceased section
      deceased: pdfData.deceased.map((person, index) => ({
        ...person,
        index: index + 1,
        fullName: `(${index + 1}) ${person.name}`,
        formattedDates: {
          birth: formatSafeDate(person.dateOfBirth),
          death: formatSafeDate(person.dateOfDeath),
          internment: formatSafeDate(person.internmentDate)
        }
      })),

      // Summary information
      summary: {
        totalDeceased: pdfData.deceased.length,
        hasMultipleDeceased: pdfData.deceased.length > 1,
        inscriptionType: pdfData.inscription.bibleChoiceText ? 'Bible Inscription' : 'Custom Inscription',
        hasRemarks: !!pdfData.inscription.remarks
      }
    };

    return enhanced;
  }

  /**
   * Validate inscription agreement for generation
   * @param {string} inscriptionCode - Inscription request code
   * @param {number} churchId - Church ID for filtering (optional)
   * @returns {Promise<Object>} Validation result
   */
  async validateAgreement(inscriptionCode, churchId = null) {
    try {
      logger.info(`[InscriptionAgreementService.validateAgreement] Validating inscription: ${inscriptionCode}`);

      const details = await this.getAgreementDetails(inscriptionCode, churchId);

      const validationResult = {
        isValid: true,
        errors: [],
        warnings: []
      };

      // Check required fields
      if (!details.ApplicantName) {
        validationResult.isValid = false;
        validationResult.errors.push('Applicant name is required');
      }

      if (!details.NicheCode) {
        validationResult.isValid = false;
        validationResult.errors.push('Niche information is required');
      }

      if (!details.deceasedDetails || details.deceasedDetails.length === 0) {
        validationResult.warnings.push('No deceased details found');
      }

      // Check inscription status
      if (details.InscriptionStatus !== 3) { // Assuming 3 = Confirmed
        validationResult.warnings.push('Inscription is not confirmed');
      }

      logger.info(`[InscriptionAgreementService.validateAgreement] Validation result for ${inscriptionCode}: ${validationResult.isValid ? 'Valid' : 'Invalid'}`);
      return validationResult;
    } catch (error) {
      logger.error(`[InscriptionAgreementService.validateAgreement] Validation failed:`, error);

      return {
        isValid: false,
        errors: [error.message],
        warnings: []
      };
    }
  }

  /**
   * Get agreement template data for different formats
   * @param {string} inscriptionCode - Inscription request code
   * @param {string} format - Output format ('pdf', 'crystal', 'html')
   * @param {number} churchId - Church ID for filtering (optional)
   * @returns {Promise<Object>} Template data
   */
  async getTemplateData(inscriptionCode, format = 'pdf', churchId = null) {
    try {
      logger.info(`[InscriptionAgreementService.getTemplateData] Getting template data for ${format} format, inscription: ${inscriptionCode}`);

      let templateData;

      switch (format.toLowerCase()) {
        case 'pdf':
          templateData = await this.getPdfData(inscriptionCode, churchId);
          break;
        case 'crystal':
          templateData = await this.getCrystalReportsInfo(inscriptionCode, churchId);
          break;
        case 'html':
          templateData = await this.getPdfData(inscriptionCode, churchId);
          // Add HTML-specific formatting
          templateData.htmlFormatted = true;
          break;
        default:
          const error = new Error(`Unsupported format: ${format}`);
          error.code = 'UNSUPPORTED_FORMAT';
          throw error;
      }

      logger.info(`[InscriptionAgreementService.getTemplateData] Successfully prepared template data for ${format} format`);
      return templateData;
    } catch (error) {
      logger.error(`[InscriptionAgreementService.getTemplateData] Failed to get template data:`, error);

      if (error.code === 'UNSUPPORTED_FORMAT') {
        throw error;
      }

      const serviceError = new Error(`Failed to prepare template data for ${format} format`);
      serviceError.code = 'TEMPLATE_ERROR';
      serviceError.originalError = error;
      throw serviceError;
    }
  }

  /**
   * Send inscription agreement via email
   * @param {string} inscriptionCode - Inscription request code
   * @param {Object} emailData - Email data {to, subject, body, attachment}
   * @param {number} churchId - Church ID
   * @returns {Promise<Object>} Result status
   */
  async sendEmail(inscriptionCode, emailData, churchId = null) {
    try {
      logger.info(`[InscriptionAgreementService.sendEmail] Attempting to send email for: ${inscriptionCode}`);

      const { to, subject, body, attachment } = emailData;

      // If attachment is provided as base64, format it for nodemailer
      const attachments = [];
      if (attachment) {
        // Base64 format: "data:application/pdf;base64,..." or just base64
        const content = attachment.includes('base64,')
          ? attachment.split('base64,')[1]
          : attachment;

        attachments.push({
          filename: `Inscription-Agreement-${inscriptionCode}.pdf`,
          content: content,
          encoding: 'base64'
        });
      }

      const result = await MailService.sendMail({
        to,
        subject: subject || `Inscription Agreement - ${inscriptionCode}`,
        html: body || `<p>Please find the attached Inscription Agreement for ${inscriptionCode}.</p>`,
        attachments
      });

      return result;
    } catch (error) {
      logger.error(`[InscriptionAgreementService.sendEmail] Failed:`, error);
      return {
        success: false,
        message: error.message
      };
    }
  }
}

module.exports = new InscriptionAgreementService();