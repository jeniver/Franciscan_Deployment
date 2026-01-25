const BaseController = require('./BaseController');
const AuthService = require('../services/AuthService');
const UserRepository = require('../repositories/UserRepository');
const logger = require('../utils/logger');

/**
 * Login Controller using real database authentication
 */
class LoginController extends BaseController {
  constructor() {
    super();
    this.userRepository = new UserRepository();
    this.authService = new AuthService(this.userRepository);
  }

  /**
   * User login endpoint
   */
  login = this.asyncHandler(async(req, res) => {
    this.logRequest(req, 'User Login');

    // Validate required fields
    if (!this.validateRequired(req, res, ['username', 'password'])) {
      return;
    }

    const { username, password } = req.body;

    try {
      const result = await this.authService.login(username, password);

      this.sendSuccess(res, result, 'Login successful');
    } catch (error) {
      logger.error('Login error:', error);
      this.sendError(res, error.message, 401);
    }
  });

  /**
   * Verify JWT token
   */
  verifyToken = this.asyncHandler(async(req, res) => {
    this.logRequest(req, 'Verify Token');

    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) {
        return this.sendError(res, 'Token required', 401);
      }

      const decoded = await this.authService.verifyToken(token);
      this.sendSuccess(res, { user: decoded }, 'Token is valid');
    } catch (error) {
      logger.error('Token verification error:', error);
      this.sendError(res, 'Invalid token', 401);
    }
  });

  /**
   * Get user profile (requires authentication)
   */
  getProfile = this.asyncHandler(async(req, res) => {
    this.logRequest(req, 'Get Profile');

    try {
      const user = await this.userRepository.findById(req.user.userId);
      if (!user) {
        return this.sendError(res, 'User not found', 404);
      }

      this.sendSuccess(res, user.toJSON(), 'Profile retrieved successfully');
    } catch (error) {
      logger.error('Get profile error:', error);
      this.sendError(res, 'Failed to retrieve profile', 500);
    }
  });
}

module.exports = LoginController;
