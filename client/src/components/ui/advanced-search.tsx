import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';
import { cn } from '@/lib/utils';
import {
  Search,
  Filter,
  Save,
  Star,
  History,
  X,
  Plus,
  Settings,
  Clock,
  Tag,
  Users,
  FileText,
  Shield,
  DollarSign,
  Building,
  Zap,
  Calendar as CalendarIcon,
  ChevronDown,
  Target,
  Trash2,
  Edit,
  Share,
  BookmarkIcon,
  PlayIcon
} from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';

// Types
interface SearchCondition {
  id: string;
  field: string;
  operator: string;
  value: any;
  entityType: string;
}

interface SearchConfig {
  globalQuery?: string;
  conditions: SearchCondition[];
  entityTypes: string[];
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

interface SavedSearch {
  id: number;
  name: string;
  description?: string;
  searchConfig: SearchConfig;
  entityTypes: string[];
  isPublic: boolean;
  isQuickFilter: boolean;
  useCount: number;
  lastUsed?: Date;
  tags?: string[];
  createdAt: Date;
}

interface SearchResult {
  id: number;
  entityType: string;
  entityId: number;
  title: string;
  subtitle: string;
  description: string;
  relevanceScore: number;
  metadata: Record<string, any>;
  highlightedContent: string;
}

interface AdvancedSearchProps {
  onSearchResults?: (results: SearchResult[]) => void;
  onClose?: () => void;
  initialConfig?: Partial<SearchConfig>;
  showQuickAccess?: boolean;
  className?: string;
}

// Entity configuration
const ENTITY_TYPES = [
  { value: 'clients', label: 'Clients', icon: Building, color: 'bg-blue-500' },
  { value: 'contracts', label: 'Contracts', icon: FileText, color: 'bg-green-500' },
  { value: 'services', label: 'Services', icon: Shield, color: 'bg-purple-500' },
  { value: 'financial_transactions', label: 'Financial', icon: DollarSign, color: 'bg-yellow-500' },
  { value: 'service_authorization_forms', label: 'SAFs', icon: FileText, color: 'bg-orange-500' },
  { value: 'certificates_of_compliance', label: 'COCs', icon: Shield, color: 'bg-red-500' },
  { value: 'hardware_assets', label: 'Hardware', icon: Settings, color: 'bg-gray-500' },
  { value: 'users', label: 'Users', icon: Users, color: 'bg-indigo-500' },
];

// Field definitions for each entity type
const ENTITY_FIELDS = {
  clients: [
    { field: 'name', label: 'Client Name', type: 'text' },
    { field: 'industry', label: 'Industry', type: 'select', options: ['Technology', 'Healthcare', 'Finance', 'Manufacturing', 'Retail'] },
    { field: 'status', label: 'Status', type: 'select', options: ['active', 'prospect', 'inactive'] },
    { field: 'companySize', label: 'Company Size', type: 'select', options: ['1-50', '51-200', '201-1000', '1000+'] },
    { field: 'created_at', label: 'Created Date', type: 'date' },
  ],
  contracts: [
    { field: 'name', label: 'Contract Name', type: 'text' },
    { field: 'status', label: 'Status', type: 'select', options: ['active', 'pending', 'expired', 'cancelled'] },
    { field: 'value', label: 'Contract Value', type: 'number' },
    { field: 'start_date', label: 'Start Date', type: 'date' },
    { field: 'end_date', label: 'End Date', type: 'date' },
  ],
  services: [
    { field: 'name', label: 'Service Name', type: 'text' },
    { field: 'category', label: 'Category', type: 'text' },
    { field: 'deliveryModel', label: 'Delivery Model', type: 'text' },
    { field: 'isActive', label: 'Is Active', type: 'boolean' },
  ],
  // Add more entity field definitions...
};

// Operators for different field types
const OPERATORS = {
  text: [
    { value: 'contains', label: 'Contains' },
    { value: 'equals', label: 'Equals' },
    { value: 'starts_with', label: 'Starts with' },
    { value: 'ends_with', label: 'Ends with' },
    { value: 'not_contains', label: 'Does not contain' },
  ],
  number: [
    { value: 'equals', label: 'Equals' },
    { value: 'greater_than', label: 'Greater than' },
    { value: 'less_than', label: 'Less than' },
    { value: 'between', label: 'Between' },
  ],
  date: [
    { value: 'equals', label: 'On date' },
    { value: 'before', label: 'Before' },
    { value: 'after', label: 'After' },
    { value: 'between', label: 'Between' },
    { value: 'last_7_days', label: 'Last 7 days' },
    { value: 'last_30_days', label: 'Last 30 days' },
    { value: 'this_month', label: 'This month' },
    { value: 'this_year', label: 'This year' },
  ],
  boolean: [
    { value: 'equals', label: 'Is' },
  ],
  select: [
    { value: 'equals', label: 'Is' },
    { value: 'not_equals', label: 'Is not' },
    { value: 'in', label: 'Is one of' },
  ],
};

// Quick filter presets
const QUICK_FILTERS = [
  {
    name: 'Active Clients',
    description: 'Clients with active status',
    icon: Building,
    color: 'bg-green-500',
    config: {
      conditions: [
        { field: 'status', operator: 'equals', value: 'active', entityType: 'clients' }
      ],
      entityTypes: ['clients']
    }
  },
  {
    name: 'Expiring Contracts',
    description: 'Contracts expiring in next 30 days',
    icon: FileText,
    color: 'bg-orange-500',
    config: {
      conditions: [
        { field: 'end_date', operator: 'between', value: [new Date(), subDays(new Date(), -30)], entityType: 'contracts' },
        { field: 'status', operator: 'equals', value: 'active', entityType: 'contracts' }
      ],
      entityTypes: ['contracts']
    }
  },
  {
    name: 'High Value Contracts',
    description: 'Contracts over $100,000',
    icon: DollarSign,
    color: 'bg-yellow-500',
    config: {
      conditions: [
        { field: 'value', operator: 'greater_than', value: 100000, entityType: 'contracts' }
      ],
      entityTypes: ['contracts']
    }
  },
  {
    name: 'Recent Activity',
    description: 'Items created in last 7 days',
    icon: Clock,
    color: 'bg-blue-500',
    config: {
      conditions: [
        { field: 'created_at', operator: 'last_7_days', value: null, entityType: 'all' }
      ],
      entityTypes: ['clients', 'contracts', 'services']
    }
  },
];

export function AdvancedSearch({ 
  onSearchResults, 
  onClose, 
  initialConfig, 
  showQuickAccess = true,
  className 
}: AdvancedSearchProps) {
  const [searchConfig, setSearchConfig] = useState<SearchConfig>({
    globalQuery: '',
    conditions: [],
    entityTypes: ['clients'],
    sortBy: 'relevance',
    sortOrder: 'desc',
    limit: 50,
    ...initialConfig
  });
  
  const [activeTab, setActiveTab] = useState('global');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saveDescription, setSaveDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchHistory, setSearchHistory] = useState<any[]>([]);

