// Enhanced Error handling utility
// This provides consistent detailed error information for both toasts and error boundaries

export interface ApiError {
  message: string;
  status?: number;
  statusText?: string;
  url?: string;
  timestamp?: string;
  responseTime?: string;
  details?: any;
  cause?: any;
  fileName?: string;
  lineNumber?: number;
  functionName?: string;
}

export interface ErrorDisplayOptions {
  showDetails?: boolean;
  maxLength?: number;
  includeStack?: boolean;
}

export interface ErrorLocation {
  fileName?: string;
  lineNumber?: number;
  functionName?: string;
  fullLocation?: string;
}

export class DetailedError extends Error {
  public timestamp: string;
  public requestDetails?: any;
  public apiResponse?: any;
  public additionalInfo?: any;
  public location?: ErrorLocation;

  constructor(
    message: string,
    options: {
      requestDetails?: any;
      apiResponse?: any;
      additionalInfo?: any;
      cause?: Error | any;
      location?: ErrorLocation;
    } = {}
  ) {
    super(message);
    this.name = 'DetailedError';
    this.timestamp = new Date().toISOString();
    this.requestDetails = options.requestDetails;
    this.apiResponse = options.apiResponse;
    this.additionalInfo = options.additionalInfo;
    this.location = options.location || parseErrorLocation();

    if (options.cause) {
      this.cause = options.cause;
    }

    // Maintain proper prototype chain
    Object.setPrototypeOf(this, DetailedError.prototype);
  }
}

function parseErrorLocation(): ErrorLocation {
  try {
    const stack = new Error().stack;
    if (!stack) return {};

    const stackLines = stack.split('\n');
    // Look for the first stack frame that's not from this error utility file
    // and not from browser/framework internal files
    for (let i = 2; i < stackLines.length; i++) {
      const line = stackLines[i];
      if (line && 
          !line.includes('enhanced-error.ts') && 
          !line.includes('node_modules') &&
          !line.includes('webpack') &&
          !line.includes('<anonymous>') &&
          !line.includes('at Object.') &&
          line.includes('.')) {
        
        // Try different stack trace formats
        const patterns = [
          /at\s+(.+?)\s+\((.+):(\d+):(\d+)\)/,  // at functionName (file:line:column)
          /at\s+(.+):(\d+):(\d+)/,              // at file:line:column
          /^\s*(.+)\s+(.+):(\d+):(\d+)$/        // functionName file:line:column
        ];
        
        for (const pattern of patterns) {
          const match = line.match(pattern);
          if (match) {
            if (match.length === 5 && match[1] && match[2]) {
              // Format: at functionName (file:line:column)
              return {
                functionName: match[1].trim(),
                fileName: extractFileName(match[2]),
                lineNumber: parseInt(match[3]),
                fullLocation: `${extractFileName(match[2])}:${match[3]} in ${match[1].trim()}`
              };
            } else if (match.length === 4 && match[1]) {
              // Format: at file:line:column
              return {
                fileName: extractFileName(match[1]),
                lineNumber: parseInt(match[2]),
                fullLocation: `${extractFileName(match[1])}:${match[2]}`
              };
            } else if (match.length === 5 && match[2]) {
              // Format: functionName file:line:column
              return {
                functionName: match[1].trim(),
                fileName: extractFileName(match[2]),
                lineNumber: parseInt(match[3]),
                fullLocation: `${extractFileName(match[2])}:${match[3]} in ${match[1].trim()}`
              };
            }
          }
        }
      }
    }
  } catch (e) {
    // If parsing fails, return empty object
  }
  return {};
}

function extractFileName(fullPath: string): string {
  // Extract just the filename from the full path/URL
  const parts = fullPath.split('/');
  const fileName = parts[parts.length - 1];
  // Remove query parameters and hash fragments
  return fileName.split('?')[0].split('#')[0];
}

