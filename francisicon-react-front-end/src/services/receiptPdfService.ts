import jsPDF from 'jspdf';

interface ReceiptApiDetail {
  description?: string | null;
  quantity?: number | null;
  unitAmount?: number | null;
  lineTotalAmount?: number | null;
  refDocNumber?: string | string[] | null;
  refDocName?: string | string[] | null;
  itemId?: number | null;
  totalPayingAmount?: number | null;
}

// Helper function to convert number to words (for receipt amounts)
const numberToWords = (num: number): string => {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  if (num === 0) return 'Zero';

  const convertHundreds = (n: number): string => {
    if (n === 0) return '';
    if (n < 20) return ones[n];
    if (n < 100) {
      const ten = Math.floor(n / 10);
      const one = n % 10;
      return tens[ten] + (one > 0 ? ' ' + ones[one] : '');
    }
    const hundred = Math.floor(n / 100);
    const remainder = n % 100;
    return ones[hundred] + ' Hundred' + (remainder > 0 ? ' ' + convertHundreds(remainder) : '');
  };

  const convertThousands = (n: number): string => {
    if (n < 1000) return convertHundreds(n);
    const thousand = Math.floor(n / 1000);
    const remainder = n % 1000;
    return convertHundreds(thousand) + ' Thousand' + (remainder > 0 ? ' ' + convertHundreds(remainder) : '');
  };

  const wholePart = Math.floor(num);
  const decimalPart = Math.round((num - wholePart) * 100);
  let result = convertThousands(wholePart);

  if (decimalPart > 0) {
    const cents = decimalPart < 20 ? ones[decimalPart] :
      tens[Math.floor(decimalPart / 10)] + (decimalPart % 10 > 0 ? ' ' + ones[decimalPart % 10] : '');
    result += ', And ' + cents + ' Cents Only';
  } else {
    result += ' Only';
  }

  return result;
};

interface ReceiptApiPayload {
  receipt?: {
    receiptId?: number | null;
    code?: string | null;
    transactionDate?: string | null;
    customerName?: string | null;
    address?: string | null;
    customerAddress?: string | null;
    totalAmount?: number | null;
    payingAmount?: number | null;
    paymentMethod?: string | number | null;
    paymentModeDocNo?: string | null;
    status?: number | null;
    dollarsInWords?: string | null;
  };
  invoice?: {
    invoiceId?: number | null;
    code?: string | null;
    invoiceNo?: string | null;
    transactionDate?: string | null;
    invoiceDate?: string | null;
    customerName?: string | null;
    address?: string | null;
    customerAddress?: string | null;
    totalAmount?: number | null;
    payingAmount?: number | null;
    taxAmount?: number | null;
    paymentMethod?: string | number | null;
    paymentModeDocNo?: string | null;
    details?: ReceiptApiDetail[];
  };
  details?: ReceiptApiDetail[];
}

interface ReceiptPdfOptions {
  requestedCode?: string;
  applicationCode?: string;
  churchInfo?: {
    name?: string;
    address?: string;
    phone?: string;
    email?: string;
    registrationNo?: string;
  };
}

const PAYMENT_MODE_MAP: Record<string, string> = {
  '1': 'Cash',
  '2': 'Cheque',
  '3': 'Bank Transfer',
  '4': 'Credit Card',
  '5': 'Online Payment',
  TT: 'Telegraphic Transfer',
  CASH: 'Cash',
  CHEQUE: 'Cheque',
  BANK: 'Bank Transfer',
};

