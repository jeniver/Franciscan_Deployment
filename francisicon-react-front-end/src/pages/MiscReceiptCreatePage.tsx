import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { Layout } from '../components/Layout';
import { useToast } from '../contexts/ToastContext';
import { useReceipt } from '../hooks/useReceipt';
import {
    PlusIcon,
    SaveIcon,
    PrinterIcon,
    ArrowLeftIcon,
    UserIcon,
    CreditCardIcon,
    ShoppingBagIcon,
    LoaderIcon,
    CheckCircle2Icon,
    InfoIcon
} from 'lucide-react';
import type { AppDispatch } from '../store';
import {
    createIndividualReceipt,
    fetchLastMiscReceiptNumber,
    fetchReceiptItems as fetchReceiptItemsThunk,
    resetReceiptState,
} from '../store/receiptSlice';
import { InvoiceItemTable, InvoiceItem } from '../components/common/InvoiceItemTable';
import { PaymentModeSelector } from '../components/common/PaymentModeSelector';
import { AddressInput } from '../components/AddressInput';
import { receiptService } from '../services/receiptService';
import { ReceiptDetailModal } from '../components/ReceiptDetailModal';

export function MiscReceiptCreatePage() {
    const navigate = useNavigate();
    const dispatch = useDispatch<AppDispatch>();
    const { showSuccess, showError } = useToast();

    const {
        receiptItems,
        lastMiscReceiptNumber
    } = useReceipt();

    // Form State
    const [payeeName, setPayeeName] = useState('');
    const [addressBlock, setAddressBlock] = useState('Block');
    const [addressNumber, setAddressNumber] = useState('');
    const [addressStreet, setAddressStreet] = useState('');
    const [addressUnit, setAddressUnit] = useState('');
    const [addressPostalCode, setAddressPostalCode] = useState('');
    const [addressCountry, setAddressCountry] = useState('Singapore');
    const [paymentMode, setPaymentMode] = useState('Cash');
    const [paymentDocNo, setPaymentDocNo] = useState('');
    const [items, setItems] = useState<InvoiceItem[]>([]);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [createdReceipt, setCreatedReceipt] = useState<any>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Load items and last receipt number on mount
    useEffect(() => {
        dispatch(resetReceiptState());
        dispatch(fetchReceiptItemsThunk({ receiptId: '567', includeItemInfo: true }));
        dispatch(fetchLastMiscReceiptNumber());
    }, [dispatch]);

    const availableItems = useMemo(() =>
        receiptItems.length > 0
            ? receiptItems.map(item => item.itemName || item.description || '').filter(Boolean)
            : ['Level 3 Niche', 'Niche Inscription', 'Urn', 'Admin Fee', 'Others'],
        [receiptItems]
    );

    const calculateTotals = () => {
        return items.reduce((acc, item) => ({
            total: acc.total + item.totalAmount,
            tax: acc.tax + item.taxAmount
        }), { total: 0, tax: 0 });
    };

    const handleCreateReceipt = async () => {
        if (!payeeName.trim()) {
            showError('Validation Error', 'Payee Name is required');
            return;
        }

        if (items.length === 0) {
            showError('Validation Error', 'Please add at least one item');
            return;
        }

        const { total } = calculateTotals();

        // Prepare receipt details
        const receiptDetailsArr = items.map(item => {
            const matchedReceiptItem = receiptItems.find(ri =>
                ri.itemName === item.selectItem || ri.description === item.selectItem
            );

            return {
                itemId: matchedReceiptItem?.itemId || 1,
                quantity: item.quantity,
                unitAmount: item.amountPaying,
                payingAmount: item.amountPaying,
                totalPayingAmount: item.totalAmount,
                refDocNumber: item.reference || 'MISC',
                refDocName: 'MISC',
                refType: 'MISC',
                itemName: item.selectItem,
                description: item.selectItem,
                lineTotalAmount: item.totalNoTax,
                lineTaxPercent: item.taxPercent,
                lineTaxAmount: item.taxAmount,
            };
        });

        const createData = {
            applicationCode: 'MISC', // Constant for standalone misc receipts
            customerName: payeeName,
            payingAmount: total,
            paymentMode: paymentMode,
            paymentModeDocNo: paymentDocNo,
            addressNo: addressNumber,
            address: addressStreet,
            address2: addressUnit,
            addressCity: addressPostalCode,
            country: addressCountry,
            districtCode: addressPostalCode,
            receiptDetails: receiptDetailsArr,
        };

        setIsSubmitting(true);
        try {
            const result = await dispatch(createIndividualReceipt(createData)).unwrap();
            showSuccess('Success', 'Miscellaneous receipt created successfully');

            const rCode = result.receiptCode || (result as any).code || (result as any).data?.code;
            if (rCode) {
                const fullReceipt = await receiptService.getReceiptByCode(rCode);
                setCreatedReceipt(fullReceipt);
                setIsDetailModalOpen(true); // Auto-open modal on success
            }
        } catch (e: any) {
            showError('Error', e.message || 'Failed to create receipt');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAddressChange = (addressData: any) => {
        setAddressBlock(addressData.block || 'No');
        setAddressNumber(addressData.blockNo || '');
        setAddressStreet(addressData.streetName || '');
        setAddressUnit(addressData.unitNo || '');
        setAddressPostalCode(addressData.postalCode || '');
        setAddressCountry(addressData.country || 'Singapore');
    };

    const totals = calculateTotals();

    return (
        <Layout title="New Miscellaneous Receipt">
            <div className="min-h-screen bg-[#fcfcfc] pb-12">
                {/* Header Section */}
                <div className="bg-white border-b border-gray-200 py-2.5 px-8 sticky top-[64px] z-30 shadow-sm">
                    <div className="max-w-7xl mx-auto flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => navigate('/misc-receipt')}
                                className="p-2 rounded-xl bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-all border border-gray-200"
                            >
                                <ArrowLeftIcon className="w-4 h-4" />
                            </button>
                            <div>
                                <h1 className="text-lg font-bold text-gray-900">Create Receipt</h1>
                                <p className="text-[10px] font-medium text-gray-400 uppercase tracking-widest mt-0.5">Standalone Transaction</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-6">
                            <div className="hidden md:flex flex-col items-end">
                                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Next Receipt No</span>
                                <span className="text-xs font-bold text-teal-600">#{lastMiscReceiptNumber || '---'}</span>
                            </div>
                            <button
                                onClick={handleCreateReceipt}
                                disabled={isSubmitting || !!createdReceipt}
                                className="flex items-center gap-2 px-5 py-2 bg-teal-600 text-white rounded-xl font-bold text-sm shadow-md hover:bg-teal-700 transition-all disabled:opacity-50"
                            >
                                {isSubmitting ? <LoaderIcon className="w-3.5 h-3.5 animate-spin" /> : <SaveIcon className="w-3.5 h-3.5" />}
                                {createdReceipt ? 'Created' : 'Generate'}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="max-w-7xl mx-auto px-8 mt-4">
                    {createdReceipt && (
                        <div className="mb-4 bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center justify-between animate-in fade-in slide-in-from-top duration-500">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                                    <CheckCircle2Icon className="w-5 h-5 text-emerald-500" />
                                </div>
                                <div>
                                    <h3 className="text-md font-bold text-emerald-900">Receipt Generated!</h3>
                                    <p className="text-emerald-700 text-xs">Receipt <span className="font-bold">#{createdReceipt.receiptCode}</span> successfully added.</p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setIsDetailModalOpen(true)}
                                    className="flex items-center gap-1.5 px-4 py-1.5 bg-white text-emerald-700 border border-emerald-200 rounded-lg font-bold hover:bg-emerald-50 transition-all text-xs"
                                >
                                    <PrinterIcon className="w-3.5 h-3.5" />
                                    Print
                                </button>
                                <button
                                    onClick={() => window.location.reload()}
                                    className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 transition-all text-xs"
                                >
                                    <PlusIcon className="w-3.5 h-3.5" />
                                    New
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                        {/* Left Column: Form Sections */}
                        <div className="lg:col-span-2 space-y-5">
                            {/* Payee Details */}
                            <section className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="w-8 h-8 bg-teal-50 rounded-lg flex items-center justify-center">
                                        <UserIcon className="w-4 h-4 text-teal-600" />
                                    </div>
                                    <h2 className="text-lg font-bold text-gray-900">Payee Information</h2>
                                </div>

                                <div className="grid grid-cols-1 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Full Name / Entity</label>
                                        <input
                                            type="text"
                                            value={payeeName}
                                            onChange={(e) => setPayeeName(e.target.value)}
                                            placeholder="e.g. John Doe"
                                            className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all text-gray-700 font-semibold text-sm"
                                        />
                                    </div>
                                </div>

                                <div className="mt-6 pt-6 border-t border-gray-100">
                                    <AddressInput
                                        onAddressChange={handleAddressChange}
                                        label="Mailing Address"
                                        initialValues={{
                                            block: addressBlock,
                                            blockNo: addressNumber,
                                            streetName: addressStreet,
                                            unitNo: addressUnit,
                                            postalCode: addressPostalCode,
                                            country: addressCountry
                                        }}
                                        isReadOnly={!!createdReceipt}
                                    />
                                </div>
                            </section>

                            {/* Line Items */}
                            <section className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center">
                                        <ShoppingBagIcon className="w-4 h-4 text-indigo-600" />
                                    </div>
                                    <h2 className="text-lg font-bold text-gray-900">Items & Charges</h2>
                                </div>

                                <InvoiceItemTable
                                    items={items}
                                    setItems={setItems}
                                    availableItems={availableItems}
                                    receiptItems={receiptItems}
                                    disabled={!!createdReceipt}
                                />
                            </section>
                        </div>

                        <div className="space-y-5 sticky top-[110px] self-start">
                            <section className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center">
                                        <CreditCardIcon className="w-4 h-4 text-amber-600" />
                                    </div>
                                    <h2 className="text-lg font-bold text-gray-900">Payment</h2>
                                </div>

                                <PaymentModeSelector
                                    paymentMode={paymentMode}
                                    setPaymentMode={setPaymentMode}
                                    refDocumentNo={paymentDocNo}
                                    setRefDocumentNo={setPaymentDocNo}
                                    disabled={!!createdReceipt}
                                />
                            </section>

                            <section className="bg-slate-900 rounded-xl p-6 shadow-lg text-white">
                                <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-4">Payment Summary</h3>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center text-slate-300">
                                        <span className="text-xs font-medium">Subtotal</span>
                                        <span className="font-bold text-sm">${totals.total.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-slate-300">
                                        <span className="text-xs font-medium">GST (9%)</span>
                                        <span className="font-bold text-sm">${totals.tax.toFixed(2)}</span>
                                    </div>
                                    <div className="pt-3 border-t border-slate-800">
                                        <div className="flex justify-between items-center">
                                            <span className="text-md font-bold text-teal-400">Total Payable</span>
                                            <span className="text-xl font-bold text-teal-400">${(totals.total + totals.tax).toFixed(2)}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-8 p-4 bg-white/5 rounded-xl flex gap-3">
                                    <InfoIcon className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                                    <p className="text-[10px] font-medium text-slate-400 leading-relaxed uppercase tracking-wider">
                                        Confirm all details before generating. This action is final.
                                    </p>
                                </div>
                            </section>
                        </div>
                    </div>
                </div>
            </div>

            {createdReceipt && (
                <ReceiptDetailModal
                    isOpen={isDetailModalOpen}
                    onClose={() => setIsDetailModalOpen(false)}
                    receipt={createdReceipt}
                />
            )}
        </Layout>
    );
}
