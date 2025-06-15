export class ApiError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

export const handleApiError = (res: any, error: any) => {
  if (error instanceof ApiError) {
    return res.status(error.statusCode).json({ message: error.message });
  }
  
  // Log the full error for debugging
  console.error("Unhandled API Error:", error);

  return res.status(500).json({ message: 'An unexpected error occurred on the server.' });
}; 