import { useEffect, useCallback, useRef, useState } from 'react';
import { MapPinIcon, LoaderIcon } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import {
  lookupAddressByPostalCode
} from '../store/addressSlice';
import { Input } from './common/Input';
import { FormSelect } from './FormSelect';
export { parseRawAddress } from '../utils/addressMapper';
import {
  createCompleteAddressObject,
  mapBackendToComponentFields,
  parseRawAddress,
} from '../utils/addressMapper';


interface AddressInputProps {
  /**
   * Callback to update parent form data
   * Provides both component-friendly fields and backend-compatible fields
   */
  onAddressChange?: (addressData: {
    // Component-friendly fields
    block?: string;
    blockNo?: string;
    streetName?: string;
    unitNo?: string;
    postalCode?: string;
    country?: string;
    // Backend-compatible fields (mapped automatically)
    addressNo?: string;
    addressLine1?: string;
    addressLine2?: string;
    addressCity?: string;
    addressState?: string;
    addressCountry?: string;
  }) => void;

  /**
   * Whether to automatically sync changes (default: false for batched updates)
   */
  autoSync?: boolean;

  /**
   * Initial address values from form data
   * Can accept either component fields or backend fields
   */
  initialValues?: {
    // Component-friendly fields
    block?: string;
    blockNo?: string;
    streetName?: string;
    unitNo?: string;
    postalCode?: string;
    country?: string;
    // Backend-compatible fields (will be converted automatically)
    addressNo?: string;
    addressLine1?: string;
    addressLine2?: string;
    addressCity?: string;
    addressState?: string;
    addressCountry?: string;
  };

  /**
   * Whether the address fields are read-only
   */
  isReadOnly?: boolean;

  /**
   * Validation error message
   */
  error?: string;

  /**
   * Whether to show the label
   */
  showLabel?: boolean;

  /**
   * Custom label text
   */
  label?: string;

  /**
   * Optional raw/legacy address string. If provided and structured
   * initialValues are missing, this will be parsed using the component's
   * internal converter and mapped into the structured fields.
   */
  initialAddressString?: string;
}

/**
 * Reusable Address Input Component
 * 
 * Features:
 * - Block/No dropdown (Block or No)
 * - Street Name
 * - Unit No
 * - Postal Code (with auto-lookup)
 * - Country
 * - Auto-fill from postal code lookup
 * - Auto-fill from block/street lookup
 * - Responsive grid layout
 * - Legacy address format conversion
 */
