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
 * Following the Universal Standard:
 * 1. addressNo: Prefix (Blk/No)
 * 2. addressLine1: Block Number
 * 3. addressLine2: Street Name
 * 4. addressCity: Unit Number
 * 5. addressState: Postal Code (DistrictCode)
 * 6. addressCountry: Country
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

  const normalizedBlock = block?.toString().toLowerCase().trim() || '';
  const isBlock = normalizedBlock === 'block' || normalizedBlock === 'blk';
  const addressNo = isBlock ? 'Blk' : 'No';

  let normalizedUnitNo = unitNo?.toString().trim() || '';
  if (normalizedUnitNo && !normalizedUnitNo.startsWith('#')) {
    const isPostal = /^\d{6}$/.test(normalizedUnitNo.replace(/[^0-9]/g, ''));
    const isRange = normalizedUnitNo.includes('-') && /^\d+/.test(normalizedUnitNo);
    if (!isPostal && (isRange || /^\d+$/.test(normalizedUnitNo))) {
      normalizedUnitNo = '#' + normalizedUnitNo;
    }
  }

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

  const normalizedAddressNo = addressNo?.toString().toLowerCase().trim() || '';
  const isBlock = normalizedAddressNo === 'blk' || normalizedAddressNo === 'block';
  const block = isBlock ? 'Block' : 'No';

  // Unit number is in addressCity
  let unitNo = addressCity && addressCity.toString()
    ? addressCity.toString().replace(/^#/, '').trim()
    : '';

  let postalCode = addressState?.toString().trim() || '';

  // Data cleansing: if unitNo is "SINGAPORE" or empty and postalCode is empty but unitNo looks like postal
  if ((unitNo.toUpperCase() === 'SINGAPORE' || unitNo === '') && postalCode === '') {
    // Check if addressLine2 or addressLine1 contained postal? 
    // For now, just clean SINGAPORE from unit
    if (unitNo.toUpperCase() === 'SINGAPORE') unitNo = '';
  }

  const result = {
    block,
    blockNo: addressLine1?.toString().trim() || '',
    streetName: addressLine2?.toString().trim() || '',
    unitNo,
    postalCode,
    country: addressCountry?.toString().trim() || 'Singapore'
  };

  console.log('addressMapper: mapBackendToComponentFields output:', result);
  return result;
}

/**
 * Formats a component-friendly address object into a single string.
 * Standard Format: [Blk/No] [BlockNo] [StreetName] [UnitNo] [Country] [PostalCode]
 */
export function formatAddress(fields: ComponentAddressFields): string {
  if (!fields) return 'N/A';

  const {
    block = '',
    blockNo = '',
    streetName = '',
    unitNo = '',
    postalCode = '',
    country = 'Singapore'
  } = fields;

  const blockPrefix = block ? (block === 'Block' || block === 'Blk' ? 'Blk' : 'No') : '';
  const blockPart = blockPrefix && blockNo ? `${blockPrefix} ${blockNo}` : (blockNo || blockPrefix);

  let unitPart = unitNo?.toString() || '';
  if (unitPart && !unitPart.startsWith('#')) {
    const isPostal = /^\d{6}$/.test(unitPart.replace(/[^0-9]/g, ''));
    const isRange = unitPart.includes('-') && /^\d+/.test(unitPart);
    if (!isPostal && (isRange || /^\d+$/.test(unitPart))) {
      unitPart = '#' + unitPart;
    }
  }

  const parts = [
    blockPart,
    streetName,
    unitPart,
    country,
    postalCode
  ].map(p => String(p || '').trim())
    .filter(p => {
      const lower = p.toLowerCase();
      return p !== '' && lower !== 'null' && lower !== 'undefined' && lower !== 'singapore' || (p === country && lower === 'singapore');
    });

  // Strict deduplication
  const uniqueParts: string[] = [];
  const seen = new Set<string>();

  for (const part of parts) {
    const normalized = part.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!normalized) continue;

    if (!seen.has(normalized)) {
      uniqueParts.push(part);
      seen.add(normalized);
    }
  }

  return uniqueParts.length > 0 ? uniqueParts.join(' ') : 'N/A';
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
    ...backendFields,
    // Formatted string
    formattedAddress: formatAddress(componentFields)
  };
}


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
  let remainingAddress = address;

  const hashIndex = address.indexOf('#');
  if (hashIndex !== -1) {
    const unitPart = address.slice(hashIndex).trim();
    const unitTokenMatch = unitPart.match(/#\S+/);
    if (unitTokenMatch) {
      result.unitNo = unitTokenMatch[0];
    }
    remainingAddress = address.slice(0, hashIndex).trim();
  }

  const postalMatch = remainingAddress.match(/\b(\d{6})\b/) || address.match(/\b(\d{6})\b/);
  if (postalMatch) {
    result.postalCode = postalMatch[1];
  }

  const tokens = remainingAddress.split(/\s+/).filter(Boolean);
  if (tokens.length >= 2) {
    const first = tokens[0];
    if (/^\d+[A-Za-z]?$/.test(first)) {
      result.blockNo = first;
      const streetTokens = tokens.slice(1).filter(t => !(result.postalCode && t === result.postalCode));
      result.streetName = streetTokens.join(' ').trim();
    }
  }

  if (!result.streetName) {
    result.streetName = address;
  }

  return result;
}

/**
 * Parse a raw address string and return both component and backend field mappings
 * @param addressString - Raw address string to parse
 * @returns Complete address object with both field formats
 */
export function parseAddressString(addressString: string) {
  const componentFields = parseRawAddress(addressString);
  return createCompleteAddressObject(componentFields);
}