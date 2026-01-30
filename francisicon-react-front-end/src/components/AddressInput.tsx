import { useEffect, useCallback, useRef, useState } from 'react';
import { MapPinIcon, LoaderIcon } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { 
  lookupAddressByPostalCode
} from '../store/addressSlice';
import { Input } from './common/Input';
import { FormSelect } from './FormSelect';

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
   */
  onAddressChange?: (addressData: {
    block?: string;
    blockNo?: string;
    streetName?: string;
    unitNo?: string;
    postalCode?: string;
    country?: string;
  }) => void;
  
  /**
   * Initial address values from form data
   */
  initialValues?: {
    block?: string;
    blockNo?: string;
    streetName?: string;
    unitNo?: string;
    postalCode?: string;
    country?: string;
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
  initialAddressString
}: AddressInputProps) {
  const dispatch = useDispatch<AppDispatch>();
  
  // Use local state instead of shared Redux state to prevent cross-contamination
  // between different AddressInput instances (Contact Person vs Nominee)
  const [localAddressState, setLocalAddressState] = useState({
    block: initialValues?.block || '',
    blockNo: initialValues?.blockNo || '',
    streetName: initialValues?.streetName || '',
    unitNo: initialValues?.unitNo || '',
    postalCode: initialValues?.postalCode || '',
    country: initialValues?.country || 'Singapore',
    isLookingUp: false,
    lookupError: null as string | null
  });
  
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

    // 1) Prefer explicit structured values if provided
    if (initialValues && (
      initialValues.block ||
      initialValues.blockNo ||
      initialValues.streetName ||
      initialValues.unitNo ||
      initialValues.postalCode ||
      initialValues.country
    )) {
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
    if (!isInitializedRef.current) {
      setLocalAddressState(prev => ({
        ...prev,
        block: '',
        blockNo: '',
        streetName: '',
        unitNo: '',
        postalCode: '',
        country: 'Singapore'
      }));
      isInitializedRef.current = true;
    }
  }, [initialValues, initialAddressString]);

  // Sync local address state to parent component - only when values actually change
  useEffect(() => {
    if (!onAddressChange) return;
    
    // Create a string representation of current values to compare
    const currentValues = JSON.stringify({
      block: localAddressState.block,
      blockNo: localAddressState.blockNo,
      streetName: localAddressState.streetName,
      unitNo: localAddressState.unitNo,
      postalCode: localAddressState.postalCode,
      country: localAddressState.country
    });
    
    // Only call onAddressChange if values actually changed
    if (currentValues !== lastSyncedValuesRef.current) {
      lastSyncedValuesRef.current = currentValues;
      onAddressChange({
        block: localAddressState.block,
        blockNo: localAddressState.blockNo,
        streetName: localAddressState.streetName,
        unitNo: localAddressState.unitNo,
        postalCode: localAddressState.postalCode,
        country: localAddressState.country
      });
    }
  }, [
    localAddressState.block,
    localAddressState.blockNo,
    localAddressState.streetName,
    localAddressState.unitNo,
    localAddressState.postalCode,
    localAddressState.country,
    onAddressChange
  ]);

  // Handle postal code change with auto-fill (only when postal code changes)
  const handlePostalCodeChange = useCallback((value: string) => {
    setLocalAddressState(prev => ({ ...prev, postalCode: value }));
    
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
            setLocalAddressState(prev => ({
              ...prev,
              blockNo: action.payload.blockNo || prev.blockNo,
              streetName: action.payload.streetName || prev.streetName,
              unitNo: action.payload.unitNo || prev.unitNo,
              postalCode: action.payload.postalCode || prev.postalCode,
              country: action.payload.country || prev.country
            }));
          }
        });
      }
    }, 800);
  }, [dispatch]);

  // Cleanup debounce timers
  useEffect(() => {
    return () => {
      if (postalCodeDebounceRef.current) {
        clearTimeout(postalCodeDebounceRef.current);
      }
    };
  }, []);

  // Determine block type: if block has value, it's "Block", otherwise "No"
  const blockType = localAddressState.block && localAddressState.block !== '' ? 'Block' : 'No';

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
              setLocalAddressState(prev => ({
                ...prev,
                block: newBlockType === 'Block' ? 'Block' : ''
              }));
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
            value={localAddressState.blockNo}
            onChange={(e) => {
              setLocalAddressState(prev => ({ ...prev, blockNo: e.target.value }));
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
            value={localAddressState.streetName}
            onChange={(e) => {
              setLocalAddressState(prev => ({ ...prev, streetName: e.target.value }));
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
            value={localAddressState.unitNo}
            onChange={(e) => {
              setLocalAddressState(prev => ({ ...prev, unitNo: e.target.value }));
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
            value={localAddressState.postalCode}
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
              setLocalAddressState(prev => ({ ...prev, country: value || 'Singapore' }));
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

