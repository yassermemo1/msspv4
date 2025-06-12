import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Edit, Trash2, ExternalLink, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ClientExternalMapping {
  id: number;
  clientId: number;
  systemName: string;
  externalIdentifier: string;
  metadata: any;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ExternalSystem {
  id: number;
  systemName: string;
  displayName: string;
  baseUrl: string;
  authType: string;
  isActive: boolean;
}

interface AggregatedData {
  last_updated: string;
  data: Record<string, {
    status: 'success' | 'error';
    data?: any;
    error_message?: string;
    link?: string;
  }>;
}

interface ClientExternalMappingsProps {
  clientId: number;
}

export function ClientExternalMappings({ clientId }: ClientExternalMappingsProps) {
  const { toast } = useToast();
  const [mappings, setMappings] = useState<ClientExternalMapping[]>([]);
  const [systems, setSystems] = useState<ExternalSystem[]>([]);
  const [aggregatedData, setAggregatedData] = useState<AggregatedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingMapping, setEditingMapping] = useState<ClientExternalMapping | null>(null);
  const [formData, setFormData] = useState({
    systemName: '',
    externalIdentifier: '',
    metadata: '{}'
  });

  useEffect(() => {
    fetchMappings();
    fetchSystems();
    fetchAggregatedData();
  }, [clientId]);

  const fetchMappings = async () => {
    try {
      const response = await fetch(`/api/clients/${clientId}/external-mappings`);
      if (!response.ok) throw new Error('Failed to fetch mappings');
      
      const data = await response.json();
      setMappings(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load external mappings",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchSystems = async () => {
    try {
      const response = await fetch('/api/external-systems');
      if (!response.ok) throw new Error('Failed to fetch systems');
      
      const data = await response.json();
      setSystems(data.filter((s: ExternalSystem) => s.isActive));
    } catch (error) {
      console.error('Failed to fetch systems:', error);
    }
  };

  const fetchAggregatedData = async () => {
    setLoadingData(true);
    try {
      const response = await fetch(`/api/clients/${clientId}/aggregated-data`);
      if (!response.ok) throw new Error('Failed to fetch aggregated data');
      
      const data = await response.json();
      setAggregatedData(data);
    } catch (error) {
      console.error('Failed to fetch aggregated data:', error);
      setAggregatedData(null);
    } finally {
      setLoadingData(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      let metadata;
      
      try {
        metadata = JSON.parse(formData.metadata);
      } catch (error) {
        toast({
          title: "Error",
          description: "Invalid JSON in metadata field",
          variant: "destructive"
        });
        return;
      }

      const mappingData = {
        ...formData,
        metadata
      };

      const url = editingMapping 
        ? `/api/external-mappings/${editingMapping.id}`
        : `/api/clients/${clientId}/external-mappings`;
      
      const method = editingMapping ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(mappingData),
      });

      if (!response.ok) throw new Error('Failed to save mapping');

      toast({
        title: "Success",
        description: `External mapping ${editingMapping ? 'updated' : 'created'} successfully`,
      });

      setShowCreateModal(false);
      setEditingMapping(null);
      resetForm();
      fetchMappings();
      fetchAggregatedData(); // Refresh aggregated data
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save external mapping",
        variant: "destructive"
      });
    }
  };

  const handleEdit = (mapping: ClientExternalMapping) => {
    setEditingMapping(mapping);
    setFormData({
      systemName: mapping.systemName,
      externalIdentifier: mapping.externalIdentifier,
      metadata: JSON.stringify(mapping.metadata || {}, null, 2)
    });
    setShowCreateModal(true);
  };

  const handleDelete = async (mappingId: number) => {
    if (!confirm('Are you sure you want to delete this external mapping?')) {
      return;
    }

    try {
      const response = await fetch(`/api/external-mappings/${mappingId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete mapping');

      toast({
        title: "Success",
        description: "External mapping deleted successfully",
      });

      fetchMappings();
      fetchAggregatedData(); // Refresh aggregated data
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete external mapping",
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setFormData({
      systemName: '',
      externalIdentifier: '',
      metadata: '{}'
    });
  };

  const getMetadataPlaceholder = (systemName: string) => {
    switch (systemName.toLowerCase()) {
      case 'jira':
        return `{
  "customJql": "project = '${formData.externalIdentifier}' AND status != Done",
  "maxResults": 100,
  "fields": "key,summary,status,assignee,priority,created,updated"
}`;
      case 'grafana':
        return `{
  "dashboardUid": "dashboard-uid",
  "panels": ["panel1", "panel2"],
  "timeRange": "24h"
}`;
      case 'servicenow':
        return `{
  "table": "incident",
  "query": "company=${formData.externalIdentifier}",
  "fields": "number,short_description,state,priority"
}`;
      default:
        return `{
  "customConfig": "value",
  "additionalParams": {}
}`;
    }
  };

  const getMetadataDescription = (systemName: string) => {
    switch (systemName.toLowerCase()) {
      case 'jira':
        return 'Configure JQL query, fields to fetch, and result limits for Jira data retrieval';
      case 'grafana':
        return 'Specify dashboard UID, panels, and time ranges for Grafana metrics';
      case 'servicenow':
        return 'Define table, query parameters, and fields for ServiceNow data';
      default:
        return 'JSON configuration for this external system mapping';
    }
  };

  const insertJqlTemplate = (templateType: string) => {
    const projectKey = formData.externalIdentifier;
    let jqlTemplate = '';
    
    switch (templateType) {
      case 'all_open':
        jqlTemplate = `project = '${projectKey}' AND status != Done`;
        break;
      case 'high_priority':
        jqlTemplate = `project = '${projectKey}' AND priority in (High, Highest)`;
        break;
      case 'recent_updates':
        jqlTemplate = `project = '${projectKey}' AND updated >= -7d`;
        break;
    }
    
    const newMetadata = {
      customJql: jqlTemplate,
      maxResults: 100,
      fields: "key,summary,status,assignee,priority,created,updated"
    };
    
    setFormData({
      ...formData,
      metadata: JSON.stringify(newMetadata, null, 2)
    });
  };

  const testConnection = async () => {
    if (!formData.systemName || !formData.externalIdentifier) {
      toast({
        title: "Error",
        description: "Please select a system and enter an external identifier first",
        variant: "destructive"
      });
      return;
    }

    setTestingConnection(true);
    
    try {
      // Find the system ID
      const system = systems.find(s => s.systemName === formData.systemName);
      if (!system) {
        throw new Error('System not found');
      }

      // Parse metadata for test configuration
      let testConfig = {};
      try {
        const metadata = JSON.parse(formData.metadata);
        testConfig = {
          testJql: metadata.customJql,
          testEndpoint: metadata.testEndpoint,
          ...metadata
        };
      } catch (error) {
        // Use basic test if metadata is invalid
        if (formData.systemName.toLowerCase() === 'jira') {
          testConfig = {
            testJql: `project = '${formData.externalIdentifier}' AND status != Done`
          };
        }
      }

      const response = await fetch(`/api/external-systems/${system.id}/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testConfig),
      });

      if (!response.ok) throw new Error('Test failed');

      const result = await response.json();
      
      if (result.status === 'success') {
        toast({
          title: "Connection Test Successful! ✅",
          description: `Response time: ${result.data.response_time || 'N/A'}. ${
            result.data.jql_test ? `JQL returned ${result.data.jql_test.totalResults} results.` : ''
          }`,
        });
      } else {
        throw new Error(result.error_message || 'Test failed');
      }
    } catch (error) {
      toast({
        title: "Connection Test Failed ❌",
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: "destructive"
      });
    } finally {
      setTestingConnection(false);
    }
  };

  const getSystemDisplayName = (systemName: string) => {
    const system = systems.find(s => s.systemName === systemName);
    return system?.displayName || systemName;
  };

  const renderAggregatedDataCard = (systemName: string, data: any) => {
    const systemData = data.data[systemName];
    const isSuccess = systemData?.status === 'success';
    
    return (
      <Card key={systemName} className="mb-4">
        <CardHeader className="pb-3">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg">{getSystemDisplayName(systemName)}</CardTitle>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-1 rounded-full text-xs ${
                isSuccess ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {systemData?.status || 'unknown'}
              </span>
              {systemData?.link && (
                <Button variant="outline" size="sm" asChild>
                  <a href={systemData.link} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {isSuccess ? (
            <div className="space-y-2">
              {systemData.data && typeof systemData.data === 'object' && Object.entries(systemData.data).map(([key, value]) => (
                <div key={key} className="flex justify-between">
                  <span className="font-medium capitalize">{key.replace(/_/g, ' ')}:</span>
                  <span>{String(value)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-red-600">{systemData?.error_message || 'Unknown error'}</p>
          )}
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return <div className="flex justify-center p-8">Loading external mappings...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Aggregated Data Section */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">External Data Overview</h3>
            <p className="text-gray-600">Real-time data from connected external systems</p>
          </div>
          <Button 
            variant="outline" 
            onClick={fetchAggregatedData}
            disabled={loadingData}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loadingData ? 'animate-spin' : ''}`} />
            Refresh Data
          </Button>
        </div>

        {loadingData ? (
          <Card>
            <CardContent className="p-8 text-center">
              <RefreshCw className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Loading external data...</p>
            </CardContent>
          </Card>
        ) : aggregatedData && aggregatedData.data && typeof aggregatedData.data === 'object' && Object.keys(aggregatedData.data).length > 0 ? (
          <div>
            {Object.keys(aggregatedData.data).map(systemName => 
              renderAggregatedDataCard(systemName, aggregatedData)
            )}
            <p className="text-xs text-gray-500 mt-2">
              Last updated: {new Date(aggregatedData.last_updated).toLocaleString()}
            </p>
          </div>
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <ExternalLink className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No External Data</h3>
              <p className="text-gray-600">
                Configure external system mappings to see aggregated data here
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Mappings Management Section */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">External System Mappings</h3>
            <p className="text-gray-600">Configure how this client maps to external systems</p>
          </div>
          
          <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
            <DialogTrigger asChild>
              <Button onClick={() => { resetForm(); setEditingMapping(null); }}>
                <Plus className="h-4 w-4 mr-2" />
                Add Mapping
              </Button>
            </DialogTrigger>
            
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden">
              <DialogHeader>
                <DialogTitle>
                  {editingMapping ? 'Edit External Mapping' : 'Add External Mapping'}
                </DialogTitle>
                <DialogDescription>
                  Map this client to an external system identifier
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="systemName">External System</Label>
                  <Select value={formData.systemName} onValueChange={(value) => setFormData({ ...formData, systemName: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a system" />
                    </SelectTrigger>
                    <SelectContent>
                      {systems.map((system) => (
                        <SelectItem key={system.id} value={system.systemName}>
                          {system.displayName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="externalIdentifier">External Identifier</Label>
                  <Input
                    id="externalIdentifier"
                    value={formData.externalIdentifier}
                    onChange={(e) => setFormData({ ...formData, externalIdentifier: e.target.value })}
                    placeholder="Project key, dashboard UID, company name, etc."
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="metadata">Configuration (JSON)</Label>
                  <Textarea
                    id="metadata"
                    value={formData.metadata}
                    onChange={(e) => setFormData({ ...formData, metadata: e.target.value })}
                    placeholder={getMetadataPlaceholder(formData.systemName)}
                    rows={6}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {getMetadataDescription(formData.systemName)}
                  </p>
                </div>
                
                {/* JQL Helper for Jira systems */}
                {formData.systemName.toLowerCase() === 'jira' && (
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <h4 className="font-medium text-blue-900 mb-2">Jira JQL Configuration Examples:</h4>
                    <div className="text-sm text-blue-700 space-y-1">
                      <p><strong>Custom JQL:</strong> "project = ACME AND status != Done"</p>
                      <p><strong>High Priority Issues:</strong> "project = ACME AND priority in (High, Highest)"</p>
                      <p><strong>Recent Updates:</strong> "project = ACME AND updated &gt;= -7d"</p>
                      <p><strong>Assigned Issues:</strong> "project = ACME AND assignee = currentUser()"</p>
                    </div>
                    <div className="mt-3">
                      <Label className="text-blue-900">Quick JQL Templates:</Label>
                      <div className="flex flex-wrap gap-2 mt-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => insertJqlTemplate('all_open')}
                          className="text-xs"
                        >
                          All Open Issues
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => insertJqlTemplate('high_priority')}
                          className="text-xs"
                        >
                          High Priority
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => insertJqlTemplate('recent_updates')}
                          className="text-xs"
                        >
                          Recent Updates
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Test Connection Button */}
                {formData.systemName && formData.externalIdentifier && (
                  <div className="flex justify-center">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={testConnection}
                      disabled={testingConnection}
                      className="w-full"
                    >
                      {testingConnection ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Testing Connection...
                        </>
                      ) : (
                        <>
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Test Connection & JQL
                        </>
                      )}
                    </Button>
                  </div>
                )}
                
                <div className="flex justify-end space-x-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingMapping ? 'Update' : 'Create'} Mapping
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4">
          {mappings.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <ExternalLink className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No External Mappings</h3>
                <p className="text-gray-600 mb-4">
                  Add external system mappings to enable data aggregation for this client
                </p>
                <Button onClick={() => setShowCreateModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Mapping
                </Button>
              </CardContent>
            </Card>
          ) : (
            mappings.map((mapping) => (
              <Card key={mapping.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-base">{getSystemDisplayName(mapping.systemName)}</CardTitle>
                      <CardDescription>{mapping.externalIdentifier}</CardDescription>
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm" onClick={() => handleEdit(mapping)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDelete(mapping.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                
                {mapping.metadata && typeof mapping.metadata === 'object' && Object.keys(mapping.metadata).length > 0 && (
                  <CardContent>
                    <div className="text-sm">
                      <span className="font-medium">Metadata:</span>
                      <pre className="mt-1 text-xs bg-gray-50 p-2 rounded">
                        {JSON.stringify(mapping.metadata, null, 2)}
                      </pre>
                    </div>
                  </CardContent>
                )}
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
} 