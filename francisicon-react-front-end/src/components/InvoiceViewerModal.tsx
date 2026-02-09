import { useEffect, useState, useRef } from 'react';
import { XIcon, PrinterIcon, DownloadIcon, Maximize2Icon, Minimize2Icon } from 'lucide-react';
import { invoiceTemplateService, InvoiceTemplateData } from '../services/invoiceTemplateService';
import { TaxInvoice } from '../components/InvoiceReceiptTemplate/InvoiceTemplate';
import { ReceiptTemplate } from '../components/InvoiceReceiptTemplate/ReceiptTemplate';

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
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Dynamically import html2canvas and jsPDF
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');
      
      const canvas = await html2canvas(tempContainer, {
        scale: 2, // Higher quality
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });
      
      const imgData = canvas.toDataURL('image/jpeg', 0.8);
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
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = 10; // Small margin from top
      
      pdf.addImage(imgData, 'JPEG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
      
      // Determine filename based on type
      const fileName = invoiceData?.receipt 
        ? `Receipt-${invoiceData.receipt?.receiptCode || invoiceData.code || 'unknown'}.pdf`
        : `Invoice-${invoiceData.code || invoiceData.invoiceCode || 'unknown'}.pdf`;
      
      pdf.save(fileName);
      
      // Clean up
      document.body.removeChild(tempContainer);
      setIsGeneratingPdf(false);
    } catch (error) {
      console.error('Error generating PDF:', error);
      setIsGeneratingPdf(false);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  const handlePrint = async () => {
    try {
      // Create a print window
      const printWindow = window.open('', '_blank', 'height=800,width=1000');
      if (!printWindow) {
        alert('Please allow popups for printing');
        return;
      }
      
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
      
      // Write the template to the print window
      printWindow.document.write(`
        <html>
          <head>
            <title>Print Document</title>
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body { margin: 0; padding: 15mm; background: white; font-family: Inter, Arial, sans-serif; font-size: 12px; line-height: 1.4; }
              @media print { @page { margin: 15mm; size: A4; } body { -webkit-print-color-adjust: exact !important; color-adjust: exact !important; } }
              /* Include any specific styles for the template */
              .invoice-container, .receipt-container { width: 100%; min-height: 100%; }
            </style>
          </head>
          <body>${templateHTML}</body>
        </html>
      `);
      
      printWindow.document.close();
      printWindow.focus();
      
      // Wait for content to render before printing
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);
    } catch (error) {
      console.error('Error printing:', error);
      alert('Failed to print. Please try again.');
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  // Function to map API response to InvoiceTemplateData interface
  const mapToInvoiceTemplateData = (apiData: any): InvoiceTemplateData => {
    // Calculate address string from available address fields
    const addressParts = [
      apiData.addressNo || '',
      apiData.address || '',
      apiData.address2 || '',
      apiData.addressCity || '',
      apiData.country || ''
    ].filter(part => part && part.trim() !== '');
    
    const customerAddress = addressParts.length > 0 ? addressParts.join(', ') : undefined;

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
      customerAddress: customerAddress,
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
    // Calculate address string from available address fields
    const addressParts = [
      apiData.addressNo || '',
      apiData.address || '',
      apiData.address2 || '',
      apiData.addressCity || '',
      apiData.country || ''
    ].filter(part => part && part.trim() !== '');
    
    const customerAddress = addressParts.length > 0 ? addressParts.join(', ') : 'N/A';

    // Calculate description from details
    const description = (apiData.details || [])
      .map((detail: any) => detail.itemName || detail.description || detail.ItemName || detail.Description || '')
      .filter((desc: string) => desc && desc.trim() !== '')
      .join(', ');

    // Convert amount to words
    const amountToWords = (amount: number): string => {
      // Very simple converter, could be expanded
      const num = Math.abs(Math.round(amount));
      if (num === 0) return 'Zero Only';
      
      // For now, return a simple representation - in production you'd want a proper number-to-words library
      return `${typeof num === 'number' ? num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '0.00'} Only`;
    };

    return {
      receiptNo: apiData.receipt?.receiptCode || apiData.receipt?.ReceiptCode || apiData.code || 'N/A',
      date: formatDate(apiData.receipt?.receiptDate || apiData.receipt?.ReceiptDate || apiData.transactionDate || new Date()),
      receivedFrom: apiData.receipt?.payeeName || apiData.receipt?.PayeeName || apiData.customerName || apiData.CustomerName || 'N/A',
      address: customerAddress,
      invoiceNo: apiData.code || apiData.invoiceCode || apiData.Code || 'N/A',
      description: description || 'Services Rendered',
      totalAmount: apiData.totalAmount || apiData.TotalAmount || 0,
      dollarsInWords: amountToWords(apiData.totalAmount || apiData.TotalAmount || 0),
      paymentMethod: apiData.paymentMode || apiData.PaymentMode || 'Cash',
    };
  };

  // Function to map API data to InvoiceTemplate interface for TaxInvoice component
  const mapToTaxInvoiceProps = (apiData: any) => {
    // Calculate address string from available address fields
    const addressParts = [
      apiData.addressNo || '',
      apiData.address || '',
      apiData.address2 || '',
      apiData.addressCity || '',
      apiData.country || ''
    ].filter(part => part && part.trim() !== '');
    
    const address = addressParts.length > 0 ? addressParts.join(', ') : 'N/A';

    // Debug: Log incoming apiData
    console.log('[mapToTaxInvoiceProps] apiData received:', apiData);
    console.log('[mapToTaxInvoiceProps] apiData.details:', apiData.details);
    console.log('[mapToTaxInvoiceProps] apiData.items:', apiData.items);
    console.log('[mapToTaxInvoiceProps] Has direct items:', Array.isArray(apiData.items) && apiData.items.length > 0);
    console.log('[mapToTaxInvoiceProps] Has details to map:', Array.isArray(apiData.details) && apiData.details.length > 0);
    
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
    const amountToWords = (amount: number): string => {
      const num = Math.abs(Math.round(amount));
      if (num === 0) return 'Zero Only';
      
      return `${typeof num === 'number' ? num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '0.00'} Only`;
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
        className={`fixed inset-0 flex items-center justify-center p-4 transition-all ${
          isFullscreen ? 'p-0' : ''
        }`}
      >
        <div
          className={`relative bg-white rounded-lg shadow-2xl flex flex-col transition-all ${
            isFullscreen ? 'w-full h-full rounded-none' : 'w-full max-w-6xl h-[90vh]'
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
                disabled={isGeneratingPdf || loading || !invoiceData}
                className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Print Document"
              >
                <PrinterIcon className={`w-5 h-5 ${isGeneratingPdf || loading ? 'animate-pulse' : ''}`} />
              </button>
              <button
                onClick={handleDownloadPdf}
                disabled={isGeneratingPdf || loading || !invoiceData}
                className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Download PDF"
              >
                <DownloadIcon className={`w-5 h-5 ${isGeneratingPdf || loading ? 'animate-pulse' : ''}`} />
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
            ) : isGeneratingPdf ? (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-50 bg-opacity-75 z-20">
                <div className="text-center">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700 mb-4"></div>
                  <p className="text-gray-600">Generating PDF...</p>
                </div>
              </div>
            ) : htmlContent ? (
              <div className="p-4">
                {invoiceData?.receipt ? (
                  <ReceiptTemplate {...mapToReceiptTemplateData(invoiceData)} />
                ) : (
                  <TaxInvoice {...mapToTaxInvoiceProps(invoiceData)} />
                )}
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