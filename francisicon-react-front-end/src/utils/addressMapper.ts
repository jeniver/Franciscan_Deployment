/**
 * Address Mapping Utility Functions
 * 
 * Provides consistent mapping between:
 * 1. Component-friendly fields (block, blockNo, streetName, unitNo, postalCode, country)
 * 2. Backend database fields (addressNo, addressLine1, addressLine2, addressCity, addressState, addressCountry)
 */

interface ComponentAddressFields {
  block?: string;
  blockNo?: string;
  streetName?: string;
  unitNo?: string;
  postalCode?: string;
  country?: string;
}

interface BackendAddressFields {
  addressNo?: string;
  addressLine1?: string;
  addressLine2?: string;
  addressCity?: string;
  addressState?: string;
  addressCountry?: string;
}

/**
 * Maps component-friendly address fields to backend database fields
 * @param componentFields - Component field values
 * @returns Backend-compatible field values
 */
export function mapComponentToBackendFields(componentFields: ComponentAddressFields): BackendAddressFields {
  const {
    block = '',
    blockNo = '',
    streetName = '',
    unitNo = '',
    postalCode = '',
    country = 'Singapore'
  } = componentFields;

  console.log('addressMapper: mapComponentToBackendFields input:', componentFields);

  // Determine addressNo based on block type, with fallback handling
  const normalizedBlock = block?.toString().toLowerCase().trim() || '';
  const isBlock = normalizedBlock === 'block' || normalizedBlock === 'blk';
  const addressNo = isBlock ? 'Blk' : 'No';
  
  // Normalize unit number to include '#' prefix if it's not empty
  const normalizedUnitNo = unitNo && unitNo.trim() !== '' 
    ? (unitNo.trim().startsWith('#') ? unitNo.trim() : `#${unitNo.trim()}`)
    : '';

  const result = {
    addressNo,
    addressLine1: blockNo?.toString().trim() || '',
    addressLine2: streetName?.toString().trim() || '',
    addressCity: normalizedUnitNo,
    addressState: postalCode?.toString().trim() || '',
    addressCountry: country?.toString().trim() || 'Singapore'
  };

  console.log('addressMapper: mapComponentToBackendFields output:', result);
  return result;
}

/**
 * Maps backend database fields to component-friendly fields
 * @param backendFields - Backend field values
 * @returns Component-compatible field values
 */
export function mapBackendToComponentFields(backendFields: BackendAddressFields): ComponentAddressFields {
  const {
    addressNo = '',
    addressLine1 = '',
    addressLine2 = '',
    addressCity = '',
    addressState = '',
    addressCountry = 'Singapore'
  } = backendFields;

  console.log('addressMapper: mapBackendToComponentFields input:', backendFields);

  // Determine if it's a block or number based on addressNo, with fallback handling
  const normalizedAddressNo = addressNo?.toString().toLowerCase().trim() || '';
  const isBlock = normalizedAddressNo === 'blk' || normalizedAddressNo === 'block';
  const block = isBlock ? 'Block' : '';
  
  // Extract unit number without '#' prefix for component display
  const unitNo = addressCity && addressCity.toString()
    ? addressCity.toString().replace(/^#/, '').trim() // Remove leading '#' and trim
    : '';

  const result = {
    block,
    blockNo: addressLine1?.toString().trim() || '',
    streetName: addressLine2?.toString().trim() || '',
    unitNo,
    postalCode: addressState?.toString().trim() || '',
    country: addressCountry?.toString().trim() || 'Singapore'
  };

  console.log('addressMapper: mapBackendToComponentFields output:', result);
  return result;
}

/**
 * Creates a complete address object with both component and backend fields
 * @param componentFields - Component field values
 * @returns Object with both field formats
 */
export function createCompleteAddressObject(componentFields: ComponentAddressFields) {
  const backendFields = mapComponentToBackendFields(componentFields);
  
  return {
    // Component-friendly fields
    ...componentFields,
    // Backend-compatible fields
    ...backendFields
  };
}

/**
 * Parse a raw address string and return both component and backend field mappings
 * @param addressString - Raw address string to parse
 * @returns Complete address object with both field formats
 */
export function parseAddressString(addressString: string) {
  // This would use the existing parseRawAddress function
  // For now, returning empty object - would need to import the parsing logic
  const componentFields: ComponentAddressFields = {
    block: '',
    blockNo: '',
    streetName: '',
    unitNo: '',
    postalCode: '',
    country: 'Singapore'
  };
  
  return createCompleteAddressObject(componentFields);
}