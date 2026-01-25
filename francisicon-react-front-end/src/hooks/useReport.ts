import { useSelector, useDispatch } from 'react-redux';
import { useCallback } from 'react';
import { RootState, AppDispatch } from '../store';
import {
  fetchAvailableReports,
  generateInvoiceReceiptReport,
  generateInscriptionReport,
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
  clearError,
  clearReportsError,
  clearReportHistory,
} from '../store/reportSlice';
import type {
  MonthlyReportParams,
  InvoiceReceiptReportParams,
  ChapelReportParams,
} from '../services/reportService';

export function useReport() {
  const dispatch = useDispatch<AppDispatch>();

  // Select state from Redux
  const availableReports = useSelector((state: RootState) => state.report?.availableReports ?? []);
  const loadingReports = useSelector((state: RootState) => state.report?.loadingReports ?? false);
  const reportsError = useSelector((state: RootState) => state.report?.reportsError ?? null);
  const generatingReport = useSelector((state: RootState) => state.report?.generatingReport ?? false);
  const reportError = useSelector((state: RootState) => state.report?.reportError ?? null);
  const lastErrorType = useSelector((state: RootState) => state.report?.lastErrorType ?? null);
  const reportHistory = useSelector((state: RootState) => state.report?.reportHistory ?? []);

  // Action handlers
  const handleFetchAvailableReports = useCallback(() => {
    dispatch(fetchAvailableReports());
  }, [dispatch]);

  const handleGenerateInvoiceReceiptReport = useCallback(
    async (params: InvoiceReceiptReportParams) => {
      const result = await dispatch(generateInvoiceReceiptReport(params));
      if (generateInvoiceReceiptReport.fulfilled.match(result)) {
        return result.payload.blob;
      }
      throw result;
    },
    [dispatch]
  );

  const handleGenerateInscriptionReport = useCallback(
    async (insCode: string) => {
      const result = await dispatch(generateInscriptionReport(insCode));
      if (generateInscriptionReport.fulfilled.match(result)) {
        return result.payload.blob;
      }
      throw result;
    },
    [dispatch]
  );

  const handleGenerateMonthlyReceiptsReport = useCallback(
    async (params: MonthlyReportParams) => {
      const result = await dispatch(generateMonthlyReceiptsReport(params));
      if (generateMonthlyReceiptsReport.fulfilled.match(result)) {
        return result.payload.blob;
      }
      throw result;
    },
    [dispatch]
  );

  const handleGenerateMonthlyInscriptionsReport = useCallback(
    async (params: MonthlyReportParams) => {
      const result = await dispatch(generateMonthlyInscriptionsReport(params));
      if (generateMonthlyInscriptionsReport.fulfilled.match(result)) {
        return result.payload.blob;
      }
      throw result;
    },
    [dispatch]
  );

  const handleGenerateMonthlyWakeRoomsReport = useCallback(
    async (params: MonthlyReportParams) => {
      const result = await dispatch(generateMonthlyWakeRoomsReport(params));
      if (generateMonthlyWakeRoomsReport.fulfilled.match(result)) {
        return result.payload.blob;
      }
      throw result;
    },
    [dispatch]
  );

  const handleGenerateMonthlyGOAReport = useCallback(
    async (params: MonthlyReportParams) => {
      const result = await dispatch(generateMonthlyGOAReport(params));
      if (generateMonthlyGOAReport.fulfilled.match(result)) {
        return result.payload.blob;
      }
      throw result;
    },
    [dispatch]
  );

  const handleGenerateNichesSoldToBothReport = useCallback(
    async () => {
      const result = await dispatch(generateNichesSoldToBothReport());
      if (generateNichesSoldToBothReport.fulfilled.match(result)) {
        return result.payload.blob;
      }
      throw result;
    },
    [dispatch]
  );

  const handleGenerateNichesSoldToCatholicReport = useCallback(
    async () => {
      const result = await dispatch(generateNichesSoldToCatholicReport());
      if (generateNichesSoldToCatholicReport.fulfilled.match(result)) {
        return result.payload.blob;
      }
      throw result;
    },
    [dispatch]
  );

  const handleGenerateNichesSoldToNonCatholicReport = useCallback(
    async () => {
      const result = await dispatch(generateNichesSoldToNonCatholicReport());
      if (generateNichesSoldToNonCatholicReport.fulfilled.match(result)) {
        return result.payload.blob;
      }
      throw result;
    },
    [dispatch]
  );

  const handleGenerateRenewalNichesReport = useCallback(
    async () => {
      const result = await dispatch(generateRenewalNichesReport());
      if (generateRenewalNichesReport.fulfilled.match(result)) {
        return result.payload.blob;
      }
      throw result;
    },
    [dispatch]
  );

  const handleGenerateSameAddressNichesReport = useCallback(
    async () => {
      const result = await dispatch(generateSameAddressNichesReport());
      if (generateSameAddressNichesReport.fulfilled.match(result)) {
        return result.payload.blob;
      }
      throw result;
    },
    [dispatch]
  );

  const handleGenerateChapelLevelReport = useCallback(
    async (params: ChapelReportParams) => {
      const result = await dispatch(generateChapelLevelReport(params));
      if (generateChapelLevelReport.fulfilled.match(result)) {
        return result.payload.blob;
      }
      throw result;
    },
    [dispatch]
  );

  const handleGenerateChapelMonthReport = useCallback(
    async (params: ChapelReportParams) => {
      const result = await dispatch(generateChapelMonthReport(params));
      if (generateChapelMonthReport.fulfilled.match(result)) {
        return result.payload.blob;
      }
      throw result;
    },
    [dispatch]
  );

  const handleGenerateChapelVacancyReport = useCallback(
    async (chapel: string) => {
      const result = await dispatch(generateChapelVacancyReport(chapel));
      if (generateChapelVacancyReport.fulfilled.match(result)) {
        return result.payload.blob;
      }
      throw result;
    },
    [dispatch]
  );

  const handleGenerateBeneficiariesListReport = useCallback(
    async () => {
      const result = await dispatch(generateBeneficiariesListReport());
      if (generateBeneficiariesListReport.fulfilled.match(result)) {
        return result.payload.blob;
      }
      throw result;
    },
    [dispatch]
  );

  const handleGenerateGSTReport = useCallback(
    async (params: MonthlyReportParams) => {
      const result = await dispatch(generateGSTReport(params));
      if (generateGSTReport.fulfilled.match(result)) {
        return result.payload.blob;
      }
      throw result;
    },
    [dispatch]
  );

  const handleClearError = useCallback(() => {
    dispatch(clearError());
  }, [dispatch]);

  const handleClearReportsError = useCallback(() => {
    dispatch(clearReportsError());
  }, [dispatch]);

  const handleClearReportHistory = useCallback(() => {
    dispatch(clearReportHistory());
  }, [dispatch]);

  return {
    // State
    availableReports,
    loadingReports,
    reportsError,
    generatingReport,
    reportError,
    lastErrorType,
    reportHistory,
    // Actions
    fetchAvailableReports: handleFetchAvailableReports,
    generateInvoiceReceiptReport: handleGenerateInvoiceReceiptReport,
    generateInscriptionReport: handleGenerateInscriptionReport,
    generateMonthlyReceiptsReport: handleGenerateMonthlyReceiptsReport,
    generateMonthlyInscriptionsReport: handleGenerateMonthlyInscriptionsReport,
    generateMonthlyWakeRoomsReport: handleGenerateMonthlyWakeRoomsReport,
    generateMonthlyGOAReport: handleGenerateMonthlyGOAReport,
    generateNichesSoldToBothReport: handleGenerateNichesSoldToBothReport,
    generateNichesSoldToCatholicReport: handleGenerateNichesSoldToCatholicReport,
    generateNichesSoldToNonCatholicReport: handleGenerateNichesSoldToNonCatholicReport,
    generateRenewalNichesReport: handleGenerateRenewalNichesReport,
    generateSameAddressNichesReport: handleGenerateSameAddressNichesReport,
    generateChapelLevelReport: handleGenerateChapelLevelReport,
    generateChapelMonthReport: handleGenerateChapelMonthReport,
    generateChapelVacancyReport: handleGenerateChapelVacancyReport,
    generateBeneficiariesListReport: handleGenerateBeneficiariesListReport,
    generateGSTReport: handleGenerateGSTReport,
    clearError: handleClearError,
    clearReportsError: handleClearReportsError,
    clearReportHistory: handleClearReportHistory,
  };
}

