const NicheApplicationService = require('../services/NicheApplicationService');
const logger = require('../utils/logger');

class NicheApplicationController {
  /**
   * Search niche applications
   * GET /api/niche-applications
   */
  async searchApplications(req, res) {
    try {
      // Check if request was timed out or response already sent
      if (req.timedOut || res.headersSent) {
        logger.warn('Request already timed out or response sent, skipping controller execution');
        return;
      }

      const { query, user } = req;

      if (!user || !user.churchId) {
        if (!res.headersSent) {
          return res.status(401).json({
            success: false,
            error: {
              code: 'UNAUTHORIZED',
              message: 'Authentication required with church ID'
            }
          });
        }
        return;
      }

      const result = await NicheApplicationService.searchApplications(
        query,
        user.churchId
      );

      // Check again before sending response (timeout might have occurred during async operation)
      if (!res.headersSent && !req.timedOut) {
        return res.status(200).json(result);
      } else if (res.headersSent) {
        logger.warn('Response already sent (likely timeout), skipping response');
      }
    } catch (error) {
      // Check if response already sent before sending error response
      if (res.headersSent) {
        logger.warn('Cannot send error response - headers already sent:', error.message);
        return;
      }
      
      logger.error('Controller: Failed to search niche applications:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to search niche applications'
        }
      });
    }
  }

  /**
   * Create new niche application
   * POST /api/niche-applications
   * Based on: CaptureNewNicheApplication WebMethod
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

      const result = await NicheApplicationService.createApplication(
        body,
        user.userId,
        user.churchId
      );

      if (!result.success) {
        if (result.error.code === 'DUPLICATE') {
          return res.status(409).json(result);
        }
        if (result.error.code === 'VALIDATION_FAILED') {
          return res.status(400).json(result);
        }
        return res.status(400).json(result);
      }

      const responsePayload = {
        success: true,
        code: result.code || result.applicationNumber || result.data?.code || null,
        message: result.message || 'Niche application created successfully'
      };

      return res.status(201).json(responsePayload);
    } catch (error) {
      logger.error('Controller: Failed to create niche application:', error);

      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message || 'Failed to create application'
        }
      });
    }
  }

  /**
   * Get niche application by code
   * GET /api/niche-applications/:code
   * Based on: ViewNicheApplication WebMethod
   */
  async getApplication(req, res) {
    try {
      // Check if request was timed out or response already sent
      if (req.timedOut || res.headersSent) {
        logger.warn('Request already timed out or response sent, skipping controller execution');
        return;
      }

      const { code } = req.params;
      const { user } = req;

      if (!user || !user.churchId) {
        if (!res.headersSent) {
          return res.status(401).json({
            success: false,
            error: {
              code: 'UNAUTHORIZED',
              message: 'Authentication required with church ID'
            }
          });
        }
        return;
      }

      const result = await NicheApplicationService.getApplicationByCode(
        code,
        user.churchId
      );

      // Check again before sending response (timeout might have occurred during async operation)
      if (!res.headersSent && !req.timedOut) {
        if (!result.success) {
          if (result.error.code === 'NOT_FOUND') {
            return res.status(404).json(result);
          }
          if (result.error.code === 'ACCESS_DENIED') {
            return res.status(403).json(result);
          }
          return res.status(400).json(result);
        }

        return res.status(200).json(result);
      } else if (res.headersSent) {
        logger.warn('Response already sent (likely timeout), skipping response');
      }
    } catch (error) {
      // Check if response already sent before sending error response
      if (res.headersSent) {
        logger.warn('Cannot send error response - headers already sent:', error.message);
        return;
      }
      
      logger.error('Controller: Failed to get niche application:', error);

      // Check for connection/timeout errors and provide better error messages
      const isConnectionError = 
        error.code === 'ETIMEOUT' ||
        error.code === 'ETIMEDOUT' ||
        error.code === 'ECONNRESET' ||
        error.code === 'ESOCKET' ||
        error.message?.includes('timeout') ||
        error.message?.includes('Failed to connect') ||
        error.message?.includes('pool error');

      if (isConnectionError) {
        return res.status(503).json({
          success: false,
          error: {
            code: 'SERVICE_UNAVAILABLE',
            message: 'Database connection failed. Please try again in a moment.'
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
   * Update niche application
   * PUT /api/niche-applications/:code
   * Based on: UpdateNewicheApplication WebMethod
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

      const result = await NicheApplicationService.updateApplication(
        code,
        body,
        user.churchId
      );

      if (!result.success) {
        if (result.error.code === 'NOT_FOUND') {
          return res.status(404).json(result);
        }
        if (result.error.code === 'ACCESS_DENIED') {
          return res.status(403).json(result);
        }
        if (result.error.code === 'CONFLICT') {
          return res.status(409).json(result);
        }
        if (result.error.code === 'VALIDATION_FAILED') {
          return res.status(400).json(result);
        }
        return res.status(400).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      logger.error('Controller: Failed to update niche application:', error);

      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message || 'Failed to update application'
        }
      });
    }
  }

  /**
   * Delete niche application
   * DELETE /api/niche-applications/:code
   * Based on: DeleteNicheApplication WebMethod
   */
  async deleteApplication(req, res) {
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

      const result = await NicheApplicationService.deleteApplication(
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
        return res.status(400).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      logger.error('Controller: Failed to delete niche application:', error);

      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete application'
        }
      });
    }
  }

  /**
   * Send invoice email for an application
   * POST /api/niche-applications/:code/send-invoice
   */
  async sendInvoiceEmail(req, res) {
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

      const result = await NicheApplicationService.sendInvoiceEmail(
        code,
        user.churchId,
        body
      );

      if (!result.success) {
        if (result.error.code === 'NOT_FOUND') {
          return res.status(404).json(result);
        }
        if (result.error.code === 'ACCESS_DENIED') {
          return res.status(403).json(result);
        }
        if (result.error.code === 'NO_RECIPIENT') {
          return res.status(400).json(result);
        }
        return res.status(400).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      logger.error('Controller: Failed to send invoice email:', error);

      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message || 'Failed to send invoice email'
        }
      });
    }
  }
}

module.exports = new NicheApplicationController();

