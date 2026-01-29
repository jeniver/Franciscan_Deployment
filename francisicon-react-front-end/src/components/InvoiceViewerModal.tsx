import { useEffect, useState } from 'react';
import { XIcon, PrinterIcon, Maximize2Icon, Minimize2Icon } from 'lucide-react';
import { invoiceTemplateService, InvoiceTemplateData } from '../services/invoiceTemplateService';

interface InvoiceViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceData: InvoiceTemplateData | null;
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

  useEffect(() => {
    if (invoiceData && isOpen) {
      const template = invoiceTemplateService.generateInvoiceTemplate(invoiceData);
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

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
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
              Invoice {invoiceData?.invoiceCode || ''}
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
                <button
                  onClick={handlePrint}
                  className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors"
                  title="Print Invoice"
                >
                  <PrinterIcon className="w-5 h-5" />
                </button>
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
                  <p className="text-gray-600">Loading invoice...</p>
                </div>
              </div>
            ) : htmlContent ? (
              <iframe
                srcDoc={htmlContent}
                className="w-full h-full border-0 bg-white"
                title={`Invoice ${invoiceData?.invoiceCode || ''}`}
                style={{ minHeight: '100%' }}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center p-8">
                  <p className="text-gray-600">No invoice data available</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
