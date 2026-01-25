const logger = require('../utils/logger');

/**
 * Base controller class with common functionality
 */
class BaseController {
  /**
   * Send success response
   * @param {Object} res - Express response object
   * @param {*} data - Response data
   * @param {string} message - Success message
   * @param {number} statusCode - HTTP status code
   */
  sendSuccess(res, data = null, message = 'Success', statusCode = 200) {
    const response = {
      success: true,
      message
    };

    if (data !== null) {
      response.data = data;
    }

    res.status(statusCode).json(response);
  }

  /**
   * Send error response
   * @param {Object} res - Express response object
   * @param {string} message - Error message
   * @param {number} statusCode - HTTP status code
   * @param {*} details - Error details
   */
  sendError(res, message = 'Internal Server Error', statusCode = 500, details = null) {
    const response = {
      success: false,
      error: message
    };

    if (details && process.env.NODE_ENV === 'development') {
      response.details = details;
    }

    res.status(statusCode).json(response);
  }

  /**
   * Handle async controller methods
   * @param {Function} fn - Async function to wrap
   * @returns {Function} Express middleware function
   */
  asyncHandler(fn) {
    return (req, res, next) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }

  /**
   * Validate request parameters
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Array} requiredFields - Array of required field names
   * @returns {boolean} Whether validation passed
   */
  validateRequired(req, res, requiredFields) {
    const missingFields = requiredFields.filter(field => {
      const value = req.body[field] || req.params[field] || req.query[field];
      return value === undefined || value === null || value === '';
    });

    if (missingFields.length > 0) {
      this.sendError(res, `Missing required fields: ${missingFields.join(', ')}`, 400);
      return false;
    }

    return true;
  }

  /**
   * Get pagination parameters from request
   * @param {Object} req - Express request object
   * @returns {Object} Pagination parameters
   */
  getPaginationParams(req) {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    return {
      page: Math.max(1, page),
      limit: Math.min(100, Math.max(1, limit))
    };
  }

  /**
   * Log request details
   * @param {Object} req - Express request object
   * @param {string} action - Action being performed
   */
  logRequest(req, action) {
    logger.info(`${action} - ${req.method} ${req.originalUrl}`, {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: req.user?.userId
    });
  }
}

module.exports = BaseController;
