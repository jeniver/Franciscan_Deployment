// Validation utilities for niche booking forms

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => string | null;
  message?: string;
}

export interface ValidationRules {
  [key: string]: ValidationRule;
}

// Email validation pattern
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Singapore NRIC/FIN pattern (more flexible)
export const NRIC_PATTERN = /^[STFG]\d{7}[A-Z]$/i;

// Singapore phone number pattern (more flexible to handle various formats)
export const PHONE_PATTERN = /^(\+65\s?)?[689]\d{7}$|^(\+65\s?)?[689]\d{3}\s?\d{4}$|^[689]\d{3}[\s-]?\d{4}$/;

// Postal code pattern (Singapore)
export const POSTAL_CODE_PATTERN = /^\d{6}$/;

// Validation functions
export const validateField = (value: any, rule: ValidationRule): string | null => {
  // Required validation
  if (rule.required && (!value || (typeof value === 'string' && value.trim() === ''))) {
    return rule.message || 'This field is required';
  }

  // Skip other validations if value is empty and not required
  if (!value || (typeof value === 'string' && value.trim() === '')) {
    return null;
  }

  // Min length validation
  if (rule.minLength && typeof value === 'string' && value.length < rule.minLength) {
    return rule.message || `Minimum length is ${rule.minLength} characters`;
  }

  // Max length validation
  if (rule.maxLength && typeof value === 'string' && value.length > rule.maxLength) {
    return rule.message || `Maximum length is ${rule.maxLength} characters`;
  }

  // Pattern validation
  if (rule.pattern && typeof value === 'string' && !rule.pattern.test(value)) {
    return rule.message || 'Invalid format';
  }

  // Custom validation
  if (rule.custom) {
    return rule.custom(value);
  }

  return null;
};

