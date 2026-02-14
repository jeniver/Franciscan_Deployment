/**
 * Utility functions for address formatting
 */

export interface AddressEntity {
    addressNo?: string | null;
    addressLine1?: string | null;
    addressLine2?: string | null;
    addressCity?: string | null;
    addressState?: string | null;
    addressCountry?: string | null;
}

/**
 * Formats a Singapore address into a single string or multiple lines.
 * Ensures ", Singapore" is appended if not present.
 */
export const addressUtils = {
    /**
     * Build an array of address lines
     */
    buildAddressLines: (entity: AddressEntity): string[] => {
        if (!entity) return [];

        const lines: string[] = [];

        // Line 1: Block/House No + Street
        const line1Parts: string[] = [];
        if (entity.addressNo) line1Parts.push(entity.addressNo.trim());
        if (entity.addressLine1) line1Parts.push(entity.addressLine1.trim());

        if (line1Parts.length > 0) {
            lines.push(line1Parts.join(' '));
        }

        // Line 2: Building/Unit/Additional
        if (entity.addressLine2 && entity.addressLine2.trim()) {
            lines.push(entity.addressLine2.trim());
        }

        // Line 3: City/Country/Postal Code
        const line3Parts: string[] = [];
        if (entity.addressCity) line3Parts.push(entity.addressCity.trim());
        if (entity.addressState) line3Parts.push(entity.addressState.trim());
        if (entity.addressCountry) line3Parts.push(entity.addressCountry.trim());

        let line3 = line3Parts.join(' ').trim();

        // Ensure "Singapore" is present if it's likely a SG address (no country specified or SG specified)
        const isSg = !entity.addressCountry ||
            entity.addressCountry.toLowerCase().includes('singapore') ||
            entity.addressCity?.toLowerCase().includes('singapore') ||
            /^\d{6}$/.test(entity.addressCity || '') || // Postal code format
            /^\d{6}$/.test(entity.addressState || '');

        if (isSg && !line3.toLowerCase().includes('singapore')) {
            if (line3) line3 += ', Singapore';
            else line3 = 'Singapore';
        }

        if (line3) {
            lines.push(line3);
        }

        return lines;
    },

    /**
     * Format address as a single line
     */
    formatSingleLine: (entity: AddressEntity): string => {
        return addressUtils.buildAddressLines(entity).join(', ');
    }
};

export default addressUtils;
