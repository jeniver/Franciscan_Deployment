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
    InfoIcon,
    SearchIcon,
    XIcon,
    HashIcon,
    MapPinIcon
} from 'lucide-react';
import type { AppDispatch } from '../store';
import { useGlobalSearch } from '../hooks/useGlobalSearch';
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
import { nicheService } from '../services/nicheService';

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
    const [searchTerm, setSearchTerm] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [selectedApplicationCode, setSelectedApplicationCode] = useState('MISC');
    const [nappResults, setNappResults] = useState<any[]>([]);

    const {
        searchResults,
        isSearching,
        performSearch,
        clearResults
    } = useGlobalSearch();

    // Helper to expand NAPP booking data into selectable result (Applicant, Nominee 1, Nominee 2)
    const expandNappBooking = (booking: any) => {
        const expanded = [];
        const code = booking.nicheApplication?.code || booking.code || '';

        // 1. Applicant (Contact Person)
        if (booking.nicheApplication?.applicantName) {
            expanded.push({
                id: `napp-applicant-${booking.nicheBookingId}`,
                name: booking.nicheApplication.applicantName,
                entityType: 'application' as const, // Force type to match SearchResult
                code: code,
                role: 'Applicant',
                addressNo: booking.nicheApplication.applicantAddressNo,
                addressLine1: booking.nicheApplication.applicantAddressLine1,
                addressLine2: booking.nicheApplication.applicantAddressLine2,
                addressCity: booking.nicheApplication.applicantAddressCity,
                addressState: booking.nicheApplication.applicantAddressState,
                addressCountry: booking.nicheApplication.applicantAddressCountry
            });
        }

        // 2. Nominee 1
        if (booking.nicheApplication?.nomineeName) {
            expanded.push({
                id: `napp-nominee1-${booking.nicheBookingId}`,
                name: booking.nicheApplication.nomineeName,
                entityType: 'application' as const,
                code: code,
                role: 'Nominee 1',
                addressNo: booking.nicheApplication.nomineeAddressNo,
                addressLine1: booking.nicheApplication.nomineeAddressLine1,
                addressLine2: booking.nicheApplication.nomineeAddressLine2,
                addressCity: booking.nicheApplication.nomineeAddressCity,
                addressState: booking.nicheApplication.nomineeAddressState,
                addressCountry: booking.nicheApplication.nomineeAddressCountry
            });
        }

        // 3. Nominee 2
        if (booking.nicheApplication?.nomineeName2) {
            expanded.push({
                id: `napp-nominee2-${booking.nicheBookingId}`,
                name: booking.nicheApplication.nomineeName2,
                entityType: 'application' as const,
                code: code,
                role: 'Nominee 2',
                addressNo: booking.nicheApplication.nomineeAddressNo2,
                addressLine1: booking.nicheApplication.nomineeAddressLine12,
                addressLine2: booking.nicheApplication.nomineeAddressLine22,
                addressCity: booking.nicheApplication.nomineeAddressCity2,
                addressState: booking.nicheApplication.nomineeAddressState2,
                addressCountry: booking.nicheApplication.nomineeAddressCountry2
            });
        }

        return expanded;
    };

    // Auto-search when searchTerm changes
    useEffect(() => {
        const timer = setTimeout(async () => {
            const trimmedTerm = searchTerm.trim();
            if (trimmedTerm.length >= 2) {
                setShowSuggestions(true);

                // Detect application code patterns (NAPP- prefixed or digits-digits)
                const isAppCode = /^NAPP/i.test(trimmedTerm) || /^\d+-\d+/.test(trimmedTerm);
                if (isAppCode) {
                    try {
                        const booking = await nicheService.getBookingByCode(trimmedTerm);
                        if (booking) {
                            setNappResults(expandNappBooking(booking));
                        }
                    } catch (e) {
                        // Silent fail as global search might still find it
                        console.debug('Direct NAPP fetch failed, relying on search:', e);
                    }
                }

                // Always perform default global search
                performSearch(trimmedTerm, ['person', 'application', 'gates-of-life', 'wake-room']);
            } else {
                clearResults();
                setNappResults([]);
                setShowSuggestions(false);
            }
        }, 400); // Slightly faster debounce
        return () => clearTimeout(timer);
    }, [searchTerm, performSearch, clearResults]);

    // Watch searchResults to automatically expand any Niche Applications found by name/others
    useEffect(() => {
        const autoExpandSearchResults = async () => {
            // Find application results that look like NAPP by their code
            const nappApps = searchResults.filter(r =>
                (r.entityType === ('application' as string) || r.entityType === ('niche-application' as string)) &&
                r.code && (/^NAPP/i.test(r.code) || /^\d+-\d+/.test(r.code))
            );

            // If we found a NAPP result and we don't already have NAPP results for it
            if (nappApps.length > 0 && nappResults.length === 0) {
                try {
                    const booking = await nicheService.getBookingByCode(nappApps[0].code!);
                    if (booking) {
                        setNappResults(expandNappBooking(booking));
                    }
                } catch (e) {
                    console.error('Failed to auto-expand search result:', e);
                }
            } else if (nappApps.length === 0 && !/^NAPP/i.test(searchTerm.trim()) && !/^\d+-\d+/.test(searchTerm.trim())) {
                // Only clear if not searching by application code directly
                setNappResults([]);
            }
        };

        autoExpandSearchResults();
    }, [searchResults, searchTerm]);

    // Load items and last receipt number on mount
    useEffect(() => {
        dispatch(resetReceiptState());
        dispatch(fetchReceiptItemsThunk({ receiptId: '567', includeItemInfo: true }));
        dispatch(fetchLastMiscReceiptNumber());
    }, [dispatch]);

    const availableItems = useMemo(() =>
        receiptItems.length > 0
            ? receiptItems.map(item => item.itemName || item.description || '').filter(Boolean)
            : ['Level 3 Niche', 'Niche Inscription', 'Urn (Marble)', 'Admin Fee', 'Others'],
        [receiptItems]
    );

    const calculateTotals = () => {
        return items.reduce((acc, item) => ({
            subtotal: acc.subtotal + item.totalNoTax,
            tax: acc.tax + item.taxAmount,
            total: acc.total + item.totalAmount
        }), { subtotal: 0, tax: 0, total: 0 });
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
            applicationCode: selectedApplicationCode, // Use selected application code or default MISC
            customerName: payeeName,
            payingAmount: total,
            paymentMode: paymentMode,
            paymentModeDocNo: paymentDocNo,
            addressNo: addressBlock === 'Block' ? 'Blk' : addressBlock,
            address: addressNumber,
            address2: addressStreet,
            addressCity: addressUnit,
            districtCode: addressPostalCode,
            country: addressCountry,
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

    const handleSelectResult = (result: any) => {
        const name = result.customerName || result.name || result.applicantName || '';
        setPayeeName(name);
        setSearchTerm(name);
        setShowSuggestions(false);

        // Map application code if it's an application result
        if (result.code) {
            setSelectedApplicationCode(result.code);
        } else {
            setSelectedApplicationCode('MISC');
        }

        // populate address fields if they exist in search result
        if (result.addressNo || result.addressLine1 || result.address || result.addressLine2) {
            // Smarter block/no detection
            const rawAddressNo = String(result.addressNo || '');
            const isBlockValue = /^Blk/i.test(rawAddressNo);
            const cleanNo = rawAddressNo.replace(/^Blk\s*/i, '').replace(/^No\s*/i, '').trim();

            setAddressBlock(isBlockValue ? 'Block' : (cleanNo ? 'No' : 'Block'));
            setAddressNumber(cleanNo || '');

            // Street calculation: if result.address exists (full string), use it, otherwise use line1
            setAddressStreet(result.addressLine1 || result.address || '');
            setAddressUnit(result.addressLine2 || result.addressCity || '');

            // Postal/State/District
            setAddressPostalCode(result.postalCode || result.addressState || result.districtCode || '');
            setAddressCountry(result.addressCountry || result.country || 'Singapore');
        }
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
                                    <div className="space-y-1 relative">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Search Payee (Name or App Code)</label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={searchTerm}
                                                onChange={(e) => {
                                                    setSearchTerm(e.target.value);
                                                    setPayeeName(e.target.value);
                                                    if (e.target.value === '') setSelectedApplicationCode('MISC');
                                                }}
                                                placeholder="Search by name or code (e.g. John or NAPP-123)"
                                                className="w-full pl-10 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all text-gray-700 font-semibold text-sm shadow-sm"
                                            />
                                            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                                                {isSearching ? <LoaderIcon className="w-4 h-4 animate-spin text-teal-500" /> : <SearchIcon className="w-4 h-4" />}
                                            </div>
                                            {searchTerm && (
                                                <button
                                                    onClick={() => {
                                                        setSearchTerm('');
                                                        setPayeeName('');
                                                        setSelectedApplicationCode('MISC');
                                                        clearResults();
                                                    }}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 rounded-full text-gray-400 transition-colors"
                                                >
                                                    <XIcon className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </div>

                                        {/* Suggestions Dropdown */}
                                        {showSuggestions && (searchTerm.trim().length >= 2) && (
                                            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-100 rounded-xl shadow-xl max-h-72 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200">
                                                {isSearching && searchResults.length === 0 && nappResults.length === 0 ? (
                                                    <div className="p-8 text-center">
                                                        <LoaderIcon className="w-6 h-6 animate-spin text-teal-500 mx-auto mb-2" />
                                                        <p className="text-xs text-gray-400 font-medium">Searching database...</p>
                                                    </div>
                                                ) : searchResults.length === 0 && nappResults.length === 0 && !isSearching ? (
                                                    <div className="p-8 text-center">
                                                        <SearchIcon className="w-6 h-6 text-gray-200 mx-auto mb-2" />
                                                        <p className="text-xs text-gray-400 font-medium">No matching recipients found</p>
                                                    </div>
                                                ) : (
                                                    <div className="py-2">
                                                        <div className="px-4 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-50/50 flex justify-between items-center">
                                                            <span>Select a recipient</span>
                                                            {(selectedApplicationCode !== 'MISC' || nappResults.length > 0) && (
                                                                <span className="text-teal-600 lowercase bg-teal-50 px-1.5 py-0.5 rounded flex items-center gap-1">
                                                                    <HashIcon className="w-2.5 h-2.5" />
                                                                    Linked: {nappResults.length > 0 ? nappResults[0].code : selectedApplicationCode}
                                                                </span>
                                                            )}
                                                        </div>

                                                        {/* NAPP Results (Applicants/Nominees) */}
                                                        {nappResults.map((result, idx) => (
                                                            <button
                                                                key={`napp-${idx}`}
                                                                onClick={() => handleSelectResult(result)}
                                                                className="w-full px-4 py-3 text-left hover:bg-teal-50/50 transition-colors border-b border-gray-50 last:border-0 group"
                                                            >
                                                                <div className="flex items-start gap-3">
                                                                    <div className={`mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${result.role === 'Applicant' ? 'bg-indigo-50 text-indigo-600' : 'bg-teal-50 text-teal-600'
                                                                        }`}>
                                                                        {result.role === 'Applicant' ? <UserIcon className="w-4 h-4" /> : <HashIcon className="w-4 h-4" />}
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="flex items-center justify-between mb-0.5">
                                                                            <p className="text-sm font-bold text-gray-900 truncate">
                                                                                {result.name}
                                                                            </p>
                                                                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${result.role === 'Applicant' ? 'bg-indigo-100 text-indigo-700' : 'bg-teal-100 text-teal-700'
                                                                                }`}>
                                                                                {result.role}
                                                                            </span>
                                                                        </div>
                                                                        <div className="flex items-center gap-2 text-[11px] text-gray-500 font-medium">
                                                                            <span className="text-gray-900 font-bold">{result.code}</span>
                                                                            {result.addressLine1 && (
                                                                                <>
                                                                                    <span className="text-gray-300">•</span>
                                                                                    <span className="truncate flex items-center gap-1">
                                                                                        <MapPinIcon className="w-2.5 h-2.5 text-gray-400" />
                                                                                        {result.addressLine1}
                                                                                    </span>
                                                                                </>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </button>
                                                        ))}

                                                        {/* Global Search Results (Filtered to exclude expanded applications) */}
                                                        {searchResults.filter(r => {
                                                            // If we have nappResults for this code, don't show the base application result
                                                            if ((r.entityType === 'application' || r.entityType === 'niche-application') &&
                                                                nappResults.some(nr => nr.code === r.code)) {
                                                                return false;
                                                            }
                                                            return true;
                                                        }).map((result, idx) => (
                                                            <button
                                                                key={`${result.id}-${idx}`}
                                                                onClick={() => handleSelectResult(result)}
                                                                className="w-full px-4 py-3 text-left hover:bg-teal-50/50 transition-colors border-b border-gray-50 last:border-0 group"
                                                            >
                                                                <div className="flex items-start gap-3">
                                                                    <div className={`mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${result.entityType === 'application' ? 'bg-indigo-50 text-indigo-600' : 'bg-teal-50 text-teal-600'
                                                                        }`}>
                                                                        {result.entityType === 'application' ? <HashIcon className="w-4 h-4" /> : <UserIcon className="w-4 h-4" />}
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="flex items-center justify-between mb-0.5">
                                                                            <p className="text-sm font-bold text-gray-900 truncate">
                                                                                {result.customerName || result.name || result.applicantName}
                                                                            </p>
                                                                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${result.entityType === 'application' ? 'bg-indigo-100 text-indigo-700' : 'bg-teal-100 text-teal-700'
                                                                                }`}>
                                                                                {result.entityType}
                                                                            </span>
                                                                        </div>
                                                                        <div className="flex items-center gap-2 text-[11px] text-gray-500 font-medium">
                                                                            {result.code && (
                                                                                <span className="text-gray-900 font-bold">{result.code}</span>
                                                                            )}
                                                                            {result.address && (
                                                                                <>
                                                                                    <span className="text-gray-300">•</span>
                                                                                    <span className="truncate flex items-center gap-1">
                                                                                        <MapPinIcon className="w-2.5 h-2.5 text-gray-400" />
                                                                                        {result.address}
                                                                                    </span>
                                                                                </>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
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
                                        <span className="font-bold text-sm">${totals.subtotal.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-slate-300">
                                        <span className="text-xs font-medium">GST (9%)</span>
                                        <span className="font-bold text-sm">${totals.tax.toFixed(2)}</span>
                                    </div>
                                    <div className="pt-3 border-t border-slate-800">
                                        <div className="flex justify-between items-center">
                                            <span className="text-md font-bold text-teal-400">Total Payable</span>
                                            <span className="text-xl font-bold text-teal-400">${totals.total.toFixed(2)}</span>
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
