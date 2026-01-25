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
    totalAmount?: number | null;
    payingAmount?: number | null;
    paymentMode?: string | number | null;
    paymentModeDocNo?: string | null;
    status?: number | null;
  };
  invoice?: {
    invoiceId?: number | null;
    code?: string | null;
    invoiceNo?: string | null;
    transactionDate?: string | null;
    invoiceDate?: string | null;
    customerName?: string | null;
    totalAmount?: number | null;
    payingAmount?: number | null;
    taxAmount?: number | null;
    paymentMode?: string | number | null;
    paymentModeDocNo?: string | null;
    details?: ReceiptApiDetail[];
  };
  details?: ReceiptApiDetail[];
}

interface ReceiptPdfOptions {
  requestedCode?: string;
  applicationCode?: string;
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

const formatDate = (value?: string | null): string => {
  if (!value) return 'N/A';
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    // Format as DD-MMM-YY (e.g., 03-Oct-25)
    const day = String(date.getDate()).padStart(2, '0');
    const month = date.toLocaleDateString('en-GB', { month: 'short' });
    const year = String(date.getFullYear()).slice(-2);
    return `${day}-${month}-${year}`;
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

// Generate receipt HTML template based on the provided template
const generateReceiptHtmlTemplate = (payload: ReceiptApiPayload, options: ReceiptPdfOptions = {}): string => {
  console.log('[generateReceiptHtmlTemplate] Payload:', JSON.stringify(payload, null, 2));
  
  const receiptInfo = payload.receipt ?? {};
  const invoiceInfo = payload.invoice ?? {};
  
  // Extract data
  const receiptNo = receiptInfo.code || options.requestedCode || 'N/A';
  const receiptDate = formatDate(receiptInfo.transactionDate || invoiceInfo.transactionDate || invoiceInfo.invoiceDate);
  const customerName = receiptInfo.customerName || invoiceInfo.customerName || 'N/A';
  const address = payload.invoice?.details?.[0]?.refDocName || normalizeRefField(payload.details?.[0]?.refDocName) || '';
  
  // Get line items
  const lineItems = collectLineItems(payload);
  
  // Calculate total amount - try multiple sources
  let totalAmount = 0;
  if (typeof receiptInfo.payingAmount === 'number' && receiptInfo.payingAmount > 0) {
    totalAmount = receiptInfo.payingAmount;
  } else if (typeof receiptInfo.totalAmount === 'number' && receiptInfo.totalAmount > 0) {
    totalAmount = receiptInfo.totalAmount;
  } else if (typeof invoiceInfo.payingAmount === 'number' && invoiceInfo.payingAmount > 0) {
    totalAmount = invoiceInfo.payingAmount;
  } else if (typeof invoiceInfo.totalAmount === 'number' && invoiceInfo.totalAmount > 0) {
    totalAmount = invoiceInfo.totalAmount;
  } else if (lineItems.length > 0) {
    // Calculate from line items as fallback
    totalAmount = lineItems.reduce((sum, item) => sum + (item.total || 0), 0);
  }
  
  console.log('[generateReceiptHtmlTemplate] Calculated totalAmount:', totalAmount, {
    receiptPayingAmount: receiptInfo.payingAmount,
    receiptTotalAmount: receiptInfo.totalAmount,
    invoicePayingAmount: invoiceInfo.payingAmount,
    invoiceTotalAmount: invoiceInfo.totalAmount,
    lineItemsTotal: lineItems.reduce((sum, item) => sum + (item.total || 0), 0)
  });
  
  const totalInWords = numberToWords(totalAmount);
  const paymentMode = resolvePaymentMode(receiptInfo.paymentMode || invoiceInfo.paymentMode);
  
  // Get invoice details from payload for table rows
  const invoiceDetails = payload.invoice?.details ?? payload.details ?? [];
  
  // Build table rows
  let tableRows = '';
  if (invoiceDetails.length > 0) {
    tableRows = invoiceDetails.map((detail: any) => {
      const invoiceNo = normalizeRefField(detail.refDocNumber) || invoiceInfo.invoiceNo || invoiceInfo.code || '';
      const description = normalizeRefField(detail.refDocName) || detail.description || '';
      // Calculate amount from detail - use lineTotalAmount first, then totalAmount, or calculate from unit*quantity
      const amount = detail.lineTotalAmount ?? detail.totalAmount ?? (detail.unitAmount && detail.quantity ? detail.unitAmount * detail.quantity : totalAmount);
      return `
        <tr>
          <td>${invoiceNo}</td>
          <td>${description}</td>
          <td style="text-align: right;">$ ${formatCurrency(amount)}</td>
        </tr>
      `;
    }).join('');
  } else if (lineItems.length > 0) {
    // Use line items if available
    tableRows = lineItems.map((item) => {
      const invoiceNo = invoiceInfo.invoiceNo || invoiceInfo.code || '';
      const description = item.description || 'Payment received';
      const amount = item.total || 0;
      return `
        <tr>
          <td>${invoiceNo}</td>
          <td>${description}</td>
          <td style="text-align: right;">$ ${formatCurrency(amount)}</td>
        </tr>
      `;
    }).join('');
  } else {
    // If no line items, show default row
    tableRows = `
      <tr>
        <td>${normalizeRefField(invoiceInfo.invoiceNo || invoiceInfo.code)}</td>
        <td>${normalizeRefField(payload.invoice?.details?.[0]?.refDocName) || 'Payment received'}</td>
        <td style="text-align: right;">$ ${formatCurrency(totalAmount)}</td>
      </tr>
    `;
  }
  
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Official Receipt - ${receiptNo}</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { 
            font-family: Arial, sans-serif; 
            color: #000; 
            background: #fff;
            max-width: 850px; 
            margin: 20px auto; 
            padding: 40px 50px; 
            border: 2px solid #333;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
        }
        .header { 
            display: flex; 
            justify-content: space-between; 
            align-items: flex-start; 
            margin-bottom: 40px; 
            padding-bottom: 20px;
            border-bottom: 1px solid #ddd;
        }
        .logo-box { 
            display: flex; 
            align-items: center; 
            gap: 15px; 
        }
        .logo-img { 
            width: 80px; 
            height: 100px; 
            border: 2px solid #000; 
            text-align: center; 
            font-size: 10px; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            padding: 8px; 
            box-sizing: border-box;
            background: #fff;
        }
        .official-title { 
            font-size: 1.8em; 
            font-weight: bold; 
            line-height: 1.1; 
        }
        .company-info { 
            text-align: right; 
            font-size: 0.85em; 
            line-height: 1.5; 
        }
        .company-name { 
            font-size: 1.3em; 
            font-weight: bold; 
            display: block; 
            margin-bottom: 8px; 
        }
        
        .meta-info { 
            display: flex; 
            justify-content: flex-end; 
            margin-bottom: 30px; 
            padding: 10px 0;
        }
        .meta-table { 
            border-collapse: collapse; 
        }
        .meta-table td { 
            padding: 4px 12px; 
            text-align: left; 
        }

        .recipient-info { 
            margin-bottom: 40px; 
            line-height: 2; 
            padding: 15px 0;
        }
        .label { 
            display: inline-block; 
            width: 130px; 
            vertical-align: top; 
            font-weight: 500;
        }

        .data-table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-top: 20px; 
            border: 1px solid #000;
        }
        .data-table th { 
            background-color: #f5f5f5;
            border: 1px solid #000; 
            padding: 12px 10px; 
            text-align: left; 
            font-weight: bold;
        }
        .data-table td { 
            border: 1px solid #000; 
            padding: 12px 10px; 
            vertical-align: top; 
        }
        .data-table tbody tr:nth-child(even) {
            background-color: #fafafa;
        }
        
        .total-section { 
            border-top: 2px solid #000; 
            border-bottom: 3px double #000; 
            font-weight: bold; 
            margin-top: 15px; 
            padding: 12px 0; 
            display: flex; 
            justify-content: space-between; 
        }
        .dollars-text { 
            margin-top: 35px; 
            font-style: italic; 
            padding: 10px 0;
            line-height: 1.6;
        }
        
        .footer-sign { 
            margin-top: 80px; 
            display: flex; 
            justify-content: space-between; 
            align-items: flex-end; 
            border-top: 1px solid #000; 
            padding-top: 10px; 
        }
        
        @media print {
            body { 
                margin: 0; 
                padding: 20px 30px;
                border: none;
                box-shadow: none;
            }
        }
    </style>
</head>
<body>

    <div class="header">
        <div class="logo-box">
            <div class="logo-img">
                [LOGO IMAGE]
            </div>
            <div class="official-title">OFFICIAL<br>RECEIPT</div>
        </div>
        <div class="company-info">
            <span class="company-name">THE ORDER OF FRIARS MINOR (S) LTD</span>
            Co & GST Reg No. 201016236M<br>
            Franciscan Columbarium<br>
            5 Bukit Batok East Avenue 2 Singapore 659918<br>
            Tel: 6560-6361, HP: 9774-7053<br>
            email: franciscan.columbarium@gmail.com
        </div>
    </div>

    <div class="meta-info">
        <table class="meta-table">
            <tr><td>Receipt No:</td><td>${receiptNo}</td></tr>
            <tr><td>Date :</td><td>${receiptDate}</td></tr>
        </table>
    </div>

    <div class="recipient-info">
        <div><span class="label">Received From :</span> ${customerName}</div>
        <div><span class="label">Address:</span> ${address ? `Blk: ${address}, Singapore` : 'Singapore'}</div>
    </div>

    <table class="data-table">
        <thead>
            <tr>
                <th style="width: 20%;">Invoice</th>
                <th style="width: 50%;">Description</th>
                <th style="text-align: right;">Total Amount</th>
            </tr>
        </thead>
        <tbody>
            ${tableRows}
        </tbody>
    </table>

    <div style="width: 30%; margin-left: auto;">
        <div class="total-section">
            <span>Total :</span>
            <span>$ ${formatCurrency(totalAmount)}</span>
        </div>
    </div>

    <div class="dollars-text">
        <strong>Dollars :</strong> ${totalInWords}
    </div>

    <div style="margin-top: 60px; display: flex; justify-content: space-between;">
        <div style="width: 40%; border-bottom: 1px solid #000; padding-bottom: 5px;">${paymentMode}</div>
        <div style="width: 40%; text-align: right; font-size: 0.9em;">The Order of Friars Minor (S) Ltd</div>
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
    console.log(`[generateReceiptPdfContent] Receipt PDF generated successfully in ${totalTime}ms (canvas: ${canvasTime}ms, blob size: ${(blob.size / 1024).toFixed(2)}KB)`);
    
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
    doc.text(`Receipt No: ${receiptCode}`, 18, 40);
    doc.text(`Date: ${formatDate(receiptInfo.transactionDate || invoiceInfo.transactionDate)}`, 18, 50);
    doc.text(`Received From: ${customerName}`, 18, 60);
    doc.text(`Total: $${formatCurrency(totalAmount)}`, 18, 80);
    
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
      payload.CustomerName || payload.invoice?.customerName || 'N/A';

    const address = payload.Address || '';

    const refDocNumber = normalizeRefField(
      payload.RefDocNumber || payload.refDocNumber
    );
    const refDocName = normalizeRefField(
      payload.RefDocName || payload.refDocName
    );

    const totalAmount =
      typeof payload.TotalAmount === 'number'
        ? payload.TotalAmount
        : payload.invoice?.totalAmount;

    const taxAmount =
      typeof payload.TaxAmount === 'number'
        ? payload.TaxAmount
        : payload.invoice?.taxAmount;

    const payingAmountRaw =
      Array.isArray(payload.PayingAmount) && payload.PayingAmount.length
        ? payload.PayingAmount[0]
        : payload.PayingAmount ?? payload.TotalPayingAmount ?? payload.invoice?.payingAmount;

    const payingAmount =
      typeof payingAmountRaw === 'number'
        ? payingAmountRaw
        : Number(payingAmountRaw ?? 0);

    const paymentMode =
      payload.PaymentMode ?? payload.invoice?.paymentMode ?? null;

    const lineItemsSource: any[] = Array.isArray(payload.details)
      ? payload.details
      : Array.isArray(payload.invoice?.details)
        ? payload.invoice.details
        : [];

    const lineItems = lineItemsSource.map((item, index) => {
      const descParts: string[] = [];
      const itemRefName = normalizeRefField(item.refDocName);
      const itemRefNumber = normalizeRefField(item.refDocNumber);

      if (itemRefName) descParts.push(itemRefName);
      if (itemRefNumber) descParts.push(itemRefNumber);
      if (!descParts.length && item.itemId) descParts.push(`Item ${item.itemId}`);

      const description = descParts.join(' • ') || `Item ${index + 1}`;
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

    // Header
    doc.setFontSize(22);
    doc.setTextColor(139, 40, 40);
    doc.setFont('helvetica', 'bold');
    doc.text('INVOICE', margin, y);

    doc.setFontSize(11);
    doc.setTextColor(80, 80, 80);
    doc.setFont('helvetica', 'normal');
    doc.text('Franciscan Columbarium', margin, y + 7);

    y += 18;

    // Invoice summary box
    doc.setDrawColor(139, 40, 40);
    doc.setFillColor(251, 248, 244);
    doc.roundedRect(margin, y, pageWidth - margin * 2, 28, 3, 3, 'FD');

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Invoice Summary', margin + 5, y + 8);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    addKeyValueRow(doc, 'Invoice #', String(invoiceNo), margin + 5, y + 15);
    addKeyValueRow(doc, 'Date', invoiceDate, margin + 5, y + 21);
    addKeyValueRow(
      doc,
      'Reference',
      [refDocName, refDocNumber].filter(Boolean).join(' / ') || 'N/A',
      pageWidth / 2,
      y + 15
    );
    addKeyValueRow(
      doc,
      'Application',
      options.applicationCode || refDocName || 'N/A',
      pageWidth / 2,
      y + 21
    );

    y += 32;

    // Bill To
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Bill To', margin, y);
    y += 6;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(customerName, margin, y);
    y += 5;
    if (address) {
      const wrappedAddress = doc.splitTextToSize(address, pageWidth / 2 - margin);
      doc.text(wrappedAddress, margin, y);
      y += wrappedAddress.length * 4 + 2;
    }

    y += 4;

    // Line items table (different styling than receipt)
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Invoice Items', margin, y);
    y += 6;

    const tableWidth = pageWidth - margin * 2;
    const descWidth = tableWidth * 0.5;
    const qtyWidth = tableWidth * 0.1;
    const unitWidth = tableWidth * 0.15;
    const totalWidth = tableWidth * 0.25;

    doc.setFillColor(40, 40, 40);
    doc.setTextColor(255, 255, 255);
    doc.rect(margin, y, tableWidth, 8, 'F');

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Description', margin + 2, y + 6);
    doc.text('Qty', margin + descWidth + 2, y + 6);
    doc.text('Unit (S$)', margin + descWidth + qtyWidth + 2, y + 6);
    doc.text('Line Total (S$)', margin + descWidth + qtyWidth + unitWidth + 2, y + 6);

    y += 8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);

    if (!lineItems.length) {
      doc.rect(margin, y, tableWidth, 8);
      doc.text('No line items returned by the server.', margin + 2, y + 5);
      y += 12;
    } else {
      lineItems.forEach((item, index) => {
        const baseRowHeight = 8;
        const bg = index % 2 === 0 ? 255 : 245;
        doc.setFillColor(bg, bg, bg);
        doc.rect(margin, y, tableWidth, baseRowHeight, 'F');

        const wrappedDesc = doc.splitTextToSize(item.description, descWidth - 4);
        doc.text(wrappedDesc, margin + 2, y + 5);
        doc.text(String(item.quantity ?? 0), margin + descWidth + 2, y + 5);
        doc.text(
          formatCurrency(item.unitAmount ?? 0).replace('S$', ''),
          margin + descWidth + qtyWidth + 2,
          y + 5
        );
        doc.text(
          formatCurrency(item.total ?? 0).replace('S$', ''),
          margin + descWidth + qtyWidth + unitWidth + 2,
          y + 5
        );

        const extraHeight = wrappedDesc.length > 1 ? (wrappedDesc.length - 1) * 4 : 0;
        y += baseRowHeight + extraHeight;

        if (y > doc.internal.pageSize.getHeight() - 40) {
          doc.addPage();
          y = margin;
        }
      });
    }

    y += 6;

    // Totals section
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Invoice Totals', margin, y);
    y += 7;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);

    addKeyValueRow(doc, 'Subtotal', formatCurrency(totalAmount), margin, y);
    addKeyValueRow(doc, 'Tax', formatCurrency(taxAmount), margin, y + 6);
    addKeyValueRow(doc, 'Total Amount', formatCurrency(totalAmount), margin, y + 12);
    addKeyValueRow(
      doc,
      'Amount Received',
      formatCurrency(payingAmount),
      pageWidth / 2,
      y
    );
    addKeyValueRow(
      doc,
      'Payment Mode',
      resolvePaymentMode(paymentMode),
      pageWidth / 2,
      y + 6
    );

    y += 24;

    // Footer
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text(
      'Thank you for your payment. This invoice was generated from the Franciscan Columbarium system.',
      margin,
      y
    );
    y += 5;
    doc.text(`Generated on ${new Date().toLocaleString()}`, margin, y);

    return doc.output('blob');
  },
};

export default receiptPdfService;

