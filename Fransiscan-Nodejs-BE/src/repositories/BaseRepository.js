const { executeQuery, executeProcedure } = require('../config/database');
const logger = require('../utils/logger');

/**
 * Base repository class with common database operations
 */
class BaseRepository {
  constructor(tableName) {
    this.tableName = tableName;
  }

  /**
   * Find all records with optional pagination
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of records
   */
  async findAll(options = {}) {
    try {
      const { page = 1, limit = 10, where = '', orderBy = '', params = {} } = options;
      const offset = (page - 1) * limit;

      let query = `SELECT * FROM ${this.tableName}`;

      if (where) {
        query += ` WHERE ${where}`;
      }

      if (orderBy) {
        query += ` ORDER BY ${orderBy}`;
      }

      query += ` OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY`;

      const result = await executeQuery(query, params);
      return result.recordset;
    } catch (error) {
      logger.error(`Error finding all records in ${this.tableName}:`, error);
      throw error;
    }
  }

  /**
   * Find record by ID
   * @param {number} id - Record ID
   * @returns {Promise<Object|null>} Record or null
   */
  async findById(id) {
    try {
      const query = `SELECT * FROM ${this.tableName} WHERE ${this.getPrimaryKey()} = @id`;
      const result = await executeQuery(query, { id });
      return result.recordset[0] || null;
    } catch (error) {
      logger.error(`Error finding record by ID in ${this.tableName}:`, error);
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
      const fields = Object.keys(data).filter(key => data[key] !== undefined);
      const values = fields.map(field => `@${field}`).join(', ');
      const fieldNames = fields.join(', ');

      const query = `
        INSERT INTO ${this.tableName} (${fieldNames})
        OUTPUT INSERTED.*
        VALUES (${values})
      `;

      const result = await executeQuery(query, data);
      return result.recordset[0];
    } catch (error) {
      logger.error(`Error creating record in ${this.tableName}:`, error);
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
      const fields = Object.keys(data).filter(key => data[key] !== undefined);
      const setClause = fields.map(field => `${field} = @${field}`).join(', ');

      const query = `
        UPDATE ${this.tableName}
        SET ${setClause}
        OUTPUT INSERTED.*
        WHERE ${this.getPrimaryKey()} = @id
      `;

      const params = { ...data, id };
      const result = await executeQuery(query, params);
      return result.recordset[0] || null;
    } catch (error) {
      logger.error(`Error updating record in ${this.tableName}:`, error);
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
      const query = `DELETE FROM ${this.tableName} WHERE ${this.getPrimaryKey()} = @id`;
      const result = await executeQuery(query, { id });
      return result.rowsAffected[0] > 0;
    } catch (error) {
      logger.error(`Error deleting record in ${this.tableName}:`, error);
      throw error;
    }
  }

  /**
   * Count total records
   * @param {string} where - WHERE clause
   * @param {Object} params - Query parameters
   * @returns {Promise<number>} Total count
   */
  async count(where = '', params = {}) {
    try {
      let query = `SELECT COUNT(*) as total FROM ${this.tableName}`;

      if (where) {
        query += ` WHERE ${where}`;
      }

      const result = await executeQuery(query, params);
      return result.recordset[0].total;
    } catch (error) {
      logger.error(`Error counting records in ${this.tableName}:`, error);
      throw error;
    }
  }

  /**
   * Get primary key field name (override in subclasses)
   * @returns {string} Primary key field name
   */
  getPrimaryKey() {
    return 'id';
  }
}

module.exports = BaseRepository;
