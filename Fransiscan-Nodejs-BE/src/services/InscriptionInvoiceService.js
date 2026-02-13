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
        logger.info('DIAGNOSTIC: Resolved Niche Application code to inscription:', {
          nicheApplicationCode: code,
          inscriptionCode: incrCode,
          inscriptionId,
          deceasedDetailsCount: application.deceasedDetails?.length || 0,
          hasBibleChoiceId: !!application.bibleInscriptionChoiceId,
          hasAdditionalPhrase: !!application.additionalInscriptionPhrase
        });
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
      block: '',
      blockNo: '',
      street: '',
      streetName: '',
      unitNo: '',
      postalCode: ''
    };

    // Direct mapping of database fields to frontend format
    // addressNo -> block ("No", "Blk", etc.)
    parsed.block = addressNo || '';

    // addressLine1 -> blockNo (actual block number or street name)
    parsed.blockNo = addressLine1 || '';

    // addressLine2 -> unitNo (unit number like #01-123)
    parsed.unitNo = addressLine2 || '';

    // addressCity -> either postal code or street name depending on content
    if (addressCity) {
      // Check if addressCity contains postal code
      const postalMatch = addressCity.match(/(\d{6})/);
      if (postalMatch) {
        parsed.postalCode = postalMatch[1];
        // If addressCity contains both postal code and other text, treat the rest as street
        const streetPart = addressCity.replace(postalMatch[1], '').trim();
        parsed.street = streetPart;
        parsed.streetName = streetPart;
      } else {
        // If no postal code, treat as street name
        parsed.street = addressCity;
        parsed.streetName = addressCity;
      }
    }

    return parsed;
  }

  /**
   * Extract block number from address string
   * @param {string} address - Address string
   * @returns {string} Block number
   */
  _extractBlockNumber(address) {
    if (!address) return '';

    // Look for block number patterns like "No 123", "Blk 123", etc.
    const match = address.match(/(?:No\.?|Number|Blk|Block)\s*(\d+)/i);
    return match ? match[1] : '';
  }

  /**
   * Extract postal code from address string
   * @param {string} address - Address string
   * @returns {string} Postal code
   */
  _extractPostalCode(address) {
    if (!address) return '';

    // Look for 6-digit postal code
    const match = address.match(/(\d{6})/);
    return match ? match[1] : '';
  }

  /**
   * Format date string to standard display format
   * @param {string|Date} dateString - Date string in various formats
   * @returns {string} Formatted date string (DD/MM/YYYY)
   */
  _formatDate(dateString) {
    if (!dateString) return '';

    try {
      // Handle different date formats
      let date;

      if (typeof dateString === 'string') {
        // Handle SQL Server datetime format like "Jan  1 2009 12:00AM"
        if (dateString.match(/^[A-Za-z]{3}\s+\d{1,2}\s+\d{4}/)) {
          // Create a new date string in a more standardized format
          const parts = dateString.split(/\s+/).filter(p => p); // Split by whitespace and remove empty parts
          if (parts.length >= 3) {
            const [month, day, year] = parts;
            // Create a proper date string that JavaScript can parse consistently
            date = new Date(`${month} ${day} ${year}`);
          } else {
            date = new Date(dateString);
          }
        } else {
          // Try to parse other string formats
          date = new Date(dateString);
        }
      } else if (dateString instanceof Date) {
        date = dateString;
      } else {
        return String(dateString);
      }

      // Check if date is valid
      if (isNaN(date.getTime())) {
        return String(dateString);
      }

      // Format as DD-MMM-YYYY which is the standard format used throughout the system
      const day = String(date.getDate()).padStart(2, '0');
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = months[date.getMonth()];
      const year = date.getFullYear();

      return `${day}-${month}-${year}`;
    } catch (error) {
      logger.warn('Failed to format date:', { dateString, error: error.message });
      return String(dateString);
    }
  }

  /**
   * Get beneficiary details for a niche application
   * @param {number} nicheApplicationId - Niche application ID
   * @returns {Promise<Array>} Array of beneficiary details
   */
  async _getBeneficiariesForNicheApplication(nicheApplicationId) {
    try {
      const { executeQuery } = require('../config/database');

      logger.info('DIAGNOSTIC: Executing beneficiary query for niche application:', { nicheApplicationId });

      const beneficiaryQuery = `
        SELECT 
          Name,
          RelationshipToApplicant,
          DateOfBirth,
          BirthYear,
          IDNo,
          IsCatholic,
          IsMale,
          RelationshipToNominee1,
          RelationshipToNominee2
        FROM NicheApplicationBeneficiary WITH (NOLOCK)
        WHERE NicheApplicationId = @nicheApplicationId
        ORDER BY NicheApplicationBeneficiaryId
      `;

      logger.info('DIAGNOSTIC: Beneficiary query:', { beneficiaryQuery, nicheApplicationId });

      const beneficiaryResult = await executeQuery(beneficiaryQuery, { nicheApplicationId });

      logger.info('DIAGNOSTIC: Beneficiary query result:', {
        hasRecordset: !!beneficiaryResult.recordset,
        recordCount: beneficiaryResult.recordset?.length || 0,
        rawResults: beneficiaryResult.recordset || []
      });

      if (!beneficiaryResult.recordset || beneficiaryResult.recordset.length === 0) {
        logger.info('DIAGNOSTIC: No beneficiaries found for niche application:', { nicheApplicationId });
        return [];
      }

      const beneficiaries = beneficiaryResult.recordset.map(beneficiary => ({
        name: beneficiary.Name || '',
        dateOfBirth: this._formatDate(beneficiary.DateOfBirth) || '',
        birthYear: beneficiary.BirthYear || '',
        idNo: beneficiary.IDNo || '',
        isCatholic: Boolean(beneficiary.IsCatholic),
        isMale: Boolean(beneficiary.IsMale),
        relationshipToApplicant: beneficiary.RelationshipToApplicant || '',
        relationshipToNominee1: beneficiary.RelationshipToNominee1 || '',
        relationshipToNominee2: beneficiary.RelationshipToNominee2 || ''
      }));

      logger.info('DIAGNOSTIC: Mapped beneficiaries:', {
        count: beneficiaries.length,
        beneficiaries: beneficiaries
      });

      return beneficiaries;
    } catch (error) {
      logger.error('Failed to fetch beneficiaries for niche application:', error);
      return [];
    }
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
      nicheBookingId: application?.nicheBookingId || null,
      deceasedDetailsCount: application?.deceasedDetails?.length || 0,
      hasBibleChoiceId: !!application?.bibleInscriptionChoiceId,
      hasAdditionalPhrase: !!application?.additionalInscriptionPhrase,
      hasBibleText: !!application?.bibleInscriptionText
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
          // Also check by inscription code format: I-{nicheApplicationCode}
          const inscriptionCodePattern = `I-${applicationCode}`;

          logger.info('DIAGNOSTIC: Searching for existing inscription:', {
            nicheApplicationCode: applicationCode,
            inscriptionCodePattern,
            churchId
          });

          // First, try to find by inscription code pattern (I-7983-0)
          const directCodeQuery = `
            SELECT TOP 1 Code, NicheInscriptionRequestId, ChurchId
            FROM NicheInscriptionRequest WITH (NOLOCK)
            WHERE Code = @inscriptionCode AND ChurchId = @churchId
            ORDER BY NicheInscriptionRequestId DESC
          `;
          const directCodeResult = await executeQuery(directCodeQuery, {
            inscriptionCode: inscriptionCodePattern,
            churchId
          });

          // If found by direct code, use it
          if (directCodeResult.recordset && directCodeResult.recordset.length > 0) {
            const existingCode = directCodeResult.recordset[0].Code;
            logger.info('DIAGNOSTIC: Found inscription by direct code pattern:', { existingCode });
            application = await this.engraveRepo.getByCode(existingCode);

            if (application) {
              logger.info('DIAGNOSTIC: Successfully retrieved inscription by code pattern:', {
                inscriptionCode: existingCode,
                applicationCode,
                deceasedDetailsCount: application.deceasedDetails?.length || 0,
                hasBibleChoiceId: !!application.bibleInscriptionChoiceId,
                hasAdditionalPhrase: !!application.additionalInscriptionPhrase
              });
            }
          }

          // If not found by direct code, try through NicheBooking -> NicheApplication chain
          if (!application) {
            const existingInscriptionQuery = `
              SELECT TOP 1 nir.Code, nir.NicheInscriptionRequestId, nir.ChurchId
              FROM NicheInscriptionRequest nir WITH (NOLOCK)
              INNER JOIN NicheBooking nb WITH (NOLOCK) ON nir.NicheBookingId = nb.NicheBookingId
              INNER JOIN NicheApplication na WITH (NOLOCK) ON nb.NicheApplicationId = na.NicheApplicationId
              WHERE na.Code = @code AND nir.ChurchId = @churchId
              ORDER BY nir.NicheInscriptionRequestId DESC
            `;
            const existingResult = await executeQuery(existingInscriptionQuery, {
              code: applicationCode,
              churchId
            });

            logger.info('DIAGNOSTIC: Chain lookup result:', {
              found: existingResult.recordset && existingResult.recordset.length > 0,
              recordCount: existingResult.recordset?.length || 0
            });

            if (existingResult.recordset && existingResult.recordset.length > 0) {
              const existingCode = existingResult.recordset[0].Code;
              logger.info('DIAGNOSTIC: Found existing inscription via chain lookup:', { existingCode });
              application = await this.engraveRepo.getByCode(existingCode);

              if (application) {
                logger.info('DIAGNOSTIC: Successfully retrieved existing inscription via chain:', {
                  inscriptionCode: existingCode,
                  applicationCode,
                  deceasedDetailsCount: application.deceasedDetails?.length || 0,
                  hasBibleChoiceId: !!application.bibleInscriptionChoiceId,
                  hasAdditionalPhrase: !!application.additionalInscriptionPhrase
                });
              } else {
                logger.warn('DIAGNOSTIC: Found inscription code via chain but getByCode returned null:', { existingCode });
              }
            }
          }

          // If still not found, we'll return applicant details from niche application
          // without creating an inscription (user can create it later)
          if (!application) {
            logger.info('DIAGNOSTIC: No inscription found, returning applicant details from niche application:', {
              applicationCode,
              nicheApplicationId: nicheApp.nicheApplicationId,
              churchId: nicheApp.churchId
            });

            // Return applicant details from niche application without inscription
            // Parse address components properly
            const addressComponents = this._parseAddress(
              nicheApp.applicantAddressNo,
              nicheApp.applicantAddressLine1,
              nicheApp.applicantAddressLine2,
              nicheApp.applicantAddressCity
            );

            // Apply consistent address extraction for all address fields
            const processedAddressComponents = {
              block: addressComponents.block || nicheApp.applicantAddressNo || '',
              blockNo: addressComponents.blockNo || this._extractBlockNumber(nicheApp.applicantAddressNo),
              street: addressComponents.street || nicheApp.applicantAddressLine1 || '',
              streetName: addressComponents.streetName || nicheApp.applicantAddressLine1 || '',
              unitNo: addressComponents.unitNo || nicheApp.applicantAddressLine2 || '',
              postalCode: addressComponents.postalCode || this._extractPostalCode(nicheApp.applicantAddressCity) || nicheApp.applicantAddressState || ''
            };

            // Get items for inscription task
            const parameters = [
              { name: '_ForInscriptiond', value: '0' },
              { name: '_ForUrn', value: '0' }
            ];
            const items = await this.taskItemMappingRepo.getItemsForTask(
              this.INSCRIPTION_TASK_ID,
              parameters,
              churchId
            );

            // Remove the Urn (Marble) item with ItemId: 10
            const filteredItems = items.filter(item => item.ItemId !== 10);

            logger.info('DIAGNOSTIC: Items after filtering out Urn (Marble) in fallback case:', {
              originalCount: items?.length || 0,
              filteredCount: filteredItems?.length || 0,
              removedItem: items?.find(item => item.ItemId === 10) || null
            });

            // Get beneficiaries from the niche application
            let beneficiaries = [];
            try {
              logger.info('DIAGNOSTIC: Attempting to fetch beneficiaries for niche application:', {
                nicheApplicationId: nicheApp.nicheApplicationId,
                nicheApplicationCode: applicationCode
              });

              beneficiaries = await this._getBeneficiariesForNicheApplication(nicheApp.nicheApplicationId);

              logger.info('DIAGNOSTIC: Beneficiaries retrieved for fallback case:', {
                nicheApplicationId: nicheApp.nicheApplicationId,
                beneficiaryCount: beneficiaries.length,
                beneficiaries: beneficiaries
              });

              // Log individual beneficiary details for debugging
              if (beneficiaries.length > 0) {
                beneficiaries.forEach((beneficiary, index) => {
                  logger.info(`DIAGNOSTIC: Beneficiary ${index + 1}:`, {
                    name: beneficiary.name,
                    relationshipToApplicant: beneficiary.relationshipToApplicant,
                    idNo: beneficiary.idNo
                  });
                });
              }
            } catch (beneficiaryError) {
              logger.error('Failed to fetch beneficiaries for fallback case:', beneficiaryError);
              // Don't fail the entire request if beneficiaries fail
              beneficiaries = [];
            }

            // Return response with only applicant details (no inscriptionRequestNo)
            const response = {
              // No inscriptionRequestNo - indicates inscription doesn't exist yet
              inscriptionRequestNo: null,

              // Application Code - use the input parameter (niche application code) for fallback case
              applicationCode: applicationCode,

              // Items (filtered - Urn Marble removed)
              items: filteredItems,

              // Edit Contact (Applicant) Details from niche application
              applicant: {
                name: nicheApp.applicantName || '',
                nricPassportNo: nicheApp.applicantIDNo || '',
                address: processedAddressComponents,
                mobile: nicheApp.applicantMobileNo || '',
                homeTel: nicheApp.applicantHomeTelNo || '',
                emailId: nicheApp.applicantEmailID || ''
              },

              // No deceased details yet (will be added when inscription is created)
              deceasedDetails: [],

              // Beneficiary details
              beneficiaries: beneficiaries,

              // Additional Details
              additionalDetails: {
                bibleInscriptionChoiceId: null,
                bibleInscriptionText: '',
                additionalInscriptionPhrase: '',
                remarks: '',
                crossType: 'Crucifix',
                nicheApplicationCode: applicationCode,
                nicheBookingId: null
              }
            };

            logger.info('DIAGNOSTIC: Final response being returned:', {
              inscriptionRequestNo: response.inscriptionRequestNo,
              applicationCode: response.applicationCode,
              itemsCount: response.items?.length || 0,
              hasApplicant: !!response.applicant,
              applicantName: response.applicant?.name || null,
              deceasedDetailsCount: response.deceasedDetails?.length || 0,
              beneficiariesCount: response.beneficiaries?.length || 0,
              hasBeneficiaries: Array.isArray(response.beneficiaries) && response.beneficiaries.length > 0,
              beneficiarySample: response.beneficiaries?.[0] || null,
              nicheApplicationCode: response.additionalDetails?.nicheApplicationCode || null
            });

            return response;
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

    // Remove the Urn (Marble) item with ItemId: 10
    const filteredItems = items.filter(item => item.ItemId !== 10);

    logger.info('DIAGNOSTIC: Items after filtering out Urn (Marble):', {
      originalCount: items?.length || 0,
      filteredCount: filteredItems?.length || 0,
      removedItem: items?.find(item => item.ItemId === 10) || null
    });

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

    // Apply consistent address extraction for all address fields
    const processedAddressComponents = {
      block: addressComponents.block || application.applicantAddressNo || '',
      blockNo: addressComponents.blockNo || this._extractBlockNumber(application.applicantAddressNo),
      street: addressComponents.street || application.applicantAddressLine1 || '',
      streetName: addressComponents.streetName || application.applicantAddressLine1 || '',
      unitNo: addressComponents.unitNo || application.applicantAddressLine2 || '',
      postalCode: addressComponents.postalCode || this._extractPostalCode(application.applicantAddressCity) || application.applicantAddressState || ''
    };

    // Map AdditionalInscriptionPhrase to both bibleInscriptionText and additionalInscriptionPhrase for API compatibility
    const inscriptionPhrase = application.additionalInscriptionPhrase || application.bibleInscriptionText || application.remarks || '';

    // Log diagnostic information about the data being returned
    logger.info('DIAGNOSTIC: Building response with application data:', {
      applicationCode: application.code,
      deceasedDetailsCount: application.deceasedDetails?.length || 0,
      deceasedDetails: application.deceasedDetails?.map(d => ({
        name: d.name,
        hasDateOfDeath: !!d.dateOfDeath,
        hasDateOfBirth: !!d.dateOfBirth,
        hasInternmentDate: !!d.internmentDate
      })) || [],
      bibleInscriptionChoiceId: application.bibleInscriptionChoiceId,
      additionalInscriptionPhrase: application.additionalInscriptionPhrase,
      bibleInscriptionText: application.bibleInscriptionText,
      remarks: application.remarks,
      nicheApplicationCode: application.nicheApplicationCode
    });

    // Get beneficiaries if niche application code exists
    let beneficiaries = [];
    if (application.nicheApplicationCode) {
      try {
        // First, we need to get the NicheApplicationId from the code
        const { executeQuery } = require('../config/database');

        const nicheAppQuery = `
          SELECT NicheApplicationId
          FROM NicheApplication WITH (NOLOCK)
          WHERE Code = @code
        `;

        const nicheAppResult = await executeQuery(nicheAppQuery, { code: application.nicheApplicationCode });

        if (nicheAppResult.recordset && nicheAppResult.recordset.length > 0) {
          const nicheApplicationId = nicheAppResult.recordset[0].NicheApplicationId;
          beneficiaries = await this._getBeneficiariesForNicheApplication(nicheApplicationId);
        }
      } catch (beneficiaryError) {
        logger.error('Failed to fetch beneficiaries for inscription:', beneficiaryError);
        // Don't fail the entire request if beneficiaries fail
        beneficiaries = [];
      }
    }

    // Build enhanced response
    return {
      // Inscription Request No. (Auto-generated)
      inscriptionRequestNo: application.code,

      // Application Code - use the actual inscription code when inscription exists
      applicationCode: application.code,

      // Items (filtered response - Urn Marble removed)
      items: filteredItems,

      // Edit Contact (Applicant) Details
      applicant: {
        name: application.applicantName || '',
        nricPassportNo: application.applicantIDNo || '',
        address: processedAddressComponents,
        mobile: application.applicantMobileNo || '',
        homeTel: application.applicantHomeTelNo || '',
        emailId: application.applicantEmailID || ''
      },

      // Details of Deceased
      deceasedDetails: (application.deceasedDetails || []).map(detail => ({
        name: detail.name || '',
        dateOfDeath: this._formatDate(detail.dateOfDeath) || '',
        dateOfBirth: this._formatDate(detail.dateOfBirth) || '',
        internmentDate: this._formatDate(detail.internmentDate) || '',
        deathCertificateNo: detail.deathCertificateNo || '',
        birthYear: detail.birthYear || '',
        inscriptionText: detail.inscriptionText || ''
      })),

      // Beneficiary details
      beneficiaries: beneficiaries,

      // Additional Details of Inscription
      additionalDetails: {
        bibleInscriptionChoiceId: application.bibleInscriptionChoiceId || null,
        bibleInscriptionText: inscriptionPhrase,
        additionalInscriptionPhrase: inscriptionPhrase,
        remarks: application.remarks || '',
        crossType: application.crossType || 'Crucifix',
        // Use the original niche application code extracted from the inscription code if the retrieved niche application code doesn't match the pattern
        // This handles cases where the database relationship might be inconsistent
        nicheApplicationCode: (() => {
          // If the inscription code follows the pattern I-{nicheCode}, extract the original niche code
          const inscriptionMatch = application.code.match(/^I-(.+)$/);
          const extractedCode = inscriptionMatch ? inscriptionMatch[1] : null;

          // If the extracted code matches the pattern \d+-\d+ and differs from the linked one, use the extracted one
          if (extractedCode && /^\d+-\d+$/.test(extractedCode)) {
            // If the requested code is a niche application code format, use it
            if (/^\d+-\d+$/.test(applicationCode) && !applicationCode.startsWith('I-')) {
              return applicationCode;
            }
            // Otherwise, prefer the extracted code from the inscription code
            return extractedCode;
          }
          // Fallback to the linked niche application code or requested code
          return application.nicheApplicationCode || applicationCode;
        })(),
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

      const itemsResult = await this.getInscriptionItems(application.code, churchId);

      // Handle both array (legacy) and object (enhanced) response formats
      const items = Array.isArray(itemsResult) ? itemsResult : (itemsResult?.items || []);

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


