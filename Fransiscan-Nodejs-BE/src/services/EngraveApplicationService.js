const EngraveApplicationRepository = require('../repositories/EngraveApplicationRepository');
const NicheApplicationRepository = require('../repositories/NicheApplicationRepository');
const { EngraveApplication, EngraveApplicationDetail } = require('../models/EngraveApplication');
const { NicheApplication } = require('../models/NicheApplication');
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
        nicheApplicationCode: data.inscription?.nicheApplicationCode || data.applicant?.nicheApplicationCode || null,
        nicheBookingId: data.inscription?.nicheBookingId || null,
        churchId,
        userId,
        remarks: data.remarks
      });

      // Create detail objects (can be empty - deceased details are optional)
      const details = (data.deceasedDetails || [])
        .filter(d => d && (d.name || d.nameOfDeceased)) // Only include details with names
        .map(d =>
          new EngraveApplicationDetail(d)
        );

      // Validate
      const appValidation = application.validate();
      if (!appValidation.isValid) {
        throw new Error(`Validation failed: ${appValidation.errors.join(', ')}`);
      }

      // Validate only non-empty deceased details
      for (const detail of details) {
        const detailValidation = detail.validate();
        if (!detailValidation.isValid) {
          throw new Error(`Detail validation failed: ${detailValidation.errors.join(', ')}`);
        }
      }

      // Create in repository
      const code = await EngraveApplicationRepository.create(application, details);

      logger.info(`Engrave application created: ${code}`);

      // Synchronize with niche application if it exists
      // Try to get nicheApplicationCode from the created application
      let nicheAppCode = application.nicheApplicationCode;
      
      if (!nicheAppCode && code) {
        // Derive from inscription code format: I-7980-0 -> 7980-0
        const match = code.match(/^I-(.+)$/);
        if (match) {
          nicheAppCode = match[1];
        }
      }
      
      if (nicheAppCode) {
        try {
          const nicheApp = await NicheApplicationRepository.getByCode(nicheAppCode);
          
          if (nicheApp && nicheApp.churchId === churchId) {
            // Update niche application with inscription applicant details
            const updatedNicheApp = new NicheApplication({
              ...nicheApp,
              // Update applicant details from inscription
              applicantName: application.applicantName || nicheApp.applicantName,
              applicantIDNo: application.applicantIDNo || nicheApp.applicantIDNo,
              applicantEmailID: application.applicantEmailID || nicheApp.applicantEmailID,
              applicantMobileNo: application.applicantMobileNo || nicheApp.applicantMobileNo,
              applicantHomeTelNo: application.applicantHomeTelNo || nicheApp.applicantHomeTelNo,
              applicantOfficeTelNo: application.applicantOfficeTelNo || nicheApp.applicantOfficeTelNo,
              applicantAddressNo: application.applicantAddressNo || nicheApp.applicantAddressNo,
              applicantAddressLine1: application.applicantAddressLine1 || nicheApp.applicantAddressLine1,
              applicantAddressLine2: application.applicantAddressLine2 || nicheApp.applicantAddressLine2,
              applicantAddressCity: application.applicantAddressCity || nicheApp.applicantAddressCity,
              applicantAddressState: application.applicantAddressState || nicheApp.applicantAddressState,
              applicantAddressCountry: application.applicantAddressCountry || nicheApp.applicantAddressCountry
            });
            
            // Update niche application (preserve existing beneficiaries)
            await NicheApplicationRepository.update(
              nicheAppCode,
              updatedNicheApp,
              nicheApp.beneficiaries || []
            );
            
            logger.info(`Synchronized niche application ${nicheAppCode} with inscription ${code}`);
          }
        } catch (syncError) {
          // Log but don't fail the inscription creation if niche sync fails
          logger.warn(`Failed to synchronize niche application for inscription ${code}:`, syncError.message);
        }
      }

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

      // Create detail objects (can be empty - deceased details are optional)
      const details = (data.deceasedDetails || [])
        .filter(d => d && (d.name || d.nameOfDeceased)) // Only include details with names
        .map(d =>
          new EngraveApplicationDetail(d)
        );

      // Validate
      const appValidation = application.validate();
      if (!appValidation.isValid) {
        throw new Error(`Validation failed: ${appValidation.errors.join(', ')}`);
      }

      // Validate only non-empty deceased details
      for (const detail of details) {
        const detailValidation = detail.validate();
        if (!detailValidation.isValid) {
          throw new Error(`Detail validation failed: ${detailValidation.errors.join(', ')}`);
        }
      }

      // Update in repository
      await EngraveApplicationRepository.update(code, application, details);

      // Synchronize with niche application if it exists
      // Try to get nicheApplicationCode from existing inscription, or derive from code (I-7980-0 -> 7980-0)
      let nicheAppCode = existing.nicheApplicationCode;
      
      if (!nicheAppCode && existing.code) {
        // Derive from inscription code format: I-7980-0 -> 7980-0
        const match = existing.code.match(/^I-(.+)$/);
        if (match) {
          nicheAppCode = match[1];
        }
      }
      
      if (nicheAppCode) {
        try {
          const nicheApp = await NicheApplicationRepository.getByCode(nicheAppCode);
          
          if (nicheApp && nicheApp.churchId === churchId) {
            // Update niche application with inscription applicant details
            const updatedNicheApp = new NicheApplication({
              ...nicheApp,
              // Update applicant details from inscription
              applicantName: application.applicantName || nicheApp.applicantName,
              applicantIDNo: application.applicantIDNo || nicheApp.applicantIDNo,
              applicantEmailID: application.applicantEmailID || nicheApp.applicantEmailID,
              applicantMobileNo: application.applicantMobileNo || nicheApp.applicantMobileNo,
              applicantHomeTelNo: application.applicantHomeTelNo || nicheApp.applicantHomeTelNo,
              applicantOfficeTelNo: application.applicantOfficeTelNo || nicheApp.applicantOfficeTelNo,
              applicantAddressNo: application.applicantAddressNo || nicheApp.applicantAddressNo,
              applicantAddressLine1: application.applicantAddressLine1 || nicheApp.applicantAddressLine1,
              applicantAddressLine2: application.applicantAddressLine2 || nicheApp.applicantAddressLine2,
              applicantAddressCity: application.applicantAddressCity || nicheApp.applicantAddressCity,
              applicantAddressState: application.applicantAddressState || nicheApp.applicantAddressState,
              applicantAddressCountry: application.applicantAddressCountry || nicheApp.applicantAddressCountry
            });
            
            // Update niche application (preserve existing beneficiaries)
            await NicheApplicationRepository.update(
              nicheAppCode,
              updatedNicheApp,
              nicheApp.beneficiaries || []
            );
            
            logger.info(`Synchronized niche application ${nicheAppCode} with inscription ${code}`);
          }
        } catch (syncError) {
          // Log but don't fail the inscription update if niche sync fails
          logger.warn(`Failed to synchronize niche application for inscription ${code}:`, syncError.message);
        }
      }

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

