const NicheService = require('../services/NicheService');
const logger = require('../utils/logger');

class NicheController {
  constructor() {
    this.nicheService = new NicheService();
  }

  /**
   * Get all chapels for a church
   * GET /api/niches/chapels/:churchId
   */
  async getChapels(req, res) {
    try {
      const { churchId } = req.params;

      logger.info(`Get chapels request for church ${churchId}`, {
        ip: req.ip,
        userAgent: req.headers['user-agent']
      });

      if (!churchId || isNaN(churchId)) {
        return res.status(400).json({
          success: false,
          error: 'Valid church ID is required'
        });
      }

      // Check if request was timed out or response already sent
      if (req.timedOut || res.headersSent) {
        logger.warn('Request already timed out or response sent, skipping controller execution');
        return;
      }

      const result = await this.nicheService.getChapelsForChurch(parseInt(churchId));

      // Check again before sending response (timeout might have occurred during async operation)
      if (!res.headersSent && !req.timedOut) {
        return res.status(200).json(result);
      } else if (res.headersSent) {
        logger.warn('Response already sent (likely timeout), skipping response');
      }
    } catch (error) {
      // Check if response already sent before sending error response
      if (res.headersSent) {
        logger.warn('Cannot send error response - headers already sent:', error.message);
        return;
      }
      
      logger.error('Error in getChapels:', error.message);
      return res.status(500).json({
        success: false,
        error: 'Failed to retrieve chapels'
      });
    }
  }

  /**
   * Get all walls for a chapel
   * GET /api/niches/walls/:chapelId
   */
  async getWalls(req, res) {
    try {
      const { chapelId } = req.params;

      logger.info(`Get walls request for chapel ${chapelId}`);

      if (!chapelId || isNaN(chapelId)) {
        return res.status(400).json({
          success: false,
          error: 'Valid chapel ID is required'
        });
      }

      const result = await this.nicheService.getWallsForChapel(parseInt(chapelId));

      res.status(200).json(result);
    } catch (error) {
      logger.error('Error in getWalls:', error.message, { stack: error.stack });
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve walls'
      });
    }
  }

  /**
   * Get niches in a wall
   * GET /api/niches/wall/:wallId
   */
  async getNichesInWall(req, res) {
    try {
      const { wallId } = req.params;

      logger.info(`Get niches in wall ${wallId}`);

      if (!wallId || isNaN(wallId)) {
        return res.status(400).json({
          success: false,
          error: 'Valid wall ID is required'
        });
      }

      const result = await this.nicheService.getNichesInWall(parseInt(wallId));

      res.status(200).json(result);
    } catch (error) {
      logger.error('Error in getNichesInWall:', error.message, { stack: error.stack });
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve niches'
      });
    }
  }

  /**
   * Get niche by code
   * GET /api/niches/code/:nicheCode
   */
  async getNicheByCode(req, res) {
    try {
      const { nicheCode } = req.params;

      logger.info(`Get niche by code: ${nicheCode}`);

      if (!nicheCode) {
        return res.status(400).json({
          success: false,
          error: 'Niche code is required'
        });
      }

      const result = await this.nicheService.getNicheByCode(nicheCode);

      if (!result.success) {
        return res.status(404).json(result);
      }

      res.status(200).json(result);
    } catch (error) {
      logger.error('Error in getNicheByCode:', error.message, { stack: error.stack });
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve niche details'
      });
    }
  }

  /**
   * Get niche by ID
   * GET /api/niches/:nicheId
   */
  async getNicheById(req, res) {
    try {
      const { nicheId } = req.params;

      logger.info(`Get niche by ID: ${nicheId}`);

      if (!nicheId || isNaN(nicheId)) {
        return res.status(400).json({
          success: false,
          error: 'Valid niche ID is required'
        });
      }

      const result = await this.nicheService.getNicheById(parseInt(nicheId));

      if (!result.success) {
        return res.status(404).json(result);
      }

      res.status(200).json(result);
    } catch (error) {
      logger.error('Error in getNicheById:', error.message, { stack: error.stack });
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve niche details'
      });
    }
  }

  /**
   * Get all niches in a chapel (across all walls)
   * GET /api/niches/chapel/:chapelId/niches?churchId=1
   */
  async getAllNichesInChapel(req, res) {
    try {
      const { chapelId } = req.params;
      const { churchId } = req.query;

      logger.info(`Get all niches in chapel ${chapelId}${churchId ? ` for church ${churchId}` : ''}`);

      if (!chapelId || isNaN(chapelId)) {
        return res.status(400).json({
          success: false,
          error: 'Valid chapel ID is required'
        });
      }

      const result = await this.nicheService.getAllNichesInChapel(
        parseInt(chapelId),
        churchId ? parseInt(churchId) : null
      );

      res.status(200).json(result);
    } catch (error) {
      logger.error('Error in getAllNichesInChapel:', error.message, { stack: error.stack });
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve niches for chapel'
      });
    }
  }

  /**
   * Get chapel vacancy statistics
   * GET /api/niches/chapel/:chapelId/stats?churchId=1
   */
  async getChapelStats(req, res) {
    try {
      const { chapelId } = req.params;
      const { churchId } = req.query;

      logger.info(`Get vacancy stats for chapel ${chapelId}`);

      if (!chapelId || isNaN(chapelId)) {
        return res.status(400).json({
          success: false,
          error: 'Valid chapel ID is required'
        });
      }

      const result = await this.nicheService.getChapelVacancyStats(
        parseInt(chapelId),
        churchId ? parseInt(churchId) : null
      );

      res.status(200).json(result);
    } catch (error) {
      logger.error('Error in getChapelStats:', error.message, { stack: error.stack });
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve chapel statistics'
      });
    }
  }

  /**
   * Navigate walls (next/previous)
   * POST /api/niches/navigate
   * Body: { chapelId, currentWallId, direction }
   */
  async navigateWall(req, res) {
    try {
      const { chapelId, currentWallId, direction } = req.body;

      logger.info(`Navigate ${direction} from wall ${currentWallId} in chapel ${chapelId}`);

      if (!chapelId || !currentWallId || !direction) {
        return res.status(400).json({
          success: false,
          error: 'Chapel ID, current wall ID, and direction are required'
        });
      }

      if (!['next', 'previous'].includes(direction.toLowerCase())) {
        return res.status(400).json({
          success: false,
          error: 'Direction must be "next" or "previous"'
        });
      }

      const result = await this.nicheService.navigateWall(
        parseInt(chapelId),
        parseInt(currentWallId),
        direction.toLowerCase()
      );

      res.status(200).json(result);
    } catch (error) {
      logger.error('Error in navigateWall:', error.message, { stack: error.stack });
      res.status(500).json({
        success: false,
        error: 'Failed to navigate walls'
      });
    }
  }

  /**
   * Search niches by criteria
   * GET /api/niches/search?chapelId=1&status=1&minAmount=1000&maxAmount=5000
   */
  async searchNiches(req, res) {
    try {
      const { chapelId, wallId, status, minAmount, maxAmount, code } = req.query;

      logger.info('Search niches with criteria:', { chapelId, wallId, status, code });

      // For now, return a simple message - this can be enhanced based on requirements
      res.status(200).json({
        success: true,
        message: 'Search endpoint - to be implemented based on specific requirements',
        searchCriteria: { chapelId, wallId, status, minAmount, maxAmount, code }
      });
    } catch (error) {
      logger.error('Error in searchNiches:', error.message, { stack: error.stack });
      res.status(500).json({
        success: false,
        error: 'Failed to search niches'
      });
    }
  }
}

module.exports = NicheController;

