const EngraveApplicationRepository = require('../repositories/EngraveApplicationRepository');
const { EngraveApplication, EngraveApplicationDetail } = require('../models/EngraveApplication');
const logger = require('../utils/logger');

class EngraveApplicationService {
  /**
   * Create new engrave application
   * @param {Object} data - Application data with applicant and details
   * @param {number} userId - User ID
   * @param {number} churchId - Church ID
   * @returns {Promise<Object>} Created application code
   */
  async createApplication(data, userId, churchId) {
    try {
      // Validate church ID access
      if (data.churchId && data.churchId !== churchId) {
        throw new Error('Church ID mismatch - access denied');
      }

      // Create application object
      const application = new EngraveApplication({
        ...data.applicant,
        ...data.inscription,
        churchId,
        userId,
        remarks: data.remarks
      });

      // Create detail objects
      const details = (data.deceasedDetails || []).map(d =>
        new EngraveApplicationDetail(d)
      );

      // Validate
      const appValidation = application.validate();
      if (!appValidation.isValid) {
        throw new Error(`Validation failed: ${appValidation.errors.join(', ')}`);
      }

      for (const detail of details) {
        const detailValidation = detail.validate();
        if (!detailValidation.isValid) {
          throw new Error(`Detail validation failed: ${detailValidation.errors.join(', ')}`);
        }
      }

      // Create in repository
      const code = await EngraveApplicationRepository.create(application, details);

      logger.info(`Engrave application created: ${code}`);

      return {
        success: true,
        code,
        message: 'Application created successfully'
      };
    } catch (error) {
      logger.error('Service: Failed to create engrave application:', error);
      throw error;
    }
  }

  /**
   * Get engrave application by code
   * @param {string} code - Application code
   * @param {number} churchId - Church ID for ACL
   * @returns {Promise<Object>} Application data
   */
  async getApplicationByCode(code, churchId) {
    try {
      const application = await EngraveApplicationRepository.getByCode(code);

      if (!application) {
        throw new Error('Application not found');
      }

      // Check church ID access
      if (application.churchId !== churchId) {
        throw new Error('Access denied - Church ID mismatch');
      }

      return {
        success: true,
        data: application.toJSON()
      };
    } catch (error) {
      logger.error('Service: Failed to get engrave application:', error);
      throw error;
    }
  }

  /**
   * Update engrave application
   * @param {string} code - Application code
   * @param {Object} data - Updated application data
   * @param {number} churchId - Church ID for ACL
   * @returns {Promise<Object>} Update result
   */
  async updateApplication(code, data, churchId) {
    try {
      // Check existing application and church access
      const existing = await EngraveApplicationRepository.getByCode(code);

      if (!existing) {
        throw new Error('Application not found');
      }

      if (existing.churchId !== churchId) {
        throw new Error('Access denied - Church ID mismatch');
      }

      if (!existing.canModify()) {
        throw new Error('Application cannot be modified (status is not Draft or Pending)');
      }

      // Create updated application object
      const application = new EngraveApplication({
        ...existing,
        ...data.applicant,
        ...data.inscription,
        remarks: data.remarks
      });

      // Create detail objects
      const details = (data.deceasedDetails || []).map(d =>
        new EngraveApplicationDetail(d)
      );

      // Validate
      const appValidation = application.validate();
      if (!appValidation.isValid) {
        throw new Error(`Validation failed: ${appValidation.errors.join(', ')}`);
      }

      for (const detail of details) {
        const detailValidation = detail.validate();
        if (!detailValidation.isValid) {
          throw new Error(`Detail validation failed: ${detailValidation.errors.join(', ')}`);
        }
      }

      // Update in repository
      await EngraveApplicationRepository.update(code, application, details);

      logger.info(`Engrave application updated: ${code}`);

      return {
        success: true,
        code,
        message: 'Application updated successfully'
      };
    } catch (error) {
      logger.error('Service: Failed to update engrave application:', error);
      throw error;
    }
  }

  /**
   * Confirm engrave application (create invoice)
   * @param {string} code - Application code
   * @param {number} churchId - Church ID for ACL
   * @returns {Promise<Object>} Invoice code
   */
  async confirmApplication(code, churchId) {
    try {
      // Check existing application and church access
      const existing = await EngraveApplicationRepository.getByCode(code);

      if (!existing) {
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Application not found'
          }
        };
      }

      if (existing.churchId !== churchId) {
        return {
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: 'Access denied - Church ID mismatch'
          }
        };
      }

      if (existing.status === 3) {
        return {
          success: false,
          error: {
            code: 'ALREADY_CONFIRMED',
            message: 'Application already confirmed'
          }
        };
      }

      // Confirm in repository
      const invoiceCode = await EngraveApplicationRepository.confirm(code);

      logger.info(`Engrave application confirmed: ${code}, Invoice: ${invoiceCode}`);

      return {
        success: true,
        code: invoiceCode,
        data: {
          applicationCode: code,
          invoiceCode
        },
        message: 'Application confirmed and invoice created'
      };
    } catch (error) {
      logger.error('Service: Failed to confirm engrave application:', error);

      if (error.message.includes('already confirmed')) {
        return {
          success: false,
          error: {
            code: 'CONFLICT',
            message: error.message
          }
        };
      }

      throw error;
    }
  }
}

module.exports = new EngraveApplicationService();

