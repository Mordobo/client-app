/**
 * Card validation utilities (international PAN lengths + Luhn).
 */

import {
  detectCardNetwork,
  formatPanInput,
  getCvvLengthForNetwork,
  type CardNetwork,
} from '@/utils/cardNetwork';

export type { CardNetwork } from '@/utils/cardNetwork';

export interface CardValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validates a credit card number using Luhn algorithm (13–19 digits).
 */
export const validateCardNumber = (cardNumber: string): CardValidationResult => {
  const cleaned = cardNumber.replace(/\s+/g, '').replace(/\D/g, '');

  if (!cleaned) {
    return { isValid: false, error: 'Card number is required' };
  }

  if (cleaned.length < 13 || cleaned.length > 19) {
    return { isValid: false, error: 'Card number must be between 13 and 19 digits' };
  }

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
 * Formats PAN for display (Amex 4-6-5, others in groups of 4).
 */
export const formatCardNumber = (cardNumber: string): string => {
  const cleaned = cardNumber.replace(/\s+/g, '').replace(/\D/g, '');
  return formatPanInput('', cleaned);
};

/** @deprecated Use detectCardNetwork — alias kept for older imports. */
export const detectCardBrand = (cardNumber: string): CardNetwork => detectCardNetwork(cardNumber);

export { detectCardNetwork };

/**
 * Validates expiry date (MM/YY format)
 */
export const validateExpiry = (expiry: string): CardValidationResult => {
  if (!expiry) {
    return { isValid: false, error: 'Expiry date is required' };
  }

  const cleaned = expiry.replace(/\s+/g, '').replace(/\//g, '');

  if (cleaned.length !== 4) {
    return { isValid: false, error: 'Expiry date must be MM/YY format' };
  }

  const month = parseInt(cleaned.substring(0, 2), 10);
  const year = parseInt(cleaned.substring(2, 4), 10);

  if (month < 1 || month > 12) {
    return { isValid: false, error: 'Invalid month' };
  }

  const currentMonth = new Date().getMonth() + 1;
  const thisCalendarYear = new Date().getFullYear();
  const fullYear = 2000 + year;

  if (fullYear < thisCalendarYear) {
    return { isValid: false, error: 'Card has expired' };
  }

  if (fullYear === thisCalendarYear && month < currentMonth) {
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
 * Validates CVV length for the detected card network (3 or 4 digits).
 */
export const validateCVV = (cvv: string, network: CardNetwork = 'unknown'): CardValidationResult => {
  if (!cvv) {
    return { isValid: false, error: 'CVV is required' };
  }

  const cleaned = cvv.replace(/\D/g, '');
  const expectedLength = getCvvLengthForNetwork(network === 'unknown' ? 'visa' : network);

  if (cleaned.length !== expectedLength) {
    return {
      isValid: false,
      error: expectedLength === 4 ? 'CVV must be 4 digits' : 'CVV must be 3 digits',
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
