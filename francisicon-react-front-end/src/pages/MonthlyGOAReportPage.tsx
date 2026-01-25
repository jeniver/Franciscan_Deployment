import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import {
  ArrowLeftIcon,
  CalendarIcon,
  DollarSignIcon,
  TrendingUpIcon,
  FileSpreadsheetIcon,
  FileTextIcon,
  LoaderIcon,
  BuildingIcon,
} from 'lucide-react';
import reportService from '../services/reportService';

interface GOATransaction {
  ReceptTransactionDate: string;
  PayingAmount: number;
  InvoiceId: number;
  InvoiceCode: string;
  PaymentMode: string;
  PaymentModeDocNumber: string;
  RefDocNumber: string;
  CustomerName: string;
  DonationAmount: number;
  NameToEngrave: string;
}

interface MonthlyGOAReportData {
  success: boolean;
  report: string;
  meta: {
    totalRecords: number;
    generatedAt: string;
    cached: boolean;
    source: string;
  };
  summary: {
    totalRecords: number;
    totalAmount: number;
    averageAmount: number;
    chapelBreakdown: Record<string, number>;
    statusBreakdown: Record<string, number>;
    dateRange: string | null;
  };
  data: GOATransaction[];
  period: {
    from: string;
    to: string;
    raw: {
      from: string;
      to: string;
    };
  };
}

