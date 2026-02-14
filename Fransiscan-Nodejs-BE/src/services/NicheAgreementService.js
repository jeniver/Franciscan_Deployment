const NicheAgreementRepository = require('../repositories/NicheAgreementRepository');
const InscriptionAgreementRepository = require('../repositories/InscriptionAgreementRepository');
const { cache } = require('../utils/cache');
const logger = require('../utils/logger');
const dateService = require('../utils/DateService');

// Cache configuration for niche agreements
const NICHE_AGREEMENT_CACHE_PREFIX = 'nicheAgreement:';
const NICHE_AGREEMENT_CACHE_TTL = parseInt(process.env.NICHE_AGREEMENT_CACHE_TTL || '300', 10); // 5 minutes default
const enableCache = process.env.NICHE_AGREEMENT_CACHE !== 'false';

/**
 * Niche Agreement Service
 * Contains business logic for niche agreement operations
 */
class NicheAgreementService {
  constructor() {
    this.nicheAgreementRepository = new NicheAgreementRepository();
    this.inscriptionAgreementRepository = InscriptionAgreementRepository;
  }

  /**
   * Get niche agreement details by application number
   * @param {string} applicationNumber - Application number (e.g., "3795-1", "3795", or "3795-")
   * @returns {Promise<Object>} Complete niche agreement data
   */
  async getNicheAgreementDetails(applicationNumber) {
    try {
      logger.info(`Getting niche agreement details for application: ${applicationNumber}`);

      // Validate input
      if (!applicationNumber || applicationNumber.trim() === '') {
        throw new Error('Application number is required');
      }

      // CRITICAL OPTIMIZATION: Check cache first
      const cacheKey = `${NICHE_AGREEMENT_CACHE_PREFIX}${applicationNumber.trim()}`;
      // FORCE BYPASS CACHE FOR DEBUGGING
      const bypassCache = true;

      if (enableCache && !bypassCache) {
        const cached = cache.get(cacheKey);
        if (cached) {
          logger.debug(`Cache hit for niche agreement: ${applicationNumber}`);
          return cached;
        }
      }

      // Clean the application number
      let cleanApplicationNumber = applicationNumber.trim();

      // If application number ends with dash but no suffix, try to find it
      if (cleanApplicationNumber.endsWith('-')) {
        logger.info(`Application number ends with dash: ${cleanApplicationNumber}, attempting to find matching record`);
        const suggestions = await this.findApplicationNumberByPrefix(cleanApplicationNumber);

        if (suggestions.length === 0) {
          throw new Error(`No niche agreement found for application number pattern: ${cleanApplicationNumber}`);
        }

        if (suggestions.length === 1) {
          cleanApplicationNumber = suggestions[0];
          logger.info(`Auto-selected application number: ${cleanApplicationNumber}`);
        } else {
          throw new Error(`Multiple applications found for pattern ${cleanApplicationNumber}. Please specify: ${suggestions.join(', ')}`);
        }
      }

      // If application number doesn't contain dash, try to find it
      if (!cleanApplicationNumber.includes('-')) {
        logger.info(`Application number without dash: ${cleanApplicationNumber}, attempting to find matching record`);
        const suggestions = await this.findApplicationNumberByPrefix(`${cleanApplicationNumber}-`);

        if (suggestions.length === 0) {
          throw new Error(`No niche agreement found for application number pattern: ${cleanApplicationNumber}`);
        }

        if (suggestions.length === 1) {
          cleanApplicationNumber = suggestions[0];
          logger.info(`Auto-selected application number: ${cleanApplicationNumber}`);
        } else {
          throw new Error(`Multiple applications found for pattern ${cleanApplicationNumber}. Please specify: ${suggestions.join(', ')}`);
        }
      }

      // Get the niche agreement from repository
      const nicheAgreement = await this.nicheAgreementRepository.getNicheAgreementDetailsCopy(cleanApplicationNumber);

      if (!nicheAgreement) {
        throw new Error(`No niche agreement found for application number: ${cleanApplicationNumber}`);
      }

      // Add additional business logic processing
      const processedAgreement = await this.processNicheAgreementData(nicheAgreement);

      // CRITICAL OPTIMIZATION: Cache the result
      if (enableCache && !bypassCache) {
        try {
          cache.set(cacheKey, processedAgreement, NICHE_AGREEMENT_CACHE_TTL);
          logger.debug(`Cached niche agreement: ${applicationNumber}`);
        } catch (cacheError) {
          logger.warn('Failed to cache niche agreement:', cacheError.message);
        }
      }

      logger.info(`Successfully retrieved niche agreement details for application: ${applicationNumber}`);
      return processedAgreement;
    } catch (error) {
      logger.error(`Error getting niche agreement details for ${applicationNumber}:`, error);
      throw error;
    }
  }

