import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import {
  FileIcon,
  PlusIcon,
  SearchIcon,
  FilterIcon,
  DownloadIcon,
  EyeIcon,
  LoaderIcon,
  CalendarIcon,
  CreditCardIcon,
  RefreshCwIcon,
  TrendingUpIcon,
  FileCheckIcon
} from 'lucide-react';
import { useReceipt } from '../hooks/useReceipt';
import { useToast } from '../contexts/ToastContext';
import { ReceiptDetailModal } from '../components/ReceiptDetailModal';

export function MiscReceiptPage() {
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  const {
    receipts,
    loading,
    totalReceipts,
    totalAmount,
    searchReceipts,
    setCurrentPage,
    currentPage,
    receiptsPerPage
  } = useReceipt();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [paymentModeFilter, setPaymentModeFilter] = useState('All');

  // Filter receipts that are "Miscellaneous" (typically don't have an invoice or are categorized as Others)
  // For this page, we'll show all receipts but prioritize searching by applicant/receipt no
  // We'll rely on server-side searching now.
  const displayReceipts = receipts;

  const stats = useMemo(() => {
    // In a real app, these would come from specialized API or filtered from records
    return {
      total: totalReceipts || receipts.length,
      amount: totalAmount || receipts.reduce((sum, r) => sum + (r.totalAmount || 0), 0),
      thisMonth: receipts.filter(r => {
        const date = new Date(r.receiptDate || '');
        const now = new Date();
        return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
      }).length
    };
  }, [receipts, totalReceipts, totalAmount]);

  const loadData = useCallback(async (pageOverride?: number) => {
    try {
      await searchReceipts({
        query: searchTerm,
        page: pageOverride ?? currentPage,
        limit: receiptsPerPage,
        paymentMode: paymentModeFilter === 'All' ? undefined : paymentModeFilter
      });
    } catch (err) {
      console.error('Failed to load receipts:', err);
    }
  }, [searchReceipts, searchTerm, currentPage, receiptsPerPage, paymentModeFilter]);

  useEffect(() => {
    loadData();
  }, [currentPage, paymentModeFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentPage !== 1) {
      setCurrentPage(1); // This will trigger useEffect
    } else {
      loadData(1);
    }
  };

  const handleViewReceipt = (receipt: any) => {
    setSelectedReceipt(receipt);
    setIsDetailModalOpen(true);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-SG', {
      style: 'currency',
      currency: 'SGD'
    }).format(amount);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-SG', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <Layout title="Miscellaneous Receipt Dashboard">
      <div className="min-h-screen bg-[#f8fafc] pb-12">
        {/* Header Section */}
        <div className="bg-gradient-to-br from-[#1e293b] via-[#0f172a] to-[#1e293b] border-b border-white/5 pb-24 pt-12 px-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-teal-500/10 blur-[120px] rounded-full -mr-20 -mt-20"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-sky-500/10 blur-[100px] rounded-full -ml-10 -mb-10"></div>

          <div className="max-w-7xl mx-auto relative z-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
              <div>
                <span className="inline-flex items-center px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400 text-xs font-bold uppercase tracking-widest mb-4">
                  Financial Records
                </span>
                <h1 className="text-4xl font-extrabold text-white tracking-tight sm:text-5xl">
                  Miscellaneous <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-sky-400">Receipts</span>
                </h1>
                <p className="mt-4 text-lg text-gray-400 font-medium max-w-xl">
                  Manage non-invoice transactions and additional revenue records with ease.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={() => navigate('/misc-receipt/new')}
                  className="group flex items-center justify-center gap-3 px-8 py-4 bg-teal-600 text-white font-black rounded-2xl shadow-xl shadow-teal-900/20 hover:bg-teal-500 hover:translate-y-[-2px] transition-all duration-300"
                >
                  <PlusIcon className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
                  New Receipt
                </button>
              </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-12">
              {[
                { label: 'Total Receipts', value: stats.total, icon: FileCheckIcon, color: 'from-teal-500 to-teal-600', sub: 'Calculated all time' },
                { label: 'Total Value', value: formatCurrency(stats.amount), icon: TrendingUpIcon, color: 'from-sky-500 to-sky-600', sub: 'Revenue from misc' },
                { label: 'This Month', value: stats.thisMonth, icon: CalendarIcon, color: 'from-indigo-500 to-indigo-600', sub: 'Recent activity' }
              ].map((stat, i) => (
                <div key={i} className="bg-white/5 backdrop-blur-xl rounded-3xl p-6 border border-white/10 shadow-2xl">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`p-3 rounded-2xl bg-gradient-to-br ${stat.color} shadow-lg shadow-black/20 text-white`}>
                      <stat.icon className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{stat.label}</span>
                  </div>
                  <h3 className="text-3xl font-black text-white">{stat.value}</h3>
                  <p className="text-xs text-gray-500 mt-1">{stat.sub}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Search and Table Section */}
        <div className="max-w-7xl mx-auto px-6 -mt-10 relative z-20">
          <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-black/5 border border-gray-100 overflow-hidden">
            <div className="p-8 border-b border-gray-50 bg-[#f8fafc]/50">
              <div className="flex flex-col lg:flex-row gap-6 items-center justify-between">
                <form onSubmit={handleSearch} className="relative flex-1 w-full group">
                  <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-teal-500 transition-colors" />
                  <input
                    type="text"
                    placeholder="Search by receipt #, applicant name, or invoice..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 transition-all text-gray-700 font-medium"
                  />
                </form>
                <div className="flex items-center gap-4 w-full lg:w-auto">
                  <div className="relative flex-1 lg:w-48">
                    <FilterIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <select
                      value={paymentModeFilter}
                      onChange={(e) => setPaymentModeFilter(e.target.value)}
                      className="w-full pl-10 pr-4 py-4 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 appearance-none text-sm font-bold text-gray-600 cursor-pointer"
                    >
                      <option value="All">All Payment Modes</option>
                      <option value="Cash">Cash</option>
                      <option value="Cheque">Cheque</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <button
                    onClick={loadData}
                    className="p-4 bg-white border border-gray-200 rounded-2xl text-gray-600 hover:text-teal-600 hover:border-teal-200 hover:bg-teal-50 transition-all active:scale-95"
                  >
                    <RefreshCwIcon className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                  </button>
                  <button className="flex items-center gap-2 px-6 py-4 bg-[#0f172a] text-white rounded-2xl font-bold hover:shadow-lg transition-all active:scale-95">
                    <DownloadIcon className="w-4 h-4" />
                    Export
                  </button>
                </div>
              </div>
            </div>

            {loading && displayReceipts.length === 0 ? (
              <div className="py-32 text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-teal-500/20 border-t-teal-500"></div>
                <p className="mt-4 text-gray-500 font-bold tracking-widest text-xs uppercase">Loading Greatness...</p>
              </div>
            ) : displayReceipts.length === 0 ? (
              <div className="py-32 text-center">
                <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <FileIcon className="w-10 h-10 text-gray-300" />
                </div>
                <h3 className="text-xl font-black text-gray-900 mb-2">No Receipts Found</h3>
                <p className="text-gray-500 max-w-xs mx-auto mb-8 font-medium">We couldn't find any miscellaneous receipts matching your criteria.</p>
                <button
                  onClick={() => navigate('/misc-receipt/new')}
                  className="inline-flex items-center gap-2 px-8 py-3 bg-teal-600 text-white rounded-xl font-bold hover:bg-teal-500 transition-all"
                >
                  <PlusIcon className="w-4 h-4" />
                  Create Your First
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50/50">
                      <th className="px-8 py-6 text-left text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-50">Receipt Code</th>
                      <th className="px-8 py-6 text-left text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-50">Date</th>
                      <th className="px-8 py-6 text-left text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-50">Applicant / Payee</th>
                      <th className="px-8 py-6 text-right text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-50">Amount</th>
                      <th className="px-8 py-6 text-left text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-50">Payment</th>
                      <th className="px-8 py-6 text-center text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-50">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {displayReceipts.map((receipt) => (
                      <tr key={receipt.receiptId || receipt.receiptCode} className="group hover:bg-teal-50/30 transition-colors">
                        <td className="px-8 py-6">
                          <span className="inline-flex items-center px-3 py-1 rounded-lg bg-teal-50 text-teal-700 font-black text-xs border border-teal-100">
                            {receipt.receiptCode}
                          </span>
                        </td>
                        <td className="px-8 py-6 text-sm font-bold text-gray-600">
                          {formatDate(receipt.receiptDate || receipt.createdAt)}
                        </td>
                        <td className="px-8 py-6">
                          <div className="text-sm font-black text-gray-900 group-hover:text-teal-700 transition-colors">{receipt.customerName || 'N/A'}</div>
                          {receipt.invoiceCode && (
                            <div className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-widest">
                              REF: {receipt.invoiceCode}
                            </div>
                          )}
                        </td>
                        <td className="px-8 py-6 text-right font-black text-[#0f172a]">
                          {formatCurrency(receipt.totalAmount || receipt.payingAmount || 0)}
                        </td>
                        <td className="px-8 py-6">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 text-gray-600 text-[10px] font-black uppercase tracking-widest border border-gray-200">
                            <CreditCardIcon className="w-3 h-3" />
                            {receipt.paymentMode || 'N/A'}
                          </span>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleViewReceipt(receipt)}
                              className="p-2.5 bg-white border border-gray-200 rounded-xl text-teal-600 hover:border-teal-500 hover:bg-teal-50 shadow-sm transition-all"
                              title="View Details"
                            >
                              <EyeIcon className="w-5 h-5" />
                            </button>
                            <button className="p-2.5 bg-white border border-gray-200 rounded-xl text-teal-600 hover:border-teal-500 hover:bg-teal-50 shadow-sm transition-all" title="Download PDF">
                              <DownloadIcon className="w-5 h-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {displayReceipts.length > 0 && (
              <div className="p-8 bg-[#f8fafc]/50 border-t border-gray-50 flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Current Focus</span>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-black text-gray-900 bg-white px-3 py-1 rounded-lg border border-gray-200 shadow-sm">
                      Page {currentPage}
                    </span>
                    <span className="text-sm font-bold text-gray-400">
                      of {Math.max(1, Math.ceil(stats.total / receiptsPerPage))}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    disabled={currentPage === 1 || loading}
                    onClick={() => setCurrentPage(currentPage - 1)}
                    className="px-6 py-3 border-2 border-gray-100 rounded-xl text-xs font-black text-gray-500 hover:bg-white hover:border-gray-300 transition-all disabled:opacity-20 active:scale-95"
                  >
                    Previous
                  </button>

                  <div className="flex gap-1.5 mx-2">
                    {[...Array(Math.min(5, Math.ceil(stats.total / receiptsPerPage)))].map((_, i) => {
                      const pageNum = i + 1;
                      const isActive = currentPage === pageNum;
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`w-10 h-10 rounded-xl text-xs font-black transition-all ${isActive
                            ? 'bg-teal-600 text-white shadow-lg shadow-teal-500/20'
                            : 'text-gray-400 hover:bg-white hover:text-teal-600 border border-transparent'
                            }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                    {Math.ceil(stats.total / receiptsPerPage) > 5 && (
                      <span className="w-10 h-10 flex items-center justify-center text-gray-300">...</span>
                    )}
                  </div>

                  <button
                    disabled={currentPage >= Math.ceil(stats.total / receiptsPerPage) || loading}
                    onClick={() => setCurrentPage(currentPage + 1)}
                    className="px-6 py-3 bg-[#0f172a] text-white rounded-xl text-xs font-black hover:shadow-xl hover:translate-y-[-2px] transition-all disabled:opacity-20 active:scale-95"
                  >
                    Next Page
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <ReceiptDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedReceipt(null);
        }}
        receipt={selectedReceipt}
      />
    </Layout>
  );
}