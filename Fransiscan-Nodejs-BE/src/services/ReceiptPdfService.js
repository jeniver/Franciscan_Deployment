const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs').promises;
const Receipt = require('../models/Receipt');
const logger = require('../utils/logger');

class ReceiptPdfService {
  constructor() {
    this.publicDir = path.join(process.cwd(), 'public');
    this.outputDir = path.join(this.publicDir, 'pdfs');
    this.receiptDir = path.join(this.outputDir, 'receipts');
    this.invoiceDir = path.join(this.outputDir, 'invoices');
  }

  async ensureDirectories() {
    await this.ensureDir(this.outputDir);
    await this.ensureDir(this.receiptDir);
    await this.ensureDir(this.invoiceDir);
  }

  async ensureDir(dir) {
    try {
      await fs.access(dir);
    } catch (error) {
      await fs.mkdir(dir, { recursive: true });
    }
  }

  formatCurrency(value) {
    const amount = Number(value) || 0;
    return amount.toLocaleString('en-SG', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  formatDate(value) {
    if (!value) {
      return '-';
    }

    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleDateString('en-SG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  sanitize(value) {
    if (value === null || value === undefined) {
      return '-';
    }
    return String(value);
  }

  getField(source, ...keys) {
    if (!source) {
      return null;
    }

    for (const key of keys) {
      if (source[key] !== undefined && source[key] !== null) {
        return source[key];
      }
    }

    return null;
  }

  buildPublicPath(filePath) {
    const relative = path.relative(this.publicDir, filePath).replace(/\\/g, '/');
    return `/${relative}`;
  }

  async renderPdf(html, filePath, options = {}) {
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      await page.pdf({
        path: filePath,
        format: options.format || 'A4',
        printBackground: true,
        landscape: options.landscape || false,
        margin: options.margin || {
          top: '10mm',
          right: '10mm',
          bottom: '10mm',
          left: '10mm'
        }
      });
    } finally {
      await browser.close();
    }
  }

  async generateReceiptPdf(payload) {
    await this.ensureDirectories();

    const receipt = payload.receipt || {};
    const invoice = payload.invoice || {};
    const details = payload.details || [];

    const receiptCode = this.getField(receipt, 'code', 'Code') || 'receipt';
    const timestamp = Date.now();
    const fileName = `receipt-${receiptCode}-${timestamp}.pdf`;
    const filePath = path.join(this.receiptDir, fileName);

    const logoBase64 = await this.getLogoBase64();

    const html = this.buildReceiptTemplate({
      receipt,
      invoice,
      details,
      logoBase64
    });

    await this.renderPdf(html, filePath, {
      format: 'A5',
      landscape: true, // A5 Landscape for receipts often looks better or is requested
      margin: {
        top: '10mm',
        right: '10mm',
        bottom: '10mm',
        left: '10mm'
      }
    });

    logger.info(`Generated receipt PDF: ${fileName}`);

    return {
      fileName,
      filePath,
      publicPath: this.buildPublicPath(filePath),
      generatedAt: new Date().toISOString()
    };
  }

  async generateInvoicePdf(payload) {
    await this.ensureDirectories();

    const invoice = payload.invoice || {};
    const invoiceCode = this.getField(invoice, 'Code', 'code', 'InvoiceNo', 'invoiceNo') || 'invoice';
    const timestamp = Date.now();
    const fileName = `invoice-${invoiceCode}-${timestamp}.pdf`;
    const filePath = path.join(this.invoiceDir, fileName);

    const logoBase64 = await this.getLogoBase64();

    const html = this.buildInvoiceTemplate(invoice, logoBase64);
    await this.renderPdf(html, filePath);

    logger.info(`Generated invoice PDF: ${fileName}`);

    return {
      fileName,
      filePath,
      publicPath: this.buildPublicPath(filePath),
      generatedAt: new Date().toISOString()
    };
  }

  async getLogoBase64() {
    try {
      // Look for logo in peer frontend directory
      const logoPath = path.join(process.cwd(), '../francisicon-react-front-end/public/logo.png');
      const imageBuffer = await fs.readFile(logoPath);
      return `data:image/png;base64,${imageBuffer.toString('base64')}`;
    } catch (error) {
      console.warn('Could not load logo from:', path.join(process.cwd(), '../francisicon-react-front-end/public/logo.png'), error.message);
      return ''; // Return empty string if failed, image tag will just show alt or broken
    }
  }

  // Convert number to words (English)
  convertNumberToWords(amount) {
    const num = parseFloat(amount);
    if (isNaN(num)) return '';

    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const scales = ['', 'Thousand', 'Million', 'Billion'];

    const numToWords = (n) => {
      if (n === 0) return '';
      if (n < 20) return ones[n];
      if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? '-' + ones[n % 10] : '');
      if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' ' + numToWords(n % 100) : '');
      return '';
    };

    // Split integer and decimal
    const parts = Math.abs(num).toFixed(2).split('.');
    let integerPart = parseInt(parts[0], 10);
    const decimalPart = parseInt(parts[1], 10);

    let words = '';

    if (integerPart === 0) {
      words = 'Zero';
    } else {
      let scaleIndex = 0;
      while (integerPart > 0) {
        const chunk = integerPart % 1000;
        if (chunk !== 0) {
          const chunkWords = numToWords(chunk);
          words = chunkWords + (scales[scaleIndex] ? ' ' + scales[scaleIndex] : '') + (words ? ' ' + words : '');
        }
        integerPart = Math.floor(integerPart / 1000);
        scaleIndex++;
      }
    }

    let result = words.trim();

    // Formatting: "Eight Thousand Three Hundred Five, And Eighty Cents Only"
    // Add Cents
    if (decimalPart > 0) {
      // Need to handle cents wording? Example says "And Eighty Cents Only"
      // If decimal is 80, we say "Eighty".
      const centsWords = numToWords(decimalPart);
      result += `, And ${centsWords} Cents Only`;
    } else {
      result += ' Only';
    }

    return result;
  }