  /**
   * Find application numbers by prefix pattern
   * @param {string} prefix - Application number prefix (e.g., "3795-")
   * @returns {Promise<Array<string>>} Array of matching application numbers
   */
  async findApplicationNumberByPrefix(prefix) {
    try {
      return await this.nicheAgreementRepository.findApplicationNumbersByPrefix(prefix);
    } catch (error) {
      logger.error(`Error finding application numbers by prefix ${prefix}:`, error);
      return [];
    }
  }

  /**
   * Process niche agreement data with additional business logic
   * @param {NicheAgreement} nicheAgreement - Raw niche agreement data
   * @returns {Promise<Object>} Processed niche agreement data
   */
  async processNicheAgreementData(nicheAgreement) {
    try {
      // Convert to JSON format
      const agreementData = nicheAgreement.toJSON();

      // Add/Update consent form status and timestamps if not already set by repository
      if (!agreementData.consentForm || !agreementData.consentForm.status || agreementData.consentForm.status === 'pending') {
        const consentStatus = await this.getConsentFormStatus(nicheAgreement.applicationCode);
        // Only override if the repository didn't find anything better
        if (!agreementData.consentForm || !agreementData.consentForm.status) {
          agreementData.consentForm = consentStatus;
        }
      }

      // Add agreement status and timestamps
      agreementData.agreement = await this.getAgreementStatus(nicheAgreement.applicationCode);

      // Add metadata
      agreementData.metadata = {
        generatedAt: new Date().toISOString(),
        applicationNumber: nicheAgreement.applicationCode,
        hasInvoice: !!nicheAgreement.invoiceNo,
        hasReceipt: !!nicheAgreement.receiptAmount,
        beneficiaryCount: agreementData.beneficiaries.length,
        nomineeCount: (nicheAgreement.nomineeName ? 1 : 0) + (nicheAgreement.nominee2Name ? 1 : 0),
        remarks: nicheAgreement.remarks || nicheAgreement.Remarks || null
      };

      // Add deceased details from inscription if available
      agreementData.deceased = await this.getDeceasedDetails(nicheAgreement.applicationCode);

      // Use central DateService for consistent formatting
      const formatDate = (date) => dateService.formatForUI(date);

      // Process beneficiaries data (from repository)
      agreementData.beneficiaries = [];

      // ✅ DEBUG: Log beneficiary data before processing
      logger.info(`[processNicheAgreementData] Beneficiary 1 raw data:`, {
        name: nicheAgreement.beneName_1,
        dateOfBirth: nicheAgreement.beneDateOfBirth_1,
        dateOfBirthType: typeof nicheAgreement.beneDateOfBirth_1,
        birthYear: nicheAgreement.beneBirthYear_1,
        birthYearType: typeof nicheAgreement.beneBirthYear_1
      });

      if (nicheAgreement.beneName_1) {
        // ✅ FIX: Try to format date
        let formattedDateOfBirth = formatDate(nicheAgreement.beneDateOfBirth_1);

        logger.info(`[processNicheAgreementData] Beneficiary 1 formatted data:`, {
          input: nicheAgreement.beneDateOfBirth_1,
          birthYear: nicheAgreement.beneBirthYear_1,
          output: formattedDateOfBirth
        });

        agreementData.beneficiaries.push({
          name: nicheAgreement.beneName_1,
          idNo: nicheAgreement.beneIDNo_1,
          isCatholic: nicheAgreement.beneIsCatholic_1,
          isMale: nicheAgreement.beneIsMale_1,
          relationshipToApplicant: nicheAgreement.beneRelationshipToApplicant_1,
          dateOfBirth: formattedDateOfBirth,
          birthYear: nicheAgreement.beneBirthYear_1,
          relationshipToNominee1: nicheAgreement.ben1_NomineeRelationship,
          relationshipToNominee2: nicheAgreement.ben1_Nominee2Relationship,
          status: 'Occupied',
          sex: nicheAgreement.beneIsMale_1 !== null && nicheAgreement.beneIsMale_1 !== undefined
            ? (nicheAgreement.beneIsMale_1 ? 'Male' : 'Female')
            : null,
          lifeStatus: nicheAgreement.beneLifeStatus_1
        });
      }

      if (nicheAgreement.beneName_2) {
        // ✅ DEBUG: Log beneficiary 2 data
        logger.info(`[processNicheAgreementData] Beneficiary 2 raw data:`, {
          name: nicheAgreement.beneName_2,
          dateOfBirth: nicheAgreement.beneDateOfBirth_2,
          dateOfBirthType: typeof nicheAgreement.beneDateOfBirth_2,
          birthYear: nicheAgreement.beneBirthYear_2,
          birthYearType: typeof nicheAgreement.beneBirthYear_2
        });

        // SIMPLIFIED: Trust the repository data; if we have a second name, add it
        // The distinctness check was prone to errors if some fields were null/empty
        let formattedDateOfBirth2 = formatDate(nicheAgreement.beneDateOfBirth_2);

        logger.info(`[processNicheAgreementData] Beneficiary 2 formatted data:`, {
          input: nicheAgreement.beneDateOfBirth_2,
          birthYear: nicheAgreement.beneBirthYear_2,
          output: formattedDateOfBirth2
        });

        agreementData.beneficiaries.push({
          name: nicheAgreement.beneName_2,
          idNo: nicheAgreement.beneIDNo_2,
          isCatholic: nicheAgreement.beneIsCatholic_2,
          isMale: nicheAgreement.beneIsMale_2,
          relationshipToApplicant: nicheAgreement.beneRelationshipToApplicant_2,
          dateOfBirth: formattedDateOfBirth2,
          birthYear: nicheAgreement.beneBirthYear_2,
          relationshipToNominee1: nicheAgreement.ben2_NomineeRelationship,
          relationshipToNominee2: nicheAgreement.ben2_Nominee2Relationship,
          status: 'Occupied',
          sex: nicheAgreement.beneIsMale_2 !== null && nicheAgreement.beneIsMale_2 !== undefined
            ? (nicheAgreement.beneIsMale_2 ? 'Male' : 'Female')
            : null,
          lifeStatus: nicheAgreement.beneLifeStatus_2
        });
      }

      // ✅ DEBUG: Log final beneficiaries array
      logger.info(`[processNicheAgreementData] Final beneficiaries array:`, JSON.stringify(agreementData.beneficiaries, null, 2));

      // Format dates in agreement data
      agreementData.appliedDate = formatDate(agreementData.appliedDate);
      agreementData.agreementDate = formatDate(agreementData.agreementDate);
      if (agreementData.invoice) {
        agreementData.invoice.invoiceDate = formatDate(agreementData.invoice.invoiceDate);
        agreementData.invoice.receiptDate = formatDate(agreementData.invoice.receiptDate);
      }
      if (agreementData.deceased) {
        if (agreementData.deceased.deceased1) {
          agreementData.deceased.deceased1.dateDied = formatDate(agreementData.deceased.deceased1.dateDied);
          agreementData.deceased.deceased1.internmentDate = formatDate(agreementData.deceased.deceased1.internmentDate);
        }
        if (agreementData.deceased.deceased2) {
          agreementData.deceased.deceased2.dateDied = formatDate(agreementData.deceased.deceased2.dateDied);
          agreementData.deceased.deceased2.internmentDate = formatDate(agreementData.deceased.deceased2.internmentDate);
        }
      }
      if (agreementData.storage) {
        agreementData.storage.storageFrom = formatDate(agreementData.storage.storageFrom);
        agreementData.storage.storageTo = formatDate(agreementData.storage.storageTo);
      }

      // Add inscription data if available
      if (nicheAgreement.inscription) {
        agreementData.inscription = {
          code: nicheAgreement.inscription.code,
          status: nicheAgreement.inscription.status,
          bibleInscriptionChoiceId: nicheAgreement.inscription.bibleInscriptionChoiceId,
          bibleInscriptionChoiceNo: nicheAgreement.inscription.bibleInscriptionChoiceNo,
          additionalInscriptionPhrase: nicheAgreement.inscription.additionalInscriptionPhrase,
          createdDate: formatDate(nicheAgreement.inscription.createdDate)
        };

        // Add inscription items if available
        if (nicheAgreement.inscriptionItems && Array.isArray(nicheAgreement.inscriptionItems)) {
          agreementData.inscriptionItems = nicheAgreement.inscriptionItems.map(item => ({
            itemId: item.itemId,
            itemName: item.itemName,
            itemCode: item.itemCode,
            itemPrice: item.itemPrice,
            quantity: item.quantity,
            unitAmount: item.unitAmount,
            payingAmount: item.payingAmount,
            totalPayingAmount: item.totalPayingAmount,
            refDocNumber: item.refDocNumber,
            refDocName: item.refDocName,
            refType: item.refType,
            outstandingAmount: item.outstandingAmount,
            lineTotalAmount: item.lineTotalAmount,
            lineTaxPercent: item.lineTaxPercent,
            lineTaxAmount: item.lineTaxAmount
          }));
        }
      }

      // ❌ REMOVED DUPLICATE: Inscription items are now added once at the end of this method

      // Add print-ready flags
      agreementData.printReady = {
        agreementReady: !!nicheAgreement.agreementDate,
        invoiceReady: !!nicheAgreement.invoiceNo,
        receiptReady: !!nicheAgreement.receiptAmount,
        consentFormReady: agreementData.consentForm && agreementData.consentForm.status === 'completed'
      };

      // Update invoice data to include inscription items if available
      if (agreementData.invoice && agreementData.inscriptionItems && Array.isArray(agreementData.inscriptionItems)) {
        if (!agreementData.invoice.invoiceDetails) {
          agreementData.invoice.invoiceDetails = [];
        }

        // Add inscription items to invoice details if not already present
        agreementData.inscriptionItems.forEach(item => {
          const exists = agreementData.invoice.invoiceDetails.some(d => d.itemCode === item.itemCode && d.itemName === item.itemName);
          if (!exists) {
            agreementData.invoice.invoiceDetails.push(item);
          }
        });

        logger.info(`[processNicheAgreementData] Merged inscription items. Total invoice details: ${agreementData.invoice.invoiceDetails.length}`);
      }

      // CRITICAL FIX: Ensure nominee address data is properly formatted in the response
      // If nominee address fields are null in the response, make sure they are properly mapped
      if (agreementData.nominee) {
        logger.info(`[processNicheAgreementData] Nominee address data before fix:`, {
          addressLine2: agreementData.nominee.addressLine2,
          addressCity: agreementData.nominee.addressCity,
          addressState: agreementData.nominee.addressState,
          address: agreementData.nominee.address
        });

        // Ensure address fields are explicitly set in the response even if null
        agreementData.nominee.addressLine2 = agreementData.nominee.addressLine2 !== undefined ? agreementData.nominee.addressLine2 : null;
        agreementData.nominee.addressCity = agreementData.nominee.addressCity !== undefined ? agreementData.nominee.addressCity : null;
        agreementData.nominee.addressState = agreementData.nominee.addressState !== undefined ? agreementData.nominee.addressState : null;

        logger.info(`[processNicheAgreementData] Nominee address data after fix:`, {
          addressLine2: agreementData.nominee.addressLine2,
          addressCity: agreementData.nominee.addressCity,
          addressState: agreementData.nominee.addressState
        });
      }

      if (agreementData.nominee2) {
        logger.info(`[processNicheAgreementData] Nominee2 address data before fix:`, {
          addressLine2: agreementData.nominee2.addressLine2,
          addressCity: agreementData.nominee2.addressCity,
          addressState: agreementData.nominee2.addressState
        });

        // Ensure address fields are explicitly set in the response even if null
        agreementData.nominee2.addressLine2 = agreementData.nominee2.addressLine2 !== undefined ? agreementData.nominee2.addressLine2 : null;
        agreementData.nominee2.addressCity = agreementData.nominee2.addressCity !== undefined ? agreementData.nominee2.addressCity : null;
        agreementData.nominee2.addressState = agreementData.nominee2.addressState !== undefined ? agreementData.nominee2.addressState : null;

        logger.info(`[processNicheAgreementData] Nominee2 address data after fix:`, {
          addressLine2: agreementData.nominee2.addressLine2,
          addressCity: agreementData.nominee2.addressCity,
          addressState: agreementData.nominee2.addressState
        });
      }

      return agreementData;
    } catch (error) {
      logger.error('Error processing niche agreement data:', error);
      throw error;
    }
  }

