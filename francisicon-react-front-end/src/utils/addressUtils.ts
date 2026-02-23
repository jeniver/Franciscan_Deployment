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

        // Detect if addressNo is a keyword prefix or a block number.
        // Convention A (Niche App DB): addressNo=blockNo, line1=street, line2=unit, city=empty
        // Convention B (Invoice DB):   addressNo=keyword, line1=blockNo, line2=street, city=unit
        const upperNo = raw.no.toUpperCase();
        const isKeyword = ['BLOCK', 'BLK', 'NO', 'NO.'].includes(upperNo);

        let prefix: string;
        let blockNum: string;
        let street: string;
        let unit: string;

        if (isKeyword) {
            prefix = (upperNo === 'BLOCK' || upperNo === 'BLK') ? 'Blk' : 'No';
            blockNum = raw.line1;
            street = raw.line2;
            unit = raw.city;
        } else if (raw.no) {
            // addressNo is the block number itself (Convention A)
            prefix = 'Blk';
            blockNum = raw.no;
            street = raw.line1;
            unit = raw.line2 || raw.city;
        } else {
            prefix = '';
            blockNum = raw.line1;
            street = raw.line2;
            unit = raw.city;
        }

        // Line 1: [Prefix] [Block Number] [Street Name]
        const blockPart = prefix && blockNum ? `${prefix} ${blockNum}`
            : prefix || blockNum;
        const line1 = [blockPart, street].filter(Boolean).join(' ');
        lines.push(line1);

        // Line 3 parts: [Country] [Postal Code]
        const line3Parts: string[] = [];

        let unitValue = unit;
        let postalValue = raw.state;
        if (unitValue) {
            const digitsOnly = unitValue.replace(/[^0-9]/g, '');
            const looksPostal = /^\d{6}$/.test(digitsOnly) && /^\d+$/.test(unitValue);
            if (looksPostal) {
                if (!postalValue) postalValue = unitValue;
                unitValue = '';
            }
        }

        const otherFieldsPopulated = raw.no || raw.line1 || raw.line2 || raw.city || raw.state;
        const isDefaultSingaporeOnly = !otherFieldsPopulated && (raw.country === '' || raw.country.toLowerCase() === 'singapore');

        if (isDefaultSingaporeOnly) {
            return ['', '', ''];
        }

        if (!otherFieldsPopulated && !raw.country) {
            return ['', '', ''];
        }

        if (unitValue) {
            if (!unitValue.startsWith('#')) {
                const isRange = unitValue.includes('-') && /^\d+/.test(unitValue);
                if (isRange || /^\d+$/.test(unitValue)) {
                    unitValue = '#' + unitValue;
                }
            }
        }
        // Line 2: [Unit/Building Name]
        lines.push(unitValue || '');

        const countryToShow = raw.country || (otherFieldsPopulated ? 'Singapore' : '');
        if (countryToShow) {
            line3Parts.push(countryToShow);
        }

        if (postalValue) line3Parts.push(postalValue);

        // Line 3
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
