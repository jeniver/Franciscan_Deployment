/**
 * Date utility functions for formatting dates for HTML date inputs
 * and converting between different date formats
 */

/**
 * Convert any date string/Date to YYYY-MM-DD format for HTML date inputs
 * @param dateString - Date string in any format or Date object
 * @returns Formatted date string (YYYY-MM-DD) or empty string if invalid
 */
export const formatDateForInput = (dateString: string | Date | null | undefined): string => {
  if (!dateString) return '';
  
  try {
    const date = dateString instanceof Date ? dateString : new Date(dateString);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      // If it's already in YYYY-MM-DD format, return as is
      if (typeof dateString === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        return dateString;
      }
      return '';
    }
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  } catch (error) {
    console.error('Error formatting date for input:', dateString, error);
    // If it's already in YYYY-MM-DD format, return as is
    if (typeof dateString === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      return dateString;
    }
    return '';
  }
};

/**
 * Convert any datetime string/Date to YYYY-MM-DDTHH:mm format for HTML datetime-local inputs
 * @param dateString - Date string in any format or Date object
 * @returns Formatted datetime string (YYYY-MM-DDTHH:mm) or empty string if invalid
 */
export const formatDateTimeForInput = (dateString: string | Date | null | undefined): string => {
  if (!dateString) return '';
  
  try {
    const date = dateString instanceof Date ? dateString : new Date(dateString);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      // If it's already in YYYY-MM-DDTHH:mm format, return as is
      if (typeof dateString === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(dateString)) {
        return dateString.substring(0, 16); // Return only YYYY-MM-DDTHH:mm
      }
      return '';
    }
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  } catch (error) {
    console.error('Error formatting datetime for input:', dateString, error);
    // If it's already in the correct format, try to use it
    if (typeof dateString === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(dateString)) {
      return dateString.substring(0, 16);
    }
    return '';
  }
};

/**
 * Convert any datetime string/Date to HH:mm format for HTML time inputs
 * @param dateString - Date string in any format or Date object
 * @returns Formatted time string (HH:mm) or empty string if invalid
 */
export const formatTimeForInput = (dateString: string | Date | null | undefined): string => {
  if (!dateString) return '';
  
  try {
    const date = dateString instanceof Date ? dateString : new Date(dateString);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      // If it's already in HH:mm format, return as is
      if (typeof dateString === 'string' && /^\d{2}:\d{2}$/.test(dateString)) {
        return dateString;
      }
      return '';
    }
    
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${hours}:${minutes}`;
  } catch (error) {
    console.error('Error formatting time for input:', dateString, error);
    // If it's already in HH:mm format, return as is
    if (typeof dateString === 'string' && /^\d{2}:\d{2}$/.test(dateString)) {
      return dateString;
    }
    return '';
  }
};

/**
 * Get current date in YYYY-MM-DD format for date inputs
 */
export const getTodayDate = (): string => {
  const today = new Date();
  return formatDateForInput(today);
};

/**
 * Convert YYYY-MM-DD format to dd/mm/yyyy format for display
 * @param dateString - Date string in YYYY-MM-DD format
 * @returns Formatted date string (dd/mm/yyyy) or empty string if invalid
 */
export const formatDateToDDMMYYYY = (dateString: string | null | undefined): string => {
  if (!dateString) return '';
  
  try {
    // If already in dd/mm/yyyy format, return as is
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) {
      return dateString;
    }
    
    // If in YYYY-MM-DD format, convert to dd/mm/yyyy
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      const [year, month, day] = dateString.split('-');
      return `${day}/${month}/${year}`;
    }
    
    // Try to parse as Date and format
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return '';
    }
    
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    
    return `${day}/${month}/${year}`;
  } catch (error) {
    console.error('Error formatting date to dd/mm/yyyy:', dateString, error);
    return '';
  }
};

/**
 * Convert dd/mm/yyyy format to YYYY-MM-DD format for API
 * @param dateString - Date string in dd/mm/yyyy format
 * @returns Formatted date string (YYYY-MM-DD) or empty string if invalid
 */
export const formatDateFromDDMMYYYY = (dateString: string | null | undefined): string => {
  if (!dateString) return '';
  
  try {
    // If already in YYYY-MM-DD format, return as is
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      return dateString;
    }
    
    // If in dd/mm/yyyy format, convert to YYYY-MM-DD
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) {
      const [day, month, year] = dateString.split('/');
      // Validate date
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      if (isNaN(date.getTime())) {
        return '';
      }
      // Verify the date is valid (e.g., not 31/02/2024)
      if (date.getDate() !== parseInt(day) || date.getMonth() !== parseInt(month) - 1 || date.getFullYear() !== parseInt(year)) {
        return '';
      }
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    
    // Try to parse as Date and format
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return '';
    }
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  } catch (error) {
    console.error('Error formatting date from dd/mm/yyyy:', dateString, error);
    return '';
  }
};

/**
 * Validate if a string is in dd/mm/yyyy format
 * @param dateString - Date string to validate
 * @returns true if valid dd/mm/yyyy format, false otherwise
 */
export const isValidDDMMYYYY = (dateString: string): boolean => {
  if (!dateString) return false;
  
  const pattern = /^\d{2}\/\d{2}\/\d{4}$/;
  if (!pattern.test(dateString)) {
    return false;
  }
  
  const [day, month, year] = dateString.split('/').map(Number);
  
  // Basic validation
  if (day < 1 || day > 31 || month < 1 || month > 12 || year < 1900 || year > 2100) {
    return false;
  }
  
  // Validate actual date
  const date = new Date(year, month - 1, day);
  return date.getDate() === day && date.getMonth() === month - 1 && date.getFullYear() === year;
};

