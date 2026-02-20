import React from 'react';
import { PAYMENT_MODE_OPTIONS } from '../../utils/paymentMode';

interface PaymentModeSelectorProps {
    paymentMode: string;
    setPaymentMode: (val: string) => void;
    refDocumentNo: string;
    setRefDocumentNo: (val: string) => void;
    disabled?: boolean;
}

export function PaymentModeSelector({
    paymentMode,
    setPaymentMode,
    refDocumentNo,
    setRefDocumentNo,
    disabled = false
}: PaymentModeSelectorProps) {
    return (
        <div className="bg-white rounded-lg p-4 shadow-md space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <label className="w-full sm:w-[140px] font-semibold text-gray-700 text-sm">Payment Mode:</label>
                <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value)}
                    disabled={disabled}
                    className="flex-1 px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-[#4b3621] focus:outline-none focus:ring-2 focus:ring-[#4b3621]/20 transition-all disabled:bg-gray-100"
                >
                    {PAYMENT_MODE_OPTIONS.map((mode) => (
                        <option key={mode.code} value={mode.label}>{mode.label}</option>
                    ))}
                </select>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <label className="w-full sm:w-[140px] font-semibold text-gray-700 text-sm">Ref Doc No:</label>
                <input
                    type="text"
                    value={refDocumentNo}
                    onChange={(e) => setRefDocumentNo(e.target.value)}
                    disabled={disabled}
                    className="flex-1 px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-[#4b3621] focus:outline-none focus:ring-2 focus:ring-[#4b3621]/20 transition-all disabled:bg-gray-100"
                    placeholder="Enter reference number (e.g., cheque no, transaction id)"
                />
            </div>
        </div>
    );
}
