import { useSelector, useDispatch } from 'react-redux';
import { useCallback, useEffect } from 'react';
import { RootState, AppDispatch } from '../store';
import {
  setInscriptionRequestNo,
  setNicheApplicationCode,
  setApplicantName,
  setNricPassportNo,
  setBlock,
  setStreet,
  setUnitNo,
  setPostalCode,
  setMobile,
  setHomeTel,
  setEmailId,
  setDeceasedDetails,
  addDeceasedDetail,
  removeDeceasedDetail,
  updateDeceasedDetail,
  setSelectedBibleChoiceId,
  setPhraseOfChoice,
  setCrossType,
  clearError,
  clearInvoiceResult,
  resetForm,
  fetchInscriptionItems,
  createInscriptionInvoice,
  fetchBibleChoices,
  createInscription,
  updateInscription,
  type DeceasedDetail
} from '../store/inscriptionSlice';
import { CreateInvoiceRequest } from '../services/inscriptionService';
import { useToast } from '../contexts/ToastContext';

export function useInscription() {
  const dispatch: AppDispatch = useDispatch();
  const { showSuccess, showError } = useToast();

  // Select state from Redux
  const inscriptionRequestNo = useSelector((state: RootState) => state.inscription.inscriptionRequestNo);
  const nicheInscriptionRequestId = useSelector((state: RootState) => state.inscription.nicheInscriptionRequestId);
  const nicheApplicationCode = useSelector((state: RootState) => state.inscription.nicheApplicationCode);
  const applicantName = useSelector((state: RootState) => state.inscription.applicantName);
  const nricPassportNo = useSelector((state: RootState) => state.inscription.nricPassportNo);
  const block = useSelector((state: RootState) => state.inscription.block);
  const street = useSelector((state: RootState) => state.inscription.street);
  const unitNo = useSelector((state: RootState) => state.inscription.unitNo);
  const postalCode = useSelector((state: RootState) => state.inscription.postalCode);
  const mobile = useSelector((state: RootState) => state.inscription.mobile);
  const homeTel = useSelector((state: RootState) => state.inscription.homeTel);
  const emailId = useSelector((state: RootState) => state.inscription.emailId);

  const inscriptionItems = useSelector((state: RootState) => state.inscription.inscriptionItems);
  const itemsLoading = useSelector((state: RootState) => state.inscription.itemsLoading);
  const itemsError = useSelector((state: RootState) => state.inscription.itemsError);

  const creatingInvoice = useSelector((state: RootState) => state.inscription.creatingInvoice);
  const invoiceError = useSelector((state: RootState) => state.inscription.invoiceError);
  const createdInvoice = useSelector((state: RootState) => state.inscription.createdInvoice);

  const loading = useSelector((state: RootState) => state.inscription.loading);
  const error = useSelector((state: RootState) => state.inscription.error);
  const lastErrorType = useSelector((state: RootState) => state.inscription.lastErrorType);

  const bibleChoices = useSelector((state: RootState) => state.inscription.bibleChoices);
  const bibleChoicesLoading = useSelector((state: RootState) => state.inscription.bibleChoicesLoading);
  const bibleChoicesError = useSelector((state: RootState) => state.inscription.bibleChoicesError);
  const selectedBibleChoiceId = useSelector((state: RootState) => state.inscription.selectedBibleChoiceId);
  const phraseOfChoice = useSelector((state: RootState) => state.inscription.phraseOfChoice);
  const crossType = useSelector((state: RootState) => state.inscription.crossType);

  const deceasedDetails = useSelector((state: RootState) => state.inscription.deceasedDetails);
  const beneficiaries = useSelector((state: RootState) => state.inscription.beneficiaries);

  const creatingInscription = useSelector((state: RootState) => state.inscription.creatingInscription);
  const updatingInscription = useSelector((state: RootState) => state.inscription.updatingInscription);
  const inscriptionError = useSelector((state: RootState) => state.inscription.inscriptionError);
  const normalizeNicheCode = useCallback((code: string) => (code || '').trim().replace(/^I-/i, ''), []);

  // Form field setters
  const updateInscriptionRequestNo = useCallback((value: string) => {
    dispatch(setInscriptionRequestNo(value));
  }, [dispatch]);

  const updateNicheApplicationCode = useCallback((value: string) => {
    dispatch(setNicheApplicationCode(value));
  }, [dispatch]);

  const updateApplicantName = useCallback((value: string) => {
    dispatch(setApplicantName(value));
  }, [dispatch]);

  const updateNricPassportNo = useCallback((value: string) => {
    dispatch(setNricPassportNo(value));
  }, [dispatch]);

  const updateBlock = useCallback((value: string) => {
    dispatch(setBlock(value));
  }, [dispatch]);

  const updateStreet = useCallback((value: string) => {
    dispatch(setStreet(value));
  }, [dispatch]);

  const updateUnitNo = useCallback((value: string) => {
    dispatch(setUnitNo(value));
  }, [dispatch]);

  const updatePostalCode = useCallback((value: string) => {
    dispatch(setPostalCode(value));
  }, [dispatch]);

  const updateMobile = useCallback((value: string) => {
    dispatch(setMobile(value));
  }, [dispatch]);

  const updateHomeTel = useCallback((value: string) => {
    dispatch(setHomeTel(value));
  }, [dispatch]);

  const updateEmailId = useCallback((value: string) => {
    dispatch(setEmailId(value));
  }, [dispatch]);

  // Fetch inscription items
  const handleFetchInscriptionItems = useCallback(async (code: string) => {
    try {
      const result = await dispatch(fetchInscriptionItems(code)).unwrap();
      showSuccess('Success', 'Inscription items loaded successfully');
      return result;
    } catch (error: any) {
      const errorMessage = error?.message || 'Failed to load inscription items';
      showError('Error', errorMessage);
      throw error;
    }
  }, [dispatch, showSuccess, showError]);

  // Create invoice
  const handleCreateInvoice = useCallback(async (code: string, body?: CreateInvoiceRequest) => {
    try {
      const result = await dispatch(createInscriptionInvoice({ code, body })).unwrap();
      showSuccess('Success', `Invoice created successfully: ${result.invoiceCode}`);
      return result;
    } catch (error: any) {
      const errorMessage = error?.message || 'Failed to create invoice';
      showError('Error', errorMessage);
      throw error;
    }
  }, [dispatch, showSuccess, showError]);

  // Clear errors
  const handleClearError = useCallback(() => {
    dispatch(clearError());
  }, [dispatch]);

  // Clear invoice result
  const handleClearInvoiceResult = useCallback(() => {
    dispatch(clearInvoiceResult());
  }, [dispatch]);

  // Fetch Bible choices
  const handleFetchBibleChoices = useCallback(async () => {
    try {
      const result = await dispatch(fetchBibleChoices()).unwrap();
      return result;
    } catch (error: any) {
      const errorMessage = error?.message || 'Failed to load bible choices';
      showError('Error', errorMessage);
      throw error;
    }
  }, [dispatch, showError]);

  // Update Bible choice selection
  const updateSelectedBibleChoice = useCallback((choiceId: number | null) => {
    dispatch(setSelectedBibleChoiceId(choiceId));
  }, [dispatch]);

  // Update phrase of choice
  const updatePhraseOfChoice = useCallback((phrase: string) => {
    dispatch(setPhraseOfChoice(phrase));
  }, [dispatch]);

  // Update cross type
  const updateCrossType = useCallback((type: string) => {
    dispatch(setCrossType(type));
  }, [dispatch]);

  // Deceased details handlers
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

  // Reset form
  const handleResetForm = useCallback(() => {
    dispatch(resetForm());
  }, [dispatch]);

  // Create inscription
  const handleCreateInscription = useCallback(async () => {
    try {
      // Transform deceased details to API format
      const deceasedDetailsApi = deceasedDetails.map(d => ({
        name: d.nameOfDeceased || '',
        dateOfDeath: d.dateDied || '',
        dateOfBirth: d.dateBorn || '',
        internmentDate: d.internmentDate || '',
        deathCertificateNo: d.deathCertNo || '',
        birthYear: d.dateBorn ? d.dateBorn.split('-')[0] : '',
        inscriptionText: d.inscriptionText || phraseOfChoice || ''
      }));

      const data = {
        applicant: {
          name: applicantName,
          nricPassportNo: nricPassportNo,
          address: {
            block: block,
            blockNo: block,
            street: street,
            streetName: street,
            unitNo: unitNo,
            postalCode: postalCode
          },
          mobile: mobile,
          homeTel: homeTel,
          emailId: emailId
        },
        deceasedDetails: deceasedDetailsApi,
        inscription: {
          bibleInscriptionChoiceId: selectedBibleChoiceId,
          bibleInscriptionText: phraseOfChoice,
          additionalInscriptionPhrase: phraseOfChoice,
          remarks: '',
          crossType: crossType,
          nicheApplicationCode: normalizeNicheCode(nicheApplicationCode),
          nicheBookingId: null // Can be null when no booking exists
        }
      };

      const result = await dispatch(createInscription(data)).unwrap();
      showSuccess('Success', `Inscription created successfully: ${result.code}`);

      // Refresh inscription items to get the new inscription data
      if (result?.code) {
        await dispatch(fetchInscriptionItems(result.code));
      } else if (nicheApplicationCode) {
        await dispatch(fetchInscriptionItems(normalizeNicheCode(nicheApplicationCode)));
      }

      return result;
    } catch (error: any) {
      const errorMessage = error?.message || 'Failed to create inscription';
      showError('Error', errorMessage);
      throw error;
    }
  }, [dispatch, showSuccess, showError, deceasedDetails, applicantName, nricPassportNo, block, street, unitNo, postalCode, mobile, homeTel, emailId, selectedBibleChoiceId, phraseOfChoice, crossType, nicheApplicationCode, normalizeNicheCode]);

  // Update inscription
  const handleUpdateInscription = useCallback(async (code: string) => {
    try {
      // Transform deceased details to API format
      const deceasedDetailsApi = deceasedDetails.map(d => ({
        name: d.nameOfDeceased || '',
        dateOfDeath: d.dateDied || '',
        dateOfBirth: d.dateBorn || '',
        internmentDate: d.internmentDate || '',
        deathCertificateNo: d.deathCertNo || '',
        birthYear: d.dateBorn ? d.dateBorn.split('-')[0] : '',
        inscriptionText: d.inscriptionText || phraseOfChoice || ''
      }));

      const data = {
        code,
        applicant: {
          name: applicantName,
          nricPassportNo: nricPassportNo,
          address: {
            block: block,
            blockNo: block,
            street: street,
            streetName: street,
            unitNo: unitNo,
            postalCode: postalCode
          },
          mobile: mobile,
          homeTel: homeTel,
          emailId: emailId
        },
        deceasedDetails: deceasedDetailsApi,
        inscription: {
          bibleInscriptionChoiceId: selectedBibleChoiceId,
          bibleInscriptionText: phraseOfChoice,
          additionalInscriptionPhrase: phraseOfChoice,
          remarks: '', // Still keeping remarks empty as explicitly requested, using crossType field instead
          crossType: crossType
        }
      };

      const result = await dispatch(updateInscription(data)).unwrap();
      showSuccess('Success', `Inscription updated successfully: ${result.code}`);

      // Refresh inscription items to get the updated inscription data
      if (result?.code) {
        await dispatch(fetchInscriptionItems(result.code));
      } else if (nicheApplicationCode) {
        await dispatch(fetchInscriptionItems(normalizeNicheCode(nicheApplicationCode)));
      }

      return result;
    } catch (error: any) {
      const errorMessage = error?.message || 'Failed to update inscription';
      showError('Error', errorMessage);
      throw error;
    }
  }, [dispatch, showSuccess, showError, deceasedDetails, applicantName, nricPassportNo, block, street, unitNo, postalCode, mobile, homeTel, emailId, selectedBibleChoiceId, phraseOfChoice, crossType, nicheApplicationCode, normalizeNicheCode]);

  // Auto-fetch bible choices on mount
  useEffect(() => {
    if (bibleChoices.length === 0 && !bibleChoicesLoading && !bibleChoicesError) {
      handleFetchBibleChoices().catch(() => {
        // Error already handled in handleFetchBibleChoices
      });
    }
  }, [bibleChoices.length, bibleChoicesLoading, bibleChoicesError, handleFetchBibleChoices]);

  return {
    // State
    inscriptionRequestNo,
    nicheInscriptionRequestId,
    nicheApplicationCode,
    applicantName,
    nricPassportNo,
    block,
    street,
    unitNo,
    postalCode,
    mobile,
    homeTel,
    emailId,
    inscriptionItems,
    itemsLoading,
    itemsError,
    creatingInvoice,
    invoiceError,
    createdInvoice,
    bibleChoices,
    bibleChoicesLoading,
    bibleChoicesError,
    selectedBibleChoiceId,
    phraseOfChoice,
    crossType,
    beneficiaries, // Add beneficiaries to the returned state
    loading,
    error,
    lastErrorType,

    // Actions
    updateInscriptionRequestNo,
    updateNicheApplicationCode,
    updateApplicantName,
    updateNricPassportNo,
    updateBlock,
    updateStreet,
    updateUnitNo,
    updatePostalCode,
    updateMobile,
    updateHomeTel,
    updateEmailId,
    handleFetchInscriptionItems,
    handleCreateInvoice,
    handleFetchBibleChoices,
    updateSelectedBibleChoice,
    updatePhraseOfChoice,
    updateCrossType,
    handleClearError,
    handleClearInvoiceResult,
    handleResetForm,
    // Deceased details
    deceasedDetails,
    updateDeceasedDetails,
    addDeceased,
    removeDeceased,
    updateDeceased,

    // Create/Update inscription
    creatingInscription,
    updatingInscription,
    inscriptionError,
    handleCreateInscription,
    handleUpdateInscription
  };
}