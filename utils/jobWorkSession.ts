/**
 * In-memory store for work-in-progress data (photos, notes) captured during a job.
 * Complete screen reads from here to prefill work photos and summary.
 */

const sessionByOrder: Record<
  string,
  { photos: string[]; notes: string[] }
> = {};

export function getSessionOrderId(orderId: string): {
  photos: string[];
  notes: string[];
} {
  const s = sessionByOrder[orderId];
  return s ? { photos: [...s.photos], notes: [...s.notes] } : { photos: [], notes: [] };
}

export function addSessionPhoto(orderId: string, uri: string): void {
  if (!sessionByOrder[orderId]) {
    sessionByOrder[orderId] = { photos: [], notes: [] };
  }
  sessionByOrder[orderId].photos.push(uri);
}

export function addSessionNote(orderId: string, note: string): void {
  if (!sessionByOrder[orderId]) {
    sessionByOrder[orderId] = { photos: [], notes: [] };
  }
  sessionByOrder[orderId].notes.push(note);
}

export function clearSession(orderId: string): void {
  delete sessionByOrder[orderId];
}

export function getSessionPhotoCount(orderId: string): number {
  return sessionByOrder[orderId]?.photos.length ?? 0;
}

export function getSessionNoteCount(orderId: string): number {
  return sessionByOrder[orderId]?.notes.length ?? 0;
}
