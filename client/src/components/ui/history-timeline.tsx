import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';
import { cn } from '@/lib/utils';
import {
  History,
  User,
  Clock,
  Shield,
  Eye,
  Edit,
  Trash2,
  Plus,
  FileText,
  Monitor,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RotateCcw,
  Calendar,
  Filter,
  Search,
  Download,
  Upload,
  Key,
  Settings,
  Database,
  Globe,
  RefreshCw,
  Info,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

// Types
interface ChangeHistoryItem {
  id: number;
  entity_type: string;
  entity_id: number;
  entity_name: string;
  user_id: number;
  user_name: string;
  user_role: string;
  action: string;
  field_name?: string;
  old_value?: string;
  new_value?: string;
  change_reason?: string;
  automatic_change: boolean;
  batch_id?: string;
  rollback_data?: any;
  ip_address?: string;
  user_agent?: string;
  timestamp: Date;
}

interface AuditLogItem {
  id: number;
  user_id?: number;
  user_name?: string;
  user_role?: string;
  session_id?: string;
  action: string;
  entity_type: string;
  entity_id?: number;
  entity_name?: string;
  description: string;
  ip_address?: string;
  user_agent?: string;
  severity: string;
  category: string;
  metadata?: any;
  timestamp: Date;
}

interface SecurityEventItem {
  id: number;
  user_id?: number;
  user_name?: string;
  event_type: string;
  source: string;
  ip_address: string;
  user_agent?: string;
  location?: string;
  success: boolean;
  failure_reason?: string;
  risk_score?: number;
  blocked: boolean;
  timestamp: Date;
}

interface DataAccessItem {
  id: number;
  user_id: number;
  user_name: string;
  user_role: string;
  entity_type: string;
  entity_id?: number;
  entity_name?: string;
  access_type: string;
  access_method: string;
  data_scope: string;
  result_count: number;
  sensitive_data: boolean;
  purpose?: string;
  session_duration?: number;
  timestamp: Date;
}

interface HistoryTimelineProps {
  entity_type?: string;
  entity_id?: number;
  entity_name?: string;
  className?: string;
}

// Action icons mapping
const ACTION_ICONS = {
  create: Plus,
  update: Edit,
  delete: Trash2,
  view: Eye,
  login: User,
  logout: User,
  export: Download,
  import: Upload,
  grant_permission: Key,
  revoke_permission: Key,
  default: FileText,
};

// Severity colors
const SEVERITY_COLORS = {
  info: 'bg-blue-100 text-blue-800',
  low: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800',
};

// Category colors
const CATEGORY_COLORS = {
  authentication: 'bg-purple-100 text-purple-800',
  data_access: 'bg-blue-100 text-blue-800',
  data_modification: 'bg-orange-100 text-orange-800',
  security: 'bg-red-100 text-red-800',
  compliance: 'bg-green-100 text-green-800',
  system: 'bg-gray-100 text-gray-800',
};

export function HistoryTimeline({ entity_type, entity_id, entity_name, className }: HistoryTimelineProps) {
  const [activeTab, setActiveTab] = useState('changes');
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [timeFilter, setTimeFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');
  const [userFilter, setUserFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedBatches, setExpandedBatches] = useState<Set<string>>(new Set());

  const queryClient = useQueryClient();

  // Build query parameters
  const getQueryParams = () => {
    const params = new URLSearchParams();
    if (entity_type) params.append('entityType', entity_type);
    if (entity_id) params.append('entityId', entity_id.toString());
    if (timeFilter !== 'all') params.append('timeFilter', timeFilter);
    if (actionFilter !== 'all') params.append('actionFilter', actionFilter);
    if (userFilter !== 'all') params.append('userFilter', userFilter);
    if (searchQuery) params.append('search', searchQuery);
    return params.toString();
  };

  // Fetch change history
  const { data: changeHistory = [], isLoading: isLoadingChanges } = useQuery<ChangeHistoryItem[]>({
    queryKey: ['/api/audit/change-history', getQueryParams()],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/audit/change-history?${getQueryParams()}`);
      return res.json();
    },
  });

  // Fetch audit logs
  const { data: auditLogs = [], isLoading: isLoadingAudit } = useQuery<AuditLogItem[]>({
    queryKey: ['/api/audit/logs', getQueryParams()],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/audit/logs?${getQueryParams()}`);
      return res.json();
    },
  });

  // Fetch security events
  const { data: securityEvents = [], isLoading: isLoadingSecurity } = useQuery<SecurityEventItem[]>({
    queryKey: ['/api/audit/security-events', getQueryParams()],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/audit/security-events?${getQueryParams()}`);
      return res.json();
    },
  });

  // Fetch data access logs
  const { data: dataAccess = [], isLoading: isLoadingAccess } = useQuery<DataAccessItem[]>({
    queryKey: ['/api/audit/data-access', getQueryParams()],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/audit/data-access?${getQueryParams()}`);
      return res.json();
    },
  });

  // Rollback mutation
  const rollbackMutation = useMutation({
    mutationFn: async (changeId: number) => {
      const res = await apiRequest('POST', `/api/audit/rollback/${changeId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/audit/change-history'] });
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] }); // Refresh client data
    },
  });

  // Group changes by batch
  const groupedChanges = React.useMemo(() => {
    // Add null/undefined check for changeHistory
    if (!changeHistory || !Array.isArray(changeHistory)) {
      return [];
    }
    
    const groups: { [key: string]: ChangeHistoryItem[] } = {};
    
    changeHistory.forEach(change => {
      const key = change.batch_id || `single_${change.id}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(change);
    });

    // Add null check for groups before Object.entries
    if (!groups || typeof groups !== 'object') {
      return [];
    }

    return Object.entries(groups).map(([batchId, changes]) => ({
      batchId,
      changes: changes.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()),
      timestamp: changes[0].timestamp,
      isBatch: changes.length > 1,
    })).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [changeHistory]);

  const toggleBatch = (batchId: string) => {
    const newExpanded = new Set(expandedBatches);
    if (newExpanded.has(batchId)) {
      newExpanded.delete(batchId);
    } else {
      newExpanded.add(batchId);
    }
    setExpandedBatches(newExpanded);
  };

  const formatValue = (value: string | null | undefined) => {
    if (!value) return 'N/A';
    try {
      const parsed = JSON.parse(value);
      return typeof parsed === 'object' ? JSON.stringify(parsed, null, 2) : String(parsed);
    } catch {
      return value;
    }
  };

  const renderChangeItem = (change: ChangeHistoryItem, isGrouped = false) => {
    const ActionIcon = ACTION_ICONS[change.action as keyof typeof ACTION_ICONS] || ACTION_ICONS.default;
    
    return (
      <div key={change.id} className={cn("p-4 border rounded-lg hover:shadow-sm transition-shadow", isGrouped && "ml-6 border-l-4 border-l-blue-200")}>
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1">
            <div className={cn("p-2 rounded-lg", {
              'bg-green-100': change.action === 'create',
              'bg-blue-100': change.action === 'update', 
              'bg-red-100': change.action === 'delete',
              'bg-gray-100': !['create', 'update', 'delete'].includes(change.action)
            })}>
              <ActionIcon className={cn("h-4 w-4", {
                'text-green-600': change.action === 'create',
                'text-blue-600': change.action === 'update',
                'text-red-600': change.action === 'delete',
                'text-gray-600': !['create', 'update', 'delete'].includes(change.action)
              })} />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <span className="font-medium text-sm">{change.user_name}</span>
                <Badge variant="outline" className="text-xs">{change.user_role}</Badge>
                {change.automatic_change && (
                  <Badge variant="secondary" className="text-xs">
                    <Database className="h-3 w-3 mr-1" />
                    System
                  </Badge>
                )}
              </div>
              
              <p className="text-sm text-gray-900 mb-1">
                {change.action === 'create' && `Created ${change.entity_type}: ${change.entity_name}`}
                {change.action === 'update' && change.field_name && 
                  `Updated ${change.field_name} in ${change.entity_type}: ${change.entity_name}`}
                {change.action === 'update' && !change.field_name && 
                  `Updated ${change.entity_type}: ${change.entity_name}`}
                {change.action === 'delete' && `Deleted ${change.entity_type}: ${change.entity_name}`}
              </p>
              
              {change.field_name && change.action === 'update' && (
                <div className="space-y-1 text-xs">
                  {change.old_value && (
                    <div>
                      <span className="text-red-600 font-medium">Old:</span>
                      <span className="text-gray-600 ml-1 font-mono">{formatValue(change.old_value)}</span>
                    </div>
                  )}
                  {change.new_value && (
                    <div>
                      <span className="text-green-600 font-medium">New:</span>
                      <span className="text-gray-600 ml-1 font-mono">{formatValue(change.new_value)}</span>
                    </div>
                  )}
                </div>
              )}
              
              {change.change_reason && (
                <div className="mt-2 p-2 bg-blue-50 rounded text-xs">
                  <span className="font-medium">Reason:</span> {change.change_reason}
                </div>
              )}
              
              <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                <span className="flex items-center">
                  <Clock className="h-3 w-3 mr-1" />
                  {format(new Date(change.timestamp), 'MMM dd, yyyy HH:mm:ss')}
                </span>
                <span>{formatDistanceToNow(new Date(change.timestamp))} ago</span>
                {change.ip_address && (
                  <span className="flex items-center">
                    <Globe className="h-3 w-3 mr-1" />
                    {change.ip_address}
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedItem(change);
                setShowDetails(true);
              }}
            >
              <Eye className="h-4 w-4" />
            </Button>
            
            {change.rollback_data && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => rollbackMutation.mutate(change.id)}
                disabled={rollbackMutation.isPending}
                className="text-orange-600 hover:text-orange-700"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderAuditItem = (audit: AuditLogItem) => {
    const ActionIcon = ACTION_ICONS[audit.action as keyof typeof ACTION_ICONS] || ACTION_ICONS.default;
    
    return (
      <div key={audit.id} className="p-4 border rounded-lg hover:shadow-sm transition-shadow">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1">
            <div className={cn("p-2 rounded-lg", CATEGORY_COLORS[audit.category as keyof typeof CATEGORY_COLORS] || 'bg-gray-100')}>
              <ActionIcon className="h-4 w-4" />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                {audit.user_name && (
                  <>
                    <span className="font-medium text-sm">{audit.user_name}</span>
                    <Badge variant="outline" className="text-xs">{audit.user_role}</Badge>
                  </>
                )}
                <Badge variant="secondary" className={cn("text-xs", SEVERITY_COLORS[audit.severity as keyof typeof SEVERITY_COLORS])}>
                  {audit.severity}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {audit.category}
                </Badge>
              </div>
              
              <p className="text-sm text-gray-900 mb-1">{audit.description}</p>
              
              <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                <span className="flex items-center">
                  <Clock className="h-3 w-3 mr-1" />
                  {format(new Date(audit.timestamp), 'MMM dd, yyyy HH:mm:ss')}
                </span>
                <span>{formatDistanceToNow(new Date(audit.timestamp))} ago</span>
                {audit.ip_address && (
                  <span className="flex items-center">
                    <Globe className="h-3 w-3 mr-1" />
                    {audit.ip_address}
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedItem(audit);
              setShowDetails(true);
            }}
          >
            <Eye className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };

  const renderSecurityEvent = (event: SecurityEventItem) => {
    return (
      <div key={event.id} className="p-4 border rounded-lg hover:shadow-sm transition-shadow">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1">
            <div className={cn("p-2 rounded-lg", {
              'bg-green-100': event.success && !event.blocked,
              'bg-red-100': !event.success || event.blocked,
              'bg-yellow-100': event.risk_score && event.risk_score > 50
            })}>
              {event.success && !event.blocked ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <XCircle className="h-4 w-4 text-red-600" />
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                {event.user_name && (
                  <span className="font-medium text-sm">{event.user_name}</span>
                )}
                <Badge variant={event.success ? "default" : "destructive"} className="text-xs">
                  {(event.event_type || 'Unknown Event').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </Badge>
                {event.blocked && (
                  <Badge variant="destructive" className="text-xs">
                    Blocked
                  </Badge>
                )}
                {event.risk_score && event.risk_score > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    Risk: {event.risk_score}%
                  </Badge>
                )}
              </div>
              
              <p className="text-sm text-gray-900 mb-1">
                {(event.event_type || 'Unknown Event').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} 
                {event.failure_reason && ` - ${event.failure_reason}`}
              </p>
              
              <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                <span className="flex items-center">
                  <Clock className="h-3 w-3 mr-1" />
                  {format(new Date(event.timestamp), 'MMM dd, yyyy HH:mm:ss')}
                </span>
                <span className="flex items-center">
                  <Globe className="h-3 w-3 mr-1" />
                  {event.ip_address}
                </span>
                <span className="flex items-center">
                  <Monitor className="h-3 w-3 mr-1" />
                  {event.source}
                </span>
                {event.location && (
                  <span>{event.location}</span>
                )}
              </div>
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedItem(event);
              setShowDetails(true);
            }}
          >
            <Eye className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };

  const renderDataAccess = (access: DataAccessItem) => {
    return (
      <div key={access.id} className="p-4 border rounded-lg hover:shadow-sm transition-shadow">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1">
            <div className={cn("p-2 rounded-lg", {
              'bg-blue-100': access.access_type === 'view',
              'bg-orange-100': access.access_type === 'export',
              'bg-purple-100': access.access_type === 'search'
            })}>
              <Eye className="h-4 w-4" />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <span className="font-medium text-sm">{access.user_name}</span>
                <Badge variant="outline" className="text-xs">{access.user_role}</Badge>
                <Badge variant="secondary" className="text-xs">
                  {access.access_type}
                </Badge>
                {access.sensitive_data && (
                  <Badge variant="destructive" className="text-xs">
                    <Shield className="h-3 w-3 mr-1" />
                    Sensitive
                  </Badge>
                )}
              </div>
              
              <p className="text-sm text-gray-900 mb-1">
                Accessed {access.result_count} {access.entity_type} record{access.result_count !== 1 ? 's' : ''}
                {access.entity_name && ` (${access.entity_name})`}
              </p>
              
              {access.purpose && (
                <p className="text-xs text-gray-600 mb-1">Purpose: {access.purpose}</p>
              )}
              
              <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                <span className="flex items-center">
                  <Clock className="h-3 w-3 mr-1" />
                  {format(new Date(access.timestamp), 'MMM dd, yyyy HH:mm:ss')}
                </span>
                <span>{access.access_method}</span>
                <span>Scope: {access.data_scope}</span>
                {access.session_duration && (
                  <span>Duration: {Math.round(access.session_duration / 1000)}s</span>
                )}
              </div>
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedItem(access);
              setShowDetails(true);
            }}
          >
            <Eye className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className={cn("w-full space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center">
            <History className="h-5 w-5 mr-2" />
            Activity History
            {entity_name && <span className="text-gray-500 ml-2">- {entity_name}</span>}
          </h3>
          <p className="text-sm text-gray-600">
            Complete audit trail of all activities and changes
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/audit'] })}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center">
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="search">Search</Label>
              <Input
                id="search"
                placeholder="Search activities..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="time-filter">Time Period</Label>
              <Select value={timeFilter} onValueChange={setTimeFilter}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="quarter">This Quarter</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="action-filter">Action</Label>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  <SelectItem value="create">Create</SelectItem>
                  <SelectItem value="update">Update</SelectItem>
                  <SelectItem value="delete">Delete</SelectItem>
                  <SelectItem value="view">View</SelectItem>
                  <SelectItem value="export">Export</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="user-filter">User</Label>
              <Select value={userFilter} onValueChange={setUserFilter}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  {/* Add dynamic user options based on data */}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="changes">
            Change History ({changeHistory.length})
          </TabsTrigger>
          <TabsTrigger value="audit">
            Audit Logs ({auditLogs.length})
          </TabsTrigger>
          <TabsTrigger value="security">
            Security Events ({securityEvents.length})
          </TabsTrigger>
          <TabsTrigger value="access">
            Data Access ({dataAccess.length})
          </TabsTrigger>
        </TabsList>

        {/* Change History Tab */}
        <TabsContent value="changes">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <History className="h-4 w-4 mr-2" />
                Change History
                <Badge variant="secondary" className="ml-2">
                  Git-like tracking
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                {isLoadingChanges ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : groupedChanges.length > 0 ? (
                  <div className="space-y-4">
                    {groupedChanges.map((group) => (
                      <div key={group.batchId}>
                        {group.isBatch ? (
                          <div className="border rounded-lg">
                            <div 
                              className="p-4 bg-gray-50 cursor-pointer flex items-center justify-between"
                              onClick={() => toggleBatch(group.batchId)}
                            >
                              <div className="flex items-center space-x-2">
                                {expandedBatches.has(group.batchId) ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                                <span className="font-medium">
                                  Batch Operation ({group.changes.length} changes)
                                </span>
                                <Badge variant="outline" className="text-xs">
                                  {format(new Date(group.timestamp), 'MMM dd, yyyy HH:mm')}
                                </Badge>
                              </div>
                            </div>
                            
                            {expandedBatches.has(group.batchId) && (
                              <div className="border-t space-y-2 p-2">
                                {group.changes.map(change => renderChangeItem(change, true))}
                              </div>
                            )}
                          </div>
                        ) : (
                          renderChangeItem(group.changes[0])
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No change history found</p>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audit Logs Tab */}
        <TabsContent value="audit">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="h-4 w-4 mr-2" />
                Audit Logs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                {isLoadingAudit ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : auditLogs.length > 0 ? (
                  <div className="space-y-4">
                    {auditLogs.map(renderAuditItem)}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No audit logs found</p>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Events Tab */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <AlertTriangle className="h-4 w-4 mr-2" />
                Security Events
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                {isLoadingSecurity ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : securityEvents.length > 0 ? (
                  <div className="space-y-4">
                    {securityEvents.map(renderSecurityEvent)}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No security events found</p>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Data Access Tab */}
        <TabsContent value="access">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Eye className="h-4 w-4 mr-2" />
                Data Access Logs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                {isLoadingAccess ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : dataAccess.length > 0 ? (
                  <div className="space-y-4">
                    {dataAccess.map(renderDataAccess)}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Eye className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No data access logs found</p>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Activity Details</DialogTitle>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Type:</span>
                  <span className="ml-2">{selectedItem.action || selectedItem.event_type || selectedItem.access_type}</span>
                </div>
                <div>
                  <span className="font-medium">User:</span>
                  <span className="ml-2">{selectedItem.user_name || 'System'}</span>
                </div>
                <div>
                  <span className="font-medium">Timestamp:</span>
                  <span className="ml-2">{format(new Date(selectedItem.timestamp), 'MMM dd, yyyy HH:mm:ss')}</span>
                </div>
                <div>
                  <span className="font-medium">IP Address:</span>
                  <span className="ml-2">{selectedItem.ip_address}</span>
                </div>
              </div>
              
              {selectedItem.metadata && (
                <div>
                  <span className="font-medium">Metadata:</span>
                  <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-auto">
                    {JSON.stringify(selectedItem.metadata, null, 2)}
                  </pre>
                </div>
              )}
              
              {selectedItem.rollback_data && (
                <div>
                  <span className="font-medium">Rollback Data:</span>
                  <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-auto">
                    {JSON.stringify(selectedItem.rollback_data, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
} 