export function createApiError(
  response: Response,
  responseData?: any,
  requestDetails?: any
): DetailedError {
  const message = responseData?.error_message || 
                 responseData?.message || 
                 `HTTP ${response.status}: ${response.statusText}`;

  return new DetailedError(message, {
    requestDetails: {
      url: response.url,
      method: requestDetails?.method || 'GET',
      ...requestDetails
    },
    apiResponse: {
      status: response.status,
      statusText: response.statusText,
      url: response.url,
      headers: Object.fromEntries(response.headers.entries())
    },
    additionalInfo: {
      responseData,
      timestamp: new Date().toISOString()
    }
  });
}

export function createNetworkError(
  error: Error,
  requestDetails?: any
): DetailedError {
  return new DetailedError(
    error.message || 'Network error occurred',
    {
      requestDetails,
      additionalInfo: {
        errorType: 'NetworkError',
        code: (error as any).code,
        cause: error.cause,
        timestamp: new Date().toISOString()
      },
      cause: error
    }
  );
}

export function formatErrorForToast(
  error: Error | DetailedError | ApiError,
  options: ErrorDisplayOptions = {}
): { title: string; description: string; fullErrorText?: string } {
  const { showDetails = import.meta.env.DEV, maxLength = 500 } = options;

  let title = 'Error';
  let description = error.message || 'An unexpected error occurred';
  let fullErrorText = '';

  if (error instanceof DetailedError) {
    title = 'Connection Error';
    
    // Create full error text for copying
    fullErrorText = `Error: ${error.message}\n`;
    fullErrorText += `Timestamp: ${error.timestamp}\n`;
    
    // Add location information prominently
    if (error.location?.fullLocation) {
      fullErrorText += `Location: ${error.location.fullLocation}\n`;
    } else if (error.location?.fileName && error.location?.lineNumber) {
      fullErrorText += `Location: ${error.location.fileName}:${error.location.lineNumber}\n`;
    }
    
    if (error.requestDetails) {
      fullErrorText += `\nRequest Details:\n`;
      fullErrorText += `  Method: ${error.requestDetails.method || 'N/A'}\n`;
      fullErrorText += `  URL: ${error.requestDetails.url || 'N/A'}\n`;
      if (error.requestDetails.body) {
        fullErrorText += `  Body: ${JSON.stringify(error.requestDetails.body, null, 2)}\n`;
      }
    }

    if (error.apiResponse) {
      fullErrorText += `\nAPI Response:\n`;
      fullErrorText += `  Status: ${error.apiResponse.status}\n`;
      fullErrorText += `  Status Text: ${error.apiResponse.statusText}\n`;
      fullErrorText += `  URL: ${error.apiResponse.url}\n`;
    }

    if (error.additionalInfo) {
      fullErrorText += `\nAdditional Info:\n`;
      fullErrorText += JSON.stringify(error.additionalInfo, null, 2);
    }

    if (error.stack) {
      fullErrorText += `\nStack Trace:\n${error.stack}`;
    }
    
    if (showDetails) {
      const details = [];
      
      // Add location information first
      if (error.location?.fullLocation) {
        details.push(`Location: ${error.location.fullLocation}`);
      } else if (error.location?.fileName && error.location?.lineNumber) {
        details.push(`Location: ${error.location.fileName}:${error.location.lineNumber}`);
      }
      
      if (error.apiResponse) {
        details.push(`Status: ${error.apiResponse.status}`);
        if (error.apiResponse.statusText) {
          details.push(`Status Text: ${error.apiResponse.statusText}`);
        }
        if (error.apiResponse.url) {
          details.push(`URL: ${error.apiResponse.url}`);
        }
      }

      if (error.additionalInfo?.responseTime) {
        details.push(`Response Time: ${error.additionalInfo.responseTime}`);
      }

      if (error.additionalInfo?.errorType) {
        details.push(`Type: ${error.additionalInfo.errorType}`);
      }

      if (details.length > 0) {
        description += '\n\nDebug Info:\n' + details.join('\n');
      }
    }
  } else if ((error as any).status && (error as any).statusText) {
    // Handle API error objects
    const apiError = error as ApiError;
    title = 'API Error';
    
    // Create full error text for copying
    fullErrorText = `Error: ${apiError.message}\n`;
    fullErrorText += `Status: ${apiError.status}\n`;
    fullErrorText += `Status Text: ${apiError.statusText}\n`;
    fullErrorText += `URL: ${apiError.url}\n`;
    fullErrorText += `Timestamp: ${apiError.timestamp || new Date().toISOString()}\n`;
    
    // Add location information if available
    if (apiError.fileName && apiError.lineNumber) {
      fullErrorText += `Location: ${apiError.fileName}:${apiError.lineNumber}`;
      if (apiError.functionName) {
        fullErrorText += ` in ${apiError.functionName}`;
      }
      fullErrorText += '\n';
    }
    
    if (apiError.details) {
      fullErrorText += `\nDetails:\n${JSON.stringify(apiError.details, null, 2)}`;
    }
    
    if (showDetails) {
      const details = [];
      
      // Add location information first
      if (apiError.fileName && apiError.lineNumber) {
        let locationText = `Location: ${apiError.fileName}:${apiError.lineNumber}`;
        if (apiError.functionName) {
          locationText += ` in ${apiError.functionName}`;
        }
        details.push(locationText);
      }
      
      if (apiError.status) details.push(`Status: ${apiError.status}`);
      if (apiError.statusText) details.push(`Status Text: ${apiError.statusText}`);
      if (apiError.url) details.push(`URL: ${apiError.url}`);
      if (apiError.responseTime) details.push(`Response Time: ${apiError.responseTime}`);
      
      if (details.length > 0) {
        description += '\n\nAPI Details:\n' + details.join('\n');
      }
    }
  } else {
    // Basic error - parse location from current stack
    const currentLocation = parseErrorLocation();
    
    fullErrorText = `Error: ${error.message}\n`;
    fullErrorText += `Timestamp: ${new Date().toISOString()}\n`;
    
    // Add location information if available
    if (currentLocation.fullLocation) {
      fullErrorText += `Location: ${currentLocation.fullLocation}\n`;
    } else if (currentLocation.fileName && currentLocation.lineNumber) {
      fullErrorText += `Location: ${currentLocation.fileName}:${currentLocation.lineNumber}\n`;
    }
    
    if (error.stack) {
      fullErrorText += `\nStack Trace:\n${error.stack}`;
    }
  }

  // Truncate if too long
  if (description.length > maxLength) {
    description = description.substring(0, maxLength) + '...';
  }

  return { title, description, fullErrorText };
}

export function enhanceErrorForBoundary(
  error: Error,
  requestDetails?: any,
  responseData?: any
): DetailedError {
  if (error instanceof DetailedError) {
    return error;
  }

  return new DetailedError(error.message, {
    requestDetails,
    additionalInfo: {
      originalError: {
        name: error.name,
        stack: error.stack
      },
      responseData,
      timestamp: new Date().toISOString()
    },
    cause: error
  });
}

export function logError(
  error: Error | DetailedError,
  context?: string
): void {
  const logData: any = {
    timestamp: new Date().toISOString(),
    context: context || 'Unknown',
    message: error.message,
    name: error.name
  };

  if (error instanceof DetailedError) {
    logData.requestDetails = error.requestDetails;
    logData.apiResponse = error.apiResponse;
    logData.additionalInfo = error.additionalInfo;
  }

  if (error.stack) {
    logData.stack = error.stack;
  }

  console.error(`[${context || 'ERROR'}]`, logData);
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback for browsers that don't support clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      const result = document.execCommand('copy');
      document.body.removeChild(textArea);
      return result;
    }
  } catch (err) {
    console.error('Failed to copy to clipboard:', err);
    return false;
  }
} 