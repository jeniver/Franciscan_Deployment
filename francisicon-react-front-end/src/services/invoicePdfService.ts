import jsPDF from 'jspdf';

interface InvoiceLineItem {
  description: string;
  referenceNo: string;
  gstPercent: number;
  quantity: number;
  unitPrice: number;
  amount: number;
}

interface InvoiceData {
  invoiceNo: string;
  invoiceDate: string;
  dueDate?: string;
  applicationNumber?: string;
  applicantName: string;
  applicantIDNo?: string;
  applicantEmail?: string;
  applicantPhone?: string;
  applicantAddress: string;
  nicheDetails?: {
    nicheId: number | null;
    nicheCode: string;
    chapel: string;
    wallName: string;
    rowNumber: string;
    rowLevel: number | null;
  };
  beneficiaries?: Array<{
    name: string;
    relationship: string;
    nric?: string;
  }>;
  nominees?: Array<{
    name: string;
    nric: string;
    relationship: string;
  }>;
  pricing: {
    nicheAmount: number;
    serviceAmount: number;
    taxAmount: number;
    totalAmount: number;
  };
  lineItems?: InvoiceLineItem[];
}

// Convert number to words (enhanced version)
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

  const wholePart = Math.round(num);

  return convertThousands(wholePart) + ' Only';
};

// Format date to DD-MMM-YYYY
const formatDate = (dateStr: string): string => {
  try {
    const date = new Date(dateStr);
    const day = date.getDate().toString().padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  } catch {
    return dateStr;
  }
};

