/**
 * Phone number validation for contact/profile fields.
 * Accepts digits only (optional + and spaces); length 6–15 (E.164 without +).
 */

const MIN_DIGITS = 6;
const MAX_DIGITS = 15;

export interface PhoneValidationResult {
  isValid: boolean;
  normalized?: string;
}

/**
 * Normalizes input to digits only (strips + and spaces) and enforces max length.
 */
export function normalizePhoneInput(input: string): string {
  const digits = input.replace(/\D/g, '');
  return digits.slice(0, MAX_DIGITS);
}

/**
 * Validates phone: empty is valid (optional field); otherwise 6–15 digits.
 */
export function validatePhone(phone: string): PhoneValidationResult {
  const trimmed = phone.trim();
  if (!trimmed) {
    return { isValid: true, normalized: '' };
  }
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length < MIN_DIGITS || digits.length > MAX_DIGITS) {
    return { isValid: false };
  }
  return { isValid: true, normalized: digits };
}
