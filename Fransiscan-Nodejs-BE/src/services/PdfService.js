const puppeteer = require('puppeteer');
const handlebars = require('handlebars');
const path = require('path');
const fs = require('fs').promises;
const logger = require('../utils/logger');

/**
 * PDF Service
 * Handles PDF generation using Puppeteer and Handlebars templates
 */
class PdfService {
  constructor() {
    this.pdfOutputDir = path.join(process.cwd(), 'public', 'pdfs');
    this.templateDir = path.join(process.cwd(), 'src', 'templates');
  }

  /**
   * Ensure PDF output directory exists
   */
  async ensureOutputDirectory() {
    try {
      await fs.access(this.pdfOutputDir);
    } catch (error) {
      await fs.mkdir(this.pdfOutputDir, { recursive: true });
      logger.info('Created PDF output directory:', this.pdfOutputDir);
    }
  }

  /**
   * Generate Niche Agreement PDF
   * @param {Object} agreementData - Niche agreement data
   * @returns {Promise<string>} Path to generated PDF file
   */
  async generateAgreementPdf(agreementData) {
    try {
      await this.ensureOutputDirectory();

      const timestamp = Date.now();
      const appNumber = agreementData.metadata?.applicationNumber || agreementData.applicationCode || 'unknown';
      const fileName = `agreement-${appNumber}-${timestamp}.pdf`;
      const filePath = path.join(this.pdfOutputDir, fileName);

      // Generate HTML from template
      const html = await this.generateAgreementHtml(agreementData);

      // Generate PDF using Puppeteer
      const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });

