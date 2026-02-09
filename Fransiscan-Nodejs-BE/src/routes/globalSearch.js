const express = require('express');
const router = express.Router();
const GlobalSearchControllerClass = require('../controllers/GlobalSearchController');
const { authenticateToken, authorize } = require('../middleware/auth');

// Instantiate the controller
let GlobalSearchControllerInstance;
try {
  GlobalSearchControllerInstance = new GlobalSearchControllerClass();
} catch (error) {
  console.error('Error instantiating GlobalSearchController:', error);
  // Fallback: create with default constructor
  GlobalSearchControllerInstance = new (require('../controllers/GlobalSearchController'))();
}

/**
 * @route   GET /api/search/global
 * @desc    Global search across all entities with intelligent query routing
 * @access  Private (JWT required)
 * 
 * Query Parameters:
 * - q: Search term (required)
 * - types: Comma-separated types (application,person,church,niche,date) - optional
 * - page: Page number (default: 1)
 * - pageSize: Results per page (default: 20)
 * - includeAvailability: Include niche availability (default: true)
 * 
 * @example
 * GET /api/search/global?q=John Doe
 * GET /api/search/global?q=3795-1&types=application,niche
 * GET /api/search/global?q=Memorial&types=church,niche&page=1&pageSize=10
 */
router.get(
  '/global',
  authenticateToken,
  (req, res) => GlobalSearchControllerInstance.globalSearch(req, res)
);

/**
 * @route   GET /api/search/autocomplete
 * @desc    Get autocomplete suggestions for search input
 * @access  Private (JWT required)
 * 
 * Query Parameters:
 * - q: Partial search term (required, min 2 characters)
 * - limit: Maximum suggestions (default: 10, max: 20)
 * 
 * @example
 * GET /api/search/autocomplete?q=Joh
 * GET /api/search/autocomplete?q=NAPP&limit=5
 */
router.get(
  '/autocomplete',
  authenticateToken,
  (req, res) => GlobalSearchControllerInstance.autocomplete(req, res)
);

/**
 * @route   GET /api/search/niches/available
 * @desc    Search for available/empty niches
 * @access  Private (JWT required)
 * 
 * Query Parameters:
 * - q: Search term (optional)
 * - chapelId: Filter by chapel (optional)
 * - status: Status filter (vacant|available) (default: vacant)
 * 
 * @example
 * GET /api/search/niches/available
 * GET /api/search/niches/available?q=A-01&chapelId=5
 * GET /api/search/niches/available?status=available
 */
router.get(
  '/niches/available',
  authenticateToken,
  (req, res) => GlobalSearchControllerInstance.availableNiches(req, res)
);

/**
 * @route   POST /api/search/force-sync
 * @desc    Force sync all data to Meilisearch (admin only)
 * @access  Private (Admin only)
 * 
 * Query Parameters:
 * - fullSync: true for full rebuild, false for incremental sync (default: false)
 * 
 * @example
 * POST /api/search/force-sync
 * POST /api/search/force-sync?fullSync=true
 */
router.post(
  '/force-sync',
  authenticateToken,
  authorize(['admin']),
  (req, res) => GlobalSearchControllerInstance.forceMeilisearchSync(req, res)
);

/**
 * @route   GET /api/search/health
 * @desc    Check Meilisearch health status
 * @access  Private
 */
router.get(
  '/health',
  authenticateToken,
  (req, res) => GlobalSearchControllerInstance.checkMeilisearchHealthStatus(req, res)
);

/**
 * @route   POST /api/search/initialize-index
 * @desc    Initialize Meilisearch index with settings (admin only)
 * @access  Private (Admin only)
 */
router.post(
  '/initialize-index',
  authenticateToken,
  authorize(['admin']),
  (req, res) => GlobalSearchControllerInstance.initializeMeilisearchIndex(req, res)
);

module.exports = router;