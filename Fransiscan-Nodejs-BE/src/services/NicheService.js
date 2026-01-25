const NicheRepository = require('../repositories/NicheRepository');
const logger = require('../utils/logger');

class NicheService {
  constructor() {
    this.nicheRepository = new NicheRepository();
  }

  /**
   * Get all chapels for a church
   * @param {number} churchId - Church ID
   * @returns {Promise<Object>} Response with chapels list
   */
  async getChapelsForChurch(churchId) {
    try {
      logger.info(`Getting chapels for church ${churchId}`);

      const chapels = await this.nicheRepository.getChapelsByChurch(churchId);

      return {
        success: true,
        data: {
          churchId,
          count: chapels.length,
          chapels: chapels.map(c => c.toJSON())
        }
      };
    } catch (error) {
      // Check if it's a database connection/timeout error
      const isDatabaseError = 
        error.code === 'ETIMEOUT' ||
        error.code === 'ETIMEDOUT' ||
        error.message?.includes('Failed to connect') ||
        error.message?.includes('Connection timeout') ||
        error.message?.includes('timeout');

      if (isDatabaseError) {
        logger.warn('Database connection issue in getChapelsForChurch, returning empty result:', {
          churchId,
          error: error.message,
          code: error.code
        });
        // Return empty result instead of throwing to prevent API failures
        return {
          success: true,
          data: {
            churchId,
            count: 0,
            chapels: []
          },
          message: 'Database temporarily unavailable. Please try again later.'
        };
      }
      
      logger.error('Error in getChapelsForChurch:', error.message);
      throw error;
    }
  }

  /**
   * Get all walls for a chapel
   * @param {number} chapelId - Chapel ID
   * @returns {Promise<Object>} Response with walls list
   */
  async getWallsForChapel(chapelId) {
    try {
      logger.info(`Getting walls for chapel ${chapelId}`);

      const walls = await this.nicheRepository.getWallsByChapel(chapelId);

      return {
        success: true,
        data: {
          chapelId,
          count: walls.length,
          walls: walls.map(w => w.toJSON())
        }
      };
    } catch (error) {
      logger.error('Error in getWallsForChapel:', error.message);
      throw error;
    }
  }

  /**
   * Get niches in a wall organized by rows
   * @param {number} wallId - Wall ID
   * @returns {Promise<Object>} Response with wall info and niches by rows
   */
  async getNichesInWall(wallId) {
    try {
      logger.info(`Getting niches in wall ${wallId}`);

      const data = await this.nicheRepository.getNichesInWall(wallId);

      // Organize for response
      const response = {
        success: true,
        data: {
          wall: {
            wallId: data.wall.NicheWallId,
            wallCode: data.wall.WallCode,
            wallName: data.wall.WallName,
            chapelId: data.wall.ChapelId,
            chapelCode: data.wall.ChapelCode,
            chapelName: data.wall.ChapelName,
            churchId: data.wall.ChurchId
          },
          rows: data.rows.map(row => ({
            rowId: row.rowId,
            rowCode: row.rowCode,
            level: row.level,
            nicheCount: row.niches.length,
            niches: row.niches.map(n => n.toJSON())
          })),
          totalNiches: data.rows.reduce((sum, row) => sum + row.niches.length, 0),
          vacantCount: data.rows.reduce((sum, row) =>
            sum + row.niches.filter(n => n.status === 1).length, 0),
          bookedCount: data.rows.reduce((sum, row) =>
            sum + row.niches.filter(n => n.status === 3).length, 0),
          occupiedCount: data.rows.reduce((sum, row) =>
            sum + row.niches.filter(n => n.status === 4).length, 0)
        }
      };

      return response;
    } catch (error) {
      logger.error('Error in getNichesInWall:', error.message);
      throw error;
    }
  }

  /**
   * Get niche details by code
   * @param {string} nicheCode - Niche code
   * @returns {Promise<Object>} Response with niche details
   */
  async getNicheByCode(nicheCode) {
    try {
      logger.info(`Getting niche by code: ${nicheCode}`);

      const data = await this.nicheRepository.getNicheByCode(nicheCode);

      if (!data) {
        return {
          success: false,
          error: `Niche with code ${nicheCode} not found`
        };
      }

      return {
        success: true,
        data: {
          niche: data.niche.toJSON(),
          location: {
            chapelId: data.chapelId,
            chapelCode: data.chapelCode,
            chapelName: data.chapelName,
            wallId: data.wallId,
            wallCode: data.wallCode,
            wallName: data.wallName,
            rowId: data.rowId,
            rowCode: data.rowCode,
            level: data.level
          },
          availability: {
            isBooked: data.isBooked,
            hasApplication: data.hasApplication,
            isAvailable: data.niche.isAvailable && !data.isBooked && !data.hasApplication
          }
        }
      };
    } catch (error) {
      logger.error('Error in getNicheByCode:', error.message);
      throw error;
    }
  }

  /**
   * Get niche details by ID
   * @param {number} nicheId - Niche ID
   * @returns {Promise<Object>} Response with niche details
   */
  async getNicheById(nicheId) {
    try {
      logger.info(`Getting niche by ID: ${nicheId}`);

      const data = await this.nicheRepository.getNicheById(nicheId);

      if (!data) {
        return {
          success: false,
          error: `Niche with ID ${nicheId} not found`
        };
      }

      return {
        success: true,
        data: {
          niche: data.niche.toJSON(),
          location: {
            chapelId: data.chapelId,
            chapelCode: data.chapelCode,
            chapelName: data.chapelName,
            wallId: data.wallId,
            wallCode: data.wallCode,
            wallName: data.wallName,
            rowId: data.rowId,
            rowCode: data.rowCode,
            level: data.level
          },
          availability: {
            isBooked: data.isBooked,
            hasApplication: data.hasApplication,
            isAvailable: data.niche.isAvailable && !data.isBooked && !data.hasApplication
          }
        }
      };
    } catch (error) {
      logger.error('Error in getNicheById:', error.message);
      throw error;
    }
  }

