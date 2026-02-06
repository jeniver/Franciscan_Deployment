import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { EyeIcon, ArrowLeftIcon, PlusIcon, ChevronDownIcon, UserIcon, ChurchIcon, BookOpenIcon, MailIcon, LoaderIcon } from 'lucide-react';
import { useInscription } from '../hooks/useInscription';
import { DateInput } from './common/DateInput';
import { useToast } from '../contexts/ToastContext';
import { AddressInput } from './AddressInput';
import { Beneficiary as BeneficiaryType } from '../services/inscriptionService';
import { DeceasedDetail } from '../store/inscriptionSlice';

interface InscriptionRequestProps {
  // Removed unused formData and setFormData props
}

interface AddressData {
  block?: string;
  blockNo?: string;
  streetName?: string;
  unitNo?: string;
  postalCode?: string;
  country?: string;
  addressNo?: string;
  addressLine1?: string;
  addressLine2?: string;
  addressCity?: string;
  addressState?: string;
  addressCountry?: string;
}

interface Beneficiary {
  selectBeneficiary: string;
  nameOfDeceased: string;
  dateBorn: string;
  dateOfBirth?: string;  // Added for compatibility with service Beneficiary type
  dateDied: string;
  internmentDate: string;
  internmentTime: string;
  deathCertNo: string;
}

