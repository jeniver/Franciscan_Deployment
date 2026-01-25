import React, { useCallback, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import {
  ArrowLeftIcon,
  CalendarIcon,
  UsersIcon,
  BedDoubleIcon,
  ClockIcon,
  DollarSignIcon,
  FileTextIcon,
  LoaderIcon,
} from 'lucide-react';

interface WakeRoomRecord {
  ReceptTransactionDate: string | null;
  PayingAmount: number;
  InvoiceId: number;
  InvoiceCode: string;
  PaymentMode: string;
  PaymentModeDocNo: string;
  RefDocNumber: string;
  CustomerName: string;
  DonationAmount: number;
  NoOfDays: number;
  NameOfDeceased: string;
  UsingTimeFrom: string | null;
  UsingTimeTo: string | null;
  WakeRoomBookingNo: string;
}

interface MonthlyWakeRoomsSummary {
  totalBookings: number;
  totalAmount: number;
  averageAmount: number;
  roomBreakdown: Record<string, number>;
  durationBreakdown: Record<string, number>;
  applicantBreakdown: Record<string, number>;
  dateRange: string | null;
}

interface MonthlyWakeRoomsMeta {
  totalRecords: number;
  generatedAt: string;
  cached: boolean;
  source: string;
}

interface MonthlyWakeRoomsPeriod {
  from: string;
  to: string;
  raw?: {
    from: string;
    to: string;
  };
}

interface MonthlyWakeRoomsReportData {
  success: boolean;
  report: string;
  meta: MonthlyWakeRoomsMeta;
  summary: MonthlyWakeRoomsSummary;
  data: WakeRoomRecord[];
  period: MonthlyWakeRoomsPeriod;
}

export function MonthlyWakeRoomsReportPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as { reportData?: MonthlyWakeRoomsReportData } | null;
  const reportData = state?.reportData || null;

  const [exportingPdf, setExportingPdf] = useState(false);

  const formatCurrency = useCallback((amount: number) => {
    return new Intl.NumberFormat('en-SG', {
      style: 'currency',
      currency: 'SGD',
      minimumFractionDigits: 2,
    }).format(amount);
  }, []);

  const formatDateTime = useCallback((value: string | null) => {
    if (!value) return '-';
    return new Date(value).toLocaleString('en-SG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }, []);

  const formatDate = useCallback((value: string | null) => {
    if (!value) return '-';
    return new Date(value).toLocaleDateString('en-SG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }, []);

  const breakdownEntries = (data: Record<string, number>) =>
    Object.entries(data || {}).sort((a, b) => b[1] - a[1]);

  const roomEntries = useMemo(
    () => (reportData ? breakdownEntries(reportData.summary.roomBreakdown) : []),
    [reportData]
  );
  const durationEntries = useMemo(
    () => (reportData ? breakdownEntries(reportData.summary.durationBreakdown) : []),
    [reportData]
  );
  const applicantEntries = useMemo(
    () => (reportData ? breakdownEntries(reportData.summary.applicantBreakdown) : []),
    [reportData]
  );

  const handleDownloadPdf = async () => {
    if (!reportData || exportingPdf) return;
    const element = document.getElementById('monthly-wakerooms-report-content');
    if (!element) return;

    setExportingPdf(true);
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      const opt = {
        margin: 0.5,
        filename: `Monthly_WakeRooms_${reportData.period.from.replace(
          /\s+/g,
          '_'
        )}_to_${reportData.period.to.replace(/\s+/g, '_')}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'in', format: 'a4', orientation: 'landscape' },
      };

      await html2pdf().set(opt).from(element).save();
    } catch (error) {
      console.error('Failed to export wake rooms PDF:', error);
      alert('Failed to export PDF. Please try again.');
    } finally {
      setExportingPdf(false);
    }
  };

  if (!reportData) {
    return (
      <Layout title="Monthly Wake Rooms Report">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
          <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-8 text-center space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">No report data</h2>
            <p className="text-gray-600 text-sm">
              This page is intended to be opened after generating a Monthly Wake Rooms report from the Reports screen.
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
    <Layout title="Monthly Wake Rooms Report">
      <div
        className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6"
        id="monthly-wakerooms-report-content"
      >
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200/70 px-4 sm:px-6 py-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#8b2828] to-[#7d1f1f] flex items-center justify-center text-white shadow-md">
              <BedDoubleIcon className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                Monthly Wake Rooms Report
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
              onClick={handleDownloadPdf}
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
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-5">
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
              <p className="text-xs font-medium text-emerald-700/80 mb-1">Total bookings</p>
              <p className="text-xl font-bold text-gray-900">{reportData.summary.totalBookings}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <BedDoubleIcon className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-purple-100/60 rounded-2xl shadow-md p-5 border border-purple-200/60 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-purple-700/80 mb-1">Average amount</p>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(reportData.summary.averageAmount)}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
              <DollarSignIcon className="w-5 h-5 text-purple-600" />
            </div>
          </div>
          <div className="bg-gradient-to-br from-orange-50 to-orange-100/60 rounded-2xl shadow-md p-5 border border-orange-200/60 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-orange-700/80 mb-1">Unique applicants</p>
              <p className="text-xl font-bold text-gray-900">{applicantEntries.length}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
              <UsersIcon className="w-5 h-5 text-orange-600" />
            </div>
          </div>
        </div>

        {/* Breakdown panels */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200/70 p-5 space-y-5">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <span className="w-1 h-4 rounded-full bg-gradient-to-b from-[#8b2828] to-[#7d1f1f]" />
                Room breakdown
              </h3>
              <div className="space-y-3">
                {roomEntries.map(([room, count]) => (
                  <div key={room}>
                    <div className="flex justify-between text-xs font-medium text-gray-700 mb-1">
                      <span>{room}</span>
                      <span>{count} record(s)</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-gray-200 overflow-hidden">
                      <div
                        className="h-2 rounded-full bg-gradient-to-r from-[#8b2828] to-[#7d1f1f]"
                        style={{ width: `${(count / reportData.summary.totalBookings) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
                {roomEntries.length === 0 && (
                  <p className="text-xs text-gray-500">No room data available.</p>
                )}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <span className="w-1 h-4 rounded-full bg-gradient-to-b from-blue-500 to-blue-600" />
                Duration breakdown
              </h3>
              <div className="flex flex-wrap gap-2">
                {durationEntries.map(([duration, count]) => (
                  <span
                    key={duration}
                    className="inline-flex items-center px-3 py-1.5 rounded-full bg-blue-50 text-xs font-medium text-blue-700 border border-blue-100"
                  >
                    {duration}: <span className="ml-1 font-semibold">{count}</span>
                  </span>
                ))}
                {durationEntries.length === 0 && (
                  <p className="text-xs text-gray-500">No duration data available.</p>
                )}
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200/70 p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <span className="w-1 h-4 rounded-full bg-gradient-to-b from-green-500 to-green-600" />
              Applicant breakdown
            </h3>
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {applicantEntries.map(([name, count]) => (
                <div key={name} className="flex items-center justify-between text-xs">
                  <span className="text-gray-700 truncate pr-2">{name}</span>
                  <span className="px-2 py-0.5 rounded-full bg-green-50 text-green-700 font-semibold border border-green-100">
                    {count}
                  </span>
                </div>
              ))}
              {applicantEntries.length === 0 && (
                <p className="text-xs text-gray-500">No applicant data available.</p>
              )}
            </div>
          </div>
        </div>

        {/* Detailed table */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200/70 overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <span className="w-1 h-4 rounded-full bg-gradient-to-b from-gray-700 to-gray-500" />
              Detailed bookings
            </h2>
            <p className="text-xs text-gray-500">
              Showing {reportData.data.length} record(s)
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-xs">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600 uppercase tracking-wide">
                    Booking
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600 uppercase tracking-wide">
                    Deceased
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600 uppercase tracking-wide">
                    Applicant
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600 uppercase tracking-wide">
                    Period
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600 uppercase tracking-wide">
                    Invoice
                  </th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-600 uppercase tracking-wide">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {reportData.data.map((row) => (
                  <tr key={`${row.WakeRoomBookingNo}-${row.InvoiceId}`} className="hover:bg-gray-50/70">
                    <td className="px-4 py-3 align-top">
                      <div className="font-mono text-[11px] text-gray-800">
                        {row.WakeRoomBookingNo}
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="font-semibold text-gray-900">{row.NameOfDeceased}</div>
                      <div className="text-[11px] text-gray-500">
                        Days: {row.NoOfDays}
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="font-medium text-gray-900">{row.CustomerName}</div>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="flex flex-col text-[11px] text-gray-700">
                        <span>
                          From: {formatDateTime(row.UsingTimeFrom)}
                        </span>
                        <span>
                          To: {formatDateTime(row.UsingTimeTo)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="font-mono text-[11px] text-gray-800">
                        {row.RefDocNumber}
                      </div>
                      <div className="text-[11px] text-gray-500">
                        {row.InvoiceCode} · {row.PaymentMode}
                      </div>
                      <div className="text-[10px] text-gray-400 truncate max-w-[180px]">
                        {row.PaymentModeDocNo}
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top text-right">
                      <div className="font-semibold text-gray-900">
                        {formatCurrency(row.PayingAmount)}
                      </div>
                      <div className="text-[11px] text-gray-500">
                        Donation: {formatCurrency(row.DonationAmount)}
                      </div>
                      <div className="text-[10px] text-gray-400">
                        {formatDate(row.ReceptTransactionDate)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
}


