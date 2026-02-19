/**
 * Address Parser Utility (Legacy/Compatibility)
 * This file provides compatibility for components that might still be 
 * looking for the addressParser utility.
 */

/**
 * Parses a raw address string into components
 * @param address The raw address string
 * @returns Object with address components
 */
export const parseRawAddress = (address: string) => {
    if (!address) return { addressNo: '', street: '', unit: '', postalCode: '' };

    // Basic parsing logic - can be expanded as needed
    return {
        addressNo: '',
        street: address,
        unit: '',
        postalCode: ''
    };
};

export default {
    parseRawAddress
};
