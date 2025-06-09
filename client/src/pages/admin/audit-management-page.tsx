import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/app-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Shield, 
  Search, 
  Filter, 
  Download,
  Eye,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  User,
  Database,
  Activity,
  FileText,
  Calendar,
  MoreHorizontal
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';

interface AuditLog {
  id: number;
  userId: number;
  username?: string;
  userEmail?: string;
  action: string;
  resourceType: string;
  resourceId?: number;
  resourceName?: string;
  ipAddress: string;
  userAgent: string;
  timestamp: string;
  details?: any;
  status: 'success' | 'failure';
}

interface SecurityEvent {
  id: number;
  eventType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  ipAddress: string;
  userAgent: string;
  timestamp: string;
  userId?: number;
  resolved: boolean;
  metadata?: any;
}

interface DataAccessLog {
  id: number;
  userId: number;
  username?: string;
  accessType: 'read' | 'write' | 'delete';
  resourceType: string;
  resourceId?: number;
  ipAddress: string;
  timestamp: string;
  success: boolean;
}

interface ChangeHistoryEntry {
  id: number;
  userId: number;
  username?: string;
  resourceType: string;
  resourceId: number;
  action: 'create' | 'update' | 'delete';
  oldValues?: any;
  newValues?: any;
  timestamp: string;
}

