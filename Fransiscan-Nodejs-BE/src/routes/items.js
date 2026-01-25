const express = require('express');
const router = express.Router();
const ItemController = require('../controllers/ItemController');
const { authenticateToken } = require('../middleware/auth');

const itemController = new ItemController();

// All item routes require authentication (for churchId scoping)
router.use(authenticateToken);

// GET /api/items/categories
router.get('/categories', itemController.getCategories);

// GET /api/items?category=NICHES
router.get('/', itemController.listItems);

module.exports = router;


