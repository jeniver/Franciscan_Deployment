import React, { useState, useEffect, useCallback } from 'react';
import { Layout } from '../components/Layout';
import {
  FileTextIcon,
  DownloadIcon,
  TrendingUpIcon,
  BarChartIcon,
  PieChartIcon,
  CalendarIcon,
  LoaderIcon,
  XIcon,
  EyeIcon,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useReport } from '../hooks/useReport';
import { useToast } from '../contexts/ToastContext';
import { ReportViewerModal } from '../components/ReportViewerModal';
import { DateInput } from '../components/common/DateInput';
import reportService from '../services/reportService';

interface ReportCategory {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  reports: ReportItem[];
}

interface ReportItem {
  id: string;
  name: string;
  description: string;
  type: string;
  requiresDateRange?: boolean;
  requiresCode?: boolean;
  requiresChapel?: boolean;
  requiresLevel?: boolean;
  requiresMonth?: boolean;
}

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

export function ReportsPage() {
  const {
    availableReports: _availableReports,
    loadingReports,
    reportsError,
    generatingReport,
    reportError,
    lastErrorType: _lastErrorType,
    reportHistory,
    fetchAvailableReports,
    generateMonthlyReceiptsReport,
    generateMonthlyInscriptionsReport,
    generateMonthlyWakeRoomsReport,
    generateMonthlyGOAReport,
    generateNichesSoldToBothReport,
    generateNichesSoldToCatholicReport,
    generateNichesSoldToNonCatholicReport,
    generateRenewalNichesReport,
    generateSameAddressNichesReport,
    generateChapelLevelReport,
    generateChapelMonthReport,
    generateChapelVacancyReport,
    generateBeneficiariesListReport,
    generateGSTReport,
    generateInvoiceReceiptReport,
    generateInscriptionReport,
    clearError,
    clearReportsError,
  } = useReport();

  const { showSuccess, showError } = useToast();
  const navigate = useNavigate();

  const defaultDateRange = getLastSixMonthsRange();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState({
    fromDate: defaultDateRange.from,
    toDate: defaultDateRange.to,
  });
  const [invoiceCode, setInvoiceCode] = useState('');
  const [inscriptionCode, setInscriptionCode] = useState('');
  const [chapelCode, setChapelCode] = useState('');
  const [chapelLevel, setChapelLevel] = useState<number | ''>('');
  const [chapelMonth, setChapelMonth] = useState<number | ''>('');
  const [viewingReport, setViewingReport] = useState<Blob | null>(null);
  const [viewingReportTitle, setViewingReportTitle] = useState<string>('');
  const [viewingJsonReport, _setViewingJsonReport] = useState<any>(null);

  // Report categories
  const reportCategories: ReportCategory[] = [
    {
      id: 'monthly',
      title: 'Monthly Reports',
      description: 'Comprehensive monthly summaries',
      icon: <CalendarIcon className="w-6 h-6" />,
      color: 'from-orange-500 to-orange-600',
      reports: [
        {
          id: 'monthly-receipts',
          name: 'Monthly Receipts',
          description: 'Generate monthly receipts report',
          type: 'monthly-receipts',
          requiresDateRange: true,
        },
        {
          id: 'monthly-inscriptions',
          name: 'Monthly Inscriptions',
          description: 'Generate monthly inscriptions report',
          type: 'monthly-inscriptions',
          requiresDateRange: true,
        },
        {
          id: 'monthly-wakerooms',
          name: 'Monthly Wake Rooms',
          description: 'Generate monthly wake rooms report',
          type: 'monthly-wakerooms',
          requiresDateRange: true,
        },
        {
          id: 'monthly-goa',
          name: 'Monthly GOA',
          description: 'Generate monthly GOA report',
          type: 'monthly-goa',
          requiresDateRange: true,
        },
        {
          id: 'gst',
          name: 'GST Report',
          description: 'Generate GST report for date range',
          type: 'gst',
          requiresDateRange: true,
        },
      ],
    },
    {
      id: 'niches',
      title: 'Niche Reports',
      description: 'Niche occupancy and booking reports',
      icon: <BarChartIcon className="w-6 h-6" />,
      color: 'from-blue-500 to-blue-600',
      reports: [
        {
          id: 'niches-sold-both',
          name: 'Niches Sold to Both',
          description: 'List of niches sold to both parties',
          type: 'niches-sold-both',
        },
        {
          id: 'niches-sold-catholic',
          name: 'Niches Sold to Catholic',
          description: 'List of niches sold to Catholic parties',
          type: 'niches-sold-catholic',
        },
        {
          id: 'niches-sold-noncatholic',
          name: 'Niches Sold to Non-Catholic',
          description: 'List of niches sold to non-Catholic parties',
          type: 'niches-sold-noncatholic',
        },
        {
          id: 'niches-renewal',
          name: 'Renewal Niches',
          description: 'List of niches up for renewal',
          type: 'niches-renewal',
        },
        {
          id: 'niches-same-address',
          name: 'Same Address Niches',
          description: 'List of niches with same address',
          type: 'niches-same-address',
        },
      ],
    },
    {
      id: 'chapel',
      title: 'Chapel Reports',
      description: 'Chapel level and vacancy reports',
      icon: <PieChartIcon className="w-6 h-6" />,
      color: 'from-purple-500 to-purple-600',
      reports: [
        {
          id: 'chapel-level',
          name: 'Chapel Level Report',
          description: 'Generate chapel level report',
          type: 'chapel-level',
          requiresChapel: true,
          requiresLevel: true,
        },
        {
          id: 'chapel-month',
          name: 'Chapel Month Report',
          description: 'Generate chapel month report',
          type: 'chapel-month',
          requiresChapel: true,
          requiresMonth: true,
        },
        {
          id: 'chapel-vacancy',
          name: 'Chapel Vacancy Report',
          description: 'Generate chapel vacancy report',
          type: 'chapel-vacancy',
          requiresChapel: true,
        },
      ],
    },
    {
      id: 'financial',
      title: 'Financial Reports',
      description: 'Invoice and receipt reports',
      icon: <TrendingUpIcon className="w-6 h-6" />,
      color: 'from-green-500 to-green-600',
      reports: [
        {
          id: 'invoice-receipt',
          name: 'Invoice Receipt',
          description: 'Generate receipt for specific invoice',
          type: 'invoice-receipt',
          requiresCode: true,
        },
        {
          id: 'inscription',
          name: 'Inscription Report',
          description: 'Generate inscription report',
          type: 'inscription',
          requiresCode: true,
        },
        {
          id: 'beneficiaries',
          name: 'Beneficiaries List',
          description: 'Generate beneficiaries list report',
          type: 'beneficiaries-list',
        },
      ],
    },
  ];

  useEffect(() => {
    fetchAvailableReports();
  }, [fetchAvailableReports]);

  useEffect(() => {
    if (reportsError) {
      showError('Error', reportsError);
      clearReportsError();
    }
  }, [reportsError, showError, clearReportsError]);

  useEffect(() => {
    if (reportError) {
      showError('Error', reportError);
      clearError();
    }
  }, [reportError, showError, clearError]);

  const handleGenerateReport = useCallback(
    async (report: ReportItem) => {
      try {
        let blob: Blob | null = null;
        let reportTitle = report.name;

        switch (report.type) {
          case 'monthly-receipts':
            // JSON analytics page view
            try {
              const jsonData = await reportService.getMonthlyReceiptsReportData(dateRange);
              if (jsonData && jsonData.success) {
                navigate('/reports/monthly-receipts', {
                  state: { reportData: jsonData },
                });
                setSelectedCategory(null);
                showSuccess('Success', 'Report generated successfully');
                return;
              } else {
                throw new Error('Invalid report data received');
              }
            } catch (error: any) {
              console.warn('Failed to fetch JSON report data, falling back to PDF:', error);
              try {
                blob = await generateMonthlyReceiptsReport(dateRange);
                reportTitle = `Monthly Receipts Report (${dateRange.fromDate} to ${dateRange.toDate})`;
              } catch (fallbackError: any) {
                showError('Error', fallbackError?.message || 'Failed to generate report');
                return;
              }
            }
            break;
          case 'monthly-inscriptions':
            // Prefer JSON analytics page view over PDF modal
            try {
              const jsonData = await reportService.getMonthlyInscriptionsReportData(dateRange);
              if (jsonData && jsonData.success) {
                navigate('/reports/monthly-inscriptions', {
                  state: { reportData: jsonData },
                });
                setSelectedCategory(null);
                showSuccess('Success', 'Report generated successfully');
                return;
              } else {
                throw new Error('Invalid report data received');
              }
            } catch (error: any) {
              console.warn('Failed to fetch inscriptions JSON report data, falling back to PDF:', error);
              // Fallback to blob (existing behaviour)
              try {
                blob = await generateMonthlyInscriptionsReport(dateRange);
                reportTitle = `Monthly Inscriptions Report (${dateRange.fromDate} to ${dateRange.toDate})`;
              } catch (fallbackError: any) {
                showError('Error', fallbackError?.message || 'Failed to generate report');
                return;
              }
            }
            break;
          case 'monthly-wakerooms':
            // JSON analytics page view
            try {
              const jsonData = await reportService.getMonthlyWakeRoomsReportData(dateRange);
              if (jsonData && jsonData.success) {
                navigate('/reports/monthly-wakerooms', {
                  state: { reportData: jsonData },
                });
                setSelectedCategory(null);
                showSuccess('Success', 'Report generated successfully');
                return;
              } else {
                throw new Error('Invalid report data received');
              }
            } catch (error: any) {
              console.warn('Failed to fetch wake rooms JSON data, falling back to PDF:', error);
              try {
                blob = await generateMonthlyWakeRoomsReport(dateRange);
                reportTitle = `Monthly Wake Rooms Report (${dateRange.fromDate} to ${dateRange.toDate})`;
              } catch (fallbackError: any) {
                showError('Error', fallbackError?.message || 'Failed to generate report');
                return;
              }
            }
            break;
          case 'monthly-goa':
            // Try JSON data first
            try {
              const jsonData = await reportService.getMonthlyGOAReportData(dateRange);
              if (jsonData && jsonData.success) {
                navigate('/reports/monthly-goa', {
                  state: { reportData: jsonData },
                });
                setSelectedCategory(null);
                showSuccess('Success', 'Report generated successfully');
                return;
              }
            } catch (jsonError) {
              console.warn('Failed to get JSON data, falling back to PDF', jsonError);
            }
            // Fallback to PDF
            blob = await generateMonthlyGOAReport(dateRange);
            reportTitle = `Monthly GOA Report (${dateRange.fromDate} to ${dateRange.toDate})`;
            break;
          case 'gst':
            // Try JSON data first
            try {
              const jsonData = await reportService.getGSTReportData(dateRange);
              if (jsonData && jsonData.success) {
                navigate('/reports/gst', {
                  state: { reportData: jsonData },
                });
                setSelectedCategory(null);
                showSuccess('Success', 'Report generated successfully');
                return;
              }
            } catch (jsonError) {
              console.warn('Failed to get JSON data, falling back to PDF', jsonError);
            }
            // Fallback to PDF
            blob = await generateGSTReport(dateRange);
            reportTitle = `GST Report (${dateRange.fromDate} to ${dateRange.toDate})`;
            break;
          case 'niches-sold-both':
            // Try JSON data first
            try {
              const jsonData = await reportService.getNichesSoldToBothReportData();
              if (jsonData && jsonData.success) {
                navigate('/reports/niches/niches-sold-both', {
                  state: { reportData: jsonData },
                });
                setSelectedCategory(null);
                showSuccess('Success', 'Report generated successfully');
                return;
              }
            } catch (error: any) {
              console.warn('Failed to fetch JSON report data, falling back to PDF:', error);
            }
            // Fallback to PDF
            blob = await generateNichesSoldToBothReport();
            reportTitle = 'Niches Sold to Both Report';
            break;
          case 'niches-sold-catholic':
            // Try JSON data first
            try {
              const jsonData = await reportService.getNichesSoldToCatholicReportData();
              if (jsonData && jsonData.success) {
                navigate('/reports/niches/niches-sold-catholic', {
                  state: { reportData: jsonData },
                });
                setSelectedCategory(null);
                showSuccess('Success', 'Report generated successfully');
                return;
              }
            } catch (error: any) {
              console.warn('Failed to fetch JSON report data, falling back to PDF:', error);
            }
            // Fallback to PDF
            blob = await generateNichesSoldToCatholicReport();
            reportTitle = 'Niches Sold to Catholic Report';
            break;
          case 'niches-sold-noncatholic':
            // Try JSON data first
            try {
              const jsonData = await reportService.getNichesSoldToNonCatholicReportData();
              if (jsonData && jsonData.success) {
                navigate('/reports/niches/niches-sold-noncatholic', {
                  state: { reportData: jsonData },
                });
                setSelectedCategory(null);
                showSuccess('Success', 'Report generated successfully');
                return;
              }
            } catch (error: any) {
              console.warn('Failed to fetch JSON report data, falling back to PDF:', error);
            }
            // Fallback to PDF
            blob = await generateNichesSoldToNonCatholicReport();
            reportTitle = 'Niches Sold to Non-Catholic Report';
            break;
          case 'niches-renewal':
            // Try JSON data first
            try {
              const jsonData = await reportService.getRenewalNichesReportData();
              if (jsonData && jsonData.success) {
                navigate('/reports/niches/niches-renewal', {
                  state: { reportData: jsonData },
                });
                setSelectedCategory(null);
                showSuccess('Success', 'Report generated successfully');
                return;
              }
            } catch (error: any) {
              console.warn('Failed to fetch JSON report data, falling back to PDF:', error);
            }
            // Fallback to PDF
            blob = await generateRenewalNichesReport();
            reportTitle = 'Renewal Niches Report';
            break;
          case 'niches-same-address':
            // Try JSON data first
            try {
              const jsonData = await reportService.getSameAddressNichesReportData();
              if (jsonData && jsonData.success) {
                navigate('/reports/niches/niches-same-address', {
                  state: { reportData: jsonData },
                });
                setSelectedCategory(null);
                showSuccess('Success', 'Report generated successfully');
                return;
              }
            } catch (error: any) {
              console.warn('Failed to fetch JSON report data, falling back to PDF:', error);
            }
            // Fallback to PDF
            blob = await generateSameAddressNichesReport();
            reportTitle = 'Same Address Niches Report';
            break;
          case 'chapel-level':
            if (!chapelCode || chapelLevel === '') {
              showError('Error', 'Please provide chapel code and level');
              return;
            }
            blob = await generateChapelLevelReport({ chapel: chapelCode, level: Number(chapelLevel) });
            reportTitle = `Chapel Level Report - ${chapelCode} Level ${chapelLevel}`;
            break;
          case 'chapel-month':
            if (!chapelCode || chapelMonth === '') {
              showError('Error', 'Please provide chapel code and month');
              return;
            }
            blob = await generateChapelMonthReport({ chapel: chapelCode, month: Number(chapelMonth) });
            reportTitle = `Chapel Month Report - ${chapelCode} Month ${chapelMonth}`;
            break;
          case 'chapel-vacancy':
            if (!chapelCode) {
              showError('Error', 'Please provide chapel code');
              return;
            }
            blob = await generateChapelVacancyReport(chapelCode);
            reportTitle = `Chapel Vacancy Report - ${chapelCode}`;
            break;
          case 'invoice-receipt':
            if (!invoiceCode) {
              showError('Error', 'Please provide invoice code');
              return;
            }
            blob = await generateInvoiceReceiptReport({ invoiceCode });
            reportTitle = `Invoice Receipt Report - ${invoiceCode}`;
            break;
          case 'inscription':
            if (!inscriptionCode) {
              showError('Error', 'Please provide inscription code');
              return;
            }
            blob = await generateInscriptionReport(inscriptionCode);
            reportTitle = `Inscription Report - ${inscriptionCode}`;
            break;
          case 'beneficiaries-list':
            blob = await generateBeneficiariesListReport();
            break;
          default:
            showError('Error', 'Unknown report type');
            return;
        }

        if (blob) {
          setViewingReport(blob);
          setViewingReportTitle(reportTitle);
          setSelectedCategory(null); // Close parameter modal
          showSuccess('Success', 'Report generated successfully');
        }
      } catch (error: any) {
        const errorMessage = error?.message || 'Failed to generate report';
        showError('Error', errorMessage);
      }
    },
    [
      dateRange,
      invoiceCode,
      inscriptionCode,
      chapelCode,
      chapelLevel,
      chapelMonth,
      generateMonthlyReceiptsReport,
      generateMonthlyInscriptionsReport,
      generateMonthlyWakeRoomsReport,
      generateMonthlyGOAReport,
      generateGSTReport,
      generateNichesSoldToBothReport,
      generateNichesSoldToCatholicReport,
      generateNichesSoldToNonCatholicReport,
      generateRenewalNichesReport,
      generateSameAddressNichesReport,
      generateChapelLevelReport,
      generateChapelMonthReport,
      generateChapelVacancyReport,
      generateInvoiceReceiptReport,
      generateInscriptionReport,
      generateBeneficiariesListReport,
      showSuccess,
      showError,
    ]
  );

  const renderReportModal = (report: ReportItem) => {
    if (!selectedCategory) return null;

    return (
      <div className="fixed inset-0 z-50 overflow-y-auto animate-in fade-in duration-300">
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-300" />
        <div className="flex min-h-full items-center justify-center p-4">
          <div className="relative bg-gradient-to-br from-white via-gray-50/50 to-white rounded-2xl shadow-2xl max-w-md w-full border border-gray-200/60 animate-in zoom-in-95 duration-300">
            <div className="sticky top-0 bg-gradient-to-r from-[#8b2828] via-[#7d1f1f] to-[#8b2828] px-6 py-5 rounded-t-2xl flex items-center justify-between shadow-lg">
              <h2 className="text-xl font-bold text-white tracking-tight">{report.name}</h2>
              <button
                onClick={() => setSelectedCategory(null)}
                className="text-white/90 hover:text-white hover:bg-white/20 rounded-xl p-2 transition-all duration-200 hover:scale-110 active:scale-95"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <p className="text-gray-600 leading-relaxed">{report.description}</p>

              {report.requiresDateRange && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">From Date</label>
                    <DateInput
                      value={dateRange.fromDate}
                      onChange={(apiDate) => setDateRange({ ...dateRange, fromDate: apiDate })}
                      className="px-4 py-3"
                      placeholder="dd/mm/yyyy"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">To Date</label>
                    <DateInput
                      value={dateRange.toDate}
                      onChange={(apiDate) => setDateRange({ ...dateRange, toDate: apiDate })}
                      className="px-4 py-3"
                      placeholder="dd/mm/yyyy"
                    />
                  </div>
                </div>
              )}

              {report.requiresCode && report.type === 'invoice-receipt' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Invoice Code</label>
                  <input
                    type="text"
                    value={invoiceCode}
                    onChange={(e) => setInvoiceCode(e.target.value)}
                    placeholder="Enter invoice code"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8b2828]/20 focus:border-[#8b2828] transition-all duration-200 hover:border-gray-400 bg-gray-50/50 focus:bg-white"
                  />
                </div>
              )}

              {report.requiresCode && report.type === 'inscription' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Inscription Code</label>
                  <input
                    type="text"
                    value={inscriptionCode}
                    onChange={(e) => setInscriptionCode(e.target.value)}
                    placeholder="Enter inscription code"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8b2828]/20 focus:border-[#8b2828] transition-all duration-200 hover:border-gray-400 bg-gray-50/50 focus:bg-white"
                  />
                </div>
              )}

              {report.requiresChapel && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Chapel Code</label>
                  <input
                    type="text"
                    value={chapelCode}
                    onChange={(e) => setChapelCode(e.target.value)}
                    placeholder="Enter chapel code"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8b2828]/20 focus:border-[#8b2828] transition-all duration-200 hover:border-gray-400 bg-gray-50/50 focus:bg-white"
                  />
                </div>
              )}

              {report.requiresLevel && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Level</label>
                  <input
                    type="number"
                    value={chapelLevel}
                    onChange={(e) => setChapelLevel(e.target.value ? Number(e.target.value) : '')}
                    placeholder="Enter level"
                    min="1"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8b2828]/20 focus:border-[#8b2828] transition-all duration-200 hover:border-gray-400 bg-gray-50/50 focus:bg-white"
                  />
                </div>
              )}

              {report.requiresMonth && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Month (1-12)</label>
                  <input
                    type="number"
                    value={chapelMonth}
                    onChange={(e) => setChapelMonth(e.target.value ? Number(e.target.value) : '')}
                    placeholder="Enter month"
                    min="1"
                    max="12"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8b2828]/20 focus:border-[#8b2828] transition-all duration-200 hover:border-gray-400 bg-gray-50/50 focus:bg-white"
                  />
                </div>
              )}

              <div className="flex justify-end gap-3 pt-6 border-t-2 border-gray-200">
                <button
                  type="button"
                  onClick={() => setSelectedCategory(null)}
                  className="px-5 py-2.5 border-2 border-gray-300 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 disabled:opacity-50"
                  disabled={generatingReport}
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleGenerateReport(report)}
                  disabled={generatingReport}
                  className="px-5 py-2.5 bg-gradient-to-r from-[#8b2828] via-[#7d1f1f] to-[#8b2828] text-white rounded-xl hover:shadow-xl hover:shadow-[#8b2828]/25 hover:scale-105 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-2 font-semibold"
                >
                  {generatingReport ? (
                    <>
                      <LoaderIcon className="w-4 h-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <DownloadIcon className="w-4 h-4" />
                      Generate
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Layout title="Reports">
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-10">
            <div className="flex items-center gap-4 mb-3">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#8b2828] to-[#7d1f1f] flex items-center justify-center shadow-lg">
                <BarChartIcon className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-gray-900 mb-1 tracking-tight bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  Reports & Analytics
                </h1>
                <p className="text-gray-600 text-lg">Generate and view comprehensive system reports</p>
              </div>
            </div>
          </div>

          {/* Report Categories */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {reportCategories.map((category) => (
              <div
                key={category.id}
                className="group relative bg-gradient-to-br from-white via-gray-50/30 to-white rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all duration-500 border border-gray-200/60 overflow-hidden hover:-translate-y-1"
              >
                <div
                  className={`absolute top-0 right-0 w-48 h-48 bg-gradient-to-br ${category.color} opacity-5 rounded-full -mr-24 -mt-24 group-hover:opacity-10 group-hover:scale-150 transition-all duration-700`}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-transparent via-transparent to-gray-50/20 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="relative">
                  <div
                    className={`w-16 h-16 bg-gradient-to-br ${category.color} rounded-2xl flex items-center justify-center text-white mb-6 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg group-hover:shadow-xl`}
                  >
                    {category.icon}
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2 tracking-tight">{category.title}</h3>
                  <p className="text-sm text-gray-600 mb-6 leading-relaxed">{category.description}</p>
                  <div className="space-y-2.5">
                    {category.reports.map((report) => (
                      <button
                        key={report.id}
                        type="button"
                        onClick={() => setSelectedCategory(report.id)}
                        className="w-full group/item flex items-center justify-between px-5 py-3 bg-gradient-to-r from-gray-50 to-gray-100/50 hover:from-[#8b2828]/10 hover:to-[#7d1f1f]/10 rounded-xl text-sm font-medium transition-all duration-300 hover:shadow-md hover:scale-[1.02] border border-gray-200/50 hover:border-[#8b2828]/20"
                      >
                        <span className="text-gray-700 group-hover/item:text-[#8b2828] transition-colors">{report.name}</span>
                        <EyeIcon className="w-4 h-4 text-gray-400 group-hover/item:text-[#8b2828] group-hover/item:translate-x-1 transition-all" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Report History */}
          {reportHistory.length > 0 && (
            <div className="bg-gradient-to-br from-white via-gray-50/30 to-white rounded-3xl shadow-xl border border-gray-200/60 p-8 hover:shadow-2xl transition-all duration-300">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                  <FileTextIcon className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Recent Reports</h2>
              </div>
              <div className="space-y-3">
                {reportHistory.slice(0, 10).map((report) => (
                  <div
                    key={report.id}
                    className="group flex items-center justify-between p-4 bg-gradient-to-r from-gray-50/50 to-transparent border border-gray-200/60 rounded-xl hover:shadow-lg hover:border-[#8b2828]/20 transition-all duration-300 hover:scale-[1.01] hover:-translate-y-0.5"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                        <FileTextIcon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 capitalize text-base">
                          {report.type.replace(/-/g, ' ')}
                        </h3>
                        <p className="text-sm text-gray-600 flex items-center gap-1.5 mt-0.5">
                          <CalendarIcon className="w-3.5 h-3.5" />
                          Generated on {new Date(report.generatedAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Loading State */}
          {loadingReports && (
            <div className="flex items-center justify-center p-12">
              <LoaderIcon className="w-8 h-8 animate-spin text-[#8b2828]" />
              <span className="ml-3 text-gray-600">Loading available reports...</span>
            </div>
          )}

          {/* Report Parameter Modal */}
          {selectedCategory &&
            renderReportModal(
              reportCategories
                .flatMap((cat) => cat.reports)
                .find((r) => r.id === selectedCategory) || reportCategories[0].reports[0]
            )}

          {/* PDF Report Viewer Modal */}
          <ReportViewerModal
            isOpen={viewingReport !== null && viewingJsonReport === null}
            onClose={() => {
              setViewingReport(null);
              setViewingReportTitle('');
            }}
            pdfBlob={viewingReport}
            title={viewingReportTitle}
            loading={generatingReport}
          />
        </div>
      </div>
    </Layout>
  );
}
