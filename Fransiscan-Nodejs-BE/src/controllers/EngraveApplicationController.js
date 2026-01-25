const EngraveApplicationService = require('../services/EngraveApplicationService');
const logger = require('../utils/logger');

class EngraveApplicationController {
  /**
   * Create new engrave application
   * POST /api/engrave-applications
   */
  async createApplication(req, res) {
    try {
      const { body, user } = req;

      if (!user || !user.churchId) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required with church ID'
          }
        });
      }

      const result = await EngraveApplicationService.createApplication(
        body,
        user.userId,
        user.churchId
      );

      return res.status(201).json(result);
    } catch (error) {
      logger.error('Controller: Failed to create engrave application:', error);

      return res.status(400).json({
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: error.message || 'Failed to create application'
        }
      });
    }
  }

  /**
   * Get engrave application by code
   * GET /api/engrave-applications/:code
   */
  async getApplication(req, res) {
    try {
      const { code } = req.params;
      const { user } = req;

      if (!user || !user.churchId) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required with church ID'
          }
        });
      }

      const result = await EngraveApplicationService.getApplicationByCode(
        code,
        user.churchId
      );

      return res.status(200).json(result);
    } catch (error) {
      logger.error('Controller: Failed to get engrave application:', error);

      if (error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Application not found'
          }
        });
      }

      if (error.message.includes('Access denied')) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Access denied'
          }
        });
      }

      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve application'
        }
      });
    }
  }

  /**
   * Update engrave application
   * PUT /api/engrave-applications/:code
   */
  async updateApplication(req, res) {
    try {
      const { code } = req.params;
      const { body, user } = req;

      if (!user || !user.churchId) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required with church ID'
          }
        });
      }

      const result = await EngraveApplicationService.updateApplication(
        code,
        body,
        user.churchId
      );

      return res.status(200).json(result);
    } catch (error) {
      logger.error('Controller: Failed to update engrave application:', error);

      if (error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Application not found'
          }
        });
      }

      if (error.message.includes('Access denied')) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Access denied'
          }
        });
      }

      if (error.message.includes('cannot be modified')) {
        return res.status(409).json({
          success: false,
          error: {
            code: 'CONFLICT',
            message: error.message
          }
        });
      }

      return res.status(400).json({
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: error.message || 'Failed to update application'
        }
      });
    }
  }

  /**
   * Confirm engrave application (create invoice)
   * POST /api/engrave-applications/:code/confirm
   */
  async confirmApplication(req, res) {
    try {
      const { code } = req.params;
      const { user } = req;

      if (!user || !user.churchId) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required with church ID'
          }
        });
      }

      const result = await EngraveApplicationService.confirmApplication(
        code,
        user.churchId
      );

      if (!result.success) {
        if (result.error.code === 'NOT_FOUND') {
          return res.status(404).json(result);
        }
        if (result.error.code === 'ACCESS_DENIED') {
          return res.status(403).json(result);
        }
        if (result.error.code === 'ALREADY_CONFIRMED' || result.error.code === 'CONFLICT') {
          return res.status(409).json(result);
        }
        return res.status(400).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      logger.error('Controller: Failed to confirm engrave application:', error);

      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to confirm application'
        }
      });
    }
  }
}

module.exports = new EngraveApplicationController();

