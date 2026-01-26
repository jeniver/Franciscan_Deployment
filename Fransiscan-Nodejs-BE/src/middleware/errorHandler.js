const logger = require('../utils/logger');

/**
 * Global error handler middleware
 * Enhanced with comprehensive error classification and handling
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const errorHandler = (err, req, res, next) => {
  // Don't send error response if headers already sent (e.g., timeout already responded)
  if (res.headersSent || req.timedOut) {
    if (req.timedOut) {
      logger.warn('Error occurred after request timeout, not sending error response');
    } else {
      logger.warn('Error occurred after response sent, not sending error response');
    }
    return;
  }

  let error = { ...err };
  error.message = err.message;

  // Enhanced error logging with context
  logger.error('Error handler:', {
    message: err.message,
    code: err.code,
    name: err.name,
    statusCode: err.statusCode,
    path: req.path,
    method: req.method,
    userId: req.user?.userId,
    churchId: req.user?.churchId,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error = { message, statusCode: 404 };
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const message = 'Duplicate field value entered';
    error = { message, statusCode: 400 };
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = { message, statusCode: 400 };
  }

  // SQL Server connection errors
  const sqlConnectionErrors = [
    'ECONNREFUSED',
    'ETIMEOUT',
    'ETIMEDOUT',
    'ESOCKET',
    'ECONNRESET',
    'ENOTFOUND',
    'ELOGIN',
    'ENOTOPEN',
    'EPIPE',
    'EHOSTUNREACH',
    'EAI_AGAIN'
  ];
  
  if (sqlConnectionErrors.includes(err.code)) {
    const message = 'Database connection failed. Please try again later.';
    error = { message, statusCode: 503, code: 'DATABASE_UNAVAILABLE' };
  }

  // SQL Server specific errors
  if (err.number === 2) {
    const message = 'Database server not found';
    error = { message, statusCode: 503, code: 'DATABASE_NOT_FOUND' };
  }

  if (err.number === 18456) {
    const message = 'Database authentication failed';
    error = { message, statusCode: 401, code: 'DATABASE_AUTH_FAILED' };
  }

  // SQL Server timeout errors
  if (err.code === 'EREQUEST' && (err.message?.includes('timeout') || err.message?.includes('Timeout'))) {
    const message = 'Database query timeout. Please try again with more specific filters.';
    error = { message, statusCode: 504, code: 'DATABASE_TIMEOUT' };
  }

  // SQL Server stored procedure not found (expected, not an error)
  if (err.number === 2812 || err.message?.includes('Could not find stored procedure')) {
    // This is expected behavior (fallback will be used), don't treat as error
    // But if it reaches here, something went wrong
    const message = 'Database operation failed';
    error = { message, statusCode: 500, code: 'DATABASE_ERROR' };
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token';
    error = { message, statusCode: 401, code: 'INVALID_TOKEN' };
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired';
    error = { message, statusCode: 401, code: 'TOKEN_EXPIRED' };
  }

  // Validation errors
  if (err.name === 'ValidationError' || err.code === 'VALIDATION_FAILED') {
    const message = err.message || 'Validation failed';
    error = { message, statusCode: 400, code: 'VALIDATION_ERROR' };
  }

  // Not found errors
  if (err.code === 'NOT_FOUND' || err.message?.includes('not found')) {
    const message = err.message || 'Resource not found';
    error = { message, statusCode: 404, code: 'NOT_FOUND' };
  }

  // Access denied errors
  if (err.code === 'ACCESS_DENIED' || err.code === 'FORBIDDEN' || err.message?.includes('Access denied')) {
    const message = err.message || 'Access denied';
    error = { message, statusCode: 403, code: 'ACCESS_DENIED' };
  }

  // Rate limiting errors
  if (err.statusCode === 429) {
    const message = 'Too many requests. Please try again later.';
    error = { message, statusCode: 429, code: 'RATE_LIMIT_EXCEEDED' };
  }

  // Check again before sending (race condition protection)
  if (!res.headersSent && !req.timedOut) {
    const response = {
      success: false,
      error: {
        message: error.message || 'Server Error',
        code: error.code || 'INTERNAL_ERROR'
      }
    };

    // Add details in development mode
    if (process.env.NODE_ENV === 'development') {
      response.error.details = {
        name: err.name,
        stack: err.stack,
        originalMessage: err.message
      };
    }

    res.status(error.statusCode || 500).json(response);
  }
};

module.exports = errorHandler;
