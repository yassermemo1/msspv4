import { Request, Response, NextFunction } from 'express';
import { 
  ValidationError, 
  AuthenticationError, 
  AuthorizationError,
  NotFoundError,
  DuplicateError,
  DatabaseError,
  ExternalServiceError,
  ConfigurationError,
  BusinessLogicError,
  RateLimitError,
  FileProcessingError,
  JSONParsingError,
  TimeoutError,
  isOperationalError,
  getErrorDetails
} from '../lib/errors.ts';

// Enhanced error interface
interface ErrorResponse {
  error: {
    message: string;
    type: string;
    code?: string;
    details?: any;
    timestamp: string;
    requestId?: string;
  };
  success: false;
}

// Map error types to HTTP status codes
function getStatusCode(error: Error): number {
  switch (error.name) {
    case 'ValidationError':
    case 'JSONParsingError':
      return 400; // Bad Request
    
    case 'AuthenticationError':
      return 401; // Unauthorized
    
    case 'AuthorizationError':
      return 403; // Forbidden
    
    case 'NotFoundError':
      return 404; // Not Found
    
    case 'DuplicateError':
      return 409; // Conflict
    
    case 'RateLimitError':
      return 429; // Too Many Requests
    
    case 'TimeoutError':
      return 408; // Request Timeout
    
    case 'ConfigurationError':
    case 'DatabaseError':
    case 'ExternalServiceError':
    case 'FileProcessingError':
      return 500; // Internal Server Error
    
    case 'BusinessLogicError':
      return 422; // Unprocessable Entity
    
    default:
      return 500; // Internal Server Error
  }
}

// Get error code for client identification
function getErrorCode(error: Error): string {
  switch (error.name) {
    case 'ValidationError': return 'VALIDATION_FAILED';
    case 'AuthenticationError': return 'AUTH_REQUIRED';
    case 'AuthorizationError': return 'INSUFFICIENT_PERMISSIONS';
    case 'NotFoundError': return 'RESOURCE_NOT_FOUND';
    case 'DuplicateError': return 'DUPLICATE_RESOURCE';
    case 'DatabaseError': return 'DATABASE_ERROR';
    case 'ExternalServiceError': return 'EXTERNAL_SERVICE_ERROR';
    case 'ConfigurationError': return 'CONFIGURATION_ERROR';
    case 'BusinessLogicError': return 'BUSINESS_RULE_VIOLATION';
    case 'RateLimitError': return 'RATE_LIMIT_EXCEEDED';
    case 'FileProcessingError': return 'FILE_PROCESSING_ERROR';
    case 'JSONParsingError': return 'INVALID_JSON';
    case 'TimeoutError': return 'REQUEST_TIMEOUT';
    default: return 'INTERNAL_ERROR';
  }
}

// Check if error details should be exposed to client
function shouldExposeDetails(error: Error, isProduction: boolean): boolean {
  if (!isProduction) return true; // Show all details in development
  
  // In production, only show details for operational errors
  return isOperationalError(error);
}

// Sanitize error message for production
function sanitizeMessage(error: Error, isProduction: boolean): string {
  if (!isProduction) return error.message;
  
  // In production, use generic messages for non-operational errors
  if (!isOperationalError(error)) {
    return 'An internal error occurred. Please try again later.';
  }
  
  return error.message;
}

// Main error handler middleware
export function errorHandler(
  error: Error, 
  req: Request, 
  res: Response, 
  next: NextFunction
): void {
  const isProduction = process.env.NODE_ENV === 'production';
  const statusCode = getStatusCode(error);
  const errorCode = getErrorCode(error);
  const requestId = req.headers['x-request-id'] as string;
  
  // Log error details (always log, regardless of environment)
  const errorDetails = getErrorDetails(error);
  console.error('Error Handler:', {
    ...errorDetails,
    url: req.url,
    method: req.method,
    userAgent: req.headers['user-agent'],
    ip: req.ip,
    userId: req.user?.id,
    requestId
  });
  
  // Special handling for specific error types
  let details: any = undefined;
  
  if (error instanceof ValidationError && shouldExposeDetails(error, isProduction)) {
    details = { field: error.message.split(':')[0] };
  }
  
  if (error instanceof AuthorizationError && shouldExposeDetails(error, isProduction)) {
    details = { requiredRole: error.message.includes('Required:') ? 
      error.message.split('Required:')[1]?.split(',')[0]?.trim() : undefined };
  }
  
  if (error instanceof RateLimitError && shouldExposeDetails(error, isProduction)) {
    details = { retryAfter: 60 }; // Default retry after 60 seconds
  }
  
  // Build error response
  const errorResponse: ErrorResponse = {
    error: {
      message: sanitizeMessage(error, isProduction),
      type: error.name,
      code: errorCode,
      details: shouldExposeDetails(error, isProduction) ? details : undefined,
      timestamp: new Date().toISOString(),
      requestId
    },
    success: false
  };
  
  // Set appropriate headers
  res.set({
    'Content-Type': 'application/json',
    'X-Error-Code': errorCode
  });
  
  // Special headers for rate limiting
  if (error instanceof RateLimitError) {
    res.set('Retry-After', '60');
  }
  
  // Send error response
  res.status(statusCode).json(errorResponse);
  
  // Don't call next() - this is the final handler
}

// Async error wrapper for route handlers
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// 404 handler for unmatched routes
export function notFoundHandler(req: Request, res: Response, next: NextFunction): void {
  const error = new NotFoundError('Route', req.path);
  next(error);
}

// Validation helper for route parameters
export function validateRequiredParams(params: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    for (const param of params) {
      if (!req.params[param]) {
        const error = new ValidationError(param, 'undefined', 'string');
        return next(error);
      }
    }
    next();
  };
}

// Validation helper for request body
export function validateRequiredBody(fields: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.body) {
      const error = new ValidationError('body', 'undefined', 'object');
      return next(error);
    }
    
    for (const field of fields) {
      if (req.body[field] === undefined || req.body[field] === null) {
        const error = new ValidationError(field, req.body[field], 'required value');
        return next(error);
      }
    }
    next();
  };
}

// JSON parsing error handler
export function jsonErrorHandler(
  error: any, 
  req: Request, 
  res: Response, 
  next: NextFunction
): void {
  if (error instanceof SyntaxError && 'body' in error) {
    const jsonError = new JSONParsingError('request body', req.body);
    return next(jsonError);
  }
  next(error);
} 