import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  ChevronRight, 
  ChevronDown, 
  Building, 
  FileText, 
  Settings, 
  Monitor, 
  Shield, 
  Award, 
  DollarSign, 
  FileCheck, 
  File, 
  Users,
  Eye,
  Plus,
  ExternalLink,
  Activity,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { apiRequest } from "@/lib/api";

interface EntityNode {
  id: number;
  type: string;
  name: string;
  status?: string;
  statusColor?: string;
  icon: React.ReactNode;
  count?: number;
  children?: EntityNode[];
  metadata?: {
    value?: string;
    date?: string;
    description?: string;
  };
}

interface RelationshipStats {
  contracts: number;
  serviceScopes: number;
  assets: number;
  safs: number;
  cocs: number;
  transactions: number;
  documents: number;
  teamMembers: number;
}

interface EntityRelationshipTreeProps {
  clientId: number;
  className?: string;
}

const ENTITY_ICONS = {
  contract: <FileText className="h-4 w-4" />,
  serviceScope: <Settings className="h-4 w-4" />,
  asset: <Monitor className="h-4 w-4" />,
  saf: <Shield className="h-4 w-4" />,
  coc: <Award className="h-4 w-4" />,
  transaction: <DollarSign className="h-4 w-4" />,
  proposal: <FileCheck className="h-4 w-4" />,
  document: <File className="h-4 w-4" />,
  team: <Users className="h-4 w-4" />
};

const STATUS_COLORS = {
  active: "bg-green-100 text-green-800 border-green-200",
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200", 
  expired: "bg-red-100 text-red-800 border-red-200",
  draft: "bg-gray-100 text-gray-800 border-gray-200",
  approved: "bg-blue-100 text-blue-800 border-blue-200"
};

const STATUS_ICONS = {
  active: <CheckCircle className="h-3 w-3" />,
  pending: <Clock className="h-3 w-3" />,
  expired: <XCircle className="h-3 w-3" />,
  draft: <AlertCircle className="h-3 w-3" />,
  approved: <CheckCircle className="h-3 w-3" />
};

