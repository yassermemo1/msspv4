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
  ExternalLink,
  Settings,
  TestTube,
  CheckCircle,
  AlertCircle,
  Loader2,
  Key,
  Database,
  Globe,
  Shield,
  X,
  Save,
  Eye,
  EyeOff
} from 'lucide-react';

interface ExternalSystem {
  id?: number;
  systemName: string;
  displayName: string;
  systemType: string;
  baseUrl: string;
  authType: string;
  authConfig?: any;
  headers?: any;
  isActive: boolean;
  description?: string;
  tags?: string[];
}

interface PlatformConnectorProps {
  system?: ExternalSystem;
  onSave: (system: ExternalSystem) => Promise<void>;
  onCancel: () => void;
  onTest?: (config: any) => Promise<any>;
}

export function PlatformConnector({
  system,
  onSave,
  onCancel,
  onTest
}: PlatformConnectorProps) {
  const [formData, setFormData] = useState<ExternalSystem>({
    systemName: '',
    displayName: '',
    systemType: '',
    baseUrl: '',
    authType: 'none',
    authConfig: {},
    headers: {},
    isActive: true,
    description: '',
    tags: [],
    ...system
  });

  const [testResult, setTestResult] = useState<any>(null);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [showTestResult, setShowTestResult] = useState(false);
  const [showSensitiveInfo, setShowSensitiveInfo] = useState(false);
  const [currentTag, setCurrentTag] = useState('');

  const platformTypes = [
    { value: 'grafana', label: 'Grafana', description: 'Grafana monitoring and visualization platform' },
    { value: 'splunk', label: 'Splunk', description: 'Splunk data analytics platform' },
    { value: 'carbonblack', label: 'Carbon Black', description: 'VMware Carbon Black security platform' },
    { value: 'jira', label: 'Jira', description: 'Atlassian Jira project management' },
    { value: 'servicenow', label: 'ServiceNow', description: 'ServiceNow IT service management' },
    { value: 'elastic', label: 'Elasticsearch', description: 'Elasticsearch search and analytics' },
    { value: 'prometheus', label: 'Prometheus', description: 'Prometheus monitoring system' },
    { value: 'kibana', label: 'Kibana', description: 'Kibana data visualization' },
    { value: 'api', label: 'Generic API', description: 'Generic REST/GraphQL API' },
    { value: 'custom', label: 'Custom', description: 'Custom integration platform' }
  ];

  const authTypes = [
    { value: 'none', label: 'No Authentication' },
    { value: 'basic', label: 'Basic Authentication' },
    { value: 'bearer', label: 'Bearer Token' },
    { value: 'api_key', label: 'API Key' },
    { value: 'oauth2', label: 'OAuth 2.0' },
    { value: 'custom', label: 'Custom Headers' }
  ];

  const handleInputChange = (field: keyof ExternalSystem, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAuthConfigChange = (key: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      authConfig: {
        ...prev.authConfig,
        [key]: value
      }
    }));
  };

  const handleHeaderChange = (key: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      headers: {
        ...prev.headers,
        [key]: value
      }
    }));
  };

  const handleAddTag = () => {
    if (currentTag.trim() && !formData.tags?.includes(currentTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...(prev.tags || []), currentTag.trim()]
      }));
      setCurrentTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags?.filter(tag => tag !== tagToRemove) || []
    }));
  };

  const handleTestConnection = async () => {
    if (!onTest) return;
    
    setIsTestingConnection(true);
    try {
      const testConfig = {
        baseUrl: formData.baseUrl,
        authType: formData.authType,
        authConfig: formData.authConfig,
        headers: formData.headers
      };
      
      const result = await onTest(testConfig);
      setTestResult(result);
      setShowTestResult(true);
    } catch (error) {
      setTestResult({
        error: true,
        message: error instanceof Error ? error.message : 'Connection test failed'
      });
      setShowTestResult(true);
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleSave = async () => {
    if (!formData.systemName.trim() || !formData.displayName.trim() || !formData.baseUrl.trim()) {
      return;
    }

    try {
      await onSave(formData);
    } catch (error) {
      console.error('Failed to save system:', error);
    }
  };

  const renderAuthConfig = () => {
    switch (formData.authType) {
      case 'basic':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Username</Label>
              <Input
                value={formData.authConfig?.username || ''}
                onChange={(e) => handleAuthConfigChange('username', e.target.value)}
                placeholder="Enter username"
              />
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <div className="relative">
                <Input
                  type={showSensitiveInfo ? 'text' : 'password'}
                  value={formData.authConfig?.password || ''}
                  onChange={(e) => handleAuthConfigChange('password', e.target.value)}
                  placeholder="Enter password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowSensitiveInfo(!showSensitiveInfo)}
                >
                  {showSensitiveInfo ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>
        );

      case 'bearer':
        return (
          <div className="space-y-2">
            <Label>Bearer Token</Label>
            <div className="relative">
              <Textarea
                value={formData.authConfig?.token || ''}
                onChange={(e) => handleAuthConfigChange('token', e.target.value)}
                placeholder="Enter bearer token"
                rows={3}
                className={!showSensitiveInfo ? 'font-mono' : ''}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-2 top-2"
                onClick={() => setShowSensitiveInfo(!showSensitiveInfo)}
              >
                {showSensitiveInfo ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        );

      case 'api_key':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>API Key Header Name</Label>
              <Input
                value={formData.authConfig?.keyHeader || 'X-API-Key'}
                onChange={(e) => handleAuthConfigChange('keyHeader', e.target.value)}
                placeholder="X-API-Key"
              />
            </div>
            <div className="space-y-2">
              <Label>API Key Value</Label>
              <div className="relative">
                <Input
                  type={showSensitiveInfo ? 'text' : 'password'}
                  value={formData.authConfig?.keyValue || ''}
                  onChange={(e) => handleAuthConfigChange('keyValue', e.target.value)}
                  placeholder="Enter API key"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowSensitiveInfo(!showSensitiveInfo)}
                >
                  {showSensitiveInfo ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>
        );

      case 'oauth2':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Client ID</Label>
              <Input
                value={formData.authConfig?.clientId || ''}
                onChange={(e) => handleAuthConfigChange('clientId', e.target.value)}
                placeholder="Enter client ID"
              />
            </div>
            <div className="space-y-2">
              <Label>Client Secret</Label>
              <div className="relative">
                <Input
                  type={showSensitiveInfo ? 'text' : 'password'}
                  value={formData.authConfig?.clientSecret || ''}
                  onChange={(e) => handleAuthConfigChange('clientSecret', e.target.value)}
                  placeholder="Enter client secret"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowSensitiveInfo(!showSensitiveInfo)}
                >
                  {showSensitiveInfo ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Token URL</Label>
              <Input
                value={formData.authConfig?.tokenUrl || ''}
                onChange={(e) => handleAuthConfigChange('tokenUrl', e.target.value)}
                placeholder="https://auth.example.com/oauth/token"
              />
            </div>
            <div className="space-y-2">
              <Label>Scope (optional)</Label>
              <Input
                value={formData.authConfig?.scope || ''}
                onChange={(e) => handleAuthConfigChange('scope', e.target.value)}
                placeholder="read write"
              />
            </div>
          </div>
        );

      default:
        return (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No authentication will be used for this connection.
            </AlertDescription>
          </Alert>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">
            {system ? 'Edit Platform Connection' : 'Add Platform Connection'}
          </h3>
          <p className="text-sm text-muted-foreground">
            Configure connection to external systems and platforms
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={!formData.systemName.trim() || !formData.displayName.trim() || !formData.baseUrl.trim()}
          >
            <Save className="w-4 h-4 mr-2" />
            Save Connection
          </Button>
        </div>
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="authentication">Authentication</TabsTrigger>
          <TabsTrigger value="headers">Headers</TabsTrigger>
          <TabsTrigger value="test">Test Connection</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                Platform Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="systemName">System Name *</Label>
                  <Input
                    id="systemName"
                    value={formData.systemName}
                    onChange={(e) => handleInputChange('systemName', e.target.value)}
                    placeholder="e.g., grafana-prod"
                  />
                  <p className="text-xs text-muted-foreground">
                    Unique identifier for this system
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="displayName">Display Name *</Label>
                  <Input
                    id="displayName"
                    value={formData.displayName}
                    onChange={(e) => handleInputChange('displayName', e.target.value)}
                    placeholder="e.g., Production Grafana"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="systemType">Platform Type</Label>
                <Select 
                  value={formData.systemType} 
                  onValueChange={(value) => handleInputChange('systemType', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select platform type" />
                  </SelectTrigger>
                  <SelectContent>
                    {platformTypes.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        <div>
                          <div className="font-medium">{type.label}</div>
                          <div className="text-xs text-muted-foreground">{type.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="baseUrl">Base URL *</Label>
                <Input
                  id="baseUrl"
                  value={formData.baseUrl}
                  onChange={(e) => handleInputChange('baseUrl', e.target.value)}
                  placeholder="https://grafana.example.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Describe this platform connection"
                  rows={3}
                />
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
                  {formData.tags?.map(tag => (
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

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => handleInputChange('isActive', e.target.checked)}
                />
                <Label htmlFor="isActive">Enable this connection</Label>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="authentication" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Authentication
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Authentication Type</Label>
                <Select 
                  value={formData.authType} 
                  onValueChange={(value) => handleInputChange('authType', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {authTypes.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {renderAuthConfig()}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="headers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5" />
                Custom Headers
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Headers (JSON)</Label>
                <Textarea
                  value={JSON.stringify(formData.headers, null, 2)}
                  onChange={(e) => {
                    try {
                      const parsed = JSON.parse(e.target.value);
                      handleInputChange('headers', parsed);
                    } catch {
                      // Invalid JSON, don't update
                    }
                  }}
                  placeholder='{"Content-Type": "application/json", "User-Agent": "MSSP-Client"}'
                  rows={6}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Additional headers to include with requests
                </p>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Custom headers will be included with all requests to this platform. 
                  Avoid including sensitive authentication data here - use the Authentication tab instead.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="test" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TestTube className="w-5 h-5" />
                Test Connection
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button 
                  onClick={handleTestConnection}
                  disabled={isTestingConnection || !formData.baseUrl.trim()}
                >
                  {isTestingConnection ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <TestTube className="w-4 h-4 mr-2" />
                  )}
                  Test Connection
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
                      Connection Test Results
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
                  Test the connection to ensure the platform is accessible with the provided configuration. 
                  This will attempt to make a basic request to verify connectivity and authentication.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 