import React, { useState, useMemo, useCallback, useEffect, memo } from 'react';
import {
  XIcon,
  FileSpreadsheetIcon,
  FileTextIcon,
  TrendingUpIcon,
  DollarSignIcon,
  UsersIcon,
  Maximize2Icon,
  Minimize2Icon,
  ChevronLeftIcon,
  ChevronRightIcon,
  LoaderIcon,
  CalendarIcon,
} from 'lucide-react';

interface Transaction {
  TransactionDate: string;
  Code: string;
  CustomerName: string;
  TotalAmount: number;
  PaymentModeDocNo: string;
  PaymentMode: string;
  RefDocNumber: string;
  RefDocName: string;
  Item: string;
  Total: number;
  Status: string;
}

interface ReportData {
  success: boolean;
  period: {
    from: string;
    to: string;
  };
  meta: {
    totalRecords: number;
    generatedAt: string;
    cached: boolean;
  };
  summary: {
    totalAmount: number;
    totalRecords: number;
    averageAmount: number;
    paymentBreakdown: Record<string, number>;
    chapelBreakdown: Record<string, number>;
    dailyTrend: Array<{
      date: string;
      amount: number;
      count: number;
    }>;
    uniqueCustomers: number;
  };
  data: Transaction[];
}

interface MonthlyReceiptsReportViewerProps {
  isOpen: boolean;
  onClose: () => void;
  reportData: ReportData | null;
  title?: string;
}

// Memoized table row component for performance
const TransactionRow = memo(({ transaction, formatDate, formatCurrency }: {
  transaction: Transaction;
  formatDate: (date: string) => string;
  formatCurrency: (amount: number) => string;
}) => (
  <tr className="hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-indigo-50/30 transition-all duration-200 border-b border-gray-100 last:border-b-0">
    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">
      {formatDate(transaction.TransactionDate)}
    </td>
    <td className="px-4 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
      {transaction.Code}
    </td>
    <td className="px-4 py-4 text-sm text-gray-900 font-medium">{transaction.CustomerName}</td>
    <td className="px-4 py-4 text-sm text-gray-600">{transaction.Item}</td>
    <td className="px-4 py-4 whitespace-nowrap">
      <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-gray-100 text-gray-700">
        {transaction.PaymentMode}
      </span>
    </td>
    <td className="px-4 py-4 whitespace-nowrap text-sm font-bold text-right text-[#8b2828]">
      {formatCurrency(transaction.TotalAmount)}
    </td>
  </tr>
));

TransactionRow.displayName = 'TransactionRow';

