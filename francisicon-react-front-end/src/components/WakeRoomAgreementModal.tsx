import React, { useEffect, useState, useRef } from 'react';
import {
    XIcon,
    DownloadIcon,
    PrinterIcon,
    Maximize2Icon,
    Minimize2Icon,
} from 'lucide-react';
import { printContentFromRef } from '../utils/printContent';
import { WakeRoomAgreementTemplate } from './WakeRoomAgreementTemplate';
import { WakeRoomBooking } from '../services/wakeRoomService';
import { invoiceService } from '../services/invoiceService';

interface WakeRoomAgreementModalProps {
    isOpen: boolean;
    onClose: () => void;
    booking: WakeRoomBooking | any;
    loading?: boolean;
}

export function WakeRoomAgreementModal({
    isOpen,
    onClose,
    booking,
    loading = false,
}: WakeRoomAgreementModalProps) {
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const [billingData, setBillingData] = useState<any>(null);
    const contentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let mounted = true;

        const fetchBillingData = async () => {
            if (!isOpen || !booking?.code) {
                if (mounted) {
                    setBillingData(null);
                }
                return;
            }

            try {
                const invoice = await invoiceService.getInvoiceByCode(booking.code, 'WAPP');
                if (mounted) {
                    setBillingData(invoice || null);
                }
            } catch {
                // Keep agreement rendering resilient even if invoice lookup fails.
                if (mounted) {
                    setBillingData(null);
                }
            }
        };

        fetchBillingData();

        return () => {
            mounted = false;
        };
    }, [isOpen, booking?.code]);

    const toggleFullscreen = () => {
        setIsFullscreen(!isFullscreen);
    };

    const handlePrint = () => {
        if (!contentRef.current) return;
        printContentFromRef(contentRef.current, `Wake Room Agreement - ${booking?.code || 'Draft'}`);
    };

    const handleDownloadPdf = () => {
        if (!contentRef.current) return;
        handlePrint();
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
                    className={`relative bg-white rounded-lg shadow-2xl flex flex-col transition-all ${isFullscreen ? 'w-full h-full rounded-none' : 'w-full max-w-5xl h-[90vh]'
                        }`}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="sticky top-0 bg-gradient-to-r from-[#8b2828] to-[#7d1f1f] px-6 py-4 rounded-t-lg flex items-center justify-between z-10">
                        <h2 className="text-xl font-bold text-white">
                            Wake Room Agreement - {booking?.code || 'Draft'}
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
                                onClick={handlePrint}
                                className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors"
                                title="Print"
                            >
                                <PrinterIcon className="w-5 h-5" />
                            </button>

                            <button
                                onClick={handleDownloadPdf}
                                disabled={isGeneratingPdf}
                                className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors disabled:opacity-50"
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
                    <div className="flex-1 overflow-auto relative bg-gray-100 p-8">
                        {loading ? (
                            <div className="flex items-center justify-center h-full">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#8b2828]"></div>
                            </div>
                        ) : booking ? (
                            <WakeRoomAgreementTemplate ref={contentRef} booking={booking} billingData={billingData} />
                        ) : (
                            <div className="text-center text-gray-500 mt-20">
                                No booking data available
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
