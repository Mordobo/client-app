/**
 * Normalizes API notification.type values so switches match (snake_case, suffix after dots, aliases).
 */
export function canonicalNotificationType(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  let s = raw.trim();
  if (!s) return '';
  if (s.includes('.')) {
    const parts = s.split('.');
    const last = parts[parts.length - 1]?.trim();
    if (last) s = last;
  }
  const withUnderscores = s
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[-\s]+/g, '_');
  const lower = withUnderscores.toLowerCase();
  if (lower === 'new_paid_booking' || lower === 'paid_booking' || lower === 'booking_paid') {
    return 'payment_received';
  }
  return lower;
}
