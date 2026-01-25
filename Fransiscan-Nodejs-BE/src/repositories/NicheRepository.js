const { sql } = require('../config/database');
const { executeQuery } = require('../config/database');
const logger = require('../utils/logger');
const Niche = require('../models/Niche');
const NicheWall = require('../models/NicheWall');
const NicheRow = require('../models/NicheRow');
const Chapel = require('../models/Chapel');

class NicheRepository {
  /**
   * Get all chapels for a specific church
   * @param {number} churchId - Church ID
   * @returns {Promise<Array<Chapel>>}
   */
  async getChapelsByChurch(churchId) {
    try {
      const query = `
        SELECT 
          ChapelId,
          ChurchId,
          Code,
          Name,
          Description
        FROM Chapel WITH (NOLOCK)
        WHERE ChurchId = @churchId
        ORDER BY Code
      `;

      // Use reasonable timeout for simple lookup query (15s should be enough)
      const result = await executeQuery(query, { churchId }, { timeout: 15000 });
      
      if (!result || !result.recordset) {
        return [];
      }
      
      return result.recordset.map(row => new Chapel(row));
    } catch (error) {
      logger.error(`Error getting chapels for church ${churchId}:`, {
        error: error.message,
        code: error.code,
        name: error.name
      });
      throw error;
    }
  }

  /**
   * Get all walls for a specific chapel
   * @param {number} chapelId - Chapel ID
   * @returns {Promise<Array<NicheWall>>}
   */
  async getWallsByChapel(chapelId) {
    try {
      const query = `
        SELECT 
          NicheWallId,
          ChapelId,
          Code,
          Name,
          ChurchId
        FROM NicheWall WITH (NOLOCK)
        WHERE ChapelId = @chapelId
        ORDER BY NicheWallId
      `;

      const result = await executeQuery(query, { chapelId });
      return result.recordset.map(row => new NicheWall(row));
    } catch (error) {
      logger.error(`Error getting walls for chapel ${chapelId}:`, error.message);
      throw error;
    }
  }

  /**
   * Get all rows for a specific wall
   * @param {number} wallId - Wall ID
   * @returns {Promise<Array<NicheRow>>}
   */
  async getRowsByWall(wallId) {
    try {
      const query = `
        SELECT 
          NicheRowlId,
          NicheWallId,
          Code,
          Name,
          DefaultAmount,
          ChurchId,
          NicheLevel
        FROM NicheRow WITH (NOLOCK)
        WHERE NicheWallId = @wallId
        ORDER BY NicheLevel, NicheRowlId
      `;

      const result = await executeQuery(query, { wallId });
      return result.recordset.map(row => new NicheRow(row));
    } catch (error) {
      logger.error(`Error getting rows for wall ${wallId}:`, error.message);
      throw error;
    }
  }

  /**
   * Get all niches for a specific row
   * @param {number} rowId - Row ID
   * @returns {Promise<Array<Niche>>}
   */
  async getNichesByRow(rowId) {
    try {
      const query = `
        SELECT 
          NicheId,
          NicheRowlId,
          Code,
          DefaultAmount,
          AppearanceDescription,
          Status,
          ChurchId
        FROM Niche WITH (NOLOCK)
        WHERE NicheRowlId = @rowId
        ORDER BY NicheId
      `;

      const result = await executeQuery(query, { rowId });
      return result.recordset.map(row => new Niche(row));
    } catch (error) {
      logger.error(`Error getting niches for row ${rowId}:`, error.message);
      throw error;
    }
  }

  /**
   * Get all niches in a wall organized by rows
   * @param {number} wallId - Wall ID
   * @returns {Promise<Object>} Object containing wall info and niches by rows
   */
  async getNichesInWall(wallId) {
    try {
      // Get wall info
      const wallQuery = `
        SELECT 
          w.NicheWallId,
          w.ChapelId,
          w.Code AS WallCode,
          w.Name AS WallName,
          w.ChurchId,
          c.Code AS ChapelCode,
          c.Name AS ChapelName
        FROM NicheWall w WITH (NOLOCK)
        INNER JOIN Chapel c WITH (NOLOCK) ON w.ChapelId = c.ChapelId
        WHERE w.NicheWallId = @wallId
      `;

      const wallResult = await executeQuery(wallQuery, { wallId });

      if (wallResult.recordset.length === 0) {
        throw new Error(`Wall ${wallId} not found`);
      }

      const wallInfo = wallResult.recordset[0];

      // Get all rows and niches for this wall
      const nichesQuery = `
        SELECT 
          n.NicheId,
          n.NicheRowlId,
          n.Code,
          n.DefaultAmount,
          n.AppearanceDescription,
          n.Status,
          n.ChurchId,
          r.NicheLevel,
          r.Code AS RowCode
        FROM Niche n WITH (NOLOCK)
        INNER JOIN NicheRow r WITH (NOLOCK) ON n.NicheRowlId = r.NicheRowlId
        WHERE r.NicheWallId = @wallId
        ORDER BY r.NicheLevel, r.NicheRowlId, n.NicheId
      `;

      const nichesResult = await executeQuery(nichesQuery, { wallId });

      // Organize niches by rows
      const nichesByRow = {};
      nichesResult.recordset.forEach(row => {
        const rowId = row.NicheRowlId;
        if (!nichesByRow[rowId]) {
          nichesByRow[rowId] = {
            rowId,
            rowCode: row.RowCode,
            level: row.NicheLevel,
            niches: []
          };
        }
        nichesByRow[rowId].niches.push(new Niche(row));
      });

      return {
        wall: wallInfo,
        rows: Object.values(nichesByRow)
      };
    } catch (error) {
      logger.error(`Error getting niches in wall ${wallId}:`, error.message);
      throw error;
    }
  }

