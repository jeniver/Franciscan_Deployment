import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { Layout } from '../components/Layout';
import {
  ReceiptIcon,
  SearchIcon,
  FilterIcon,
  DownloadIcon,
  PlusIcon,
  CalendarIcon,
  EyeIcon,
  FileTextIcon,
  TrendingUpIcon,
} from 'lucide-react';
import { useReceipt } from '../hooks/useReceipt';
import { useReport } from '../hooks/useReport';
import { useToast } from '../contexts/ToastContext';
import { ReceiptDetailModal } from '../components/ReceiptDetailModal';
import { CreateReceiptModal } from '../components/CreateReceiptModal';
import { ReportViewerModal } from '../components/ReportViewerModal';
import { InvoiceViewerModal } from '../components/InvoiceViewerModal';
import { InvoiceTemplateData } from '../services/invoiceTemplateService';
import { Receipt, receiptService } from '../services/receiptService';

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

type AppliedFilters = {
  fromDate: string;
  toDate: string;
  searchTerm: string;
  receiptCode: string;
  customerName: string;
  paymentMode: string | null;
  applicationId: string;
  invoiceId: string;
};

const DEFAULT_SORT_BY = 'TransactionDate';
const DEFAULT_SORT_ORDER: 'asc' | 'desc' = 'desc';

