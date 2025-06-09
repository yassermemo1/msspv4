import React, { createContext, useContext } from 'react';

// Global error context to capture and display errors in the ErrorBoundary
interface GlobalErrorContextType {
  captureError: (error: Error, additionalInfo?: any) => void;
  clearError: () => void;
}

const GlobalErrorContext = createContext<GlobalErrorContextType | null>(null);

// Enhanced error that includes additional debugging information
export class DetailedError extends Error {
  public readonly originalError?: Error;
  public readonly additionalInfo?: any;
  public readonly timestamp: string;
  public readonly userAgent: string;
  public readonly url: string;
  public readonly apiResponse?: Response;
  public readonly requestDetails?: any;

  constructor(message: string, options?: {
    originalError?: Error;
    additionalInfo?: any;
    apiResponse?: Response;
    requestDetails?: any;
  }) {
    super(message);
    this.name = 'DetailedError';
    this.originalError = options?.originalError;
    this.additionalInfo = options?.additionalInfo;
    this.timestamp = new Date().toISOString();
    this.userAgent = navigator.userAgent;
    this.url = window.location.href;
    this.apiResponse = options?.apiResponse;
    this.requestDetails = options?.requestDetails;
    
    // Preserve original stack trace if available
    if (options?.originalError?.stack) {
      this.stack = options.originalError.stack;
    }
  }
}

// Provider component that wraps the app
export const GlobalErrorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [error, setError] = React.useState<DetailedError | null>(null);

  const captureError = React.useCallback((error: Error, additionalInfo?: any) => {
    console.error('Global Error Captured:', error, additionalInfo);
    
    // Create enhanced error with debugging information
    const detailedError = new DetailedError(error.message, {
      originalError: error,
      additionalInfo
    });
    
    setError(detailedError);
  }, []);

  const clearError = React.useCallback(() => {
    setError(null);
  }, []);

  // Throw the error to trigger ErrorBoundary
  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  return (
    <GlobalErrorContext.Provider value={{ captureError, clearError }}>
      {children}
    </GlobalErrorContext.Provider>
  );
};

// Hook to use global error handling
export const useGlobalError = () => {
  const context = useContext(GlobalErrorContext);
  if (!context) {
    throw new Error('useGlobalError must be used within a GlobalErrorProvider');
  }
  return context;
};

// Enhanced fetch wrapper that provides detailed error information
export const createEnhancedFetch = (captureError: (error: Error, additionalInfo?: any) => void) => {
  return async (url: string, options?: RequestInit) => {
    const requestDetails = {
      url,
      method: options?.method || 'GET',
      headers: options?.headers,
      body: options?.body
    };

    try {
      const response = await fetch(url, options);
      
      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        let responseBody;
        
        try {
          // Try to get JSON error response
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            responseBody = await response.clone().json();
            if (responseBody.message) {
              errorMessage = responseBody.message;
            } else if (responseBody.error) {
              errorMessage = responseBody.error;
            }
          } else {
            responseBody = await response.clone().text();
          }
        } catch (parseError) {
          console.warn('Could not parse error response:', parseError);
        }

        const error = new DetailedError(errorMessage, {
          apiResponse: response,
          requestDetails,
          additionalInfo: { responseBody }
        });
        
        captureError(error);
        throw error;
      }
      
      return response;
    } catch (error) {
      if (error instanceof DetailedError) {
        throw error; // Already processed
      }
      
      // Network or other errors
      const detailedError = new DetailedError(
        error instanceof Error ? error.message : 'Network request failed',
        {
          originalError: error instanceof Error ? error : new Error(String(error)),
          requestDetails
        }
      );
      
      captureError(detailedError);
      throw detailedError;
    }
  };
};

// React Query error handler
export const createQueryErrorHandler = (captureError: (error: Error, additionalInfo?: any) => void) => {
  return (error: Error, query: any) => {
    console.error('React Query Error:', error, query);
    
    const detailedError = new DetailedError(error.message, {
      originalError: error,
      additionalInfo: {
        queryKey: query.queryKey,
        queryHash: query.queryHash,
        state: query.state
      }
    });
    
    captureError(detailedError);
  };
};

// Mutation error handler  
export const createMutationErrorHandler = (captureError: (error: Error, additionalInfo?: any) => void) => {
  return (error: Error, variables: any, context: any) => {
    console.error('React Query Mutation Error:', error, variables, context);
    
    const detailedError = new DetailedError(error.message, {
      originalError: error,
      additionalInfo: {
        variables,
        context,
        mutationType: 'mutation'
      }
    });
    
    captureError(detailedError);
  };
}; 