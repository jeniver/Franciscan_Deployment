const logger = require('../utils/logger');

/**
 * Global error handling middleware
 * Provides consistent error responses and logging across all APIs
 */
const errorHandler = (err, req, res, next) => {
  // Log the error with context
  logger.error('API Error:', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    userId: req.user?.userId,
    churchId: req.user?.churchId,
    body: req.body,
    query: req.query,
    params: req.params
  });

  // Default error response
  let response = {
    success: false,
    error: {
      message: 'Internal server error',
      code: 'INTERNAL_ERROR'
    }
  };

  let statusCode = 500;

  // Handle specific error types
  if (err.name === 'ValidationError') {
    response.error.message = err.message;
    response.error.code = 'VALIDATION_ERROR';
    response.error.details = err.details || err.errors;
    statusCode = 400;
  } else if (err.name === 'UnauthorizedError') {
    response.error.message = 'Authentication required';
    response.error.code = 'UNAUTHORIZED';
    statusCode = 401;
  } else if (err.name === 'ForbiddenError') {
    response.error.message = 'Access denied';
    response.error.code = 'FORBIDDEN';
    statusCode = 403;
  } else if (err.name === 'NotFoundError') {
    response.error.message = err.message || 'Resource not found';
    response.error.code = 'NOT_FOUND';
    statusCode = 404;
  } else if (err.name === 'ConflictError') {
    response.error.message = err.message || 'Resource conflict';
    response.error.code = 'CONFLICT';
    statusCode = 409;
  } else if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
    response.error.message = 'Database connection failed';
    response.error.code = 'DATABASE_UNAVAILABLE';
    statusCode = 503;
  } else if (err.code === 'ETIMEOUT' || err.code === 'ETIMEDOUT') {
    response.error.message = 'Request timeout';
    response.error.code = 'TIMEOUT';
    statusCode = 408;
  } else if (err.message && err.message.includes('duplicate')) {
    response.error.message = 'Duplicate resource';
    response.error.code = 'DUPLICATE';
    statusCode = 409;
  } else if (err.message && err.message.includes('validation')) {
    response.error.message = err.message;
    response.error.code = 'VALIDATION_ERROR';
    statusCode = 400;
  }

  // Include original error message in development
  if (process.env.NODE_ENV === 'development') {
    response.error.originalMessage = err.message;
    response.error.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

/**
 * 404 handler for undefined routes
 */
const notFoundHandler = (req, res, next) => {
  logger.warn('404 Not Found:', {
    url: req.url,
    method: req.method,
    ip: req.ip
  });

  res.status(404).json({
    success: false,
    error: {
      message: 'Route not found',
      code: 'NOT_FOUND'
    }
  });
};

/**
 * Async wrapper for route handlers
 * Catches async errors and passes them to error handler
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Input validation middleware
 */
const validateInput = (schema) => {
  return (req, res, next) => {
    try {
      // Validate request body
      if (schema.body) {
        const { error, value } = schema.body.validate(req.body);
        if (error) {
          logger.warn('Body validation failed:', {
            error: error.details,
            userId: req.user?.userId,
            url: req.url
          });
          return res.status(400).json({
            success: false,
            error: {
              message: 'Invalid request body',
              code: 'VALIDATION_ERROR',
              details: error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message
              }))
            }
          });
        }
        req.body = value;
      }

      // Validate query parameters
      if (schema.query) {
        const { error, value } = schema.query.validate(req.query);
        if (error) {
          logger.warn('Query validation failed:', {
            error: error.details,
            userId: req.user?.userId,
            url: req.url
          });
          return res.status(400).json({
            success: false,
            error: {
              message: 'Invalid query parameters',
              code: 'VALIDATION_ERROR',
              details: error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message
              }))
            }
          });
        }
        req.query = value;
      }

      // Validate route parameters
      if (schema.params) {
        const { error, value } = schema.params.validate(req.params);
        if (error) {
          logger.warn('Params validation failed:', {
            error: error.details,
            userId: req.user?.userId,
            url: req.url
          });
          return res.status(400).json({
            success: false,
            error: {
              message: 'Invalid route parameters',
              code: 'VALIDATION_ERROR',
              details: error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message
              }))
            }
          });
        }
        req.params = value;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Rate limiting middleware (basic implementation)
 */
const rateLimit = (options = {}) => {
  const limits = new Map();
  const windowMs = options.windowMs || 15 * 60 * 1000; // 15 minutes
  const max = options.max || 100; // limit each IP to 100 requests per windowMs

  return (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const windowStart = now - windowMs;

    // Clean up old entries
    if (limits.has(ip)) {
      const requests = limits.get(ip).filter(timestamp => timestamp > windowStart);
      limits.set(ip, requests);
    } else {
      limits.set(ip, []);
    }

    const requests = limits.get(ip);
    
    if (requests.length >= max) {
      logger.warn('Rate limit exceeded:', {
        ip: ip,
        count: requests.length,
        max: max,
        windowMs: windowMs
      });

      return res.status(429).json({
        success: false,
        error: {
          message: 'Too many requests, please try again later',
          code: 'RATE_LIMIT_EXCEEDED'
        }
      });
    }

    // Add current request
    requests.push(now);
    next();
  };
};

module.exports = {
  errorHandler,
  notFoundHandler,
  asyncHandler,
  validateInput,
  rateLimit
};