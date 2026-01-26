const BaseController = require('./BaseController');
const InscriptionInvoiceService = require('../services/InscriptionInvoiceService');
const EngraveApplicationService = require('../services/EngraveApplicationService');
const logger = require('../utils/logger');

/**
 * InscriptionInvoiceController
 *
 * Dedicated controller for Inscription (INCR) invoices.
 * All endpoints are additive and do not change any existing behaviour.
 */
class InscriptionInvoiceController extends BaseController {
  constructor() {
    super();
  }

  /**
   * GET /api/inscriptions/:code/items
   * Return task‑mapped inscription items for a given inscription application.
   */
  getInscriptionItems = this.asyncHandler(async (req, res) => {
    this.logRequest(req, 'Get Inscription Items');

    try {
      const { code } = req.params;
      const churchId = req.user?.churchId;

      logger.info('DIAGNOSTIC: getInscriptionItems API called:', {
        code,
        churchId,
        userId: req.user?.userId
      });

      if (!code) {
        return this.sendError(res, 'Application code is required', 400);
      }

      if (!churchId) {
        return this.sendError(res, 'Authentication with churchId is required', 401);
      }

      const result = await InscriptionInvoiceService.getInscriptionItems(code, churchId);

      logger.info('DIAGNOSTIC: getInscriptionItems result:', {
        code,
        hasResult: !!result,
        isArray: Array.isArray(result),
        itemCount: Array.isArray(result) ? result.length : (result?.items?.length || 0),
        hasInscriptionRequestNo: !!result?.inscriptionRequestNo
      });

      // Return enhanced response with items and application details
      // Maintain backward compatibility: if result is array, return as-is
      // Otherwise, return the enhanced object
      if (Array.isArray(result)) {
        return this.sendSuccess(res, result, 'Inscription items retrieved successfully');
      }

      // Enhanced response with full details
      return this.sendSuccess(res, result, 'Inscription items retrieved successfully');
    } catch (error) {
      logger.error('Controller: Failed to get inscription items:', error);

      if (error.code === 'NOT_FOUND') {
        // Use the detailed error message if available, otherwise use generic message
        const errorMessage = error.message || 'Inscription application not found';
        const errorResponse = {
          message: errorMessage,
          code: error.code,
          details: error.details || { applicationCode: code }
        };
        return res.status(404).json({
          success: false,
          error: errorResponse
        });
      }

      if (error.code === 'ACCESS_DENIED') {
        return this.sendError(res, error.message || 'Access denied', 403);
      }

      return this.sendError(res, error.message || 'Failed to retrieve inscription items', 500);
    }
  });

  /**
   * POST /api/inscriptions/:code/invoice
   * Create an invoice for a given inscription application.
   */
  createInscriptionInvoice = this.asyncHandler(async (req, res) => {
    this.logRequest(req, 'Create Inscription Invoice');

    try {
      const { code } = req.params;
      const userId = req.user?.userId;
      const churchId = req.user?.churchId;

      if (!code) {
        return this.sendError(res, 'Application code is required', 400);
      }

      if (!userId || !churchId) {
        return this.sendError(res, 'Authentication with userId and churchId is required', 401);
      }

      const result = await InscriptionInvoiceService.createInvoiceForInscription(
        code,
        userId,
        churchId
      );

      if (!result.success) {
        const errorCode = result.error?.code || 'INTERNAL_ERROR';

        if (errorCode === 'NOT_FOUND') {
          return this.sendError(res, result.error.message || 'Inscription application not found', 404);
        }

        if (errorCode === 'ACCESS_DENIED') {
          return this.sendError(res, result.error.message || 'Access denied', 403);
        }

        if (errorCode === 'DUPLICATE_INVOICE') {
          return res.status(409).json(result);
        }

        if (errorCode === 'INVALID_REF_DOCUMENT' || errorCode === 'VALIDATION_ERROR') {
          return res.status(400).json(result);
        }

        // Generic failure
        return res.status(400).json(result);
      }

      return res.status(201).json(result);
    } catch (error) {
      logger.error('Controller: Failed to create inscription invoice:', error);
      return this.sendError(res, 'Failed to create inscription invoice', 500);
    }
  });

  /**
   * POST /api/inscriptions
   * Create a new inscription application
   */
  createInscription = this.asyncHandler(async (req, res) => {
    this.logRequest(req, 'Create Inscription');

    try {
      const userId = req.user?.userId;
      const churchId = req.user?.churchId;

      if (!userId || !churchId) {
        return this.sendError(res, 'Authentication with userId and churchId is required', 401);
      }

      const result = await EngraveApplicationService.createApplication(
        req.body,
        userId,
        churchId
      );

      return res.status(201).json(result);
    } catch (error) {
      logger.error('Controller: Failed to create inscription:', error);

      if (error.message.includes('Church ID mismatch')) {
        return this.sendError(res, error.message, 403);
      }

      if (error.message.includes('Validation failed')) {
        return this.sendError(res, error.message, 400);
      }

      return this.sendError(res, 'Failed to create inscription', 500);
    }
  });

  /**
   * PUT /api/inscriptions/:code
   * Update an existing inscription application
   */
  updateInscription = this.asyncHandler(async (req, res) => {
    this.logRequest(req, 'Update Inscription');

    try {
      const { code } = req.params;
      const churchId = req.user?.churchId;

      if (!code) {
        return this.sendError(res, 'Application code is required', 400);
      }

      if (!churchId) {
        return this.sendError(res, 'Authentication with churchId is required', 401);
      }

      const result = await EngraveApplicationService.updateApplication(
        code,
        req.body,
        churchId
      );

      return this.sendSuccess(res, result, 'Inscription updated successfully');
    } catch (error) {
      logger.error('Controller: Failed to update inscription:', error);

      if (error.message === 'Application not found') {
        return this.sendError(res, error.message, 404);
      }

      if (error.message.includes('Church ID mismatch') || error.message.includes('Access denied')) {
        return this.sendError(res, error.message, 403);
      }

      if (error.message.includes('cannot be modified')) {
        return this.sendError(res, error.message, 400);
      }

      if (error.message.includes('Validation failed')) {
        return this.sendError(res, error.message, 400);
      }

      return this.sendError(res, 'Failed to update inscription', 500);
    }
  });
}

module.exports = InscriptionInvoiceController;