// Format currency with thousands separator
const formatCurrency = (amount: number): string => {
  return amount.toLocaleString('en-SG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};


// Generate line items from pricing data if not provided
const generateLineItems = (data: InvoiceData, nicheCode: string): InvoiceLineItem[] => {
  if (data.lineItems && data.lineItems.length > 0) {
    return data.lineItems;
  }

  // Generate line items from existing pricing structure
  const items: InvoiceLineItem[] = [];
  const gstPercent = 9.0; // Default GST percentage
  const refNo = nicheCode || data.nicheDetails?.nicheCode || data.applicationNumber || 'N/A';

  // Calculate base amounts (excluding GST)
  // If totalAmount includes GST, we need to extract the base
  const totalWithGst = data.pricing.totalAmount;
  const baseSubTotal = totalWithGst / (1 + gstPercent / 100);

  if (data.pricing.nicheAmount > 0) {
    // Niche amount (main item)
    const nicheBase = data.pricing.nicheAmount / (1 + gstPercent / 100);
    items.push({
      description: `Level ${data.nicheDetails?.rowLevel || 3} Niche`,
      referenceNo: refNo,
      gstPercent,
      quantity: 1.00,
      unitPrice: nicheBase,
      amount: nicheBase
    });
  }

  // Service items - use serviceAmount if available, otherwise calculate from remaining
  let serviceBase = 0;
  if (data.pricing.serviceAmount > 0) {
    serviceBase = data.pricing.serviceAmount / (1 + gstPercent / 100);
  } else {
    const nicheBase = data.pricing.nicheAmount > 0 ? (data.pricing.nicheAmount / (1 + gstPercent / 100)) : 0;
    serviceBase = baseSubTotal - nicheBase;
  }

  if (serviceBase > 0) {
    // Split into service items: inscription gets most, then tables and sealing
    const tablesAndSealing = 40.00; // 20 + 20
    const inscriptionAmount = Math.max(0, serviceBase - tablesAndSealing);

    if (inscriptionAmount > 0) {
      items.push({
        description: 'Niche Inscription 1st Name',
        referenceNo: refNo,
        gstPercent,
        quantity: 1.00,
        unitPrice: inscriptionAmount,
        amount: inscriptionAmount
      });
    }

    if (serviceBase >= 20) {
      items.push({
        description: 'Setting of tables',
        referenceNo: refNo,
        gstPercent,
        quantity: 1.00,
        unitPrice: 20.00,
        amount: 20.00
      });
    }

    if (serviceBase >= 40) {
      items.push({
        description: 'Sealing of niche',
        referenceNo: refNo,
        gstPercent,
        quantity: 1.00,
        unitPrice: 20.00,
        amount: 20.00
      });
    }
  }

  return items;
};

// Generate HTML template for invoice
const generateInvoiceHtmlTemplate = (data: InvoiceData): string => {
  const nicheCode = data.nicheDetails?.nicheCode || data.applicationNumber || 'N/A';
  const lineItems = generateLineItems(data, nicheCode);

  // Calculate totals
  const subTotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
  const gstPercent = lineItems.length > 0 ? lineItems[0].gstPercent : 9.0;
  const gstTotal = (subTotal * gstPercent) / 100;
  const total = data.pricing.totalAmount || (subTotal + gstTotal);
  const totalRounded = Math.round(total);
  const totalInWords = numberToWords(totalRounded);

  // Format reference number - combine chapel and niche code
  const refNo = data.nicheDetails
    ? `${data.nicheDetails.chapel} ${data.nicheDetails.nicheCode || nicheCode}`.trim()
    : nicheCode;

  // Build line items HTML
  const lineItemsHtml = lineItems.map(item => `
            <tr>
                <td class="text-left">${item.description}</td>
                <td class="text-left">${refNo}</td>
                <td>${item.gstPercent.toFixed(1)}</td>
                <td>${item.quantity.toFixed(2)}</td>
                <td>$ ${formatCurrency(item.unitPrice)}</td>
                <td>$ ${formatCurrency(item.amount)}</td>
            </tr>
  `).join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Tax Invoice - ${data.invoiceNo || 'Invoice'}</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { 
            font-family: 'Segoe UI', Arial, sans-serif; 
            color: #000; 
            background: #fff;
            max-width: 900px; 
            margin: 20px auto; 
            padding: 40px 50px; 
            border: 1px solid #eee;
            box-shadow: 0 0 10px rgba(0,0,0,0.05);
        }
        
        /* Header Layout */
        .letterhead { 
            display: flex; 
            justify-content: space-between; 
            align-items: flex-start; 
            margin-bottom: 40px; 
            padding-bottom: 20px;
        }
        .logo { 
            width: 80px; 
            height: 80px; 
            object-fit: contain;
        }
        .company-details { 
            text-align: right; 
            font-size: 0.85em; 
            line-height: 1.4; 
        }
        .company-name { 
            font-size: 1.25em; 
            font-weight: bold; 
            margin-bottom: 6px; 
            display: block; 
            text-transform: uppercase;
        }
        
        /* Invoice Title */
        .invoice-banner { 
            background-color: #000 !important; 
            color: #fff !important; 
            padding: 8px 30px; 
            text-align: center; 
            font-size: 1.2em; 
            font-weight: bold; 
            width: fit-content; 
            margin: 0 0 40px auto; 
            text-transform: uppercase;
            letter-spacing: 2px;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
        }
        
        /* Information Sections */
        .info-grid { 
            display: flex;
            justify-content: space-between;
            margin-bottom: 40px; 
            font-size: 0.9em;
        }
        .customer-info {
            width: 60%;
        }
        .document-info {
            width: 35%;
            text-align: right;
        }
        .info-row {
            display: flex;
            margin-bottom: 8px;
        }
        .info-label { 
            font-weight: bold;
            width: 80px;
            flex-shrink: 0;
        }
        .info-value {
            flex-grow: 1;
            font-weight: 500;
        }

        /* Table Styling */
        table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-top: 10px; 
            font-size: 0.85em; 
            border: 1px solid #000;
        }
        th { 
            background-color: #000 !important; 
            color: #fff !important; 
            padding: 10px 8px; 
            text-align: center; 
            border: 1px solid #000; 
            font-weight: bold;
            text-transform: uppercase;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
        }
        td { 
            border: 1px solid #000; 
            padding: 10px 8px; 
            vertical-align: top;
        }
        .text-left { text-align: left; }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        
        /* Totals Section */
        .totals-container { 
            margin-left: auto; 
            width: 280px; 
            margin-top: 20px; 
            font-size: 0.9em;
        }
        .total-row { 
            display: flex; 
            justify-content: space-between; 
            padding: 4px 0; 
        }
        .grand-total { 
            font-weight: bold; 
            border-top: 2px solid #000; 
            margin-top: 8px; 
            padding-top: 8px; 
            font-size: 1.1em; 
        }
        
        /* Footer */
        .amount-words {
            margin: 40px 0;
            font-size: 0.9em;
            display: flex;
            gap: 15px;
        }
        .words-value {
            font-style: italic;
            border-bottom: 1px solid #ccc;
            flex-grow: 1;
        }
        
        .payment-section { 
            margin-top: 50px; 
            font-size: 0.85em; 
            border-top: 1px solid #eee;
            padding-top: 20px;
        }
        .payment-header {
            font-weight: bold;
            text-transform: uppercase;
            margin-bottom: 15px;
            letter-spacing: 1px;
        }
        .payment-grid {
            display: grid;
            grid-template-columns: 140px 1fr;
            gap: 12px;
        }
        .payment-label {
            font-weight: bold;
            color: #444;
        }
        .callout {
            margin-top: 30px;
            background: #f9f9f9;
            padding: 15px;
            border-left: 4px solid #000;
            font-weight: bold;
            font-style: italic;
        }
        
        @media print {
            body { 
                margin: 0; 
                padding: 0;
                border: none;
                box-shadow: none;
            }
        }
    </style>
</head>
<body>

    <div class="letterhead">
        <img src="https://franciscan-columbarium.sg/assets/logo.png" class="logo" alt="Logo">
        <div class="company-details">
            <span class="company-name">THE ORDER OF FRIARS MINOR (S) LTD</span>
            Co. & GST Reg. No. 201016236M<br>
            Franciscan Columbarium<br>
            5 Bukit Batok East Avenue 2, Singapore 659918<br>
            Tel: 6560-6361 HP: 9774-7053<br>
            Email: franciscan.columbarium@gmail.com
        </div>
    </div>

    <div class="invoice-banner">TAX INVOICE</div>

    <div class="info-grid">
        <div class="customer-info">
            <div class="info-row">
                <span class="info-label">Name:</span>
                <span class="info-value">${data.applicantName || 'N/A'}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Address:</span>
                <span class="info-value" style="white-space: pre-wrap;">${data.applicantAddress || 'N/A'}</span>
            </div>
        </div>
        <div class="document-info">
            <div class="info-row" style="justify-content: flex-end;">
                <span class="info-label" style="text-align: left;">Invoice No:</span>
                <span style="width: 100px; text-align: right;">${data.invoiceNo || 'N/A'}</span>
            </div>
            <div class="info-row" style="justify-content: flex-end;">
                <span class="info-label" style="text-align: left;">Date:</span>
                <span style="width: 100px; text-align: right;">${formatDate(data.invoiceDate || new Date().toLocaleDateString())}</span>
            </div>
        </div>
    </div>

    <table>
        <thead>
            <tr>
                <th style="width: 35%;">Description</th>
                <th style="width: 20%;">Ref No.</th>
                <th style="width: 8%;">GST %</th>
                <th style="width: 8%;">Qty</th>
                <th style="width: 14%;">Price</th>
                <th style="width: 15%;">Amount</th>
            </tr>
        </thead>
        <tbody>
            ${lineItemsHtml} 
        </tbody>
    </table>

    <div class="totals-container">
        <div class="total-row">
            <span>Sub Total :</span>
            <span>$ ${formatCurrency(subTotal)}</span>
        </div>
        <div class="total-row">
            <span>GST Total :</span>
            <span>$ ${formatCurrency(gstTotal)}</span>
        </div>
        <div class="total-row grand-total">
            <span>Total :</span>
            <span>$ ${formatCurrency(total)}</span>
        </div>
    </div>

    <div class="amount-words">
        <span class="info-label">Dollars:</span>
        <span class="words-value">${totalInWords}</span>
    </div>

    <div style="font-size: 0.75em; color: #666; font-style: italic; margin-bottom: 40px;">
        * This is a computer generated invoice. No signature is required.
    </div>

    <div class="payment-section">
        <div class="payment-header">Payment Information</div>
        <div class="payment-grid">
            <span class="payment-label">Cash:</span>
            <span>Payable at Franciscan Columbarium office</span>
            
            <span className="payment-label">Cheque:</span>
            <span>Payable to: <strong>The Order of Friars Minor (S) Ltd - Columbarium</strong></span>
            
            <span className="payment-label">Internet Transfer:</span>
            <div>
                <strong>OFM - Col, Standard Chartered Bank</strong><br/>
                <strong>A/C 07-1-006455-1</strong>
            </div>
        </div>
        
        <div class="callout">
            * Please quote the invoice no. in the reference field to ensure correct allocation of your payment.
        </div>
    </div>

</body>
</html>`;

  return html;
};

// Shared PDF generation logic - optimized for performance
const generateInvoicePdfContent = async (data: InvoiceData): Promise<Blob> => {
  let element: HTMLDivElement | null = null;

  try {
    console.log('[generateInvoicePdfContent] Starting PDF generation...');
    const startTime = Date.now();

    // Generate HTML template
    const htmlContent = generateInvoiceHtmlTemplate(data);

    // Create a temporary element with the HTML content
    element = document.createElement('div');
    element.innerHTML = htmlContent;
    element.style.position = 'absolute';
    element.style.left = '-9999px';
    element.style.top = '0';
    element.style.width = '900px';
    element.style.backgroundColor = '#fff';
    document.body.appendChild(element);

    // Wait a bit for styles to apply
    await new Promise(resolve => setTimeout(resolve, 100));

    // Use optimized html2canvas settings for better performance
    const html2canvas = (await import('html2canvas')).default;
    console.log('[generateInvoicePdfContent] Starting html2canvas conversion...');

    const canvas = await html2canvas(element, {
      scale: 1.5, // Reduced from 2 for better performance
      useCORS: true,
      logging: false,
      width: 900,
      height: element.scrollHeight,
      windowWidth: 900,
      backgroundColor: '#ffffff',
      removeContainer: false,
      allowTaint: false,
      imageTimeout: 15000
    });

    console.log('[generateInvoicePdfContent] Canvas created, converting to PDF...');
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
    console.log(`[generateInvoicePdfContent] PDF generated successfully in ${totalTime}ms (canvas: ${canvasTime}ms, blob size: ${(blob.size / 1024).toFixed(2)}KB)`);

    // Clean up temporary element
    if (element && element.parentNode) {
      document.body.removeChild(element);
    }
    element = null;

    return blob;
  } catch (error) {
    console.error('[generateInvoicePdfContent] Error generating PDF from HTML:', error);

    // Clean up element if it exists
    if (element && element.parentNode) {
      document.body.removeChild(element);
    }

    // Fallback to jsPDF if html2canvas fails
    console.log('[generateInvoicePdfContent] Falling back to jsPDF direct generation...');
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 18;
    let yPosition = margin;

    // Simple text-based fallback
    doc.setFontSize(12);
    doc.text('TAX INVOICE', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 10;
    doc.setFontSize(10);
    doc.text(`Invoice No: ${data.invoiceNo || 'N/A'}`, margin, yPosition);
    doc.text(`Date: ${formatDate(data.invoiceDate || new Date().toLocaleDateString())}`, pageWidth - margin, yPosition, { align: 'right' });
    yPosition += 10;
    doc.text(`Name: ${data.applicantName || 'N/A'}`, margin, yPosition);
    yPosition += 10;
    doc.text(`Address: ${data.applicantAddress || 'N/A'}`, margin, yPosition);
    yPosition += 20;

    const nicheCode = data.nicheDetails?.nicheCode || data.applicationNumber || 'N/A';
    const lineItems = generateLineItems(data, nicheCode);
    const subTotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
    const gstPercent = lineItems.length > 0 ? lineItems[0].gstPercent : 9.0;
    const gstTotal = (subTotal * gstPercent) / 100;
    const total = data.pricing.totalAmount || (subTotal + gstTotal);

    doc.text(`Total: $${total.toFixed(2)}`, margin, yPosition);

    return doc.output('blob');
  }
};

export const invoicePdfService = {
  /**
   * Generate and download invoice PDF using HTML template
   */
  generateInvoicePdf: async (data: InvoiceData): Promise<void> => {
    try {
      const blob = await generateInvoicePdfContent(data);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Invoice-${data.invoiceNo || data.applicationNumber || 'Invoice'}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error generating PDF:', error);
      throw new Error('Failed to generate invoice PDF');
    }
  },

  /**
   * Generate invoice PDF and return blob for printing
   */
  generateInvoicePdfBlob: async (data: InvoiceData): Promise<Blob> => {
    const PDF_GENERATION_TIMEOUT = 45000; // 45 seconds timeout

    try {
      console.log('[generateInvoicePdfBlob] Starting PDF generation with timeout protection...');

      // Create a timeout promise
      const timeoutPromise = new Promise<Blob>((_, reject) => {
        setTimeout(() => {
          reject(new Error('PDF generation timed out. The invoice is taking longer than expected to generate. Please try again.'));
        }, PDF_GENERATION_TIMEOUT);
      });

      // Race between PDF generation and timeout
      const pdfPromise = generateInvoicePdfContent(data);

      const blob = await Promise.race([pdfPromise, timeoutPromise]);
      console.log('[generateInvoicePdfBlob] PDF generation completed successfully');
      return blob;
    } catch (error: any) {
      console.error('[generateInvoicePdfBlob] Error generating invoice PDF blob:', error);

      // If timeout, provide helpful message
      if (error.message?.includes('timed out')) {
        throw new Error('PDF generation is taking too long. This may be due to a large invoice or slow browser performance. Please try again or contact support.');
      }

      throw error;
    }
  }
};

export default invoicePdfService;