export const validateForm = (data: Record<string, any>, rules: ValidationRules): ValidationResult => {
  const errors: Record<string, string> = {};

  Object.keys(rules).forEach(field => {
    const rule = rules[field];
    const value = data[field];
    const error = validateField(value, rule);
    
    if (error) {
      errors[field] = error;
    }
  });

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

// Specific validation functions for niche booking
export const validateEmail = (email: string): string | null => {
  if (!email || email.trim() === '') return null;
  if (!EMAIL_PATTERN.test(email)) return 'Invalid email format';
  return null;
};

export const validateNRIC = (nric: string): string | null => {
  if (!nric || nric.trim() === '') return null;
  if (!NRIC_PATTERN.test(nric.toUpperCase())) return 'Invalid NRIC/FIN format';
  return null;
};

export const validatePhone = (phone: string): string | null => {
  if (!phone || phone.trim() === '') return null;
  // Clean the phone number - remove spaces, dashes, and parentheses
  const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
  if (!PHONE_PATTERN.test(cleanPhone)) return 'Invalid phone number format (e.g., +65 9123 4567 or 9123 4567)';
  return null;
};

export const validatePostalCode = (postalCode: string): string | null => {
  if (!postalCode || postalCode.trim() === '') return null;
  if (!POSTAL_CODE_PATTERN.test(postalCode)) return 'Invalid postal code format';
  return null;
};

export const validateRequired = (value: any, fieldName: string): string | null => {
  if (!value || (typeof value === 'string' && value.trim() === '')) {
    return `${fieldName} is required`;
  }
  return null;
};

/**
 * Normalizes receipt/invoice codes to 6-digit zero-padded format for numeric codes.
 * Non-numeric codes are returned unchanged.
 * 
 * Examples:
 * - "53130" → "053130"
 * - "053130" → "053130" (already normalized)
 * - "ABC123" → "ABC123" (non-numeric, unchanged)
 * - "I-3008-0" → "I-3008-0" (non-numeric, unchanged)
 * 
 * @param code - The receipt or invoice code to normalize
 * @returns Normalized code (6-digit padded for numeric codes, unchanged for non-numeric)
 */
export const normalizeReceiptCode = (code: string | null | undefined): string => {
  if (!code || typeof code !== 'string') {
    return code || '';
  }

  const trimmedCode = code.trim();
  
  // If empty or already contains non-numeric characters, return as-is
  if (trimmedCode === '' || !/^\d+$/.test(trimmedCode)) {
    return trimmedCode;
  }

  // For numeric codes, pad to 6 digits with leading zeros
  return trimmedCode.padStart(6, '0');
};

// Validation rules for different form steps
export const CONSENT_FORMS_VALIDATION_RULES: ValidationRules = {
  consentForms: {
    required: true,
    custom: (value) => {
      if (!value || typeof value !== 'object' || Object.keys(value).length === 0) {
        return 'Please select at least one beneficiary status';
      }
      return null;
    }
  }
};

export const NICHE_DETAILS_VALIDATION_RULES: ValidationRules = {
  selectedNiches: {
    required: true,
    custom: (value) => {
      if (!value || (Array.isArray(value) && value.length === 0)) {
        return 'Please select at least one niche';
      }
      return null;
    }
  },
  // Keep nicheId for backward compatibility
  nicheId: {
    required: true,
    custom: (value) => {
      if (!value || (Array.isArray(value) && value.length === 0)) {
        return 'Please select a niche';
      }
      return null;
    }
  }
};

export const CONTACT_DETAILS_VALIDATION_RULES: ValidationRules = {
  // Support both new and legacy field names
  applicantName: {
    required: true,
    minLength: 2,
    maxLength: 100,
    message: 'Name must be between 2 and 100 characters'
  },
  contactName: {
    required: true,
    minLength: 2,
    maxLength: 100,
    message: 'Name must be between 2 and 100 characters'
  },
  applicantIDNo: {
    required: false,
  },
  contactNric: {
    required: false,
  },
  applicantEmail: {
    custom: validateEmail
  },
  contactEmail: {
    custom: validateEmail
  },
  applicantPhone: {
    required: true,
  },
  contactPhone: {
    required: true,
  },
  applicantHomeTel: {
  },
  contactHomeTel: {
  },
  applicantOfficeTel: {
  },
  contactOfficeTel: {
  }
};

export const BENEFICIARY_DETAILS_VALIDATION_RULES: ValidationRules = {
  beneficiaries: {
    required: true,
    custom: (value) => {
      if (!Array.isArray(value) || value.length === 0) {
        return 'At least one beneficiary is required';
      }
      
      for (let i = 0; i < value.length; i++) {
        const beneficiary = value[i];
        if (!beneficiary.name && !beneficiary.fullName || (beneficiary.name || beneficiary.fullName || '').trim() === '') {
          return `Beneficiary ${i + 1} name is required`;
        }
        if (!beneficiary.relationshipToApplicant && !beneficiary.relationship || (beneficiary.relationshipToApplicant || beneficiary.relationship || '').trim() === '') {
          return `Beneficiary ${i + 1} relationship is required`;
        }
      }
      
      return null;
    }
  }
};

export const NOMINEE_DETAILS_VALIDATION_RULES: ValidationRules = {
  nominees: {
    required: true,
    custom: (value) => {
      if (!Array.isArray(value) || value.length === 0) {
        return 'At least one nominee is required';
      }
      
      for (let i = 0; i < value.length; i++) {
        const nominee = value[i];
        if (!nominee.name && !nominee.fullName || (nominee.name || nominee.fullName || '').trim() === '') {
          return `Nominee ${i + 1} name is required`;
        }
        if (!nominee.nric || nominee.nric.trim() === '') {
          return `Nominee ${i + 1} NRIC is required`;
        }
        if (!nominee.relationship || nominee.relationship.trim() === '') {
          return `Nominee ${i + 1} relationship is required`;
        }
      }
      
      return null;
    }
  }
};

// Step-specific validation functions
export const validateStep = (step: number, formData: Record<string, any>): ValidationResult => {
  switch (step) {
    case 1:
      return validateForm(formData, CONSENT_FORMS_VALIDATION_RULES);
    case 2:
      // Niche selection step - no validation required
      return { isValid: true, errors: {} };
    case 3:
      return validateForm(formData, CONTACT_DETAILS_VALIDATION_RULES);
    case 4:
      return validateForm(formData, BENEFICIARY_DETAILS_VALIDATION_RULES);
    case 5:
      return validateForm(formData, NOMINEE_DETAILS_VALIDATION_RULES);
    case 6:
      // Invoice step doesn't require validation
      return { isValid: true, errors: {} };
    default:
      return { isValid: true, errors: {} };
  }
};
