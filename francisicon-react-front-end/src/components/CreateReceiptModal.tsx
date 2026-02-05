import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { XIcon, SearchIcon } from 'lucide-react';
import { RootState } from '../store';
import type { User } from '../store/authSlice';
import { CreateReceiptRequest, InvoiceDetail, Invoice } from '../services/receiptService';
import { USER_STORAGE_KEY } from '../constants/storageKeys';
import { getStoredJSON } from '../utils/storage';

const extractNumericValue = (value: any, fallback = 0): number => {
  if (typeof value === 'number' && !Number.isNaN(value)) return value;
  if (Array.isArray(value)) {
    for (const entry of value) {
      const num = Number(entry);
      if (!Number.isNaN(num)) return num;
    }
    return fallback;
  }
  const parsed = Number(value);
  return Number.isNaN(parsed) ? fallback : parsed;
};

const extractRefValue = (value: any): string => {
  if (!value) return '';
  if (Array.isArray(value)) {
    return value.filter(Boolean).join(' ').trim();
  }
  return String(value).trim();
};

const mapInvoiceDetails = (rawDetails: any[]): InvoiceDetail[] => {
  if (!Array.isArray(rawDetails)) return [];

  return rawDetails.map((detail: any, index: number) => {
    const quantity = extractNumericValue(detail.quantity ?? detail.Quantity, 1) || 1;
    const unitPrice = extractNumericValue(
      detail.unitAmount ?? detail.UnitAmount ?? detail.unitPrice,
      0
    );
    const amount =
      extractNumericValue(
        detail.amount ?? detail.lineTotalAmount ?? detail.LineTotalAmount,
        unitPrice * quantity
      ) || unitPrice * quantity;

    const description =
      detail.description ||
      extractRefValue(detail.refDocName || detail.RefDocName) ||
      extractRefValue(detail.itemName) ||
      (detail.itemId ? `Item ${detail.itemId}` : `Item ${index + 1}`);

    return {
      invoiceDetailId: detail.invoiceDetailId ?? detail.InvoiceDetailId,
      description,
      quantity,
      unitPrice,
      amount,
    };
  });
};

const PAYMENT_MODE_OPTIONS = [
  { label: 'Cash', code: 1 },
  { label: 'Cheque', code: 2 },
  { label: 'TT', code: 3 },
  { label: 'Others', code: 4 },
];

const resolvePaymentModeLabel = (value: any): string => {
  if (value === null || value === undefined) return 'Cash';
  const upper = String(value).toUpperCase().trim();
  const byCode = PAYMENT_MODE_OPTIONS.find(
    (option) => String(option.code) === upper || option.label.toUpperCase() === upper
  );
  return byCode ? byCode.label : 'Others';
};

const resolvePaymentModeCode = (label: string): number => {
  const match = PAYMENT_MODE_OPTIONS.find(
    (option) => option.label.toLowerCase() === label?.toLowerCase()
  );
  return match ? match.code : 4;
};

interface CreateReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: CreateReceiptRequest) => Promise<void>;
  onFetchInvoice?: (code: string) => Promise<void>;
  invoiceCode?: string;
  invoiceData?: Invoice | Record<string, any> | null;
  onClearInvoice?: () => void;
  loading?: boolean;
}

