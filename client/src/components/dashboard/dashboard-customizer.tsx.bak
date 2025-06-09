import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Building,
  Users,
  FileText,
  BarChart3,
  DollarSign,
  Shield,
  Settings,
  Plus,
  X,
  Eye,
  EyeOff,
  GripVertical,
  RotateCcw,
  Info,
  Edit,
  Trash2
} from 'lucide-react';
import { useDashboardSettings, DashboardCard } from '@/hooks/use-dashboard-settings';

// Main Dashboard Customizer Component
interface DashboardCustomizerProps {
  cards: DashboardCard[];
  onCardsChange: (cards: DashboardCard[]) => void;
  onClose: () => void;
}

// Simplified Card Preview Component
const CardPreview: React.FC<{
  card: DashboardCard;
  onToggleVisibility: () => void;
  onDelete: () => void;
  onEdit: () => void;
}> = ({ card, onToggleVisibility, onDelete, onEdit }) => {
  const getIconComponent = (iconName: string) => {
    const icons: Record<string, React.ComponentType<any>> = {
      Building, Users, FileText, BarChart3, DollarSign, Shield
    };
    const IconComponent = icons[iconName] || Building;
    return <IconComponent className="h-4 w-4" />;
  };

  const getColorClasses = (color: string) => {
    const colors: Record<string, string> = {
      blue: 'border-blue-200 bg-blue-50',
      green: 'border-green-200 bg-green-50',
      yellow: 'border-yellow-200 bg-yellow-50',
      red: 'border-red-200 bg-red-50',
      purple: 'border-purple-200 bg-purple-50',
      indigo: 'border-indigo-200 bg-indigo-50',
    };
    return colors[color] || colors.blue;
  };

  return (
    <div className={`relative p-3 rounded-lg border-2 transition-all ${
      card.visible ? getColorClasses(card.config.color || 'blue') : 'border-gray-200 bg-gray-50 opacity-60'
    }`}>
      {/* Top controls */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1">
          {getIconComponent(card.config.icon || 'Building')}
          <Badge variant={card.visible ? 'default' : 'secondary'} className="text-xs">
            {card.size}
          </Badge>
        </div>
        
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={onToggleVisibility}
            className="h-6 w-6 p-0"
          >
            {card.visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
          </Button>
          
          <Button
            size="sm"
            variant="ghost"
            onClick={onEdit}
            className="h-6 w-6 p-0"
          >
            <Edit className="h-3 w-3" />
          </Button>
          
          {card.isRemovable && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onDelete}
              className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
      
      {/* Card info */}
      <div className="space-y-1">
        <p className="text-sm font-medium truncate">{card.title}</p>
        <p className="text-xs text-muted-foreground">
          {card.category} • {card.dataSource}
        </p>
      </div>
      
      {/* Drag handle */}
      <div className="absolute bottom-1 right-1 text-muted-foreground">
        <GripVertical className="h-3 w-3" />
      </div>
    </div>
  );
};

// Quick Card Editor Modal (simplified)
const QuickCardEditor: React.FC<{
  card: DashboardCard;
  onUpdate: (updates: Partial<DashboardCard>) => void;
  onClose: () => void;
}> = ({ card, onUpdate, onClose }) => {
  const [title, setTitle] = useState(card.title);
  const [size, setSize] = useState(card.size);
  const [color, setColor] = useState(card.config.color || 'blue');
  const [icon, setIcon] = useState(card.config.icon || 'Building');
  const [trend, setTrend] = useState(card.config.trend || false);

  const handleSave = () => {
    onUpdate({
      title,
      size: size as 'small' | 'medium' | 'large',
      config: {
        ...card.config,
        color,
        icon,
        trend,
      },
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-96 max-h-[80vh] overflow-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Edit Card</CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Card title"
            />
          </div>
          
          <div>
            <Label htmlFor="size">Size</Label>
            <Select value={size} onValueChange={setSize}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="small">Small</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="large">Large</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="color">Color</Label>
            <Select value={color} onValueChange={setColor}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="blue">Blue</SelectItem>
                <SelectItem value="green">Green</SelectItem>
                <SelectItem value="yellow">Yellow</SelectItem>
                <SelectItem value="red">Red</SelectItem>
                <SelectItem value="purple">Purple</SelectItem>
                <SelectItem value="indigo">Indigo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="icon">Icon</Label>
            <Select value={icon} onValueChange={setIcon}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Building">Building</SelectItem>
                <SelectItem value="Users">Users</SelectItem>
                <SelectItem value="FileText">FileText</SelectItem>
                <SelectItem value="BarChart3">BarChart3</SelectItem>
                <SelectItem value="DollarSign">DollarSign</SelectItem>
                <SelectItem value="Shield">Shield</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center space-x-2">
            <Switch
              id="trend"
              checked={trend}
              onCheckedChange={setTrend}
            />
            <Label htmlFor="trend">Show trend indicator</Label>
          </div>
          
          <div className="flex gap-2 pt-4">
            <Button onClick={handleSave} className="flex-1">Save Changes</Button>
            <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export function DashboardCustomizer({ cards, onCardsChange, onClose }: DashboardCustomizerProps) {
  const {
    updateCard,
    removeCard,
    addCard,
    saveSettings,
    resetToDefaults,
    reorderCards,
    isSaving,
    isResetting
  } = useDashboardSettings();

  const [editingCard, setEditingCard] = useState<DashboardCard | null>(null);

  const handleAddCard = () => {
    const newCard: Omit<DashboardCard, 'id' | 'position'> = {
      title: 'New Card',
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
        trend: false
      },
      isBuiltIn: false,
      isRemovable: true,
    };
    
    addCard(newCard);
  };

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;
    reorderCards(result.source.index, result.destination.index);
  };

  const handleToggleVisibility = (cardId: string) => {
    const card = cards.find(c => c.id === cardId);
    if (card) {
      updateCard(cardId, { visible: !card.visible });
    }
  };

  const handleEditCard = (card: DashboardCard) => {
    setEditingCard(card);
  };

  const visibleCards = cards.filter(card => card.visible);

  return (
    <>
      <Card className="border-2">
        <CardHeader className="border-b bg-muted/30">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Dashboard Customizer
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Click cards to show/hide, drag to reorder, edit or delete as needed.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {visibleCards.length} visible of {cards.length} cards
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={resetToDefaults}
                disabled={isResetting}
                className="flex items-center gap-1"
              >
                <RotateCcw className="h-4 w-4" />
                {isResetting ? 'Resetting...' : 'Reset'}
              </Button>
              <Button
                size="sm"
                onClick={handleAddCard}
                className="flex items-center gap-1"
              >
                <Plus className="h-4 w-4" />
                Add Card
              </Button>
              <Button variant="outline" size="sm" onClick={onClose}>
                Done
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-6">
          <Alert className="mb-4">
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Quick Actions:</strong> Eye = show/hide • Edit = modify settings • Trash = delete • Drag corners to reorder
            </AlertDescription>
          </Alert>

          <ScrollArea className="h-[500px]">
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="cards">
                {(provided) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3"
                  >
                    {cards.map((card, index) => (
                      <Draggable key={card.id} draggableId={card.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`${
                              snapshot.isDragging ? 'opacity-50 rotate-2 scale-105' : ''
                            } transition-all`}
                          >
                            <CardPreview
                              card={card}
                              onToggleVisibility={() => handleToggleVisibility(card.id)}
                              onDelete={() => removeCard(card.id)}
                              onEdit={() => handleEditCard(card)}
                            />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Quick Editor Modal */}
      {editingCard && (
        <QuickCardEditor
          card={editingCard}
          onUpdate={(updates) => {
            updateCard(editingCard.id, updates);
            setEditingCard(null);
          }}
          onClose={() => setEditingCard(null)}
        />
      )}
    </>
  );
}