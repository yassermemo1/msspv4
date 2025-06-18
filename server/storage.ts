import { 
  users, 
  userSettings,
  contracts, 
  clients, 
  services,
  financialTransactions,
  clientContacts,
  auditLogs,
  systemEvents,
  licensePools,
  hardwareAssets,
  individualLicenses,
  clientHardwareAssignments,
  clientLicenses,
  proposals,
  serviceAuthorizationForms,
  certificatesOfCompliance,
  userDashboardSettings,
  clientTeamAssignments,
  serviceScopes,
  serviceScopeFields,
  customFields,
  customFieldValues,
  documents,
  documentVersions,
  documentAccess,
  customWidgets,
  userPreferences,
  // clientExternalMappings, // removed deprecated external integrations

  type User,
  type InsertUser,
  type Client,
  type InsertClient,
  type Contract,
  type InsertContract,
  type Service,
  type InsertService,
  type FinancialTransaction,
  type InsertFinancialTransaction,
  type ClientContact,
  type InsertClientContact,
  type AuditLog,
  type InsertAuditLog,
  type SystemEvent,
  type InsertSystemEvent,
  type LicensePool,
  type InsertLicensePool,
  type HardwareAsset,
  type InsertHardwareAsset,
  type IndividualLicense,
  type InsertIndividualLicense,
  type Proposal,
  type InsertProposal,
  type ServiceAuthorizationForm,
  type InsertServiceAuthorizationForm,
  type CertificateOfCompliance,
  type InsertCertificateOfCompliance,
  type UserDashboardSetting,
  type InsertUserDashboardSetting,
  type ClientTeamAssignment,
  type InsertClientTeamAssignment,
  type ServiceScope,
  type InsertServiceScope,
  type UserSettings,
  type InsertUserSettings,
  type ClientHardwareAssignment,
  type InsertClientHardwareAssignment,
  type ClientLicense,
  type InsertClientLicense,
  type CustomField,
  type InsertCustomField,
  type CustomFieldValue,
  type InsertCustomFieldValue,
  type Document,
  type InsertDocument,
  type DocumentVersion,
  type InsertDocumentVersion,
  type DocumentAccess,
  type InsertDocumentAccess,
  type CustomWidget,
  type InsertCustomWidget,
  type UserPreference,
  type InsertUserPreference,
  PaginatedResponse,
  PaginationParams,
  ScopeDefinitionTemplateResponse,
  type ServiceScopeField, 
  type InsertServiceScopeField
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, like, or, asc, gte, lte, sql, isNull, isNotNull, ne } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import createMemoryStore from "memorystore";

import { pool } from "./db";

const PostgresSessionStore = connectPg(session);
const MemoryStore = createMemoryStore(session);