  /**
   * Get niche details by niche code
   * @param {string} nicheCode - Niche code
   * @returns {Promise<Object>} Niche details with wall and chapel info
   */
  async getNicheByCode(nicheCode) {
    try {
      const query = `
        SELECT 
          n.NicheId,
          n.NicheRowlId,
          n.Code,
          n.DefaultAmount,
          n.AppearanceDescription,
          n.Status,
          n.ChurchId,
          r.NicheWallId,
          r.Code AS RowCode,
          r.NicheLevel,
          w.Code AS WallCode,
          w.Name AS WallName,
          w.ChapelId,
          c.Code AS ChapelCode,
          c.Name AS ChapelName,
          -- Check if niche has booking
          CASE WHEN EXISTS (
            SELECT 1 FROM NicheBooking nb WITH (NOLOCK)
            WHERE nb.NicheId = n.NicheId AND nb.BookingStatus = 1
          ) THEN 1 ELSE 0 END AS IsBooked,
          -- Check if niche has application
          CASE WHEN EXISTS (
            SELECT 1 FROM NicheApplication na WITH (NOLOCK)
            WHERE na.NicheId = n.NicheId AND na.Status = 1
          ) THEN 1 ELSE 0 END AS HasApplication
        FROM Niche n WITH (NOLOCK)
        INNER JOIN NicheRow r WITH (NOLOCK) ON n.NicheRowlId = r.NicheRowlId
        INNER JOIN NicheWall w WITH (NOLOCK) ON r.NicheWallId = w.NicheWallId
        INNER JOIN Chapel c WITH (NOLOCK) ON w.ChapelId = c.ChapelId
        WHERE n.Code = @nicheCode
      `;

      const result = await executeQuery(query, { nicheCode });

      if (result.recordset.length === 0) {
        return null;
      }

      const row = result.recordset[0];
      return {
        niche: new Niche(row),
        rowId: row.NicheRowlId,
        rowCode: row.RowCode,
        level: row.NicheLevel,
        wallId: row.NicheWallId,
        wallCode: row.WallCode,
        wallName: row.WallName,
        chapelId: row.ChapelId,
        chapelCode: row.ChapelCode,
        chapelName: row.ChapelName,
        isBooked: row.IsBooked === 1,
        hasApplication: row.HasApplication === 1
      };
    } catch (error) {
      logger.error(`Error getting niche by code ${nicheCode}:`, error.message);
      throw error;
    }
  }

  /**
   * Get niche details by niche ID
   * @param {number} nicheId - Niche ID
   * @returns {Promise<Object>} Niche details
   */
  async getNicheById(nicheId) {
    try {
      const query = `
        SELECT 
          n.NicheId,
          n.NicheRowlId,
          n.Code,
          n.DefaultAmount,
          n.AppearanceDescription,
          n.Status,
          n.ChurchId,
          r.NicheWallId,
          r.Code AS RowCode,
          r.NicheLevel,
          w.Code AS WallCode,
          w.Name AS WallName,
          w.ChapelId,
          c.Code AS ChapelCode,
          c.Name AS ChapelName,
          CASE WHEN EXISTS (
            SELECT 1 FROM NicheBooking nb WITH (NOLOCK)
            WHERE nb.NicheId = n.NicheId AND nb.BookingStatus = 1
          ) THEN 1 ELSE 0 END AS IsBooked,
          CASE WHEN EXISTS (
            SELECT 1 FROM NicheApplication na WITH (NOLOCK)
            WHERE na.NicheId = n.NicheId AND na.Status = 1
          ) THEN 1 ELSE 0 END AS HasApplication
        FROM Niche n WITH (NOLOCK)
        INNER JOIN NicheRow r WITH (NOLOCK) ON n.NicheRowlId = r.NicheRowlId
        INNER JOIN NicheWall w WITH (NOLOCK) ON r.NicheWallId = w.NicheWallId
        INNER JOIN Chapel c WITH (NOLOCK) ON w.ChapelId = c.ChapelId
        WHERE n.NicheId = @nicheId
      `;

      const result = await executeQuery(query, { nicheId });

      if (result.recordset.length === 0) {
        return null;
      }

      const row = result.recordset[0];
      return {
        niche: new Niche(row),
        rowId: row.NicheRowlId,
        rowCode: row.RowCode,
        level: row.NicheLevel,
        wallId: row.NicheWallId,
        wallCode: row.WallCode,
        wallName: row.WallName,
        chapelId: row.ChapelId,
        chapelCode: row.ChapelCode,
        chapelName: row.ChapelName,
        isBooked: row.IsBooked === 1,
        hasApplication: row.HasApplication === 1
      };
    } catch (error) {
      logger.error(`Error getting niche by ID ${nicheId}:`, error.message);
      throw error;
    }
  }

