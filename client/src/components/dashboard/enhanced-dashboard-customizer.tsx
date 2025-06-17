import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
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
  Zap,
  ExternalLink,
  RotateCcw,
  Import,
  Eye,
  Grid,
  Table as TableIcon,
  Gauge,
  List,
  Code
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';

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

interface EnhancedDashboardCustomizerProps {
  cards: EnhancedDashboardCard[];
  onCardsChange: (cards: EnhancedDashboardCard[]) => void;
  onClose: () => void;
}

export function EnhancedDashboardCustomizer({ cards, onCardsChange, onClose }: EnhancedDashboardCustomizerProps) {
  const { toast } = useToast();
  const [editingCard, setEditingCard] = useState<EnhancedDashboardCard | null>(null);
  const [showAddCard, setShowAddCard] = useState(false);
  const [showWidgetImport, setShowWidgetImport] = useState(false);
  const [selectedWidget, setSelectedWidget] = useState<GlobalWidget | null>(null);

  const [pendingUpdates, setPendingUpdates] = useState<Partial<EnhancedDashboardCard> | null>(null);
  const [newCard, setNewCard] = useState<Partial<EnhancedDashboardCard>>({
    title: '',
    type: 'metric',
    category: 'dashboard',
    dataSource: 'clients',
    size: 'small',
    visible: true,
    config: {
      icon: 'Building',
      color: 'blue',
      format: 'number',
      aggregation: 'count',
      chartType: 'bar',
      trend: false,
      showLegend: true,
      showDataLabels: false,
      enableDrillDown: true,
      refreshInterval: 300
    },
    isBuiltIn: false,
    isRemovable: true
  });

  // Fetch available widgets for import
  const { data: availableWidgets = [], isLoading: widgetsLoading } = useQuery<GlobalWidget[]>({
    queryKey: ['global-widgets'],
    queryFn: async () => {
      const response = await fetch('/api/widgets/manage', {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch widgets');
      }
      return response.json();
    },
    staleTime: 30000, // 30 seconds
  });

  // External systems functionality has been disabled
  // External systems removed - deprecated

  // Integration Engine functionality has been removed - deprecated

  // Available fields for each data source (dynamic based on selection)
  const getFieldsForDataSource = (dataSource: string) => {
    const fieldMap: Record<string, string[]> = {
      'clients': ['name', 'status', 'industry', 'companySize', 'createdAt'],
      'contracts': ['status', 'totalValue', 'startDate', 'endDate', 'autoRenewal'],
      'license_pools': ['type', 'totalLicenses', 'availableLicenses', 'utilization'],
      'services': ['category', 'deliveryModel', 'basePrice', 'isActive'],
      'hardware_assets': ['type', 'status', 'assignedTo', 'purchaseDate', 'warrantyExpiry'],
      'financial_transactions': ['type', 'amount', 'status', 'dueDate'],
      'users': ['role', 'isActive', 'authProvider', 'createdAt'],
      'audit_logs': ['action', 'entityType', 'userId', 'timestamp']
    };
    return fieldMap[dataSource] || ['id', 'createdAt', 'updatedAt'];
  };

  const handleAddCard = () => {
    if (!newCard.title) {
      toast({
        title: "Error",
        description: "Please enter a card title",
        variant: "destructive"
      });
      return;
    }

    const cardToAdd: EnhancedDashboardCard = {
      ...newCard as EnhancedDashboardCard,
      id: `custom-${Date.now()}`,
      position: cards.length
    };

    onCardsChange([...cards, cardToAdd]);
    setShowAddCard(false);
    setNewCard({
      title: '',
      type: 'metric',
      category: 'dashboard',
      dataSource: 'clients',
      size: 'small',
      visible: true,
      config: {
        icon: 'Building',
        color: 'blue',
        format: 'number',
        aggregation: 'count',
        chartType: 'bar',
        trend: false,
        showLegend: true,
        showDataLabels: false,
        enableDrillDown: true,
        refreshInterval: 300
      },
      isBuiltIn: false,
      isRemovable: true
    });

    toast({
      title: "Success",
      description: "Dashboard card added successfully"
    });
  };

  const handleUpdateCard = (updatedCard: EnhancedDashboardCard) => {
    console.log('=== ENHANCED DASHBOARD CUSTOMIZER: handleUpdateCard ===');
    console.log('Updated card:', updatedCard);
    console.log('Updated card config:', updatedCard.config);
    
    const updatedCards = cards.map(card => 
      card.id === updatedCard.id ? updatedCard : card
    );
    
    console.log('All updated cards:', updatedCards);
    
    // Immediately update parent state
    onCardsChange(updatedCards);
    setEditingCard(null);
    
    toast({
      title: "Success",
      description: "Dashboard card updated successfully"
    });
  };

  const handleRemoveCard = (cardId: string) => {
    const updatedCards = cards.filter(card => card.id !== cardId);
    onCardsChange(updatedCards);
    
    toast({
      title: "Success",
      description: "Dashboard card removed successfully"
    });
  };

  const handleDuplicateCard = (card: EnhancedDashboardCard) => {
    const duplicatedCard: EnhancedDashboardCard = {
      ...card,
      id: `${card.id}-copy-${Date.now()}`,
      title: `${card.title} (Copy)`,
      position: cards.length
    };
    
    onCardsChange([...cards, duplicatedCard]);
    
    toast({
      title: "Success",
      description: "Dashboard card duplicated successfully"
    });
  };

  const handleImportWidget = () => {
    if (!selectedWidget) {
      toast({
        title: "Error",
        description: "Please select a widget to import",
        variant: "destructive"
      });
      return;
    }

    // Use the widget's existing configuration instead of overriding with defaults
    const widgetCard: EnhancedDashboardCard = {
      id: `widget-${selectedWidget.id}`,
      title: selectedWidget.name,
      type: selectedWidget.widgetType as 'metric' | 'chart' | 'comparison' | 'pool-comparison' | 'widget', // Use actual widget type
      category: 'widget',
      dataSource: 'widget', // Special data source for widget cards
      size: getSizeFromDisplayConfig(selectedWidget.displayConfig), // Use widget's size configuration
      visible: true,
      position: cards.length,
      config: {
        icon: getWidgetIcon(selectedWidget.widgetType),
        color: 'blue',
        format: 'number',
        // Use widget's existing chart type if available
        chartType: selectedWidget.chartType || getDefaultChartType(selectedWidget.widgetType),
        // Import all widget-specific configuration without overriding
        widgetId: selectedWidget.id,
        widgetType: selectedWidget.widgetType,
        pluginName: selectedWidget.pluginName,
        instanceId: selectedWidget.systemId.toString(),
        refreshInterval: selectedWidget.refreshInterval || 30,
        // Preserve the widget's display configuration
        ...selectedWidget.displayConfig,
        // Ensure these critical fields are preserved
        name: selectedWidget.name,
        showLegend: selectedWidget.displayConfig?.showLegend ?? true,
        showDataLabels: selectedWidget.displayConfig?.showDataLabels ?? false,
        enableDrillDown: selectedWidget.displayConfig?.enableDrillDown ?? true
      },
      isBuiltIn: false,
      isRemovable: true
    };

    onCardsChange([...cards, widgetCard]);
    setShowWidgetImport(false);
    setSelectedWidget(null);
    
    toast({
      title: "Success",
      description: `Widget "${selectedWidget.name}" imported with its existing configuration`
    });
  };

  const getWidgetIcon = (widgetType: string): string => {
    switch (widgetType) {
      case 'table': return 'Table';
      case 'chart': return 'BarChart3';
      case 'metric': return 'Gauge';
      case 'list': return 'List';
      case 'gauge': return 'Gauge';
      case 'query': return 'Code';
      default: return 'Database';
    }
  };

  const getSizeFromDisplayConfig = (displayConfig: Record<string, any> | undefined): 'small' | 'medium' | 'large' | 'xlarge' => {
    const width = displayConfig?.width || 'medium';
    switch (width) {
      case 'quarter': return 'small';
      case 'third': return 'medium';
      case 'half': return 'large';
      case 'full': return 'xlarge';
      default: return 'medium';
    }
  };

  const getDefaultChartType = (widgetType: string): 'line' | 'bar' | 'pie' | 'doughnut' | 'area' | 'radar' | 'scatter' => {
    switch (widgetType) {
      case 'chart': return 'bar';
      case 'metric': return 'doughnut';
      case 'table': return 'bar';
      case 'list': return 'bar';
      case 'gauge': return 'doughnut';
      case 'query': return 'bar';
      default: return 'bar';
    }
  };

  const resetToDefaults = () => {
    // Reset to basic default cards
    const defaultCards: EnhancedDashboardCard[] = [
      {
        id: "default-clients",
        title: "Total Clients",
        type: "metric",
        category: "dashboard",
        dataSource: "clients",
        size: "small",
        visible: true,
        position: 0,
        config: {
          icon: "Building",
          color: "blue",
          format: "number",
          aggregation: "count"
        },
        isBuiltIn: true,
        isRemovable: true
      }
    ];
    
    onCardsChange(defaultCards);
    
    toast({
      title: "Success",
      description: "Dashboard reset to defaults"
    });
  };

      // Integration Engine import functionality has been removed - deprecated

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Dashboard Customizer</h3>
          <p className="text-sm text-gray-600">
            Create advanced dashboard cards with comparisons, charts, and external data
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={resetToDefaults}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          
          <Button variant="outline" onClick={() => setShowWidgetImport(true)}>
            <Import className="h-4 w-4 mr-2" />
            Import Widget
          </Button>

          <Button onClick={() => setShowAddCard(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Card
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
                                {/* External system references removed - deprecated */}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={card.visible}
                      onCheckedChange={(checked) => {
                        const updatedCard = { ...card, visible: checked };
                        const updatedCards = cards.map(c => 
                          c.id === updatedCard.id ? updatedCard : c
                        );
                        onCardsChange(updatedCards);
                        toast({
                          title: "Success",
                          description: `Card ${checked ? 'shown' : 'hidden'} successfully`,
                        });
                      }}
                    />
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
            <DialogTitle>Add Dashboard Card</DialogTitle>
            <DialogDescription>
              Create a new dashboard card with advanced features like comparisons and external data
            </DialogDescription>
          </DialogHeader>
          
          <CardCreatorForm
            card={newCard}
            onCardChange={setNewCard}
            onSave={handleAddCard}
            onCancel={() => setShowAddCard(false)}
            getFieldsForDataSource={getFieldsForDataSource}
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
            <CardCreatorForm
              card={{ ...editingCard, ...pendingUpdates }}
              onCardChange={(updatedCard) => {
                // Accumulate the updates properly, preserving all changes
                const newUpdates = {
                  ...pendingUpdates,
                  ...updatedCard,
                  config: {
                    ...editingCard.config,
                    ...pendingUpdates?.config,
                    ...updatedCard.config
                  }
                };
                
                console.log('=== EDIT DIALOG: onCardChange ===');
                console.log('Original card:', editingCard);
                console.log('Incoming updates:', updatedCard);
                console.log('Previous pending updates:', pendingUpdates);
                console.log('New accumulated updates:', newUpdates);
                
                setPendingUpdates(newUpdates);
              }}
              onSave={() => {
                // Merge original card with pending updates, ensuring config is properly merged
                const finalCard = {
                  ...editingCard,
                  ...pendingUpdates,
                  config: {
                    ...editingCard.config,
                    ...pendingUpdates?.config
                  }
                } as EnhancedDashboardCard;
                
                console.log('=== EDIT DIALOG: onSave ===');
                console.log('Original card:', editingCard);
                console.log('Pending updates:', pendingUpdates);
                console.log('Final merged card:', finalCard);
                console.log('Final card config:', finalCard.config);
                
                handleUpdateCard(finalCard);
                setPendingUpdates(null);
              }}
              onCancel={() => {
                setEditingCard(null);
                setPendingUpdates(null);
              }}
              getFieldsForDataSource={getFieldsForDataSource}
              isEditing
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Widget Import Dialog */}
      <WidgetImportDialog
        showWidgetImport={showWidgetImport}
        setShowWidgetImport={setShowWidgetImport}
        availableWidgets={availableWidgets}
        widgetsLoading={widgetsLoading}
        selectedWidget={selectedWidget}
        setSelectedWidget={setSelectedWidget}
        handleImportWidget={handleImportWidget}
      />

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
                placeholder="e.g., SIEM EPS Pool vs EDR Pool"
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
                  <SelectItem value="widget">Widget (Imported)</SelectItem>
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
            
            {(card.type === 'comparison' || card.type === 'pool-comparison') && (
              <>
                <div>
                  <Label htmlFor="compare-with">Compare With</Label>
                  <Select 
                    value={card.config?.compareWith || ''} 
                    onValueChange={(value) => updateConfig({ compareWith: value })}
                  >
                    <SelectTrigger id="compare-with">
                      <SelectValue placeholder="Select data source to compare" />
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
              </>
            )}
            
            <div>
              <Label htmlFor="format">Format</Label>
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
              <Label htmlFor="time-range">Time Range</Label>
              <Select 
                value={card.config?.timeRange || 'monthly'} 
                onValueChange={(value) => updateConfig({ timeRange: value as 'daily' | 'weekly' | 'monthly' | 'yearly' })}
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
          
          {card.dataSource && (
            <div>
              <Label htmlFor="group-by">Group By Field</Label>
              <Select 
                value={card.config?.groupBy || ''} 
                onValueChange={(value) => updateConfig({ groupBy: value })}
              >
                <SelectTrigger id="group-by">
                  <SelectValue placeholder="Select field to group by" />
                </SelectTrigger>
                <SelectContent>
                  {getFieldsForDataSource(card.dataSource).map(field => (
                    <SelectItem key={field} value={field}>
                      {field}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="visualization" className="space-y-4">
          {card.type === 'chart' && (
            <div>
              <Label htmlFor="chart-type">Chart Type</Label>
              <div className="grid grid-cols-3 gap-3 mt-2">
                {CHART_TYPES.map(chartType => {
                  const Icon = chartType.icon;
                  return (
                    <Card 
                      key={chartType.value}
                      className={`cursor-pointer transition-colors ${
                        card.config?.chartType === chartType.value 
                          ? 'ring-2 ring-blue-500 bg-blue-50' 
                          : 'hover:bg-gray-50'
                      }`}
                      onClick={() => updateConfig({ chartType: chartType.value as 'line' | 'bar' | 'pie' | 'doughnut' | 'area' | 'radar' | 'scatter' })}
                    >
                      <CardContent className="flex flex-col items-center p-4">
                        <Icon className="h-8 w-8 mb-2" />
                        <span className="text-sm font-medium">{chartType.label}</span>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              <Switch
                checked={card.config?.trend || false}
                onCheckedChange={(checked) => updateConfig({ trend: checked })}
              />
              <Label>Show Trend</Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                checked={card.config?.showLegend || false}
                onCheckedChange={(checked) => updateConfig({ showLegend: checked })}
              />
              <Label>Show Legend</Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                checked={card.config?.showDataLabels || false}
                onCheckedChange={(checked) => updateConfig({ showDataLabels: checked })}
              />
              <Label>Show Data Labels</Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                checked={card.config?.enableDrillDown || false}
                onCheckedChange={(checked) => updateConfig({ enableDrillDown: checked })}
              />
              <Label>Enable Drill Down</Label>
            </div>
          </div>
        </TabsContent>
      </Tabs>
      
      <Separator />
      
      <div className="flex justify-end space-x-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={onSave}>
          {isEditing ? 'Update Card' : 'Add Card'}
        </Button>
      </div>
      
    </div>
  );
}

// Additional Widget Import Dialog component at the end of file
export const WidgetImportDialog: React.FC<{
  showWidgetImport: boolean;
  setShowWidgetImport: (show: boolean) => void;
  availableWidgets: GlobalWidget[];
  widgetsLoading: boolean;
  selectedWidget: GlobalWidget | null;
  setSelectedWidget: (widget: GlobalWidget | null) => void;
  handleImportWidget: () => void;
}> = ({
  showWidgetImport,
  setShowWidgetImport,
  availableWidgets,
  widgetsLoading,
  selectedWidget,
  setSelectedWidget,
  handleImportWidget
}) => (
  <Dialog open={showWidgetImport} onOpenChange={setShowWidgetImport}>
    <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Import Widget to Dashboard</DialogTitle>
        <DialogDescription>
          Select a widget from your available widgets to add as a dashboard card
        </DialogDescription>
      </DialogHeader>
      
      <div className="space-y-4">
        {widgetsLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : availableWidgets.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-8">
              <Grid className="w-12 h-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Widgets Available</h3>
              <p className="text-gray-600 text-center mb-4">
                You haven't created any widgets yet. Create widgets in the Widget Manager first.
              </p>
              <Button variant="outline" onClick={() => setShowWidgetImport(false)}>
                Close
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
            {availableWidgets.filter((widget: GlobalWidget) => widget.isActive).map((widget: GlobalWidget) => (
              <Card 
                key={widget.id} 
                className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                  selectedWidget?.id === widget.id 
                    ? 'ring-2 ring-blue-500 bg-blue-50 border-blue-200' 
                    : 'hover:bg-gray-50'
                }`}
                onClick={() => setSelectedWidget(widget)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {widget.widgetType === 'table' && <TableIcon className="h-5 w-5 text-blue-600" />}
                      {widget.widgetType === 'chart' && <BarChart3 className="h-5 w-5 text-green-600" />}
                      {widget.widgetType === 'metric' && <Gauge className="h-5 w-5 text-purple-600" />}
                      {widget.widgetType === 'list' && <List className="h-5 w-5 text-orange-600" />}
                      {widget.widgetType === 'gauge' && <Gauge className="h-5 w-5 text-indigo-600" />}
                      {widget.widgetType === 'query' && <Code className="h-5 w-5 text-red-600" />}
                      <CardTitle className="text-base">{widget.name}</CardTitle>
                    </div>
                    <Badge variant={widget.isGlobal ? "default" : "secondary"}>
                      {widget.isGlobal ? "Global" : "Personal"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm text-gray-600 mb-3">{widget.description}</p>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span className="flex items-center space-x-1">
                      <Database className="h-3 w-3" />
                      <span>{widget.pluginName}</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <span>Refresh: {widget.refreshInterval}s</span>
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        
        {selectedWidget && (
          <Card className="mt-4 bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-sm text-blue-800">Selected Widget</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="font-medium">Name:</span> {selectedWidget.name}
                </div>
                <div>
                  <span className="font-medium">Type:</span> {selectedWidget.widgetType}
                </div>
                <div>
                  <span className="font-medium">Plugin:</span> {selectedWidget.pluginName}
                </div>
                <div>
                  <span className="font-medium">System:</span> {selectedWidget.systemName}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
      
      <div className="flex justify-end space-x-2 pt-4">
        <Button variant="outline" onClick={() => setShowWidgetImport(false)}>
          Cancel
        </Button>
        <Button 
          onClick={handleImportWidget}
          disabled={!selectedWidget}
        >
          <Import className="h-4 w-4 mr-2" />
          Import Widget
        </Button>
      </div>
    </DialogContent>
  </Dialog>
);