export function ReceiptPage() {
  const {
    receipts,
    selectedReceipt,
    selectedInvoice,
    currentPage,
    receiptsPerPage,
    totalReceipts,
    totalPages,
    filters,
    loading,
    error,
    isDataLoaded,
    isCreating,
    totalAmount,
    pendingReceipts,
    createReceipt,
    fetchLastReceiptNumber,
    fetchLastMiscReceiptNumber,
    fetchReceiptsByDateRange,
    searchReceipts,
    fetchInvoiceByCode,
    getReceiptPdfLink,
    getInvoicePdfLink,
    setCurrentPage,
    setSelectedInvoice,
    setFilters,
    clearFilters,
    clearError,
  } = useReceipt();

  const { showSuccess, showError, showInfo } = useToast();
  const { generateMonthlyReceiptsReport, generatingReport: generatingReportPdf } = useReport();

  const defaultDateRange = useMemo(() => getLastSixMonthsRange(), []);

  const defaultFromDate = defaultDateRange.from;
  const defaultToDate = defaultDateRange.to;

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [viewingReceiptCode, setViewingReceiptCode] = useState<string | null>(null);
  const [viewingReport, setViewingReport] = useState<Blob | null>(null);
  const [viewingReportTitle, setViewingReportTitle] = useState<string>('');
  const [isInvoiceViewerOpen, setIsInvoiceViewerOpen] = useState(false);
  const [viewerInvoiceData, setViewerInvoiceData] = useState<InvoiceTemplateData | null>(null);
  const [appliedFilters, setAppliedFilters] = useState<AppliedFilters>({
    fromDate: defaultFromDate,
    toDate: defaultToDate,
    searchTerm: '',
    receiptCode: '',
    customerName: '',
    paymentMode: null,
    applicationId: '',
    invoiceId: '',
  });
  const appliedFiltersRef = useRef<AppliedFilters>({
    fromDate: defaultFromDate,
    toDate: defaultToDate,
    searchTerm: '',
    receiptCode: '',
    customerName: '',
    paymentMode: null,
    applicationId: '',
    invoiceId: '',
  });
  const paginationEffectInitialized = useRef(false);

  const shouldUseSearchApi = useCallback((state: AppliedFilters) => {
    return Boolean(
      state.searchTerm?.trim() ||
      state.receiptCode?.trim() ||
      state.customerName?.trim() ||
      state.invoiceId?.trim()
    );
  }, []);

  const executeReceiptSearch = useCallback(
    ({
      fromDate,
      toDate,
      searchTerm,
      receiptCode,
      customerName,
      paymentMode,
      applicationId,
      invoiceId,
      page,
      limit,
    }: {
      fromDate: string;
      toDate: string;
      searchTerm?: string;
      receiptCode?: string;
      customerName?: string;
      paymentMode?: string | null;
      applicationId?: string;
      invoiceId?: string;
      page?: number;
      limit?: number;
    }) => {
      const filterSnapshot: AppliedFilters = {
        fromDate,
        toDate,
        searchTerm: searchTerm || '',
        receiptCode: receiptCode || '',
        customerName: customerName || '',
        paymentMode: paymentMode || null,
        applicationId: applicationId || '',
        invoiceId: invoiceId || '',
      };

      if (shouldUseSearchApi(filterSnapshot)) {
        searchReceipts({
          receiptCode: receiptCode?.trim() || undefined,
          customerName: customerName?.trim() || undefined,
          invoiceCode: invoiceId?.trim() || undefined,
          query: searchTerm?.trim() || undefined,
          page,
          limit,
          sortBy: DEFAULT_SORT_BY,
          sortOrder: DEFAULT_SORT_ORDER,
        });
      } else {
        fetchReceiptsByDateRange({
          fromDate,
          toDate,
          searchTerm,
          paymentMode,
          applicationId,
          invoiceId,
          page,
          limit,
          sortBy: DEFAULT_SORT_BY,
          sortOrder: DEFAULT_SORT_ORDER,
        });
      }
    },
    [fetchReceiptsByDateRange, searchReceipts, shouldUseSearchApi]
  );

  // Initialize filters and trigger initial fetch
  useEffect(() => {
    const initialFrom = filters.fromDate || defaultFromDate;
    const initialTo = filters.toDate || defaultToDate;

    setFilters({
      fromDate: initialFrom,
      toDate: initialTo,
    });

    const initialApplied: AppliedFilters = {
      fromDate: initialFrom,
      toDate: initialTo,
      searchTerm: filters.searchTerm?.trim() || '',
      receiptCode: filters.receiptCode?.trim() || '',
      customerName: filters.customerName?.trim() || '',
      paymentMode: filters.paymentMode || null,
      applicationId: filters.applicationId?.trim() || '',
      invoiceId: filters.invoiceId?.trim() || '',
    };

    appliedFiltersRef.current = initialApplied;
    setAppliedFilters(initialApplied);

    executeReceiptSearch({
      ...initialApplied,
      page: currentPage,
      limit: receiptsPerPage,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    appliedFiltersRef.current = appliedFilters;
  }, [appliedFilters]);

  useEffect(() => {
    if (!paginationEffectInitialized.current) {
      paginationEffectInitialized.current = true;
      return;
    }

    const currentFilters = appliedFiltersRef.current;
    if (shouldUseSearchApi(currentFilters) || (currentFilters.fromDate && currentFilters.toDate)) {
      executeReceiptSearch({
        ...currentFilters,
        page: currentPage,
        limit: receiptsPerPage,
      });
    }
  }, [currentPage, receiptsPerPage, executeReceiptSearch, shouldUseSearchApi]);

  // Load last receipt numbers on mount
  useEffect(() => {
    fetchLastReceiptNumber();
    fetchLastMiscReceiptNumber();
  }, []);

  // Handle errors
  useEffect(() => {
    if (error) {
      showError('Error', error);
      clearError();
    }
  }, [error, showError, clearError]);

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

  // NOTE: PDF viewing logic has been split into separate handlers:
  // - handleViewReceiptPdf: strictly for receipt PDFs
  // - handleViewInvoicePdf: strictly for invoice PDFs

  const handleCreateReceipt = async (data: any) => {
    try {
      await createReceipt(data).unwrap();
      showSuccess('Success', 'Receipt created successfully');
      setIsCreateModalOpen(false);
      setSelectedInvoice(null);
      executeReceiptSearch({
        ...appliedFiltersRef.current,
        page: currentPage,
        limit: receiptsPerPage,
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

  const handleExport = async () => {
    const fromDate = filters.fromDate || defaultFromDate;
    const toDate = filters.toDate || defaultToDate;
    
    if (!fromDate || !toDate) {
      showError('Error', 'Please select both from and to dates to generate report');
      return;
    }

    try {
      const blob = await generateMonthlyReceiptsReport({ fromDate, toDate });
      setViewingReport(blob);
      setViewingReportTitle(`Monthly Receipts Report (${fromDate} to ${toDate})`);
      showSuccess('Success', 'Monthly receipts report generated');
    } catch (error: any) {
      showError('Error', error?.message || 'Failed to generate report');
    }
  };

  const handleSearch = () => {
    const nextApplied: AppliedFilters = {
      fromDate: filters.fromDate || '',
      toDate: filters.toDate || '',
      searchTerm: filters.searchTerm?.trim() || '',
      receiptCode: filters.receiptCode?.trim() || '',
      customerName: filters.customerName?.trim() || '',
      paymentMode: filters.paymentMode || null,
      applicationId: filters.applicationId?.trim() || '',
      invoiceId: filters.invoiceId?.trim() || '',
    };

    const useSearchEndpoint = shouldUseSearchApi(nextApplied);

    if (!useSearchEndpoint && (!nextApplied.fromDate || !nextApplied.toDate)) {
      showError('Error', 'Please select both from and to dates');
      return;
    }

    appliedFiltersRef.current = nextApplied;
    setAppliedFilters(nextApplied);

    if (currentPage !== 1) {
      setCurrentPage(1);
      return;
    }

    executeReceiptSearch({
      ...nextApplied,
      page: 1,
      limit: receiptsPerPage,
    });
  };

  const handleClearFilterValues = () => {
    const baseFilters: AppliedFilters = {
      fromDate: defaultFromDate,
      toDate: defaultToDate,
      searchTerm: '',
      receiptCode: '',
      customerName: '',
      paymentMode: null,
      applicationId: '',
      invoiceId: '',
    };

    clearFilters();
    setFilters(baseFilters);
    appliedFiltersRef.current = baseFilters;
    setAppliedFilters(baseFilters);
    if (currentPage !== 1) {
      setCurrentPage(1);
    } else {
      executeReceiptSearch({
        ...baseFilters,
        page: 1,
        limit: receiptsPerPage,
      });
    }
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const stats = useMemo(() => {
    return {
      totalReceipts: totalReceipts,
      totalAmount: totalAmount,
      pendingCount: pendingReceipts.length,
      paidCount: Math.max(0, receipts.length - pendingReceipts.length),
    };
  }, [receipts, totalReceipts, totalAmount, pendingReceipts]);

  const renderLoadingState = (message: string) => (
    <div className="p-12 text-center">
      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#8b2828]"></div>
      <p className="mt-4 text-gray-600">{message}</p>
    </div>
  );

  const renderEmptyState = (message: string, action?: React.ReactNode) => (
    <div className="p-12 text-center">
      <ReceiptIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
      <p className="text-gray-600">{message}</p>
      {action}
    </div>
  );

  const handleViewReceiptPdf = async (receipt: Receipt) => {
    if (!receipt.receiptCode) {
      showError('Error', 'Receipt code is required to view receipt PDF');
      return;
    }

    setViewingReceiptCode(receipt.receiptCode);

    try {
      const receiptCode = receipt.receiptCode.trim();
      const applicationCode =
        receipt.applicationCode || (receipt.applicationId ? String(receipt.applicationId) : undefined);

      await getReceiptPdfLink(receiptCode, true, applicationCode);
      showSuccess('Success', 'Receipt PDF opened in new tab');
    } catch (error: any) {
      const errorMessage = error?.message || error?.response?.data?.message || 'Failed to open receipt PDF';
      showError('Error', errorMessage);
    } finally {
      setViewingReceiptCode(null);
    }
  };

  const handleViewInvoicePdf = async (receipt: Receipt) => {
    if (!receipt.invoiceCode || receipt.invoiceCode === '-') {
      showError('Error', 'Invoice code is required to view invoice');
      return;
    }

    const isPending = (receipt.payingAmount || 0) < (receipt.totalAmount || 0);
    if (isPending) {
      showError('Error', 'Invoice view is only available for fully paid receipts');
      return;
    }

    try {
      const invoiceCode = receipt.invoiceCode.trim();

      // Fetch full invoice data so we can render a correct invoice template
      const invoice = await receiptService.getInvoiceByCode(invoiceCode);

      const items =
        (invoice.invoiceDetails || []).map((d) => ({
          description: d.description,
          quantity: d.quantity || 1,
          unitPrice: d.unitPrice || 0,
          amount: d.amount || 0,
        })) || [];

      const tmpl: InvoiceTemplateData = {
        invoiceCode: invoice.invoiceCode || invoiceCode,
        invoiceDate: invoice.invoiceDate || receipt.receiptDate || '',
        customerName: invoice.customerName || receipt.customerName || '',
        customerAddress: (receipt as any).customerAddress || undefined,
        paymentMode: invoice.paymentMode || receipt.paymentMode || '',
        totalAmount:
          invoice.totalAmount ||
          invoice.payingAmount ||
          receipt.totalAmount ||
          receipt.payingAmount ||
          0,
        taxAmount: undefined,
        items: items.length > 0 ? items : undefined,
      };
      setViewerInvoiceData(tmpl);
      setIsInvoiceViewerOpen(true);
    } catch (error: any) {
      const errorMessage = error?.message || error?.response?.data?.message || 'Failed to open invoice view';
      showError('Error', errorMessage);
    }
  };

  const renderReceiptTable = (rows: Receipt[], showPagination: boolean) => (
    <>
      <table className="w-full">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Receipt Code
            </th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Date
            </th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Customer
            </th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Invoice Code
            </th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Total Amount
            </th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Paying Amount
            </th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Payment Mode
            </th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {rows.map((receipt) => {
            const isPending = (receipt.payingAmount || 0) < (receipt.totalAmount || 0);
            return (
              <tr key={receipt.receiptCode} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {receipt.receiptCode}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {formatDate(receipt.receiptDate || receipt.createdAt)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {receipt.customerName}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {receipt.invoiceCode || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                  {formatCurrency(receipt.totalAmount)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                  {formatCurrency(receipt.payingAmount)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {receipt.paymentMode}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      isPending ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
                    }`}
                  >
                    {isPending ? 'Pending' : 'Paid'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleViewReceiptPdf(receipt)}
                      disabled={!receipt.receiptCode || viewingReceiptCode === receipt.receiptCode}
                      className="text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="View Receipt PDF"
                    >
                      {viewingReceiptCode === receipt.receiptCode ? (
                        <>
                          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                          <span>Opening...</span>
                        </>
                      ) : (
                        <>
                          <EyeIcon className="w-4 h-4" />
                          Receipt
                        </>
                      )}
                    </button>
                    {receipt.invoiceCode && receipt.invoiceCode !== '-' && !isPending && (
                      <button
                        onClick={() => handleViewInvoicePdf(receipt)}
                        className="text-green-600 hover:text-green-800 font-medium flex items-center gap-1"
                        title="View Invoice PDF (Paid receipts only)"
                      >
                        <EyeIcon className="w-4 h-4" />
                        Invoice
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {showPagination && totalPages > 1 && (
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Showing {(currentPage - 1) * receiptsPerPage + 1} to{' '}
            {Math.min(currentPage * receiptsPerPage, totalReceipts)} of {totalReceipts} receipts
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Previous
            </button>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </>
  );

  const renderEmptyStateAction =
    !filters.searchTerm &&
    !filters.receiptCode &&
    !filters.customerName &&
    !filters.applicationId &&
    !filters.invoiceId &&
    !filters.paymentMode
      ? undefined
      : (
    <button
      onClick={handleClearFilterValues}
      className="mt-2 text-blue-600 hover:text-blue-800 text-sm"
    >
      Reset filters
    </button>
      );

  return (
    <Layout title="Invoice & Receipt Management">
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Invoice & Receipt Management</h1>
            <p className="text-gray-600 text-lg">
              View, create, and manage financial receipts
            </p>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                  <ReceiptIcon className="w-6 h-6 text-white" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-1">
                {stats.totalReceipts}
              </h3>
              <p className="text-sm text-gray-600">Total Receipts</p>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                  <TrendingUpIcon className="w-6 h-6 text-white" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-1">
                {formatCurrency(stats.totalAmount)}
              </h3>
              <p className="text-sm text-gray-600">Total Amount</p>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
                  <FileTextIcon className="w-6 h-6 text-white" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-1">
                {stats.pendingCount}
              </h3>
              <p className="text-sm text-gray-600">Pending Receipts</p>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <ReceiptIcon className="w-6 h-6 text-white" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-1">
                {stats.paidCount}
              </h3>
              <p className="text-sm text-gray-600">Paid Receipts</p>
            </div>
          </div>

          {/* Main Content */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            {/* Toolbar */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Recent Invoices & Receipts</h2>
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#8b2828] to-[#7d1f1f] text-white rounded-xl hover:shadow-lg transition-all duration-200"
                >
                  <PlusIcon className="w-4 h-4" />
                  New Receipt
                </button>
              </div>

              {/* Search and Filters */}
              <div className="flex flex-col gap-4">
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_160px_160px] items-end">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Search receipts
                    </label>
                    <div className="relative mt-1">
                      <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search by receipt code, customer name, or invoice"
                        value={filters.searchTerm}
                        onChange={(e) => setFilters({ searchTerm: e.target.value })}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        className="w-full pl-10 pr-4 py-2 h-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      From date
                    </label>
                    <div className="relative mt-1">
                      <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                      <input
                        type="date"
                        value={filters.fromDate || ''}
                        onChange={(e) => setFilters({ fromDate: e.target.value })}
                        className="w-full h-12 pl-10 pr-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div> 
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      To date
                    </label>
                    <div className="relative mt-1">
                      <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                      <input
                        type="date"
                        value={filters.toDate || ''}
                        onChange={(e) => setFilters({ toDate: e.target.value })}
                        className="w-full h-12 pl-10 pr-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setIsFilterOpen(!isFilterOpen)}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    <FilterIcon className="w-4 h-4" />
                    Filter
                  </button>
                  <button
                    onClick={handleSearch}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                  >
                    Search Receipts
                  </button>
                  <button
                    onClick={handleExport}
                    disabled={generatingReportPdf || !filters.fromDate || !filters.toDate}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <DownloadIcon className="w-4 h-4" />
                    {generatingReportPdf ? 'Generating...' : 'Generate Report'}
                  </button>
                </div>
              </div>

            

              {/* Advanced Filters */}
              {isFilterOpen && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Payment Mode
                      </label>
                      <select
                        value={filters.paymentMode || ''}
                        onChange={(e) =>
                          setFilters({ paymentMode: e.target.value || null })
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">All</option>
                        <option value="Cash">Cash</option>
                        <option value="Cheque">Cheque</option>
                        <option value="Bank Transfer">Bank Transfer</option>
                        <option value="Credit Card">Credit Card</option>
                        <option value="Online Payment">Online Payment</option>
                      </select>
                    </div>
                    <div className="flex items-end">
                      <button
                        onClick={handleClearFilterValues}
                        className="px-4 py-2 text-gray-600 hover:text-gray-800"
                      >
                        Clear Filters
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="overflow-x-auto">
              {loading && !isDataLoaded ? (
                renderLoadingState('Loading receipts...')
              ) : receipts.length === 0 ? (
                renderEmptyState(
                  'No receipts found for the selected criteria',
                  renderEmptyStateAction
                )
              ) : (
                renderReceiptTable(receipts, true)
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
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
      <ReportViewerModal
        isOpen={viewingReport !== null}
        onClose={() => {
          setViewingReport(null);
          setViewingReportTitle('');
        }}
        pdfBlob={viewingReport}
        title={viewingReportTitle}
        loading={generatingReportPdf}
      />
      <InvoiceViewerModal
        isOpen={isInvoiceViewerOpen}
        onClose={() => setIsInvoiceViewerOpen(false)}
        invoiceData={viewerInvoiceData}
      />
    </Layout>
  );
}
