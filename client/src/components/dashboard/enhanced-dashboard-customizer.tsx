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
  RotateCcw
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';

// Enhanced card configuration interface
export interface EnhancedDashboardCard {
  id: string;
  title: string;
  type: 'metric' | 'chart' | 'comparison' | 'external' | 'pool-comparison';
  category: 'dashboard' | 'kpi' | 'comparison' | 'external';
  dataSource: string;
  size: 'small' | 'medium' | 'large' | 'xlarge';
  visible: boolean;
  position: number;
  config: {
    icon?: string;
    color?: string;
    format?: 'number' | 'currency' | 'percentage';
    aggregation?: 'count' | 'sum' | 'average' | 'max' | 'min';
    chartType?: 'line' | 'bar' | 'pie' | 'doughnut' | 'area' | 'radar' | 'scatter';
    filters?: Record<string, any>;
    trend?: boolean;
    // Comparison features
    compareWith?: string; // Data source to compare with
    comparisonType?: 'vs' | 'ratio' | 'diff' | 'trend';
    comparisonField?: string; // Field to compare
    timeRange?: 'daily' | 'weekly' | 'monthly' | 'yearly';
    groupBy?: string; // Field to group data by
    // External system integration
    externalSystemId?: number;
    externalDataSourceId?: number;
    customApiEndpoint?: string;
    refreshInterval?: number; // In seconds
    // Advanced options
    showLegend?: boolean;
    showDataLabels?: boolean;
    enableDrillDown?: boolean;
    customColors?: string[];
    // Integration Engine specific properties
    integrationEngineId?: string;
    integrationEngineData?: {
      originalWidget: any;
      apiEndpoint?: string;
      dataSource?: string;
      component?: string;
      metadata?: any;
    };
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
  const [editingCard, setEditingCard] = useState<EnhancedDashboardCard | null>(null);
  const [showAddCard, setShowAddCard] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
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

  // Fetch external systems and data sources
  const { data: externalSystems = [] } = useQuery({
    queryKey: ['external-systems'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/external-systems');
      return response.json();
    }
  });

  const { data: externalDataSources = [] } = useQuery({
    queryKey: ['external-data-sources'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/data-sources');
      return response.json();
    }
  });

  // Fetch Integration Engine widget templates from database
  const { data: integrationEngineWidgets = [] } = useQuery({
    queryKey: ['integration-engine-widget-templates'],
    queryFn: async () => {
      try {
        console.log('🔌 Fetching Integration Engine widget templates from database...');
        
        // Get widgets from our local database (externalWidgetTemplates table)
        const response = await fetch('/api/integration-engine/widget-templates');
        const data = await response.json();
        
        console.log('🔌 Integration Engine widget templates fetched:', data);
        
        // Return the widgets array from the response
        return data.widgets || [];
      } catch (error) {
        console.error('Failed to fetch Integration Engine widget templates:', error);
        return [];
      }
    }
  });

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

  const handleImportWidget = (widget: any) => {
    // Convert Integration Engine widget to Dashboard Customizer card
    // Use ALL the existing configuration from Integration Engine widget
    const visualConfig = widget.visualConfig || {};
    const queryConfig = widget.queryConfig || {};
    
    const importedCard: EnhancedDashboardCard = {
      id: `imported-${widget.id}-${Date.now()}`,
      title: widget.name,
      // Use the EXACT type and configuration from Integration Engine
      type: widget.type, // chart, table, metric, etc.
      category: 'integration-engine',
      dataSource: 'integration-engine',
      size: visualConfig.height > 400 ? 'large' : visualConfig.height > 250 ? 'medium' : 'small',
      visible: true,
      position: cards.length,
      config: {
        // Use Integration Engine configuration directly
        icon: widget.type === 'chart' ? 'BarChart3' : widget.type === 'table' ? 'Table' : widget.type === 'metric' ? 'TrendingUp' : 'ExternalLink',
        
        // Chart configuration from Integration Engine
        chartType: visualConfig.chartType || 'bar', // bar, line, pie, doughnut
        colors: visualConfig.colors || ['#3b82f6', '#1e40af', '#60a5fa', '#93c5fd'],
        showLegend: visualConfig.showLegend !== undefined ? visualConfig.showLegend : true,
        showGrid: visualConfig.showGrid !== undefined ? visualConfig.showGrid : true,
        height: visualConfig.height || 300,
        
        // Data configuration from Integration Engine  
        systemId: widget.systemId,
        endpoint: queryConfig.endpoint,
        method: queryConfig.method || 'GET',
        params: queryConfig.params || {},
        refreshInterval: queryConfig.refreshInterval || 60,
        
        // Dashboard display settings
        format: 'number',
        aggregation: 'count',
        color: 'blue', // For metric cards
        showDataLabels: false,
        enableDrillDown: true,
        
        // Store original Integration Engine widget metadata - IMPORTANT for rendering
        integrationEngineId: widget.id,
        integrationEngineSystemId: widget.systemId,
        integrationEngineData: {
          originalWidget: widget,
          name: widget.name,
          description: widget.description,
          type: widget.type,
          visualConfig: visualConfig,
          queryConfig: queryConfig,
          isActive: widget.isActive
        }
      },
      isBuiltIn: false,
      isRemovable: true
    };

    onCardsChange([...cards, importedCard]);
    setShowImportDialog(false);
    
    toast({
      title: "✅ Pre-configured Widget Imported",
      description: `"${widget.name}" imported with ${widget.type} type, ${visualConfig.chartType || 'default'} chart, and ${visualConfig.colors?.length || 4} colors - ready to use!`
    });
  };

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
          <Button variant="outline" onClick={() => setShowImportDialog(true)}>
            <ExternalLink className="h-4 w-4 mr-2" />
            Import from Integration Engine
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
                        {card.config.externalDataSourceId && (
                          <>
                            <span>•</span>
                            <Badge variant="secondary" className="text-xs">
                              <ExternalLink className="h-3 w-3 mr-1" />
                              External
                            </Badge>
                          </>
                        )}
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
            externalSystems={externalSystems}
            externalDataSources={externalDataSources}
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
              externalSystems={externalSystems}
              externalDataSources={externalDataSources}
              getFieldsForDataSource={getFieldsForDataSource}
              isEditing
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Import from Integration Engine Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import Widgets from Integration Engine</DialogTitle>
            <DialogDescription>
              Select widgets from your Integration Engine to add to the main dashboard
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {integrationEngineWidgets.length === 0 ? (
              <div className="text-center py-8">
                <ExternalLink className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No widgets found</h3>
                <p className="text-gray-600 mb-4">
                  You haven't created any widgets in the Integration Engine yet.
                </p>
                <Button variant="outline" onClick={() => setShowImportDialog(false)}>
                  Go to Integration Engine
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {integrationEngineWidgets.map((widget: any) => (
                  <Card key={widget.id} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium">{widget.name}</CardTitle>
                        <Badge variant="secondary">{widget.type}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-2 text-sm text-gray-600 mb-3">
                        <p className="text-xs">{widget.description}</p>
                        
                        {/* Show pre-configured settings */}
                        <div className="bg-green-50 rounded-lg p-3 space-y-2">
                          <h4 className="text-sm font-medium text-green-900 flex items-center gap-1">
                            <span className="text-green-600">✅</span> Pre-configured Settings:
                          </h4>
                          <div className="grid grid-cols-1 gap-1 text-xs">
                            {widget.visualConfig?.chartType && (
                              <div className="flex items-center gap-1">
                                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                <span>Chart: {widget.visualConfig.chartType}</span>
                              </div>
                            )}
                            {widget.visualConfig?.colors && (
                              <div className="flex items-center gap-1">
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                <span>Colors: {widget.visualConfig.colors.length} preset themes</span>
                              </div>
                            )}
                            {widget.queryConfig?.endpoint && (
                              <div className="flex items-center gap-1">
                                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                                <span>API: {widget.queryConfig.endpoint}</span>
                              </div>
                            )}
                            {widget.queryConfig?.refreshInterval && (
                              <div className="flex items-center gap-1">
                                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                                <span>Refresh: {widget.queryConfig.refreshInterval}s</span>
                              </div>
                            )}
                            <div className="flex items-center gap-1">
                              <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                              <span>Type: {widget.type}</span>
                            </div>
                          </div>
                          <p className="text-xs text-green-700 font-medium">
                            🎯 Import ready - no additional setup required!
                          </p>
                        </div>
                        
                        {widget.dataSource && (
                          <div className="flex items-center gap-2">
                            <Database className="h-4 w-4" />
                            <span>Data Source: {widget.dataSource}</span>
                          </div>
                        )}
                        {widget.metadata && (
                        <div className="flex items-center gap-2">
                            <Badge variant="outline">
                              {widget.metadata.category}
                          </Badge>
                            {widget.metadata.featured && (
                              <Badge variant="default">
                                Featured
                              </Badge>
                            )}
                        </div>
                        )}
                      </div>
                      <Button 
                        className="w-full" 
                        onClick={() => handleImportWidget(widget)}
                        disabled={cards.some(card => card.config?.integrationEngineId === widget.id)}
                      >
                        {cards.some(card => card.config?.integrationEngineId === widget.id) ? "✅ Already Imported" : "🚀 Import Pre-configured Widget"}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
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
  externalSystems: any[];
  externalDataSources: any[];
  getFieldsForDataSource: (dataSource: string) => string[];
  isEditing?: boolean;
}

function CardCreatorForm({ 
  card, 
  onCardChange, 
  onSave, 
  onCancel, 
  externalSystems, 
  externalDataSources, 
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
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="basic">Basic Settings</TabsTrigger>
          <TabsTrigger value="data">Data & Comparison</TabsTrigger>
          <TabsTrigger value="visualization">Visualization</TabsTrigger>
          <TabsTrigger value="external">External Sources</TabsTrigger>
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
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="metric">Metric</SelectItem>
                  <SelectItem value="chart">Chart</SelectItem>
                  <SelectItem value="comparison">Comparison</SelectItem>
                  <SelectItem value="pool-comparison">Pool Comparison</SelectItem>
                  <SelectItem value="external">External Data</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="card-size">Card Size</Label>
              <Select 
                value={card.size || 'small'} 
                onValueChange={(value: any) => updateCard({ size: value })}
              >
                <SelectTrigger>
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
                <SelectTrigger>
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
                <SelectTrigger>
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
                value={card.config?.aggregation || 'count'} 
                onValueChange={(value) => updateConfig({ aggregation: value as 'count' | 'sum' | 'average' | 'max' | 'min' })}
              >
                <SelectTrigger>
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
                    <SelectTrigger>
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
                    <SelectTrigger>
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
                <SelectTrigger>
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
                <SelectTrigger>
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
                <SelectTrigger>
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
        
        <TabsContent value="external" className="space-y-4">
          <div className="space-y-4">
            <div>
              <Label htmlFor="external-system">External System</Label>
              <Select 
                value={card.config?.externalSystemId?.toString() || ''} 
                onValueChange={(value) => updateConfig({ 
                  externalSystemId: value ? parseInt(value) : undefined 
                })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select external system (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {externalSystems.map(system => (
                    <SelectItem key={system.id} value={system.id.toString()}>
                      {system.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="external-data-source">External Data Source</Label>
              <Select 
                value={card.config?.externalDataSourceId?.toString() || ''} 
                onValueChange={(value) => updateConfig({ 
                  externalDataSourceId: value ? parseInt(value) : undefined 
                })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select external data source (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {externalDataSources.map(source => (
                    <SelectItem key={source.id} value={source.id.toString()}>
                      {source.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="custom-api">Custom API Endpoint</Label>
              <Input
                id="custom-api"
                value={card.config?.customApiEndpoint || ''}
                onChange={(e) => updateConfig({ customApiEndpoint: e.target.value })}
                placeholder="https://api.example.com/data"
              />
            </div>
            
            <div>
              <Label htmlFor="refresh-interval">Refresh Interval (seconds)</Label>
              <Input
                id="refresh-interval"
                type="number"
                value={card.config?.refreshInterval || 300}
                onChange={(e) => updateConfig({ refreshInterval: parseInt(e.target.value) || 300 })}
                min="30"
                max="3600"
              />
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