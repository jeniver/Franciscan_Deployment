const NicheBookingService = require('../services/NicheBookingService');
const logger = require('../utils/logger');

class NicheBookingController {
  async createBooking(req, res) {
    try {
      const { user } = req;

      if (!user || !user.churchId) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required with church ID'
          }
        });
      }

      const result = await NicheBookingService.createBooking(req.body, user);

      if (!result.success) {
        const code = result.error?.code;

        if (code === 'VALIDATION_FAILED' || code === 'INVALID_APPLICATION' || code === 'NICHE_MISMATCH' || code === 'INVALID_DATE') {
          return res.status(400).json(result);
        }

        if (code === 'NOT_FOUND' || code === 'CONTACT_NOT_FOUND' || code === 'NOMINEE_NOT_FOUND' || code === 'NOMINEE2_NOT_FOUND') {
          return res.status(404).json(result);
        }

        if (code === 'ACCESS_DENIED') {
          return res.status(403).json(result);
        }

        if (code === 'APPLICATION_LOCKED' || code === 'NICHE_ALREADY_BOOKED' || code === 'DUPLICATE_BOOKING' || code === 'DUPLICATE_PERSON') {
          return res.status(409).json(result);
        }

        return res.status(400).json(result);
      }

      return res.status(201).json(result);
    } catch (error) {
      logger.error('Controller: Failed to create niche booking:', error);

      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create niche booking'
        }
      });
    }
  }

  async updateBooking(req, res) {
    try {
      const { id } = req.params;
      const { user } = req;

      if (!user || !user.churchId) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required with church ID'
          }
        });
      }

      const result = await NicheBookingService.updateBooking({
        nicheBookingId: parseInt(id),
        ...req.body
      }, user.churchId);

      if (!result.success) {
        return res.status(400).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      logger.error('Controller: Failed to update niche booking:', error);

      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update niche booking'
        }
      });
    }
  }

  /**
   * Get niche booking by application code
   * GET /api/niche-bookings/:code
   * Based on: ViewNicheBooking(string nicheApplicationCode) WebMethod
   */
  async getBooking(req, res) {
    try {
      const { code } = req.params;
      const { user } = req;

      if (!user || !user.churchId) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required with church ID'
          }
        });
      }

      const result = await NicheBookingService.getBookingByApplicationCode(
        code,
        user.churchId
      );

      if (!result.success) {
        if (result.error.code === 'NOT_FOUND') {
          return res.status(404).json(result);
        }
        if (result.error.code === 'ACCESS_DENIED') {
          return res.status(403).json(result);
        }
        return res.status(400).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      logger.error('Controller: Failed to get niche booking:', error);

      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve niche booking'
        }
      });
    }
  }

  /**
   * Search niche bookings
   * POST /api/niche-bookings/search
   * Based on: SearchNicheBookings(string searchParamsEntity) WebMethod
   */
  async searchBookings(req, res) {
    try {
      const searchCriteria = req.body;
      const { user } = req;

      if (!user || !user.churchId) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required with church ID'
          }
        });
      }

      const result = await NicheBookingService.searchBookings(
        searchCriteria,
        user.churchId
      );

      if (!result.success) {
        if (result.error.code === 'EMPTY_PARAMETERS') {
          return res.status(400).json(result);
        }
        return res.status(400).json(result);
      }

      // Return empty array message if no results
      if (result.count === 0) {
        return res.status(200).json({
          success: true,
          data: [],
          count: 0,
          message: 'No bookings found matching the criteria'
        });
      }

      return res.status(200).json(result);
    } catch (error) {
      logger.error('Controller: Failed to search niche bookings:', error);

      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to search niche bookings'
        }
      });
    }
  }

  /**
   * Update beneficiary details
   * PUT /api/niche-bookings/beneficiaries/:id
   * Based on: UpdateNicheBookingBeneficiary(string beneficiary) WebMethod
   */
  async updateBeneficiary(req, res) {
    try {
      const { id } = req.params;
      const beneficiaryData = req.body;
      const { user } = req;

      if (!user || !user.churchId) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required with church ID'
          }
        });
      }

      // Set beneficiary ID from URL
      beneficiaryData.nicheBookingBeneficiaryId = parseInt(id);

      const result = await NicheBookingService.updateBeneficiary(
        beneficiaryData,
        user.churchId
      );

      if (!result.success) {
        if (result.error.code === 'ACCESS_DENIED') {
          return res.status(403).json(result);
        }
        return res.status(400).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      logger.error('Controller: Failed to update beneficiary:', error);

      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update beneficiary'
        }
      });
    }
  }

  /**
   * Activate beneficiary
   * POST /api/niche-bookings/beneficiaries/:id/activate
   * Based on: UpdateNicheBookingBeneficiaryActive(string beneficiary) WebMethod
   */
  async activateBeneficiary(req, res) {
    try {
      const { id } = req.params;
      const { user } = req;

      if (!user || !user.churchId) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required with church ID'
          }
        });
      }

      const result = await NicheBookingService.activateBeneficiary(
        { nicheBookingBeneficiaryId: parseInt(id), ...req.body },
        user.churchId
      );

      if (!result.success) {
        if (result.error.code === 'ACCESS_DENIED') {
          return res.status(403).json(result);
        }
        return res.status(400).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      logger.error('Controller: Failed to activate beneficiary:', error);

      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to activate beneficiary'
        }
      });
    }
  }

  /**
   * Deactivate beneficiary
   * POST /api/niche-bookings/beneficiaries/:id/deactivate
   * Based on: UpdateNicheBookingBeneficiaryNonActive(string beneficiary) WebMethod
   */
  async deactivateBeneficiary(req, res) {
    try {
      const { id } = req.params;
      const { user } = req;

      if (!user || !user.churchId) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required with church ID'
          }
        });
      }

      const result = await NicheBookingService.deactivateBeneficiary(
        { nicheBookingBeneficiaryId: parseInt(id), ...req.body },
        user.churchId
      );

      if (!result.success) {
        if (result.error.code === 'ACCESS_DENIED') {
          return res.status(403).json(result);
        }
        return res.status(400).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      logger.error('Controller: Failed to deactivate beneficiary:', error);

      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to deactivate beneficiary'
        }
      });
    }
  }

  /**
   * Add second beneficiary
   * POST /api/niche-bookings/beneficiaries
   * Based on: Add2ndBenefecery(string beneficiary) WebMethod
   */
  async addBeneficiary(req, res) {
    try {
      const beneficiaryData = req.body;
      const { user } = req;

      if (!user || !user.churchId) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required with church ID'
          }
        });
      }

      const result = await NicheBookingService.addSecondBeneficiary(
        beneficiaryData,
        user.churchId
      );

      if (!result.success) {
        return res.status(400).json(result);
      }

      return res.status(201).json(result);
    } catch (error) {
      logger.error('Controller: Failed to add beneficiary:', error);

      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to add beneficiary'
        }
      });
    }
  }

  /**
   * Delete niche booking
   * DELETE /api/niche-bookings/:code
   * Based on: DeleteNicheBooking(string nicheApplicationCode) WebMethod
   */
  async deleteBooking(req, res) {
    try {
      const { code } = req.params;
      const { user } = req;

      if (!user || !user.churchId) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required with church ID'
          }
        });
      }

      const result = await NicheBookingService.deleteBooking(
        code,
        user.churchId
      );

      if (!result.success) {
        if (result.error.code === 'NOT_FOUND') {
          return res.status(404).json(result);
        }
        if (result.error.code === 'ACCESS_DENIED') {
          return res.status(403).json(result);
        }
        return res.status(400).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      logger.error('Controller: Failed to delete niche booking:', error);

      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete niche booking'
        }
      });
    }
  }

  /**
   * Get booking by niche ID
   * GET /api/niche-bookings/by-niche/:nicheId
   * Utility endpoint to check if a niche is booked
   */
  async getByNicheId(req, res) {
    try {
      const { nicheId } = req.params;
      const { user } = req;

      if (!user || !user.churchId) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required with church ID'
          }
        });
      }

      const result = await NicheBookingService.getBookingByNicheId(parseInt(nicheId));

      return res.status(200).json(result);
    } catch (error) {
      logger.error('Controller: Failed to get booking by niche ID:', error);

      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve booking'
        }
      });
    }
  }
}

module.exports = new NicheBookingController();