export function MonthlyGOAReportPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as { reportData?: MonthlyGOAReportData } | null;
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
    () => {
      if (!reportData) return [];
      const modes = new Set(reportData.data.map(t => t.PaymentMode));
      return Array.from(modes).filter(Boolean);
    },
    [reportData]
  );

  const filteredData = useMemo(() => {
    if (!reportData) return [];
    
    let filtered = reportData.data;

    // Search filter
    if (debouncedSearchTerm) {
      const searchLower = debouncedSearchTerm.toLowerCase();
      filtered = filtered.filter(t =>
        t.CustomerName?.toLowerCase().includes(searchLower) ||
        t.InvoiceCode?.toLowerCase().includes(searchLower) ||
        t.RefDocNumber?.toLowerCase().includes(searchLower) ||
        t.NameToEngrave?.toLowerCase().includes(searchLower) ||
        t.PaymentModeDocNumber?.toLowerCase().includes(searchLower)
      );
    }

    // Payment mode filter
    if (paymentFilter !== 'all') {
      filtered = filtered.filter(t => t.PaymentMode === paymentFilter);
    }

    return filtered;
  }, [reportData, debouncedSearchTerm, paymentFilter]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredData, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  const exportToExcel = async () => {
    if (!reportData || exportingExcel) return;
    setExportingExcel(true);
    try {
      const XLSX = await import('xlsx');
      const worksheetData = [
        ['Monthly GOA Report'],
        [`Period: ${reportData.period.from} to ${reportData.period.to}`],
        [`Generated: ${new Date(reportData.meta.generatedAt).toLocaleString()}`],
        [],
        [
          'Transaction Date',
          'Invoice Code',
          'Customer Name',
          'Name To Engrave',
          'Payment Mode',
          'Payment Doc Number',
          'Ref Doc Number',
          'Paying Amount',
          'Donation Amount',
        ],
        ...reportData.data.map(t => [
          formatDate(t.ReceptTransactionDate),
          t.InvoiceCode,
          t.CustomerName,
          t.NameToEngrave,
          t.PaymentMode,
          t.PaymentModeDocNumber,
          t.RefDocNumber,
          t.PayingAmount,
          t.DonationAmount,
        ]),
      ];

      const ws = XLSX.utils.aoa_to_sheet(worksheetData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Monthly GOA Report');

      const filename = `Monthly_GOA_${reportData.period.from.replace(/\s+/g, '_')}_to_${reportData.period.to.replace(/\s+/g, '_')}.xlsx`;
      XLSX.writeFile(wb, filename);
    } catch (error) {
      console.error('Failed to export to Excel', error);
      alert('Failed to export to Excel. Please try again.');
    } finally {
      setExportingExcel(false);
    }
  };

  const exportToPdf = async () => {
    if (!reportData || exportingPdf) return;
    setExportingPdf(true);
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      const element = document.getElementById('monthly-goa-report-content');
      if (!element) return;

      const opt = {
        margin: [0.5, 0.5, 0.5, 0.5],
        filename: `Monthly_GOA_${reportData.period.from.replace(/\s+/g, '_')}_to_${reportData.period.to.replace(/\s+/g, '_')}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'in', format: 'a4', orientation: 'landscape' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
      };

      await html2pdf().set(opt).from(element).save();
    } catch (error) {
      console.error('Failed to export to PDF', error);
      alert('Failed to export to PDF. Please try again.');
    } finally {
      setExportingPdf(false);
    }
  };

  const breakdownEntries = (data: Record<string, number>) =>
    Object.entries(data || {}).sort((a, b) => b[1] - a[1]);

  const totalAmountFormatted = reportData ? formatCurrency(reportData.summary.totalAmount) : '-';
  const averageAmountFormatted = reportData ? formatCurrency(reportData.summary.averageAmount) : '-';

  const chapelEntries = useMemo(
    () => (reportData ? breakdownEntries(reportData.summary.chapelBreakdown) : []),
    [reportData]
  );
  const statusEntries = useMemo(
    () => (reportData ? breakdownEntries(reportData.summary.statusBreakdown) : []),
    [reportData]
  );

  if (!reportData) {
    return (
      <Layout title="Monthly GOA Report">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
          <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-8 text-center space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">No report data</h2>
            <p className="text-gray-600 text-sm">
              This page is intended to be opened after generating a Monthly GOA report from the Reports screen.
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
    <Layout title="Monthly GOA Report">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6" id="monthly-goa-report-content">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200/70 px-4 sm:px-6 py-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white shadow-md">
              <BuildingIcon className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                Monthly GOA Report
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
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 text-white text-sm font-medium shadow hover:shadow-lg hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100/60 rounded-2xl shadow-md p-5 border border-blue-200/60 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-blue-700/80 mb-1">Total amount</p>
              <p className="text-xl font-bold text-gray-900">{totalAmountFormatted}</p>
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
              <p className="text-xl font-bold text-gray-900">{averageAmountFormatted}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
              <TrendingUpIcon className="w-5 h-5 text-purple-600" />
            </div>
          </div>
        </div>

        {/* Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200/60 p-6">
            <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-1 h-4 bg-gradient-to-b from-indigo-500 to-indigo-600 rounded-full" />
              Chapel breakdown
            </h4>
            <div className="space-y-3">
              {chapelEntries.length > 0 ? (
                chapelEntries.map(([chapel, count]) => {
                  const percentage = (count / reportData.summary.totalRecords) * 100;
                  return (
                    <div key={chapel}>
                      <div className="flex justify-between text-xs font-medium text-gray-700 mb-1">
                        <span>{chapel || 'Unspecified'}</span>
                        <span>
                          {count} ({percentage.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-gray-200 overflow-hidden">
                        <div
                          className="h-2 rounded-full bg-gradient-to-r from-indigo-500 to-indigo-600"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-gray-500">No chapel data available</p>
              )}
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200/60 p-6">
            <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-1 h-4 bg-gradient-to-b from-indigo-500 to-indigo-600 rounded-full" />
              Status breakdown
            </h4>
            <div className="space-y-3">
              {statusEntries.length > 0 ? (
                statusEntries.map(([status, count]) => {
                  const percentage = (count / reportData.summary.totalRecords) * 100;
                  return (
                    <div key={status}>
                      <div className="flex justify-between text-xs font-medium text-gray-700 mb-1">
                        <span>{status || 'Unspecified'}</span>
                        <span>
                          {count} ({percentage.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-gray-200 overflow-hidden">
                        <div
                          className="h-2 rounded-full bg-gradient-to-r from-indigo-500 to-indigo-600"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-gray-500">No status data available</p>
              )}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200/60 p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search by customer name, invoice code, ref doc number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
              />
            </div>
            <div className="sm:w-48">
              <select
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
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
        </div>

        {/* Data table */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200/60 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-indigo-50 to-indigo-100/50 border-b border-indigo-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-indigo-900 uppercase tracking-wider">
                    Transaction Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-indigo-900 uppercase tracking-wider">
                    Invoice Code
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-indigo-900 uppercase tracking-wider">
                    Customer Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-indigo-900 uppercase tracking-wider">
                    Name To Engrave
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-indigo-900 uppercase tracking-wider">
                    Payment Mode
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-indigo-900 uppercase tracking-wider">
                    Payment Doc Number
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-indigo-900 uppercase tracking-wider">
                    Ref Doc Number
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-indigo-900 uppercase tracking-wider">
                    Paying Amount
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-indigo-900 uppercase tracking-wider">
                    Donation Amount
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {paginatedData.length > 0 ? (
                  paginatedData.map((transaction, index) => (
                    <tr key={index} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                        {formatDate(transaction.ReceptTransactionDate)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                        {transaction.InvoiceCode}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {transaction.CustomerName}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {transaction.NameToEngrave}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                          {transaction.PaymentMode}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate" title={transaction.PaymentModeDocNumber}>
                        {transaction.PaymentModeDocNumber}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                        {transaction.RefDocNumber}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-900 text-right">
                        {formatCurrency(transaction.PayingAmount)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-indigo-600 text-right">
                        {formatCurrency(transaction.DonationAmount)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-sm text-gray-500">
                      No transactions found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredData.length)} of {filteredData.length} results
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
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

