const BibleInscriptionChoiceRepository = require('../repositories/BibleInscriptionChoiceRepository');
const logger = require('../utils/logger');

/**
 * BibleInscriptionChoiceService
 * Business logic layer for Bible Inscription Choice operations
 */
class BibleInscriptionChoiceService {
  constructor() {
    this.repository = new BibleInscriptionChoiceRepository();
  }

  /**
   * Get all Bible choices for a church
   * @param {number} churchId - Church ID
   * @returns {Promise<Object>} Service result with choices array
   */
  async getAllBibleChoices(churchId) {
    try {
      if (!churchId) {
        throw new Error('ChurchId is required');
      }

      const choices = await this.repository.getAllBibleChoices(churchId);

      return {
        success: true,
        data: choices.map(choice => choice.toJSON()),
        count: choices.length
      };
    } catch (error) {
      logger.error('Error in BibleInscriptionChoiceService.getAllBibleChoices:', error);
      return {
        success: false,
        error: {
          code: 'GET_BIBLE_CHOICES_ERROR',
          message: error.message || 'Failed to retrieve Bible choices'
        }
      };
    }
  }

  /**
   * Get Bible choice by ID
   * @param {number} choiceId - Bible Inscription Choice ID
   * @param {number} churchId - Church ID (for security validation)
   * @returns {Promise<Object>} Service result with choice
   */
  async getBibleChoiceById(choiceId, churchId) {
    try {
      if (!choiceId || !churchId) {
        throw new Error('ChoiceId and ChurchId are required');
      }

      const choice = await this.repository.getBibleChoiceById(choiceId, churchId);

      if (!choice) {
        return {
          success: false,
          error: {
            code: 'BIBLE_CHOICE_NOT_FOUND',
            message: 'Bible choice not found or does not belong to this church'
          }
        };
      }

      return {
        success: true,
        data: choice.toJSON()
      };
    } catch (error) {
      logger.error('Error in BibleInscriptionChoiceService.getBibleChoiceById:', error);
      return {
        success: false,
        error: {
          code: 'GET_BIBLE_CHOICE_ERROR',
          message: error.message || 'Failed to retrieve Bible choice'
        }
      };
    }
  }

  /**
   * Get Bible choice by choice number
   * @param {string} choiceNo - Bible Inscription Choice Number
   * @param {number} churchId - Church ID
   * @returns {Promise<Object>} Service result with choice
   */
  async getBibleChoiceByNo(choiceNo, churchId) {
    try {
      if (!choiceNo || !churchId) {
        throw new Error('ChoiceNo and ChurchId are required');
      }

      const choice = await this.repository.getBibleChoiceByNo(choiceNo, churchId);

      if (!choice) {
        return {
          success: false,
          error: {
            code: 'BIBLE_CHOICE_NOT_FOUND',
            message: 'Bible choice not found or does not belong to this church'
          }
        };
      }

      return {
        success: true,
        data: choice.toJSON()
      };
    } catch (error) {
      logger.error('Error in BibleInscriptionChoiceService.getBibleChoiceByNo:', error);
      return {
        success: false,
        error: {
          code: 'GET_BIBLE_CHOICE_ERROR',
          message: error.message || 'Failed to retrieve Bible choice'
        }
      };
    }
  }
}

module.exports = BibleInscriptionChoiceService;

