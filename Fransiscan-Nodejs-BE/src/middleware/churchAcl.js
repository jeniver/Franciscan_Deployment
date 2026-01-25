const logger = require('../utils/logger');

/**
 * Church-based Access Control List (ACL) middleware
 * Ensures user can only access entities belonging to their church
 */

/**
 * Check if user's church_id matches entity's church_id
 * @param {Function} getEntityChurchId - Async function to retrieve entity's church_id
 * @returns {Function} Middleware function
 */
const requireChurchMatch = (getEntityChurchId) => {
  return async(req, res, next) => {
    try {
      const user = req.user;

      if (!user) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required'
          }
        });
      }

      if (!user.churchId) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'User does not have a church assignment'
          }
        });
      }

      // Get entity's church_id
      const entityChurchId = await getEntityChurchId(req);

      if (entityChurchId === null || entityChurchId === undefined) {
        // Entity not found or no church_id required
        return next();
      }

      // Check if user's church_id matches entity's church_id
      if (user.churchId !== entityChurchId) {
        logger.warn(`Church ACL violation: User church ${user.churchId} attempted to access entity from church ${entityChurchId}`);

        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Access denied - Church ID mismatch'
          }
        });
      }

      next();
    } catch (error) {
      logger.error('Church ACL middleware error:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to verify church access'
        }
      });
    }
  };
};

/**
 * Ensure user has church_id assigned
 */
const requireChurchId = (req, res, next) => {
  const user = req.user;

  if (!user) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required'
      }
    });
  }

  if (!user.churchId) {
    return res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'User does not have a church assignment'
      }
    });
  }

  next();
};

/**
 * Attach church_id from user to request body (for create operations)
 */
const attachChurchId = (req, res, next) => {
  if (req.user && req.user.churchId) {
    req.body.churchId = req.user.churchId;
  }
  next();
};

module.exports = {
  requireChurchMatch,
  requireChurchId,
  attachChurchId
};

