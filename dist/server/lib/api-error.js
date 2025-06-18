"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleApiError = exports.ApiError = void 0;
class ApiError extends Error {
    constructor(statusCode, message) {
        super(message);
        this.statusCode = statusCode;
        Object.setPrototypeOf(this, ApiError.prototype);
    }
}
exports.ApiError = ApiError;
const handleApiError = (res, error) => {
    if (error instanceof ApiError) {
        return res.status(error.statusCode).json({ message: error.message });
    }
    // Log the full error for debugging
    console.error("Unhandled API Error:", error);
    return res.status(500).json({ message: 'An unexpected error occurred on the server.' });
};
exports.handleApiError = handleApiError;
