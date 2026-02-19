import React, { useEffect, useState, useRef } from 'react';
import { XIcon, DownloadIcon, PrinterIcon } from 'lucide-react';
import { Receipt } from '../services/receiptService';
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
  const { showError } = useToast();
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [htmlContent, setHtmlContent] = useState<string>('');
  const contentRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const [fullReceiptData, setFullReceiptData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && receipt && !fullReceiptData) {
      const loadFullReceipt = async () => {
        setIsLoading(true);
        try {
          const appCode = receipt.applicationCode || (receipt as any).RefDocName;
          const isAppType = appCode && isNaN(Number(appCode));
          const data = await receiptService.getReceiptByCode(
            receipt.receiptCode || (receipt as any).code,
            isAppType ? String(appCode) : undefined
          );
          setFullReceiptData(data);
        } catch (err: any) {
          console.error('[ReceiptDetailModal] Failed to fetch full receipt:', err);
          showError('Error', 'Could not load full receipt details. Address and items might be missing.');
        } finally {
          setIsLoading(false);
        }
      };
      loadFullReceipt();
    }
  }, [isOpen, receipt, fullReceiptData, showError]);

  useEffect(() => {
    if (!isOpen) {
      setFullReceiptData(null);
      setHtmlContent('');
      return;
    }

    if (!receipt) return;

    const currentReceipt = fullReceiptData || receipt;
    // Calculate address with comprehensive fallback
    const getAddress = () => {
      // Check for an existing single address string first
      const existingAddress = (currentReceipt as any).customerAddress ||
        (currentReceipt as any).address ||
        (currentReceipt as any).customer?.address ||
        (currentReceipt as any).invoice?.customerAddress ||
        (currentReceipt as any).invoice?.address ||
        (currentReceipt as any).payeeAddress;

      const parts = [
        currentReceipt.addressNo || (currentReceipt as any).AddressNo || (currentReceipt as any).invoice?.addressNo || (currentReceipt as any).invoice?.AddressNo,
        currentReceipt.address || (currentReceipt as any).Address || (currentReceipt as any).addressLine1 || (currentReceipt as any).invoice?.address || (currentReceipt as any).invoice?.Address || (currentReceipt as any).invoice?.addressLine1,
        currentReceipt.address2 || (currentReceipt as any).Address2 || (currentReceipt as any).addressLine2 || (currentReceipt as any).invoice?.address2 || (currentReceipt as any).invoice?.Address2 || (currentReceipt as any).invoice?.addressLine2,
        currentReceipt.addressCity || (currentReceipt as any).AddressCity || (currentReceipt as any).invoice?.addressCity || (currentReceipt as any).invoice?.AddressCity,
        (currentReceipt as any).districtCode || (currentReceipt as any).DistrictCode || (currentReceipt as any).addressState || (currentReceipt as any).invoice?.districtCode || (currentReceipt as any).invoice?.DistrictCode,
        currentReceipt.country || (currentReceipt as any).Country || (currentReceipt as any).invoice?.country || (currentReceipt as any).invoice?.Country
      ].filter(part =>
        part &&
        part !== 'undefined' &&
        part !== 'null' &&
        typeof part === 'string' &&
        part.trim() !== ''
      );

      // Deduplicate parts to avoid repeats like #65686, #65686
      const uniqueParts: string[] = [];
      const seenNormalized = new Set<string>();

      for (const part of parts) {
        const normalized = part.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (!normalized) continue;

        let exists = false;
        for (const seen of seenNormalized) {
          if (seen.includes(normalized) || normalized.includes(seen)) {
            exists = true;
            break;
          }
        }

        if (!exists) {
          uniqueParts.push(part);
          seenNormalized.add(normalized);
        }
      }

      const fullAddress = uniqueParts.join(', ');

      if (uniqueParts.length > 1) {
        return fullAddress;
      }

      return (existingAddress && existingAddress !== 'N/A' && existingAddress !== 'null') ? existingAddress : (uniqueParts[0] || 'N/A');
    };

    const fullAddress = getAddress();

    // Build a lightweight payload compatible with receiptPdfService
    const totalAmount = currentReceipt.totalAmount || (currentReceipt as any).ReceiptTotalAmount || currentReceipt.payingAmount || 0;

    const payload: any = {
      receipt: {
        code: currentReceipt.receiptCode || (currentReceipt as any).ReceiptCode || (currentReceipt as any).code,
        transactionDate: currentReceipt.receiptDate || (currentReceipt as any).ReceiptDate || (currentReceipt as any).transactionDate || currentReceipt.createdAt,
        customerName: currentReceipt.customerName || (currentReceipt as any).CustomerName || (currentReceipt as any).payeeName,
        address: fullAddress,
        customerAddress: fullAddress,
        totalAmount: totalAmount,
        payingAmount: currentReceipt.payingAmount || totalAmount,
        paymentMode: currentReceipt.paymentMode || (currentReceipt as any).PaymentMode,
        paymentModeDocNo: (currentReceipt as any).paymentModeDocNo || (currentReceipt as any).PaymentModeDocNo,
      },
      details: (currentReceipt.invoiceDetails || (currentReceipt as any).details || []).map((d: any) => ({
        description: d.description || d.itemName || d.ItemName || 'Service',
        refDocName: d.refDocName || d.itemName || d.ItemName || d.description,
        quantity: d.quantity || d.Quantity || 1,
        unitAmount: d.unitPrice || d.unitAmount || d.UnitPrice || d.UnitAmount || 0,
        lineTotalAmount: d.amount || d.lineTotalAmount || d.LineTotalAmount || 0,
        invoice: {
          invoiceNo: currentReceipt.invoice?.code || (currentReceipt as any).invoice?.Code || currentReceipt.invoiceCode || (currentReceipt as any).InvoiceCode || '',
          code: currentReceipt.invoice?.code || (currentReceipt as any).invoice?.Code || currentReceipt.invoiceCode || (currentReceipt as any).InvoiceCode || '',
        }
      }))
    };

    try {
      const applicationCode =
        currentReceipt.applicationCode || (currentReceipt.applicationId ? String(currentReceipt.applicationId) : undefined);

      const html = receiptPdfService.generateReceiptHtml(payload, {
        requestedCode: currentReceipt.receiptCode || (currentReceipt as any).code,
        applicationCode,
      });
      setHtmlContent(html);
    } catch (err) {
      console.error('Failed to generate receipt HTML preview:', err);
      setHtmlContent('');
    }
  }, [isOpen, receipt, fullReceiptData, showError]);

  if (!isOpen || !receipt) return null;

  // Helper function to get all computed styles as inline styles
  const getComputedStylesAsString = (element: Element): string => {
    const computedStyle = window.getComputedStyle(element)
    let styleString = ''
    for (let i = 0; i < computedStyle.length; i++) {
      const prop = computedStyle[i]
      styleString += `${prop}:${computedStyle.getPropertyValue(prop)};`
    }
    return styleString
  }

  // Deep clone with computed styles
  const cloneWithStyles = (element: HTMLElement): HTMLElement => {
    const clone = element.cloneNode(true) as HTMLElement
    // Apply computed styles to the clone and all its children
    const applyStyles = (original: Element, cloned: Element) => {
      if (original instanceof HTMLElement && cloned instanceof HTMLElement) {
        cloned.style.cssText = getComputedStylesAsString(original)
      }
      const originalChildren = original.children
      const clonedChildren = cloned.children
      for (let i = 0; i < originalChildren.length; i++) {
        if (clonedChildren[i]) {
          applyStyles(originalChildren[i], clonedChildren[i])
        }
      }
    }
    applyStyles(element, clone)
    return clone
  }

  const handlePrint = async () => {
    if (!contentRef.current || isGenerating) return
    setIsGenerating(true)
    try {
      // Find all page elements
      const pages = contentRef.current.querySelectorAll('[data-pdf-page]')
      const targetPages = pages.length > 0 ? (Array.from(pages) as HTMLElement[]) : [contentRef.current];

      if (targetPages.length === 0) {
        throw new Error('No pages found to print')
      }
      // Create PDF
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      })
      // Process each page
      for (let i = 0; i < targetPages.length; i++) {
        const pageElement = targetPages[i] as HTMLElement
        // Temporarily remove shadow for clean capture
        const originalBoxShadow = pageElement.style.boxShadow
        pageElement.style.boxShadow = 'none'
        // Capture the page
        const canvas = await html2canvas(pageElement, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          logging: false,
          windowWidth: pageElement.scrollWidth,
          windowHeight: pageElement.scrollHeight,
        })
        // Restore styles
        pageElement.style.boxShadow = originalBoxShadow
        // Add page to PDF (except for the first one which is created by default)
        if (i > 0) {
          pdf.addPage()
        }
        const imgData = canvas.toDataURL('image/png', 1.0)
        const pdfWidth = pdf.internal.pageSize.getWidth()
        const pdfHeight = pdf.internal.pageSize.getHeight()
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)
      }
      // Generate blob and open in new tab
      const pdfBlob = pdf.output('blob')
      const blobUrl = URL.createObjectURL(pdfBlob)
      const newTab = window.open(blobUrl, '_blank')

      const fileName = `Receipt-${receipt?.receiptCode || 'document'}.pdf`;

      if (!newTab) {
        // Fallback: download the file if popup blocked
        const link = document.createElement('a')
        link.href = blobUrl
        link.download = fileName
        link.click()
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1000)
      } else {
        setTimeout(() => URL.revokeObjectURL(blobUrl), 60000)
      }
    } catch (error) {
      console.error('PDF generation failed:', error)
      alert('Failed to generate PDF. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleDownloadPdf = async () => {
    if (!contentRef.current) return
    setIsGeneratingPdf(true)
    try {
      // Check if html2pdf is already loaded
      let html2pdf = (window as any).html2pdf
      if (!html2pdf) {
        // Dynamically load html2pdf from CDN
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script')
          script.src =
            'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js'
          script.onload = () => resolve()
          script.onerror = () => reject(new Error('Failed to load PDF library'))
          document.head.appendChild(script)
        })
        html2pdf = (window as any).html2pdf
      }
      // Clone with all computed styles
      const styledClone = cloneWithStyles(contentRef.current)
      // Create a container with proper dimensions
      const container = document.createElement('div')
      container.style.position = 'absolute'
      container.style.left = '-9999px'
      container.style.top = '0'
      container.style.width = '210mm'
      container.style.backgroundColor = 'white'
      container.appendChild(styledClone)
      document.body.appendChild(container)
      // Wait a bit for styles to apply
      await new Promise((resolve) => setTimeout(resolve, 100))
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
      }
      // Generate and save PDF
      await html2pdf().set(opt).from(container).save()
      // Cleanup
      setTimeout(() => {
        if (document.body.contains(container)) {
          document.body.removeChild(container)
        }
      }, 1000)
    } catch (error: any) {
      console.error('Error generating PDF:', error)
      alert(
        'PDF generation failed. Please try the Print option and save as PDF.',
      )
    } finally {
      setIsGeneratingPdf(false)
    }
  }

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
      (receipt as any).payeeAddress ||
      '';

    if (address && address !== 'N/A' && address !== 'null') return address;

    // Attempt to build from components
    // Attempt to build from components
    const parts = [
      receipt.addressNo || (receipt as any).AddressNo || (receipt as any).invoice?.addressNo || (receipt as any).invoice?.AddressNo,
      receipt.address || (receipt as any).Address || (receipt as any).addressLine1 || (receipt as any).invoice?.address || (receipt as any).invoice?.Address || (receipt as any).invoice?.addressLine1,
      receipt.address2 || (receipt as any).Address2 || (receipt as any).addressLine2 || (receipt as any).invoice?.address2 || (receipt as any).invoice?.Address2 || (receipt as any).invoice?.addressLine2,
      receipt.addressCity || (receipt as any).AddressCity || (receipt as any).invoice?.addressCity || (receipt as any).invoice?.AddressCity,
      (receipt as any).districtCode || (receipt as any).DistrictCode || (receipt as any).addressState || (receipt as any).invoice?.districtCode || (receipt as any).invoice?.DistrictCode,
      receipt.country || (receipt as any).Country || (receipt as any).invoice?.country || (receipt as any).invoice?.Country
    ].filter(part =>
      part &&
      part !== 'undefined' &&
      part !== 'null' &&
      typeof part === 'string' &&
      part.trim() !== ''
    );

    // Deduplicate parts to avoid repeats like #65686, #65686
    const uniqueParts: string[] = [];
    const seenNormalized = new Set<string>();

    for (const part of parts) {
      const normalized = part.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (!normalized) continue;

      let exists = false;
      for (const seen of seenNormalized) {
        if (seen.includes(normalized) || normalized.includes(seen)) {
          exists = true;
          break;
        }
      }

      if (!exists) {
        uniqueParts.push(part);
        seenNormalized.add(normalized);
      }
    }

    const fullAddress = uniqueParts.join(', ');

    // If we have multiple parts, it's better to show the full joined address
    if (uniqueParts.length > 1) {
      return fullAddress;
    }

    // Otherwise use the single address field IF it's not empty, or fallback to the single part
    if (address && address !== 'N/A' && address !== 'null') return address;

    return uniqueParts[0] || 'N/A';
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
            {(isGenerating || isGeneratingPdf || isLoading) && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-50 bg-opacity-75 z-20">
                <div className="text-center">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#8b2828] mb-4"></div>
                  <p className="text-gray-600">{isLoading ? 'Loading receipt data...' : 'Processing document...'}</p>
                </div>
              </div>
            )}
            <div ref={contentRef}>
              <div data-pdf-page>
                {(() => {
                  const currentReceipt = fullReceiptData || receipt;
                  const totalAmt = currentReceipt.totalAmount || (currentReceipt as any).ReceiptTotalAmount || currentReceipt.payingAmount || 0;

                  return (
                    <ReceiptTemplate
                      receiptNo={currentReceipt.receiptCode || (currentReceipt as any).code || (currentReceipt.applicationId != null ? String(currentReceipt.applicationId) : 'N/A')}
                      date={currentReceipt.receiptDate ? formatDate(currentReceipt.receiptDate) : (currentReceipt.createdAt ? formatDate(currentReceipt.createdAt) : (currentReceipt as any).transactionDate ? formatDate((currentReceipt as any).transactionDate) : formatDate(new Date().toISOString()))}
                      receivedFrom={currentReceipt.customerName || (currentReceipt as any).payeeName || 'N/A'}
                      address={displayAddress}
                      invoiceNo={currentReceipt.invoice?.code || (currentReceipt as any).invoice?.Code || currentReceipt.invoiceCode || (currentReceipt as any).invoiceNo || 'N/A'}
                      description={(currentReceipt.description || (currentReceipt.invoiceDetails && currentReceipt.invoiceDetails.length > 0 ? currentReceipt.invoiceDetails[0].description : (currentReceipt as any).details && (currentReceipt as any).details.length > 0 ? (currentReceipt as any).details[0].description : '')) || 'Payment received'}
                      totalAmount={totalAmt}
                      dollarsInWords={convertToDollarsInWords(totalAmt)}
                      paymentMethod={currentReceipt.paymentMode || (currentReceipt as any).paymentMethod || (currentReceipt as any).PaymentMode || 'Cash'}
                      items={((currentReceipt.invoiceDetails || (currentReceipt as any).details || []).map((d: any) => ({
                        description: d.description || d.itemName || d.ItemName || '',
                        quantity: d.quantity || d.Quantity || 1,
                        unitPrice: d.unitPrice || d.UnitPrice || d.unitAmount || d.UnitAmount || d.payingAmount || d.PayingAmount || 0,
                        amount: d.amount || d.Amount || d.lineTotalAmount || d.LineTotalAmount || d.totalPayingAmount || d.TotalPayingAmount || 0,
                      })))}
                    />
                  );
                })()}
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