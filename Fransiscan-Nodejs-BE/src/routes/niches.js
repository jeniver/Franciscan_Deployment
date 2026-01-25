const express = require('express');
const NicheController = require('../controllers/NicheController');
// const { protect } = require('../middleware/auth') // Uncomment if authentication is needed

const router = express.Router();
const nicheController = new NicheController();

/**
 * @route   GET /api/niches/chapels/:churchId
 * @desc    Get all chapels for a church
 * @access  Public (or Protected if auth middleware is added)
 */
router.get('/chapels/:churchId', (req, res) => nicheController.getChapels(req, res));

/**
 * @route   GET /api/niches/walls/:chapelId
 * @desc    Get all walls for a chapel
 * @access  Public
 */
router.get('/walls/:chapelId', (req, res) => nicheController.getWalls(req, res));

/**
 * @route   GET /api/niches/wall/:wallId
 * @desc    Get all niches in a wall organized by rows
 * @access  Public
 */
router.get('/wall/:wallId', (req, res) => nicheController.getNichesInWall(req, res));

/**
 * @route   GET /api/niches/code/:nicheCode
 * @desc    Get niche details by code
 * @access  Public
 */
router.get('/code/:nicheCode', (req, res) => nicheController.getNicheByCode(req, res));

/**
 * @route   GET /api/niches/:nicheId
 * @desc    Get niche details by ID
 * @access  Public
 */
router.get('/:nicheId', (req, res) => nicheController.getNicheById(req, res));

/**
 * @route   GET /api/niches/chapel/:chapelId/niches
 * @desc    Get all niches in a chapel (across all walls)
 * @access  Public
 * @query   churchId (optional) - Filter by church ID
 */
router.get('/chapel/:chapelId/niches', (req, res) => nicheController.getAllNichesInChapel(req, res));

/**
 * @route   GET /api/niches/chapel/:chapelId/stats
 * @desc    Get vacancy statistics for a chapel
 * @access  Public
 * @query   churchId (optional) - Filter by church ID
 */
router.get('/chapel/:chapelId/stats', (req, res) => nicheController.getChapelStats(req, res));

/**
 * @route   POST /api/niches/navigate
 * @desc    Navigate to next or previous wall
 * @access  Public
 * @body    { chapelId: number, currentWallId: number, direction: 'next'|'previous' }
 */
router.post('/navigate', (req, res) => nicheController.navigateWall(req, res));

/**
 * @route   GET /api/niches/search
 * @desc    Search niches by criteria
 * @access  Public
 * @query   chapelId, wallId, status, minAmount, maxAmount, code
 */
router.get('/search', (req, res) => nicheController.searchNiches(req, res));

module.exports = router;
