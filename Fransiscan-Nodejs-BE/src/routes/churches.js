const express = require('express');
const router = express.Router();
const BaseController = require('../controllers/BaseController');
const ChurchService = require('../services/ChurchService');
const ChurchRepository = require('../repositories/ChurchRepository');
const { authenticateToken, authorize } = require('../middleware/auth');
const { validate, commonValidations } = require('../middleware/validation');

const churchController = new BaseController();
const churchRepository = new ChurchRepository();
const churchService = new ChurchService(churchRepository);

// All routes require authentication
router.use(authenticateToken);

// Get all churches
router.get('/',
  churchController.asyncHandler(async(req, res) => {
    churchController.logRequest(req, 'Get All Churches');

    const pagination = churchController.getPaginationParams(req);
    const filters = { ...req.query };
    delete filters.page;
    delete filters.limit;

    try {
      const result = await churchService.getAll({ ...pagination, ...filters });
      churchController.sendSuccess(res, result, 'Churches retrieved successfully');
    } catch (error) {
      churchController.sendError(res, 'Failed to retrieve churches', 500);
    }
  })
);

// Get active churches only
router.get('/active',
  churchController.asyncHandler(async(req, res) => {
    churchController.logRequest(req, 'Get Active Churches');

    const pagination = churchController.getPaginationParams(req);

    try {
      const churches = await churchRepository.findActive(pagination);
      churchController.sendSuccess(res, churches, 'Active churches retrieved successfully');
    } catch (error) {
      churchController.sendError(res, 'Failed to retrieve active churches', 500);
    }
  })
);

// Search churches by name
router.get('/search',
  churchController.asyncHandler(async(req, res) => {
    churchController.logRequest(req, 'Search Churches');

    if (!req.query.q) {
      return churchController.sendError(res, 'Search query is required', 400);
    }

    const pagination = churchController.getPaginationParams(req);

    try {
      const churches = await churchRepository.searchByName(req.query.q, pagination);
      churchController.sendSuccess(res, churches, 'Search results retrieved successfully');
    } catch (error) {
      churchController.sendError(res, 'Failed to search churches', 500);
    }
  })
);

// Get church by ID
router.get('/:id',
  commonValidations.id,
  validate,
  churchController.asyncHandler(async(req, res) => {
    churchController.logRequest(req, 'Get Church by ID');

    try {
      const church = await churchService.getById(req.params.id);
      if (!church) {
        return churchController.sendError(res, 'Church not found', 404);
      }

      churchController.sendSuccess(res, church, 'Church retrieved successfully');
    } catch (error) {
      churchController.sendError(res, 'Failed to retrieve church', 500);
    }
  })
);

// Create new church (admin only)
router.post('/',
  authorize(['admin']),
  commonValidations.church.create,
  validate,
  churchController.asyncHandler(async(req, res) => {
    churchController.logRequest(req, 'Create Church');

    try {
      const church = await churchService.create(req.body);
      churchController.sendSuccess(res, church, 'Church created successfully', 201);
    } catch (error) {
      churchController.sendError(res, error.message, 400);
    }
  })
);

// Update church (admin only)
router.put('/:id',
  authorize(['admin']),
  commonValidations.id,
  commonValidations.church.update,
  validate,
  churchController.asyncHandler(async(req, res) => {
    churchController.logRequest(req, 'Update Church');

    try {
      const church = await churchService.update(req.params.id, req.body);
      if (!church) {
        return churchController.sendError(res, 'Church not found', 404);
      }

      churchController.sendSuccess(res, church, 'Church updated successfully');
    } catch (error) {
      churchController.sendError(res, error.message, 400);
    }
  })
);

// Delete church (admin only)
router.delete('/:id',
  authorize(['admin']),
  commonValidations.id,
  validate,
  churchController.asyncHandler(async(req, res) => {
    churchController.logRequest(req, 'Delete Church');

    try {
      const success = await churchService.delete(req.params.id);
      if (!success) {
        return churchController.sendError(res, 'Church not found', 404);
      }

      churchController.sendSuccess(res, null, 'Church deleted successfully');
    } catch (error) {
      churchController.sendError(res, 'Failed to delete church', 500);
    }
  })
);

module.exports = router;
