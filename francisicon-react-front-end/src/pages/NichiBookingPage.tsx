import { useState, useEffect, useRef } from 'react';
import { Layout } from '../components/Layout';
import { useNichiBooking } from '../hooks/useNichiBooking';
import { useToast } from '../contexts/ToastContext';
import { ChurchIcon, BookOpenIcon, PlusIcon, ChevronDownIcon, LoaderIcon, EyeIcon } from 'lucide-react';
import inscriptionService from '../services/inscriptionService';
import { DateInput } from '../components/common/DateInput';
import type { BibleChoice } from '../services/inscriptionService';
import type { DeceasedDetail } from '../store/nichibookingSlice';

export function NichiBookingPage() {
  const {
    invoiceNumber,
    paymentMode,
    nichiQuantity,
    nichiUnitPrice,
    refDocNumber,
    lineTaxPercent,
    itemId,
    creatingInvoice,
    invoiceError,
    createdInvoice,
    creatingApplication,
    applicationError,
    createdApplication,
    loadingApplication,
    loadApplicationError,
    loadedApplication,
    loading: _loading,
    error: _error,
    updateInvoiceNumber,
    updatePaymentMode,
    updateNichiQuantity,
    updateNichiUnitPrice,
    updateRefDocNumber,
    updateLineTaxPercent,
    updateItemId,
    handleCreateNichiBookingInvoice: _handleCreateNichiBookingInvoice,
    handleCreateNichiApplication,
    handleViewNichiApplication,
    handleClearError: _handleClearError,
    handleClearInvoiceResult: _handleClearInvoiceResult,
    handleClearApplicationResult: _handleClearApplicationResult,
    handleClearLoadedApplication: _handleClearLoadedApplication,
    handleResetForm,
    deceasedDetails,
    updateDeceasedDetails,
    addDeceased,
    removeDeceased,
    updateDeceased,
    selectedBibleChoiceId,
    phraseOfChoice,
    crossType,
    updateSelectedBibleChoice,
    updatePhraseOfChoice,
    updateCrossType,
  } = useNichiBooking();

  const { showError, showSuccess: _showSuccess } = useToast();

  // Application number for viewing
  const [viewApplicationNumber, setViewApplicationNumber] = useState('');

  // Bible choices state (optional - only for Additional Details section)
  const [bibleChoices, setBibleChoices] = useState<BibleChoice[]>([]);
  const [bibleChoicesLoading, setBibleChoicesLoading] = useState(false);
  const [bibleChoicesError, setBibleChoicesError] = useState<string | null>(null);

  // Fetch Bible choices on mount (optional feature)
  useEffect(() => {
    const fetchBibleChoices = async () => {
      setBibleChoicesLoading(true);
      setBibleChoicesError(null);
      try {
        const choices = await inscriptionService.getBibleChoices();
        setBibleChoices(choices);
      } catch (error: any) {
        setBibleChoicesError(error?.message || 'Failed to load bible choices');
        // Don't show error toast since this is optional
        console.warn('Failed to load bible choices:', error);
      } finally {
        setBibleChoicesLoading(false);
      }
    };

    fetchBibleChoices();
  }, []);

  // Initialize with empty deceased detail if none exist
  const beneficiaries = deceasedDetails.length > 0 ? deceasedDetails : [
    {
      selectBeneficiary: '',
      nameOfDeceased: '',
      dateBorn: '',
      dateDied: '',
      internmentDate: '',
      internmentTime: '12:00',
      deathCertNo: ''
    }
  ];

  const handleAddBeneficiary = () => {
    const newBeneficiary: DeceasedDetail = {
      selectBeneficiary: '',
      nameOfDeceased: '',
      dateBorn: '',
      dateDied: '',
      internmentDate: '',
      internmentTime: '12:00',
      deathCertNo: ''
    };
    // If this is the first beneficiary (was empty), update the entire array
    if (deceasedDetails.length === 0 && beneficiaries.length === 1 && !beneficiaries[0].nameOfDeceased) {
      // Replace the empty one with the new one and add another
      updateDeceasedDetails([beneficiaries[0], newBeneficiary]);
    } else {
      addDeceased(newBeneficiary);
    }
  };

  const handleRemoveBeneficiary = (index: number) => {
    // If this is the first beneficiary and it's still in local state
    if (deceasedDetails.length === 0 && beneficiaries.length === 1) {
      // Clear it
      updateDeceasedDetails([]);
    } else {
      removeDeceased(index);
    }
  };

  const handleUpdateBeneficiary = (index: number, field: keyof DeceasedDetail, value: string) => {
    // If this is the first beneficiary and it's still in local state (not in Redux yet)
    if (deceasedDetails.length === 0 && beneficiaries.length === 1) {
      // Update the local beneficiary and sync to Redux
      const updated = [{ ...beneficiaries[0], [field]: value }];
      updateDeceasedDetails(updated);
    } else {
      updateDeceased(index, { [field]: value });
    }
  };

  const handleCreateInvoice = async () => {
    try {
      if (!invoiceNumber.trim()) {
        showError('Validation Error', 'Please enter an Invoice Number');
        return;
      }
      if (!refDocNumber.trim()) {
        showError('Validation Error', 'Please enter a Reference Document Number');
        return;
      }
      if (nichiQuantity <= 0) {
        showError('Validation Error', 'Quantity must be greater than 0');
        return;
      }
      if (nichiUnitPrice < 0) {
        showError('Validation Error', 'Unit price cannot be negative');
        return;
      }

      // Use the new application creation method that sends the full structure
      await handleCreateNichiApplication();
    } catch (error) {
      // Error is handled by toast in the hook
    }
  };

  const handleViewApplication = async () => {
    try {
      if (!viewApplicationNumber.trim()) {
        showError('Validation Error', 'Please enter an Application Number to view');
        return;
      }
      await handleViewNichiApplication(viewApplicationNumber.trim());
      // Clear the input after successful load
      setViewApplicationNumber('');
    } catch (error) {
      // Error is handled by toast in the hook
    }
  };

  const handleClearForm = () => {
    handleResetForm();
    updateSelectedBibleChoice(null);
    updatePhraseOfChoice('');
    updateCrossType('Crucifix');
    setViewApplicationNumber('');
  };

  // Track previous refDocNumber to detect changes
  const prevRefDocNumberRef = useRef<string>(refDocNumber);

  // CRITICAL: Reset niche state when application number (refDocNumber) changes
  // This ensures that when viewing a different application, previous niche selection is cleared
  useEffect(() => {
    const currentRefDocNumber = refDocNumber.trim();
    const previousRefDocNumber = prevRefDocNumberRef.current.trim();

    // Only reset if refDocNumber actually changed and is not empty
    if (currentRefDocNumber && currentRefDocNumber !== previousRefDocNumber && previousRefDocNumber !== '') {
      // Reset niche-related fields when switching to a different application
      // This prevents showing the previous application's niche selection
      console.log(`Application number changed from ${previousRefDocNumber} to ${currentRefDocNumber}, resetting niche state`);
      
      // Note: The actual reset happens in handleViewNichiApplication
      // This effect is just for manual refDocNumber changes
    }

    prevRefDocNumberRef.current = refDocNumber;
  }, [refDocNumber]);

  // Auto-update phrase when bible choice is selected
  useEffect(() => {
    if (selectedBibleChoiceId && bibleChoices.length > 0) {
      const selectedChoice = bibleChoices.find(c => c.bibleInscriptionChoiceId === selectedBibleChoiceId);
      if (selectedChoice && phraseOfChoice !== selectedChoice.bibleInscriptionChoiceNoValue) {
        updatePhraseOfChoice(selectedChoice.bibleInscriptionChoiceNoValue);
      }
    }
  }, [selectedBibleChoiceId, bibleChoices, phraseOfChoice, updatePhraseOfChoice]);

  return (
    <Layout title="Nichi Booking">
      <div className="p-6 md:p-8 space-y-6 bg-gray-50 min-h-screen">
        {/* View Application Section */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-semibold text-gray-700 mb-2 block">
                Application Number
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={viewApplicationNumber}
                  onChange={(e) => setViewApplicationNumber(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleViewApplication();
                    }
                  }}
                  className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#801818] focus:border-[#801818] transition-all"
                  placeholder="Enter application number to view"
                />
                <button
                  onClick={handleViewApplication}
                  disabled={loadingApplication || !viewApplicationNumber.trim()}
                  className="px-5 py-3 bg-[#801818] text-white rounded-lg font-semibold hover:opacity-90 hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  title={!viewApplicationNumber.trim() ? 'Please enter Application Number first' : 'View application'}
                >
                  {loadingApplication ? (
                    <>
                      <LoaderIcon className="w-4 h-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <EyeIcon className="w-4 h-4" />
                      View
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
          {loadApplicationError && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700 font-medium">{loadApplicationError}</p>
            </div>
          )}
          {loadedApplication && (
            <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-700 font-medium">
                Application {loadedApplication.applicationCode} loaded successfully
              </p>
            </div>
          )}
        </div>

        {/* Invoice Form Section */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Nichi Booking Invoice</h2>
          
          <div className="space-y-6">
            {/* Invoice Number and Payment Mode */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                  Invoice Number
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={invoiceNumber}
                  onChange={(e) => updateInvoiceNumber(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#801818] focus:border-[#801818] transition-all"
                  placeholder="Enter invoice number"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                  Payment Mode
                  <span className="text-red-500">*</span>
                </label>
                <select
                  value={paymentMode}
                  onChange={(e) => updatePaymentMode(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#801818] focus:border-[#801818] transition-all"
                >
                  <option value="Cash">Cash</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Credit Card">Credit Card</option>
                </select>
              </div>
            </div>

            {/* Quantity and Unit Price */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                  Quantity
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  value={nichiQuantity}
                  onChange={(e) => updateNichiQuantity(parseInt(e.target.value) || 1)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#801818] focus:border-[#801818] transition-all"
                  placeholder="1"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                  Unit Price
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={nichiUnitPrice}
                  onChange={(e) => updateNichiUnitPrice(parseFloat(e.target.value) || 0)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#801818] focus:border-[#801818] transition-all"
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Reference Document Number */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                Reference Document Number
                <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={refDocNumber}
                onChange={(e) => updateRefDocNumber(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#801818] focus:border-[#801818] transition-all"
                placeholder="Enter reference document number"
              />
            </div>

            {/* Tax Percent and Item ID (Advanced) */}
            <details className="group">
              <summary className="list-none cursor-pointer text-sm font-semibold text-gray-700 flex items-center gap-2">
                <span>Advanced Settings</span>
                <ChevronDownIcon className="w-4 h-4 transition-transform duration-300 group-open:rotate-180" />
              </summary>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">Tax Percent (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={lineTaxPercent}
                    onChange={(e) => updateLineTaxPercent(parseFloat(e.target.value) || 0)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#801818] focus:border-[#801818] transition-all"
                    placeholder="9"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">Item ID</label>
                  <input
                    type="number"
                    min="1"
                    value={itemId}
                    onChange={(e) => updateItemId(parseInt(e.target.value) || 6)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#801818] focus:border-[#801818] transition-all"
                    placeholder="6"
                  />
                </div>
              </div>
            </details>
          </div>
        </div>

        {/* Details of Deceased - Optional Section */}
        <details open className="group bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <summary className="list-none p-4 bg-gradient-to-r from-[#801818] to-[#9a1f1f] text-white font-bold cursor-pointer flex justify-between items-center hover:from-[#9a1f1f] hover:to-[#801818] transition-all">
            <span className="flex items-center gap-2">
              <ChurchIcon className="w-5 h-5" />
              Details of Deceased (Optional)
            </span>
            <ChevronDownIcon className="w-5 h-5 transition-transform duration-300 group-open:rotate-180" />
          </summary>
          <div className="p-6 overflow-x-auto">
            <div className="min-w-full">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b-2 border-gray-200">
                    <th className="pb-3 px-4 text-xs font-bold text-gray-600 uppercase tracking-wider">Select Beneficiary</th>
                    <th className="pb-3 px-4 text-xs font-bold text-gray-600 uppercase tracking-wider">Name of Deceased</th>
                    <th className="pb-3 px-4 text-xs font-bold text-gray-600 uppercase tracking-wider">Date Born</th>
                    <th className="pb-3 px-4 text-xs font-bold text-gray-600 uppercase tracking-wider">Date Died</th>
                    <th className="pb-3 px-4 text-xs font-bold text-gray-600 uppercase tracking-wider">Internment Date/Time</th>
                    <th className="pb-3 px-4 text-xs font-bold text-gray-600 uppercase tracking-wider">Death Cert No.</th>
                    <th className="pb-3 px-4 text-xs font-bold text-gray-600 uppercase tracking-wider text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {beneficiaries.map((beneficiary, index) => (
                    <tr key={index} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="py-4 px-4">
                        <select
                          value={beneficiary.selectBeneficiary}
                          onChange={(e) => handleUpdateBeneficiary(index, 'selectBeneficiary', e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#801818] focus:border-[#801818] transition-all text-sm"
                        >
                          <option value="">Select</option>
                        </select>
                      </td>
                      <td className="py-4 px-4">
                        <input
                          type="text"
                          value={beneficiary.nameOfDeceased}
                          onChange={(e) => handleUpdateBeneficiary(index, 'nameOfDeceased', e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#801818] focus:border-[#801818] transition-all text-sm"
                          placeholder="Full name"
                        />
                      </td>
                      <td className="py-4 px-4">
                        <DateInput
                          value={beneficiary.dateBorn}
                          onChange={(apiDate) => handleUpdateBeneficiary(index, 'dateBorn', apiDate)}
                          className="rounded-lg py-2 px-3 text-sm"
                        />
                      </td>
                      <td className="py-4 px-4">
                        <DateInput
                          value={beneficiary.dateDied}
                          onChange={(apiDate) => handleUpdateBeneficiary(index, 'dateDied', apiDate)}
                          className="rounded-lg py-2 px-3 text-sm"
                        />
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex gap-2">
                          <DateInput
                            value={beneficiary.internmentDate}
                            onChange={(apiDate) => handleUpdateBeneficiary(index, 'internmentDate', apiDate)}
                            className="rounded-lg py-2 px-3 text-sm"
                          />
                          <input
                            type="time"
                            value={beneficiary.internmentTime}
                            onChange={(e) => handleUpdateBeneficiary(index, 'internmentTime', e.target.value)}
                            className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#801818] focus:border-[#801818] transition-all text-sm"
                          />
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <input
                          type="text"
                          value={beneficiary.deathCertNo}
                          onChange={(e) => handleUpdateBeneficiary(index, 'deathCertNo', e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#801818] focus:border-[#801818] transition-all text-sm"
                          placeholder="Cert No."
                        />
                      </td>
                      <td className="py-4 px-4 text-center">
                        {beneficiaries.length > 1 && (
                          <button
                            onClick={() => handleRemoveBeneficiary(index)}
                            className="px-3 py-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg font-semibold transition-all text-sm"
                            title="Remove beneficiary"
                          >
                            Remove
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button
              onClick={handleAddBeneficiary}
              className="mt-4 px-6 py-3 border-2 border-dashed border-gray-300 rounded-lg w-full text-gray-600 hover:bg-gray-50 hover:border-[#801818] hover:text-[#801818] transition-all font-semibold flex items-center justify-center gap-2"
            >
              <PlusIcon className="w-4 h-4" />
              Add Beneficiary
            </button>
          </div>
        </details>

        {/* Additional Details of Inscription - Optional Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
          <h3 className="text-[#801818] font-bold text-lg border-b-2 border-gray-200 pb-3 flex items-center gap-2">
            <BookOpenIcon className="w-5 h-5" />
            Additional Details of Inscription (Optional)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-sm font-semibold text-gray-700 block">Bible Inscription Choice Number</label>
                <div className="flex items-center gap-3 flex-wrap">
                  <select
                    value={selectedBibleChoiceId || ''}
                    onChange={(e) => {
                      const choiceId = e.target.value ? parseInt(e.target.value, 10) : null;
                      updateSelectedBibleChoice(choiceId);
                    }}
                    disabled={bibleChoicesLoading}
                    className="flex-1 min-w-[200px] p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#801818] focus:border-[#801818] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="">Select Choice Number</option>
                    {[...bibleChoices]
                      .sort((a, b) => {
                        const numA = parseInt(a.bibleInscriptionChoiceNo.match(/\d+/)?.[0] || '0', 10);
                        const numB = parseInt(b.bibleInscriptionChoiceNo.match(/\d+/)?.[0] || '0', 10);
                        return numA - numB;
                      })
                      .map((choice) => (
                        <option key={choice.bibleInscriptionChoiceId} value={choice.bibleInscriptionChoiceId}>
                          {choice.bibleInscriptionChoiceNo}
                        </option>
                      ))}
                  </select>
                  {bibleChoicesLoading && (
                    <div className="flex items-center gap-2 text-gray-500">
                      <LoaderIcon className="w-4 h-4 animate-spin" />
                      <span className="text-sm">Loading...</span>
                    </div>
                  )}
                  {selectedBibleChoiceId && (
                    <button 
                      onClick={() => {
                        const selected = bibleChoices.find(c => c.bibleInscriptionChoiceId === selectedBibleChoiceId);
                        if (selected) {
                          alert(`Bible Choice Details:\n\n${selected.bibleInscriptionChoiceNo}\n\n${selected.bibleInscriptionChoiceNoValue}`);
                        }
                      }}
                      className="px-5 py-3 bg-[#801818] text-white rounded-lg text-sm font-semibold hover:opacity-90 hover:shadow-md transition-all"
                      title="View full details of selected bible choice"
                    >
                      View Details
                    </button>
                  )}
                </div>
                {bibleChoicesError && (
                  <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                    {bibleChoicesError}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 block">
                  Phrase of Applicant's Choice
                  {selectedBibleChoiceId && (
                    <span className="ml-2 text-xs text-gray-500 font-normal">
                      (Auto-filled from selected Bible choice)
                    </span>
                  )}
                </label>
                <textarea
                  rows={4}
                  value={phraseOfChoice}
                  onChange={(e) => updatePhraseOfChoice(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50 focus:ring-2 focus:ring-[#801818] focus:border-[#801818] transition-all resize-none"
                  placeholder={selectedBibleChoiceId ? "Phrase will be auto-filled when you select a Bible choice" : "Enter inscription phrase or select a Bible choice above..."}
                />
              </div>
            </div>
            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-sm font-semibold text-gray-700 block">Cross Type</label>
                <select
                  value={crossType}
                  onChange={(e) => updateCrossType(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#801818] focus:border-[#801818] transition-all"
                >
                  <option value="Crucifix">Crucifix</option>
                  <option value="WoodenCross">Wooden Cross</option>
                  <option value="NoCrucifix/Cross">No Crucifix/Cross</option>
                </select>
              </div>
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> Additional inscription details are optional and will be included in the final plaque design if provided.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        {/* Success Message */}
        {(createdApplication || createdInvoice) && (
          <div className="mb-6 p-4 bg-green-50 border-l-4 border-green-500 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-lg">✓</span>
                </div>
              </div>
              <div className="flex-1">
                <div className="text-base font-semibold text-green-800">
                  {createdApplication ? 'Application Created Successfully!' : 'Invoice Created Successfully!'}
                </div>
                <div className="text-sm text-green-700 mt-1">
                  {createdApplication ? (
                    <>
                      Application Code: <span className="font-mono font-bold">{createdApplication.applicationCode}</span>
                      {createdApplication.invoice && (
                        <div className="mt-1">
                          Invoice No: <span className="font-mono font-bold">{createdApplication.invoice.invoiceNo}</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      Invoice Code: <span className="font-mono font-bold">{createdInvoice?.invoiceCode || createdInvoice?.invoiceNumber}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {(applicationError || invoiceError) && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg">
            <div className="text-sm font-semibold text-red-800">{applicationError || invoiceError}</div>
          </div>
        )}

          {/* Button Groups */}
          <div className="flex flex-wrap gap-3 justify-between items-center">
            {/* Primary Actions */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleCreateInvoice}
                disabled={creatingApplication || creatingInvoice}
                className="px-6 py-3 bg-[#801818] text-white rounded-lg font-semibold shadow-md hover:shadow-lg hover:bg-[#9a1f1f] transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {(creatingApplication || creatingInvoice) ? (
                  <>
                    <LoaderIcon className="w-4 h-4 animate-spin" />
                    {creatingApplication ? 'Creating Application...' : 'Creating Invoice...'}
                  </>
                ) : (
                  'CREATE APPLICATION'
                )}
              </button>
              <button
                onClick={handleClearForm}
                className="px-6 py-3 border-2 border-gray-300 bg-white text-gray-700 rounded-lg font-semibold hover:bg-gray-50 hover:border-gray-400 transition-all"
              >
                Clear Form
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

