import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import {
  ArrowLeftIcon,
  CalendarIcon,
  DollarSignIcon,
  TrendingUpIcon,
  UsersIcon,
  FileSpreadsheetIcon,
  FileTextIcon,
  LoaderIcon,
} from 'lucide-react';
import reportService from '../services/reportService';

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

export function MonthlyReceiptsReportPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as { reportData?: ReportData } | null;
  const reportData = state?.reportData || null;

  const [exportingExcel, setExportingExcel] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

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

  const paymentModes = useMemo(
    () => (reportData ? Object.keys(reportData.summary.paymentBreakdown) : []),
    [reportData]
  );

  const filteredTransactions = useMemo(() => {
    if (!reportData) return [];
    const searchLower = debouncedSearchTerm.toLowerCase();
    const hasSearch = searchLower.length > 0;

    return reportData.data.filter((t) => {
      if (hasSearch) {
        const matchesSearch =
          t.CustomerName.toLowerCase().includes(searchLower) ||
          t.Code.toLowerCase().includes(searchLower) ||
          t.Item.toLowerCase().includes(searchLower) ||
          t.PaymentMode.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }
      return paymentFilter === 'all' || t.PaymentMode === paymentFilter;
    });
  }, [reportData, debouncedSearchTerm, paymentFilter]);

  const totalPages = useMemo(
    () => Math.ceil(filteredTransactions.length / itemsPerPage) || 1,
    [filteredTransactions.length, itemsPerPage]
  );

  const paginatedTransactions = useMemo(
    () =>
      filteredTransactions.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
      ),
    [filteredTransactions, currentPage, itemsPerPage]
  );

  const dailyTrendChartData = useMemo(() => {
    if (!reportData?.summary.dailyTrend) return [];
    const maxAmount = Math.max(...reportData.summary.dailyTrend.map((d) => d.amount));
    const displayTrend = reportData.summary.dailyTrend.slice(-50);
    return displayTrend.map((day) => ({
      ...day,
      height: maxAmount > 0 ? (day.amount / maxAmount) * 100 : 0,
    }));
  }, [reportData?.summary.dailyTrend]);

  const exportToExcel = useCallback(async () => {
    if (!reportData || exportingExcel) return;
    setExportingExcel(true);
    try {
      const XLSX = await import('xlsx');
      const wb = XLSX.utils.book_new();

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

      const trendData = [
        ['Date', 'Amount', 'Count'],
        ...reportData.summary.dailyTrend.map((t) => [t.date, t.amount, t.count]),
      ];
      const trendWs = XLSX.utils.aoa_to_sheet(trendData);
      XLSX.utils.book_append_sheet(wb, trendWs, 'Daily Trend');

      const filename = `Monthly_Receipts_${reportData.period.from.replace(
        /\s+/g,
        '_'
      )}_to_${reportData.period.to.replace(/\s+/g, '_')}.xlsx`;
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
    const element = document.getElementById('monthly-receipts-report-content');
    if (!element) return;
    setExportingPdf(true);
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      const opt = {
        margin: 0.5,
        filename: `Monthly_Receipts_${reportData.period.from.replace(
          /\s+/g,
          '_'
        )}_to_${reportData.period.to.replace(/\s+/g, '_')}.pdf`,
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

  if (!reportData) {
    return (
      <Layout title="Monthly Receipts Report">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
          <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-8 text-center space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">No report data</h2>
            <p className="text-gray-600 text-sm">
              This page is intended to be opened after generating a Monthly Receipts report from the Reports screen.
            </p>
            <button
              type="button"
              onClick={() => navigate('/reports')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#8b2828] via-[#7d1f1f] to-[#8b2828] text-white text-sm font-medium shadow hover:shadow-lg hover:scale-[1.02] active:scale-95 transition-all"
            >
              <ArrowLeftIcon className="w-4 h-4" />
              Back to Reports
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Monthly Receipts Report">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6" id="monthly-receipts-report-content">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200/70 px-4 sm:px-6 py-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#8b2828] to-[#7d1f1f] flex items-center justify-center text-white shadow-md">
              <TrendingUpIcon className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                Monthly Receipts Report
              </h1>
              <p className="text-sm text-gray-600 flex items-center gap-2">
                <CalendarIcon className="w-4 h-4" />
                Period: {reportData.period.from} – {reportData.period.to}
                <span className="mx-2 text-gray-400">•</span>
                Generated on {new Date(reportData.meta.generatedAt).toLocaleString()}
                {reportData.meta.cached && (
                  <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-orange-100 text-orange-700 rounded-full">
                    Cached
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate('/reports')}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <ArrowLeftIcon className="w-4 h-4" />
              Back
            </button>
            <button
              type="button"
              onClick={exportToExcel}
              disabled={exportingExcel}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {exportingExcel ? (
                <>
                  <LoaderIcon className="w-4 h-4 animate-spin" />
                  Excel...
                </>
              ) : (
                <>
                  <FileSpreadsheetIcon className="w-4 h-4" />
                  Excel
                </>
              )}
            </button>
            <button
              type="button"
              onClick={exportToPdf}
              disabled={exportingPdf}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-[#8b2828] via-[#7d1f1f] to-[#8b2828] text-white text-sm font-medium shadow hover:shadow-lg hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {exportingPdf ? (
                <>
                  <LoaderIcon className="w-4 h-4 animate-spin" />
                  PDF...
                </>
              ) : (
                <>
                  <FileTextIcon className="w-4 h-4" />
                  PDF
                </>
              )}
            </button>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100/60 rounded-2xl shadow-md p-5 border border-blue-200/60 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-blue-700/80 mb-1">Total amount</p>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(reportData.summary.totalAmount)}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <DollarSignIcon className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/60 rounded-2xl shadow-md p-5 border border-emerald-200/60 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-emerald-700/80 mb-1">Total records</p>
              <p className="text-xl font-bold text-gray-900">{reportData.summary.totalRecords}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <FileTextIcon className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-purple-100/60 rounded-2xl shadow-md p-5 border border-purple-200/60 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-purple-700/80 mb-1">Average amount</p>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(reportData.summary.averageAmount)}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
              <TrendingUpIcon className="w-5 h-5 text-purple-600" />
            </div>
          </div>
          <div className="bg-gradient-to-br from-orange-50 to-orange-100/60 rounded-2xl shadow-md p-5 border border-orange-200/60 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-orange-700/80 mb-1">Unique customers</p>
              <p className="text-xl font-bold text-gray-900">{reportData.summary.uniqueCustomers}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
              <UsersIcon className="w-5 h-5 text-orange-600" />
            </div>
          </div>
        </div>

        {/* Breakdown & trend */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200/60 p-6">
            <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-1 h-4 bg-gradient-to-b from-blue-500 to-blue-600 rounded-full" />
              Payment breakdown
            </h4>
            <div className="space-y-3">
              {Object.entries(reportData.summary.paymentBreakdown).map(([mode, amount]) => {
                const percentage = (amount / reportData.summary.totalAmount) * 100;
                return (
                  <div key={mode}>
                    <div className="flex justify-between text-xs font-medium text-gray-700 mb-1">
                      <span>{mode}</span>
                      <span>
                        {formatCurrency(amount)} ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-gray-200 overflow-hidden">
                      <div
                        className="h-2 rounded-full bg-gradient-to-r from-[#8b2828] via-[#7d1f1f] to-[#8b2828]"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200/60 p-6">
            <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-1 h-4 bg-gradient-to-b from-indigo-500 to-indigo-600 rounded-full" />
              Daily trend
            </h4>
            <div className="h-64 overflow-x-auto">
              <div className="flex items-end justify-between h-full gap-2 min-w-max">
                {dailyTrendChartData.map((day) => (
                  <div key={day.date} className="flex flex-col items-center gap-2 flex-1">
                    <div className="relative w-full flex items-end justify-center h-48">
                      <div
                        className="w-full bg-gradient-to-t from-[#8b2828] via-[#7d1f1f] to-[#8b2828] rounded-t-lg transition-all duration-300 hover:opacity-90 hover:shadow-md cursor-pointer"
                        style={{ height: `${Math.max(day.height, 5)}%` }}
                        title={`${day.date}: ${formatCurrency(day.amount)} (${day.count} transactions)`}
                      />
                    </div>
                    <div className="text-[10px] text-gray-600 text-center transform -rotate-45 origin-center whitespace-nowrap">
                      {new Date(day.date).toLocaleDateString('en-SG', { month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200/60 p-5">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="flex-1 w-full">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by customer, code, item, or payment mode..."
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8b2828]/20 focus:border-[#8b2828] bg-gray-50/50 focus:bg-white text-sm"
              />
            </div>
            <div>
              <select
                value={paymentFilter}
                onChange={(e) => {
                  setPaymentFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8b2828]/20 focus:border-[#8b2828] bg-gray-50/50 focus:bg-white text-sm"
              >
                <option value="all">All payment modes</option>
                {paymentModes.map((mode) => (
                  <option key={mode} value={mode}>
                    {mode}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-3 text-xs text-gray-600 font-medium">
            Showing <span className="text-[#8b2828] font-semibold">{filteredTransactions.length}</span> of{' '}
            <span className="text-gray-900 font-semibold">{reportData.data.length}</span> transactions
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200/60 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600 uppercase tracking-wide">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600 uppercase tracking-wide">
                    Code
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600 uppercase tracking-wide">
                    Customer
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600 uppercase tracking-wide">
                    Item
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600 uppercase tracking-wide">
                    Payment mode
                  </th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-600 uppercase tracking-wide">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-gray-500">
                      No transactions found for the current filters.
                    </td>
                  </tr>
                ) : (
                  paginatedTransactions.map((t) => (
                    <tr key={`${t.Code}-${t.TransactionDate}-${t.Item}`} className="hover:bg-gray-50/70">
                      <td className="px-4 py-3 whitespace-nowrap text-gray-700">
                        {formatDate(t.TransactionDate)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap font-semibold text-gray-900">
                        {t.Code}
                      </td>
                      <td className="px-4 py-3 text-gray-900 font-medium">{t.CustomerName}</td>
                      <td className="px-4 py-3 text-gray-600">{t.Item}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-medium bg-gray-100 text-gray-700">
                          {t.PaymentMode}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right font-bold text-[#8b2828]">
                        {formatCurrency(t.TotalAmount)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="bg-gray-50 px-4 sm:px-6 py-3 flex items-center justify-between border-t border-gray-200">
              <div className="text-xs text-gray-700 font-medium">
                Showing{' '}
                <span className="font-semibold text-gray-900">
                  {(currentPage - 1) * itemsPerPage + 1}
                </span>{' '}
                to{' '}
                <span className="font-semibold text-gray-900">
                  {Math.min(currentPage * itemsPerPage, filteredTransactions.length)}
                </span>{' '}
                of{' '}
                <span className="font-semibold text-[#8b2828]">
                  {filteredTransactions.length}
                </span>{' '}
                results
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-medium text-gray-700 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Prev
                </button>
                <span className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white rounded-lg border border-gray-200">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-medium text-gray-700 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}


