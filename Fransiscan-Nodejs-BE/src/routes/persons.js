const express = require('express');
const router = express.Router();
const BaseController = require('../controllers/BaseController');
const PersonService = require('../services/PersonService');
const PersonRepository = require('../repositories/PersonRepository');
const { authenticateToken, authorize } = require('../middleware/auth');
const { validate, commonValidations } = require('../middleware/validation');

const personController = new BaseController();
const personRepository = new PersonRepository();
const personService = new PersonService(personRepository);

// All routes require authentication
router.use(authenticateToken);

// Get all persons
router.get('/',
  personController.asyncHandler(async(req, res) => {
    personController.logRequest(req, 'Get All Persons');

    const pagination = personController.getPaginationParams(req);
    const filters = { ...req.query };
    delete filters.page;
    delete filters.limit;

    try {
      const result = await personService.getAll({ ...pagination, ...filters });
      personController.sendSuccess(res, result, 'Persons retrieved successfully');
    } catch (error) {
      personController.sendError(res, 'Failed to retrieve persons', 500);
    }
  })
);

// Get persons with church information
router.get('/with-church',
  personController.asyncHandler(async(req, res) => {
    personController.logRequest(req, 'Get Persons with Church');

    const pagination = personController.getPaginationParams(req);

    try {
      const persons = await personRepository.findAllWithChurch(pagination);
      personController.sendSuccess(res, persons, 'Persons with church retrieved successfully');
    } catch (error) {
      personController.sendError(res, 'Failed to retrieve persons with church', 500);
    }
  })
);

// Search persons by name
router.get('/search',
  personController.asyncHandler(async(req, res) => {
    personController.logRequest(req, 'Search Persons');

    if (!req.query.q) {
      return personController.sendError(res, 'Search query is required', 400);
    }

    const pagination = personController.getPaginationParams(req);

    try {
      const persons = await personRepository.searchByName(req.query.q, pagination);
      personController.sendSuccess(res, persons, 'Search results retrieved successfully');
    } catch (error) {
      personController.sendError(res, 'Failed to search persons', 500);
    }
  })
);

// Get persons by church
router.get('/church/:churchId',
  commonValidations.id,
  validate,
  personController.asyncHandler(async(req, res) => {
    personController.logRequest(req, 'Get Persons by Church');

    const pagination = personController.getPaginationParams(req);

    try {
      const persons = await personRepository.findByChurch(req.params.churchId, pagination);
      personController.sendSuccess(res, persons, 'Persons retrieved successfully');
    } catch (error) {
      personController.sendError(res, 'Failed to retrieve persons', 500);
    }
  })
);

// Search customer-related persons (Contact Persons, Beneficiaries, Nominees)
router.get('/customers/search',
  personController.asyncHandler(async(req, res) => {
    personController.logRequest(req, 'Search Customer-related Persons');

    const pagination = personController.getPaginationParams(req);
    const q = req.query.q || '';
    const churchId = req.user && req.user.churchId ? req.user.churchId : null;

    try {
      const result = await personService.getCustomerRelated({ ...pagination, q, churchId });
      personController.sendSuccess(res, result, 'Customer-related persons retrieved successfully');
    } catch (error) {
      personController.sendError(res, 'Failed to retrieve customer-related persons', 500);
    }
  })
);

// Get single customer-related person by ID (with role flags)
router.get('/customers/:id',
  commonValidations.id,
  validate,
  personController.asyncHandler(async(req, res) => {
    personController.logRequest(req, 'Get Customer-related Person by ID');

    try {
      const person = await personService.getCustomerById(req.params.id);
      if (!person) {
        return personController.sendError(res, 'Customer not found', 404);
      }

      personController.sendSuccess(res, person, 'Customer retrieved successfully');
    } catch (error) {
      personController.sendError(res, 'Failed to retrieve customer', 500);
    }
  })
);

// Get person by ID
router.get('/:id',
  commonValidations.id,
  validate,
  personController.asyncHandler(async(req, res) => {
    personController.logRequest(req, 'Get Person by ID');

    try {
      const person = await personService.getById(req.params.id);
      if (!person) {
        return personController.sendError(res, 'Person not found', 404);
      }

      personController.sendSuccess(res, person, 'Person retrieved successfully');
    } catch (error) {
      personController.sendError(res, 'Failed to retrieve person', 500);
    }
  })
);

// Create new person
router.post('/',
  commonValidations.person.create,
  validate,
  personController.asyncHandler(async(req, res) => {
    personController.logRequest(req, 'Create Person');

    try {
      const person = await personService.create(req.body);
      personController.sendSuccess(res, person, 'Person created successfully', 201);
    } catch (error) {
      personController.sendError(res, error.message, 400);
    }
  })
);

// Update person
router.put('/:id',
  commonValidations.id,
  commonValidations.person.update,
  validate,
  personController.asyncHandler(async(req, res) => {
    personController.logRequest(req, 'Update Person');

    try {
      const person = await personService.update(req.params.id, req.body);
      if (!person) {
        return personController.sendError(res, 'Person not found', 404);
      }

      personController.sendSuccess(res, person, 'Person updated successfully');
    } catch (error) {
      personController.sendError(res, error.message, 400);
    }
  })
);

// Delete person (admin only)
router.delete('/:id',
  authorize(['admin']),
  commonValidations.id,
  validate,
  personController.asyncHandler(async(req, res) => {
    personController.logRequest(req, 'Delete Person');

    try {
      const success = await personService.delete(req.params.id);
      if (!success) {
        return personController.sendError(res, 'Person not found', 404);
      }

      personController.sendSuccess(res, null, 'Person deleted successfully');
    } catch (error) {
      personController.sendError(res, 'Failed to delete person', 500);
    }
  })
);

module.exports = router;
