import React from 'react';
import { EyeIcon, PrinterIcon, PlusIcon, ReceiptIcon } from 'lucide-react';

interface HeaderProps {
  applicationNumber: string;
  onView?: () => void;
  onPrintAgreement?: () => void;
  onNewApplication?: () => void;
  onGoToInvoiceReceipt?: () => void | Promise<void>;
}

export function Header({
  applicationNumber,
  onView,
  onPrintAgreement,
  onNewApplication,
  onGoToInvoiceReceipt
}: HeaderProps) {
  const handleGoToInvoiceReceipt = async () => {
    if (onGoToInvoiceReceipt) {
      await onGoToInvoiceReceipt();
    }
  };

  return <header className="bg-white border-b border-gray-200">
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <img src="/headerBgRight_%281%29.png" alt="Logo" className="h-12 w-auto" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Application Details
            </h1>
            <p className="text-sm text-gray-600">
              View and manage application details for niche booking.
            </p>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Application Number:</span>
          <span className="text-sm font-semibold text-gray-900">
            {applicationNumber}
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onView}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#8b2828] via-[#7d1f1f] to-[#8b2828] text-white rounded-xl text-sm font-semibold shadow-md hover:shadow-xl hover:shadow-[#8b2828]/25 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
          >
            <EyeIcon className="w-4 h-4" />
            View
          </button>
          <button
            onClick={onPrintAgreement}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-br from-gray-100 to-gray-200 text-gray-800 rounded-xl text-sm font-semibold shadow-sm hover:shadow-md hover:from-gray-200 hover:to-gray-300 transition-all duration-200"
          >
            <PrinterIcon className="w-4 h-4" />
            Print Agreement
          </button>
          <button
            onClick={onNewApplication}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-br from-gray-100 to-gray-200 text-gray-800 rounded-xl text-sm font-semibold shadow-sm hover:shadow-md hover:from-gray-200 hover:to-gray-300 transition-all duration-200"
          >
            <PlusIcon className="w-4 h-4" />
            New Application
          </button>
          <button
            onClick={handleGoToInvoiceReceipt}
            disabled={!applicationNumber.trim()}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#8b2828] via-[#7d1f1f] to-[#8b2828] text-white rounded-xl text-sm font-semibold shadow-md hover:shadow-xl hover:shadow-[#8b2828]/25 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            <ReceiptIcon className="w-4 h-4" />
            Go to Invoice & Receipt
          </button>
        </div>
      </div>
    </div>
  </header>;
}