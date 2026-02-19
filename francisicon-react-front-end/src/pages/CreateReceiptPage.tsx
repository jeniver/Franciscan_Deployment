import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Layout } from '../components/Layout';
import { useToast } from '../contexts/ToastContext';
import { useApplicationItems } from '../hooks/useApplicationItems';
import { useReceipt } from '../hooks/useReceipt';
import { EyeIcon, LoaderIcon, AlertTriangle, CheckCircle, SaveIcon, PrinterIcon, FileTextIcon } from 'lucide-react';
import { ReceiptDetailModal } from '../components/ReceiptDetailModal';
import type { AppDispatch, RootState } from '../store';
import {
    createIndividualReceipt,
    fetchInvoiceByCode,
    setSelectedReceipt,
    setSelectedInvoice,
    fetchReceiptByCode,
} from '../store/receiptSlice';
import { fetchInvoiceOrApplication, clearCurrentData } from '../store/invoiceSlice';
import { InvoiceItemTable, InvoiceItem } from '../components/common/InvoiceItemTable';
import { PaymentModeSelector } from '../components/common/PaymentModeSelector';
import { CustomerAddressForm } from '../components/common/CustomerAddressForm';
import { receiptService } from '../services/receiptService';

export function CreateReceiptPage() {
    const { code: routeCode } = useParams<{ code?: string }>();
    const navigate = useNavigate();
    const { showSuccess, showError } = useToast();
    const dispatch = useDispatch<AppDispatch>();

    const {
        selectedInvoice,
        isCreating: creatingReceipt,
        currentReceipt,
        selectedReceipt,
        loading: receiptLoading,
    } = useSelector((state: RootState) => state.receipt);

    const { currentData: applicationData, loading: applicationLoading } = useSelector((state: RootState) => state.invoice);

    const { receiptItems, fetchReceiptItems, fetchLastReceiptNumber } = useReceipt();
    const { fetchApplicationItems } = useApplicationItems();

    const [lookupCode, setLookupCode] = useState(routeCode || '');
    const [payeeName, setPayeeName] = useState('');
    const [addressBlock, setAddressBlock] = useState('Block');
    const [addressNumber, setAddressNumber] = useState('');
    const [addressStreet, setAddressStreet] = useState('');
    const [addressUnit, setAddressUnit] = useState('');
    const [addressPostalCode, setAddressPostalCode] = useState('');
    const [addressCountry, setAddressCountry] = useState('Singapore');
    const [paymentMode, setPaymentMode] = useState('Cash');
    const [refDocumentNo, setRefDocumentNo] = useState('');
    const [items, setItems] = useState<InvoiceItem[]>([]);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [isPdfLoading, setIsPdfLoading] = useState(false);
    const [refDocType, setRefDocType] = useState('NAPP');

    // Initial data fetch
    useEffect(() => {
        if (routeCode) {
            handleLookup(routeCode);
        } else {
            // Clear all data if no code provided
            setLookupCode('');
            dispatch(clearCurrentData());
            dispatch(setSelectedInvoice(null));
            dispatch(setSelectedReceipt(null));
            setPayeeName('');
            setAddressBlock('Block');
            setAddressNumber('');
            setAddressStreet('');
            setAddressUnit('');
            setAddressPostalCode('');
            setAddressCountry('Singapore');
            setItems([]);
            setRefDocumentNo('');
        }
        fetchReceiptItems('567', true);
        fetchLastReceiptNumber();
    }, [routeCode]);

    const handleLookup = async (code: string) => {
        if (!code.trim()) return;

        const normalizedCode = code.trim().toUpperCase();

        // STRICT VALIDATION: Only allow Invoice Codes
        // Reject known application prefixes
        if (normalizedCode.startsWith('NAPP') ||
            normalizedCode.startsWith('WAPP') ||
            normalizedCode.startsWith('GOLA') ||
            normalizedCode.startsWith('INCR') ||
            (normalizedCode.startsWith('I-') && !normalizedCode.startsWith('INV'))) {

            showError('Error', 'Only Invoice Codes are allowed for receipt creation.');
            return;
        }

        try {
            // Only try to look up as an invoice
            const invoiceResult = await dispatch(fetchInvoiceByCode(code.trim())).unwrap();

            if (invoiceResult) {
                // Fetch application items for the invoice's reference if available
                if (invoiceResult.refDocNumber) {
                    fetchApplicationItems(invoiceResult.refDocNumber);
                }
                if (routeCode !== code.trim()) {
                    navigate(`/create-receipt/${code.trim()}`, { replace: true });
                }
                return;
            }
        } catch (err) {
            showError('Error', 'No invoice found with this code. Please enter a valid Invoice Code.');
        }
    };

    // Update form when selectedInvoice (from invoice lookup) changes
    useEffect(() => {
        if (selectedInvoice) {
            setPayeeName(selectedInvoice.customerName || '');
            setAddressNumber(selectedInvoice.addressNo || '');
            setAddressStreet(selectedInvoice.address || '');
            setAddressUnit(selectedInvoice.address2 || '');
            setAddressPostalCode(selectedInvoice.districtCode || selectedInvoice.addressCity || '');
            setAddressCountry(selectedInvoice.country || 'Singapore');
            setPaymentMode(selectedInvoice.paymentMode || 'Cash');

            if (selectedInvoice.invoiceDetails && selectedInvoice.invoiceDetails.length > 0) {
                const mappedItems: InvoiceItem[] = selectedInvoice.invoiceDetails.map((detail: any) => ({
                    id: Math.random().toString(36).substr(2, 9),
                    selectItem: detail.itemName || detail.description || 'Other',
                    reference: detail.refDocNumber || '',
                    defaultAmount: detail.unitPrice || detail.unitAmount || 0,
                    amountPaying: detail.payingAmount || 0,
                    quantity: detail.quantity || 1,
                    totalNoTax: detail.lineTotalAmount || detail.amount || 0,
                    taxPercent: detail.lineTaxPercent || 9,
                    taxAmount: detail.lineTaxAmount || 0,
                    totalAmount: (detail.lineTotalAmount || detail.amount || 0) + (detail.lineTaxAmount || 0),
                }));
                setItems(mappedItems);
            }
        }
    }, [selectedInvoice]);

    // Update form when applicationData changes
    useEffect(() => {
        if (applicationData && !selectedInvoice) {
            setPayeeName(applicationData.customerName || '');
            setAddressNumber(applicationData.addressNo || '');
            setAddressStreet(applicationData.address || '');
            setAddressUnit(applicationData.address2 || '');
            setAddressPostalCode(applicationData.districtCode || applicationData.addressCity || '');
            setAddressCountry(applicationData.country || 'Singapore');

            if (applicationData.details && applicationData.details.length > 0) {
                const mappedItems: InvoiceItem[] = applicationData.details.map((detail: any) => ({
                    id: Math.random().toString(36).substr(2, 9),
                    selectItem: detail.itemName || detail.ItemName || 'Other',
                    reference: detail.refDocNumber || detail.RefDocNumber || '',
                    defaultAmount: detail.unitAmount || detail.UnitAmount || 0,
                    amountPaying: detail.payingAmount || detail.PayingAmount || 0,
                    quantity: detail.quantity || detail.Quantity || 1,
                    totalNoTax: detail.lineTotalAmount || detail.LineTotalAmount || 0,
                    taxPercent: detail.lineTaxPercent || detail.LineTaxPercent || 9,
                    taxAmount: detail.lineTaxAmount || detail.LineTaxAmount || 0,
                    totalAmount: (detail.lineTotalAmount || detail.LineTotalAmount || 0) + (detail.lineTaxAmount || detail.LineTaxAmount || 0),
                }));
                setItems(mappedItems);
            }

            // If application has a receipt, try to fetch it
            if (applicationData.hasReceipt) {
                // Try to find receipt code from application data if available
                const rCode = (applicationData as any).receiptCode || (applicationData as any).receipt?.code;
                if (rCode) {
                    dispatch(fetchReceiptByCode(rCode));
                }
            }
        }
    }, [applicationData, selectedInvoice, dispatch]);

    const availableItems = useMemo(() =>
        receiptItems.length > 0
            ? receiptItems.map(item => item.itemName || item.description || '').filter(Boolean)
            : ['Level 3 Niche', 'Niche Inscription', 'Urn', 'Other'],
        [receiptItems]
    );

    const handleCreateReceipt = async () => {
        const totals = items.reduce((acc, item) => ({
            total: acc.total + item.totalAmount,
            tax: acc.tax + item.taxAmount
        }), { total: 0, tax: 0 });

        const receiptDetails = items.map(item => {
            const receiptItem = receiptItems.find(ri => ri.itemName === item.selectItem || ri.description === item.selectItem);
            return {
                itemId: receiptItem?.itemId || 1,
                quantity: item.quantity,
                unitAmount: item.amountPaying,
                payingAmount: item.amountPaying,
                totalPayingAmount: item.totalAmount,
                refDocNumber: item.reference || (refDocType === 'OTHERS' ? 'MISC' : lookupCode),
                refDocName: selectedInvoice?.refDocNumber || applicationData?.refDocName || refDocType,
                itemName: item.selectItem,
                description: item.selectItem,
                lineTotalAmount: item.totalNoTax,
                lineTaxPercent: item.taxPercent,
                lineTaxAmount: item.taxAmount,
            };
        });

        const createData = {
            applicationCode: applicationData?.applicationCode || lookupCode.trim() || (refDocType === 'OTHERS' ? 'MISC' : ''),
            customerName: payeeName,
            payingAmount: totals.total,
            paymentMode: paymentMode,
            paymentModeDocNo: refDocumentNo,
            addressNo: addressNumber,
            address: addressStreet,
            address2: addressUnit,
            addressCity: addressPostalCode,
            country: addressCountry,
            receiptDetails: receiptDetails,
            invoiceCode: selectedInvoice?.invoiceCode || selectedInvoice?.invoiceCode || (lookupCode.startsWith('INV') ? lookupCode : ''),
            invoiceId: selectedInvoice?.invoiceId || selectedInvoice?.invoiceId || 0,
        };

        try {
            const result = await dispatch(createIndividualReceipt(createData)).unwrap();
            showSuccess('Success', 'Receipt created successfully');

            // Fetch full receipt after creation to ensure we have all data for printing/viewing
            const rCode = result.receiptCode || (result as any).code || (result as any).data?.code;
            if (rCode) {
                try {
                    const fullReceipt = await receiptService.getReceiptByCode(rCode);
                    dispatch(setSelectedReceipt(fullReceipt));
                    // Also update lookupCode to the new receipt code so Print works
                    setLookupCode(rCode);
                } catch (fetchErr) {
                    console.error('Failed to fetch full receipt after creation:', fetchErr);
                }
            }
        } catch (e: any) {
            showError('Error', e.message || 'Failed to create receipt');
        }
    };

    const handlePrint = async () => {
        if (isPdfLoading) return;

        const codeToFetch = lookupCode || currentReceipt?.receiptCode || selectedInvoice?.invoiceCode || '';

        if (!codeToFetch) {
            showError('Error', 'No code found for printing');
            return;
        }

        setIsPdfLoading(true);
        try {
            // Always fetch fresh full data to be sure
            const receipt = await receiptService.getReceiptByCode(codeToFetch);
            dispatch(setSelectedReceipt(receipt));
            setIsDetailModalOpen(true);
        } catch (e) {
            console.error('Print fetch failed:', e);
            showError('Error', 'Failed to fetch receipt data for printing. Does this receipt exist?');
        } finally {
            setIsPdfLoading(false);
        }
    };

    return (
        <Layout title="Create Receipt">
            <div className="min-h-screen p-4 md:p-6 bg-[#f4f1ea] bg-[url('https://www.transparenttextures.com/patterns/pinstripe.png')]">
                <div className="max-w-[1200px] mx-auto space-y-6">

                    <div className="bg-white rounded-xl p-4 shadow-lg border border-gray-200">
                        <div className="flex flex-col sm:flex-row items-center gap-4">
                            <label className="font-bold text-gray-700">Invoice Code:</label>
                            <div className="flex-1 flex gap-2 w-full">
                                <input
                                    type="text"
                                    value={lookupCode}
                                    onChange={(e) => {
                                        setLookupCode(e.target.value);
                                        if (!e.target.value.trim()) {
                                            // Clear all data
                                            dispatch(clearCurrentData());
                                            dispatch(setSelectedInvoice(null));
                                            dispatch(setSelectedReceipt(null));
                                            setPayeeName('');
                                            setAddressBlock('Block');
                                            setAddressNumber('');
                                            setAddressStreet('');
                                            setAddressUnit('');
                                            setAddressPostalCode('');
                                            setAddressCountry('Singapore');
                                            setItems([]);
                                            setRefDocumentNo('');
                                        }
                                    }}
                                    onKeyPress={(e) => e.key === 'Enter' && handleLookup(lookupCode)}
                                    className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-[#4b3621] outline-none transition-all"
                                    placeholder="Enter Invoice Code"
                                />
                                <button
                                    onClick={() => handleLookup(lookupCode)}
                                    disabled={receiptLoading || applicationLoading || !lookupCode.trim()}
                                    className="px-6 py-2 bg-[#4b3621] text-white rounded-lg font-bold hover:bg-[#5a4730] transition-all flex items-center gap-2 disabled:opacity-50"
                                >
                                    {receiptLoading || applicationLoading ? <LoaderIcon className="w-4 h-4 animate-spin" /> : <EyeIcon className="w-4 h-4" />}
                                    Search
                                </button>
                            </div>
                        </div>

                        {selectedInvoice && (
                            <div className="mt-4 flex items-center gap-2 p-3 bg-green-50 border border-green-300 rounded-lg text-green-700 text-sm">
                                <CheckCircle className="w-4 h-4" />
                                Linked to Invoice: <strong>{selectedInvoice.invoiceCode}</strong>
                            </div>
                        )}

                        {applicationData && !selectedInvoice && (
                            <div className="mt-4 flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-300 rounded-lg text-yellow-700 text-sm">
                                <AlertTriangle className="w-4 h-4" />
                                Found Application: <strong>{applicationData.applicationCode}</strong>. No invoice linked yet.
                            </div>
                        )}

                        {/* {!selectedInvoice && !applicationData && (
                            <div className="mt-4">
                                <label className="block text-sm font-bold text-gray-700 mb-1">Document Type (Standalone Creation):</label>
                                <select
                                    value={refDocType}
                                    onChange={(e) => setRefDocType(e.target.value)}
                                    className="w-full sm:w-1/2 px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-[#4b3621] outline-none"
                                >
                                    <option value="NAPP">Niche Application</option>
                                    <option value="INCR">Inscription Request</option>
                                    <option value="WAPP">Wake Room Booking</option>
                                    <option value="GOLA">Gate of Life Application</option>
                                    <option value="OTHERS">Others / Miscellaneous</option>
                                </select>
                            </div>
                        )} */}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 space-y-6">
                            <div className="bg-white rounded-xl p-4 shadow-lg border border-gray-200">
                                <div className="flex flex-col sm:flex-row items-center gap-4">
                                    <label className="w-32 font-bold text-gray-700">Payee Name:</label>
                                    <input
                                        type="text"
                                        value={payeeName}
                                        onChange={(e) => setPayeeName(e.target.value)}
                                        className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-[#4b3621] outline-none"
                                        placeholder="Enter customer name"
                                    />
                                </div>
                            </div>

                            <CustomerAddressForm
                                addressBlock={addressBlock} setAddressBlock={setAddressBlock}
                                addressNumber={addressNumber} setAddressNumber={setAddressNumber}
                                addressStreet={addressStreet} setAddressStreet={setAddressStreet}
                                addressUnit={addressUnit} setAddressUnit={setAddressUnit}
                                addressPostalCode={addressPostalCode} setAddressPostalCode={setAddressPostalCode}
                                addressCountry={addressCountry} setAddressCountry={setAddressCountry}
                            />

                            <InvoiceItemTable
                                items={items}
                                setItems={setItems}
                                availableItems={availableItems}
                                receiptItems={receiptItems}
                            />
                        </div>

                        <div className="space-y-6">
                            <PaymentModeSelector
                                paymentMode={paymentMode} setPaymentMode={setPaymentMode}
                                refDocumentNo={refDocumentNo} setRefDocumentNo={setRefDocumentNo}
                            />

                            <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200 space-y-4">
                                <button
                                    onClick={handleCreateReceipt}
                                    disabled={creatingReceipt}
                                    className="w-full py-4 bg-gradient-to-r from-[#1b5e20] to-[#2e7d32] text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                                >
                                    {creatingReceipt ? <LoaderIcon className="w-6 h-6 animate-spin" /> : <SaveIcon className="w-6 h-6" />}
                                    {(currentReceipt || selectedReceipt) ? 'Receipt Generated!' : 'Generate Receipt'}
                                </button>

                                {(currentReceipt || selectedReceipt || selectedInvoice) && (
                                    <button
                                        onClick={handlePrint}
                                        className="w-full py-3 bg-white border-2 border-[#1b5e20] text-[#1b5e20] rounded-xl font-bold hover:bg-[#1b5e20] hover:text-white transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                        disabled={isPdfLoading}
                                    >
                                        <PrinterIcon className={`w-5 h-5 ${isPdfLoading ? 'animate-spin' : ''}`} />
                                        {isPdfLoading ? 'Loading...' : 'Print Receipt'}
                                    </button>
                                )}



                                {selectedInvoice && (
                                    <button
                                        onClick={() => navigate(`/create-invoice/${selectedInvoice.invoiceCode}`)}
                                        className="w-full py-3 bg-white border-2 border-[#4b3621] text-[#4b3621] rounded-xl font-bold hover:bg-[#4b3621] hover:text-white transition-all flex items-center justify-center gap-2"
                                    >
                                        <FileTextIcon className="w-5 h-5" />
                                        Go to Invoice
                                    </button>
                                )}

                                {(currentReceipt || selectedReceipt) && (
                                    <div className="text-center">
                                        <p className="text-sm font-bold text-green-600">Receipt: {currentReceipt?.receiptCode || selectedReceipt?.receiptCode}</p>
                                    </div>
                                )}

                                <div className="mt-6 pt-6 border-t border-gray-100">
                                    <button
                                        onClick={() => navigate(`/legacy-invoice-receipt/${lookupCode || (currentReceipt as any)?.receiptCode || ''}`)}
                                        className="w-full py-2.5 bg-gray-50 border border-gray-200 text-gray-500 rounded-lg text-sm font-medium hover:bg-gray-100 hover:text-gray-700 transition-all flex items-center justify-center gap-2"
                                        title="Navigate to legacy page for deeper analysis"
                                    >
                                        <EyeIcon className="w-4 h-4" />
                                        Advanced Analysis (Legacy)
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {
                isDetailModalOpen && (
                    <ReceiptDetailModal
                        isOpen={isDetailModalOpen}
                        onClose={() => setIsDetailModalOpen(false)}
                        receipt={selectedReceipt}
                    />
                )
            }
        </Layout >
    );
}
