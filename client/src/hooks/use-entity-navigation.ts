/**
 * Entity Navigation Hook
 * 
 * Provides utilities for navigating between entities and managing
 * entity relationships throughout the application.
 */

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useCallback, useMemo } from "react";
import { 
  EntityType, 
  EntityReference, 
  RelationshipGroup, 
  EntitySearchParams, 
  EntitySearchResult,
  getEntityDefinition,
  getEntityUrl,
  ENTITY_TYPES
} from "@shared/entity-relations";

// ============================================================================
// TYPES
// ============================================================================

interface UseEntityNavigationProps {
  prefetchRelated?: boolean;
  cacheTime?: number;
}

interface EntityNavigationHook {
  // Navigation
  navigateToEntity: (entity: EntityReference) => void;
  navigateToEntityByTypeAndId: (type: EntityType, id: number) => void;
  getCurrentEntity: () => { type: EntityType; id: number } | null;
  
  // Entity fetching
  getEntity: (type: EntityType, id: number) => Promise<EntityReference | null>;
  useEntity: (type: EntityType, id: number) => {
    data: EntityReference | undefined;
    isLoading: boolean;
    error: Error | null;
    refetch: () => void;
  };
  
  // Relationships
  useEntityRelationships: (type: EntityType, id: number, options?: any) => {
    data: RelationshipGroup[] | undefined;
    isLoading: boolean;
    error: Error | null;
    refetch: () => void;
  };
  
  getRelatedEntities: (
    entityType: EntityType,
    entityId: number,
    relatedType: EntityType,
    relationshipType?: string
  ) => Promise<EntityReference[]>;
  
  // Search
  searchEntities: (params: EntitySearchParams) => Promise<EntitySearchResult>;
  useEntitySearch: (params: EntitySearchParams) => {
    data: EntitySearchResult | undefined;
    isLoading: boolean;
    error: Error | null;
    refetch: () => void;
  };
  
  // Utilities
  createEntityReference: (type: EntityType, id: number, data: Record<string, any>) => EntityReference;
  getEntityDisplayName: (type: EntityType) => string;
  invalidateEntityCache: (type?: EntityType, id?: number) => void;
}

// ============================================================================
// MAIN HOOK
// ============================================================================

