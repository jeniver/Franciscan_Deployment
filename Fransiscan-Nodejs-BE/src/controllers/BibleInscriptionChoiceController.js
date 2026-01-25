const BaseController = require('./BaseController');
const BibleInscriptionChoiceService = require('../services/BibleInscriptionChoiceService');
const logger = require('../utils/logger');

/**
 * BibleInscriptionChoiceController
 * Handles HTTP requests for Bible Inscription Choice operations
 */
class BibleInscriptionChoiceController extends BaseController {
  constructor() {
    super();
    this.service = new BibleInscriptionChoiceService();
  }

  /**
   * Get all Bible choices for current user's church
   * GET /api/bible-choices
   */
  getAllBibleChoices = this.asyncHandler(async (req, res) => {
    this.logRequest(req, 'Get All Bible Choices');

    try {
      const user = req.user;
      const churchId = user?.churchId;

      if (!churchId) {
        return this.sendError(res, 'ChurchId is required. Please ensure you are authenticated.', 400);
      }

      const result = await this.service.getAllBibleChoices(churchId);

      if (!result.success) {
        const statusCode = result.error?.code === 'GET_BIBLE_CHOICES_ERROR' ? 500 : 400;
        return res.status(statusCode).json(result);
      }

      // Include count in the data object
      return this.sendSuccess(res, {
        choices: result.data,
        count: result.count
      }, 'Bible choices retrieved successfully');
    } catch (error) {
      logger.error('Controller: Failed to get Bible choices:', error);
      return this.sendError(res, 'Failed to retrieve Bible choices', 500);
    }
  });

  /**
   * Get Bible choice by ID
   * GET /api/bible-choices/:choiceId
   */
  getBibleChoiceById = this.asyncHandler(async (req, res) => {
    this.logRequest(req, 'Get Bible Choice by ID');

    try {
      const user = req.user;
      const churchId = user?.churchId;
      const { choiceId } = req.params;
      const choiceIdNum = parseInt(choiceId, 10);

      if (!churchId) {
        return this.sendError(res, 'ChurchId is required. Please ensure you are authenticated.', 400);
      }

      if (isNaN(choiceIdNum)) {
        return this.sendError(res, 'Invalid ChoiceId. Must be a number.', 400);
      }

      const result = await this.service.getBibleChoiceById(choiceIdNum, churchId);

      if (!result.success) {
        const statusCode = result.error?.code === 'BIBLE_CHOICE_NOT_FOUND' ? 404 : 400;
        return res.status(statusCode).json(result);
      }

      return this.sendSuccess(res, result.data, 'Bible choice retrieved successfully');
    } catch (error) {
      logger.error('Controller: Failed to get Bible choice by ID:', error);
      return this.sendError(res, 'Failed to retrieve Bible choice', 500);
    }
  });
}

module.exports = BibleInscriptionChoiceController;

