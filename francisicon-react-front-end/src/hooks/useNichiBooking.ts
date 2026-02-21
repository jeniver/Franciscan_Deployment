import { useSelector, useDispatch } from 'react-redux';
import { useCallback } from 'react';
import { RootState, AppDispatch } from '../store';
import {
  setInvoiceNumber,
  setPaymentMode,
  setNichiQuantity,
  setNichiUnitPrice,
  setRefDocNumber,
  setLineTaxPercent,
  setItemId,
  setRemarks,
  setDeceasedDetails,
  addDeceasedDetail,
  removeDeceasedDetail,
  updateDeceasedDetail,
  setSelectedBibleChoiceId,
  setPhraseOfChoice,
  setCrossType,
  setNicheId,
  setNicheCode,
  setNicheNumber,
  setChapelId,
  setChapelCode,
  setChapelName,
  setWallId,
  setWallCode,
  setWallName,
  setRowId,
  setRowCode,
  setRowNumber,
  setRowLevel,
  clearError,
  clearInvoiceResult,
  clearApplicationResult,
  clearLoadedApplication,
  resetForm,
  createNichiBookingInvoice,
  createNichiApplication,
  loadNichiApplication,
  type DeceasedDetail,
} from '../store/nichibookingSlice';
import { mapNichiApplicationToFormData } from '../utils/nicheApplicationMapper';
import { useToast } from '../contexts/ToastContext';
import { resetNicheState } from '../store/nicheSlice';

