const logger = require('./logger');

/**
 * DateService
 * Utility for consistent date handling across the application
 */
class DateService {
    /**
     * Parse various date formats into a JavaScript Date object
     * @param {any} value - The value to parse
     * @returns {Date|null} - Valid Date object or null
     */
    parseDate(value) {
        if (value === undefined || value === null || value === '') {
            return null;
        }

        if (value instanceof Date) {
            return isNaN(value.getTime()) ? null : value;
        }

        if (typeof value === 'string') {
            const trimmed = value.trim();
            if (!trimmed || trimmed.toLowerCase() === 'null') return null;

            // Handle ISO strings (e.g., "1996-04-24T00:00:00.000Z")
            if (trimmed.includes('T') && (trimmed.includes('Z') || trimmed.includes('+'))) {
                const parsed = new Date(trimmed);
                if (!isNaN(parsed.getTime())) return parsed;
            }

            // Handle DD-MM-YYYY format (e.g., "24-04-1996" or "3-4-1996")
            const dmyMatch = trimmed.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
            if (dmyMatch) {
                const [, day, month, year] = dmyMatch;
                const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
                if (!isNaN(date.getTime())) return date;
            }

            // Handle DD-MMM-YYYY format (e.g., "16-Feb-2012")
            const dmmmMatch = trimmed.match(/^(\d{1,2})[\s-](\w{3})[\s-](\d{4})$/i);
            if (dmmmMatch) {
                const [, day, monthName, year] = dmmmMatch;
                const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
                const monthIndex = months.indexOf(monthName.toLowerCase());
                if (monthIndex !== -1) {
                    const date = new Date(parseInt(year, 10), monthIndex, parseInt(day, 10));
                    if (!isNaN(date.getTime())) return date;
                }
            }

            // Special case: just a year
            if (/^\d{4}$/.test(trimmed)) {
                // We don't want to parse "1990" as a full date (it becomes Jan 1st 1990)
                // because it often conflicts with explicit BirthYear fields.
                return null;
            }

            // Default to standard parsing
            const parsed = new Date(trimmed);
            return isNaN(parsed.getTime()) ? null : parsed;
        }

        if (typeof value === 'number') {
            const parsed = new Date(value);
            return isNaN(parsed.getTime()) ? null : parsed;
        }

        return null;
    }

    /**
     * Format a date for display (DD-MMM-YYYY)
     * @param {any} value - Date to format
     * @returns {string|null} - Formatted string or null
     */
    formatForUI(value) {
        const d = this.parseDate(value);
        if (!d) return null;

        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const day = String(d.getDate()).padStart(2, '0');
        const month = months[d.getMonth()];
        const year = d.getFullYear();

        return `${day}-${month}-${year}`;
    }

    /**
     * Format a date for SQL storage (YYYY-MM-DD)
     * @param {any} value - Date to format
     * @returns {string|null} - SQL formatted date string or null
     */
    formatForDB(value) {
        const d = this.parseDate(value);
        if (!d) return null;

        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');

        return `${year}-${month}-${day}`;
    }

    /**
     * Extract year from a date value
     * @param {any} value - Date to extract year from
     * @returns {number|null} - Year or null
     */
    getYear(value) {
        // If it's a 4-digit numeric string or number, return it directly
        if (value && /^\d{4}$/.test(String(value).trim())) {
            return parseInt(String(value).trim(), 10);
        }

        const d = this.parseDate(value);
        return d ? d.getFullYear() : null;
    }

    /**
     * Handle the consistency between dateOfBirth and birthYear
     * @param {any} dobValue - Date of birth value
     * @param {any} yearValue - Birth year value
     * @returns {Object} - { dateOfBirth: Date|null, birthYear: number|null }
     */
    syncDobAndYear(dobValue, yearValue) {
        const dob = this.parseDate(dobValue);
        let year = this.getYear(yearValue);

        // If we have a full DOB, the year should match its year
        if (dob) {
            year = dob.getFullYear();
        }

        return {
            dateOfBirth: dob,
            birthYear: year
        };
    }
}

module.exports = new DateService();
