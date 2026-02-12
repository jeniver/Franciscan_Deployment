import React, { useEffect, useState, useRef } from 'react';
import { XIcon, DownloadIcon, PrinterIcon } from 'lucide-react';
import { Receipt, receiptService } from '../services/receiptService';
import { receiptPdfService } from '../services/receiptPdfService';
import { useToast } from '../contexts/ToastContext';
import { ReceiptTemplate } from '../components/InvoiceReceiptTemplate/ReceiptTemplate';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface ReceiptDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  receipt: Receipt | null;
}

export function ReceiptDetailModal({ isOpen, onClose, receipt }: ReceiptDetailModalProps) {
  const { showError, showSuccess } = useToast();
  const [isDownloading, setIsDownloading] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [htmlContent, setHtmlContent] = useState<string>('');
  const contentRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (!isOpen || !receipt) {
      setHtmlContent('');
      return;
    }

    const currentReceipt = receipt;
    // Calculate address with comprehensive fallback
    const getAddress = () => {
      const parts = [
        currentReceipt.addressNo || (currentReceipt as any).invoice?.addressNo,
        currentReceipt.address || (currentReceipt as any).addressLine1 || (currentReceipt as any).invoice?.address || (currentReceipt as any).invoice?.addressLine1,
        currentReceipt.address2 || (currentReceipt as any).addressLine2 || (currentReceipt as any).invoice?.address2 || (currentReceipt as any).invoice?.addressLine2,
        currentReceipt.addressCity || (currentReceipt as any).invoice?.addressCity,
        currentReceipt.country || (currentReceipt as any).invoice?.country
      ].filter(part =>
        part &&
        part !== 'undefined' &&
        part !== 'null' &&
        typeof part === 'string' &&
        part.trim() !== ''
      );
      console.log('Address parts:', currentReceipt)

      if (parts.length > 0) {
        return parts.join(', ');
      }

      return (currentReceipt as any).customerAddress || (currentReceipt as any).invoice?.customerAddress || 'N/A';
    };

    const fullAddress = getAddress();

    // Build a lightweight payload compatible with receiptPdfService
    const payload: any = {
      receipt: {
        code: currentReceipt.receiptCode,
        transactionDate: currentReceipt.receiptDate || currentReceipt.createdAt,
        customerName: currentReceipt.customerName,
        address: fullAddress,
        customerAddress: fullAddress,
        totalAmount: currentReceipt.totalAmount,
        payingAmount: currentReceipt.payingAmount,
        paymentMode: currentReceipt.paymentMode,
      },
      details: (currentReceipt.invoiceDetails || []).map((d) => ({
        description: d.description,
        refDocName: d.refDocName || d.description,
        quantity: d.quantity,
        unitAmount: d.unitPrice,
        lineTotalAmount: d.amount,
        invoice: {
          invoiceNo: currentReceipt.invoice?.code || currentReceipt.invoiceCode || '',
          code: currentReceipt.invoice?.code || currentReceipt.invoiceCode || '',
        }
      }))
    };

    try {
      const applicationCode =
        currentReceipt.applicationCode || (currentReceipt.applicationId ? String(currentReceipt.applicationId) : undefined);

      const html = receiptPdfService.generateReceiptHtml(payload, {
        requestedCode: currentReceipt.receiptCode,
        applicationCode,
      });
      setHtmlContent(html);
    } catch (err) {
      console.error('Failed to generate receipt HTML preview:', err);
      setHtmlContent('');
    }
  }, [isOpen, receipt, showError]);

  if (!isOpen || !receipt) return null;

  const handlePrint = async () => {
    if (!contentRef.current || isGenerating) return;
    setIsGenerating(true);
    try {
      // Ensure fonts are loaded
      await document.fonts.ready;

      // Re-verify ref after await
      if (!contentRef.current) {
        throw new Error('Capture content no longer available');
      }

      // Find all page elements or use the container itself
      const pages = contentRef.current.querySelectorAll('[data-pdf-page]');
      const targetPages = pages.length > 0 ? (Array.from(pages) as HTMLElement[]) : [contentRef.current];

      // Create PDF
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
      });

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
        });

        // Restore styles
        pageElement.style.boxShadow = originalBoxShadow;
        pageElement.style.border = originalBorder;
        pageElement.style.width = originalWidth;
        pageElement.style.maxWidth = originalMaxWidth;

        // Add page to PDF (except for the first one)
        if (i > 0) {
          pdf.addPage();
        }

        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();

        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
      }

      // Generate blob and open in new tab
      const pdfBlob = pdf.output('blob');
      const blobUrl = URL.createObjectURL(pdfBlob);

      const newTab = window.open(blobUrl, '_blank');

      if (!newTab || newTab.closed || typeof newTab.closed === 'undefined') {
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = `Receipt-${receipt?.receiptCode || 'document'}.pdf`;
        link.click();
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
      } else {
        setTimeout(() => URL.revokeObjectURL(blobUrl), 120000);
      }
    } catch (error) {
      console.error('PDF generation failed:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadPdf = async () => {
    // ... existing handleDownloadPdf logic is fine, it uses htmlContent
    if (!htmlContent) return;
    setIsGeneratingPdf(true);
    try {
      let html2pdf = (window as any).html2pdf;
      if (!html2pdf) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Failed to load PDF library'));
          document.head.appendChild(script);
        });
        html2pdf = (window as any).html2pdf;
      }

      const container = document.createElement('div');
      container.style.width = '210mm';
      container.innerHTML = htmlContent;

      const opt = {
        margin: [10, 10, 10, 10],
        filename: `Receipt-${receipt?.receiptCode || 'document'}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      await html2pdf().set(opt).from(container).save();
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Helper function to convert number to words
  const convertToDollarsInWords = (num: number | string | null | undefined): string => {
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

      // Millions
      if (val >= 1000000) {
        res += convertLessThanThousand(Math.floor(val / 1000000)) + ' Million ';
        val %= 1000000;
      }

      // Thousands
      if (val >= 1000) {
        res += convertLessThanThousand(Math.floor(val / 1000)) + ' Thousand ';
        val %= 1000;
      }

      // Hundreds/Units
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

  // Pre-calculate address for the React component with comprehensive fallback
  const getDisplayAddress = () => {
    if (!receipt) return 'N/A';

    // Check various common field names for address
    const address = (receipt as any).customerAddress ||
      (receipt as any).address ||
      (receipt as any).customer?.address ||
      (receipt as any).invoice?.customerAddress ||
      (receipt as any).invoice?.address ||
      '';

    if (address && address !== 'N/A' && address !== 'null') return address;

    // Attempt to build from components
    const parts = [
      receipt.addressNo || (receipt as any).invoice?.addressNo,
      receipt.address || (receipt as any).addressLine1 || (receipt as any).invoice?.address || (receipt as any).invoice?.addressLine1,
      receipt.address2 || (receipt as any).addressLine2 || (receipt as any).invoice?.address2 || (receipt as any).invoice?.addressLine2,
      receipt.addressCity || (receipt as any).invoice?.addressCity,
      receipt.country || (receipt as any).invoice?.country
    ].filter(part =>
      part &&
      part !== 'undefined' &&
      part !== 'null' &&
      typeof part === 'string' &&
      part.trim() !== ''
    );

    if (parts.length > 0) {
      return parts.join(', ');
    }

    return 'N/A';
  };

  const displayAddress = getDisplayAddress();

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={onClose} />

      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-gradient-to-r from-[#8b2828] to-[#7d1f1f] px-6 py-4 rounded-t-lg flex items-center justify-between z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                <PrinterIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Receipt Details</h2>
                <p className="text-sm text-white text-opacity-90">{receipt.receiptCode}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrint}
                disabled={isGenerating || isGeneratingPdf || !receipt}
                className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors disabled:opacity-50"
                title="Print"
              >
                <PrinterIcon className={`w-5 h-5 ${isGenerating || isGeneratingPdf ? 'animate-pulse' : ''}`} />
              </button>
              <button
                onClick={handleDownloadPdf}
                disabled={isGenerating || isGeneratingPdf || !htmlContent}
                className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors disabled:opacity-50"
                title="Download PDF"
              >
                <DownloadIcon className={`w-5 h-5 ${isGenerating || isGeneratingPdf ? 'animate-pulse' : ''}`} />
              </button>
              <button onClick={onClose} className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2">
                <XIcon className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 p-6 bg-gray-50 overflow-auto relative">
            {(isGenerating || isGeneratingPdf) && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-50 bg-opacity-75 z-20">
                <div className="text-center">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#8b2828] mb-4"></div>
                  <p className="text-gray-600">Processing document...</p>
                </div>
              </div>
            )}
            <div ref={contentRef}>
              <div data-pdf-page>
                <ReceiptTemplate
                  receiptNo={receipt.receiptCode}
                  date={receipt.receiptDate ? formatDate(receipt.receiptDate) : (receipt.createdAt ? formatDate(receipt.createdAt) : (receipt as any).transactionDate ? formatDate((receipt as any).transactionDate) : formatDate(new Date().toISOString()))}
                  receivedFrom={receipt.customerName || (receipt as any).payeeName || 'N/A'}
                  address={displayAddress}
                  invoiceNo={receipt.invoice?.code || receipt.invoiceCode || (receipt as any).invoiceNo || 'N/A'}
                  description={(receipt.description || (receipt.invoiceDetails && receipt.invoiceDetails.length > 0 ? receipt.invoiceDetails[0].description : '')) || 'Payment received'}
                  totalAmount={receipt.totalAmount || (receipt as any).payingAmount || 0}
                  dollarsInWords={convertToDollarsInWords(receipt.totalAmount || (receipt as any).payingAmount)}
                  paymentMethod={receipt.paymentMode || (receipt as any).paymentMethod || 'Cash'}
                  items={(receipt.invoiceDetails || []).map((d) => ({
                    description: d.description || '',
                    quantity: d.quantity || 0,
                    unitPrice: d.unitPrice || 0,
                    amount: d.amount || 0,
                  }))}
                />
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );

  // Helper function to format dates
  function formatDate(dateString?: string) {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  }
}