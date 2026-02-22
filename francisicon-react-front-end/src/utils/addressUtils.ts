/**
 * Utility functions for address formatting following the Universal Standard.
 */

export interface AddressEntity {
    addressNo?: string | null;      // Prefix (Blk/No)
    addressLine1?: string | null;  // Block Number
    addressLine2?: string | null;  // Street Name
    addressCity?: string | null;   // Unit Number
    addressState?: string | null;  // Postal Code (DistrictCode)
    addressCountry?: string | null; // Country
}

/**
 * Formats a Singapore address into a single string or multiple lines.
 */
export const addressUtils = {
    /**
     * Build an array of address lines following the Universal Standard.
     * Standard:
     * Line 1: [Prefix] [Block Number]
     * Line 2: [Street Name]
     * Line 3: [Unit Number] [Country] [Postal Code]
     */
    buildAddressLines: (entity: AddressEntity): string[] => {
        if (!entity) return ['', '', ''];

        const lines: string[] = [];
        const raw = {
            no: (entity.addressNo || '').trim(),
            line1: (entity.addressLine1 || '').trim(),
            line2: (entity.addressLine2 || '').trim(),
            city: (entity.addressCity || '').trim(),
            state: (entity.addressState || '').trim(),
            country: (entity.addressCountry || '').trim(),
        };

        // Only recognised values qualify as a prefix
        let prefix = '';
        const upperNo = raw.no.toUpperCase();
        if (upperNo === 'BLOCK' || upperNo === 'BLK') prefix = 'Blk';
        else if (upperNo === 'NO' || upperNo === 'NO.') prefix = 'No';

        // Line 1: [Prefix] [Block Number]
        let blockPart = prefix;
        if (raw.line1) {
            const dedupLine1 = raw.line1 === raw.no ? '' : raw.line1;
            if (dedupLine1) {
                blockPart = blockPart ? `${blockPart} ${dedupLine1}` : dedupLine1;
            }
        }
        lines.push(blockPart);

        // Line 2: Street Name
        lines.push(raw.line2);

        // Line 3: [Unit] [Country] [Postal]
        const line3Parts: string[] = [];

        // addressCity is the unit number, but sometimes a postal code is
        // stored here by mistake.  Detect 6-digit postal and relocate it.
        let unitValue = raw.city;
        let postalValue = raw.state;
        if (unitValue) {
            const digitsOnly = unitValue.replace(/[^0-9]/g, '');
            const looksPostal = /^\d{6}$/.test(digitsOnly) && /^\d+$/.test(unitValue);
            if (looksPostal) {
                if (!postalValue) postalValue = unitValue;
                unitValue = '';
            }
        }

        if (unitValue) {
            if (!unitValue.startsWith('#')) {
                const isRange = unitValue.includes('-') && /^\d+/.test(unitValue);
                if (isRange || /^\d+$/.test(unitValue)) {
                    unitValue = '#' + unitValue;
                }
            }
            line3Parts.push(unitValue);
        }

        line3Parts.push(raw.country || 'Singapore');
        if (postalValue) line3Parts.push(postalValue);

        lines.push(line3Parts.join(' '));

        while (lines.length < 3) lines.push('');
        return lines;
    },

    /**
     * Format address as a single line
     */
    formatSingleLine: (entity: AddressEntity): string => {
        const lines = addressUtils.buildAddressLines(entity);
        return lines.filter(l => l.trim()).join(', ');
    }
};

export default addressUtils;