export const useEntityNavigation = (options: UseEntityNavigationProps = {}): EntityNavigationHook => {
  const [location, setLocation] = useLocation();
  const queryClient = useQueryClient();
  
  const { prefetchRelated = true, cacheTime = 1000 * 60 * 5 } = options;

  // ============================================================================
  // NAVIGATION FUNCTIONS
  // ============================================================================

  const navigateToEntity = useCallback((entity: EntityReference) => {
    setLocation(entity.url);
  }, [setLocation]);

  const navigateToEntityByTypeAndId = useCallback((type: EntityType, id: number) => {
    const url = getEntityUrl(type, id);
    setLocation(url);
  }, [setLocation]);

  const getCurrentEntity = useCallback((): { type: EntityType; id: number } | null => {
    // Parse current URL to extract entity type and ID
    const pathParts = location.split('/').filter(Boolean);
    
    if (pathParts.length < 2) return null;
    
    // Map URL paths to entity types
    const urlToTypeMap: Record<string, EntityType> = {
      'clients': ENTITY_TYPES.CLIENT,
      'contracts': ENTITY_TYPES.CONTRACT,
      'service-scopes': ENTITY_TYPES.SERVICE_SCOPE,
      'assets': ENTITY_TYPES.ASSET,
      'safs': ENTITY_TYPES.SAF,
      'cocs': ENTITY_TYPES.COC,
      'proposals': ENTITY_TYPES.PROPOSAL,
      'documents': ENTITY_TYPES.DOCUMENT,
      'transactions': ENTITY_TYPES.FINANCIAL_TRANSACTION,
      'license-pools': ENTITY_TYPES.LICENSE_POOL,
      'services': ENTITY_TYPES.SERVICE,
      'users': ENTITY_TYPES.USER,
      'audit-logs': ENTITY_TYPES.AUDIT_LOG
    };
    
    const type = urlToTypeMap[pathParts[0]];
    const id = parseInt(pathParts[1]);
    
    if (type && !isNaN(id)) {
      return { type, id };
    }
    
    return null;
  }, [location]);

  // ============================================================================
  // ENTITY FETCHING
  // ============================================================================

  const getEntity = useCallback(async (type: EntityType, id: number): Promise<EntityReference | null> => {
    try {
      const response = await fetch(`/api/entities/${type}/${id}`);
      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error(`Failed to fetch entity: ${response.statusText}`);
      }
      return response.json();
    } catch (error) {
      console.error(`Error fetching entity ${type}:${id}:`, error);
      throw error;
    }
  }, []);

  const useEntity = useCallback((type: EntityType, id: number) => {
    return useQuery({
      queryKey: ['entity', type, id],
      queryFn: () => getEntity(type, id),
      staleTime: cacheTime,
      retry: (failureCount, error: any) => {
        // Don't retry on 404 errors
        if (error?.message?.includes('404')) return false;
        return failureCount < 3;
      }
    });
  }, [getEntity, cacheTime]);

  // ============================================================================
  // RELATIONSHIPS
  // ============================================================================

  const useEntityRelationships = useCallback((type: EntityType, id: number, options: any = {}) => {
    return useQuery({
      queryKey: ['entity-relationships', type, id, options],
      queryFn: async (): Promise<RelationshipGroup[]> => {
        const params = new URLSearchParams();
        
        if (options.includeTypes?.length) {
          params.append('includeTypes', options.includeTypes.join(','));
        }
        if (options.excludeTypes?.length) {
          params.append('excludeTypes', options.excludeTypes.join(','));
        }
        if (options.limit) {
          params.append('limit', options.limit.toString());
        }
        
        const queryString = params.toString();
        const url = `/api/entities/${type}/${id}/relationships${queryString ? `?${queryString}` : ''}`;
        
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to fetch relationships: ${response.statusText}`);
        }
        return response.json();
      },
      staleTime: cacheTime,
      enabled: !isNaN(id) && id > 0
    });
  }, [cacheTime]);

  const getRelatedEntities = useCallback(async (
    entityType: EntityType,
    entityId: number,
    relatedType: EntityType,
    relationshipType?: string
  ): Promise<EntityReference[]> => {
    try {
      const params = new URLSearchParams();
      if (relationshipType) {
        params.append('relationshipType', relationshipType);
      }
      
      const queryString = params.toString();
      const url = `/api/entities/${entityType}/${entityId}/related/${relatedType}${queryString ? `?${queryString}` : ''}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch related entities: ${response.statusText}`);
      }
      return response.json();
    } catch (error) {
      console.error('Error fetching related entities:', error);
      throw error;
    }
  }, []);

  // ============================================================================
  // SEARCH
  // ============================================================================

  const searchEntities = useCallback(async (params: EntitySearchParams): Promise<EntitySearchResult> => {
    try {
      const searchParams = new URLSearchParams();
      
      if (params.query) searchParams.append('query', params.query);
      if (params.entityTypes?.length) searchParams.append('entityTypes', params.entityTypes.join(','));
      if (params.relationshipTypes?.length) searchParams.append('relationshipTypes', params.relationshipTypes.join(','));
      if (params.limit) searchParams.append('limit', params.limit.toString());
      if (params.offset) searchParams.append('offset', params.offset.toString());
      
      const response = await fetch(`/api/entities/search?${searchParams.toString()}`);
      if (!response.ok) {
        throw new Error(`Search failed: ${response.statusText}`);
      }
      return response.json();
    } catch (error) {
      console.error('Error searching entities:', error);
      throw error;
    }
  }, []);

  const useEntitySearch = useCallback((params: EntitySearchParams) => {
    const queryKey = ['entity-search', params];
    
    return useQuery({
      queryKey,
      queryFn: () => searchEntities(params),
      staleTime: 1000 * 30, // 30 seconds for search results
      enabled: !!(params.query || params.entityTypes?.length),
      keepPreviousData: true
    });
  }, [searchEntities]);

  // ============================================================================
  // UTILITIES
  // ============================================================================

  const createEntityReference = useCallback((
    type: EntityType, 
    id: number, 
    data: Record<string, any>
  ): EntityReference => {
    const definition = getEntityDefinition(type);
    const name = data[definition.primaryField] || `${definition.displayName} ${id}`;
    
    return {
      id,
      type,
      name,
      url: getEntityUrl(type, id),
      status: definition.statusField ? data[definition.statusField] : undefined,
      icon: definition.icon,
      metadata: {
        secondaryText: definition.secondaryField ? data[definition.secondaryField] : undefined,
        ...data
      }
    };
  }, []);

  const getEntityDisplayName = useCallback((type: EntityType): string => {
    return getEntityDefinition(type).displayName;
  }, []);

  const invalidateEntityCache = useCallback((type?: EntityType, id?: number) => {
    if (type && id) {
      // Invalidate specific entity
      queryClient.invalidateQueries({ queryKey: ['entity', type, id] });
      queryClient.invalidateQueries({ queryKey: ['entity-relationships', type, id] });
    } else if (type) {
      // Invalidate all entities of this type
      queryClient.invalidateQueries({ queryKey: ['entity', type] });
      queryClient.invalidateQueries({ queryKey: ['entity-relationships', type] });
    } else {
      // Invalidate all entity-related queries
      queryClient.invalidateQueries({ queryKey: ['entity'] });
      queryClient.invalidateQueries({ queryKey: ['entity-relationships'] });
      queryClient.invalidateQueries({ queryKey: ['entity-search'] });
    }
  }, [queryClient]);

  // ============================================================================
  // PREFETCHING
  // ============================================================================

  // Prefetch related entities when viewing an entity
  const currentEntity = getCurrentEntity();
  
  React.useEffect(() => {
    if (prefetchRelated && currentEntity) {
      // Prefetch relationships for current entity
      queryClient.prefetchQuery({
        queryKey: ['entity-relationships', currentEntity.type, currentEntity.id],
        queryFn: async () => {
          const response = await fetch(`/api/entities/${currentEntity.type}/${currentEntity.id}/relationships`);
          return response.json();
        },
        staleTime: cacheTime
      });
    }
  }, [currentEntity, prefetchRelated, queryClient, cacheTime]);

  // ============================================================================
  // RETURN HOOK INTERFACE
  // ============================================================================

  return useMemo(() => ({
    // Navigation
    navigateToEntity,
    navigateToEntityByTypeAndId,
    getCurrentEntity,
    
    // Entity fetching
    getEntity,
    useEntity,
    
    // Relationships
    useEntityRelationships,
    getRelatedEntities,
    
    // Search
    searchEntities,
    useEntitySearch,
    
    // Utilities
    createEntityReference,
    getEntityDisplayName,
    invalidateEntityCache
  }), [
    navigateToEntity,
    navigateToEntityByTypeAndId,
    getCurrentEntity,
    getEntity,
    useEntity,
    useEntityRelationships,
    getRelatedEntities,
    searchEntities,
    useEntitySearch,
    createEntityReference,
    getEntityDisplayName,
    invalidateEntityCache
  ]);
};

// ============================================================================
// CONVENIENCE HOOKS
// ============================================================================

/**
 * Hook for working with current entity in URL
 */
export const useCurrentEntity = () => {
  const { getCurrentEntity, useEntity } = useEntityNavigation();
  const currentEntity = getCurrentEntity();
  
  const entityQuery = useEntity(
    currentEntity?.type || ENTITY_TYPES.CLIENT, 
    currentEntity?.id || 0
  );
  
  return {
    currentEntity,
    entity: entityQuery.data,
    isLoading: entityQuery.isLoading,
    error: entityQuery.error,
    refetch: entityQuery.refetch
  };
};

/**
 * Hook for entity relationships of current entity
 */
export const useCurrentEntityRelationships = (options?: any) => {
  const { getCurrentEntity, useEntityRelationships } = useEntityNavigation();
  const currentEntity = getCurrentEntity();
  
  return useEntityRelationships(
    currentEntity?.type || ENTITY_TYPES.CLIENT,
    currentEntity?.id || 0,
    options
  );
};

// ============================================================================
// EXPORTS
// ============================================================================

export type { EntityNavigationHook, UseEntityNavigationProps };
export default useEntityNavigation; 