export interface IStorage {
  // User management
  getUser(id: number): Promise<User | undefined>;
  getUserById(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByLdapId(ldapId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined>;
  
  // User settings
  getUserSettings(userId: number): Promise<UserSettings | undefined>;
  createUserSettings(settings: InsertUserSettings): Promise<UserSettings>;
  updateUserSettings(userId: number, settings: Partial<InsertUserSettings>): Promise<UserSettings | undefined>;
  
  // Client management
  getAllClients(): Promise<Client[]>;
  getClientsWithStats(): Promise<(Client & { contractsCount: number; servicesCount: number; licensesCount: number; })[]>;
  getClient(id: number): Promise<Client | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: number, client: Partial<InsertClient>): Promise<Client | undefined>;
  deleteClient(id: number): Promise<boolean>;
  archiveClient(id: number): Promise<Client | undefined>;
  restoreClient(id: number): Promise<Client | undefined>;
  getArchivedClients(): Promise<Client[]>;
  getClientDeletionImpact(id: number): Promise<{
    canDelete: boolean;
    blockers: string[];
    dependencies: {
      contracts: number;
      documents: number;
      licenses: number;
      hardwareAssignments: number;
      teamAssignments: number;
      financialTransactions: number;
    };
  }>;
  searchClients(query: string): Promise<Client[]>;
  
  // Client contacts
  getClientContacts(clientId: number): Promise<ClientContact[]>;
  createClientContact(contact: InsertClientContact): Promise<ClientContact>;
  updateClientContact(id: number, contact: Partial<InsertClientContact>): Promise<ClientContact | undefined>;
  deleteClientContact(id: number): Promise<boolean>;
  
  // Services
  getAllServices(): Promise<Service[]>;
  getService(id: number): Promise<Service | undefined>;
  getServiceScopeDefinitionTemplate(id: number): Promise<ScopeDefinitionTemplateResponse | null>;
  createService(service: InsertService): Promise<Service>;
  updateService(id: number, service: Partial<InsertService>): Promise<Service | undefined>;
  deleteService(id: number): Promise<boolean>;
  
  // Contracts
  getAllContracts(): Promise<Contract[]>;
  getContract(id: number): Promise<Contract | undefined>;
  getClientContracts(clientId: number): Promise<Contract[]>;
  createContract(contract: InsertContract): Promise<Contract>;
  updateContract(id: number, contract: Partial<InsertContract>): Promise<Contract | undefined>;
  deleteContract(id: number): Promise<boolean>;
  
  // Service scopes
  getContractServiceScopes(contractId: number): Promise<ServiceScope[]>;
  getServiceScopesByClientId(clientId: number): Promise<ServiceScope[]>;
  createServiceScope(serviceScope: InsertServiceScope): Promise<ServiceScope>;
  updateServiceScope(id: number, serviceScope: Partial<InsertServiceScope>): Promise<ServiceScope | undefined>;
  deleteServiceScope(id: number): Promise<boolean>;
  restoreServiceScopeVersion(scopeId: number, versionId: number): Promise<ServiceScope | undefined>;
  
  // Proposals
  getContractProposals(contractId: number): Promise<Proposal[]>;
  createProposal(proposal: InsertProposal): Promise<Proposal>;
  updateProposal(id: number, proposal: Partial<InsertProposal>): Promise<Proposal | undefined>;
  deleteProposal(id: number): Promise<boolean>;
  
  // License management
  getAllLicensePools(): Promise<LicensePool[]>;
  getLicensePool(id: number): Promise<LicensePool | undefined>;
  createLicensePool(licensePool: InsertLicensePool): Promise<LicensePool>;
  updateLicensePool(id: number, licensePool: Partial<InsertLicensePool>): Promise<LicensePool | undefined>;
  deleteLicensePool(id: number): Promise<boolean>;
  
  getClientLicenses(clientId: number): Promise<ClientLicense[]>;
  getLicensePoolAllocations(licensePoolId: number): Promise<(ClientLicense & { clientName: string })[]>;
  getAllLicensePoolAllocations(): Promise<Record<number, (ClientLicense & { clientName: string })[]>>;
  createClientLicense(clientLicense: InsertClientLicense): Promise<ClientLicense>;
  updateClientLicense(id: number, clientLicense: Partial<InsertClientLicense>): Promise<ClientLicense | undefined>;
  deleteClientLicense(id: number): Promise<boolean>;
  
  // Individual license management
  getAllIndividualLicenses(): Promise<IndividualLicense[]>;
  getIndividualLicense(id: number): Promise<IndividualLicense | undefined>;
  getClientIndividualLicenses(clientId: number): Promise<IndividualLicense[]>;
  createIndividualLicense(license: InsertIndividualLicense): Promise<IndividualLicense>;
  updateIndividualLicense(id: number, license: Partial<InsertIndividualLicense>): Promise<IndividualLicense | undefined>;
  deleteIndividualLicense(id: number): Promise<boolean>;
  
  // Service Authorization Forms (SAF)
  getAllServiceAuthorizationForms(): Promise<ServiceAuthorizationForm[]>;
  getServiceAuthorizationForm(id: number): Promise<ServiceAuthorizationForm | undefined>;
  getClientServiceAuthorizationForms(clientId: number): Promise<ServiceAuthorizationForm[]>;
  createServiceAuthorizationForm(saf: InsertServiceAuthorizationForm): Promise<ServiceAuthorizationForm>;
  updateServiceAuthorizationForm(id: number, saf: Partial<InsertServiceAuthorizationForm>): Promise<ServiceAuthorizationForm | undefined>;
  deleteServiceAuthorizationForm(id: number): Promise<boolean>;
  /**
   * Get all SAFs belonging to a specific client
   */
  getServiceAuthorizationFormsByClientId(clientId: number): Promise<ServiceAuthorizationForm[]>;
  
  // Certificate of Compliance (COC)
  getAllCertificatesOfCompliance(): Promise<CertificateOfCompliance[]>;
  getCertificateOfCompliance(id: number): Promise<CertificateOfCompliance | undefined>;
  getClientCertificatesOfCompliance(clientId: number): Promise<CertificateOfCompliance[]>;
  createCertificateOfCompliance(coc: InsertCertificateOfCompliance): Promise<CertificateOfCompliance>;
  updateCertificateOfCompliance(id: number, coc: Partial<InsertCertificateOfCompliance>): Promise<CertificateOfCompliance | undefined>;
  deleteCertificateOfCompliance(id: number): Promise<boolean>;
  
  // Hardware management
  getAllHardwareAssets(): Promise<HardwareAsset[]>;
  getHardwareAsset(id: number): Promise<HardwareAsset | undefined>;
  createHardwareAsset(asset: InsertHardwareAsset): Promise<HardwareAsset>;
  updateHardwareAsset(id: number, asset: Partial<InsertHardwareAsset>): Promise<HardwareAsset | undefined>;
  deleteHardwareAsset(id: number): Promise<boolean>;
  
  getClientHardwareAssignments(clientId: number): Promise<ClientHardwareAssignment[]>;
  createClientHardwareAssignment(assignment: InsertClientHardwareAssignment): Promise<ClientHardwareAssignment>;
  updateClientHardwareAssignment(id: number, assignment: Partial<InsertClientHardwareAssignment>): Promise<ClientHardwareAssignment | undefined>;
  
  // Financial transactions
  getAllFinancialTransactions(): Promise<FinancialTransaction[]>;
  getClientFinancialTransactions(clientId: number): Promise<FinancialTransaction[]>;
  createFinancialTransaction(transaction: InsertFinancialTransaction): Promise<FinancialTransaction>;
  
  // Team assignments
  getClientTeamAssignments(clientId: number): Promise<ClientTeamAssignment[]>;
  getUserTeamAssignments(userId: number): Promise<ClientTeamAssignment[]>;
  createClientTeamAssignment(assignment: InsertClientTeamAssignment): Promise<ClientTeamAssignment>;
  updateClientTeamAssignment(id: number, assignment: Partial<InsertClientTeamAssignment>): Promise<ClientTeamAssignment | undefined>;
  deleteClientTeamAssignment(id: number): Promise<boolean>;
  
  // Custom fields
  getCustomFields(entityType: string): Promise<CustomField[]>;
  createCustomField(customField: InsertCustomField): Promise<CustomField>;
  updateCustomField(id: number, customField: Partial<InsertCustomField>): Promise<CustomField | undefined>;
  
  getCustomFieldValues(customFieldId: number, entityId: number): Promise<CustomFieldValue | undefined>;
  createOrUpdateCustomFieldValue(customFieldValue: InsertCustomFieldValue): Promise<CustomFieldValue>;
  
  // Document management
  getDocuments(clientId?: number, documentType?: string): Promise<Document[]>;
  getDocument(id: number): Promise<Document | undefined>;
  createDocument(document: InsertDocument): Promise<Document>;
  updateDocument(id: number, document: Partial<InsertDocument>): Promise<Document | undefined>;
  deleteDocument(id: number): Promise<boolean>;
  
  getDocumentVersions(documentId: number): Promise<DocumentVersion[]>;
  createDocumentVersion(version: InsertDocumentVersion): Promise<DocumentVersion>;
  
  getDocumentAccess(documentId: number): Promise<DocumentAccess[]>;
  createDocumentAccess(access: InsertDocumentAccess): Promise<DocumentAccess>;
  deleteDocumentAccess(id: number): Promise<boolean>;
  
  // Service helper methods
  getClientByName(name: string): Promise<Client | undefined>;
  getServiceByName(name: string): Promise<Service | undefined>;
  getContractByClientAndName(clientId: number, name: string): Promise<Contract | undefined>;
  getServiceScopeByContractAndDescription(contractId: number, description: string): Promise<ServiceScope | undefined>;
  getSAFByNumber(safNumber: string): Promise<ServiceAuthorizationForm | undefined>;
  getCOCByNumber(cocNumber: string): Promise<CertificateOfCompliance | undefined>;
  createSAF(data: any): Promise<ServiceAuthorizationForm>;
  createCOC(data: any): Promise<CertificateOfCompliance>;
  createServiceBulk(data: any): Promise<Service>;
  
  // Field visibility
  getFieldVisibilityConfigs(): Promise<any[]>;
  getFieldVisibilityForTable(tableName: string, context?: string): Promise<Record<string, boolean>>;
  setFieldVisibility(tableName: string, fieldName: string, isVisible: boolean, context?: string): Promise<any>;
  resetFieldVisibility(tableName: string, fieldName: string, context?: string): Promise<void>;
  isFieldVisible(tableName: string, fieldName: string, context?: string): Promise<boolean>;
  
  // Audit logging
  createAuditLog(auditLog: InsertAuditLog): Promise<AuditLog>;
  
  sessionStore: any;

  // Service scope definition templates
  getServiceScopeDefinitionTemplate(id: number): Promise<ScopeDefinitionTemplateResponse | null>;
  
  // Service scope fields (new table-based approach)
  getServiceScopeFields(serviceId: number): Promise<ServiceScopeField[]>;
  createServiceScopeField(field: InsertServiceScopeField): Promise<ServiceScopeField>;
  updateServiceScopeField(fieldId: number, field: Partial<InsertServiceScopeField>): Promise<ServiceScopeField | undefined>;
  deleteServiceScopeField(fieldId: number): Promise<boolean>;

  // Service scopes
  getServiceScopes(): Promise<ServiceScope[]>;

  // User Dashboard Settings Management
  getUserDashboardSettings(userId: number): Promise<UserDashboardSetting[]>;
  saveUserDashboardSettings(userId: number, cards: any[]): Promise<void>;
  updateUserDashboardCard(userId: number, cardId: string, updates: Partial<UserDashboardSetting>): Promise<void>;
  removeUserDashboardCard(userId: number, cardId: string): Promise<void>;
  resetUserDashboardSettings(userId: number): Promise<void>;
  createDefaultDashboardSettings(userId: number): Promise<void>;

  // Custom widgets management
  getUserCustomWidgets(userId: number, placement?: string): Promise<CustomWidget[]>;
  createCustomWidget(widget: InsertCustomWidget): Promise<CustomWidget>;
  updateCustomWidget(id: number, widget: Partial<InsertCustomWidget>): Promise<CustomWidget | undefined>;
  deleteCustomWidget(id: number, userId: number): Promise<boolean>;

  // User preferences management
  getUserPreference(userId: number, preferenceType: string, preferenceKey?: string): Promise<UserPreference[]>;
  setUserPreference(userId: number, preferenceType: string, preferenceKey: string, preferenceValue: any): Promise<UserPreference>;
  deleteUserPreference(userId: number, preferenceType: string, preferenceKey?: string): Promise<boolean>;

}

export class DatabaseStorage implements IStorage {
  sessionStore: any;

