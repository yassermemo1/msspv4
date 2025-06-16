/**
 * Utility functions for consistent error handling across the application
 */

/**
 * Safely extracts error message from unknown error types
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'Unknown error occurred';
}

/**
 * Safely extracts error name from unknown error types
 */
export function getErrorName(error: unknown): string {
  if (error instanceof Error) {
    return error.name;
  }
  return 'UnknownError';
}

/**
 * Creates a standardized error response object
 */
export function createErrorResponse(error: unknown, defaultMessage = 'An error occurred') {
  return {
    error: getErrorMessage(error) || defaultMessage,
    type: getErrorName(error)
  };
} 