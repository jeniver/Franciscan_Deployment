const EngraveApplicationRepository = require('../repositories/EngraveApplicationRepository');
const NicheApplicationRepository = require('../repositories/NicheApplicationRepository');
const NicheBookingRepository = require('../repositories/NicheBookingRepository');
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
   * Helper to find fallback inscription items if mapping fails
   */
  async _getFallbackInscriptionItems(churchId) {
    try {
      const query = `
        SELECT TOP 1 ItemId, Name, Code, Price
        FROM Item WITH(NOLOCK)
        WHERE ChurchId = @churchId
          AND (DocType = 'INCR' OR Code LIKE 'INSC%' OR Name LIKE '%Inscription%')
        ORDER BY CASE WHEN DocType = 'INCR' THEN 0 ELSE 1 END, ItemId
      `;
      const result = await executeQuery(query, { churchId });
      return result.recordset || [];
    } catch (e) {
      logger.warn('Failed to fetch fallback inscription items:', e.message);
      return [];
    }
  }

  /**
   * Check if inscription (INCR) can create invoice or receipt.
   * Returns { allowed: true } or { allowed: false, error: { code, message } }.
   * @param {string} incrCode - INCR/inscription code (e.g. I-1617-0)
   * @returns {Promise<{ allowed: boolean, error?: { code: string, message: string } }>}
   */
  async canInscriptionCreateInvoiceOrReceipt(incrCode) {
    const nicheAppStatus = await this._getNicheApplicationStatusForInscription(incrCode);
    if (!nicheAppStatus) {
      return {
        allowed: false,
        error: {
          code: 'NICHE_APPLICATION_NOT_BOOKED',
          message: 'Inscription must be linked to a booked niche application. The niche application is not found or not yet booked.'
        }
      };
    }
    const allowedStatuses = [3, 4]; // 3=Booked, 4=Completed
    if (!allowedStatuses.includes(Number(nicheAppStatus.status))) {
      const statusLabel = nicheAppStatus.status === 1 ? 'Draft' : nicheAppStatus.status === 2 ? 'Pending' : 'Unknown';
      return {
        allowed: false,
        error: {
          code: 'NICHE_APPLICATION_NOT_BOOKED',
          message: `Niche application must be Booked before creating inscription invoice or receipt. Current status: ${statusLabel}.`
        }
      };
    }
    return { allowed: true };
  }

  /**
   * Get the linked NicheApplication status for an inscription (INCR) code.
   * Inscription is linked via: NicheInscriptionRequest -> NicheBooking -> NicheApplication.
   * @param {string} incrCode - INCR/inscription code (e.g. I-1617-0)
   * @returns {Promise<{ status: number, code: string }|null>} NicheApplication status (1=Draft, 2=Pending, 3=Booked, 4=Completed) and code, or null if not found
   */
  async _getNicheApplicationStatusForInscription(incrCode) {
    if (!incrCode) return null;
    const normalizedCode = String(incrCode).trim();
    try {
      const query = `
        SELECT TOP 1 na.Status AS status, na.Code AS code
        FROM NicheInscriptionRequest nir WITH (NOLOCK)
        INNER JOIN NicheBooking nb WITH (NOLOCK) ON nir.NicheBookingId = nb.NicheBookingId
        INNER JOIN NicheApplication na WITH (NOLOCK) ON nb.NicheApplicationId = na.NicheApplicationId
        WHERE nir.Code = @incrCode
      `;
      const result = await executeQuery(query, { incrCode: normalizedCode });
      if (result.recordset && result.recordset.length > 0) {
        const row = result.recordset[0];
        return { status: row.status, code: row.code };
      }
      return null;
    } catch (e) {
      logger.warn('Failed to get NicheApplication status for inscription:', e.message);
      return null;
    }
  }

  /**
   * Resolve an inscription application (NicheInscriptionRequest) by code.
   *
   * @param {string} code
   * @returns {Promise<Object|null>} EngraveApplication or null
   */
  async _resolveApplicationByCode(code) {
    if (!code) return null;

    // 1) Try direct INCR code via repository
    let application = await this.engraveRepo.getByCode(code);
    if (application) {
      return application;
    }

    // 2) Try follow the chain: NicheApplication -> NicheBooking -> NicheInscriptionRequest
    const chainQuery = `
      SELECT TOP 1 nir.Code 
      FROM NicheInscriptionRequest nir WITH (NOLOCK)
      INNER JOIN NicheBooking nb WITH (NOLOCK) ON nir.NicheBookingId = nb.NicheBookingId
      INNER JOIN NicheApplication na WITH (NOLOCK) ON nb.NicheApplicationId = na.NicheApplicationId
      WHERE na.Code = @code
      ORDER BY nir.NicheInscriptionRequestId DESC
    `;

    try {
      const result = await executeQuery(chainQuery, { code });
      if (result.recordset && result.recordset.length > 0) {
        return await this.engraveRepo.getByCode(result.recordset[0].Code);
      }
    } catch (e) {
      // ignore query error
    }

    return null;
  }

  /**
   * Parse address components from address fields
   */
  _parseAddress(addressNo, addressLine1, addressLine2, addressCity) {
    const parsed = {
      block: addressNo || '',
      blockNo: addressLine1 || '',
      street: '',
      streetName: '',
      unitNo: addressLine2 || '',
      postalCode: ''
    };

    if (addressCity) {
      const postalMatch = addressCity.match(/(\d{6})/);
      if (postalMatch) {
        parsed.postalCode = postalMatch[1];
        const streetPart = addressCity.replace(postalMatch[1], '').trim();
        parsed.street = streetPart;
        parsed.streetName = streetPart;
      } else {
        parsed.street = addressCity;
        parsed.streetName = addressCity;
      }
    }

    return parsed;
  }

  _extractBlockNumber(address) {
    if (!address) return '';
    const match = address.match(/(?:No\.?|Number|Blk|Block)\s*(\d+)/i);
    return match ? match[1] : '';
  }

  _extractPostalCode(address) {
    if (!address) return '';
    const match = address.match(/(\d{6})/);
    return match ? match[1] : '';
  }

  _formatDate(dateString) {
    if (!dateString) return '';
    try {
      let date = dateString instanceof Date ? dateString : new Date(dateString);
      if (isNaN(date.getTime())) return String(dateString);

      const day = String(date.getDate()).padStart(2, '0');
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${day}-${months[date.getMonth()]}-${date.getFullYear()}`;
    } catch (error) {
      return String(dateString);
    }
  }

  _formatDateForApi(dateString) {
    if (!dateString) return '';
    try {
      const date = dateString instanceof Date ? dateString : new Date(dateString);
      if (isNaN(date.getTime())) return '';
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    } catch (error) {
      return '';
    }
  }

  _normalizeNicheApplicationCode(code) {
    return (code || '').trim().replace(/^I-/i, '');
  }

  /**
   * Get beneficiary details for a niche application
   */
  async _getBeneficiariesForNicheApplication(nicheApplicationId) {
    try {
      const beneficiaryQuery = `
        SELECT 
          Name, RelationshipToApplicant, DateOfBirth, BirthYear, IDNo,
          IsCatholic, IsMale, RelationshipToNominee1, RelationshipToNominee2
        FROM NicheApplicationBeneficiary WITH (NOLOCK)
        WHERE NicheApplicationId = @nicheApplicationId
        ORDER BY NicheApplicationBeneficiaryId
      `;

      const result = await executeQuery(beneficiaryQuery, { nicheApplicationId });

      if (!result.recordset) return [];

      return result.recordset.map(b => ({
        name: b.Name || '',
        dateOfBirth: this._formatDate(b.DateOfBirth),
        birthYear: b.BirthYear || '',
        idNo: b.IDNo || '',
        isCatholic: Boolean(b.IsCatholic),
        isMale: Boolean(b.IsMale),
        relationshipToApplicant: b.RelationshipToApplicant || '',
        relationshipToNominee1: b.RelationshipToNominee1 || '',
        relationshipToNominee2: b.RelationshipToNominee2 || ''
      }));
    } catch (error) {
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

    let application = await this._resolveApplicationByCode(applicationCode);

    // If not found and it's a niche application code, try auto-resolving
    if (!application) {
      let candidateCode = applicationCode;

      if (candidateCode.startsWith('I-')) {
        candidateCode = candidateCode.replace(/^I-/, '');
      }

      const isNicheAppCode = /^\d+-\d+$/.test(candidateCode) || /^\d+$/.test(candidateCode) || candidateCode.startsWith('NAPP-');

      if (isNicheAppCode) {
        try {
          const nicheApp = await NicheApplicationRepository.getByCode(candidateCode);

          if (!nicheApp) {
            const err = new Error(`Niche application not found: ${applicationCode}`);
            err.code = 'NOT_FOUND';
            throw err;
          }

          if (nicheApp.churchId !== churchId) {
            const err = new Error('Access denied - Church ID mismatch');
            err.code = 'ACCESS_DENIED';
            throw err;
          }

          const inscriptionCodePattern = `I-${candidateCode}`;

          // Try to find by direct code pattern
          const { executeQuery } = require('../config/database');
          const directCodeQuery = `
            SELECT TOP 1 Code
            FROM NicheInscriptionRequest WITH (NOLOCK)
            WHERE Code = @inscriptionCode AND ChurchId = @churchId
            ORDER BY NicheInscriptionRequestId DESC
          `;
          const directCodeResult = await executeQuery(directCodeQuery, {
            inscriptionCode: inscriptionCodePattern,
            churchId
          });

          if (directCodeResult.recordset && directCodeResult.recordset.length > 0) {
            application = await this.engraveRepo.getByCode(directCodeResult.recordset[0].Code);
          }

          // Try through internal links if still not found
          if (!application) {
            const chainQuery = `
              SELECT TOP 1 nir.Code
              FROM NicheInscriptionRequest nir WITH (NOLOCK)
              INNER JOIN NicheBooking nb WITH (NOLOCK) ON nir.NicheBookingId = nb.NicheBookingId
              INNER JOIN NicheApplication na WITH (NOLOCK) ON nb.NicheApplicationId = na.NicheApplicationId
              WHERE na.Code = @code AND nir.ChurchId = @churchId
              ORDER BY nir.NicheInscriptionRequestId DESC
            `;
            const chainResult = await executeQuery(chainQuery, { code: candidateCode, churchId });

            if (chainResult.recordset && chainResult.recordset.length > 0) {
              application = await this.engraveRepo.getByCode(chainResult.recordset[0].Code);
            }
          }

          // Fallback: return applicant details from niche application
          if (!application) {
            const addressComponents = this._parseAddress(
              nicheApp.applicantAddressNo,
              nicheApp.applicantAddressLine1,
              nicheApp.applicantAddressLine2,
              nicheApp.applicantAddressCity
            );

            const processedAddressComponents = {
              block: addressComponents.block || nicheApp.applicantAddressNo || '',
              blockNo: addressComponents.blockNo || this._extractBlockNumber(nicheApp.applicantAddressNo),
              street: addressComponents.street || nicheApp.applicantAddressLine1 || '',
              streetName: addressComponents.streetName || nicheApp.applicantAddressLine1 || '',
              unitNo: addressComponents.unitNo || nicheApp.applicantAddressLine2 || '',
              postalCode: addressComponents.postalCode || this._extractPostalCode(nicheApp.applicantAddressCity) || nicheApp.applicantAddressState || ''
            };

            let items = await this.taskItemMappingRepo.getItemsForTask(
              this.INSCRIPTION_TASK_ID,
              [{ name: '_ForInscription', value: '1' }, { name: '_ForUrn', value: '0' }],
              churchId
            );

            // Filter out Urn (Marble)
            let filteredItems = (items || []);

            // Dynamic inscription item selection based on deceased count (empty for niche app fallback)
            // Default to 1st Name (12) if no deceased details yet
            const targetItemId = 12;

            const hasTargetItem = filteredItems.some(item => item.ItemId === targetItemId);
            if (!hasTargetItem) {
              const ItemRepository = require('../repositories/ItemRepository');
              const itemRepo = new ItemRepository();
              const targetItem = await itemRepo.getItemById(targetItemId, churchId);
              if (targetItem) {
                filteredItems = filteredItems.filter(item => item.ItemId !== 12 && item.ItemId !== 14);
                filteredItems.push(targetItem);
              }
            }

            // Fallback: if no mapped items, try to find any inscription item
            if (filteredItems.length === 0) {
              filteredItems = await this._getFallbackInscriptionItems(churchId);
            }

            let beneficiaries = [];
            try {
              beneficiaries = await this._getBeneficiariesForNicheApplication(nicheApp.nicheApplicationId);
            } catch (e) {
              beneficiaries = [];
            }

            return {
              inscriptionRequestNo: null,
              inscriptionCode: null,
              applicationCode: this._normalizeNicheApplicationCode(candidateCode),
              nicheApplicationCode: this._normalizeNicheApplicationCode(candidateCode),
              items: filteredItems,
              applicant: {
                name: nicheApp.applicantName || '',
                nricPassportNo: nicheApp.applicantIDNo || '',
                address: processedAddressComponents,
                mobile: nicheApp.applicantMobileNo || '',
                homeTel: nicheApp.applicantHomeTelNo || '',
                emailId: nicheApp.applicantEmailID || ''
              },
              deceasedDetails: [],
              beneficiaries: beneficiaries,
              additionalDetails: {
                status: 'Draft',
                urgent: false,
                bibleInscriptionChoiceId: null,
                additionalInscriptionPhrase: null,
                remarks: nicheApp.remarks || '',
                nicheApplicationCode: candidateCode,
                nicheBookingId: null
              }
            };
          }
        } catch (error) {
          if (error.code === 'NOT_FOUND' || error.code === 'ACCESS_DENIED') throw error;
          logger.error('Error auto-resolving inscription:', error);
        }
      }
    }

    if (!application) {
      throw new Error(`Inscription not found for code: ${applicationCode}`);
    }

    // Process found application
    const items = await this.taskItemMappingRepo.getItemsForTask(
      this.INSCRIPTION_TASK_ID,
      [{ name: '_ForInscription', value: '1' }, { name: '_ForUrn', value: '0' }],
      churchId
    );

    let filteredItems = (items || []);

    // Dynamic inscription item selection based on deceased count
    const deceasedCount = (application.deceasedDetails || []).length;
    const targetItemId = deceasedCount >= 2 ? 14 : 12; // 14: Both Name, 12: 1st Name

    // Ensure the correct inscription item is present
    const hasTargetItem = filteredItems.some(item => item.ItemId === targetItemId);

    if (!hasTargetItem) {
      const ItemRepository = require('../repositories/ItemRepository');
      const itemRepo = new ItemRepository();
      const targetItem = await itemRepo.getItemById(targetItemId, churchId);

      if (targetItem) {
        // Remove existing primary inscription items to avoid duplicates
        filteredItems = filteredItems.filter(item => item.ItemId !== 12 && item.ItemId !== 14);
        filteredItems.push(targetItem);
      }
    }

    // Fallback: if no mapped items, try to find any inscription item
    if (filteredItems.length === 0) {
      filteredItems = await this._getFallbackInscriptionItems(churchId);
    }

    const addressComponents = this._parseAddress(
      application.applicantAddressNo,
      application.applicantAddressLine1,
      application.applicantAddressLine2,
      application.applicantAddressCity
    );

    const processedAddressComponents = {
      block: addressComponents.block || application.applicantAddressNo || '',
      blockNo: addressComponents.blockNo || this._extractBlockNumber(application.applicantAddressNo),
      street: addressComponents.street || application.applicantAddressLine1 || '',
      streetName: addressComponents.streetName || application.applicantAddressLine1 || '',
      unitNo: addressComponents.unitNo || application.applicantAddressLine2 || '',
      postalCode: addressComponents.postalCode || this._extractPostalCode(application.applicantAddressCity) || application.applicantAddressState || ''
    };

    let beneficiaries = [];
    // Primary: resolve via nicheBookingId when available
    if (application.nicheBookingId) {
      try {
        const nicheBooking = await NicheBookingRepository.getById(application.nicheBookingId);
        if (nicheBooking && nicheBooking.nicheApplicationId) {
          beneficiaries = await this._getBeneficiariesForNicheApplication(nicheBooking.nicheApplicationId);
        }
      } catch (e) {
        // ignore beneficiary error
      }
    }

    // Fallback: when beneficiaries empty, resolve via nicheApplicationCode or inscription code chain
    // This fixes the Select Beneficiary dropdown not showing after inscription is created
    if (beneficiaries.length === 0) {
      let nicheApplicationId = null;
      const nicheCode = this._normalizeNicheApplicationCode(application.nicheApplicationCode || application.code || '');

      if (nicheCode) {
        try {
          const nicheApp = await NicheApplicationRepository.getByCode(nicheCode);
          if (nicheApp && nicheApp.nicheApplicationId) {
            nicheApplicationId = nicheApp.nicheApplicationId;
          }
        } catch (e) {
          // ignore
        }
      }

      if (!nicheApplicationId && application.code) {
        try {
          const chainQuery = `
            SELECT TOP 1 nb.NicheApplicationId
            FROM NicheInscriptionRequest nir WITH (NOLOCK)
            INNER JOIN NicheBooking nb WITH (NOLOCK) ON nir.NicheBookingId = nb.NicheBookingId
            WHERE nir.Code = @code
          `;
          const chainResult = await executeQuery(chainQuery, { code: application.code });
          if (chainResult.recordset && chainResult.recordset.length > 0) {
            nicheApplicationId = chainResult.recordset[0].NicheApplicationId;
          }
        } catch (e) {
          // ignore
        }
      }

      if (nicheApplicationId) {
        try {
          beneficiaries = await this._getBeneficiariesForNicheApplication(nicheApplicationId);
        } catch (e) {
          // ignore
        }
      }
    }

    const crossTypeOptions = ['Crucifix', 'WoodenCross', 'NoCrucifix/Cross'];
    const resolvedCrossType =
      crossTypeOptions.find(option =>
        option === application.crossType
        || option === application.remarks
        || option === application.additionalInscriptionPhrase
        || option === application.bibleInscriptionText
      ) || 'Crucifix';

    const rawPhrase = application.additionalInscriptionPhrase || application.bibleInscriptionText || application.remarks || '';
    const inscriptionPhrase = crossTypeOptions.includes(rawPhrase) ? '' : rawPhrase;
    const normalizedNicheApplicationCode = this._normalizeNicheApplicationCode(
      application.nicheApplicationCode || application.code
    );

    return {
      inscriptionRequestNo: application.code,
      inscriptionCode: application.code,
      applicationCode: normalizedNicheApplicationCode,
      nicheApplicationCode: normalizedNicheApplicationCode,
      items: filteredItems,
      applicant: {
        name: application.applicantName || '',
        nricPassportNo: application.applicantIDNo || '',
        address: processedAddressComponents,
        mobile: application.applicantMobileNo || '',
        homeTel: application.applicantHomeTelNo || '',
        emailId: application.applicantEmailID || ''
      },
      deceasedDetails: (application.deceasedDetails || []).map(detail => ({
        name: detail.name || '',
        dateOfDeath: this._formatDateForApi(detail.dateOfDeath) || '',
        dateOfBirth: this._formatDateForApi(detail.dateOfBirth) || '',
        internmentDate: this._formatDateForApi(detail.internmentDate) || '',
        deathCertificateNo: detail.deathCertificateNo || '',
        birthYear: detail.birthYear || '',
        inscriptionText: detail.inscriptionText || ''
      })),
      beneficiaries: beneficiaries,
      additionalDetails: {
        status: 'Confirmed',
        urgent: false,
        bibleInscriptionChoiceId: application.bibleInscriptionChoiceId,
        bibleInscriptionText: inscriptionPhrase,
        additionalInscriptionPhrase: inscriptionPhrase,
        remarks: application.remarks || '',
        crossType: resolvedCrossType,
        nicheApplicationCode: normalizedNicheApplicationCode,
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

      // Restrict: Niche application must be Booked (3) or Completed (4) before creating inscription invoice
      const canCreate = await this.canInscriptionCreateInvoiceOrReceipt(application.code);
      if (!canCreate.allowed) {
        return { success: false, error: canCreate.error };
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