  buildReceiptTemplate({ receipt, invoice, details, logoBase64 }) {
    const paymentMode = Receipt.paymentModeToString(
      this.getField(receipt, 'paymentMode', 'PaymentMode')
    );

    const rows = (details || []).length > 0 ? details : [{
      description: this.getField(invoice, 'Description', 'description') || 'Receipt Item',
      payingAmount: this.getField(receipt, 'payingAmount', 'PayingAmount'),
      quantity: 1,
      refDocNumber: this.getField(invoice, 'Code', 'code', 'InvoiceNo', 'invoiceNo') // Fallback reference
    }];

    // Calculate total
    const totalAmount = this.getField(receipt, 'payingAmount', 'PayingAmount', 'totalAmount', 'TotalAmount') || 0;
    const amountInWords = this.convertNumberToWords(totalAmount);

    const detailRows = rows.map((row, index) => `
      <tr>
        <td style="vertical-align: top;">${this.sanitize(this.getField(row, 'refDocNumber', 'RefDocNumber', 'itemCode', 'ItemCode') || '-')}</td>
        <td style="vertical-align: top;">${this.sanitize(this.getField(row, 'refDocName', 'description', 'itemId', 'ItemId'))}</td>
        <td style="text-align: right; vertical-align: top;">$ ${this.formatCurrency(this.getField(row, 'payingAmount', 'PayingAmount', 'totalPayingAmount', 'TotalPayingAmount'))}</td>
      </tr>
    `).join('');

    const customerAddress = this.sanitize(this.getField(receipt, 'address', 'Address') || this.getField(invoice, 'Address', 'address') || '');
    // Address formatting: try to break it up if nice, otherwise just show it.

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Receipt ${this.sanitize(this.getField(receipt, 'code', 'Code'))}</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #000; font-size: 12px; margin: 0; padding: 0; }
    .container { padding: 25px; }
    
    /* Header Section */
    .header-row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 25px; }
    .logo-section { display: flex; align-items: center; gap: 10px; }
    .logo-img { width: 60px; height: auto; }
    .receipt-title { font-size: 20px; font-weight: bold; text-transform: uppercase; line-height: 1.1; }
    
