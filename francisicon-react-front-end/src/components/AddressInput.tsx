import React, { useEffect, useCallback, useRef } from 'react';
import { MapPinIcon, LoaderIcon } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import { 
  lookupAddressByPostalCode, 
  lookupAddressByBlockAndStreet,
  setBlock,
  setBlockNo,
  setStreetName,
  setUnitNo,
  setPostalCode,
  setCountry,
  clearLookupError
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

  // Pattern 3: Extract postal code if present (6 digits)
  const postalMatch = address.match(/\b(\d{6})\b/);
  if (postalMatch) {
    result.postalCode = postalMatch[1];
  }

  // Fallback: treat full address as street name if we couldn't parse better
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
  const dispatch = useDispatch();
  
  // Get address state from Redux
  const addressState = useSelector((state: RootState) => state.address);
  
  // Debounce refs for postal code and block/street lookups
  const postalCodeDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const blockStreetDebounceRef = useRef<NodeJS.Timeout | null>(null);

  const isInitializedRef = useRef(false);
  const lastSyncedValuesRef = useRef<string>('');

  // Initialize address fields from initialValues or initialAddressString (only once on mount)
  useEffect(() => {
    if (isInitializedRef.current) return;

    // 1) Prefer explicit structured values if provided
    if (initialValues && (
      initialValues.block ||
      initialValues.blockNo ||
      initialValues.streetName ||
      initialValues.unitNo ||
      initialValues.postalCode ||
      initialValues.country
    )) {
      dispatch(setBlock(initialValues.block || ''));
      dispatch(setBlockNo(initialValues.blockNo || ''));
      dispatch(setStreetName(initialValues.streetName || ''));
      dispatch(setUnitNo(initialValues.unitNo || ''));
      dispatch(setPostalCode(initialValues.postalCode || ''));
      dispatch(setCountry(initialValues.country || 'Singapore'));
      isInitializedRef.current = true;
      return;
    }

    // 2) Fallback: parse raw/legacy address string if provided
    if (initialAddressString && initialAddressString.trim()) {
      const parsed = parseRawAddress(initialAddressString);
      dispatch(setBlock(parsed.block));
      dispatch(setBlockNo(parsed.blockNo));
      dispatch(setStreetName(parsed.streetName));
      dispatch(setUnitNo(parsed.unitNo));
      dispatch(setPostalCode(parsed.postalCode));
      dispatch(setCountry(parsed.country || 'Singapore'));
      isInitializedRef.current = true;
    }
  }, [initialValues, initialAddressString, dispatch]);

  // Sync Redux address state to parent component - only when values actually change
  useEffect(() => {
    if (!onAddressChange) return;
    
    // Create a string representation of current values to compare
    const currentValues = JSON.stringify({
      block: addressState.block,
      blockNo: addressState.blockNo,
      streetName: addressState.streetName,
      unitNo: addressState.unitNo,
      postalCode: addressState.postalCode,
      country: addressState.country
    });
    
    // Only call onAddressChange if values actually changed
    if (currentValues !== lastSyncedValuesRef.current) {
      lastSyncedValuesRef.current = currentValues;
      onAddressChange({
        block: addressState.block,
        blockNo: addressState.blockNo,
        streetName: addressState.streetName,
        unitNo: addressState.unitNo,
        postalCode: addressState.postalCode,
        country: addressState.country
      });
    }
  }, [
    addressState.block,
    addressState.blockNo,
    addressState.streetName,
    addressState.unitNo,
    addressState.postalCode,
    addressState.country,
    onAddressChange
  ]);

  // Handle postal code change with auto-fill
  const handlePostalCodeChange = useCallback((value: string) => {
    dispatch(setPostalCode(value));
    
    // Clear existing debounce
    if (postalCodeDebounceRef.current) {
      clearTimeout(postalCodeDebounceRef.current);
    }
    
    // Debounce the lookup
    postalCodeDebounceRef.current = setTimeout(() => {
      if (value && value.replace(/\s+/g, '').trim().length >= 4) {
        dispatch(lookupAddressByPostalCode(value));
      }
    }, 800);
  }, [dispatch]);

  // Handle block number and street name change with auto-fill
  const handleBlockStreetChange = useCallback(() => {
    // Clear existing debounce
    if (blockStreetDebounceRef.current) {
      clearTimeout(blockStreetDebounceRef.current);
    }
    
    // Debounce the lookup
    blockStreetDebounceRef.current = setTimeout(() => {
      if (addressState.blockNo && addressState.streetName) {
        dispatch(lookupAddressByBlockAndStreet({
          blockNo: addressState.blockNo,
          streetName: addressState.streetName
        }));
      }
    }, 1000);
  }, [dispatch, addressState.blockNo, addressState.streetName]);

  // Cleanup debounce timers
  useEffect(() => {
    return () => {
      if (postalCodeDebounceRef.current) {
        clearTimeout(postalCodeDebounceRef.current);
      }
      if (blockStreetDebounceRef.current) {
        clearTimeout(blockStreetDebounceRef.current);
      }
    };
  }, []);

  // Determine block type: if block has value, it's "Block", otherwise "No"
  const blockType = addressState.block && addressState.block !== '' ? 'Block' : 'No';

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
              if (newBlockType === 'Block') {
                dispatch(setBlock('Block'));
              } else {
                dispatch(setBlock(''));
              }
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
            value={addressState.blockNo}
            onChange={(e) => {
              dispatch(setBlockNo(e.target.value));
              handleBlockStreetChange();
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
            value={addressState.streetName}
            onChange={(e) => {
              dispatch(setStreetName(e.target.value));
              handleBlockStreetChange();
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
            value={addressState.unitNo}
            onChange={(e) => dispatch(setUnitNo(e.target.value))}
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
            value={addressState.postalCode}
            onChange={(e) => handlePostalCodeChange(e.target.value)}
            placeholder="Postal Code"
            disabled={isReadOnly}
            maxLength={6}
            className="text-sm"
          />
          {addressState.isLookingUp && (
            <div className="flex items-center gap-1 mt-1 text-xs text-gray-600">
              <LoaderIcon className="w-3 h-3 animate-spin" />
              <span>Looking up...</span>
            </div>
          )}
          {addressState.lookupError && (
            <div className="text-xs text-amber-600 mt-1">
              {addressState.lookupError}
            </div>
          )}
        </div>
      </div>

      {/* Country */}
      <div className="mt-3">
        <div className="w-full md:w-1/3">
          <FormSelect
            label="Country"
            value={addressState.country || 'Singapore'}
            onChange={(value) => dispatch(setCountry(value || 'Singapore'))}
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