const TreeNode: React.FC<{
  node: EntityNode;
  level: number;
  onNavigate: (type: string, id: number) => void;
  expandedNodes: Set<string>;
  onToggleExpand: (nodeKey: string) => void;
}> = ({ node, level, onNavigate, expandedNodes, onToggleExpand }) => {
  const nodeKey = `${node.type}-${node.id}`;
  const isExpanded = expandedNodes.has(nodeKey);
  const hasChildren = node.children && node.children.length > 0;
  const indentSize = level * 20;

  return (
    <div className="select-none">
      <div 
        className={`flex items-center py-2 px-3 hover:bg-slate-50 rounded-md cursor-pointer transition-colors group border-l-2 border-transparent hover:border-l-blue-200`}
        style={{ marginLeft: `${indentSize}px` }}
        onClick={() => hasChildren && onToggleExpand(nodeKey)}
      >
        {/* Expand/Collapse Icon */}
        <div className="flex items-center justify-center w-5 h-5 mr-2">
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown className="h-4 w-4 text-slate-600" />
            ) : (
              <ChevronRight className="h-4 w-4 text-slate-600" />
            )
          ) : (
            <div className="w-4 h-4" />
          )}
        </div>

        {/* Entity Icon */}
        <div className="flex items-center justify-center w-6 h-6 mr-3 text-slate-600">
          {node.icon}
        </div>

        {/* Entity Name & Info */}
        <div className="flex-1 flex items-center justify-between min-w-0">
          <div className="flex items-center space-x-2 min-w-0">
            <span className="font-medium text-slate-900 truncate">{node.name}</span>
            {node.count !== undefined && (
              <Badge variant="secondary" className="text-xs">
                {node.count}
              </Badge>
            )}
            {node.status && (
              <div className="flex items-center space-x-1">
                <div className={`p-1 rounded-full ${STATUS_COLORS[node.status as keyof typeof STATUS_COLORS] || STATUS_COLORS.draft}`}>
                  {STATUS_ICONS[node.status as keyof typeof STATUS_ICONS] || STATUS_ICONS.draft}
                </div>
                <Badge 
                  variant="outline" 
                  className={`text-xs ${STATUS_COLORS[node.status as keyof typeof STATUS_COLORS] || STATUS_COLORS.draft}`}
                >
                  {node.status}
                </Badge>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      onNavigate(node.type, node.id);
                    }}
                  >
                    <Eye className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>View Details</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(`/${node.type}s/${node.id}`, '_blank');
                    }}
                  >
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Open in New Tab</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>

      {/* Metadata Row */}
      {node.metadata && (
        <div 
          className="text-xs text-slate-500 pl-10 pb-1"
          style={{ marginLeft: `${indentSize + 20}px` }}
        >
          {node.metadata.value && (
            <span className="mr-4">💰 {node.metadata.value}</span>
          )}
          {node.metadata.date && (
            <span className="mr-4">📅 {node.metadata.date}</span>
          )}
          {node.metadata.description && (
            <span className="italic">{node.metadata.description}</span>
          )}
        </div>
      )}

      {/* Children */}
      {hasChildren && isExpanded && (
        <div className="border-l border-slate-200 ml-2">
          {node.children!.map((child, index) => (
            <TreeNode
              key={`${child.type}-${child.id}-${index}`}
              node={child}
              level={level + 1}
              onNavigate={onNavigate}
              expandedNodes={expandedNodes}
              onToggleExpand={onToggleExpand}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const RelationshipStatsCard: React.FC<{ stats: RelationshipStats }> = ({ stats }) => {
  const statItems = [
    { label: "Contracts", value: stats.contracts, icon: <FileText className="h-4 w-4" />, color: "text-blue-600" },
    { label: "Service Scopes", value: stats.serviceScopes, icon: <Settings className="h-4 w-4" />, color: "text-green-600" },
    { label: "Assets", value: stats.assets, icon: <Monitor className="h-4 w-4" />, color: "text-purple-600" },
    { label: "SAFs", value: stats.safs, icon: <Shield className="h-4 w-4" />, color: "text-orange-600" },
    { label: "COCs", value: stats.cocs, icon: <Award className="h-4 w-4" />, color: "text-yellow-600" },
    { label: "Transactions", value: stats.transactions, icon: <DollarSign className="h-4 w-4" />, color: "text-red-600" },
  ];

  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center">
          <Activity className="h-4 w-4 mr-2" />
          Relationship Overview
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-3 gap-3">
          {statItems.map((item) => (
            <div key={item.label} className="flex items-center space-x-2 p-2 bg-slate-50 rounded-md">
              <div className={item.color}>
                {item.icon}
              </div>
              <div>
                <div className="text-sm font-semibold">{item.value}</div>
                <div className="text-xs text-slate-500">{item.label}</div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export const EntityRelationshipTree: React.FC<EntityRelationshipTreeProps> = ({ 
  clientId, 
  className = "" 
}) => {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['contracts', 'assets', 'safs']));

  // Fetch relationship data
  const { data: relationshipData, isLoading: relationshipsLoading } = useQuery({
    queryKey: ['entity-relationships', clientId],
    queryFn: async () => {
      const response = await apiRequest(`/api/entities/client/${clientId}/relationships`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch relationships');
      return response.json();
    }
  });

  // Fetch relationship stats
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['relationship-stats', clientId],
    queryFn: async () => {
      const response = await apiRequest(`/api/entities/client/${clientId}/relationships/stats`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch stats');
      return response.json();
    }
  });

  const handleToggleExpand = (nodeKey: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeKey)) {
      newExpanded.delete(nodeKey);
    } else {
      newExpanded.add(nodeKey);
    }
    setExpandedNodes(newExpanded);
  };

  const handleNavigate = (type: string, id: number) => {
    // Navigate to the entity detail page
    window.location.href = `/${type}s/${id}`;
  };

  // Build tree structure from relationship data
  const buildTreeData = (relationships: any[]): EntityNode[] => {
    if (!relationships) return [];

    const groupedData: { [key: string]: EntityNode } = {};

    // Group by relationship type
    relationships.forEach((rel) => {
      const groupKey = rel.targetType;
      
      if (!groupedData[groupKey]) {
        groupedData[groupKey] = {
          id: 0,
          type: groupKey,
          name: `${rel.targetType.charAt(0).toUpperCase() + rel.targetType.slice(1)}s`,
          icon: ENTITY_ICONS[rel.targetType as keyof typeof ENTITY_ICONS] || <File className="h-4 w-4" />,
          children: [],
          count: 0
        };
      }

      const childNode: EntityNode = {
        id: rel.target.id,
        type: rel.targetType,
        name: rel.target.name || rel.target.displayName || `${rel.targetType} #${rel.target.id}`,
        status: rel.target.status,
        icon: ENTITY_ICONS[rel.targetType as keyof typeof ENTITY_ICONS] || <File className="h-4 w-4" />,
        metadata: {
          value: rel.target.value || rel.target.totalValue,
          date: rel.target.createdAt || rel.target.startDate,
          description: rel.target.description || rel.target.notes
        }
      };

      groupedData[groupKey].children!.push(childNode);
      groupedData[groupKey].count = groupedData[groupKey].children!.length;
    });

    return Object.values(groupedData);
  };

  const treeData = buildTreeData(relationshipData || []);

  if (relationshipsLoading || statsLoading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Relationship Stats */}
      {statsData && <RelationshipStatsCard stats={statsData} />}

      {/* Tree View */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center">
            <Building className="h-5 w-5 mr-2" />
            Entity Relationships
          </CardTitle>
          <p className="text-sm text-slate-500">
            Navigate through connected entities and their relationships
          </p>
        </CardHeader>
        <CardContent className="pt-0">
          {treeData.length > 0 ? (
            <div className="space-y-1 max-h-96 overflow-y-auto">
              {treeData.map((node) => (
                <TreeNode
                  key={`${node.type}-${node.id}`}
                  node={node}
                  level={0}
                  onNavigate={handleNavigate}
                  expandedNodes={expandedNodes}
                  onToggleExpand={handleToggleExpand}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">
              <Building className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-sm">No relationships found</p>
              <p className="text-xs">Start by adding contracts, assets, or other entities to this client</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}; 