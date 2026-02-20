const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

// Log environment variables for debugging
console.log('Auth middleware - JWT_SECRET:', process.env.JWT_SECRET);

// Simple mapping between numeric role IDs and role names
// This keeps backward compatibility with existing tokens that only include roleId
const ROLE_MAP = {
  1: 'admin',
  2: 'user',
  3: 'cashier'
};

/**
 * Authentication middleware
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Access token required'
    });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      logger.error('Token verification failed:', err);
      logger.error('JWT Secret:', process.env.JWT_SECRET);
      logger.error('Token:', token);
      return res.status(403).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }

    req.user = user;
    next();
  });
};

/**
 * Optional authentication middleware (doesn't fail if no token)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    req.user = null;
    return next();
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      req.user = null;
    } else {
      req.user = user;
    }
    next();
  });
};

/**
 * Authorization middleware to check user roles
 * @param {Array} roles - Array of allowed roles
 * @returns {Function} Middleware function
 */
const authorize = (roles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Derive the user's role name from either explicit role or roleId
    const userRole =
      req.user.role ||
      (typeof req.user.roleId !== 'undefined'
        ? ROLE_MAP[req.user.roleId] || null
        : null);

    if (roles.length && (!userRole || !roles.includes(userRole))) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      });
    }

    next();
  };
};

module.exports = {
  authenticateToken,
  optionalAuth,
  authorize
};
