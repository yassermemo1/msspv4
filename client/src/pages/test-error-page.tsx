import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useGlobalError } from '@/hooks/use-global-error';
import { useMutation, useQuery } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/app-layout';

export default function TestErrorPage() {
  const { captureError } = useGlobalError();

  // Test different types of errors
  const testJavaScriptError = () => {
    const error = new Error('This is a test JavaScript error with detailed debugging information');
    captureError(error, {
      testType: 'JavaScript Error',
      userAction: 'Button Click',
      additionalContext: {
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        currentPage: window.location.href
      }
    });
  };

  const testNetworkError = () => {
    fetch('/api/non-existent-endpoint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ test: 'data' })
    }).catch(error => {
      captureError(error, {
        testType: 'Network Error',
        endpoint: '/api/non-existent-endpoint',
        requestData: { test: 'data' }
      });
    });
  };

  const testReactQueryError = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/test-error-endpoint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forceError: true })
      });
      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }
      return response.json();
    },
    onError: (error: any) => {
      captureError(error, {
        testType: 'React Query Mutation Error',
        mutationContext: 'Test error endpoint',
        timestamp: new Date().toISOString()
      });
    }
  });

  const testComponentError = () => {
    // This will cause a React component error
    throw new Error('This is a test React component rendering error');
  };

  return (
    <AppLayout title="Error Testing" subtitle="Test the enhanced error handling system">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Enhanced Error Handling Test</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Click any button below to test different types of errors. Instead of small toast notifications,
              you'll see a detailed error card with debugging information, stack traces, and action buttons.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button 
                onClick={testJavaScriptError}
                variant="destructive"
                className="w-full"
              >
                Test JavaScript Error
              </Button>
              
              <Button 
                onClick={testNetworkError}
                variant="destructive"
                className="w-full"
              >
                Test Network Error
              </Button>
              
              <Button 
                onClick={() => testReactQueryError.mutate()}
                variant="destructive"
                className="w-full"
                disabled={testReactQueryError.isPending}
              >
                {testReactQueryError.isPending ? 'Testing...' : 'Test React Query Error'}
              </Button>
              
              <Button 
                onClick={testComponentError}
                variant="destructive"
                className="w-full"
              >
                Test Component Error
              </Button>
            </div>
            
            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-medium text-blue-900 mb-2">What to expect:</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Detailed error card instead of small toast notification</li>
                <li>• Complete stack traces and debugging information</li>
                <li>• API request/response details for network errors</li>
                <li>• Timestamp, user agent, and context information</li>
                <li>• Action buttons: Try Again, Go to Dashboard, Report Bug</li>
                <li>• Copy error details to clipboard functionality</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
} 