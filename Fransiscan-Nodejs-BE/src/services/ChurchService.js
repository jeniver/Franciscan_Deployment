const BaseService = require('./BaseService');
const Church = require('../models/Church');

/**
 * Church service for business logic
 */
class ChurchService extends BaseService {
  constructor(churchRepository) {
    super(churchRepository);
  }

  /**
   * Validate church data
   * @param {Object} data - Church data
   * @param {boolean} isUpdate - Whether this is an update operation
   * @returns {Array} Array of validation errors
   */
  validateData(data, isUpdate = false) {
    const errors = [];
    const church = new Church(data);

    // Use model validation
    const modelErrors = church.validate();
    errors.push(...modelErrors);

    return errors;
  }
}

module.exports = ChurchService;
