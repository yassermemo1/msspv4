import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { apiRequest } from '@/lib/api';

interface PluginInstance {
  id: string;
  name: string;
  baseUrl: string;
  authType: string;
  isActive: boolean;
  tags?: string[];
}

interface PluginQuery {
  id: string;
  method: string;
  path: string;
  description: string;
}

interface PluginWidgetProps {
  pluginName: string;
  instanceId: string;
  queryId?: string;
  title?: string;
  refreshInterval?: number;
  className?: string;
}

export function PluginWidget({ 
  pluginName, 
  instanceId, 
  queryId, 
  title, 
  refreshInterval = 30000,
  className 
}: PluginWidgetProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [instance, setInstance] = useState<PluginInstance | null>(null);
  const [query, setQuery] = useState<PluginQuery | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      let response;
      
      if (queryId) {
        // Execute a default query
        response = await apiRequest('POST', `/api/plugins/${pluginName}/instances/${instanceId}/default-query/${queryId}`);
      } else {
        // For now, execute the first available query
        const queriesResponse = await apiRequest('GET', `/api/plugins/${pluginName}/queries`);
        const queriesData = await queriesResponse.json();
        
        if (queriesData.queries && queriesData.queries.length > 0) {
          const firstQuery = queriesData.queries[0];
          response = await apiRequest('POST', `/api/plugins/${pluginName}/instances/${instanceId}/default-query/${firstQuery.id}`);
          setQuery(firstQuery);
        } else {
          throw new Error('No queries available for this plugin');
        }
      }

      const result = await response.json();
      
      if (result.success) {
        setData(result.data);
        setLastUpdate(new Date());
        
        // Get instance details if not already set
        if (!instance) {
          const instancesResponse = await apiRequest('GET', `/api/plugins/${pluginName}/instances`);
          const instancesData = await instancesResponse.json();
          const foundInstance = instancesData.instances.find((inst: PluginInstance) => inst.id === instanceId);
          setInstance(foundInstance || null);
        }
      } else {
        setError(result.message || 'Failed to fetch data');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    
    if (refreshInterval > 0) {
      const interval = setInterval(fetchData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [pluginName, instanceId, queryId, refreshInterval]);

  const formatData = (data: any) => {
    if (Array.isArray(data)) {
      return `${data.length} items`;
    }
    
    if (typeof data === 'object' && data !== null) {
      const keys = Object.keys(data);
      if (keys.includes('count') || keys.includes('total')) {
        return data.count || data.total;
      }
      if (keys.includes('status')) {
        return data.status;
      }
      return `${keys.length} properties`;
    }
    
    return String(data);
  };

  const getStatusColor = () => {
    if (error) return 'text-red-600 bg-red-50 border-red-200';
    if (loading) return 'text-blue-600 bg-blue-50 border-blue-200';
    return 'text-green-600 bg-green-50 border-green-200';
  };

  const getIcon = () => {
    if (error) return <AlertCircle className="h-4 w-4" />;
    if (loading) return <Loader2 className="h-4 w-4 animate-spin" />;
    return <CheckCircle className="h-4 w-4" />;
  };

  return (
    <Card className={`${className} ${getStatusColor()}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          {title || `${pluginName} - ${instance?.name || instanceId}`}
        </CardTitle>
        <div className="flex items-center space-x-2">
          {getIcon()}
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchData}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error ? (
          <div className="text-sm text-red-600">
            Error: {error}
          </div>
        ) : loading ? (
          <div className="text-sm text-blue-600">
            Loading...
          </div>
        ) : (
          <div>
            <div className="text-2xl font-bold">
              {formatData(data)}
            </div>
            {query && (
              <div className="text-xs text-gray-600 mt-1">
                {query.description}
              </div>
            )}
            {lastUpdate && (
              <div className="text-xs text-gray-500 mt-2">
                Last updated: {lastUpdate.toLocaleTimeString()}
              </div>
            )}
          </div>
        )}
        
        {instance && (
          <div className="flex items-center space-x-1 mt-2">
            <Badge variant="outline" className="text-xs">
              {pluginName}
            </Badge>
            {instance.tags?.map(tag => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
} 