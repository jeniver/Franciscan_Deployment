/**
 * Centralized Address Utility for formatting and normalizing address data.
 */

class AddressUtils {
    /**
     * Format a database record or data object into a standardized, deduplicated address string.
     * Handles various field naming conventions (e.g., Receipt vs Application vs Invoice).
     * 
     * @param {Object} data - Database record or payload
     * @returns {string} Formatted address
     */
    static formatAddress(data) {
        if (!data) return 'N/A';

        const normalized = this.normalizeAddressFields(data);

        const parts = [
            normalized.addressNo,
            normalized.addressLine1,
            normalized.addressLine2,
            normalized.addressCity,
            normalized.addressState,
            normalized.addressCountry
        ].map(p => String(p || '').trim())
            .filter(p => {
                const lower = p.toLowerCase();
                return p && lower !== 'null' && lower !== 'undefined' && lower !== '';
            });

        // Deduplicate parts to avoid repeats like "#65686, #65686" or "Singapore, Singapore"
        const uniqueParts = [];
        const seenNormalized = new Set();

        for (const part of parts) {
            // Normalize: lowercase and remove non-alphanumeric for matching
            const normalizedPart = part.toLowerCase().replace(/[^a-z0-9]/g, '');
            if (!normalizedPart) continue;

            let exists = false;
            for (const seen of seenNormalized) {
                // Simple containment check for deduplication
                if (seen.includes(normalizedPart) || normalizedPart.includes(seen)) {
                    exists = true;
                    break;
                }
            }

            if (!exists) {
                uniqueParts.push(part);
                seenNormalized.add(normalizedPart);
            }
        }

        return uniqueParts.length > 0 ? uniqueParts.join(', ') : 'N/A';
    }

    /**
     * Maps various field name permutations to a standard internal structure.
     * 
     * @param {Object} data - Database record or payload
     * @returns {Object} Normalized address fields
     */
    static normalizeAddressFields(data = {}) {
        const fieldMap = {
            addressNo: ['AddressNo', 'addressNo', 'ApplicantAddressNo', 'applicantAddressNo', 'NomineeAddressNo', 'ReceiptAddressNo'],
            addressLine1: ['Address', 'address', 'ApplicantAddressLine1', 'applicantAddressLine1', 'NomineeAddressLine1', 'ReceiptAddress'],
            addressLine2: ['Address2', 'address2', 'ApplicantAddressLine2', 'applicantAddressLine2', 'NomineeAddressLine2', 'ReceiptAddress2'],
            addressCity: ['AddressCity', 'addressCity', 'ApplicantAddressCity', 'applicantAddressCity', 'NomineeAddressCity', 'ReceiptAddressCity'],
            addressState: ['DistrictCode', 'districtCode', 'ApplicantAddressState', 'applicantAddressState', 'NomineeAddressState', 'ReceiptDistrictCode'],
            addressCountry: ['Country', 'country', 'ApplicantAddressCountry', 'applicantAddressCountry', 'NomineeAddressCountry', 'ReceiptCountry']
        };

        const result = {};
        Object.entries(fieldMap).forEach(([target, candidates]) => {
            // First one found wins
            const foundKey = candidates.find(key => data[key] !== undefined && data[key] !== null);
            result[target] = foundKey ? data[foundKey] : null;
        });

        // Heuristic: If addressState is empty but addressCity looks like a postal code (6 digits), move it.
        if (!result.addressState && result.addressCity && /^\d{6}$/.test(String(result.addressCity).trim())) {
            result.addressState = result.addressCity;
            result.addressCity = null;
        }

        return result;
    }
}

module.exports = AddressUtils;
