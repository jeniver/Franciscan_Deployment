import React, { useState } from 'react';
import { XIcon, DownloadIcon, PrinterIcon } from 'lucide-react';
import { Receipt, receiptService } from '../services/receiptService';
import { useToast } from '../contexts/ToastContext';

interface ReceiptDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  receipt: Receipt | null;
}

export function ReceiptDetailModal({ isOpen, onClose, receipt }: ReceiptDetailModalProps) {
  const { showError, showSuccess } = useToast();
  const [isDownloading, setIsDownloading] = useState(false);

  if (!isOpen || !receipt) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString?: string) => {
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
  };

  const handlePrint = () => {
    window.print();
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

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
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
                onClick={handleDownload}
                disabled={isDownloading}
                className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Download PDF"
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
          <div className="p-6">
            {/* Receipt Header */}
            <div className="mb-6 pb-6 border-b border-gray-200">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Receipt Code</p>
                  <p className="text-lg font-semibold text-gray-900">{receipt.receiptCode}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Date</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {formatDate(receipt.receiptDate || receipt.createdAt)}
                  </p>
                </div>
                {receipt.invoiceCode && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Invoice Code</p>
                    <p className="text-lg font-semibold text-gray-900">{receipt.invoiceCode}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-600 mb-1">Payment Mode</p>
                  <p className="text-lg font-semibold text-gray-900">{receipt.paymentMode}</p>
                </div>
              </div>
            </div>

            {/* Customer Information */}
            <div className="mb-6 pb-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer Information</h3>
              <div>
                <p className="text-sm text-gray-600 mb-1">Customer Name</p>
                <p className="text-lg font-medium text-gray-900">{receipt.customerName}</p>
              </div>
            </div>

            {/* Invoice Details */}
            {receipt.invoiceDetails && receipt.invoiceDetails.length > 0 && (
              <div className="mb-6 pb-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Invoice Details</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">
                          Description
                        </th>
                        {receipt.invoiceDetails.some((d) => d.quantity) && (
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">
                            Quantity
                          </th>
                        )}
                        {receipt.invoiceDetails.some((d) => d.unitPrice) && (
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">
                            Unit Price
                          </th>
                        )}
                        <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600 uppercase">
                          Amount
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {receipt.invoiceDetails.map((detail, index) => (
                        <tr key={index}>
                          <td className="px-4 py-3 text-sm text-gray-900">{detail.description}</td>
                          {receipt.invoiceDetails!.some((d) => d.quantity) && (
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {detail.quantity || '-'}
                            </td>
                          )}
                          {receipt.invoiceDetails!.some((d) => d.unitPrice) && (
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {detail.unitPrice ? formatCurrency(detail.unitPrice) : '-'}
                            </td>
                          )}
                          <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">
                            {formatCurrency(detail.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Payment Summary */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Summary</h3>
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total Amount</span>
                  <span className="text-lg font-semibold text-gray-900">
                    {formatCurrency(receipt.totalAmount)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Paying Amount</span>
                  <span className="text-lg font-semibold text-green-600">
                    {formatCurrency(receipt.payingAmount)}
                  </span>
                </div>
                {receipt.totalAmount > receipt.payingAmount && (
                  <div className="flex justify-between items-center pt-2 border-t border-gray-300">
                    <span className="text-sm font-medium text-gray-700">Balance</span>
                    <span className="text-lg font-bold text-orange-600">
                      {formatCurrency(receipt.totalAmount - receipt.payingAmount)}
                    </span>
                  </div>
                )}
              </div>
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