  /**
   * Get all niches in a chapel across all walls
   * @param {number} chapelId - Chapel ID
   * @param {number} churchId - Church ID (optional filter)
   * @returns {Promise<Object>} Chapel info with all niches organized by walls and rows
   */
  async getAllNichesInChapel(chapelId, churchId = null) {
    try {
      // Get chapel info
      const chapelQuery = `
        SELECT 
          ChapelId,
          ChurchId,
          Code AS ChapelCode,
          Name AS ChapelName,
          Description
        FROM Chapel WITH (NOLOCK)
        WHERE ChapelId = @chapelId
        ${churchId ? 'AND ChurchId = @churchId' : ''}
      `;

      const chapelParams = { chapelId };
      if (churchId) chapelParams.churchId = churchId;

      const chapelResult = await executeQuery(chapelQuery, chapelParams);

      if (chapelResult.recordset.length === 0) {
        throw new Error(`Chapel ${chapelId} not found`);
      }

      const chapelInfo = chapelResult.recordset[0];

      // Get all walls, rows, and niches for this chapel
      const nichesQuery = `
        SELECT 
          n.NicheId,
          n.NicheRowlId,
          n.Code,
          n.DefaultAmount,
          n.AppearanceDescription,
          n.Status,
          n.ChurchId,
          r.NicheLevel,
          r.Code AS RowCode,
          r.NicheWallId,
          w.Code AS WallCode,
          w.Name AS WallName,
          w.NicheWallId
        FROM Niche n WITH (NOLOCK)
        INNER JOIN NicheRow r WITH (NOLOCK) ON n.NicheRowlId = r.NicheRowlId
        INNER JOIN NicheWall w WITH (NOLOCK) ON r.NicheWallId = w.NicheWallId
        WHERE w.ChapelId = @chapelId
        ${churchId ? 'AND n.ChurchId = @churchId' : ''}
        ORDER BY w.NicheWallId, r.NicheLevel, r.NicheRowlId, n.NicheId
      `;

      const nichesResult = await executeQuery(nichesQuery, chapelParams);

      // Organize by walls and rows
      const wallsMap = {};

      nichesResult.recordset.forEach(row => {
        const wallId = row.NicheWallId;

        // Initialize wall if not exists
        if (!wallsMap[wallId]) {
          wallsMap[wallId] = {
            wallId,
            wallCode: row.WallCode,
            wallName: row.WallName,
            rows: {}
          };
        }

        const rowId = row.NicheRowlId;

        // Initialize row if not exists
        if (!wallsMap[wallId].rows[rowId]) {
          wallsMap[wallId].rows[rowId] = {
            rowId,
            rowCode: row.RowCode,
            level: row.NicheLevel,
            niches: []
          };
        }

        // Add niche to row
        wallsMap[wallId].rows[rowId].niches.push(new Niche(row));
      });

      // Convert to array format
      const walls = Object.values(wallsMap).map(wall => ({
        ...wall,
        rows: Object.values(wall.rows)
      }));

      return {
        chapel: chapelInfo,
        walls
      };
    } catch (error) {
      logger.error(`Error getting niches in chapel ${chapelId}:`, error.message);
      throw error;
    }
  }

  /**
   * Get vacancy statistics for a chapel
   * @param {number} chapelId - Chapel ID
   * @param {number} churchId - Church ID (optional filter)
   * @returns {Promise<Object>} Vacancy statistics
   */
  async getChapelVacancyStats(chapelId, churchId = null) {
    try {
      const params = { chapelId };
      if (churchId) params.churchId = churchId;

      const query = `
        SELECT 
          COUNT(*) AS TotalNiches,
          SUM(CASE WHEN n.Status = 1 THEN 1 ELSE 0 END) AS VacantNiches,
          SUM(CASE WHEN n.Status = 3 THEN 1 ELSE 0 END) AS BookedNiches,
          SUM(CASE WHEN n.Status = 4 THEN 1 ELSE 0 END) AS OccupiedNiches,
          SUM(CASE WHEN n.Status = 2 THEN 1 ELSE 0 END) AS ReservedNiches,
          SUM(CASE WHEN n.Status = 0 THEN 1 ELSE 0 END) AS NotInUseNiches
        FROM Niche n WITH (NOLOCK)
        INNER JOIN NicheRow r WITH (NOLOCK) ON n.NicheRowlId = r.NicheRowlId
        INNER JOIN NicheWall w WITH (NOLOCK) ON r.NicheWallId = w.NicheWallId
        WHERE w.ChapelId = @chapelId
        ${churchId ? 'AND n.ChurchId = @churchId' : ''}
      `;

      const result = await executeQuery(query, params);
      return result.recordset[0] || {};
    } catch (error) {
      logger.error(`Error getting vacancy stats for chapel ${chapelId}:`, error.message);
      throw error;
    }
  }
}

module.exports = NicheRepository;
