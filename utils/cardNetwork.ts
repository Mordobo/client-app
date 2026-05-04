/**
 * International card network detection from PAN (IIN/BIN prefixes).
 * Length rules follow common patterns; Luhn is applied separately in cardValidation.
 */

export type CardNetwork =
  | 'visa'
  | 'mastercard'
  | 'amex'
  | 'discover'
  | 'diners'
  | 'jcb'
  | 'unionpay'
  | 'maestro'
  | 'mir'
  | 'elo'
  | 'hipercard'
  | 'cartes_bancaires'
  | 'interac'
  | 'dankort'
  | 'unknown';

/** Values persisted as `payment_methods.type` for card-like methods (API + mobile). */
export type CardPaymentMethodType =
  | 'visa'
  | 'mastercard'
  | 'amex'
  | 'discover'
  | 'diners'
  | 'jcb'
  | 'unionpay'
  | 'maestro'
  | 'mir'
  | 'elo'
  | 'hipercard'
  | 'cartes_bancaires'
  | 'interac'
  | 'other_card';

/** Discover 622126–622925 (inclusive) — 6-digit prefix check on first 6 digits. */
function isDiscover622Range(pan: string): boolean {
  if (pan.length < 6) return false;
  if (!pan.startsWith('622')) return false;
  const six = parseInt(pan.slice(0, 6), 10);
  return six >= 622126 && six <= 622925;
}

const ELO_PREFIXES = [
  '401178',
  '401179',
  '431274',
  '438935',
  '451416',
  '457393',
  '504175',
  '627780',
  '636297',
  '636368',
  '650031',
  '650033',
  '650035',
] as const;

const MAESTRO_PREFIXES = [
  '5018',
  '5020',
  '5038',
  '5893',
  '6304',
  '6759',
  '6761',
  '6762',
  '6763',
  '5000',
] as const;

function startsWithAny(pan: string, prefixes: readonly string[]): boolean {
  return prefixes.some((p) => pan.startsWith(p));
}

/**
 * Best-effort network from partial or complete PAN (digits only).
 * More specific / regional prefixes are evaluated before broad ranges.
 */
export function detectCardNetwork(pan: string): CardNetwork {
  const d = pan.replace(/\D/g, '');
  if (!d) return 'unknown';

  if (/^220[0-4]/.test(d)) return 'mir';

  if (startsWithAny(d, ELO_PREFIXES)) return 'elo';

  if (/^606282|^3841/.test(d)) return 'hipercard';

  if (/^5019/.test(d)) return 'dankort';

  if (/^450644|^451016/.test(d)) return 'interac';

  // Cartes Bancaires heuristic (subset of co-badged BINs)
  if (/^4974/.test(d)) return 'cartes_bancaires';

  // American Express
  if (/^3[47]/.test(d)) return 'amex';

  // Diners / Carte Blanche (starts 30–305, 36, 38–39)
  if (/^3(0[0-5]|[689])/.test(d)) return 'diners';

  // JCB
  if (/^35(2[89]|[3-8]\d)/.test(d)) return 'jcb';

  // Discover
  if (/^6011/.test(d)) return 'discover';
  if (isDiscover622Range(d)) return 'discover';
  if (/^64[4-9]\d/.test(d)) return 'discover';
  if (/^65[0-4]\d/.test(d)) return 'discover';

  // UnionPay (62; after Discover 622xxxx range)
  if (/^62/.test(d)) return 'unionpay';

  // Mastercard
  if (/^5[1-5]\d/.test(d)) return 'mastercard';
  if (/^2(2(2[1-9]|[3-9]\d)|[3-6]\d{2}|7(0\d|1[0-9]|20))/.test(d)) return 'mastercard';

  // Maestro (common prefixes; many other 6xxx bins exist)
  if (startsWithAny(d, MAESTRO_PREFIXES)) return 'maestro';

  // Visa
  if (/^4/.test(d)) return 'visa';

  return 'unknown';
}

export function getMaxPanDigits(network: CardNetwork): number {
  switch (network) {
    case 'amex':
      return 15;
    case 'diners':
      return 16;
    case 'dankort':
      return 16;
    default:
      return 19;
  }
}

export function getCvvLengthForNetwork(network: CardNetwork): 3 | 4 {
  if (network === 'amex') return 4;
  return 3;
}

export function getFormattedPanMaxLength(network: CardNetwork): number {
  const maxDigits = getMaxPanDigits(network);
  if (network === 'amex') {
    return maxDigits + 2;
  }
  return maxDigits + Math.floor((maxDigits - 1) / 4);
}

/**
 * Formats PAN for display: Amex 4-6-5, others groups of 4 (up to max digits for network).
 */
export function formatPanInput(_raw: string, panDigitsSoFar: string): string {
  const d = panDigitsSoFar.replace(/\D/g, '').slice(0, 19);
  const network = detectCardNetwork(d);
  const max = getMaxPanDigits(network);
  const digits = d.slice(0, max);

  if (network === 'amex') {
    const a = digits.slice(0, 4);
    const b = digits.slice(4, 10);
    const c = digits.slice(10, 15);
    return [a, b, c].filter((x) => x.length > 0).join(' ');
  }

  return digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
}

export function mapCardNetworkToApiType(network: CardNetwork): CardPaymentMethodType {
  if (network === 'unknown' || network === 'dankort') return 'other_card';
  return network as CardPaymentMethodType;
}

/** Visual variant for saved methods + wallet types (icons in lists and modals). */
export type CardMarkVariant = CardNetwork | 'paypal' | 'apple_pay' | 'google_pay' | 'other_card';

const STORED_CARD_TYPES = new Set<string>([
  'visa',
  'mastercard',
  'amex',
  'discover',
  'diners',
  'jcb',
  'unionpay',
  'maestro',
  'mir',
  'elo',
  'hipercard',
  'cartes_bancaires',
  'interac',
  'other_card',
]);

export function paymentMethodTypeToMarkVariant(type: string): CardMarkVariant {
  if (type === 'paypal' || type === 'apple_pay' || type === 'google_pay' || type === 'other_card') {
    return type;
  }
  if (STORED_CARD_TYPES.has(type)) {
    return type as CardNetwork;
  }
  return 'unknown';
}
