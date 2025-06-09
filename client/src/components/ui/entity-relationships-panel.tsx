/**
 * Entity Relationships Panel
 * 
 * Displays bidirectional relationships for entities in an organized,
 * expandable panel similar to Jira's linked issues panel.
 */

import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { EntityLink, EntityReferenceList, EntityIcon } from "@/components/ui/entity-link";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { 
  EntityType, 
  RelationshipGroup, 
  EntityReference, 
  getEntityDefinition,
  ENTITY_TYPES 
} from "@shared/entity-relations";
import { 
  ChevronDown, 
  ChevronRight, 
  Search, 
  Link as LinkIcon, 
  ExternalLink,
  Filter,
  MoreHorizontal,
  Loader2,
  FileText,
  Building,
  Settings,
  Monitor,
  Shield,
  Award,
  FileCheck,
  File,
  DollarSign,
  Key,
  User,
  History
} from "lucide-react";

// Icon mapping for group icons
const getIconComponent = (iconName?: string) => {
  switch (iconName) {
    case 'Building': return Building;
    case 'FileText': return FileText;
    case 'Settings': return Settings;
    case 'Monitor': return Monitor;
    case 'Shield': return Shield;
    case 'Award': return Award;
    case 'FileCheck': return FileCheck;
    case 'File': return File;
    case 'DollarSign': return DollarSign;
    case 'Key': return Key;
    case 'User': return User;
    case 'History': return History;
    default: return LinkIcon;
  }
};

// ============================================================================
// COMPONENT PROPS
// ============================================================================

interface EntityRelationshipsPanelProps {
  entityType: EntityType;
  entityId: number;
  className?: string;
  variant?: 'full' | 'sidebar' | 'compact';
  showSearch?: boolean;
  showStats?: boolean;
  maxItemsPerGroup?: number;
  collapsible?: boolean;
  initiallyExpanded?: boolean[];
}

interface RelationshipGroupProps {
  group: RelationshipGroup;
  isExpanded: boolean;
  onToggle: () => void;
  maxItems?: number;
  showViewAll?: boolean;
  onViewAll?: () => void;
}

interface RelationshipStatsProps {
  entityType: EntityType;
  entityId: number;
}

// ============================================================================
// RELATIONSHIP STATS COMPONENT
// ============================================================================

