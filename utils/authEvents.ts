type AuthEventCallback = () => void;

class AuthEventEmitter {
  private listeners: AuthEventCallback[] = [];
  private emitted = false;

  onSessionExpired(callback: AuthEventCallback): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  emitSessionExpired(): void {
    if (this.emitted) return;
    this.emitted = true;
    console.log('[AuthEvents] Session expired, notifying listeners...');
    this.listeners.forEach(callback => callback());
  }

  /** Reset the guard so a new session expired can be emitted (call after successful login). */
  reset(): void {
    this.emitted = false;
  }
}

export const authEvents = new AuthEventEmitter();

export const handleUnauthorizedError = (): void => {
  authEvents.emitSessionExpired();
};
