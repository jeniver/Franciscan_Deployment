const express = require('express');
const router = express.Router();
const BibleInscriptionChoiceController = require('../controllers/BibleInscriptionChoiceController');
const { authenticateToken } = require('../middleware/auth');

const controller = new BibleInscriptionChoiceController();

/**
 * @route   GET /api/bible-choices
 * @desc    Get all Bible inscription choices for current user's church
 * @access  Private (JWT required)
 */
router.get(
  '/',
  authenticateToken,
  (req, res) => controller.getAllBibleChoices(req, res)
);

/**
 * @route   GET /api/bible-choices/:choiceId
 * @desc    Get Bible inscription choice by ID
 * @access  Private (JWT required)
 */
router.get(
  '/:choiceId',
  authenticateToken,
  (req, res) => controller.getBibleChoiceById(req, res)
);

module.exports = router;

