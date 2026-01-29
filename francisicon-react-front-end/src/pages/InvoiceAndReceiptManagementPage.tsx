import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import {
  ReceiptIcon,
  SearchIcon,
  FilterIcon,
  PlusIcon,
  CalendarIcon,
  FileTextIcon,
  TrendingUpIcon,
  FileCheckIcon,
} from 'lucide-react';
import { useReceipt } from '../hooks/useReceipt';
import { useInvoice } from '../hooks/useInvoice';
import { useToast } from '../contexts/ToastContext';
import { ReceiptDetailModal } from '../components/ReceiptDetailModal';
import { CreateReceiptModal } from '../components/CreateReceiptModal';
import { InvoiceViewerModal } from '../components/InvoiceViewerModal';
import { InvoiceTemplateData } from '../services/invoiceTemplateService';
import { Receipt, receiptService } from '../services/receiptService';
import { InvoiceListItem } from '../services/invoiceService';

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
};

const DEFAULT_SORT_BY = 'TransactionDate';
const DEFAULT_SORT_ORDER: 'asc' | 'desc' = 'desc';

export function InvoiceAndReceiptManagementPage() {
  const navigate = useNavigate();
  const { showSuccess, showError, showInfo } = useToast();
  
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
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  // const [viewingReceiptCode, setViewingReceiptCode] = useState<string | null>(null);
  const [isInvoiceViewerOpen, setIsInvoiceViewerOpen] = useState(false);
  const [viewerInvoiceData, setViewerInvoiceData] = useState<InvoiceTemplateData | null>(null);
  const [appliedFilters, setAppliedFilters] = useState<AppliedFilters>({
    fromDate: defaultFromDate,
    toDate: defaultToDate,
    searchTerm: '',
    paymentMode: null,
  });

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
        });
      } else if (searchParams.fromDate && searchParams.toDate) {
        await fetchReceiptsByDateRange({
          fromDate: searchParams.fromDate,
          toDate: searchParams.toDate,
          page: searchParams.page || receiptCurrentPage,
          limit: searchParams.limit || receiptsPerPage,
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
      executeReceiptSearch({
        ...appliedFiltersRef.current,
        page: receiptCurrentPage,
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

  const handleSearch = () => {
    const nextApplied: AppliedFilters = {
      fromDate: appliedFilters.fromDate || '',
      toDate: appliedFilters.toDate || '',
      searchTerm: appliedFilters.searchTerm?.trim() || '',
      paymentMode: appliedFilters.paymentMode || null,
    };

    if (activeTab === 'invoice') {
      if (!nextApplied.fromDate || !nextApplied.toDate) {
        showError('Error', 'Please select both from and to dates');
        return;
      }
      appliedFiltersRef.current = nextApplied;
      setAppliedFilters(nextApplied);
      executeInvoiceSearch({
        ...nextApplied,
        page: 1,
        limit: 20,
      });
    } else {
      const useSearchEndpoint = shouldUseSearchApi(nextApplied);
      if (!useSearchEndpoint && (!nextApplied.fromDate || !nextApplied.toDate)) {
        showError('Error', 'Please select both from and to dates');
        return;
      }
      appliedFiltersRef.current = nextApplied;
      setAppliedFilters(nextApplied);
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

  const handleClearFilterValues = () => {
    const baseFilters: AppliedFilters = {
      fromDate: defaultFromDate,
      toDate: defaultToDate,
      searchTerm: '',
      paymentMode: null,
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
    // Navigate to Invoice-Receipt page
    navigate('/invoice-receipt');
  };

  const handleNewInvoice = () => {
    // Navigate to Invoice-Receipt page for creating new invoice
    navigate('/invoice-receipt');
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
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Receipt No
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Payer
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Amount
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Mode of Payment
              </th>
                {showActions && (
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {receipts.map((receipt) => (
              <tr key={receipt.receiptId || receipt.receiptCode} className="hover:bg-gray-50">
                <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {receipt.receiptCode || 'N/A'}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">
                  {formatDate(receipt.receiptDate || receipt.createdAt)}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">
                  {receipt.customerName || 'N/A'}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                  {formatCurrency(receipt.totalAmount || receipt.payingAmount || 0)}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">
                  {receipt.paymentMode || 'N/A'}
                </td>
                {showActions && (
                  <td className="px-4 py-4 whitespace-nowrap text-center text-sm font-medium">
                    <button
                      onClick={() => {
                        setSelectedReceipt(receipt);
                        setIsDetailModalOpen(true);
                      }}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      View
                    </button>
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
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Invoice No
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Customer
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Amount
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              {showActions && (
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {invoices.map((invoice) => (
              <tr key={invoice.invoiceId} className="hover:bg-gray-50">
                <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {invoice.invoiceCode || 'N/A'}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">
                  {formatDate(invoice.transactionDate || invoice.invoiceDate)}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">
                  {invoice.customerName || 'N/A'}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                  {formatCurrency(invoice.totalAmount || invoice.payingAmount || 0)}
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    invoice.status === 'Active' || invoice.status === '1' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {invoice.status || 'Active'}
                  </span>
                </td>
                {showActions && (
                  <td className="px-4 py-4 whitespace-nowrap text-center text-sm font-medium">
                    <button
                      onClick={async () => {
                        if (!invoice.invoiceCode) {
                          showError('Error', 'Invoice code is required to view invoice');
                          return;
                        }

                        try {
                          const invoiceCode = invoice.invoiceCode.trim();

                          // Try to fetch matching receipt for richer context (date, maybe address)
                          let relatedReceipt: Receipt | null = null;
                          try {
                            relatedReceipt = await receiptService.getReceiptByCode(invoiceCode);
                          } catch {
                            relatedReceipt = null;
                          }

                          const templateData: InvoiceTemplateData = {
                            invoiceCode,
                            invoiceDate:
                              invoice.invoiceDate ||
                              invoice.transactionDate ||
                              relatedReceipt?.receiptDate ||
                              '',
                            customerName: invoice.customerName || relatedReceipt?.customerName || 'N/A',
                            customerAddress: (relatedReceipt as any)?.customerAddress || undefined,
                            paymentMode: invoice.paymentMode || relatedReceipt?.paymentMode || '',
                            totalAmount:
                              invoice.totalAmount ||
                              invoice.payingAmount ||
                              relatedReceipt?.totalAmount ||
                              relatedReceipt?.payingAmount ||
                              0,
                            taxAmount: undefined,
                            items: undefined,
                          };

                          setViewerInvoiceData(templateData);
                          setIsInvoiceViewerOpen(true);
                        } catch (error: any) {
                          showError('Error', error?.message || 'Failed to open invoice viewer');
                        }
                      }}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      View
                    </button>
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
    <Layout title="Invoice & Receipt Management">
      <div className="p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6 md:mb-8">
            <h1 className="text-2xl md:text-4xl font-bold text-gray-900 mb-2">Invoice & Receipt Management</h1>
            <p className="text-gray-600 text-sm md:text-lg">
              View, create, and manage invoices and receipts
            </p>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
            <div className="bg-white rounded-xl md:rounded-2xl p-4 md:p-6 shadow-lg border border-gray-100">
              <div className="flex items-center justify-between mb-2 md:mb-4">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                  <ReceiptIcon className="w-5 h-5 md:w-6 md:h-6 text-white" />
                </div>
              </div>
              <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-1">
                {stats.total}
              </h3>
              <p className="text-xs md:text-sm text-gray-600">Total {activeTab === 'invoice' ? 'Invoices' : 'Receipts'}</p>
            </div>
            <div className="bg-white rounded-xl md:rounded-2xl p-4 md:p-6 shadow-lg border border-gray-100">
              <div className="flex items-center justify-between mb-2 md:mb-4">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                  <TrendingUpIcon className="w-5 h-5 md:w-6 md:h-6 text-white" />
                </div>
              </div>
              <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-1">
                {formatCurrency(stats.totalAmount)}
              </h3>
              <p className="text-xs md:text-sm text-gray-600">Total Amount</p>
            </div>
            {activeTab === 'receipt' && (
              <>
                <div className="bg-white rounded-xl md:rounded-2xl p-4 md:p-6 shadow-lg border border-gray-100">
                  <div className="flex items-center justify-between mb-2 md:mb-4">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
                      <FileTextIcon className="w-5 h-5 md:w-6 md:h-6 text-white" />
                    </div>
                  </div>
                  <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-1">
                    {stats.pendingCount}
                  </h3>
                  <p className="text-xs md:text-sm text-gray-600">Pending Receipts</p>
                </div>
                <div className="bg-white rounded-xl md:rounded-2xl p-4 md:p-6 shadow-lg border border-gray-100">
                  <div className="flex items-center justify-between mb-2 md:mb-4">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                      <ReceiptIcon className="w-5 h-5 md:w-6 md:h-6 text-white" />
                    </div>
                  </div>
                  <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-1">
                    {stats.paidCount}
                  </h3>
                  <p className="text-xs md:text-sm text-gray-600">Paid Receipts</p>
                </div>
              </>
            )}
          </div>

          {/* Main Content */}
          <div className="bg-white rounded-xl md:rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            {/* Toolbar with Tabs */}
            <div className="p-4 md:p-6 border-b border-gray-200">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                {/* Tabs */}
                <div className="flex border-b border-gray-200 -mb-6 md:mb-0">
                  <button
                    onClick={() => setActiveTab('invoice')}
                    className={`px-4 py-2 text-sm md:text-base font-medium border-b-2 transition-colors ${
                      activeTab === 'invoice'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <FileCheckIcon className="w-4 h-4 md:w-5 md:h-5" />
                      Invoice
                    </div>
                  </button>
                  <button
                    onClick={() => setActiveTab('receipt')}
                    className={`px-4 py-2 text-sm md:text-base font-medium border-b-2 transition-colors ${
                      activeTab === 'receipt'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <ReceiptIcon className="w-4 h-4 md:w-5 md:h-5" />
                      Receipt
                    </div>
                  </button>
                </div>
                
                {/* Action Buttons - Show based on active tab */}
                {activeTab === 'invoice' && (
                  <button
                    onClick={handleNewInvoice}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#8b2828] to-[#7d1f1f] text-white rounded-xl hover:shadow-lg transition-all duration-200 text-sm md:text-base"
                  >
                    <PlusIcon className="w-4 h-4" />
                    Create Invoice
                  </button>
                )}
                {activeTab === 'receipt' && (
                  <button
                    onClick={handleNewReceipt}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#8b2828] to-[#7d1f1f] text-white rounded-xl hover:shadow-lg transition-all duration-200 text-sm md:text-base"
                  >
                    <PlusIcon className="w-4 h-4" />
                    New Receipt
                  </button>
                )}
              </div>

              {/* Search and Filters */}
              <div className="flex flex-col gap-4">
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_160px_160px] items-end">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Search {activeTab === 'invoice' ? 'invoices' : 'receipts'}
                    </label>
                    <div className="relative mt-1">
                      <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        placeholder={`Search by ${activeTab === 'invoice' ? 'invoice code, customer name' : 'receipt code, customer name, or invoice'}`}
                        value={appliedFilters.searchTerm}
                        onChange={(e) => setAppliedFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        className="w-full pl-10 pr-4 py-2 h-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm md:text-base"
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
                        value={appliedFilters.fromDate || ''}
                        onChange={(e) => setAppliedFilters(prev => ({ ...prev, fromDate: e.target.value }))}
                        className="w-full h-12 pl-10 pr-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm md:text-base"
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
                        value={appliedFilters.toDate || ''}
                        onChange={(e) => setAppliedFilters(prev => ({ ...prev, toDate: e.target.value }))}
                        className="w-full h-12 pl-10 pr-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm md:text-base"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setIsFilterOpen(!isFilterOpen)}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm md:text-base"
                  >
                    <FilterIcon className="w-4 h-4" />
                    Filter
                  </button>
                  <button
                    onClick={handleSearch}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm md:text-base"
                  >
                    Search {activeTab === 'invoice' ? 'Invoices' : 'Receipts'}
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
                        value={appliedFilters.paymentMode || ''}
                        onChange={(e) =>
                          setAppliedFilters(prev => ({ ...prev, paymentMode: e.target.value || null }))
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm md:text-base"
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
                        className="px-4 py-2 text-gray-600 hover:text-gray-800 text-sm md:text-base"
                      >
                        Clear Filters
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Table Content */}
            <div className="overflow-x-auto">
              {currentLoading && !currentDataLoaded ? (
                renderLoadingState(`Loading ${activeTab === 'invoice' ? 'invoices' : 'receipts'}...`)
              ) : currentData.length === 0 ? (
                renderEmptyState(
                  `No ${activeTab === 'invoice' ? 'invoices' : 'receipts'} found for the selected criteria`
                )
              ) : activeTab === 'invoice' ? (
                renderInvoiceTable(invoices, true)
              ) : (
                renderReceiptTable(receipts, true)
              )}
            </div>

            {/* Pagination */}
            {currentPagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 md:px-6 py-4 border-t border-gray-200 bg-gray-50">
                <div className="flex flex-col gap-1">
                  <span className="text-xs md:text-sm font-medium text-gray-700">
                    Page {currentPagination.page} of {currentPagination.totalPages}
                  </span>
                  <span className="text-xs text-gray-500">
                    Showing {((currentPagination.page - 1) * currentPagination.limit) + 1} - {Math.min(currentPagination.page * currentPagination.limit, currentPagination.total)} of {currentPagination.total} results
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handlePageChange(currentPagination.page - 1)}
                    disabled={currentPagination.page === 1 || currentLoading}
                    className="px-3 md:px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm md:text-base"
                  >
                    ← Previous
                  </button>
                  <button
                    onClick={() => handlePageChange(currentPagination.page + 1)}
                    disabled={currentPagination.page >= currentPagination.totalPages || currentLoading}
                    className="px-3 md:px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm md:text-base"
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
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
      <InvoiceViewerModal
        isOpen={isInvoiceViewerOpen}
        onClose={() => setIsInvoiceViewerOpen(false)}
        invoiceData={viewerInvoiceData}
      />
    </Layout>
  );
}


