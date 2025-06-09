import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/app-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { 
  Navigation, 
  Save, 
  RefreshCw, 
  GripVertical, 
  Eye, 
  EyeOff,
  AlertTriangle,
  CheckCircle,
  Undo,
  Settings,
  Menu,
  ArrowUpDown
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useGlobalError } from '@/hooks/use-global-error';
import { useAuth } from '@/hooks/use-auth';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface NavigationItem {
  id: number;
  pageName: string;
  pageUrl: string;
  displayName: string;
  description?: string;
  category: string;
  icon?: string;
  sortOrder: number;
  isActive: boolean;
  adminAccess: boolean;
  managerAccess: boolean;
  engineerAccess: boolean;
  userAccess: boolean;
}

interface SortableItemProps {
  item: NavigationItem;
  onToggleActive: (id: number, active: boolean) => void;
}

function SortableItem({ item, onToggleActive }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const getRoleCount = () => {
    let count = 0;
    if (item.adminAccess) count++;
    if (item.managerAccess) count++;
    if (item.engineerAccess) count++;
    if (item.userAccess) count++;
    return count;
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-4 p-4 bg-white border rounded-lg shadow-sm hover:shadow-md transition-all duration-200 ${
        isDragging ? 'shadow-lg ring-2 ring-blue-500/20' : ''
      } ${!item.isActive ? 'opacity-60' : ''}`}
    >
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="flex items-center justify-center w-8 h-8 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing"
      >
        <GripVertical className="h-5 w-5" />
      </div>

      {/* Item Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-medium text-gray-900 truncate">{item.displayName}</h3>
          <Badge variant="outline" className="text-xs">{item.category}</Badge>
        </div>
        <p className="text-sm text-gray-500 truncate">{item.pageUrl}</p>
      </div>

      {/* Role Info */}
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="text-xs">
          {getRoleCount()} role{getRoleCount() !== 1 ? 's' : ''}
        </Badge>
      </div>

      {/* Sort Order Display */}
      <div className="text-sm text-gray-400 font-mono w-8 text-center">
        #{item.sortOrder}
      </div>

      {/* Active Toggle */}
      <div className="flex items-center gap-2">
        <Switch
          checked={item.isActive}
          onCheckedChange={(checked) => onToggleActive(item.id, checked)}
        />
        {item.isActive ? (
          <Eye className="h-4 w-4 text-green-600" />
        ) : (
          <EyeOff className="h-4 w-4 text-gray-400" />
        )}
      </div>
    </div>
  );
}

export default function NavigationManagerPage() {
  const { toast } = useToast();
  const { captureError } = useGlobalError();
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  
  const [items, setItems] = useState<NavigationItem[]>([]);
  const [originalItems, setOriginalItems] = useState<NavigationItem[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Only allow admin access
  if (currentUser?.role !== 'admin') {
    return (
      <AppLayout title="Access Denied" subtitle="Insufficient permissions">
        <div className="flex items-center justify-center h-full">
          <Alert className="max-w-md">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              You do not have permission to access this page. Only administrators can manage navigation.
            </AlertDescription>
          </Alert>
        </div>
      </AppLayout>
    );
  }

  const { data: navigationItems = [], isLoading, refetch } = useQuery<NavigationItem[]>({
    queryKey: ['/api/page-permissions'],
    queryFn: async () => {
      const response = await fetch('/api/page-permissions', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch navigation items');
      return response.json();
    },
  });

  const saveOrderMutation = useMutation({
    mutationFn: async (updatedItems: NavigationItem[]) => {
      const response = await fetch('/api/page-permissions/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          items: updatedItems.map((item, index) => ({
            id: item.id,
            sortOrder: index + 1,
            isActive: item.isActive,
            category: item.category // Include category for cross-category moves
          }))
        })
      });
      if (!response.ok) throw new Error('Failed to save navigation order');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Navigation order saved successfully'
      });
      setHasChanges(false);
      // Invalidate all accessible-pages queries (including timestamped ones)
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          return query.queryKey[0] === '/api/user/accessible-pages';
        }
      });
      refetch();
    },
    onError: (error: any) => {
      // Use global error handler instead of toast for detailed error display
      captureError(error, {
        operation: 'Save Navigation Order',
        items: updatedItems,
        timestamp: new Date().toISOString()
      });
    },
  });

  useEffect(() => {
    const sortedItems = [...navigationItems].sort((a, b) => a.sortOrder - b.sortOrder);
    setItems(sortedItems);
    setOriginalItems(sortedItems);
    setHasChanges(false);
  }, [navigationItems]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: any) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      setItems((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        const newItems = arrayMove(items, oldIndex, newIndex);
        
        const draggedItem = items[oldIndex];
        const targetItem = items[newIndex];
        
        // Determine if we should change the category based on surrounding items
        const shouldChangeCategory = draggedItem.category !== targetItem.category;
        
        // Update sort orders and potentially category
        const updatedItems = newItems.map((item, index) => {
          let updatedItem = { ...item, sortOrder: index + 1 };
          
          // If this is the dragged item and we're doing a cross-category move
          if (item.id === draggedItem.id && shouldChangeCategory) {
            // Look at the items around the new position to determine the target category
            const prevItem = newItems[index - 1];
            const nextItem = newItems[index + 1];
            
            // If we have context items, use their category
            if (prevItem && nextItem && prevItem.category === nextItem.category) {
              updatedItem.category = prevItem.category;
            } else if (prevItem) {
              updatedItem.category = prevItem.category;
            } else if (nextItem) {
              updatedItem.category = nextItem.category;
            } else {
              updatedItem.category = targetItem.category;
            }
            
            toast({
              title: 'Cross-Category Move',
              description: `"${draggedItem.displayName}" moved from ${draggedItem.category} to ${updatedItem.category}`,
            });
          }
          
          return updatedItem;
        });
        
        setHasChanges(true);
        return updatedItems;
      });
    }
  };

  const handleToggleActive = (id: number, active: boolean) => {
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, isActive: active } : item
    ));
    setHasChanges(true);
  };

  const handleSave = () => {
    saveOrderMutation.mutate(items);
  };

  const handleReset = () => {
    setItems([...originalItems]);
    setHasChanges(false);
  };

  const filteredItems = items.filter(item =>
    item.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.pageUrl.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStats = () => {
    return {
      total: items.length,
      active: items.filter(item => item.isActive).length,
      inactive: items.filter(item => !item.isActive).length,
      categories: new Set(items.map(item => item.category)).size
    };
  };

  const stats = getStats();

  if (isLoading) {
    return (
      <AppLayout title="Navigation Manager" subtitle="Manage navigation order and visibility">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Navigation Manager" subtitle="Drag and drop to reorder navigation items">
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Menu className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium">Total Items</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Eye className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium">Active</p>
                  <p className="text-2xl font-bold">{stats.active}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <EyeOff className="h-5 w-5 text-gray-600" />
                <div>
                  <p className="text-sm font-medium">Hidden</p>
                  <p className="text-2xl font-bold">{stats.inactive}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Settings className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="text-sm font-medium">Categories</p>
                  <p className="text-2xl font-bold">{stats.categories}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Controls */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Navigation className="h-5 w-5" />
                Navigation Items ({filteredItems.length})
              </CardTitle>
              
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <Input
                  placeholder="Search navigation items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full sm:w-64"
                />
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handleReset}
                    disabled={!hasChanges || saveOrderMutation.isPending}
                  >
                    <Undo className="mr-2 h-4 w-4" />
                    Reset
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={() => refetch()}
                    disabled={saveOrderMutation.isPending}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Refresh
                  </Button>
                  
                  <Button
                    onClick={handleSave}
                    disabled={!hasChanges || saveOrderMutation.isPending}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Save className="mr-2 h-4 w-4" />
                    Save Order
                  </Button>
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Changes Alert */}
        {hasChanges && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              You have unsaved changes to the navigation order. Click "Save Order" to apply them.
            </AlertDescription>
          </Alert>
        )}

        {/* Navigation Items */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GripVertical className="h-5 w-5" />
              Drag to Reorder - Cross-Category Supported
            </CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              Drag items within or between categories to reorder them globally
            </p>
          </CardHeader>
          <CardContent>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={filteredItems.map(item => item.id)}
                strategy={verticalListSortingStrategy}
              >
                {(() => {
                  // Group items by category for visual display while maintaining sort order
                  const categorizedItems = filteredItems.reduce((acc, item) => {
                    const category = item.category || 'other';
                    if (!acc[category]) acc[category] = [];
                    acc[category].push(item);
                    return acc;
                  }, {} as Record<string, NavigationItem[]>);
                  
                  const categoryOrder = ['main', 'advanced', 'integration', 'reports', 'admin', 'other'];
                  const sortedCategories = Object.keys(categorizedItems).sort((a, b) => {
                    const aIndex = categoryOrder.indexOf(a);
                    const bIndex = categoryOrder.indexOf(b);
                    return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
                  });

                  return (
                    <div className="space-y-6">
                      {sortedCategories.map((category) => (
                        <div key={category} className="space-y-2">
                          {/* Category Header */}
                          <div className="flex items-center gap-3 py-2 border-b border-gray-100">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                              <span className="text-white text-sm font-bold">
                                {category.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <h3 className="font-semibold text-gray-900 capitalize">
                                {category === 'main' ? 'Core Navigation' : category} 
                                <span className="ml-2 text-sm text-gray-500">
                                  ({categorizedItems[category].length} items)
                                </span>
                              </h3>
                              <p className="text-xs text-gray-500">
                                {category === 'main' && 'Essential application features'}
                                {category === 'admin' && 'Administrative functions'}
                                {category === 'advanced' && 'Advanced management tools'}
                                {category === 'integration' && 'External system integrations'}
                                {category === 'reports' && 'Analytics and reporting'}
                                {category === 'other' && 'Miscellaneous features'}
                              </p>
                            </div>
                          </div>
                          
                          {/* Category Items */}
                          <div className="space-y-2 pl-4 border-l-2 border-gray-100">
                            {categorizedItems[category].map((item) => (
                              <SortableItem
                                key={item.id}
                                item={item}
                                onToggleActive={handleToggleActive}
                              />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </SortableContext>
            </DndContext>
            
            {filteredItems.length === 0 && (
              <div className="text-center text-gray-500 py-8">
                No navigation items found matching your search.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>How to Use Navigation Manager</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-2">
              <GripVertical className="h-4 w-4 mt-0.5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-600 font-medium">
                  Drag the grip handle to reorder navigation items
                </p>
                <p className="text-xs text-gray-500">
                  You can drag items within the same category or between different categories
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <ArrowUpDown className="h-4 w-4 mt-0.5 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600 font-medium">
                  Cross-category reordering supported
                </p>
                <p className="text-xs text-gray-500">
                  Move items from Core to Admin section, or any category to another
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Eye className="h-4 w-4 mt-0.5 text-green-600" />
              <div>
                <p className="text-sm text-gray-600 font-medium">
                  Toggle visibility with the switch
                </p>
                <p className="text-xs text-gray-500">
                  Hide items you don't want to appear in the navigation
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Save className="h-4 w-4 mt-0.5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600 font-medium">
                  Save changes to apply the new order
                </p>
                <p className="text-xs text-gray-500">
                  Changes are applied globally and will be visible after refresh
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
} 