const BaseRepository = require('./BaseRepository');
const { executeQuery } = require('../config/database');
const logger = require('../utils/logger');
const Person = require('../models/Person');

/**
 * Person repository for database operations
 */
class PersonRepository extends BaseRepository {
  constructor() {
    super('Persons');
  }

  getPrimaryKey() {
    return 'PersonId';
  }

  /**
   * Find person by email
   * @param {string} email - Email address
   * @returns {Promise<Person|null>} Person or null
   */
  async findByEmail(email) {
    try {
      const query = 'SELECT * FROM Persons WITH (NOLOCK) WHERE EmailID = @email';
      const result = await executeQuery(query, { email });
      return result.recordset[0] ? new Person(result.recordset[0]) : null;
    } catch (error) {
      logger.error('Error finding person by email:', error);
      throw error;
    }
  }

  /**
   * Find persons by church
   * @param {number} churchId - Church ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of persons
   */
  async findByChurch(churchId, options = {}) {
    try {
      const { page = 1, limit = 10 } = options;
      const offset = (page - 1) * limit;

      const query = `
        SELECT * FROM Persons WITH (NOLOCK)
        WHERE ChurchId = @churchId
        ORDER BY Name
        OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY
      `;

      const result = await executeQuery(query, { churchId });
      return result.recordset.map(person => new Person(person));
    } catch (error) {
      logger.error('Error finding persons by church:', error);
      throw error;
    }
  }

  /**
   * Search persons by name
   * @param {string} searchTerm - Search term
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of matching persons
   */
  async searchByName(searchTerm, options = {}) {
    try {
      const { page = 1, limit = 10 } = options;
      const offset = (page - 1) * limit;

      const query = `
        SELECT * FROM Persons WITH (NOLOCK)
        WHERE Name LIKE @searchTerm
        ORDER BY Name
        OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY
      `;

      const result = await executeQuery(query, { searchTerm: `%${searchTerm}%` });
      return result.recordset.map(person => new Person(person));
    } catch (error) {
      logger.error('Error searching persons by name:', error);
      throw error;
    }
  }

  /**
   * Get persons with their church information
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of persons with church data
   */
  async findAllWithChurch(options = {}) {
    try {
      const { page = 1, limit = 10 } = options;
      const offset = (page - 1) * limit;

      const query = `
        SELECT p.*, c.Name as ChurchName, c.Address as ChurchAddress
        FROM Persons p WITH (NOLOCK)
        LEFT JOIN Churches c WITH (NOLOCK) ON p.ChurchId = c.ChurchId
        ORDER BY p.Name
        OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY
      `;

      const result = await executeQuery(query);
      return result.recordset.map(person => new Person(person));
    } catch (error) {
      logger.error('Error finding persons with church:', error);
      throw error;
    }
  }

  /**
   * Find a person by ID number (NRIC/FIN) and optional church
   * @param {string} idNo - Singapore NRIC/FIN
   * @param {number} churchId - Optional church filter
   * @returns {Promise<Person|null>}
   */
  async findByIdNo(idNo, churchId = null) {
    try {
      if (!idNo || idNo.trim() === '') {
        return null;
      }

      const query = `
        SELECT TOP 1 *
        FROM Person WITH (NOLOCK)
        WHERE IDNo = @idNo
        ${churchId ? 'AND ChurchId = @churchId' : ''}
        ORDER BY PersonId DESC
      `;

      const params = { idNo };
      if (churchId) params.churchId = churchId;

      const result = await executeQuery(query, params);
      if (!result.recordset || result.recordset.length === 0) {
        return null;
      }

      return new Person(result.recordset[0]);
    } catch (error) {
      logger.error('Error finding person by ID number:', error);
      throw error;
    }
  }

  /**
   * Create or update a person using ID number as the natural key
   * @param {Object} personData - Person information (camelCase keys)
   * @returns {Promise<Person>} Upserted person
   */
  async upsertByIdNo(personData) {
    try {
      const { IDNo, ChurchId } = this._buildPersonParams(personData);
      if (!IDNo) {
        throw new Error('IDNo is required to upsert a person');
      }
      if (!ChurchId) {
        throw new Error('ChurchId is required to upsert a person');
      }

      const existing = await this.findByIdNo(IDNo, ChurchId);
      const params = this._buildPersonParams(personData);

      if (existing && existing.personId) {
        params.PersonId = existing.personId;

        const setColumns = Object.keys(params).filter(column => column !== 'PersonId');
        if (setColumns.length === 0) {
          return existing;
        }

        const updateQuery = `
          UPDATE Person
          SET ${setColumns.map(column => `${column} = @${column}`).join(', ')}
          OUTPUT INSERTED.*
          WHERE PersonId = @PersonId
        `;

        const result = await executeQuery(updateQuery, params);
        return new Person(result.recordset[0]);
      }

      const columns = Object.keys(params);
      const insertQuery = `
        INSERT INTO Person (${columns.join(', ')})
        OUTPUT INSERTED.*
        VALUES (${columns.map(column => `@${column}`).join(', ')})
      `;

      const result = await executeQuery(insertQuery, params);
      return new Person(result.recordset[0]);
    } catch (error) {
      logger.error('Error upserting person:', error);
      throw error;
    }
  }

  /**
   * Build SQL parameter map (PascalCase) from camelCase payload
   * @param {Object} data - Person info in camelCase
   * @returns {Object} SQL parameter map using legacy column names
   * @private
   */
  _buildPersonParams(data = {}) {
    const columnMap = {
      Name: 'name',
      AddressNo: 'addressNo',
      AddressLine1: 'addressLine1',
      AddressLine2: 'addressLine2',
      AddressCity: 'addressCity',
      AddressState: 'addressState',
      AddressCountry: 'addressCountry',
      EmailID: 'emailID',
      IDNo: 'idNo',
      MobileNo: 'mobileNo',
      HomeTelNo: 'homeTelNo',
      OfficeTelNo: 'officeTelNo',
      IsCatholic: 'isCatholic',
      ChurchId: 'churchId',
      RelationshipToApplicant: 'relationshipToApplicant',
      Remarks: 'remarks',
      Status: 'status'
    };

    const params = {};
    Object.entries(columnMap).forEach(([column, key]) => {
      if (Object.prototype.hasOwnProperty.call(data, key) && data[key] !== undefined) {
        params[column] = data[key];
      }
    });

    return params;
  }
}

module.exports = PersonRepository;
