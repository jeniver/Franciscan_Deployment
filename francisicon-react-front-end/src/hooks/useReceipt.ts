import { useSelector, useDispatch } from 'react-redux';
import { useCallback, useMemo } from 'react';
import { RootState, AppDispatch } from '../store';
import {
  fetchReceiptByCode,
  createReceipt,
  createReceiptFromInvoice,
  fetchLastReceiptNumber,
  fetchLastMiscReceiptNumber,
  fetchReceiptReport,
  fetchGOAMonthlyList,
  fetchInscriptionMonthlyList,
  fetchWakeRoomMonthlyList,
  fetchReceiptsByDateRange,
  searchReceipts,
  fetchInvoiceByCode,
  fetchReceiptItems,
  setSelectedReceipt,
  setCurrentReceipt,
  setSelectedInvoice,
  setCurrentPage,
  setReceiptsPerPage,
  setFilters,
  clearFilters,
  clearError,
  resetReceiptState,
} from '../store/receiptSlice';
import type {
  CreateReceiptRequest,
  CreateReceiptFromInvoiceRequest,
  ReceiptQueryParams,
  ReceiptSearchParams,
} from '../services/receiptService';
import { receiptService } from '../services/receiptService';

export function useReceipt() {
  const dispatch = useDispatch<AppDispatch>();

  // Select state from Redux with safety checks
  const receipts = useSelector((state: RootState) => state.receipt?.receipts ?? []);
  const selectedReceipt = useSelector((state: RootState) => state.receipt?.selectedReceipt ?? null);
  const currentReceipt = useSelector((state: RootState) => state.receipt?.currentReceipt ?? null);
  const selectedInvoice = useSelector((state: RootState) => state.receipt?.selectedInvoice ?? null);
  const receiptReport = useSelector((state: RootState) => state.receipt?.receiptReport ?? null);
  const goaMonthlyList = useSelector((state: RootState) => state.receipt?.goaMonthlyList ?? null);
  const inscriptionMonthlyList = useSelector((state: RootState) => state.receipt?.inscriptionMonthlyList ?? null);
  const wakeRoomMonthlyList = useSelector((state: RootState) => state.receipt?.wakeRoomMonthlyList ?? null);
  const lastReceiptNumber = useSelector((state: RootState) => state.receipt?.lastReceiptNumber ?? null);
  const lastMiscReceiptNumber = useSelector((state: RootState) => state.receipt?.lastMiscReceiptNumber ?? null);
  const receiptItems = useSelector((state: RootState) => state.receipt?.receiptItems ?? []);
  const itemsLoading = useSelector((state: RootState) => state.receipt?.itemsLoading ?? false);
  const itemsError = useSelector((state: RootState) => state.receipt?.itemsError ?? null);
  const currentPage = useSelector((state: RootState) => state.receipt?.currentPage ?? 1);
  const receiptsPerPage = useSelector((state: RootState) => state.receipt?.receiptsPerPage ?? 50);
  const totalReceipts = useSelector((state: RootState) => state.receipt?.totalReceipts ?? 0);
  const totalPages = useSelector((state: RootState) => state.receipt?.totalPages ?? 0);
  const filters = useSelector((state: RootState) => state.receipt?.filters ?? {
    fromDate: null,
    toDate: null,
    searchTerm: '',
    receiptCode: '',
    customerName: '',
    paymentMode: null,
    applicationId: '',
    invoiceId: '',
  });
  const reportSummary = useSelector((state: RootState) => state.receipt?.reportSummary ?? null);
  const loading = useSelector((state: RootState) => state.receipt?.loading ?? false);
  const error = useSelector((state: RootState) => state.receipt?.error ?? null);
  const lastErrorType = useSelector((state: RootState) => state.receipt?.lastErrorType ?? null);
  const isDataLoaded = useSelector((state: RootState) => state.receipt?.isDataLoaded ?? false);
  const isCreating = useSelector((state: RootState) => state.receipt?.isCreating ?? false);
  const isFetchingReport = useSelector((state: RootState) => state.receipt?.isFetchingReport ?? false);
  const isFetchingMonthlyList = useSelector((state: RootState) => state.receipt?.isFetchingMonthlyList ?? false);

  // Action handlers
  const handleFetchReceiptByCode = useCallback(
    (code: string) => {
      dispatch(fetchReceiptByCode(code));
    },
    [dispatch]
  );

  const handleCreateReceipt = useCallback(
    (data: CreateReceiptRequest) => {
      return dispatch(createReceipt(data));
    },
    [dispatch]
  );

  const handleCreateReceiptFromInvoice = useCallback(
    (data: CreateReceiptFromInvoiceRequest) => {
      return dispatch(createReceiptFromInvoice(data));
    },
    [dispatch]
  );

  const handleFetchLastReceiptNumber = useCallback(() => {
    dispatch(fetchLastReceiptNumber());
  }, [dispatch]);

  const handleFetchLastMiscReceiptNumber = useCallback(() => {
    dispatch(fetchLastMiscReceiptNumber());
  }, [dispatch]);

  const handleFetchReceiptReport = useCallback(
    (fromDate: string, toDate: string) => {
      return dispatch(fetchReceiptReport({ fromDate, toDate }));
    },
    [dispatch]
  );

  const handleFetchGOAMonthlyList = useCallback(
    (fromDate: string, toDate: string) => {
      return dispatch(fetchGOAMonthlyList({ fromDate, toDate }));
    },
    [dispatch]
  );

  const handleFetchInscriptionMonthlyList = useCallback(
    (fromDate: string, toDate: string) => {
      return dispatch(fetchInscriptionMonthlyList({ fromDate, toDate }));
    },
    [dispatch]
  );

  const handleFetchWakeRoomMonthlyList = useCallback(
    (fromDate: string, toDate: string) => {
      return dispatch(fetchWakeRoomMonthlyList({ fromDate, toDate }));
    },
    [dispatch]
  );

  const handleFetchReceiptsByDateRange = useCallback(
    (params: ReceiptQueryParams = {}) => {
      return dispatch(fetchReceiptsByDateRange(params));
    },
    [dispatch]
  );

  const handleSearchReceipts = useCallback(
    (params: ReceiptSearchParams = {}) => {
      return dispatch(searchReceipts(params));
    },
    [dispatch]
  );

  const handleFetchInvoiceByCode = useCallback(
    (code: string) => {
      return dispatch(fetchInvoiceByCode(code));
    },
    [dispatch]
  );

  const handleFetchReceiptItems = useCallback(
    (receiptId: string | number, includeItemInfo: boolean = true) => {
      return dispatch(fetchReceiptItems({ receiptId, includeItemInfo }));
    },
    [dispatch]
  );

      const handleGetReceiptPdfLink = useCallback(
        async (code: string, openInNewTab: boolean = true, applicationCode?: string) => {
          try {
            return await receiptService.getReceiptPdfLink(code, openInNewTab, applicationCode);
          } catch (error: any) {
            throw error;
          }
        },
        []
      );

  const handleGetInvoicePdfLink = useCallback(
    async (code: string, openInNewTab: boolean = true, applicationCode?: string) => {
      try {
        return await receiptService.getInvoicePdfLink(code, openInNewTab, applicationCode);
      } catch (error: any) {
        throw error;
      }
    },
    []
  );

  const handleSetSelectedReceipt = useCallback(
    (receipt: typeof selectedReceipt) => {
      dispatch(setSelectedReceipt(receipt));
    },
    [dispatch]
  );

  const handleSetCurrentReceipt = useCallback(
    (receipt: typeof currentReceipt) => {
      dispatch(setCurrentReceipt(receipt));
    },
    [dispatch]
  );

  const handleSetSelectedInvoice = useCallback(
    (invoice: typeof selectedInvoice) => {
      dispatch(setSelectedInvoice(invoice));
    },
    [dispatch]
  );

  const handleSetCurrentPage = useCallback(
    (page: number) => {
      dispatch(setCurrentPage(page));
    },
    [dispatch]
  );

  const handleSetReceiptsPerPage = useCallback(
    (limit: number) => {
      dispatch(setReceiptsPerPage(limit));
    },
    [dispatch]
  );

  const handleSetFilters = useCallback(
    (newFilters: Partial<typeof filters>) => {
      dispatch(setFilters(newFilters));
    },
    [dispatch, filters]
  );

  const handleClearFilters = useCallback(() => {
    dispatch(clearFilters());
  }, [dispatch]);

  const handleClearError = useCallback(() => {
    dispatch(clearError());
  }, [dispatch]);

  const handleResetReceiptState = useCallback(() => {
    dispatch(resetReceiptState());
  }, [dispatch]);

  const totalAmount = useMemo(() => {
    if (!Array.isArray(receipts)) return 0;
    return receipts.reduce((sum, receipt) => sum + (receipt.totalAmount || 0), 0);
  }, [receipts]);

  const pendingReceipts = useMemo(() => {
    if (!Array.isArray(receipts)) return [];
    return receipts.filter((r) => (r.payingAmount || 0) < (r.totalAmount || 0));
  }, [receipts]);

  return {
    // State
    receipts,
    selectedReceipt,
    currentReceipt,
    selectedInvoice,
    receiptReport,
    goaMonthlyList,
    inscriptionMonthlyList,
    wakeRoomMonthlyList,
    lastReceiptNumber,
    lastMiscReceiptNumber,
    receiptItems,
    itemsLoading,
    itemsError,
    currentPage,
    receiptsPerPage,
    totalReceipts,
    totalPages,
    filters,
    reportSummary,
    loading,
    error,
    lastErrorType,
    isDataLoaded,
    isCreating,
    isFetchingReport,
    isFetchingMonthlyList,
    totalAmount,
    pendingReceipts,
    // Actions
    fetchReceiptByCode: handleFetchReceiptByCode,
    createReceipt: handleCreateReceipt,
    createReceiptFromInvoice: handleCreateReceiptFromInvoice,
    fetchLastReceiptNumber: handleFetchLastReceiptNumber,
    fetchLastMiscReceiptNumber: handleFetchLastMiscReceiptNumber,
    fetchReceiptReport: handleFetchReceiptReport,
    fetchGOAMonthlyList: handleFetchGOAMonthlyList,
    fetchInscriptionMonthlyList: handleFetchInscriptionMonthlyList,
    fetchWakeRoomMonthlyList: handleFetchWakeRoomMonthlyList,
    fetchReceiptsByDateRange: handleFetchReceiptsByDateRange,
    searchReceipts: handleSearchReceipts,
    fetchInvoiceByCode: handleFetchInvoiceByCode,
    fetchReceiptItems: handleFetchReceiptItems,
    getReceiptPdfLink: handleGetReceiptPdfLink,
    getInvoicePdfLink: handleGetInvoicePdfLink,
    setSelectedReceipt: handleSetSelectedReceipt,
    setCurrentReceipt: handleSetCurrentReceipt,
    setSelectedInvoice: handleSetSelectedInvoice,
    setCurrentPage: handleSetCurrentPage,
    setReceiptsPerPage: handleSetReceiptsPerPage,
    setFilters: handleSetFilters,
    clearFilters: handleClearFilters,
    clearError: handleClearError,
    resetReceiptState: handleResetReceiptState,
  };
}

