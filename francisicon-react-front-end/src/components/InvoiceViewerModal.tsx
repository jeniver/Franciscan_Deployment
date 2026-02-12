import { useEffect, useState, useRef } from 'react';
import { XIcon, PrinterIcon, DownloadIcon, Maximize2Icon, Minimize2Icon } from 'lucide-react';
import { invoiceTemplateService, InvoiceTemplateData } from '../services/invoiceTemplateService';
import { TaxInvoice } from '../components/InvoiceReceiptTemplate/InvoiceTemplate';
import { ReceiptTemplate } from '../components/InvoiceReceiptTemplate/ReceiptTemplate';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface InvoiceViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceData: any | null; // Using 'any' to accommodate the API response structure
  loading?: boolean;
}

export function InvoiceViewerModal({
  isOpen,
  onClose,
  invoiceData,
  loading = false,
}: InvoiceViewerModalProps) {
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (invoiceData && isOpen) {
      const template = invoiceTemplateService.generateInvoiceTemplate(mapToInvoiceTemplateData(invoiceData));
      setHtmlContent(template);
    } else {
      setHtmlContent('');
    }
  }, [invoiceData, isOpen]);

  // Helper function to generate receipt HTML manually since there's no generateReceiptTemplate method
  const generateReceiptHtml = (receiptData: any): string => {
    // Creating a simplified HTML structure similar to the ReceiptTemplate component
    return `
      <table style="width: 100%; border-collapse: collapse; font-family: Arial, sans-serif;">
        <thead>
          <tr>
            <th colspan="2" style="text-align: center; padding: 10px; border-bottom: 2px solid black;">
              <h2>RECEIPT</h2>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding: 8px; vertical-align: top; width: 30%;">
              <strong>Receipt No:</strong><br>
              <span>${receiptData.receiptNo || 'N/A'}</span>
            </td>
            <td style="padding: 8px; vertical-align: top; width: 70%;">
              <strong>Date:</strong><br>
              <span>${receiptData.date || 'N/A'}</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 8px; vertical-align: top;" colspan="2">
              <strong>Received From:</strong><br>
              <span>${receiptData.receivedFrom || 'N/A'}</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 8px; vertical-align: top;" colspan="2">
              <strong>Address:</strong><br>
              <span>${receiptData.address || 'N/A'}</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 8px; vertical-align: top;">
              <strong>Invoice No:</strong><br>
              <span>${receiptData.invoiceNo || 'N/A'}</span>
            </td>
            <td style="padding: 8px; vertical-align: top;">
              <strong>Payment Method:</strong><br>
              <span>${receiptData.paymentMethod || 'N/A'}</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 8px; vertical-align: top;" colspan="2">
              <strong>Description:</strong><br>
              <span>${receiptData.description || 'N/A'}</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 8px; vertical-align: top;">
              <strong>Total Amount:</strong><br>
              <span>$${receiptData.totalAmount ? receiptData.totalAmount.toFixed(2) : '0.00'}</span>
            </td>
            <td style="padding: 8px; vertical-align: top;">
              <strong>In Words:</strong><br>
              <span>${receiptData.dollarsInWords || 'N/A'}</span>
            </td>
          </tr>
        </tbody>
      </table>
    `;
  };

  const handleDownloadPdf = async () => {
    try {
      setIsGeneratingPdf(true);

      // Create a temporary container to render the template for PDF generation
      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'absolute';
      tempContainer.style.left = '-9999px';
      tempContainer.style.top = '0';
      tempContainer.style.width = '210mm'; // A4 width
      tempContainer.style.minHeight = '297mm'; // A4 height
      tempContainer.style.padding = '15mm';
      tempContainer.style.boxSizing = 'border-box';
      tempContainer.style.fontFamily = 'Inter, Arial, sans-serif';
      tempContainer.style.fontSize = '12px';
      tempContainer.style.lineHeight = '1.4';
      tempContainer.style.backgroundColor = '#ffffff';

      // Get the template HTML based on whether it's a receipt or invoice
      let templateHTML = '';
      if (invoiceData?.receipt) {
        // For receipts, we'll use the receipt template component directly
        const receiptData = mapToReceiptTemplateData(invoiceData);
        // Since there's no generateReceiptTemplate method, we'll render the ReceiptTemplate component
        // and get its HTML using a temporary div
        const tempDiv = document.createElement('div');
        // Render the receipt template to HTML manually
        templateHTML = generateReceiptHtml(receiptData);
      } else {
        const invoiceTemplateData = mapToInvoiceTemplateData(invoiceData);
        const invoiceTemplate = invoiceTemplateService.generateInvoiceTemplate(invoiceTemplateData);
        templateHTML = `<div class="invoice-container" style="width: 100%; height: 100%;">${invoiceTemplate}</div>`;
      }

      tempContainer.innerHTML = templateHTML;
      document.body.appendChild(tempContainer);

      // Wait for content to render
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Dynamically import html2canvas and jsPDF
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');

      const canvas = await html2canvas(tempContainer, {
        scale: 2, // Higher quality
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff',
        width: tempContainer.scrollWidth,
        height: tempContainer.scrollHeight,
        scrollX: 0,
        scrollY: 0,
        foreignObjectRendering: true, // Better rendering for complex content
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95); // Use higher quality JPEG
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgScaledWidth = imgWidth * ratio;
      const imgScaledHeight = imgHeight * ratio;

      // Center the image on the page
      const horizontalOffset = (pdfWidth - imgScaledWidth) / 2;
      const verticalOffset = (pdfHeight - imgScaledHeight) / 2;

      pdf.addImage(imgData, 'JPEG', horizontalOffset, verticalOffset, imgScaledWidth, imgScaledHeight);

      // Generate filename with timestamp for uniqueness
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      const fileName = invoiceData?.receipt
        ? `Receipt-${invoiceData.receipt?.receiptCode || invoiceData.code || 'unknown'}-${timestamp}.pdf`
        : `Invoice-${invoiceData.code || invoiceData.invoiceCode || 'unknown'}-${timestamp}.pdf`;

      pdf.save(fileName);

      // Clean up
      document.body.removeChild(tempContainer);
      setIsGeneratingPdf(false);
    } catch (error: any) {
      console.error('Error generating PDF:', error);
      setIsGeneratingPdf(false);

      // More specific error handling
      let errorMessage = 'Failed to generate PDF. Please try again.';
      if (error.message?.includes('canvas')) {
        errorMessage = 'Failed to render content. The document may be too large or complex.';
      } else if (error.name === 'SecurityError') {
        errorMessage = 'Browser security settings prevented PDF generation. Please check your content settings.';
      }

      alert(errorMessage);
    }
  };

  const handleGeneratePDF = async () => {
    if (!contentRef.current || isGenerating) return
    setIsGenerating(true)
    try {
      // Ensure fonts are loaded
      await document.fonts.ready;

      // Re-verify ref after await as component might have unmounted or visibility changed
      if (!contentRef.current) {
        throw new Error('Capture content no longer available');
      }

      // Find all page elements
      const pages = contentRef.current.querySelectorAll('[data-pdf-page]')
      const targetPages = pages.length > 0 ? (Array.from(pages) as HTMLElement[]) : [contentRef.current];

      // Create PDF
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
      })

      // Process each page
      for (let i = 0; i < targetPages.length; i++) {
        const pageElement = targetPages[i];

        // Temporarily prepare element for high-quality capture
        const originalBoxShadow = pageElement.style.boxShadow;
        const originalBorder = pageElement.style.border;
        const originalWidth = pageElement.style.width;
        const originalMaxWidth = pageElement.style.maxWidth;

        pageElement.style.boxShadow = 'none';
        pageElement.style.border = 'none';
        pageElement.style.width = '794px'; // ~210mm at 96dpi
        pageElement.style.maxWidth = 'none';

        // Capture the page
        const canvas = await html2canvas(pageElement, {
          scale: 4, // Higher scale for "expected level" quality
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          logging: false,
          imageTimeout: 0,
          windowWidth: pageElement.scrollWidth,
          windowHeight: pageElement.scrollHeight,
        })

        // Restore styles
        pageElement.style.boxShadow = originalBoxShadow;
        pageElement.style.border = originalBorder;
        pageElement.style.width = originalWidth;
        pageElement.style.maxWidth = originalMaxWidth;

        // Add page to PDF (except for the first one which is created by default)
        if (i > 0) {
          pdf.addPage()
        }

        const imgData = canvas.toDataURL('image/jpeg', 0.95)
        const pdfWidth = pdf.internal.pageSize.getWidth()
        const pdfHeight = pdf.internal.pageSize.getHeight()

        // Draw image to fill the page
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST')
      }

      // Generate blob and open in new tab for preview/print
      const pdfBlob = pdf.output('blob')
      const blobUrl = URL.createObjectURL(pdfBlob)

      // Attempt to open in new tab
      const newTab = window.open(blobUrl, '_blank')

      if (!newTab || newTab.closed || typeof newTab.closed === 'undefined') {
        // Fallback: download if popup blocked or not supported
        const link = document.createElement('a')
        link.href = blobUrl
        const fileName = invoiceData?.receipt
          ? `Receipt - ${invoiceData?.receipt?.receiptCode || invoiceData?.code || 'Document'}`
          : `Invoice - ${invoiceData?.code || 'Document'}`;
        link.download = `${fileName}.pdf`
        link.click()
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1000)
      } else {
        // Successfully opened in new tab. Keeping URL alive for a while so viewer can load it.
        setTimeout(() => URL.revokeObjectURL(blobUrl), 120000)
      }
    } catch (error) {
      console.error('PDF generation failed:', error)
      alert('Failed to generate PDF. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  const handlePrint = () => {
    handleGeneratePDF();
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  // Function to map API response to InvoiceTemplateData interface
  const mapToInvoiceTemplateData = (apiData: any): InvoiceTemplateData => {
    // Calculate address string from available address fields
    const addressParts = [
      apiData.addressNo,
      apiData.address,
      apiData.address2,
      apiData.addressCity,
      apiData.country
    ].filter(part => part &&
      part !== 'undefined' &&
      part !== 'null' &&
      typeof part === 'string' &&
      part.trim() !== '');

    const customerAddress = addressParts.length > 0 ? addressParts.join(', ') : undefined;
    console.log("Customer Address:++++++++++++++++++++++++++++++++++++++", invoiceData)
    // Map details to InvoiceTemplateItem format
    const items = (apiData.details || []).map((detail: any) => ({
      description: detail.itemName || detail.description || detail.ItemName || detail.Description || 'Item',
      quantity: detail.quantity || detail.Quantity || 1,
      unitPrice: detail.unitAmount || detail.UnitAmount || detail.unitPrice || 0,
      amount: detail.totalPayingAmount || detail.TotalPayingAmount || detail.lineTotalAmount || 0
    }));

    return {
      invoiceCode: apiData.code || apiData.invoiceCode || apiData.Code || 'N/A',
      invoiceDate: formatDate(apiData.transactionDate || apiData.TransactionDate || apiData.invoiceDate || apiData.InvoiceDate || new Date()),
      customerName: apiData.customerName || apiData.CustomerName || 'N/A',
      customerAddress: apiData.customerAddress || 'N/A',
      paymentMode: apiData.paymentMode || apiData.PaymentMode || 'N/A',
      totalAmount: apiData.totalAmount || apiData.TotalAmount || 0,
      taxAmount: apiData.taxAmount || apiData.TaxAmount || 0,
      items: items,
    };
  };

  // Function to format dates consistently
  const formatDate = (date: string | Date): string => {
    if (!date) return new Date().toLocaleDateString('en-SG');

    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) {
      return date.toString(); // Return as-is if it's already formatted
    }

    return dateObj.toLocaleDateString('en-SG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Function to map API data to ReceiptTemplate props
  const mapToReceiptTemplateData = (apiData: any) => {
    // Check various common field names for address
    const getAddress = () => {
      if (!apiData) return 'N/A';

      const address = apiData.customerAddress ||
        apiData.address ||
        apiData.customer?.address ||
        apiData.receipt?.address ||
        apiData.receipt?.payeeAddress ||
        '';

      if (address && address !== 'N/A' && address !== 'null') return address;

      // Calculate address string from available address fields
      const addressParts = [
        apiData.addressNo || apiData.receipt?.addressNo,
        apiData.address || apiData.addressLine1 || apiData.receipt?.address || apiData.receipt?.addressLine1,
        apiData.address2 || apiData.addressLine2 || apiData.receipt?.address2 || apiData.receipt?.addressLine2,
        apiData.addressCity || apiData.receipt?.addressCity,
        apiData.country || apiData.receipt?.country
      ].filter(part => part &&
        part !== 'undefined' &&
        part !== 'null' &&
        typeof part === 'string' &&
        part.trim() !== '');

      return addressParts.length > 0 ? addressParts.join(', ') : 'N/A';
    };

    const customerAddress = getAddress();

    // Calculate description from details
    const description = (apiData.details || [])
      .map((detail: any) => detail.itemName || detail.description || detail.ItemName || detail.Description || '')
      .filter((desc: string) => desc && desc.trim() !== '')
      .join(', ');

    return {
      receiptNo: apiData.receipt?.receiptCode || apiData.receipt?.ReceiptCode || apiData.code || apiData.receiptCode || 'N/A',
      date: formatDate(apiData.receipt?.receiptDate || apiData.receipt?.ReceiptDate || apiData.transactionDate || apiData.transactionDate || apiData.receiptDate || new Date()),
      receivedFrom: apiData.receipt?.payeeName || apiData.receipt?.PayeeName || apiData.customerName || apiData.CustomerName || apiData.payeeName || 'N/A',
      address: customerAddress,
      invoiceNo: apiData.code || apiData.invoiceCode || apiData.Code || apiData.invoiceNo || 'N/A',
      description: description || 'Services Rendered',
      totalAmount: apiData.totalAmount || apiData.TotalAmount || apiData.receipt?.totalAmount || apiData.payingAmount || 0,
      dollarsInWords: amountToWords(apiData.totalAmount || apiData.TotalAmount || apiData.receipt?.totalAmount || apiData.payingAmount || 0),
      paymentMethod: apiData.paymentMode || apiData.PaymentMode || apiData.receipt?.paymentMode || apiData.paymentMethod || 'Cash',
    };
  };

  // Function to map API data to InvoiceTemplate interface for TaxInvoice component
  const mapToTaxInvoiceProps = (apiData: any) => {
    // Calculate address string from available address fields

    const address = apiData.customerAddress || 'N/A';
    // Handle both direct items array and details mapping
    let items: any[] = [];

    // If apiData already has items array (from template data), use it directly
    if (Array.isArray(apiData.items) && apiData.items.length > 0) {
      items = apiData.items.map((item: any) => ({
        description: item.description || 'Item',
        referenceNo: item.referenceNo || 'N/A',
        gstPercent: item.gstPercent || item.taxPercent || 0,
        qty: item.quantity || item.qty || 1,
        unitPrice: item.unitPrice || 0,
        amount: item.amount || 0
      }));
    } else {
      // Otherwise map from details array (from API response)
      items = (apiData.details || []).map((detail: any) => ({
        description: detail.itemName || detail.description || detail.ItemName || detail.Description || 'Item',
        referenceNo: detail.refDocNumber || detail.RefDocNumber || detail.ReferenceNo || 'N/A',
        gstPercent: detail.lineTaxPercent || detail.LineTaxPercent || apiData.taxPercentage || apiData.TaxPercentage || 0,
        qty: detail.quantity || detail.Quantity || 1,
        unitPrice: detail.unitAmount || detail.UnitAmount || detail.unitPrice || detail.UnitPrice || 0,
        amount: detail.lineTotalAmount || detail.LineTotalAmount || detail.totalPayingAmount || detail.TotalPayingAmount || 0
      }));
    }

    // Calculate subTotal
    const subTotal = apiData.summary?.subtotal || apiData.subtotal || (apiData.totalAmount || 0) - (apiData.taxAmount || 0);

    // Convert amount to words
    const amountToWords = (num: number | string | null | undefined): string => {
      const n = typeof num === 'string' ? parseFloat(num) : num;
      if (n === null || n === undefined || isNaN(n) || n === 0) return 'Zero Only';

      const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
        'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
      const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

      const convertLessThanThousand = (val: number): string => {
        if (val === 0) return '';
        if (val < 20) return ones[val];
        if (val < 100) return tens[Math.floor(val / 10)] + (val % 10 > 0 ? ' ' + ones[val % 10] : '');
        return ones[Math.floor(val / 100)] + ' Hundred' + (val % 100 > 0 ? ' ' + convertLessThanThousand(val % 100) : '');
      };

      const convert = (val: number): string => {
        if (val === 0) return '';
        let res = '';
        if (val >= 1000000) {
          res += convertLessThanThousand(Math.floor(val / 1000000)) + ' Million ';
          val %= 1000000;
        }
        if (val >= 1000) {
          res += convertLessThanThousand(Math.floor(val / 1000)) + ' Thousand ';
          val %= 1000;
        }
        if (val > 0) {
          res += convertLessThanThousand(Math.floor(val));
        }
        return res.trim();
      };

      const wholePart = Math.floor(n);
      const decimalPart = Math.round((n - wholePart) * 100);
      let result = convert(wholePart);
      if (!result) result = 'Zero';

      if (decimalPart > 0) {
        result += ' and Cents ' + convertLessThanThousand(decimalPart) + ' Only';
      } else {
        result += ' Only';
      }
      return result;
    };

    // Debug: Log mapped items
    console.log('[mapToTaxInvoiceProps] Final mapped items:', items);
    console.log('[mapToTaxInvoiceProps] Final items length:', items.length);

    return {
      invoiceNo: apiData.code || apiData.invoiceCode || apiData.Code || 'N/A',
      date: formatDate(apiData.transactionDate || apiData.TransactionDate || apiData.invoiceDate || apiData.InvoiceDate || new Date()),
      name: apiData.customerName || apiData.CustomerName || 'N/A',
      address: address,
      items: items,
      subTotal: subTotal,
      gstTotal: apiData.taxAmount || apiData.TaxAmount || 0,
      total: apiData.totalAmount || apiData.TotalAmount || 0,
      dollarsInWords: amountToWords(apiData.totalAmount || apiData.TotalAmount || 0),
    };
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-75 transition-opacity"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div
        className={`fixed inset-0 flex items-center justify-center p-4 transition-all ${isFullscreen ? 'p-0' : ''
          }`}
      >
        <div
          className={`relative bg-white rounded-lg shadow-2xl flex flex-col transition-all ${isFullscreen ? 'w-full h-full rounded-none' : 'w-full max-w-6xl h-[90vh]'
            }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 bg-gradient-to-r from-blue-700 to-blue-900 px-6 py-4 rounded-t-lg flex items-center justify-between z-10">
            <h2 className="text-xl font-bold text-white">
              {invoiceData?.receipt ? 'Receipt' : 'Invoice'} {invoiceData?.code || invoiceData?.invoiceCode || ''}
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={toggleFullscreen}
                className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors"
                title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
              >
                {isFullscreen ? (
                  <Minimize2Icon className="w-5 h-5" />
                ) : (
                  <Maximize2Icon className="w-5 h-5" />
                )}
              </button>
              <button
                onClick={handlePrint}
                disabled={isGenerating || isGeneratingPdf || loading || !invoiceData}
                className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Print Document"
              >
                <PrinterIcon className={`w-5 h-5 ${isGenerating || isGeneratingPdf || loading ? 'animate-pulse' : ''}`} />
              </button>
              <button
                onClick={handleDownloadPdf}
                disabled={isGenerating || isGeneratingPdf || loading || !invoiceData}
                className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Download PDF"
              >
                <DownloadIcon className={`w-5 h-5 ${isGenerating || isGeneratingPdf || loading ? 'animate-pulse' : ''}`} />
              </button>
              <button
                onClick={onClose}
                className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto relative bg-gray-50">
            {loading && !htmlContent ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700 mb-4" />
                  <p className="text-gray-600">Loading document...</p>
                </div>
              </div>
            ) : htmlContent ? (
              <div className="p-4 relative min-h-full">
                {(isGenerating || isGeneratingPdf) && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-50 bg-opacity-75 z-20">
                    <div className="text-center">
                      <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700 mb-4"></div>
                      <p className="text-gray-600">Generating PDF...</p>
                    </div>
                  </div>
                )}
                <div ref={contentRef}>
                  {invoiceData?.receipt ? (
                    <div data-pdf-page>
                      <ReceiptTemplate {...mapToReceiptTemplateData(invoiceData)} />
                    </div>
                  ) : (
                    <div data-pdf-page>
                      <TaxInvoice {...mapToTaxInvoiceProps(invoiceData)} />
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center p-8">
                  <p className="text-gray-600">No document data available</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}