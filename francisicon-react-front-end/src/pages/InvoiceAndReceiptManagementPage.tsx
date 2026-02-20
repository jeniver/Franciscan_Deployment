import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import {
  ReceiptIcon,
  SearchIcon,
  PlusIcon,
  FileTextIcon,
  TrendingUpIcon,
  FileCheckIcon,
  FileDownIcon,
  RefreshCw,
} from 'lucide-react';
import { useReport } from '../hooks/useReport';
import { DateInput } from '../components/common/DateInput';
import { useReceipt } from '../hooks/useReceipt';
import { useInvoice } from '../hooks/useInvoice';
import { useToast } from '../contexts/ToastContext';
import { ReceiptDetailModal } from '../components/ReceiptDetailModal';
import { CreateReceiptModal } from '../components/CreateReceiptModal';
import { InvoiceViewerModal } from '../components/InvoiceViewerModal';
import { InvoiceTemplateData } from '../services/invoiceTemplateService';
import { Receipt, receiptService } from '../services/receiptService';
import { receiptPdfService } from '../services/receiptPdfService';
import { InvoiceListItem } from '../services/invoiceService';
import { formatAddressLinesForInvoiceReceipt, formatAddressForDisplay, joinAddressLines } from '../utils/addressUtils';

const formatInputDate = (date: Date) => date.toISOString().split('T')[0];

const getLastSixMonthsRange = () => {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth() - 5, 1);
  const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  return {
    from: formatInputDate(start),
    to: formatInputDate(end),
  };
};

type TabType = 'invoice' | 'receipt';

type AppliedFilters = {
  fromDate: string;
  toDate: string;
  searchTerm: string;
  paymentMode: string | null;
  receiptCode?: string;
  customerName?: string;
  invoiceCode?: string;
};

const DEFAULT_SORT_BY = 'TransactionDate';
const DEFAULT_SORT_ORDER: 'asc' | 'desc' = 'desc';