  /**
   * Get vacancy statistics for a chapel
   * @param {number} chapelId - Chapel ID
   * @returns {Promise<Object>} Response with vacancy statistics
   */
  async getChapelVacancyStats(chapelId) {
    try {
      logger.info(`Getting vacancy stats for chapel ${chapelId}`);

      const stats = await this.nicheRepository.getChapelVacancyStats(chapelId);

      const total = stats.TotalNiches || 0;
      const vacant = stats.VacantNiches || 0;
      const booked = stats.BookedNiches || 0;
      const occupied = stats.OccupiedNiches || 0;
      const reserved = stats.ReservedNiches || 0;
      const notInUse = stats.NotInUseNiches || 0;

      return {
        success: true,
        data: {
          chapelId,
          total,
          vacant,
          booked,
          occupied,
          reserved,
          notInUse,
          occupancyRate: total > 0 ? `${((occupied / total) * 100).toFixed(2)}%` : '0%',
          availabilityRate: total > 0 ? `${((vacant / total) * 100).toFixed(2)}%` : '0%'
        }
      };
    } catch (error) {
      logger.error('Error in getChapelVacancyStats:', error.message);
      throw error;
    }
  }

  /**
   * Get all niches in a chapel (across all walls)
   * @param {number} chapelId - Chapel ID
   * @param {number} churchId - Church ID (optional)
   * @returns {Promise<Object>} Response with chapel info and all niches
   */
  async getAllNichesInChapel(chapelId, churchId = null) {
    try {
      logger.info(`Getting all niches in chapel ${chapelId}${churchId ? ` for church ${churchId}` : ''}`);

      const data = await this.nicheRepository.getAllNichesInChapel(chapelId, churchId);

      // Calculate statistics across all walls
      let totalNiches = 0;
      let vacantCount = 0;
      let bookedCount = 0;
      let occupiedCount = 0;
      let reservedCount = 0;

      data.walls.forEach(wall => {
        wall.rows.forEach(row => {
          totalNiches += row.niches.length;
          row.niches.forEach(niche => {
            if (niche.status === 1) vacantCount++;
            if (niche.status === 3) bookedCount++;
            if (niche.status === 4) occupiedCount++;
            if (niche.status === 2) reservedCount++;
          });
        });
      });

      return {
        success: true,
        data: {
          chapel: {
            chapelId: data.chapel.ChapelId,
            chapelCode: data.chapel.ChapelCode,
            chapelName: data.chapel.ChapelName,
            churchId: data.chapel.ChurchId,
            description: data.chapel.Description
          },
          walls: data.walls.map(wall => ({
            wallId: wall.wallId,
            wallCode: wall.wallCode,
            wallName: wall.wallName,
            rowCount: wall.rows.length,
            nicheCount: wall.rows.reduce((sum, row) => sum + row.niches.length, 0),
            rows: wall.rows.map(row => ({
              rowId: row.rowId,
              rowCode: row.rowCode,
              level: row.level,
              nicheCount: row.niches.length,
              niches: row.niches.map(n => n.toJSON())
            }))
          })),
          summary: {
            totalWalls: data.walls.length,
            totalNiches,
            vacant: vacantCount,
            booked: bookedCount,
            occupied: occupiedCount,
            reserved: reservedCount,
            occupancyRate: totalNiches > 0 ? `${((occupiedCount / totalNiches) * 100).toFixed(2)}%` : '0%',
            availabilityRate: totalNiches > 0 ? `${((vacantCount / totalNiches) * 100).toFixed(2)}%` : '0%'
          }
        }
      };
    } catch (error) {
      logger.error('Error in getAllNichesInChapel:', error.message);
      throw error;
    }
  }

  /**
   * Navigate walls (Previous/Next)
   * @param {number} chapelId - Chapel ID
   * @param {number} currentWallId - Current Wall ID
   * @param {string} direction - 'next' or 'previous'
   * @returns {Promise<Object>} Response with new wall data
   */
  async navigateWall(chapelId, currentWallId, direction) {
    try {
      logger.info(`Navigating ${direction} from wall ${currentWallId} in chapel ${chapelId}`);

      const walls = await this.nicheRepository.getWallsByChapel(chapelId);

      if (walls.length === 0) {
        return {
          success: false,
          error: 'No walls found for this chapel'
        };
      }

      const currentIndex = walls.findIndex(w => w.nicheWallId === parseInt(currentWallId));

      if (currentIndex === -1) {
        return {
          success: false,
          error: 'Current wall not found'
        };
      }

      let targetWall;
      if (direction === 'next') {
        targetWall = currentIndex < walls.length - 1 ? walls[currentIndex + 1] : walls[currentIndex];
      } else if (direction === 'previous') {
        targetWall = currentIndex > 0 ? walls[currentIndex - 1] : walls[currentIndex];
      } else {
        return {
          success: false,
          error: 'Invalid direction. Use "next" or "previous"'
        };
      }

      // Get niches for the target wall
      return await this.getNichesInWall(targetWall.nicheWallId);
    } catch (error) {
      logger.error('Error in navigateWall:', error.message);
      throw error;
    }
  }
}

module.exports = NicheService;
