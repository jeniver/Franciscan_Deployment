import React, { useState, useRef } from 'react';
import {
    XIcon,
    DownloadIcon,
    PrinterIcon,
    Maximize2Icon,
    Minimize2Icon,
} from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { WakeRoomAgreementTemplate } from './WakeRoomAgreementTemplate';
import { WakeRoomBooking } from '../services/wakeRoomService';

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
    const contentRef = useRef<HTMLDivElement>(null);

    const toggleFullscreen = () => {
        setIsFullscreen(!isFullscreen);
    };

    const handlePrint = () => {
        if (!contentRef.current) return;

        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            alert('Please allow popups to print');
            return;
        }

        const content = contentRef.current.innerHTML;

        printWindow.document.write(`
         <html>
             <head>
                 <title>Wake Room Agreement - ${booking?.code}</title>
                 <style>
                     @page { size: A4; margin: 10mm; }
                     body { 
                        font-family: serif; 
                        margin: 0;
                        padding: 0;
                        -webkit-print-color-adjust: exact;
                     }
                      /* Tailwind utility replacements for print as we can't easily load full tailwind css */
                     .text-center { text-align: center; }
                     .font-bold { font-weight: bold; }
                     .flex { display: flex; }
                     .items-center { align-items: center; }
                     .justify-between { justify-content: space-between; }
                     .justify-center { justify-content: center; }
                     .justify-end { justify-content: flex-end; }
                     .flex-1 { flex: 1; }
                     .w-full { width: 100%; }
                     .border { border-width: 1px; border-style: solid; }
                     .border-black { border-color: black; }
                     .border-b { border-bottom-width: 1px; }
                     .border-r { border-right-width: 1px; }
                     .p-1 { padding: 0.25rem; }
                     .p-2 { padding: 0.5rem; }
                     .px-2 { padding-left: 0.5rem; padding-right: 0.5rem; }
                     .mb-1 { margin-bottom: 0.25rem; }
                     .mb-2 { margin-bottom: 0.5rem; }
                     .mb-4 { margin-bottom: 1rem; }
                     .mb-8 { margin-bottom: 2rem; }
                     .mt-8 { margin-top: 2rem; }
                     .gap-2 { gap: 0.5rem; }
                     .gap-6 { gap: 1.5rem; }
                     .grid { display: grid; }
                     .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
                     .text-sm { font-size: 0.875rem; }
                     .text-xs { font-size: 0.75rem; }
                     .uppercase { text-transform: uppercase; }
                     .italic { font-style: italic; }
                     .page-break { page-break-after: always; }
                     
                     table { border-collapse: collapse; width: 100%; }
                     th, td { border: 1px solid black; padding: 4px; text-align: left; }
                     
                     /* Specific overrides for the template structure */
                     .w-32 { width: 8rem; }
                     .h-32 { height: 8rem; }
                     .min-h-\[297mm\] { min-height: 297mm; }
                 </style>
                 <script src="https://cdn.tailwindcss.com"></script>
             </head>
             <body>
                 ${content}
                 <script>
                    window.onload = () => {
                        window.print();
                        /* window.close(); */ 
                    }
                 </script>
             </body>
         </html>
     `);
        printWindow.document.close();
    };

    const handleDownloadPdf = async () => {
        if (!contentRef.current || isGeneratingPdf) return;
        setIsGeneratingPdf(true);

        try {
            const pages = contentRef.current.querySelectorAll('.min-h-\\[297mm\\]');
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            for (let i = 0; i < pages.length; i++) {
                const page = pages[i] as HTMLElement;
                if (i > 0) pdf.addPage();

                const canvas = await html2canvas(page, {
                    scale: 2,
                    useCORS: true,
                    logging: false,
                    backgroundColor: '#ffffff'
                });

                const imgData = canvas.toDataURL('image/png');
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

                pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            }

            pdf.save(`WakeRoomAgreement-${booking?.code || 'draft'}.pdf`);

        } catch (error) {
            console.error('PDF Generation failed', error);
            alert('Failed to generate PDF');
        } finally {
            setIsGeneratingPdf(false);
        }
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
                            <WakeRoomAgreementTemplate ref={contentRef} booking={booking} />
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
