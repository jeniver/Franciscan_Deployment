const InscriptionAgreementService = require('../services/InscriptionAgreementService');
const logger = require('../utils/logger');

/**
 * Controller for Inscription Agreement operations
 */
class InscriptionAgreementController {
  /**
   * Get inscription agreement details
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getAgreementDetails(req, res) {
    try {
      const { inscriptionCode } = req.params;
      const churchId = req.user?.churchId;

      logger.info(`[InscriptionAgreementController.getAgreementDetails] Request for inscription: ${inscriptionCode}, user: ${req.user?.userId}`);

      // Validate input
      if (!inscriptionCode || inscriptionCode.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'Inscription code is required'
          }
        });
      }

      const details = await InscriptionAgreementService.getAgreementDetails(inscriptionCode, churchId);

      logger.info(`[InscriptionAgreementController.getAgreementDetails] Successfully retrieved details for inscription: ${inscriptionCode}`);

      return res.status(200).json({
        success: true,
        data: details,
        message: 'Inscription agreement details retrieved successfully'
      });
    } catch (error) {
      logger.error(`[InscriptionAgreementController.getAgreementDetails] Error retrieving details:`, error);

      // Handle specific error cases
      if (error.code === 'NOT_FOUND') {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: error.message
          }
        });
      }

      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve inscription agreement details',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        }
      });
    }
  }

  /**
   * Get crystal reports information for inscription agreement
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getCrystalReportsInfo(req, res) {
    try {
      const { inscriptionCode } = req.params;
      const churchId = req.user?.churchId;

      logger.info(`[InscriptionAgreementController.getCrystalReportsInfo] Request for Crystal Reports data, inscription: ${inscriptionCode}`);

      // Validate input
      if (!inscriptionCode || inscriptionCode.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'Inscription code is required'
          }
        });
      }

      const reportsData = await InscriptionAgreementService.getCrystalReportsInfo(inscriptionCode, churchId);

      logger.info(`[InscriptionAgreementController.getCrystalReportsInfo] Successfully prepared Crystal Reports data for inscription: ${inscriptionCode}`);

      return res.status(200).json({
        success: true,
        data: reportsData,
        message: 'Crystal Reports data prepared successfully'
      });
    } catch (error) {
      logger.error(`[InscriptionAgreementController.getCrystalReportsInfo] Error preparing Crystal Reports data:`, error);

      // Handle specific error cases
      if (error.code === 'NOT_FOUND') {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: error.message
          }
        });
      }

      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to prepare Crystal Reports data',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        }
      });
    }
  }

  /**
   * Get PDF data for inscription agreement generation
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getPdfData(req, res) {
    try {
      const { inscriptionCode } = req.params;
      const churchId = req.user?.churchId;

      logger.info(`[InscriptionAgreementController.getPdfData] Request for PDF data, inscription: ${inscriptionCode}`);

      // Set cache control headers to handle frontend cache-busting
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });

      // Validate input
      if (!inscriptionCode || inscriptionCode.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'Inscription code is required'
          }
        });
      }

      const pdfData = await InscriptionAgreementService.getPdfData(inscriptionCode, churchId);

      logger.info(`[InscriptionAgreementController.getPdfData] Successfully prepared PDF data for inscription: ${inscriptionCode}`);

      return res.status(200).json({
        success: true,
        data: pdfData,
        message: 'PDF data prepared successfully'
      });
    } catch (error) {
      logger.error(`[InscriptionAgreementController.getPdfData] Error preparing PDF data:`, error);

      // Handle specific error cases
      if (error.code === 'NOT_FOUND') {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: error.message
          }
        });
      }

      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to prepare PDF data',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        }
      });
    }
  }

  /**
   * Validate inscription agreement for generation
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async validateAgreement(req, res) {
    try {
      const { inscriptionCode } = req.params;
      const churchId = req.user?.churchId;

      logger.info(`[InscriptionAgreementController.validateAgreement] Request for validation, inscription: ${inscriptionCode}`);

      // Validate input
      if (!inscriptionCode || inscriptionCode.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'Inscription code is required'
          }
        });
      }

      const validationResult = await InscriptionAgreementService.validateAgreement(inscriptionCode, churchId);

      logger.info(`[InscriptionAgreementController.validateAgreement] Validation completed for inscription: ${inscriptionCode}`);

      const statusCode = validationResult.isValid ? 200 : 400;

      return res.status(statusCode).json({
        success: validationResult.isValid,
        data: validationResult,
        message: validationResult.isValid
          ? 'Inscription agreement is valid for generation'
          : 'Inscription agreement validation failed'
      });
    } catch (error) {
      logger.error(`[InscriptionAgreementController.validateAgreement] Error during validation:`, error);

      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to validate inscription agreement',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        }
      });
    }
  }

  /**
   * Get template data for specific format
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getTemplateData(req, res) {
    try {
      const { inscriptionCode, format } = req.params;
      const churchId = req.user?.churchId;

      logger.info(`[InscriptionAgreementController.getTemplateData] Request for ${format} template data, inscription: ${inscriptionCode}`);

      // Validate inputs
      if (!inscriptionCode || inscriptionCode.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'Inscription code is required'
          }
        });
      }

      if (!format || format.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'Format is required'
          }
        });
      }

      const templateData = await InscriptionAgreementService.getTemplateData(inscriptionCode, format, churchId);

      logger.info(`[InscriptionAgreementController.getTemplateData] Successfully prepared ${format} template data for inscription: ${inscriptionCode}`);

      return res.status(200).json({
        success: true,
        data: templateData,
        message: `${format.toUpperCase()} template data prepared successfully`
      });
    } catch (error) {
      logger.error(`[InscriptionAgreementController.getTemplateData] Error preparing template data:`, error);

      // Handle specific error cases
      if (error.code === 'NOT_FOUND') {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: error.message
          }
        });
      }

      if (error.code === 'UNSUPPORTED_FORMAT') {
        return res.status(400).json({
          success: false,
          error: {
            code: 'UNSUPPORTED_FORMAT',
            message: error.message
          }
        });
      }

      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to prepare template data',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        }
      });
    }
  }

  /**
   * Send inscription agreement via email
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async sendEmail(req, res) {
    try {
      const { inscriptionCode } = req.params;
      const { to, subject, body, attachment } = req.body;
      const churchId = req.user?.churchId;

      logger.info(`[InscriptionAgreementController.sendEmail] Sending email for inscription: ${inscriptionCode}, to: ${to}`);

      // Validate inputs
      if (!inscriptionCode) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_INPUT', message: 'Inscription code is required' }
        });
      }

      if (!to) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_INPUT', message: 'Recipient email is required' }
        });
      }

      const result = await InscriptionAgreementService.sendEmail(inscriptionCode, { to, subject, body, attachment }, churchId);

      if (!result.success) {
        return res.status(500).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      logger.error(`[InscriptionAgreementController.sendEmail] Error:`, error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to send inscription agreement email',
          details: error.message
        }
      });
    }
  }
}

module.exports = new InscriptionAgreementController();
