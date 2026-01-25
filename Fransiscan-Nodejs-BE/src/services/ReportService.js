const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs').promises;
const logger = require('../utils/logger');
const reportRepository = require('../repositories/ReportRepository');
const { cache } = require('../utils/cache');

/**
 * Report Service
 * Handles all report generation including PDF creation
 */
class ReportService {
  constructor() {
    this.pdfOutputDir = path.join(process.cwd(), 'public', 'pdfs', 'reports');
    this.templateDir = path.join(process.cwd(), 'src', 'templates');
    this.cacheEnabled = process.env.REPORT_CACHE_ENABLED !== 'false';
    this.cacheTTL = parseInt(process.env.REPORT_CACHE_TTL) || 3600; // 1 hour default
  }

  getCachedPayload(cacheKey) {
    if (!this.cacheEnabled || !cacheKey) {
      return null;
    }

    const cached = cache.get(cacheKey);
    if (!cached) {
      return null;
    }

    return {
      ...cached,
      meta: {
        ...cached.meta,
        cached: true,
        cacheKey
      }
    };
  }

  cachePayload(cacheKey, payload) {
    if (!this.cacheEnabled || !cacheKey || !payload) {
      return;
    }

    cache.set(cacheKey, payload, this.cacheTTL);
  }

  /**
   * Ensure PDF output directory exists
   */
  async ensureOutputDirectory() {
    try {
      await fs.access(this.pdfOutputDir);
    } catch (error) {
      await fs.mkdir(this.pdfOutputDir, { recursive: true });
      logger.info('Created report PDF output directory:', this.pdfOutputDir);
    }
  }