const RelationshipStats: React.FC<RelationshipStatsProps> = ({ entityType, entityId }) => {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['relationship-stats', entityType, entityId],
    queryFn: async () => {
      const response = await fetch(`/api/entities/${entityType}/${entityId}/relationships/stats`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch relationship stats');
      }
      return response.json();
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        <span>Loading stats...</span>
      </div>
    );
  }

  if (!stats || stats.totalRelationships === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        No relationships found
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4 text-sm">
      <div className="flex items-center gap-1">
        <LinkIcon className="h-3 w-3" />
        <span className="font-medium">{stats.totalRelationships}</span>
        <span className="text-muted-foreground">
          {stats.totalRelationships === 1 ? 'relationship' : 'relationships'}
        </span>
      </div>
      
      <div className="flex gap-2">
        {stats.relationshipTypes && Object.entries(stats.relationshipTypes).map(([type, count]) => (
          <Badge key={type} variant="secondary" className="text-xs">
            {count} {type.replace(/_/g, ' ').toLowerCase()}
          </Badge>
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// RELATIONSHIP GROUP COMPONENT
// ============================================================================

const RelationshipGroupComponent: React.FC<RelationshipGroupProps> = ({ 
  group, 
  isExpanded, 
  onToggle, 
  maxItems = 5,
  showViewAll = true,
  onViewAll 
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  
  const filteredRelationships = group.relationships.filter(rel =>
    !searchQuery || 
    rel.targetEntity.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    rel.sourceEntity.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const displayRelationships = maxItems 
    ? filteredRelationships.slice(0, maxItems) 
    : filteredRelationships;
  
  const hasMore = filteredRelationships.length > maxItems;

  const GroupIcon = getIconComponent(group.icon);

  return (
    <div className="space-y-2">
      <Collapsible open={isExpanded} onOpenChange={onToggle}>
        <CollapsibleTrigger asChild>
          <Button 
            variant="ghost" 
            className="w-full justify-between p-2 h-auto font-normal hover:bg-muted/50"
          >
            <div className="flex items-center gap-2">
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              
              <GroupIcon className="h-4 w-4" />
              
              <span className="font-medium">{group.displayName}</span>
              
              <Badge variant="secondary" className="ml-1">
                {group.count}
              </Badge>
            </div>
            
            <MoreHorizontal className="h-4 w-4 opacity-50" />
          </Button>
        </CollapsibleTrigger>
        
        <CollapsibleContent className="space-y-2">
          {group.count > 5 && (
            <div className="px-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-3 w-3 text-muted-foreground" />
                <Input
                  placeholder="Search relationships..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-7 h-8 text-xs"
                />
              </div>
            </div>
          )}
          
          <div className="px-2 space-y-1">
            {displayRelationships.map((relationship) => {
              const entity = relationship.isReverse 
                ? relationship.sourceEntity 
                : relationship.targetEntity;
              
              return (
                <EntityLink
                  key={relationship.id}
                  entity={entity}
                  variant="compact"
                  className="block p-1 rounded hover:bg-muted/50 transition-colors"
                />
              );
            })}
            
            {hasMore && showViewAll && (
              <div className="pt-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onViewAll}
                  className="h-6 text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
                >
                  View all {filteredRelationships.length} items...
                </Button>
              </div>
            )}
            
            {searchQuery && filteredRelationships.length === 0 && (
              <div className="text-xs text-muted-foreground py-2 text-center">
                No relationships match your search
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const EntityRelationshipsPanel: React.FC<EntityRelationshipsPanelProps> = ({
  entityType,
  entityId,
  className,
  variant = 'full',
  showSearch = true,
  showStats = true,
  maxItemsPerGroup = 5,
  collapsible = true,
  initiallyExpanded = []
}) => {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(initiallyExpanded));
  const [globalSearch, setGlobalSearch] = useState("");

  const { 
    data: relationshipGroups, 
    isLoading, 
    error,
    refetch 
  } = useQuery({
    queryKey: ['entity-relationships', entityType, entityId],
    queryFn: async (): Promise<RelationshipGroup[]> => {
      const response = await fetch(`/api/entities/${entityType}/${entityId}/relationships`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch relationships');
      }
      return response.json();
    },
    refetchOnWindowFocus: false
  });

  // Auto-expand first group if none specified
  useEffect(() => {
    if (relationshipGroups && relationshipGroups.length > 0 && expandedGroups.size === 0) {
      setExpandedGroups(new Set([relationshipGroups[0].type]));
    }
  }, [relationshipGroups, expandedGroups.size]);

  const toggleGroup = (groupType: string) => {
    if (!collapsible) return;
    
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupType)) {
      newExpanded.delete(groupType);
    } else {
      newExpanded.add(groupType);
    }
    setExpandedGroups(newExpanded);
  };

  const filteredGroups = relationshipGroups?.filter(group =>
    !globalSearch ||
    group.displayName.toLowerCase().includes(globalSearch.toLowerCase()) ||
    group.relationships.some(rel =>
      rel.targetEntity.name.toLowerCase().includes(globalSearch.toLowerCase()) ||
      rel.sourceEntity.name.toLowerCase().includes(globalSearch.toLowerCase())
    )
  ) || [];

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="space-y-3">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      );
    }

    if (error) {
      return (
        <div className="text-center py-6">
          <div className="text-sm text-destructive mb-2">
            Failed to load relationships
          </div>
          <Button size="sm" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      );
    }

    if (!filteredGroups.length) {
      return (
        <div className="text-center py-6">
          <LinkIcon className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <div className="text-sm text-muted-foreground">
            {globalSearch ? 'No relationships match your search' : 'No relationships found'}
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {filteredGroups.map((group, index) => (
          <RelationshipGroupComponent
            key={group.type}
            group={group}
            isExpanded={!collapsible || expandedGroups.has(group.type)}
            onToggle={() => toggleGroup(group.type)}
            maxItems={maxItemsPerGroup}
            showViewAll={true}
            onViewAll={() => {
              // TODO: Open detailed relationship view
              console.log(`View all for ${group.type}`);
            }}
          />
        ))}
      </div>
    );
  };

  const getTitle = () => {
    const definition = getEntityDefinition(entityType);
    return variant === 'compact' ? 'Linked' : `${definition.displayName} Relationships`;
  };

  if (variant === 'compact') {
    return (
      <Card className={cn("w-full", className)}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <LinkIcon className="h-4 w-4" />
            {getTitle()}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <ScrollArea className="h-64">
            {renderContent()}
          </ScrollArea>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <LinkIcon className="h-5 w-5" />
            {getTitle()}
          </CardTitle>
          
          {filteredGroups.length > 0 && (
            <Badge variant="secondary">
              {filteredGroups.reduce((total, group) => total + group.count, 0)} total
            </Badge>
          )}
        </div>
        
        {showStats && (
          <>
            <Separator className="my-3" />
            <RelationshipStats entityType={entityType} entityId={entityId} />
          </>
        )}
        
        {showSearch && filteredGroups.length > 0 && (
          <>
            <Separator className="my-3" />
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search all relationships..."
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </>
        )}
      </CardHeader>
      
      <CardContent className="pt-0">
        {variant === 'sidebar' ? (
          <ScrollArea className="h-96">
            {renderContent()}
          </ScrollArea>
        ) : (
          renderContent()
        )}
      </CardContent>
    </Card>
  );
};

// ============================================================================
// EXPORTS
// ============================================================================

export default EntityRelationshipsPanel;
export type { EntityRelationshipsPanelProps }; 