export function CreateReceiptModal({
  isOpen,
  onClose,
  onCreate,
  onFetchInvoice,
  invoiceCode: initialInvoiceCode,
  invoiceData = null,
  onClearInvoice,
  loading = false,
}: CreateReceiptModalProps) {
  const [formData, setFormData] = useState<CreateReceiptRequest>({
    invoiceId: undefined,
    customerName: '',
    totalAmount: 0,
    payingAmount: 0,
    paymentMode: 'Cash',
    invoiceDetails: [],
  });
  const [invoiceCode, setInvoiceCode] = useState(initialInvoiceCode || '');
  const [invoiceDetails, setInvoiceDetails] = useState<InvoiceDetail[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const user = useSelector((state: RootState) => state.auth.user);
  const resolvedUser: User | null = React.useMemo(
    () => user ?? getStoredJSON<User>(USER_STORAGE_KEY),
    [user]
  );

  useEffect(() => {
    if (initialInvoiceCode) {
      setInvoiceCode(initialInvoiceCode);
    }
  }, [initialInvoiceCode]);

  const handleFetchInvoice = async () => {
    if (!invoiceCode || !onFetchInvoice) return;
    try {
      await onFetchInvoice(invoiceCode);
      setErrors({});
    } catch (error: any) {
      setErrors({ invoiceCode: error.message || 'Failed to fetch invoice' });
    }
  };

  useEffect(() => {
    if (!invoiceData) return;

    const resolvedInvoiceId =
      invoiceData.invoiceId ??
      invoiceData.InvoiceId ??
      invoiceData.document?.InvoiceId ??
      undefined;

    const resolvedInvoiceCode =
      invoiceData.invoiceCode ??
      invoiceData.Code ??
      invoiceData.code ??
      invoiceData.document?.Code ??
      '';

    const resolvedCustomerName =
      invoiceData.customerName ??
      invoiceData.CustomerName ??
      invoiceData.document?.CustomerName ??
      '';

    const resolvedPaymentMode =
      invoiceData.paymentMode ??
      invoiceData.PaymentMode ??
      invoiceData.document?.PaymentMode ??
      'Cash';
    const normalizedPaymentMode = resolvePaymentModeLabel(resolvedPaymentMode);

    const resolvedTotalAmount = extractNumericValue(
      invoiceData.totalAmount ?? invoiceData.TotalAmount ?? invoiceData.document?.TotalAmount,
      0
    );

    const resolvedPayingAmount = extractNumericValue(
      invoiceData.payingAmount ??
        invoiceData.PayingAmount ??
        invoiceData.totalPayingAmount ??
        invoiceData.TotalPayingAmount ??
        invoiceData.document?.PayingAmount ??
        invoiceData.document?.TotalPayingAmount,
      resolvedTotalAmount
    );

    const rawDetails =
      invoiceData.invoiceDetails ??
      invoiceData.details ??
      invoiceData.document?.details ??
      [];

    const normalizedDetails: InvoiceDetail[] = mapInvoiceDetails(rawDetails);

    const cleanedInvoiceCode = (resolvedInvoiceCode || invoiceCode || '').toString().trim();
    setInvoiceCode(cleanedInvoiceCode);
    setInvoiceDetails(normalizedDetails);
    setFormData((prev) => ({
      ...prev,
      invoiceId: resolvedInvoiceId,
      customerName: resolvedCustomerName || prev.customerName,
      totalAmount: resolvedTotalAmount || normalizedDetails.reduce((sum, d) => sum + (d.amount || 0), 0),
      payingAmount: resolvedPayingAmount || resolvedTotalAmount,
      paymentMode: normalizedPaymentMode || prev.paymentMode,
      invoiceDetails: normalizedDetails,
    }));
    setErrors({});
  }, [invoiceData]);

  const handleAddDetail = () => {
    setInvoiceDetails([
      ...invoiceDetails,
      { description: '', amount: 0, quantity: 1, unitPrice: 0 },
    ]);
  };

  const handleRemoveDetail = (index: number) => {
    setInvoiceDetails(invoiceDetails.filter((_, i) => i !== index));
  };

  const handleDetailChange = (index: number, field: keyof InvoiceDetail, value: any) => {
    const updated = [...invoiceDetails];
    updated[index] = { ...updated[index], [field]: value };
    
    // Auto-calculate amount if quantity and unitPrice are provided
    if (field === 'quantity' || field === 'unitPrice') {
      const quantity = field === 'quantity' ? value : updated[index].quantity || 1;
      const unitPrice = field === 'unitPrice' ? value : updated[index].unitPrice || 0;
      updated[index].amount = quantity * unitPrice;
    }
    
    setInvoiceDetails(updated);
    
    // Recalculate total
    const total = updated.reduce((sum, detail) => sum + (detail.amount || 0), 0);
    setFormData({ ...formData, totalAmount: total, invoiceDetails: updated });
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.customerName.trim()) {
      newErrors.customerName = 'Customer name is required';
    }
    if (formData.totalAmount <= 0) {
      newErrors.totalAmount = 'Total amount must be greater than 0';
    }
    if (formData.payingAmount <= 0) {
      newErrors.payingAmount = 'Paying amount must be greater than 0';
    }
    if (formData.payingAmount > formData.totalAmount) {
      newErrors.payingAmount = 'Paying amount cannot exceed total amount';
    }
    if (!formData.paymentMode) {
      newErrors.paymentMode = 'Payment mode is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    
    const paymentModeCode = resolvePaymentModeCode(formData.paymentMode);
    const dataToSubmit: CreateReceiptRequest = {
      ...formData,
      paymentMode: paymentModeCode,
      churchId: resolvedUser?.churchId,
      userId: resolvedUser?.id,
      invoiceDetails: invoiceDetails.length > 0 ? invoiceDetails : undefined,
    };
    
    if (!dataToSubmit.churchId || !dataToSubmit.userId) {
      setErrors((prev) => ({
        ...prev,
        submit: 'Missing user/church information. Please sign out and sign in again before creating receipts.',
      }));
      return;
    }
    
    try {
      await onCreate(dataToSubmit);
      handleClose();
    } catch (error) {
      // Error handling is done in the parent component
    }
  };

  const handleClose = () => {
    setFormData({
      invoiceId: undefined,
      customerName: '',
      totalAmount: 0,
      payingAmount: 0,
      paymentMode: 'Cash',
      invoiceDetails: [],
    });
    setInvoiceCode('');
    setInvoiceDetails([]);
    setErrors({});
    if (onClearInvoice) {
      onClearInvoice();
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={handleClose} />
      
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-gradient-to-r from-[#8b2828] to-[#7d1f1f] px-6 py-4 rounded-t-lg flex items-center justify-between z-10">
            <h2 className="text-xl font-bold text-white">Create New Receipt</h2>
            <button
              onClick={handleClose}
              className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors"
            >
              <XIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Invoice Code Search */}
            {onFetchInvoice && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Invoice Code (Optional)
                </label>
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={invoiceCode}
                      onChange={(e) => setInvoiceCode(e.target.value)}
                      placeholder="Enter invoice code to auto-fill"
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8b2828]"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleFetchInvoice}
                    disabled={!invoiceCode || loading}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Search
                  </button>
                </div>
                {errors.invoiceCode && (
                  <p className="mt-1 text-sm text-red-600">{errors.invoiceCode}</p>
                )}
              </div>
            )}

            {/* Customer Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Customer Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.customerName}
                onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                  errors.customerName
                    ? 'border-red-500 focus:ring-red-500'
                    : 'border-gray-300 focus:ring-[#8b2828]'
                }`}
                placeholder="Enter customer name"
                required
              />
              {errors.customerName && (
                <p className="mt-1 text-sm text-red-600">{errors.customerName}</p>
              )}
            </div>

            {/* Payment Mode */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Mode <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.paymentMode}
                onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value })}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                  errors.paymentMode
                    ? 'border-red-500 focus:ring-red-500'
                    : 'border-gray-300 focus:ring-[#8b2828]'
                }`}
                required
              >
                {PAYMENT_MODE_OPTIONS.map((option) => (
                  <option key={option.code} value={option.label}>
                    {option.label}
                  </option>
                ))}
              </select>
              {errors.paymentMode && (
                <p className="mt-1 text-sm text-red-600">{errors.paymentMode}</p>
              )}
            </div>

            {/* Invoice Details */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-gray-700">
                  Invoice Details (Optional)
                </label>
                <button
                  type="button"
                  onClick={handleAddDetail}
                  className="text-sm text-[#8b2828] hover:text-[#7d1f1f] font-medium"
                >
                  + Add Detail
                </button>
              </div>
              {invoiceDetails.length > 0 && (
                <div className="space-y-3 max-h-60 overflow-y-auto border border-gray-200 rounded-lg p-3">
                  {invoiceDetails.map((detail, index) => (
                    <div key={index} className="flex gap-2 items-start p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1 grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={detail.description}
                          onChange={(e) =>
                            handleDetailChange(index, 'description', e.target.value)
                          }
                          placeholder="Description"
                          className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                        <div className="flex gap-2">
                          <input
                            type="number"
                            value={detail.quantity || ''}
                            onChange={(e) =>
                              handleDetailChange(index, 'quantity', parseFloat(e.target.value) || 1)
                            }
                            placeholder="Qty"
                            min="1"
                            className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          />
                          <input
                            type="number"
                            value={detail.unitPrice || ''}
                            onChange={(e) =>
                              handleDetailChange(index, 'unitPrice', parseFloat(e.target.value) || 0)
                            }
                            placeholder="Unit Price"
                            min="0"
                            step="0.01"
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          />
                          <input
                            type="number"
                            value={detail.amount || ''}
                            onChange={(e) =>
                              handleDetailChange(index, 'amount', parseFloat(e.target.value) || 0)
                            }
                            placeholder="Amount"
                            min="0"
                            step="0.01"
                            className="w-32 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveDetail(index)}
                        className="text-red-600 hover:text-red-800 px-2"
                      >
                        <XIcon className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {invoiceDetails.length > 0 && (
                <div className="mt-3 text-right">
                  <p className="text-sm text-gray-600">
                    Total: <span className="font-semibold text-gray-900">${typeof formData.totalAmount === 'number' ? formData.totalAmount.toFixed(2) : '0.00'}</span>
                  </p>
                </div>
              )}
            </div>

            {/* Amount Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Total Amount <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={formData.totalAmount || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, totalAmount: parseFloat(e.target.value) || 0 })
                  }
                  min="0"
                  step="0.01"
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                    errors.totalAmount
                      ? 'border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:ring-[#8b2828]'
                  }`}
                  required
                />
                {errors.totalAmount && (
                  <p className="mt-1 text-sm text-red-600">{errors.totalAmount}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Paying Amount <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={formData.payingAmount || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, payingAmount: parseFloat(e.target.value) || 0 })
                  }
                  min="0"
                  step="0.01"
                  max={formData.totalAmount}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                    errors.payingAmount
                      ? 'border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:ring-[#8b2828]'
                  }`}
                  required
                />
                {errors.payingAmount && (
                  <p className="mt-1 text-sm text-red-600">{errors.payingAmount}</p>
                )}
                {formData.totalAmount > formData.payingAmount && (
                  <p className="mt-1 text-sm text-orange-600">
                    Balance: ${typeof formData.totalAmount === 'number' && typeof formData.payingAmount === 'number' ? (formData.totalAmount - formData.payingAmount).toFixed(2) : '0.00'}
                  </p>
                )}
              </div>
            </div>

            {errors.submit && (
              <div className="text-sm text-red-600">
                {errors.submit}
              </div>
            )}

            {/* Footer Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-gradient-to-r from-[#8b2828] to-[#7d1f1f] text-white rounded-lg hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading}
              >
                {loading ? 'Creating...' : 'Create Receipt'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

