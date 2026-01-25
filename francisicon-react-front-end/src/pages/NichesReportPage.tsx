import React, { useMemo, useState, useCallback } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Layout } from '../components/Layout';
import {
  FileTextIcon,
  ArrowLeftIcon,
  DownloadIcon,
  CalendarIcon,
  BarChartIcon,
  HashIcon,
  TrendingUpIcon,
} from 'lucide-react';
import reportService from '../services/reportService';

interface NichesReportMeta {
  totalRecords: number;
  generatedAt: string;
  cached: boolean;
  source: string;
  cacheKey?: string;
}

interface NichesReportSummary {
  totalRecords: number;
  chapelBreakdown?: Record<string, number>;
  statusBreakdown?: Record<string, number>;
  religionBreakdown?: Record<string, number>;
  applicantCountries?: Record<string, number>;
  dateRange?: string | null;
}

interface NichesReportDataItem {
  NoOfNiches: number;
  ChapelCode: string;
  [key: string]: any; // Allow for additional fields
}

interface NichesReportData {
  success: boolean;
  report: string;
  meta: NichesReportMeta;
  summary: NichesReportSummary;
  data: NichesReportDataItem[];
}

const REPORT_TITLES: Record<string, string> = {
  'niches-sold-both': 'Niches Sold to Both',
  'niches-sold-catholic': 'Niches Sold to Catholic',
  'niches-sold-noncatholic': 'Niches Sold to Non-Catholic',
  'niches-renewal': 'Renewal Niches',
  'niches-same-address': 'Same Address Niches',
};

const REPORT_ENDPOINTS: Record<string, string> = {
  'niches-sold-both': 'sold-both',
  'niches-sold-catholic': 'sold-catholic',
  'niches-sold-noncatholic': 'sold-noncatholic',
  'niches-renewal': 'renewal',
  'niches-same-address': 'same-address',
};

export function NichesReportPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { reportType: routeReportType } = useParams<{ reportType: string }>();
  const state = location.state as { reportData?: NichesReportData } | null;
  const reportData = state?.reportData || null;
  const reportType = reportData?.report || routeReportType || 'niches-sold-both';

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
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }, []);

  const handleDownloadPdf = async () => {
    if (!reportData || downloading) return;
    setDownloading(true);
    try {
      const endpoint = REPORT_ENDPOINTS[reportType];
      if (!endpoint) {
        alert('Invalid report type');
        return;
      }

      let blob: Blob;
      switch (reportType) {
        case 'niches-sold-both':
          blob = await reportService.getNichesSoldToBothReport();
          break;
        case 'niches-sold-catholic':
          blob = await reportService.getNichesSoldToCatholicReport();
          break;
        case 'niches-sold-noncatholic':
          blob = await reportService.getNichesSoldToNonCatholicReport();
          break;
        case 'niches-renewal':
          blob = await reportService.getRenewalNichesReport();
          break;
        case 'niches-same-address':
          blob = await reportService.getSameAddressNichesReport();
          break;
        default:
          throw new Error('Unknown report type');
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${REPORT_TITLES[reportType] || 'Report'}_${new Date().toISOString().split('T')[0]}.pdf`;
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

  const breakdownEntries = (data: Record<string, number> | undefined) =>
    data ? Object.entries(data).sort((a, b) => b[1] - a[1]) : [];

  const chapelEntries = useMemo(
    () => (reportData ? breakdownEntries(reportData.summary.chapelBreakdown) : []),
    [reportData]
  );
  const statusEntries = useMemo(
    () => (reportData ? breakdownEntries(reportData.summary.statusBreakdown) : []),
    [reportData]
  );
  const religionEntries = useMemo(
    () => (reportData ? breakdownEntries(reportData.summary.religionBreakdown) : []),
    [reportData]
  );
  const countryEntries = useMemo(
    () => (reportData ? breakdownEntries(reportData.summary.applicantCountries) : []),
    [reportData]
  );

  if (!reportData) {
    return (
      <Layout title="Niche Report">
        <div className="p-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center py-12">
              <p className="text-gray-600">No report data available. Please generate a report first.</p>
              <button
                onClick={() => navigate('/reports')}
                className="mt-4 px-4 py-2 bg-[#8b2828] text-white rounded-lg hover:bg-[#7d1f1f]"
              >
                Go to Reports
              </button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  const reportTitle = REPORT_TITLES[reportType] || 'Niche Report';

  return (
    <Layout title={reportTitle}>
      <div className="p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/reports')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeftIcon className="w-6 h-6 text-gray-600" />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{reportTitle}</h1>
                <p className="text-gray-600 mt-1">
                  Generated on {formatDate(reportData.meta.generatedAt)}
                  {reportData.meta.cached && (
                    <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Cached</span>
                  )}
                </p>
              </div>
            </div>
            <button
              onClick={handleDownloadPdf}
              disabled={downloading}
              className="flex items-center gap-2 px-4 py-2 bg-[#8b2828] text-white rounded-lg hover:bg-[#7d1f1f] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <DownloadIcon className="w-5 h-5" />
              {downloading ? 'Downloading...' : 'Download PDF'}
            </button>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Records</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{reportData.summary.totalRecords}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <HashIcon className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>

            {reportData.summary.chapelBreakdown && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Chapels</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {Object.keys(reportData.summary.chapelBreakdown).length}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <BarChartIcon className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </div>
            )}

            {reportData.summary.religionBreakdown && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Religion Types</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {Object.keys(reportData.summary.religionBreakdown).length}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <TrendingUpIcon className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </div>
            )}

            {reportData.summary.applicantCountries && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Countries</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {Object.keys(reportData.summary.applicantCountries).filter(
                        (k) => k !== 'Unspecified'
                      ).length}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                    <CalendarIcon className="w-6 h-6 text-orange-600" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Breakdowns */}
          {(chapelEntries.length > 0 || statusEntries.length > 0 || religionEntries.length > 0 || countryEntries.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {chapelEntries.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Chapel Breakdown</h3>
                  <div className="space-y-3">
                    {chapelEntries.map(([chapel, count]) => (
                      <div key={chapel} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                        <span className="text-gray-700">{chapel}</span>
                        <span className="font-semibold text-gray-900">{count.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {statusEntries.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Status Breakdown</h3>
                  <div className="space-y-3">
                    {statusEntries.map(([status, count]) => (
                      <div key={status} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                        <span className="text-gray-700">{status}</span>
                        <span className="font-semibold text-gray-900">{count.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {religionEntries.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Religion Breakdown</h3>
                  <div className="space-y-3">
                    {religionEntries.map(([religion, count]) => (
                      <div key={religion} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                        <span className="text-gray-700">{religion}</span>
                        <span className="font-semibold text-gray-900">{count.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {countryEntries.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Country Breakdown</h3>
                  <div className="space-y-3">
                    {countryEntries.map(([country, count]) => (
                      <div key={country} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                        <span className="text-gray-700">{country}</span>
                        <span className="font-semibold text-gray-900">{count.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Data Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Report Data</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {reportData.data.length > 0 &&
                      Object.keys(reportData.data[0]).map((key) => (
                        <th
                          key={key}
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </th>
                      ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reportData.data.map((row, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      {Object.entries(row).map(([key, value]) => (
                        <td key={key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {typeof value === 'number' ? value.toLocaleString() : String(value || '-')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

