import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Eye, EyeOff, Database, Key, Lock, Globe } from 'lucide-react';

interface SystemConfigDialogProps {
  systemForm: {
    systemName: string;
    displayName: string;
    baseUrl: string;
    authType: string;
    authConfig: string;
    apiEndpoints: string;
    basicUsername: string;
    basicPassword: string;
    bearerToken: string;
    apiKeyHeader: string;
    apiKeyValue: string;
  };
  setSystemForm: (form: any) => void;
  onSave: () => void;
  onCancel: () => void;
  editingSystem: any;
  loading?: boolean;
}

export function SystemConfigDialog({ 
  systemForm, 
  setSystemForm, 
  onSave, 
  onCancel, 
  editingSystem,
  loading = false 
}: SystemConfigDialogProps) {
  const [showPasswords, setShowPasswords] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState('basic');

  const authTypes = [
    { value: 'none', label: 'No Authentication', icon: Globe, color: 'gray' },
    { value: 'basic', label: 'Basic Authentication', icon: Lock, color: 'blue' },
    { value: 'bearer', label: 'Bearer Token', icon: Key, color: 'green' },
    { value: 'api_key', label: 'API Key', icon: Database, color: 'orange' }
  ];

  const systemTemplates = [
    {
      name: 'jira',
      displayName: 'Jira',
      endpoints: {
        projects: '/rest/api/2/project',
        issues: '/rest/api/2/search',
        issue: '/rest/api/2/issue/{issueIdOrKey}',
        create_issue: '/rest/api/2/issue',
        update_issue: '/rest/api/2/issue/{issueIdOrKey}'
      }
    },
    {
      name: 'servicenow',
      displayName: 'ServiceNow',
      endpoints: {
        incidents: '/api/now/table/incident',
        users: '/api/now/table/sys_user',
        groups: '/api/now/table/sys_user_group',
        catalog_items: '/api/now/table/sc_cat_item'
      }
    },
    {
      name: 'azure_devops',
      displayName: 'Azure DevOps',
      endpoints: {
        projects: '/_apis/projects',
        work_items: '/_apis/wit/workitems',
        queries: '/_apis/wit/queries',
        builds: '/_apis/build/builds'
      }
    },
    {
      name: 'slack',
      displayName: 'Slack',
      endpoints: {
        channels: '/api/conversations.list',
        messages: '/api/conversations.history',
        users: '/api/users.list',
        post_message: '/api/chat.postMessage'
      }
    }
  ];

  const applyTemplate = (template: typeof systemTemplates[0]) => {
    setSystemForm({
      ...systemForm,
      systemName: template.name,
      displayName: template.displayName,
      apiEndpoints: JSON.stringify(template.endpoints, null, 2)
    });
  };

  const validateForm = () => {
    return systemForm.systemName && systemForm.displayName && systemForm.baseUrl;
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="basic">Basic Info</TabsTrigger>
          <TabsTrigger value="auth">Authentication</TabsTrigger>
          <TabsTrigger value="endpoints">API Endpoints</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-4">
          {/* System Templates */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Quick Setup Templates</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                {systemTemplates.map(template => (
                  <Button
                    key={template.name}
                    variant="outline"
                    size="sm"
                    onClick={() => applyTemplate(template)}
                    className="justify-start"
                  >
                    {template.displayName}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Basic Configuration */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="systemName">System Name *</Label>
              <Input
                id="systemName"
                value={systemForm.systemName}
                onChange={(e) => setSystemForm({ ...systemForm, systemName: e.target.value })}
                placeholder="e.g., jira, servicenow"
                className="lowercase"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name *</Label>
              <Input
                id="displayName"
                value={systemForm.displayName}
                onChange={(e) => setSystemForm({ ...systemForm, displayName: e.target.value })}
                placeholder="e.g., Company Jira"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="baseUrl">Base URL *</Label>
            <Input
              id="baseUrl"
              value={systemForm.baseUrl}
              onChange={(e) => setSystemForm({ ...systemForm, baseUrl: e.target.value })}
              placeholder="https://yourcompany.atlassian.net"
            />
          </div>
        </TabsContent>

        <TabsContent value="auth" className="space-y-4">
          {/* Authentication Type */}
          <div className="space-y-3">
            <Label>Authentication Type</Label>
            <div className="grid grid-cols-2 gap-3">
              {authTypes.map(auth => {
                const Icon = auth.icon;
                return (
                  <Card
                    key={auth.value}
                    className={`cursor-pointer transition-all ${
                      systemForm.authType === auth.value 
                        ? 'ring-2 ring-blue-500 bg-blue-50' 
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => setSystemForm({ ...systemForm, authType: auth.value })}
                  >
                    <CardContent className="p-4 text-center">
                      <Icon className={`h-8 w-8 mx-auto mb-2 text-${auth.color}-500`} />
                      <div className="font-medium">{auth.label}</div>
                      <Badge variant={systemForm.authType === auth.value ? "default" : "outline"} className="mt-2">
                        {systemForm.authType === auth.value ? 'Selected' : 'Available'}
                      </Badge>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Authentication Configuration */}
          {systemForm.authType === 'basic' && (
            <div className="space-y-4 p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-900">Basic Authentication</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="basicUsername">Username</Label>
                  <Input
                    id="basicUsername"
                    value={systemForm.basicUsername}
                    onChange={(e) => setSystemForm({ ...systemForm, basicUsername: e.target.value })}
                    placeholder="Enter username"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="basicPassword">Password</Label>
                  <div className="relative">
                    <Input
                      id="basicPassword"
                      type={showPasswords ? "text" : "password"}
                      value={systemForm.basicPassword}
                      onChange={(e) => setSystemForm({ ...systemForm, basicPassword: e.target.value })}
                      placeholder="Enter password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowPasswords(!showPasswords)}
                    >
                      {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {systemForm.authType === 'bearer' && (
            <div className="space-y-4 p-4 bg-green-50 rounded-lg">
              <h4 className="font-medium text-green-900">Bearer Token Authentication</h4>
              <div className="space-y-2">
                <Label htmlFor="bearerToken">Bearer Token</Label>
                <div className="relative">
                  <Textarea
                    id="bearerToken"
                    value={systemForm.bearerToken}
                    onChange={(e) => setSystemForm({ ...systemForm, bearerToken: e.target.value })}
                    placeholder="Enter bearer token"
                    className="min-h-[100px]"
                  />
                </div>
              </div>
            </div>
          )}

          {systemForm.authType === 'api_key' && (
            <div className="space-y-4 p-4 bg-orange-50 rounded-lg">
              <h4 className="font-medium text-orange-900">API Key Authentication</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="apiKeyHeader">Header Name</Label>
                  <Input
                    id="apiKeyHeader"
                    value={systemForm.apiKeyHeader}
                    onChange={(e) => setSystemForm({ ...systemForm, apiKeyHeader: e.target.value })}
                    placeholder="X-API-Key"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="apiKeyValue">API Key</Label>
                  <div className="relative">
                    <Input
                      id="apiKeyValue"
                      type={showPasswords ? "text" : "password"}
                      value={systemForm.apiKeyValue}
                      onChange={(e) => setSystemForm({ ...systemForm, apiKeyValue: e.target.value })}
                      placeholder="Enter API key"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowPasswords(!showPasswords)}
                    >
                      {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {systemForm.authType === 'none' && (
            <div className="p-4 bg-gray-50 rounded-lg text-center">
              <Globe className="h-12 w-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600">No authentication required for this system</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="endpoints" className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="apiEndpoints">API Endpoints Configuration</Label>
            <Textarea
              id="apiEndpoints"
              value={systemForm.apiEndpoints}
              onChange={(e) => setSystemForm({ ...systemForm, apiEndpoints: e.target.value })}
              placeholder={`{
  "users": "/api/users",
  "projects": "/api/projects",
  "tickets": "/api/tickets"
}`}
              className="min-h-[200px] font-mono text-sm"
            />
            <p className="text-sm text-gray-600">
              Define API endpoints as JSON. These will be available for widget configuration.
            </p>
          </div>

          {/* Endpoint Examples */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Common Endpoint Patterns</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div><strong>List Resources:</strong> <code>/api/resource</code></div>
              <div><strong>Get Resource:</strong> <code>/api/resource/{`{id}`}</code></div>
              <div><strong>Search:</strong> <code>/api/search?q={`{query}`}</code></div>
              <div><strong>Paginated:</strong> <code>/api/resource?page={`{page}`}&limit={`{limit}`}</code></div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-2 pt-4 border-t">
        <Button variant="outline" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button 
          onClick={onSave} 
          disabled={!validateForm() || loading}
          className="min-w-[100px]"
        >
          {loading ? 'Saving...' : editingSystem ? 'Update System' : 'Create System'}
        </Button>
      </div>
    </div>
  );
} 