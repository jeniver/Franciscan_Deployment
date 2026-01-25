import React, { useMemo, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import {
  FileTextIcon,
  ArrowLeftIcon,
  DownloadIcon,
  CalendarIcon,
  UsersIcon,
  HashIcon,
  TrendingUpIcon,
} from 'lucide-react';
import reportService from '../services/reportService';

interface MonthlyInscriptionsSummary {
  totalRecords: number;
  totalAmount: number;
  averageAmount: number;
  chapelBreakdown: Record<string, number>;
  statusBreakdown: Record<string, number>;
  inscriptionTypes: Record<string, number>;
  applicantCountries: Record<string, number>;
  dateRange: string | null;
}

interface MonthlyInscriptionsMeta {
  totalRecords: number;
  generatedAt: string;
  cached: boolean;
  source: string;
  cacheKey?: string;
}

interface MonthlyInscriptionsPeriod {
  from: string;
  to: string;
  raw?: {
    from: string;
    to: string;
  };
}

interface MonthlyInscriptionsRecord {
  NicheBookingId: number;
  NicheInscriptionRequestId: number;
  NicheInscriptionRequestDecesedId: number;
  NicheBookingBeneficiaryId: number | null;
  InvoiceId: number;
  RefDocNumber: string;
  NameOfDeceased: string;
  DateDied: string | null;
  DateOfBirth: string | null;
  BirthYear: string | null;
  BibleInscriptionChoiceId: number | null;
  PayingAmount: number;
  TransactionDate: string | null;
  ApplicantName: string;
  ApplicantAddressLine1: string | null;
  ApplicantAddressLine2: string | null;
  ApplicantAddressNo: string | null;
  Code: string;
  InscCode: string;
  InsTransactionDate: string | null;
}

interface MonthlyInscriptionsReportData {
  success: boolean;
  report: string;
  meta: MonthlyInscriptionsMeta;
  summary: MonthlyInscriptionsSummary;
  data: MonthlyInscriptionsRecord[];
  period: MonthlyInscriptionsPeriod;
}

export function MonthlyInscriptionsReportPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as { reportData?: MonthlyInscriptionsReportData } | null;
  const reportData = state?.reportData || null;

  const [downloading, setDownloading] = useState(false);

  const formatCurrency = useCallback((amount: number) => {
    return new Intl.NumberFormat('en-SG', {
      style: 'currency',
      currency: 'SGD',
      minimumFractionDigits: 2,
    }).format(amount);
  }, []);

  const formatDate = useCallback((value: string | null) => {
    if (!value) return '-';
    return new Date(value).toLocaleDateString('en-SG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }, []);

  const handleDownloadPdf = async () => {
    if (!reportData || downloading) return;
    setDownloading(true);
    try {
      const raw = reportData.period.raw || {
        from: reportData.period.from,
        to: reportData.period.to,
      };
      const blob = await reportService.getMonthlyInscriptionsReport({
        fromDate: raw.from,
        toDate: raw.to,
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Monthly_Inscriptions_${reportData.period.from.replace(/\s+/g, '_')}_to_${reportData.period.to.replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download report PDF', error);
      alert('Failed to download report. Please try again.');
    } finally {
      setDownloading(false);
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
  const typeEntries = useMemo(
    () => (reportData ? breakdownEntries(reportData.summary.inscriptionTypes) : []),
    [reportData]
  );
  const countryEntries = useMemo(
    () => (reportData ? breakdownEntries(reportData.summary.applicantCountries) : []),
    [reportData]
  );

  if (!reportData) {
    return (
      <Layout title="Monthly Inscriptions Report">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
          <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-8 text-center space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">No report data</h2>
            <p className="text-gray-600 text-sm">
              This page is intended to be opened after generating a Monthly Inscriptions report from the Reports screen.
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
    <Layout title="Monthly Inscriptions Report">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200/70 px-4 sm:px-6 py-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#8b2828] to-[#7d1f1f] flex items-center justify-center text-white shadow-md">
              <FileTextIcon className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                Monthly Inscriptions Report
              </h1>
              <p className="text-sm text-gray-600 flex items-center gap-2">
                <CalendarIcon className="w-4 h-4" />
                Period: {reportData.period.from} – {reportData.period.to}
                <span className="mx-2 text-gray-400">•</span>
                Generated on {new Date(reportData.meta.generatedAt).toLocaleString()}
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
              disabled={downloading}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-[#8b2828] via-[#7d1f1f] to-[#8b2828] text-white text-sm font-medium shadow hover:shadow-lg hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {downloading ? (
                'Downloading...'
              ) : (
                <>
                  <DownloadIcon className="w-4 h-4" />
                  Download PDF
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
              <p className="text-xl font-bold text-gray-900">{totalAmountFormatted}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <TrendingUpIcon className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/60 rounded-2xl shadow-md p-5 border border-emerald-200/60 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-emerald-700/80 mb-1">Total records</p>
              <p className="text-xl font-bold text-gray-900">{reportData.summary.totalRecords}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <HashIcon className="w-5 h-5 text-emerald-600" />
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
          <div className="bg-gradient-to-br from-orange-50 to-orange-100/60 rounded-2xl shadow-md p-5 border border-orange-200/60 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-orange-700/80 mb-1">Applicant countries</p>
              <p className="text-xl font-bold text-gray-900">{countryEntries.length}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
              <UsersIcon className="w-5 h-5 text-orange-600" />
            </div>
          </div>
        </div>

        {/* Breakdown panels */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200/70 p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-1 h-4 rounded-full bg-gradient-to-b from-[#8b2828] to-[#7d1f1f]" />
              Chapel breakdown
            </h3>
            <div className="space-y-3">
              {chapelEntries.map(([chapel, count]) => (
                <div key={chapel}>
                  <div className="flex justify-between text-xs font-medium text-gray-700 mb-1">
                    <span>{chapel}</span>
                    <span>{count} record(s)</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-gray-200 overflow-hidden">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-[#8b2828] to-[#7d1f1f]"
                      style={{ width: `${(count / reportData.summary.totalRecords) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
              {chapelEntries.length === 0 && (
                <p className="text-xs text-gray-500">No chapel data available.</p>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-gray-200/70 p-5 space-y-5">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <span className="w-1 h-4 rounded-full bg-gradient-to-b from-blue-500 to-blue-600" />
                Status breakdown
              </h3>
              <div className="flex flex-wrap gap-2">
                {statusEntries.map(([status, count]) => (
                  <span
                    key={status}
                    className="inline-flex items-center px-3 py-1.5 rounded-full bg-blue-50 text-xs font-medium text-blue-700 border border-blue-100"
                  >
                    {status}: <span className="ml-1 font-semibold">{count}</span>
                  </span>
                ))}
                {statusEntries.length === 0 && (
                  <p className="text-xs text-gray-500">No status data available.</p>
                )}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <span className="w-1 h-4 rounded-full bg-gradient-to-b from-green-500 to-green-600" />
                Inscription types
              </h3>
              <div className="flex flex-wrap gap-2">
                {typeEntries.map(([type, count]) => (
                  <span
                    key={type}
                    className="inline-flex items-center px-3 py-1.5 rounded-full bg-green-50 text-xs font-medium text-green-700 border border-green-100"
                  >
                    {type}: <span className="ml-1 font-semibold">{count}</span>
                  </span>
                ))}
                {typeEntries.length === 0 && (
                  <p className="text-xs text-gray-500">No inscription type data available.</p>
                )}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <span className="w-1 h-4 rounded-full bg-gradient-to-b from-orange-500 to-orange-600" />
                Applicant countries
              </h3>
              <div className="flex flex-wrap gap-2">
                {countryEntries.map(([country, count]) => (
                  <span
                    key={country}
                    className="inline-flex items-center px-3 py-1.5 rounded-full bg-orange-50 text-xs font-medium text-orange-700 border border-orange-100"
                  >
                    {country}: <span className="ml-1 font-semibold">{count}</span>
                  </span>
                ))}
                {countryEntries.length === 0 && (
                  <p className="text-xs text-gray-500">No country data available.</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Data table */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200/70 overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <span className="w-1 h-4 rounded-full bg-gradient-to-b from-gray-700 to-gray-500" />
              Detailed records
            </h2>
            <p className="text-xs text-gray-500">
              Showing {reportData.data.length} inscription record(s)
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-xs">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600 uppercase tracking-wide">
                    Deceased
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600 uppercase tracking-wide">
                    Applicant
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600 uppercase tracking-wide">
                    Inscription
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600 uppercase tracking-wide">
                    Invoice
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600 uppercase tracking-wide">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600 uppercase tracking-wide">
                    Transaction date
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {reportData.data.map((row) => (
                  <tr key={`${row.NicheInscriptionRequestId}-${row.InvoiceId}`} className="hover:bg-gray-50/70">
                    <td className="px-4 py-3 align-top">
                      <div className="font-semibold text-gray-900">{row.NameOfDeceased}</div>
                      <div className="text-[11px] text-gray-500">
                        DOB: {row.DateOfBirth ? formatDate(row.DateOfBirth) : row.BirthYear || '-'} ·
                        DOD: {formatDate(row.DateDied)}
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="font-medium text-gray-900">{row.ApplicantName}</div>
                      <div className="text-[11px] text-gray-500">
                        {row.ApplicantAddressNo && `${row.ApplicantAddressNo} `}
                        {row.ApplicantAddressLine1 && `${row.ApplicantAddressLine1} `}
                        {row.ApplicantAddressLine2 || ''}
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="font-mono text-[11px] text-gray-800">{row.InscCode}</div>
                      <div className="text-[11px] text-gray-500">Booking: {row.Code}</div>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="font-mono text-[11px] text-gray-800">{row.RefDocNumber}</div>
                      <div className="text-[11px] text-gray-500">Invoice ID: {row.InvoiceId}</div>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="font-semibold text-gray-900">
                        {formatCurrency(row.PayingAmount)}
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="text-[11px] text-gray-800">
                        {formatDate(row.TransactionDate)}
                      </div>
                      <div className="text-[11px] text-gray-500">
                        Inscr.: {formatDate(row.InsTransactionDate)}
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


