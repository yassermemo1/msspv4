// Centralized Toast Utilities
// Provides consistent toast messages with enhanced error handling across the entire app

import React from 'react';
import { useToast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';
import { Copy } from 'lucide-react';
import { 
  createApiError, 
  createNetworkError, 
  formatErrorForToast, 
  logError, 
  copyToClipboard,
  DetailedError
} from '@/lib/enhanced-error';

export interface ToastErrorOptions {
  context?: string;
  requestDetails?: any;
  showDetails?: boolean;
}

export interface ToastSuccessOptions {
  duration?: number;
  action?: any;
}

// Hook to provide enhanced toast functions
export function useEnhancedToast() {
  const { toast } = useToast();

  const showError = async (
    error: Error | DetailedError | string | any,
    options: ToastErrorOptions = {}
  ) => {
    const { context = 'Unknown', requestDetails, showDetails = true } = options;
    
    let detailedError: DetailedError;
    
    // Convert different error types to DetailedError
    if (error instanceof DetailedError) {
      detailedError = error;
    } else if (error instanceof Error) {
      detailedError = createNetworkError(error, requestDetails);
    } else if (typeof error === 'string') {
      detailedError = createNetworkError(new Error(error), requestDetails);
    } else if (error?.response) {
      // Handle fetch response errors
      detailedError = createApiError(error.response, error.data, requestDetails);
    } else {
      // Handle generic objects
      const message = error?.message || error?.error || String(error);
      detailedError = createNetworkError(new Error(message), requestDetails);
    }

    // Log the error for debugging
    logError(detailedError, context);
    
    // Format for toast display
    const { title, description, fullErrorText } = formatErrorForToast(detailedError, { showDetails });
    
    // Create copy action if we have detailed error text
    const copyAction = fullErrorText ? (
      <ToastAction
        altText="Copy error details"
        onClick={async () => {
          const success = await copyToClipboard(fullErrorText);
          if (success) {
            toast({ 
              title: "Copied!", 
              description: "Error details copied to clipboard",
              duration: 2000
            });
          } else {
            toast({ 
              title: "Copy Failed", 
              description: "Could not copy to clipboard",
              variant: "destructive",
              duration: 3000
            });
          }
        }}
      >
        <Copy className="h-4 w-4 mr-2" />
        Copy Details
      </ToastAction>
    ) : undefined;
    
    toast({
      title,
      description,
      variant: "destructive",
      action: copyAction,
      className: "select-text whitespace-pre-wrap font-mono"
    });
  };

  const showSuccess = (
    message: string,
    options: ToastSuccessOptions = {}
  ) => {
    const { duration = 4000, action } = options;
    
    toast({
      title: "Success",
      description: message,
      variant: "default",
      duration,
      action
    });
  };

  const showInfo = (
    title: string,
    message?: string,
    duration: number = 4000
  ) => {
    toast({
      title,
      description: message,
      variant: "default",
      duration
    });
  };

  const showWarning = (
    message: string,
    duration: number = 5000
  ) => {
    toast({
      title: "Warning",
      description: message,
      variant: "default",
      duration
    });
  };

  return {
    showError,
    showSuccess,
    showInfo,
    showWarning
  };
} 