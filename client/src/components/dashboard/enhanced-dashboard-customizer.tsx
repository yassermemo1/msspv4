import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { useQuery } from '@tanstack/react-query';
import { 
  Plus, 
  Settings, 
  Trash2, 
  Copy,
  BarChart3, 
  LineChart, 
  PieChart,
  TrendingUp,
  Building,
  FileText,
  Users,
  DollarSign,
  Shield,
  Server,
  Database,
  X,
  Palette,
  Target,
  Filter,
  Eye,
  EyeOff,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  Globe
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { EnhancedCardCreator } from './enhanced-card-creator';

// Global Widget interface for import functionality
interface GlobalWidget {
  id: string;
  systemId: number;
  systemName: string;
  pluginName: string;
  name: string;
  description: string;
  widgetType: 'table' | 'chart' | 'metric' | 'list' | 'gauge' | 'query';
  chartType?: 'bar' | 'line' | 'pie' | 'area';
  query: string;
  method: string;
  parameters: Record<string, any>;
  displayConfig: Record<string, any>;
  refreshInterval: number;
  isActive: boolean;
  isGlobal: boolean;
  position: number;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
}

// Enhanced card configuration interface
export interface EnhancedDashboardCard {
  id: string;
  title: string;
  type: 'metric' | 'chart' | 'comparison' | 'pool-comparison' | 'widget';
  category: 'dashboard' | 'kpi' | 'comparison' | 'widget';
  dataSource: string;
  size: 'small' | 'medium' | 'large' | 'xlarge';
  visible: boolean;
  position: number;
  config: {
    icon?: string;
    color?: string;
    format?: 'number' | 'currency' | 'percentage';
    aggregation?:
      | 'count'
      | 'sum'
      | 'average'
      | 'max'
      | 'min'
      | {
          function: 'COUNT' | 'SUM' | 'AVG' | 'MIN' | 'MAX';
          field?: string;
        };
    chartType?: 'line' | 'bar' | 'pie' | 'doughnut' | 'area' | 'radar' | 'scatter';
    filters?: Record<string, any>;
    dynamicFilters?: Array<{
      field: string;
      operator: string;
      value: string;
    }>;
    trend?: boolean;
    // Comparison features
    compareWith?: string; // Data source to compare with
    comparisonType?: 'vs' | 'ratio' | 'diff' | 'trend';
    comparisonField?: string; // Field to compare
    timeRange?: 'daily' | 'weekly' | 'monthly' | 'yearly';
    groupBy?: string; // Field to group data by
    // Optional data source override specific to widget
    dataSource?: string;
    // Name / label helpful for external widgets
    name?: string;
    // External system integration - deprecated
    customApiEndpoint?: string;
    refreshInterval?: number; // In seconds
    // Advanced options
    showLegend?: boolean;
    showDataLabels?: boolean;
    enableDrillDown?: boolean;
    customColors?: string[];
    colors?: string[]; // alias for custom colors array
    // Widget import configuration
    widgetId?: string; // ID of the imported widget
    widgetType?: 'table' | 'chart' | 'metric' | 'list' | 'gauge' | 'query';
    pluginName?: string;
    instanceId?: string;
  };
  isBuiltIn: boolean;
  isRemovable: boolean;
}

// Available data sources from database schema
const DATABASE_SOURCES = [
  { value: 'clients', label: 'Clients', icon: 'Building' },
  { value: 'contracts', label: 'Contracts', icon: 'FileText' },
  { value: 'services', label: 'Services', icon: 'Shield' },
  { value: 'license_pools', label: 'License Pools', icon: 'Server' },
  { value: 'hardware_assets', label: 'Hardware Assets', icon: 'Database' },
  { value: 'service_scopes', label: 'Service Scopes', icon: 'Shield' },
  { value: 'proposals', label: 'Proposals', icon: 'FileText' },
  { value: 'financial_transactions', label: 'Financial Transactions', icon: 'DollarSign' },
  { value: 'team_assignments', label: 'Team Assignments', icon: 'Users' },
  { value: 'service_authorization_forms', label: 'Service Authorization Forms', icon: 'Shield' },
  { value: 'certificates_of_compliance', label: 'Certificates of Compliance', icon: 'Shield' },
  { value: 'documents', label: 'Documents', icon: 'FileText' },
  { value: 'users', label: 'Users', icon: 'Users' },
  { value: 'audit_logs', label: 'Audit Logs', icon: 'Shield' }
];

// Chart type options
const CHART_TYPES = [
  { value: 'bar', label: 'Bar Chart', icon: BarChart3 },
  { value: 'line', label: 'Line Chart', icon: LineChart },
  { value: 'pie', label: 'Pie Chart', icon: PieChart },
  { value: 'doughnut', label: 'Doughnut Chart', icon: PieChart },
  { value: 'area', label: 'Area Chart', icon: TrendingUp },
  { value: 'radar', label: 'Radar Chart', icon: TrendingUp },
  { value: 'scatter', label: 'Scatter Plot', icon: TrendingUp }
];

// Aggregation options
const AGGREGATION_OPTIONS = [
  { value: 'count', label: 'Count' },
  { value: 'sum', label: 'Sum' },
  { value: 'average', label: 'Average' },
  { value: 'max', label: 'Maximum' },
  { value: 'min', label: 'Minimum' }
];

// Format options
const FORMAT_OPTIONS = [
  { value: 'number', label: 'Number' },
  { value: 'currency', label: 'Currency' },
  { value: 'percentage', label: 'Percentage' }
];

// Comparison types
const COMPARISON_TYPES = [
  { value: 'vs', label: 'Side by Side' },
  { value: 'ratio', label: 'Ratio' },
  { value: 'diff', label: 'Difference' },
  { value: 'trend', label: 'Trend Over Time' }
];

// Time range options
const TIME_RANGES = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' }
];