  constructor() {
    // Use memory store for sessions to avoid connection issues
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    });
  }

  // User management
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserById(id: string): Promise<User | undefined> {
    // Handle both UUID and integer ID formats
    console.log("getUserById called with ID:", id, "Type:", typeof id);
    
    // The users.id column is numeric, so we need to parse string to number
    const numericId = parseInt(id);
    if (isNaN(numericId)) {
      console.warn("Invalid user ID format - not a valid integer:", id);
      return undefined;
    }
    
    console.log("Treating as integer ID");
    const [user] = await db.select().from(users).where(eq(users.id, numericId));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, username));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    console.log("=== STORAGE: getUserByEmail ===");
    console.log("Looking for email:", email);
    
    try {
      const [user] = await db.select().from(users).where(eq(users.email, email));
      
      if (user) {
        console.log("Query result: User found");
        console.log("User ID:", user.id);
        console.log("User email:", user.email);
      } else {
        console.log("Query result: No user found");
      }
      console.log("=============================");
      
      return user || undefined;
    } catch (error) {
      console.error("Error in getUserByEmail:", error);
      console.log("=============================");
      throw error;
    }
  }

  async getUserByLdapId(ldapId: string): Promise<User | undefined> {
    console.log("=== STORAGE: getUserByLdapId ===");
    console.log("Looking for LDAP ID:", ldapId);
    
    try {
      const [user] = await db.select().from(users).where(eq(users.ldapId, ldapId));
      
      if (user) {
        console.log("Query result: User found");
        console.log("User ID:", user.id);
        console.log("User email:", user.email);
        console.log("Auth provider:", user.authProvider);
      } else {
        console.log("Query result: No user found");
      }
      console.log("===============================");
      
      return user || undefined;
    } catch (error) {
      console.error("Error in getUserByLdapId:", error);
      console.log("===============================");
      throw error;
    }
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).where(eq(users.isActive, true)).orderBy(desc(users.createdAt));
  }

  async updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set(user)
      .where(eq(users.id, id))
      .returning();
    return updatedUser || undefined;
  }

  // User settings management
  async getUserSettings(userId: number): Promise<UserSettings | undefined> {
    const [settings] = await db.select().from(userSettings).where(eq(userSettings.userId, userId));
    return settings || undefined;
  }

  async createUserSettings(settings: InsertUserSettings): Promise<UserSettings> {
    const [newSettings] = await db
      .insert(userSettings)
      .values({ ...settings, updatedAt: new Date() })
      .returning();
    return newSettings;
  }

  async updateUserSettings(userId: number, settings: Partial<InsertUserSettings>): Promise<UserSettings | undefined> {
    const [updatedSettings] = await db
      .update(userSettings)
      .set({ ...settings, updatedAt: new Date() })
      .where(eq(userSettings.userId, userId))
      .returning();
    return updatedSettings || undefined;
  }

  // Client management
  async getAllClients(): Promise<Client[]> {
    return await db.select().from(clients)
      .where(isNull(clients.deletedAt))
      .orderBy(desc(clients.createdAt));
  }

  async getClientsWithStats(): Promise<(Client & { contractsCount: number; servicesCount: number; licensesCount: number; })[]> {
    // Return all active (non-archived) clients with aggregated relationship counts
    const results = await db.execute(sql`
      SELECT
        c.*, 
        (
          SELECT COUNT(*)
          FROM ${contracts} ct
          WHERE ct."clientId" = c.id AND ct."status" <> 'archived'
        ) AS "contractsCount",
        (
          SELECT COUNT(*)
          FROM ${serviceScopes} ss
          JOIN ${contracts} ct2 ON ct2.id = ss."contract_id"
          WHERE ct2."clientId" = c.id
        ) AS "servicesCount",
        (
          SELECT COUNT(*)
          FROM ${clientLicenses} cl
          WHERE cl."client_id" = c.id
        ) AS "licensesCount"
      FROM ${clients} c
      WHERE c."deletedAt" IS NULL
      ORDER BY c."createdAt" DESC;
    `).then(r => r.rows as any);

    return results;
  }

  async getClient(id: number): Promise<Client | undefined> {
    const [client] = await db.select().from(clients)
      .where(and(eq(clients.id, id), isNull(clients.deletedAt)));
    return client || undefined;
  }

  async createClient(client: InsertClient): Promise<Client> {
    const [newClient] = await db
      .insert(clients)
      .values({ ...client, updatedAt: new Date() })
      .returning();
    return newClient;
  }

  async updateClient(id: number, client: Partial<InsertClient>): Promise<Client | undefined> {
    const [updatedClient] = await db
      .update(clients)
      .set({ ...client, updatedAt: new Date() })
      .where(and(eq(clients.id, id), isNull(clients.deletedAt)))
      .returning();
    return updatedClient || undefined;
  }

  async deleteClient(id: number): Promise<boolean> {
    // Soft delete by setting deletedAt timestamp and status to archived
    const [deletedClient] = await db
      .update(clients)
      .set({ 
        deletedAt: new Date(),
        status: 'archived',
        updatedAt: new Date()
      })
      .where(and(eq(clients.id, id), isNull(clients.deletedAt)))
      .returning();
    return !!deletedClient;
  }

  async archiveClient(id: number): Promise<Client | undefined> {
    // Same as delete but explicit method for clarity
    const [archivedClient] = await db
      .update(clients)
      .set({ 
        deletedAt: new Date(),
        status: 'archived',
        updatedAt: new Date()
      })
      .where(and(eq(clients.id, id), isNull(clients.deletedAt)))
      .returning();
    return archivedClient || undefined;
  }

  async restoreClient(id: number): Promise<Client | undefined> {
    // Restore a soft-deleted client
    const [restoredClient] = await db
      .update(clients)
      .set({ 
        deletedAt: null,
        status: 'active', // Default to active when restored
        updatedAt: new Date()
      })
      .where(eq(clients.id, id))
      .returning();
    return restoredClient || undefined;
  }

  async getArchivedClients(): Promise<Client[]> {
    // Get all archived/deleted clients
    return await db.select().from(clients)
      .where(isNotNull(clients.deletedAt))
      .orderBy(desc(clients.deletedAt));
  }

  async getClientDeletionImpact(id: number): Promise<{
    canDelete: boolean;
    blockers: string[];
    dependencies: {
      contracts: number;
      documents: number;
      licenses: number;
      hardwareAssignments: number;
      teamAssignments: number;
      financialTransactions: number;
    };
  }> {
    // Check what would prevent deletion (for validation)
    const [contractCount] = await db.select({ count: sql<number>`count(*)` }).from(contracts)
      .where(eq(contracts.clientId, id));
    
    const [documentCount] = await db.select({ count: sql<number>`count(*)` }).from(documents)
      .where(eq(documents.clientId, id));
    
    const [licenseCount] = await db.select({ count: sql<number>`count(*)` }).from(clientLicenses)
      .where(eq(clientLicenses.clientId, id));
    
    const [hardwareCount] = await db.select({ count: sql<number>`count(*)` }).from(clientHardwareAssignments)
      .where(eq(clientHardwareAssignments.clientId, id));
    
    const [teamCount] = await db.select({ count: sql<number>`count(*)` }).from(clientTeamAssignments)
      .where(eq(clientTeamAssignments.clientId, id));
    
    const [financialCount] = await db.select({ count: sql<number>`count(*)` }).from(financialTransactions)
      .where(eq(financialTransactions.clientId, id));

    const dependencies = {
      contracts: contractCount.count,
      documents: documentCount.count,
      licenses: licenseCount.count,
      hardwareAssignments: hardwareCount.count,
      teamAssignments: teamCount.count,
      financialTransactions: financialCount.count,
    };

    const blockers: string[] = [];
    
    // Check for active contracts
    if (dependencies.contracts > 0) {
      const [activeContracts] = await db.select({ count: sql<number>`count(*)` }).from(contracts)
        .where(and(eq(contracts.clientId, id), eq(contracts.status, 'active')));
      if (activeContracts.count > 0) {
        blockers.push(`${activeContracts.count} active contract(s) must be closed first`);
      }
    }

    // Check for pending financial transactions
    if (dependencies.financialTransactions > 0) {
      const [pendingTransactions] = await db.select({ count: sql<number>`count(*)` }).from(financialTransactions)
        .where(and(eq(financialTransactions.clientId, id), ne(financialTransactions.status, 'completed')));
      if (pendingTransactions.count > 0) {
        blockers.push(`${pendingTransactions.count} pending financial transaction(s) must be resolved`);
      }
    }

    return {
      canDelete: blockers.length === 0,
      blockers,
      dependencies,
    };
  }

  async searchClients(query: string): Promise<Client[]> {
    return await db
      .select()
      .from(clients)
      .where(
        and(
          isNull(clients.deletedAt), // Filter out deleted clients
          or(
            like(clients.name, `%${query}%`),
            like(clients.shortName, `%${query}%`),
            like(clients.domain, `%${query}%`),
            like(clients.industry, `%${query}%`),
            like(clients.address, `%${query}%`)
          )
        )
      )
      .orderBy(desc(clients.createdAt));
  }

  // Client contacts
  async getClientContacts(clientId: number): Promise<ClientContact[]> {
    return await db
      .select()
      .from(clientContacts)
      .where(and(eq(clientContacts.clientId, clientId), eq(clientContacts.isActive, true)))
      .orderBy(desc(clientContacts.isPrimary), desc(clientContacts.createdAt));
  }

  async createClientContact(contact: InsertClientContact): Promise<ClientContact> {
    const [newContact] = await db
      .insert(clientContacts)
      .values(contact)
      .returning();
    return newContact;
  }

  async updateClientContact(id: number, contact: Partial<InsertClientContact>): Promise<ClientContact | undefined> {
    const [updatedContact] = await db
      .update(clientContacts)
      .set(contact)
      .where(eq(clientContacts.id, id))
      .returning();
    return updatedContact || undefined;
  }

  async deleteClientContact(id: number): Promise<boolean> {
    const [updatedContact] = await db
      .update(clientContacts)
      .set({ isActive: false })
      .where(eq(clientContacts.id, id))
      .returning();
    return !!updatedContact;
  }

  // Services
  async getAllServices(): Promise<Service[]> {
    return await db
      .select()
      .from(services)
      .where(eq(services.isActive, true))
      .orderBy(services.category, services.name);
  }

  async getService(id: number): Promise<Service | undefined> {
    const [service] = await db.select().from(services).where(eq(services.id, id));
    return service || undefined;
  }

  async getServiceScopeDefinitionTemplate(id: number): Promise<ScopeDefinitionTemplateResponse | null> {
    const [service] = await db.select().from(services).where(eq(services.id, id));
    if (!service) {
      return null;
    }
    return {
      template: service.scopeDefinitionTemplate,
      serviceName: service.name,
      category: service.category,
      deliveryModel: service.deliveryModel
    };
  }

  async createService(service: InsertService): Promise<Service> {
    const [newService] = await db
      .insert(services)
      .values(service)
      .returning();
    return newService;
  }

  async updateService(id: number, service: Partial<InsertService>): Promise<Service | undefined> {
    const [updatedService] = await db
      .update(services)
      .set(service)
      .where(eq(services.id, id))
      .returning();
    return updatedService || undefined;
  }

  async deleteService(id: number): Promise<boolean> {
    const [updatedService] = await db
      .update(services)
      .set({ isActive: false })
      .where(eq(services.id, id))
      .returning();
    return !!updatedService;
  }

  // Contracts
  async getAllContracts(): Promise<Contract[]> {
    try {
      return await db.select().from(contracts).orderBy(desc(contracts.createdAt));
    } catch (err) {
      console.error('⚠️ getAllContracts DB error, returning empty list:', err);
      return [];
    }
  }

  async getContract(id: number): Promise<Contract | undefined> {
    const [contract] = await db.select().from(contracts).where(eq(contracts.id, id));
    return contract || undefined;
  }

  async getClientContracts(clientId: number): Promise<Contract[]> {
    return await db
      .select()
      .from(contracts)
      .where(eq(contracts.clientId, clientId))
      .orderBy(desc(contracts.createdAt));
  }

  async createContract(contract: InsertContract): Promise<Contract> {
    const [newContract] = await db
      .insert(contracts)
      .values({ ...contract, updatedAt: new Date() })
      .returning();
    return newContract;
  }

  async updateContract(id: number, contract: Partial<InsertContract>): Promise<Contract | undefined> {
    const [updatedContract] = await db
      .update(contracts)
      .set({ ...contract, updatedAt: new Date() })
      .where(eq(contracts.id, id))
      .returning();
    return updatedContract || undefined;
  }

  async deleteContract(id: number): Promise<boolean> {
    const result = await db.delete(contracts).where(eq(contracts.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Service scopes
  async getContractServiceScopes(contractId: number): Promise<ServiceScope[]> {
    return await db
      .select()
      .from(serviceScopes)
      .where(eq(serviceScopes.contractId, contractId))
      .orderBy(desc(serviceScopes.createdAt));
  }

  async getServiceScopesByClientId(clientId: number): Promise<ServiceScope[]> {
    // Use a proper drizzle join instead of manual SQL construction
    return await db
      .select({
        id: serviceScopes.id,
        contractId: serviceScopes.contractId,
        serviceId: serviceScopes.serviceId,
        scopeDefinition: serviceScopes.scopeDefinition,
        safDocumentUrl: serviceScopes.safDocumentUrl,
        safStartDate: serviceScopes.safStartDate,
        safEndDate: serviceScopes.safEndDate,
        safStatus: serviceScopes.safStatus,
        startDate: serviceScopes.startDate,
        endDate: serviceScopes.endDate,
        status: serviceScopes.status,
        monthlyValue: serviceScopes.monthlyValue,
        description: serviceScopes.description,
        notes: serviceScopes.notes,
        eps: serviceScopes.eps,
        endpoints: serviceScopes.endpoints,
        dataVolumeGb: serviceScopes.dataVolumeGb,
        logSources: serviceScopes.logSources,
        firewallDevices: serviceScopes.firewallDevices,
        pamUsers: serviceScopes.pamUsers,
        responseTimeMinutes: serviceScopes.responseTimeMinutes,
        coverageHours: serviceScopes.coverageHours,
        serviceTier: serviceScopes.serviceTier,
        safId: serviceScopes.safId,
        createdAt: serviceScopes.createdAt,
        updatedAt: serviceScopes.updatedAt
      })
      .from(serviceScopes)
      .innerJoin(contracts, eq(serviceScopes.contractId, contracts.id))
      .where(eq(contracts.clientId, clientId))
      .orderBy(desc(serviceScopes.createdAt));
  }

  async createServiceScope(serviceScope: InsertServiceScope): Promise<ServiceScope> {
    const [createdScope] = await db
      .insert(serviceScopes)
      .values(serviceScope)
      .returning({
        id: serviceScopes.id,
        contractId: serviceScopes.contractId,
        serviceId: serviceScopes.serviceId,
        scopeDefinition: serviceScopes.scopeDefinition,
        safDocumentUrl: serviceScopes.safDocumentUrl,
        safStartDate: serviceScopes.safStartDate,
        safEndDate: serviceScopes.safEndDate,
        safStatus: serviceScopes.safStatus,
        startDate: serviceScopes.startDate,
        endDate: serviceScopes.endDate,
        status: serviceScopes.status,
        monthlyValue: serviceScopes.monthlyValue,
        description: serviceScopes.description,
        notes: serviceScopes.notes,
        eps: serviceScopes.eps,
        endpoints: serviceScopes.endpoints,
        dataVolumeGb: serviceScopes.dataVolumeGb,
        logSources: serviceScopes.logSources,
        firewallDevices: serviceScopes.firewallDevices,
        pamUsers: serviceScopes.pamUsers,
        responseTimeMinutes: serviceScopes.responseTimeMinutes,
        coverageHours: serviceScopes.coverageHours,
        serviceTier: serviceScopes.serviceTier,
        safId: serviceScopes.safId,
        createdAt: serviceScopes.createdAt,
        updatedAt: serviceScopes.updatedAt
      });

    if (!createdScope) {
      throw new Error('Failed to create service scope');
    }

    return createdScope;
  }

  async updateServiceScope(id: number, serviceScope: Partial<InsertServiceScope>): Promise<ServiceScope | undefined> {
    const [updatedServiceScope] = await db
      .update(serviceScopes)
      .set(serviceScope)
      .where(eq(serviceScopes.id, id))
      .returning();
    return updatedServiceScope || undefined;
  }

  async deleteServiceScope(id: number): Promise<boolean> {
    const result = await db.delete(serviceScopes).where(eq(serviceScopes.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async restoreServiceScopeVersion(scopeId: number, versionId: number): Promise<ServiceScope | undefined> {
    // Implement the logic to restore a specific version of a service scope
    // This is a placeholder implementation
    return undefined;
  }

  // Proposals
  async getContractProposals(contractId: number): Promise<Proposal[]> {
    return await db
      .select()
      .from(proposals)
      .where(eq(proposals.contractId, contractId))
      .orderBy(desc(proposals.createdAt));
  }

  async createProposal(proposal: InsertProposal): Promise<Proposal> {
    const [newProposal] = await db
      .insert(proposals)
      .values({ ...proposal, updatedAt: new Date() })
      .returning();
    return newProposal;
  }

  async updateProposal(id: number, proposal: Partial<InsertProposal>): Promise<Proposal | undefined> {
    const [updatedProposal] = await db
      .update(proposals)
      .set({ ...proposal, updatedAt: new Date() })
      .where(eq(proposals.id, id))
      .returning();
    return updatedProposal || undefined;
  }

  async deleteProposal(id: number): Promise<boolean> {
    const result = await db.delete(proposals).where(eq(proposals.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // License management
  async getAllLicensePools(): Promise<LicensePool[]> {
    return await db
      .select()
      .from(licensePools)
      .where(eq(licensePools.isActive, true))
      .orderBy(licensePools.id);
  }

  async getLicensePool(id: number): Promise<LicensePool | undefined> {
    const [licensePool] = await db.select().from(licensePools).where(eq(licensePools.id, id));
    return licensePool || undefined;
  }

  // Helper function to calculate available licenses for a license pool
  private async calculateAvailableLicenses(licensePoolId: number, totalLicenses: number): Promise<number> {
    // Get sum of all assigned licenses for this pool
    const result = await db
      .select({
        totalAssigned: sql<number>`coalesce(sum(${clientLicenses.assignedLicenses}), 0)`
      })
      .from(clientLicenses)
      .where(eq(clientLicenses.licensePoolId, licensePoolId));
    
    const totalAssigned = result[0]?.totalAssigned || 0;
    return Math.max(0, totalLicenses - totalAssigned);
  }

  async createLicensePool(licensePool: InsertLicensePool): Promise<LicensePool> {
    // Create the license pool first
    const [newLicensePool] = await db
      .insert(licensePools)
      .values({
        ...licensePool,
        availableLicenses: licensePool.totalLicenses || 0, // Initially all licenses are available
      })
      .returning();
    return newLicensePool;
  }

  async updateLicensePool(id: number, licensePool: Partial<InsertLicensePool>): Promise<LicensePool | undefined> {
    // Allow adding availableLicenses even though it isn\'t in InsertLicensePool
    let updateData: Partial<InsertLicensePool> & { availableLicenses?: number } = { ...licensePool };
    
    if (licensePool.totalLicenses !== undefined) {
      const availableLicenses = await this.calculateAvailableLicenses(id, licensePool.totalLicenses);
      (updateData as any).availableLicenses = availableLicenses;
    }

    const [updatedLicensePool] = await db
      .update(licensePools)
      .set(updateData)
      .where(eq(licensePools.id, id))
      .returning();
    return updatedLicensePool || undefined;
  }

  async deleteLicensePool(id: number): Promise<boolean> {
    const result = await db.delete(licensePools).where(eq(licensePools.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async getClientLicenses(clientId: number): Promise<ClientLicense[]> {
    return await db
      .select()
      .from(clientLicenses)
      .where(eq(clientLicenses.clientId, clientId))
      .orderBy(desc(clientLicenses.assignedDate));
  }

  async getLicensePoolAllocations(licensePoolId: number): Promise<(ClientLicense & { clientName: string })[]> {
    return await db
      .select({
        id: clientLicenses.id,
        clientId: clientLicenses.clientId,
        licensePoolId: clientLicenses.licensePoolId,
        serviceScopeId: clientLicenses.serviceScopeId,
        assignedLicenses: clientLicenses.assignedLicenses,
        assignedDate: clientLicenses.assignedDate,
        notes: clientLicenses.notes,
        clientName: clients.name,
      })
      .from(clientLicenses)
      .innerJoin(clients, eq(clientLicenses.clientId, clients.id))
      .where(eq(clientLicenses.licensePoolId, licensePoolId))
      .orderBy(desc(clientLicenses.assignedDate));
  }

  async getAllLicensePoolAllocations(): Promise<Record<number, (ClientLicense & { clientName: string })[]>> {
    const allAllocations = await db
      .select({
        id: clientLicenses.id,
        clientId: clientLicenses.clientId,
        licensePoolId: clientLicenses.licensePoolId,
        serviceScopeId: clientLicenses.serviceScopeId,
        assignedLicenses: clientLicenses.assignedLicenses,
        assignedDate: clientLicenses.assignedDate,
        notes: clientLicenses.notes,
        clientName: clients.name,
      })
      .from(clientLicenses)
      .innerJoin(clients, eq(clientLicenses.clientId, clients.id))
      .orderBy(desc(clientLicenses.assignedDate));

    // Group by license pool ID
    const groupedAllocations: Record<number, (ClientLicense & { clientName: string })[]> = {};
    allAllocations.forEach(allocation => {
      if (!groupedAllocations[allocation.licensePoolId]) {
        groupedAllocations[allocation.licensePoolId] = [];
      }
      groupedAllocations[allocation.licensePoolId].push(allocation);
    });

    return groupedAllocations;
  }

  async createClientLicense(clientLicense: InsertClientLicense): Promise<ClientLicense> {
    // Create the client license assignment
    const [newClientLicense] = await db
      .insert(clientLicenses)
      .values(clientLicense)
      .returning();

    // Update the license pool's available licenses
    await this.updateLicensePoolAvailability(clientLicense.licensePoolId);

    return newClientLicense;
  }

  async updateClientLicense(id: number, clientLicense: Partial<InsertClientLicense>): Promise<ClientLicense | undefined> {
    // Get the current license to know which pool to update
    const [currentLicense] = await db
      .select()
      .from(clientLicenses)
      .where(eq(clientLicenses.id, id));

    if (!currentLicense) {
      return undefined;
    }

    const [updatedClientLicense] = await db
      .update(clientLicenses)
      .set(clientLicense)
      .where(eq(clientLicenses.id, id))
      .returning();

    // Update availability for the affected license pool(s)
    await this.updateLicensePoolAvailability(currentLicense.licensePoolId);
    
    // If license pool changed, update the new pool too
    if (clientLicense.licensePoolId && clientLicense.licensePoolId !== currentLicense.licensePoolId) {
      await this.updateLicensePoolAvailability(clientLicense.licensePoolId);
    }

    return updatedClientLicense || undefined;
  }

  async deleteClientLicense(id: number): Promise<boolean> {
    // Get the license to know which pool to update
    const [license] = await db
      .select()
      .from(clientLicenses)
      .where(eq(clientLicenses.id, id));

    if (!license) {
      return false;
    }

    const result = await db.delete(clientLicenses).where(eq(clientLicenses.id, id));
    const deleted = (result.rowCount ?? 0) > 0;

    // Update the license pool availability if deletion was successful
    if (deleted) {
      await this.updateLicensePoolAvailability(license.licensePoolId);
    }

    return deleted;
  }

  // Helper function to update a license pool's available licenses
  private async updateLicensePoolAvailability(licensePoolId: number): Promise<void> {
    // Get the current license pool
    const [licensePool] = await db
      .select()
      .from(licensePools)
      .where(eq(licensePools.id, licensePoolId));

    if (!licensePool) {
      return;
    }

    // Calculate new available licenses
    const availableLicenses = await this.calculateAvailableLicenses(licensePoolId, licensePool.totalLicenses);

    // Update the license pool
    await db
      .update(licensePools)
      .set({ availableLicenses })
      .where(eq(licensePools.id, licensePoolId));
  }

  // Individual license management
  async getAllIndividualLicenses(): Promise<IndividualLicense[]> {
    return await db
      .select()
      .from(individualLicenses)
      .orderBy(individualLicenses.name);
  }

  async getIndividualLicense(id: number): Promise<IndividualLicense | undefined> {
    const [license] = await db
      .select()
      .from(individualLicenses)
      .where(eq(individualLicenses.id, id));
    return license || undefined;
  }

  async getClientIndividualLicenses(clientId: number): Promise<IndividualLicense[]> {
    return await db
      .select()
      .from(individualLicenses)
      .where(eq(individualLicenses.clientId, clientId))
      .orderBy(individualLicenses.name);
  }

  async createIndividualLicense(license: InsertIndividualLicense): Promise<IndividualLicense> {
    const [newLicense] = await db
      .insert(individualLicenses)
      .values(license)
      .returning();
    return newLicense;
  }

  async updateIndividualLicense(id: number, license: Partial<InsertIndividualLicense>): Promise<IndividualLicense | undefined> {
    const [updatedLicense] = await db
      .update(individualLicenses)
      .set(license)
      .where(eq(individualLicenses.id, id))
      .returning();
    return updatedLicense || undefined;
  }

  async deleteIndividualLicense(id: number): Promise<boolean> {
    const result = await db.delete(individualLicenses).where(eq(individualLicenses.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Service Authorization Forms (SAF)
  async getAllServiceAuthorizationForms(): Promise<ServiceAuthorizationForm[]> {
    return await db
      .select()
      .from(serviceAuthorizationForms)
      .orderBy(serviceAuthorizationForms.title);
  }

  async getServiceAuthorizationForm(id: number): Promise<ServiceAuthorizationForm | undefined> {
    const [saf] = await db
      .select()
      .from(serviceAuthorizationForms)
      .where(eq(serviceAuthorizationForms.id, id));
    return saf || undefined;
  }

  async getClientServiceAuthorizationForms(clientId: number): Promise<ServiceAuthorizationForm[]> {
    return await db
      .select()
      .from(serviceAuthorizationForms)
      .where(eq(serviceAuthorizationForms.clientId, clientId))
      .orderBy(serviceAuthorizationForms.createdAt);
  }

  async createServiceAuthorizationForm(saf: InsertServiceAuthorizationForm): Promise<ServiceAuthorizationForm> {
    const [newSaf] = await db
      .insert(serviceAuthorizationForms)
      .values(saf)
      .returning() as ServiceAuthorizationForm[];
    return newSaf;
  }

  async updateServiceAuthorizationForm(id: number, saf: Partial<InsertServiceAuthorizationForm>): Promise<ServiceAuthorizationForm | undefined> {
    const [updatedSaf] = await db
      .update(serviceAuthorizationForms)
      .set(saf)
      .where(eq(serviceAuthorizationForms.id, id))
      .returning();
    return updatedSaf || undefined;
  }

  async deleteServiceAuthorizationForm(id: number): Promise<boolean> {
    const result = await db.delete(serviceAuthorizationForms).where(eq(serviceAuthorizationForms.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async getServiceAuthorizationFormsByClientId(clientId: number): Promise<ServiceAuthorizationForm[]> {
    return await db
      .select()
      .from(serviceAuthorizationForms)
      .where(eq(serviceAuthorizationForms.clientId, clientId))
      .orderBy(serviceAuthorizationForms.createdAt);
  }

  // Certificate of Compliance (COC)
  async getAllCertificatesOfCompliance(): Promise<CertificateOfCompliance[]> {
    return await db
      .select()
      .from(certificatesOfCompliance)
      .orderBy(certificatesOfCompliance.title);
  }

  async getCertificateOfCompliance(id: number): Promise<CertificateOfCompliance | undefined> {
    const [coc] = await db
      .select()
      .from(certificatesOfCompliance)
      .where(eq(certificatesOfCompliance.id, id));
    return coc || undefined;
  }

  async getClientCertificatesOfCompliance(clientId: number): Promise<CertificateOfCompliance[]> {
    return await db
      .select()
      .from(certificatesOfCompliance)
      .where(eq(certificatesOfCompliance.clientId, clientId))
      .orderBy(certificatesOfCompliance.title);
  }

  async createCertificateOfCompliance(coc: InsertCertificateOfCompliance): Promise<CertificateOfCompliance> {
    const [newCoc] = await db
      .insert(certificatesOfCompliance)
      .values(coc)
      .returning();
    return newCoc;
  }

  async updateCertificateOfCompliance(id: number, coc: Partial<InsertCertificateOfCompliance>): Promise<CertificateOfCompliance | undefined> {
    const [updatedCoc] = await db
      .update(certificatesOfCompliance)
      .set(coc)
      .where(eq(certificatesOfCompliance.id, id))
      .returning();
    return updatedCoc || undefined;
  }

  async deleteCertificateOfCompliance(id: number): Promise<boolean> {
    const result = await db.delete(certificatesOfCompliance).where(eq(certificatesOfCompliance.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Hardware management
  async getAllHardwareAssets(): Promise<HardwareAsset[]> {
    return await db
      .select()
      .from(hardwareAssets)
      .orderBy(hardwareAssets.category, hardwareAssets.name);
  }

  async getHardwareAsset(id: number): Promise<HardwareAsset | undefined> {
    const [asset] = await db.select().from(hardwareAssets).where(eq(hardwareAssets.id, id));
    return asset || undefined;
  }

  async createHardwareAsset(asset: InsertHardwareAsset): Promise<HardwareAsset> {
    const [newAsset] = await db
      .insert(hardwareAssets)
      .values(asset)
      .returning();
    return newAsset;
  }

  async updateHardwareAsset(id: number, asset: Partial<InsertHardwareAsset>): Promise<HardwareAsset | undefined> {
    const [updatedAsset] = await db
      .update(hardwareAssets)
      .set(asset)
      .where(eq(hardwareAssets.id, id))
      .returning();
    return updatedAsset || undefined;
  }

  async deleteHardwareAsset(id: number): Promise<boolean> {
    const result = await db.delete(hardwareAssets).where(eq(hardwareAssets.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async getClientHardwareAssignments(clientId: number): Promise<ClientHardwareAssignment[]> {
    return await db
      .select()
      .from(clientHardwareAssignments)
      .where(eq(clientHardwareAssignments.clientId, clientId))
      .orderBy(desc(clientHardwareAssignments.assignedDate));
  }

  async createClientHardwareAssignment(assignment: InsertClientHardwareAssignment): Promise<ClientHardwareAssignment> {
    const [newAssignment] = await db
      .insert(clientHardwareAssignments)
      .values(assignment)
      .returning();
    return newAssignment;
  }

  async updateClientHardwareAssignment(id: number, assignment: Partial<InsertClientHardwareAssignment>): Promise<ClientHardwareAssignment | undefined> {
    const [updatedAssignment] = await db
      .update(clientHardwareAssignments)
      .set(assignment)
      .where(eq(clientHardwareAssignments.id, id))
      .returning();
    return updatedAssignment || undefined;
  }

  // Financial transactions
  async getAllFinancialTransactions(): Promise<FinancialTransaction[]> {
    return await db
      .select()
      .from(financialTransactions)
      .orderBy(desc(financialTransactions.transactionDate));
  }

  async getClientFinancialTransactions(clientId: number): Promise<FinancialTransaction[]> {
    return await db
      .select()
      .from(financialTransactions)
      .where(eq(financialTransactions.clientId, clientId))
      .orderBy(desc(financialTransactions.transactionDate));
  }

  async createFinancialTransaction(transaction: InsertFinancialTransaction): Promise<FinancialTransaction> {
    const [newTransaction] = await db
      .insert(financialTransactions)
      .values(transaction)
      .returning();
    return newTransaction;
  }

  // Team assignments
  async getClientTeamAssignments(clientId: number): Promise<ClientTeamAssignment[]> {
    return await db
      .select()
      .from(clientTeamAssignments)
      .where(and(eq(clientTeamAssignments.clientId, clientId), eq(clientTeamAssignments.isActive, true)))
      .orderBy(desc(clientTeamAssignments.assignedDate));
  }

  async getUserTeamAssignments(userId: number): Promise<ClientTeamAssignment[]> {
    return await db
      .select()
      .from(clientTeamAssignments)
      .where(and(eq(clientTeamAssignments.userId, userId), eq(clientTeamAssignments.isActive, true)))
      .orderBy(desc(clientTeamAssignments.assignedDate));
  }

  async createClientTeamAssignment(assignment: InsertClientTeamAssignment): Promise<ClientTeamAssignment> {
    const [newAssignment] = await db
      .insert(clientTeamAssignments)
      .values(assignment)
      .returning();
    return newAssignment;
  }

  async updateClientTeamAssignment(id: number, assignment: Partial<InsertClientTeamAssignment>): Promise<ClientTeamAssignment | undefined> {
    const [updatedAssignment] = await db
      .update(clientTeamAssignments)
      .set(assignment)
      .where(eq(clientTeamAssignments.id, id))
      .returning();
    return updatedAssignment || undefined;
  }

  async deleteClientTeamAssignment(id: number): Promise<boolean> {
    const [updatedAssignment] = await db
      .update(clientTeamAssignments)
      .set({ isActive: false })
      .where(eq(clientTeamAssignments.id, id))
      .returning();
    return !!updatedAssignment;
  }

  // Custom fields
  async getCustomFields(entityType: string): Promise<CustomField[]> {
    return await db
      .select()
      .from(customFields)
      .where(and(eq(customFields.entityType, entityType), eq(customFields.isActive, true)))
      .orderBy(customFields.fieldName);
  }

  async createCustomField(customField: InsertCustomField): Promise<CustomField> {
    const [newCustomField] = await db
      .insert(customFields)
      .values(customField)
      .returning();
    return newCustomField;
  }

  async updateCustomField(id: number, customField: Partial<InsertCustomField>): Promise<CustomField | undefined> {
    const [updatedCustomField] = await db
      .update(customFields)
      .set(customField)
      .where(eq(customFields.id, id))
      .returning();
    return updatedCustomField || undefined;
  }

  async getCustomFieldValues(customFieldId: number, entityId: number): Promise<CustomFieldValue | undefined> {
    const [value] = await db
      .select()
      .from(customFieldValues)
      .where(and(eq(customFieldValues.customFieldId, customFieldId), eq(customFieldValues.entityId, entityId)));
    return value || undefined;
  }

  async createOrUpdateCustomFieldValue(customFieldValue: InsertCustomFieldValue): Promise<CustomFieldValue> {
    const existing = await this.getCustomFieldValues(customFieldValue.customFieldId, customFieldValue.entityId);
    
    if (existing) {
      const [updatedValue] = await db
        .update(customFieldValues)
        .set({ ...customFieldValue, updatedAt: new Date() })
        .where(eq(customFieldValues.id, existing.id))
        .returning();
      return updatedValue;
    } else {
      const [newValue] = await db
        .insert(customFieldValues)
        .values({ ...customFieldValue, updatedAt: new Date() })
        .returning();
      return newValue;
    }
  }

  // Document management
  async getDocuments(clientId?: number, documentType?: string): Promise<Document[]> {
    const conditions = [eq(documents.isActive, true)];
    
    if (clientId) {
      conditions.push(eq(documents.clientId, clientId));
    }
    
    if (documentType) {
      conditions.push(eq(documents.documentType, documentType));
    }
    
    return db
      .select()
      .from(documents)
      .where(and(...conditions))
      .orderBy(desc(documents.createdAt));
  }

  async getDocument(id: number): Promise<Document | undefined> {
    const [document] = await db
      .select()
      .from(documents)
      .where(and(eq(documents.id, id), eq(documents.isActive, true)));
    return document || undefined;
  }

  async createDocument(document: InsertDocument): Promise<Document> {
    const [newDocument] = await db
      .insert(documents)
      .values({
        ...document,
        updatedAt: new Date()
      })
      .returning();
    return newDocument;
  }

  async updateDocument(id: number, document: Partial<InsertDocument>): Promise<Document | undefined> {
    const [updatedDocument] = await db
      .update(documents)
      .set({
        ...document,
        updatedAt: new Date()
      })
      .where(eq(documents.id, id))
      .returning();
    return updatedDocument || undefined;
  }

  async deleteDocument(id: number): Promise<boolean> {
    const [result] = await db
      .update(documents)
      .set({ isActive: false })
      .where(eq(documents.id, id))
      .returning();
    return !!result;
  }

  async getDocumentVersions(documentId: number): Promise<DocumentVersion[]> {
    return db
      .select()
      .from(documentVersions)
      .where(eq(documentVersions.documentId, documentId))
      .orderBy(desc(documentVersions.version));
  }

  async createDocumentVersion(version: InsertDocumentVersion): Promise<DocumentVersion> {
    const [newVersion] = await db
      .insert(documentVersions)
      .values(version)
      .returning();
    return newVersion;
  }

  async getDocumentAccess(documentId: number): Promise<DocumentAccess[]> {
    return db
      .select()
      .from(documentAccess)
      .where(eq(documentAccess.documentId, documentId));
  }

  async createDocumentAccess(access: InsertDocumentAccess): Promise<DocumentAccess> {
    const [newAccess] = await db
      .insert(documentAccess)
      .values(access)
      .returning();
    return newAccess;
  }

  async deleteDocumentAccess(id: number): Promise<boolean> {
    const result = await db
      .delete(documentAccess)
      .where(eq(documentAccess.id, id));
    return (result.rowCount || 0) > 0;
  }

  // Service helper methods
  async getClientByName(name: string): Promise<Client | undefined> {
    const result = await db.select().from(clients).where(eq(clients.name, name)).limit(1);
    return result[0];
  }

  async getServiceByName(name: string): Promise<Service | undefined> {
    const result = await db.select().from(services).where(eq(services.name, name)).limit(1);
    return result[0];
  }

  async getContractByClientAndName(clientId: number, name: string): Promise<Contract | undefined> {
    const result = await db.select().from(contracts)
      .where(and(eq(contracts.clientId, clientId), eq(contracts.name, name)))
      .limit(1);
    return result[0];
  }

  async getServiceScopeByContractAndDescription(contractId: number, description: string): Promise<ServiceScope | undefined> {
    const result = await db.select().from(serviceScopes)
      .where(and(eq(serviceScopes.contractId, contractId), like(serviceScopes.description, `%${description}%`)))
      .limit(1);
    return result[0];
  }

  async getSAFByNumber(safNumber: string): Promise<ServiceAuthorizationForm | undefined> {
    const result = await db.select().from(serviceAuthorizationForms)
      .where(eq(serviceAuthorizationForms.safNumber, safNumber))
      .limit(1);
    return result[0];
  }

  async getCOCByNumber(cocNumber: string): Promise<CertificateOfCompliance | undefined> {
    const result = await db.select().from(certificatesOfCompliance)
      .where(eq(certificatesOfCompliance.cocNumber, cocNumber))
      .limit(1);
    return result[0];
  }

  async createSAF(data: any): Promise<ServiceAuthorizationForm> {
    const [saf] = await db.insert(serviceAuthorizationForms).values({
      clientId: data.client_id,
      safNumber: data.saf_number,
      title: data.title,
      description: data.description,
      startDate: data.start_date,
      endDate: data.end_date,
      value: data.value,
      status: data.status,
      notes: data.notes
    }).returning() as ServiceAuthorizationForm[];
    return saf;
  }

  async createCOC(data: any): Promise<CertificateOfCompliance> {
    const [coc] = await db.insert(certificatesOfCompliance).values({
      clientId: data.client_id,
      cocNumber: data.coc_number,
      title: data.title,
      description: data.description,
      complianceType: data.compliance_type,
      issueDate: data.issue_date,
      expiryDate: data.expiry_date,
      status: data.status,
      auditDate: data.audit_date,
      nextAuditDate: data.next_audit_date,
      notes: data.notes
    }).returning();
    return coc;
  }

  async createServiceBulk(data: any): Promise<Service> {
    const [service] = await db.insert(services).values({
      name: data.name,
      category: data.category,
      description: data.description,
      deliveryModel: data.delivery_model,
      basePrice: data.base_price,
      pricingUnit: data.pricing_unit,
      isActive: data.is_active
    }).returning();
    return service;
  }

  // Audit logging
  async createAuditLog(auditLog: InsertAuditLog): Promise<AuditLog> {
    const [newAuditLog] = await db
      .insert(auditLogs)
      .values(auditLog)
      .returning();
    return newAuditLog;
  }

  // Service scope fields (new table-based approach)
  async getServiceScopeFields(serviceId: number): Promise<ServiceScopeField[]> {
    return await db
      .select()
      .from(serviceScopeFields)
      .where(eq(serviceScopeFields.serviceId, serviceId))
      .orderBy(serviceScopeFields.id);
  }

  async createServiceScopeField(field: InsertServiceScopeField): Promise<ServiceScopeField> {
    const [newField] = await db
      .insert(serviceScopeFields)
      .values(field)
      .returning();
    return newField;
  }

  async updateServiceScopeField(fieldId: number, field: Partial<InsertServiceScopeField>): Promise<ServiceScopeField | undefined> {
    const [updatedField] = await db
      .update(serviceScopeFields)
      .set(field)
      .where(eq(serviceScopeFields.id, fieldId))
      .returning();
    
    return updatedField;
  }

  async deleteServiceScopeField(fieldId: number): Promise<boolean> {
    const [deletedField] = await db
      .delete(serviceScopeFields)
      .where(eq(serviceScopeFields.id, fieldId))
      .returning();
    
    return !!deletedField;
  }

  // Service scopes
  async getServiceScopes(): Promise<ServiceScope[]> {
    return await db
      .select()
      .from(serviceScopes)
      .orderBy(serviceScopes.createdAt);
  }

  // User Dashboard Settings Management
  async getUserDashboardSettings(userId: number): Promise<UserDashboardSetting[]> {
    try {
      const settings = await db
        .select()
        .from(userDashboardSettings)
        .where(eq(userDashboardSettings.userId, userId))
        .orderBy(asc(userDashboardSettings.position));
      
      return settings;
    } catch (error) {
      console.error('Error fetching user dashboard settings:', error);
      throw error;
    }
  }

  async saveUserDashboardSettings(userId: number, cards: any[]): Promise<void> {
    try {
      await db.transaction(async (tx) => {
        // Delete existing settings
        await tx
          .delete(userDashboardSettings)
          .where(eq(userDashboardSettings.userId, userId));
        
        // Insert new settings
        if (cards.length > 0) {
          const insertData: InsertUserDashboardSetting[] = cards.map((card, index) => ({
            userId,
            cardId: card.id || card.cardId,
            title: card.title,
            type: card.type || 'metric',
            category: card.category || 'dashboard',
            dataSource: card.dataSource,
            size: card.size || 'small',
            visible: card.visible !== false,
            position: card.order !== undefined ? card.order : index,
            config: card.config || {},
            isBuiltIn: card.isBuiltIn || false,
            isRemovable: card.isRemovable !== false,
          }));
          
          await tx.insert(userDashboardSettings).values(insertData);
        }
      });
    } catch (error) {
      console.error('Error saving user dashboard settings:', error);
      throw error;
    }
  }

  async updateUserDashboardCard(userId: number, cardId: string, updates: Partial<UserDashboardSetting>): Promise<void> {
    try {
      const updateData: any = {
        ...updates,
        updatedAt: new Date(),
      };
      
      // Remove fields that shouldn't be updated via this method
      delete updateData.id;
      delete updateData.userId;
      delete updateData.cardId;
      delete updateData.createdAt;
      
      await db
        .update(userDashboardSettings)
        .set(updateData)
        .where(
          and(
            eq(userDashboardSettings.userId, userId),
            eq(userDashboardSettings.cardId, cardId)
          )
        );
    } catch (error) {
      console.error('Error updating dashboard card:', error);
      throw error;
    }
  }

  async removeUserDashboardCard(userId: number, cardId: string): Promise<void> {
    try {
      const result = await db
        .delete(userDashboardSettings)
        .where(
          and(
            eq(userDashboardSettings.userId, userId),
            eq(userDashboardSettings.cardId, cardId)
          )
        )
        .returning();
      
      if (result.length === 0) {
        throw new Error(`Dashboard card '${cardId}' not found or not removable`);
      }
    } catch (error) {
      console.error('Error removing dashboard card:', error);
      throw error;
    }
  }

  async resetUserDashboardSettings(userId: number): Promise<void> {
    try {
      // Delete all existing settings
      await db
        .delete(userDashboardSettings)
        .where(eq(userDashboardSettings.userId, userId));
      
      // Create default settings
      await this.createDefaultDashboardSettings(userId);
    } catch (error) {
      console.error('Error resetting dashboard settings:', error);
      throw error;
    }
  }

  async createDefaultDashboardSettings(userId: number): Promise<void> {
    const defaultCards: InsertUserDashboardSetting[] = [
      {
        userId,
        cardId: 'total-clients',
        title: 'Total Clients',
        type: 'metric',
        category: 'dashboard',
        dataSource: 'clients',
        size: 'small',
        visible: true,
        position: 0,
        config: {
          icon: 'Building',
          color: 'blue',
          format: 'number',
          aggregation: 'count'
        },
        isBuiltIn: false,
        isRemovable: true,
      },
    ];
    
    try {
      await db.insert(userDashboardSettings).values(defaultCards);
    } catch (error) {
      console.error('Error creating default dashboard settings:', error);
      throw error;
    }
  }

  // Field visibility
  async getFieldVisibilityConfigs(): Promise<any[]> {
    try {
      const result = await db.execute(sql`
        SELECT table_name, field_name, is_visible, context, created_at, updated_at
        FROM field_visibility_config
        ORDER BY table_name, field_name, context
      `);
      return result.rows;
    } catch (error) {
      console.error('Error fetching field visibility configs:', error);
      return [];
    }
  }

  async getFieldVisibilityForTable(tableName: string, context: string = 'form'): Promise<Record<string, boolean>> {
    try {
      const result = await db.execute(sql`
        SELECT field_name, is_visible
        FROM field_visibility_config
        WHERE table_name = ${tableName} AND context = ${context}
      `);
      
      const config: Record<string, boolean> = {};
      result.rows.forEach((row: any) => {
        config[row.field_name] = row.is_visible;
      });
      
      return config;
    } catch (error) {
      console.error(`Error fetching field visibility for table ${tableName}:`, error);
      return {};
    }
  }

  async setFieldVisibility(tableName: string, fieldName: string, isVisible: boolean, context: string = 'form'): Promise<any> {
    try {
      const result = await db.execute(sql`
        INSERT INTO field_visibility_config (table_name, field_name, is_visible, context, created_at, updated_at)
        VALUES (${tableName}, ${fieldName}, ${isVisible}, ${context}, NOW(), NOW())
        ON CONFLICT (table_name, field_name, context)
        DO UPDATE SET
          is_visible = ${isVisible},
          updated_at = NOW()
        RETURNING *
      `);
      
      return result.rows[0];
    } catch (error) {
      console.error('Error setting field visibility:', error);
      throw error;
    }
  }

  async resetFieldVisibility(tableName: string, fieldName: string, context: string = 'form'): Promise<void> {
    try {
      await db.execute(sql`
        DELETE FROM field_visibility_config
        WHERE table_name = ${tableName} AND field_name = ${fieldName} AND context = ${context}
      `);
    } catch (error) {
      console.error('Error resetting field visibility:', error);
      throw error;
    }
  }

  async isFieldVisible(tableName: string, fieldName: string, context: string = 'form'): Promise<boolean> {
    try {
      const result = await db.execute(sql`
        SELECT is_visible
        FROM field_visibility_config
        WHERE table_name = ${tableName} AND field_name = ${fieldName} AND context = ${context}
      `);
      
      // If no configuration exists, default to visible
      return result.rows.length > 0 ? (result.rows[0] as any).is_visible : true;
    } catch (error) {
      console.error('Error checking field visibility:', error);
      return true; // Default to visible on error
    }
  }

  // Custom widgets management
  async getUserCustomWidgets(userId: number, placement?: string): Promise<CustomWidget[]> {
    try {
      const conditions = [eq(customWidgets.userId, userId), eq(customWidgets.isActive, true)];
      
      if (placement) {
        conditions.push(eq(customWidgets.placement, placement));
      }

      return await db
        .select()
        .from(customWidgets)
        .where(and(...conditions))
        .orderBy(customWidgets.createdAt);
    } catch (error) {
      console.error('Error fetching user custom widgets:', error);
      return [];
    }
  }

  async createCustomWidget(widget: InsertCustomWidget): Promise<CustomWidget> {
    const [newWidget] = await db
      .insert(customWidgets)
      .values({ ...widget, updatedAt: new Date() })
      .returning();
    return newWidget;
  }

  async updateCustomWidget(id: number, widget: Partial<InsertCustomWidget>): Promise<CustomWidget | undefined> {
    const [updatedWidget] = await db
      .update(customWidgets)
      .set({ ...widget, updatedAt: new Date() })
      .where(eq(customWidgets.id, id))
      .returning();
    return updatedWidget || undefined;
  }

  async deleteCustomWidget(id: number, userId: number): Promise<boolean> {
    // Soft delete by setting isActive to false, but also verify ownership
    const [deletedWidget] = await db
      .update(customWidgets)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(customWidgets.id, id), eq(customWidgets.userId, userId)))
      .returning();
    return !!deletedWidget;
  }

  // User preferences management
  async getUserPreference(userId: number, preferenceType: string, preferenceKey?: string): Promise<UserPreference[]> {
    try {
      const conditions = [
        eq(userPreferences.userId, userId),
        eq(userPreferences.preferenceType, preferenceType)
      ];
      
      if (preferenceKey) {
        conditions.push(eq(userPreferences.preferenceKey, preferenceKey));
      }

      return await db
        .select()
        .from(userPreferences)
        .where(and(...conditions))
        .orderBy(userPreferences.preferenceKey);
    } catch (error) {
      console.error('Error fetching user preferences:', error);
      return [];
    }
  }

  async setUserPreference(userId: number, preferenceType: string, preferenceKey: string, preferenceValue: any): Promise<UserPreference> {
    try {
      // Use INSERT ... ON CONFLICT to handle upsert
      const [preference] = await db
        .insert(userPreferences)
        .values({
          userId,
          preferenceType,
          preferenceKey,
          preferenceValue: preferenceValue,
          updatedAt: new Date()
        })
        .onConflictDoUpdate({
          target: [userPreferences.userId, userPreferences.preferenceType, userPreferences.preferenceKey],
          set: {
            preferenceValue: preferenceValue,
            updatedAt: new Date()
          }
        })
        .returning();
      
      return preference;
    } catch (error) {
      console.error('Error setting user preference:', error);
      throw error;
    }
  }

  async deleteUserPreference(userId: number, preferenceType: string, preferenceKey?: string): Promise<boolean> {
    try {
      const conditions = [
        eq(userPreferences.userId, userId),
        eq(userPreferences.preferenceType, preferenceType)
      ];
      
      if (preferenceKey) {
        conditions.push(eq(userPreferences.preferenceKey, preferenceKey));
      }

      const result = await db
        .delete(userPreferences)
        .where(and(...conditions));
      
      return (result.rowCount || 0) > 0;
    } catch (error) {
      console.error('Error deleting user preference:', error);
      return false;
    }
  }

}

export const storage = new DatabaseStorage();

// Export individual functions for LDAP integration
export const getUserByLdapId = (ldapId: string) => storage.getUserByLdapId(ldapId);
export const getUserByEmail = (email: string) => storage.getUserByEmail(email);
export const createUser = (user: InsertUser) => storage.createUser(user);
export const findOrCreateLdapUser = async (ldapUser: any) => {
  // This function will be implemented in the LDAP strategy
  throw new Error("findOrCreateLdapUser should be called from LDAP strategy");
};