export function useNichiBooking() {
  const dispatch: AppDispatch = useDispatch();
  const { showSuccess, showError } = useToast();

  // Select state from Redux
  const invoiceNumber = useSelector((state: RootState) => state.nichibooking.invoiceNumber);
  const paymentMode = useSelector((state: RootState) => state.nichibooking.paymentMode);
  const nichiQuantity = useSelector((state: RootState) => state.nichibooking.nichiQuantity);
  const nichiUnitPrice = useSelector((state: RootState) => state.nichibooking.nichiUnitPrice);
  const refDocNumber = useSelector((state: RootState) => state.nichibooking.refDocNumber);
  const lineTaxPercent = useSelector((state: RootState) => state.nichibooking.lineTaxPercent);
  const itemId = useSelector((state: RootState) => state.nichibooking.itemId);
  const remarks = useSelector((state: RootState) => state.nichibooking.remarks);

  const creatingInvoice = useSelector((state: RootState) => state.nichibooking.creatingInvoice);
  const invoiceError = useSelector((state: RootState) => state.nichibooking.invoiceError);
  const createdInvoice = useSelector((state: RootState) => state.nichibooking.createdInvoice);
  const creatingApplication = useSelector((state: RootState) => state.nichibooking.creatingApplication);
  const applicationError = useSelector((state: RootState) => state.nichibooking.applicationError);
  const createdApplication = useSelector((state: RootState) => state.nichibooking.createdApplication);
  const loadingApplication = useSelector((state: RootState) => state.nichibooking.loadingApplication);
  const loadApplicationError = useSelector((state: RootState) => state.nichibooking.loadApplicationError);
  const loadedApplication = useSelector((state: RootState) => state.nichibooking.loadedApplication);
  const loading = useSelector((state: RootState) => state.nichibooking.loading);
  const error = useSelector((state: RootState) => state.nichibooking.error);
  const lastErrorType = useSelector((state: RootState) => state.nichibooking.lastErrorType);

  // Deceased Details and Additional Details (optional fields)
  const deceasedDetails = useSelector((state: RootState) => state.nichibooking.deceasedDetails);
  const selectedBibleChoiceId = useSelector((state: RootState) => state.nichibooking.selectedBibleChoiceId);
  const phraseOfChoice = useSelector((state: RootState) => state.nichibooking.phraseOfChoice);
  const crossType = useSelector((state: RootState) => state.nichibooking.crossType);

  // Niche details (optional fields)
  const nicheId = useSelector((state: RootState) => state.nichibooking.nicheId);
  const nicheNumber = useSelector((state: RootState) => state.nichibooking.nicheNumber);
  const nicheCode = useSelector((state: RootState) => state.nichibooking.nicheCode);
  const chapelId = useSelector((state: RootState) => state.nichibooking.chapelId);
  const chapelCode = useSelector((state: RootState) => state.nichibooking.chapelCode);
  const chapelName = useSelector((state: RootState) => state.nichibooking.chapelName);
  const wallId = useSelector((state: RootState) => state.nichibooking.wallId);
  const wallCode = useSelector((state: RootState) => state.nichibooking.wallCode);
  const wallName = useSelector((state: RootState) => state.nichibooking.wallName);
  const rowId = useSelector((state: RootState) => state.nichibooking.rowId);
  const rowCode = useSelector((state: RootState) => state.nichibooking.rowCode);
  const rowNumber = useSelector((state: RootState) => state.nichibooking.rowNumber);
  const rowLevel = useSelector((state: RootState) => state.nichibooking.rowLevel);

  // Form field setters
  const updateInvoiceNumber = useCallback((value: string) => {
    dispatch(setInvoiceNumber(value));
  }, [dispatch]);

  const updatePaymentMode = useCallback((value: string) => {
    dispatch(setPaymentMode(value));
  }, [dispatch]);

  const updateNichiQuantity = useCallback((value: number) => {
    dispatch(setNichiQuantity(value));
  }, [dispatch]);

  const updateNichiUnitPrice = useCallback((value: number) => {
    dispatch(setNichiUnitPrice(value));
  }, [dispatch]);

  const updateRefDocNumber = useCallback((value: string) => {
    dispatch(setRefDocNumber(value));
  }, [dispatch]);

  const updateLineTaxPercent = useCallback((value: number) => {
    dispatch(setLineTaxPercent(value));
  }, [dispatch]);

  const updateItemId = useCallback((value: number) => {
    dispatch(setItemId(value));
  }, [dispatch]);

  const updateRemarks = useCallback((value: string) => {
    dispatch(setRemarks(value));
  }, [dispatch]);

  // Deceased Details handlers
  const updateDeceasedDetails = useCallback((details: DeceasedDetail[]) => {
    dispatch(setDeceasedDetails(details));
  }, [dispatch]);

  const addDeceased = useCallback((detail: DeceasedDetail) => {
    dispatch(addDeceasedDetail(detail));
  }, [dispatch]);

  const removeDeceased = useCallback((index: number) => {
    dispatch(removeDeceasedDetail(index));
  }, [dispatch]);

  const updateDeceased = useCallback((index: number, detail: Partial<DeceasedDetail>) => {
    dispatch(updateDeceasedDetail({ index, detail }));
  }, [dispatch]);

  // Additional Details handlers
  const updateSelectedBibleChoice = useCallback((choiceId: number | null) => {
    dispatch(setSelectedBibleChoiceId(choiceId));
  }, [dispatch]);

  const updatePhraseOfChoice = useCallback((phrase: string) => {
    dispatch(setPhraseOfChoice(phrase));
  }, [dispatch]);

  const updateCrossType = useCallback((crossType: string) => {
    dispatch(setCrossType(crossType));
  }, [dispatch]);

  /**
   * View/Load a Nichi application by application code
   * This loads an existing application and populates all form fields
   * CRITICAL: Resets niche state before loading new application
   * 
   * @param applicationCode - The application code/number to load
   * @returns Loaded application data
   */
  const handleViewNichiApplication = useCallback(
    async (applicationCode: string) => {
      try {
        if (!applicationCode || !applicationCode.trim()) {
          throw new Error('Application code is required');
        }

        // CRITICAL: Reset all niche-related state before loading new application
        // This ensures previous niche selection doesn't persist
        // Always reset regardless of current values
        
        // Reset nichibookingSlice niche fields
        dispatch(setNicheId(undefined as any));
        dispatch(setNicheCode(''));
        dispatch(setNicheNumber(''));
        dispatch(setChapelId(undefined as any));
        dispatch(setChapelCode(''));
        dispatch(setChapelName(''));
        dispatch(setWallId(undefined as any));
        dispatch(setWallCode(''));
        dispatch(setWallName(''));
        dispatch(setRowId(undefined as any));
        dispatch(setRowCode(''));
        dispatch(setRowNumber(''));
        dispatch(setRowLevel(''));

        // CRITICAL: Reset nicheSlice state (used by NicheDetails component for "Select Niche" grid)
        // This clears selectedNiches, walls, chapel, etc. to prevent showing previous application's niche selection
        dispatch(resetNicheState());

        // Load the application
        const result = await dispatch(loadNichiApplication(applicationCode.trim())).unwrap();

        // Map the loaded application data to form fields
        const formData = mapNichiApplicationToFormData(result);

        // Update all form fields with loaded data
        if (formData.invoiceNumber) updateInvoiceNumber(formData.invoiceNumber);
        if (formData.paymentMode) updatePaymentMode(formData.paymentMode);
        if (formData.nichiQuantity !== undefined) updateNichiQuantity(formData.nichiQuantity);
        if (formData.nichiUnitPrice !== undefined) updateNichiUnitPrice(formData.nichiUnitPrice);
        if (formData.refDocNumber) updateRefDocNumber(formData.refDocNumber);
        if (formData.lineTaxPercent !== undefined) updateLineTaxPercent(formData.lineTaxPercent);
        if (formData.itemId !== undefined) updateItemId(formData.itemId);

        // Update niche details - CRITICAL: This replaces previous niche selection
        if (formData.nicheId !== undefined) dispatch(setNicheId(formData.nicheId));
        if (formData.nicheCode) dispatch(setNicheCode(formData.nicheCode));
        if (formData.nicheNumber) dispatch(setNicheNumber(formData.nicheNumber));
        if (formData.chapelId !== undefined) dispatch(setChapelId(formData.chapelId));
        if (formData.chapelCode) dispatch(setChapelCode(formData.chapelCode));
        if (formData.chapelName) dispatch(setChapelName(formData.chapelName));
        if (formData.wallId !== undefined) dispatch(setWallId(formData.wallId));
        if (formData.wallCode) dispatch(setWallCode(formData.wallCode));
        if (formData.wallName) dispatch(setWallName(formData.wallName));
        if (formData.rowId !== undefined) dispatch(setRowId(formData.rowId));
        if (formData.rowCode) dispatch(setRowCode(formData.rowCode));
        if (formData.rowNumber) dispatch(setRowNumber(formData.rowNumber));
        if (formData.rowLevel) dispatch(setRowLevel(formData.rowLevel));

        // Update deceased details
        if (formData.deceasedDetails) {
          updateDeceasedDetails(formData.deceasedDetails);
        }

        // Update additional details
        if (formData.selectedBibleChoiceId !== undefined) {
          updateSelectedBibleChoice(formData.selectedBibleChoiceId);
        }
        if (formData.phraseOfChoice) {
          updatePhraseOfChoice(formData.phraseOfChoice);
        }
        if (formData.crossType) {
          updateCrossType(formData.crossType);
        }

        showSuccess('Success', `Application ${applicationCode} loaded successfully`);
        return result;
      } catch (error: any) {
        const errorMessage = error?.message || 'Failed to load Nichi application';
        showError('Error', errorMessage);
        throw error;
      }
    },
    [
      dispatch,
      updateInvoiceNumber,
      updatePaymentMode,
      updateNichiQuantity,
      updateNichiUnitPrice,
      updateRefDocNumber,
      updateLineTaxPercent,
      updateItemId,
      updateDeceasedDetails,
      updateSelectedBibleChoice,
      updatePhraseOfChoice,
      updateCrossType,
      showSuccess,
      showError,
    ]
  );

  /**
   * Create a Nichi application with full structure
   * This will create a complete application following the niche agreement structure
   * 
   * @param params - Optional parameters to override state values
   * @returns Created application data
   */
  const handleCreateNichiApplication = useCallback(
    async (params?: Record<string, any>) => {
      try {
        // Get all form data from Redux state including niche details
        const formData = {
          invoiceNumber: params?.invoiceNumber || invoiceNumber,
          paymentMode: params?.paymentMode || paymentMode,
          nichiQuantity: params?.nichiQuantity ?? nichiQuantity,
          nichiUnitPrice: params?.nichiUnitPrice ?? nichiUnitPrice,
          refDocNumber: params?.refDocNumber || refDocNumber,
          lineTaxPercent: params?.lineTaxPercent ?? lineTaxPercent,
          itemId: params?.itemId ?? itemId,
          remarks: params?.remarks ?? remarks,
          // Niche details
          nicheId: params?.nicheId ?? nicheId,
          nicheNumber: params?.nicheNumber || nicheNumber,
          nicheCode: params?.nicheCode || nicheCode,
          chapelId: params?.chapelId ?? chapelId,
          chapelCode: params?.chapelCode || chapelCode,
          chapelName: params?.chapelName || chapelName,
          wallId: params?.wallId ?? wallId,
          wallCode: params?.wallCode || wallCode,
          wallName: params?.wallName || wallName,
          rowId: params?.rowId ?? rowId,
          rowCode: params?.rowCode || rowCode,
          rowNumber: params?.rowNumber || rowNumber,
          rowLevel: params?.rowLevel ?? rowLevel,
          // Deceased and additional details
          deceasedDetails,
          selectedBibleChoiceId,
          phraseOfChoice,
          crossType,
          ...params, // Allow overriding any field (params take precedence)
        };

        // Validate required fields
        if (!formData.invoiceNumber || formData.invoiceNumber.trim() === '') {
          throw new Error('Invoice number is required');
        }

        if (!formData.refDocNumber || formData.refDocNumber.trim() === '') {
          throw new Error('Reference document number is required');
        }

        if (formData.nichiQuantity <= 0) {
          throw new Error('Quantity must be greater than 0');
        }

        if (formData.nichiUnitPrice < 0) {
          throw new Error('Unit price cannot be negative');
        }

        const result = await dispatch(createNichiApplication(formData)).unwrap();

        // Auto-confirm booking so application moves from Draft(1) to Booked(3)
        const appCode = result?.applicationCode || result?.code || (result as any)?.applicationNumber || formData.refDocNumber;
        console.log('[handleCreateNichiApplication] Attempting auto-confirm for:', appCode, 'result keys:', result ? Object.keys(result) : 'null');
        try {
          const { confirmBookingService } = await import('../services/confirmBookingService');
          await confirmBookingService.confirmBooking(appCode);
          showSuccess('Success', `Application created and booking confirmed: ${appCode}`);
        } catch (confirmErr: any) {
          console.error('[handleCreateNichiApplication] Auto-confirm failed:', confirmErr?.message || confirmErr);
          showSuccess('Success', `Application created: ${appCode} (confirm booking manually if needed)`);
        }

        return result;
      } catch (error: any) {
        const errorMessage = error?.message || 'Failed to create Nichi application';
        showError('Error', errorMessage);
        throw error;
      }
    },
    [
      dispatch,
      invoiceNumber,
      paymentMode,
      nichiQuantity,
      nichiUnitPrice,
      refDocNumber,
      lineTaxPercent,
      itemId,
      remarks,
      nicheId,
      nicheNumber,
      nicheCode,
      chapelId,
      chapelCode,
      chapelName,
      wallId,
      wallCode,
      wallName,
      rowId,
      rowCode,
      rowNumber,
      rowLevel,
      deceasedDetails,
      selectedBibleChoiceId,
      phraseOfChoice,
      crossType,
      showSuccess,
      showError,
    ]
  );

  /**
   * Create a Nichi booking invoice
   * This will create an invoice with the specified parameters following the NAPP format
   * 
   * @param params - Optional parameters to override state values
   * @returns Created invoice data
   */
  const handleCreateNichiBookingInvoice = useCallback(
    async (params?: {
      invoiceNumber?: string;
      paymentMode?: string;
      quantity?: number;
      unitAmount?: number;
      refDocNumber?: string;
      itemId?: number;
      lineTaxPercent?: number;
    }) => {
      try {
        // Use provided params or fall back to state values
        const invoiceNum = params?.invoiceNumber || invoiceNumber;
        const payment = params?.paymentMode || paymentMode;
        const quantity = params?.quantity ?? nichiQuantity;
        const unitAmount = params?.unitAmount ?? nichiUnitPrice;
        const refDoc = params?.refDocNumber || refDocNumber;
        const item = params?.itemId ?? itemId;
        const taxPercent = params?.lineTaxPercent ?? lineTaxPercent;

        // Validate required fields
        if (!invoiceNum || invoiceNum.trim() === '') {
          throw new Error('Invoice number is required');
        }

        if (!payment || payment.trim() === '') {
          throw new Error('Payment mode is required');
        }

        if (quantity <= 0) {
          throw new Error('Quantity must be greater than 0');
        }

        if (unitAmount < 0) {
          throw new Error('Unit amount cannot be negative');
        }

        if (!refDoc || refDoc.trim() === '') {
          throw new Error('Reference document number is required');
        }

        const result = await dispatch(
          createNichiBookingInvoice({
            invoiceNumber: invoiceNum,
            paymentMode: payment,
            quantity,
            unitAmount,
            refDocNumber: refDoc,
            itemId: item,
            lineTaxPercent: taxPercent,
          })
        ).unwrap();

        showSuccess('Success', `Nichi booking invoice created successfully: ${result.invoiceCode || invoiceNum}`);
        return result;
      } catch (error: any) {
        const errorMessage = error?.message || 'Failed to create Nichi booking invoice';
        showError('Error', errorMessage);
        throw error;
      }
    },
    [
      dispatch,
      invoiceNumber,
      paymentMode,
      nichiQuantity,
      nichiUnitPrice,
      refDocNumber,
      itemId,
      lineTaxPercent,
      showSuccess,
      showError,
    ]
  );

  // Clear errors
  const handleClearError = useCallback(() => {
    dispatch(clearError());
  }, [dispatch]);

  // Clear invoice result
  const handleClearInvoiceResult = useCallback(() => {
    dispatch(clearInvoiceResult());
  }, [dispatch]);

  // Clear application result
  const handleClearApplicationResult = useCallback(() => {
    dispatch(clearApplicationResult());
  }, [dispatch]);

  // Clear loaded application
  const handleClearLoadedApplication = useCallback(() => {
    dispatch(clearLoadedApplication());
  }, [dispatch]);

  // Reset form
  const handleResetForm = useCallback(() => {
    dispatch(resetForm());
    // Also reset nicheSlice state to clear niche selection grid
    dispatch(resetNicheState());
  }, [dispatch]);

  return {
    // State
    invoiceNumber,
    paymentMode,
    nichiQuantity,
    nichiUnitPrice,
    refDocNumber,
    lineTaxPercent,
    itemId,
    remarks,
    creatingInvoice,
    invoiceError,
    createdInvoice,
    creatingApplication,
    applicationError,
    createdApplication,
    loadingApplication,
    loadApplicationError,
    loadedApplication,
    loading,
    error,
    lastErrorType,

    // Actions
    updateInvoiceNumber,
    updatePaymentMode,
    updateNichiQuantity,
    updateNichiUnitPrice,
    updateRefDocNumber,
    updateLineTaxPercent,
    updateItemId,
    updateRemarks,
    handleCreateNichiBookingInvoice,
    handleCreateNichiApplication,
    handleViewNichiApplication,
    handleClearError,
    handleClearInvoiceResult,
    handleClearApplicationResult,
    handleClearLoadedApplication,
    handleResetForm,
    // Deceased Details
    deceasedDetails,
    updateDeceasedDetails,
    addDeceased,
    removeDeceased,
    updateDeceased,
    // Additional Details
    selectedBibleChoiceId,
    phraseOfChoice,
    crossType,
    updateSelectedBibleChoice,
    updatePhraseOfChoice,
    updateCrossType,
  };
}

