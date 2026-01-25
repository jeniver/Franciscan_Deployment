const EngraveApplicationRepository = require('../repositories/EngraveApplicationRepository');
const NicheApplicationRepository = require('../repositories/NicheApplicationRepository');
const TaskItemMappingRepository = require('../repositories/TaskItemMappingRepository');
const InvoiceRepository = require('../repositories/InvoiceRepository');
const InvoiceService = require('./InvoiceService');
const { executeQuery } = require('../config/database');
const { EngraveApplication, EngraveApplicationDetail } = require('../models/EngraveApplication');
const logger = require('../utils/logger');

/**
 * InscriptionInvoiceService
 *
 * Backend orchestration for the Inscription (INCR) flow:
 *  - Reads NicheInscriptionRequest (EngraveApplication model)
 *  - Resolves task‑mapped inscription items via TaskItemMapping
 *  - Creates a proper Invoice + InvoiceDetail using existing InvoiceService
 *
 * All logic is additive and reuses existing invoice validation / duplicate checks.
 */
class InscriptionInvoiceService {
  constructor() {
    this.engraveRepo = EngraveApplicationRepository;
    this.taskItemMappingRepo = new TaskItemMappingRepository();
    this.invoiceRepo = new InvoiceRepository();
    this.invoiceService = new InvoiceService(this.invoiceRepo);

    // Fixed task id for Niche Inscription in legacy system
    this.INSCRIPTION_TASK_ID = 4;
  }

