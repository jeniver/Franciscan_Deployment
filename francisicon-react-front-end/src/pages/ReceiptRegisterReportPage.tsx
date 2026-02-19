import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import {
    ArrowLeftIcon,
    CalendarIcon,
    TrendingUpIcon,
    FileSpreadsheetIcon,
    FileTextIcon,
    LoaderIcon,
    SearchIcon,
    FilterIcon,
    DollarSignIcon,
    InfoIcon
} from 'lucide-react';

interface Transaction {
    Date: string;
    InvoiceNo: string;
    ReceiptNo: string;
    Applicant: string;
    Niche: number;
    Inscription: number;
    Urn: number;
    WakeRoom: number;
    GOL: number;
    Wreaths: number;
    Interment: number;
    Sealing: number;
    Table: number;
    Others: number;
    GST: number;
    Maint: number;
    SubTotal: number;
    Total: number;
    DBS: number;
    CashChqTT: number;
    Chapel: string;
    NicheNo: string;
}

interface ReportData {
    success: boolean;
    period: {
        from: string;
        to: string;
    };
    summary: {
        totalAmount: number;
        totalRecords: number;
        categoryTotals: Record<string, number>;
    };
    data: Transaction[];
    meta: {
        generatedAt: string;
    };
}

export function ReceiptRegisterReportPage() {
    const location = useLocation();
    const navigate = useNavigate();
    const state = location.state as { reportData?: ReportData } | null;
    const reportData = state?.reportData || null;

    const [exportingExcel, setExportingExcel] = useState(false);
    const [exportingPdf, setExportingPdf] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
    const [paymentFilter, setPaymentFilter] = useState<'all' | 'dbs' | 'cash'>('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(25);

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

    const filteredTransactions = useMemo(() => {
        if (!reportData) return [];

        return reportData.data.filter((t) => {
            const searchLower = debouncedSearchTerm.toLowerCase();
            const matchesSearch =
                t.Applicant.toLowerCase().includes(searchLower) ||
                t.ReceiptNo.toLowerCase().includes(searchLower) ||
                t.InvoiceNo.toLowerCase().includes(searchLower) ||
                t.NicheNo.toLowerCase().includes(searchLower) ||
                t.Chapel.toLowerCase().includes(searchLower);

            if (!matchesSearch) return false;

            if (paymentFilter === 'dbs') return t.DBS > 0;
            if (paymentFilter === 'cash') return t.CashChqTT > 0;

            return true;
        });
    }, [reportData, debouncedSearchTerm, paymentFilter]);

    const paginatedTransactions = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredTransactions.slice(start, start + itemsPerPage);
    }, [filteredTransactions, currentPage, itemsPerPage]);

    const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage) || 1;

    const exportToExcel = useCallback(async () => {
        if (!reportData || exportingExcel) return;
        setExportingExcel(true);
        try {
            const XLSX = await import('xlsx');
            const wb = XLSX.utils.book_new();

            const headers = [
                'Date', 'Invoice No', 'Receipt No', 'Applicant',
                'Niche', 'Inscription', 'Urn', 'Wake Room', 'GOL',
                'Wreaths', 'Interment', 'Sealing', 'Table', 'Others',
                'GST', 'Maint', 'Sub Total', 'Total',
                'DBS', 'Cash/Chq/TT', 'Chapel', 'Niche No'
            ];

            const data = [
                headers,
                ...reportData.data.map(t => [
                    t.Date, t.InvoiceNo, t.ReceiptNo, t.Applicant,
                    t.Niche, t.Inscription, t.Urn, t.WakeRoom, t.GOL,
                    t.Wreaths, t.Interment, t.Sealing, t.Table, t.Others,
                    t.GST, t.Maint, t.SubTotal, t.Total,
                    t.DBS, t.CashChqTT, t.Chapel, t.NicheNo
                ])
            ];

            const ws = XLSX.utils.aoa_to_sheet(data);
            XLSX.utils.book_append_sheet(wb, ws, 'Receipt Register');

            // Add summary sheet
            const summaryData = [
                ['Receipt Register Summary'],
                ['Period', `${reportData.period.from} to ${reportData.period.to}`],
                ['Total Records', reportData.summary.totalRecords],
                ['Total Amount', reportData.summary.totalAmount],
                [],
                ['Category Totals'],
                ...Object.entries(reportData.summary.categoryTotals).map(([cat, val]) => [cat, val])
            ];
            const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
            XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');

            const filename = `Receipt_Register_${reportData.period.from}_to_${reportData.period.to}.xlsx`;
            XLSX.writeFile(wb, filename);
        } catch (error) {
            console.error('Export failed:', error);
            alert('Failed to export to Excel');
        } finally {
            setExportingExcel(false);
        }
    }, [reportData, exportingExcel]);

    const exportToPdf = useCallback(async () => {
        if (!reportData || exportingPdf) return;
        const element = document.getElementById('report-printable-area');
        if (!element) return;

        setExportingPdf(true);
        try {
            const html2pdf = (await import('html2pdf.js')).default;
            const opt = {
                margin: 0.2,
                filename: `Receipt_Register_${reportData.period.from}_to_${reportData.period.to}.pdf`,
                image: { type: 'jpeg' as const, quality: 0.98 },
                html2canvas: { scale: 1.5, useCORS: true, logging: false },
                jsPDF: { unit: 'in', format: 'a3', orientation: 'landscape' as const }
            };
            await html2pdf().set(opt).from(element).save();
        } catch (error) {
            console.error('PDF export failed:', error);
            alert('Failed to export PDF');
        } finally {
            setExportingPdf(false);
        }
    }, [reportData, exportingPdf]);

    if (!reportData) {
        return (
            <Layout title="Receipt Register">
                <div className="max-w-4xl mx-auto px-4 py-20 text-center space-y-6">
                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto text-gray-400">
                        <InfoIcon size={40} />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-2xl font-bold text-gray-900">No report data available</h2>
                        <p className="text-gray-500">Please generate the report from the reports dashboard.</p>
                    </div>
                    <button
                        onClick={() => navigate('/reports')}
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#8b2828] text-white font-medium shadow-lg hover:shadow-xl transition-all"
                    >
                        <ArrowLeftIcon size={20} />
                        Go to Reports
                    </button>
                </div>
            </Layout>
        );
    }

    return (
        <Layout title="Receipt Register Report">
            <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-8 space-y-6">
                {/* Header Section */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#8b2828] to-[#6b1f1f] flex items-center justify-center text-white shadow-lg">
                            <TrendingUpIcon size={28} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Receipt Register</h1>
                            <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                                <CalendarIcon size={16} />
                                <span>{reportData.period.from} – {reportData.period.to}</span>
                                <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                                <span>Generated: {new Date(reportData.meta.generatedAt).toLocaleString()}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 w-full lg:w-auto">
                        <button
                            onClick={() => navigate('/reports')}
                            className="flex-1 lg:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                            <ArrowLeftIcon size={18} />
                            Back
                        </button>
                        <button
                            onClick={exportToExcel}
                            disabled={exportingExcel}
                            className="flex-1 lg:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                        >
                            {exportingExcel ? <LoaderIcon className="animate-spin" size={18} /> : <FileSpreadsheetIcon size={18} />}
                            Excel
                        </button>
                        <button
                            onClick={exportToPdf}
                            disabled={exportingPdf}
                            className="flex-1 lg:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#8b2828] to-[#6b1f1f] text-white text-sm font-medium shadow-md hover:shadow-lg transition-all disabled:opacity-50"
                        >
                            {exportingPdf ? <LoaderIcon className="animate-spin" size={18} /> : <FileTextIcon size={18} />}
                            PDF
                        </button>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
                            <FileTextIcon size={24} />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase">Total Records</p>
                            <p className="text-xl font-bold text-gray-900">{reportData.summary.totalRecords}</p>
                        </div>
                    </div>
                    <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                            <DollarSignIcon size={24} />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase">Total Amount</p>
                            <p className="text-xl font-bold text-gray-900">{formatCurrency(reportData.summary.totalAmount)}</p>
                        </div>
                    </div>
                    <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                            <InfoIcon size={24} />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase">Sub Total</p>
                            <p className="text-xl font-bold text-gray-900">{formatCurrency(reportData.summary.categoryTotals.SubTotal || 0)}</p>
                        </div>
                    </div>
                    <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                            <CalendarIcon size={24} />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase">GST Total</p>
                            <p className="text-xl font-bold text-gray-900">{formatCurrency(reportData.summary.categoryTotals.GST || 0)}</p>
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 flex flex-col md:flex-row gap-4 items-center">
                    <div className="flex-1 w-full relative">
                        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search applicant, receipt, niche..."
                            className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#8b2828]/20 focus:border-[#8b2828] text-sm transition-all"
                        />
                    </div>
                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <FilterIcon size={18} className="text-gray-400 mr-1" />
                        <select
                            value={paymentFilter}
                            onChange={(e) => setPaymentFilter(e.target.value as any)}
                            className="flex-1 md:w-48 px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#8b2828]/20 focus:border-[#8b2828] text-sm"
                        >
                            <option value="all">All Payment Types</option>
                            <option value="dbs">DBS / NETS / Card</option>
                            <option value="cash">Cash / Chq / TT</option>
                        </select>
                    </div>
                </div>

                {/* Table Area */}
                <div className="bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden" id="report-printable-area">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[1800px]">
                            <thead>
                                <tr className="bg-gray-50/80 border-b border-gray-200">
                                    <th className="p-3 text-[11px] font-bold text-gray-600 uppercase">Date</th>
                                    <th className="p-3 text-[11px] font-bold text-gray-600 uppercase">Inv No</th>
                                    <th className="p-3 text-[11px] font-bold text-gray-600 uppercase">Rec No</th>
                                    <th className="p-3 text-[11px] font-bold text-gray-600 uppercase sticky left-0 bg-gray-50/80 z-10 w-48">Applicant</th>
                                    <th className="p-3 text-[11px] font-bold text-gray-600 uppercase text-right">Niche</th>
                                    <th className="p-3 text-[11px] font-bold text-gray-600 uppercase text-right">Insc</th>
                                    <th className="p-3 text-[11px] font-bold text-gray-600 uppercase text-right">Urn</th>
                                    <th className="p-3 text-[11px] font-bold text-gray-600 uppercase text-right">W.Room</th>
                                    <th className="p-3 text-[11px] font-bold text-gray-600 uppercase text-right">GOL</th>
                                    <th className="p-3 text-[11px] font-bold text-gray-600 uppercase text-right">Wreaths</th>
                                    <th className="p-3 text-[11px] font-bold text-gray-600 uppercase text-right">Interm</th>
                                    <th className="p-3 text-[11px] font-bold text-gray-600 uppercase text-right">Seal</th>
                                    <th className="p-3 text-[11px] font-bold text-gray-600 uppercase text-right">Table</th>
                                    <th className="p-3 text-[11px] font-bold text-gray-600 uppercase text-right">Others</th>
                                    <th className="p-3 text-[11px] font-bold text-gray-600 uppercase text-right bg-blue-50/30">GST</th>
                                    <th className="p-3 text-[11px] font-bold text-gray-600 uppercase text-right bg-blue-50/30">Maint</th>
                                    <th className="p-3 text-[11px] font-bold text-gray-600 uppercase text-right bg-emerald-50/30">Sub-T</th>
                                    <th className="p-3 text-[11px] font-bold text-gray-600 uppercase text-right bg-emerald-50/30">Total</th>
                                    <th className="p-3 text-[11px] font-bold text-gray-600 uppercase text-right bg-purple-50/30">DBS</th>
                                    <th className="p-3 text-[11px] font-bold text-gray-600 uppercase text-right bg-purple-50/30 overflow-hidden whitespace-nowrap">Cash/Chq</th>
                                    <th className="p-3 text-[11px] font-bold text-gray-600 uppercase">Chapel</th>
                                    <th className="p-3 text-[11px] font-bold text-gray-600 uppercase">Niche #</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-xs text-gray-700">
                                {paginatedTransactions.map((t, idx) => (
                                    <tr key={`${t.ReceiptNo}-${idx}`} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="p-3 whitespace-nowrap">{t.Date}</td>
                                        <td className="p-3 font-medium text-blue-600">{t.InvoiceNo}</td>
                                        <td className="p-3 font-semibold text-gray-900">{t.ReceiptNo}</td>
                                        <td className="p-3 font-medium text-gray-900 sticky left-0 bg-white z-10">{t.Applicant}</td>
                                        <td className="p-3 text-right">{t.Niche > 0 ? t.Niche.toFixed(2) : '-'}</td>
                                        <td className="p-3 text-right">{t.Inscription > 0 ? t.Inscription.toFixed(2) : '-'}</td>
                                        <td className="p-3 text-right">{t.Urn > 0 ? t.Urn.toFixed(2) : '-'}</td>
                                        <td className="p-3 text-right">{t.WakeRoom > 0 ? t.WakeRoom.toFixed(2) : '-'}</td>
                                        <td className="p-3 text-right">{t.GOL > 0 ? t.GOL.toFixed(2) : '-'}</td>
                                        <td className="p-3 text-right">{t.Wreaths > 0 ? t.Wreaths.toFixed(2) : '-'}</td>
                                        <td className="p-3 text-right">{t.Interment > 0 ? t.Interment.toFixed(2) : '-'}</td>
                                        <td className="p-3 text-right">{t.Sealing > 0 ? t.Sealing.toFixed(2) : '-'}</td>
                                        <td className="p-3 text-right">{t.Table > 0 ? t.Table.toFixed(2) : '-'}</td>
                                        <td className="p-3 text-right">{t.Others > 0 ? t.Others.toFixed(2) : '-'}</td>
                                        <td className="p-3 text-right bg-blue-50/20 font-medium">{t.GST > 0 ? t.GST.toFixed(2) : '-'}</td>
                                        <td className="p-3 text-right bg-blue-50/20 font-medium">{t.Maint > 0 ? t.Maint.toFixed(2) : '-'}</td>
                                        <td className="p-3 text-right bg-emerald-50/20 font-bold">{t.SubTotal.toFixed(2)}</td>
                                        <td className="p-3 text-right bg-emerald-50/30 font-bold text-[#8b2828]">{t.Total.toFixed(2)}</td>
                                        <td className="p-3 text-right bg-purple-50/20 font-medium text-blue-700">{t.DBS > 0 ? t.DBS.toFixed(2) : '-'}</td>
                                        <td className="p-3 text-right bg-purple-50/20 font-medium text-emerald-700">{t.CashChqTT > 0 ? t.CashChqTT.toFixed(2) : '-'}</td>
                                        <td className="p-3 whitespace-nowrap">{t.Chapel}</td>
                                        <td className="p-3 font-mono">{t.NicheNo}</td>
                                    </tr>
                                ))}
                                {filteredTransactions.length === 0 && (
                                    <tr>
                                        <td colSpan={22} className="p-20 text-center text-gray-400 italic">
                                            No matching transactions found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                            {filteredTransactions.length > 0 && (
                                <tfoot className="bg-gray-50/80 border-t-2 border-gray-200 font-bold text-gray-900">
                                    <tr>
                                        <td colSpan={4} className="p-4 text-right">TOTAL:</td>
                                        <td className="p-3 text-right">{filteredTransactions.reduce((s, t) => s + t.Niche, 0).toFixed(2)}</td>
                                        <td className="p-3 text-right">{filteredTransactions.reduce((s, t) => s + t.Inscription, 0).toFixed(2)}</td>
                                        <td className="p-3 text-right">{filteredTransactions.reduce((s, t) => s + t.Urn, 0).toFixed(2)}</td>
                                        <td className="p-3 text-right">{filteredTransactions.reduce((s, t) => s + t.WakeRoom, 0).toFixed(2)}</td>
                                        <td className="p-3 text-right">{filteredTransactions.reduce((s, t) => s + t.GOL, 0).toFixed(2)}</td>
                                        <td className="p-3 text-right">{filteredTransactions.reduce((s, t) => s + t.Wreaths, 0).toFixed(2)}</td>
                                        <td className="p-3 text-right">{filteredTransactions.reduce((s, t) => s + t.Interment, 0).toFixed(2)}</td>
                                        <td className="p-3 text-right">{filteredTransactions.reduce((s, t) => s + t.Sealing, 0).toFixed(2)}</td>
                                        <td className="p-3 text-right">{filteredTransactions.reduce((s, t) => s + t.Table, 0).toFixed(2)}</td>
                                        <td className="p-3 text-right">{filteredTransactions.reduce((s, t) => s + t.Others, 0).toFixed(2)}</td>
                                        <td className="p-3 text-right bg-blue-50/40">{filteredTransactions.reduce((s, t) => s + t.GST, 0).toFixed(2)}</td>
                                        <td className="p-3 text-right bg-blue-50/40">{filteredTransactions.reduce((s, t) => s + t.Maint, 0).toFixed(2)}</td>
                                        <td className="p-3 text-right bg-emerald-50/40">{filteredTransactions.reduce((s, t) => s + t.SubTotal, 0).toFixed(2)}</td>
                                        <td className="p-3 text-right bg-emerald-50/50 text-[#8b2828] font-black">{filteredTransactions.reduce((s, t) => s + t.Total, 0).toFixed(2)}</td>
                                        <td className="p-3 text-right bg-purple-50/40">{filteredTransactions.reduce((s, t) => s + t.DBS, 0).toFixed(2)}</td>
                                        <td className="p-3 text-right bg-purple-50/40">{filteredTransactions.reduce((s, t) => s + t.CashChqTT, 0).toFixed(2)}</td>
                                        <td colSpan={2}></td>
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="bg-gray-50/50 px-6 py-4 border-t border-gray-100 flex items-center justify-between">
                            <span className="text-xs text-gray-500 font-medium">
                                Showing {Math.min(filteredTransactions.length, (currentPage - 1) * itemsPerPage + 1)} to {Math.min(filteredTransactions.length, currentPage * itemsPerPage)} of {filteredTransactions.length} records
                            </span>
                            <div className="flex items-center gap-2">
                                <button
                                    disabled={currentPage === 1}
                                    onClick={() => setCurrentPage(c => c - 1)}
                                    className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium hover:bg-white disabled:opacity-40"
                                >
                                    Prev
                                </button>
                                <div className="flex items-center gap-1">
                                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                        let pageNum = i + 1;
                                        if (totalPages > 5 && currentPage > 3) {
                                            pageNum = currentPage - 3 + i + 1;
                                            if (pageNum > totalPages) pageNum = totalPages - (4 - i);
                                        }
                                        return (
                                            <button
                                                key={pageNum}
                                                onClick={() => setCurrentPage(pageNum)}
                                                className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${currentPage === pageNum ? 'bg-[#8b2828] text-white' : 'hover:bg-gray-100 text-gray-600'}`}
                                            >
                                                {pageNum}
                                            </button>
                                        );
                                    })}
                                </div>
                                <button
                                    disabled={currentPage === totalPages}
                                    onClick={() => setCurrentPage(c => c + 1)}
                                    className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium hover:bg-white disabled:opacity-40"
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