  /**
   * Generate PDF from HTML using Puppeteer
   * @param {string} html - HTML content
   * @param {Object} options - PDF options
   * @returns {Promise<Buffer>} PDF buffer
   */
  async generatePdfFromHtml(html, options = {}) {
    let browser;
    let page;
    
    // Validate HTML input
    if (!html || typeof html !== 'string') {
      throw new Error('Invalid HTML content provided for PDF generation');
    }

    try {
      logger.info('Launching Puppeteer browser for PDF generation...');
      
      browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu'
        ],
        timeout: 60000 // 60 second timeout for browser launch
      });

      logger.info('Creating new page...');
      page = await browser.newPage();
      
      // Set a reasonable timeout for page operations
      page.setDefaultTimeout(60000);
      
      logger.info('Setting HTML content...', { htmlLength: html.length });
      
      // Use 'load' instead of 'networkidle0' for better reliability with static HTML
      await page.setContent(html, { 
        waitUntil: 'load', // Changed from 'networkidle0' - more reliable for static HTML
        timeout: 60000
      });

      // Verify page loaded successfully
      const pageTitle = await page.title().catch(() => '');
      logger.info('Page loaded successfully', { pageTitle });

      // Wait for fonts to load (helps with rendering)
      try {
        await page.evaluate(() => document.fonts.ready);
      } catch (fontError) {
        logger.warn('Font loading check failed, continuing:', fontError.message);
      }

      // Wait a bit for any dynamic content to render (using Promise-based delay)
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Verify page is still valid before generating PDF
      if (page.isClosed()) {
        throw new Error('Page was closed before PDF generation');
      }

      logger.info('Generating PDF...');
      
      // Remove invalid 'timeout' option from page.pdf() - it doesn't support it
      // Also ensure we're explicitly waiting for the PDF generation to complete
      let pdfBuffer;
      try {
        pdfBuffer = await Promise.resolve(page.pdf({
          format: options.format || 'A4',
          printBackground: true,
          margin: options.margin || {
            top: '20mm',
            right: '15mm',
            bottom: '20mm',
            left: '15mm'
          }
          // Note: timeout option removed - Puppeteer doesn't support it in page.pdf()
        }));
      } catch (pdfError) {
        logger.error('Error calling page.pdf():', {
          error: pdfError.message,
          stack: pdfError.stack,
          name: pdfError.name
        });
        throw pdfError;
      }

      logger.info('PDF generated, validating buffer...', { 
        hasBuffer: !!pdfBuffer,
        isBuffer: Buffer.isBuffer(pdfBuffer),
        bufferType: typeof pdfBuffer,
        bufferLength: pdfBuffer ? pdfBuffer.length : 0
      });

      // Validate PDF buffer
      if (!pdfBuffer) {
        logger.error('PDF buffer is null or undefined');
        throw new Error('Puppeteer returned null or undefined instead of PDF buffer');
      }

      if (!Buffer.isBuffer(pdfBuffer)) {
        logger.error('PDF buffer is not a Buffer', {
          type: typeof pdfBuffer,
          constructor: pdfBuffer?.constructor?.name,
          value: pdfBuffer
        });
        throw new Error(`Invalid PDF buffer type: expected Buffer, got ${typeof pdfBuffer}`);
      }

      if (pdfBuffer.length === 0) {
        logger.error('PDF buffer is empty');
        throw new Error('Empty PDF buffer returned from Puppeteer');
      }

      // Validate PDF magic bytes
      const pdfHeader = pdfBuffer.slice(0, 4).toString('ascii');
      if (pdfHeader !== '%PDF') {
        logger.error('Invalid PDF format generated', {
          header: pdfHeader,
          bufferLength: pdfBuffer.length,
          firstBytes: pdfBuffer.slice(0, 20).toString('hex'),
          firstBytesAscii: pdfBuffer.slice(0, 50).toString('ascii')
        });
        throw new Error('Invalid PDF format: PDF header not found');
      }

      logger.info(`PDF generated successfully: ${pdfBuffer.length} bytes`);
      return pdfBuffer;
    } catch (error) {
      logger.error('Error generating PDF from HTML:', {
        error: error.message,
        stack: error.stack,
        name: error.name
      });
      
      // Provide more detailed error messages
      if (error.message.includes('Navigation timeout') || error.message.includes('Timeout')) {
        throw new Error(`PDF generation timed out: ${error.message}`);
      } else if (error.message.includes('Target closed')) {
        throw new Error(`Browser closed unexpectedly during PDF generation: ${error.message}`);
      } else if (error.message.includes('Protocol error')) {
        throw new Error(`Puppeteer protocol error: ${error.message}`);
      }
      
      throw new Error(`Failed to generate PDF: ${error.message}`);
    } finally {
      if (page) {
        try {
          await page.close();
        } catch (closeError) {
          logger.warn('Error closing page:', closeError);
        }
      }
      
      if (browser) {
        try {
          await browser.close();
        } catch (closeError) {
          logger.warn('Error closing browser:', closeError);
        }
      }
    }
  }

  /**
   * Format currency
   */
  formatCurrency(value) {
    const amount = Number(value) || 0;
    return amount.toLocaleString('en-SG', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  /**
   * Format date
   */
  formatDate(value, format = 'short') {
    if (!value) return '-';
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);

    if (format === 'long') {
      return date.toLocaleDateString('en-SG', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }
    return date.toLocaleDateString('en-SG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  /**
   * Generate Receipt Report PDF
   */
  async generateReceiptReport(invoiceCode, address = '', districtCode = '') {
    try {
      const cacheKey = `receipt_report_${invoiceCode}_${address}_${districtCode}`;
      
      if (this.cacheEnabled) {
        const cached = cache.get(cacheKey);
        if (cached) {
          logger.info('Returning cached receipt report');
          return cached;
        }
      }

      const data = await reportRepository.getReceiptForReport(
        invoiceCode,
        address,
        districtCode
      );

      if (!data || data.length === 0) {
        throw new Error('No receipt data found for the given invoice code');
      }

      const html = this.buildReceiptReportHtml(data[0], data);
      const pdfBuffer = await this.generatePdfFromHtml(html);

      const result = {
        buffer: pdfBuffer,
        fileName: `Receipt_${invoiceCode}.pdf`,
        contentType: 'application/pdf'
      };

      if (this.cacheEnabled) {
        cache.set(cacheKey, result, this.cacheTTL);
      }

      return result;
    } catch (error) {
      logger.error('Error generating receipt report:', error);
      throw error;
    }
  }

  /**
   * Generate Monthly Receipt Report PDF
   */
  async generateMonthlyReceiptReport(fromDate, toDate) {
    try {
      const cacheKey = `monthly_receipt_${fromDate}_${toDate}`;
      
      if (this.cacheEnabled) {
        const cached = cache.get(cacheKey);
        if (cached) return cached;
      }

      const data = await reportRepository.getReceiptReport(fromDate, toDate);
      const html = this.buildMonthlyReceiptReportHtml(data, fromDate, toDate);
      const pdfBuffer = await this.generatePdfFromHtml(html);

      const result = {
        buffer: pdfBuffer,
        fileName: `ReceiptMonthly_${this.formatDate(fromDate)}_${this.formatDate(toDate)}.pdf`,
        contentType: 'application/pdf'
      };

      if (this.cacheEnabled) {
        cache.set(cacheKey, result, this.cacheTTL);
      }

      return result;
    } catch (error) {
      logger.error('Error generating monthly receipt report:', error);
      throw error;
    }
  }

  /**
   * Get optimized data payload for Monthly Receipt Report
   */
  async getMonthlyReceiptData(fromDate, toDate) {
    try {
      const cacheKey = `monthly_receipt_data_${fromDate}_${toDate}`;

      const cachedPayload = this.getCachedPayload(cacheKey);
      if (cachedPayload) {
        return cachedPayload;
      }

      const rows = await reportRepository.getReceiptReport(fromDate, toDate);
      const summary = this.buildMonthlyReceiptSummary(rows);

      const payload = this.buildDatasetPayload(rows, {
        report: 'monthly-receipts',
        period: this.buildPeriodMetadata(fromDate, toDate),
        summary,
        meta: {
          source: 'ReceiptReport'
        }
      });

      this.cachePayload(cacheKey, payload);

      return payload;
    } catch (error) {
      logger.error('Error generating monthly receipt data payload:', error);
      throw error;
    }
  }

  async getReceiptReportData(invoiceCode, address = '', districtCode = '') {
    try {
      const cacheKey = `receipt_report_data_${invoiceCode}_${address}_${districtCode}`;
      const cachedPayload = this.getCachedPayload(cacheKey);
      if (cachedPayload) {
        return cachedPayload;
      }

      const rows = await reportRepository.getReceiptForReport(invoiceCode, address, districtCode);

      if (!rows || rows.length === 0) {
        throw new Error('No receipt data found for the given invoice code');
      }

      const summary = this.buildReceiptDetailSummary(rows[0], rows);

      const payload = this.buildDatasetPayload(rows, {
        report: 'receipt',
        filters: {
          invoiceCode,
          addressOverride: Boolean(address),
          districtCode: districtCode || null
        },
        summary,
        meta: {
          source: 'GetReceiptForReport'
        }
      });

      this.cachePayload(cacheKey, payload);
      return payload;
    } catch (error) {
      logger.error('Error generating receipt data payload:', error);
      throw error;
    }
  }

  async getInscriptionReportData(insCode) {
    try {
      const cacheKey = `inscription_report_data_${insCode}`;
      const cachedPayload = this.getCachedPayload(cacheKey);
      if (cachedPayload) {
        return cachedPayload;
      }

      const rows = await reportRepository.getInscriptionForReport(insCode);

      if (!rows || rows.length === 0) {
        throw new Error('No inscription data found for the given code');
      }

      const summary = this.buildInscriptionDetailSummary(rows[0] || {});

      const payload = this.buildDatasetPayload(rows, {
        report: 'inscription',
        filters: { insCode },
        summary,
        meta: {
          source: 'GetInscriptionForReport'
        }
      });

      this.cachePayload(cacheKey, payload);
      return payload;
    } catch (error) {
      logger.error('Error generating inscription data payload:', error);
      throw error;
    }
  }

  async getMonthlyInscriptionData(fromDate, toDate) {
    try {
      const cacheKey = `monthly_inscription_data_${fromDate}_${toDate}`;
      const cachedPayload = this.getCachedPayload(cacheKey);
      if (cachedPayload) {
        return cachedPayload;
      }

      const rows = await reportRepository.getInscriptionMonthlyList(fromDate, toDate);
      const summary = this.buildMonthlyInscriptionSummary(rows);

      const payload = this.buildDatasetPayload(rows, {
        report: 'monthly-inscriptions',
        period: this.buildPeriodMetadata(fromDate, toDate),
        summary,
        meta: {
          source: 'InscriptionMonthlyList'
        }
      });

      this.cachePayload(cacheKey, payload);
      return payload;
    } catch (error) {
      logger.error('Error generating monthly inscription data payload:', error);
      throw error;
    }
  }

  async getMonthlyWakeRoomData(fromDate, toDate) {
    try {
      const cacheKey = `monthly_wakeroom_data_${fromDate}_${toDate}`;
      const cachedPayload = this.getCachedPayload(cacheKey);
      if (cachedPayload) {
        return cachedPayload;
      }

      const rows = await reportRepository.getWakeRoomMonthlyList(fromDate, toDate);
      const summary = this.buildMonthlyWakeRoomSummary(rows);

      const payload = this.buildDatasetPayload(rows, {
        report: 'monthly-wakerooms',
        period: this.buildPeriodMetadata(fromDate, toDate),
        summary,
        meta: {
          source: 'WakeRoomMonthlyList'
        }
      });

      this.cachePayload(cacheKey, payload);
      return payload;
    } catch (error) {
      logger.error('Error generating monthly wake room data payload:', error);
      throw error;
    }
  }

  async getGOAMonthlyData(fromDate, toDate) {
    try {
      const cacheKey = `goa_monthly_data_${fromDate}_${toDate}`;
      const cachedPayload = this.getCachedPayload(cacheKey);
      if (cachedPayload) {
        return cachedPayload;
      }

      const rows = await reportRepository.getGOAMonthlyList(fromDate, toDate);
      const summary = this.buildGOAMonthlySummary(rows);

      const payload = this.buildDatasetPayload(rows, {
        report: 'monthly-goa',
        period: this.buildPeriodMetadata(fromDate, toDate),
        summary,
        meta: {
          source: 'GOAMonthlyList'
        }
      });

      this.cachePayload(cacheKey, payload);
      return payload;
    } catch (error) {
      logger.error('Error generating GOA monthly data payload:', error);
      throw error;
    }
  }

  async getGSTReportData(fromDate, toDate) {
    try {
      const cacheKey = `gst_report_data_${fromDate}_${toDate}`;
      const cachedPayload = this.getCachedPayload(cacheKey);
      if (cachedPayload) {
        return cachedPayload;
      }

      const rows = await reportRepository.getInvoiceListForGSTReport(fromDate, toDate);
      const summary = this.buildGSTSummary(rows);

      const payload = this.buildDatasetPayload(rows, {
        report: 'gst',
        period: this.buildPeriodMetadata(fromDate, toDate),
        summary,
        meta: {
          source: 'InvoiceListForGSTReport'
        }
      });

      this.cachePayload(cacheKey, payload);
      return payload;
    } catch (error) {
      logger.error('Error generating GST data payload:', error);
      throw error;
    }
  }

  async getNichesSoldToBothData() {
    return this.getNicheDataset('niches-sold-both', () => reportRepository.getNichesSoldToBoth());
  }

  async getNichesSoldToCatholicData() {
    return this.getNicheDataset('niches-sold-catholic', () => reportRepository.getNichesSoldToCatholic());
  }

  async getNichesSoldToNonCatholicData() {
    return this.getNicheDataset('niches-sold-noncatholic', () => reportRepository.getNichesSoldToNonCatholic());
  }

  async getRenewalNichesData() {
    return this.getNicheDataset('niches-renewal', () => reportRepository.getRenewalNicheList());
  }

  async getSameAddressNichesData() {
    return this.getNicheDataset('niches-same-address', () => reportRepository.getSameAddressNichesList());
  }

  async getChapelLevelData(chapel, level) {
    try {
      const cacheKey = `chapel_level_data_${chapel}_${level}`;
      const cachedPayload = this.getCachedPayload(cacheKey);
      if (cachedPayload) {
        return cachedPayload;
      }

      const rows = await reportRepository.getChapelLevelList(chapel, level);
      const summary = this.buildChapelSummary(rows);

      const payload = this.buildDatasetPayload(rows, {
        report: 'chapel-level',
        filters: { chapel, level },
        summary,
        meta: {
          source: 'ChapelLevelList'
        }
      });

      this.cachePayload(cacheKey, payload);
      return payload;
    } catch (error) {
      logger.error('Error generating chapel level data payload:', error);
      throw error;
    }
  }

  async getChapelMonthData(chapel, month) {
    try {
      const cacheKey = `chapel_month_data_${chapel}_${month}`;
      const cachedPayload = this.getCachedPayload(cacheKey);
      if (cachedPayload) {
        return cachedPayload;
      }

      const rows = await reportRepository.getChapelMonthList(chapel, month);
      const summary = this.buildChapelSummary(rows);

      const payload = this.buildDatasetPayload(rows, {
        report: 'chapel-month',
        filters: { chapel, month },
        summary,
        meta: {
          source: 'ChapelMonthList'
        }
      });

      this.cachePayload(cacheKey, payload);
      return payload;
    } catch (error) {
      logger.error('Error generating chapel month data payload:', error);
      throw error;
    }
  }

  async getVacancyChapelData(chapel) {
    try {
      const cacheKey = `vacancy_chapel_data_${chapel || 'all'}`;
      const cachedPayload = this.getCachedPayload(cacheKey);
      if (cachedPayload) {
        return cachedPayload;
      }

      const rows = await reportRepository.getVacancyChapelList(chapel || null);
      const summary = this.buildVacancySummary(rows);

      const payload = this.buildDatasetPayload(rows, {
        report: 'chapel-vacancy',
        filters: { chapel: chapel || null },
        summary,
        meta: {
          source: 'VacancyChapelList'
        }
      });

      this.cachePayload(cacheKey, payload);
      return payload;
    } catch (error) {
      logger.error('Error generating vacancy chapel data payload:', error);
      throw error;
    }
  }

  async getBeneficiaryListData() {
    try {
      const cacheKey = 'beneficiary_list_data';
      const cachedPayload = this.getCachedPayload(cacheKey);
      if (cachedPayload) {
        return cachedPayload;
      }

      const rows = await reportRepository.getBeneficiaryList();
      const summary = this.buildBeneficiarySummary(rows);

      const payload = this.buildDatasetPayload(rows, {
        report: 'beneficiaries',
        summary,
        meta: {
          source: 'BeneficeryList'
        }
      });

      this.cachePayload(cacheKey, payload);
      return payload;
    } catch (error) {
      logger.error('Error generating beneficiary data payload:', error);
      throw error;
    }
  }

  async getNicheDataset(reportName, dataFetcher) {
    try {
      const cacheKey = `${reportName}_data`;
      const cachedPayload = this.getCachedPayload(cacheKey);
      if (cachedPayload) {
        return cachedPayload;
      }

      const rows = await dataFetcher();
      const summary = this.buildNicheSummary(rows);

      const payload = this.buildDatasetPayload(rows, {
        report: reportName,
        summary,
        meta: {
          source: 'NicheReports'
        }
      });

      this.cachePayload(cacheKey, payload);
      return payload;
    } catch (error) {
      logger.error(`Error generating ${reportName} data payload:`, error);
      throw error;
    }
  }

  /**
   * Generate Inscription Report PDF
   */
  async generateInscriptionReport(insCode) {
    try {
      const cacheKey = `inscription_report_${insCode}`;
      
      if (this.cacheEnabled) {
        const cached = cache.get(cacheKey);
        if (cached) return cached;
      }

      const data = await reportRepository.getInscriptionForReport(insCode);

      if (!data || data.length === 0) {
        throw new Error('No inscription data found for the given code');
      }

      const html = this.buildInscriptionReportHtml(data[0]);
      const pdfBuffer = await this.generatePdfFromHtml(html);

      const result = {
        buffer: pdfBuffer,
        fileName: `Inscription_${insCode}.pdf`,
        contentType: 'application/pdf'
      };

      if (this.cacheEnabled) {
        cache.set(cacheKey, result, this.cacheTTL);
      }

      return result;
    } catch (error) {
      logger.error('Error generating inscription report:', error);
      throw error;
    }
  }

  /**
   * Generate Monthly Inscription Report PDF
   */
  async generateMonthlyInscriptionReport(fromDate, toDate) {
    try {
      const cacheKey = `monthly_inscription_${fromDate}_${toDate}`;
      
      if (this.cacheEnabled) {
        const cached = cache.get(cacheKey);
        if (cached) return cached;
      }

      const data = await reportRepository.getInscriptionMonthlyList(fromDate, toDate);
      const html = this.buildMonthlyInscriptionReportHtml(data, fromDate, toDate);
      
      // Validate HTML before generating PDF
      if (!html || typeof html !== 'string' || html.trim().length === 0) {
        logger.error('Invalid or empty HTML generated for monthly inscription report');
        throw new Error('Failed to generate HTML content for report');
      }
      
      logger.info(`Generated HTML for monthly inscription report: ${html.length} characters`);
      const pdfBuffer = await this.generatePdfFromHtml(html);

      const result = {
        buffer: pdfBuffer,
        fileName: `InscriptionMonthly_${this.formatDate(fromDate)}_${this.formatDate(toDate)}.pdf`,
        contentType: 'application/pdf'
      };

      if (this.cacheEnabled) {
        cache.set(cacheKey, result, this.cacheTTL);
      }

      return result;
    } catch (error) {
      logger.error('Error generating monthly inscription report:', error);
      throw error;
    }
  }

  /**
   * Generate Monthly Wake Room Report PDF
   */
  async generateMonthlyWakeRoomReport(fromDate, toDate) {
    try {
      const cacheKey = `monthly_wakeroom_${fromDate}_${toDate}`;
      
      if (this.cacheEnabled) {
        const cached = cache.get(cacheKey);
        if (cached) return cached;
      }

      const data = await reportRepository.getWakeRoomMonthlyList(fromDate, toDate);
      const html = this.buildMonthlyWakeRoomReportHtml(data, fromDate, toDate);
      const pdfBuffer = await this.generatePdfFromHtml(html);

      const result = {
        buffer: pdfBuffer,
        fileName: `WakeRoomMonthly_${this.formatDate(fromDate)}_${this.formatDate(toDate)}.pdf`,
        contentType: 'application/pdf'
      };

      if (this.cacheEnabled) {
        cache.set(cacheKey, result, this.cacheTTL);
      }

      return result;
    } catch (error) {
      logger.error('Error generating monthly wake room report:', error);
      throw error;
    }
  }

  /**
   * Generate GOA Monthly Report PDF
   */
  async generateGOAMonthlyReport(fromDate, toDate) {
    try {
      const cacheKey = `goa_monthly_${fromDate}_${toDate}`;
      
      if (this.cacheEnabled) {
        const cached = cache.get(cacheKey);
        if (cached) return cached;
      }

      const data = await reportRepository.getGOAMonthlyList(fromDate, toDate);
      const html = this.buildGOAMonthlyReportHtml(data, fromDate, toDate);
      const pdfBuffer = await this.generatePdfFromHtml(html);

      const result = {
        buffer: pdfBuffer,
        fileName: `GOAMonthly_${this.formatDate(fromDate)}_${this.formatDate(toDate)}.pdf`,
        contentType: 'application/pdf'
      };

      if (this.cacheEnabled) {
        cache.set(cacheKey, result, this.cacheTTL);
      }

      return result;
    } catch (error) {
      logger.error('Error generating GOA monthly report:', error);
      throw error;
    }
  }

  /**
   * Generate GST Report PDF
   */
  async generateGSTReport(fromDate, toDate) {
    try {
      const cacheKey = `gst_report_${fromDate}_${toDate}`;
      
      if (this.cacheEnabled) {
        const cached = cache.get(cacheKey);
        if (cached) return cached;
      }

      const data = await reportRepository.getInvoiceListForGSTReport(fromDate, toDate);
      const html = this.buildGSTReportHtml(data, fromDate, toDate);
      const pdfBuffer = await this.generatePdfFromHtml(html);

      const result = {
        buffer: pdfBuffer,
        fileName: `GSTReport_${this.formatDate(fromDate)}_${this.formatDate(toDate)}.pdf`,
        contentType: 'application/pdf'
      };

      if (this.cacheEnabled) {
        cache.set(cacheKey, result, this.cacheTTL);
      }

      return result;
    } catch (error) {
      logger.error('Error generating GST report:', error);
      throw error;
    }
  }

  /**
   * Generate Niches Sold To Both Report PDF
   */
  async generateNichesSoldToBothReport() {
    try {
      const cacheKey = 'niches_sold_both';
      
      if (this.cacheEnabled) {
        const cached = cache.get(cacheKey);
        if (cached) return cached;
      }

      const data = await reportRepository.getNichesSoldToBoth();
      const html = this.buildNichesSoldReportHtml(data, 'Niches Sold To Both Catholic and Non-Catholic');
      const pdfBuffer = await this.generatePdfFromHtml(html);

      const result = {
        buffer: pdfBuffer,
        fileName: 'NichesSoldToBoth.pdf',
        contentType: 'application/pdf'
      };

      if (this.cacheEnabled) {
        cache.set(cacheKey, result, this.cacheTTL);
      }

      return result;
    } catch (error) {
      logger.error('Error generating niches sold to both report:', error);
      throw error;
    }
  }

  /**
   * Generate Niches Sold To Catholic Report PDF
   */
  async generateNichesSoldToCatholicReport() {
    try {
      const cacheKey = 'niches_sold_catholic';
      
      if (this.cacheEnabled) {
        const cached = cache.get(cacheKey);
        if (cached) return cached;
      }

      const data = await reportRepository.getNichesSoldToCatholic();
      const html = this.buildNichesSoldReportHtml(data, 'Niches Sold To Catholic');
      const pdfBuffer = await this.generatePdfFromHtml(html);

      const result = {
        buffer: pdfBuffer,
        fileName: 'NichesSoldToCatholic.pdf',
        contentType: 'application/pdf'
      };

      if (this.cacheEnabled) {
        cache.set(cacheKey, result, this.cacheTTL);
      }

      return result;
    } catch (error) {
      logger.error('Error generating niches sold to Catholic report:', error);
      throw error;
    }
  }

  /**
   * Generate Niches Sold To Non-Catholic Report PDF
   */
  async generateNichesSoldToNonCatholicReport() {
    try {
      const cacheKey = 'niches_sold_noncatholic';
      
      if (this.cacheEnabled) {
        const cached = cache.get(cacheKey);
        if (cached) return cached;
      }

      const data = await reportRepository.getNichesSoldToNonCatholic();
      const html = this.buildNichesSoldReportHtml(data, 'Niches Sold To Non-Catholic');
      const pdfBuffer = await this.generatePdfFromHtml(html);

      const result = {
        buffer: pdfBuffer,
        fileName: 'NichesSoldToNonCatholic.pdf',
        contentType: 'application/pdf'
      };

      if (this.cacheEnabled) {
        cache.set(cacheKey, result, this.cacheTTL);
      }

      return result;
    } catch (error) {
      logger.error('Error generating niches sold to non-Catholic report:', error);
      throw error;
    }
  }

  /**
   * Generate Renewal Niches Report PDF
   */
  async generateRenewalNichesReport() {
    try {
      const cacheKey = 'renewal_niches';
      
      if (this.cacheEnabled) {
        const cached = cache.get(cacheKey);
        if (cached) return cached;
      }

      const data = await reportRepository.getRenewalNicheList();
      const html = this.buildNichesSoldReportHtml(data, 'Renewal Niches');
      const pdfBuffer = await this.generatePdfFromHtml(html);

      const result = {
        buffer: pdfBuffer,
        fileName: 'RenewalNiches.pdf',
        contentType: 'application/pdf'
      };

      if (this.cacheEnabled) {
        cache.set(cacheKey, result, this.cacheTTL);
      }

      return result;
    } catch (error) {
      logger.error('Error generating renewal niches report:', error);
      throw error;
    }
  }

  /**
   * Generate Same Address Niches Report PDF
   */
  async generateSameAddressNichesReport() {
    try {
      const cacheKey = 'same_address_niches';
      
      if (this.cacheEnabled) {
        const cached = cache.get(cacheKey);
        if (cached) return cached;
      }

      const data = await reportRepository.getSameAddressNichesList();
      const html = this.buildNichesSoldReportHtml(data, 'Same Address Niches');
      const pdfBuffer = await this.generatePdfFromHtml(html);

      const result = {
        buffer: pdfBuffer,
        fileName: 'SameAddressNiches.pdf',
        contentType: 'application/pdf'
      };

      if (this.cacheEnabled) {
        cache.set(cacheKey, result, this.cacheTTL);
      }

      return result;
    } catch (error) {
      logger.error('Error generating same address niches report:', error);
      throw error;
    }
  }

  /**
   * Generate Chapel Level Report PDF
   */
  async generateChapelLevelReport(chapel, level) {
    try {
      const cacheKey = `chapel_level_${chapel}_${level}`;
      
      if (this.cacheEnabled) {
        const cached = cache.get(cacheKey);
        if (cached) return cached;
      }

      const data = await reportRepository.getChapelLevelList(chapel, level);
      const html = this.buildChapelLevelReportHtml(data, chapel, level);
      const pdfBuffer = await this.generatePdfFromHtml(html);

      const result = {
        buffer: pdfBuffer,
        fileName: `ChapelLevel_${chapel}_${level}.pdf`,
        contentType: 'application/pdf'
      };

      if (this.cacheEnabled) {
        cache.set(cacheKey, result, this.cacheTTL);
      }

      return result;
    } catch (error) {
      logger.error('Error generating chapel level report:', error);
      throw error;
    }
  }

  /**
   * Generate Chapel Month Report PDF
   */
  async generateChapelMonthReport(chapel, month) {
    try {
      const cacheKey = `chapel_month_${chapel}_${month}`;
      
      if (this.cacheEnabled) {
        const cached = cache.get(cacheKey);
        if (cached) return cached;
      }

      const data = await reportRepository.getChapelMonthList(chapel, month);
      const html = this.buildChapelMonthReportHtml(data, chapel, month);
      const pdfBuffer = await this.generatePdfFromHtml(html);

      const result = {
        buffer: pdfBuffer,
        fileName: `ChapelMonth_${chapel}_${month}.pdf`,
        contentType: 'application/pdf'
      };

      if (this.cacheEnabled) {
        cache.set(cacheKey, result, this.cacheTTL);
      }

      return result;
    } catch (error) {
      logger.error('Error generating chapel month report:', error);
      throw error;
    }
  }

  /**
   * Generate Vacancy Chapel Report PDF
   */
  async generateVacancyChapelReport(chapel = null) {
    try {
      const cacheKey = `vacancy_chapel_${chapel || 'all'}`;
      
      if (this.cacheEnabled) {
        const cached = cache.get(cacheKey);
        if (cached) return cached;
      }

      const data = await reportRepository.getVacancyChapelList(chapel);
      const html = this.buildVacancyChapelReportHtml(data, chapel);
      const pdfBuffer = await this.generatePdfFromHtml(html);

      const result = {
        buffer: pdfBuffer,
        fileName: `VacancyChapel_${chapel || 'All'}.pdf`,
        contentType: 'application/pdf'
      };

      if (this.cacheEnabled) {
        cache.set(cacheKey, result, this.cacheTTL);
      }

      return result;
    } catch (error) {
      logger.error('Error generating vacancy chapel report:', error);
      throw error;
    }
  }

  /**
   * Generate Beneficiary List Report PDF
   */
  async generateBeneficiaryListReport() {
    try {
      const cacheKey = 'beneficiary_list';
      
      if (this.cacheEnabled) {
        const cached = cache.get(cacheKey);
        if (cached) return cached;
      }

      const data = await reportRepository.getBeneficiaryList();
      const html = this.buildBeneficiaryListReportHtml(data);
      const pdfBuffer = await this.generatePdfFromHtml(html);

      const result = {
        buffer: pdfBuffer,
        fileName: 'BeneficiaryList.pdf',
        contentType: 'application/pdf'
      };

      if (this.cacheEnabled) {
        cache.set(cacheKey, result, this.cacheTTL);
      }

      return result;
    } catch (error) {
      logger.error('Error generating beneficiary list report:', error);
      throw error;
    }
  }

  // HTML Template Builders (continuing in next part due to length...)
  
  buildReceiptReportHtml(receipt, details) {
    // Build detailed receipt report HTML
    const receiptData = receipt || {};
    const detailRows = Array.isArray(details) ? details : [];
    
    const detailTableRows = detailRows.map((row, index) => {
      return `
        <tr>
          <td>${index + 1}</td>
          <td>${this.sanitize(row.RefDocName || row.ItemName || '-')}</td>
          <td>${this.sanitize(row.RefDocNumber || row.ItemCode || '-')}</td>
          <td>${this.formatCurrency(row.PayingAmount || row.TotalPayingAmount || 0)}</td>
          <td>${this.formatCurrency(row.TotalAmount || 0)}</td>
        </tr>
      `;
    }).join('');

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Receipt Report</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Arial', sans-serif; font-size: 11pt; line-height: 1.4; color: #333; padding: 20px; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #2c3e50; padding-bottom: 20px; }
        .header h1 { color: #2c3e50; font-size: 22pt; margin-bottom: 10px; }
        .header h2 { color: #7f8c8d; font-size: 14pt; }
        .info-section { margin-bottom: 20px; padding: 15px; background-color: #f8f9fa; border-left: 4px solid #2c3e50; }
        .info-row { display: flex; margin-bottom: 8px; }
        .info-label { width: 150px; font-weight: bold; color: #2c3e50; }
        .info-value { flex: 1; color: #555; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 10pt; }
        th { background-color: #34495e; color: white; padding: 10px 8px; text-align: left; font-weight: bold; }
        td { padding: 8px; border-bottom: 1px solid #ddd; }
        tr:nth-child(even) { background-color: #f9f9f9; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 2px solid #2c3e50; text-align: center; font-size: 9pt; color: #7f8c8d; }
        .date-generated { text-align: right; font-size: 9pt; color: #7f8c8d; margin-bottom: 20px; }
        .amount { font-weight: bold; color: #27ae60; }
    </style>
</head>
<body>
    <div class="date-generated">Generated on: ${new Date().toLocaleString('en-SG')}</div>
    
    <div class="header">
        <h1>RECEIPT REPORT</h1>
        <h2>Franciscan Columbarium</h2>
    </div>

    <div class="info-section">
        <div class="info-row">
            <div class="info-label">Invoice Code:</div>
            <div class="info-value">${this.sanitize(receiptData.InvCode || receiptData.InvoiceCode || '-')}</div>
        </div>
        <div class="info-row">
            <div class="info-label">Receipt Date:</div>
            <div class="info-value">${this.formatDate(receiptData.TransactionDate || receiptData.ReceiptDate)}</div>
        </div>
        <div class="info-row">
            <div class="info-label">Customer Name:</div>
            <div class="info-value">${this.sanitize(receiptData.CustomerName || receiptData.PayeeName || '-')}</div>
        </div>
        <div class="info-row">
            <div class="info-label">Address:</div>
            <div class="info-value">${this.sanitize(receiptData.Address || '-')}</div>
        </div>
        <div class="info-row">
            <div class="info-label">Payment Mode:</div>
            <div class="info-value">${this.sanitize(receiptData.PaymentMode || '-')}</div>
        </div>
        <div class="info-row">
            <div class="info-label">Total Amount:</div>
            <div class="info-value"><span class="amount">SGD ${this.formatCurrency(receiptData.TotalAmount || receiptData.PayingAmount || 0)}</span></div>
        </div>
    </div>

    ${detailTableRows ? `
    <table>
        <thead>
            <tr>
                <th>#</th>
                <th>Description</th>
                <th>Reference</th>
                <th>Amount</th>
                <th>Total</th>
            </tr>
        </thead>
        <tbody>
            ${detailTableRows}
        </tbody>
    </table>
    ` : ''}

    <div class="footer">
        <p>&copy; ${new Date().getFullYear()} Franciscan Columbarium. All rights reserved.</p>
        <p>This is a computer-generated report.</p>
    </div>
</body>
</html>
    `;
  }

  /**
   * Sanitize string for HTML output
   */
  sanitize(value) {
    if (value === null || value === undefined) {
      return '-';
    }
    const str = String(value);
    // Basic HTML escaping
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  buildMonthlyReceiptReportHtml(data, fromDate, toDate) {
    // Build detailed monthly receipt report
    const totalAmount = Array.isArray(data) ? data.reduce((sum, row) => sum + (Number(row.TotalAmount || row.PayingAmount || 0)), 0) : 0;
    const totalCount = Array.isArray(data) ? data.length : 0;
    
    return this.buildGenericReportHtml('Monthly Receipt Report', data, { 
      fromDate, 
      toDate,
      summary: {
        totalAmount: this.formatCurrency(totalAmount),
        totalCount
      }
    });
  }

  buildMonthlyReceiptSummary(rows = []) {
    const summary = {
      totalAmount: 0,
      totalRecords: rows.length,
      averageAmount: 0,
      paymentBreakdown: {},
      chapelBreakdown: {},
      dailyTrend: [],
      uniqueCustomers: 0
    };

    if (!rows.length) {
      return summary;
    }

    const paymentMap = new Map();
    const chapelMap = new Map();
    const trendMap = new Map();
    const customerSet = new Set();

    rows.forEach(row => {
      const amount = this.extractReceiptAmount(row);
      summary.totalAmount += amount;

      const paymentLabel = this.getPaymentLabel(row);
      paymentMap.set(paymentLabel, (paymentMap.get(paymentLabel) || 0) + amount);

      const chapelLabel = this.getChapelLabel(row);
      chapelMap.set(chapelLabel, (chapelMap.get(chapelLabel) || 0) + amount);

      const trendKey = this.formatDate(row.TransactionDate || row.ReceiptDate || row.InvoiceDate);
      trendMap.set(trendKey, {
        date: trendKey,
        amount: (trendMap.get(trendKey)?.amount || 0) + amount,
        count: (trendMap.get(trendKey)?.count || 0) + 1
      });

      const customerName = row.CustomerName || row.ApplicantName || row.PersonName || row.Name || row.FullName;
      if (customerName) {
        customerSet.add(customerName);
      }
    });

    summary.averageAmount = summary.totalAmount && rows.length ? summary.totalAmount / rows.length : 0;
    summary.paymentBreakdown = Object.fromEntries(paymentMap);
    summary.chapelBreakdown = Object.fromEntries(chapelMap);
    summary.dailyTrend = Array.from(trendMap.values()).sort((a, b) => new Date(a.date) - new Date(b.date));
    summary.uniqueCustomers = customerSet.size;

    return summary;
  }

  extractReceiptAmount(row = {}) {
    const amountFields = [
      'TotalAmount',
      'PayingAmount',
      'Amount',
      'ReceiptAmount',
      'NetAmount'
    ];

    for (const field of amountFields) {
      if (row[field] !== undefined && row[field] !== null) {
        const value = Number(row[field]);
        if (!Number.isNaN(value)) {
          return value;
        }
      }
    }

    return 0;
  }

  getPaymentLabel(row = {}) {
    const paymentFields = [
      'PaymentMode',
      'PaymentType',
      'PaymentMethod',
      'PaymentModeName',
      'PaymentDescription'
    ];

    for (const field of paymentFields) {
      if (row[field]) {
        return row[field];
      }
    }

    return 'Unknown';
  }

  getChapelLabel(row = {}) {
    const chapelFields = [
      'Chapel',
      'ChapelDescription',
      'ChurchDesc',
      'ChapelName',
      'ChapelCode'
    ];

    for (const field of chapelFields) {
      if (row[field]) {
        return row[field];
      }
    }

    return 'Unspecified';
  }

  buildInscriptionReportHtml(data) {
    // Build detailed inscription report
    const inscription = data || {};
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Inscription Report</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Arial', sans-serif; font-size: 11pt; line-height: 1.4; color: #333; padding: 20px; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #2c3e50; padding-bottom: 20px; }
        .header h1 { color: #2c3e50; font-size: 22pt; margin-bottom: 10px; }
        .info-section { margin-bottom: 20px; padding: 15px; background-color: #f8f9fa; border-left: 4px solid #2c3e50; }
        .info-row { display: flex; margin-bottom: 8px; }
        .info-label { width: 200px; font-weight: bold; color: #2c3e50; }
        .info-value { flex: 1; color: #555; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 2px solid #2c3e50; text-align: center; font-size: 9pt; color: #7f8c8d; }
    </style>
</head>
<body>
    <div class="header">
        <h1>INSCRIPTION REPORT</h1>
        <h2>Franciscan Columbarium</h2>
    </div>
    <div class="info-section">
        <div class="info-row"><div class="info-label">Code:</div><div class="info-value">${this.sanitize(inscription.Code || '-')}</div></div>
        <div class="info-row"><div class="info-label">Applicant Name:</div><div class="info-value">${this.sanitize(inscription.ApplicantName || '-')}</div></div>
        <div class="info-row"><div class="info-label">Name of Deceased:</div><div class="info-value">${this.sanitize(inscription.NameOfDeceased || '-')}</div></div>
        <div class="info-row"><div class="info-label">Niche Code:</div><div class="info-value">${this.sanitize(inscription.NicheCode || inscription.Code || '-')}</div></div>
        <div class="info-row"><div class="info-label">Chapel:</div><div class="info-value">${this.sanitize(inscription.ChapelCode || '-')}</div></div>
        <div class="info-row"><div class="info-label">Date:</div><div class="info-value">${this.formatDate(inscription.InternmentDate || inscription.RequestDate)}</div></div>
    </div>
    <div class="footer">
        <p>&copy; ${new Date().getFullYear()} Franciscan Columbarium. All rights reserved.</p>
    </div>
</body>
</html>
    `;
  }

  buildMonthlyInscriptionReportHtml(data, fromDate, toDate) {
    return this.buildGenericReportHtml('Monthly Inscription Report', data, { fromDate, toDate });
  }

  buildMonthlyWakeRoomReportHtml(data, fromDate, toDate) {
    return this.buildGenericReportHtml('Monthly Wake Room Report', data, { fromDate, toDate });
  }

  buildGOAMonthlyReportHtml(data, fromDate, toDate) {
    return this.buildGenericReportHtml('GOA Monthly Report', data, { fromDate, toDate });
  }

  buildGSTReportHtml(data, fromDate, toDate) {
    return this.buildGenericReportHtml('GST Report', data, { fromDate, toDate });
  }

  buildNichesSoldReportHtml(data, title) {
    return this.buildGenericReportHtml(title, data);
  }

  buildChapelLevelReportHtml(data, chapel, level) {
    return this.buildGenericReportHtml(`Chapel Level Report - ${chapel} Level ${level}`, data);
  }

  buildChapelMonthReportHtml(data, chapel, month) {
    return this.buildGenericReportHtml(`Chapel Month Report - ${chapel} Month ${month}`, data);
  }

  buildVacancyChapelReportHtml(data, chapel) {
    return this.buildGenericReportHtml(`Vacancy Chapel Report${chapel ? ` - ${chapel}` : ''}`, data);
  }

  buildBeneficiaryListReportHtml(data) {
    return this.buildGenericReportHtml('Beneficiary List Report', data);
  }

  /**
   * Build generic report HTML template
   * Optimized for large datasets with pagination support
   */
  buildGenericReportHtml(title, data, metadata = {}) {
    const isArray = Array.isArray(data);
    const rows = isArray ? data : [data];
    
    // Limit rows for very large datasets to prevent memory issues
    const maxRows = 10000;
    const displayRows = rows.length > maxRows ? rows.slice(0, maxRows) : rows;
    const hasMoreRows = rows.length > maxRows;
    
    // Get column names from first row
    const columns = displayRows.length > 0 ? Object.keys(displayRows[0]) : [];
    
    const tableRows = displayRows.map((row, index) => {
      const cells = columns.map(col => {
        const value = row[col];
        const displayValue = value !== null && value !== undefined ? this.sanitize(String(value)) : '-';
        return `<td>${displayValue}</td>`;
      }).join('');
      return `<tr>${cells}</tr>`;
    }).join('');

    // Sanitize column headers
    const tableHeaders = columns.map(col => `<th>${this.sanitize(col)}</th>`).join('');

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Arial', sans-serif; font-size: 11pt; line-height: 1.4; color: #333; padding: 20px; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #2c3e50; padding-bottom: 20px; }
        .header h1 { color: #2c3e50; font-size: 22pt; margin-bottom: 10px; }
        .header h2 { color: #7f8c8d; font-size: 14pt; }
        .metadata { margin-bottom: 20px; font-size: 10pt; color: #666; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 10pt; }
        th { background-color: #34495e; color: white; padding: 10px 8px; text-align: left; font-weight: bold; }
        td { padding: 8px; border-bottom: 1px solid #ddd; }
        tr:nth-child(even) { background-color: #f9f9f9; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 2px solid #2c3e50; text-align: center; font-size: 9pt; color: #7f8c8d; }
        .date-generated { text-align: right; font-size: 9pt; color: #7f8c8d; margin-bottom: 20px; }
        .summary { margin-bottom: 20px; padding: 15px; background-color: #f8f9fa; border-left: 4px solid #2c3e50; }
    </style>
</head>
<body>
    <div class="date-generated">Generated on: ${new Date().toLocaleString('en-SG')}</div>
    
    <div class="header">
        <h1>${title}</h1>
        <h2>Franciscan Columbarium</h2>
    </div>

    ${metadata.fromDate ? `<div class="metadata">Period: ${this.formatDate(metadata.fromDate)} to ${this.formatDate(metadata.toDate)}</div>` : ''}
    ${metadata.chapel ? `<div class="metadata">Chapel: ${metadata.chapel}</div>` : ''}
    ${metadata.level ? `<div class="metadata">Level: ${metadata.level}</div>` : ''}

    <div class="summary">
        <strong>Total Records: ${rows.length}${hasMoreRows ? ` (showing first ${maxRows})` : ''}</strong>
    </div>

    ${displayRows.length > 0 ? `
    <table>
        <thead>
            <tr>${tableHeaders}</tr>
        </thead>
        <tbody>
            ${tableRows}
        </tbody>
    </table>
    ` : '<p style="text-align: center; padding: 20px; color: #999;">No data available for this report.</p>'}
    
    ${hasMoreRows ? `<div class="summary" style="margin-top: 20px; color: #e74c3c;"><strong>Note: Report truncated to first ${maxRows} records. Total records: ${rows.length}</strong></div>` : ''}

    <div class="footer">
        <p>&copy; ${new Date().getFullYear()} Franciscan Columbarium. All rights reserved.</p>
        <p>This is a computer-generated report.</p>
    </div>
</body>
</html>
    `;
  }

  buildDatasetPayload(rows = [], options = {}) {
    const payload = {
      success: true,
      report: options.report || 'report',
      meta: {
        totalRecords: rows.length,
        generatedAt: new Date().toISOString(),
        cached: false,
        ...(options.meta || {})
      },
      summary: options.summary || {},
      data: rows
    };

    if (options.period) {
      payload.period = options.period;
    }

    if (options.filters && Object.keys(options.filters).length > 0) {
      payload.filters = options.filters;
    }

    if (options.pagination) {
      payload.pagination = options.pagination;
    }

    return payload;
  }

  buildPeriodMetadata(fromDate, toDate) {
    if (!fromDate && !toDate) {
      return undefined;
    }

    return {
      from: fromDate ? this.formatDate(fromDate) : null,
      to: toDate ? this.formatDate(toDate) : null,
      raw: {
        from: fromDate instanceof Date ? fromDate.toISOString() : fromDate || null,
        to: toDate instanceof Date ? toDate.toISOString() : toDate || null
      }
    };
  }

  buildReceiptDetailSummary(header = {}, rows = []) {
    return {
      invoiceCode: header.InvCode || header.InvoiceCode || header.Code || null,
      customerName: header.CustomerName || header.ApplicantName || header.Name || null,
      paymentMode: this.getPaymentLabel(header),
      chapel: this.getChapelLabel(header),
      totalAmount: this.extractReceiptAmount(header),
      lineItems: rows.length,
      transactionDate: header.TransactionDate ? this.formatDate(header.TransactionDate) : null,
      generatedAt: new Date().toISOString()
    };
  }

  buildInscriptionDetailSummary(inscription = {}) {
    return {
      inscriptionCode: inscription.Code || inscription.InscriptionCode || null,
      applicant: inscription.ApplicantName || inscription.ContactPerson || null,
      chapel: inscription.ChapelCode || inscription.Chapel || null,
      niche: inscription.NicheCode || inscription.Niche || null,
      deceasedCount: inscription.DeceasedCount || inscription.DecesedCount || 1,
      status: inscription.Status || inscription.ApplicationStatus || null,
      requestDate: this.formatDate(inscription.RequestDate || inscription.CreatedOn),
      internmentDate: this.formatDate(inscription.InternmentDate)
    };
  }

  buildMonthlyInscriptionSummary(rows = []) {
    const totalAmount = rows.reduce((sum, row) => sum + this.extractNumericValue(row, [
      'InscriptionAmount',
      'TotalAmount',
      'PayingAmount',
      'Amount'
    ]), 0);

    return {
      totalRecords: rows.length,
      totalAmount,
      averageAmount: rows.length ? totalAmount / rows.length : 0,
      chapelBreakdown: this.buildBreakdown(rows, ['Chapel', 'ChapelName', 'ChapelCode', 'ChurchDesc']),
      statusBreakdown: this.buildBreakdown(rows, ['Status', 'ApplicationStatus', 'CurrentStatus']),
      inscriptionTypes: this.buildBreakdown(rows, ['InscriptionType', 'Type', 'Category']),
      applicantCountries: this.buildBreakdown(rows, ['ApplicantCountry', 'Country']),
      dateRange: this.buildDateRange(rows, ['InscriptionDate', 'RequestDate', 'CreatedOn'])
    };
  }

  buildMonthlyWakeRoomSummary(rows = []) {
    const totalAmount = rows.reduce((sum, row) => sum + this.extractNumericValue(row, [
      'PayingAmount',
      'Amount',
      'TotalAmount',
      'NetAmount',
      'BookingAmount'
    ]), 0);

    return {
      totalBookings: rows.length,
      totalAmount,
      averageAmount: rows.length ? totalAmount / rows.length : 0,
      roomBreakdown: this.buildBreakdown(rows, ['RoomName', 'WakeRoom', 'Chapel', 'ChapelName']),
      durationBreakdown: this.buildBreakdown(rows, ['Duration', 'BookingHours', 'DayCount']),
      applicantBreakdown: this.buildBreakdown(rows, ['ApplicantName', 'CustomerName', 'Name'], { limit: 5 }),
      dateRange: this.buildDateRange(rows, ['BookingDate', 'FromDate', 'ToDate'])
    };
  }

  buildGOAMonthlySummary(rows = []) {
    const totalAmount = rows.reduce((sum, row) => sum + this.extractNumericValue(row, [
      'TotalAmount',
      'Amount',
      'NetAmount',
      'GOAAmount'
    ]), 0);

    return {
      totalRecords: rows.length,
      totalAmount,
      averageAmount: rows.length ? totalAmount / rows.length : 0,
      chapelBreakdown: this.buildBreakdown(rows, ['Chapel', 'ChapelName', 'ChapelCode']),
      statusBreakdown: this.buildBreakdown(rows, ['Status', 'GOAStatus']),
      dateRange: this.buildDateRange(rows, ['TransactionDate', 'CreatedOn'])
    };
  }

  buildGSTSummary(rows = []) {
    const totals = rows.reduce((acc, row) => {
      acc.gross += this.extractNumericValue(row, ['TotalAmount', 'GrossAmount', 'PayableAmount']);
      acc.net += this.extractNumericValue(row, ['NetAmount', 'SubTotal']);
      acc.gst += this.extractNumericValue(row, ['GSTAmount', 'TaxAmount']);
      return acc;
    }, { gross: 0, net: 0, gst: 0 });

    return {
      totalInvoices: rows.length,
      grossAmount: totals.gross,
      netAmount: totals.net,
      gstAmount: totals.gst,
      customerBreakdown: this.buildBreakdown(rows, ['CustomerName', 'ApplicantName', 'Name'], { limit: 10 }),
      dateRange: this.buildDateRange(rows, ['InvoiceDate', 'ReceiptDate', 'TransactionDate'])
    };
  }

  buildNicheSummary(rows = []) {
    return {
      totalRecords: rows.length,
      chapelBreakdown: this.buildBreakdown(rows, ['Chapel', 'ChapelName', 'ChapelCode']),
      statusBreakdown: this.buildBreakdown(rows, ['Status', 'BookingStatus', 'RenewalStatus']),
      religionBreakdown: this.buildBreakdown(rows, ['Religion', 'ApplicantReligion', 'BeneficiaryReligion']),
      applicantCountries: this.buildBreakdown(rows, ['Country', 'ApplicantCountry']),
      dateRange: this.buildDateRange(rows, ['CreatedOn', 'BookingDate', 'RenewalDate'])
    };
  }

  buildChapelSummary(rows = []) {
    return {
      totalRecords: rows.length,
      chapelBreakdown: this.buildBreakdown(rows, ['Chapel', 'ChapelName', 'ChapelCode']),
      levelBreakdown: this.buildBreakdown(rows, ['Level', 'LevelNumber', 'NicheLevel']),
      occupancyStats: {
        occupied: rows.filter(row => (row.Status || '').toLowerCase() === 'occupied').length,
        vacant: rows.filter(row => (row.Status || '').toLowerCase() === 'vacant').length
      }
    };
  }

  buildVacancySummary(rows = []) {
    return {
      totalRecords: rows.length,
      chapelBreakdown: this.buildBreakdown(rows, ['Chapel', 'ChapelName', 'ChapelCode']),
      levelBreakdown: this.buildBreakdown(rows, ['Level', 'LevelNumber']),
      roomBreakdown: this.buildBreakdown(rows, ['Room', 'RoomName']),
      dateRange: this.buildDateRange(rows, ['CreatedOn', 'UpdatedOn'])
    };
  }

  buildBeneficiarySummary(rows = []) {
    return {
      totalRecords: rows.length,
      chapelBreakdown: this.buildBreakdown(rows, ['Chapel', 'ChapelName', 'ChapelCode']),
      relationshipBreakdown: this.buildBreakdown(rows, ['Relation', 'Relationship', 'RelationShip']),
      nationalityBreakdown: this.buildBreakdown(rows, ['Nationality', 'Country']),
      applicantBreakdown: this.buildBreakdown(rows, ['ApplicantName', 'PrimaryApplicant'], { limit: 10 })
    };
  }

  buildBreakdown(rows = [], fields = [], options = {}) {
    if (!rows.length || !fields.length) {
      return {};
    }

    const counts = new Map();
    const label = options.fallback || 'Unspecified';
    const sumFields = options.sumFields || null;

    rows.forEach(row => {
      const value = this.pickFirstValue(row, fields) || label;
      const increment = sumFields ? this.extractNumericValue(row, sumFields) : 1;
      const current = counts.get(value) || 0;
      counts.set(value, current + (increment || 0));
    });

    const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
    const limit = typeof options.limit === 'number' && options.limit > 0 ? options.limit : sorted.length;

    return Object.fromEntries(sorted.slice(0, limit));
  }

  buildDateRange(rows = [], fields = []) {
    if (!rows.length || !fields.length) {
      return null;
    }

    const timestamps = rows
      .map(row => this.pickFirstValue(row, fields))
      .map(value => {
        if (!value) return null;
        const date = value instanceof Date ? value : new Date(value);
        return Number.isNaN(date.getTime()) ? null : date;
      })
      .filter(date => date)
      .sort((a, b) => a - b);

    if (!timestamps.length) {
      return null;
    }

    const start = timestamps[0];
    const end = timestamps[timestamps.length - 1];

    return {
      from: this.formatDate(start),
      to: this.formatDate(end),
      raw: {
        from: start.toISOString(),
        to: end.toISOString()
      }
    };
  }

  pickFirstValue(row = {}, fields = []) {
    for (const field of fields) {
      if (row[field] !== undefined && row[field] !== null) {
        const value = row[field];
        if (typeof value === 'string' && value.trim() === '') {
          continue;
        }
        return value;
      }
    }

    return null;
  }

  extractNumericValue(row = {}, fields = []) {
    const candidates = Array.isArray(fields) && fields.length ? fields : [
      'TotalAmount',
      'PayingAmount',
      'Amount',
      'NetAmount',
      'ReceiptAmount',
      'GSTAmount'
    ];

    for (const field of candidates) {
      if (row[field] !== undefined && row[field] !== null) {
        const value = Number(row[field]);
        if (!Number.isNaN(value)) {
          return value;
        }
      }
    }

    return 0;
  }
}

module.exports = new ReportService();