export function InscriptionRequest() { // Removed props parameter since they were unused
  const navigate = useNavigate();

  const {
    inscriptionRequestNo,
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
    beneficiaries: allBeneficiaries, // Get beneficiaries from Redux state
    updateInscriptionRequestNo: _updateInscriptionRequestNo,
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
    updateSelectedBibleChoice,
    updatePhraseOfChoice,
    handleResetForm,
    deceasedDetails,
    updateDeceasedDetails: _updateDeceasedDetails,
    addDeceased,
    removeDeceased,
    updateDeceased,
    creatingInscription,
    updatingInscription,
    inscriptionError,
    handleCreateInscription,
    handleUpdateInscription
  } = useInscription();

  const { showError } = useToast();

  // Track if we need to refresh after create/update
  // The hook already refreshes, but this ensures form state is updated
  const prevInscriptionRequestNoRef = useRef<string | null>(null);

  useEffect(() => {
    // Only refresh if inscriptionRequestNo changed (new inscription created or updated)
    if (inscriptionRequestNo &&
      nicheApplicationCode &&
      prevInscriptionRequestNoRef.current !== inscriptionRequestNo) {
      prevInscriptionRequestNoRef.current = inscriptionRequestNo;
      // The hook already calls fetchInscriptionItems, but we ensure form is refreshed
      // by letting the Redux state update naturally
    }
    console.log('InscriptionRequest: inscriptionRequestNo', inscriptionRequestNo);
  }, [inscriptionRequestNo, nicheApplicationCode]);

  // Handle back navigation to niche application
  const handleBack = () => {
    navigate(-1);
  };

  // Handle view action
  const handleView = async () => {
    if (!nicheApplicationCode.trim()) {
      showError('Validation Error', 'Please enter a Niche Application Code to view items');
      return;
    }
    try {
      await handleFetchInscriptionItems(nicheApplicationCode);
    } catch (error) {
      // Error is handled by toast in the hook
    }
  };


  // Use Redux state for deceased details (mapped from API)
  // Initialize with empty if no data from Redux
  const beneficiaries: DeceasedDetail[] = deceasedDetails.length > 0 ? deceasedDetails : [
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

  // Additional Details
  const [crossType, setCrossType] = useState('Crucifix');

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
    addDeceased(newBeneficiary);
  };

  const handleRemoveBeneficiary = (index: number) => {
    removeDeceased(index);
  };

  const handleUpdateBeneficiary = (index: number, field: keyof DeceasedDetail, value: string) => {
    const updatedDetail = { [field]: value };

    // Auto-calculate Internment Date/Time when Date Died is selected
    // Internment Date should be 30 years LATER than Date Died
    if (field === 'dateDied' && value) {
      const dateDied = new Date(value);
      if (!isNaN(dateDied.getTime())) {
        // Calculate internment date as 30 years later
        const internmentDate = new Date(dateDied);
        internmentDate.setFullYear(internmentDate.getFullYear() + 30);

        // Format as YYYY-MM-DD for date input
        const year = internmentDate.getFullYear();
        const month = String(internmentDate.getMonth() + 1).padStart(2, '0');
        const day = String(internmentDate.getDate()).padStart(2, '0');
        const formattedDate = `${year}-${month}-${day}`;

        // Set internment date to 30 years later
        updatedDetail.internmentDate = formattedDate;
        updatedDetail.internmentTime = '12:00';
      }
    }

    updateDeceased(index, updatedDetail);
  };

  // Handle beneficiary selection - auto populate fields based on selected beneficiary
  const handleBeneficiarySelection = (index: number, beneficiaryName: string) => {
    // Find the selected beneficiary from the Redux state
    const selectedBeneficiary = allBeneficiaries.find((b: BeneficiaryType) => b.name === beneficiaryName);

    if (selectedBeneficiary) {
      // Update the deceased detail at the specified index with beneficiary data
      updateDeceased(index, {
        selectBeneficiary: selectedBeneficiary.name,
        nameOfDeceased: selectedBeneficiary.name,
        dateBorn: selectedBeneficiary.dateOfBirth || '',
        dateDied: '', // Leave death date empty as it's not typically known from beneficiary info
        internmentDate: '', // Will be auto-calculated when dateDied is entered
        internmentTime: '12:00',
        deathCertNo: '' // Leave death cert number empty
      });
    } else {
      // If "Select" option or invalid selection, just update the select field
      updateDeceased(index, {
        selectBeneficiary: beneficiaryName
      });
    }
  };

  const handleCreateInvoiceClick = async () => {
    if (!nicheApplicationCode.trim()) {
      showError('Validation Error', 'Please enter a Niche Application Code to create invoice');
      return;
    }
    try {
      // Check if the nicheApplicationCode is an inscription code (starts with 'I-')
      let invoiceCode;
      if (nicheApplicationCode.startsWith('I-')) {
        // Call the inscription invoice endpoint
        const result = await handleCreateInvoice(nicheApplicationCode);
        invoiceCode = result.invoiceCode;
      } else {
        // For regular application codes, call the inscription invoice endpoint
        // since inscription invoices are created based on inscription request codes
        const inscriptionCode = `I-${nicheApplicationCode}`;
        const result = await handleCreateInvoice(inscriptionCode);
        invoiceCode = result.invoiceCode;
      }
      
      // Navigate to the invoice-receipt page after successful invoice creation
      navigate('/1/invoice-receipt', { state: { applicationNumber: invoiceCode } });
    } catch (error) {
      // Error is handled by toast in the hook
    }
  };

  const handleSaveRequest = async () => {
    if (!nicheApplicationCode.trim()) {
      showError('Validation Error', 'Please enter a Niche Application Code');
      return;
    }

    if (!applicantName.trim()) {
      showError('Validation Error', 'Please enter Applicant Name');
      return;
    }

    try {
      if (inscriptionRequestNo) {
        // Update existing inscription
        await handleUpdateInscription(inscriptionRequestNo);
      } else {
        // Create new inscription
        await handleCreateInscription();
      }
    } catch (error) {
      // Error is handled by toast in the hook
    }
  };

  const handleClearForm = () => {
    handleResetForm();
    // Reset will clear deceased details in Redux
    updateSelectedBibleChoice(null);
    updatePhraseOfChoice('');
    setCrossType('Crucifix');
  };

  const handleAddressChange = (addressData: any) => {
    // Update the Redux store with the new address values
    // The AddressInput component provides both component-friendly and backend-compatible fields
    // For Redux state, we update the fields that correspond to the Redux store structure
    // block in Redux corresponds to blockNo/block from API (the number)
    // street in Redux corresponds to streetName/street from API (the street name)
    updateBlock(addressData.blockNo || addressData.addressLine1 || '');
    updateStreet(addressData.streetName || addressData.addressLine2 || '');
    updateUnitNo(addressData.unitNo || addressData.addressCity || '');
    updatePostalCode(addressData.postalCode || addressData.addressState || '');
    // Note: country is typically Singapore for local addresses, so we may not need to update it
  };

  return (
    <div className="p-6 md:p-8 space-y-6 bg-gray-50 min-h-screen">
      {/* Top Section - Improved Layout */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <div className="space-y-4">
          {/* First Row: Niche Application Code (left) and Inscription Request No. (right, only if exists) */}
          <div className={`grid gap-4 ${inscriptionRequestNo ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
            {/* Niche Application Code - Always shown on left */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                Niche Application Code
                <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={nicheApplicationCode}
                onChange={(e) => updateNicheApplicationCode(e.target.value)}
                className="w-full p-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#801818] focus:border-[#801818] transition-all"
                placeholder="7980-0 or 3795-1"
              />
            </div>
            {/* Inscription Request No. - Only shown when it exists (after create/update) */}
            {inscriptionRequestNo && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                  Inscription Request No.
                  <span className="text-gray-400 font-normal normal-case text-xs">(Auto-generated)</span>
                </label>
                <input
                  type="text"
                  value={inscriptionRequestNo}
                  readOnly
                  disabled
                  className="w-full p-3 bg-gray-100 border border-gray-300 rounded-lg text-gray-700 cursor-not-allowed"
                  placeholder="I-XXXX-0"
                />
              </div>
            )}
          </div>

          {/* Second Row: Action Buttons */}
          <div className="flex flex-wrap gap-3 pt-2">
            <button
              onClick={handleView}
              disabled={itemsLoading || !nicheApplicationCode.trim()}
              className="px-5 py-2.5 bg-[#801818] text-white rounded-lg font-semibold hover:opacity-90 hover:shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none"
              title={!nicheApplicationCode.trim() ? 'Please enter Niche Application Code first' : 'View inscription items'}
            >
              {itemsLoading ? (
                <>
                  <LoaderIcon className="w-4 h-4 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <EyeIcon className="w-4 h-4" />
                  View Items
                </>
              )}
            </button>
            <button
              onClick={handleBack}
              className="px-5 py-2.5 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 hover:shadow-md transition-all flex items-center justify-center gap-2"
              title="Back to Niche Application"
            >
              <ArrowLeftIcon className="w-4 h-4" />
              Back
            </button>
          </div>

          {/* Error Display */}
          {itemsError && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700 font-medium">{itemsError}</p>
            </div>
          )}
        </div>
      </div>

      {/* Edit Contact (Applicant) Details */}
      <details open className="group bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <summary className="list-none p-4 bg-gradient-to-r from-[#801818] to-[#9a1f1f] text-white font-bold cursor-pointer flex justify-between items-center hover:from-[#9a1f1f] hover:to-[#801818] transition-all">
          <span className="flex items-center gap-2">
            <UserIcon className="w-5 h-5" />
            Edit Contact (Applicant) Details
          </span>
          <ChevronDownIcon className="w-5 h-5 transition-transform duration-300 group-open:rotate-180" />
        </summary>
        <div className="p-6 space-y-6">
          {/* Name and NRIC Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                Applicant Name
                <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={applicantName}
                onChange={(e) => updateApplicantName(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#801818] focus:border-[#801818] transition-all"
                placeholder="Enter full name"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">NRIC/Passport No.</label>
              <input
                type="text"
                value={nricPassportNo}
                onChange={(e) => updateNricPassportNo(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#801818] focus:border-[#801818] transition-all"
                placeholder="S1234567A"
              />
            </div>
          </div>

          <AddressInput
            fieldPrefix="applicant"
            onAddressChange={handleAddressChange}
            autoSync={false}
            initialValues={{
              // Provide component-friendly fields from Redux state
              // The Redux state has block=29, street=#5665, unitNo=ALMOND AVENUE, postalCode=677766
              // From the original API, the address.block field had "No", indicating it should be "No" type
              block: '', // Default to 'No' type since original address.block was 'No' (not 'Block')
              blockNo: block || '', // block in Redux contains the block number ("29")
              streetName: street || '', // street in Redux contains the street name ("#5665")
              unitNo: unitNo || '',
              postalCode: postalCode || '',
              country: 'Singapore'
            }}
            initialAddressString={`${block} ${street} ${unitNo} Singapore ${postalCode}`.trim()}
          />

          {/* Contact Information Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Mobile</label>
              <input
                type="text"
                value={mobile}
                onChange={(e) => updateMobile(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#801818] focus:border-[#801818] transition-all"
                placeholder="9123-4567"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Home Tel</label>
              <input
                type="text"
                value={homeTel}
                onChange={(e) => updateHomeTel(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#801818] focus:border-[#801818] transition-all"
                placeholder="Optional"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Email ID</label>
              <input
                type="email"
                value={emailId}
                onChange={(e) => updateEmailId(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#801818] focus:border-[#801818] transition-all"
                placeholder="example@email.com"
              />
            </div>
          </div>
        </div>
      </details>

      {/* Details of Deceased */}
      <details open className="group bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <summary className="list-none p-4 bg-gradient-to-r from-[#801818] to-[#9a1f1f] text-white font-bold cursor-pointer flex justify-between items-center hover:from-[#9a1f1f] hover:to-[#801818] transition-all">
          <span className="flex items-center gap-2">
            <ChurchIcon className="w-5 h-5" />
            Details of Deceased
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
                        onChange={(e) => handleBeneficiarySelection(index, e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#801818] focus:border-[#801818] transition-all text-sm"
                      >
                        <option value="">Select</option>
                        {allBeneficiaries.map((b: BeneficiaryType, idx: number) => (
                          <option key={idx} value={b.name}>
                            {b.name} ({b.relationshipToApplicant})
                          </option>
                        ))}
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
                        value={beneficiary.dateBorn || ''}
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

      {/* Additional Details of Inscription */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
        <h3 className="text-[#801818] font-bold text-lg border-b-2 border-gray-200 pb-3 flex items-center gap-2">
          <BookOpenIcon className="w-5 h-5" />
          Additional Details of Inscription
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
                      // Extract number from choice no (e.g., "No10" -> 10)
                      const numA = parseInt(a.bibleInscriptionChoiceNo.match(/\d+/)?.[0] || '0', 10);
                      const numB = parseInt(b.bibleInscriptionChoiceNo.match(/\d+/)?.[0] || '0', 10);
                      return numA - numB;
                    })
                    .map((choice) => {
                      // Combine number and text for display
                      const displayText = choice.bibleInscriptionChoiceNoValue
                        ? `${choice.bibleInscriptionChoiceNo} - ${choice.bibleInscriptionChoiceNoValue}`
                        : choice.bibleInscriptionChoiceNo;
                      return (
                        <option key={choice.bibleInscriptionChoiceId} value={choice.bibleInscriptionChoiceId}>
                          {displayText}
                        </option>
                      );
                    })}
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
                        // Show details in a more visible way or modal
                        alert(`Bible Choice Details:

${selected.bibleInscriptionChoiceNo}

${selected.bibleInscriptionChoiceNoValue}`);
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
              {!bibleChoicesLoading && bibleChoices.length === 0 && !bibleChoicesError && (
                <div className="text-sm text-gray-500 bg-gray-50 p-2 rounded">
                  No bible choices available. Please check the API connection.
                </div>
              )}
              {/* Debug info - remove in production */}
              {process.env.NODE_ENV === 'development' && (
                <div className="text-xs text-gray-400 mt-1">
                  Debug: {bibleChoices.length} choices loaded
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
              {selectedBibleChoiceId && (
                <p className="text-xs text-gray-500 italic">
                  You can edit this phrase if needed. Editing will clear the Bible choice selection.
                </p>
              )}
            </div>
          </div>
          <div className="space-y-6">
            <div className="space-y-3">
              <label className="text-sm font-semibold text-gray-700 block">Cross Type</label>
              <select
                value={crossType}
                onChange={(e) => setCrossType(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#801818] focus:border-[#801818] transition-all"
              >
                <option value="Crucifix">Crucifix</option>
                <option value="Plain Cross">Plain Cross</option>
                <option value="Celtic Cross">Celtic Cross</option>
              </select>
            </div>
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> Additional inscription details will be included in the final plaque design.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        {/* Success Message */}
        {createdInvoice && (
          <div className="mb-6 p-4 bg-green-50 border-l-4 border-green-500 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-lg">✓</span>
                </div>
              </div>
              <div className="flex-1">
                <div className="text-base font-semibold text-green-800">Invoice Created Successfully!</div>
                <div className="text-sm text-green-700 mt-1">Invoice Code: <span className="font-mono font-bold">{createdInvoice.invoiceCode}</span></div>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {invoiceError && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg">
            <div className="text-sm font-semibold text-red-800">{invoiceError}</div>
          </div>
        )}

        {/* Inscription Error Message */}
        {inscriptionError && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg">
            <div className="text-sm font-semibold text-red-800">{inscriptionError}</div>
          </div>
        )}

        {/* Button Groups */}
        <div className="flex flex-wrap gap-3 justify-between items-center">
          {/* Primary Actions */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleSaveRequest}
              disabled={creatingInscription || updatingInscription || !nicheApplicationCode.trim() || !applicantName.trim()}
              className="px-6 py-3 bg-[#801818] text-white rounded-lg font-semibold shadow-md hover:shadow-lg hover:bg-[#9a1f1f] transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 flex items-center gap-2"
              title={!nicheApplicationCode.trim() ? 'Please enter Niche Application Code' : !applicantName.trim() ? 'Please enter Applicant Name' : inscriptionRequestNo ? 'Update inscription' : 'Create new inscription'}
            >
              {creatingInscription || updatingInscription ? (
                <>
                  <LoaderIcon className="w-4 h-4 animate-spin" />
                  {inscriptionRequestNo ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                inscriptionRequestNo ? 'UPDATE REQUEST' : 'CREATE REQUEST'
              )}
            </button>
            <button
              onClick={handleClearForm}
              className="px-6 py-3 border-2 border-gray-300 bg-white text-gray-700 rounded-lg font-semibold hover:bg-gray-50 hover:border-gray-400 transition-all"
            >
              Clear Form
            </button>
          </div>

          {/* Secondary Actions */}
          <div className="flex flex-wrap gap-3">
            <div className="h-8 w-px bg-gray-300"></div>
            <button
              onClick={handleCreateInvoiceClick}
              disabled={creatingInvoice || !nicheApplicationCode.trim()}
              className="px-6 py-3 bg-[#1a2a40] text-white rounded-lg font-semibold hover:opacity-90 hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              title={!nicheApplicationCode.trim() ? 'Please enter Niche Application Code first' : 'Create invoice for this inscription'}
            >
              {creatingInvoice ? (
                <>
                  <LoaderIcon className="w-4 h-4 animate-spin" />
                  Creating Invoice...
                </>
              ) : (
                'Invoice / Receipt'
              )}
            </button>
            {/* <button
              className="px-6 py-3 bg-[#1a2a40] text-white rounded-lg font-semibold hover:opacity-90 hover:shadow-md transition-all"
              title="Navigate to receipt page"
            >
              Go to Receipt
            </button>
            <button
              className="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 hover:shadow-md transition-all flex items-center gap-2"
              title="Send email notification"
            >
              <MailIcon className="w-4 h-4" />
              Send Email
            </button> */}
          </div>
        </div>
      </div>
    </div>
  );
}