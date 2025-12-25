/**
 * Helper function to create headers for API requests
 * Automatically includes ngrok-skip-browser-warning header when needed
 */
export const createApiHeaders = (additionalHeaders: Record<string, string> = {}): Record<string, string> => {
  return {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true', // Skip ngrok browser warning page
    ...additionalHeaders,
  };
};

