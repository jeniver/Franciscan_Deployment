const { executeQuery } = require('../config/database');
const BibleInscriptionChoice = require('../models/BibleInscriptionChoice');
const logger = require('../utils/logger');

/**
 * BibleInscriptionChoice repository for database operations
 * Handles all Bible inscription choice related database queries
 */
class BibleInscriptionChoiceRepository {
  /**
   * Get all Bible inscription choices for a church
   * @param {number} churchId - Church ID
   * @returns {Promise<Array<BibleInscriptionChoice>>} List of Bible choices
   */
  async getAllBibleChoices(churchId) {
    try {
      const query = `
        SELECT 
          BibleInscriptionChoiceId,
          BibleInscriptionChoiceNo,
          BibleInscriptionChoiceNoValue,
          ChurchId
        FROM BibleInscriptionChoice WITH (NOLOCK)
        WHERE ChurchId = @churchId
        ORDER BY BibleInscriptionChoiceNo ASC
      `;

      const result = await executeQuery(query, { churchId });

      if (!result.recordset || result.recordset.length === 0) {
        return [];
      }

      return result.recordset.map(row => 
        BibleInscriptionChoice.fromDatabase(row)
      );
    } catch (error) {
      logger.error('Error in getAllBibleChoices:', error);
      throw error;
    }
  }

  /**
   * Get Bible choice by ID
   * @param {number} choiceId - Bible Inscription Choice ID
   * @param {number} churchId - Church ID (for security/validation)
   * @returns {Promise<BibleInscriptionChoice|null>} Bible choice or null
   */
  async getBibleChoiceById(choiceId, churchId) {
    try {
      const query = `
        SELECT 
          BibleInscriptionChoiceId,
          BibleInscriptionChoiceNo,
          BibleInscriptionChoiceNoValue,
          ChurchId
        FROM BibleInscriptionChoice WITH (NOLOCK)
        WHERE BibleInscriptionChoiceId = @choiceId
          AND ChurchId = @churchId
      `;

      const result = await executeQuery(query, { 
        choiceId, 
        churchId 
      });

      if (!result.recordset || result.recordset.length === 0) {
        return null;
      }

      return BibleInscriptionChoice.fromDatabase(result.recordset[0]);
    } catch (error) {
      logger.error('Error in getBibleChoiceById:', error);
      throw error;
    }
  }

  /**
   * Get Bible choice by choice number
   * @param {string} choiceNo - Bible Inscription Choice Number (e.g., "No1-Psalm 4:8")
   * @param {number} churchId - Church ID
   * @returns {Promise<BibleInscriptionChoice|null>} Bible choice or null
   */
  async getBibleChoiceByNo(choiceNo, churchId) {
    try {
      const query = `
        SELECT 
          BibleInscriptionChoiceId,
          BibleInscriptionChoiceNo,
          BibleInscriptionChoiceNoValue,
          ChurchId
        FROM BibleInscriptionChoice WITH (NOLOCK)
        WHERE BibleInscriptionChoiceNo = @choiceNo
          AND ChurchId = @churchId
      `;

      const result = await executeQuery(query, { 
        choiceNo, 
        churchId 
      });

      if (!result.recordset || result.recordset.length === 0) {
        return null;
      }

      return BibleInscriptionChoice.fromDatabase(result.recordset[0]);
    } catch (error) {
      logger.error('Error in getBibleChoiceByNo:', error);
      throw error;
    }
  }
}

module.exports = BibleInscriptionChoiceRepository;

