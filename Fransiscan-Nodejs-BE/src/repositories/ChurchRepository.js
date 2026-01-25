const BaseRepository = require('./BaseRepository');
const { executeQuery } = require('../config/database');
const logger = require('../utils/logger');
const Church = require('../models/Church');

/**
 * Church repository for database operations
 */
class ChurchRepository extends BaseRepository {
  constructor() {
    super('Churches');
  }

  getPrimaryKey() {
    return 'ChurchId';
  }

  /**
   * Find church by name
   * @param {string} name - Church name
   * @returns {Promise<Church|null>} Church or null
   */
  async findByName(name) {
    try {
      const query = 'SELECT * FROM Churches WHERE Name = @name';
      const result = await executeQuery(query, { name });
      return result.recordset[0] ? new Church(result.recordset[0]) : null;
    } catch (error) {
      logger.error('Error finding church by name:', error);
      throw error;
    }
  }

  /**
   * Get active churches
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of active churches
   */
  async findActive(options = {}) {
    try {
      const { page = 1, limit = 10 } = options;
      const offset = (page - 1) * limit;

      const query = `
        SELECT * FROM Churches 
        WHERE Active = 1
        ORDER BY Name
        OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY
      `;

      const result = await executeQuery(query);
      return result.recordset.map(church => new Church(church));
    } catch (error) {
      logger.error('Error finding active churches:', error);
      throw error;
    }
  }

  /**
   * Search churches by name
   * @param {string} searchTerm - Search term
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of matching churches
   */
  async searchByName(searchTerm, options = {}) {
    try {
      const { page = 1, limit = 10 } = options;
      const offset = (page - 1) * limit;

      const query = `
        SELECT * FROM Churches 
        WHERE Name LIKE @searchTerm
        ORDER BY Name
        OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY
      `;

      const result = await executeQuery(query, { searchTerm: `%${searchTerm}%` });
      return result.recordset.map(church => new Church(church));
    } catch (error) {
      logger.error('Error searching churches by name:', error);
      throw error;
    }
  }
}

module.exports = ChurchRepository;
