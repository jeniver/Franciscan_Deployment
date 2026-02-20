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

/** Structured address fields used in invoice/receipt forms */
export interface InvoiceReceiptAddressParams {
    block?: string | null;      // "Block" | "Blk" | "No"
    blockNo?: string | null;    // e.g. "450D"
    street?: string | null;     // e.g. "Bukit Batok West Ave 6"
    unit?: string | null;       // e.g. "#18-679"
    postalCode?: string | null;
    country?: string | null;    // e.g. "Singapore"
}

/**
 * Normalize block line: remove duplicate Block/Blk (e.g. "Block Blk 55" -> "Blk 55")
 */
function normalizeBlockLine(s: string): string {
    const t = s.trim();
    if (!t) return '';
    const lower = t.toLowerCase();
    if (lower.startsWith('block blk ')) return 'Blk ' + t.slice(10).trim();
    if (lower.startsWith('blk block ')) return 'Block ' + t.slice(10).trim();
    if (/^block\s+blk\s+/i.test(t)) return t.replace(/^block\s+blk\s+/i, 'Blk ');
    if (/^blk\s+block\s+/i.test(t)) return t.replace(/^blk\s+block\s+/i, 'Block ');
    return t;
}

/**
 * Build block line without duplicating "Block"/"Blk".
 * If blockNo already starts with Block/Blk, use as-is; otherwise combine block + blockNo.
 */
function buildBlockLine(block: string | null | undefined, blockNo: string | null | undefined): string {
    const b = (block || '').trim();
    const bn = (blockNo || '').trim();
    if (!bn) return b || '';
    const lower = bn.toLowerCase();
    // Avoid duplicate: if blockNo already has Block/Blk, use it as-is
    if (lower.startsWith('block ') || lower.startsWith('blk ')) return normalizeBlockLine(bn);
    if (!b || b.toLowerCase() === 'no') return bn;
    return normalizeBlockLine(`${b} ${bn}`.trim());
}

/**
 * Format address for invoice/receipt display.
 * Returns lines: [Block 450D, Street, #Unit, Singapore]
 * Ensures Block/Blk is not repeated.
 */
export function formatAddressLinesForInvoiceReceipt(params: InvoiceReceiptAddressParams): string[] {
    const lines: string[] = [];
    const blockLine = buildBlockLine(params.block, params.blockNo);
    if (blockLine) lines.push(blockLine);
    if (params.street?.trim()) lines.push(params.street.trim());
    if (params.unit?.trim()) lines.push(params.unit.trim());
    let country = (params.country || 'Singapore').trim();
    if (country) {
        if (country.toLowerCase() === 'singapore' && (params.postalCode || '').trim().toLowerCase() === 'singapore') {
            country = 'Singapore';
        }
        lines.push(country);
    }
    return lines;
}

/**
 * Parse comma-separated address and return formatted lines in order:
 * Block, Street, Unit, Singapore. Deduplicates Block/Blk.
 */
export function formatAddressFromCommaSeparated(address: string | null | undefined): string[] {
    if (!address || typeof address !== 'string') return [];
    const raw = address.trim();
    if (!raw) return [];
    const parts = raw.split(',').map((p) => p.trim()).filter(Boolean);
    if (parts.length === 0) return [];

    let blockLine = '';
    let street = '';
    let unit = '';
    let country = 'Singapore';
    let seenBlock = false;

    for (const p of parts) {
        const lower = p.toLowerCase();
        const isBlock = lower.startsWith('block ') || lower.startsWith('blk ');
        const isUnit = p.startsWith('#') || /#\d+-\d+/.test(p);
        const isCountry = lower.includes('singapore') || /^\d{6}$/.test(p);

        if (isBlock && !seenBlock) {
            blockLine = p;
            seenBlock = true;
        } else if (isUnit) {
            unit = p;
        } else if (isCountry) {
            country = lower.includes('singapore') ? p : `Singapore ${p}`;
        } else if (!street && !isCountry) {
            street = p;
        } else if (!blockLine) {
            blockLine = p;
        }
    }

    const lines: string[] = [];
    if (blockLine) lines.push(normalizeBlockLine(blockLine));
    if (street && street.toLowerCase() !== 'singapore') lines.push(street);
    if (unit) lines.push(unit);
    if (country && !lines.some((l) => l.toLowerCase() === 'singapore')) {
        lines.push(country);
    }
    return lines.length > 0 ? lines : parts;
}

/**
 * Join address lines for display (newline-separated for multi-line, or comma for storage).
 */
export function joinAddressLines(lines: string[], separator: '\n' | ', ' = '\n'): string {
    return lines.filter(Boolean).join(separator);
}

/**
 * Format address string for display (Block, Street, Unit, Singapore).
 * Handles both newline-separated and comma-separated input; outputs newline-separated.
 */
export function formatAddressForDisplay(address: string | null | undefined): string {
    if (!address || typeof address !== 'string') return '';
    const raw = address.trim();
    if (!raw) return '';
    if (raw.includes('\n')) return raw; // Already multi-line
    const lines = formatAddressFromCommaSeparated(raw);
    return joinAddressLines(lines, '\n');
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
