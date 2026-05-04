/**
 * Normalizes API notification.type values so switches match (snake_case, dotted namespaces, aliases).
 *
 * Many backends send namespaced types like `domain.booking.cancelled`. Taking only the last segment
 * (`cancelled`) breaks template matching and the UI falls back to English API title/message.
 */

/** Canonical types used by `notificationDisplay` / navigation (longest first for suffix matching). */
const KNOWN_NOTIFICATION_TYPES_DESC: string[] = [
  'new_booking_request',
  'job_pending_review',
  'job_started',
  'booking_confirmed',
  'booking_cancelled',
  'payment_processed',
  'payment_received',
  'provider_on_way',
  'quote_received',
  'quote_approved',
  'job_completed',
  'refund_issued',
  'rate_service',
  'new_review',
  'new_message',
  'offer',
];

function normalizeTypeFragment(s: string): string {
  let x = s.trim().replace(/\./g, '_');
  x = x.replace(/([a-z0-9])([A-Z])/g, '$1_$2').replace(/[-\s]+/g, '_');
  return x.toLowerCase();
}

function applyAliases(lower: string): string {
  if (lower === 'new_paid_booking' || lower === 'paid_booking' || lower === 'booking_paid') {
    return 'payment_received';
  }
  if (lower === 'booking_canceled') {
    return 'booking_cancelled';
  }
  return lower;
}

function matchKnownCanonical(lower: string): string | null {
  const withAliases = applyAliases(lower);
  if (withAliases !== lower) return withAliases;

  for (const kt of KNOWN_NOTIFICATION_TYPES_DESC) {
    if (lower === kt || lower.endsWith(`_${kt}`)) return kt;
  }
  return null;
}

/**
 * Normalizes API notification.type values so switches match (snake_case, suffix after dots, aliases).
 */
export function canonicalNotificationType(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  const trimmed = raw.trim();
  if (!trimmed) return '';

  const fullNormalized = normalizeTypeFragment(trimmed);
  const fromFull = matchKnownCanonical(fullNormalized);
  if (fromFull) return fromFull;

  // Legacy: single trailing segment (handles `com.app.NewMessage` → last segment normalizes to new_message)
  if (trimmed.includes('.')) {
    const parts = trimmed.split('.');
    const last = parts[parts.length - 1]?.trim() ?? '';
    if (last) {
      const lastNorm = normalizeTypeFragment(last);
      const fromLast = matchKnownCanonical(lastNorm);
      if (fromLast) return fromLast;
      return lastNorm;
    }
  }

  return fullNormalized;
}
