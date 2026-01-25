const BaseController = require('./BaseController');
const AuthService = require('../services/AuthService');
const UserRepository = require('../repositories/UserRepository');

/**
 * Authentication controller
 */
class AuthController extends BaseController {
  constructor() {
    super();
    this.userRepository = new UserRepository();
    this.authService = new AuthService(this.userRepository);
  }

  /**
   * Register new user
   */
  register = this.asyncHandler(async(req, res) => {
    this.logRequest(req, 'User Registration');

    if (!this.validateRequired(req, res, ['username', 'password', 'email'])) {
      return;
    }

    try {
      const result = await this.authService.register(req.body);
      this.sendSuccess(res, result, 'User registered successfully', 201);
    } catch (error) {
      logger.error('Registration error:', error);
      this.sendError(res, error.message, 400);
    }
  });

  /**
   * User login
   */
  login = this.asyncHandler(async(req, res) => {
    this.logRequest(req, 'User Login');

    if (!this.validateRequired(req, res, ['username', 'password'])) {
      return;
    }

    try {
      const result = await this.authService.login(req.body.username, req.body.password);
      this.sendSuccess(res, result, 'Login successful');
    } catch (error) {
      logger.error('Login error:', error);
      this.sendError(res, error.message, 401);
    }
  });

  /**
   * Change password
   */
  changePassword = this.asyncHandler(async(req, res) => {
    this.logRequest(req, 'Change Password');

    if (!this.validateRequired(req, res, ['currentPassword', 'newPassword'])) {
      return;
    }

    try {
      await this.authService.changePassword(
        req.user.userId,
        req.body.currentPassword,
        req.body.newPassword
      );
      this.sendSuccess(res, null, 'Password changed successfully');
    } catch (error) {
      logger.error('Change password error:', error);
      this.sendError(res, error.message, 400);
    }
  });

  /**
   * Reset password (admin only)
   */
  resetPassword = this.asyncHandler(async(req, res) => {
    this.logRequest(req, 'Reset Password');

    if (!this.validateRequired(req, res, ['userId', 'newPassword'])) {
      return;
    }

    try {
      await this.authService.resetPassword(req.body.userId, req.body.newPassword);
      this.sendSuccess(res, null, 'Password reset successfully');
    } catch (error) {
      logger.error('Reset password error:', error);
      this.sendError(res, error.message, 400);
    }
  });

  /**
   * Get current user profile
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

  /**
   * Update user profile
   */
  updateProfile = this.asyncHandler(async(req, res) => {
    this.logRequest(req, 'Update Profile');

    try {
      const { password, ...updateData } = req.body;
      const updatedUser = await this.userRepository.update(req.user.userId, updateData);

      if (!updatedUser) {
        return this.sendError(res, 'User not found', 404);
      }

      this.sendSuccess(res, updatedUser.toJSON(), 'Profile updated successfully');
    } catch (error) {
      logger.error('Update profile error:', error);
      this.sendError(res, 'Failed to update profile', 500);
    }
  });

  /**
   * Verify token
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
}

module.exports = AuthController;
