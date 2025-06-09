import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Code, 
  Play, 
  Save, 
  X, 
  Database, 
  Settings, 
  AlertCircle,
  CheckCircle,
  Loader2,
  Copy,
  Eye,
  EyeOff
} from 'lucide-react';

interface CustomQuery {
  id?: number;
  name: string;
  description: string;
  systemId: number;
  queryType: string;
  query: string;
  parameters: any;
  dataMapping: any;
  isActive: boolean;
  isPublic: boolean;
  tags: string[];
}

interface ExternalSystem {
  id: number;
  systemName: string;
  displayName: string;
  systemType: string;
  baseUrl: string;
  authType: string;
  isActive: boolean;
}

interface CustomQueryBuilderProps {
  query?: CustomQuery;
  systems: ExternalSystem[];
  onSave: (query: CustomQuery) => Promise<void>;
  onCancel: () => void;
  onTest?: (config: any) => Promise<any>;
}

export function CustomQueryBuilder({
  query,
  systems,
  onSave,
  onCancel,
  onTest
}: CustomQueryBuilderProps) {
  const [formData, setFormData] = useState<CustomQuery>({
    name: '',
    description: '',
    systemId: 0,
    queryType: 'REST',
    query: '',
    parameters: {},
    dataMapping: {},
    isActive: true,
    isPublic: false,
    tags: [],
    ...query
  });

  const [testResult, setTestResult] = useState<any>(null);
  const [isTestingQuery, setIsTestingQuery] = useState(false);
  const [showTestResult, setShowTestResult] = useState(false);
  const [currentTag, setCurrentTag] = useState('');

  const queryTypes = [
    { value: 'REST', label: 'REST API' },
    { value: 'GraphQL', label: 'GraphQL' },
    { value: 'SQL', label: 'SQL Query' },
    { value: 'ELASTICSEARCH', label: 'Elasticsearch' },
    { value: 'SPLUNK', label: 'Splunk SPL' },
    { value: 'PROMETHEUS', label: 'PromQL' }
  ];

  // Sample templates for different query types
  const queryTemplates = {
    REST: `{
  "method": "GET",
  "endpoint": "/api/data",
  "headers": {
    "Content-Type": "application/json"
  },
  "params": {
    "limit": "{{limit}}",
    "filter": "{{filter}}"
  }
}`,
    GraphQL: `query GetData($limit: Int, $filter: String) {
  data(limit: $limit, filter: $filter) {
    id
    name
    status
    createdAt
  }
}`,
    SQL: `SELECT 
  id,
  name,
  status,
  created_at
FROM data_table 
WHERE status = '{{status}}'
  AND created_at >= '{{start_date}}'
ORDER BY created_at DESC
LIMIT {{limit}}`,
    ELASTICSEARCH: `{
  "query": {
    "bool": {
      "must": [
        {
          "match": {
            "status": "{{status}}"
          }
        },
        {
          "range": {
            "@timestamp": {
              "gte": "{{start_date}}"
            }
          }
        }
      ]
    }
  },
  "size": "{{limit}}"
}`,
    SPLUNK: `search index="{{index}}" 
| where status="{{status}}" 
| eval time=strftime(_time,"%Y-%m-%d %H:%M:%S") 
| table time, host, status, message 
| head {{limit}}`,
    PROMETHEUS: `rate(http_requests_total{job="{{job}}"}[5m])`
  };

  const handleInputChange = (field: keyof CustomQuery, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleQueryTypeChange = (type: string) => {
    setFormData(prev => ({
      ...prev,
      queryType: type,
      query: queryTemplates[type as keyof typeof queryTemplates] || ''
    }));
  };

  const handleAddTag = () => {
    if (currentTag.trim() && !formData.tags.includes(currentTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, currentTag.trim()]
      }));
      setCurrentTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleTestQuery = async () => {
    if (!onTest) return;
    
    setIsTestingQuery(true);
    try {
      const testConfig = {
        systemId: formData.systemId,
        queryType: formData.queryType,
        query: formData.query,
        parameters: formData.parameters
      };
      
      const result = await onTest(testConfig);
      setTestResult(result);
      setShowTestResult(true);
    } catch (error) {
      setTestResult({
        error: true,
        message: error instanceof Error ? error.message : 'Test failed'
      });
      setShowTestResult(true);
    } finally {
      setIsTestingQuery(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.systemId || !formData.query.trim()) {
      return;
    }

    try {
      await onSave(formData);
    } catch (error) {
      console.error('Failed to save query:', error);
    }
  };

  const selectedSystem = systems.find(s => s.id === formData.systemId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">
            {query ? 'Edit Custom Query' : 'Create Custom Query'}
          </h3>
          <p className="text-sm text-muted-foreground">
            Build custom queries to integrate with external systems
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={!formData.name.trim() || !formData.systemId || !formData.query.trim()}
          >
            <Save className="w-4 h-4 mr-2" />
            Save Query
          </Button>
        </div>
      </div>

      <Tabs defaultValue="config" className="space-y-4">
        <TabsList>
          <TabsTrigger value="config">Configuration</TabsTrigger>
          <TabsTrigger value="query">Query Builder</TabsTrigger>
          <TabsTrigger value="test">Test & Preview</TabsTrigger>
        </TabsList>

        <TabsContent value="config" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Basic Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Query Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="Enter query name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="system">Target System *</Label>
                  <Select 
                    value={formData.systemId?.toString() || ''} 
                    onValueChange={(value) => handleInputChange('systemId', parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select system" />
                    </SelectTrigger>
                    <SelectContent>
                      {systems.map(system => (
                        <SelectItem key={system.id} value={system.id.toString()}>
                          {system.displayName} ({system.systemType})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Describe what this query does"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="queryType">Query Type</Label>
                <Select 
                  value={formData.queryType} 
                  onValueChange={handleQueryTypeChange}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {queryTypes.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Tags</Label>
                <div className="flex gap-2">
                  <Input
                    value={currentTag}
                    onChange={(e) => setCurrentTag(e.target.value)}
                    placeholder="Add tag..."
                    onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                  />
                  <Button type="button" variant="outline" onClick={handleAddTag}>
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.tags.map(tag => (
                    <Badge key={tag} variant="secondary" className="cursor-pointer">
                      {tag}
                      <X 
                        className="w-3 h-3 ml-1" 
                        onClick={() => handleRemoveTag(tag)}
                      />
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="flex gap-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => handleInputChange('isActive', e.target.checked)}
                  />
                  <span className="text-sm">Active</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.isPublic}
                    onChange={(e) => handleInputChange('isPublic', e.target.checked)}
                  />
                  <span className="text-sm">Public</span>
                </label>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="query" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="w-5 h-5" />
                Query Definition
                {selectedSystem && (
                  <Badge variant="outline">
                    {selectedSystem.displayName}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Query Content *</Label>
                <Textarea
                  value={formData.query}
                  onChange={(e) => handleInputChange('query', e.target.value)}
                  placeholder="Enter your query here..."
                  rows={12}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Use {'{parameter_name}'} for dynamic parameters
                </p>
              </div>

              <div className="space-y-2">
                <Label>Parameters (JSON)</Label>
                <Textarea
                  value={JSON.stringify(formData.parameters, null, 2)}
                  onChange={(e) => {
                    try {
                      const parsed = JSON.parse(e.target.value);
                      handleInputChange('parameters', parsed);
                    } catch {
                      // Invalid JSON, don't update
                    }
                  }}
                  placeholder='{"limit": 100, "filter": "active"}'
                  rows={4}
                  className="font-mono text-sm"
                />
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Query templates are provided based on the selected query type. 
                  Modify the template to match your specific requirements.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="test" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Play className="w-5 h-5" />
                Test Query
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button 
                  onClick={handleTestQuery}
                  disabled={isTestingQuery || !formData.systemId || !formData.query.trim()}
                >
                  {isTestingQuery ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4 mr-2" />
                  )}
                  Test Query
                </Button>
                
                {showTestResult && (
                  <Button 
                    variant="outline" 
                    onClick={() => setShowTestResult(!showTestResult)}
                  >
                    {showTestResult ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
                    {showTestResult ? 'Hide' : 'Show'} Results
                  </Button>
                )}
              </div>

              {showTestResult && testResult && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {testResult.error ? (
                        <AlertCircle className="w-5 h-5 text-red-500" />
                      ) : (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      )}
                      Test Results
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-64">
                      <pre className="text-xs">
                        {JSON.stringify(testResult, null, 2)}
                      </pre>
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Test your query against the selected system to ensure it works correctly 
                  before saving. Make sure the target system is accessible and configured properly.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 