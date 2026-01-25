import React, { useEffect, useState } from 'react';
import { XIcon, DownloadIcon, Maximize2Icon, Minimize2Icon } from 'lucide-react';

interface ReportViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  pdfBlob: Blob | null;
  title?: string;
  loading?: boolean;
}

export function ReportViewerModal({
  isOpen,
  onClose,
  pdfBlob,
  title = 'Report Viewer',
  loading = false,
}: ReportViewerModalProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (pdfBlob) {
      const url = URL.createObjectURL(pdfBlob);
      setPdfUrl(url);
      setError(null);

      // Cleanup function
      return () => {
        URL.revokeObjectURL(url);
        setPdfUrl(null);
      };
    } else {
      setPdfUrl(null);
    }
  }, [pdfBlob]);

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

  const handleDownload = () => {
    if (pdfBlob && title) {
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${title.replace(/\s+/g, '-').toLowerCase()}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 100);
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
            <h2 className="text-xl font-bold text-white">{title}</h2>
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
              {pdfBlob && (
                <button
                  onClick={handleDownload}
                  className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors"
                  title="Download PDF"
                >
                  <DownloadIcon className="w-5 h-5" />
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
          <div className="flex-1 overflow-hidden relative">
            {loading && !pdfUrl ? (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
                <div className="text-center">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#8b2828] mb-4"></div>
                  <p className="text-gray-600">Loading report...</p>
                </div>
              </div>
            ) : error ? (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
                <div className="text-center p-8">
                  <div className="text-red-500 mb-4">
                    <XIcon className="w-16 h-16 mx-auto" />
                  </div>
                  <p className="text-red-600 font-semibold mb-2">Error loading report</p>
                  <p className="text-gray-600 text-sm">{error}</p>
                </div>
              </div>
            ) : pdfUrl ? (
              <iframe
                src={pdfUrl}
                className="w-full h-full border-0"
                title={title}
                onError={() => setError('Failed to load PDF. Please try again.')}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
                <div className="text-center p-8">
                  <p className="text-gray-600">No report available</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

