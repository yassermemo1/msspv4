/**
 * Entity Relationship System
 * 
 * This module provides a comprehensive system for managing relationships between entities
 * similar to Jira's internal linking or Wikipedia's interconnected pages.
 */

import { z } from "zod";

// ============================================================================
// ENTITY TYPES
// ============================================================================

export const ENTITY_TYPES = {
  CLIENT: 'client',
  CONTRACT: 'contract', 
  SERVICE_SCOPE: 'service_scope',
  ASSET: 'hardware_asset',
  SAF: 'service_authorization_form',
  COC: 'certificate_of_compliance',
  PROPOSAL: 'proposal',
  DOCUMENT: 'document',
  FINANCIAL_TRANSACTION: 'financial_transaction',
  LICENSE_POOL: 'license_pool',
  SERVICE: 'service',
  USER: 'user',
  AUDIT_LOG: 'audit_log'
} as const;

export type EntityType = typeof ENTITY_TYPES[keyof typeof ENTITY_TYPES];

// ============================================================================
// RELATIONSHIP TYPES
// ============================================================================

export const RELATIONSHIP_TYPES = {
  // Direct ownership/containment
  OWNS: 'owns',
  BELONGS_TO: 'belongs_to',
  CONTAINS: 'contains',
  PART_OF: 'part_of',
  
  // Process relationships
  DEPENDS_ON: 'depends_on',
  BLOCKS: 'blocks',
  RELATES_TO: 'relates_to',
  REFERENCES: 'references',
  
  // Workflow relationships
  CREATED_BY: 'created_by',
  ASSIGNED_TO: 'assigned_to',
  APPROVED_BY: 'approved_by',
  ISSUED_FOR: 'issued_for',
  
  // Document relationships
  ATTACHED_TO: 'attached_to',
  SUPERSEDES: 'supersedes',
  SUPERSEDED_BY: 'superseded_by',
  
  // Financial relationships
  PAID_FOR: 'paid_for',
  INVOICED_TO: 'invoiced_to',
  COSTS: 'costs',
  
  // Service relationships
  PROVIDES: 'provides',
  USES: 'uses',
  AUTHORIZES: 'authorizes',
  COMPLIES_WITH: 'complies_with'
} as const;

export type RelationshipType = typeof RELATIONSHIP_TYPES[keyof typeof RELATIONSHIP_TYPES];

// ============================================================================
// ENTITY DEFINITIONS
// ============================================================================

export interface EntityDefinition {
  type: EntityType;
  displayName: string;
  pluralName: string;
  icon: string;
  urlPath: string;
  primaryField: string; // Field to display as title
  secondaryField?: string; // Field to display as subtitle
  statusField?: string; // Field that indicates status
  colorField?: string; // Field that determines color
  searchableFields: string[];
  sortableFields: string[];
}

