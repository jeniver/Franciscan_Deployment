const logger = require('../utils/logger');

/**
 * Base service class with common business logic
 */
class BaseService {
  constructor(repository) {
    this.repository = repository;
  }

  /**
   * Get all records with pagination
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Paginated results
   */
  async getAll(options = {}) {
    try {
      const { page = 1, limit = 10, ...filters } = options;

      // Build where clause from filters
      const whereClause = this.buildWhereClause(filters);
      const params = this.buildParams(filters);

      const [records, total] = await Promise.all([
        this.repository.findAll({ page, limit, where: whereClause, params }),
        this.repository.count(whereClause, params)
      ]);

      return {
        data: records,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error(`Error getting all records in ${this.constructor.name}:`, error);
      throw error;
    }
  }

  /**
   * Get record by ID
   * @param {number} id - Record ID
   * @returns {Promise<Object|null>} Record or null
   */
  async getById(id) {
    try {
      return await this.repository.findById(id);
    } catch (error) {
      logger.error(`Error getting record by ID in ${this.constructor.name}:`, error);
      throw error;
    }
  }

  /**
   * Create new record
   * @param {Object} data - Record data
   * @returns {Promise<Object>} Created record
   */
  async create(data) {
    try {
      // Validate data before creating
      const validationErrors = this.validateData(data);
      if (validationErrors.length > 0) {
        throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
      }

      return await this.repository.create(data);
    } catch (error) {
      logger.error(`Error creating record in ${this.constructor.name}:`, error);
      throw error;
    }
  }

  /**
   * Update record by ID
   * @param {number} id - Record ID
   * @param {Object} data - Update data
   * @returns {Promise<Object|null>} Updated record or null
   */
  async update(id, data) {
    try {
      // Validate data before updating
      const validationErrors = this.validateData(data, true);
      if (validationErrors.length > 0) {
        throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
      }

      return await this.repository.update(id, data);
    } catch (error) {
      logger.error(`Error updating record in ${this.constructor.name}:`, error);
      throw error;
    }
  }

  /**
   * Delete record by ID
   * @param {number} id - Record ID
   * @returns {Promise<boolean>} Success status
   */
  async delete(id) {
    try {
      return await this.repository.delete(id);
    } catch (error) {
      logger.error(`Error deleting record in ${this.constructor.name}:`, error);
      throw error;
    }
  }

  /**
   * Build WHERE clause from filters (override in subclasses)
   * @param {Object} filters - Filter object
   * @returns {string} WHERE clause
   */
  buildWhereClause(filters) {
    const conditions = [];

    Object.keys(filters).forEach(key => {
      if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
        conditions.push(`${key} = @${key}`);
      }
    });

    return conditions.join(' AND ');
  }

  /**
   * Build parameters object from filters
   * @param {Object} filters - Filter object
   * @returns {Object} Parameters object
   */
  buildParams(filters) {
    const params = {};

    Object.keys(filters).forEach(key => {
      if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
        params[key] = filters[key];
      }
    });

    return params;
  }

  /**
   * Validate data (override in subclasses)
   * @param {Object} data - Data to validate
   * @param {boolean} isUpdate - Whether this is an update operation
   * @returns {Array} Array of validation errors
   */
  validateData(data, isUpdate = false) {
    // Base validation - override in subclasses
    return [];
  }
}

module.exports = BaseService;