export default function AuditManagementPage() {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  
  const [activeTab, setActiveTab] = useState('audit-logs');
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('7d');

  // Check if user has admin privileges
  const isAdmin = currentUser?.role === 'admin';

  // Only allow admin access
  if (!isAdmin) {
    return (
      <AppLayout title="Access Denied" subtitle="Insufficient permissions">
        <div className="flex items-center justify-center h-full">
          <Alert className="max-w-md">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              You do not have permission to access this page. Only administrators can view audit logs.
            </AlertDescription>
          </Alert>
        </div>
      </AppLayout>
    );
  }

  const { data: auditLogs = [], isLoading: loadingAuditLogs } = useQuery<AuditLog[]>({
    queryKey: ['/api/audit-logs', { dateRange, actionFilter, searchTerm }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateRange !== 'all') params.append('dateRange', dateRange);
      if (actionFilter !== 'all') params.append('actionFilter', actionFilter);
      if (searchTerm) params.append('searchTerm', searchTerm);
      
      const res = await fetch(`/api/audit-logs?${params.toString()}`, {
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Failed to fetch audit logs');
      return res.json();
    },
    enabled: isAdmin && activeTab === 'audit-logs',
  });

  const { data: securityEvents = [], isLoading: loadingSecurityEvents } = useQuery<SecurityEvent[]>({
    queryKey: ['/api/security-events', { dateRange, severityFilter, searchTerm }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateRange !== 'all') params.append('dateRange', dateRange);
      if (severityFilter !== 'all') params.append('severityFilter', severityFilter);
      if (searchTerm) params.append('searchTerm', searchTerm);
      
      const res = await fetch(`/api/security-events?${params.toString()}`, {
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Failed to fetch security events');
      return res.json();
    },
    enabled: isAdmin && activeTab === 'security-events',
  });

  const { data: dataAccessLogs = [], isLoading: loadingDataAccess } = useQuery<DataAccessLog[]>({
    queryKey: ['/api/data-access-logs', { dateRange, searchTerm }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateRange !== 'all') params.append('dateRange', dateRange);
      if (searchTerm) params.append('searchTerm', searchTerm);
      
      const res = await fetch(`/api/data-access-logs?${params.toString()}`, {
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Failed to fetch data access logs');
      return res.json();
    },
    enabled: isAdmin && activeTab === 'data-access',
  });

  const { data: changeHistory = [], isLoading: loadingChangeHistory } = useQuery<ChangeHistoryEntry[]>({
    queryKey: ['/api/change-history', { dateRange, searchTerm }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateRange !== 'all') params.append('dateRange', dateRange);
      if (searchTerm) params.append('searchTerm', searchTerm);
      
      const res = await fetch(`/api/change-history?${params.toString()}`, {
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Failed to fetch change history');
      return res.json();
    },
    enabled: isAdmin && activeTab === 'change-history',
  });

  const getActionBadgeColor = (action: string) => {
    switch (action.toLowerCase()) {
      case 'create': return 'bg-green-100 text-green-800';
      case 'update': return 'bg-blue-100 text-blue-800';
      case 'delete': return 'bg-red-100 text-red-800';
      case 'login': return 'bg-purple-100 text-purple-800';
      case 'logout': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSeverityBadgeColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: boolean | string) => {
    if (status === true || status === 'success') {
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    }
    return <XCircle className="h-4 w-4 text-red-600" />;
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const exportLogs = (type: string) => {
    let data: any[] = [];
    let filename = '';
    
    switch (type) {
      case 'audit-logs':
        data = auditLogs;
        filename = 'audit-logs';
        break;
      case 'security-events':
        data = securityEvents;
        filename = 'security-events';
        break;
      case 'data-access':
        data = dataAccessLogs;
        filename = 'data-access-logs';
        break;
      case 'change-history':
        data = changeHistory;
        filename = 'change-history';
        break;
    }

    const csvContent = [
      Object.keys(data[0] || {}).join(','),
      ...data.map(row => Object.values(row).map(value => 
        typeof value === 'string' && value.includes(',') ? `"${value}"` : value
      ).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({ title: 'Success', description: 'Logs exported successfully' });
  };

  return (
    <AppLayout title="Audit Management" subtitle="System audit logs and security monitoring">
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <FileText className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium">Audit Logs</p>
                  <p className="text-2xl font-bold">{auditLogs.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Shield className="h-5 w-5 text-red-600" />
                <div>
                  <p className="text-sm font-medium">Security Events</p>
                  <p className="text-2xl font-bold">{securityEvents.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Database className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium">Data Access</p>
                  <p className="text-2xl font-bold">{dataAccessLogs.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Activity className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="text-sm font-medium">Changes</p>
                  <p className="text-2xl font-bold">{changeHistory.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Audit & Security Monitoring
              </CardTitle>
              
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search logs..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 w-full sm:w-64"
                  />
                </div>
                
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger className="w-full sm:w-32">
                    <Calendar className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1d">Last Day</SelectItem>
                    <SelectItem value="7d">Last Week</SelectItem>
                    <SelectItem value="30d">Last Month</SelectItem>
                    <SelectItem value="90d">Last 3 Months</SelectItem>
                  </SelectContent>
                </Select>

                <Button 
                  variant="outline" 
                  onClick={() => exportLogs(activeTab)}
                  className="whitespace-nowrap"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>
          </CardHeader>
          
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="audit-logs">Audit Logs</TabsTrigger>
                <TabsTrigger value="security-events">Security Events</TabsTrigger>
                <TabsTrigger value="data-access">Data Access</TabsTrigger>
                <TabsTrigger value="change-history">Change History</TabsTrigger>
              </TabsList>

              {/* Audit Logs Tab */}
              <TabsContent value="audit-logs" className="space-y-4">
                <div className="flex gap-2">
                  <Select value={actionFilter} onValueChange={setActionFilter}>
                    <SelectTrigger className="w-40">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Action" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Actions</SelectItem>
                      <SelectItem value="create">Create</SelectItem>
                      <SelectItem value="update">Update</SelectItem>
                      <SelectItem value="delete">Delete</SelectItem>
                      <SelectItem value="login">Login</SelectItem>
                      <SelectItem value="logout">Logout</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Timestamp</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Resource</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>IP Address</TableHead>
                        <TableHead>Details</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loadingAuditLogs ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                          </TableCell>
                        </TableRow>
                      ) : auditLogs.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                            No audit logs found
                          </TableCell>
                        </TableRow>
                      ) : (
                        auditLogs.map((log) => (
                          <TableRow key={log.id}>
                            <TableCell className="font-mono text-sm">
                              {formatTimestamp(log.timestamp)}
                            </TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium">{log.username || 'Unknown'}</div>
                                <div className="text-sm text-gray-500">{log.userEmail}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={getActionBadgeColor(log.action)}>
                                {log.action}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium">{log.resourceType}</div>
                                {log.resourceName && (
                                  <div className="text-sm text-gray-500">{log.resourceName}</div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {getStatusIcon(log.status)}
                                <span className={log.status === 'success' ? 'text-green-600' : 'text-red-600'}>
                                  {log.status}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              {log.ipAddress}
                            </TableCell>
                            <TableCell>
                              {log.details && (
                                <Button variant="outline" size="sm">
                                  <Eye className="h-4 w-4" />
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              {/* Security Events Tab */}
              <TabsContent value="security-events" className="space-y-4">
                <div className="flex gap-2">
                  <Select value={severityFilter} onValueChange={setSeverityFilter}>
                    <SelectTrigger className="w-40">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Severity" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Severities</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Timestamp</TableHead>
                        <TableHead>Event Type</TableHead>
                        <TableHead>Severity</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>IP Address</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loadingSecurityEvents ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                          </TableCell>
                        </TableRow>
                      ) : securityEvents.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                            No security events found
                          </TableCell>
                        </TableRow>
                      ) : (
                        securityEvents.map((event) => (
                          <TableRow key={event.id}>
                            <TableCell className="font-mono text-sm">
                              {formatTimestamp(event.timestamp)}
                            </TableCell>
                            <TableCell className="font-medium">{event.eventType}</TableCell>
                            <TableCell>
                              <Badge className={getSeverityBadgeColor(event.severity)}>
                                {event.severity}
                              </Badge>
                            </TableCell>
                            <TableCell>{event.description}</TableCell>
                            <TableCell className="font-mono text-sm">{event.ipAddress}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {event.resolved ? (
                                  <CheckCircle className="h-4 w-4 text-green-600" />
                                ) : (
                                  <Clock className="h-4 w-4 text-yellow-600" />
                                )}
                                <span className={event.resolved ? 'text-green-600' : 'text-yellow-600'}>
                                  {event.resolved ? 'Resolved' : 'Open'}
                                </span>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              {/* Data Access Tab */}
              <TabsContent value="data-access" className="space-y-4">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Timestamp</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Access Type</TableHead>
                        <TableHead>Resource</TableHead>
                        <TableHead>IP Address</TableHead>
                        <TableHead>Success</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loadingDataAccess ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                          </TableCell>
                        </TableRow>
                      ) : dataAccessLogs.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                            No data access logs found
                          </TableCell>
                        </TableRow>
                      ) : (
                        dataAccessLogs.map((log) => (
                          <TableRow key={log.id}>
                            <TableCell className="font-mono text-sm">
                              {formatTimestamp(log.timestamp)}
                            </TableCell>
                            <TableCell>{log.username || 'Unknown'}</TableCell>
                            <TableCell>
                              <Badge className={getActionBadgeColor(log.accessType)}>
                                {log.accessType}
                              </Badge>
                            </TableCell>
                            <TableCell>{log.resourceType}</TableCell>
                            <TableCell className="font-mono text-sm">{log.ipAddress}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {getStatusIcon(log.success)}
                                <span className={log.success ? 'text-green-600' : 'text-red-600'}>
                                  {log.success ? 'Success' : 'Failed'}
                                </span>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              {/* Change History Tab */}
              <TabsContent value="change-history" className="space-y-4">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Timestamp</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Resource</TableHead>
                        <TableHead>Changes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loadingChangeHistory ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                          </TableCell>
                        </TableRow>
                      ) : changeHistory.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                            No change history found
                          </TableCell>
                        </TableRow>
                      ) : (
                        changeHistory.map((entry) => (
                          <TableRow key={entry.id}>
                            <TableCell className="font-mono text-sm">
                              {formatTimestamp(entry.timestamp)}
                            </TableCell>
                            <TableCell>{entry.username || 'Unknown'}</TableCell>
                            <TableCell>
                              <Badge className={getActionBadgeColor(entry.action)}>
                                {entry.action}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium">{entry.resourceType}</div>
                                <div className="text-sm text-gray-500">ID: {entry.resourceId}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Button variant="outline" size="sm">
                                <Eye className="h-4 w-4 mr-2" />
                                View Changes
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
} 