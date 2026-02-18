const reportService = require('../services/ReportService');
const logger = require('../utils/logger');
const path = require('path');
const fs = require('fs').promises;

/**
 * Report Controller
 * Handles all report generation API endpoints
 */
class ReportController {
  /**
   * Determine if request expects direct PDF response
   * @param {Object} req - Express request
   * @returns {boolean}
   */
  requestWantsPdf(req) {
    const defaultFormat = (process.env.REPORT_DEFAULT_FORMAT || 'json').toLowerCase();

    if (!req) {
      return defaultFormat === 'pdf';
    }

    const normalize = value => (value || '').toString().trim().toLowerCase();
    const formatParam = normalize(req.query?.format);
    const responseTypeParam = normalize(req.query?.responseType);
    const downloadParam = normalize(req.query?.download);

    const pdfHints = ['pdf', 'binary', 'file'];
    const jsonHints = ['json', 'data', 'table', 'summary'];

    if (downloadParam && downloadParam !== 'false' && downloadParam !== '0') {
      return true;
    }

    if (pdfHints.includes(formatParam) || pdfHints.includes(responseTypeParam)) {
      return true;
    }

    if (jsonHints.includes(formatParam) || jsonHints.includes(responseTypeParam)) {
      return false;
    }

    const acceptHeader = req.headers?.accept || '';
    if (acceptHeader.includes('application/pdf') && !acceptHeader.includes('application/json')) {
      return true;
    }

    if (acceptHeader.includes('application/json') && !acceptHeader.includes('application/pdf')) {
      return false;
    }

    return defaultFormat === 'pdf';
  }

  /**
   * Send PDF response either as JSON payload with URL or direct file stream
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   * @param {Object} pdfResult - Result from PDF service
   * @param {Buffer} pdfResult.buffer - PDF buffer
   * @param {string} pdfResult.fileName - File name
   * @param {string} pdfResult.contentType - Content type
   * @returns {Response}
   */
  async sendPdfResponse(req, res, pdfResult) {
    // Default: Send PDF directly as binary (matching ASP.NET Response.BinaryWrite)
    // This ensures compatibility with frontend expecting binary PDF responses
    if (this.requestWantsPdf(req)) {
      // Validate buffer
      if (!pdfResult.buffer || !Buffer.isBuffer(pdfResult.buffer)) {
        logger.error('Invalid PDF buffer in sendPdfResponse', {
          hasBuffer: !!pdfResult.buffer,
          isBuffer: Buffer.isBuffer(pdfResult.buffer),
          type: typeof pdfResult.buffer
        });
        return res.status(500).json({
          success: false,
          error: 'Failed to generate PDF: Invalid buffer'
        });
      }

      // Validate PDF buffer is not empty
      if (pdfResult.buffer.length === 0) {
        logger.error('Empty PDF buffer in sendPdfResponse');
        return res.status(500).json({
          success: false,
          error: 'Failed to generate PDF: Empty buffer'
        });
      }

      // Validate PDF magic bytes (PDF files should start with %PDF)
      const pdfHeader = pdfResult.buffer.slice(0, 4).toString('ascii');
      if (pdfHeader !== '%PDF') {
        logger.error('Invalid PDF format - missing PDF header', {
          header: pdfHeader,
          bufferLength: pdfResult.buffer.length,
          firstBytes: pdfResult.buffer.slice(0, 20).toString('hex')
        });
        return res.status(500).json({
          success: false,
          error: 'Failed to generate PDF: Invalid PDF format'
        });
      }

      // Log PDF info for debugging
      logger.info('Sending PDF response', {
        fileName: pdfResult.fileName,
        bufferSize: pdfResult.buffer.length,
        contentType: pdfResult.contentType || 'application/pdf'
      });

      // Encode filename for Content-Disposition header (handle special characters)
      const encodedFileName = encodeURIComponent(pdfResult.fileName);

      // Send PDF directly as binary (matching ASP.NET Response.BinaryWrite)
      res.setHeader('Content-Type', pdfResult.contentType || 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${pdfResult.fileName}"; filename*=UTF-8''${encodedFileName}`);
      res.setHeader('Content-Length', pdfResult.buffer.length.toString());
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('X-Content-Type-Options', 'nosniff');

      // Send binary buffer directly - use send() which handles buffers correctly
      return res.send(pdfResult.buffer);
    }

    // Default: Return JSON with base64 encoded PDF or save to file and return URL
    // For large PDFs, save to file system and return URL
    try {
      const pdfOutputDir = path.join(process.cwd(), 'public', 'pdfs', 'reports');
      await fs.mkdir(pdfOutputDir, { recursive: true });

      // Generate unique filename to avoid conflicts
      const timestamp = Date.now();
      const safeFileName = pdfResult.fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
      const uniqueFileName = `${timestamp}_${safeFileName}`;
      const filePath = path.join(pdfOutputDir, uniqueFileName);

      // Write PDF buffer to file (binary mode)
      await fs.writeFile(filePath, pdfResult.buffer);

      const publicPath = `/pdfs/reports/${uniqueFileName}`;
      const pdfUrl = `${req.protocol}://${req.get('host')}${publicPath}`;

      logger.info(`PDF saved: ${uniqueFileName}, size: ${pdfResult.buffer.length} bytes`);

      return res.status(200).json({
        success: true,
        data: {
          pdfUrl,
          fileName: pdfResult.fileName,
          uniqueFileName,
          generatedAt: new Date().toISOString(),
          downloadUrl: pdfUrl,
          size: pdfResult.buffer.length
        }
      });
    } catch (fileError) {
      logger.error('Error saving PDF to file, returning base64:', fileError);
      // Fallback: return base64 encoded PDF
      const base64Pdf = pdfResult.buffer.toString('base64');
      return res.status(200).json({
        success: true,
        data: {
          pdf: `data:application/pdf;base64,${base64Pdf}`,
          fileName: pdfResult.fileName,
          generatedAt: new Date().toISOString(),
          size: pdfResult.buffer.length
        }
      });
    }
  }

  /**
   * Generate Receipt Report
   * GET /api/reports/invoices/receipt/:invoiceCode
   */
  async generateReceipt(req, res) {
    try {
      const { invoiceCode } = req.params;
      const { address, districtCode } = req.query;

      if (!invoiceCode) {
        return res.status(400).json({
          success: false,
          error: 'Invoice code is required'
        });
      }

      logger.info(`Generating receipt report for invoice: ${invoiceCode}`);

      if (this.requestWantsPdf(req)) {
        const result = await reportService.generateReceiptReport(
          invoiceCode,
          address || '',
          districtCode || ''
        );

        return await this.sendPdfResponse(req, res, result);
      }

      const dataResult = await reportService.getReceiptReportData(
        invoiceCode,
        address || '',
        districtCode || ''
      );

      return res.json(dataResult);
    } catch (error) {
      logger.error('Error generating receipt report:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to generate receipt report'
      });
    }
  }

