/**
 * Entity Link Component
 * 
 * Renders clickable links to entities with appropriate icons, status indicators,
 * and hover information similar to Jira's internal linking.
 */

import React from "react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { 
  EntityReference, 
  EntityType, 
  getEntityDefinition,
  ENTITY_TYPES 
} from "@shared/entity-relations";
import * as Icons from "lucide-react";

// ============================================================================
// ICON MAPPING
// ============================================================================

const ICON_MAP: Record<string, keyof typeof Icons> = {
  Building: 'Building',
  FileText: 'FileText',
  Settings: 'Settings',
  Monitor: 'Monitor',
  Shield: 'Shield',
  Award: 'Award',
  FileCheck: 'FileCheck',
  File: 'File',
  DollarSign: 'DollarSign',
  Key: 'Key',
  Cog: 'Cog',
  User: 'User',
  History: 'History',
  Link: 'Link'
};

// ============================================================================
// STATUS COLORS
// ============================================================================

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  inactive: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
  draft: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  pending: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  expired: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  completed: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  approved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
};

// ============================================================================
// COMPONENT PROPS
// ============================================================================

interface EntityLinkProps {
  entity: EntityReference;
  variant?: 'default' | 'compact' | 'card' | 'inline';
  showIcon?: boolean;
  showStatus?: boolean;
  showSecondaryText?: boolean;
  showTooltip?: boolean;
  className?: string;
  onClick?: () => void;
}

interface EntityTooltipContentProps {
  entity: EntityReference;
}

// ============================================================================
// TOOLTIP CONTENT
// ============================================================================

