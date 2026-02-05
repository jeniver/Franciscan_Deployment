import React, { useEffect, useState, useRef } from 'react';
import { XIcon, DownloadIcon, PrinterIcon } from 'lucide-react';
import { Receipt, receiptService } from '../services/receiptService';
import { receiptPdfService } from '../services/receiptPdfService';
import { useToast } from '../contexts/ToastContext';
import {ReceiptTemplate} from '../components/InvoiceReceiptTemplate/ReceiptTemplate';

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

  useEffect(() => {
    if (!isOpen || !receipt) {
      setHtmlContent('');
      return;
    }

    try {
      const applicationCode =
        receipt.applicationCode || (receipt.applicationId ? String(receipt.applicationId) : undefined);

      // Build a lightweight payload compatible with receiptPdfService
      const payload: any = {
        receipt: {
          code: receipt.receiptCode,
          transactionDate: receipt.receiptDate || receipt.createdAt,
          customerName: receipt.customerName,
          totalAmount: receipt.totalAmount,
          payingAmount: receipt.payingAmount,
          paymentMode: receipt.paymentMode,
        },
        details: (receipt.invoiceDetails || []).map((d) => ({
          description: d.description,
          quantity: d.quantity,
          unitAmount: d.unitPrice,
          lineTotalAmount: d.amount,
        })),
      };

      const html = receiptPdfService.generateReceiptHtml(payload, {
        requestedCode: receipt.receiptCode,
        applicationCode,
      });
      setHtmlContent(html);
    } catch (err) {
      console.error('Failed to generate receipt HTML preview:', err);
      setHtmlContent('');
    }
  }, [isOpen, receipt]);

  if (!isOpen || !receipt) return null;

  // Helper function to get all computed styles as inline styles
  const getComputedStylesAsString = (element: Element): string => {
    const computedStyle = window.getComputedStyle(element);
    let styleString = '';
    for (let i = 0; i < computedStyle.length; i++) {
      const prop = computedStyle[i];
      styleString += `${prop}:${computedStyle.getPropertyValue(prop)};`;
    }
    return styleString;
  };

  // Deep clone with computed styles
  const cloneWithStyles = (element: HTMLElement): HTMLElement => {
    const clone = element.cloneNode(true) as HTMLElement;
    // Apply computed styles to the clone and all its children
    const applyStyles = (original: Element, cloned: Element) => {
      if (original instanceof HTMLElement && cloned instanceof HTMLElement) {
        cloned.style.cssText = getComputedStylesAsString(original);
      }
      const originalChildren = original.children;
      const clonedChildren = cloned.children;
      for (let i = 0; i < originalChildren.length; i++) {
        if (clonedChildren[i]) {
          applyStyles(originalChildren[i], clonedChildren[i]);
        }
      }
    };
    applyStyles(element, clone);
    return clone;
  };

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
    } else {
      window.print();
    }
  };

  const handleDownloadPdf = async () => {
    if (!contentRef.current && !htmlContent) return;
    setIsGeneratingPdf(true);
    try {
      // Check if html2pdf is already loaded
      let html2pdf = (window as any).html2pdf;
      if (!html2pdf) {
        // Dynamically load html2pdf from CDN
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src =
            'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Failed to load PDF library'));
          document.head.appendChild(script);
        });
        html2pdf = (window as any).html2pdf;
      }

      let contentToConvert;
      if (contentRef.current) {
        // Clone with all computed styles
        contentToConvert = cloneWithStyles(contentRef.current);
      } else {
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
        contentToConvert = tempContainer;
      }

      // PDF options
      const opt = {
        margin: [5, 5, 5, 5],
        filename: `Receipt-${receipt?.receiptCode || 'document'}.pdf`,
        image: {
          type: 'jpeg',
          quality: 0.98,
        },
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
      await html2pdf().set(opt).from(contentToConvert).save();

      // Cleanup if we created a temporary container
      if (contentRef.current !== contentToConvert && contentToConvert.parentNode) {
        setTimeout(() => {
          if (document.body.contains(contentToConvert as Node)) {
            document.body.removeChild(contentToConvert as Node);
          }
        }, 1000);
      }
    } catch (error: any) {
      console.error('Error generating PDF:', error);
      alert('PDF generation failed. Please try the Print option and save as PDF.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleDownload = async () => {
    if (!receipt.receiptCode) {
      showError('Error', 'Receipt code is missing');
      return;
    }

    setIsDownloading(true);
    try {
      const applicationCode = receipt.applicationCode || (receipt.applicationId ? String(receipt.applicationId) : undefined);
      await receiptService.getReceiptPdfLink(receipt.receiptCode.trim(), true, applicationCode);
      showSuccess('Success', 'Receipt PDF opened in new tab');
    } catch (error: any) {
      showError('Error', error.message || 'Failed to download receipt PDF');
    } finally {
      setIsDownloading(false);
    }
  };

  // Helper function to convert number to words (for receipt amounts)
  const convertToDollarsInWords = (num: number): string => {
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

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-gradient-to-r from-[#8b2828] to-[#7d1f1f] px-6 py-4 rounded-t-lg flex items-center justify-between z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                <DownloadIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Receipt Details</h2>
                <p className="text-sm text-white text-opacity-90">{receipt.receiptCode}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrint}
                className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors"
                title="Print"
              >
                <PrinterIcon className="w-5 h-5" />
              </button>
              <button
                onClick={handleDownloadPdf}
                disabled={isGeneratingPdf || isDownloading}
                className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Download PDF"
              >
                <DownloadIcon className={`w-5 h-5 ${isGeneratingPdf || isDownloading ? 'animate-pulse' : ''}`} />
              </button>
              <button
                onClick={handleDownload}
                disabled={isDownloading}
                className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Download from Server"
              >
                <DownloadIcon className={`w-5 h-5 ${isDownloading ? 'animate-pulse' : ''}`} />
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
          <div className="flex-1 p-6 bg-gray-50 overflow-auto relative">
            {isGeneratingPdf && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-50 bg-opacity-75 z-20">
                <div className="text-center">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#8b2828] mb-4"></div>
                  <p className="text-gray-600">Generating PDF...</p>
                </div>
              </div>
            )}
            <div ref={contentRef}>
              {receipt && (
                <ReceiptTemplate
                  receiptNo={receipt.receiptCode}
                  date={receipt.receiptDate ? formatDate(receipt.receiptDate) : formatDate(receipt.createdAt)}
                  receivedFrom={receipt.customerName}
                  address={`${receipt.addressNo || ''}${receipt.addressNo ? ', ' : ''}${receipt.address || ''}${receipt.address ? ', ' : ''}${receipt.address2 || ''}${receipt.address2 ? ', ' : ''}${receipt.addressCity || ''}${receipt.addressCity ? ', ' : ''}${receipt.country || ''}`.replace(/,+/g, ', ').replace(/^, |, $/g, '') || 'N/A'}
                  invoiceNo={receipt.invoice?.code || receipt.invoiceCode || 'N/A'}
                  description={(receipt.description || (receipt.invoiceDetails && receipt.invoiceDetails.length > 0 ? receipt.invoiceDetails[0].description : '')) || 'Payment received'}
                  totalAmount={receipt.totalAmount}
                  dollarsInWords={convertToDollarsInWords(receipt.totalAmount)}
                  paymentMethod={receipt.paymentMode}
                />
              )}
            </div>

            {/* Footer Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
              <button
                onClick={handlePrint}
                className="px-4 py-2 bg-gradient-to-r from-[#8b2828] to-[#7d1f1f] text-white rounded-lg hover:shadow-lg transition-all duration-200 flex items-center gap-2"
              >
                <PrinterIcon className="w-4 h-4" />
                Print
              </button>
              <button
                onClick={handleDownloadPdf}
                disabled={isGeneratingPdf}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-lg hover:shadow-lg transition-all duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <DownloadIcon className="w-4 h-4" />
                Download PDF
              </button>
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