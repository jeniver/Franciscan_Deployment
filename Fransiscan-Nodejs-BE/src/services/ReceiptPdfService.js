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

  async renderPdf(html, filePath) {
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
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

    const html = this.buildReceiptTemplate({
      receipt,
      invoice,
      details
    });

    await this.renderPdf(html, filePath);

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

    const html = this.buildInvoiceTemplate(invoice);
    await this.renderPdf(html, filePath);

    logger.info(`Generated invoice PDF: ${fileName}`);

    return {
      fileName,
      filePath,
      publicPath: this.buildPublicPath(filePath),
      generatedAt: new Date().toISOString()
    };
  }

  buildReceiptTemplate({ receipt, invoice, details }) {
    const paymentMode = Receipt.paymentModeToString(
      this.getField(receipt, 'paymentMode', 'PaymentMode')
    );
    const rows = (details || []).length > 0 ? details : [{
      description: this.getField(invoice, 'Description', 'description') || 'Receipt Item',
      payingAmount: this.getField(receipt, 'payingAmount', 'PayingAmount'),
      quantity: 1
    }];

    const detailRows = rows.map((row, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${this.sanitize(this.getField(row, 'refDocName', 'description', 'itemId', 'ItemId'))}</td>
        <td>${this.sanitize(this.getField(row, 'refDocNumber', 'RefDocNumber', 'itemCode', 'ItemCode') || '-')}</td>
        <td>${this.sanitize(this.getField(row, 'quantity', 'Quantity') || 1)}</td>
        <td class="text-right">${this.formatCurrency(this.getField(row, 'payingAmount', 'PayingAmount', 'totalPayingAmount', 'TotalPayingAmount'))}</td>
      </tr>
    `).join('');

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Receipt ${this.sanitize(this.getField(receipt, 'code', 'Code'))}</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #1f2a37; font-size: 13px; margin: 0; padding: 0; }
    .container { padding: 24px; }
    .header { text-align: center; margin-bottom: 32px; }
    .header h1 { margin-bottom: 4px; }
    .summary { display: flex; justify-content: space-between; margin-bottom: 24px; }
    .summary-section { width: 48%; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; }
    .summary-section h3 { margin-top: 0; margin-bottom: 16px; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; color: #475569; }
    .summary-row { display: flex; justify-content: space-between; margin-bottom: 8px; }
    .summary-label { color: #64748b; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    th { text-align: left; padding: 12px; background: #1f2937; color: #fff; font-size: 12px; }
    td { padding: 12px; border-bottom: 1px solid #e2e8f0; }
    .text-right { text-align: right; }
    .totals { margin-top: 24px; text-align: right; }
    .totals div { margin-bottom: 8px; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 12px; background: #e2e8f0; color: #475569; font-size: 11px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Receipt</h1>
      <div>Receipt #${this.sanitize(this.getField(receipt, 'code', 'Code'))}</div>
    </div>

    <div class="summary">
      <div class="summary-section">
        <h3>Receipt Info</h3>
        <div class="summary-row">
          <span class="summary-label">Date</span>
          <span>${this.formatDate(this.getField(receipt, 'transactionDate', 'TransactionDate'))}</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">Payment Mode</span>
          <span><span class="badge">${paymentMode}</span></span>
        </div>
        <div class="summary-row">
          <span class="summary-label">Document No.</span>
          <span>${this.sanitize(this.getField(receipt, 'paymentModeDocNo', 'PaymentModeDocNo') || '-')}</span>
        </div>
      </div>
      <div class="summary-section">
        <h3>Customer</h3>
        <div class="summary-row">
          <span class="summary-label">Name</span>
          <span>${this.sanitize(this.getField(receipt, 'customerName', 'CustomerName', 'payeeName', 'PayeeName'))}</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">Address</span>
          <span>${this.sanitize(this.getField(receipt, 'address', 'Address') || this.getField(invoice, 'Address', 'address') || '-')}</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">Invoice</span>
          <span>${this.sanitize(this.getField(invoice, 'Code', 'code', 'InvoiceNo', 'invoiceNo') || '-')}</span>
        </div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width: 60px;">#</th>
          <th>Description</th>
          <th>Reference</th>
          <th>Qty</th>
          <th class="text-right">Amount (SGD)</th>
        </tr>
      </thead>
      <tbody>
        ${detailRows}
      </tbody>
    </table>

    <div class="totals">
      <div><strong>Paying Amount:</strong> SGD ${this.formatCurrency(this.getField(receipt, 'payingAmount', 'PayingAmount', 'totalAmount', 'TotalAmount'))}</div>
      <div><strong>Outstanding:</strong> SGD ${this.formatCurrency(this.getField(receipt, 'outstandingAmount', 'OutstandingAmount'))}</div>
    </div>
  </div>
</body>
</html>
    `;
  }

  buildInvoiceTemplate(invoice) {
    const details = invoice.details || [];
    const totalAmount = details.reduce((sum, row) => sum + (Number(row.LineTotalAmount || row.TotalPayingAmount || 0)), 0);
    const detailRows = details.map((row, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${this.sanitize(row.RefDocName || row.Description || '-')}</td>
        <td>${this.sanitize(row.RefDocNumber || '-')}</td>
        <td>${this.sanitize(row.Quantity || 1)}</td>
        <td class="text-right">${this.formatCurrency(row.UnitAmount || row.TotalPayingAmount)}</td>
        <td class="text-right">${this.formatCurrency(row.LineTotalAmount || row.TotalPayingAmount)}</td>
      </tr>
    `).join('');

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Invoice ${this.sanitize(this.getField(invoice, 'Code', 'code', 'InvoiceNo', 'invoiceNo'))}</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #111827; font-size: 13px; margin: 0; padding: 0; }
    .container { padding: 32px; }
    .header { text-align: center; margin-bottom: 32px; }
    .header h1 { margin-bottom: 6px; }
    .info { display: flex; justify-content: space-between; margin-bottom: 24px; }
    .info-section { width: 48%; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; }
    .info-section h3 { margin-top: 0; font-size: 14px; text-transform: uppercase; letter-spacing: 0.08em; color: #6b7280; }
    .info-row { margin-bottom: 10px; }
    .label { color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; display: block; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    th { text-align: left; padding: 12px; background: #111827; color: #fff; font-size: 12px; }
    td { padding: 12px; border-bottom: 1px solid #e5e7eb; }
    .text-right { text-align: right; }
    .totals { margin-top: 24px; text-align: right; }
    .totals div { margin-bottom: 8px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Invoice</h1>
      <div>Invoice #${this.sanitize(this.getField(invoice, 'Code', 'code', 'InvoiceNo', 'invoiceNo'))}</div>
    </div>

    <div class="info">
      <div class="info-section">
        <h3>Bill To</h3>
        <div class="info-row">
          <span class="label">Customer</span>
          <span>${this.sanitize(this.getField(invoice, 'CustomerName', 'customerName') || '-')}</span>
        </div>
        <div class="info-row">
          <span class="label">Address</span>
          <span>${this.sanitize(this.getField(invoice, 'Address', 'address') || '-')}</span>
        </div>
      </div>
      <div class="info-section">
        <h3>Invoice Info</h3>
        <div class="info-row">
          <span class="label">Date</span>
          <span>${this.formatDate(this.getField(invoice, 'InvoiceDate', 'invoiceDate', 'CreatedDate', 'createdDate'))}</span>
        </div>
        <div class="info-row">
          <span class="label">Due Date</span>
          <span>${this.formatDate(this.getField(invoice, 'DueDate', 'dueDate'))}</span>
        </div>
        <div class="info-row">
          <span class="label">Reference</span>
          <span>${this.sanitize(this.getField(invoice, 'RefDocNumber', 'refDocNumber') || '-')}</span>
        </div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width: 50px;">#</th>
          <th>Description</th>
          <th>Reference</th>
          <th>Qty</th>
          <th class="text-right">Unit</th>
          <th class="text-right">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${detailRows}
      </tbody>
    </table>

    <div class="totals">
      <div><strong>Subtotal:</strong> SGD ${this.formatCurrency(totalAmount)}</div>
      <div><strong>Tax:</strong> SGD ${this.formatCurrency(this.getField(invoice, 'TaxAmount', 'taxAmount'))}</div>
      <div><strong>Total:</strong> SGD ${this.formatCurrency(this.getField(invoice, 'TotalAmount', 'totalAmount', totalAmount))}</div>
      <div><strong>Paid:</strong> SGD ${this.formatCurrency(this.getField(invoice, 'ReceiptAmount', 'receiptAmount'))}</div>
      <div><strong>Balance:</strong> SGD ${this.formatCurrency(
        (this.getField(invoice, 'TotalAmount', 'totalAmount', totalAmount) || 0) -
        (this.getField(invoice, 'ReceiptAmount', 'receiptAmount') || 0)
      )}</div>
    </div>
  </div>
</body>
</html>
    `;
  }
}

module.exports = ReceiptPdfService;

