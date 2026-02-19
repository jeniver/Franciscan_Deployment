const GateOfLifeService = require('../services/GateOfLifeService');
const logger = require('../utils/logger');

class GateOfLifeController {
  async searchApplications(req, res) {
    try {
      const { user, query } = req;

      if (!user || !user.churchId) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required with church ID'
          }
        });
      }

      // Prevent browser/proxy from serving stale list responses after create/update/delete.
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');

      const result = await GateOfLifeService.searchApplications(query, user.churchId);
      return res.status(200).json(result);
    } catch (error) {
      logger.error('GateOfLifeController: Failed to search applications', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to search Gate of Life applications'
        }
      });
    }
  }

  async getApplication(req, res) {
    try {
      const { user, params } = req;

      if (!user || !user.churchId) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required with church ID'
          }
        });
      }

      const result = await GateOfLifeService.getApplication(params.code, user.churchId);
      if (!result.success) {
        return res.status(404).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      logger.error('GateOfLifeController: Failed to get application', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve Gate of Life application'
        }
      });
    }
  }

  async createApplication(req, res) {
    try {
      const { user, body } = req;

      if (!user || !user.churchId) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required with church ID'
          }
        });
      }

      const result = await GateOfLifeService.createApplication(body, user.userId, user.churchId);

      if (!result.success) {
        if (result.error?.code === 'VALIDATION_FAILED') {
          return res.status(400).json(result);
        }
        return res.status(400).json(result);
      }

      return res.status(201).json(result);
    } catch (error) {
      logger.error('GateOfLifeController: Failed to create application', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create Gate of Life application'
        }
      });
    }
  }

  async updateApplication(req, res) {
    try {
      const { user, body, params } = req;

      if (!user || !user.churchId) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required with church ID'
          }
        });
      }

      const result = await GateOfLifeService.updateApplication(params.code, body, user.churchId);

      if (!result.success) {
        if (result.error?.code === 'NOT_FOUND') {
          return res.status(404).json(result);
        }
        if (result.error?.code === 'VALIDATION_FAILED') {
          return res.status(400).json(result);
        }
        return res.status(400).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      logger.error('GateOfLifeController: Failed to update application', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update Gate of Life application'
        }
      });
    }
  }

  async deleteApplication(req, res) {
    try {
      const { user, params } = req;

      if (!user || !user.churchId) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required with church ID'
          }
        });
      }

      const result = await GateOfLifeService.deleteApplication(params.code, user.churchId);

      if (!result.success) {
        if (result.error?.code === 'NOT_FOUND') {
          return res.status(404).json(result);
        }
        return res.status(400).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      logger.error('GateOfLifeController: Failed to delete application', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete Gate of Life application'
        }
      });
    }
  }

  async getInvoicePdf(req, res) {
    try {
      const { user, params } = req;

      if (!user || !user.churchId) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required with church ID'
          }
        });
      }

      const result = await GateOfLifeService.getInvoicePdfData(params.code, user.churchId);

      if (!result.success) {
        const status = result.error?.code === 'NOT_FOUND' ? 404 : 400;
        return res.status(status).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      logger.error('GateOfLifeController: Failed to get invoice PDF data', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve Gate of Life invoice PDF data'
        }
      });
    }
  }
}

module.exports = new GateOfLifeController();


