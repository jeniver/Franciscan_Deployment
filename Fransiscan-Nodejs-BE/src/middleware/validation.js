const { body, param, query, validationResult } = require('express-validator');
const logger = require('../utils/logger');

/**
 * Validation middleware to check for validation errors
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.warn('Validation errors:', errors.array());
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

/**
 * Common validation rules
 */
const commonValidations = {
  // ID parameter validation
  id: param('id').isInt({ min: 1 }).withMessage('ID must be a positive integer'),

  // Pagination validation
  pagination: [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
  ],

  // User validation
  user: {
    create: [
      body('username').notEmpty().withMessage('Username is required')
        .isLength({ min: 3, max: 50 }).withMessage('Username must be between 3 and 50 characters')
        .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username can only contain letters, numbers, and underscores'),
      body('email').isEmail().withMessage('Valid email is required'),
      body('password').isLength({ min: 3 }).withMessage('Password must be at least 3 characters long'),
      body('role').optional().isIn(['admin', 'user', 'cashier']).withMessage('Invalid role')
    ],
    update: [
      body('username').optional().isLength({ min: 3, max: 50 }).withMessage('Username must be between 3 and 50 characters'),
      body('email').optional().isEmail().withMessage('Valid email is required'),
      body('password').optional().isLength({ min: 3 }).withMessage('Password must be at least 3 characters long'),
      body('role').optional().isIn(['admin', 'user', 'cashier']).withMessage('Invalid role')
    ],
    login: [
      body('username').notEmpty().withMessage('Username is required'),
      body('password').isLength({ min: 3 }).withMessage('Password must be at least 3 characters long')
    ]
  },

  // Church validation
  church: {
    create: [
      body('name').notEmpty().withMessage('Church name is required')
        .isLength({ max: 200 }).withMessage('Church name must not exceed 200 characters'),
      body('address').optional().isLength({ max: 500 }).withMessage('Address must not exceed 500 characters'),
      body('phone').optional().isMobilePhone().withMessage('Valid phone number is required'),
      body('email').optional().isEmail().withMessage('Valid email is required')
    ],
    update: [
      body('name').optional().isLength({ max: 200 }).withMessage('Church name must not exceed 200 characters'),
      body('address').optional().isLength({ max: 500 }).withMessage('Address must not exceed 500 characters'),
      body('phone').optional().isMobilePhone().withMessage('Valid phone number is required'),
      body('email').optional().isEmail().withMessage('Valid email is required')
    ]
  },

  // Person validation
  person: {
    create: [
      body('name').notEmpty().withMessage('Name is required')
        .isLength({ max: 250 }).withMessage('Name must not exceed 250 characters'),
      body('email').optional().isEmail().withMessage('Valid email is required'),
      body('mobileNo').optional().isMobilePhone().withMessage('Valid mobile number is required'),
      body('churchId').isInt({ min: 1 }).withMessage('Valid church ID is required'),
      body('isCatholic').optional().isBoolean().withMessage('IsCatholic must be a boolean value')
    ],
    update: [
      body('name').optional().isLength({ max: 250 }).withMessage('Name must not exceed 250 characters'),
      body('email').optional().isEmail().withMessage('Valid email is required'),
      body('mobileNo').optional().isMobilePhone().withMessage('Valid mobile number is required'),
      body('churchId').optional().isInt({ min: 1 }).withMessage('Valid church ID is required'),
      body('isCatholic').optional().isBoolean().withMessage('IsCatholic must be a boolean value')
    ]
  },

  // Invoice validation
  invoice: {
    create: [
      body('invoiceNumber').notEmpty().withMessage('Invoice number is required'),
      body('amount').isFloat({ min: 0 }).withMessage('Amount must be a positive number'),
      body('personId').isInt({ min: 1 }).withMessage('Valid person ID is required'),
      body('churchId').isInt({ min: 1 }).withMessage('Valid church ID is required')
    ],
    update: [
      body('invoiceNumber').optional().notEmpty().withMessage('Invoice number cannot be empty'),
      body('amount').optional().isFloat({ min: 0 }).withMessage('Amount must be a positive number'),
      body('personId').optional().isInt({ min: 1 }).withMessage('Valid person ID is required'),
      body('churchId').optional().isInt({ min: 1 }).withMessage('Valid church ID is required')
    ]
  },

  // Niche validation
  niche: {
    create: [
      body('nicheNumber').notEmpty().withMessage('Niche number is required'),
      body('wallId').isInt({ min: 1 }).withMessage('Valid wall ID is required'),
      body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number')
    ],
    update: [
      body('nicheNumber').optional().notEmpty().withMessage('Niche number cannot be empty'),
      body('wallId').optional().isInt({ min: 1 }).withMessage('Valid wall ID is required'),
      body('price').optional().isFloat({ min: 0 }).withMessage('Price must be a positive number')
    ]
  }
};

module.exports = {
  validate,
  commonValidations
};