    .company-details { text-align: right; font-size: 10px; line-height: 1.3; }
    .company-name { font-weight: bold; font-size: 12px; text-transform: uppercase; margin-bottom: 2px; }
    
    .receipt-meta { display: flex; justify-content: flex-end; margin-top: 5px; }
    .meta-table { text-align: right; font-size: 12px; }
    .meta-table td { padding: 1px 0 1px 15px; }
    
    /* Customer Info */
    .customer-section { margin-bottom: 20px; margin-top: 10px; }
    .info-row { display: flex; margin-bottom: 6px; }
    .info-label { width: 100px; font-weight: bold; }
    .info-value { flex: 1; border-bottom: 1px solid #ddd; padding-bottom: 2px; }
    
    /* Main Table */
    .items-table { width: 100%; border-collapse: collapse; margin-top: 15px; margin-bottom: 15px; }
    .items-table th { text-align: left; border-bottom: 2px solid #000; padding: 6px 0; font-weight: bold; text-transform: uppercase; font-size: 11px; }
    .items-table td { padding: 8px 0; border: none; font-size: 12px; }
    .total-row td { border-top: 1.5px solid #000; border-bottom: 3px double #000; padding: 8px 0; font-weight: bold; font-size: 13px; }
    
    /* Words */
    .amount-words-row { display: flex; margin-top: 15px; margin-bottom: 30px; font-size: 12px; font-style: italic; }
    .words-label { width: 70px; font-weight: bold; font-style: normal; }
    .words-value { flex: 1; border-bottom: 1px solid #ddd; }
    
    /* Footer */
    .footer-row { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 40px; }
    .signature-line { width: 200px; border-top: 1px solid #000; padding-top: 5px; text-align: center; }
    .disclaimer { text-align: right; font-size: 10px; color: #444; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header-row">
      <div class="logo-section">
        ${logoBase64 ? `<img src="${logoBase64}" class="logo-img" alt="Logo" />` : ''}
        <div class="receipt-title">
          OFFICIAL<br>RECEIPT
        </div>
      </div>
      <div class="company-details">
        <div class="company-name">THE ORDER OF FRIARS MINOR (S) LTD</div>
        <div>Co & GST Reg No. 201016236M</div>
        <div>Franciscan Columbarium</div>
        <div>5 Bukit Batok East Avenue 2 Singapore 659918</div>
        <div>Tel: 6560-6361, HP: 9774-7053</div>
        
        <div class="receipt-meta">
          <table class="meta-table">
            <tr>
              <td>Receipt No:</td>
              <td><strong>${this.sanitize(this.getField(receipt, 'code', 'Code'))}</strong></td>
            </tr>
            <tr>
              <td>Date :</td>
              <td>${this.formatDate(this.getField(receipt, 'transactionDate', 'TransactionDate'))}</td>
            </tr>
          </table>
        </div>
      </div>
    </div>

    <div class="customer-section">
      <div class="info-row">
        <div class="info-label">Received From :</div>
        <div class="info-value"><strong>${this.sanitize(this.getField(receipt, 'customerName', 'CustomerName', 'payeeName', 'PayeeName'))}</strong></div>
      </div>
      <div class="info-row">
        <div class="info-label">Address:</div>
        <div class="info-value">${customerAddress}</div>
      </div>
    </div>

    <table class="items-table">
      <thead>
        <tr>
          <th style="width: 25%;">Invoice</th>
          <th style="width: 50%;">Description</th>
          <th style="width: 25%; text-align: right;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${detailRows}
        
        <tr class="total-row">
          <td></td>
          <td style="text-align: right; padding-right: 15px;">Total SGD:</td>
          <td style="text-align: right;">$ ${this.formatCurrency(totalAmount)}</td>
        </tr>
      </tbody>
    </table>

    <div class="amount-words-row">
      <div class="words-label">Dollars :</div>
      <div class="words-value">${amountInWords}</div>
    </div>

    <div class="footer-row">
      <div class="signature-section">
        <div class="signature-line">${paymentMode}</div>
        <div style="font-size: 10px; margin-top: 2px;">Payment Method</div>
      </div>
      <div class="disclaimer">
        The Order of Friars Minor (S) Ltd<br>
        <span style="font-size: 9px;">Computer generated, no signature required</span>
      </div>
    </div>
  </div>
</body>
</html>
    `;
  }

  buildInvoiceTemplate(invoice, logoBase64) {
    const details = invoice.details || [];

    // Fallback if no details
    if (details.length === 0) {
      // ...
    }

    const subTotal = details.reduce((sum, row) => sum + (Number(row.LineTotalAmount || row.TotalPayingAmount || row.amount || 0)), 0);
    const taxTotal = details.reduce((sum, row) => sum + (Number(row.LineTaxAmount || row.taxAmount || 0)), 0);
    const totalAmount = this.getField(invoice, 'TotalAmount', 'totalAmount') || (subTotal + taxTotal);

    // Amount in words
    const amountInWords = this.convertNumberToWords(totalAmount);

    const detailRows = details.map((row, index) => `
      <tr>
        <td style="vertical-align: top;">${this.sanitize(row.RefDocName || row.Description || row.itemName || '-')}</td>
        <td style="vertical-align: top;">${this.sanitize(row.RefDocNumber || row.reference || '-')}</td>
        <td style="text-align: center; vertical-align: top;">${this.sanitize(row.LineTaxPercent || row.taxPercent || 9.0)}</td>
        <td style="text-align: center; vertical-align: top;">${Number(row.Quantity || row.quantity || 1).toFixed(2)}</td>
        <td style="text-align: right; vertical-align: top;">$ ${this.formatCurrency(row.UnitAmount || row.unitPrice || 0)}</td>
        <td style="text-align: right; vertical-align: top;">$ ${this.formatCurrency(row.LineTotalAmount || row.totalPayingAmount || row.amount || 0)}</td>
      </tr>
    `).join('');

    const customerAddress = this.sanitize(this.getField(invoice, 'Address', 'address', 'customerAddress') || '');

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Tax Invoice ${this.sanitize(this.getField(invoice, 'Code', 'code', 'InvoiceNo', 'invoiceNo'))}</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #000; font-size: 13px; margin: 0; padding: 0; }
    .container { padding: 40px; }
    
    /* Header */
    .header-row { display: flex; justify-content: space-between; margin-bottom: 20px; }
    .logo-img { width: 80px; height: auto; border: 1px solid #000; padding: 2px; }
    .company-details { text-align: right; font-size: 11px; line-height: 1.4; }
    .company-name { font-weight: bold; font-size: 14px; text-transform: uppercase; margin-bottom: 4px; }
    
    /* Tax Invoice Label */
    .invoice-label-row { text-align: right; margin-bottom: 30px; }
    .invoice-label { display: inline-block; background: #000; color: #fff; padding: 4px 20px; font-weight: bold; font-size: 16px; text-transform: uppercase; }
    
    /* Customer & Invoice Info Grid */
    .info-grid { display: flex; justify-content: space-between; margin-bottom: 30px; }
    .bill-to-section { width: 50%; }
    .invoice-meta-section { width: 40%; }
    
    .meta-row { display: flex; justify-content: space-between; margin-bottom: 4px; }
    .meta-label { width: 100px; }
    .meta-value { text-align: right; font-weight: bold; }
    
    .customer-row { display: flex; margin-bottom: 4px; }
    .customer-label { width: 80px; }
    .customer-value { flex: 1; }
    
    /* Table */
    .items-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; border: 1px solid #000; }
    .items-table th { background: #000; color: #fff; padding: 6px; text-align: center; font-weight: normal; font-size: 12px; border-right: 1px solid #fff; }
    .items-table th:last-child { border-right: none; }
    .items-table td { padding: 8px; border-right: 1px solid #000; border-bottom: 1px solid #000; font-size: 12px; }
    .items-table td:last-child { border-right: none; }
    
    .totals-section { float: right; width: 300px; margin-bottom: 30px; }
    .total-row { display: flex; justify-content: space-between; margin-bottom: 6px; }
    .total-label { font-weight: bold; }
    .total-value { text-align: right; }
    
    .final-total { border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 6px 0; margin-top: 6px; font-weight: bold; font-size: 14px; }
    
    .clear { clear: both; }
    
    /* Words */
    .words-section { margin-bottom: 40px; font-size: 12px; }
    .words-row { display: flex; }
    .words-label { width: 60px; }
    .words-value { flex: 1; }
    .signature-note { margin-top: 10px; font-size: 10px; color: #333; }
    
    /* Footer / Payment Methods */
    .footer-section { margin-top: 40px; font-size: 11px; }
    .payment-title { font-weight: bold; margin-bottom: 6px; }
    .bank-details { font-weight: bold; }
    .note { margin-top: 10px; font-style: italic; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header-row">
      <div class="logo-section">
        ${logoBase64 ? `<img src="${logoBase64}" class="logo-img" alt="Logo" />` : ''}
      </div>
      <div class="company-details">
        <div class="company-name">THE ORDER OF FRIARS MINOR (S) LTD</div>
        <div>Co. & GST Reg. No. 201016236M</div>
        <div>Franciscan Columbarium</div>
        <div>5 Bukit Batok East Avenue 2, Singapore 659918</div>
        <div>Tel:6560-6361 HP:9774-7053</div>
        <div>Email:franciscan.columbarium@gmail.com</div>
      </div>
    </div>

    <div class="invoice-label-row">
      <span class="invoice-label">TAX INVOICE</span>
    </div>

    <div class="info-grid">
      <div class="bill-to-section">
        <div class="customer-row">
          <div class="customer-label">Name :</div>
          <div class="customer-value">${this.sanitize(this.getField(invoice, 'CustomerName', 'customerName', 'payeeName'))}</div>
        </div>
        <div class="customer-row">
          <div class="customer-label">Address :</div>
          <div class="customer-value">${customerAddress}</div>
        </div>
      </div>
      <div class="invoice-meta-section">
        <div class="meta-row">
          <div class="meta-label">Invoice No :</div>
          <div class="meta-value">${this.sanitize(this.getField(invoice, 'Code', 'code', 'InvoiceNo', 'invoiceNo'))}</div>
        </div>
        <div class="meta-row">
          <div class="meta-label">Date :</div>
          <div class="meta-value">${this.formatDate(this.getField(invoice, 'InvoiceDate', 'invoiceDate'))}</div>
        </div>
      </div>
    </div>

    <table class="items-table">
      <thead>
        <tr>
          <th style="width: 30%; text-align: left; padding-left: 8px;">Description</th>
          <th style="width: 25%; text-align: left; padding-left: 8px;">Reference No.</th>
          <th style="width: 10%;">GST %</th>
          <th style="width: 10%;">Qty</th>
          <th style="width: 12%;">Unit Price</th>
          <th style="width: 13%;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${detailRows}
      </tbody>
    </table>

    <div class="totals-section">
      <div class="total-row">
        <span class="total-label">Sub Total :</span>
        <span class="total-value">$ ${this.formatCurrency(subTotal)}</span>
      </div>
      <div class="total-row">
        <span class="total-label">GST Total :</span>
        <span class="total-value">$ ${this.formatCurrency(taxTotal)}</span>
      </div>
      <div class="total-row final-total">
        <span class="total-label">Total :</span>
        <span class="total-value">$ ${this.formatCurrency(totalAmount)}</span>
      </div>
    </div>
    
    <div class="clear"></div>

    <div class="words-section">
      <div class="words-row">
        <div class="words-label">Dollars :</div>
        <div class="words-value">${amountInWords}</div>
      </div>
      <div class="signature-note">This is a system generated invoice. No signature is required</div>
    </div>

    <div class="footer-section">
      <div class="payment-title">Payment by:</div>
      <div>1. Cash</div>
      <div>2. Cheque payable to: <span class="bank-details">The Order of Friars Minor (S) Ltd - Columbarium</span></div>
      <div>3. Internet transfer: <span class="bank-details">OFM - Col, Standard Chartered Bank</span></div>
      <div style="margin-left: 110px;"><span class="bank-details">A/c 07-1-006455-1</span></div>
      <div class="note">Please quote the invoice no. in the reference field</div>
    </div>
  </div>
</body>
</html>
    `;
  }
}

module.exports = ReceiptPdfService;