export const ENTITY_DEFINITIONS: Record<EntityType, EntityDefinition> = {
  [ENTITY_TYPES.CLIENT]: {
    type: ENTITY_TYPES.CLIENT,
    displayName: 'Client',
    pluralName: 'Clients',
    icon: 'Building',
    urlPath: '/clients',
    primaryField: 'name',
    secondaryField: 'industry',
    statusField: 'status',
    searchableFields: ['name', 'industry', 'address', 'description'],
    sortableFields: ['name', 'industry', 'createdAt', 'status']
  },
  
  [ENTITY_TYPES.CONTRACT]: {
    type: ENTITY_TYPES.CONTRACT,
    displayName: 'Contract',
    pluralName: 'Contracts',
    icon: 'FileText',
    urlPath: '/contracts',
    primaryField: 'name',
    secondaryField: 'totalValue',
    statusField: 'status',
    searchableFields: ['name', 'notes'],
    sortableFields: ['name', 'startDate', 'endDate', 'totalValue', 'status']
  },
  
  [ENTITY_TYPES.SERVICE_SCOPE]: {
    type: ENTITY_TYPES.SERVICE_SCOPE,
    displayName: 'Service Scope',
    pluralName: 'Service Scopes',
    icon: 'Settings',
    urlPath: '/service-scopes',
    primaryField: 'name',
    secondaryField: 'description',
    statusField: 'status',
    searchableFields: ['name', 'description'],
    sortableFields: ['name', 'createdAt', 'status']
  },
  
  [ENTITY_TYPES.ASSET]: {
    type: ENTITY_TYPES.ASSET,
    displayName: 'Hardware Asset',
    pluralName: 'Hardware Assets',
    icon: 'Monitor',
    urlPath: '/assets',
    primaryField: 'name',
    secondaryField: 'model',
    statusField: 'status',
    searchableFields: ['name', 'model', 'serialNumber', 'manufacturer'],
    sortableFields: ['name', 'model', 'purchaseDate', 'status']
  },
  
  [ENTITY_TYPES.SAF]: {
    type: ENTITY_TYPES.SAF,
    displayName: 'Service Authorization Form',
    pluralName: 'Service Authorization Forms',
    icon: 'Shield',
    urlPath: '/safs',
    primaryField: 'safNumber',
    secondaryField: 'description',
    statusField: 'status',
    searchableFields: ['safNumber', 'description', 'scope'],
    sortableFields: ['safNumber', 'createdAt', 'status']
  },
  
  [ENTITY_TYPES.COC]: {
    type: ENTITY_TYPES.COC,
    displayName: 'Certificate of Compliance',
    pluralName: 'Certificates of Compliance',
    icon: 'Award',
    urlPath: '/cocs',
    primaryField: 'certificateNumber',
    secondaryField: 'description',
    statusField: 'status',
    searchableFields: ['certificateNumber', 'description', 'complianceType'],
    sortableFields: ['certificateNumber', 'issuedDate', 'status']
  },
  
  [ENTITY_TYPES.PROPOSAL]: {
    type: ENTITY_TYPES.PROPOSAL,
    displayName: 'Proposal',
    pluralName: 'Proposals',
    icon: 'FileCheck',
    urlPath: '/proposals',
    primaryField: 'type',
    secondaryField: 'proposedValue',
    statusField: 'status',
    searchableFields: ['type', 'notes'],
    sortableFields: ['type', 'proposedValue', 'createdAt', 'status']
  },
  
  [ENTITY_TYPES.DOCUMENT]: {
    type: ENTITY_TYPES.DOCUMENT,
    displayName: 'Document',
    pluralName: 'Documents',
    icon: 'File',
    urlPath: '/documents',
    primaryField: 'name',
    secondaryField: 'documentType',
    statusField: 'isActive',
    searchableFields: ['name', 'description', 'documentType'],
    sortableFields: ['name', 'documentType', 'createdAt']
  },
  
  [ENTITY_TYPES.FINANCIAL_TRANSACTION]: {
    type: ENTITY_TYPES.FINANCIAL_TRANSACTION,
    displayName: 'Financial Transaction',
    pluralName: 'Financial Transactions',
    icon: 'DollarSign',
    urlPath: '/transactions',
    primaryField: 'description',
    secondaryField: 'amount',
    statusField: 'status',
    searchableFields: ['description', 'reference', 'category'],
    sortableFields: ['description', 'amount', 'transactionDate', 'status']
  },
  
  [ENTITY_TYPES.LICENSE_POOL]: {
    type: ENTITY_TYPES.LICENSE_POOL,
    displayName: 'License Pool',
    pluralName: 'License Pools',
    icon: 'Key',
    urlPath: '/license-pools',
    primaryField: 'name',
    secondaryField: 'totalLicenses',
    statusField: 'status',
    searchableFields: ['name', 'description', 'vendor'],
    sortableFields: ['name', 'totalLicenses', 'createdAt', 'status']
  },
  
  [ENTITY_TYPES.SERVICE]: {
    type: ENTITY_TYPES.SERVICE,
    displayName: 'Service',
    pluralName: 'Services',
    icon: 'Cog',
    urlPath: '/services',
    primaryField: 'name',
    secondaryField: 'category',
    statusField: 'isActive',
    searchableFields: ['name', 'description', 'category'],
    sortableFields: ['name', 'category', 'createdAt']
  },
  
  [ENTITY_TYPES.USER]: {
    type: ENTITY_TYPES.USER,
    displayName: 'User',
    pluralName: 'Users',
    icon: 'User',
    urlPath: '/users',
    primaryField: 'name',
    secondaryField: 'email',
    statusField: 'isActive',
    searchableFields: ['name', 'email', 'role'],
    sortableFields: ['name', 'email', 'role', 'createdAt']
  },
  
  [ENTITY_TYPES.AUDIT_LOG]: {
    type: ENTITY_TYPES.AUDIT_LOG,
    displayName: 'Audit Log',
    pluralName: 'Audit Logs',
    icon: 'History',
    urlPath: '/audit-logs',
    primaryField: 'action',
    secondaryField: 'entityType',
    searchableFields: ['action', 'entityType', 'details'],
    sortableFields: ['action', 'entityType', 'timestamp']
  }
};

