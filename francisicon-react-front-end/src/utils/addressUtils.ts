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

        // Check if there is any meaningful address data
        const hasData = !!(entity.addressNo || entity.addressLine1 || entity.addressLine2 || entity.addressCity || entity.addressState);
        if (!hasData) return [];

        const lines: string[] = [];

        // Line 1: Block/House No
        let blockPart = '';
        if (entity.addressNo) {
            const val = entity.addressNo.trim();
            const upper = val.toUpperCase();
            if (upper.startsWith('NO') || upper.startsWith('BLK') || upper.startsWith('BLOCK')) {
                // Already has prefix, but normalize "Block" to "Blk" if needed? 
                // Let's just keep as is or map if it's exactly "Block"
                if (upper === 'BLOCK') blockPart = 'Blk';
                else blockPart = val;
            } else {
                blockPart = 'No ' + val;
            }
        }
        lines.push(blockPart);

        // Line 2: Street Name
        lines.push(entity.addressLine1 ? entity.addressLine1.trim() : '');

        // Line 3: Unit + Singapore + Postal
        const line3Parts: string[] = [];
        if (entity.addressLine2) {
            let unit = entity.addressLine2.trim();
            if (unit && !unit.startsWith('#') && (unit.includes('-') || /^\d+/.test(unit))) {
                unit = '#' + unit;
            }
            line3Parts.push(unit);
        }

        line3Parts.push('Singapore');

        const postal = (entity.addressCity || entity.addressState || '').trim();
        if (postal) {
            line3Parts.push(postal);
        }

        lines.push(line3Parts.join(' '));

        // Ensure we always have 3 elements for the template to access reliably
        while (lines.length < 3) lines.push('');

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
