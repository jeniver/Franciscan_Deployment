import React, { useEffect, useState } from 'react';
import { XIcon, DownloadIcon, PrinterIcon, Maximize2Icon, Minimize2Icon } from 'lucide-react';
import { pdfTemplateService } from '../services/pdfTemplateService';

interface AgreementViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  agreementData: any | null;
  applicationNumber: string;
  loading?: boolean;
}

export function AgreementViewerModal({
  isOpen,
  onClose,
  agreementData,
  applicationNumber,
  loading = false,
}: AgreementViewerModalProps) {
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  useEffect(() => {
    if (agreementData && isOpen) {
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      const template = pdfTemplateService.generateAgreementTemplate(agreementData, baseUrl);
      setHtmlContent(template);
    } else {
      setHtmlContent('');
    }
  }, [agreementData, isOpen]);

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
    if (!agreementData) return;
    
    setIsGeneratingPdf(true);
    try {
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      const pdfBlob = await pdfTemplateService.generateAgreementPdfBlob(agreementData, baseUrl);
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Agreement-${applicationNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 100);
    } catch (error: any) {
      console.error('Error generating PDF:', error);
      alert(`Failed to generate PDF: ${error.message || 'Unknown error'}`);
    } finally {
      setIsGeneratingPdf(false);
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
          <div className="sticky top-0 bg-gradient-to-r from-[#8b2828] to-[#7d1f1f] px-6 py-4 rounded-t-lg flex items-center justify-between z-10">
            <h2 className="text-xl font-bold text-white">
              Agreement - {applicationNumber}
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
                    title="Print Agreement"
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
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#8b2828] mb-4"></div>
                  <p className="text-gray-600">Loading agreement...</p>
                </div>
              </div>
            ) : isGeneratingPdf ? (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-50 bg-opacity-75 z-20">
                <div className="text-center">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#8b2828] mb-4"></div>
                  <p className="text-gray-600">Generating PDF...</p>
                </div>
              </div>
            ) : htmlContent ? (
              <iframe
                srcDoc={htmlContent}
                className="w-full h-full border-0 bg-white"
                title={`Agreement - ${applicationNumber}`}
                style={{ minHeight: '100%' }}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center p-8">
                  <p className="text-gray-600">No agreement data available</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

