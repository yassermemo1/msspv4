// Custom error classes for MSSP application

export class ValidationError extends Error {
  constructor(field: string, value: any, expectedType?: string) {
    const message = expectedType 
      ? `Invalid ${field}: expected ${expectedType}, got ${typeof value} (${value})`
      : `Invalid ${field}: ${value}`;
    super(message);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends Error {
  constructor(message = 'Authentication required') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends Error {
  constructor(message = 'Insufficient permissions', requiredRole?: string, currentRole?: string) {
    const fullMessage = requiredRole && currentRole 
      ? `${message}. Required: ${requiredRole}, Current: ${currentRole}`
      : message;
    super(fullMessage);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends Error {
  constructor(resource: string, id?: string | number) {
    const message = id ? `${resource} with ID ${id} not found` : `${resource} not found`;
    super(message);
    this.name = 'NotFoundError';
  }
}

export class DuplicateError extends Error {
  constructor(resource: string, field: string, value: any) {
    super(`${resource} with ${field} '${value}' already exists`);
    this.name = 'DuplicateError';
  }
}

export class DatabaseError extends Error {
  constructor(operation: string, table?: string, originalError?: Error) {
    const message = table 
      ? `Database ${operation} failed on table '${table}': ${originalError?.message || 'Unknown error'}`
      : `Database ${operation} failed: ${originalError?.message || 'Unknown error'}`;
    super(message);
    this.name = 'DatabaseError';
    this.cause = originalError;
  }
}

// ExternalServiceError removed - external systems deprecated

export class ConfigurationError extends Error {
  constructor(setting: string, expectedValue?: string) {
    const message = expectedValue 
      ? `Configuration error: ${setting} should be ${expectedValue}`
      : `Configuration error: ${setting} is missing or invalid`;
    super(message);
    this.name = 'ConfigurationError';
  }
}

export class BusinessLogicError extends Error {
  constructor(rule: string, context?: Record<string, any>) {
    const contextStr = context ? ` (Context: ${JSON.stringify(context)})` : '';
    super(`Business rule violation: ${rule}${contextStr}`);
    this.name = 'BusinessLogicError';
  }
}

export class RateLimitError extends Error {
  constructor(limit: number, timeWindow: string, retryAfter?: number) {
    const retryMsg = retryAfter ? ` Retry after ${retryAfter} seconds.` : '';
    super(`Rate limit exceeded: ${limit} requests per ${timeWindow}.${retryMsg}`);
    this.name = 'RateLimitError';
  }
}

export class FileProcessingError extends Error {
  constructor(filename: string, operation: string, originalError?: Error) {
    super(`File processing failed for '${filename}' during ${operation}: ${originalError?.message || 'Unknown error'}`);
    this.name = 'FileProcessingError';
    this.cause = originalError;
  }
}

export class JSONParsingError extends Error {
  constructor(field: string, value: string, originalError?: Error) {
    super(`Invalid JSON in ${field}: ${originalError?.message || 'Malformed JSON'}`);
    this.name = 'JSONParsingError';
    this.cause = originalError;
  }
}

export class TimeoutError extends Error {
  constructor(operation: string, timeout: number) {
    super(`Operation '${operation}' timed out after ${timeout}ms`);
    this.name = 'TimeoutError';
  }
}

// Utility function to determine if an error is operational (known/expected)
export function isOperationalError(error: Error): boolean {
  const operationalErrors = [
    'ValidationError',
    'AuthenticationError', 
    'AuthorizationError',
    'NotFoundError',
    'DuplicateError',
    'BusinessLogicError',
    'RateLimitError',
    'JSONParsingError'
  ];
  
  return operationalErrors.includes(error.name);
}

// Helper function to extract error details for logging
export function getErrorDetails(error: Error): Record<string, any> {
  return {
    name: error.name,
    message: error.message,
    stack: error.stack,
    cause: error.cause,
    timestamp: new Date().toISOString(),
    operational: isOperationalError(error)
  };
}

// Type guard functions
export function isValidationError(error: Error): error is ValidationError {
  return error.name === 'ValidationError';
}

export function isAuthenticationError(error: Error): error is AuthenticationError {
  return error.name === 'AuthenticationError';
}

export function isNotFoundError(error: Error): error is NotFoundError {
  return error.name === 'NotFoundError';
}

export function isDatabaseError(error: Error): error is DatabaseError {
  return error.name === 'DatabaseError';
}

// isExternalServiceError removed - external systems deprecated 