  /**
   * Resolve an inscription application (NicheInscriptionRequest) by code.
   *
   * Supports:
   *  - Direct INCR code (NicheInscriptionRequest.Code)
   *  - Niche Application code (NAPP-style), by:
   *      NicheApplication.Code -> NicheBooking -> NicheInscriptionRequest
   *
   * @param {string} code
   * @returns {Promise<Object|null>} EngraveApplication or null
   */
  async _resolveApplicationByCode(code) {
    if (!code) return null;

    logger.info('DIAGNOSTIC: _resolveApplicationByCode called:', { code });

    // 1) Try direct INCR code via repository
    let application = await this.engraveRepo.getByCode(code);
    if (application) {
      logger.info('DIAGNOSTIC: Found direct INCR application:', { code, inscriptionId: application.nicheInscriptionRequestId });
      return application;
    }

    logger.info('DIAGNOSTIC: Direct INCR lookup failed, trying NicheApplication chain...');

    // 2) Try treat as NicheApplication code and follow the chain:
    //    NicheApplication -> NicheBooking -> NicheInscriptionRequest
    try {
      const appQuery = `
        SELECT TOP 1 NicheApplicationId, Code, Status
        FROM NicheApplication WITH (NOLOCK)
        WHERE Code = @code
      `;
      const appResult = await executeQuery(appQuery, { code });

      if (!appResult.recordset || appResult.recordset.length === 0) {
        logger.warn('DIAGNOSTIC: NicheApplication not found:', { code });
        return null;
      }

      const nicheApplicationId = appResult.recordset[0].NicheApplicationId;
      const nicheAppStatus = appResult.recordset[0].Status;
      logger.info('DIAGNOSTIC: Found NicheApplication:', { 
        code, 
        nicheApplicationId, 
        status: nicheAppStatus 
      });

      // NicheBooking table uses BookingStatus (not Status) and Code may not exist
      const bookingQuery = `
        SELECT TOP 1 NicheBookingId, BookingStatus
        FROM NicheBooking WITH (NOLOCK)
        WHERE NicheApplicationId = @nicheApplicationId
        ORDER BY NicheBookingId DESC
      `;
      const bookingResult = await executeQuery(bookingQuery, { nicheApplicationId });

      if (!bookingResult.recordset || bookingResult.recordset.length === 0) {
        logger.info('DIAGNOSTIC: NicheBooking not found for NicheApplication - checking for direct inscription or auto-creating:', { 
          code, 
          nicheApplicationId
        });
        
        // Check if there's already an inscription application directly linked to the niche application (without booking)
        // Since NicheInscriptionRequest doesn't have NicheApplicationCode, we need to find inscriptions
        // that are not linked to any booking, or find them through a different method
        // For now, we'll skip this check and proceed to auto-create if needed
        const directInscriptionResult = { recordset: [] };
        
        if (directInscriptionResult.recordset && directInscriptionResult.recordset.length > 0) {
          const incrCode = directInscriptionResult.recordset[0].Code;
          logger.info('DIAGNOSTIC: Found existing inscription application (no booking):', {
            code,
            incrCode,
            inscriptionId: directInscriptionResult.recordset[0].NicheInscriptionRequestId
          });
          
          application = await this.engraveRepo.getByCode(incrCode);
          if (application) {
            logger.info(`InscriptionInvoiceService: Resolved Niche Application code ${code} to existing inscription ${incrCode} (no booking)`);
            return application;
          }
        }
        
        // No existing inscription found - auto-create one from niche application
        logger.info('DIAGNOSTIC: Auto-creating inscription application for niche application (no booking):', {
          code,
          nicheApplicationId
        });
        
        try {
          // Get full niche application details
          const nicheApp = await NicheApplicationRepository.getByCode(code);
          
          if (!nicheApp) {
            logger.warn('DIAGNOSTIC: Cannot auto-create inscription - niche application not found:', { code });
            return null;
          }
          
          // CRITICAL: NicheInscriptionRequest requires NicheBookingId (NOT NULL)
          // We cannot create an inscription without a booking
          // Skip inscription creation and return null - the caller should handle this gracefully
          logger.warn('DIAGNOSTIC: Cannot auto-create inscription - NicheBookingId is required but no booking exists:', {
            code,
            nicheApplicationId
          });
          return null;
          
          // Build deceased details from niche application beneficiaries
          const deceasedDetails = [];
          
          if (nicheApp.beneficiaries && nicheApp.beneficiaries.length > 0) {
            // Use beneficiaries as deceased details
            for (const beneficiary of nicheApp.beneficiaries) {
              deceasedDetails.push(new EngraveApplicationDetail({
                name: beneficiary.name || beneficiary.Name || 'To be specified',
                dateOfDeath: null, // Not available in beneficiary
                dateOfBirth: null, // Not typically in niche application beneficiaries
                internmentDate: null,
                deathCertificateNo: null,
                birthYear: null,
                inscriptionText: null
              }));
            }
          } else {
            // If no beneficiaries, create a default entry
            deceasedDetails.push(new EngraveApplicationDetail({
              name: nicheApp.applicantName || 'To be specified',
              dateOfDeath: null,
              dateOfBirth: null,
              internmentDate: null,
              deathCertificateNo: null,
              birthYear: null,
              inscriptionText: null
            }));
          }
          
          // Create inscription application
          const inscriptionCode = await EngraveApplicationRepository.create(inscriptionApplication, deceasedDetails);
          
          logger.info(`Inscription application auto-created successfully (no booking): ${inscriptionCode}`, {
            inscriptionCode,
            nicheApplicationCode: code,
            nicheApplicationId,
            deceasedCount: deceasedDetails.length
          });
          
          // Retrieve the created application
          application = await this.engraveRepo.getByCode(inscriptionCode);
          
          if (application) {
            logger.info(`InscriptionInvoiceService: Auto-created and resolved inscription ${inscriptionCode} for niche application ${code}`);
            return application;
          } else {
            logger.error('DIAGNOSTIC: Created inscription but could not retrieve it:', { inscriptionCode });
            return null;
          }
        } catch (autoCreateError) {
          logger.error('DIAGNOSTIC: Failed to auto-create inscription application:', {
            error: autoCreateError.message,
            stack: autoCreateError.stack,
            code,
            nicheApplicationId
          });
          // Don't throw - return null so the original error message is shown
          return null;
        }
      }

      const nicheBookingId = bookingResult.recordset[0].NicheBookingId;
      const bookingStatus = bookingResult.recordset[0].BookingStatus;
      logger.info('DIAGNOSTIC: Found NicheBooking:', { 
        code, 
        nicheApplicationId, 
        nicheBookingId,
        bookingStatus
      });

      // Check for inscription linked to booking first
      const inscriptionQuery = `
        SELECT TOP 1 Code, NicheInscriptionRequestId
        FROM NicheInscriptionRequest WITH (NOLOCK)
        WHERE NicheBookingId = @nicheBookingId
        ORDER BY NicheInscriptionRequestId DESC
      `;
      const inscriptionResult = await executeQuery(inscriptionQuery, { nicheBookingId });

      if (!inscriptionResult.recordset || inscriptionResult.recordset.length === 0) {
        logger.info('DIAGNOSTIC: NicheInscriptionRequest not found for NicheBooking - checking for direct link or auto-creating:', { 
          code, 
          nicheApplicationId, 
          nicheBookingId
        });
        
        // Check if there's an inscription linked to this booking
        // Since NicheInscriptionRequest doesn't have NicheApplicationCode column,
        // we can only check by NicheBookingId
        const directInscriptionQuery = `
          SELECT TOP 1 Code, NicheInscriptionRequestId
          FROM NicheInscriptionRequest WITH (NOLOCK)
          WHERE NicheBookingId = @nicheBookingId
          ORDER BY NicheInscriptionRequestId DESC
        `;
        const directInscriptionResult = await executeQuery(directInscriptionQuery, { nicheBookingId });
        
        if (directInscriptionResult.recordset && directInscriptionResult.recordset.length > 0) {
          const incrCode = directInscriptionResult.recordset[0].Code;
          logger.info('DIAGNOSTIC: Found inscription directly linked to niche application:', {
            code,
            incrCode,
            inscriptionId: directInscriptionResult.recordset[0].NicheInscriptionRequestId
          });
          
          application = await this.engraveRepo.getByCode(incrCode);
          if (application) {
            logger.info(`InscriptionInvoiceService: Resolved Niche Application code ${code} to inscription ${incrCode} (direct link)`);
            return application;
          }
        }
        
        // No inscription found - auto-create one
        logger.info('DIAGNOSTIC: Auto-creating inscription application for niche application with booking:', {
          code,
          nicheApplicationId,
          nicheBookingId
        });
        
        try {
          // Get full niche application details
          const nicheApp = await NicheApplicationRepository.getByCode(code);
          
          if (!nicheApp) {
            logger.warn('DIAGNOSTIC: Cannot auto-create inscription - niche application not found:', { code });
            return null;
          }
          
          // Build inscription application from niche application data
          const inscriptionApplication = new EngraveApplication({
            // Applicant information from niche application
            applicantName: nicheApp.applicantName,
            applicantIDNo: nicheApp.applicantIDNo,
            applicantEmailID: nicheApp.applicantEmailID,
            applicantMobileNo: nicheApp.applicantMobileNo,
            applicantHomeTelNo: nicheApp.applicantHomeTelNo,
            applicantOfficeTelNo: nicheApp.applicantOfficeTelNo,
            applicantAddressNo: nicheApp.applicantAddressNo,
            applicantAddressLine1: nicheApp.applicantAddressLine1,
            applicantAddressLine2: nicheApp.applicantAddressLine2,
            applicantAddressCity: nicheApp.applicantAddressCity,
            applicantAddressState: nicheApp.applicantAddressState,
            applicantAddressCountry: nicheApp.applicantAddressCountry,
            // Link to niche application and booking
            nicheApplicationCode: code,
            nicheBookingId: nicheBookingId, // Link to the booking
            // Default values
            bibleInscriptionChoiceId: null,
            bibleInscriptionText: null,
            churchId: nicheApp.churchId,
            userId: null,
            remarks: `Auto-created for niche application ${code} with booking ${nicheBookingId}`,
            status: 1 // Draft status
          });
          
          // Build deceased details from niche application beneficiaries
          const deceasedDetails = [];
          
          if (nicheApp.beneficiaries && nicheApp.beneficiaries.length > 0) {
            for (const beneficiary of nicheApp.beneficiaries) {
              deceasedDetails.push(new EngraveApplicationDetail({
                name: beneficiary.name || beneficiary.Name || 'To be specified',
                dateOfDeath: null,
                dateOfBirth: null,
                internmentDate: null,
                deathCertificateNo: null,
                birthYear: null,
                inscriptionText: null
              }));
            }
          } else {
            deceasedDetails.push(new EngraveApplicationDetail({
              name: nicheApp.applicantName || 'To be specified',
              dateOfDeath: null,
              dateOfBirth: null,
              internmentDate: null,
              deathCertificateNo: null,
              birthYear: null,
              inscriptionText: null
            }));
          }
          
          // Create inscription application
          const inscriptionCode = await EngraveApplicationRepository.create(inscriptionApplication, deceasedDetails);
          
          logger.info(`Inscription application auto-created successfully (with booking): ${inscriptionCode}`, {
            inscriptionCode,
            nicheApplicationCode: code,
            nicheApplicationId,
            nicheBookingId,
            deceasedCount: deceasedDetails.length
          });
          
          // Retrieve the created application
          application = await this.engraveRepo.getByCode(inscriptionCode);
          
          if (application) {
            logger.info(`InscriptionInvoiceService: Auto-created and resolved inscription ${inscriptionCode} for niche application ${code}`);
            return application;
          } else {
            logger.error('DIAGNOSTIC: Created inscription but could not retrieve it:', { inscriptionCode });
            return null;
          }
        } catch (autoCreateError) {
          logger.error('DIAGNOSTIC: Failed to auto-create inscription application:', {
            error: autoCreateError.message,
            stack: autoCreateError.stack,
            code,
            nicheApplicationId,
            nicheBookingId
          });
          return null;
        }
      }

      const incrCode = inscriptionResult.recordset[0].Code;
      const inscriptionId = inscriptionResult.recordset[0].NicheInscriptionRequestId;
      const inscriptionStatus = inscriptionResult.recordset[0].Status;
      logger.info('DIAGNOSTIC: Found NicheInscriptionRequest:', { 
        code, 
        nicheApplicationId, 
        nicheBookingId,
        incrCode,
        inscriptionId,
        inscriptionStatus
      });

      application = await this.engraveRepo.getByCode(incrCode);

      if (application) {
        logger.info(
          `InscriptionInvoiceService: Resolved Niche Application code ${code} to inscription ${incrCode}`
        );
      } else {
        logger.error('DIAGNOSTIC: Found INCR code but repository.getByCode returned null:', {
          incrCode,
          inscriptionId
        });
      }

      return application || null;
    } catch (error) {
      logger.error('InscriptionInvoiceService: Failed to resolve application by code', {
        code,
        error: error.message,
        stack: error.stack
      });
      return null;
    }
  }

