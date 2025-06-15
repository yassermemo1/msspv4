import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';

export interface DashboardCard {
  id: string;
  title: string;
  type: 'metric' | 'chart' | 'table' | 'custom' | 'builtin';
  category: 'dashboard' | 'kpi' | 'chart' | 'custom';
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
    name?: string;
    // External system integration
    // externalSystemId removed - deprecated
    customApiEndpoint?: string;
    refreshInterval?: number; // In seconds
    // Advanced options
    showLegend?: boolean;
    showDataLabels?: boolean;
    enableDrillDown?: boolean;
    customColors?: string[];
    colors?: string[];
  };
  isBuiltIn: boolean;
  isRemovable: boolean;
}

// Default cards for fallback when no user settings exist
const DEFAULT_DASHBOARD_CARDS: DashboardCard[] = [
  // Built-in KPI Cards
  {
    id: "builtin-new-clients",
    title: "New Clients",
    type: "builtin",
    category: "kpi",
    dataSource: "clients",
    size: "small",
    visible: true,
    position: 0,
    config: {
      icon: "Building",
      color: "blue",
      format: "number",
      aggregation: "count",
      trend: true
    },
    isBuiltIn: true,
    isRemovable: true,
  },
  {
    id: "builtin-contracts-signed",
    title: "Contracts Signed",
    type: "builtin",
    category: "kpi",
    dataSource: "contracts",
    size: "small",
    visible: true,
    position: 1,
    config: {
      icon: "FileText",
      color: "green",
      format: "number",
      aggregation: "count",
      trend: true
    },
    isBuiltIn: true,
    isRemovable: true,
  },
  {
    id: "builtin-period-revenue",
    title: "Period Revenue",
    type: "builtin",
    category: "kpi",
    dataSource: "contracts",
    size: "small",
    visible: true,
    position: 2,
    config: {
      icon: "DollarSign",
      color: "emerald",
      format: "currency",
      aggregation: "sum",
      trend: true
    },
    isBuiltIn: true,
    isRemovable: true,
  },
  {
    id: "builtin-tasks-progress",
    title: "Tasks Progress",
    type: "builtin",
    category: "kpi",
    dataSource: "tasks",
    size: "small",
    visible: true,
    position: 3,
    config: {
      icon: "Users",
      color: "purple",
      format: "number",
      aggregation: "count",
      trend: true
    },
    isBuiltIn: true,
    isRemovable: true,
  },
  // Dynamic Dashboard Cards
  {
    id: "total-clients",
    title: "Total Clients",
    type: "metric",
    category: "dashboard",
    dataSource: "clients",
    size: "small",
    visible: true,
    position: 4,
    config: {
      icon: "Building",
      color: "blue",
      format: "number",
      aggregation: "count"
    },
    isBuiltIn: false,
    isRemovable: true,
  },
  {
    id: "active-contracts",
    title: "Active Contracts",
    type: "metric",
    category: "dashboard",
    dataSource: "contracts",
    size: "small",
    visible: true,
    position: 5,
    config: {
      icon: "FileText",
      color: "green",
      format: "number",
      aggregation: "count",
      filters: { status: "active" }
    },
    isBuiltIn: false,
    isRemovable: true,
  },
  {
    id: "total-revenue",
    title: "Total Revenue",
    type: "metric",
    category: "dashboard",
    dataSource: "contracts",
    size: "small",
    visible: true,
    position: 6,
    config: {
      icon: "DollarSign",
      color: "emerald",
      format: "currency",
      aggregation: "sum"
    },
    isBuiltIn: false,
    isRemovable: true,
  },
  {
    id: "license-pools",
    title: "License Pools",
    type: "metric",
    category: "dashboard",
    dataSource: "license_pools",
    size: "small",
    visible: true,
    position: 7,
    config: {
      icon: "Server",
      color: "violet",
      format: "number",
      aggregation: "count"
    },
    isBuiltIn: false,
    isRemovable: true,
  },
];

