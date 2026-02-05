import { useEffect, useState } from 'react';
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

  const handlePrint = () => {
    if (htmlContent) {
      const printWindow = window.open('', '_blank', 'noopener,noreferrer');
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        printWindow.onload = () => {
          printWindow.print();
        };
      }
    }
  };

  const handleDownloadPdf = async () => {
    if (!htmlContent) return;
    setIsGeneratingPdf(true);
    try {
      // Check if html2pdf is already loaded
      let html2pdf = (window as any).html2pdf;
      if (!html2pdf) {
        // Dynamically load html2pdf from CDN
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Failed to load PDF library'));
          document.head.appendChild(script);
        });
        html2pdf = (window as any).html2pdf;
      }

      // Create a temporary container with the HTML content
      const tempContainer = document.createElement('div');
      tempContainer.innerHTML = htmlContent;
      tempContainer.style.position = 'absolute';
      tempContainer.style.left = '-9999px';
      tempContainer.style.top = '0';
      tempContainer.style.width = '210mm';
      tempContainer.style.backgroundColor = 'white';
      tempContainer.style.padding = '20px';
      tempContainer.style.boxSizing = 'border-box';
      document.body.appendChild(tempContainer);

      // Wait a bit for styles to apply
      await new Promise((resolve) => setTimeout(resolve, 100));

      // PDF options
      const opt = {
        margin: [5, 5, 5, 5],
        filename: `${invoiceData?.receipt ? 'Receipt' : 'Invoice'}-${invoiceData?.code || invoiceData?.invoiceCode || 'document'}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
          letterRendering: true,
          allowTaint: true,
        },
        jsPDF: {
          unit: 'mm',
          format: 'a4',
          orientation: 'portrait',
        },
        pagebreak: {
          mode: ['avoid-all', 'css', 'legacy'],
        },
      };

      // Generate and save PDF
      await html2pdf().set(opt).from(tempContainer).save();

      // Cleanup
      setTimeout(() => {
        if (document.body.contains(tempContainer)) {
          document.body.removeChild(tempContainer);
        }
      }, 1000);
    } catch (error: any) {
      console.error('Error generating PDF:', error);
      alert('PDF generation failed. Please try the Print option and save as PDF.');
    } finally {
      setIsGeneratingPdf(false);
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

  // Function to map API data to InvoiceTemplate props
  const mapToInvoiceTemplateProps = (apiData: any) => {
    // Calculate address string from available address fields
    const addressParts = [
      apiData.addressNo || '',
      apiData.address || '',
      apiData.address2 || '',
      apiData.addressCity || '',
      apiData.country || ''
    ].filter(part => part && part.trim() !== '');
    
    const customerAddress = addressParts.length > 0 ? addressParts.join(', ') : 'N/A';

    // Debug: Log incoming apiData
    console.log('[mapToInvoiceTemplateProps] apiData received:', apiData);
    console.log('[mapToInvoiceTemplateProps] apiData.details:', apiData.details);
    console.log('[mapToInvoiceTemplateProps] apiData.items:', apiData.items);
    console.log('[mapToInvoiceTemplateProps] Has direct items:', Array.isArray(apiData.items) && apiData.items.length > 0);
    console.log('[mapToInvoiceTemplateProps] Has details to map:', Array.isArray(apiData.details) && apiData.details.length > 0);
    
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
    
    // Ensure all required fields are present for InvoiceTemplate
    items = items.map(item => ({
      description: item.description || 'Item',
      referenceNo: item.referenceNo || 'N/A',
      gstPercent: typeof item.gstPercent === 'number' ? item.gstPercent : 0,
      qty: typeof item.qty === 'number' ? item.qty : 1,
      quantity: typeof item.qty === 'number' ? item.qty : 1, // alias for compatibility
      unitPrice: typeof item.unitPrice === 'number' ? item.unitPrice : 0,
      amount: typeof item.amount === 'number' ? item.amount : 0
    }));
    
    // Debug: Log mapped items
    console.log('[mapToInvoiceTemplateProps] Final mapped items:', items);
    console.log('[mapToInvoiceTemplateProps] Final items length:', items.length);

    // Calculate subTotal
    const subTotal = apiData.summary?.subtotal || apiData.subtotal || (apiData.totalAmount || 0) - (apiData.taxAmount || 0);
    
    // Convert amount to words
    const amountToWords = (amount: number): string => {
      const num = Math.abs(Math.round(amount));
      if (num === 0) return 'Zero Only';
      
      return `${typeof num === 'number' ? num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '0.00'} Only`;
    };

    return {
      invoiceNo: apiData.code || apiData.invoiceCode || apiData.Code || 'N/A',
      date: formatDate(apiData.transactionDate || apiData.TransactionDate || apiData.invoiceDate || apiData.InvoiceDate || new Date()),
      name: apiData.customerName || apiData.CustomerName || 'N/A',
      address: customerAddress,
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
              {htmlContent && (
                <>
                  <button
                    onClick={handlePrint}
                    className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors"
                    title="Print Document"
                  >
                    <PrinterIcon className="w-5 h-5" />
                  </button>
                  <button
                    onClick={handleDownloadPdf}
                    disabled={isGeneratingPdf}
                    className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Download PDF"
                  >
                    <DownloadIcon className="w-5 h-5" />
                  </button>
                </>
              )}
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
                  <TaxInvoice {...mapToInvoiceTemplateProps(invoiceData)} />
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