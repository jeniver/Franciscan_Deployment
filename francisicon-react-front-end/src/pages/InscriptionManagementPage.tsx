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

const DEFAULT_SORT_BY = 'CreatedOn';
const DEFAULT_SORT_ORDER: 'asc' | 'desc' = 'desc';

export function InscriptionManagementPage() {
  const navigate = useNavigate();
  const { showError } = useToast();

  // State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inscriptions, setInscriptions] = useState<InscriptionRecord[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(10);
  
  // Search filters
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Fetch inscriptions
  const fetchInscriptions = useCallback(async () => {
    setLoading(true);
    setError(null);
    
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
        deceasedCount: record.deceasedDetails?.length || 0
      }));
      
      setInscriptions(mappedInscriptions);
      setTotalRecords(result.total);
      setCurrentPage(result.page);
      
    } catch (err: any) {
      setError(err.message || 'Failed to fetch inscriptions');
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

  const handleView = (id: number) => {
    navigate(`/inscriptions/${id}`);
  };

  const handleDelete = (id: number) => {
    if (window.confirm('Are you sure you want to delete this inscription?')) {
      // TODO: Implement delete functionality
      console.log('Delete inscription:', id);
    }
  };

  const handleGenerateAgreement = (id: number) => {
    // Navigate to inscription agreement viewer
    navigate(`/inscription-agreement/INCR-${id}`);
  };

  // Compute totals
  const totalDeceased = useMemo(() => 
    inscriptions.reduce((sum, inscription) => sum + inscription.deceasedCount, 0),
    [inscriptions]
  );

  return (
    <Layout title="Inscription Management">
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Inscription Management</h1>
          <p className="text-gray-600">Manage and search inscription requests</p>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Inscription code, applicant name..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <SearchIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <DateInput
                value={startDate}
                onChange={setStartDate}
                placeholder="From date"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <DateInput
                value={endDate}
                onChange={setEndDate}
                placeholder="To date"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="All">All Statuses</option>
                <option value="Draft">Draft</option>
                <option value="Pending">Pending</option>
                <option value="Confirmed">Confirmed</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleSearch}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <SearchIcon className="h-4 w-4 mr-2" />
              Search
            </button>
            
            <button
              onClick={handleClearFilters}
              className="flex items-center px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
            >
              <FilterIcon className="h-4 w-4 mr-2" />
              Clear Filters
            </button>
            
            <button
              onClick={() => navigate('/inscriptions/new')}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              New Inscription
            </button>
          </div>
        </div>

        {/* Results Summary */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex flex-wrap gap-6">
            <div>
              <span className="text-sm text-gray-600">Total Records:</span>
              <span className="ml-2 font-semibold">{totalRecords}</span>
            </div>
            <div>
              <span className="text-sm text-gray-600">Current Page:</span>
              <span className="ml-2 font-semibold">{currentPage}</span>
            </div>
            <div>
              <span className="text-sm text-gray-600">Total Deceased:</span>
              <span className="ml-2 font-semibold">{totalDeceased}</span>
            </div>
          </div>
        </div>

        {/* Results Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Inscription Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Applicant Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Niche Application
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Deceased Names
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading && inscriptions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <div className="flex justify-center items-center">
                        <div className="text-lg text-gray-600 flex items-center gap-2">
                          <LoaderIcon className="animate-spin h-5 w-5" />
                          Loading...
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : inscriptions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      <SearchIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                      <p>No inscriptions found</p>
                      <p className="mt-1">Try adjusting your search criteria or filters.</p>
                    </td>
                  </tr>
                ) : (
                  inscriptions.map((inscription) => (
                    <tr key={inscription.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                        {inscription.inscriptionCode}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {inscription.applicantName || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {inscription.nicheApplicationCode || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 max-w-xs">
                        <div className="truncate" title={inscription.deceasedNames && inscription.deceasedNames.length > 0 ? inscription.deceasedNames.join(', ') : 'No deceased names'}>
                          {inscription.deceasedNames && inscription.deceasedNames.length > 0 ? inscription.deceasedNames.join(', ') : '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(inscription.createdDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleView(inscription.id)}
                            className="text-blue-600 hover:text-blue-900"
                            title="View"
                          >
                            <EyeIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleEdit(inscription.id, inscription.inscriptionCode)}
                            className="text-indigo-600 hover:text-indigo-900"
                            title="Edit"
                          >
                            <EditIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleGenerateAgreement(inscription.id)}
                            className="text-green-600 hover:text-green-900"
                            title="Generate Agreement"
                          >
                            <FileTextIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(inscription.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Delete"
                          >
                            <Trash2Icon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalRecords > 0 && (
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage * recordsPerPage >= totalRecords}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Showing <span className="font-medium">{(currentPage - 1) * recordsPerPage + 1}</span> to{' '}
                    <span className="font-medium">{Math.min(currentPage * recordsPerPage, totalRecords)}</span> of{' '}
                    <span className="font-medium">{totalRecords}</span> results
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Previous
                    </button>
                    
                    {/* Page numbers */}
                    {Array.from({ length: Math.min(5, Math.ceil(totalRecords / recordsPerPage)) }, (_, i) => {
                      const pageNum = i + 1;
                      return (
                        <button
                          key={pageNum}
                          onClick={() => handlePageChange(pageNum)}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                            currentPage === pageNum
                              ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                              : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                    
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage * recordsPerPage >= totalRecords}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Next
                    </button>
                  </nav>
                </div>
                <div className="ml-4">
                  <label className="text-sm text-gray-700 mr-2">Records per page:</label>
                  <select
                    value={recordsPerPage}
                    onChange={(e) => handleRecordsPerPageChange(Number(e.target.value))}
                    className="border border-gray-300 rounded-md px-2 py-1 text-sm"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
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