const formatCurrency = (value?: number | null): string => {
  const numeric = typeof value === 'number' ? value : Number(value ?? 0);
  return numeric.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const escapeHtml = (value: string | undefined | null): string => {
  if (!value) return '';
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

const formatDate = (value?: string | null): string => {
  if (!value) return 'N/A';
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    // Format as DD MMM YYYY (standard requirement)
    const day = String(date.getDate()).padStart(2, '0');
    const month = date.toLocaleDateString('en-GB', { month: 'short' }).toUpperCase();
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  } catch {
    return value;
  }
};

const resolvePaymentMode = (value?: string | number | null): string => {
  if (value === null || value === undefined || value === '') return 'N/A';
  const key = String(value).toUpperCase();
  return PAYMENT_MODE_MAP[key] || String(value);
};

const normalizeRefField = (value?: string | string[] | null): string => {
  if (!value) return '';
  if (Array.isArray(value)) {
    return value.filter(Boolean).join(' / ');
  }
  return value;
};

const collectLineItems = (payload: ReceiptApiPayload): Array<{
  description: string;
  quantity: number;
  unitAmount: number;
  total: number;
}> => {
  const items = payload.invoice?.details ?? payload.details ?? [];
  if (!Array.isArray(items) || items.length === 0) {
    return [];
  }

  return items.map((item, index) => {
    const descriptionParts: string[] = [];
    const refName = normalizeRefField(item.refDocName);
    const refNumber = normalizeRefField(item.refDocNumber);

    if (refName) descriptionParts.push(refName);
    if (refNumber) descriptionParts.push(refNumber);
    if (!descriptionParts.length && item.itemId) {
      descriptionParts.push(`Item ${item.itemId}`);
    }

    const description = descriptionParts.join(' • ') || `Item ${index + 1}`;
    const quantity = item.quantity ?? 1;
    const unitAmount = item.unitAmount ?? (item.lineTotalAmount ?? 0);
    const total = item.lineTotalAmount ?? unitAmount * quantity;

    return {
      description,
      quantity,
      unitAmount,
      total,
    };
  });
};

const addKeyValueRow = (
  doc: jsPDF,
  label: string,
  value: string,
  x: number,
  y: number,
  labelWidth = 35
) => {
  doc.setFont('helvetica', 'bold');
  doc.text(`${label}:`, x, y);
  doc.setFont('helvetica', 'normal');
  doc.text(value || 'N/A', x + labelWidth, y);
};

const generateReceiptHtmlTemplate = (payload: ReceiptApiPayload, options: ReceiptPdfOptions = {}): string => {
  // Resolve core data
  const receiptInfo = payload.receipt ?? {};
  const invoiceInfo = payload.invoice ?? {};
  const currentTotal = receiptInfo.payingAmount ?? receiptInfo.totalAmount ?? invoiceInfo.payingAmount ?? invoiceInfo.totalAmount ?? 0;

  // Resolve church information
  const church = {
    name: (options.churchInfo?.name || 'THE ORDER OF FRIARS MINOR (S) LTD').toUpperCase(),
    registrationNo: options.churchInfo?.registrationNo || '201016236M',
    address: (options.churchInfo?.address || '5 Bukit Batok East Avenue 2, Singapore 659918').toUpperCase(),
    phone: options.churchInfo?.phone || '6560-6361, HP: 9774-7053',
    email: options.churchInfo?.email || 'franciscan.columbarium@gmail.com'
  };

  // Format data
  const safeReceiptNo = escapeHtml(receiptInfo.code || options.requestedCode || 'N/A');
  const safeReceiptDate = formatDate(receiptInfo.transactionDate || invoiceInfo.transactionDate);
  const safeCustomerName = escapeHtml(receiptInfo.customerName || invoiceInfo.customerName || 'N/A').toUpperCase();
  const safeAddress = escapeHtml(receiptInfo.customerAddress || invoiceInfo.customerAddress || 'N/A').toUpperCase();
  const safeInvoiceNo = escapeHtml(invoiceInfo.invoiceNo || invoiceInfo.code || '');

  // Resolve summary description
  const invoiceDetails = payload.invoice?.details ?? payload.details ?? [];
  const description = invoiceDetails.length > 0
    ? (normalizeRefField(invoiceDetails[0].refDocName) || invoiceDetails[0].description || 'PAYMENT RECEIVED')
    : 'PAYMENT RECEIVED';
  const safeDescription = escapeHtml(description).toUpperCase();

  const safeDollarsInWords = escapeHtml(receiptInfo.dollarsInWords || '').toUpperCase();
  const safePaymentMethod = escapeHtml(resolvePaymentMode(receiptInfo.paymentMethod)).toUpperCase();
  const safePaymentModeDocNo = escapeHtml(receiptInfo.paymentModeDocNo || '');

  const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8" />
    <style>
        @page { size: A4; margin: 0; }
        body { font-family: Arial, sans-serif; margin: 0; padding: 40px; color: #000; line-height: 1.2; }
        .receipt-container { background: white; width: 100%; max-width: 800px; margin: 0 auto; }
        .header-section { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; }
        .receipt-title-box { display: flex; align-items: center; gap: 20px; }
        .receipt-title { font-size: 32px; font-weight: bold; letter-spacing: 2px; line-height: 1; }
        .church-info { text-align: right; font-size: 11px; line-height: 1.3; font-weight: normal; }
        .church-name { font-size: 16px; font-weight: bold; margin-bottom: 2px; }
        
        .receipt-meta { margin-top: 20px; text-align: right; }
        .meta-table { display: inline-block; border-collapse: collapse; font-size: 13px; }
        .meta-table td { padding: 2px 0; }
        .meta-label { text-align: right; padding-right: 15px; }
        .meta-value { font-weight: bold; width: 120px; text-align: left; }

        .client-section { margin: 30px 0; font-size: 14px; }
        .client-row { display: flex; margin-bottom: 8px; }
        .client-label { width: 120px; font-weight: bold; }
        .client-value { font-weight: bold; text-transform: uppercase; }

        .details-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        .details-table th { border-bottom: 2px solid #000; text-align: left; padding: 8px 5px; font-size: 14px; }
        .details-table td { padding: 15px 5px; font-size: 14px; vertical-align: top; }
        .text-right { text-align: right; }
        
        .total-section { display: flex; justify-content: flex-end; margin-top: 25px; }
        .total-box { width: 160px; text-align: right; }
        .total-label { font-size: 11px; font-weight: bold; margin-bottom: 5px; }
        .total-amount { font-size: 18px; font-weight: bold; border-top: 2px solid #000; padding: 5px 0; margin-bottom: 2px; }
        .total-double-line { border-top: 4px double #000; height: 1px; }

        .summary-section { margin-top: 30px; font-size: 14px; }
        .summary-row { display: flex; gap: 10px; margin-bottom: 12px; }
        .summary-label { font-weight: bold; min-width: 140px; }
        .summary-value { text-transform: uppercase; font-style: italic; }

        .footer-section { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 60px; }
        .generated-note { font-size: 10px; font-weight: bold; }
        .signature-box { width: 350px; text-align: right; font-size: 13px; }
        .signature-for { font-weight: bold; margin-bottom: 50px; }
        .signature-line { border-top: 1px solid #000; padding-top: 5px; font-size: 10px; color: #444; font-style: italic; }
    </style>
</head>
<body>
    <div class="receipt-container">
        <div class="header-section">
            <div class="receipt-title-box">
                <img src="https://franciscan-columbarium.sg/assets/frontend/images/logo.png" style="width: 80px; height: 80px;" />
                <div>
                    <div class="receipt-title">OFFICIAL</div>
                    <div class="receipt-title">RECEIPT</div>
                </div>
            </div>
            <div class="church-info">
                <div class="church-name">${church.name}</div>
                <div>CO & GST REG NO. ${escapeHtml(church.registrationNo)}</div>
                <div>${church.address}</div>
                <div>TEL: ${escapeHtml(church.phone)}</div>
                <div>${escapeHtml(church.email)}</div>
            </div>
        </div>

        <div class="receipt-meta">
            <table class="meta-table">
                <tr><td class="meta-label">Receipt No:</td><td class="meta-value">${safeReceiptNo}</td></tr>
                <tr><td class="meta-label">Date:</td><td class="meta-value">${safeReceiptDate}</td></tr>
            </table>
        </div>

        <div class="client-section">
            <div class="client-row">
                <span class="client-label">Received From :</span>
                <span class="client-value">${safeCustomerName}</span>
            </div>
            <div class="client-row">
                <span class="client-label">Address :</span>
                <span class="client-value" style="font-weight: normal; line-height: 1.4;">${safeAddress}</span>
            </div>
        </div>

        <table class="details-table">
            <thead>
                <tr>
                    <th style="width: 70%;">DESCRIPTION</th>
                    <th style="width: 30%; text-align: right;">AMOUNT (SGD)</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>
                        <div style="font-weight: bold; font-size: 15px;">${safeDescription}</div>
                        ${safeInvoiceNo ? `<div style="font-size: 11px; margin-top: 5px;">INVOICE NO: ${safeInvoiceNo}</div>` : ''}
                    </td>
                    <td class="text-right" style="font-weight: bold; font-size: 16px;">
                        ${formatCurrency(currentTotal)}
                    </td>
                </tr>
            </tbody>
        </table>

        <div class="total-section">
            <div class="total-box">
                <div class="total-label">TOTAL SGD</div>
                <div class="total-amount">${formatCurrency(currentTotal)}</div>
                <div class="total-double-line"></div>
            </div>
        </div>

        <div class="summary-section">
            <div class="summary-row">
                <span class="summary-label">THE SUM OF SGD :</span>
                <span class="summary-value">${safeDollarsInWords} ONLY</span>
            </div>
            <div class="summary-row">
                <span class="summary-label">PAYMENT BY :</span>
                <span class="summary-value" style="font-style: normal;">${safePaymentMethod}${safePaymentModeDocNo ? ` (${safePaymentModeDocNo})` : ''}</span>
            </div>
        </div>

        <div class="footer-section">
            <div class="generated-note">
                Computer Generated Receipt - No Signature Required
            </div>
            <div class="signature-box">
                <div class="signature-for">FOR ${church.name}</div>
                <div class="signature-line">Authorized Signature</div>
            </div>
        </div>
    </div>
</body>
</html>`;

  return html;
};

// Generate receipt PDF content using HTML template (optimized similar to invoice)
const generateReceiptPdfContent = async (payload: ReceiptApiPayload, options: ReceiptPdfOptions = {}): Promise<Blob> => {
  let element: HTMLDivElement | null = null;

  try {
    console.log('[generateReceiptPdfContent] Starting receipt PDF generation...');
    const startTime = Date.now();

    // Generate HTML template
    const htmlContent = generateReceiptHtmlTemplate(payload, options);

    // Create a temporary element with the HTML content
    element = document.createElement('div');
    element.innerHTML = htmlContent;
    element.style.position = 'absolute';
    element.style.left = '-9999px';
    element.style.top = '0';
    element.style.width = '850px';
    element.style.backgroundColor = '#fff';
    document.body.appendChild(element);

    // Wait a bit for styles to apply
    await new Promise(resolve => setTimeout(resolve, 100));

    // Use optimized html2canvas settings for better performance
    const html2canvas = (await import('html2canvas')).default;
    console.log('[generateReceiptPdfContent] Starting html2canvas conversion...');

    const canvas = await html2canvas(element, {
      scale: 1.5, // Reduced from 2 for better performance
      useCORS: true,
      logging: false,
      width: 850,
      height: element.scrollHeight,
      windowWidth: 850,
      backgroundColor: '#ffffff',
      removeContainer: false,
      allowTaint: false,
      imageTimeout: 15000
    });

    console.log('[generateReceiptPdfContent] Canvas created, converting to PDF...');
    const canvasTime = Date.now() - startTime;

    const imgData = canvas.toDataURL('image/jpeg', 0.95); // Use JPEG for smaller size
    const pdfDoc = new jsPDF({
      unit: 'mm',
      format: 'a4',
      orientation: 'portrait',
      compress: true
    });

    const imgWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;

    pdfDoc.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdfDoc.addPage();
      pdfDoc.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    const blob = pdfDoc.output('blob');
    const totalTime = Date.now() - startTime;
    console.log(`[generateReceiptPdfContent] Receipt PDF generated successfully in ${totalTime} ms(canvas: ${canvasTime}ms, blob size: ${(blob.size / 1024).toFixed(2)}KB)`);

    // Clean up temporary element
    if (element && element.parentNode) {
      document.body.removeChild(element);
    }
    element = null;

    return blob;
  } catch (error) {
    console.error('[generateReceiptPdfContent] Error generating receipt PDF from HTML:', error);

    // Clean up element if it exists
    if (element && element.parentNode) {
      document.body.removeChild(element);
    }

    // Fallback to jsPDF if html2canvas fails
    console.log('[generateReceiptPdfContent] Falling back to jsPDF direct generation...');
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const receiptInfo = payload.receipt ?? {};
    const invoiceInfo = payload.invoice ?? {};
    const receiptCode = receiptInfo.code || options.requestedCode || 'N/A';
    const customerName = receiptInfo.customerName || invoiceInfo.customerName || 'N/A';
    const totalAmount = receiptInfo.payingAmount ?? receiptInfo.totalAmount ?? invoiceInfo.payingAmount ?? invoiceInfo.totalAmount ?? 0;

    doc.setFontSize(12);
    doc.text('OFFICIAL RECEIPT', 105, 20, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`Receipt No: ${receiptCode} `, 18, 40);
    doc.text(`Date: ${formatDate(receiptInfo.transactionDate || invoiceInfo.transactionDate)} `, 18, 50);
    doc.text(`Received From: ${customerName} `, 18, 60);
    doc.text(`Total: $${formatCurrency(totalAmount)} `, 18, 80);

    return doc.output('blob');
  }
};

export const receiptPdfService = {
  generateReceiptPdf: async (
    payload: ReceiptApiPayload,
    options: ReceiptPdfOptions = {}
  ): Promise<Blob> => {
    const RECEIPT_PDF_GENERATION_TIMEOUT = 45000; // 45 seconds timeout

    try {
      console.log('[generateReceiptPdf] Starting receipt PDF generation with timeout protection...');

      // Create a timeout promise
      const timeoutPromise = new Promise<Blob>((_, reject) => {
        setTimeout(() => {
          reject(new Error('Receipt PDF generation timed out. The receipt is taking longer than expected to generate. Please try again.'));
        }, RECEIPT_PDF_GENERATION_TIMEOUT);
      });

      // Race between PDF generation and timeout
      const pdfPromise = generateReceiptPdfContent(payload, options);

      const blob = await Promise.race([pdfPromise, timeoutPromise]);
      console.log('[generateReceiptPdf] Receipt PDF generation completed successfully');
      return blob;
    } catch (error: any) {
      console.error('[generateReceiptPdf] Error generating receipt PDF blob:', error);

      // If timeout, provide helpful message
      if (error.message?.includes('timed out')) {
        throw new Error('Receipt PDF generation is taking too long. This may be due to a large receipt or slow browser performance. Please try again or contact support.');
      }

      throw error;
    }
  },

  /**
   * Generate the receipt HTML template only (for on-screen viewing, e.g. in a modal iframe),
   * reusing the exact same layout as the PDF generator.
   */
  generateReceiptHtml: (payload: ReceiptApiPayload, options: ReceiptPdfOptions = {}): string => {
    return generateReceiptHtmlTemplate(payload, options);
  },

  // Generate INVOICE PDF from receipt/invoice API payload (different UI from receipt)
  generateInvoicePdf: async (
    rawPayload: any,
    options: ReceiptPdfOptions = {}
  ): Promise<Blob> => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 18;
    let y = margin;

    const payload = rawPayload as any;

    const invoiceNo =
      payload.InvoiceNo ||
      payload.Code ||
      (payload.invoice && (payload.invoice.invoiceNo || payload.invoice.code)) ||
      options.requestedCode ||
      'N/A';

    const invoiceDate = formatDate(
      payload.InvoiceDate || payload.TransactionDate || payload.invoice?.invoiceDate
    );

    const customerName =
      payload.CustomerName ||
      payload.receipt?.customerName ||
      payload.invoice?.customerName ||
      'N/A';

    const customerAddress =
      payload.CustomerAddress ||
      payload.Address ||
      payload.receipt?.customerAddress ||
      payload.invoice?.customerAddress ||
      'N/A';

    const totalAmount =
      payload.TotalAmount ||
      payload.PayingAmount ||
      payload.invoice?.totalAmount ||
      payload.receipt?.payingAmount ||
      0;

    const taxAmount = payload.TaxAmount || payload.invoice?.taxAmount || 0;
    const subtotal = totalAmount - taxAmount;

    // Church Info
    const church = {
      name: options.churchInfo?.name || 'THE ORDER OF FRIARS MINOR (S) LTD',
      registrationNo: options.churchInfo?.registrationNo || '201016236M',
      address: options.churchInfo?.address || '5 Bukit Batok East Avenue 2, Singapore 659918',
      phone: options.churchInfo?.phone || '6560-6361',
      email: options.churchInfo?.email || 'franciscan.columbarium@gmail.com'
    };

    // Header section
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(church.name.toUpperCase(), pageWidth / 2, y, { align: 'center' });

    y += 7;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`CO & GST REG NO. ${church.registrationNo}`, pageWidth / 2, y, { align: 'center' });

    y += 5;
    doc.text(church.address, pageWidth / 2, y, { align: 'center' });

    y += 5;
    doc.text(`TEL: ${church.phone}  EMAIL: ${church.email}`, pageWidth / 2, y, { align: 'center' });

    y += 15;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('INVOICE', pageWidth / 2, y, { align: 'center' });

    y += 15;
    addKeyValueRow(doc, 'Invoice No', invoiceNo, margin, y);
    addKeyValueRow(doc, 'Date', invoiceDate, pageWidth - margin - 60, y);

    y += 15;
    doc.setFont('helvetica', 'bold');
    doc.text('Bill To:', margin, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    const splitName = doc.splitTextToSize(customerName, pageWidth - (margin * 2));
    doc.text(splitName, margin, y);
    y += (splitName.length * 5);
    const splitAddress = doc.splitTextToSize(customerAddress, pageWidth - (margin * 2));
    doc.text(splitAddress, margin, y);

    y += (splitAddress.length * 5) + 10;

    // Table Header
    doc.setDrawColor(0);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 7;
    doc.setFont('helvetica', 'bold');
    doc.text('Description', margin + 2, y);
    doc.text('Amount (SGD)', pageWidth - margin - 2, y, { align: 'right' });
    y += 3;
    doc.line(margin, y, pageWidth - margin, y);

    // Table Content
    const items = collectLineItems(payload);
    y += 10;
    doc.setFont('helvetica', 'normal');

    if (items.length > 0) {
      items.forEach(item => {
        const splitDesc = doc.splitTextToSize(item.description.toUpperCase(), pageWidth - margin * 2 - 40);
        doc.text(splitDesc, margin + 2, y);
        doc.text(formatCurrency(item.total), pageWidth - margin - 2, y, { align: 'right' });
        y += (splitDesc.length * 6) + 2;
      });
    } else {
      doc.text('PAYMENT RECEIVED', margin + 2, y);
      doc.text(formatCurrency(totalAmount), pageWidth - margin - 2, y, { align: 'right' });
      y += 10;
    }

    // Totals
    y += 10;
    doc.line(pageWidth - margin - 60, y, pageWidth - margin, y);
    y += 7;
    doc.text('Subtotal:', pageWidth - margin - 60, y);
    doc.text(formatCurrency(subtotal), pageWidth - margin - 2, y, { align: 'right' });

    y += 6;
    doc.text('GST:', pageWidth - margin - 60, y);
    doc.text(formatCurrency(taxAmount), pageWidth - margin - 2, y, { align: 'right' });

    y += 6;
    doc.setFont('helvetica', 'bold');
    doc.text('Total Amount:', pageWidth - margin - 60, y);
    doc.text(formatCurrency(totalAmount), pageWidth - margin - 2, y, { align: 'right' });
    y += 2;
    doc.line(pageWidth - margin - 60, y, pageWidth - margin, y);
    y += 1;
    doc.line(pageWidth - margin - 60, y, pageWidth - margin, y);

    return doc.output('blob');
  },
};
