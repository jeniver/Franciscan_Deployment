import { useState, useCallback, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { invoiceService, InvoiceListItem, InvoiceSearchParams, InvoiceListResponse } from '../services/invoiceService';
import { useToast } from '../contexts/ToastContext';

export function useInvoice() {
  const dispatch = useDispatch<AppDispatch>();
  const { showError } = useToast();

  const [invoices, setInvoices] = useState<InvoiceListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [filters, setFilters] = useState<InvoiceSearchParams>({
    page: 1,
    limit: 20,
    sortBy: 'TransactionDate',
    sortOrder: 'desc',
  });

  const searchInvoices = useCallback(async (searchParams: InvoiceSearchParams = {}) => {
    setLoading(true);
    setError(null);

    try {
      const params = { ...filters, ...searchParams };
      const result = await invoiceService.searchInvoices(params);
      
      setInvoices(result.invoices);
      setPagination(result.pagination);
      setFilters(params);
      
      return result;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to search invoices';
      setError(errorMessage);
      showError('Error', errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [filters, showError]);

  const updateFilters = useCallback((newFilters: Partial<InvoiceSearchParams>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  const clearFilters = useCallback(() => {
    const defaultFilters: InvoiceSearchParams = {
      page: 1,
      limit: 20,
      sortBy: 'TransactionDate',
      sortOrder: 'desc',
    };
    setFilters(defaultFilters);
  }, []);

  const setPage = useCallback((page: number) => {
    setFilters(prev => ({ ...prev, page }));
  }, []);

  return {
    invoices,
    loading,
    error,
    pagination,
    filters,
    searchInvoices,
    updateFilters,
    clearFilters,
    setPage,
  };
}

