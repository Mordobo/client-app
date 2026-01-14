/**
 * Card validation utilities
 */

export interface CardValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validates a credit card number using Luhn algorithm
 */
export const validateCardNumber = (cardNumber: string): CardValidationResult => {
  // Remove spaces and non-digits
  const cleaned = cardNumber.replace(/\s+/g, '').replace(/\D/g, '');
  
  if (!cleaned) {
    return { isValid: false, error: 'Card number is required' };
  }

  if (cleaned.length < 13 || cleaned.length > 19) {
    return { isValid: false, error: 'Card number must be between 13 and 19 digits' };
  }

  // Luhn algorithm
  let sum = 0;
  let isEven = false;

  for (let i = cleaned.length - 1; i >= 0; i--) {
    let digit = parseInt(cleaned[i], 10);

    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    isEven = !isEven;
  }

  const isValid = sum % 10 === 0;
  return {
    isValid,
    error: isValid ? undefined : 'Invalid card number',
  };
};

/**
 * Formats card number with spaces every 4 digits
 */
export const formatCardNumber = (cardNumber: string): string => {
  const cleaned = cardNumber.replace(/\s+/g, '').replace(/\D/g, '');
  const formatted = cleaned.match(/.{1,4}/g)?.join(' ') || cleaned;
  return formatted;
};

/**
 * Detects card brand from number
 */
export const detectCardBrand = (cardNumber: string): 'visa' | 'mastercard' | 'amex' | 'unknown' => {
  const cleaned = cardNumber.replace(/\s+/g, '').replace(/\D/g, '');
  
  if (/^4/.test(cleaned)) {
    return 'visa';
  }
  if (/^5[1-5]/.test(cleaned) || /^2[2-7]/.test(cleaned)) {
    return 'mastercard';
  }
  if (/^3[47]/.test(cleaned)) {
    return 'amex';
  }
  
  return 'unknown';
};

/**
 * Validates expiry date (MM/YY format)
 */
export const validateExpiry = (expiry: string): CardValidationResult => {
  if (!expiry) {
    return { isValid: false, error: 'Expiry date is required' };
  }

  // Remove slashes and spaces
  const cleaned = expiry.replace(/\s+/g, '').replace(/\//g, '');
  
  if (cleaned.length !== 4) {
    return { isValid: false, error: 'Expiry date must be MM/YY format' };
  }

  const month = parseInt(cleaned.substring(0, 2), 10);
  const year = parseInt(cleaned.substring(2, 4), 10);

  if (month < 1 || month > 12) {
    return { isValid: false, error: 'Invalid month' };
  }

  // Get current year (last 2 digits)
  const currentYear = new Date().getFullYear() % 100;
  const currentMonth = new Date().getMonth() + 1;

  // Convert 2-digit year to 4-digit
  const fullYear = year < currentYear ? 2000 + year : 1900 + year;

  // Check if card is expired
  if (fullYear < new Date().getFullYear()) {
    return { isValid: false, error: 'Card has expired' };
  }

  if (fullYear === new Date().getFullYear() && month < currentMonth) {
    return { isValid: false, error: 'Card has expired' };
  }

  return { isValid: true };
};

/**
 * Formats expiry date as MM/YY
 */
export const formatExpiry = (value: string): string => {
  const cleaned = value.replace(/\D/g, '');
  
  if (cleaned.length === 0) {
    return '';
  }
  
  if (cleaned.length <= 2) {
    return cleaned;
  }
  
  return `${cleaned.substring(0, 2)}/${cleaned.substring(2, 4)}`;
};

/**
 * Validates CVV
 */
export const validateCVV = (cvv: string, cardBrand?: 'visa' | 'mastercard' | 'amex' | 'unknown'): CardValidationResult => {
  if (!cvv) {
    return { isValid: false, error: 'CVV is required' };
  }

  const cleaned = cvv.replace(/\D/g, '');
  
  // Amex has 4 digits, others have 3
  const expectedLength = cardBrand === 'amex' ? 4 : 3;
  
  if (cleaned.length !== expectedLength) {
    return {
      isValid: false,
      error: cardBrand === 'amex' ? 'CVV must be 4 digits' : 'CVV must be 3 digits',
    };
  }

  return { isValid: true };
};

/**
 * Validates cardholder name
 */
export const validateCardHolder = (name: string): CardValidationResult => {
  if (!name || name.trim().length === 0) {
    return { isValid: false, error: 'Cardholder name is required' };
  }

  if (name.trim().length < 2) {
    return { isValid: false, error: 'Cardholder name must be at least 2 characters' };
  }

  return { isValid: true };
};
