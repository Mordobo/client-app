/**
 * Bank account number validation for the Dominican Republic.
 * DR does not use CLABE (a Mexican 18-digit interbank format); account numbers are plain
 * numeric strings that vary in length by bank, so we only enforce numeric + a sane length range.
 */

const MIN_ACCOUNT_LENGTH = 4;
const MAX_ACCOUNT_LENGTH = 20;

export interface AccountNumberValidationResult {
  isValid: boolean;
  error?: "accountRequired" | "accountLength";
}

/** Strip everything but digits. */
export function normalizeAccountNumber(value: string): string {
  return value.replace(/\D/g, "");
}

/** Display as-is (digits only); grouping is left to the input to avoid guessing bank formats. */
export function formatAccountNumberDisplay(value: string): string {
  return normalizeAccountNumber(value);
}

export function validateAccountNumber(value: string): AccountNumberValidationResult {
  const digits = normalizeAccountNumber(value);
  if (!digits) return { isValid: false, error: "accountRequired" };
  if (digits.length < MIN_ACCOUNT_LENGTH || digits.length > MAX_ACCOUNT_LENGTH) {
    return { isValid: false, error: "accountLength" };
  }
  return { isValid: true };
}