      await page.pdf({
        path: filePath,
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20mm',
          right: '15mm',
          bottom: '20mm',
          left: '15mm'
        }
      });

      await browser.close();

      logger.info(`Generated agreement PDF: ${fileName}`);
      return fileName;
    } catch (error) {
      logger.error('Error generating agreement PDF:', error);
      throw new Error(`Failed to generate agreement PDF: ${error.message}`);
    }
  }

  /**
   * Generate Invoice PDF
   * @param {Object} agreementData - Niche agreement data (includes invoice info)
   * @returns {Promise<string>} Path to generated PDF file
   */
  async generateInvoicePdf(agreementData) {
    try {
      await this.ensureOutputDirectory();

      const timestamp = Date.now();
      const appNumber = agreementData.metadata?.applicationNumber || agreementData.applicationCode || 'unknown';
      const fileName = `invoice-${appNumber}-${timestamp}.pdf`;
      const filePath = path.join(this.pdfOutputDir, fileName);

      // Generate HTML from template
      const html = await this.generateInvoiceHtml(agreementData);

      // Generate PDF using Puppeteer
      const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });

      await page.pdf({
        path: filePath,
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20mm',
          right: '15mm',
          bottom: '20mm',
          left: '15mm'
        }
      });

      await browser.close();

      logger.info(`Generated invoice PDF: ${fileName}`);
      return fileName;
    } catch (error) {
      logger.error('Error generating invoice PDF:', error);
      throw new Error(`Failed to generate invoice PDF: ${error.message}`);
    }
  }

  /**
   * Generate HTML for Agreement PDF
   * @param {Object} data - Agreement data
   * @returns {Promise<string>} HTML string
   */
  async generateAgreementHtml(data) {
    const template = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Niche Agreement - {{applicationNumber}}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Arial', sans-serif; font-size: 12pt; line-height: 1.6; color: #333; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #2c3e50; padding-bottom: 20px; }
        .header h1 { color: #2c3e50; font-size: 24pt; margin-bottom: 10px; }
        .header h2 { color: #7f8c8d; font-size: 16pt; margin-bottom: 5px; }
        .section { margin-bottom: 25px; }
        .section-title { background-color: #34495e; color: white; padding: 10px; font-size: 14pt; font-weight: bold; margin-bottom: 15px; }
        .info-row { display: flex; margin-bottom: 10px; }
        .info-label { width: 200px; font-weight: bold; color: #2c3e50; }
        .info-value { flex: 1; color: #555; }
        .table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        .table th { background-color: #34495e; color: white; padding: 10px; text-align: left; font-weight: bold; }
        .table td { padding: 10px; border-bottom: 1px solid #ddd; }
        .table tr:nth-child(even) { background-color: #f9f9f9; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 2px solid #2c3e50; text-align: center; font-size: 10pt; color: #7f8c8d; }
        .amount { font-size: 14pt; font-weight: bold; color: #27ae60; }
        .date-generated { text-align: right; font-size: 10pt; color: #7f8c8d; margin-bottom: 20px; }
    </style>
</head>
<body>
    <div class="date-generated">Generated on: {{currentDate}}</div>
    
    <div class="header">
        <h1>NICHE AGREEMENT</h1>
        <h2>Franciscan Columbarium</h2>
        <p>Application Number: <strong>{{applicationCode}}</strong></p>
    </div>

    <div class="section">
        <div class="section-title">Application Information</div>
        <div class="info-row">
            <div class="info-label">Application Number:</div>
            <div class="info-value">{{applicationCode}}</div>
        </div>
        <div class="info-row">
            <div class="info-label">Applied Date:</div>
            <div class="info-value">{{appliedDate}}</div>
        </div>
        <div class="info-row">
            <div class="info-label">Agreement Date:</div>
            <div class="info-value">{{agreementDate}}</div>
        </div>
    </div>

    <div class="section">
        <div class="section-title">Applicant Information</div>
        <div class="info-row">
            <div class="info-label">Name:</div>
            <div class="info-value">{{applicant.name}}</div>
        </div>
        <div class="info-row">
            <div class="info-label">Address:</div>
            <div class="info-value">{{applicant.address}}</div>
        </div>
        <div class="info-row">
            <div class="info-label">Mobile:</div>
            <div class="info-value">{{applicant.mobileNo}}</div>
        </div>
        <div class="info-row">
            <div class="info-label">Email:</div>
            <div class="info-value">{{applicant.email}}</div>
        </div>
        <div class="info-row">
            <div class="info-label">NRIC:</div>
            <div class="info-value">{{applicant.idNo}}</div>
        </div>
    </div>

    <div class="section">
        <div class="section-title">Niche Details</div>
        <div class="info-row">
            <div class="info-label">Niche Number:</div>
            <div class="info-value">{{niche.number}}</div>
        </div>
        <div class="info-row">
            <div class="info-label">Chapel Name:</div>
            <div class="info-value">{{niche.chapelName}}</div>
        </div>
        <div class="info-row">
            <div class="info-label">Total Amount:</div>
            <div class="info-value"><span class="amount">SGD {{niche.totalAmount}}</span></div>
        </div>
    </div>

    {{#if beneficiaries.length}}
    <div class="section">
        <div class="section-title">Beneficiaries</div>
        <table class="table">
            <thead>
                <tr>
                    <th>#</th>
                    <th>Name</th>
                    <th>Relation</th>
                    <th>NRIC</th>
                </tr>
            </thead>
            <tbody>
                {{#each beneficiaries}}
                <tr>
                    <td>Beneficiary {{@index}}</td>
                    <td>{{name}}</td>
                    <td>{{relationshipToApplicant}}</td>
                    <td>{{idNo}}</td>
                </tr>
                {{/each}}
            </tbody>
        </table>
    </div>
    {{/if}}

    {{#if nominee.name}}
    <div class="section">
        <div class="section-title">Nominee Information</div>
        <div class="info-row">
            <div class="info-label">Name:</div>
            <div class="info-value">{{nominee.name}}</div>
        </div>
        <div class="info-row">
            <div class="info-label">Relationship:</div>
            <div class="info-value">{{nominee.relationship}}</div>
        </div>
        <div class="info-row">
            <div class="info-label">NRIC:</div>
            <div class="info-value">{{nominee.idNo}}</div>
        </div>
        <div class="info-row">
            <div class="info-label">Mobile:</div>
            <div class="info-value">{{nominee.mobileNo}}</div>
        </div>
    </div>
    {{/if}}

    {{#if nominee2.name}}
    <div class="section">
        <div class="section-title">Second Nominee Information</div>
        <div class="info-row">
            <div class="info-label">Name:</div>
            <div class="info-value">{{nominee2.name}}</div>
        </div>
        <div class="info-row">
            <div class="info-label">Relationship:</div>
            <div class="info-value">{{nominee2.relationship}}</div>
        </div>
        <div class="info-row">
            <div class="info-label">NRIC:</div>
            <div class="info-value">{{nominee2.idNo}}</div>
        </div>
        <div class="info-row">
            <div class="info-label">Mobile:</div>
            <div class="info-value">{{nominee2.mobileNo}}</div>
        </div>
    </div>
    {{/if}}

    <div class="footer">
        <p>&copy; {{currentYear}} Franciscan Columbarium. All rights reserved.</p>
        <p>This is a computer-generated document. No signature is required.</p>
    </div>
</body>
</html>
    `;

    const compiledTemplate = handlebars.compile(template);
    const currentDate = new Date().toLocaleDateString('en-SG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    return compiledTemplate({
      ...data,
      currentDate,
      currentYear: new Date().getFullYear()
    });
  }

  /**
   * Generate HTML for Invoice PDF
   * @param {Object} data - Agreement data with invoice
   * @returns {Promise<string>} HTML string
   */
  async generateInvoiceHtml(data) {
    const template = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invoice - {{invoice.invoiceNo}}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Arial', sans-serif; font-size: 12pt; line-height: 1.6; color: #333; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #2c3e50; padding-bottom: 20px; }
        .header h1 { color: #2c3e50; font-size: 24pt; margin-bottom: 10px; }
        .header h2 { color: #7f8c8d; font-size: 16pt; }
        .invoice-info { display: flex; justify-content: space-between; margin-bottom: 30px; }
        .info-box { width: 48%; }
        .info-box h3 { background-color: #34495e; color: white; padding: 8px; margin-bottom: 10px; }
        .info-row { margin-bottom: 8px; }
        .info-label { font-weight: bold; color: #2c3e50; display: inline-block; width: 120px; }
        .table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .table th { background-color: #34495e; color: white; padding: 12px; text-align: left; }
        .table td { padding: 12px; border-bottom: 1px solid #ddd; }
        .table tr:nth-child(even) { background-color: #f9f9f9; }
        .table .amount { text-align: right; font-weight: bold; }
        .total-section { margin-top: 30px; text-align: right; }
        .total-row { display: flex; justify-content: flex-end; margin-bottom: 10px; font-size: 14pt; }
        .total-label { width: 200px; font-weight: bold; text-align: right; margin-right: 20px; }
        .total-value { width: 150px; text-align: right; }
        .grand-total { border-top: 3px solid #2c3e50; padding-top: 10px; margin-top: 10px; }
        .grand-total .total-value { font-size: 18pt; color: #27ae60; font-weight: bold; }
        .footer { margin-top: 50px; padding-top: 20px; border-top: 2px solid #2c3e50; text-align: center; font-size: 10pt; color: #7f8c8d; }
        .date-generated { text-align: right; font-size: 10pt; color: #7f8c8d; margin-bottom: 20px; }
    </style>
</head>
<body>
    <div class="date-generated">Generated on: {{currentDate}}</div>
    
    <div class="header">
        <h1>INVOICE</h1>
        <h2>Franciscan Columbarium</h2>
    </div>

    <div class="invoice-info">
        <div class="info-box">
            <h3>Bill To</h3>
            <div class="info-row"><strong>{{applicant.name}}</strong></div>
            <div class="info-row">{{applicant.address}}</div>
            <div class="info-row">Mobile: {{applicant.mobileNo}}</div>
            <div class="info-row">Email: {{applicant.email}}</div>
            <div class="info-row">NRIC: {{applicant.nric}}</div>
        </div>
        <div class="info-box">
            <h3>Invoice Details</h3>
            <div class="info-row">
                <span class="info-label">Invoice No:</span>
                <span>{{invoice.invoiceNo}}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Invoice Date:</span>
                <span>{{invoice.invoiceDate}}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Application No:</span>
                <span>{{applicationCode}}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Agreement Date:</span>
                <span>{{agreementDate}}</span>
            </div>
        </div>
    </div>

    <table class="table">
        <thead>
            <tr>
                <th style="width: 60%">Description</th>
                <th style="width: 20%">Duration</th>
                <th style="width: 20%">Amount (SGD)</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>
                    <strong>Niche Allocation</strong><br>
                    Chapel: {{niche.chapelName}}<br>
                    Niche Number: {{niche.number}}
                </td>
                <td>Perpetual</td>
                <td class="amount">{{niche.totalAmount}}</td>
            </tr>
            {{#if invoice.additionalCharges}}
            <tr>
                <td>Additional Charges</td>
                <td>-</td>
                <td class="amount">{{invoice.additionalCharges}}</td>
            </tr>
            {{/if}}
        </tbody>
    </table>

    <div class="total-section">
        <div class="total-row">
            <div class="total-label">Subtotal:</div>
            <div class="total-value">SGD {{niche.totalAmount}}</div>
        </div>
        {{#if invoice.receiptAmount}}
        <div class="total-row">
            <div class="total-label">Paid Amount:</div>
            <div class="total-value">SGD {{invoice.receiptAmount}}</div>
        </div>
        <div class="total-row">
            <div class="total-label">Balance Due:</div>
            <div class="total-value">SGD {{balanceDue}}</div>
        </div>
        {{/if}}
        <div class="total-row grand-total">
            <div class="total-label">Total Amount:</div>
            <div class="total-value">SGD {{niche.totalAmount}}</div>
        </div>
    </div>

    {{#if invoice.receiptAmount}}
    <div style="margin-top: 30px; padding: 15px; background-color: #d5f4e6; border-left: 4px solid #27ae60;">
        <strong>Payment Status:</strong> 
        {{#if balanceDue}}
        Partial Payment Received - Balance Due: SGD {{balanceDue}}
        {{else}}
        Fully Paid
        {{/if}}
    </div>
    {{/if}}

    <div class="footer">
        <p>&copy; {{currentYear}} Franciscan Columbarium. All rights reserved.</p>
        <p>This is a computer-generated invoice. No signature is required.</p>
        <p>For any queries, please contact our office.</p>
    </div>
</body>
</html>
    `;

    const compiledTemplate = handlebars.compile(template);
    const currentDate = new Date().toLocaleDateString('en-SG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const balanceDue = data.niche.totalAmount - (data.invoice?.receiptAmount || 0);

    return compiledTemplate({
      ...data,
      currentDate,
      currentYear: new Date().getFullYear(),
      balanceDue: balanceDue.toFixed(2)
    });
  }
}

module.exports = PdfService;