export function InvoiceAndReceiptManagementPage() {
  const navigate = useNavigate();
  const { showSuccess, showError, showInfo } = useToast();
  const { generateMonthlyReceiptsReport, generatingReport } = useReport();

  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>('receipt');

  // Receipt hooks
  const {
    receipts,
    selectedReceipt,
    selectedInvoice,
    currentPage: receiptCurrentPage,
    receiptsPerPage,
    totalReceipts,
    totalPages: receiptTotalPages,
    // filters: receiptFilters,
    loading: receiptLoading,
    error: receiptError,
    isDataLoaded: receiptIsDataLoaded,
    isCreating,
    totalAmount,
    pendingReceipts,
    createReceipt,
    // fetchLastReceiptNumber,
    fetchReceiptsByDateRange,
    searchReceipts,
    fetchInvoiceByCode,
    // getReceiptPdfLink,
    // getInvoicePdfLink,
    setCurrentPage: setReceiptCurrentPage,
    setSelectedInvoice,
    setSelectedReceipt,
    setFilters: setReceiptFilters,
    clearFilters: clearReceiptFilters,
    clearError: clearReceiptError,
  } = useReceipt();

  // Invoice hooks
  const {
    invoices,
    loading: invoiceLoading,
    error: invoiceError,
    pagination: invoicePagination,
    // filters: invoiceFilters,
    searchInvoices,
    // updateFilters: updateInvoiceFilters,
    clearFilters: clearInvoiceFilters,
    setPage: setInvoicePage,
  } = useInvoice();

  const defaultDateRange = useMemo(() => getLastSixMonthsRange(), []);
  const defaultFromDate = defaultDateRange.from;
  const defaultToDate = defaultDateRange.to;

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  // const [viewingReceiptCode, setViewingReceiptCode] = useState<string | null>(null);
  const [isInvoiceViewerOpen, setIsInvoiceViewerOpen] = useState(false);
  const [viewerInvoiceData, setViewerInvoiceData] = useState<InvoiceTemplateData | null>(null);
  const [appliedFilters, setAppliedFilters] = useState<AppliedFilters>({
    fromDate: defaultFromDate,
    toDate: defaultToDate,
    searchTerm: '',
    paymentMode: null,
    receiptCode: '',
    customerName: '',
    invoiceCode: '',
  });
  const [isPdfLoading, setIsPdfLoading] = useState(false);

  const appliedFiltersRef = useRef<AppliedFilters>(appliedFilters);
  // const paginationEffectInitialized = useRef(false);

  // Determine if we should use search API based on filters
  const shouldUseSearchApi = useCallback((filters: AppliedFilters) => {
    return !!(
      filters.searchTerm?.trim() ||
      filters.paymentMode
    );
  }, []);

  // Execute receipt search
  const executeReceiptSearch = useCallback(async (searchParams: any) => {
    try {
      if (shouldUseSearchApi(searchParams)) {
        await searchReceipts({
          query: searchParams.searchTerm,
          page: searchParams.page || receiptCurrentPage,
          limit: searchParams.limit || receiptsPerPage,
          sortBy: DEFAULT_SORT_BY,
          sortOrder: DEFAULT_SORT_ORDER,
          bypassCache: searchParams.bypassCache || false,
        });
      } else if (searchParams.fromDate && searchParams.toDate) {
        await fetchReceiptsByDateRange({
          fromDate: searchParams.fromDate,
          toDate: searchParams.toDate,
          page: searchParams.page || receiptCurrentPage,
          limit: searchParams.limit || receiptsPerPage,
          bypassCache: searchParams.bypassCache || false,
        });
      }
    } catch (error: any) {
      console.error('Error searching receipts:', error);
    }
  }, [searchReceipts, fetchReceiptsByDateRange, shouldUseSearchApi, receiptCurrentPage, receiptsPerPage]);

  // Execute invoice search
  const executeInvoiceSearch = useCallback(async (searchParams: any) => {
    try {
      await searchInvoices({
        searchTerm: searchParams.searchTerm,
        fromDate: searchParams.fromDate,
        toDate: searchParams.toDate,
        paymentMode: searchParams.paymentMode,
        page: searchParams.page || invoicePagination.page,
        limit: searchParams.limit || invoicePagination.limit,
        sortBy: DEFAULT_SORT_BY,
        sortOrder: DEFAULT_SORT_ORDER,
        bypassCache: searchParams.bypassCache || false,
      });
    } catch (error: any) {
      console.error('Error searching invoices:', error);
    }
  }, [searchInvoices, invoicePagination]);

  // Initialize with default search
  useEffect(() => {
    const initialApplied: AppliedFilters = {
      fromDate: defaultFromDate,
      toDate: defaultToDate,
      searchTerm: '',
      paymentMode: null,
    };

    appliedFiltersRef.current = initialApplied;
    setAppliedFilters(initialApplied);

    // Load receipts by default
    executeReceiptSearch({
      ...initialApplied,
      page: receiptCurrentPage,
      limit: receiptsPerPage,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle tab change
  useEffect(() => {
    if (activeTab === 'invoice') {
      // Load invoices when switching to invoice tab
      executeInvoiceSearch({
        ...appliedFilters,
        page: 1,
        limit: 20,
      });
    } else {
      // Load receipts when switching to receipt tab
      executeReceiptSearch({
        ...appliedFilters,
        page: receiptCurrentPage,
        limit: receiptsPerPage,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Handle errors
  useEffect(() => {
    if (receiptError) {
      showError('Error', receiptError);
      clearReceiptError();
    }
  }, [receiptError, showError, clearReceiptError]);

  useEffect(() => {
    if (invoiceError) {
      showError('Error', invoiceError);
    }
  }, [invoiceError, showError]);

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
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const handleCreateReceipt = async (data: any) => {
    try {
      await createReceipt(data).unwrap();
      showSuccess('Success', 'Receipt created successfully');
      setIsCreateModalOpen(false);
      setSelectedInvoice(null);
      // Force refresh with cache bypass to show newly created receipt
      executeReceiptSearch({
        ...appliedFiltersRef.current,
        page: 1,
        limit: receiptsPerPage,
        bypassCache: true,
      });
    } catch (error: any) {
      showError('Error', error.message || 'Failed to create receipt');
      throw error;
    }
  };

  const handleFetchInvoice = async (code: string) => {
    try {
      await fetchInvoiceByCode(code).unwrap();
      showInfo('Success', 'Invoice loaded successfully');
    } catch (error: any) {
      showError('Error', error.message || 'Failed to fetch invoice');
      throw error;
    }
  };

  const handleSearch = () => {
    const nextApplied: AppliedFilters = {
      ...appliedFilters,
      searchTerm: appliedFilters.searchTerm?.trim() || '',
    };

    appliedFiltersRef.current = nextApplied;
    setAppliedFilters(nextApplied);

    if (activeTab === 'invoice') {
      if (!nextApplied.fromDate || !nextApplied.toDate) {
        showError('Error', 'Please select both from and to dates');
        return;
      }
      executeInvoiceSearch({
        ...nextApplied,
        page: 1,
        limit: 20,
      });
    } else {
      if (receiptCurrentPage !== 1) {
        setReceiptCurrentPage(1);
        return;
      }
      executeReceiptSearch({
        ...nextApplied,
        page: 1,
        limit: receiptsPerPage,
      });
    }
  };

  const handleRefresh = useCallback(async () => {
    try {
      if (activeTab === 'receipt') {
        await executeReceiptSearch({
          ...appliedFilters,
          page: receiptCurrentPage,
          limit: receiptsPerPage,
          bypassCache: true,
        });
      } else {
        await executeInvoiceSearch({
          ...appliedFilters,
          page: invoicePagination.page,
          limit: invoicePagination.limit,
          bypassCache: true,
        });
      }
    } catch (error) {
      console.error('[InvoiceAndReceiptManagementPage] Refresh failed:', error);
      showError('Refresh Failed', 'Could not refresh data. Please try again.');
    }
  }, [activeTab, appliedFilters, executeReceiptSearch, executeInvoiceSearch, receiptCurrentPage, receiptsPerPage, invoicePagination, showError]);

  const handleExport = async () => {
    try {
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

      const params = {
        month: today.getMonth() + 1,
        year: today.getFullYear(),
        fromDate: startOfMonth.toISOString(),
        toDate: endOfMonth.toISOString(),
      };

      const blob = await generateMonthlyReceiptsReport(params);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Receipts-Report-${params.year}-${params.month}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      showSuccess('Success', 'Monthly receipts report generated successfully');
    } catch (error) {
      console.error('[InvoiceAndReceiptManagementPage] Export failed:', error);
      showError('Export Failed', 'Failed to generate monthly report');
    }
  };

  const handleViewReceiptPdf = async (receipt: Receipt) => {
    if (isPdfLoading) return;
    setIsPdfLoading(true);
    try {
      const fullReceipt = await receiptService.getReceiptByCode(receipt.receiptCode);
      const blob = await receiptPdfService.generateReceiptPdf(fullReceipt);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (error) {
      console.error('[InvoiceAndReceiptManagementPage] PDF generation failed:', error);
      showError('Error', 'Failed to generate receipt PDF');
    } finally {
      setIsPdfLoading(false);
    }
  };

  const handleClearFilterValues = () => {
    const baseFilters: AppliedFilters = {
      fromDate: defaultFromDate,
      toDate: defaultToDate,
      searchTerm: '',
      paymentMode: null,
      receiptCode: '',
      customerName: '',
      invoiceCode: '',
    };

    if (activeTab === 'invoice') {
      clearInvoiceFilters();
      setAppliedFilters(baseFilters);
      appliedFiltersRef.current = baseFilters;
      executeInvoiceSearch({
        ...baseFilters,
        page: 1,
        limit: 20,
      });
    } else {
      clearReceiptFilters();
      setReceiptFilters(baseFilters);
      appliedFiltersRef.current = baseFilters;
      setAppliedFilters(baseFilters);
      if (receiptCurrentPage !== 1) {
        setReceiptCurrentPage(1);
      } else {
        executeReceiptSearch({
          ...baseFilters,
          page: 1,
          limit: receiptsPerPage,
        });
      }
    }
  };

  const handlePageChange = (newPage: number) => {
    if (activeTab === 'invoice') {
      setInvoicePage(newPage);
      executeInvoiceSearch({
        ...appliedFilters,
        page: newPage,
        limit: invoicePagination.limit,
      });
    } else {
      setReceiptCurrentPage(newPage);
      executeReceiptSearch({
        ...appliedFiltersRef.current,
        page: newPage,
        limit: receiptsPerPage,
      });
    }
  };

  const handleNewReceipt = () => {
    // Navigate to Create Invoice page
    navigate('/create-invoice');
  };

  const handleNewInvoice = () => {
    // Navigate to Create Invoice page for creating new invoice
    navigate('/create-invoice');
  };

  const stats = useMemo(() => {
    if (activeTab === 'invoice') {
      return {
        total: invoices.length,
        totalAmount: invoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0),
        pendingCount: 0,
        paidCount: invoices.length,
      };
    }
    return {
      total: totalReceipts,
      totalAmount: totalAmount,
      pendingCount: pendingReceipts.length,
      paidCount: Math.max(0, receipts.length - pendingReceipts.length),
    };
  }, [activeTab, invoices, receipts, totalReceipts, totalAmount, pendingReceipts]);

  const renderLoadingState = (message: string) => (
    <div className="p-12 text-center">
      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      <p className="mt-4 text-gray-600">{message}</p>
    </div>
  );

  const renderEmptyState = (message: string, action?: React.ReactNode) => (
    <div className="p-12 text-center">
      <FileTextIcon className="mx-auto h-12 w-12 text-gray-400" />
      <h3 className="mt-2 text-sm font-medium text-gray-900">{message}</h3>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );

  const renderReceiptTable = (receipts: Receipt[], showActions = true) => {
    return (
      <div className="overflow-hidden rounded-2xl border border-gray-100 shadow-sm mx-4 md:mx-6 mb-6">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-[#f8fafc]">
            <tr>
              <th className="px-6 py-4 text-left text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                Receipt No
              </th>
              <th className="px-6 py-4 text-left text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                Date
              </th>
              <th className="px-6 py-4 text-left text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                Payer / Customer
              </th>
              <th className="px-6 py-4 text-right text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                Amount
              </th>
              <th className="px-6 py-4 text-left text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                Payment Info
              </th>
              {showActions && (
                <th className="px-6 py-4 text-center text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-50">
            {receipts.map((receipt) => (
              <tr key={receipt.receiptId || receipt.receiptCode} className="group hover:bg-blue-50/30 transition-colors">
                <td className="px-6 py-5 whitespace-nowrap">
                  <span className="inline-flex items-center px-3 py-1 rounded-lg bg-blue-50 text-blue-700 font-bold text-sm border border-blue-100">
                    {receipt.receiptCode || 'N/A'}
                  </span>
                </td>
                <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-600 font-medium">
                  {formatDate(receipt.receiptDate || receipt.createdAt)}
                </td>
                <td className="px-6 py-5 whitespace-nowrap">
                  <div className="text-sm font-bold text-gray-900">{receipt.customerName || 'N/A'}</div>
                  <div className="text-[10px] text-gray-400 mt-1 uppercase tracking-widest">
                    Ref: {receipt.invoiceCode || 'New Order'}
                  </div>
                </td>
                <td className="px-6 py-5 whitespace-nowrap text-right">
                  <span className="text-sm font-extrabold text-[#0f172a]">
                    {formatCurrency(receipt.totalAmount || receipt.payingAmount || 0)}
                  </span>
                </td>
                <td className="px-6 py-5 whitespace-nowrap">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-widest uppercase bg-gray-100 text-gray-600 border border-gray-200">
                    {receipt.paymentMode || 'N/A'}
                  </span>
                </td>
                {showActions && (
                  <td className="px-6 py-5 whitespace-nowrap text-center">
                    <div className="flex items-center justify-center gap-3">
                      <button
                        onClick={() => {
                          setSelectedReceipt(receipt);
                          setIsDetailModalOpen(true);
                        }}
                        className="p-2 rounded-xl text-blue-600 hover:bg-white hover:shadow-lg transition-all active:scale-90"
                        title="View Details"
                      >
                        <SearchIcon className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleViewReceiptPdf(receipt)}
                        className="p-2 rounded-xl text-gray-400 hover:text-blue-700 hover:bg-white hover:shadow-lg transition-all active:scale-90"
                        title="View PDF"
                        disabled={isPdfLoading}
                      >
                        <FileDownIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderInvoiceTable = (invoices: InvoiceListItem[], showActions = true) => {
    return (
      <div className="overflow-hidden rounded-2xl border border-gray-100 shadow-sm mx-4 md:mx-6 mb-6">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-[#f8fafc]">
            <tr>
              <th className="px-6 py-4 text-left text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                Invoice No
              </th>
              <th className="px-6 py-4 text-left text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                Date
              </th>
              <th className="px-6 py-4 text-left text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                Customer / Ref
              </th>
              <th className="px-6 py-4 text-right text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                Total Amount
              </th>
              <th className="px-6 py-4 text-left text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                Status
              </th>
              {showActions && (
                <th className="px-6 py-4 text-center text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-50">
            {invoices.map((invoice) => (
              <tr key={invoice.invoiceId} className="group hover:bg-blue-50/30 transition-colors">
                <td className="px-6 py-5 whitespace-nowrap">
                  <span className="inline-flex items-center px-3 py-1 rounded-lg bg-indigo-50 text-indigo-700 font-bold text-sm border border-indigo-100">
                    {invoice.invoiceCode || 'N/A'}
                  </span>
                </td>
                <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-600 font-medium">
                  {formatDate(invoice.transactionDate || invoice.invoiceDate)}
                </td>
                <td className="px-6 py-5 whitespace-nowrap">
                  <div className="text-sm font-bold text-gray-900">{invoice.customerName || 'N/A'}</div>
                  <div className="text-[10px] text-gray-400 mt-1 uppercase tracking-widest">
                    Doc: {invoice.refDocName || 'N/A'} | {invoice.refDocNumber || 'N/A'}
                  </div>
                </td>
                <td className="px-6 py-5 whitespace-nowrap text-right">
                  <span className="text-sm font-extrabold text-[#0f172a]">
                    {formatCurrency(invoice.totalAmount || 0)}
                  </span>
                </td>
                <td className="px-6 py-5 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-widest uppercase border ${invoice.status === 'Active' || invoice.status === '1'
                    ? 'bg-green-50 text-green-700 border-green-100'
                    : 'bg-gray-50 text-gray-700 border-gray-100'
                    }`}>
                    {invoice.status || 'Active'}
                  </span>
                </td>
                {showActions && (
                  <td className="px-6 py-5 whitespace-nowrap text-center">
                    <div className="flex items-center justify-center gap-3">
                      <button
                        onClick={async () => {
                          if (!invoice.invoiceCode) {
                            showError('Error', 'Invoice code is required to view invoice');
                            return;
                          }

                          try {
                            const invoiceCode = invoice.invoiceCode.trim();

                            // Fetch full invoice data from the invoices API using the new API endpoint
                            const fullInvoice = await receiptService.getInvoiceByCode(invoiceCode);

                            // Map the invoice details to template items
                            const items = (fullInvoice.invoiceDetails || []).map((detail) => ({
                              description: detail.itemName || detail.description || 'Item',
                              referenceNo: detail.RefDocNumber || detail.refDocNumber || '',
                              gstPercent: detail.lineTaxPercent || detail.taxPercent || 9,
                              qty: detail.quantity || 1,
                              quantity: detail.quantity || 1,
                              unitPrice: detail.unitPrice || detail.payingAmount || detail.amount || 0,
                              amount: detail.TotalPayingAmount || detail.totalPayingAmount || detail.amount || 0,
                            })) || [];

                            // Format customer address (Block, Street, Unit, Singapore) - avoid duplicate Block/Blk
                            let customerAddress = '';
                            if (fullInvoice.address || fullInvoice.addressNo || fullInvoice.address2 || fullInvoice.addressCity || fullInvoice.customerAddress) {
                              const lines = formatAddressLinesForInvoiceReceipt({
                                blockNo: fullInvoice.addressNo,
                                street: fullInvoice.address,
                                unit: fullInvoice.address2,
                                postalCode: fullInvoice.addressCity,
                                country: fullInvoice.country || 'Singapore',
                              });
                              customerAddress = joinAddressLines(lines, '\n') || formatAddressForDisplay(fullInvoice.customerAddress) || '';
                            }

                            // Format invoice date properly
                            let formattedInvoiceDate = '';
                            if (fullInvoice.invoiceDate) {
                              try {
                                const dateObj = new Date(fullInvoice.invoiceDate);
                                if (!isNaN(dateObj.getTime())) {
                                  formattedInvoiceDate = dateObj.toLocaleDateString('en-SG', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                  });
                                }
                              } catch (dateError) {
                                console.warn('[InvoiceAndReceiptManagementPage] Error formatting invoice date:', dateError);
                                formattedInvoiceDate = fullInvoice.invoiceDate;
                              }
                            }

                            const templateData: InvoiceTemplateData = {
                              invoiceCode: fullInvoice.invoiceCode || invoiceCode,
                              invoiceDate: formattedInvoiceDate || invoice.invoiceDate || invoice.transactionDate || '',
                              customerName: fullInvoice.customerName || invoice.customerName || 'N/A',
                              customerAddress: customerAddress || undefined,
                              paymentMode: fullInvoice.paymentMode || invoice.paymentMode || '',
                              totalAmount:
                                fullInvoice.totalAmount ||
                                fullInvoice.payingAmount ||
                                invoice.totalAmount ||
                                invoice.payingAmount ||
                                0,
                              taxAmount: (fullInvoice as any).taxAmount || undefined,
                              items: items.length > 0 ? items : undefined,
                            };

                            setViewerInvoiceData(templateData);
                            setIsInvoiceViewerOpen(true);
                          } catch (error: any) {
                            console.error('[InvoiceAndReceiptManagementPage] Error viewing invoice:', error);
                            const errorMessage = error?.message || error?.response?.data?.message || 'Failed to open invoice viewer';
                            showError('Error', errorMessage);
                          }
                        }}
                        className="p-2 rounded-xl text-blue-600 hover:bg-white hover:shadow-lg transition-all active:scale-90"
                        title="View Invoice"
                      >
                        <SearchIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const currentPagination = activeTab === 'invoice' ? invoicePagination : {
    page: receiptCurrentPage,
    limit: receiptsPerPage,
    total: totalReceipts,
    totalPages: receiptTotalPages,
  };

  const currentLoading = activeTab === 'invoice' ? invoiceLoading : receiptLoading;
  const currentDataLoaded = activeTab === 'invoice' ? true : receiptIsDataLoaded;
  const currentData = activeTab === 'invoice' ? invoices : receipts;

  return (
    <Layout title="Financial Hub">
      <div className="min-h-screen bg-[#f8fafc] pb-12">
        {/* Modern Hero Section */}
        <div className="bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#334155] border-b border-white/5 pb-32 pt-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
          {/* Decorative Elements */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 blur-[120px] rounded-full -mr-20 -mt-20"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-600/10 blur-[100px] rounded-full -ml-10 -mb-10"></div>

          <div className="max-w-7xl mx-auto relative z-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
              <div className="max-w-2xl">
                <span className="inline-flex items-center px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-widest mb-4">
                  Financial Dashboard
                </span>
                <h1 className="text-4xl font-extrabold text-white tracking-tight sm:text-5xl lg:text-6xl">
                  Invoices & <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">Receipts</span>
                </h1>
                <p className="mt-6 text-lg text-gray-400 font-medium max-w-xl leading-relaxed">
                  Unified transaction management system. Search, track, and generate professional reports for all church financial activities.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={handleNewInvoice}
                  className="group flex items-center justify-center gap-3 px-8 py-4 bg-white text-[#0f172a] font-black rounded-2xl shadow-[0_20px_40px_-15px_rgba(255,255,255,0.2)] hover:shadow-[0_25px_50px_-12px_rgba(255,255,255,0.25)] hover:translate-y-[-4px] transition-all duration-300"
                >
                  <PlusIcon className="w-5 h-5 group-hover:rotate-90 transition-transform" />
                  Issue New Invoice
                </button>
              </div>
            </div>

            {/* Smart Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-16">
              {[
                { label: 'Total Value', value: `${formatCurrency(stats.totalAmount)}`, icon: TrendingUpIcon, color: 'from-blue-500 to-indigo-600', sub: 'Calculated from filters' },
                { label: 'Active Records', value: stats.total, icon: FileCheckIcon, color: 'from-emerald-500 to-teal-600', sub: 'Total items found' },
                { label: 'Pending Processing', value: stats.pendingCount, icon: RefreshCw, color: 'from-amber-500 to-orange-600', sub: 'Requires attention' },
                { label: 'Archive Health', value: '100%', icon: FileTextIcon, color: 'from-pink-500 to-rose-600', sub: 'System uptime' },
              ].map((stat, i) => (
                <div key={i} className="group bg-white/5 backdrop-blur-xl rounded-3xl p-6 border border-white/10 shadow-2xl hover:bg-white/[0.08] transition-all duration-300">
                  <div className="flex items-center justify-between mb-6">
                    <div className={`p-3 rounded-2xl bg-gradient-to-br ${stat.color} shadow-lg shadow-black/20`}>
                      <stat.icon className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">{stat.label}</span>
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-3xl font-black text-white group-hover:text-blue-400 transition-colors">{stat.value}</h3>
                    <p className="text-xs text-gray-500 font-medium tracking-wide">{stat.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Dynamic Content Surface */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-12 relative z-20">
          <div className="bg-white rounded-[40px] shadow-[0_50px_100px_-20px_rgba(15,23,42,0.12)] border border-gray-100 overflow-hidden">
            {/* Intelligent Filter Bar */}
            <div className="p-10 border-b border-gray-100 bg-[#f8fafc]/50">
              <div className="flex flex-col xl:flex-row gap-8 items-stretch xl:items-end">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 flex-1">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Time Range (Start)</label>
                    <DateInput
                      value={appliedFilters.fromDate}
                      onChange={(date) => setAppliedFilters({ ...appliedFilters, fromDate: date })}
                      className="w-full h-14 rounded-2xl border-gray-200 focus:ring-4 focus:ring-blue-100 transition-all font-bold text-gray-700 bg-white shadow-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Time Range (End)</label>
                    <DateInput
                      value={appliedFilters.toDate}
                      onChange={(date) => setAppliedFilters({ ...appliedFilters, toDate: date })}
                      className="w-full h-14 rounded-2xl border-gray-200 focus:ring-4 focus:ring-blue-100 transition-all font-bold text-gray-700 bg-white shadow-sm"
                    />
                  </div>
                  <div className="lg:col-span-1 space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Filter by Mode</label>
                    <select
                      className="w-full h-14 px-4 rounded-2xl border-gray-200 focus:ring-4 focus:ring-blue-100 transition-all font-bold text-gray-700 bg-white shadow-sm outline-none appearance-none"
                      value={appliedFilters.paymentMode || ''}
                      onChange={(e) => setAppliedFilters({ ...appliedFilters, paymentMode: e.target.value || null })}
                    >
                      <option value="">All Payment Modes</option>
                      <option value="Cash">Cash</option>
                      <option value="Cheque">Cheque</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="Credit Card">Credit Card</option>
                    </select>
                  </div>
                  <div className="lg:col-span-3 space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Global Semantic Search</label>
                    <div className="relative group">
                      <SearchIcon className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300 group-focus-within:text-blue-600 transition-colors" />
                      <input
                        type="text"
                        placeholder="Search by name, document ID, application code..."
                        value={appliedFilters.searchTerm}
                        onChange={(e) => setAppliedFilters({ ...appliedFilters, searchTerm: e.target.value })}
                        onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                        className="w-full h-14 pl-14 pr-6 rounded-2xl border-gray-200 focus:ring-4 focus:ring-blue-100 transition-all font-bold text-gray-900 bg-white shadow-sm placeholder:text-gray-300 outline-none"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleClearFilterValues}
                    className="h-14 px-8 rounded-2xl border-2 border-gray-100 text-gray-400 font-extrabold hover:border-gray-200 hover:text-gray-600 hover:bg-gray-50 transition-all active:scale-95"
                  >
                    Reset
                  </button>
                  <button
                    onClick={handleSearch}
                    disabled={receiptLoading || invoiceLoading}
                    className="h-14 px-10 bg-[#0f172a] text-white font-black rounded-2xl shadow-xl hover:shadow-gray-200 hover:translate-y-[-2px] transition-all active:scale-95 flex items-center gap-3 disabled:opacity-50"
                  >
                    {receiptLoading || invoiceLoading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <SearchIcon className="w-5 h-5" />}
                    Optimize View
                  </button>
                </div>
              </div>
            </div>

            {/* Premium Document Switcher */}
            <div className="flex bg-gray-50 px-10 py-0 border-b border-gray-100">
              {[
                { id: 'receipt', label: 'Receipts', icon: ReceiptIcon, count: totalReceipts },
                { id: 'invoice', label: 'Invoices', icon: FileCheckIcon, count: invoices.length }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`group flex items-center gap-3 px-10 py-6 text-sm font-black transition-all relative ${activeTab === tab.id ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'
                    }`}
                >
                  <tab.icon className={`w-5 h-5 ${activeTab === tab.id ? 'text-blue-600' : 'text-gray-300 group-hover:text-gray-400'}`} />
                  {tab.label}
                  <span className={`ml-2 px-2 py-0.5 rounded-md text-[10px] font-black ${activeTab === tab.id ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-500 group-hover:bg-gray-300'
                    }`}>
                    {tab.count}
                  </span>
                  {activeTab === tab.id && (
                    <span className="absolute bottom-0 left-0 right-0 h-1.5 bg-blue-600 rounded-t-full shadow-[0_-4px_12px_rgba(37,99,235,0.4)]" />
                  )}
                </button>
              ))}
              <div className="ml-auto self-center">
                <button
                  onClick={handleExport}
                  disabled={generatingReport}
                  className="flex items-center gap-2 px-6 py-2.5 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition-all text-xs border border-gray-200 disabled:opacity-50"
                >
                  <FileDownIcon className={`w-4 h-4 ${generatingReport ? 'animate-pulse' : ''}`} />
                  Export Dataset
                </button>
              </div>
            </div>

            {/* Interactive Data List Surface */}
            <div className="p-0 min-h-[500px]">
              {(receiptLoading || invoiceLoading) ? (
                <div className="py-40 flex flex-col items-center justify-center">
                  <div className="relative">
                    <div className="w-20 h-20 border-[6px] border-blue-500/10 border-t-blue-500 rounded-full animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <RefreshCw className="w-6 h-6 text-blue-400 animate-pulse" />
                    </div>
                  </div>
                  <p className="mt-8 text-sm font-black text-gray-400 uppercase tracking-widest animate-pulse">Filtering Transaction Data...</p>
                </div>
              ) : (
                <div className="py-6">
                  {activeTab === 'receipt' ? (
                    <>
                      {receipts.length > 0 ? renderReceiptTable(receipts) : (
                        <div className="py-32 text-center bg-gray-50/50 mx-10 rounded-[32px] border-4 border-dashed border-gray-100">
                          <ReceiptIcon className="w-20 h-20 text-gray-200 mx-auto mb-6" />
                          <h3 className="text-2xl font-black text-gray-400">No Transaction Records Found</h3>
                          <p className="text-gray-400 font-bold mt-2">Try adjusting your filters to broaden the search</p>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      {invoices.length > 0 ? renderInvoiceTable(invoices) : (
                        <div className="py-32 text-center bg-gray-50/50 mx-10 rounded-[32px] border-4 border-dashed border-gray-100">
                          <FileTextIcon className="w-20 h-20 text-gray-200 mx-auto mb-6" />
                          <h3 className="text-2xl font-black text-gray-400">Invoice Archive Empty</h3>
                          <p className="text-gray-400 font-bold mt-2">We couldn't find any invoices matching your criteria</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Premium Smart Pagination */}
            <div className="bg-[#f8fafc]/50 px-10 py-8 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-6">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Current Focus</span>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-black text-gray-900 bg-white px-3 py-1 rounded-lg border border-gray-200 shadow-sm">
                      Page {activeTab === 'invoice' ? invoicePagination.page : receiptCurrentPage}
                    </span>
                    <span className="text-sm font-bold text-gray-400">
                      of {activeTab === 'invoice' ? invoicePagination.totalPages : receiptTotalPages}
                    </span>
                  </div>
                </div>
                <div className="h-10 w-px bg-gray-200 hidden sm:block"></div>
                <div className="hidden lg:block">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Index Summary</span>
                  <p className="text-sm font-bold text-gray-500">
                    Showing <span className="text-blue-600 font-black">{activeTab === 'invoice' ? invoices.length : receipts.length}</span> entries
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => handlePageChange(activeTab === 'invoice' ? invoicePagination.page - 1 : receiptCurrentPage - 1)}
                  disabled={(activeTab === 'invoice' ? invoicePagination.page : receiptCurrentPage) === 1}
                  className="px-8 h-12 rounded-2xl border-2 border-gray-100 font-black text-sm text-gray-500 hover:bg-white hover:border-gray-300 hover:text-gray-900 transition-all disabled:opacity-20 disabled:cursor-not-allowed active:scale-95"
                >
                  Previous
                </button>
                <div className="flex gap-2">
                  {[...Array(Math.min(3, activeTab === 'invoice' ? invoicePagination.totalPages : receiptTotalPages))].map((_, i) => {
                    const pageNum = i + 1;
                    const isActive = (activeTab === 'invoice' ? invoicePagination.page : receiptCurrentPage) === pageNum;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`w-12 h-12 rounded-2xl font-black text-sm transition-all ${isActive
                          ? 'bg-blue-600 text-white shadow-xl shadow-blue-200'
                          : 'text-gray-400 hover:bg-white hover:text-gray-900 border-2 border-transparent'
                          }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => handlePageChange(activeTab === 'invoice' ? invoicePagination.page + 1 : receiptCurrentPage + 1)}
                  disabled={(activeTab === 'invoice' ? invoicePagination.page : receiptCurrentPage) >= (activeTab === 'invoice' ? invoicePagination.totalPages : receiptTotalPages)}
                  className="px-8 h-12 rounded-2xl bg-[#0f172a] font-black text-sm text-white hover:shadow-xl hover:translate-y-[-2px] transition-all disabled:opacity-20 disabled:cursor-not-allowed active:scale-95"
                >
                  Next Page
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modern Dialog Layers */}
      <CreateReceiptModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={handleCreateReceipt}
        onFetchInvoice={handleFetchInvoice}
        invoiceData={selectedInvoice}
        onClearInvoice={() => setSelectedInvoice(null)}
        loading={isCreating}
      />
      <ReceiptDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        receipt={selectedReceipt}
      />
      <InvoiceViewerModal
        isOpen={isInvoiceViewerOpen}
        onClose={() => setIsInvoiceViewerOpen(false)}
        invoiceData={viewerInvoiceData}
      />
    </Layout>
  );
}


