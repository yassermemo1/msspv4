import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Activity, AlertCircle, Globe, ExternalLink, Settings } from 'lucide-react';

interface ApiWidgetProps {
  className?: string;
  title?: string;
  apiUrl?: string;
  refreshInterval?: number;
}

interface ApiResponse {
  success: boolean;
  data: any;
  message?: string;
}

const ExternalApiWidget: React.FC<ApiWidgetProps> = ({ 
  className,
  title = "External API Data",
  apiUrl: initialApiUrl = "https://jsonplaceholder.typicode.com/posts",
  refreshInterval = 30000 // 30 seconds default
}) => {
  const [apiUrl, setApiUrl] = useState(initialApiUrl);
  const [currentUrl, setCurrentUrl] = useState(initialApiUrl);
  const [showConfig, setShowConfig] = useState(false);

  console.log('🌐 ExternalApiWidget rendering...');
  
  const { data: response, isLoading, error, refetch } = useQuery({
    queryKey: ['external-api-data', currentUrl],
    queryFn: async () => {
      console.log('🔍 Fetching external API data from:', currentUrl);
      
      try {
        const response = await fetch(currentUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
        });

        if (!response.ok) {
          console.error('❌ API request failed:', response.status, response.statusText);
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('✅ API response received:', data);
        
        // Return formatted data
        return {
          success: true,
          data: data,
          url: currentUrl,
          timestamp: new Date().toISOString()
        };
      } catch (err) {
        console.error('❌ API fetch error:', err);
        throw err;
      }
    },
    refetchInterval: refreshInterval,
    staleTime: 10000, // Consider data stale after 10 seconds
    retry: 2,
  });

  const handleUrlUpdate = () => {
    setCurrentUrl(apiUrl);
    setShowConfig(false);
  };

  const formatData = (data: any) => {
    if (Array.isArray(data)) {
      return {
        type: 'Array',
        count: data.length,
        sample: data.slice(0, 3)
      };
    } else if (typeof data === 'object' && data !== null) {
      return {
        type: 'Object',
        keys: Object.keys(data).length,
        sample: Object.keys(data).slice(0, 5)
      };
    } else {
      return {
        type: typeof data,
        value: String(data).substring(0, 100)
      };
    }
  };

  const formattedData = response?.data ? formatData(response.data) : null;

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Globe className="h-5 w-5 text-green-600" />
            <CardTitle className="text-lg font-semibold">{title}</CardTitle>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowConfig(!showConfig)}
              className="text-gray-500 hover:text-gray-700"
            >
              <Settings className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading}
              className="text-gray-500 hover:text-gray-700"
            >
              <Activity className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
        
        {/* Configuration Panel */}
        {showConfig && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-3">
            <div>
              <Label htmlFor="api-url" className="text-sm font-medium">API URL</Label>
              <Input
                id="api-url"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                placeholder="Enter API endpoint URL"
                className="mt-1"
              />
            </div>
            <div className="flex space-x-2">
              <Button onClick={handleUrlUpdate} size="sm">
                Update URL
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowConfig(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <span>Endpoint:</span>
          <Badge variant="outline" className="font-mono text-xs">
            {currentUrl.length > 40 ? `${currentUrl.substring(0, 40)}...` : currentUrl}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-6">
            <Activity className="h-8 w-8 text-blue-500 animate-spin mb-2" />
            <p className="text-sm text-gray-600">Fetching data...</p>
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <AlertCircle className="h-8 w-8 text-red-400 mb-2" />
            <p className="text-sm text-red-600 mb-3">Failed to load API data</p>
            <p className="text-xs text-gray-500 mb-3">{error.message}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="text-red-600 border-red-300 hover:bg-red-50"
            >
              <Activity className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        )}

        {/* Success State */}
        {response && !isLoading && !error && (
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div>
                <div className="font-medium text-green-800">Data Type: {formattedData?.type}</div>
                <div className="text-sm text-green-600">
                  {formattedData?.type === 'Array' && `${formattedData.count} items`}
                  {formattedData?.type === 'Object' && `${formattedData.keys} keys`}
                  {formattedData?.type !== 'Array' && formattedData?.type !== 'Object' && 'Value received'}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-green-600 hover:text-green-700"
                onClick={() => {
                  window.open(currentUrl, '_blank');
                }}
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>

            {/* Data Preview */}
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-sm font-medium text-gray-700 mb-2">Data Preview:</div>
              <pre className="text-xs text-gray-600 bg-white p-2 rounded border overflow-auto max-h-32">
                {JSON.stringify(formattedData?.sample || formattedData?.value || response.data, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="pt-2 border-t border-gray-200">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>
              Last updated: {response?.timestamp ? new Date(response.timestamp).toLocaleTimeString() : 'Never'}
            </span>
            <div className="flex items-center space-x-2">
              <span>Auto-refresh: {refreshInterval/1000}s</span>
              <div className={`w-2 h-2 rounded-full ${isLoading ? 'bg-blue-500 animate-pulse' : 'bg-green-500'}`}></div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ExternalApiWidget; 