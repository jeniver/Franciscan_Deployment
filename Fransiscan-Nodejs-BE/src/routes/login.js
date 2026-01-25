const express = require('express');
const router = express.Router();
const LoginController = require('../controllers/LoginController');
const { authenticateToken } = require('../middleware/auth');
const { validate, commonValidations } = require('../middleware/validation');

const loginController = new LoginController();

// Public routes (no authentication required)
router.post('/login',
  [
    commonValidations.user.login[0], // username validation
    commonValidations.user.login[1] // password validation
  ],
  validate,
  loginController.login
);

router.post('/verify-token', loginController.verifyToken);

// Protected routes (authentication required)
router.use(authenticateToken); // All routes below require authentication

router.get('/profile', loginController.getProfile);

module.exports = router;
