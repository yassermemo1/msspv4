"use strict";
/**
 * Utility functions for consistent error handling across the application
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getErrorMessage = getErrorMessage;
exports.getErrorName = getErrorName;
exports.createErrorResponse = createErrorResponse;
/**
 * Safely extracts error message from unknown error types
 */
function getErrorMessage(error) {
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
function getErrorName(error) {
    if (error instanceof Error) {
        return error.name;
    }
    return 'UnknownError';
}
/**
 * Creates a standardized error response object
 */
function createErrorResponse(error, defaultMessage = 'An error occurred') {
    return {
        error: getErrorMessage(error) || defaultMessage,
        type: getErrorName(error)
    };
}
