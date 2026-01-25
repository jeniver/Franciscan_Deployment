const NicheAgreementRepository = require('../repositories/NicheAgreementRepository');
const logger = require('../utils/logger');

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
      const formatDate = (date) => {
        if (!date) return null;
        try {
          const d = new Date(date);
          const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          const day = String(d.getDate()).padStart(2, '0');
          const month = months[d.getMonth()];
          const year = d.getFullYear();
          return `${day}-${month}-${year}`;
        } catch (error) {
          return date;
        }
      };

      // Process beneficiaries data (from repository)
      agreementData.beneficiaries = [];
      if (nicheAgreement.beneName_1) {
        agreementData.beneficiaries.push({
          name: nicheAgreement.beneName_1,
          idNo: nicheAgreement.beneIDNo_1,
          isCatholic: nicheAgreement.beneIsCatholic_1,
          isMale: nicheAgreement.beneIsMale_1,
          relationshipToApplicant: nicheAgreement.beneRelationshipToApplicant_1,
          dateOfBirth: formatDate(nicheAgreement.beneDateOfBirth_1),
          birthYear: nicheAgreement.beneBirthYear_1,
          relationshipToNominee1: nicheAgreement.ben1_NomineeRelationship,
          relationshipToNominee2: nicheAgreement.ben1_Nominee2Relationship,
          status: 'Occupied', // Based on the UI showing "Occupied" status
          sex: nicheAgreement.beneIsMale_1 ? 'Male' : 'Female'
        });
      }
      if (nicheAgreement.beneName_2) {
        agreementData.beneficiaries.push({
          name: nicheAgreement.beneName_2,
          idNo: nicheAgreement.beneIDNo_2,
          isCatholic: nicheAgreement.beneIsCatholic_2,
          isMale: nicheAgreement.beneIsMale_2,
          relationshipToApplicant: nicheAgreement.beneRelationshipToApplicant_2,
          dateOfBirth: formatDate(nicheAgreement.beneDateOfBirth_2),
          birthYear: nicheAgreement.beneBirthYear_2,
          relationshipToNominee1: nicheAgreement.ben2_NomineeRelationship,
          relationshipToNominee2: nicheAgreement.ben2_Nominee2Relationship,
          status: 'Occupied', // Based on the UI showing "Occupied" status
          sex: nicheAgreement.beneIsMale_2 ? 'Male' : 'Female'
        });
      }

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