// ============================================================================
// RELATIONSHIP SCHEMAS
// ============================================================================

export const EntityReferenceSchema = z.object({
  id: z.number(),
  type: z.enum(Object.values(ENTITY_TYPES) as [EntityType, ...EntityType[]]),
  name: z.string(),
  url: z.string(),
  status: z.string().optional(),
  icon: z.string().optional(),
  metadata: z.record(z.any()).optional()
});

export type EntityReference = z.infer<typeof EntityReferenceSchema>;

export const RelationshipSchema = z.object({
  id: z.string(),
  sourceEntity: EntityReferenceSchema,
  targetEntity: EntityReferenceSchema,
  relationshipType: z.enum(Object.values(RELATIONSHIP_TYPES) as [RelationshipType, ...RelationshipType[]]),
  isReverse: z.boolean().default(false),
  strength: z.number().min(1).max(10).default(5), // Relationship strength for ordering
  metadata: z.record(z.any()).optional(),
  createdAt: z.string(),
  updatedAt: z.string()
});

export type Relationship = z.infer<typeof RelationshipSchema>;

export const RelationshipGroupSchema = z.object({
  type: z.enum(Object.values(RELATIONSHIP_TYPES) as [RelationshipType, ...RelationshipType[]]),
  displayName: z.string(),
  relationships: z.array(RelationshipSchema),
  count: z.number(),
  icon: z.string().optional()
});

export type RelationshipGroup = z.infer<typeof RelationshipGroupSchema>;

// ============================================================================
// RELATIONSHIP MAPPING
// ============================================================================

export interface RelationshipMapping {
  sourceType: EntityType;
  targetType: EntityType;
  relationshipType: RelationshipType;
  reverseRelationshipType?: RelationshipType;
  displayName: string;
  reverseDisplayName?: string;
  icon: string;
  color: string;
  description: string;
}

