const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/AuthController');
const { authenticateToken, authorize } = require('../middleware/auth');
const { validate, commonValidations } = require('../middleware/validation');

const authController = new AuthController();

// Public routes
router.post('/register',
  commonValidations.user.create,
  validate,
  authController.register
);

router.post('/login',
  [
    commonValidations.user.create[0], // username validation
    commonValidations.user.create[2] // password validation
  ],
  validate,
  authController.login
);

router.post('/verify-token', authController.verifyToken);

// Protected routes
router.use(authenticateToken); // All routes below require authentication

router.get('/profile', authController.getProfile);
router.put('/profile',
  commonValidations.user.update,
  validate,
  authController.updateProfile
);

router.post('/change-password',
  [
    commonValidations.user.create[2], // password validation
    commonValidations.user.create[2] // password validation
  ],
  validate,
  authController.changePassword
);

// Admin only routes
router.post('/reset-password',
  authorize(['admin']),
  [
    commonValidations.id,
    commonValidations.user.create[2] // password validation
  ],
  validate,
  authController.resetPassword
);

module.exports = router;