export function AddressInput({
  onAddressChange,
  initialValues,
  isReadOnly = false,
  error,
  showLabel = true,
  label = 'Address',
  initialAddressString
}: AddressInputProps) {

  const dispatch = useDispatch<AppDispatch>();

  // Local state for this instance
  const [localAddressState, setLocalAddressState] = useState(() => {
    return {
      block: initialValues?.block || '',
      blockNo: initialValues?.blockNo || '',
      streetName: initialValues?.streetName || '',
      unitNo: initialValues?.unitNo || '',
      postalCode: initialValues?.postalCode || '',
      country: initialValues?.country || 'Singapore',
    };
  });

  const setAddressValue = (key: string, value: any) => {
    // Only update local state here — the backup sync useEffect will
    // detect the change via localAddressState and call onAddressChange.
    // Calling onAddressChange inside setLocalAddressState caused
    // double-fire cascades that cleared other nominees' addresses.
    setLocalAddressState(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Get lookup state from Redux (for loading indicators)
  const addressLookupState = useSelector((state: RootState) => ({
    isLookingUp: state.address.isLookingUp,
    lookupError: state.address.lookupError
  }));

  // Debounce refs for postal code lookup only (removed block/street auto-lookup)
  const postalCodeDebounceRef = useRef<NodeJS.Timeout | null>(null);

  const isInitializedRef = useRef(false);
  const lastSyncedValuesRef = useRef<string>('');
  const lastInitialValuesRef = useRef<string>('');

  // Keep a ref to the latest onAddressChange callback. This prevents the
  // sync useEffect from depending on onAddressChange (which is an inline
  // function from NomineeDetails and creates a new ref every render),
  // breaking the infinite re-render/re-fire feedback loop.
  const onAddressChangeRef = useRef(onAddressChange);
  onAddressChangeRef.current = onAddressChange;

  // Initialize address fields from initialValues or initialAddressString
  // This effect runs when initialValues or initialAddressString change (e.g., when loading data in edit mode)
  useEffect(() => {
    console.log('AddressInput: Initialization useEffect called with:', { initialValues, initialAddressString });
    // Create a string representation of current initialValues to detect changes
    const currentInitialValuesKey = JSON.stringify({
      block: initialValues?.block || '',
      blockNo: initialValues?.blockNo || '',
      streetName: initialValues?.streetName || '',
      unitNo: initialValues?.unitNo || '',
      postalCode: initialValues?.postalCode || '',
      country: initialValues?.country || '',
      addressString: initialAddressString || ''
    });

    // Only update if initialValues actually changed (not just on first mount)
    if (isInitializedRef.current && currentInitialValuesKey === lastInitialValuesRef.current) {
      return;
    }

    lastInitialValuesRef.current = currentInitialValuesKey;

    // 1) Prefer explicit structured values if provided (component fields)
    // Check if we have any meaningful initial values (not just empty strings)
    const hasMeaningfulValues = initialValues && (
      (initialValues.block && initialValues.block.trim() !== '') ||
      (initialValues.blockNo && initialValues.blockNo.trim() !== '') ||
      (initialValues.streetName && initialValues.streetName.trim() !== '') ||
      (initialValues.unitNo && initialValues.unitNo.trim() !== '') ||
      (initialValues.postalCode && initialValues.postalCode.trim() !== '') ||
      (initialValues.country && initialValues.country.trim() !== '')
    );

    if (hasMeaningfulValues) {
      console.log('AddressInput: Initializing with structured values:', initialValues);
      // Only update local state if the new values actually differ from current state
      // This prevents clearing user input during cascading re-renders
      setLocalAddressState(prev => {
        const newBlock = initialValues.block || '';
        const newBlockNo = initialValues.blockNo || '';
        const newStreetName = initialValues.streetName || '';
        const newUnitNo = initialValues.unitNo || '';
        const newPostalCode = initialValues.postalCode || '';
        const newCountry = initialValues.country || 'Singapore';
        // Skip update if values haven't actually changed
        if (
          prev.block === newBlock &&
          prev.blockNo === newBlockNo &&
          prev.streetName === newStreetName &&
          prev.unitNo === newUnitNo &&
          prev.postalCode === newPostalCode &&
          prev.country === newCountry
        ) {
          return prev;
        }
        return {
          ...prev,
          block: newBlock,
          blockNo: newBlockNo,
          streetName: newStreetName,
          unitNo: newUnitNo,
          postalCode: newPostalCode,
          country: newCountry
        };
      });
      isInitializedRef.current = true;
      return;
    }

    // 1b) Check if we have backend-style fields and convert them
    if (initialValues && (
      initialValues.addressNo ||
      initialValues.addressLine1 ||
      initialValues.addressLine2 ||
      initialValues.addressCity ||
      initialValues.addressState ||
      initialValues.addressCountry
    )) {
      console.log('Converting backend fields to component fields:', initialValues);
      // Convert backend fields to component fields
      const backendFields = {
        addressNo: initialValues.addressNo || '',
        addressLine1: initialValues.addressLine1 || '',
        addressLine2: initialValues.addressLine2 || '',
        addressCity: initialValues.addressCity || '',
        addressState: initialValues.addressState || '',
        addressCountry: initialValues.addressCountry || 'Singapore'
      };

      const componentFields = mapBackendToComponentFields(backendFields);
      console.log('Converted to component fields:', componentFields);

      setLocalAddressState(prev => ({
        ...prev,
        block: componentFields.block || '',
        blockNo: componentFields.blockNo || '',
        streetName: componentFields.streetName || '',
        unitNo: componentFields.unitNo || '',
        postalCode: componentFields.postalCode || '',
        country: componentFields.country || 'Singapore'
      }));
      isInitializedRef.current = true;
      return;
    }

    // 2) Fallback: parse raw/legacy address string if provided
    if (initialAddressString && initialAddressString.trim()) {
      const parsed = parseRawAddress(initialAddressString);
      setLocalAddressState(prev => ({
        ...prev,
        block: parsed.block,
        blockNo: parsed.blockNo,
        streetName: parsed.streetName,
        unitNo: parsed.unitNo,
        postalCode: parsed.postalCode,
        country: parsed.country || 'Singapore'
      }));
      isInitializedRef.current = true;
      return;
    }

    // 3) If no initial values provided and not yet initialized, set defaults
    // ✅ FIX: Auto-default block to "Block" selection
    if (!isInitializedRef.current) {
      setLocalAddressState(prev => ({
        ...prev,
        block: 'Block', // ✅ FIX: Default to Block instead of empty
        blockNo: '',
        streetName: '',
        unitNo: '',
        postalCode: '',
        country: 'Singapore'
      }));
      isInitializedRef.current = true;
    }
  }, [initialValues, initialAddressString]);

  // Primary sync mechanism — fires onAddressChange when localAddressState changes.
  // Uses lastSyncedValuesRef to avoid duplicate calls.
  // IMPORTANT: We depend ONLY on localAddressState, NOT onAddressChange.
  // The callback is read from onAddressChangeRef to avoid re-triggering when
  // the parent re-renders and passes a new inline function reference.
  useEffect(() => {
    const cb = onAddressChangeRef.current;
    if (!cb) return;

    // Get current values
    const block = localAddressState.block;
    const blockNo = localAddressState.blockNo;
    const streetName = localAddressState.streetName;
    const unitNo = localAddressState.unitNo;
    const postalCode = localAddressState.postalCode;
    const country = localAddressState.country;

    // Create a string representation of current values to compare
    const currentValues = JSON.stringify({
      block,
      blockNo,
      streetName,
      unitNo,
      postalCode,
      country
    });

    // Only call if values actually changed
    if (currentValues !== lastSyncedValuesRef.current) {
      lastSyncedValuesRef.current = currentValues;

      // Create complete address object with both field formats
      const componentFields = { block, blockNo, streetName, unitNo, postalCode, country };
      const completeAddress = createCompleteAddressObject(componentFields);

      console.log('AddressInput: Sync useEffect triggering onAddressChange with:', completeAddress);
      cb(completeAddress);
    }
  }, [localAddressState]); // NOT depending on onAddressChange — read from ref

  // Handle postal code change with auto-fill (only when postal code changes)
  const handlePostalCodeChange = useCallback((value: string) => {
    setAddressValue('postalCode', value);

    // Clear existing debounce
    if (postalCodeDebounceRef.current) {
      clearTimeout(postalCodeDebounceRef.current);
    }

    // Debounce the lookup - only lookup when postal code is entered
    postalCodeDebounceRef.current = setTimeout(() => {
      if (value && value.replace(/\s+/g, '').trim().length >= 4) {
        dispatch(lookupAddressByPostalCode(value)).then((action) => {
          if (lookupAddressByPostalCode.fulfilled.match(action)) {
            // Update local state with lookup results
            setLocalAddressState(prev => {
              const newState = {
                ...prev,
                blockNo: action.payload.blockNo || prev.blockNo,
                streetName: action.payload.streetName || prev.streetName,
                unitNo: action.payload.unitNo || prev.unitNo,
                postalCode: action.payload.postalCode || prev.postalCode,
                country: action.payload.country || prev.country
              };

              // Trigger address change with updated values from postal code lookup
              if (onAddressChange) {
                const componentFields = {
                  block: newState.block,
                  blockNo: newState.blockNo,
                  streetName: newState.streetName,
                  unitNo: newState.unitNo,
                  postalCode: newState.postalCode,
                  country: newState.country
                };
                const completeAddress = createCompleteAddressObject(componentFields);
                console.log('AddressInput: Postal code lookup triggering onAddressChange with:', completeAddress);
                onAddressChange(completeAddress);
              }

              return newState;
            });
          }
        });
      }
    }, 800);
  }, [dispatch, onAddressChange, setAddressValue]);

  // Cleanup debounce timers
  useEffect(() => {
    return () => {
      if (postalCodeDebounceRef.current) {
        clearTimeout(postalCodeDebounceRef.current);
      }
    };
  }, []);

  // Determine block type: if block has value equal to 'Block', it's 'Block', otherwise 'No'
  const blockType = localAddressState.block === 'Block' ? 'Block' : 'No';

  return (
    <div>
      {showLabel && (
        <label className="text-sm font-medium text-gray-700 mb-3 block flex items-center gap-1">
          <MapPinIcon className="w-4 h-4 text-gray-400" />
          {label}
        </label>
      )}

      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {/* Block/No Dropdown */}
        <div>
          <select
            value={blockType}
            onChange={(e) => {
              const newBlockType = e.target.value;
              setAddressValue('block', newBlockType === 'Block' ? 'Block' : '');
            }}
            disabled={isReadOnly}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#8b5a2b] focus:border-transparent text-sm"
          >
            <option value="No">No</option>
            <option value="Block">Block</option>
          </select>
        </div>

        {/* Block No / No - always shown */}
        <div>
          <Input
            label=""
            type="text"
            value={localAddressState.blockNo || ''}
            onChange={(e) => {
              setAddressValue('blockNo', e.target.value);
            }}
            placeholder={blockType === 'Block' ? "Block No" : "No"}
            disabled={isReadOnly}
            className="text-sm"
          />
        </div>

        {/* Street Name */}
        <div className="md:col-span-2">
          <Input
            label=""
            type="text"
            value={localAddressState.streetName || ''}
            onChange={(e) => {
              setAddressValue('streetName', e.target.value);
            }}
            placeholder="Street Name"
            disabled={isReadOnly}
            className="text-sm"
          />
        </div>

        {/* Unit No */}
        <div>
          <Input
            label=""
            type="text"
            value={localAddressState.unitNo || ''}
            onChange={(e) => {
              setAddressValue('unitNo', e.target.value);
            }}
            placeholder="Unit No"
            disabled={isReadOnly}
            className="text-sm"
          />
        </div>

        {/* Postal Code */}
        <div>
          <Input
            label=""
            type="text"
            value={localAddressState.postalCode || ''}
            onChange={(e) => handlePostalCodeChange(e.target.value)}
            placeholder="Postal Code"
            disabled={isReadOnly}
            maxLength={6}
            className="text-sm"
          />
          {addressLookupState.isLookingUp && (
            <div className="flex items-center gap-1 mt-1 text-xs text-gray-600">
              <LoaderIcon className="w-3 h-3 animate-spin" />
              <span>Looking up...</span>
            </div>
          )}
          {addressLookupState.lookupError && (
            <div className="text-xs text-amber-600 mt-1">
              {addressLookupState.lookupError}
            </div>
          )}
        </div>
      </div>

      {/* Country */}
      <div className="mt-3">
        <div className="w-full md:w-1/3">
          <FormSelect
            label="Country"
            value={localAddressState.country || 'Singapore'}
            onChange={(value) => {
              setAddressValue('country', value || 'Singapore');
            }}
            options={[
              { value: 'Singapore', label: 'Singapore' },
              { value: 'Malaysia', label: 'Malaysia' },
              { value: 'Others', label: 'Others' }
            ]}
            disabled={isReadOnly}
          />
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="text-sm text-red-600 flex items-center gap-1 mt-2">
          <span className="text-red-500">⚠</span>
          {error}
        </div>
      )}
    </div>
  );
}