  /**
   * Generate Monthly Receipt Report
   * GET /api/reports/monthly/receipts
   */
  async generateMonthlyReceipts(req, res) {
    try {
      const { fromDate, toDate } = req.query;

      if (!fromDate || !toDate) {
        return res.status(400).json({
          success: false,
          error: 'fromDate and toDate query parameters are required'
        });
      }

      const from = new Date(fromDate);
      const to = new Date(toDate);

      if (isNaN(from.getTime()) || isNaN(to.getTime())) {
        return res.status(400).json({
          success: false,
          error: 'Invalid date format. Use YYYY-MM-DD format'
        });
      }

      logger.info(`Generating monthly receipt report from ${fromDate} to ${toDate}`);

      if (this.requestWantsPdf(req)) {
        const pdfResult = await reportService.generateMonthlyReceiptReport(from, to);
        return await this.sendPdfResponse(req, res, pdfResult);
      }

      const dataResult = await reportService.getMonthlyReceiptData(from, to);
      return res.json(dataResult);
    } catch (error) {
      logger.error('Error generating monthly receipt report:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to generate monthly receipt report'
      });
    }
  }

  /**
   * Generate Receipt Register Report
   * GET /api/reports/monthly/receipt-register
   */
  async generateReceiptRegister(req, res) {
    try {
      const { fromDate, toDate } = req.query;

      if (!fromDate || !toDate) {
        return res.status(400).json({
          success: false,
          error: 'fromDate and toDate query parameters are required'
        });
      }

      const from = new Date(fromDate);
      const to = new Date(toDate);

      if (isNaN(from.getTime()) || isNaN(to.getTime())) {
        return res.status(400).json({
          success: false,
          error: 'Invalid date format. Use YYYY-MM-DD format'
        });
      }

      logger.info(`Generating receipt register report from ${fromDate} to ${toDate}`);

      // We only support JSON/Data format for register currently as it's meant for the web register view
      const dataResult = await reportService.getReceiptRegisterData(from, to);
      return res.json(dataResult);
    } catch (error) {
      logger.error('Error generating receipt register report:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to generate receipt register report'
      });
    }
  }

  /**
   * Generate Inscription Report
   * GET /api/reports/inscriptions/:insCode
   */
  async generateInscription(req, res) {
    try {
      const { insCode } = req.params;

      if (!insCode) {
        return res.status(400).json({
          success: false,
          error: 'Inscription code is required'
        });
      }

      logger.info(`Generating inscription report for code: ${insCode}`);

      if (this.requestWantsPdf(req)) {
        const result = await reportService.generateInscriptionReport(insCode);
        return await this.sendPdfResponse(req, res, result);
      }

      const dataResult = await reportService.getInscriptionReportData(insCode);
      return res.json(dataResult);
    } catch (error) {
      logger.error('Error generating inscription report:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to generate inscription report'
      });
    }
  }

  /**
   * Generate Monthly Inscription Report
   * GET /api/reports/monthly/inscriptions
   */
  async generateMonthlyInscriptions(req, res) {
    try {
      const { fromDate, toDate } = req.query;

      if (!fromDate || !toDate) {
        return res.status(400).json({
          success: false,
          error: 'fromDate and toDate query parameters are required'
        });
      }

      const from = new Date(fromDate);
      const to = new Date(toDate);

      if (isNaN(from.getTime()) || isNaN(to.getTime())) {
        return res.status(400).json({
          success: false,
          error: 'Invalid date format. Use YYYY-MM-DD format'
        });
      }

      logger.info(`Generating monthly inscription report from ${fromDate} to ${toDate}`);

      if (this.requestWantsPdf(req)) {
        const result = await reportService.generateMonthlyInscriptionReport(from, to);
        return await this.sendPdfResponse(req, res, result);
      }

      const dataResult = await reportService.getMonthlyInscriptionData(from, to);
      return res.json(dataResult);
    } catch (error) {
      logger.error('Error generating monthly inscription report:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to generate monthly inscription report'
      });
    }
  }

  /**
   * Generate Monthly Wake Room Report
   * GET /api/reports/monthly/wakerooms
   */
  async generateMonthlyWakeRooms(req, res) {
    try {
      const { fromDate, toDate } = req.query;

      if (!fromDate || !toDate) {
        return res.status(400).json({
          success: false,
          error: 'fromDate and toDate query parameters are required'
        });
      }

      const from = new Date(fromDate);
      const to = new Date(toDate);

      if (isNaN(from.getTime()) || isNaN(to.getTime())) {
        return res.status(400).json({
          success: false,
          error: 'Invalid date format. Use YYYY-MM-DD format'
        });
      }

      logger.info(`Generating monthly wake room report from ${fromDate} to ${toDate}`);

      if (this.requestWantsPdf(req)) {
        const result = await reportService.generateMonthlyWakeRoomReport(from, to);
        return await this.sendPdfResponse(req, res, result);
      }

      const dataResult = await reportService.getMonthlyWakeRoomData(from, to);
      return res.json(dataResult);
    } catch (error) {
      logger.error('Error generating monthly wake room report:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to generate monthly wake room report'
      });
    }
  }

  /**
   * Generate GOA Monthly Report
   * GET /api/reports/monthly/goa
   */
  async generateGOAMonthly(req, res) {
    try {
      const { fromDate, toDate } = req.query;

      if (!fromDate || !toDate) {
        return res.status(400).json({
          success: false,
          error: 'fromDate and toDate query parameters are required'
        });
      }

      const from = new Date(fromDate);
      const to = new Date(toDate);

      if (isNaN(from.getTime()) || isNaN(to.getTime())) {
        return res.status(400).json({
          success: false,
          error: 'Invalid date format. Use YYYY-MM-DD format'
        });
      }

      logger.info(`Generating GOA monthly report from ${fromDate} to ${toDate}`);

      if (this.requestWantsPdf(req)) {
        const result = await reportService.generateGOAMonthlyReport(from, to);
        return await this.sendPdfResponse(req, res, result);
      }

      const dataResult = await reportService.getGOAMonthlyData(from, to);
      return res.json(dataResult);
    } catch (error) {
      logger.error('Error generating GOA monthly report:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to generate GOA monthly report'
      });
    }
  }

  /**
   * Generate GST Report
   * GET /api/reports/gst/report
   */
  async generateGSTReport(req, res) {
    try {
      const { fromDate, toDate } = req.query;

      if (!fromDate || !toDate) {
        return res.status(400).json({
          success: false,
          error: 'fromDate and toDate query parameters are required'
        });
      }

      const from = new Date(fromDate);
      const to = new Date(toDate);

      if (isNaN(from.getTime()) || isNaN(to.getTime())) {
        return res.status(400).json({
          success: false,
          error: 'Invalid date format. Use YYYY-MM-DD format'
        });
      }

      logger.info(`Generating GST report from ${fromDate} to ${toDate}`);

      if (this.requestWantsPdf(req)) {
        const result = await reportService.generateGSTReport(from, to);
        return await this.sendPdfResponse(req, res, result);
      }

      const dataResult = await reportService.getGSTReportData(from, to);
      return res.json(dataResult);
    } catch (error) {
      logger.error('Error generating GST report:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to generate GST report'
      });
    }
  }

  /**
   * Generate Niches Sold To Both Report
   * GET /api/reports/niches/sold-both
   */
  async generateNichesSoldBoth(req, res) {
    try {
      logger.info('Generating niches sold to both report');

      if (this.requestWantsPdf(req)) {
        const result = await reportService.generateNichesSoldToBothReport();
        return await this.sendPdfResponse(req, res, result);
      }

      const dataResult = await reportService.getNichesSoldToBothData();
      return res.json(dataResult);
    } catch (error) {
      logger.error('Error generating niches sold to both report:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to generate niches sold to both report'
      });
    }
  }

  /**
   * Generate Niches Sold To Catholic Report
   * GET /api/reports/niches/sold-catholic
   */
  async generateNichesSoldCatholic(req, res) {
    try {
      logger.info('Generating niches sold to Catholic report');

      if (this.requestWantsPdf(req)) {
        const result = await reportService.generateNichesSoldToCatholicReport();
        return await this.sendPdfResponse(req, res, result);
      }

      const dataResult = await reportService.getNichesSoldToCatholicData();
      return res.json(dataResult);
    } catch (error) {
      logger.error('Error generating niches sold to Catholic report:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to generate niches sold to Catholic report'
      });
    }
  }

  /**
   * Generate Niches Sold To Non-Catholic Report
   * GET /api/reports/niches/sold-noncatholic
   */
  async generateNichesSoldNonCatholic(req, res) {
    try {
      logger.info('Generating niches sold to non-Catholic report');

      if (this.requestWantsPdf(req)) {
        const result = await reportService.generateNichesSoldToNonCatholicReport();
        return await this.sendPdfResponse(req, res, result);
      }

      const dataResult = await reportService.getNichesSoldToNonCatholicData();
      return res.json(dataResult);
    } catch (error) {
      logger.error('Error generating niches sold to non-Catholic report:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to generate niches sold to non-Catholic report'
      });
    }
  }

  /**
   * Generate Renewal Niches Report
   * GET /api/reports/niches/renewal
   */
  async generateRenewalNiches(req, res) {
    try {
      logger.info('Generating renewal niches report');

      if (this.requestWantsPdf(req)) {
        const result = await reportService.generateRenewalNichesReport();
        return await this.sendPdfResponse(req, res, result);
      }

      const dataResult = await reportService.getRenewalNichesData();
      return res.json(dataResult);
    } catch (error) {
      logger.error('Error generating renewal niches report:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to generate renewal niches report'
      });
    }
  }

  /**
   * Generate Same Address Niches Report
   * GET /api/reports/niches/same-address
   */
  async generateSameAddressNiches(req, res) {
    try {
      logger.info('Generating same address niches report');

      if (this.requestWantsPdf(req)) {
        const result = await reportService.generateSameAddressNichesReport();
        return await this.sendPdfResponse(req, res, result);
      }

      const dataResult = await reportService.getSameAddressNichesData();
      return res.json(dataResult);
    } catch (error) {
      logger.error('Error generating same address niches report:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to generate same address niches report'
      });
    }
  }

  /**
   * Generate Chapel Level Report
   * GET /api/reports/chapel/level
   */
  async generateChapelLevel(req, res) {
    try {
      const { chapel, level } = req.query;

      if (!chapel || !level) {
        return res.status(400).json({
          success: false,
          error: 'chapel and level query parameters are required'
        });
      }

      logger.info(`Generating chapel level report for ${chapel} level ${level}`);

      if (this.requestWantsPdf(req)) {
        const result = await reportService.generateChapelLevelReport(chapel, level);
        return await this.sendPdfResponse(req, res, result);
      }

      const dataResult = await reportService.getChapelLevelData(chapel, level);
      return res.json(dataResult);
    } catch (error) {
      logger.error('Error generating chapel level report:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to generate chapel level report'
      });
    }
  }

  /**
   * Generate Chapel Month Report
   * GET /api/reports/chapel/month
   */
  async generateChapelMonth(req, res) {
    try {
      const { chapel, month } = req.query;

      if (!chapel || !month) {
        return res.status(400).json({
          success: false,
          error: 'chapel and month query parameters are required'
        });
      }

      logger.info(`Generating chapel month report for ${chapel} month ${month}`);

      if (this.requestWantsPdf(req)) {
        const result = await reportService.generateChapelMonthReport(chapel, parseInt(month));
        return await this.sendPdfResponse(req, res, result);
      }

      const dataResult = await reportService.getChapelMonthData(chapel, parseInt(month));
      return res.json(dataResult);
    } catch (error) {
      logger.error('Error generating chapel month report:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to generate chapel month report'
      });
    }
  }

  /**
   * Generate Vacancy Chapel Report
   * GET /api/reports/chapel/vacancy
   */
  async generateVacancyChapel(req, res) {
    try {
      const { chapel } = req.query;

      logger.info(`Generating vacancy chapel report${chapel ? ` for ${chapel}` : ' (all chapels)'}`);

      if (this.requestWantsPdf(req)) {
        const result = await reportService.generateVacancyChapelReport(chapel || null);
        return await this.sendPdfResponse(req, res, result);
      }

      const dataResult = await reportService.getVacancyChapelData(chapel || null);
      return res.json(dataResult);
    } catch (error) {
      logger.error('Error generating vacancy chapel report:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to generate vacancy chapel report'
      });
    }
  }

  /**
   * Generate Beneficiary List Report
   * GET /api/reports/beneficiaries/list
   */
  async generateBeneficiaryList(req, res) {
    try {
      logger.info('Generating beneficiary list report');

      if (this.requestWantsPdf(req)) {
        const result = await reportService.generateBeneficiaryListReport();
        return await this.sendPdfResponse(req, res, result);
      }

      const dataResult = await reportService.getBeneficiaryListData();
      return res.json(dataResult);
    } catch (error) {
      logger.error('Error generating beneficiary list report:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to generate beneficiary list report'
      });
    }
  }

  /**
   * Get available reports list
   * GET /api/reports
   */
  async getAvailableReports(req, res) {
    try {
      const reports = {
        invoices: {
          receipt: 'GET /api/reports/invoices/receipt/:invoiceCode',
          description: 'Generate receipt PDF for a specific invoice'
        },
        inscriptions: {
          single: 'GET /api/reports/inscriptions/:insCode',
          description: 'Generate inscription PDF for a specific code'
        },
        monthly: {
          receipts: 'GET /api/reports/monthly/receipts?fromDate=YYYY-MM-DD&toDate=YYYY-MM-DD',
          inscriptions: 'GET /api/reports/monthly/inscriptions?fromDate=YYYY-MM-DD&toDate=YYYY-MM-DD',
          wakerooms: 'GET /api/reports/monthly/wakerooms?fromDate=YYYY-MM-DD&toDate=YYYY-MM-DD',
          goa: 'GET /api/reports/monthly/goa?fromDate=YYYY-MM-DD&toDate=YYYY-MM-DD',
          description: 'Generate monthly reports for various categories'
        },
        niches: {
          soldBoth: 'GET /api/reports/niches/sold-both',
          soldCatholic: 'GET /api/reports/niches/sold-catholic',
          soldNonCatholic: 'GET /api/reports/niches/sold-noncatholic',
          renewal: 'GET /api/reports/niches/renewal',
          sameAddress: 'GET /api/reports/niches/same-address',
          description: 'Generate niche listing reports'
        },
        chapel: {
          level: 'GET /api/reports/chapel/level?chapel=CODE&level=NUMBER',
          month: 'GET /api/reports/chapel/month?chapel=CODE&month=NUMBER',
          vacancy: 'GET /api/reports/chapel/vacancy?chapel=CODE',
          description: 'Generate chapel-related reports'
        },
        beneficiaries: {
          list: 'GET /api/reports/beneficiaries/list',
          description: 'Generate beneficiary list report'
        },
        gst: {
          report: 'GET /api/reports/gst/report?fromDate=YYYY-MM-DD&toDate=YYYY-MM-DD',
          description: 'Generate GST report'
        }
      };

      res.json({
        success: true,
        data: reports,
        message: 'Available reporting endpoints'
      });
    } catch (error) {
      logger.error('Error getting available reports:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get available reports'
      });
    }
  }
}

module.exports = new ReportController();

