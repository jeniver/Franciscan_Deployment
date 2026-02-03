import { useEffect, useCallback, useRef, useState } from 'react';
import { MapPinIcon, LoaderIcon } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { 
  lookupAddressByPostalCode
} from '../store/addressSlice';
import { Input } from './common/Input';
import { FormSelect } from './FormSelect';
import { createCompleteAddressObject, mapComponentToBackendFields, mapBackendToComponentFields } from '../utils/addressMapper';

export interface ParsedAddress {
  block: string;
  blockNo: string;
  streetName: string;
  unitNo: string;
  postalCode: string;
  country: string;
}

/**
 * Parse a raw address string into structured address fields.
 *
 * Examples handled:
 * - "Blk 343 Choa Chu Kang Loop #06-43 Singapore 680343"
 * - "Block 343 Choa Chu Kang Loop #06-43, Singapore 680343"
 * - "343 Choa Chu Kang Loop, #06-43, Singapore 680343"
 * - "343 Choa Chu Kang Loop 680343"
 */
export function parseRawAddress(addressString: string): ParsedAddress {
  const result: ParsedAddress = {
    block: '',
    blockNo: '',
    streetName: '',
    unitNo: '',
    postalCode: '',
    country: 'Singapore'
  };

  if (!addressString || !addressString.trim()) {
    return result;
  }

  const address = addressString.trim();

  // Pattern 1: "Blk XXX Street Name #XX-XX Singapore XXXXXX" or "Block XXX Street Name #XX-XX Singapore XXXXXX"
  const pattern1 = address.match(/B[il]o?ck\s*(\d+[A-Z]?)\s+(.+?)(?:,\s*Singapore\s+(\d{6}))?/i);
  if (pattern1) {
    const blockNo = pattern1[1];
    const rest = pattern1[2].trim();
    const postalCode = pattern1[3] || '';

    // Extract unit number (#XX-XX)
    const unitMatch = rest.match(/#(\d+-\d+)/);
    if (unitMatch) {
      result.unitNo = `#${unitMatch[1]}`;
      const streetPart = rest.replace(/#\d+-\d+/, '').trim();
      result.streetName = streetPart;
    } else {
      result.streetName = rest;
    }

    result.block = 'Block';
    result.blockNo = blockNo;
    if (postalCode) {
      result.postalCode = postalCode;
    }
    return result;
  }

  // Pattern 2: Comma-separated format "Block XXX, Street Name, #XX-XX, Singapore XXXXXX"
  const parts = address.split(',').map(p => p.trim()).filter(Boolean);
  if (parts.length >= 2) {
    parts.forEach((part, index) => {
      const lowerPart = part.toLowerCase();

      if (lowerPart.includes('blk') || lowerPart.includes('block')) {
        const blockMatch = part.match(/(\d+[A-Z]?)/);
        if (blockMatch) {
          result.block = 'Block';
          result.blockNo = blockMatch[1];
        }
      } else if (part.startsWith('#')) {
        result.unitNo = part;
      } else if (lowerPart.includes('singapore')) {
        const postalMatch = part.match(/(\d{6})/);
        if (postalMatch) {
          result.postalCode = postalMatch[1];
        }
        result.country = 'Singapore';
      } else if (!part.match(/^\d{6}$/) && index < parts.length - 1) {
        // Likely street name
        result.streetName = part;
      } else if (part.match(/^\d{6}$/)) {
        // Postal code
        result.postalCode = part;
      }
    });

    // If we still don't have a street name and there's at least one part, use the first non-empty
    if (!result.streetName && parts.length > 0) {
      result.streetName = parts[0];
    }

    return result;
  }

  // Pattern 3: Generic "No Street ... #Unit ..." style (e.g. "888 WOODLANDS DRIVE 50 #88")
  // Also works for addresses without "#" (e.g. "888 WOODLANDS DRIVE 50 680343 Singapore")
  // Extract unit (starting with '#') first, then infer house/flat number and street.
  let remainingAddress = address;

  const hashIndex = address.indexOf('#');
  if (hashIndex !== -1) {
    const unitPart = address.slice(hashIndex).trim();
    // Take the first token starting with '#' as unit number
    const unitTokenMatch = unitPart.match(/#\S+/);
    if (unitTokenMatch) {
      result.unitNo = unitTokenMatch[0];
    }
    remainingAddress = address.slice(0, hashIndex).trim();
  }

  // Pattern 3a: Extract postal code if present (6 digits) from the remaining or full string
  const postalMatch = remainingAddress.match(/\b(\d{6})\b/) || address.match(/\b(\d{6})\b/);
  if (postalMatch) {
    result.postalCode = postalMatch[1];
  }

  // Attempt to infer "No" and street name from the remaining part.
  // Heuristic: first token numeric/alphanumeric -> No; rest -> street name.
  const tokens = remainingAddress.split(/\s+/).filter(Boolean);
  if (tokens.length >= 2) {
    const first = tokens[0];
    if (/^\d+[A-Za-z]?$/.test(first)) {
      result.blockNo = first;
      // Exclude any trailing postal code token if we've already captured it
      const streetTokens = tokens.slice(1).filter(t => !(result.postalCode && t === result.postalCode));
      result.streetName = streetTokens.join(' ').trim();
    }
  }

  // Fallback: if we still don't have a street name, treat full address as street name
  if (!result.streetName) {
    result.streetName = address;
  }

  return result;
}

interface AddressInputProps {
  /**
   * Prefix for form data fields (e.g., 'applicant', 'contact', 'nominee')
   * This allows the component to work with different form contexts
   */
  fieldPrefix?: string;
  
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
  fieldPrefix = '',
  onAddressChange,
  initialValues,
  isReadOnly = false,
  error,
  showLabel = true,
  label = 'Address',
  initialAddressString,
  autoSync = false
}: AddressInputProps) {
  const dispatch = useDispatch<AppDispatch>();
  
  // Create a stable, unique instance ID using useRef to ensure consistency across renders
  const instanceIdRef = useRef<string>(`${fieldPrefix || 'address'}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  const instanceId = instanceIdRef.current;
  
  // Local state for this instance using the stable instance ID
  const [localAddressState, setLocalAddressState] = useState(() => {
    return {
      block: initialValues?.block || '',
      blockNo: initialValues?.blockNo || '',
      streetName: initialValues?.streetName || '',
      unitNo: initialValues?.unitNo || '',
      postalCode: initialValues?.postalCode || '',
      country: initialValues?.country || 'Singapore',
      isLookingUp: false,
      lookupError: null as string | null
    };
  });
  
  // Helper functions to get/set values for this specific instance
  const getAddressValue = (key: string): string => {
    return localAddressState[key as keyof typeof localAddressState] as string || '';
  };
  
  const setAddressValue = (key: string, value: any) => {
    setLocalAddressState(prev => {
      const newState = {
        ...prev,
        [key]: value
      };
      
      // Trigger immediate address change callback for better responsiveness
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
        console.log('AddressInput: Immediate onAddressChange triggered for field:', key, 'with value:', value);
        console.log('AddressInput: Complete address data:', completeAddress);
        onAddressChange(completeAddress);
      }
      
      return newState;
    });
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
      setLocalAddressState(prev => ({
        ...prev,
        block: initialValues.block || '',
        blockNo: initialValues.blockNo || '',
        streetName: initialValues.streetName || '',
        unitNo: initialValues.unitNo || '',
        postalCode: initialValues.postalCode || '',
        country: initialValues.country || 'Singapore'
      }));
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

  // Backup sync mechanism - should not be needed with the immediate approach above
  useEffect(() => {
    // This effect mainly serves as a backup/fallback mechanism
    if (!onAddressChange) return;
    
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
    
    // Always call onAddressChange if values actually changed (regardless of autoSync)
    if (currentValues !== lastSyncedValuesRef.current) {
      lastSyncedValuesRef.current = currentValues;
      
      // Create complete address object with both field formats
      const componentFields = { block, blockNo, streetName, unitNo, postalCode, country };
      const completeAddress = createCompleteAddressObject(componentFields);
      
      console.log('AddressInput: Backup useEffect triggering onAddressChange with:', completeAddress);
      onAddressChange(completeAddress);
    }
  }, [localAddressState, onAddressChange]);

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
            placeholder="Select country"
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