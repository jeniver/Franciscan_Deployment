const BaseRepository = require('./BaseRepository');
const { executeQuery } = require('../config/database');
const logger = require('../utils/logger');
const User = require('../models/User');

/**
 * User repository for database operations
 */
class UserRepository extends BaseRepository {
  constructor() {
    super('User');
  }

  getPrimaryKey() {
    return 'UserId';
  }

  /**
   * Find user by username
   * @param {string} username - Username
   * @returns {Promise<User|null>} User or null
   */
  async findByUsername(username) {
    try {
      const query = 'SELECT * FROM [User] WITH (NOLOCK) WHERE UserName = @username';
      const result = await executeQuery(query, { username });
      return result.recordset[0] ? new User(result.recordset[0]) : null;
    } catch (error) {
      logger.error('Error finding user by username:', error);
      throw error;
    }
  }

  /**
   * Find user by email
   * @param {string} email - Email address
   * @returns {Promise<User|null>} User or null
   */
  async findByEmail(email) {
    try {
      const query = 'SELECT * FROM [User] WITH (NOLOCK) WHERE Email = @email';
      const result = await executeQuery(query, { email });
      return result.recordset[0] ? new User(result.recordset[0]) : null;
    } catch (error) {
      logger.error('Error finding user by email:', error);
      throw error;
    }
  }

  /**
   * Update user login information
   * @param {number} userId - User ID
   * @param {boolean} success - Login success status
   * @returns {Promise<boolean>} Success status
   */
  async updateLoginInfo(userId, success = true) {
    try {
      if (success) {
        const query = `
          UPDATE [User] 
          SET LastLoginDate = GETDATE(), FailedLoginAttempts = 0
          WHERE UserId = @userId
        `;
        await executeQuery(query, { userId });
      } else {
        const query = `
          UPDATE [User] 
          SET FailedLoginAttempts = FailedLoginAttempts + 1,
              IsLocked = CASE WHEN FailedLoginAttempts >= 4 THEN 1 ELSE 0 END
          WHERE UserId = @userId
        `;
        await executeQuery(query, { userId });
      }
      return true;
    } catch (error) {
      logger.error('Error updating user login info:', error);
      throw error;
    }
  }

  /**
   * Lock/unlock user account
   * @param {number} userId - User ID
   * @param {boolean} locked - Lock status
   * @returns {Promise<boolean>} Success status
   */
  async setLockStatus(userId, locked) {
    try {
      const query = 'UPDATE [User] SET IsLocked = @locked WHERE UserId = @userId';
      const result = await executeQuery(query, { locked: locked ? 1 : 0, userId });
      return result.rowsAffected[0] > 0;
    } catch (error) {
      logger.error('Error setting user lock status:', error);
      throw error;
    }
  }

  /**
   * Get users by church
   * @param {number} churchId - Church ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of users
   */
  async findByChurch(churchId, options = {}) {
    try {
      const { page = 1, limit = 10 } = options;
      const offset = (page - 1) * limit;

      const query = `
        SELECT * FROM [User] WITH (NOLOCK)
        WHERE ChurchId = @churchId
        ORDER BY UserId DESC
        OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY
      `;

      const result = await executeQuery(query, { churchId });
      return result.recordset.map(user => new User(user));
    } catch (error) {
      logger.error('Error finding users by church:', error);
      throw error;
    }
  }
}

module.exports = UserRepository;
