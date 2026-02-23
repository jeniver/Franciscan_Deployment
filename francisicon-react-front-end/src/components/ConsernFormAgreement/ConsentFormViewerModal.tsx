import React, { useState, useRef } from 'react';
import { XIcon, DownloadIcon, PrinterIcon, Maximize2Icon, Minimize2Icon } from 'lucide-react';
import { DynamicConsentForm } from './DynamicConsentForm';
import { printContentFromRef } from '../../utils/printContent';

interface BeneficiaryData {
  name: string;
  nric: string;
  relationship?: string;
  isDeceased?: boolean;
  isLiving?: boolean;
  isLostCapacity?: boolean;
}

interface FormData {
  applicantName: string;
  applicantNric: string;
  nominee1Name: string;
  nominee1Nric: string;
  nominee2Name?: string;
  nominee2Nric?: string;
  chapelName: string;
  nicheNumber: string;
  beneficiary1: BeneficiaryData;
  beneficiary2?: BeneficiaryData;
  formType: 'deceased' | 'living' | 'lostCapacity';
}

interface ConsentFormViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  formData: FormData | null;
  loading?: boolean;
}

export function ConsentFormViewerModal({
  isOpen,
  onClose,
  formData,
  loading = false,
}: ConsentFormViewerModalProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null);

  const handleGeneratePDF = () => {
    if (!contentRef.current) return;
    printContentFromRef(
      contentRef.current,
      `Consent Form - ${formData?.chapelName || ''} ${formData?.nicheNumber || ''}`,
    );
  };

  const handleDownloadPdf = () => {
    if (!contentRef.current || !formData) return;
    handleGeneratePDF();
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
        className={`fixed inset-0 flex items-center justify-center p-4 transition-all ${isFullscreen ? 'p-0' : ''}`}
      >
        <div
          className={`relative bg-white rounded-lg shadow-2xl flex flex-col transition-all ${isFullscreen ? 'w-full h-full rounded-none' : 'w-full max-w-6xl h-[90vh]'}`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 bg-gradient-to-r from-[#8b2828] to-[#7d1f1f] px-6 py-4 rounded-t-lg flex items-center justify-between z-10">
            <h2 className="text-xl font-bold text-white">
              Consent Form - {formData?.chapelName} {formData?.nicheNumber}
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
                onClick={handleGeneratePDF}
                disabled={isGenerating}
                className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Print Consent Form"
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
            {loading && !formData ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#8b2828] mb-4"></div>
                  <p className="text-gray-600">Loading consent form...</p>
                </div>
              </div>
            ) : isGeneratingPdf ? (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-50 bg-opacity-75 z-20">
                <div className="text-center">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#8b2828] mb-4"></div>
                  <p className="text-gray-600">Generating PDF...</p>
                </div>
              </div>
            ) : formData ? (
              <div ref={contentRef}>
                <DynamicConsentForm formData={formData} />
              </div>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center p-8">
                  <p className="text-gray-600">No consent form data available</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}