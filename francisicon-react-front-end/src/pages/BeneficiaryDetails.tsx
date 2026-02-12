import React, {
  useCallback,
  useEffect,
  useState,
  useRef,
  useMemo,
} from 'react'
import {
  UsersIcon,
  PlusIcon,
  PrinterIcon,
  Trash2Icon,
  AlertCircleIcon,
} from 'lucide-react'
import { FormSelect } from '../components/FormSelect'
import { EnhancedBeneficiaryDatePicker } from '../components/EnhancedBeneficiaryDatePicker'
import { UpdateApplicationButton } from '../components/UpdateApplicationButton'
interface BeneficiaryDetailsProps {
  formData: any
  setFormData: (data: any) => void
  isReadOnly?: boolean
  validationErrors?: {
    beneficiaries?: string
  }
}
interface Beneficiary {
  id: number
  name: string
  idNo: string
  isCatholic: boolean
  isMale: boolean
  relationshipToApplicant: string
  dateOfBirth: string | null
  birthYear?: string | number | null
  relationshipToNominee1?: string | null
  relationshipToNominee2?: string | null
  status: 'Active' | 'Inactive' | 'Not Occupied' | 'Occupied'
  sex?: string
  fullName?: string
  nric?: string
  relationship?: string
  relationshipToApp?: string
  religion?: string
  gender?: string
  religiousAffiliation?: string
}
export function BeneficiaryDetails({
  formData,
  setFormData,
  isReadOnly = false,
  validationErrors = {},
}: BeneficiaryDetailsProps) {
  // Process beneficiary fields to ensure proper data mapping
  const processBeneficiaryData = (beneficiary: Beneficiary): Beneficiary => {
    const processed = { ...beneficiary }

    // Handle date fields - ensure proper null/empty string handling
    if (processed.dateOfBirth === '' || processed.dateOfBirth === 'null') {
      processed.dateOfBirth = null;
    }
    if (processed.birthYear === '' || processed.birthYear === 'null') {
      processed.birthYear = null;
    }

    // If we have a birthYear but no dateOfBirth, don't automatically set dateOfBirth to Jan 1st
    // This preserves the year-only format when needed
    if (processed.birthYear && !processed.dateOfBirth) {
      // Leave as is - birthYear exists but dateOfBirth is null
    }
    // If we have a dateOfBirth but no birthYear, extract year from date
    else if (processed.dateOfBirth && !processed.birthYear && typeof processed.dateOfBirth === 'string' && processed.dateOfBirth.includes('-')) {
      const parts = processed.dateOfBirth.split('-');
      if (parts.length === 3) {
        processed.birthYear = parts[2];
      }
    }

    // Handle religious affiliation mapping
    if (processed.religion === 'Catholic') {
      processed.isCatholic = true;
    } else if (processed.religion === 'Non Catholic' || processed.religion === 'Non-Catholic') {
      processed.isCatholic = false;
    } else if (typeof processed.isCatholic === 'boolean') {
      processed.religion = processed.isCatholic ? 'Catholic' : 'Non Catholic';
    }

    // Handle gender mapping
    if (processed.gender === 'Male' || processed.sex === 'Male') {
      processed.isMale = true;
      processed.sex = 'Male';
    } else if (processed.gender === 'Female' || processed.sex === 'Female') {
      processed.isMale = false;
      processed.sex = 'Female';
    } else if (typeof processed.isMale === 'boolean') {
      processed.sex = processed.isMale ? 'Male' : 'Female';
      processed.gender = processed.isMale ? 'Male' : 'Female';
    }

    return processed;
  }

  // Memoize processed beneficiaries to avoid unnecessary re-processing
  const processedBeneficiaries = useMemo(() => {
    if (formData.beneficiaries && Array.isArray(formData.beneficiaries)) {
      return formData.beneficiaries.map(processBeneficiaryData);
    }
    return [];
  }, [JSON.stringify(formData.beneficiaries)]);

  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>(processedBeneficiaries)
  const beneficiariesRef = useRef(beneficiaries)
  const isUpdatingFromComponent = useRef(false)
  const prevValuesRef = useRef<{
    [key: string]: any
  }>({})
  const currentBeneficiariesRef = useRef<Beneficiary[]>([])



  // Process beneficiary date fields and other properties
  // const processBeneficiaryDates = (beneficiary: Beneficiary): Beneficiary => {
  //   let processed = {
  //     ...beneficiary,
  //   }
  //   // Handle date of birth and birth year mapping
  //   if (
  //     (!processed.dateOfBirth || processed.dateOfBirth === '') &&
  //     processed.birthYear &&
  //     processed.birthYear !== ''
  //   ) {
  //     processed.dateOfBirth = `01-Jan-${processed.birthYear}`
  //   } else if (
  //     processed.dateOfBirth &&
  //     processed.dateOfBirth !== '' &&
  //     (!processed.birthYear || processed.birthYear === '')
  //   ) {
  //     if (processed.dateOfBirth.includes('-')) {
  //       const parts = processed.dateOfBirth.split('-')
  //       if (parts.length === 3) {
  //         processed.birthYear = parts[2]
  //       }
  //     }
  //   }

  //   // Synchronize religious affiliation and isCatholic
  //   if (processed.religion === 'Catholic') {
  //     processed.isCatholic = true;
  //   } else if (processed.religion === 'Non Catholic') {
  //     processed.isCatholic = false;
  //   } else if (typeof processed.isCatholic === 'boolean') {
  //     processed.religion = processed.isCatholic ? 'Catholic' : 'Non Catholic';
  //   }

  //   // Synchronize gender and isMale
  //   if (processed.sex === 'Male' || processed.gender === 'Male') {
  //     processed.isMale = true;
  //   } else if (processed.sex === 'Female' || processed.gender === 'Female') {
  //     processed.isMale = false;
  //   } else if (typeof processed.isMale === 'boolean') {
  //     processed.sex = processed.isMale ? 'Male' : 'Female';
  //   }

  //   return processed
  // }

  // Initialize previous values
  useEffect(() => {
    const initialPrevValues: {
      [key: string]: any
    } = {}
    if (Array.isArray(formData.beneficiaries)) {
      formData.beneficiaries.forEach((beneficiary: Beneficiary) => {
        const processed = processBeneficiaryData(beneficiary)
        Object.keys(processed).forEach((key) => {
          const value = (processed as any)[key]
          initialPrevValues[`${processed.id}-${key}`] =
            value === null ? null : value
        })
      })
    }
    prevValuesRef.current = initialPrevValues
  }, [JSON.stringify(formData.beneficiaries)])
  // Update refs when beneficiaries change
  useEffect(() => {
    beneficiariesRef.current = beneficiaries
    currentBeneficiariesRef.current = beneficiaries
  }, [beneficiaries])
  // Sync with external formData changes
  useEffect(() => {
    if (!isUpdatingFromComponent.current) {
      if (formData.beneficiaries && Array.isArray(formData.beneficiaries)) {
        const processedBeneficiaries = formData.beneficiaries.map(
          processBeneficiaryData,
        )
        const currentBeneficiaries = beneficiariesRef.current
        const hasChanges =
          currentBeneficiaries.length !== processedBeneficiaries.length ||
          currentBeneficiaries.some((current, index) => {
            const formDataBen = processedBeneficiaries[index]
            if (!formDataBen) return true
            return (
              current.id !== formDataBen.id ||
              (current.name || '') !== (formDataBen.name || '') ||
              (current.idNo || '') !== (formDataBen.idNo || '') ||
              (current.dateOfBirth || '') !== (formDataBen.dateOfBirth || '')
            )
          })
        if (hasChanges) {
          setBeneficiaries([...processedBeneficiaries])
          beneficiariesRef.current = [...processedBeneficiaries]
        }
      } else if (beneficiariesRef.current.length > 0) {
        setBeneficiaries([])
        beneficiariesRef.current = []
      }
    } else {
      isUpdatingFromComponent.current = false
    }
  }, [formData.beneficiaries])
  // Update form data with all beneficiaries
  const updateFormDataWithBeneficiaries = useCallback(
    (updatedBeneficiaries: Beneficiary[]) => {
      console.log('updateFormDataWithBeneficiaries called with:', updatedBeneficiaries);
      isUpdatingFromComponent.current = true
      const allBeneficiaryData: any = {
        beneficiaries: updatedBeneficiaries,
      }

      // Process each beneficiary efficiently
      for (let index = 0; index < updatedBeneficiaries.length; index++) {
        const beneficiary = updatedBeneficiaries[index];
        const i = index + 1

        let dateOfBirth = beneficiary.dateOfBirth || ''
        let birthYear: string | number | null = beneficiary.birthYear || null

        if (dateOfBirth && dateOfBirth.includes('-')) {
          const parts = dateOfBirth.split('-')
          if (parts.length === 3) birthYear = parts[2]
        }
        
        console.log(`Setting beneficiary${i}BirthYear to:`, typeof birthYear === 'number' ? birthYear.toString() : birthYear);

        allBeneficiaryData[`beneficiary${i}Name`] = beneficiary.name || ''
        allBeneficiaryData[`beneficiary${i}IDNo`] = beneficiary.idNo || ''
        allBeneficiaryData[`beneficiary${i}Relationship`] =
          beneficiary.relationshipToApplicant || ''
        allBeneficiaryData[`beneficiary${i}DateOfBirth`] = dateOfBirth
        allBeneficiaryData[`beneficiary${i}BirthYear`] = typeof birthYear === 'number' ? birthYear.toString() : birthYear
        allBeneficiaryData[`beneficiary${i}Gender`] = beneficiary.sex || ''
        allBeneficiaryData[`beneficiary${i}Religion`] =
          beneficiary.religion || ''
        allBeneficiaryData[`beneficiary${i}Status`] =
          beneficiary.status || 'Not Occupied'
        allBeneficiaryData[`beneficiary${i}RelationshipToNominee1`] =
          beneficiary.relationshipToNominee1 || ''
        allBeneficiaryData[`beneficiary${i}RelationshipToNominee2`] =
          beneficiary.relationshipToNominee2 || ''
        allBeneficiaryData[`beneficiary${i}IsCatholic`] =
          !!beneficiary.isCatholic
        allBeneficiaryData[`beneficiary${i}IsMale`] = !!beneficiary.isMale
      }

      // Clear fields for removed beneficiaries
      for (let i = updatedBeneficiaries.length + 1; i <= 5; i++) {
        allBeneficiaryData[`beneficiary${i}Name`] = ''
        allBeneficiaryData[`beneficiary${i}IDNo`] = ''
        allBeneficiaryData[`beneficiary${i}Relationship`] = ''
        allBeneficiaryData[`beneficiary${i}DateOfBirth`] = ''
        allBeneficiaryData[`beneficiary${i}BirthYear`] = ''
        allBeneficiaryData[`beneficiary${i}Gender`] = ''
        allBeneficiaryData[`beneficiary${i}Religion`] = ''
        allBeneficiaryData[`beneficiary${i}Status`] = 'Not Occupied'
        allBeneficiaryData[`beneficiary${i}RelationshipToNominee1`] = ''
        allBeneficiaryData[`beneficiary${i}RelationshipToNominee2`] = ''
        allBeneficiaryData[`beneficiary${i}IsCatholic`] = false
        allBeneficiaryData[`beneficiary${i}IsMale`] = false
      }

      setFormData(allBeneficiaryData)
    },
    [setFormData],
  )
  // Handle beneficiary field updates
  const handleUpdateBeneficiary = useCallback(
    <K extends keyof Beneficiary>(
      id: number,
      field: K,
      value: Beneficiary[K],
    ) => {
      setBeneficiaries((prev) => {
        const existing = prev.find((b) => b.id === id)
        if (!existing) return prev
        const key = `${id}-${String(field)}`
        let normalizedValue = value
        if (field === 'dateOfBirth') {
          normalizedValue =
            value === '' || value === null || value === undefined
              ? (null as Beneficiary[K])
              : value
        }
        const prevValue = prevValuesRef.current[key]
        const valueChanged = prevValue !== normalizedValue
        if (!valueChanged) return prev
        prevValuesRef.current[key] = normalizedValue
        const updated = prev.map((b) => {
          if (b.id === id) {
            let updatedBeneficiary = {
              ...b,
              [field]: normalizedValue,
            }

            // Handle religious affiliation and isCatholic synchronization
            if (field === 'religion' && typeof value === 'string') {
              updatedBeneficiary.isCatholic = value === 'Catholic';
              updatedBeneficiary.religion = value;
            } else if (field === 'isCatholic' && typeof value === 'boolean') {
              updatedBeneficiary.religion = value ? 'Catholic' : 'Non Catholic';
              updatedBeneficiary.isCatholic = value;
            }

            // Handle gender and isMale synchronization
            if (field === 'sex' && typeof value === 'string') {
              updatedBeneficiary.isMale = value === 'Male';
              updatedBeneficiary.sex = value;
              updatedBeneficiary.gender = value;
            } else if (field === 'gender' && typeof value === 'string') {
              updatedBeneficiary.isMale = value === 'Male';
              updatedBeneficiary.sex = value;
              updatedBeneficiary.gender = value;
            } else if (field === 'isMale' && typeof value === 'boolean') {
              updatedBeneficiary.sex = value ? 'Male' : 'Female';
              updatedBeneficiary.gender = value ? 'Male' : 'Female';
              updatedBeneficiary.isMale = value;
            }

            // Only automatically set dateOfBirth from birthYear if dateOfBirth is null AND we want this behavior
            // To preserve year-only format, we should not automatically convert birthYear to full date
            // The reverse conversion (full date to extract year) happens when dateOfBirth is set
            if (
              field === 'dateOfBirth' &&
              value &&
              typeof value === 'string' &&
              value.includes('-')
            ) {
              const parts = value.split('-');
              if (parts.length === 3) {
                // Convert to number to maintain consistency with EnhancedDatePicker
                updatedBeneficiary.birthYear = parseInt(parts[2], 10);
              }
            }
            return updatedBeneficiary
          }
          return b
        })
        updateFormDataWithBeneficiaries(updated)
        return updated
      })
    },
    [updateFormDataWithBeneficiaries],
  )
  // Add new beneficiary
  const handleAddBeneficiary = useCallback(() => {
    const newBeneficiary: Beneficiary = {
      id: Date.now(),
      name: '',
      idNo: '',
      isCatholic: true,
      isMale: true,
      relationshipToApplicant: '',
      dateOfBirth: null,
      status: 'Not Occupied',
      birthYear: null,
      relationshipToNominee1: null,
      relationshipToNominee2: null,
      sex: 'Male',
      religion: 'Catholic',
    }
    setBeneficiaries((prev) => {
      if (prev.some((b) => b.id === newBeneficiary.id)) return prev
      const updated = [...prev, newBeneficiary]
      updateFormDataWithBeneficiaries(updated)
      return updated
    })
  }, [updateFormDataWithBeneficiaries])
  // Remove beneficiary
  const handleRemoveBeneficiary = useCallback(
    (id: number) => {
      setBeneficiaries((prev) => {
        if (!prev.find((b) => b.id === id)) return prev
        const updated = prev.filter((b) => b.id !== id)
        updateFormDataWithBeneficiaries(updated)
        return updated
      })
    },
    [updateFormDataWithBeneficiaries],
  )
  // Handle date of birth changes for EnhancedBeneficiaryDatePicker
  const handleEnhancedDateChange = useCallback(
    (dateOfBirth: string | null, birthYear: number | null, beneficiaryId?: number | string) => {
      console.log('handleEnhancedDateChange called with:', { dateOfBirth, birthYear, beneficiaryId });
      
      // Early return checks
      if (isUpdatingFromComponent.current || beneficiaryId === undefined) {
        console.log('Early return in handleEnhancedDateChange');
        return;
      }

      const id = Number(beneficiaryId);
      console.log('Processing beneficiary id:', id);

      setBeneficiaries(prevBeneficiaries => {
        // Check if beneficiary exists
        const beneficiaryExists = prevBeneficiaries.some(b => b.id === id);
        if (!beneficiaryExists) {
          console.warn(`Beneficiary with id ${id} not found`);
          return prevBeneficiaries; // Return unchanged if beneficiary doesn't exist
        }
        
        console.log('Found beneficiary, updating...');

        const updatedBeneficiaries = prevBeneficiaries.map(beneficiary => {
          // Only update the matching beneficiary
          if (beneficiary.id !== id) {
            return beneficiary;
          }

          // Create updated beneficiary object
          const updatedBeneficiary = { ...beneficiary };

          // Handle different scenarios
          if (dateOfBirth === null && birthYear === null) {
            // Clear both fields
            updatedBeneficiary.dateOfBirth = null;
            updatedBeneficiary.birthYear = null;
            console.log('Cleared both dateOfBirth and birthYear');
          } else if (dateOfBirth !== null) {
            // Full date provided
            updatedBeneficiary.dateOfBirth = dateOfBirth;

            if (birthYear !== null && birthYear !== undefined) {
              // Explicit year provided
              updatedBeneficiary.birthYear = birthYear;
              console.log('Set both dateOfBirth and explicit birthYear:', { dateOfBirth, birthYear });
            } else {
              // Extract year from date string
              const extractedYear = extractYearFromDate(dateOfBirth);
              if (extractedYear !== null) {
                updatedBeneficiary.birthYear = extractedYear;
                console.log('Extracted birthYear from dateOfBirth:', extractedYear);
              }
            }
          } else if (birthYear !== null) {
            // Year only provided
            updatedBeneficiary.dateOfBirth = null;
            updatedBeneficiary.birthYear = birthYear;
            console.log('Set birthYear only:', birthYear);
          }

          return updatedBeneficiary;
        });

        // Update form data with all beneficiaries
        console.log('Calling updateFormDataWithBeneficiaries with updated beneficiaries');
        updateFormDataWithBeneficiaries(updatedBeneficiaries);

        return updatedBeneficiaries;
      });
    },
    [updateFormDataWithBeneficiaries]
  );

  // Helper function to extract year from date string
  const extractYearFromDate = (dateString: string): number | null => {
    try {
      // Handle different date formats: YYYY-MM-DD, DD-MM-YYYY, MM-DD-YYYY
      const date = new Date(dateString);

      if (!isNaN(date.getTime())) {
        return date.getFullYear();
      }

      // Fallback: try to parse manually
      const parts = dateString.split('-');
      if (parts.length === 3) {
        // Try DD-MM-YYYY format
        if (parts[2].length === 4) {
          return parseInt(parts[2], 10);
        }
        // Try YYYY-MM-DD format
        if (parts[0].length === 4) {
          return parseInt(parts[0], 10);
        }
      }

      return null;
    } catch (error) {
      console.error('Error extracting year from date:', error);
      return null;
    }
  };
  const inputBaseClass = `
    w-full px-4 py-2.5 
    border border-gray-300 rounded-lg 
    text-sm text-gray-900
    transition-colors duration-150
    focus:outline-none focus:ring-2 focus:ring-[#8b5a2b] focus:border-transparent
    placeholder:text-gray-400
  `
  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 bg-gradient-to-br from-[#8b2828] to-[#6d1f1f] rounded-xl flex items-center justify-center shadow-lg shadow-red-900/20">
          <UsersIcon className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Beneficiary Details
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Add and manage beneficiary information
          </p>
        </div>
      </div>

      {/* Validation Error */}
      {validationErrors.beneficiaries && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-start gap-3">
          <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
            <AlertCircleIcon className="w-3 h-3 text-white" />
          </div>
          <div>
            <p className="text-red-800 font-medium text-sm">Validation Error</p>
            <p className="text-red-600 text-sm mt-0.5">
              {validationErrors.beneficiaries}
            </p>
          </div>
        </div>
      )}

      {/* Beneficiary Cards */}
      <div className="space-y-6">
        {beneficiaries.map((beneficiary: Beneficiary, index: number) => {
          return (
            <div
              key={beneficiary.id}
              className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm"
            >
              {/* Card Header */}
              <div className="bg-gray-50 border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#8b5a2b] text-white text-xs font-bold">
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500 font-medium">
                      Beneficiary
                    </p>
                    <h3 className="text-base font-semibold text-gray-900 -mt-0.5">
                      {beneficiary.name ||
                        beneficiary.fullName ||
                        'New Beneficiary'}
                    </h3>
                  </div>
                </div>
                {!isReadOnly && (
                  <button
                    onClick={() => handleRemoveBeneficiary(beneficiary.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">Remove</span>
                  </button>
                )}
              </div>

              {/* Card Body */}
              <div className="p-6 space-y-5">
                {/* Row 1: Name & NRIC */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={beneficiary.name || beneficiary.fullName || ''}
                      onChange={(e) =>
                        handleUpdateBeneficiary(
                          beneficiary.id,
                          'name',
                          e.target.value,
                        )
                      }
                      placeholder="Enter full name"
                      disabled={isReadOnly}
                      className={`${inputBaseClass} ${isReadOnly ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}`}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      NRIC / Passport No.
                    </label>
                    <input
                      type="text"
                      value={beneficiary.idNo || beneficiary.nric || ''}
                      onChange={(e) =>
                        handleUpdateBeneficiary(
                          beneficiary.id,
                          'idNo',
                          e.target.value,
                        )
                      }
                      placeholder="Enter NRIC or Passport"
                      disabled={isReadOnly}
                      className={`${inputBaseClass} ${isReadOnly ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}`}
                    />
                  </div>
                </div>

                {/* Row 2: Date of Birth */}
                <EnhancedBeneficiaryDatePicker
                  label="Date of Birth"
                  id={beneficiary.id}
                  dateOfBirth={beneficiary.dateOfBirth}
                  birthYear={beneficiary.birthYear}
                  onChange={handleEnhancedDateChange}
                  disabled={isReadOnly}
                />

                {/* Row 3: Relationship to Applicant */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Relationship to Applicant
                  </label>
                  <input
                    type="text"
                    value={
                      beneficiary.relationshipToApplicant ||
                      beneficiary.relationship ||
                      ''
                    }
                    onChange={(e) =>
                      handleUpdateBeneficiary(
                        beneficiary.id,
                        'relationshipToApplicant',
                        e.target.value,
                      )
                    }
                    placeholder="e.g., Father, Mother, Spouse"
                    disabled={isReadOnly}
                    className={`${inputBaseClass} ${isReadOnly ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}`}
                  />
                </div>

                {/* Row 4: Religious Affiliation */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Religious Affiliation
                  </label>
                  <div className="flex flex-wrap gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name={`religion-${beneficiary.id}`}
                        value="Catholic"
                        checked={
                          beneficiary.religion === 'Catholic' ||
                          !!beneficiary.isCatholic
                        }
                        onChange={(e) => {
                          handleUpdateBeneficiary(
                            beneficiary.id,
                            'religion',
                            e.target.value,
                          );
                          // Update isCatholic based on selection
                          handleUpdateBeneficiary(
                            beneficiary.id,
                            'isCatholic',
                            e.target.value === 'Catholic',
                          );
                        }}
                        disabled={isReadOnly}
                        className="w-4 h-4 text-[#8b5a2b] border-gray-300 focus:ring-[#8b5a2b] focus:ring-2"
                      />
                      <span className="text-sm text-gray-700">Catholic</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name={`religion-${beneficiary.id}`}
                        value="Non Catholic"
                        checked={
                          beneficiary.religion === 'Non Catholic' ||
                          !beneficiary.isCatholic
                        }
                        onChange={(e) => {
                          handleUpdateBeneficiary(
                            beneficiary.id,
                            'religion',
                            e.target.value,
                          );
                          // Update isCatholic based on selection
                          handleUpdateBeneficiary(
                            beneficiary.id,
                            'isCatholic',
                            e.target.value === 'Catholic',
                          );
                        }}
                        disabled={isReadOnly}
                        className="w-4 h-4 text-[#8b5a2b] border-gray-300 focus:ring-[#8b5a2b] focus:ring-2"
                      />
                      <span className="text-sm text-gray-700">
                        Non Catholic
                      </span>
                    </label>
                  </div>
                </div>

                {/* Row 5 & 6: Relationship to Nominees */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Relationship to Nominee 1
                    </label>
                    <input
                      type="text"
                      value={beneficiary.relationshipToNominee1 || ''}
                      onChange={(e) =>
                        handleUpdateBeneficiary(
                          beneficiary.id,
                          'relationshipToNominee1',
                          e.target.value,
                        )
                      }
                      placeholder="Enter relationship"
                      disabled={isReadOnly}
                      className={`${inputBaseClass} ${isReadOnly ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}`}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Relationship to Nominee 2
                    </label>
                    <input
                      type="text"
                      value={beneficiary.relationshipToNominee2 || ''}
                      onChange={(e) =>
                        handleUpdateBeneficiary(
                          beneficiary.id,
                          'relationshipToNominee2',
                          e.target.value,
                        )
                      }
                      placeholder="Enter relationship"
                      disabled={isReadOnly}
                      className={`${inputBaseClass} ${isReadOnly ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}`}
                    />
                  </div>
                </div>

                {/* Row 7: Gender */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Gender
                  </label>
                  <div className="flex flex-wrap gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name={`gender-${beneficiary.id}`}
                        value="Male"
                        checked={
                          beneficiary.sex === 'Male' ||
                          beneficiary.gender === 'Male' ||
                          !!beneficiary.isMale
                        }
                        onChange={(e) => {
                          handleUpdateBeneficiary(
                            beneficiary.id,
                            'sex',
                            e.target.value,
                          );
                          // Update isMale based on selection
                          handleUpdateBeneficiary(
                            beneficiary.id,
                            'isMale',
                            e.target.value === 'Male',
                          );
                        }}
                        disabled={isReadOnly}
                        className="w-4 h-4 text-[#8b5a2b] border-gray-300 focus:ring-[#8b5a2b] focus:ring-2"
                      />
                      <span className="text-sm text-gray-700">Male</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name={`gender-${beneficiary.id}`}
                        value="Female"
                        checked={
                          beneficiary.sex === 'Female' ||
                          beneficiary.gender === 'Female' ||
                          !beneficiary.isMale
                        }
                        onChange={(e) => {
                          handleUpdateBeneficiary(
                            beneficiary.id,
                            'sex',
                            e.target.value,
                          );
                          // Update isMale based on selection
                          handleUpdateBeneficiary(
                            beneficiary.id,
                            'isMale',
                            e.target.value === 'Male',
                          );
                        }}
                        disabled={isReadOnly}
                        className="w-4 h-4 text-[#8b5a2b] border-gray-300 focus:ring-[#8b5a2b] focus:ring-2"
                      />
                      <span className="text-sm text-gray-700">Female</span>
                    </label>
                  </div>
                </div>

                {/* Row 8: Status */}
                <FormSelect
                  label="Status"
                  value={beneficiary.status || 'Not Occupied'}
                  onChange={(value: string) =>
                    handleUpdateBeneficiary(
                      beneficiary.id,
                      'status',
                      value as Beneficiary['status'],
                    )
                  }
                  options={[
                    {
                      value: 'Not Occupied',
                      label: 'Not Occupied',
                    },
                    {
                      value: 'Occupied',
                      label: 'Occupied',
                    },
                    {
                      value: 'Active',
                      label: 'Active',
                    },
                    {
                      value: 'Inactive',
                      label: 'Inactive',
                    },
                  ]}
                  disabled={isReadOnly}
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3 mt-8">
        <button
          onClick={handleAddBeneficiary}
          disabled={isReadOnly}
          className={`
            inline-flex items-center gap-2 px-5 py-2.5 
            bg-[#8b5a2b] text-white rounded-lg font-medium text-sm
            shadow-sm shadow-amber-900/20
            transition-all duration-150
            ${isReadOnly ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#7a4f26] hover:shadow-md active:scale-[0.98]'}
          `}
        >
          <PlusIcon className="w-4 h-4" />
          Add Beneficiary
        </button>
        <button className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium text-sm hover:bg-gray-200 transition-colors">
          <PrinterIcon className="w-4 h-4" />
          Print Insertion
        </button>

        {/* Update Application Button */}
        <UpdateApplicationButton
          formData={formData}
          isReadOnly={isReadOnly}
          className="ml-auto"
        />
      </div>

      {/* Empty State */}
      {beneficiaries.length === 0 && (
        <div className="text-center py-16 px-4">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <UsersIcon className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            No beneficiaries added
          </h3>
          <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">
            Get started by adding a beneficiary to this application.
          </p>
          <button
            onClick={handleAddBeneficiary}
            disabled={isReadOnly}
            className={`
              inline-flex items-center gap-2 px-5 py-2.5 
              bg-[#8b5a2b] text-white rounded-lg font-medium text-sm
              shadow-sm shadow-amber-900/20
              transition-all duration-150
              ${isReadOnly ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#7a4f26] hover:shadow-md active:scale-[0.98]'}
            `}
          >
            <PlusIcon className="w-4 h-4" />
            Add Beneficiary
          </button>
        </div>
      )}
    </div>
  )
}