  /**
   * Get consent form status and timestamps
   * @param {string} applicationCode - Application code
   * @returns {Promise<Object>} Consent form status
   */
  async getConsentFormStatus(applicationCode) {
    try {
      // This would typically query a consent form table
      // For now, we'll return a default status
      // In a real implementation, you would query the database for consent form data

      return {
        status: 'pending', // pending, completed, rejected
        timestamp: null,
        submittedBy: null,
        notes: null
      };
    } catch (error) {
      logger.error('Error getting consent form status:', error);
      return {
        status: 'unknown',
        timestamp: null,
        submittedBy: null,
        notes: 'Error retrieving consent form status'
      };
    }
  }

  /**
   * Get agreement status and timestamps
   * @param {string} applicationCode - Application code
   * @returns {Promise<Object>} Agreement status
   */
  async getAgreementStatus(applicationCode) {
    try {
      // This would typically query an agreement status table
      // For now, we'll return a default status based on the agreement date

      return {
        status: 'completed', // pending, completed, rejected, expired
        timestamp: null,
        signedBy: null,
        notes: null
      };
    } catch (error) {
      logger.error('Error getting agreement status:', error);
      return {
        status: 'unknown',
        timestamp: null,
        signedBy: null,
        notes: 'Error retrieving agreement status'
      };
    }
  }