export const RELATIONSHIP_MAPPINGS: RelationshipMapping[] = [
  // Client relationships
  {
    sourceType: ENTITY_TYPES.CLIENT,
    targetType: ENTITY_TYPES.CONTRACT,
    relationshipType: RELATIONSHIP_TYPES.OWNS,
    reverseRelationshipType: RELATIONSHIP_TYPES.BELONGS_TO,
    displayName: 'Has Contracts',
    reverseDisplayName: 'Client',
    icon: 'FileText',
    color: 'blue',
    description: 'Client has active and historical contracts'
  },
  
  {
    sourceType: ENTITY_TYPES.CLIENT,
    targetType: ENTITY_TYPES.ASSET,
    relationshipType: RELATIONSHIP_TYPES.OWNS,
    reverseRelationshipType: RELATIONSHIP_TYPES.BELONGS_TO,
    displayName: 'Hardware Assets',
    reverseDisplayName: 'Assigned to Client',
    icon: 'Monitor',
    color: 'green',
    description: 'Hardware assets assigned to this client'
  },
  
  {
    sourceType: ENTITY_TYPES.CLIENT,
    targetType: ENTITY_TYPES.SAF,
    relationshipType: RELATIONSHIP_TYPES.OWNS,
    reverseRelationshipType: RELATIONSHIP_TYPES.ISSUED_FOR,
    displayName: 'Service Authorization Forms',
    reverseDisplayName: 'Issued for Client',
    icon: 'Shield',
    color: 'purple',
    description: 'Service authorization forms issued for this client'
  },
  
  {
    sourceType: ENTITY_TYPES.CLIENT,
    targetType: ENTITY_TYPES.COC,
    relationshipType: RELATIONSHIP_TYPES.OWNS,
    reverseRelationshipType: RELATIONSHIP_TYPES.ISSUED_FOR,
    displayName: 'Certificates of Compliance',
    reverseDisplayName: 'Issued for Client',
    icon: 'Award',
    color: 'yellow',
    description: 'Compliance certificates issued for this client'
  },
  
  // Contract relationships
  {
    sourceType: ENTITY_TYPES.CONTRACT,
    targetType: ENTITY_TYPES.SERVICE_SCOPE,
    relationshipType: RELATIONSHIP_TYPES.CONTAINS,
    reverseRelationshipType: RELATIONSHIP_TYPES.PART_OF,
    displayName: 'Service Scopes',
    reverseDisplayName: 'Part of Contract',
    icon: 'Settings',
    color: 'indigo',
    description: 'Service scopes defined within this contract'
  },
  
  {
    sourceType: ENTITY_TYPES.CONTRACT,
    targetType: ENTITY_TYPES.PROPOSAL,
    relationshipType: RELATIONSHIP_TYPES.CONTAINS,
    reverseRelationshipType: RELATIONSHIP_TYPES.PART_OF,
    displayName: 'Proposals',
    reverseDisplayName: 'Associated Contract',
    icon: 'FileCheck',
    color: 'orange',
    description: 'Proposals associated with this contract'
  },
  
  {
    sourceType: ENTITY_TYPES.CONTRACT,
    targetType: ENTITY_TYPES.FINANCIAL_TRANSACTION,
    relationshipType: RELATIONSHIP_TYPES.CONTAINS,
    reverseRelationshipType: RELATIONSHIP_TYPES.PART_OF,
    displayName: 'Financial Transactions',
    reverseDisplayName: 'Related Contract',
    icon: 'DollarSign',
    color: 'green',
    description: 'Financial transactions related to this contract'
  },
  
  // SAF relationships
  {
    sourceType: ENTITY_TYPES.SAF,
    targetType: ENTITY_TYPES.COC,
    relationshipType: RELATIONSHIP_TYPES.AUTHORIZES,
    reverseRelationshipType: RELATIONSHIP_TYPES.COMPLIES_WITH,
    displayName: 'Authorizes Compliance',
    reverseDisplayName: 'Authorized by SAF',
    icon: 'Award',
    color: 'purple',
    description: 'Compliance certificates authorized by this SAF'
  },
  
  {
    sourceType: ENTITY_TYPES.SAF,
    targetType: ENTITY_TYPES.SERVICE_SCOPE,
    relationshipType: RELATIONSHIP_TYPES.AUTHORIZES,
    reverseRelationshipType: RELATIONSHIP_TYPES.COMPLIES_WITH,
    displayName: 'Authorizes Services',
    reverseDisplayName: 'Authorized by SAF',
    icon: 'Settings',
    color: 'blue',
    description: 'Service scopes authorized by this SAF'
  },
  
  // Asset relationships
  {
    sourceType: ENTITY_TYPES.ASSET,
    targetType: ENTITY_TYPES.SERVICE_SCOPE,
    relationshipType: RELATIONSHIP_TYPES.USES,
    reverseRelationshipType: RELATIONSHIP_TYPES.USES,
    displayName: 'Used in Services',
    reverseDisplayName: 'Uses Assets',
    icon: 'Link',
    color: 'gray',
    description: 'Services that utilize this asset'
  },
  
  // Document relationships
  {
    sourceType: ENTITY_TYPES.DOCUMENT,
    targetType: ENTITY_TYPES.CLIENT,
    relationshipType: RELATIONSHIP_TYPES.ATTACHED_TO,
    reverseRelationshipType: RELATIONSHIP_TYPES.OWNS,
    displayName: 'Related to Client',
    reverseDisplayName: 'Documents',
    icon: 'File',
    color: 'gray',
    description: 'Documents attached to entities'
  },
  
  {
    sourceType: ENTITY_TYPES.DOCUMENT,
    targetType: ENTITY_TYPES.CONTRACT,
    relationshipType: RELATIONSHIP_TYPES.ATTACHED_TO,
    reverseRelationshipType: RELATIONSHIP_TYPES.OWNS,
    displayName: 'Related to Contract',
    reverseDisplayName: 'Documents',
    icon: 'File',
    color: 'gray',
    description: 'Documents attached to contracts'
  }
];

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export function getEntityDefinition(type: EntityType): EntityDefinition {
  return ENTITY_DEFINITIONS[type];
}