export function MonthlyReceiptsReportViewer({
  isOpen,
  onClose,
  reportData,
  title = 'Monthly Receipts Report',
}: MonthlyReceiptsReportViewerProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [sortConfig, setSortConfig] = useState<{ key: keyof Transaction; direction: 'asc' | 'desc' } | null>(null);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  
  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1); // Reset to first page when search changes
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [paymentFilter, sortConfig]);

  // Memoized format functions
  const formatCurrency = useCallback((amount: number) => {
    return new Intl.NumberFormat('en-SG', {
      style: 'currency',
      currency: 'SGD',
      minimumFractionDigits: 2,
    }).format(amount);
  }, []);

  const formatDate = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-SG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }, []);

  // Filter and sort transactions - optimized with debounced search
  const filteredAndSortedTransactions = useMemo(() => {
    if (!reportData?.data) return [];

    const searchLower = debouncedSearchTerm.toLowerCase();
    const hasSearch = searchLower.length > 0;

    let filtered = reportData.data.filter((transaction) => {
      if (hasSearch) {
        const matchesSearch =
          transaction.CustomerName.toLowerCase().includes(searchLower) ||
          transaction.Code.toLowerCase().includes(searchLower) ||
          transaction.Item.toLowerCase().includes(searchLower) ||
          transaction.PaymentMode.toLowerCase().includes(searchLower);
        
        if (!matchesSearch) return false;
      }

      return paymentFilter === 'all' || transaction.PaymentMode === paymentFilter;
    });

    // Sort with optimized comparison
    if (sortConfig) {
      filtered.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];

        // Handle null/undefined values
        if (aValue == null && bValue == null) return 0;
        if (aValue == null) return sortConfig.direction === 'asc' ? 1 : -1;
        if (bValue == null) return sortConfig.direction === 'asc' ? -1 : 1;

        // Numeric comparison for numbers
        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
        }

        // String comparison
        const aStr = String(aValue).toLowerCase();
        const bStr = String(bValue).toLowerCase();
        if (aStr < bStr) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aStr > bStr) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [reportData, debouncedSearchTerm, paymentFilter, sortConfig]);

  // Memoized pagination calculations
  const totalPages = useMemo(() => {
    return Math.ceil(filteredAndSortedTransactions.length / itemsPerPage);
  }, [filteredAndSortedTransactions.length, itemsPerPage]);

  const paginatedTransactions = useMemo(() => {
    return filteredAndSortedTransactions.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    );
  }, [filteredAndSortedTransactions, currentPage, itemsPerPage]);

  const handleSort = useCallback((key: keyof Transaction) => {
    setSortConfig((prev) => {
      if (prev?.key === key && prev.direction === 'asc') {
        return { key, direction: 'desc' };
      }
      return { key, direction: 'asc' };
    });
  }, []);

  const exportToExcel = useCallback(async () => {
    if (!reportData || exportingExcel) return;

    setExportingExcel(true);
    try {
      const XLSX = await import('xlsx');
      // Create workbook
      const wb = XLSX.utils.book_new();

      // Summary sheet
      const summaryData = [
        ['Monthly Receipts Report'],
        ['Period', `${reportData.period.from} to ${reportData.period.to}`],
        ['Generated At', new Date(reportData.meta.generatedAt).toLocaleString()],
        [],
        ['Summary'],
        ['Total Amount', reportData.summary.totalAmount],
        ['Total Records', reportData.summary.totalRecords],
        ['Average Amount', reportData.summary.averageAmount],
        ['Unique Customers', reportData.summary.uniqueCustomers],
        [],
        ['Payment Breakdown'],
        ...Object.entries(reportData.summary.paymentBreakdown).map(([key, value]) => [key, value]),
        [],
        ['Chapel Breakdown'],
        ...Object.entries(reportData.summary.chapelBreakdown).map(([key, value]) => [key, value]),
      ];

      const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');

      // Transactions sheet
      const transactionsData = [
        [
          'Transaction Date',
          'Code',
          'Customer Name',
          'Total Amount',
          'Payment Mode',
          'Payment Doc No',
          'Ref Doc Number',
          'Ref Doc Name',
          'Item',
          'Total',
        ],
        ...reportData.data.map((t) => [
          formatDate(t.TransactionDate),
          t.Code,
          t.CustomerName,
          t.TotalAmount,
          t.PaymentMode,
          t.PaymentModeDocNo,
          t.RefDocNumber,
          t.RefDocName,
          t.Item,
          t.Total,
        ]),
      ];

      const transactionsWs = XLSX.utils.aoa_to_sheet(transactionsData);
      XLSX.utils.book_append_sheet(wb, transactionsWs, 'Transactions');

      // Daily Trend sheet
      const trendData = [
        ['Date', 'Amount', 'Count'],
        ...reportData.summary.dailyTrend.map((t) => [t.date, t.amount, t.count]),
      ];

      const trendWs = XLSX.utils.aoa_to_sheet(trendData);
      XLSX.utils.book_append_sheet(wb, trendWs, 'Daily Trend');

      // Generate filename
      const filename = `Monthly_Receipts_${reportData.period.from.replace(/\s+/g, '_')}_to_${reportData.period.to.replace(/\s+/g, '_')}.xlsx`;

      // Save file
      XLSX.writeFile(wb, filename);
    } catch (error) {
      console.error('Failed to export Excel:', error);
      alert('Failed to export to Excel. Please try again.');
    } finally {
      setExportingExcel(false);
    }
  }, [reportData, exportingExcel, formatDate]);

  const exportToPdf = useCallback(async () => {
    if (!reportData || exportingPdf) return;

    const element = document.getElementById('report-content');
    if (!element) return;

    setExportingPdf(true);
    try {
      const html2pdf = (await import('html2pdf.js')).default;

      const opt = {
        margin: 0.5,
        filename: `Monthly_Receipts_${reportData.period.from.replace(/\s+/g, '_')}_to_${reportData.period.to.replace(/\s+/g, '_')}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'in', format: 'a4', orientation: 'landscape' },
      };

      await html2pdf().set(opt).from(element).save();
    } catch (error) {
      console.error('Failed to export PDF:', error);
      alert('Failed to export PDF. Please try again.');
    } finally {
      setExportingPdf(false);
    }
  }, [reportData, exportingPdf]);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => !prev);
  }, []);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setCurrentPage(1);
      setSearchTerm('');
      setDebouncedSearchTerm('');
      setPaymentFilter('all');
      setSortConfig(null);
      setIsFullscreen(false);
      setExportingExcel(false);
      setExportingPdf(false);
    }
  }, [isOpen]);

  // Memoized daily trend chart data
  const dailyTrendChartData = useMemo(() => {
    if (!reportData?.summary.dailyTrend) return [];
    
    const maxAmount = Math.max(...reportData.summary.dailyTrend.map((d) => d.amount));
    // Limit display to 50 most recent days for performance
    const displayTrend = reportData.summary.dailyTrend.slice(-50);
    
    return displayTrend.map((day) => ({
      ...day,
      height: maxAmount > 0 ? (day.amount / maxAmount) * 100 : 0,
    }));
  }, [reportData?.summary.dailyTrend]);

  if (!isOpen || !reportData) return null;

  const paymentModes = Object.keys(reportData.summary.paymentBreakdown);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden animate-in fade-in duration-300">
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-300" 
        onClick={onClose} 
      />
      <div
        className={`fixed inset-0 flex items-center justify-center p-4 transition-all duration-300 ${
          isFullscreen ? 'p-0' : ''
        }`}
      >
        <div
          className={`relative bg-gradient-to-br from-white via-gray-50/50 to-white rounded-2xl shadow-2xl flex flex-col transition-all duration-300 animate-in zoom-in-95 duration-300 ${
            isFullscreen ? 'w-full h-full rounded-none' : 'w-full max-w-[95vw] h-[90vh]'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 bg-gradient-to-r from-[#8b2828] via-[#7d1f1f] to-[#8b2828] px-6 py-5 rounded-t-2xl flex items-center justify-between z-10 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center">
                <TrendingUpIcon className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight">{title}</h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={toggleFullscreen}
                className="text-white/90 hover:text-white hover:bg-white/20 rounded-xl p-2.5 transition-all duration-200 hover:scale-110 active:scale-95"
                title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
              >
                {isFullscreen ? (
                  <Minimize2Icon className="w-5 h-5" />
                ) : (
                  <Maximize2Icon className="w-5 h-5" />
                )}
              </button>
              <button
                onClick={exportToExcel}
                disabled={exportingExcel}
                className="text-white/90 hover:text-white hover:bg-white/20 rounded-xl p-2.5 transition-all duration-200 hover:scale-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                title={exportingExcel ? 'Exporting...' : 'Export to Excel'}
              >
                {exportingExcel ? (
                  <LoaderIcon className="w-5 h-5 animate-spin" />
                ) : (
                  <FileSpreadsheetIcon className="w-5 h-5" />
                )}
              </button>
              <button
                onClick={exportToPdf}
                disabled={exportingPdf}
                className="text-white/90 hover:text-white hover:bg-white/20 rounded-xl p-2.5 transition-all duration-200 hover:scale-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                title={exportingPdf ? 'Exporting...' : 'Export to PDF'}
              >
                {exportingPdf ? (
                  <LoaderIcon className="w-5 h-5 animate-spin" />
                ) : (
                  <FileTextIcon className="w-5 h-5" />
                )}
              </button>
              <button
                onClick={onClose}
                className="text-white/90 hover:text-white hover:bg-red-500/30 rounded-xl p-2.5 transition-all duration-200 hover:scale-110 active:scale-95"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto bg-gradient-to-br from-gray-50 via-white to-gray-50/50">
            <div id="report-content" className="p-6 space-y-6">
              {/* Report Header */}
              <div className="mb-8 p-6 bg-gradient-to-r from-blue-50/50 via-indigo-50/30 to-purple-50/50 rounded-2xl border border-blue-100/50 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2 tracking-tight">
                      Period: {reportData.period.from} to {reportData.period.to}
                    </h3>
                    <p className="text-gray-600 flex items-center gap-2">
                      <CalendarIcon className="w-4 h-4" />
                      Generated on {new Date(reportData.meta.generatedAt).toLocaleString()}
                      {reportData.meta.cached && (
                        <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-orange-100 text-orange-700 rounded-full">
                          Cached
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
                <div className="group bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-2xl shadow-lg p-6 border border-blue-200/50 hover:shadow-xl hover:scale-[1.02] transition-all duration-300 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-400/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
                  <div className="relative flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-700/80 mb-2">Total Amount</p>
                      <p className="text-2xl font-bold text-gray-900 tracking-tight">{formatCurrency(reportData.summary.totalAmount)}</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                      <DollarSignIcon className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                </div>

                <div className="group bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-2xl shadow-lg p-6 border border-emerald-200/50 hover:shadow-xl hover:scale-[1.02] transition-all duration-300 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-400/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
                  <div className="relative flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-emerald-700/80 mb-2">Total Records</p>
                      <p className="text-2xl font-bold text-gray-900 tracking-tight">{reportData.summary.totalRecords}</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
                      <FileTextIcon className="w-6 h-6 text-emerald-600" />
                    </div>
                  </div>
                </div>

                <div className="group bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-2xl shadow-lg p-6 border border-purple-200/50 hover:shadow-xl hover:scale-[1.02] transition-all duration-300 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-purple-400/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
                  <div className="relative flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-purple-700/80 mb-2">Average Amount</p>
                      <p className="text-2xl font-bold text-gray-900 tracking-tight">{formatCurrency(reportData.summary.averageAmount)}</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center group-hover:bg-purple-500/20 transition-colors">
                      <TrendingUpIcon className="w-6 h-6 text-purple-600" />
                    </div>
                  </div>
                </div>

                <div className="group bg-gradient-to-br from-orange-50 to-orange-100/50 rounded-2xl shadow-lg p-6 border border-orange-200/50 hover:shadow-xl hover:scale-[1.02] transition-all duration-300 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-orange-400/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
                  <div className="relative flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-orange-700/80 mb-2">Unique Customers</p>
                      <p className="text-2xl font-bold text-gray-900 tracking-tight">{reportData.summary.uniqueCustomers}</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center group-hover:bg-orange-500/20 transition-colors">
                      <UsersIcon className="w-6 h-6 text-orange-600" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment and Chapel Breakdown */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Payment Breakdown */}
                <div className="bg-white rounded-2xl shadow-lg border border-gray-200/60 p-6 hover:shadow-xl transition-shadow duration-300">
                  <h4 className="text-lg font-semibold text-gray-900 mb-5 tracking-tight flex items-center gap-2">
                    <div className="w-1 h-5 bg-gradient-to-b from-blue-500 to-blue-600 rounded-full"></div>
                    Payment Breakdown
                  </h4>
                  <div className="space-y-3">
                    {Object.entries(reportData.summary.paymentBreakdown).map(([mode, amount]) => {
                      const percentage = (amount / reportData.summary.totalAmount) * 100;
                      return (
                        <div key={mode}>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-sm font-medium text-gray-700">{mode}</span>
                            <span className="text-sm font-bold text-gray-900">
                              {formatCurrency(amount)} ({percentage.toFixed(1)}%)
                            </span>
                          </div>
                          <div className="w-full bg-gray-200/60 rounded-full h-2.5 overflow-hidden">
                            <div
                              className="bg-gradient-to-r from-[#8b2828] via-[#7d1f1f] to-[#8b2828] h-2.5 rounded-full transition-all duration-500 shadow-sm"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Chapel Breakdown */}
                <div className="bg-white rounded-2xl shadow-lg border border-gray-200/60 p-6 hover:shadow-xl transition-shadow duration-300">
                  <h4 className="text-lg font-semibold text-gray-900 mb-5 tracking-tight flex items-center gap-2">
                    <div className="w-1 h-5 bg-gradient-to-b from-purple-500 to-purple-600 rounded-full"></div>
                    Chapel Breakdown
                  </h4>
                  <div className="space-y-3">
                    {Object.entries(reportData.summary.chapelBreakdown).map(([chapel, amount]) => {
                      const percentage = (amount / reportData.summary.totalAmount) * 100;
                      return (
                        <div key={chapel}>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-sm font-medium text-gray-700">{chapel}</span>
                            <span className="text-sm font-bold text-gray-900">
                              {formatCurrency(amount)} ({percentage.toFixed(1)}%)
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Daily Trend Chart */}
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200/60 p-6 mb-6 hover:shadow-xl transition-shadow duration-300">
                <h4 className="text-lg font-semibold text-gray-900 mb-5 tracking-tight flex items-center gap-2">
                  <div className="w-1 h-5 bg-gradient-to-b from-indigo-500 to-indigo-600 rounded-full"></div>
                  Daily Trend
                </h4>
                <div className="h-64 overflow-x-auto">
                  <div className="flex items-end justify-between h-full gap-2 min-w-max">
                    {dailyTrendChartData.map((day, index) => (
                      <div key={`${day.date}-${index}`} className="flex flex-col items-center gap-2 flex-1">
                        <div className="relative w-full flex items-end justify-center h-48">
                          <div
                            className="w-full bg-gradient-to-t from-[#8b2828] via-[#7d1f1f] to-[#8b2828] rounded-t-lg transition-all duration-300 hover:opacity-90 hover:shadow-md cursor-pointer group relative"
                            style={{ height: `${Math.max(day.height, 5)}%` }}
                            title={`${day.date}: ${formatCurrency(day.amount)} (${day.count} transactions)`}
                          >
                            <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap pointer-events-none">
                              {formatCurrency(day.amount)}
                            </div>
                          </div>
                        </div>
                        <div className="text-xs text-gray-600 text-center transform -rotate-45 origin-center whitespace-nowrap">
                          {new Date(day.date).toLocaleDateString('en-SG', { month: 'short', day: 'numeric' })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Filters and Search */}
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200/60 p-5 mb-4">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder="Search by customer, code, item, or payment mode..."
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                      }}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8b2828]/20 focus:border-[#8b2828] transition-all duration-200 hover:border-gray-400 bg-gray-50/50 focus:bg-white"
                    />
                  </div>
                  <div className="flex gap-2">
                    <select
                      value={paymentFilter}
                      onChange={(e) => {
                        setPaymentFilter(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8b2828]/20 focus:border-[#8b2828] transition-all duration-200 hover:border-gray-400 bg-gray-50/50 focus:bg-white"
                    >
                      <option value="all">All Payment Modes</option>
                      {paymentModes.map((mode) => (
                        <option key={mode} value={mode}>
                          {mode}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="mt-3 text-sm text-gray-600 font-medium">
                  Showing <span className="text-[#8b2828] font-semibold">{filteredAndSortedTransactions.length}</span> of <span className="text-gray-900 font-semibold">{reportData.data.length}</span> transactions
                </div>
              </div>

              {/* Transactions Table */}
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200/60 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-gray-50 to-gray-100/50 border-b-2 border-gray-200">
                      <tr>
                        <th
                          className="px-4 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200/50 transition-colors duration-200 rounded-tl-2xl"
                          onClick={() => handleSort('TransactionDate')}
                        >
                          Date
                          {sortConfig?.key === 'TransactionDate' && (
                            <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </th>
                        <th
                          className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort('Code')}
                        >
                          Code
                          {sortConfig?.key === 'Code' && (
                            <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </th>
                        <th
                          className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort('CustomerName')}
                        >
                          Customer
                          {sortConfig?.key === 'CustomerName' && (
                            <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                          Item
                        </th>
                        <th
                          className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort('PaymentMode')}
                        >
                          Payment Mode
                          {sortConfig?.key === 'PaymentMode' && (
                            <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </th>
                        <th
                          className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort('TotalAmount')}
                        >
                          Amount
                          {sortConfig?.key === 'TotalAmount' && (
                            <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {paginatedTransactions.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                            <div className="flex flex-col items-center gap-2">
                              <FileTextIcon className="w-12 h-12 text-gray-300" />
                              <p className="text-sm font-medium">No transactions found</p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        paginatedTransactions.map((transaction) => (
                          <TransactionRow
                            key={`${transaction.Code}-${transaction.TransactionDate}-${transaction.Item}`}
                            transaction={transaction}
                            formatDate={formatDate}
                            formatCurrency={formatCurrency}
                          />
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="bg-gradient-to-r from-gray-50 to-gray-100/50 px-6 py-4 flex items-center justify-between border-t-2 border-gray-200">
                    <div className="text-sm text-gray-700 font-medium">
                      Showing <span className="font-semibold text-gray-900">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
                      <span className="font-semibold text-gray-900">{Math.min(currentPage * itemsPerPage, filteredAndSortedTransactions.length)}</span> of{' '}
                      <span className="font-semibold text-[#8b2828]">{filteredAndSortedTransactions.length}</span> results
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="px-4 py-2 border-2 border-gray-300 rounded-xl text-sm font-semibold text-gray-700 hover:bg-white hover:border-[#8b2828] hover:text-[#8b2828] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:border-gray-300 disabled:hover:text-gray-700 transition-all duration-200"
                      >
                        <ChevronLeftIcon className="w-4 h-4" />
                      </button>
                      <span className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white rounded-xl border-2 border-gray-200">
                        Page {currentPage} of {totalPages}
                      </span>
                      <button
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="px-4 py-2 border-2 border-gray-300 rounded-xl text-sm font-semibold text-gray-700 hover:bg-white hover:border-[#8b2828] hover:text-[#8b2828] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:border-gray-300 disabled:hover:text-gray-700 transition-all duration-200"
                      >
                        <ChevronRightIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

