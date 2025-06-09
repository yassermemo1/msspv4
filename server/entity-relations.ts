/**
 * Entity Relations Service
 * 
 * Backend service for managing entity relationships and providing
 * relationship data for the navigation system.
 */

import { eq, and, or, desc, asc, sql, count, inArray } from "drizzle-orm";
import { db } from "./db";
import { 
  clients, contracts, serviceScopes, hardwareAssets, 
  serviceAuthorizationForms, certificatesOfCompliance, 
  proposals, documents, financialTransactions, licensePools,
  services, users, auditLogs
} from "@shared/schema";
import {
  EntityType, RelationshipType, EntityReference, Relationship, RelationshipGroup,
  ENTITY_TYPES, RELATIONSHIP_TYPES, ENTITY_DEFINITIONS, RELATIONSHIP_MAPPINGS,
  getEntityDefinition, createEntityReference, groupRelationshipsByType,
  EntitySearchParams, EntitySearchResult
} from "@shared/entity-relations";

// ============================================================================
// ENTITY FETCHERS
// ============================================================================

interface EntityFetcher {
  table: any;
  relations?: string[];
  transformer: (data: any) => EntityReference;
}

const ENTITY_FETCHERS: Record<EntityType, EntityFetcher> = {
  [ENTITY_TYPES.CLIENT]: {
    table: clients,
    transformer: (data) => createEntityReference(data.id, ENTITY_TYPES.CLIENT, data)
  },
  
  [ENTITY_TYPES.CONTRACT]: {
    table: contracts,
    transformer: (data) => createEntityReference(data.id, ENTITY_TYPES.CONTRACT, data)
  },
  
  [ENTITY_TYPES.SERVICE_SCOPE]: {
    table: serviceScopes,
    transformer: (data) => createEntityReference(data.id, ENTITY_TYPES.SERVICE_SCOPE, data)
  },
  
  [ENTITY_TYPES.ASSET]: {
    table: hardwareAssets,
    transformer: (data) => createEntityReference(data.id, ENTITY_TYPES.ASSET, data)
  },
  
  [ENTITY_TYPES.SAF]: {
    table: serviceAuthorizationForms,
    transformer: (data) => createEntityReference(data.id, ENTITY_TYPES.SAF, data)
  },
  
  [ENTITY_TYPES.COC]: {
    table: certificatesOfCompliance,
    transformer: (data) => createEntityReference(data.id, ENTITY_TYPES.COC, data)
  },
  
  [ENTITY_TYPES.PROPOSAL]: {
    table: proposals,
    transformer: (data) => createEntityReference(data.id, ENTITY_TYPES.PROPOSAL, data)
  },
  
  [ENTITY_TYPES.DOCUMENT]: {
    table: documents,
    transformer: (data) => createEntityReference(data.id, ENTITY_TYPES.DOCUMENT, data)
  },
  
  [ENTITY_TYPES.FINANCIAL_TRANSACTION]: {
    table: financialTransactions,
    transformer: (data) => createEntityReference(data.id, ENTITY_TYPES.FINANCIAL_TRANSACTION, data)
  },
  
  [ENTITY_TYPES.LICENSE_POOL]: {
    table: licensePools,
    transformer: (data) => createEntityReference(data.id, ENTITY_TYPES.LICENSE_POOL, data)
  },
  
  [ENTITY_TYPES.SERVICE]: {
    table: services,
    transformer: (data) => createEntityReference(data.id, ENTITY_TYPES.SERVICE, data)
  },
  
  [ENTITY_TYPES.USER]: {
    table: users,
    transformer: (data) => createEntityReference(data.id, ENTITY_TYPES.USER, data)
  },
  
  [ENTITY_TYPES.AUDIT_LOG]: {
    table: auditLogs,
    transformer: (data) => createEntityReference(data.id, ENTITY_TYPES.AUDIT_LOG, data)
  }
};

// ============================================================================
// CORE SERVICE CLASS
// ============================================================================

export class EntityRelationsService {
  
  /**
   * Get an entity by ID and type
   */
  async getEntity(type: EntityType, id: number): Promise<EntityReference | null> {
    try {
      const fetcher = ENTITY_FETCHERS[type];
      if (!fetcher) {
        throw new Error(`Unknown entity type: ${type}`);
      }

      const result = await db
        .select()
        .from(fetcher.table)
        .where(eq(fetcher.table.id, id))
        .limit(1);

      if (result.length === 0) {
        return null;
      }

      return fetcher.transformer(result[0]);
    } catch (error) {
      console.error(`Error fetching entity ${type}:${id}:`, error);
      return null;
    }
  }