export function getEntityUrl(type: EntityType, id: number): string {
  const definition = getEntityDefinition(type);
  return `${definition.urlPath}/${id}`;
}

export function getRelationshipMappings(sourceType: EntityType): RelationshipMapping[] {
  return RELATIONSHIP_MAPPINGS.filter(mapping => mapping.sourceType === sourceType);
}

export function getReverseRelationshipMappings(targetType: EntityType): RelationshipMapping[] {
  return RELATIONSHIP_MAPPINGS.filter(mapping => mapping.targetType === targetType);
}

export function getRelationshipDisplayName(type: RelationshipType, isReverse: boolean = false): string {
  const mapping = RELATIONSHIP_MAPPINGS.find(m => 
    isReverse ? m.reverseRelationshipType === type : m.relationshipType === type
  );
  
  if (mapping) {
    return isReverse ? (mapping.reverseDisplayName || mapping.displayName) : mapping.displayName;
  }
  
  // Fallback to formatted relationship type
  return type.split('_').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  ).join(' ');
}

export function createEntityReference(
  id: number, 
  type: EntityType, 
  data: Record<string, any>
): EntityReference {
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
}

export function groupRelationshipsByType(relationships: Relationship[]): RelationshipGroup[] {
  const groups = new Map<RelationshipType, RelationshipGroup>();
  
  relationships.forEach(relationship => {
    const type = relationship.relationshipType;
    
    if (!groups.has(type)) {
      groups.set(type, {
        type,
        displayName: getRelationshipDisplayName(type, relationship.isReverse),
        relationships: [],
        count: 0,
        icon: RELATIONSHIP_MAPPINGS.find(m => 
          relationship.isReverse ? m.reverseRelationshipType === type : m.relationshipType === type
        )?.icon
      });
    }
    
    const group = groups.get(type)!;
    group.relationships.push(relationship);
    group.count += 1;
  });
  
  return Array.from(groups.values()).sort((a, b) => b.count - a.count);
}

// ============================================================================
// SEARCH AND FILTER UTILITIES
// ============================================================================

export interface EntitySearchParams {
  query?: string;
  entityTypes?: EntityType[];
  relationshipTypes?: RelationshipType[];
  limit?: number;
  offset?: number;
}

export interface EntitySearchResult {
  entities: EntityReference[];
  total: number;
  hasMore: boolean;
}

export function buildEntitySearchQuery(params: EntitySearchParams): string {
  const conditions: string[] = [];
  
  if (params.query) {
    // This would be implemented with proper SQL building
    conditions.push(`searchable_content ILIKE '%${params.query}%'`);
  }
  
  if (params.entityTypes?.length) {
    conditions.push(`entity_type IN (${params.entityTypes.map(t => `'${t}'`).join(', ')})`);
  }
  
  return conditions.length > 0 ? conditions.join(' AND ') : '1=1';
} 