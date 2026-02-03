const NicheAgreementRepository = require('../repositories/NicheAgreementRepository');
const { cache } = require('../utils/cache');
const logger = require('../utils/logger');

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
      const bypassCache = process.env.BYPASS_CACHE === 'true';
      
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

      // Add consent form status and timestamps
      agreementData.consentForm = await this.getConsentFormStatus(nicheAgreement.applicationCode);

      // Add agreement status and timestamps
      agreementData.agreement = await this.getAgreementStatus(nicheAgreement.applicationCode);

      // Add metadata
      agreementData.metadata = {
        generatedAt: new Date().toISOString(),
        applicationNumber: nicheAgreement.applicationCode,
        hasInvoice: !!nicheAgreement.invoiceNo,
        hasReceipt: !!nicheAgreement.receiptAmount,
        beneficiaryCount: agreementData.beneficiaries.length,
        nomineeCount: (nicheAgreement.nomineeName ? 1 : 0) + (nicheAgreement.nominee2Name ? 1 : 0)
      };

      // Add Crystal Reports paths (as used in ASP.NET application)
      agreementData.crystalReports = {
        // Main Agreement Report
        agreement: {
          reportPath: 'Reports/NicheAgreement1.rpt',
          reportName: 'NicheAgreement1',
          description: 'Main Niche Agreement Report',
          parameters: {
            applicationCode: nicheAgreement.applicationCode,
            applicantName: nicheAgreement.applicantName,
            nicheNumber: nicheAgreement.nicheNumber
          }
        },

        // Invoice Reports
        invoice: nicheAgreement.invoiceNo
          ? {
            reportPath: 'Reports/Invoice_v4.rpt',
            reportName: 'Invoice_v4',
            description: 'Invoice Report',
            parameters: {
              invoiceNo: nicheAgreement.invoiceNo,
              applicationCode: nicheAgreement.applicationCode
            }
          }
          : null,

        // Invoice with Receipt
        invoiceReceipt: nicheAgreement.receiptAmount > 0
          ? {
            reportPath: 'Reports/Invoice_Receipt.rpt',
            reportName: 'Invoice_Receipt',
            description: 'Invoice with Receipt Report',
            parameters: {
              invoiceNo: nicheAgreement.invoiceNo,
              receiptAmount: nicheAgreement.receiptAmount
            }
          }
          : null,

        // Beneficiary Reports
        beneficiaryReports: {
          // First Beneficiary Reports
          firstBeneficiaryLiving: nicheAgreement.beneName_1
            ? {
              reportPath: 'Reports/ConcentForm1stLivingBeneficery.rpt',
              reportName: 'ConcentForm1stLivingBeneficery',
              description: '1st Beneficiary Living Consent Form'
            }
            : null,

          firstBeneficiaryDeceased: nicheAgreement.beneName_1
            ? {
              reportPath: 'Reports/ConcentForm1stDecessedBeneficery.rpt',
              reportName: 'ConcentForm1stDecessedBeneficery',
              description: '1st Beneficiary Deceased Consent Form'
            }
            : null,

          firstBeneficiaryLostCapacity: nicheAgreement.beneName_1
            ? {
              reportPath: 'Reports/ConcentForm1stLostCapacity.rpt',
              reportName: 'ConcentForm1stLostCapacity',
              description: '1st Beneficiary Lost Capacity Consent Form'
            }
            : null,

          // Second Beneficiary Reports
          secondBeneficiaryLiving: nicheAgreement.beneName_2
            ? {
              reportPath: 'Reports/ConcentForm2ndLivingBeneficery.rpt',
              reportName: 'ConcentForm2ndLivingBeneficery',
              description: '2nd Beneficiary Living Consent Form'
            }
            : null,

          secondBeneficiaryDeceased: nicheAgreement.beneName_2
            ? {
              reportPath: 'Reports/ConcentForm2ndDecessedBeneficery.rpt',
              reportName: 'ConcentForm2ndDecessedBeneficery',
              description: '2nd Beneficiary Deceased Consent Form'
            }
            : null,

          secondBeneficiaryLostCapacity: nicheAgreement.beneName_2
            ? {
              reportPath: 'Reports/ConcentForm2ndLostCapacity.rpt',
              reportName: 'ConcentForm2ndLostCapacity',
              description: '2nd Beneficiary Lost Capacity Consent Form'
            }
            : null,

          // Both Beneficiaries Report
          bothBeneficiariesLiving: (nicheAgreement.beneName_1 && nicheAgreement.beneName_2)
            ? {
              reportPath: 'Reports/ConcentFormLivingBeneficeries.rpt',
              reportName: 'ConcentFormLivingBeneficeries',
              description: 'Both Beneficiaries Living Consent Form'
            }
            : null,

          bothBeneficiariesDeceased: (nicheAgreement.beneName_1 && nicheAgreement.beneName_2)
            ? {
              reportPath: 'Reports/ConcentFormDecessedBeneficeries.rpt',
              reportName: 'ConcentFormDecessedBeneficeries',
              description: 'Both Beneficiaries Deceased Consent Form'
            }
            : null,

          bothBeneficiariesLostCapacity: (nicheAgreement.beneName_1 && nicheAgreement.beneName_2)
            ? {
              reportPath: 'Reports/ConcentFormLostCapacity.rpt',
              reportName: 'ConcentFormLostCapacity',
              description: 'Both Beneficiaries Lost Capacity Consent Form'
            }
            : null
        },

        // Nominee Agreement Reports
        nomineeReports: {
          // Second Nominee Agreement (as seen in the UI)
          secondNomineeAgreement: nicheAgreement.nominee2Name
            ? {
              reportPath: 'Reports/ChangeNominee.rpt',
              reportName: 'ChangeNominee',
              description: '2nd Nominee Agreement Report'
            }
            : null
        },

        // Inscription Reports
        inscriptionReports: {
          inscription: {
            reportPath: 'Reports/Inscription.rpt',
            reportName: 'Inscription',
            description: 'Inscription Report'
          },

          inscriptionLive: {
            reportPath: 'Reports/Inscriptionlive.rpt',
            reportName: 'Inscriptionlive',
            description: 'Live Inscription Report'
          },

          inscriptionNew: {
            reportPath: 'Reports/Inscriptionnew.rpt',
            reportName: 'Inscriptionnew',
            description: 'New Inscription Report'
          },

          secondInscription: {
            reportPath: 'Reports/2ndInscription.rpt',
            reportName: '2ndInscription',
            description: 'Second Inscription Report'
          }
        },

        // Additional Reports
        additionalReports: {
          beneficiaryList: {
            reportPath: 'Reports/BeneficiryList.rpt',
            reportName: 'BeneficiryList',
            description: 'Beneficiary List Report'
          },

          monthlyInscription: {
            reportPath: 'Reports/MonthlyInscription.rpt',
            reportName: 'MonthlyInscription',
            description: 'Monthly Inscription Report'
          },

          receiptMonthly: {
            reportPath: 'Reports/ReceiptMonthlyReport.rpt',
            reportName: 'ReceiptMonthlyReport',
            description: 'Monthly Receipt Report'
          }
        }
      };

      // Helper function to format dates like ASP.NET (dd-MMM-yyyy)
      // ENHANCED: Handles ISO strings, Date objects, and various date formats
      const formatDate = (date) => {
        if (!date) {
          logger.debug(`[formatDate] Input is null/undefined: ${date}`);
          return null;
        }
        
        try {
          // If it's already a Date object
          let d;
          if (date instanceof Date) {
            d = date;
          } else if (typeof date === 'string') {
            // Handle ISO strings (e.g., "2012-04-15T00:00:00.000Z")
            const trimmed = date.trim();
            if (!trimmed) {
              logger.debug(`[formatDate] Empty string provided`);
              return null;
            }
            d = new Date(trimmed);
          } else {
            // Try to convert to Date
            d = new Date(date);
          }
          
          if (isNaN(d.getTime())) {
            logger.warn(`[formatDate] Invalid date value: ${date} (type: ${typeof date})`);
            return null;
          }
          
          const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          const day = String(d.getDate()).padStart(2, '0');
          const month = months[d.getMonth()];
          const year = d.getFullYear();
          const formatted = `${day}-${month}-${year}`;
          
          logger.debug(`[formatDate] Formatted ${date} → ${formatted}`);
          return formatted;
        } catch (error) {
          logger.error(`[formatDate] Error formatting date ${date}:`, error.message);
          return null;
        }
      };

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
        // ✅ FIX: Try to format date, with fallback to construct from birthYear if dateOfBirth is null
        let formattedDateOfBirth = formatDate(nicheAgreement.beneDateOfBirth_1);
        
        // ✅ FALLBACK: If dateOfBirth is null but birthYear exists, construct a date
        if (!formattedDateOfBirth && nicheAgreement.beneBirthYear_1) {
          logger.info(`[processNicheAgreementData] dateOfBirth is null but birthYear exists (${nicheAgreement.beneBirthYear_1}), constructing date`);
          try {
            // Construct date as January 1st of the birth year
            const constructedDate = new Date(parseInt(nicheAgreement.beneBirthYear_1, 10), 0, 1);
            formattedDateOfBirth = formatDate(constructedDate);
            logger.info(`[processNicheAgreementData] Constructed date from birthYear: ${formattedDateOfBirth}`);
          } catch (e) {
            logger.warn(`[processNicheAgreementData] Failed to construct date from birthYear:`, e.message);
          }
        }
        
        logger.info(`[processNicheAgreementData] Beneficiary 1 formatted dateOfBirth:`, {
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
          dateOfBirth: formattedDateOfBirth, // ✅ Use formatted date (or constructed from birthYear)
          birthYear: nicheAgreement.beneBirthYear_1,
          relationshipToNominee1: nicheAgreement.ben1_NomineeRelationship,
          relationshipToNominee2: nicheAgreement.ben1_Nominee2Relationship,
          status: 'Occupied', // Based on the UI showing "Occupied" status
          sex: nicheAgreement.beneIsMale_1 !== null && nicheAgreement.beneIsMale_1 !== undefined
            ? (nicheAgreement.beneIsMale_1 ? 'Male' : 'Female')
            : null
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
        
        const secondIsDistinct =
          nicheAgreement.beneName_2 !== nicheAgreement.beneName_1 ||
          (nicheAgreement.beneIDNo_2 && nicheAgreement.beneIDNo_2 !== nicheAgreement.beneIDNo_1) ||
          nicheAgreement.beneBirthYear_2 !== nicheAgreement.beneBirthYear_1 ||
          nicheAgreement.beneRelationshipToApplicant_2 !== nicheAgreement.beneRelationshipToApplicant_1;

        if (secondIsDistinct) {
          // ✅ FIX: Try to format date, with fallback to construct from birthYear if dateOfBirth is null
          let formattedDateOfBirth2 = formatDate(nicheAgreement.beneDateOfBirth_2);
          
          // ✅ FALLBACK: If dateOfBirth is null but birthYear exists, construct a date
          if (!formattedDateOfBirth2 && nicheAgreement.beneBirthYear_2) {
            logger.info(`[processNicheAgreementData] Beneficiary 2 dateOfBirth is null but birthYear exists (${nicheAgreement.beneBirthYear_2}), constructing date`);
            try {
              // Construct date as January 1st of the birth year
              const constructedDate = new Date(parseInt(nicheAgreement.beneBirthYear_2, 10), 0, 1);
              formattedDateOfBirth2 = formatDate(constructedDate);
              logger.info(`[processNicheAgreementData] Beneficiary 2 constructed date from birthYear: ${formattedDateOfBirth2}`);
            } catch (e) {
              logger.warn(`[processNicheAgreementData] Failed to construct date from birthYear for beneficiary 2:`, e.message);
            }
          }
          
          logger.info(`[processNicheAgreementData] Beneficiary 2 formatted dateOfBirth:`, {
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
            dateOfBirth: formattedDateOfBirth2, // ✅ Use formatted date (or constructed from birthYear)
            birthYear: nicheAgreement.beneBirthYear_2,
            relationshipToNominee1: nicheAgreement.ben2_NomineeRelationship,
            relationshipToNominee2: nicheAgreement.ben2_Nominee2Relationship,
            status: 'Occupied', // Based on the UI showing "Occupied" status
            sex: nicheAgreement.beneIsMale_2 !== null && nicheAgreement.beneIsMale_2 !== undefined
              ? (nicheAgreement.beneIsMale_2 ? 'Male' : 'Female')
              : null
          });
        }
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

      // Add print-ready flags
      agreementData.printReady = {
        agreementReady: !!nicheAgreement.agreementDate,
        invoiceReady: !!nicheAgreement.invoiceNo,
        receiptReady: !!nicheAgreement.receiptAmount,
        consentFormReady: agreementData.consentForm.status === 'completed'
      };

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