  /**
   * Get all relationships for a given entity (both forward and reverse)
   */
  async getEntityRelationships(
    type: EntityType, 
    id: number,
    options: {
      includeTypes?: RelationshipType[];
      excludeTypes?: RelationshipType[];
      limit?: number;
    } = {}
  ): Promise<RelationshipGroup[]> {
    try {
      const relationships: Relationship[] = [];

      // Get forward relationships (this entity -> others)
      const forwardRelationships = await this.getForwardRelationships(type, id, options);
      relationships.push(...forwardRelationships);

      // Get reverse relationships (others -> this entity)
      const reverseRelationships = await this.getReverseRelationships(type, id, options);
      relationships.push(...reverseRelationships);

      // Group relationships by type
      return groupRelationshipsByType(relationships);
    } catch (error) {
      console.error(`Error fetching relationships for ${type}:${id}:`, error);
      return [];
    }
  }

  /**
   * Get forward relationships (entity owns/contains/references others)
   */
  private async getForwardRelationships(
    type: EntityType, 
    id: number,
    options: any = {}
  ): Promise<Relationship[]> {
    const relationships: Relationship[] = [];

    switch (type) {
      case ENTITY_TYPES.CLIENT:
        // Client -> Contracts
        const contracts = await db
          .select()
          .from(ENTITY_FETCHERS[ENTITY_TYPES.CONTRACT].table)
          .where(eq(ENTITY_FETCHERS[ENTITY_TYPES.CONTRACT].table.clientId, id))
          .limit(options.limit || 50);

        for (const contract of contracts) {
          relationships.push(await this.createRelationship(
            type, id,
            ENTITY_TYPES.CONTRACT, contract.id,
            RELATIONSHIP_TYPES.OWNS,
            contract
          ));
        }

        // Client -> Hardware Assets
        const clientAssets = await db
          .select({
            asset: hardwareAssets,
            assignment: {
              id: sql`cha.id`,
              assignedDate: sql`cha.assigned_date`
            }
          })
          .from(hardwareAssets)
          .innerJoin(
            sql`client_hardware_assignments cha`,
            eq(sql`cha.hardware_asset_id`, hardwareAssets.id)
          )
          .where(eq(sql`cha.client_id`, id))
          .limit(options.limit || 50);

        for (const { asset } of clientAssets) {
          relationships.push(await this.createRelationship(
            type, id,
            ENTITY_TYPES.ASSET, asset.id,
            RELATIONSHIP_TYPES.OWNS,
            asset
          ));
        }

        // Client -> SAFs
        const safs = await db
          .select()
          .from(serviceAuthorizationForms)
          .where(eq(serviceAuthorizationForms.clientId, id))
          .limit(options.limit || 50);

        for (const saf of safs) {
          relationships.push(await this.createRelationship(
            type, id,
            ENTITY_TYPES.SAF, saf.id,
            RELATIONSHIP_TYPES.OWNS,
            saf
          ));
        }

        // Client -> COCs
        const cocs = await db
          .select()
          .from(certificatesOfCompliance)
          .where(eq(certificatesOfCompliance.clientId, id))
          .limit(options.limit || 50);

        for (const coc of cocs) {
          relationships.push(await this.createRelationship(
            type, id,
            ENTITY_TYPES.COC, coc.id,
            RELATIONSHIP_TYPES.OWNS,
            coc
          ));
        }
        break;

      case ENTITY_TYPES.CONTRACT:
        // Contract -> Service Scopes
        const scopes = await db
          .select()
          .from(serviceScopes)
          .where(eq(serviceScopes.contractId, id))
          .limit(options.limit || 50);

        for (const scope of scopes) {
          relationships.push(await this.createRelationship(
            type, id,
            ENTITY_TYPES.SERVICE_SCOPE, scope.id,
            RELATIONSHIP_TYPES.CONTAINS,
            scope
          ));
        }

        // Contract -> Proposals
        const contractProposals = await db
          .select()
          .from(proposals)
          .where(eq(proposals.contractId, id))
          .limit(options.limit || 50);

        for (const proposal of contractProposals) {
          relationships.push(await this.createRelationship(
            type, id,
            ENTITY_TYPES.PROPOSAL, proposal.id,
            RELATIONSHIP_TYPES.CONTAINS,
            proposal
          ));
        }

        // Contract -> Financial Transactions
        const contractTransactions = await db
          .select()
          .from(financialTransactions)
          .where(eq(financialTransactions.contractId, id))
          .limit(options.limit || 50);

        for (const transaction of contractTransactions) {
          relationships.push(await this.createRelationship(
            type, id,
            ENTITY_TYPES.FINANCIAL_TRANSACTION, transaction.id,
            RELATIONSHIP_TYPES.CONTAINS,
            transaction
          ));
        }
        break;

      case ENTITY_TYPES.SAF:
        // SAF -> COCs (authorizes compliance)
        const authorizedCocs = await db
          .select()
          .from(certificatesOfCompliance)
          .where(eq(certificatesOfCompliance.safId, id))
          .limit(options.limit || 50);

        for (const coc of authorizedCocs) {
          relationships.push(await this.createRelationship(
            type, id,
            ENTITY_TYPES.COC, coc.id,
            RELATIONSHIP_TYPES.AUTHORIZES,
            coc
          ));
        }

        // SAF -> Service Scopes (authorizes services)
        const authorizedScopes = await db
          .select()
          .from(serviceScopes)
          .where(eq(serviceScopes.safId, id))
          .limit(options.limit || 50);

        for (const scope of authorizedScopes) {
          relationships.push(await this.createRelationship(
            type, id,
            ENTITY_TYPES.SERVICE_SCOPE, scope.id,
            RELATIONSHIP_TYPES.AUTHORIZES,
            scope
          ));
        }
        break;
    }

    return relationships;
  }

