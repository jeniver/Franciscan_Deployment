import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Layout } from '../components/Layout';
import { useToast } from '../contexts/ToastContext';
import { useApplicationItems } from '../hooks/useApplicationItems';
import { useReceipt } from '../hooks/useReceipt';
import { EyeIcon, LoaderIcon, AlertTriangle, CheckCircle, SaveIcon, PrinterIcon, FileTextIcon } from 'lucide-react';
import { InvoiceViewerModal } from '../components/InvoiceViewerModal';
import { AgreementViewerModal } from '../components/AgreementViewerModal';
import { InvoiceTemplateData } from '../services/invoiceTemplateService';
import type { AppDispatch, RootState } from '../store';
import {
    fetchInvoiceOrApplication,
    createInvoice,
    clearCurrentData,
} from '../store/invoiceSlice';
import { resetReceiptState } from '../store/receiptSlice';
import { InvoiceItemTable, InvoiceItem } from '../components/common/InvoiceItemTable';
import { AddressInput } from '../components/AddressInput';


export function CreateInvoicePage() {
    const { code: routeCode } = useParams<{ code?: string }>();

    const navigate = useNavigate();
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const typeParam = queryParams.get('type');

    const { showSuccess, showError } = useToast();
    const dispatch = useDispatch<AppDispatch>();

    const {
        currentData,
        loading: invoiceLoading,
        error: invoiceError,
        creatingInvoice,
        createInvoiceSuccess,
        lastCreatedInvoiceCode,
    } = useSelector((state: RootState) => state.invoice);

    const { receiptItems, fetchReceiptItems, fetchLastReceiptNumber } = useReceipt();
    const {
        applicationItems,
        fetchApplicationItems,
        getItemsByType,
    } = useApplicationItems();

    const [applicationNumber, setApplicationNumber] = useState(routeCode || '');
    const [payeeName, setPayeeName] = useState('');
    const [addressBlock, setAddressBlock] = useState('Block');
    const [addressNumber, setAddressNumber] = useState('');
    const [addressStreet, setAddressStreet] = useState('');
    const [addressUnit, setAddressUnit] = useState('');
    const [addressPostalCode, setAddressPostalCode] = useState('');
    const [addressCountry, setAddressCountry] = useState('Singapore');
    const [paymentMode] = useState('Cash');
    const [refDocumentNo, setRefDocumentNo] = useState('');
    const [items, setItems] = useState<InvoiceItem[]>([]);

    // Modals state
    const [isInvoiceViewerOpen, setIsInvoiceViewerOpen] = useState(false);
    const [viewerInvoiceData, setViewerInvoiceData] = useState<InvoiceTemplateData | null>(null);
    const [isAgreementViewerOpen, setIsAgreementViewerOpen] = useState(false);
    const [agreementData, setAgreementData] = useState<any | null>(null);
    const [createReceiptWithInvoice] = useState(false);

    const normalizeRefDocType = (value?: string | null): string => {
        const normalized = (value || '').trim().toUpperCase();
        if (!normalized) return '';
        if (normalized === 'GOL') return 'GOLA';
        if (['NAPP', 'INCR', 'WAPP', 'GOLA', 'OTHERS'].includes(normalized)) return normalized;
        return normalized;
    };

    const [refDocType, setRefDocType] = useState(normalizeRefDocType(typeParam) || 'NAPP');
    const initialLookupKeyRef = useRef<string | null>(null);

    // Update refDocType if URL param changes
    useEffect(() => {
        if (typeParam) {
            setRefDocType(normalizeRefDocType(typeParam) || 'NAPP');
        }
    }, [typeParam]);



    // Helper to detect type from code format
    const detectTypeFromCode = (code: string): string | null => {
        if (!code) return null;
        const upperCode = code.toUpperCase();
        if (upperCode.startsWith('I-') || upperCode.startsWith('INCR-')) return 'INCR';
        if (upperCode.startsWith('GOL-') || upperCode.startsWith('GOLA-')) return 'GOLA';
        if (upperCode.startsWith('WAPP-') || upperCode.startsWith('WR') || upperCode.startsWith('WAKE')) return 'WAPP';
        if (upperCode.startsWith('NAPP-')) return 'NAPP';

        // Ambiguous numeric-hyphen patterns are treated as NAPP unless explicitly provided.
        if (/^\d+-0$/.test(upperCode)) return 'NAPP';
        if (/^\d+-\d+$/.test(upperCode)) return 'NAPP';

        return null;
    };

    // Fetch initial data if routeCode is provided
    useEffect(() => {
        if (routeCode) {
            setApplicationNumber(routeCode);
            dispatch(clearCurrentData());
            // Priority: 1) explicit URL type, 2) pattern detection, 3) NAPP fallback
            let typeToUse = normalizeRefDocType(typeParam) || detectTypeFromCode(routeCode) || 'NAPP';
            typeToUse = normalizeRefDocType(typeToUse) || 'NAPP';

            if (typeToUse !== refDocType) {
                setRefDocType(typeToUse);
            }

            // Canonicalize URL once so refresh/navigation keeps explicit type.
            if (!typeParam || normalizeRefDocType(typeParam) !== typeToUse) {
                navigate(`/create-invoice/${encodeURIComponent(routeCode)}?type=${encodeURIComponent(typeToUse)}`, { replace: true });
            }

            // Prevent duplicate initial lookups for the same code/type pair.
            const lookupKey = `${routeCode}::${typeToUse}`;
            if (initialLookupKeyRef.current !== lookupKey) {
                initialLookupKeyRef.current = lookupKey;
                dispatch(fetchInvoiceOrApplication({ code: routeCode, type: typeToUse }));
            }
        } else {
            // Clear form if no code provided (navigated to /create-invoice)
            setApplicationNumber('');
            dispatch(clearCurrentData());
            dispatch(resetReceiptState());
            setPayeeName('');
            setAddressBlock('Block');
            setAddressNumber('');
            setAddressStreet('');
            setAddressUnit('');
            setAddressPostalCode('');
            setAddressCountry('Singapore');
            setRefDocumentNo('');
            setItems([]);
        }

        // Single call for receipt items - moved out of dependencies that change often
        if (receiptItems.length === 0) {
            fetchReceiptItems('567', true);
        }
        fetchLastReceiptNumber();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [routeCode, typeParam, dispatch, navigate, receiptItems.length]);

    // Update form when currentData changes
    useEffect(() => {
        if (currentData) {
            const currentDataAny: any = currentData;

            // Auto-detect type if not set, BUT prefer backend's RefDocName if available
            // This prevents "flipping" of types
            const explicitType = normalizeRefDocType(typeParam);
            const backendType = normalizeRefDocType(currentData.refDocName || currentDataAny.type);
            const routeOrInputCode = (routeCode || applicationNumber || '').trim().toUpperCase();
            const currentCode = String(
                currentDataAny.applicationCode
                || currentDataAny.refDocNumber
                || currentDataAny.code
                || ''
            ).trim().toUpperCase();
            const isMatchingCurrentLookup = !routeOrInputCode || !currentCode || routeOrInputCode === currentCode;

            // URL/query type must remain authoritative for this screen.
            if (explicitType && refDocType !== explicitType) {
                setRefDocType(explicitType);
            } else if (!explicitType && isMatchingCurrentLookup && backendType && backendType !== refDocType) {
                setRefDocType(backendType);
                // NO automatic refetch of items here to prevent loops.
                // The initial fetch should have covered it, or the user can trigger a lookup.
            }

            // Resolve Name
            const resolvedName = currentData.customerName || currentDataAny.payeeName || currentDataAny.applicant?.name || '';
            setPayeeName(resolvedName);

            // Map Address
            if (currentData.addressNo || currentData.address || currentData.address2 || currentData.addressCity || currentData.country) {
                if (currentData.addressNo) setAddressNumber(currentData.addressNo);
                if (currentData.address) setAddressStreet(currentData.address);
                if (currentData.address2) setAddressUnit(currentData.address2);
                if (currentData.addressCity) setAddressPostalCode(currentData.addressCity);
                if (currentData.country) setAddressCountry(currentData.country);
            } else if (currentData.address) {
                // Simple fallback if no address parser
                setAddressStreet(currentData.address);
            }

            // Map Items
            let invoiceDetails = currentData.details || currentDataAny.Details || [];

            // Fallbacks for Wake Room / Gate of Life
            if (invoiceDetails.length === 0 && (currentDataAny.booking || currentDataAny.wakeRoomId)) {
                const subtotal = currentDataAny.financial?.donationAmount || 0;
                const taxAmount = (subtotal * 9) / 100;
                invoiceDetails = [{
                    itemName: currentDataAny.wakeRoom?.name ? `Wake Room Rental - ${currentDataAny.wakeRoom.name}` : 'Wake Room Rental',
                    itemId: 1, // Default ID
                    itemCode: 'WRR',
                    itemPrice: currentDataAny.financial?.defaultDonationAmount || 0,
                    unitAmount: currentDataAny.financial?.defaultDonationAmount || 0,
                    payingAmount: subtotal,
                    quantity: currentDataAny.booking?.noOfDays || 1,
                    lineTotalAmount: subtotal,
                    lineTaxPercent: 9,
                    lineTaxAmount: taxAmount,
                    totalPayingAmount: subtotal + taxAmount,
                    refDocNumber: currentData.applicationCode || '',
                    invoiceDetailId: null,
                    invoiceId: null,
                    refDocName: 'WAPP',
                    refType: 'WAPP'
                }];
            } else if (invoiceDetails.length === 0 && currentDataAny.applicationCode?.startsWith('GOL')) {
                const personCount = Math.max(
                    Number(currentDataAny?.application?.NameCount || currentDataAny?.application?.nameCount || 0),
                    1
                );
                const subtotal = currentDataAny.donationAmount || 0;
                const unitAmount = subtotal > 0 ? Number((subtotal / personCount).toFixed(2)) : 300;
                const taxAmount = (subtotal * 9) / 100;
                invoiceDetails = [{
                    itemName: 'Gate of Life Donation',
                    itemId: 10,
                    itemCode: 'GOL',
                    itemPrice: unitAmount,
                    unitAmount: unitAmount,
                    payingAmount: unitAmount,
                    quantity: personCount,
                    lineTotalAmount: subtotal,
                    lineTaxPercent: 9,
                    lineTaxAmount: taxAmount,
                    totalPayingAmount: subtotal + taxAmount,
                    refDocNumber: currentDataAny.applicationCode || '',
                    invoiceDetailId: null,
                    invoiceId: null,
                    refDocName: 'GOLA',
                    refType: 'GOLA'
                }];
            }

            if (invoiceDetails.length > 0) {
                const mappedItems: InvoiceItem[] = invoiceDetails.map((detail: any) => ({
                    id: Math.random().toString(36).substr(2, 9),
                    selectItem: detail.itemName || detail.ItemName || 'Other',
                    reference: detail.refDocNumber || detail.RefDocNumber || '',
                    defaultAmount: detail.unitAmount || detail.UnitAmount || 0,
                    amountPaying: detail.payingAmount || detail.PayingAmount || detail.unitAmount || 0,
                    quantity: detail.quantity || detail.Quantity || 1,
                    totalNoTax: detail.lineTotalAmount || detail.LineTotalAmount || 0,
                    taxPercent: detail.lineTaxPercent || detail.LineTaxPercent || 9,
                    taxAmount: detail.lineTaxAmount || detail.LineTaxAmount || 0,
                    totalAmount: (detail.lineTotalAmount || detail.LineTotalAmount || 0) + (detail.lineTaxAmount || detail.LineTaxAmount || 0),
                }));
                setItems(mappedItems);
            }

            // Set Agreement Data if available
            setAgreementData(currentData);
        }
    }, [currentData, typeParam, routeCode, applicationNumber, refDocType]);

    // Fallback: if backend returned application items but currentData.details is empty,
    // use applicationItems (from useApplicationItems) to pre-populate invoice lines.
    // This is especially important for inscription / Gate of Life / Wake Room flows.
    useEffect(() => {
        // Do not override items if we already mapped details from currentData
        if (items.length > 0) return;

        if (!applicationItems || !applicationItems.items || applicationItems.items.length === 0) {
            return;
        }

        // Prefer inscription items when available, otherwise use all items
        const inscriptionItems = getItemsByType('inscription');
        const sourceItems = inscriptionItems.length > 0 ? inscriptionItems : applicationItems.items;

        const mappedItems: InvoiceItem[] = sourceItems.map((item) => ({
            id: Math.random().toString(36).substr(2, 9),
            selectItem: item.description || 'Item',
            reference: item.reference || applicationItems.applicationCode || '',
            defaultAmount: item.unitPrice || 0,
            amountPaying: item.grandTotal || item.totalAmount || item.unitPrice || 0,
            quantity: item.quantity || 1,
            totalNoTax: item.totalAmount || 0,
            taxPercent: item.taxAmount && item.totalAmount
                ? Math.round((item.taxAmount / Math.max(item.totalAmount, 1)) * 100)
                : 9,
            taxAmount: item.taxAmount || 0,
            totalAmount: item.grandTotal || (item.totalAmount || 0) + (item.taxAmount || 0),
        }));

        if (mappedItems.length > 0) {
            setItems(mappedItems);
        }
    }, [applicationItems, getItemsByType, items.length]);

    const availableItems = useMemo(() =>
        receiptItems.length > 0
            ? receiptItems.map(item => item.itemName || item.description || '').filter(Boolean)
            : ['Level 3 Niche', 'Niche Inscription Both Name', 'Urn', 'Other'],
        [receiptItems]
    );

    const handleLookup = () => {
        if (!applicationNumber.trim()) return;
        // Pass the selected type (refDocType) to the lookup functions explicitly
        // This ensures the backend knows exactly what we are looking for (e.g. INCR vs NAPP)
        dispatch(fetchInvoiceOrApplication({ code: applicationNumber.trim(), type: refDocType }));
        fetchApplicationItems(applicationNumber.trim(), refDocType);

        // Update URL to reflect the lookup, so refresh keeps state
        navigate(`/create-invoice/${applicationNumber.trim()}?type=${refDocType}`, { replace: true });
    };

    const handleCreateInvoice = async () => {
        // Allow creation if application number is present OR if it's a Standalone 'OTHERS' creation
        if (!currentData && !applicationNumber.trim() && refDocType !== 'OTHERS') {
            showError('Error', 'Application number is required');
            return;
        }

        const mappedInvoiceDetails = items.map(item => {
            const receiptItem = receiptItems.find(ri => ri.itemName === item.selectItem || ri.description === item.selectItem);
            return {
                itemId: receiptItem?.itemId || 1,
                quantity: item.quantity,
                unitAmount: item.amountPaying,
                payingAmount: item.amountPaying,
                totalPayingAmount: item.totalAmount,
                // Default reference to 'MISC' if creating standalone Others invoice and no reference provided
                refDocNumber: item.reference || (refDocType === 'OTHERS' ? 'MISC' : (currentData?.applicationCode || applicationNumber.trim())),
                refDocName: currentData?.refDocName || refDocType,
                lineTotalAmount: item.totalNoTax,
                lineTaxPercent: item.taxPercent,
                lineTaxAmount: item.taxAmount,
            };
        });

        const totals = items.reduce((acc, item) => ({
            total: acc.total + item.totalAmount,
            tax: acc.tax + item.taxAmount
        }), { total: 0, tax: 0 });

        const payload = {
            invoice: {
                transactionDate: new Date().toISOString(),
                // Default to 'MISC' if OTHERS and no code provided
                refDocNumber: currentData?.applicationCode || applicationNumber.trim() || (refDocType === 'OTHERS' ? 'MISC' : ''),
                refDocName: currentData?.refDocName || refDocType,
                customerName: payeeName,
                totalAmount: totals.total,
                payingAmount: totals.total,
                taxAmount: totals.tax,
                taxPercentage: 9,
                taxCode: null,
                nicheApplicationId: currentData?.nicheApplicationId,
                addressNo: addressNumber,
                address: addressStreet,
                address2: addressUnit,
                addressCity: addressPostalCode,
                districtCode: addressPostalCode,
                country: addressCountry,
                paymentMode: paymentMode,
                paymentModeDocNo: refDocumentNo,
            },
            invoiceDetails: mappedInvoiceDetails,
            createReceipt: createReceiptWithInvoice,
        };

        try {
            const result = await dispatch(createInvoice(payload)).unwrap();
            showSuccess('Success', `Invoice created successfully${result.receiptCode ? ' with receipt ' + result.receiptCode : ''}`);
            // Do NOT reset status immediately, otherwise Print button won't show
            // dispatch(resetCreateStatus());
        } catch (e: any) {
            showError('Error', e || 'Failed to create invoice');
        }
    };

    const handlePrint = () => {
        const codeToUse = lastCreatedInvoiceCode || currentData?.code || '';
        if (!codeToUse) {
            showError('Error', 'No invoice to print');
            return;
        }

        const totals = items.reduce((acc, item) => ({
            total: acc.total + item.totalAmount,
            tax: acc.tax + item.taxAmount,
            sub: acc.sub + item.totalNoTax
        }), { total: 0, tax: 0, sub: 0 });

        const templateData: InvoiceTemplateData = {
            invoiceCode: codeToUse,
            invoiceDate: new Date().toLocaleDateString('en-SG', { year: 'numeric', month: 'long', day: 'numeric' }),
            customerName: payeeName,
            customerAddress: `${addressBlock} ${addressNumber} ${addressStreet} ${addressUnit} ${addressPostalCode} ${addressCountry}`.trim(),
            paymentMode: paymentMode,
            totalAmount: totals.total,
            taxAmount: totals.tax,
            items: items.map(item => ({
                description: item.selectItem,
                referenceNo: item.reference,
                gstPercent: item.taxPercent,
                qty: item.quantity,
                quantity: item.quantity,
                unitPrice: item.amountPaying,
                amount: item.totalAmount,
            })),
        };

        setViewerInvoiceData(templateData);
        setIsInvoiceViewerOpen(true);
    };

    const handleAddressChange = (addressData: any) => {
        setAddressBlock(addressData.block || 'Block');
        setAddressNumber(addressData.blockNo || '');
        setAddressStreet(addressData.streetName || '');
        setAddressUnit(addressData.unitNo || '');
        setAddressPostalCode(addressData.postalCode || '');
        setAddressCountry(addressData.country || 'Singapore');
    };


    return (
        <Layout title="Create Invoice">
            <div className="min-h-screen bg-[#fcfcfc] pb-12">
                <div className="max-w-7xl mx-auto px-6 mt-4 space-y-5">

                    {/* Lookup Section */}
                    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 mb-4">
                        <div className="flex flex-col md:flex-row items-end gap-5">
                            <div className="w-full md:w-56">
                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Document Type</label>
                                <select
                                    value={refDocType}
                                    onChange={(e) => setRefDocType(e.target.value)}
                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500/10 focus:border-teal-500 outline-none font-semibold text-gray-700 transition-all text-sm"
                                >
                                    <option value="NAPP">Niche Application</option>
                                    <option value="INCR">Inscription Request</option>
                                    <option value="WAPP">Wake Room Booking</option>
                                    <option value="GOLA">Gate of Life Application</option>
                                    <option value="OTHERS">Others / Miscellaneous</option>
                                </select>
                            </div>
                            <div className="flex-1 w-full">
                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Application Number / Code</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={applicationNumber}
                                        onChange={(e) => {
                                            setApplicationNumber(e.target.value);
                                            if (!e.target.value.trim() && currentData) {
                                                dispatch(clearCurrentData());
                                                setPayeeName('');
                                                setAddressBlock('Block');
                                                setAddressNumber('');
                                                setAddressStreet('');
                                                setAddressUnit('');
                                                setAddressPostalCode('');
                                                setAddressCountry('Singapore');
                                                setItems([]);
                                            }
                                        }}
                                        onKeyPress={(e) => e.key === 'Enter' && handleLookup()}
                                        className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500/10 focus:border-teal-500 outline-none font-semibold text-gray-700 transition-all text-sm"
                                        placeholder="e.g. 7980-0"
                                    />
                                    <button
                                        onClick={handleLookup}
                                        disabled={invoiceLoading || !applicationNumber.trim()}
                                        className="px-6 py-2 bg-slate-800 text-white rounded-lg font-bold hover:bg-slate-900 transition-all flex items-center gap-2 disabled:opacity-50 text-sm"
                                    >
                                        {invoiceLoading ? <LoaderIcon className="w-3.5 h-3.5 animate-spin" /> : <EyeIcon className="w-3.5 h-3.5" />}
                                        <span>Look Up</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {currentData?.hasInvoice && (
                            <div className="mt-4 flex items-center gap-2 p-3 bg-teal-50 border border-teal-100 rounded-lg text-teal-700 text-xs font-medium">
                                <CheckCircle className="w-4 h-4" />
                                <span>This application already has an invoice: <strong>{currentData.invoiceCode || currentData.code}</strong></span>
                            </div>
                        )}

                        {invoiceError && (
                            <div className="mt-4 flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                                <AlertTriangle className="w-4 h-4" />
                                {invoiceError}
                            </div>
                        )}

                    </div>

                    {/* Form Content */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                        <div className="lg:col-span-2 space-y-5">
                            {/* Payee Name */}
                            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Payee Name</label>
                                    <input
                                        type="text"
                                        value={payeeName}
                                        onChange={(e) => setPayeeName(e.target.value)}
                                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500/10 focus:border-teal-500 outline-none font-semibold text-gray-700 transition-all text-sm"
                                        placeholder="Full Name / Entity"
                                    />
                                </div>
                            </div>

                            {/* Address Form */}
                            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                                <AddressInput
                                    onAddressChange={handleAddressChange}
                                    label="Payee Address"
                                    initialValues={{
                                        block: addressBlock,
                                        blockNo: addressNumber,
                                        streetName: addressStreet,
                                        unitNo: addressUnit,
                                        postalCode: addressPostalCode,
                                        country: addressCountry
                                    }}
                                    isReadOnly={invoiceLoading}
                                />
                            </div>

                            {/* Items Table */}
                            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center">
                                        <FileTextIcon className="w-4 h-4 text-indigo-600" />
                                    </div>
                                    <h2 className="text-lg font-bold text-gray-900">Invoice Items</h2>
                                </div>
                                <InvoiceItemTable
                                    items={items}
                                    setItems={setItems}
                                    availableItems={availableItems}
                                    receiptItems={receiptItems}
                                />
                            </div>
                        </div>

                        {/* Sidebar / Actions */}
                        <div className="space-y-5 sticky top-[110px] self-start">
                            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 space-y-4">
                                <button
                                    onClick={handleCreateInvoice}
                                    disabled={creatingInvoice || currentData?.hasInvoice}
                                    className="w-full py-3.5 bg-slate-900 text-white rounded-lg font-bold text-md shadow-md hover:bg-slate-800 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:translate-y-0"
                                >
                                    {creatingInvoice ? <LoaderIcon className="w-5 h-5 animate-spin" /> : <SaveIcon className="w-5 h-5" />}
                                    <span>{createInvoiceSuccess ? 'Created!' : 'Generate'}</span>
                                </button>

                                <div className="grid gap-2">
                                    {(createInvoiceSuccess || currentData?.hasInvoice) && (
                                        <button
                                            onClick={handlePrint}
                                            className="w-full py-2.5 bg-white border border-gray-200 text-slate-700 rounded-lg font-bold hover:bg-gray-50 transition-all flex items-center justify-center gap-2 text-sm"
                                        >
                                            <PrinterIcon className="w-4 h-4" />
                                            <span>Print Invoice</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {
                viewerInvoiceData && (
                    <InvoiceViewerModal
                        isOpen={isInvoiceViewerOpen}
                        onClose={() => setIsInvoiceViewerOpen(false)}
                        invoiceData={viewerInvoiceData}
                    />
                )
            }

            {
                agreementData && (
                    <AgreementViewerModal
                        isOpen={isAgreementViewerOpen}
                        onClose={() => setIsAgreementViewerOpen(false)}
                        agreementData={agreementData}
                        secoundNomineeAgreement={null}
                        applicationNumber={applicationNumber || currentData?.applicationCode || ''}
                        templateType={currentData?.applicationCode?.startsWith('GOL') ? 'gateOfLife' : 'niche'}
                    />
                )
            }
        </Layout >
    );
}