  /**
   * Parse address components from address fields
   * @param {string} addressNo - Address number (e.g., "Blk 123")
   * @param {string} addressLine1 - Address line 1 (e.g., "Bishan Street 11")
   * @param {string} addressLine2 - Address line 2 (e.g., "#07-111")
   * @param {string} addressCity - City (may contain postal code)
   * @returns {Object} Parsed address components
   */
  _parseAddress(addressNo, addressLine1, addressLine2, addressCity) {
    const parsed = {
      block: null,
      blockNo: null,
      street: null,
      streetName: null,
      unitNo: null,
      postalCode: null
    };

    // Parse Block and Block No. from addressNo (e.g., "Blk 123" or "123")
    if (addressNo) {
      const blockMatch = addressNo.match(/(?:Blk|Block)\s*(\d+)/i);
      if (blockMatch) {
        parsed.block = `Blk ${blockMatch[1]}`;
        parsed.blockNo = blockMatch[1];
      } else {
        const numMatch = addressNo.match(/(\d+)/);
        if (numMatch) {
          parsed.block = `Blk ${numMatch[1]}`;
          parsed.blockNo = numMatch[1];
        } else {
          parsed.block = addressNo;
        }
      }
    }

    // Parse Street and Street Name from addressLine1 (e.g., "Bishan Street 11")
    if (addressLine1) {
      const streetMatch = addressLine1.match(/(.+?)\s+(Street|St|Rd|Road|Ave|Avenue|Drive|Dr|Lane|Ln|Way|Walk|Place|Pl|Crescent|Cres|Close|Cl)\s*(\d+)?/i);
      if (streetMatch) {
        parsed.street = streetMatch[0].trim();
        parsed.streetName = streetMatch[1].trim();
        if (streetMatch[3]) {
          parsed.streetName += ` ${streetMatch[3]}`;
        }
      } else {
        parsed.street = addressLine1;
        parsed.streetName = addressLine1;
      }
    }

    // Parse Unit No. from addressLine2 (e.g., "#07-111" or "#XX-XX")
    if (addressLine2) {
      const unitMatch = addressLine2.match(/#?([A-Z0-9]+-?[A-Z0-9]*)/i);
      if (unitMatch) {
        parsed.unitNo = `#${unitMatch[1]}`;
      } else {
        parsed.unitNo = addressLine2;
      }
    }

    // Parse Postal Code from addressCity (e.g., "Singapore 123456")
    if (addressCity) {
      const postalMatch = addressCity.match(/(\d{6})/);
      if (postalMatch) {
        parsed.postalCode = postalMatch[1];
      }
    }

    return parsed;
  }

  /**
   * Resolve inscription‑related items for a given inscription application code.
   * Enhanced to return full application details along with items.
   *
   * @param {string} applicationCode - INCR application code
   * @param {number} churchId
   * @returns {Promise<Object>} Object containing items and application details
   */
  async getInscriptionItems(applicationCode, churchId) {
    if (!applicationCode || !churchId) {
      throw new Error('Application code and churchId are required');
    }

    logger.info('DIAGNOSTIC: getInscriptionItems called:', {
      applicationCode,
      churchId
    });

    let application = await this._resolveApplicationByCode(applicationCode);

    logger.info('DIAGNOSTIC: Application resolution result (first attempt):', {
      applicationCode,
      found: !!application,
      applicationCodeFromDb: application?.code || null,
      churchId: application?.churchId || null,
      nicheBookingId: application?.nicheBookingId || null
    });

    // If not found and it's a niche application code, try auto-creating inscription
    if (!application) {
      const isNicheAppCode = /^\d+-\d+$/.test(applicationCode);
      
      if (isNicheAppCode) {
        logger.info('DIAGNOSTIC: Application not found, attempting auto-creation in getInscriptionItems:', {
          applicationCode,
          churchId
        });
        
        try {
          // Get full niche application details
          const nicheApp = await NicheApplicationRepository.getByCode(applicationCode);
          
          if (!nicheApp) {
            logger.warn('DIAGNOSTIC: Cannot auto-create inscription - niche application not found:', { applicationCode });
            const err = new Error(`Niche application not found: ${applicationCode}`);
            err.code = 'NOT_FOUND';
            err.details = { applicationCode, issue: 'NICHE_APPLICATION_NOT_FOUND' };
            throw err;
          }
          
          // Verify churchId matches
          if (nicheApp.churchId !== churchId) {
            logger.warn('DIAGNOSTIC: Church ID mismatch - cannot auto-create inscription:', {
              applicationCode,
              nicheAppChurchId: nicheApp.churchId,
              requestedChurchId: churchId
            });
            const err = new Error('Access denied - Church ID mismatch');
            err.code = 'ACCESS_DENIED';
            throw err;
          }
          
          // Check if there's already an inscription linked to this niche application
          // Since NicheInscriptionRequest doesn't have NicheApplicationCode column,
          // we need to find it through NicheBooking -> NicheApplication
          const existingInscriptionQuery = `
            SELECT TOP 1 nir.Code, nir.NicheInscriptionRequestId
            FROM NicheInscriptionRequest nir WITH (NOLOCK)
            INNER JOIN NicheBooking nb WITH (NOLOCK) ON nir.NicheBookingId = nb.NicheBookingId
            INNER JOIN NicheApplication na WITH (NOLOCK) ON nb.NicheApplicationId = na.NicheApplicationId
            WHERE na.Code = @code
            ORDER BY nir.NicheInscriptionRequestId DESC
          `;
          const existingResult = await executeQuery(existingInscriptionQuery, { code: applicationCode });
          
          // Also check for inscriptions without booking (NicheBookingId IS NULL)
          // These might be created directly for the application
          if (!existingResult.recordset || existingResult.recordset.length === 0) {
            const nullBookingQuery = `
              SELECT TOP 1 Code, NicheInscriptionRequestId
              FROM NicheInscriptionRequest WITH (NOLOCK)
              WHERE NicheBookingId IS NULL
              ORDER BY NicheInscriptionRequestId DESC
            `;
            const nullBookingResult = await executeQuery(nullBookingQuery, {});
            if (nullBookingResult.recordset && nullBookingResult.recordset.length > 0) {
              // For inscriptions without booking, we can't verify they're for this application
              // So we'll skip this and create a new one if needed
            }
          }
          
          if (existingResult.recordset && existingResult.recordset.length > 0) {
            const existingCode = existingResult.recordset[0].Code;
            logger.info('DIAGNOSTIC: Found existing inscription after initial check:', { existingCode });
            application = await this.engraveRepo.getByCode(existingCode);
            
            if (application) {
              logger.info('DIAGNOSTIC: Successfully retrieved existing inscription:', {
                inscriptionCode: existingCode,
                applicationCode
              });
            }
          }
          
          // If still not found, create new inscription
          if (!application) {
            logger.info('DIAGNOSTIC: Auto-creating new inscription application:', {
              applicationCode,
              nicheApplicationId: nicheApp.nicheApplicationId,
              churchId: nicheApp.churchId
            });
            
            // CRITICAL: NicheBookingId is REQUIRED (NOT NULL in schema)
            // We cannot create inscriptions without bookings
            logger.warn('DIAGNOSTIC: Cannot auto-create inscription - NicheBookingId is required but no booking exists:', {
              applicationCode,
              nicheApplicationId: nicheApp.nicheApplicationId
            });
            
            // Return error - the caller should handle this gracefully
            // The inscription can only be created after a booking is created
            const err = new Error('Inscription application cannot be created without a booking. Please create a booking first.');
            err.code = 'BOOKING_REQUIRED';
            err.details = { 
              applicationCode,
              issue: 'NO_BOOKING',
              message: 'NicheBookingId is required (NOT NULL) to create an inscription application'
            };
            throw err;
          }
        } catch (autoCreateError) {
          logger.error('DIAGNOSTIC: Failed to auto-create inscription in getInscriptionItems:', {
            error: autoCreateError.message,
            stack: autoCreateError.stack,
            applicationCode,
            churchId
          });
          
          // If it's already a proper error with code, re-throw it
          if (autoCreateError.code) {
            throw autoCreateError;
          }
          
          // Otherwise, provide helpful error message
          let errorMessage = 'Inscription application not found';
          let errorDetails = { applicationCode };
          
          if (autoCreateError.message.includes('not found')) {
            errorMessage = autoCreateError.message;
          } else {
            errorMessage = `Failed to auto-create inscription application: ${autoCreateError.message}`;
            errorDetails.autoCreateError = autoCreateError.message;
          }
          
          const err = new Error(errorMessage);
          err.code = 'NOT_FOUND';
          err.details = errorDetails;
          throw err;
        }
      } else {
        // Not a niche application code format - provide generic error
        const err = new Error('Inscription application not found');
        err.code = 'NOT_FOUND';
        err.details = { applicationCode };
        throw err;
      }
    }
    
    // Final check - application should exist now
    if (!application) {
      const err = new Error('Inscription application not found');
      err.code = 'NOT_FOUND';
      err.details = { applicationCode };
      throw err;
    }

    // Verify churchId matches (critical security check)
    if (application.churchId !== churchId) {
      logger.warn('DIAGNOSTIC: Church ID mismatch:', {
        applicationCode,
        applicationChurchId: application.churchId,
        requestedChurchId: churchId
      });
      const err = new Error('Access denied - Church ID mismatch');
      err.code = 'ACCESS_DENIED';
      throw err;
    }

    // For now, mirror the ASP.NET parameter set:
    //   _ForInscriptiond = "0"
    //   _ForUrn         = "0"
    const parameters = [
      { name: '_ForInscriptiond', value: '0' },
      { name: '_ForUrn', value: '0' }
    ];

    const items = await this.taskItemMappingRepo.getItemsForTask(
      this.INSCRIPTION_TASK_ID,
      parameters,
      churchId
    );

    logger.info('DIAGNOSTIC: Inscription items retrieved:', {
      applicationCode,
      taskId: this.INSCRIPTION_TASK_ID,
      itemCount: items?.length || 0,
      items: items?.map(item => ({
        ItemId: item.ItemId,
        Name: item.Name,
        Code: item.Code,
        Price: item.Price
      })) || []
    });

    // Parse address components
    const addressComponents = this._parseAddress(
      application.applicantAddressNo,
      application.applicantAddressLine1,
      application.applicantAddressLine2,
      application.applicantAddressCity
    );

    // Build enhanced response
    return {
      // Inscription Request No. (Auto-generated)
      inscriptionRequestNo: application.code,
      
      // Items (existing response)
      items: items,
      
      // Edit Contact (Applicant) Details
      applicant: {
        name: application.applicantName || '',
        nricPassportNo: application.applicantIDNo || '',
        address: {
          block: addressComponents.block || '',
          blockNo: addressComponents.blockNo || '',
          street: addressComponents.street || '',
          streetName: addressComponents.streetName || '',
          unitNo: addressComponents.unitNo || '',
          postalCode: addressComponents.postalCode || ''
        },
        mobile: application.applicantMobileNo || '',
        homeTel: application.applicantHomeTelNo || '',
        emailId: application.applicantEmailID || ''
      },
      
      // Details of Deceased
      deceasedDetails: (application.deceasedDetails || []).map(detail => ({
        name: detail.name || '',
        dateOfDeath: detail.dateOfDeath || '',
        dateOfBirth: detail.dateOfBirth || '',
        internmentDate: detail.internmentDate || '',
        deathCertificateNo: detail.deathCertificateNo || '',
        birthYear: detail.birthYear || '',
        inscriptionText: detail.inscriptionText || ''
      })),
      
      // Additional Details of Inscription
      additionalDetails: {
        bibleInscriptionChoiceId: application.bibleInscriptionChoiceId || null,
        bibleInscriptionText: application.bibleInscriptionText || '',
        additionalInscriptionPhrase: application.additionalInscriptionPhrase || application.remarks || '',
        remarks: application.remarks || '',
        nicheApplicationCode: application.nicheApplicationCode || '',
        nicheBookingId: application.nicheBookingId || null
      }
    };
  }

  /**
   * Create an invoice for a given inscription application.
   *
   * This wraps InvoiceService.saveInvoice so that:
   *  - Duplicate checks
   *  - Ref document validation (INCR)
   *  - Transactions
   * all remain exactly as per existing invoice implementation.
   *
   * @param {string} applicationCode - INCR application code
   * @param {number} userId
   * @param {number} churchId
   * @returns {Promise<Object>} result from InvoiceService.saveInvoice
   */
  async createInvoiceForInscription(applicationCode, userId, churchId) {
    try {
      if (!applicationCode || !userId || !churchId) {
        throw new Error('applicationCode, userId and churchId are required');
      }

      const application = await this._resolveApplicationByCode(applicationCode);

      if (!application) {
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Inscription application not found'
          }
        };
      }

      if (application.churchId !== churchId) {
        return {
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: 'Access denied - Church ID mismatch'
          }
        };
      }