  /**
   * Get reverse relationships (others reference this entity)
   */
  private async getReverseRelationships(
    type: EntityType, 
    id: number,
    options: any = {}
  ): Promise<Relationship[]> {
    const relationships: Relationship[] = [];

    switch (type) {
      case ENTITY_TYPES.CONTRACT:
        // Contracts -> Client (belongs to)
        const contract = await db
          .select()
          .from(contracts)
          .where(eq(contracts.id, id))
          .limit(1);

        if (contract.length > 0 && contract[0].clientId) {
          const client = await db
            .select()
            .from(clients)
            .where(eq(clients.id, contract[0].clientId))
            .limit(1);

          if (client.length > 0) {
            relationships.push(await this.createRelationship(
              ENTITY_TYPES.CLIENT, client[0].id,
              type, id,
              RELATIONSHIP_TYPES.OWNS,
              client[0],
              true // isReverse
            ));
          }
        }
        break;

      case ENTITY_TYPES.SERVICE_SCOPE:
        // Service Scope -> Contract (part of)
        const scope = await db
          .select()
          .from(serviceScopes)
          .where(eq(serviceScopes.id, id))
          .limit(1);

        if (scope.length > 0 && scope[0].contractId) {
          const contract = await db
            .select()
            .from(contracts)
            .where(eq(contracts.id, scope[0].contractId))
            .limit(1);

          if (contract.length > 0) {
            relationships.push(await this.createRelationship(
              ENTITY_TYPES.CONTRACT, contract[0].id,
              type, id,
              RELATIONSHIP_TYPES.CONTAINS,
              contract[0],
              true // isReverse
            ));
          }
        }
        break;

      case ENTITY_TYPES.COC:
        // COC -> SAF (authorized by)
        const coc = await db
          .select()
          .from(certificatesOfCompliance)
          .where(eq(certificatesOfCompliance.id, id))
          .limit(1);

        if (coc.length > 0 && coc[0].safId) {
          const saf = await db
            .select()
            .from(serviceAuthorizationForms)
            .where(eq(serviceAuthorizationForms.id, coc[0].safId))
            .limit(1);

          if (saf.length > 0) {
            relationships.push(await this.createRelationship(
              ENTITY_TYPES.SAF, saf[0].id,
              type, id,
              RELATIONSHIP_TYPES.AUTHORIZES,
              saf[0],
              true // isReverse
            ));
          }
        }

        // COC -> Client (issued for)
        if (coc.length > 0 && coc[0].clientId) {
          const client = await db
            .select()
            .from(clients)
            .where(eq(clients.id, coc[0].clientId))
            .limit(1);

          if (client.length > 0) {
            relationships.push(await this.createRelationship(
              ENTITY_TYPES.CLIENT, client[0].id,
              type, id,
              RELATIONSHIP_TYPES.OWNS,
              client[0],
              true // isReverse
            ));
          }
        }
        break;
    }

    return relationships;
  }

