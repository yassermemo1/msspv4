/**
 * Entity Navigation Demo Page
 * 
 * Demonstrates the relational navigation system with examples of
 * entity linking, relationships panel, and navigation features.
 */

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { EntityLink, EntityReferenceList } from "@/components/ui/entity-link";
import { EntityRelationshipsPanel } from "@/components/ui/entity-relationships-panel";
import { useEntityNavigation } from "@/hooks/use-entity-navigation";
import { 
  ENTITY_TYPES, 
  ENTITY_DEFINITIONS, 
  EntityReference,
  EntitySearchParams 
} from "@shared/entity-relations";
import {
  Search,
  Link as LinkIcon,
  Network,
  ArrowRight,
  Layers,
  GitBranch,
  Globe,
  Database
} from "lucide-react";

export default function EntityNavigationDemo() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEntityTypes, setSelectedEntityTypes] = useState<string[]>([]);
  const [demoEntityType, setDemoEntityType] = useState(ENTITY_TYPES.CLIENT);
  const [demoEntityId, setDemoEntityId] = useState(1);

  const { 
    searchEntities, 
    useEntitySearch, 
    navigateToEntity,
    createEntityReference 
  } = useEntityNavigation();

  // Search entities for demo
  const searchParams: EntitySearchParams = {
    query: searchQuery,
    entityTypes: selectedEntityTypes.length > 0 ? selectedEntityTypes as any[] : undefined,
    limit: 10
  };

  const { data: searchResults } = useEntitySearch(searchParams);

  // Sample entity references for demo
  const sampleEntities: EntityReference[] = [
    {
      id: 1,
      type: ENTITY_TYPES.CLIENT,
      name: "Acme Corporation",
      url: "/clients/1",
      status: "active",
      icon: "Building",
      metadata: {
        secondaryText: "Technology Company",
        industry: "Technology"
      }
    },
    {
      id: 2,
      type: ENTITY_TYPES.CONTRACT,
      name: "Enterprise Support Agreement",
      url: "/contracts/2",
      status: "active",
      icon: "FileText",
      metadata: {
        secondaryText: "$50,000/year",
        totalValue: 50000
      }
    },
    {
      id: 3,
      type: ENTITY_TYPES.ASSET,
      name: "Dell PowerEdge R750",
      url: "/assets/3",
      status: "deployed",
      icon: "Monitor",
      metadata: {
        secondaryText: "Production Server",
        model: "PowerEdge R750"
      }
    },
    {
      id: 4,
      type: ENTITY_TYPES.SAF,
      name: "SAF-2024-001",
      url: "/safs/4",
      status: "approved",
      icon: "Shield",
      metadata: {
        secondaryText: "Security Authorization",
        safNumber: "SAF-2024-001"
      }
    }
  ];

  return (
    <AppLayout title="Entity Navigation Demo">
      <div className="space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">Entity Relational Navigation</h1>
          <p className="text-lg text-muted-foreground mt-2">
            Experience Jira-style internal linking and relationship management
          </p>
          
          <div className="flex items-center justify-center gap-6 mt-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Network className="h-4 w-4" />
              <span>Bidirectional Relationships</span>
            </div>
            <div className="flex items-center gap-2">
              <LinkIcon className="h-4 w-4" />
              <span>Smart Entity Linking</span>
            </div>
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              <span>Global Entity Search</span>
            </div>
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4" />
              <span>Clean URL Navigation</span>
            </div>
          </div>
        </div>

        {/* Demo Content */}
        <Tabs defaultValue="entity-links" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="entity-links">Entity Links</TabsTrigger>
            <TabsTrigger value="relationships">Relationships</TabsTrigger>
            <TabsTrigger value="search">Entity Search</TabsTrigger>
            <TabsTrigger value="navigation">Navigation</TabsTrigger>
            <TabsTrigger value="system-info">System Info</TabsTrigger>
          </TabsList>

          {/* Entity Links Demo */}
          <TabsContent value="entity-links" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <LinkIcon className="h-5 w-5" />
                    Entity Link Variants
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm">Default Style</h4>
                    {sampleEntities.map(entity => (
                      <EntityLink key={entity.id} entity={entity} variant="default" />
                    ))}
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <h4 className="font-medium text-sm">Compact Style</h4>
                    <div className="space-y-1">
                      {sampleEntities.map(entity => (
                        <EntityLink key={entity.id} entity={entity} variant="compact" />
                      ))}
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <h4 className="font-medium text-sm">Card Style</h4>
                    {sampleEntities.slice(0, 2).map(entity => (
                      <EntityLink key={entity.id} entity={entity} variant="card" />
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Layers className="h-5 w-5" />
                    Inline References
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="prose prose-sm max-w-none">
                    <p>
                      The <EntityLink entity={sampleEntities[0]} variant="inline" /> has an active{" "}
                      <EntityLink entity={sampleEntities[1]} variant="inline" /> that includes{" "}
                      managed <EntityLink entity={sampleEntities[2]} variant="inline" /> resources.
                    </p>
                    
                    <p className="mt-4">
                      Security compliance is managed through{" "}
                      <EntityLink entity={sampleEntities[3]} variant="inline" /> which authorizes
                      all service activities and hardware deployments.
                    </p>

                    <div className="mt-6 p-4 bg-muted rounded-lg">
                      <h5 className="font-medium mb-2">Key Features:</h5>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        <li>Hover tooltips with entity details</li>
                        <li>Status badges and icons</li>
                        <li>Clean URL navigation</li>
                        <li>Contextual secondary information</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Relationships Demo */}
          <TabsContent value="relationships" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle className="text-base">Demo Controls</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Entity Type</label>
                    <select 
                      value={demoEntityType}
                      onChange={(e) => setDemoEntityType(e.target.value as any)}
                      className="w-full mt-1 p-2 border rounded-md"
                    >
                      {Object.values(ENTITY_TYPES).map(type => (
                        <option key={type} value={type}>
                          {ENTITY_DEFINITIONS[type].displayName}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Entity ID</label>
                    <Input
                      type="number"
                      value={demoEntityId}
                      onChange={(e) => setDemoEntityId(parseInt(e.target.value) || 1)}
                      className="mt-1"
                    />
                  </div>
                  
                  <div className="pt-2">
                    <p className="text-xs text-muted-foreground">
                      Adjust the entity type and ID to explore different relationship patterns.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <div className="lg:col-span-2">
                <EntityRelationshipsPanel
                  entityType={demoEntityType}
                  entityId={demoEntityId}
                  variant="full"
                  showSearch={true}
                  showStats={true}
                  maxItemsPerGroup={5}
                />
              </div>
            </div>
          </TabsContent>

          {/* Search Demo */}
          <TabsContent value="search" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Global Entity Search
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-1">
                    <Input
                      placeholder="Search entities..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <Button variant="outline">
                    <Search className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {Object.values(ENTITY_TYPES).map(type => (
                    <Badge
                      key={type}
                      variant={selectedEntityTypes.includes(type) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => {
                        setSelectedEntityTypes(prev =>
                          prev.includes(type)
                            ? prev.filter(t => t !== type)
                            : [...prev, type]
                        );
                      }}
                    >
                      {ENTITY_DEFINITIONS[type].displayName}
                    </Badge>
                  ))}
                </div>

                {searchResults && (
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium mb-3">
                      Search Results ({searchResults.total} found)
                    </h4>
                    <EntityReferenceList
                      entities={searchResults.entities}
                      variant="default"
                      emptyMessage="No entities match your search criteria"
                    />
                    {searchResults.hasMore && (
                      <Button variant="outline" className="w-full mt-3">
                        Load More Results
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Navigation Demo */}
          <TabsContent value="navigation" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <GitBranch className="h-5 w-5" />
                    URL Structure
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    {Object.values(ENTITY_TYPES).map(type => {
                      const definition = ENTITY_DEFINITIONS[type];
                      return (
                        <div key={type} className="flex items-center justify-between p-2 border rounded">
                          <span className="font-medium">{definition.displayName}</span>
                          <code className="text-sm bg-muted px-2 py-1 rounded">
                            {definition.urlPath}/:id
                          </code>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5" />
                    Navigation Examples
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    {sampleEntities.map(entity => (
                      <div key={entity.id} className="flex items-center justify-between p-3 border rounded">
                        <div className="flex items-center gap-3">
                          <EntityLink entity={entity} variant="compact" showTooltip={false} />
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigateToEntity(entity)}
                        >
                          <ArrowRight className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  
                  <div className="p-4 bg-muted rounded-lg">
                    <h5 className="font-medium mb-2">Navigation Features:</h5>
                    <ul className="text-sm space-y-1">
                      <li>• Clean, RESTful URLs</li>
                      <li>• Browser history support</li>
                      <li>• Programmatic navigation</li>
                      <li>• Deep linking support</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* System Info */}
          <TabsContent value="system-info" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    Supported Entity Types
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-96">
                    <div className="space-y-3">
                      {Object.values(ENTITY_TYPES).map(type => {
                        const definition = ENTITY_DEFINITIONS[type];
                        return (
                          <div key={type} className="p-3 border rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline">{definition.icon}</Badge>
                              <h4 className="font-medium">{definition.displayName}</h4>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">
                              URL: {definition.urlPath}
                            </p>
                            <div className="text-xs space-y-1">
                              <div>
                                <strong>Searchable:</strong> {definition.searchableFields.join(', ')}
                              </div>
                              <div>
                                <strong>Sortable:</strong> {definition.sortableFields.join(', ')}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Network className="h-5 w-5" />
                    Relationship Types
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-96">
                    <div className="space-y-2">
                      {[
                        'owns', 'belongs_to', 'contains', 'part_of',
                        'depends_on', 'blocks', 'relates_to', 'references',
                        'created_by', 'assigned_to', 'approved_by', 'issued_for',
                        'attached_to', 'supersedes', 'superseded_by',
                        'paid_for', 'invoiced_to', 'costs',
                        'provides', 'uses', 'authorizes', 'complies_with'
                      ].map(type => (
                        <div key={type} className="p-2 border rounded text-sm">
                          <code className="font-mono">{type}</code>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
} 