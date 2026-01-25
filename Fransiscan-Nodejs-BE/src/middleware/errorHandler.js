const logger = require('../utils/logger');

/**
 * Global error handler middleware
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

  // Log error
  logger.error(err);

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

  // SQL Server errors
  if (err.code === 'ECONNREFUSED') {
    const message = 'Database connection failed';
    error = { message, statusCode: 503 };
  }

  if (err.number === 2) {
    const message = 'Database server not found';
    error = { message, statusCode: 503 };
  }

  if (err.number === 18456) {
    const message = 'Database authentication failed';
    error = { message, statusCode: 401 };
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token';
    error = { message, statusCode: 401 };
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired';
    error = { message, statusCode: 401 };
  }

  // Check again before sending (race condition protection)
  if (!res.headersSent && !req.timedOut) {
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Server Error',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
  }
};

module.exports = errorHandler;