  /**
   * Create a relationship object
   */
  private async createRelationship(
    sourceType: EntityType,
    sourceId: number,
    targetType: EntityType,
    targetId: number,
    relationshipType: RelationshipType,
    targetData: any,
    isReverse: boolean = false
  ): Promise<Relationship> {
    const sourceEntity = await this.getEntity(sourceType, sourceId);
    const targetEntity = ENTITY_FETCHERS[targetType].transformer(targetData);

    return {
      id: `${sourceType}:${sourceId}->${targetType}:${targetId}`,
      sourceEntity: sourceEntity!,
      targetEntity,
      relationshipType,
      isReverse,
      strength: 5, // Default strength
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  /**
   * Search entities across all types
   */
  async searchEntities(params: EntitySearchParams): Promise<EntitySearchResult> {
    try {
      const results: EntityReference[] = [];
      const limit = params.limit || 20;
      const offset = params.offset || 0;

      // If specific entity types are requested, search only those
      const typesToSearch = params.entityTypes || Object.values(ENTITY_TYPES);

      for (const entityType of typesToSearch) {
        if (results.length >= limit) break;

        const fetcher = ENTITY_FETCHERS[entityType];
        if (!fetcher) continue;

        const definition = getEntityDefinition(entityType);
        
        // Build search conditions
        let query = db.select().from(fetcher.table);

        if (params.query) {
          // Create search conditions for searchable fields
          const searchConditions = definition.searchableFields.map(field => {
            return sql`${fetcher.table[field]} ILIKE ${`%${params.query}%`}`;
          });

          if (searchConditions.length > 0) {
            query = query.where(or(...searchConditions));
          }
        }

        const entityResults = await query
          .limit(Math.min(limit - results.length, 10))
          .offset(offset);

        for (const result of entityResults) {
          results.push(fetcher.transformer(result));
        }
      }

      return {
        entities: results.slice(0, limit),
        total: results.length, // This would need a separate count query in production
        hasMore: results.length === limit
      };
    } catch (error) {
      console.error('Error searching entities:', error);
      return {
        entities: [],
        total: 0,
        hasMore: false
      };
    }
  }

  /**
   * Get relationship statistics for an entity
   */
  async getRelationshipStats(type: EntityType, id: number): Promise<{
    totalRelationships: number;
    relationshipTypes: Record<RelationshipType, number>;
  }> {
    try {
      const groups = await this.getEntityRelationships(type, id);
      
      const stats = {
        totalRelationships: 0,
        relationshipTypes: {} as Record<RelationshipType, number>
      };

      groups.forEach(group => {
        stats.totalRelationships += group.count;
        stats.relationshipTypes[group.type] = group.count;
      });

      return stats;
    } catch (error) {
      console.error(`Error getting relationship stats for ${type}:${id}:`, error);
      return {
        totalRelationships: 0,
        relationshipTypes: {}
      };
    }
  }

  /**
   * Get entities of a specific type that are related to the given entity
   */
  async getRelatedEntities(
    entityType: EntityType,
    entityId: number,
    relatedEntityType: EntityType,
    relationshipType?: RelationshipType
  ): Promise<EntityReference[]> {
    try {
      const allGroups = await this.getEntityRelationships(entityType, entityId);
      
      const relatedEntities: EntityReference[] = [];

      allGroups.forEach(group => {
        if (relationshipType && group.type !== relationshipType) {
          return;
        }

        group.relationships.forEach(relationship => {
          if (relationship.targetEntity.type === relatedEntityType) {
            relatedEntities.push(relationship.targetEntity);
          } else if (relationship.sourceEntity.type === relatedEntityType && relationship.isReverse) {
            relatedEntities.push(relationship.sourceEntity);
          }
        });
      });

      // Remove duplicates based on ID
      const uniqueEntities = relatedEntities.filter((entity, index, self) =>
        index === self.findIndex(e => e.id === entity.id && e.type === entity.type)
      );

      return uniqueEntities;
    } catch (error) {
      console.error(`Error getting related entities:`, error);
      return [];
    }
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const entityRelationsService = new EntityRelationsService(); 