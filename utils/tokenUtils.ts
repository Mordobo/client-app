interface JwtPayload {
  userId: string;
  email: string;
  userType: string;
  iat: number;
  exp: number;
}

export function decodeToken(token: string): JwtPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = parts[1];
    const decoded = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(decoded) as JwtPayload;
  } catch {
    return null;
  }
}

export function getTokenExpirationMs(token: string): number | null {
  const payload = decodeToken(token);
  if (!payload?.exp) return null;
  return payload.exp * 1000;
}

export function getTimeUntilExpiryMs(token: string): number | null {
  const expiresAt = getTokenExpirationMs(token);
  if (expiresAt === null) return null;
  return expiresAt - Date.now();
}

export function isTokenExpiringSoon(token: string, thresholdMs: number = 3 * 60 * 1000): boolean {
  const remaining = getTimeUntilExpiryMs(token);
  if (remaining === null) return true;
  return remaining <= thresholdMs;
}
