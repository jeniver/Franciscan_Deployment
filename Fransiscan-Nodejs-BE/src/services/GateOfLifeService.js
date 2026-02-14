const GateOfLifeRepository = require('../repositories/GateOfLifeRepository');
const GateOfLifeApplication = require('../models/GateOfLifeApplication');
const logger = require('../utils/logger');
const NodeCache = require('node-cache');

// Cache for search results (TTL: 5 minutes, cleanup every 10 minutes)
const searchCache = new NodeCache({ stdTTL: 300, checkperiod: 600 });

const parseDateValue = (value) => {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

class GateOfLifeService {
  async searchApplications(query = {}, churchId) {
    const page = Math.max(parseInt(query.page, 10) || 1, 1);
    const pageSize = Math.min(Math.max(parseInt(query.pageSize, 10) || 20, 1), 100);

    const filters = {
      applicationCode: query.applicationCode || query.code || null,
      applicantName: query.applicantName || null,
      applicantIdNo: query.applicantIdNo || query.applicantIDNo || null,
      nameToEngrave: query.nameToEngrave || query.engraveName || null,
      bookedFrom: parseDateValue(query.bookedFrom || query.fromDate || null),
      bookedTo: parseDateValue(query.bookedTo || query.toDate || null),
      searchTerm: query.search || query.searchTerm || query.q || null
    };

    // Generate a unique cache key based on churchId and query parameters
    const cacheKey = `search_${churchId}_${JSON.stringify(query)}`;
    const cachedResult = searchCache.get(cacheKey);

    if (cachedResult) {
      logger.debug('Returning cached search results for Gates of Life');
      return {
        success: true,
        data: cachedResult.records,
        pagination: cachedResult.pagination,
        filters,
        fromCache: true
      };
    }

    const repositoryResult = await GateOfLifeRepository.searchApplications({
      churchId,
      page,
      pageSize,
      filters
    });

    const responseData = {
      success: true,
      data: repositoryResult.records.map(record => record.toJSON()),
      pagination: {
        page,
        pageSize,
        total: repositoryResult.total,
        totalPages: repositoryResult.total
          ? Math.ceil(repositoryResult.total / pageSize)
          : 0
      },
      filters
    };

    // Cache the successful result
    searchCache.set(cacheKey, {
      records: responseData.data,
      pagination: responseData.pagination
    });

    return responseData;
  }

  async getApplication(code, churchId) {
    const application = await GateOfLifeRepository.getByCode(code, churchId);
    if (!application) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Gate of Life application not found'
        }
      };
    }

    return {
      success: true,
      data: application.toJSON()
    };
  }

  async createApplication(body, userId, churchId) {
    try {
      const normalizedDetails = this._normalizeDetailsInput(body);
      const application = new GateOfLifeApplication({
        ...body,
        details: normalizedDetails,
        churchId,
        userId,
        bookingDate: body.bookingDate || body.BookingDate || new Date()
      });

      application.ensureDefaultDetail();
      const validation = application.validate();

      if (!validation.isValid) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_FAILED',
            message: validation.errors.join(', '),
            details: validation.errors
          }
        };
      }

      const saved = await GateOfLifeRepository.create(application);

      // Invalidate search cache when a new application is created
      this.clearSearchCache();

      return {
        success: true,
        data: saved.toJSON(),
        message: 'Gate of Life application created successfully'
      };
    } catch (error) {
      logger.error('GateOfLifeService: Failed to create application', error);
      throw error;
    }
  }

  async updateApplication(code, body, churchId) {
    try {
      const existing = await GateOfLifeRepository.getByCode(code, churchId);
      if (!existing) {
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Gate of Life application not found'
          }
        };
      }

      const normalizedDetails = this._normalizeDetailsInput(body);
      const fallbackDetails = existing.details?.map(detail => detail.toJSON ? detail.toJSON() : detail) || [];
      const merged = new GateOfLifeApplication({
        ...existing,
        ...body,
        code: existing.code,
        details: normalizedDetails.length ? normalizedDetails : fallbackDetails,
        applicationId: existing.applicationId,
        churchId,
        userId: body.userId || existing.userId,
        bookingDate: body.bookingDate || body.BookingDate || existing.bookingDate
      });

      merged.ensureDefaultDetail();
      const validation = merged.validate();
      if (!validation.isValid) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_FAILED',
            message: validation.errors.join(', '),
            details: validation.errors
          }
        };
      }

      const updated = await GateOfLifeRepository.update(merged);
      if (!updated) {
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Gate of Life application not found for update'
          }
        };
      }

      // Invalidate search cache on update
      this.clearSearchCache();

      return {
        success: true,
        data: updated.toJSON(),
        message: 'Gate of Life application updated successfully'
      };
    } catch (error) {
      logger.error('GateOfLifeService: Failed to update application', error);
      throw error;
    }
  }

  async deleteApplication(code, churchId) {
    try {
      const deleted = await GateOfLifeRepository.delete(code, churchId);
      if (!deleted) {
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Gate of Life application not found'
          }
        };
      }

      // Invalidate search cache on delete
      this.clearSearchCache();

      return {
        success: true,
        message: 'Gate of Life application deleted successfully'
      };
    } catch (error) {
      logger.error('GateOfLifeService: Failed to delete application', error);
      throw error;
    }
  }

  async getInvoicePdfData(code, churchId) {
    try {
      if (!code || !code.trim()) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_FAILED',
            message: 'Application code is required'
          }
        };
      }

      const invoicePayload = await GateOfLifeRepository.getInvoiceDetails(code.trim(), churchId);

      if (!invoicePayload) {
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Gate of Life application not found or inaccessible'
          }
        };
      }

      const {
        application,
        details = [],
        invoice = null,
        receipt = null,
        miscReceipt = null
      } = invoicePayload;

      const normalizeNumber = (value) => {
        if (value === null || value === undefined) {
          return 0;
        }
        const numeric = Number(value);
        return Number.isNaN(numeric) ? 0 : numeric;
      };

      const engravingEntries = details
        .map(detail => ({
          name: detail.NameToEngrave || detail.nameToEngrave || null,
          remarks: detail.Remarks || detail.remarks || null,
          dateOfBirth: detail.DateOfBirth || detail.dateOfBirth || null,
          dateOfDeath: detail.DateOfDeath || detail.dateOfDeath || null,
          additionalInfo: detail.AdditionalInfo || detail.additionalInfo || null
        }))
        .filter(entry => entry.name);

      const addressParts = [
        application.ApplicantAddressNo,
        application.ApplicantAddressLine1,
        application.ApplicantAddressLine2,
        application.ApplicantAddressCity,
        application.ApplicantAddressState,
        application.ApplicantAddressCountry
      ].filter(part => part && String(part).trim() !== '');

      const subtotal = normalizeNumber(
        application.DonationAmount
        ?? application.DefaultDonationAmount
        ?? invoice?.LineTotalAmount
        ?? invoice?.InvoiceTotalAmount
      );

      const taxAmount = normalizeNumber(invoice?.LineTaxAmount || invoice?.TaxAmount);
      const totalAmount = normalizeNumber(
        invoice?.InvoiceTotalAmount
        ?? (normalizeNumber(invoice?.LineTotalAmount) + taxAmount)
        ?? (subtotal + taxAmount)
      );
      const paidAmount = normalizeNumber(
        miscReceipt?.TotalPayingAmount
        ?? receipt?.TotalAmount
        ?? receipt?.PayingAmount
        ?? 0
      );
      const balanceDue = Number((totalAmount - paidAmount).toFixed(2));

      const paymentModeMap = {
        1: 'Cash',
        2: 'Credit Card',
        3: 'Cheque',
        4: 'Bank Transfer'
      };

      const paymentModeValue = receipt?.PaymentMode ?? invoice?.PaymentMode ?? null;
      const paymentModeLabel = paymentModeValue ? (paymentModeMap[paymentModeValue] || `Mode ${paymentModeValue}`) : null;

      const pdfData = {
        type: 'invoice',
        documentTitle: 'Gate of Life Application',
        generatedAt: new Date().toISOString(),
        application: {
          code: application.Code,
          bookingDate: application.BookingDate,
          status: invoice?.InvoiceStatus ?? null,
          donationAmount: normalizeNumber(application.DonationAmount),
          defaultDonationAmount: normalizeNumber(application.DefaultDonationAmount),
          requestSameBrick: !!application.RequestSameBrick,
          namesToEngrave: engravingEntries.map(entry => entry.name)
        },
        applicant: {
          name: application.ApplicantName,
          idNo: application.ApplicantIDNo,
          email: application.ApplicantEmailID,
          mobileNo: application.ApplicantMobileNo,
          homeTelNo: application.ApplicantHomeTelNo,
          officeTelNo: application.ApplicantOfficeTelNo,
          address: addressParts.join(', '),
          addressDetails: {
            no: application.ApplicantAddressNo,
            line1: application.ApplicantAddressLine1,
            line2: application.ApplicantAddressLine2,
            city: application.ApplicantAddressCity,
            state: application.ApplicantAddressState,
            country: application.ApplicantAddressCountry
          }
        },
        engraving: {
          entries: engravingEntries
        },
        invoice: invoice ? {
          invoiceNo: invoice.InvoiceNo,
          invoiceDate: invoice.InvoiceDate,
          paymentModeDocNo: invoice.PaymentModeDocNo,
          paymentMode: invoice.PaymentMode ?? null,
          invoiceTotalAmount: normalizeNumber(invoice.InvoiceTotalAmount),
          invoicePayingAmount: normalizeNumber(invoice.InvoicePayingAmount),
          lineTotalAmount: normalizeNumber(invoice.LineTotalAmount),
          taxAmount,
          refDocNumber: invoice.RefDocNumber
        } : null,
        receipt: receipt
          ? {
            receiptNo: receipt.ReceiptNo,
            receiptDate: receipt.ReceiptDate,
            totalAmount: normalizeNumber(receipt.TotalAmount),
            payingAmount: normalizeNumber(receipt.PayingAmount),
            paymentMode: paymentModeValue,
            paymentModeLabel,
            paymentModeDocNo: receipt.PaymentModeDocNo || invoice?.PaymentModeDocNo || null
          }
          : null,
        payment: {
          subtotal,
          taxAmount,
          totalAmount,
          paidAmount,
          balanceDue,
          isPaid: balanceDue <= 0
        },
        metadata: {
          churchId: application.ChurchId,
          hasInvoice: !!invoice,
          hasReceipt: !!receipt || normalizeNumber(miscReceipt?.TotalPayingAmount) > 0,
          detailCount: engravingEntries.length
        }
      };

      return {
        success: true,
        data: pdfData,
        message: 'Gate of Life application data retrieved successfully'
      };
    } catch (error) {
      logger.error('GateOfLifeService: Failed to build invoice PDF data', error);
      throw error;
    }
  }

  _normalizeDetailsInput(body = {}) {
    const candidate =
      body.details
      || body.EngraveWallApplicationDetailList
      || body.engravings
      || body.namesToEngrave
      || body.engraveNames
      || body.names
      || [];

    if (Array.isArray(candidate)) {
      return candidate
        .map(item => {
          if (typeof item === 'string') return { nameToEngrave: item };
          return {
            nameToEngrave: item.nameToEngrave || item.NameToEngrave || item.name || null,
            remarks: item.remarks || item.Remarks || item.relationship || null,
            dateOfBirth: item.dateOfBirth || item.DateOfBirth || null,
            dateOfDeath: item.dateOfDeath || item.DateOfDeath || null,
            additionalInfo: item.additionalInfo || item.AdditionalInfo || null,
            detailId: item.detailId || item.EngraveWallApplicationDetailId || null
          };
        })
        .filter(detail => detail && detail.nameToEngrave);
    }

    if (typeof candidate === 'string') {
      return candidate
        .split(',')
        .map(name => name.trim())
        .filter(Boolean)
        .map(name => ({ nameToEngrave: name }));
    }

    return [];
  }

  /**
   * Clear the search cache (call after create/update/delete)
   */
  clearSearchCache() {
    const keys = searchCache.keys();
    if (keys.length > 0) {
      searchCache.flushAll();
      logger.info(`Cleared ${keys.length} entries from Gates of Life search cache`);
    }
  }
}

module.exports = new GateOfLifeService();