interface EnhancedDashboardCustomizerProps {
  cards: EnhancedDashboardCard[];
  onCardsChange: (cards: EnhancedDashboardCard[]) => void;
  onClose: () => void;
}

export function EnhancedDashboardCustomizer({ cards, onCardsChange, onClose }: EnhancedDashboardCustomizerProps) {
  const { toast } = useToast();
  const [showAddCard, setShowAddCard] = useState(false);
  const [editingCard, setEditingCard] = useState<EnhancedDashboardCard | null>(null);
  const [pendingUpdates, setPendingUpdates] = useState<Partial<EnhancedDashboardCard> | null>(null);
  const [showWidgetImport, setShowWidgetImport] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [newCard, setNewCard] = useState<Partial<EnhancedDashboardCard>>({
    type: 'metric',
    dataSource: 'clients',
    size: 'small',
    visible: true,
    config: {
      color: 'blue',
      format: 'number',
      aggregation: 'count'
    }
  });

  // Fetch available widgets for import
  const { data: globalWidgets = [], isLoading: widgetsLoading, refetch: refetchWidgets } = useQuery<GlobalWidget[]>({
    queryKey: ['global-widgets-import'],
    queryFn: async () => {
      const response = await fetch('/api/widgets/manage', {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch widgets');
      }
      return response.json();
    },
    staleTime: 30000,
    enabled: showWidgetImport, // Only fetch when dialog is open
  });

  // Widget management functions
  const handleToggleWidgetVisibility = async (widget: GlobalWidget) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/widgets/manage/${widget.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          ...widget,
          isActive: !widget.isActive,
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Failed to update widget visibility: ${errorData}`);
      }

      await refetchWidgets();
      
      toast({
        title: "Success",
        description: `Widget ${widget.isActive ? 'hidden' : 'shown'} successfully`,
      });
    } catch (error) {
      console.error('Widget visibility toggle error:', error);
      toast({
        title: "Error",
        description: "Failed to update widget visibility",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };



  // Field mappings for different data sources
  const getFieldsForDataSource = (dataSource: string) => {
    const fieldMappings: Record<string, string[]> = {
      clients: ['id', 'name', 'industry', 'status', 'created_at', 'updated_at'],
      contracts: ['id', 'title', 'status', 'start_date', 'end_date', 'value', 'client_id', 'created_at'],
      services: ['id', 'name', 'type', 'price', 'status', 'category', 'created_at'],
      license_pools: ['id', 'name', 'total_licenses', 'used_licenses', 'available_licenses', 'pool_type'],
      proposals: ['id', 'title', 'status', 'value', 'submitted_date', 'client_id'],
      financial_transactions: ['id', 'amount', 'type', 'date', 'status', 'client_id'],
      users: ['id', 'username', 'email', 'role', 'status', 'created_at'],
      audit_logs: ['id', 'action', 'entity_type', 'user_id', 'created_at']
    };
    return fieldMappings[dataSource] || [];
  };

  const getOperators = () => [
    { value: '=', label: 'Equals' },
    { value: '!=', label: 'Not equals' },
    { value: '>', label: 'Greater than' },
    { value: '<', label: 'Less than' },
    { value: '>=', label: 'Greater or equal' },
    { value: '<=', label: 'Less or equal' },
    { value: 'contains', label: 'Contains' },
    { value: 'starts_with', label: 'Starts with' },
    { value: 'ends_with', label: 'Ends with' }
  ];

  const getDatePresets = () => [
    { value: '1D', label: 'Last 1 Day' },
    { value: '3D', label: 'Last 3 Days' },
    { value: '7D', label: 'Last 7 Days' },
    { value: '10D', label: 'Last 10 Days' },
    { value: '30D', label: 'Last 30 Days' },
    { value: '1M', label: 'Last 1 Month' },
    { value: '3M', label: 'Last 3 Months' },
    { value: '6M', label: 'Last 6 Months' },
    { value: '12M', label: 'Last 12 Months' }
  ];

  const isDateField = (field: string) => {
    return field.includes('date') || field.includes('created_at') || field.includes('updated_at');
  };

  const isNumberField = (field: string) => {
    return ['value', 'price', 'amount', 'revenue', 'total_licenses', 'used_licenses', 'available_licenses'].includes(field);
  };

  const handleAddCard = () => {
    const cardToAdd: EnhancedDashboardCard = {
      id: `card-${Date.now()}`,
      title: newCard.title || 'New Card',
      type: newCard.type || 'metric',
      category: 'dashboard',
      dataSource: newCard.dataSource || 'clients',
      size: newCard.size || 'small',
      visible: true,
      position: cards.length,
      config: {
        ...newCard.config,
        icon: newCard.config?.icon || 'BarChart3',
        color: newCard.config?.color || 'blue',
        format: newCard.config?.format || 'number',
        aggregation: newCard.config?.aggregation || 'count'
      },
      isBuiltIn: false,
      isRemovable: true
    };

    onCardsChange([...cards, cardToAdd]);
    setNewCard({
      type: 'metric',
      dataSource: 'clients',
      size: 'small',
      visible: true,
      config: {
        color: 'blue',
        format: 'number',
        aggregation: 'count'
      }
    });
    setShowAddCard(false);
    
    toast({
      title: "Success",
      description: "Dashboard card added successfully",
    });
  };

  const handleUpdateCard = (updatedCard: EnhancedDashboardCard) => {
    const updatedCards = cards.map(card => 
      card.id === updatedCard.id ? updatedCard : card
    );
    onCardsChange(updatedCards);
    
    toast({
      title: "Success", 
      description: "Card updated successfully",
    });
  };

  const handleRemoveCard = (cardId: string) => {
    const updatedCards = cards.filter(card => card.id !== cardId);
    onCardsChange(updatedCards);
    
    toast({
      title: "Success",
      description: "Card removed successfully",
    });
  };

  const handleToggleCardVisibility = (card: EnhancedDashboardCard) => {
    const updatedCards = cards.map(c => 
      c.id === card.id 
        ? { ...c, visible: !c.visible }
        : c
    );
    onCardsChange(updatedCards);

    toast({
      title: card.visible ? "Card Hidden" : "Card Shown",
      description: `"${card.title}" is now ${card.visible ? "hidden" : "visible"}.`,
    });
  };

  const handleDuplicateCard = (card: EnhancedDashboardCard) => {
    const duplicatedCard: EnhancedDashboardCard = {
      ...card,
      id: `card-${Date.now()}`,
      title: `${card.title} (Copy)`,
      position: cards.length,
      isRemovable: true
    };
    
    onCardsChange([...cards, duplicatedCard]);
    
    toast({
      title: "Success",
      description: "Card duplicated successfully",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Advanced Dashboard Card Creator</h3>
          <p className="text-sm text-gray-600">
            Create advanced dashboard cards with external data integration, comparisons, and dynamic filters
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowAddCard(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Card
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setShowWidgetImport(true)}
          >
            <Eye className="h-4 w-4 mr-2" />
            Widget Visibility
          </Button>
        </div>
      </div>

      {/* Existing Cards */}
      <div className="space-y-3">
        <h4 className="font-medium">Current Cards ({cards.length})</h4>
        
        {cards.length === 0 ? (
          <Card className="border-dashed border-2 border-gray-300">
            <CardContent className="flex items-center justify-center py-8">
              <div className="text-center">
                <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">No dashboard cards configured</p>
                <Button onClick={() => setShowAddCard(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Card
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {cards.map((card) => (
              <Card key={card.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded ${
                      card.config.color === 'blue' ? 'bg-blue-100 text-blue-600' :
                      card.config.color === 'green' ? 'bg-green-100 text-green-600' :
                      card.config.color === 'red' ? 'bg-red-100 text-red-600' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {card.config.icon === 'Building' && <Building className="h-4 w-4" />}
                      {card.config.icon === 'FileText' && <FileText className="h-4 w-4" />}
                      {card.config.icon === 'DollarSign' && <DollarSign className="h-4 w-4" />}
                      {card.config.icon === 'Users' && <Users className="h-4 w-4" />}
                      {card.config.icon === 'Server' && <Server className="h-4 w-4" />}
                      {card.config.icon === 'Database' && <Database className="h-4 w-4" />}
                      {card.config.icon === 'Shield' && <Shield className="h-4 w-4" />}
                      {!card.config.icon && <BarChart3 className="h-4 w-4" />}
                    </div>
                    <div>
                      <h5 className="font-medium">{card.title}</h5>
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <Badge variant="outline" className="text-xs">
                          {card.type}
                        </Badge>
                        <span>•</span>
                        <span>{DATABASE_SOURCES.find(s => s.value === card.dataSource)?.label || card.dataSource}</span>
                        {card.config.compareWith && (
                          <>
                            <span>vs</span>
                            <span>{DATABASE_SOURCES.find(s => s.value === card.config.compareWith)?.label || card.config.compareWith}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button
                      variant={card.visible ? "outline" : "secondary"}
                      size="sm"
                      onClick={() => handleToggleCardVisibility(card)}
                      title={card.visible ? "Hide card" : "Show card"}
                    >
                      {card.visible ? (
                        <Eye className="h-4 w-4" />
                      ) : (
                        <EyeOff className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDuplicateCard(card)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingCard(card)}
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                    {card.isRemovable && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemoveCard(card.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Add New Card Dialog */}
      <Dialog open={showAddCard} onOpenChange={setShowAddCard}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Advanced Dashboard Card</DialogTitle>
            <DialogDescription>
              Create a new dashboard card with advanced features like comparisons, dynamic filters, and external data integration
            </DialogDescription>
          </DialogHeader>
          
          <EnhancedCardCreator
            card={newCard}
            onCardChange={setNewCard}
            onSave={handleAddCard}
            onCancel={() => setShowAddCard(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Card Dialog */}
      <Dialog open={!!editingCard} onOpenChange={(open) => {
        if (!open) {
          setEditingCard(null);
          setPendingUpdates(null);
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Dashboard Card</DialogTitle>
            <DialogDescription>
              Modify the card configuration and advanced features
            </DialogDescription>
          </DialogHeader>
          
          {editingCard && (
            <EnhancedCardCreator
              card={{ ...editingCard, ...pendingUpdates }}
              onCardChange={(updatedCard) => {
                const newUpdates = {
                  ...pendingUpdates,
                  ...updatedCard,
                  config: {
                    ...editingCard.config,
                    ...pendingUpdates?.config,
                    ...updatedCard.config
                  }
                };
                setPendingUpdates(newUpdates);
              }}
              onSave={() => {
                const finalCard = {
                  ...editingCard,
                  ...pendingUpdates,
                  config: {
                    ...editingCard.config,
                    ...pendingUpdates?.config
                  }
                } as EnhancedDashboardCard;
                
                handleUpdateCard(finalCard);
                setEditingCard(null);
                setPendingUpdates(null);
              }}
              onCancel={() => {
                setEditingCard(null);
                setPendingUpdates(null);
              }}
              isEditing={true}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Widget Import/Management Dialog */}
      <Dialog open={showWidgetImport} onOpenChange={setShowWidgetImport}>
        <DialogContent className="max-w-6xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Eye className="h-5 w-5" />
              <span>Widget Visibility</span>
            </DialogTitle>
            <DialogDescription>
              Control widget visibility across the platform. Toggle show/hide for widgets to manage what appears on dashboards.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {widgetsLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                <span>Loading widgets...</span>
              </div>
            ) : globalWidgets.length === 0 ? (
              <Card className="border-dashed border-2 border-gray-300">
                <CardContent className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <Globe className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-4">No widgets available</p>
                    <p className="text-sm text-gray-500">Create widgets in Widget Manager first</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline">
                      {globalWidgets.filter(w => w.isActive).length} of {globalWidgets.length} widgets visible
                    </Badge>
                  </div>
                </div>

                <div className="space-y-3">
                  {globalWidgets.map((widget) => (
                    <Card 
                      key={widget.id} 
                      className={`transition-all ${
                        widget.isActive 
                          ? 'bg-green-50 border-green-200' 
                          : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className={`p-2 rounded ${
                              widget.isActive ? 'bg-green-100' : 'bg-gray-100'
                            }`}>
                              {widget.isActive ? (
                                <Eye className="h-4 w-4 text-green-600" />
                              ) : (
                                <EyeOff className="h-4 w-4 text-gray-400" />
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-1">
                                <h5 className="font-medium">{widget.name}</h5>
                                <Badge variant="outline" className="text-xs">
                                  {widget.pluginName}
                                </Badge>
                                <Badge variant="secondary" className="text-xs">
                                  {widget.widgetType}
                                </Badge>
                                <Badge 
                                  variant={widget.isActive ? "default" : "secondary"}
                                  className="text-xs"
                                >
                                  {widget.isActive ? "Visible" : "Hidden"}
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-600">
                                {widget.description || 'No description provided'}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <Button
                              variant={widget.isActive ? "outline" : "default"}
                              size="sm"
                              onClick={() => handleToggleWidgetVisibility(widget)}
                              disabled={isLoading}
                              className={widget.isActive ? "text-red-600 hover:text-red-700" : ""}
                            >
                              {isLoading ? (
                                <>
                                  <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                                  Updating...
                                </>
                              ) : widget.isActive ? (
                                <>
                                  <EyeOff className="h-4 w-4 mr-1" />
                                  Hide
                                </>
                              ) : (
                                <>
                                  <Eye className="h-4 w-4 mr-1" />
                                  Show
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}

// Card Creator/Editor Form Component
interface CardCreatorFormProps {
  card: Partial<EnhancedDashboardCard>;
  onCardChange: (card: Partial<EnhancedDashboardCard>) => void;
  onSave: () => void;
  onCancel: () => void;
  getFieldsForDataSource: (dataSource: string) => string[];
  isEditing?: boolean;
}

function CardCreatorForm({ 
  card, 
  onCardChange, 
  onSave, 
  onCancel, 
  getFieldsForDataSource,
  isEditing = false 
}: CardCreatorFormProps) {
  const updateCard = (updates: Partial<EnhancedDashboardCard>) => {
    onCardChange({ ...card, ...updates });
  };

  const updateConfig = (configUpdates: Partial<EnhancedDashboardCard['config']>) => {
    updateCard({
      config: { ...card.config, ...configUpdates }
    });
  };

  // Helper functions for the dynamic filters
  const getOperators = () => [
    { value: '=', label: 'Equals' },
    { value: '!=', label: 'Not equals' },
    { value: '>', label: 'Greater than' },
    { value: '<', label: 'Less than' },
    { value: '>=', label: 'Greater or equal' },
    { value: '<=', label: 'Less or equal' },
    { value: 'contains', label: 'Contains' },
    { value: 'starts_with', label: 'Starts with' },
    { value: 'ends_with', label: 'Ends with' }
  ];

  const getDatePresets = () => [
    { value: '1D', label: 'Last 1 Day' },
    { value: '3D', label: 'Last 3 Days' },
    { value: '7D', label: 'Last 7 Days' },
    { value: '10D', label: 'Last 10 Days' },
    { value: '30D', label: 'Last 30 Days' },
    { value: '1M', label: 'Last 1 Month' },
    { value: '3M', label: 'Last 3 Months' },
    { value: '6M', label: 'Last 6 Months' },
    { value: '12M', label: 'Last 12 Months' }
  ];

  const isDateField = (field: string) => {
    return field.includes('date') || field.includes('created_at') || field.includes('updated_at');
  };

  const isNumberField = (field: string) => {
    return ['value', 'price', 'amount', 'revenue', 'total_licenses', 'used_licenses', 'available_licenses'].includes(field);
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="basic">Basic Settings</TabsTrigger>
          <TabsTrigger value="data">Data & Comparison</TabsTrigger>
          <TabsTrigger value="visualization">Visualization</TabsTrigger>
        </TabsList>
        
        <TabsContent value="basic" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="card-title">Card Title</Label>
              <Input
                id="card-title"
                value={card.title || ''}
                onChange={(e) => updateCard({ title: e.target.value })}
                placeholder="e.g., Contract Revenue vs License Pool Usage"
              />
            </div>
            
            <div>
              <Label htmlFor="card-type">Card Type</Label>
              <Select 
                value={card.type || 'metric'} 
                onValueChange={(value: any) => updateCard({ type: value })}
              >
                <SelectTrigger id="card-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="metric">Metric</SelectItem>
                  <SelectItem value="chart">Chart</SelectItem>
                  <SelectItem value="comparison">Comparison</SelectItem>
                  <SelectItem value="pool-comparison">Pool Comparison</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="card-size">Card Size</Label>
              <Select 
                value={card.size || 'small'} 
                onValueChange={(value: any) => updateCard({ size: value })}
              >
                <SelectTrigger id="card-size">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">Small</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="large">Large</SelectItem>
                  <SelectItem value="xlarge">Extra Large</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="card-color">Color Theme</Label>
              <Select 
                value={card.config?.color || 'blue'} 
                onValueChange={(value) => updateConfig({ color: value })}
              >
                <SelectTrigger id="card-color">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="blue">Blue</SelectItem>
                  <SelectItem value="green">Green</SelectItem>
                  <SelectItem value="red">Red</SelectItem>
                  <SelectItem value="purple">Purple</SelectItem>
                  <SelectItem value="orange">Orange</SelectItem>
                  <SelectItem value="gray">Gray</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="data" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="data-source">Primary Data Source</Label>
              <Select 
                value={card.dataSource || 'clients'} 
                onValueChange={(value) => updateCard({ dataSource: value })}
              >
                <SelectTrigger id="data-source">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DATABASE_SOURCES.map(source => (
                    <SelectItem key={source.value} value={source.value}>
                      {source.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="aggregation">Aggregation</Label>
              <Select 
                value={typeof card.config?.aggregation === 'string' ? card.config.aggregation : 'count'} 
                onValueChange={(value) => updateConfig({ aggregation: value as 'count' | 'sum' | 'average' | 'max' | 'min' })}
              >
                <SelectTrigger id="aggregation">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AGGREGATION_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="format">Value Format</Label>
              <Select 
                value={card.config?.format || 'number'} 
                onValueChange={(value) => updateConfig({ format: value as 'number' | 'currency' | 'percentage' })}
              >
                <SelectTrigger id="format">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FORMAT_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="group-by">Group By Field</Label>
              <Select 
                value={card.config?.groupBy || 'any'} 
                onValueChange={(value) => updateConfig({ groupBy: value === 'any' ? undefined : value })}
              >
                <SelectTrigger id="group-by">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">None</SelectItem>
                  {getFieldsForDataSource(card.dataSource || 'clients').map(field => (
                    <SelectItem key={field} value={field}>
                      {field}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Comparison Settings */}
          <div className="space-y-4">
            <h5 className="font-medium text-sm text-gray-700">External Data Comparison</h5>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="compare-with">Compare With Data Source</Label>
                <Select 
                  value={card.config?.compareWith || 'any'} 
                  onValueChange={(value) => updateConfig({ compareWith: value === 'any' ? undefined : value })}
                >
                  <SelectTrigger id="compare-with">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">None</SelectItem>
                    {DATABASE_SOURCES.map(source => (
                      <SelectItem key={source.value} value={source.value}>
                        {source.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {card.config?.compareWith && (
                <div>
                  <Label htmlFor="comparison-type">Comparison Type</Label>
                  <Select 
                    value={card.config?.comparisonType || 'vs'} 
                    onValueChange={(value) => updateConfig({ comparisonType: value as 'vs' | 'ratio' | 'diff' | 'trend' })}
                  >
                    <SelectTrigger id="comparison-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COMPARISON_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>

          {/* Dynamic Filters */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h5 className="font-medium text-sm text-gray-700">Dynamic Filters</h5>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const currentFilters = card.config?.dynamicFilters || [];
                  updateConfig({
                    dynamicFilters: [
                      ...currentFilters,
                      { field: '', operator: '=', value: '' }
                    ]
                  });
                }}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Filter
              </Button>
            </div>

            {card.config?.dynamicFilters && card.config.dynamicFilters.length > 0 && (
              <div className="space-y-3">
                {card.config.dynamicFilters.map((filter, index) => (
                  <div key={index} className="grid grid-cols-4 gap-2 items-end">
                    <div>
                      <Label className="text-xs">Field</Label>
                      <Select
                        value={filter.field || 'any'}
                        onValueChange={(value) => {
                          const newFilters = [...(card.config?.dynamicFilters || [])];
                          newFilters[index] = { ...filter, field: value === 'any' ? '' : value };
                          updateConfig({ dynamicFilters: newFilters });
                        }}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="any">Select field</SelectItem>
                          {getFieldsForDataSource(card.dataSource || 'clients').map(field => (
                            <SelectItem key={field} value={field}>
                              {field}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-xs">Operator</Label>
                      <Select
                        value={filter.operator || '='}
                        onValueChange={(value) => {
                          const newFilters = [...(card.config?.dynamicFilters || [])];
                          newFilters[index] = { ...filter, operator: value };
                          updateConfig({ dynamicFilters: newFilters });
                        }}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {getOperators().map(op => (
                            <SelectItem key={op.value} value={op.value}>
                              {op.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-xs">Value</Label>
                      {isDateField(filter.field) ? (
                        <Select
                          value={filter.value || 'any'}
                          onValueChange={(value) => {
                            const newFilters = [...(card.config?.dynamicFilters || [])];
                            newFilters[index] = { ...filter, value: value === 'any' ? '' : value };
                            updateConfig({ dynamicFilters: newFilters });
                          }}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="any">Select period</SelectItem>
                            {getDatePresets().map(preset => (
                              <SelectItem key={preset.value} value={preset.value}>
                                {preset.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : isNumberField(filter.field) ? (
                        <Input
                          type="number"
                          placeholder="Enter number"
                          value={filter.value}
                          onChange={(e) => {
                            const newFilters = [...(card.config?.dynamicFilters || [])];
                            newFilters[index] = { ...filter, value: e.target.value };
                            updateConfig({ dynamicFilters: newFilters });
                          }}
                          className="h-8"
                        />
                      ) : (
                        <Input
                          placeholder="Enter value"
                          value={filter.value}
                          onChange={(e) => {
                            const newFilters = [...(card.config?.dynamicFilters || [])];
                            newFilters[index] = { ...filter, value: e.target.value };
                            updateConfig({ dynamicFilters: newFilters });
                          }}
                          className="h-8"
                        />
                      )}
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newFilters = card.config?.dynamicFilters?.filter((_, i) => i !== index) || [];
                        updateConfig({ dynamicFilters: newFilters });
                      }}
                      className="h-8 w-8 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="visualization" className="space-y-4">
          {(card.type === 'chart' || card.type === 'comparison') && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="chart-type">Chart Type</Label>
                <Select 
                  value={card.config?.chartType || 'bar'} 
                  onValueChange={(value) => updateConfig({ chartType: value as any })}
                >
                  <SelectTrigger id="chart-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CHART_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <h5 className="font-medium text-sm text-gray-700">Chart Options</h5>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="show-legend"
                      checked={card.config?.showLegend !== false}
                      onChange={(e) => updateConfig({ showLegend: e.target.checked })}
                    />
                    <Label htmlFor="show-legend" className="text-sm">Show Legend</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="show-data-labels"
                      checked={card.config?.showDataLabels === true}
                      onChange={(e) => updateConfig({ showDataLabels: e.target.checked })}
                    />
                    <Label htmlFor="show-data-labels" className="text-sm">Show Data Labels</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="enable-drill-down"
                      checked={card.config?.enableDrillDown === true}
                      onChange={(e) => updateConfig({ enableDrillDown: e.target.checked })}
                    />
                    <Label htmlFor="enable-drill-down" className="text-sm">Enable Drill Down</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="show-trend"
                      checked={card.config?.trend === true}
                      onChange={(e) => updateConfig({ trend: e.target.checked })}
                    />
                    <Label htmlFor="show-trend" className="text-sm">Show Trend</Label>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <h5 className="font-medium text-sm text-gray-700">Advanced Options</h5>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="refresh-interval">Refresh Interval (seconds)</Label>
                <Input
                  id="refresh-interval"
                  type="number"
                  min="30"
                  value={card.config?.refreshInterval || 300}
                  onChange={(e) => updateConfig({ refreshInterval: parseInt(e.target.value) || 300 })}
                  placeholder="300"
                />
              </div>

              <div>
                <Label htmlFor="time-range">Time Range</Label>
                <Select 
                  value={card.config?.timeRange || 'monthly'} 
                  onValueChange={(value) => updateConfig({ timeRange: value as any })}
                >
                  <SelectTrigger id="time-range">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_RANGES.map(range => (
                      <SelectItem key={range.value} value={range.value}>
                        {range.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <Separator />

      <div className="flex justify-end space-x-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={onSave} disabled={!card.title}>
          {isEditing ? 'Update Card' : 'Add Card'}
        </Button>
      </div>
    </div>
  );
}