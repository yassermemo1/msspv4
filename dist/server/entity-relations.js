"use strict";
/**
 * Entity Relations Service
 *
 * Backend service for managing entity relationships and providing
 * relationship data for the navigation system.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.entityRelationsService = exports.EntityRelationsService = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("./db");
const schema_1 = require("@shared/schema");
const entity_relations_1 = require("@shared/entity-relations");
const ENTITY_FETCHERS = {
    [entity_relations_1.ENTITY_TYPES.CLIENT]: {
        table: schema_1.clients,
        transformer: (data) => (0, entity_relations_1.createEntityReference)(data.id, entity_relations_1.ENTITY_TYPES.CLIENT, data)
    },
    [entity_relations_1.ENTITY_TYPES.CONTRACT]: {
        table: schema_1.contracts,
        transformer: (data) => (0, entity_relations_1.createEntityReference)(data.id, entity_relations_1.ENTITY_TYPES.CONTRACT, data)
    },
    [entity_relations_1.ENTITY_TYPES.SERVICE_SCOPE]: {
        table: schema_1.serviceScopes,
        transformer: (data) => (0, entity_relations_1.createEntityReference)(data.id, entity_relations_1.ENTITY_TYPES.SERVICE_SCOPE, data)
    },
    [entity_relations_1.ENTITY_TYPES.ASSET]: {
        table: schema_1.hardwareAssets,
        transformer: (data) => (0, entity_relations_1.createEntityReference)(data.id, entity_relations_1.ENTITY_TYPES.ASSET, data)
    },
    [entity_relations_1.ENTITY_TYPES.SAF]: {
        table: schema_1.serviceAuthorizationForms,
        transformer: (data) => (0, entity_relations_1.createEntityReference)(data.id, entity_relations_1.ENTITY_TYPES.SAF, data)
    },
    [entity_relations_1.ENTITY_TYPES.COC]: {
        table: schema_1.certificatesOfCompliance,
        transformer: (data) => (0, entity_relations_1.createEntityReference)(data.id, entity_relations_1.ENTITY_TYPES.COC, data)
    },
    [entity_relations_1.ENTITY_TYPES.PROPOSAL]: {
        table: schema_1.proposals,
        transformer: (data) => (0, entity_relations_1.createEntityReference)(data.id, entity_relations_1.ENTITY_TYPES.PROPOSAL, data)
    },
    [entity_relations_1.ENTITY_TYPES.DOCUMENT]: {
        table: schema_1.documents,
        transformer: (data) => (0, entity_relations_1.createEntityReference)(data.id, entity_relations_1.ENTITY_TYPES.DOCUMENT, data)
    },
    [entity_relations_1.ENTITY_TYPES.FINANCIAL_TRANSACTION]: {
        table: schema_1.financialTransactions,
        transformer: (data) => (0, entity_relations_1.createEntityReference)(data.id, entity_relations_1.ENTITY_TYPES.FINANCIAL_TRANSACTION, data)
    },
    [entity_relations_1.ENTITY_TYPES.LICENSE_POOL]: {
        table: schema_1.licensePools,
        transformer: (data) => (0, entity_relations_1.createEntityReference)(data.id, entity_relations_1.ENTITY_TYPES.LICENSE_POOL, data)
    },
    [entity_relations_1.ENTITY_TYPES.SERVICE]: {
        table: schema_1.services,
        transformer: (data) => (0, entity_relations_1.createEntityReference)(data.id, entity_relations_1.ENTITY_TYPES.SERVICE, data)
    },
    [entity_relations_1.ENTITY_TYPES.USER]: {
        table: schema_1.users,
        transformer: (data) => (0, entity_relations_1.createEntityReference)(data.id, entity_relations_1.ENTITY_TYPES.USER, data)
    },
    [entity_relations_1.ENTITY_TYPES.AUDIT_LOG]: {
        table: schema_1.auditLogs,
        transformer: (data) => (0, entity_relations_1.createEntityReference)(data.id, entity_relations_1.ENTITY_TYPES.AUDIT_LOG, data)
    }
};
// ============================================================================
// CORE SERVICE CLASS
// ============================================================================
class EntityRelationsService {
    /**
     * Get an entity by ID and type
     */
    async getEntity(type, id) {
        try {
            const fetcher = ENTITY_FETCHERS[type];
            if (!fetcher) {
                throw new Error(`Unknown entity type: ${type}`);
            }
            const result = await db_1.db
                .select()
                .from(fetcher.table)
                .where((0, drizzle_orm_1.eq)(fetcher.table.id, id))
                .limit(1);
            if (result.length === 0) {
                return null;
            }
            return fetcher.transformer(result[0]);
        }
        catch (error) {
            console.error(`Error fetching entity ${type}:${id}:`, error);
            return null;
        }
    }
    /**
     * Get all relationships for a given entity (both forward and reverse)
     */
    async getEntityRelationships(type, id, options = {}) {
        try {
            const relationships = [];
            // Get forward relationships (this entity -> others)
            const forwardRelationships = await this.getForwardRelationships(type, id, options);
            relationships.push(...forwardRelationships);
            // Get reverse relationships (others -> this entity)
            const reverseRelationships = await this.getReverseRelationships(type, id, options);
            relationships.push(...reverseRelationships);
            // Group relationships by type
            return (0, entity_relations_1.groupRelationshipsByType)(relationships);
        }
        catch (error) {
            console.error(`Error fetching relationships for ${type}:${id}:`, error);
            return [];
        }
    }
    /**
     * Get forward relationships (entity owns/contains/references others)
     */
    async getForwardRelationships(type, id, options = {}) {
        const relationships = [];
        switch (type) {
            case entity_relations_1.ENTITY_TYPES.CLIENT:
                // Client -> Contracts
                const contracts = await db_1.db
                    .select()
                    .from(ENTITY_FETCHERS[entity_relations_1.ENTITY_TYPES.CONTRACT].table)
                    .where((0, drizzle_orm_1.eq)(ENTITY_FETCHERS[entity_relations_1.ENTITY_TYPES.CONTRACT].table.clientId, id))
                    .limit(options.limit || 50);
                for (const contract of contracts) {
                    relationships.push(await this.createRelationship(type, id, entity_relations_1.ENTITY_TYPES.CONTRACT, contract.id, entity_relations_1.RELATIONSHIP_TYPES.OWNS, contract));
                }
                // Client -> Hardware Assets
                const clientAssets = await db_1.db
                    .select({
                    asset: schema_1.hardwareAssets,
                    assignment: {
                        id: (0, drizzle_orm_1.sql) `cha.id`,
                        assignedDate: (0, drizzle_orm_1.sql) `cha.assigned_date`
                    }
                })
                    .from(schema_1.hardwareAssets)
                    .innerJoin((0, drizzle_orm_1.sql) `client_hardware_assignments cha`, (0, drizzle_orm_1.eq)((0, drizzle_orm_1.sql) `cha.hardware_asset_id`, schema_1.hardwareAssets.id))
                    .where((0, drizzle_orm_1.eq)((0, drizzle_orm_1.sql) `cha.client_id`, id))
                    .limit(options.limit || 50);
                for (const { asset } of clientAssets) {
                    relationships.push(await this.createRelationship(type, id, entity_relations_1.ENTITY_TYPES.ASSET, asset.id, entity_relations_1.RELATIONSHIP_TYPES.OWNS, asset));
                }
                // Client -> SAFs
                const safs = await db_1.db
                    .select()
                    .from(schema_1.serviceAuthorizationForms)
                    .where((0, drizzle_orm_1.eq)(schema_1.serviceAuthorizationForms.clientId, id))
                    .limit(options.limit || 50);
                for (const saf of safs) {
                    relationships.push(await this.createRelationship(type, id, entity_relations_1.ENTITY_TYPES.SAF, saf.id, entity_relations_1.RELATIONSHIP_TYPES.OWNS, saf));
                }
                // Client -> COCs
                const cocs = await db_1.db
                    .select()
                    .from(schema_1.certificatesOfCompliance)
                    .where((0, drizzle_orm_1.eq)(schema_1.certificatesOfCompliance.clientId, id))
                    .limit(options.limit || 50);
                for (const coc of cocs) {
                    relationships.push(await this.createRelationship(type, id, entity_relations_1.ENTITY_TYPES.COC, coc.id, entity_relations_1.RELATIONSHIP_TYPES.OWNS, coc));
                }
                break;
            case entity_relations_1.ENTITY_TYPES.CONTRACT:
                // Contract -> Service Scopes
                const scopes = await db_1.db
                    .select()
                    .from(schema_1.serviceScopes)
                    .where((0, drizzle_orm_1.eq)(schema_1.serviceScopes.contractId, id))
                    .limit(options.limit || 50);
                for (const scope of scopes) {
                    relationships.push(await this.createRelationship(type, id, entity_relations_1.ENTITY_TYPES.SERVICE_SCOPE, scope.id, entity_relations_1.RELATIONSHIP_TYPES.CONTAINS, scope));
                }
                // Contract -> Proposals
                const contractProposals = await db_1.db
                    .select()
                    .from(schema_1.proposals)
                    .where((0, drizzle_orm_1.eq)(schema_1.proposals.contractId, id))
                    .limit(options.limit || 50);
                for (const proposal of contractProposals) {
                    relationships.push(await this.createRelationship(type, id, entity_relations_1.ENTITY_TYPES.PROPOSAL, proposal.id, entity_relations_1.RELATIONSHIP_TYPES.CONTAINS, proposal));
                }
                // Contract -> Financial Transactions
                const contractTransactions = await db_1.db
                    .select()
                    .from(schema_1.financialTransactions)
                    .where((0, drizzle_orm_1.eq)(schema_1.financialTransactions.contractId, id))
                    .limit(options.limit || 50);
                for (const transaction of contractTransactions) {
                    relationships.push(await this.createRelationship(type, id, entity_relations_1.ENTITY_TYPES.FINANCIAL_TRANSACTION, transaction.id, entity_relations_1.RELATIONSHIP_TYPES.CONTAINS, transaction));
                }
                break;
            case entity_relations_1.ENTITY_TYPES.SAF:
                // SAF -> COCs (authorizes compliance)
                const authorizedCocs = await db_1.db
                    .select()
                    .from(schema_1.certificatesOfCompliance)
                    .where((0, drizzle_orm_1.eq)(schema_1.certificatesOfCompliance.safId, id))
                    .limit(options.limit || 50);
                for (const coc of authorizedCocs) {
                    relationships.push(await this.createRelationship(type, id, entity_relations_1.ENTITY_TYPES.COC, coc.id, entity_relations_1.RELATIONSHIP_TYPES.AUTHORIZES, coc));
                }
                // SAF -> Service Scopes (authorizes services)
                const authorizedScopes = await db_1.db
                    .select()
                    .from(schema_1.serviceScopes)
                    .where((0, drizzle_orm_1.eq)(schema_1.serviceScopes.safId, id))
                    .limit(options.limit || 50);
                for (const scope of authorizedScopes) {
                    relationships.push(await this.createRelationship(type, id, entity_relations_1.ENTITY_TYPES.SERVICE_SCOPE, scope.id, entity_relations_1.RELATIONSHIP_TYPES.AUTHORIZES, scope));
                }
                break;
        }
        return relationships;
    }
    /**
     * Get reverse relationships (others reference this entity)
     */
    async getReverseRelationships(type, id, options = {}) {
        const relationships = [];
        switch (type) {
            case entity_relations_1.ENTITY_TYPES.CONTRACT:
                // Contracts -> Client (belongs to)
                const contract = await db_1.db
                    .select()
                    .from(schema_1.contracts)
                    .where((0, drizzle_orm_1.eq)(schema_1.contracts.id, id))
                    .limit(1);
                if (contract.length > 0 && contract[0].clientId) {
                    const client = await db_1.db
                        .select()
                        .from(schema_1.clients)
                        .where((0, drizzle_orm_1.eq)(schema_1.clients.id, contract[0].clientId))
                        .limit(1);
                    if (client.length > 0) {
                        relationships.push(await this.createRelationship(entity_relations_1.ENTITY_TYPES.CLIENT, client[0].id, type, id, entity_relations_1.RELATIONSHIP_TYPES.OWNS, client[0], true // isReverse
                        ));
                    }
                }
                break;
            case entity_relations_1.ENTITY_TYPES.SERVICE_SCOPE:
                // Service Scope -> Contract (part of)
                const scope = await db_1.db
                    .select()
                    .from(schema_1.serviceScopes)
                    .where((0, drizzle_orm_1.eq)(schema_1.serviceScopes.id, id))
                    .limit(1);
                if (scope.length > 0 && scope[0].contractId) {
                    const contract = await db_1.db
                        .select()
                        .from(schema_1.contracts)
                        .where((0, drizzle_orm_1.eq)(schema_1.contracts.id, scope[0].contractId))
                        .limit(1);
                    if (contract.length > 0) {
                        relationships.push(await this.createRelationship(entity_relations_1.ENTITY_TYPES.CONTRACT, contract[0].id, type, id, entity_relations_1.RELATIONSHIP_TYPES.CONTAINS, contract[0], true // isReverse
                        ));
                    }
                }
                break;
            case entity_relations_1.ENTITY_TYPES.COC:
                // COC -> SAF (authorized by)
                const coc = await db_1.db
                    .select()
                    .from(schema_1.certificatesOfCompliance)
                    .where((0, drizzle_orm_1.eq)(schema_1.certificatesOfCompliance.id, id))
                    .limit(1);
                if (coc.length > 0 && coc[0].safId) {
                    const saf = await db_1.db
                        .select()
                        .from(schema_1.serviceAuthorizationForms)
                        .where((0, drizzle_orm_1.eq)(schema_1.serviceAuthorizationForms.id, coc[0].safId))
                        .limit(1);
                    if (saf.length > 0) {
                        relationships.push(await this.createRelationship(entity_relations_1.ENTITY_TYPES.SAF, saf[0].id, type, id, entity_relations_1.RELATIONSHIP_TYPES.AUTHORIZES, saf[0], true // isReverse
                        ));
                    }
                }
                // COC -> Client (issued for)
                if (coc.length > 0 && coc[0].clientId) {
                    const client = await db_1.db
                        .select()
                        .from(schema_1.clients)
                        .where((0, drizzle_orm_1.eq)(schema_1.clients.id, coc[0].clientId))
                        .limit(1);
                    if (client.length > 0) {
                        relationships.push(await this.createRelationship(entity_relations_1.ENTITY_TYPES.CLIENT, client[0].id, type, id, entity_relations_1.RELATIONSHIP_TYPES.OWNS, client[0], true // isReverse
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
    async createRelationship(sourceType, sourceId, targetType, targetId, relationshipType, targetData, isReverse = false) {
        const sourceEntity = await this.getEntity(sourceType, sourceId);
        const targetEntity = ENTITY_FETCHERS[targetType].transformer(targetData);
        return {
            id: `${sourceType}:${sourceId}->${targetType}:${targetId}`,
            sourceEntity: sourceEntity,
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
    async searchEntities(params) {
        try {
            const results = [];
            const limit = params.limit || 20;
            const offset = params.offset || 0;
            // If specific entity types are requested, search only those
            const typesToSearch = params.entityTypes || Object.values(entity_relations_1.ENTITY_TYPES);
            for (const entityType of typesToSearch) {
                if (results.length >= limit)
                    break;
                const fetcher = ENTITY_FETCHERS[entityType];
                if (!fetcher)
                    continue;
                const definition = (0, entity_relations_1.getEntityDefinition)(entityType);
                // Build search conditions
                let query = db_1.db.select().from(fetcher.table);
                if (params.query) {
                    // Create search conditions for searchable fields
                    const searchConditions = definition.searchableFields.map(field => {
                        return (0, drizzle_orm_1.sql) `${fetcher.table[field]} ILIKE ${`%${params.query}%`}`;
                    });
                    if (searchConditions.length > 0) {
                        query = query.where((0, drizzle_orm_1.or)(...searchConditions));
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
        }
        catch (error) {
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
    async getRelationshipStats(type, id) {
        try {
            const groups = await this.getEntityRelationships(type, id);
            const stats = {
                totalRelationships: 0,
                relationshipTypes: {}
            };
            groups.forEach(group => {
                stats.totalRelationships += group.count;
                stats.relationshipTypes[group.type] = group.count;
            });
            return stats;
        }
        catch (error) {
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
    async getRelatedEntities(entityType, entityId, relatedEntityType, relationshipType) {
        try {
            const allGroups = await this.getEntityRelationships(entityType, entityId);
            const relatedEntities = [];
            allGroups.forEach(group => {
                if (relationshipType && group.type !== relationshipType) {
                    return;
                }
                group.relationships.forEach(relationship => {
                    if (relationship.targetEntity.type === relatedEntityType) {
                        relatedEntities.push(relationship.targetEntity);
                    }
                    else if (relationship.sourceEntity.type === relatedEntityType && relationship.isReverse) {
                        relatedEntities.push(relationship.sourceEntity);
                    }
                });
            });
            // Remove duplicates based on ID
            const uniqueEntities = relatedEntities.filter((entity, index, self) => index === self.findIndex(e => e.id === entity.id && e.type === entity.type));
            return uniqueEntities;
        }
        catch (error) {
            console.error(`Error getting related entities:`, error);
            return [];
        }
    }
}
exports.EntityRelationsService = EntityRelationsService;
// ============================================================================
// SINGLETON INSTANCE
// ============================================================================
exports.entityRelationsService = new EntityRelationsService();
