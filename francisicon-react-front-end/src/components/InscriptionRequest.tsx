import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { EyeIcon, ArrowLeftIcon, PlusIcon, ChevronDownIcon, UserIcon, ChurchIcon, BookOpenIcon, LoaderIcon, PrinterIcon, InfoIcon, MailIcon } from 'lucide-react';
import { useInscription } from '../hooks/useInscription';
import { DateInput } from './common/DateInput';
import { useToast } from '../contexts/ToastContext';
import { AddressInput } from './AddressInput';
import { Beneficiary as BeneficiaryType } from '../services/inscriptionService';
import { DeceasedDetail } from '../store/inscriptionSlice';
import { formatDateForInput } from '../utils/dateUtils';
import { InscriptionMailModal } from './InscriptionMailModal';


// Removed unused Beneficiary interface

// Removed unused Beneficiary interface

export function InscriptionRequest() { // Removed props parameter since they were unused
  const navigate = useNavigate();
  const [isMailModalOpen, setIsMailModalOpen] = useState(false);

  const {
    inscriptionRequestNo,
    nicheInscriptionRequestId, // Added nicheInscriptionRequestId
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
    itemsLoading,
    itemsError: _itemsError,
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
    handleCreateInvoice: _handleCreateInvoice,
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
    handleUpdateInscription,
    crossType,
    updateCrossType,
    lastRefreshedAt
  } = useInscription();

  const { showError } = useToast();

  // Track if we need to refresh after create/update
  // The hook already refreshes, but this ensures form state is updated
  const prevInscriptionRequestNoRef = useRef<string | null>(null);

  const { user } = useSelector((state: RootState) => state.auth);
  const churchId = user?.churchId || 1;

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

  // URL-driven auto-fetch is handled in InscriptionPage.
  // Keep this component focused on rendering/editing to avoid duplicate fetch races.


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


  const handleAddBeneficiary = () => {
    const newBeneficiary: DeceasedDetail = {
      selectBeneficiary: '',
      nameOfDeceased: '',
      dateBorn: '',
      dateDied: '',
      internmentDate: '',
      internmentTime: '12:00',
      deathCertNo: '',

    };
    addDeceased(newBeneficiary);
  };

  const handleRemoveBeneficiary = (index: number) => {
    removeDeceased(index);
  };

  const handleUpdateBeneficiary = (index: number, field: keyof DeceasedDetail, value: string) => {
    const updatedDetail: Partial<DeceasedDetail> = { [field]: value };

    // Update storage period from when internment date is selected
    if (field === 'internmentDate' && value) {
      updatedDetail.storagePeriodFrom = value;

      // Calculate storage period to as 30 years after internment date
      const internmentDate = new Date(value);
      if (!isNaN(internmentDate.getTime())) {
        const storageToDate = new Date(internmentDate);
        storageToDate.setFullYear(internmentDate.getFullYear() + 30);

        // Format as YYYY-MM-DD for date input
        const year = storageToDate.getFullYear();
        const month = String(storageToDate.getMonth() + 1).padStart(2, '0');
        const day = String(storageToDate.getDate()).padStart(2, '0');
        const formattedDate = `${year}-${month}-${day}`;

        updatedDetail.storagePeriodTo = formattedDate;
      }
    }

    updateDeceased(index, updatedDetail);
  };

  // Handle beneficiary selection - auto populate fields based on selected beneficiary
  const handleBeneficiarySelection = (index: number, beneficiaryName: string) => {
    // Find the selected beneficiary from the Redux state
    const selectedBeneficiary = allBeneficiaries.find((b: BeneficiaryType) => b.name === beneficiaryName);

    if (selectedBeneficiary) {
      const dateBorn = formatDateForInput(selectedBeneficiary.dateOfBirth) || (selectedBeneficiary.birthYear ? `${selectedBeneficiary.birthYear}-01-01` : '');

      // Update the deceased detail at the specified index with beneficiary data
      updateDeceased(index, {
        selectBeneficiary: selectedBeneficiary.name,
        nameOfDeceased: selectedBeneficiary.name,
        dateBorn: dateBorn,
        birthYear: selectedBeneficiary.birthYear || '',
        dateDied: '', // Leave death date empty as it's not typically known from beneficiary info
        internmentDate: '', // Will be auto-calculated when dateDied is entered
        internmentTime: '12:00',
        deathCertNo: '', // Leave death cert number empty
      });
    } else {
      // If "Select" option or invalid selection, just update the select field
      updateDeceased(index, {
        selectBeneficiary: beneficiaryName,
      });
    }
  };

  const handlePrintAgreement = () => {
    if (inscriptionRequestNo) {
      navigate(`/inscription-agreement/${inscriptionRequestNo}`);
    } else {
      showError('Error', 'Agreement cannot be generated without a valid Inscription ID. Please make sure the inscription is saved.');
    }
  };

  const handleCreateInvoiceClick = () => {
    navigate(`/create-invoice/${inscriptionRequestNo}?type=INCR`);
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
    updateCrossType('Crucifix');
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
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Standardized Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-gray-700">
                Application Number:
              </p>
              <input
                type="text"
                value={nicheApplicationCode}
                onChange={(e) => updateNicheApplicationCode(e.target.value)}
                className="text-lg font-bold text-gray-900 w-32 md:w-40 py-2 px-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#801818] outline-none"
                placeholder="Enter application code"
              />
            </div>

            {inscriptionRequestNo && (
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-gray-700">
                  Inscription ID:
                </p>
                <input
                  type="text"
                  readOnly
                  value={inscriptionRequestNo}
                  className="text-lg font-bold text-gray-600 w-32 md:w-40 py-2 px-3 border border-gray-200 bg-gray-50 rounded-md outline-none cursor-default"
                />
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleView}
                disabled={itemsLoading || !nicheApplicationCode.trim()}
                className="px-5 py-2.5 bg-[#801818] text-white rounded-lg font-semibold hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {itemsLoading ? <LoaderIcon className="w-4 h-4 animate-spin" /> : <EyeIcon className="w-4 h-4" />}
                View
              </button>

              <button
                onClick={handlePrintAgreement}
                disabled={!nicheApplicationCode.trim()}
                className="px-5 py-2.5 bg-white text-gray-700 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <PrinterIcon className="w-4 h-4" />
                View Inscription
              </button>

              <button
                onClick={() => setIsMailModalOpen(true)}
                disabled={itemsLoading || !nicheApplicationCode.trim()}
                className="px-5 py-2.5 bg-[#e0f2fe] text-[#0369a1] border border-[#bae6fd] rounded-lg font-semibold hover:bg-[#bae6fd] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <MailIcon className="w-4 h-4" />
                Email Agreement
              </button>

              <button
                onClick={handleCreateInvoiceClick}
                disabled={creatingInvoice || !nicheApplicationCode.trim()}
                className="px-5 py-2.5 bg-[#1a2a40] text-white rounded-lg font-semibold hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {creatingInvoice ? <LoaderIcon className="w-4 h-4 animate-spin" /> : <BookOpenIcon className="w-4 h-4" />}
                Invoice
              </button>

              <button
                onClick={() => navigate('/niche')}
                className="px-5 py-2.5 bg-white text-gray-700 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
              >
                <ArrowLeftIcon className="w-4 h-4" />
                View Applications
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6 md:p-8 space-y-6">
        {/* Inscription Info Row - Secondary metadata */}
        {inscriptionRequestNo && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-3">
            <InfoIcon className="w-4 h-4 text-amber-600" />
            <span className="text-sm font-bold text-amber-800">
              Inscription Request No: <span className="font-mono">{inscriptionRequestNo}</span>
            </span>
          </div>
        )}

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
              key={`${inscriptionRequestNo || nicheApplicationCode || 'new'}-${lastRefreshedAt}`}
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
                          id={`beneficiary-select-${index}`}
                          name={`beneficiary-select-${index}`}
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
                          id={`deceased-name-${index}`}
                          name={`deceased-name-${index}`}
                          type="text"
                          value={beneficiary.nameOfDeceased}
                          onChange={(e) => handleUpdateBeneficiary(index, 'nameOfDeceased', e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#801818] focus:border-[#801818] transition-all text-sm"
                          placeholder="Full name"
                        />
                      </td>
                      <td className="py-4 px-4">
                        <DateInput
                          id={`date-born-${index}`}
                          name={`date-born-${index}`}
                          value={beneficiary.dateBorn || ''}
                          onChange={(apiDate) => handleUpdateBeneficiary(index, 'dateBorn', apiDate)}
                          className="rounded-lg py-2 px-3 text-sm"
                        />
                      </td>
                      <td className="py-4 px-4">
                        <DateInput
                          id={`date-died-${index}`}
                          name={`date-died-${index}`}
                          value={beneficiary.dateDied}
                          onChange={(apiDate) => handleUpdateBeneficiary(index, 'dateDied', apiDate)}
                          className="rounded-lg py-2 px-3 text-sm"
                        />
                      </td>
                      <td className="py-4 px-4">
                        <DateInput
                          id={`storage-from-${index}`}
                          name={`storage-from-${index}`}
                          value={beneficiary.storagePeriodFrom || ''}
                          onChange={(apiDate) => handleUpdateBeneficiary(index, 'internmentDate', apiDate)}
                          className="rounded-lg py-2 px-3 text-sm"
                        />
                      </td>
                      <td className="py-4 px-4">
                        <input
                          id={`death-cert-${index}`}
                          name={`death-cert-${index}`}
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

            {/* Removed duplicate Invoice button as it is now in the header */}
          </div>
        </div>
      </div>
      <InscriptionMailModal
        isOpen={isMailModalOpen}
        onClose={() => setIsMailModalOpen(false)}
        inscriptionCode={inscriptionRequestNo || ''}
        recipientEmail={emailId || ''}
        applicantName={applicantName || ''}
      />
    </div>
  );
}