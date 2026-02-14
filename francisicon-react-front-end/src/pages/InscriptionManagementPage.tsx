import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import {
  SearchIcon,
  FilterIcon,
  PlusIcon,
  EditIcon,
  EyeIcon,
  Trash2Icon,
  FileTextIcon,
  LoaderIcon,
  UsersIcon,
  FileCheckIcon,
  ChevronRightIcon,
} from 'lucide-react';
import { DateInput } from '../components/common/DateInput';
import { useToast } from '../contexts/ToastContext';
import inscriptionService from '../services/inscriptionService';

interface InscriptionRecord {
  id: number;
  inscriptionCode: string;
  applicantName: string;
  nicheApplicationCode: string;
  deceasedNames: string[];
  status: string;
  createdDate: string;
  deceasedCount: number;
}

export function InscriptionManagementPage() {
  const navigate = useNavigate();
  const { showError, showSuccess, showInfo } = useToast();

  // State
  const [loading, setLoading] = useState(false);
  const [inscriptions, setInscriptions] = useState<InscriptionRecord[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(10);

  // Search filters
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [quickViewCode, setQuickViewCode] = useState('');

  // Fetch inscriptions
  const fetchInscriptions = useCallback(async () => {
    setLoading(true);

    try {
      const result = await inscriptionService.searchInscriptions({
        searchTerm,
        fromDate: startDate,
        toDate: endDate,
        page: currentPage,
        pageSize: recordsPerPage
      });

      const mappedInscriptions = result.records.map((record: any) => ({
        id: record.nicheInscriptionRequestId || 0,
        inscriptionCode: record.code,
        applicantName: record.applicant?.name || '-',
        nicheApplicationCode: record.inscription?.nicheApplicationCode || '-',
        deceasedNames: record.deceasedDetails?.map((d: any) => d.name || d.deceasedName || d.NameOfDeceased) || [],
        status: record.statusText || 'Unknown',
        createdDate: record.createdDate,
        deceasedCount: record.deceasedCount || record.deceasedDetails?.length || 0
      }));

      setInscriptions(mappedInscriptions);
      setTotalRecords(result.total);

    } catch (err: any) {
      showError('Error', err.message || 'Failed to fetch inscriptions');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, startDate, endDate, statusFilter, currentPage, recordsPerPage, showError]);

  // Initialize with default search
  useEffect(() => {
    fetchInscriptions();
  }, [fetchInscriptions]);

  // Handle search
  const handleSearch = () => {
    setCurrentPage(1); // Reset to first page
    fetchInscriptions();
  };

  const handleQuickView = () => {
    if (!quickViewCode.trim()) {
      showInfo('Info', 'Please enter an inscription code');
      return;
    }
    // Most inscription codes start with INCR-, but let's handle whatever is entered
    navigate(`/inscriptions/${quickViewCode.trim()}/edit`);
  };

  // Handle clear filters
  const handleClearFilters = () => {
    setSearchTerm('');
    setStartDate('');
    setEndDate('');
    setStatusFilter('All');
    setCurrentPage(1);
  };

  // Handle pagination
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Handle records per page change
  const handleRecordsPerPageChange = (value: number) => {
    setRecordsPerPage(value);
    setCurrentPage(1); // Reset to first page
  };

  // Action handlers
  const handleEdit = (id: number, code: string) => {
    navigate(`/inscriptions/${code}/edit`);
  };

  const handleDelete = async (id: number) => {
    // Find the inscription to get its code
    const inscription = inscriptions.find(insc => insc.id === id);
    if (!inscription) {
      showError('Error', 'Inscription not found');
      return;
    }

    if (window.confirm('Are you sure you want to delete this inscription?')) {
      try {
        setLoading(true);
        const result = await inscriptionService.deleteInscription(inscription.inscriptionCode);
        if (result.success) {
          showSuccess('Success', result.message);
          // Refresh the list
          fetchInscriptions();
        }
      } catch (error: any) {
        showError('Error', error.message || 'Failed to delete inscription');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleGenerateAgreement = (code: string) => {
    // Navigate to inscription agreement viewer using the actual code
    navigate(`/inscription-agreement/${code}`);
  };

  // Compute totals
  const totalDeceased = useMemo(() =>
    inscriptions.reduce((sum, inscription) => sum + (inscription.deceasedCount || 0), 0),
    [inscriptions]
  );

  return (
    <Layout title="Inscription Management">
      <div className="p-4 md:p-8 space-y-8 bg-gray-50 min-h-screen">
        {/* Header Style aligned with premium theme */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Inscription Management</h1>
            <p className="text-gray-600">Review and manage plaque inscription requests</p>
          </div>
          <button
            onClick={() => navigate('/inscriptions/new')}
            className="flex items-center gap-2 px-6 py-3 bg-[#801818] text-white rounded-xl font-semibold shadow-md hover:bg-[#9a1f1f] transition-all transform hover:-translate-y-0.5"
          >
            <PlusIcon className="h-5 w-5" />
            New Inscription Request
          </button>
        </div>

        {/* Quick View / Stats Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick View Box - Aligned with NichiBooking design */}
          <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 flex flex-col justify-center">
            <label className="text-sm font-semibold text-gray-700 mb-2 block uppercase tracking-wider">
              Quick View Inscription
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={quickViewCode}
                onChange={(e) => setQuickViewCode(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleQuickView()}
                className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#801818] focus:border-[#801818] transition-all"
                placeholder="Enter Code (e.g. INCR-123)"
              />
              <button
                onClick={handleQuickView}
                className="px-4 py-3 bg-[#801818] text-white rounded-lg hover:opacity-90 transition-all flex items-center justify-center"
              >
                <ChevronRightIcon className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Stat 1 */}
          <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 flex items-center gap-5">
            <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center font-bold">
              <FileCheckIcon className="w-7 h-7" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 uppercase tracking-wider font-semibold">Total Requests</p>
              <p className="text-2xl font-bold text-gray-900">{totalRecords}</p>
            </div>
          </div>

          {/* Stat 2 */}
          <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 flex items-center gap-5">
            <div className="w-14 h-14 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center">
              <UsersIcon className="w-7 h-7" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 uppercase tracking-wider font-semibold">Total Deceased</p>
              <p className="text-2xl font-bold text-gray-900">{totalDeceased}</p>
            </div>
          </div>
        </div>

        {/* Search and Filters Section */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 bg-gray-50/50">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <FilterIcon className="w-5 h-5 text-[#801818]" />
              Search & Filters
            </h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Keyword Search</label>
                <div className="relative">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Code, name, etc..."
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#801818] focus:border-[#801818] transition-all"
                  />
                  <SearchIcon className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">From Date</label>
                <DateInput
                  value={startDate}
                  onChange={setStartDate}
                  className="rounded-xl py-3 px-4 border-gray-300 w-full"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">To Date</label>
                <DateInput
                  value={endDate}
                  onChange={setEndDate}
                  className="rounded-xl py-3 px-4 border-gray-300 w-full"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#801818] focus:border-[#801818] transition-all bg-white"
                >
                  <option value="All">All Statuses</option>
                  <option value="Draft">Draft</option>
                  <option value="Pending">Pending</option>
                  <option value="Confirmed">Confirmed</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleSearch}
                className="px-8 py-3 bg-[#801818] text-white rounded-xl font-semibold hover:bg-[#9a1f1f] transition-all shadow-md flex items-center gap-2"
              >
                <SearchIcon className="h-4 w-4" />
                Apply Filters
              </button>

              <button
                onClick={handleClearFilters}
                className="px-6 py-3 bg-white border-2 border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all flex items-center gap-2"
              >
                <FilterIcon className="h-4 w-4" />
                Reset
              </button>
            </div>
          </div>
        </div>

        {/* Results Table Section */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Inscription Code</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Applicant</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Niche Application</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Deceased List</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Created On</th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider min-w-[150px]">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {loading && inscriptions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center justify-center gap-4">
                        <LoaderIcon className="animate-spin h-12 w-12 text-[#801818]" />
                        <p className="text-gray-500 font-bold text-lg">Loading Inscriptions...</p>
                      </div>
                    </td>
                  </tr>
                ) : inscriptions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-20 text-center text-gray-500">
                      <div className="flex flex-col items-center justify-center">
                        <SearchIcon className="h-20 w-20 text-gray-100 mb-4" />
                        <p className="text-xl font-bold text-gray-400">No records found</p>
                        <p className="mt-2 text-gray-400">Try adjusting your filters or keyword search.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  inscriptions.map((inscription) => (
                    <tr key={inscription.id} className="hover:bg-gray-50/50 transition-all group">
                      <td className="px-6 py-5 whitespace-nowrap text-sm font-bold text-[#801818]">
                        {inscription.inscriptionCode}
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900 font-semibold text-lg">
                        {inscription.applicantName}
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-500 font-medium tracking-tight">
                        {inscription.nicheApplicationCode}
                      </td>
                      <td className="px-6 py-5 text-sm text-gray-600 max-w-xs">
                        <div className="truncate font-medium" title={inscription.deceasedNames?.join(', ')}>
                          {inscription.deceasedNames && inscription.deceasedNames.length > 0
                            ? inscription.deceasedNames.join(', ')
                            : '-'}
                        </div>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-500">
                        {new Date(inscription.createdDate).toLocaleDateString('en-SG', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-sm font-medium">
                        <div className="flex justify-center gap-3">
                          <button
                            onClick={() => handleEdit(inscription.id, inscription.inscriptionCode)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-all shadow-sm hover:shadow"
                            title="Edit Inscription"
                          >
                            <EditIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleGenerateAgreement(inscription.inscriptionCode)}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-xl transition-all shadow-sm hover:shadow"
                            title="View Agreement"
                          >
                            <FileTextIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(inscription.id)}
                            className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                            title="Delete"
                          >
                            <Trash2Icon className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Section */}
          {totalRecords > 0 && (
            <div className="bg-gray-50 px-6 py-6 flex flex-col md:flex-row items-center justify-between gap-4 border-t border-gray-100">
              <div className="flex-1">
                <p className="text-sm text-gray-700 font-medium">
                  Showing <span className="text-[#801818] font-bold">{(currentPage - 1) * recordsPerPage + 1}</span> to{' '}
                  <span className="text-[#801818] font-bold">{Math.min(currentPage * recordsPerPage, totalRecords)}</span> of{' '}
                  <span className="text-[#801818] font-bold">{totalRecords}</span> inscriptions
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-6">
                <nav className="relative z-0 inline-flex rounded-xl shadow-sm -space-x-px bg-white overflow-hidden border border-gray-200">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-4 py-2 text-gray-400 hover:bg-gray-50 disabled:opacity-30 transition-colors"
                  >
                    Previous
                  </button>

                  {Array.from({ length: Math.min(5, Math.ceil(totalRecords / recordsPerPage)) }, (_, i) => {
                    const pageNum = i + 1;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`px-5 py-2 text-sm font-bold border-x border-gray-50 transition-all ${currentPage === pageNum
                            ? 'bg-[#801818] text-white'
                            : 'text-gray-500 hover:bg-gray-50'
                          }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}

                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage * recordsPerPage >= totalRecords}
                    className="px-4 py-2 text-gray-400 hover:bg-gray-50 disabled:opacity-30 transition-colors"
                  >
                    Next
                  </button>
                </nav>

                <div className="flex items-center gap-3 bg-white px-3 py-1.5 rounded-xl border border-gray-200">
                  <span className="text-sm font-semibold text-gray-600">Rows</span>
                  <select
                    value={recordsPerPage}
                    onChange={(e) => handleRecordsPerPageChange(Number(e.target.value))}
                    className="bg-transparent border-none text-[#801818] font-bold text-sm focus:ring-0 cursor-pointer"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}