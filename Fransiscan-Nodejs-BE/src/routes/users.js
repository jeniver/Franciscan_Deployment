const express = require('express');
const router = express.Router();
const BaseController = require('../controllers/BaseController');
const UserService = require('../services/UserService');
const UserRepository = require('../repositories/UserRepository');
const { authenticateToken, authorize } = require('../middleware/auth');
const { validate, commonValidations } = require('../middleware/validation');

const userController = new BaseController();
const userRepository = new UserRepository();
const userService = new UserService(userRepository);

// All routes require authentication
router.use(authenticateToken);

// Get all users (admin only)
router.get('/',
  authorize(['admin']),
  userController.asyncHandler(async(req, res) => {
    userController.logRequest(req, 'Get All Users');

    const pagination = userController.getPaginationParams(req);
    const filters = { ...req.query };
    delete filters.page;
    delete filters.limit;

    try {
      const result = await userService.getAll({ ...pagination, ...filters });
      userController.sendSuccess(res, result, 'Users retrieved successfully');
    } catch (error) {
      userController.sendError(res, 'Failed to retrieve users', 500);
    }
  })
);

// Search users with categories (admin only)
router.get('/search',
  authorize(['admin']),
  userController.asyncHandler(async(req, res) => {
    userController.logRequest(req, 'Search Users with Categories');

    const pagination = userController.getPaginationParams(req);
    const filters = { ...req.query };
    delete filters.page;
    delete filters.limit;

    try {
      const result = await userService.getAllWithDetails({ ...pagination, ...filters });
      userController.sendSuccess(res, result, 'Users with categories retrieved successfully');
    } catch (error) {
      userController.sendError(res, 'Failed to retrieve users with categories', 500);
    }
  })
);

// Get user by ID
router.get('/:id',
  commonValidations.id,
  validate,
  userController.asyncHandler(async(req, res) => {
    userController.logRequest(req, 'Get User by ID');

    try {
      const user = await userService.getByIdWithDetails(req.params.id);
      if (!user) {
        return userController.sendError(res, 'User not found', 404);
      }

      userController.sendSuccess(res, user.toJSON(), 'User retrieved successfully');
    } catch (error) {
      userController.sendError(res, 'Failed to retrieve user', 500);
    }
  })
);

// Create new user (admin only)
router.post('/',
  authorize(['admin']),
  commonValidations.user.create,
  validate,
  userController.asyncHandler(async(req, res) => {
    userController.logRequest(req, 'Create User');

    try {
      const user = await userService.create(req.body);
      userController.sendSuccess(res, user.toJSON(), 'User created successfully', 201);
    } catch (error) {
      userController.sendError(res, error.message, 400);
    }
  })
);

// Update user (admin only)
router.put('/:id',
  authorize(['admin']),
  commonValidations.id,
  commonValidations.user.update,
  validate,
  userController.asyncHandler(async(req, res) => {
    userController.logRequest(req, 'Update User');

    try {
      const user = await userService.update(req.params.id, req.body);
      if (!user) {
        return userController.sendError(res, 'User not found', 404);
      }

      userController.sendSuccess(res, user.toJSON(), 'User updated successfully');
    } catch (error) {
      userController.sendError(res, error.message, 400);
    }
  })
);

// Delete user (admin only)
router.delete('/:id',
  authorize(['admin']),
  commonValidations.id,
  validate,
  userController.asyncHandler(async(req, res) => {
    userController.logRequest(req, 'Delete User');

    try {
      const success = await userService.delete(req.params.id);
      if (!success) {
        return userController.sendError(res, 'User not found', 404);
      }

      userController.sendSuccess(res, null, 'User deleted successfully');
    } catch (error) {
      userController.sendError(res, 'Failed to delete user', 500);
    }
  })
);

// Lock/unlock user account (admin only)
router.patch('/:id/lock',
  authorize(['admin']),
  commonValidations.id,
  validate,
  userController.asyncHandler(async(req, res) => {
    userController.logRequest(req, 'Lock/Unlock User');

    if (!userController.validateRequired(req, res, ['locked'])) {
      return;
    }

    try {
      const success = await userRepository.setLockStatus(req.params.id, req.body.locked);
      if (!success) {
        return userController.sendError(res, 'User not found', 404);
      }

      const action = req.body.locked ? 'locked' : 'unlocked';
      userController.sendSuccess(res, null, `User ${action} successfully`);
    } catch (error) {
      userController.sendError(res, 'Failed to update user lock status', 500);
    }
  })
);

// Get users by church
router.get('/church/:churchId',
  commonValidations.id,
  validate,
  userController.asyncHandler(async(req, res) => {
    userController.logRequest(req, 'Get Users by Church');

    const pagination = userController.getPaginationParams(req);

    try {
      const users = await userRepository.findByChurch(req.params.churchId, pagination);
      userController.sendSuccess(res, users.map(u => u.toJSON()), 'Users retrieved successfully');
    } catch (error) {
      userController.sendError(res, 'Failed to retrieve users', 500);
    }
  })
);

module.exports = router;
