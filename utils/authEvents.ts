// Event emitter for authentication events
// This allows services to communicate auth issues to the AuthContext

type AuthEventCallback = () => void;

class AuthEventEmitter {
  private listeners: AuthEventCallback[] = [];

  // Subscribe to session expired events
  onSessionExpired(callback: AuthEventCallback): () => void {
    this.listeners.push(callback);
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  // Emit session expired event (call this when 401 is received)
  emitSessionExpired(): void {
    console.log('[AuthEvents] Session expired, notifying listeners...');
    this.listeners.forEach(callback => callback());
  }
}

export const authEvents = new AuthEventEmitter();

// Helper function to handle 401 errors in services
export const handleUnauthorizedError = (): void => {
  authEvents.emitSessionExpired();
};
