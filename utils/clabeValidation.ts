/**
 * CLABE (Clave Bancaria Estandarizada) validation for Mexican interbank account numbers.
 * 18 digits: 3 (bank) + 3 (branch) + 11 (account) + 1 (checksum).
 */

const CLABE_LENGTH = 18;
const WEIGHTS = [3, 7, 1];

export interface ClabeValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validates CLABE format and checksum (mod 10 with weights 3, 7, 1).
 */
export function validateClabe(clabe: string): ClabeValidationResult {
  const digits = clabe.replace(/\s+/g, "").replace(/\D/g, "");

  if (!digits) {
    return { isValid: false, error: "clabeRequired" };
  }

  if (digits.length !== CLABE_LENGTH) {
    return { isValid: false, error: "clabeLength" };
  }

  let sum = 0;
  for (let i = 0; i < 17; i++) {
    const digit = parseInt(digits[i], 10);
    if (Number.isNaN(digit)) {
      return { isValid: false, error: "clabeInvalidChars" };
    }
    sum += digit * WEIGHTS[i % 3];
  }

  const controlDigit = (10 - (sum % 10)) % 10;
  const lastDigit = parseInt(digits[17], 10);

  if (controlDigit !== lastDigit) {
    return { isValid: false, error: "clabeChecksum" };
  }

  return { isValid: true };
}

/**
 * Formats CLABE for display: groups of 4 digits (e.g. 0123 4567 8901 2345 67).
 */
export function formatClabeDisplay(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, CLABE_LENGTH);
  return digits.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
}

/**
 * Returns raw digits only (for storage/API).
 */
export function normalizeClabe(value: string): string {
  return value.replace(/\D/g, "").slice(0, CLABE_LENGTH);
}
