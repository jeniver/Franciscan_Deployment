import React, { useEffect, useState, useRef } from 'react';
import { XIcon, DownloadIcon, PrinterIcon } from 'lucide-react';
import { Receipt, receiptService } from '../services/receiptService';
import { receiptPdfService } from '../services/receiptPdfService';
import { useToast } from '../contexts/ToastContext';
import { ReceiptTemplate } from '../components/InvoiceReceiptTemplate/ReceiptTemplate';

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

  const handlePrint = () => {
    if (!htmlContent) return;
    setIsGeneratingPdf(true);
    try {
      const printWindow = window.open('', '_blank', 'noopener,noreferrer');
      if (!printWindow) {
        alert('Please allow popups to print the document');
        setIsGeneratingPdf(false);
        return;
      }

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Receipt - ${receipt?.receiptCode || 'document'}</title>
            <style>
              body { margin: 0; padding: 0; }
              @media print { 
                @page { size: A4; margin: 0; }
                body { margin: 0; }
              }
            </style>
          </head>
          <body>${htmlContent}</body>
        </html>
      `);
      printWindow.document.close();

      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
        printWindow.close();
        setIsGeneratingPdf(false);
      }, 500);
    } catch (error) {
      console.error('Error printing document:', error);
      setIsGeneratingPdf(false);
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
  const convertToDollarsInWords = (num: number): string => {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
      'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    if (num === 0) return 'Zero Only';

    const convertHundreds = (n: number): string => {
      if (n === 0) return '';
      if (n < 20) return ones[n];
      if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 > 0 ? ' ' + ones[n % 10] : '');
      return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 > 0 ? ' ' + convertHundreds(n % 100) : '');
    };

    const convertThousands = (n: number): string => {
      if (n < 1000) return convertHundreds(n);
      return convertHundreds(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 > 0 ? ' ' + convertHundreds(n % 1000) : '');
    };

    const wholePart = Math.floor(num);
    const decimalPart = Math.round((num - wholePart) * 100);
    let result = convertThousands(wholePart);

    if (decimalPart > 0) {
      result += ', And ' + convertHundreds(decimalPart) + ' Cents Only';
    } else {
      result += ' Only';
    }

    return result;
  };

  // Pre-calculate address for the React component with comprehensive fallback
  const getDisplayAddress = () => {
    // Attempt to build from components on receipt or invoice
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

    // Fallback to customerAddress if components aren't available
    return (receipt as any).customerAddress || (receipt as any).invoice?.customerAddress || 'N/A';
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
                disabled={isGeneratingPdf || !htmlContent}
                className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors disabled:opacity-50"
                title="Print"
              >
                <PrinterIcon className={`w-5 h-5 ${isGeneratingPdf ? 'animate-pulse' : ''}`} />
              </button>
              <button
                onClick={handleDownloadPdf}
                disabled={isGeneratingPdf || !htmlContent}
                className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors disabled:opacity-50"
                title="Download PDF"
              >
                <DownloadIcon className={`w-5 h-5 ${isGeneratingPdf ? 'animate-pulse' : ''}`} />
              </button>
              <button onClick={onClose} className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2">
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
                  <p className="text-gray-600">Processing document...</p>
                </div>
              </div>
            )}
            <div>
              <ReceiptTemplate
                receiptNo={receipt.receiptCode}
                date={receipt.receiptDate ? formatDate(receipt.receiptDate) : formatDate(receipt.createdAt)}
                receivedFrom={receipt.customerName}
                address={displayAddress}
                invoiceNo={receipt.invoice?.code || receipt.invoiceCode || 'N/A'}
                description={(receipt.description || (receipt.invoiceDetails && receipt.invoiceDetails.length > 0 ? receipt.invoiceDetails[0].description : '')) || 'Payment received'}
                totalAmount={receipt.totalAmount}
                dollarsInWords={convertToDollarsInWords(receipt.totalAmount)}
                paymentMethod={receipt.paymentMode}
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