  /**
   * Validate application number format
   * @param {string} applicationNumber - Application number to validate
   * @returns {boolean} True if valid format
   */
  validateApplicationNumber(applicationNumber) {
    if (!applicationNumber || typeof applicationNumber !== 'string') {
      return false;
    }

    // Expected format: "3795-1" (number-number)
    const pattern = /^\d+-\d+$/;
    return pattern.test(applicationNumber.trim());
  }

  /**
   * Get deceased details from inscription for the given application code
   * @param {string} applicationCode - Application code
   * @returns {Promise<Object>} Deceased details object
   */
  async getDeceasedDetails(applicationCode) {
    try {
      logger.info(`[NicheAgreementService.getDeceasedDetails] Getting deceased details for application: ${applicationCode}`);

      // First, we need to find the inscription associated with this application
      // This would typically involve querying the database to find inscription requests
      // for the given application code

      // For now, let's check if there's an inscription with a code that matches the pattern
      // We'll look for inscriptions that might be related to this application
      const inscriptionCode = `I-${applicationCode}`;

      try {
        const inscriptionDetails = await this.inscriptionAgreementRepository.getAgreementDetailsByCode(inscriptionCode);

        if (inscriptionDetails && inscriptionDetails.deceasedDetails) {
          // Format the deceased details as requested
          const deceasedData = {
            deceased1: {
              name: null,
              dateDied: null,
              internmentDate: null,
              deathCertificateNo: null
            },
            deceased2: {
              name: null,
              dateDied: null,
              internmentDate: null,
              deathCertificateNo: null
            }
          };

          // Populate with actual data if available
          if (inscriptionDetails.deceasedDetails.length > 0) {
            const firstDeceased = inscriptionDetails.deceasedDetails[0];
            deceasedData.deceased1.name = firstDeceased.name || null;
            deceasedData.deceased1.dateDied = firstDeceased.dateOfDeath || null;
            deceasedData.deceased1.internmentDate = firstDeceased.internmentDate || null;
            deceasedData.deceased1.deathCertificateNo = firstDeceased.deathCertificateNo || null;
          }

          if (inscriptionDetails.deceasedDetails.length > 1) {
            const secondDeceased = inscriptionDetails.deceasedDetails[1];
            deceasedData.deceased2.name = secondDeceased.name || null;
            deceasedData.deceased2.dateDied = secondDeceased.dateOfDeath || null;
            deceasedData.deceased2.internmentDate = secondDeceased.internmentDate || null;
            deceasedData.deceased2.deathCertificateNo = secondDeceased.deathCertificateNo || null;
          }

          logger.info(`[NicheAgreementService.getDeceasedDetails] Found deceased details for application: ${applicationCode}`);
          return deceasedData;
        }
      } catch (error) {
        // If no inscription found, that's okay - just return empty structure
        logger.debug(`[NicheAgreementService.getDeceasedDetails] No inscription found for application: ${applicationCode}`);
      }

      // Return default structure with null values
      return {
        deceased1: {
          name: null,
          dateDied: null,
          internmentDate: null,
          deathCertificateNo: null
        },
        deceased2: {
          name: null,
          dateDied: null,
          internmentDate: null,
          deathCertificateNo: null
        }
      };
    } catch (error) {
      logger.error(`[NicheAgreementService.getDeceasedDetails] Error getting deceased details for ${applicationCode}:`, error);
      // Return default structure on error
      return {
        deceased1: {
          name: null,
          dateDied: null,
          internmentDate: null,
          deathCertificateNo: null
        },
        deceased2: {
          name: null,
          dateDied: null,
          internmentDate: null,
          deathCertificateNo: null
        }
      };
    }
  }

  /**
   * Get application number suggestions for partial matches
   * @param {string} partialApplicationNumber - Partial application number
   * @returns {Promise<Array>} Array of matching application numbers
   */
  async getApplicationNumberSuggestions(partialApplicationNumber) {
    try {
      if (!partialApplicationNumber || partialApplicationNumber.trim() === '') {
        return [];
      }

      // This would typically query the database for partial matches
      // For now, we'll return an empty array
      // In a real implementation, you would query NicheApplication table

      logger.info(`Getting application number suggestions for: ${partialApplicationNumber}`);
      return [];
    } catch (error) {
      logger.error('Error getting application number suggestions:', error);
      return [];
    }
  }
}

module.exports = NicheAgreementService;
