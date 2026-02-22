/**
 * Centralized Address Utility for formatting and normalizing address data.
 */

class AddressUtils {
    static VERSION = 'v5';
    /**
     * Format a database record or data object into a standardized, deduplicated address string.
     * Following the Universal Standard: [Prefix] [BlockNo] [StreetName] [UnitNo] [Country] [PostalCode]
     * 
     * @param {Object} data - Database record or payload
     * @returns {string} Formatted address
     */
    static formatAddress(data) {
        if (!data) return 'N/A';
        const norm = this.normalizeAddressFields(data);

        // Collect all potential address components
        const rawParts = [
            norm.addressNoPart,
            norm.addressLine2,
            norm.addressLine1Part,
            norm.addressCountry,
            norm.addressPostal
        ].map(p => String(p || '').trim()).filter(p => {
            const low = p.toLowerCase();
            return p && low !== 'null' && low !== 'undefined' && low !== '';
        });

        const uniqueParts = [];
        for (const part of rawParts) {
            const pNorm = part.toLowerCase().replace(/[^a-z0-9]/g, '');
            if (!pNorm) continue;

            let isRedundant = false;
            for (let i = 0; i < uniqueParts.length; i++) {
                const existing = uniqueParts[i];
                const eNorm = existing.toLowerCase().replace(/[^a-z0-9]/g, '');

                if (eNorm.includes(pNorm) || pNorm.includes(eNorm)) {
                    // Logic to avoid removing distinct numeric fields (e.g. Block 390 vs Postal 650390)
                    const isNum = (val) => /^\d+$/.test(val.replace(/[^0-9]/g, ''));
                    if (isNum(part) && isNum(existing) && pNorm !== eNorm) {
                        continue;
                    }

                    // For redundant parts, prefer the longer one or the one with #
                    if (pNorm.length > eNorm.length) {
                        uniqueParts[i] = part;
                    } else if (pNorm === eNorm && part.includes('#') && !existing.includes('#')) {
                        uniqueParts[i] = part;
                    }

                    isRedundant = true;
                    break;
                }
            }

            if (!isRedundant) {
                uniqueParts.push(part);
            }
        }

        return uniqueParts.join(' ') || 'N/A';
    }

    /**
     * Maps database fields to the Universal Standard internal structure.
     * 
     * @param {Object} data - Database record or payload
     * @returns {Object} Normalized address fields
     */
    static normalizeAddressFields(data = {}) {
        const raw = {
            prefix: (data.AddressNo || data.addressNo || '').trim(),
            block: (data.Address || data.address || data.ApplicantAddressLine1 || '').trim(),
            street: (data.Address2 || data.address2 || data.ApplicantAddressLine2 || '').trim(),
            unit: (data.AddressCity || data.addressCity || '').trim(),
            country: (data.Country || data.country || data.ApplicantAddressCountry || 'Singapore').trim(),
            postal: (data.DistrictCode || data.districtCode || data.ApplicantAddressState || '').trim()
        };

        // Only use prefix if it is a recognised value (Blk, Block, No)
        const upperPrefix = raw.prefix.toUpperCase();
        let prefix = '';
        if (upperPrefix === 'BLOCK' || upperPrefix === 'BLK') prefix = 'Blk';
        else if (upperPrefix === 'NO' || upperPrefix === 'NO.') prefix = 'No';

        // Combine prefix and block, dedup when they are identical
        let addressNoPart = prefix;
        if (raw.block && raw.block !== raw.prefix) {
            addressNoPart = addressNoPart ? `${addressNoPart} ${raw.block}` : raw.block;
        }

        // addressCity may contain a misplaced postal code (pure 6-digit number)
        let unitPart = raw.unit;
        let postalPart = raw.postal;
        if (unitPart && /^\d{6}$/.test(unitPart) && /^\d+$/.test(unitPart)) {
            if (!postalPart) postalPart = unitPart;
            unitPart = '';
        }

        if (unitPart && !unitPart.startsWith('#')) {
            const isRange = unitPart.includes('-') && /^\d+/.test(unitPart);
            if (isRange || /^\d+$/.test(unitPart)) {
                unitPart = '#' + unitPart;
            }
        }

        return {
            addressNoPart: addressNoPart.trim(),
            addressLine2: raw.street.trim(),
            addressLine1Part: unitPart.trim(),
            addressCountry: raw.country.trim(),
            addressPostal: postalPart.trim()
        };
    }
}

module.exports = AddressUtils;
