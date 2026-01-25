const BaseService = require('./BaseService');
const User = require('../models/User');
const { executeQuery } = require('../config/database');

/**
 * User service for business logic
 */
class UserService extends BaseService {
  constructor(userRepository) {
    super(userRepository);
  }

  /**
   * Validate user data
   * @param {Object} data - User data
   * @param {boolean} isUpdate - Whether this is an update operation
   * @returns {Array} Array of validation errors
   */
  validateData(data, isUpdate = false) {
    const errors = [];
    const user = new User(data);

    // Use model validation
    const modelErrors = user.validate();
    errors.push(...modelErrors);

    // Additional business logic validation
    if (!isUpdate && !data.password) {
      errors.push('Password is required for new users');
    }

    if (data.email && !this.isValidEmail(data.email)) {
      errors.push('Valid email is required');
    }

    return errors;
  }

  /**
   * Validate email format
   * @param {string} email - Email address
   * @returns {boolean} Whether email is valid
   */
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Get users with additional information (e.g. church/category)
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Paginated results with user details
   */
  async getAllWithDetails(options = {}) {
    try {
      const { page = 1, limit = 10, ...filters } = options;

      // Build where clause from filters
      const whereClause = this.buildWhereClause(filters);
      const params = this.buildParams(filters);

      // Get users with church/category information
      const query = `
        SELECT u.*, c.ChurchName as ChurchName
        FROM [User] u
        LEFT JOIN [Church] c ON u.ChurchId = c.ChurchId
        ${whereClause ? `WHERE ${whereClause}` : ''}
        ORDER BY u.UserId DESC
        OFFSET ${(page - 1) * limit} ROWS FETCH NEXT ${limit} ROWS ONLY
      `;

      const result = await executeQuery(query, params);
      const users = result.recordset.map(userData => {
        const user = new User(userData);
        // Attach church/category info to the user model
        user.churchName = userData.ChurchName || null;
        return user;
      });

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total 
        FROM [User] u
        LEFT JOIN [Church] c ON u.ChurchId = c.ChurchId
        ${whereClause ? `WHERE ${whereClause}` : ''}
      `;

      const countResult = await executeQuery(countQuery, params);
      const total = countResult.recordset[0].total;

      return {
        data: users.map(user => user.toJSON()),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get a single user with additional information (e.g. church/category)
   * @param {number} id - User ID
   * @returns {Promise<User|null>} User with details or null
   */
  async getByIdWithDetails(id) {
    try {
      const query = `
        SELECT u.*, c.ChurchName as ChurchName
        FROM [User] u
        LEFT JOIN [Church] c ON u.ChurchId = c.ChurchId
        WHERE u.UserId = @id
      `;

      const result = await executeQuery(query, { id });
      const row = result.recordset[0];

      if (!row) {
        return null;
      }

      const user = new User(row);
      user.churchName = row.ChurchName || null;
      return user;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = UserService;
