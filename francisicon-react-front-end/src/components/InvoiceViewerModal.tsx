import { useEffect, useState, useRef } from 'react';
import { XIcon, PrinterIcon, DownloadIcon, Maximize2Icon, Minimize2Icon } from 'lucide-react';
import { invoiceTemplateService, InvoiceTemplateData } from '../services/invoiceTemplateService';
import { TaxInvoice } from '../components/InvoiceReceiptTemplate/InvoiceTemplate';
import { ReceiptTemplate } from '../components/InvoiceReceiptTemplate/ReceiptTemplate';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { addressUtils, AddressEntity } from '../utils/addressUtils';
import { paymentModeToLabel } from '../utils/paymentMode';

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

  // Helper function to convert amount to words
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

  const buildMultilineAddress = (src: any, fallbackSrc?: any): string => {
    if (!src) return 'N/A';
    const s = fallbackSrc || {};
    const entity: AddressEntity = {
      addressNo: src.addressNo || src.AddressNo || s.addressNo || s.AddressNo || '',
      addressLine1: src.address || src.Address || src.addressLine1 || src.AddressLine1 || s.address || s.Address || s.addressLine1 || s.AddressLine1 || '',
      addressLine2: src.address2 || src.Address2 || src.addressLine2 || src.AddressLine2 || s.address2 || s.Address2 || s.addressLine2 || s.AddressLine2 || '',
      addressCity: src.addressCity || src.AddressCity || s.addressCity || s.AddressCity || '',
      addressState: src.districtCode || src.DistrictCode || src.addressState || src.AddressState || s.districtCode || s.DistrictCode || s.addressState || s.AddressState || '',
      addressCountry: src.country || src.Country || s.country || s.Country || 'Singapore',
    };
    const lines = addressUtils.buildAddressLines(entity);
    const result = lines.filter(l => l.trim()).join('\n');
    return result || 'N/A';
  };

  // Function to map API response to InvoiceTemplateData interface
  const mapToInvoiceTemplateData = (apiData: any): InvoiceTemplateData => {
    const customerAddress = apiData.customerAddress && typeof apiData.customerAddress === 'string' && apiData.customerAddress !== 'N/A'
      ? apiData.customerAddress
      : buildMultilineAddress(apiData);

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
      customerName: apiData.customerName || apiData.CustomerName || apiData.payeeName || 'N/A',
      customerAddress: apiData.customerAddress || customerAddress || 'N/A',
      paymentMode: paymentModeToLabel(apiData.paymentMode ?? apiData.PaymentMode ?? apiData.receipt?.paymentMode),
      paymentModeDocNo: apiData.paymentModeDocNo || apiData.PaymentModeDocNo || apiData.receipt?.paymentModeDocNo || '',
      totalAmount: apiData.totalAmount || apiData.TotalAmount || apiData.payingAmount || 0,
      taxAmount: apiData.taxAmount || apiData.TaxAmount || 0,
      items: items,
    };
  };

  // Function to format dates consistently
  const formatDate = (date: string | Date): string => {
    if (!date) return 'N/A';
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) return date.toString();

    // Format: 20 Feb 2026
    return dateObj.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  // Function to map API data to ReceiptTemplate props
  const mapToReceiptTemplateData = (apiData: any) => {
    const customerAddress = apiData.customerAddress && typeof apiData.customerAddress === 'string' && apiData.customerAddress !== 'N/A'
      ? apiData.customerAddress
      : buildMultilineAddress(apiData, apiData.receipt);

    // Map items for receipt
    const items = (apiData.details || []).map((detail: any) => {
      const itemName = detail.itemName || detail.ItemName || '';
      const desc = detail.description || detail.Description || '';
      const combinedDescription = itemName && desc && itemName !== desc
        ? `${itemName} - ${desc}`
        : (itemName || desc || 'Service Item');

      return {
        description: combinedDescription,
        quantity: detail.quantity || detail.Quantity || 1,
        unitPrice: detail.unitAmount || detail.UnitAmount || detail.unitPrice || 0,
        amount: detail.totalPayingAmount || detail.TotalPayingAmount || detail.lineTotalAmount || detail.amount || 0,
        referenceNo: detail.refDocNumber || detail.RefDocNumber || ''
      };
    });

    // Calculate description from details if items not used
    const description = items
      .map((item: any) => item.description + (item.referenceNo ? ` (${item.referenceNo})` : ''))
      .join(', ');

    // Handle receipt totals with broad compatibility
    const totalAmount = apiData.receipt?.totalAmount ||
      apiData.receipt?.ReceiptTotalAmount ||
      apiData.receipt?.payingAmount ||
      apiData.receipt?.PayingAmount ||
      apiData.totalAmount ||
      apiData.TotalAmount ||
      apiData.payingAmount ||
      0;

    return {
      receiptNo: apiData.receipt?.receiptCode || apiData.receipt?.ReceiptCode || apiData.receiptCode || apiData.code || apiData.Code || 'N/A',
      date: formatDate(apiData.receipt?.receiptDate || apiData.receipt?.ReceiptDate || apiData.transactionDate || apiData.TransactionDate || apiData.receiptDate || new Date()),
      receivedFrom: apiData.receipt?.payeeName || apiData.receipt?.PayeeName || apiData.customerName || apiData.CustomerName || apiData.payeeName || 'N/A',
      address: customerAddress,
      invoiceNo: apiData.code || apiData.invoiceCode || apiData.Code || apiData.invoiceNo || 'N/A',
      refDocNo: apiData.refDocNumber || apiData.RefDocNumber || apiData.invoice?.refDocNumber || apiData.invoice?.RefDocNumber || '',
      description: description || 'Services Rendered',
      totalAmount: totalAmount,
      dollarsInWords: amountToWords(totalAmount),
      paymentMethod: paymentModeToLabel(apiData.receipt?.paymentMode ?? apiData.receipt?.PaymentMode ?? apiData.paymentMode ?? apiData.PaymentMode),
      paymentModeDocNo: apiData.paymentModeDocNo || apiData.PaymentModeDocNo || apiData.receipt?.paymentModeDocNo || '',
      items: items
    };
  };

  // Function to map API data to InvoiceTemplate interface for TaxInvoice component
  const mapToTaxInvoiceProps = (apiData: any) => {
    const address = apiData.customerAddress && typeof apiData.customerAddress === 'string' && apiData.customerAddress !== 'N/A'
      ? apiData.customerAddress
      : buildMultilineAddress(apiData, apiData.receipt);
    let items: any[] = [];

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
      items = (apiData.details || []).map((detail: any) => ({
        description: detail.itemName || detail.description || detail.ItemName || detail.Description || 'Item',
        referenceNo: detail.refDocNumber || detail.RefDocNumber || detail.ReferenceNo || 'N/A',
        gstPercent: detail.lineTaxPercent || detail.LineTaxPercent || apiData.taxPercentage || apiData.TaxPercentage || 0,
        qty: detail.quantity || detail.Quantity || 1,
        unitPrice: detail.unitAmount || detail.UnitAmount || detail.unitPrice || detail.UnitPrice || 0,
        amount: detail.lineTotalAmount || detail.LineTotalAmount || detail.totalPayingAmount || detail.TotalPayingAmount || 0
      }));
    }

    const subTotal = apiData.summary?.subtotal || apiData.subtotal || (apiData.totalAmount || 0) - (apiData.taxAmount || 0);

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
      paymentMode: paymentModeToLabel(apiData.paymentMode ?? apiData.PaymentMode ?? apiData.receipt?.paymentMode),
      paymentModeDocNo: apiData.paymentModeDocNo || apiData.PaymentModeDocNo || apiData.receipt?.paymentModeDocNo || '',
    };
  };

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

  const handleDownloadPdf = async () => {
    if (!contentRef.current) return
    setIsGeneratingPdf(true)
    try {
      let html2pdf = (window as any).html2pdf
      if (!html2pdf) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script')
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js'
          script.onload = () => resolve()
          script.onerror = () => reject(new Error('Failed to load PDF library'))
          document.head.appendChild(script)
        })
        html2pdf = (window as any).html2pdf
      }
      const styledClone = cloneWithStyles(contentRef.current)
      const container = document.createElement('div')
      container.style.position = 'absolute'
      container.style.left = '-9999px'
      container.style.top = '0'
      const isReceipt = !!invoiceData?.receipt;
      container.style.width = '210mm'
      container.style.backgroundColor = 'white'
      container.appendChild(styledClone)
      document.body.appendChild(container)
      await new Promise((resolve) => setTimeout(resolve, 100))

      const fileName = isReceipt
        ? `Receipt-${invoiceData.receipt?.receiptCode || invoiceData.code || 'Document'}.pdf`
        : `Invoice-${invoiceData.code || invoiceData.invoiceCode || 'Document'}.pdf`;

      const opt = {
        margin: isReceipt ? [10, 10, 10, 10] : [5, 5, 5, 5],
        filename: fileName,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false, letterRendering: true, allowTaint: true },
        jsPDF: { unit: 'mm', format: isReceipt ? 'a5' : 'a4', orientation: isReceipt ? 'landscape' : 'portrait' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
      }
      await html2pdf().set(opt).from(container).save()
      setTimeout(() => { if (document.body.contains(container)) document.body.removeChild(container) }, 1000)
    } catch (error: any) {
      console.error('Error generating PDF:', error)
      alert('PDF generation failed. Please try the Print option and save as PDF.')
    } finally {
      setIsGeneratingPdf(false)
    }
  }

  const handleGeneratePDF = async () => {
    if (!contentRef.current || isGenerating) return
    setIsGenerating(true)
    try {
      const pages = contentRef.current.querySelectorAll('[data-pdf-page]')
      const targetPages = pages.length > 0 ? Array.from(pages) : [contentRef.current];
      const isReceipt = !!invoiceData?.receipt;

      const pdf = new jsPDF({
        orientation: isReceipt ? 'landscape' : 'portrait',
        unit: 'mm',
        format: isReceipt ? 'a5' : 'a4',
      })

      for (let i = 0; i < targetPages.length; i++) {
        const pageElement = targetPages[i] as HTMLElement
        const originalBoxShadow = pageElement.style.boxShadow
        pageElement.style.boxShadow = 'none'

        const canvas = await html2canvas(pageElement, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          logging: false,
          windowWidth: 794,
        })
        pageElement.style.boxShadow = originalBoxShadow
        if (i > 0) pdf.addPage(isReceipt ? 'a5' : 'a4', isReceipt ? 'landscape' : 'portrait')
        const imgData = canvas.toDataURL('image/png', 1.0)
        pdf.addImage(imgData, 'PNG', 0, 0, pdf.internal.pageSize.getWidth(), pdf.internal.pageSize.getHeight())
      }
      const pdfBlob = pdf.output('blob')
      const blobUrl = URL.createObjectURL(pdfBlob)
      const newTab = window.open(blobUrl, '_blank')

      if (!newTab) {
        const link = document.createElement('a')
        link.href = blobUrl
        link.download = isReceipt
          ? `Receipt-${invoiceData.receipt?.receiptCode || invoiceData.code || 'Document'}.pdf`
          : `Invoice-${invoiceData.code || invoiceData.invoiceCode || 'Document'}.pdf`;
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

  const handlePrint = () => handleGeneratePDF();
  const toggleFullscreen = () => setIsFullscreen(!isFullscreen);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="fixed inset-0 bg-black bg-opacity-75 transition-opacity" onClick={onClose} />
      <div className={`fixed inset-0 flex items-center justify-center p-4 transition-all ${isFullscreen ? 'p-0' : ''}`}>
        <div className={`relative bg-white rounded-lg shadow-2xl flex flex-col transition-all ${isFullscreen ? 'w-full h-full rounded-none' : 'w-full max-w-6xl h-[90vh]'}`} onClick={(e) => e.stopPropagation()}>
          <div className="sticky top-0 bg-gradient-to-r from-blue-700 to-blue-900 px-6 py-4 rounded-t-lg flex items-center justify-between z-10">
            <h2 className="text-xl font-bold text-white">
              {invoiceData?.receipt ? 'Receipt' : 'Invoice'} {invoiceData?.code || invoiceData?.invoiceCode || ''}
            </h2>
            <div className="flex items-center gap-2">
              <button onClick={toggleFullscreen} className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors">
                {isFullscreen ? <Minimize2Icon className="w-5 h-5" /> : <Maximize2Icon className="w-5 h-5" />}
              </button>
              <button onClick={handlePrint} disabled={isGenerating || isGeneratingPdf || loading || !invoiceData} className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors disabled:opacity-50">
                <PrinterIcon className={`w-5 h-5 ${isGenerating || isGeneratingPdf || loading ? 'animate-pulse' : ''}`} />
              </button>
              <button onClick={handleDownloadPdf} disabled={isGenerating || isGeneratingPdf || loading || !invoiceData} className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors disabled:opacity-50">
                <DownloadIcon className={`w-5 h-5 ${isGenerating || isGeneratingPdf || loading ? 'animate-pulse' : ''}`} />
              </button>
              <button onClick={onClose} className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors">
                <XIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-auto relative bg-gray-50">
            {loading && !htmlContent ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center"><div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700 mb-4" /><p className="text-gray-600">Loading document...</p></div>
              </div>
            ) : htmlContent ? (
              <div className="p-4 relative min-h-full">
                {(isGenerating || isGeneratingPdf) && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-50 bg-opacity-75 z-20">
                    <div className="text-center"><div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700 mb-4"></div><p className="text-gray-600">Generating PDF...</p></div>
                  </div>
                )}
                <div ref={contentRef}>
                  {invoiceData?.receipt ? (
                    <div data-pdf-page><ReceiptTemplate {...mapToReceiptTemplateData(invoiceData)} /></div>
                  ) : (
                    <div data-pdf-page><TaxInvoice {...mapToTaxInvoiceProps(invoiceData)} /></div>
                  )}
                </div>
              </div>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center"><p className="text-gray-600">No document data available</p></div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}