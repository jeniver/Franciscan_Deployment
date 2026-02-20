const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

/**
 * Authentication service for user authentication and authorization
 */
class AuthService {
  constructor(userRepository) {
    this.userRepository = userRepository;
  }

  /**
   * Register a new user
   * @param {Object} userData - User registration data
   * @returns {Promise<Object>} Created user and token
   */
  async register(userData) {
    try {
      // Check if user already exists
      const existingUser = await this.userRepository.findByUsername(userData.username);
      if (existingUser) {
        throw new Error('Username already exists');
      }

      // Hash password
      const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
      const hashedPassword = await bcrypt.hash(userData.password, saltRounds);

      // Create user
      const user = {
        userName: userData.username,
        password: hashedPassword,
        email: userData.email,
        roleId: userData.roleId || 2, // Default to user role
        churchId: userData.churchId,
        active: true,
        isLocked: false,
        failedLoginAttempts: 0
      };

      const createdUser = await this.userRepository.create(user);
      const token = this.generateToken(createdUser);

      return {
        user: createdUser,
        token
      };
    } catch (error) {
      logger.error('Error in user registration:', error);
      throw error;
    }
  }

  /**
   * Authenticate user login
   * @param {string} username - Username
   * @param {string} password - Password
   * @returns {Promise<Object>} User and token
   */
  async login(username, password) {
    try {
      // Find user by username
      const user = await this.userRepository.findByUsername(username);
      if (!user) {
        throw new Error('Invalid credentials');
      }

      // Check if account is locked
      if (user.isLocked) {
        throw new Error('Account is locked');
      }

      // Check if account is active
      if (!user.active) {
        throw new Error('Account is inactive');
      }

      // Verify password (plain text comparison for existing database)
      const isValidPassword = password === user.password;
      if (!isValidPassword) {
        throw new Error('Invalid credentials');
      }

      // Generate token
      const token = this.generateToken(user);

      return {
        user: user.toJSON(),
        token
      };
    } catch (error) {
      logger.error('Error in user login:', error);
      throw error;
    }
  }

  /**
   * Generate JWT token
   * @param {Object} user - User object
   * @returns {string} JWT token
   */
  generateToken(user) {
    const payload = {
      userId: user.userId,
      username: user.userName,
      roleId: user.roleId,
      churchId: user.churchId
    };

    console.log('Generating token with payload:', payload);
    console.log('JWT Secret:', process.env.JWT_SECRET);

    return jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '24h'
    });
  }

  /**
   * Verify JWT token
   * @param {string} token - JWT token
   * @returns {Promise<Object>} Decoded token payload
   */
  async verifyToken(token) {
    try {
      return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      logger.error('Token verification failed:', error);
      throw new Error('Invalid token');
    }
  }

  /**
   * Change user password
   * @param {number} userId - User ID
   * @param {string} currentPassword - Current password
   * @param {string} newPassword - New password
   * @returns {Promise<boolean>} Success status
   */
  async changePassword(userId, currentPassword, newPassword) {
    try {
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Verify current password
      const isValidPassword = await bcrypt.compare(currentPassword, user.password);
      if (!isValidPassword) {
        throw new Error('Current password is incorrect');
      }

      // Hash new password
      const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

      // Update password
      await this.userRepository.update(userId, { password: hashedPassword });

      return true;
    } catch (error) {
      logger.error('Error changing password:', error);
      throw error;
    }
  }

  /**
   * Reset user password (admin function)
   * @param {number} userId - User ID
   * @param {string} newPassword - New password
   * @returns {Promise<boolean>} Success status
   */
  async resetPassword(userId, newPassword) {
    try {
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Hash new password
      const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

      // Update password and unlock account
      await this.userRepository.update(userId, {
        password: hashedPassword,
        isLocked: false,
        failedLoginAttempts: 0
      });

      return true;
    } catch (error) {
      logger.error('Error resetting password:', error);
      throw error;
    }
  }
}

module.exports = AuthService;