export function useDashboardSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query for user dashboard settings
  const {
    data: cards = DEFAULT_DASHBOARD_CARDS,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['user-dashboard-settings', user?.id],
    queryFn: async () => {
      if (!user?.id) {
        return DEFAULT_DASHBOARD_CARDS;
      }

      try {
        const response = await apiRequest('GET', '/api/user-dashboard-settings');
        const settings = await response.json();
        
        // Transform database format to dashboard card format
        if (settings && settings.length > 0) {
          return settings.map((setting: any) => ({
            id: setting.cardId,
            title: setting.title,
            type: setting.type,
            category: setting.category,
            dataSource: setting.dataSource,
            size: setting.size,
            visible: setting.visible,
            position: setting.position,
            config: setting.config || {},
            isBuiltIn: setting.isBuiltIn,
            isRemovable: setting.isRemovable,
          })) as DashboardCard[];
        }
        
        return DEFAULT_DASHBOARD_CARDS;
      } catch (error) {
        console.error('Failed to load dashboard settings:', error);
        return DEFAULT_DASHBOARD_CARDS;
      }
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Mutation for saving dashboard settings
  const saveSettingsMutation = useMutation({
    mutationFn: async (cards: DashboardCard[]) => {
      const response = await apiRequest('POST', '/api/user-dashboard-settings', {
        cards: cards
      });
      return response.json();
    },
    onSuccess: () => {
      // Invalidate dashboard settings and related queries
      queryClient.invalidateQueries({ queryKey: ['user-dashboard-settings'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-card'] });
      queryClient.invalidateQueries({ queryKey: ['/api/global-widgets'] });
      
      // Force refetch to ensure immediate update
      queryClient.refetchQueries({ queryKey: ['user-dashboard-settings', user?.id] });
      
      toast({
        title: "Success",
        description: "Dashboard settings saved successfully!",
      });
    },
    onError: (error) => {
      console.error('Failed to save dashboard settings:', error);
      toast({
        title: "Error",
        description: "Failed to save dashboard settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Mutation for resetting dashboard settings
  const resetSettingsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/user-dashboard-settings/reset');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-dashboard-settings'] });
      toast({
        title: "Success",
        description: "Dashboard settings reset to defaults!",
      });
    },
    onError: (error) => {
      console.error('Failed to reset dashboard settings:', error);
      toast({
        title: "Error",
        description: "Failed to reset dashboard settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Mutation for updating a single card
  const updateCardMutation = useMutation({
    mutationFn: async ({ cardId, updates }: { cardId: string; updates: Partial<DashboardCard> }) => {
      const response = await apiRequest('PUT', `/api/user-dashboard-settings/${cardId}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-dashboard-settings'] });
    },
    onError: (error) => {
      console.error('Failed to update dashboard card:', error);
      toast({
        title: "Error",
        description: "Failed to update dashboard card. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Mutation for removing a card
  const removeCardMutation = useMutation({
    mutationFn: async (cardId: string) => {
      const response = await apiRequest('DELETE', `/api/user-dashboard-settings/${cardId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-dashboard-settings'] });
      toast({
        title: "Success",
        description: "Dashboard card removed successfully!",
      });
    },
    onError: (error) => {
      console.error('Failed to remove dashboard card:', error);
      toast({
        title: "Error",
        description: "Failed to remove dashboard card. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateCards = (newCards: DashboardCard[]) => {
    // Update cards immediately in query cache for optimistic updates
    queryClient.setQueryData(['user-dashboard-settings', user?.id], newCards);
  };

  const saveSettings = () => {
    if (cards) {
      saveSettingsMutation.mutate(cards);
      return true;
    }
    return false;
  };

  const saveCardsDirectly = (cardsToSave: DashboardCard[]) => {
    saveSettingsMutation.mutate(cardsToSave);
    return true;
  };

  const resetToDefaults = () => {
    resetSettingsMutation.mutate();
    return true;
  };

  const addCard = (card: Omit<DashboardCard, 'id' | 'position'>) => {
    const newCard: DashboardCard = {
      ...card,
      id: `card-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      position: cards.length,
    };
    
    const newCards = [...cards, newCard];
    updateCards(newCards);
    saveSettingsMutation.mutate(newCards);
  };

  const removeCard = (cardId: string) => {
    removeCardMutation.mutate(cardId);
  };

  const toggleCardVisibility = (cardId: string) => {
    const card = cards.find(c => c.id === cardId);
    if (card) {
      updateCardMutation.mutate({
        cardId,
        updates: { visible: !card.visible }
      });
    }
  };

  const updateCard = (cardId: string, updates: Partial<DashboardCard>) => {
    updateCardMutation.mutate({ cardId, updates });
  };

  const reorderCards = (startIndex: number, endIndex: number) => {
    const result = Array.from(cards);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);

    // Update position values
    const reorderedCards = result.map((card, index) => ({
      ...card,
      position: index
    }));

    updateCards(reorderedCards);
    saveSettingsMutation.mutate(reorderedCards);
  };

  const visibleCards = cards
    .filter(card => card.visible)
    .sort((a, b) => a.position - b.position);

  const kpiCards = cards
    .filter(card => card.category === 'kpi' && card.visible)
    .sort((a, b) => a.position - b.position);

  const dashboardCards = cards
    .filter(card => card.category === 'dashboard' && card.visible)
    .sort((a, b) => a.position - b.position);

  return {
    cards,
    visibleCards,
    kpiCards,
    dashboardCards,
    isLoading,
    error,
    updateCards,
    saveSettings,
    saveCardsDirectly,
    resetToDefaults,
    addCard,
    removeCard,
    toggleCardVisibility,
    updateCard,
    reorderCards,
    refetch,
    isSaving: saveSettingsMutation.isPending,
    isResetting: resetSettingsMutation.isPending,
  };
} 