  const queryClient = useQueryClient();

  // Fetch saved searches
  const { data: savedSearches = [] } = useQuery<SavedSearch[]>({
    queryKey: ['/api/search/saved'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/search/saved');
      return res.json();
    },
  });

  // Fetch search history
  const { data: recentHistory = [] } = useQuery({
    queryKey: ['/api/search/history'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/search/history?limit=10');
      return res.json();
    },
  });

  // Search mutation
  const searchMutation = useMutation({
    mutationFn: async (config: SearchConfig) => {
      const res = await apiRequest('POST', '/api/search/execute', config);
      return res.json();
    },
    onSuccess: (results) => {
      setSearchResults(results);
      onSearchResults?.(results);
    },
  });

  // Save search mutation
  const saveSearchMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest('POST', '/api/search/save', data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/search/saved'] });
      setShowSaveDialog(false);
      setSaveName('');
      setSaveDescription('');
    },
  });

  // Execute search
  const executeSearch = useCallback(async () => {
    if (!searchConfig.globalQuery && searchConfig.conditions.length === 0) {
      return;
    }

    setIsSearching(true);
    try {
      await searchMutation.mutateAsync(searchConfig);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsSearching(false);
    }
  }, [searchConfig, searchMutation]);

  // Add condition
  const addCondition = () => {
    const newCondition: SearchCondition = {
      id: Date.now().toString(),
      field: '',
      operator: 'contains',
      value: '',
      entityType: searchConfig.entityTypes[0] || 'clients'
    };
    setSearchConfig(prev => ({
      ...prev,
      conditions: [...prev.conditions, newCondition]
    }));
  };

  // Update condition
  const updateCondition = (id: string, updates: Partial<SearchCondition>) => {
    setSearchConfig(prev => ({
      ...prev,
      conditions: prev.conditions.map(condition =>
        condition.id === id ? { ...condition, ...updates } : condition
      )
    }));
  };

  // Remove condition
  const removeCondition = (id: string) => {
    setSearchConfig(prev => ({
      ...prev,
      conditions: prev.conditions.filter(condition => condition.id !== id)
    }));
  };

  // Load saved search
  const loadSavedSearch = (savedSearch: SavedSearch) => {
    setSearchConfig(savedSearch.searchConfig);
    executeSearch();
  };

  // Apply quick filter
  const applyQuickFilter = (filter: typeof QUICK_FILTERS[0]) => {
    const config = {
      ...searchConfig,
      ...filter.config,
      conditions: filter.config.conditions.map(c => ({
        ...c,
        id: Date.now().toString() + Math.random()
      }))
    };
    setSearchConfig(config);
    // Auto-execute quick filters
    setTimeout(() => executeSearch(), 100);
  };

  // Render condition builder
  const renderConditionBuilder = () => (
    <div className="space-y-4">
      {searchConfig.conditions.map((condition, index) => (
        <Card key={condition.id} className="p-4">
          <div className="grid grid-cols-12 gap-3 items-center">
            {/* Entity Type */}
            <div className="col-span-2">
              <Select
                value={condition.entityType}
                onValueChange={(value) => updateCondition(condition.id, { entityType: value, field: '', value: '' })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ENTITY_TYPES.map(entity => (
                    <SelectItem key={entity.value} value={entity.value}>
                      <div className="flex items-center">
                        <entity.icon className="h-4 w-4 mr-2" />
                        {entity.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Field */}
            <div className="col-span-3">
              <Select
                value={condition.field}
                onValueChange={(value) => updateCondition(condition.id, { field: value, value: '' })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select field" />
                </SelectTrigger>
                <SelectContent>
                  {(ENTITY_FIELDS[condition.entityType as keyof typeof ENTITY_FIELDS] || []).map(field => (
                    <SelectItem key={field.field} value={field.field}>
                      {field.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Operator */}
            <div className="col-span-2">
              <Select
                value={condition.operator}
                onValueChange={(value) => updateCondition(condition.id, { operator: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(() => {
                    const field = (ENTITY_FIELDS[condition.entityType as keyof typeof ENTITY_FIELDS] || [])
                      .find(f => f.field === condition.field);
                    const fieldType = field?.type || 'text';
                    return (OPERATORS[fieldType as keyof typeof OPERATORS] || OPERATORS.text).map(op => (
                      <SelectItem key={op.value} value={op.value}>
                        {op.label}
                      </SelectItem>
                    ));
                  })()}
                </SelectContent>
              </Select>
            </div>

            {/* Value */}
            <div className="col-span-4">
              {(() => {
                const field = (ENTITY_FIELDS[condition.entityType as keyof typeof ENTITY_FIELDS] || [])
                  .find(f => f.field === condition.field);
                const fieldType = field?.type || 'text';

                if (fieldType === 'boolean') {
                  return (
                    <Select
                      value={condition.value?.toString()}
                      onValueChange={(value) => updateCondition(condition.id, { value: value === 'true' })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">True</SelectItem>
                        <SelectItem value="false">False</SelectItem>
                      </SelectContent>
                    </Select>
                  );
                }

                if (fieldType === 'select' && field?.options) {
                  return (
                    <Select
                      value={condition.value}
                      onValueChange={(value) => updateCondition(condition.id, { value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {field.options.map(option => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  );
                }

                if (fieldType === 'date') {
                  if (condition.operator === 'between') {
                    return (
                      <div className="flex gap-1">
                        <Input
                          type="date"
                          value={condition.value?.[0] ? format(new Date(condition.value[0]), 'yyyy-MM-dd') : ''}
                          onChange={(e) => {
                            const newValue = [new Date(e.target.value), condition.value?.[1] || new Date()];
                            updateCondition(condition.id, { value: newValue });
                          }}
                        />
                        <Input
                          type="date"
                          value={condition.value?.[1] ? format(new Date(condition.value[1]), 'yyyy-MM-dd') : ''}
                          onChange={(e) => {
                            const newValue = [condition.value?.[0] || new Date(), new Date(e.target.value)];
                            updateCondition(condition.id, { value: newValue });
                          }}
                        />
                      </div>
                    );
                  }
                  
                  if (!condition.operator.includes('_days') && !condition.operator.includes('_month') && !condition.operator.includes('_year')) {
                    return (
                      <Input
                        type="date"
                        value={condition.value ? format(new Date(condition.value), 'yyyy-MM-dd') : ''}
                        onChange={(e) => updateCondition(condition.id, { value: new Date(e.target.value) })}
                      />
                    );
                  }
                  
                  return <div className="text-sm text-muted-foreground px-3 py-2">Relative date</div>;
                }

                return (
                  <Input
                    type={fieldType === 'number' ? 'number' : 'text'}
                    value={condition.value}
                    onChange={(e) => updateCondition(condition.id, { 
                      value: fieldType === 'number' ? parseFloat(e.target.value) || 0 : e.target.value 
                    })}
                    placeholder="Enter value"
                  />
                );
              })()}
            </div>

            {/* Remove button */}
            <div className="col-span-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeCondition(condition.id)}
                className="text-red-500 hover:text-red-700"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      ))}

      <Button
        variant="outline"
        onClick={addCondition}
        className="w-full"
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Condition
      </Button>
    </div>
  );

  // Render search results
  const renderSearchResults = () => (
    <ScrollArea className="h-96">
      <div className="space-y-2">
        {searchResults.map((result) => {
          const entityType = ENTITY_TYPES.find(e => e.value === result.entityType);
          const Icon = entityType?.icon || FileText;
          
          return (
            <Card key={`${result.entityType}-${result.entityId}`} className="p-3 hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex items-start space-x-3">
                <div className={cn("p-2 rounded-lg", entityType?.color || 'bg-gray-500')}>
                  <Icon className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium truncate">{result.title}</h4>
                    <Badge variant="secondary" className="text-xs">
                      {entityType?.label}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{result.subtitle}</p>
                  <p className="text-xs text-muted-foreground mt-1">{result.description}</p>
                  {result.highlightedContent && (
                    <div 
                      className="text-xs text-muted-foreground mt-1"
                      dangerouslySetInnerHTML={{ __html: result.highlightedContent }}
                    />
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  {Math.round(result.relevanceScore * 100)}%
                </div>
              </div>
            </Card>
          );
        })}
        
        {searchResults.length === 0 && !isSearching && (
          <div className="text-center py-8 text-muted-foreground">
            <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No results found</p>
            <p className="text-sm">Try adjusting your search criteria</p>
          </div>
        )}
      </div>
    </ScrollArea>
  );

  return (
    <div className={cn("w-full max-w-6xl mx-auto", className)}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <Search className="h-5 w-5 mr-2" />
              Advanced Search
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSaveDialog(true)}
                disabled={!searchConfig.globalQuery && searchConfig.conditions.length === 0}
              >
                <Save className="h-4 w-4 mr-2" />
                Save Search
              </Button>
              {onClose && (
                <Button variant="ghost" size="sm" onClick={onClose}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="global">Global Search</TabsTrigger>
              <TabsTrigger value="advanced">Query Builder</TabsTrigger>
              <TabsTrigger value="saved">Saved Searches</TabsTrigger>
              <TabsTrigger value="quick">Quick Filters</TabsTrigger>
            </TabsList>

            {/* Global Search Tab */}
            <TabsContent value="global" className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <Input
                    placeholder="Search across all entities..."
                    value={searchConfig.globalQuery}
                    onChange={(e) => setSearchConfig(prev => ({ ...prev, globalQuery: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        executeSearch();
                      }
                    }}
                    className="text-lg"
                  />
                </div>
                <Button onClick={executeSearch} disabled={isSearching}>
                  {isSearching ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {/* Entity Type Selection */}
              <div className="flex flex-wrap gap-2">
                <Label className="text-sm font-medium mr-4">Search in:</Label>
                {ENTITY_TYPES.map(entity => (
                  <Badge
                    key={entity.value}
                    variant={searchConfig.entityTypes.includes(entity.value) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => {
                      setSearchConfig(prev => ({
                        ...prev,
                        entityTypes: prev.entityTypes.includes(entity.value)
                          ? prev.entityTypes.filter(t => t !== entity.value)
                          : [...prev.entityTypes, entity.value]
                      }));
                    }}
                  >
                    <entity.icon className="h-3 w-3 mr-1" />
                    {entity.label}
                  </Badge>
                ))}
              </div>

              {renderSearchResults()}
            </TabsContent>

            {/* Advanced Query Builder Tab */}
            <TabsContent value="advanced" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Entity Types</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {ENTITY_TYPES.map(entity => (
                      <Badge
                        key={entity.value}
                        variant={searchConfig.entityTypes.includes(entity.value) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => {
                          setSearchConfig(prev => ({
                            ...prev,
                            entityTypes: prev.entityTypes.includes(entity.value)
                              ? prev.entityTypes.filter(t => t !== entity.value)
                              : [...prev.entityTypes, entity.value]
                          }));
                        }}
                      >
                        <entity.icon className="h-3 w-3 mr-1" />
                        {entity.label}
                      </Badge>
                    ))}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Sort By</Label>
                    <Select
                      value={searchConfig.sortBy}
                      onValueChange={(value) => setSearchConfig(prev => ({ ...prev, sortBy: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="relevance">Relevance</SelectItem>
                        <SelectItem value="created_at">Created Date</SelectItem>
                        <SelectItem value="updated_at">Updated Date</SelectItem>
                        <SelectItem value="name">Name</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label>Order</Label>
                    <Select
                      value={searchConfig.sortOrder}
                      onValueChange={(value: 'asc' | 'desc') => setSearchConfig(prev => ({ ...prev, sortOrder: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="desc">Descending</SelectItem>
                        <SelectItem value="asc">Ascending</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <div className="flex items-center justify-between mb-4">
                  <Label className="text-lg font-medium">Search Conditions</Label>
                  <Button
                    variant="outline"
                    onClick={executeSearch}
                    disabled={isSearching || searchConfig.conditions.length === 0}
                  >
                    {isSearching ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                    ) : (
                      <PlayIcon className="h-4 w-4 mr-2" />
                    )}
                    Execute Search
                  </Button>
                </div>
                
                {renderConditionBuilder()}
              </div>

              {searchResults.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <Label className="text-lg font-medium">Results ({searchResults.length})</Label>
                    {renderSearchResults()}
                  </div>
                </>
              )}
            </TabsContent>

            {/* Saved Searches Tab */}
            <TabsContent value="saved" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {savedSearches.map((savedSearch) => (
                  <Card key={savedSearch.id} className="p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{savedSearch.name}</h4>
                          {savedSearch.isQuickFilter && (
                            <Badge variant="secondary" className="text-xs">
                              <Zap className="h-3 w-3 mr-1" />
                              Quick
                            </Badge>
                          )}
                          {savedSearch.isPublic && (
                            <Badge variant="outline" className="text-xs">
                              <Share className="h-3 w-3 mr-1" />
                              Public
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {savedSearch.description}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span>Used {savedSearch.useCount} times</span>
                          {savedSearch.lastUsed && (
                            <span>Last used {format(new Date(savedSearch.lastUsed), 'MMM dd')}</span>
                          )}
                        </div>
                        {savedSearch.tags && savedSearch.tags.length > 0 && (
                          <div className="flex gap-1 mt-2">
                            {savedSearch.tags.map(tag => (
                              <Badge key={tag} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => loadSavedSearch(savedSearch)}
                        >
                          <PlayIcon className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-red-500">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Quick Filters Tab */}
            <TabsContent value="quick" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {QUICK_FILTERS.map((filter, index) => (
                  <Card
                    key={index}
                    className="p-4 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => applyQuickFilter(filter)}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn("p-3 rounded-lg", filter.color)}>
                        <filter.icon className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h4 className="font-medium">{filter.name}</h4>
                        <p className="text-sm text-muted-foreground">{filter.description}</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              {/* User's Quick Filters */}
              {savedSearches.filter(s => s.isQuickFilter).length > 0 && (
                <>
                  <Separator />
                  <div>
                    <Label className="text-lg font-medium">Your Quick Filters</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      {savedSearches
                        .filter(s => s.isQuickFilter)
                        .map((filter) => (
                          <Card
                            key={filter.id}
                            className="p-4 hover:shadow-md transition-shadow cursor-pointer"
                            onClick={() => loadSavedSearch(filter)}
                          >
                            <div className="flex items-center gap-3">
                              <div className="p-3 rounded-lg bg-indigo-500">
                                <BookmarkIcon className="h-5 w-5 text-white" />
                              </div>
                              <div>
                                <h4 className="font-medium">{filter.name}</h4>
                                <p className="text-sm text-muted-foreground">{filter.description}</p>
                              </div>
                            </div>
                          </Card>
                        ))}
                    </div>
                  </div>
                </>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Save Search Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Save Search</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="search-name">Name *</Label>
              <Input
                id="search-name"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder="Enter search name"
              />
            </div>
            <div>
              <Label htmlFor="search-description">Description</Label>
              <Textarea
                id="search-description"
                value={saveDescription}
                onChange={(e) => setSaveDescription(e.target.value)}
                placeholder="Describe what this search finds"
                rows={3}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="public-search"
                checked={isPublic}
                onCheckedChange={setIsPublic}
              />
              <Label htmlFor="public-search">Make this search public (visible to all users)</Label>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  saveSearchMutation.mutate({
                    name: saveName,
                    description: saveDescription,
                    searchConfig,
                    isPublic,
                    tags: selectedTags
                  });
                }}
                disabled={!saveName || saveSearchMutation.isPending}
              >
                {saveSearchMutation.isPending ? 'Saving...' : 'Save Search'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 