const EntityTooltipContent: React.FC<EntityTooltipContentProps> = ({ entity }) => {
  const definition = getEntityDefinition(entity.type);
  
  if (!definition) {
    return (
      <div className="p-3 max-w-sm">
        <div className="flex items-center gap-2 mb-2">
          <EntityIcon type={entity.type} className="h-4 w-4" />
          <span className="font-medium">Unknown Entity</span>
        </div>
        <div className="text-sm text-muted-foreground">
          <div className="font-medium">{entity.name}</div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="p-3 max-w-sm">
      <div className="flex items-center gap-2 mb-2">
        <EntityIcon type={entity.type} className="h-4 w-4" />
        <span className="font-medium">{definition.displayName}</span>
        {entity.status && (
          <Badge 
            variant="outline" 
            className={cn("text-xs", STATUS_COLORS[entity.status.toLowerCase()] || STATUS_COLORS.inactive)}
          >
            {entity.status}
          </Badge>
        )}
      </div>
      
      <div className="text-sm text-muted-foreground">
        <div className="font-medium">{entity.name}</div>
        {entity.metadata?.secondaryText && (
          <div className="text-xs mt-1">{entity.metadata.secondaryText}</div>
        )}
      </div>

      <div className="text-xs text-muted-foreground mt-2 opacity-75">
        Click to view {definition.displayName.toLowerCase()} details
      </div>
    </div>
  );
};

// ============================================================================
// ENTITY ICON
// ============================================================================

interface EntityIconProps {
  type: EntityType;
  className?: string;
}

const EntityIcon: React.FC<EntityIconProps> = ({ type, className = "h-4 w-4" }) => {
  const definition = getEntityDefinition(type);
  
  if (!definition) {
    const FallbackIcon = Icons.Link;
    return <FallbackIcon className={className} />;
  }
  
  const iconName = ICON_MAP[definition.icon] || 'Link';
  const IconComponent = Icons[iconName] as React.ComponentType<any>;
  
  if (!IconComponent) {
    const FallbackIcon = Icons.Link;
    return <FallbackIcon className={className} />;
  }
  
  return <IconComponent className={className} />;
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const EntityLink: React.FC<EntityLinkProps> = ({
  entity,
  variant = 'default',
  showIcon = true,
  showStatus = true,
  showSecondaryText = true,
  showTooltip = true,
  className,
  onClick
}) => {
  const definition = getEntityDefinition(entity.type);

  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      e.preventDefault();
      onClick();
    }
  };

  const renderContent = () => {
    switch (variant) {
      case 'compact':
        return (
          <div className="flex items-center gap-1">
            {showIcon && <EntityIcon type={entity.type} className="h-3 w-3" />}
            <span className="text-xs font-medium truncate">{entity.name}</span>
            {entity.status && showStatus && (
              <Badge 
                variant="outline" 
                className={cn(
                  "text-[10px] px-1 py-0 h-4", 
                  STATUS_COLORS[entity.status.toLowerCase()] || STATUS_COLORS.inactive
                )}
              >
                {entity.status}
              </Badge>
            )}
          </div>
        );

      case 'card':
        return (
          <div className="p-3 border rounded-lg hover:bg-muted/50 transition-colors">
            <div className="flex items-start gap-3">
              {showIcon && <EntityIcon type={entity.type} className="h-5 w-5 mt-0.5" />}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium truncate">{entity.name}</span>
                  {entity.status && showStatus && (
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "text-xs", 
                        STATUS_COLORS[entity.status.toLowerCase()] || STATUS_COLORS.inactive
                      )}
                    >
                      {entity.status}
                    </Badge>
                  )}
                </div>
                
                {entity.metadata?.secondaryText && showSecondaryText && (
                  <div className="text-sm text-muted-foreground truncate">
                    {entity.metadata.secondaryText}
                  </div>
                )}
                
                <div className="text-xs text-muted-foreground mt-1">
                  {definition?.displayName || 'Unknown Entity'}
                </div>
              </div>
            </div>
          </div>
        );

      case 'inline':
        return (
          <span className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200">
            {showIcon && <EntityIcon type={entity.type} className="h-3 w-3" />}
            <span className="underline decoration-dotted underline-offset-2">{entity.name}</span>
          </span>
        );

      default:
        return (
          <div className="flex items-center gap-2 py-1">
            {showIcon && <EntityIcon type={entity.type} className="h-4 w-4" />}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium truncate">{entity.name}</span>
                {entity.status && showStatus && (
                  <Badge 
                    variant="outline" 
                    className={cn(
                      "text-xs", 
                      STATUS_COLORS[entity.status.toLowerCase()] || STATUS_COLORS.inactive
                    )}
                  >
                    {entity.status}
                  </Badge>
                )}
              </div>
              
              {entity.metadata?.secondaryText && showSecondaryText && (
                <div className="text-sm text-muted-foreground truncate">
                  {entity.metadata.secondaryText}
                </div>
              )}
            </div>
          </div>
        );
    }
  };

  const content = (
    <Link 
      href={entity.url}
      className={cn(
        "block text-inherit hover:text-inherit no-underline transition-colors",
        variant === 'card' && "hover:no-underline",
        variant === 'inline' && "inline",
        className
      )}
      onClick={handleClick}
    >
      {renderContent()}
    </Link>
  );

  if (showTooltip && variant !== 'card') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {content}
          </TooltipTrigger>
          <TooltipContent side="top" className="p-0">
            <EntityTooltipContent entity={entity} />
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return content;
};

// ============================================================================
// ENTITY REFERENCE LIST
// ============================================================================

interface EntityReferenceListProps {
  entities: EntityReference[];
  variant?: EntityLinkProps['variant'];
  emptyMessage?: string;
  className?: string;
  maxItems?: number;
  showViewAll?: boolean;
  onViewAll?: () => void;
}

export const EntityReferenceList: React.FC<EntityReferenceListProps> = ({
  entities,
  variant = 'default',
  emptyMessage = "No related entities found",
  className,
  maxItems,
  showViewAll = false,
  onViewAll
}) => {
  const displayEntities = maxItems ? entities.slice(0, maxItems) : entities;
  const hasMore = maxItems && entities.length > maxItems;

  if (entities.length === 0) {
    return (
      <div className={cn("text-sm text-muted-foreground py-4 text-center", className)}>
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={cn("space-y-1", className)}>
      {displayEntities.map((entity, index) => (
        <EntityLink 
          key={`${entity.type}-${entity.id}`}
          entity={entity}
          variant={variant}
        />
      ))}
      
      {hasMore && (
        <div className="pt-2">
          <button
            onClick={onViewAll}
            className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 font-medium"
          >
            View all {entities.length} items...
          </button>
        </div>
      )}
      
      {showViewAll && entities.length > 0 && (
        <div className="pt-2">
          <button
            onClick={onViewAll}
            className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 font-medium"
          >
            View all ({entities.length})
          </button>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// EXPORTS
// ============================================================================

export { EntityIcon };
export type { EntityLinkProps, EntityReferenceListProps }; 