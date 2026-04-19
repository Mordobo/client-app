/** Initials for avatar placeholders (e.g. "Walker animal" → "WA"). */
export function getDisplayNameInitials(displayName: string): string {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const first = parts[0].charAt(0).toUpperCase();
    const last = parts[parts.length - 1].charAt(0).toUpperCase();
    return first && last ? `${first}${last}` : first || last || "?";
  }
  if (parts.length === 1 && parts[0].length >= 2) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  if (parts.length === 1 && parts[0].length === 1) {
    return parts[0].toUpperCase();
  }
  return "?";
}