      const items = await this.getInscriptionItems(application.code, churchId);

      if (!items || items.length === 0) {
        return {
          success: false,
          error: {
            code: 'NO_MAPPED_ITEMS',
            message: 'No inscription items configured for this application'
          }
        };
      }

      // Build invoice details from mapped items.
      // We keep the calculation simple and let the consumer/frontend
      // adjust amounts later if needed.
      const invoiceDetails = items.map(item => {
        const unitAmount = Number(item.Price || 0);
        const quantity = 1;
        const lineTotalAmount = unitAmount * quantity;

        return {
          itemId: item.ItemId,
          quantity,
          unitAmount,
          payingAmount: lineTotalAmount,
          totalPayingAmount: lineTotalAmount,
          lineTotalAmount,
          lineTaxPercent: 0,
          lineTaxAmount: 0,
          refDocName: 'INCR',
          refDocNumber: application.code,
          refType: 'INCR',
          outstandingAmount: lineTotalAmount
        };
      });

      const totalAmount = invoiceDetails.reduce(
        (sum, d) => sum + Number(d.totalPayingAmount || 0),
        0
      );

      const invoice = {
        customerName: application.applicantName,
        transactionDate: new Date(),
        refDocName: 'INCR',
        refDocNumber: application.code,
        totalAmount,
        payingAmount: totalAmount,
        paymentMode: null,
        paymentModeDocNo: null,
        taxCode: null,
        taxPercentage: 0,
        taxAmount: 0
      };

      logger.info(
        `Creating inscription invoice for application ${application.code} with total ${totalAmount}`
      );

      const result = await this.invoiceService.saveInvoice(
        invoice,
        invoiceDetails,
        userId,
        churchId
      );

      return result;
    } catch (error) {
      logger.error('InscriptionInvoiceService: Failed to create invoice for inscription', {
        applicationCode,
        churchId,
        error: error.message,
        stack: error.stack
      });

      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message || 'Failed to create inscription invoice'
        }
      };
    }
  }
}

module.exports = new InscriptionInvoiceService();


