const NicheApplicationService = require('../services/NicheApplicationService');
const logger = require('../utils/logger');

class NicheApplicationController {
  /**
   * Search niche applications
   * GET /api/niche-applications
   */
  async searchApplications(req, res) {
    try {
      // Check if request was timed out or response already sent
      if (req.timedOut || res.headersSent) {
        logger.warn('Request already timed out or response sent, skipping controller execution');
        return;
      }

      const { query, user } = req;

      // Log received query parameters for debugging
      logger.info('[Controller] Received search parameters:', {
        query: query,
        userChurchId: user?.churchId,
        hasApplicationCode: !!query.applicationCode,
        hasApplicantName: !!query.applicantName,
        hasNomineeName: !!query.nomineeName,
        hasFromDate: !!query.fromDate,
        hasToDate: !!query.toDate
      });

      if (!user || !user.churchId) {
        if (!res.headersSent) {
          return res.status(401).json({
            success: false,
            error: {
              code: 'UNAUTHORIZED',
              message: 'Authentication required with church ID'
            }
          });
        }
        return;
      }

      const result = await NicheApplicationService.searchApplications(
        query,
        user.churchId
      );

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

      logger.error('Controller: Failed to search niche applications:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to search niche applications'
        }
      });
    }
  }

  /**
   * Create new niche application
   * POST /api/niche-applications
   * Based on: CaptureNewNicheApplication WebMethod
   * Optimized payload structure with deduplicated and organized data
   */
  async createApplication(req, res) {
    try {
      const { body, user } = req;



      if (!user || !user.churchId) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required with church ID'
          }
        });
      }

      // Transform and optimize the payload structure
      const optimizedPayload = this.optimizeApplicationPayload(body);

      const result = await NicheApplicationService.createApplication(
        optimizedPayload,
        user.userId,
        user.churchId
      );

      if (!result.success) {
        if (result.error.code === 'DUPLICATE') {
          return res.status(409).json(result);
        }
        if (result.error.code === 'VALIDATION_FAILED') {
          return res.status(400).json(result);
        }
        return res.status(400).json(result);
      }

      const responsePayload = {
        success: true,
        code: result.code || result.applicationNumber || result.data?.code || null,
        message: result.message || 'Niche application created successfully',
        data: this.optimizeResponseStructure(result.data)
      };

      return res.status(201).json(responsePayload);
    } catch (error) {
      logger.error('Controller: Failed to create niche application:', error);

      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message || 'Failed to create application'
        }
      });
    }
  }

  /**
   * Optimize and transform the incoming payload structure
   * Handles both old flat structure and new optimized structure
   * Ensures beneficiaries are properly preserved during updates
   */
  optimizeApplicationPayload(rawPayload) {
    const payload = { ...rawPayload };



    // Handle both old flat structure and new optimized structure
    // If we already have the optimized structure, use it as-is but ensure beneficiaries are preserved
    if (payload.applicant && payload.nominees && payload.beneficiaries) {
      logger.info('[Controller] Received optimized payload structure, using as-is');

      // Ensure beneficiaries array is properly structured
      const beneficiaries = Array.isArray(payload.beneficiaries) ? payload.beneficiaries : [];

      return this.removeEmptyValues({
        chapel: payload.chapel || {
          id: payload.chapelId,
          name: payload.chapel || payload.chapelName,
          code: payload.chapelCode
        },
        niche: payload.niche || {
          id: payload.nicheId,
          code: payload.nicheCode,
          number: payload.nicheNumber
        },
        selectedNiches: payload.selectedNiches || (payload.nicheId ? [payload.nicheId] : []),
        code: payload.code || payload.applicationCode,
        applicant: payload.applicant,
        nominees: payload.nominees,
        beneficiaries: beneficiaries, // Ensure this is always an array
        contact: payload.contact || {
          name: payload.contactName || payload.applicant?.name,
          email: payload.contactEmail || payload.applicant?.email,
          phone: payload.contactPhone || payload.applicant?.phone,
          nric: payload.contactNric || payload.applicant?.idNo,
          religion: payload.contactReligion || payload.applicant?.religion,
          status: payload.contactStatus || 'Active'
        }
      });
    }

    // Handle old flat structure - this is likely what's coming from PUT requests
    logger.info('[Controller] Received flat payload structure, optimizing...');
    const optimized = {
      // Chapel information (keep only essential fields)
      chapel: {
        id: payload.chapelId,
        name: payload.chapel,
        code: payload.chapelCode
      },

      // Niche information
      niche: {
        id: payload.nicheId,
        code: payload.nicheCode || payload.niche?.code,
        number: payload.niche?.number
      },

      // Selected niches array
      selectedNiches: payload.selectedNiches || [],

      // Applicant information (organized as object)
      applicant: {
        name: payload.applicantName,
        email: payload.applicantEmail,
        phone: payload.applicantPhone,
        homeTel: payload.applicantHomeTel,
        officeTel: payload.applicantOfficeTel,
        idNo: payload.applicantIDNo,
        isCatholic: payload.applicantIsCatholic,
        religion: payload.applicantReligion,
        address: {
          no: payload.applicantAddressNo,
          line1: payload.applicantAddressLine1,
          line2: payload.applicantAddressLine2,
          city: payload.applicantAddressCity,
          state: payload.applicantAddressState,
          country: payload.applicantAddressCountry,
          block: payload.applicantBlock,
          blockNo: payload.applicantBlockNo,
          streetName: payload.applicantStreetName,
          unitNo: payload.applicantUnitNo,
          postalCode: payload.applicantPostalCode
        }
      },

      // Nominees as array (organized)
      nominees: this.optimizeNominees(payload),

      // Beneficiaries as array (organized) - CRITICAL: Ensure this is properly handled
      beneficiaries: this.optimizeBeneficiaries(payload),

      // Additional fields
      code: payload.code || payload.applicationCode,
      contact: {
        name: payload.contactName,
        email: payload.contactEmail,
        phone: payload.contactPhone,
        homeTel: payload.contactHomeTel,
        nric: payload.contactNric,
        religion: payload.contactReligion,
        status: payload.contactStatus
      }
    };



    // Remove any undefined/null values to clean up the payload
    const cleanedPayload = this.removeEmptyValues(optimized);
    logger.info('[Controller] Final cleaned payload beneficiaries count:', cleanedPayload.beneficiaries?.length || 0);

    return cleanedPayload;
  }

  /**
   * Optimize nominees structure into clean array format
   */
  optimizeNominees(payload) {
    const nominees = [];

    // Process main nominee
    if (payload.nomineeName || payload.nominee?.name) {
      nominees.push({
        id: payload.nominee?.id,
        name: payload.nomineeName || payload.nominee?.name,
        email: payload.nomineeEmail || payload.nominee?.email,
        phone: payload.nomineePhone || payload.nominee?.phone,
        idNo: payload.nomineeIDNo || payload.nominee?.idNo,
        relationship: payload.nomineeRelationship || payload.nominee?.relationship,
        status: payload.nomineeStatus || payload.nominee?.status,
        address: {
          no: payload.nomineeAddressNo || payload.nominee?.addressNo,
          line1: payload.nomineeAddressLine1 || payload.nominee?.addressLine1,
          line2: payload.nomineeAddressLine2 || payload.nominee?.addressLine2,
          city: payload.nomineeAddressCity || payload.nominee?.addressCity,
          state: payload.nomineeAddressState || payload.nominee?.addressState,
          country: payload.nomineeAddressCountry || payload.nominee?.addressCountry,
          blockNo: payload.nomineeBlockNo || payload.nominee?.blockNo,
          streetName: payload.nomineeStreetName || payload.nominee?.streetName,
          unitNo: payload.nomineeUnitNo || payload.nominee?.unitNo,
          postalCode: payload.nomineePostalCode || payload.nominee?.postalCode
        }
      });
    }

    // Process nominee2
    if (payload.nominee2Name || payload.nominee2?.name) {
      nominees.push({
        id: payload.nominee2?.id,
        name: payload.nominee2Name || payload.nominee2?.name,
        email: payload.nominee2Email || payload.nominee2?.email,
        phone: payload.nominee2Phone || payload.nominee2?.phone,
        idNo: payload.nominee2IDNo || payload.nominee2?.idNo,
        relationship: payload.nominee2Relationship || payload.nominee2?.relationship,
        status: payload.nominee2Status || payload.nominee2?.status,
        address: {
          no: payload.nominee2AddressNo || payload.nominee2?.addressNo,
          line1: payload.nominee2AddressLine1 || payload.nominee2?.addressLine1,
          line2: payload.nominee2AddressLine2 || payload.nominee2?.addressLine2,
          city: payload.nominee2AddressCity || payload.nominee2?.addressCity,
          state: payload.nominee2AddressState || payload.nominee2?.addressState,
          country: payload.nominee2AddressCountry || payload.nominee2?.addressCountry,
          blockNo: payload.nominee2BlockNo || payload.nominee2?.blockNo,
          streetName: payload.nominee2StreetName || payload.nominee2?.streetName,
          unitNo: payload.nominee2UnitNo || payload.nominee2?.unitNo,
          postalCode: payload.nominee2PostalCode || payload.nominee2?.postalCode
        }
      });
    }

    // Process additional nominees array if provided
    if (Array.isArray(payload.nominees)) {
      payload.nominees.forEach(nominee => {
        // Avoid duplicates by checking if already added
        const exists = nominees.some(n =>
          (n.name === nominee.name && n.idNo === nominee.idNo) ||
          n.name === nominee.name
        );
        if (!exists) {
          nominees.push({
            id: nominee.id,
            name: nominee.name || nominee.fullName,
            email: nominee.email,
            phone: nominee.phone || nominee.contactNumber || nominee.mobileNo,
            idNo: nominee.idNo || nominee.nric,
            relationship: nominee.relationship || nominee.relationshipToApplicant,
            status: nominee.status,
            address: nominee.address ? {
              formatted: nominee.address
            } : undefined
          });
        }
      });
    }

    return nominees;
  }

  /**
   * Optimize beneficiaries structure into clean array format
   * Enhanced to handle various field naming conventions and ensure proper mapping
   */
  optimizeBeneficiaries(payload) {
    const beneficiaries = [];

    // Log incoming payload for debugging
    logger.info('[Controller] optimizeBeneficiaries called with payload keys:', Object.keys(payload));

    // Process beneficiaries array if provided (from optimized structure)
    if (Array.isArray(payload.beneficiaries) && payload.beneficiaries.length > 0) {
      logger.info('[Controller] Found beneficiaries array with', payload.beneficiaries.length, 'items');
      payload.beneficiaries.forEach((beneficiary, index) => {
        const dateOfBirth = beneficiary.dateOfBirth;
        const birthYear = beneficiary.birthYear;

        logger.info(`[Controller] Processing beneficiary ${index + 1}:`, {
          name: beneficiary.name,
          dateOfBirth,
          birthYear
        });

        beneficiaries.push({
          id: beneficiary.id,
          name: beneficiary.name || beneficiary.fullName,
          idNo: beneficiary.idNo || beneficiary.nric,
          isCatholic: beneficiary.isCatholic,
          isMale: beneficiary.isMale,
          gender: beneficiary.gender || (beneficiary.isMale ? 'Male' : 'Female'),
          relationship: beneficiary.relationship || beneficiary.relationshipToApplicant,
          dateOfBirth: dateOfBirth,
          birthYear: birthYear,
          status: beneficiary.status,
          relationshipToNominee1: beneficiary.relationshipToNominee1,
          relationshipToNominee2: beneficiary.relationshipToNominee2,
          religion: beneficiary.religion
        });
      });
    } else {
      // Fallback to individual beneficiary fields (from flat structure)
      logger.info('[Controller] Processing individual beneficiary fields from flat structure');
      const beneficiaryFields = ['beneficiary1', 'beneficiary2', 'beneficiary3', 'beneficiary4', 'beneficiary5'];

      beneficiaryFields.forEach((fieldPrefix, index) => {
        const name = payload[`${fieldPrefix}Name`] || payload[fieldPrefix]?.name;
        if (name) {
          const dateOfBirth = payload[`${fieldPrefix}DateOfBirth`] || payload[fieldPrefix]?.dateOfBirth || '';
          const birthYear = payload[`${fieldPrefix}BirthYear`] || payload[fieldPrefix]?.birthYear || '';

          const beneficiary = {
            id: payload[`${fieldPrefix}Id`] || payload[fieldPrefix]?.id || Date.now() + index,
            name: name,
            idNo: payload[`${fieldPrefix}IDNo`] || payload[fieldPrefix]?.idNo || payload[`${fieldPrefix}Nric`] || '',
            isCatholic: payload[`${fieldPrefix}IsCatholic`] || payload[fieldPrefix]?.isCatholic || false,
            isMale: payload[`${fieldPrefix}IsMale`] || payload[fieldPrefix]?.isMale || false,
            gender: payload[`${fieldPrefix}Gender`] || payload[fieldPrefix]?.gender ||
              (payload[`${fieldPrefix}IsMale`] ? 'Male' : 'Female'),
            relationship: payload[`${fieldPrefix}Relationship`] || payload[fieldPrefix]?.relationship || '',
            dateOfBirth: dateOfBirth,
            birthYear: birthYear,
            status: payload[`${fieldPrefix}Status`] || payload[fieldPrefix]?.status || 'Not Occupied',
            relationshipToNominee1: payload[`${fieldPrefix}RelationshipToNominee1`] ||
              payload[fieldPrefix]?.relationshipToNominee1 || '',
            relationshipToNominee2: payload[`${fieldPrefix}RelationshipToNominee2`] ||
              payload[fieldPrefix]?.relationshipToNominee2 || '',
            religion: payload[`${fieldPrefix}Religion`] || payload[fieldPrefix]?.religion || ''
          };

          beneficiaries.push(beneficiary);
          logger.info(`[Controller] Added beneficiary ${index + 1}:`, beneficiary.name);
        }
      });
    }

    logger.info('[Controller] optimizeBeneficiaries returning', beneficiaries.length, 'beneficiaries');
    return beneficiaries;
  }

  /**
   * Remove null/undefined values from object recursively
   * NOTE: Empty strings are preserved to allow clearing fields in PUT requests
   */
  removeEmptyValues(obj) {
    if (obj === null || obj === undefined) return undefined;
    if (typeof obj !== 'object') return obj;

    if (Array.isArray(obj)) {
      return obj.map(item => this.removeEmptyValues(item)).filter(item => item !== undefined);
    }

    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      const cleanedValue = this.removeEmptyValues(value);
      // Preserve empty strings, but remove null/undefined
      if (cleanedValue !== undefined && cleanedValue !== null) {
        result[key] = cleanedValue;
      }
    }

    return Object.keys(result).length > 0 ? result : undefined;
  }

  /**
   * Optimize response structure to match the desired format
   */
  optimizeResponseStructure(data) {
    if (!data) return data;

    return {
      applicationCode: data.code || data.applicationNumber,
      appliedDate: data.appliedDate,
      agreementDate: data.agreementDate,
      applicant: data.applicant,
      nominees: data.nominees,
      beneficiaries: data.beneficiaries,
      niche: data.nicheDetails || data.niche,
      chapel: data.chapel,
      status: data.status,
      // Additional metadata
      metadata: {
        generatedAt: new Date().toISOString(),
        hasBeneficiaries: Array.isArray(data.beneficiaries) && data.beneficiaries.length > 0,
        beneficiaryCount: Array.isArray(data.beneficiaries) ? data.beneficiaries.length : 0,
        nomineeCount: Array.isArray(data.nominees) ? data.nominees.length : 0
      }
    };
  }

  /**
   * Get niche application by code
   * GET /api/niche-applications/:code
   * Based on: ViewNicheApplication WebMethod
   */
  async getApplication(req, res) {
    try {
      // Check if request was timed out or response already sent
      if (req.timedOut || res.headersSent) {
        logger.warn('Request already timed out or response sent, skipping controller execution');
        return;
      }

      const { code } = req.params;
      const { user } = req;

      if (!user || !user.churchId) {
        if (!res.headersSent) {
          return res.status(401).json({
            success: false,
            error: {
              code: 'UNAUTHORIZED',
              message: 'Authentication required with church ID'
            }
          });
        }
        return;
      }

      const result = await NicheApplicationService.getApplicationByCode(
        code,
        user.churchId
      );

      // Check again before sending response (timeout might have occurred during async operation)
      if (!res.headersSent && !req.timedOut) {
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
      } else if (res.headersSent) {
        logger.warn('Response already sent (likely timeout), skipping response');
      }
    } catch (error) {
      // Check if response already sent before sending error response
      if (res.headersSent) {
        logger.warn('Cannot send error response - headers already sent:', error.message);
        return;
      }

      logger.error('Controller: Failed to get niche application:', error);

      // Check for connection/timeout errors and provide better error messages
      const isConnectionError =
        error.code === 'ETIMEOUT' ||
        error.code === 'ETIMEDOUT' ||
        error.code === 'ECONNRESET' ||
        error.code === 'ESOCKET' ||
        error.message?.includes('timeout') ||
        error.message?.includes('Failed to connect') ||
        error.message?.includes('pool error');

      if (isConnectionError) {
        return res.status(503).json({
          success: false,
          error: {
            code: 'SERVICE_UNAVAILABLE',
            message: 'Database connection failed. Please try again in a moment.'
          }
        });
      }

      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve application'
        }
      });
    }
  }

  /**
   * Update niche application
   * PUT /api/niche-applications/:code
   * Based on: UpdateNewicheApplication WebMethod
   */
  async updateApplication(req, res) {
    try {
      const { code } = req.params;
      const { body, user } = req;

      if (!user || !user.churchId) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required with church ID'
          }
        });
      }

      // Transform and optimize the payload structure for updates
      const optimizedPayload = this.optimizeApplicationPayload(body);

      const result = await NicheApplicationService.updateApplication(
        code,
        optimizedPayload,
        user.churchId
      );

      if (!result.success) {
        if (result.error.code === 'NOT_FOUND') {
          return res.status(404).json(result);
        }
        if (result.error.code === 'ACCESS_DENIED') {
          return res.status(403).json(result);
        }
        if (result.error.code === 'CONFLICT') {
          return res.status(409).json(result);
        }
        if (result.error.code === 'VALIDATION_FAILED') {
          return res.status(400).json(result);
        }
        return res.status(400).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      logger.error('Controller: Failed to update niche application:', error);

      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message || 'Failed to update application'
        }
      });
    }
  }

  /**
   * Delete niche application
   * DELETE /api/niche-applications/:code
   * Based on: DeleteNicheApplication WebMethod
   */
  async deleteApplication(req, res) {
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

      const result = await NicheApplicationService.deleteApplication(
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
      logger.error('Controller: Failed to delete niche application:', error);

      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete application'
        }
      });
    }
  }

  /**
   * Send invoice email for an application
   * POST /api/niche-applications/:code/send-invoice
   */
  async sendInvoiceEmail(req, res) {
    try {
      const { code } = req.params;
      const { body, user } = req;

      if (!user || !user.churchId) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required with church ID'
          }
        });
      }

      const result = await NicheApplicationService.sendInvoiceEmail(
        code,
        user.churchId,
        body
      );

      if (!result.success) {
        if (result.error.code === 'NOT_FOUND') {
          return res.status(404).json(result);
        }
        if (result.error.code === 'ACCESS_DENIED') {
          return res.status(403).json(result);
        }
        if (result.error.code === 'NO_RECIPIENT') {
          return res.status(400).json(result);
        }
        return res.status(400).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      logger.error('Controller: Failed to send invoice email:', error);

      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message || 'Failed to send invoice email'
        }
      });
    }
  }

  /**
   * Change niche application status from Draft to Booked
   * POST /api/niche-applications/:code/confirm-booking
   */
  async confirmBooking(req, res) {
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

      const result = await NicheApplicationService.confirmBooking(
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
        if (result.error.code === 'INVALID_STATUS') {
          return res.status(400).json(result);
        }
        if (result.error.code === 'ALREADY_BOOKED') {
          return res.status(409).json(result);
        }
        return res.status(400).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      logger.error('Controller: Failed to confirm booking:', error);

      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message || 'Failed to confirm booking'
        }
      });
    }
  }
}

module.exports = new NicheApplicationController();

