import axios from 'axios';

export interface AddressLookupResult {
  block?: string;
  blockNo?: string;
  streetName?: string;
  unitNo?: string;
  postalCode?: string;
  country?: string;
  building?: string;
  address?: string;
}

export interface OneMapSearchResult {
  SEARCHVAL: string;
  BLK_NO: string;
  ROAD_NAME: string;
  BUILDING: string;
  ADDRESS: string;
  POSTAL: string;
  X: string;
  Y: string;
  LATITUDE: string;
  LONGITUDE: string;
  LONGTITUDE: string;
}

export interface OneMapResponse {
  found: number;
  totalNumPages: number;
  pageNum: number;
  results: OneMapSearchResult[];
}

class AddressService {
  private baseUrl = 'https://www.onemap.gov.sg/api/common/elastic/search';
  // Note: OneMap API requires an API key for production use
  // For now, we'll use a public endpoint that may have rate limits
  // In production, you should get an API key from https://www.onemap.gov.sg/api/
  private apiKey: string | null = null;

  /**
   * Set API key for OneMap (optional, but recommended for production)
   */
  setApiKey(key: string): void {
    this.apiKey = key;
  }

  /**
   * Search address by postal code
   * @param postalCode - Singapore postal code (6 digits)
   * @returns Address lookup result
   */
  async searchByPostalCode(postalCode: string): Promise<AddressLookupResult | null> {
    if (!postalCode || postalCode.trim().length === 0) {
      return null;
    }

    // Clean postal code (remove spaces, ensure 6 digits)
    const cleanPostalCode = postalCode.replace(/\s+/g, '').trim();
    
    if (cleanPostalCode.length < 4) {
      return null; // Too short to be a valid postal code
    }

    try {
      const params: Record<string, string> = {
        searchVal: cleanPostalCode,
        returnGeom: 'N',
        getAddrDetails: 'Y',
        pageNum: '1'
      };

      if (this.apiKey) {
        params.token = this.apiKey;
      }

      const response = await axios.get<OneMapResponse>(this.baseUrl, { params });

      if (response.data && response.data.results && response.data.results.length > 0) {
        const result = response.data.results[0];
        return this.mapOneMapResultToAddress(result);
      }

      return null;
    } catch (error) {
      console.error('Error searching address by postal code:', error);
      // Fallback: Try alternative API or return null
      return null;
    }
  }

  /**
   * Search address by block number and street name
   * @param blockNo - Block number
   * @param streetName - Street name
   * @returns Address lookup result
   */
  async searchByBlockAndStreet(blockNo: string, streetName: string): Promise<AddressLookupResult | null> {
    if (!blockNo || !streetName) {
      return null;
    }

    try {
      const searchQuery = `${blockNo} ${streetName}`.trim();
      
      const params: Record<string, string> = {
        searchVal: searchQuery,
        returnGeom: 'N',
        getAddrDetails: 'Y',
        pageNum: '1'
      };

      if (this.apiKey) {
        params.token = this.apiKey;
      }

      const response = await axios.get<OneMapResponse>(this.baseUrl, { params });

      if (response.data && response.data.results && response.data.results.length > 0) {
        const result = response.data.results[0];
        return this.mapOneMapResultToAddress(result);
      }

      return null;
    } catch (error) {
      console.error('Error searching address by block and street:', error);
      return null;
    }
  }

  /**
   * Map OneMap API result to our address format
   */
  private mapOneMapResultToAddress(result: OneMapSearchResult): AddressLookupResult {
    // Extract block number from BLK_NO or ADDRESS
    const blockNo = result.BLK_NO || this.extractBlockNo(result.ADDRESS);
    
    // Extract street name from ROAD_NAME or ADDRESS
    const streetName = result.ROAD_NAME || this.extractStreetName(result.ADDRESS);
    
    // Extract unit number from ADDRESS (usually in format #XX-XX)
    const unitNo = this.extractUnitNo(result.ADDRESS);
    
    // Extract building name
    const building = result.BUILDING || '';

    return {
      block: '', // Block letter (A, B, C) - not available from OneMap
      blockNo: blockNo,
      streetName: streetName,
      unitNo: unitNo,
      postalCode: result.POSTAL,
      country: 'Singapore',
      building: building,
      address: result.ADDRESS
    };
  }

  /**
   * Extract block number from address string
   */
  private extractBlockNo(address: string): string {
    if (!address) return '';
    // Look for patterns like "Blk 123" or "123"
    const blockMatch = address.match(/(?:Blk\s*)?(\d+[A-Z]?)/i);
    return blockMatch ? blockMatch[1] : '';
  }

  /**
   * Extract street name from address string
   */
  private extractStreetName(address: string): string {
    if (!address) return '';
    // Remove block number, unit number, and postal code
    let street = address
      .replace(/(?:Blk\s*)?\d+[A-Z]?\s*/i, '') // Remove block number
      .replace(/#\d+[-\d]*/g, '') // Remove unit number
      .replace(/\d{6}/g, '') // Remove postal code
      .replace(/Singapore/gi, '')
      .trim();
    
    return street;
  }

  /**
   * Extract unit number from address string
   */
  private extractUnitNo(address: string): string {
    if (!address) return '';
    // Look for patterns like "#14-102" or "#08-09"
    const unitMatch = address.match(/#(\d+[-\d]*)/);
    return unitMatch ? unitMatch[1] : '';
  }

  /**
   * Validate Singapore postal code format
   */
  isValidPostalCode(postalCode: string): boolean {
    if (!postalCode) return false;
    const clean = postalCode.replace(/\s+/g, '').trim();
    // Singapore postal codes are 6 digits
    return /^\d{6}$/.test(clean);
  }
}

export const addressService = new AddressService();

