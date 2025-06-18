"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.findOrCreateLdapUser = exports.createUser = exports.getUserByEmail = exports.getUserByLdapId = exports.storage = exports.DatabaseStorage = void 0;
const schema_1 = require("@shared/schema");
const db_1 = require("./db");
const drizzle_orm_1 = require("drizzle-orm");
const express_session_1 = __importDefault(require("express-session"));
const connect_pg_simple_1 = __importDefault(require("connect-pg-simple"));
const memorystore_1 = __importDefault(require("memorystore"));
const PostgresSessionStore = (0, connect_pg_simple_1.default)(express_session_1.default);
const MemoryStore = (0, memorystore_1.default)(express_session_1.default);
class DatabaseStorage {
    constructor() {
        // Use memory store for sessions to avoid connection issues
        this.sessionStore = new MemoryStore({
            checkPeriod: 86400000, // prune expired entries every 24h
        });
    }
    // User management
    async getUser(id) {
        const [user] = await db_1.db.select().from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.id, id));
        return user || undefined;
    }
    async getUserById(id) {
        // Handle both UUID and integer ID formats
        console.log("getUserById called with ID:", id, "Type:", typeof id);
        // The users.id column is numeric, so we need to parse string to number
        const numericId = parseInt(id);
        if (isNaN(numericId)) {
            console.warn("Invalid user ID format - not a valid integer:", id);
            return undefined;
        }
        console.log("Treating as integer ID");
        const [user] = await db_1.db.select().from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.id, numericId));
        return user || undefined;
    }
    async getUserByUsername(username) {
        const [user] = await db_1.db.select().from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.email, username));
        return user || undefined;
    }
    async getUserByEmail(email) {
        console.log("=== STORAGE: getUserByEmail ===");
        console.log("Looking for email:", email);
        try {
            const [user] = await db_1.db.select().from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.email, email));
            if (user) {
                console.log("Query result: User found");
                console.log("User ID:", user.id);
                console.log("User email:", user.email);
            }
            else {
                console.log("Query result: No user found");
            }
            console.log("=============================");
            return user || undefined;
        }
        catch (error) {
            console.error("Error in getUserByEmail:", error);
            console.log("=============================");
            throw error;
        }
    }
    async getUserByLdapId(ldapId) {
        console.log("=== STORAGE: getUserByLdapId ===");
        console.log("Looking for LDAP ID:", ldapId);
        try {
            const [user] = await db_1.db.select().from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.ldapId, ldapId));
            if (user) {
                console.log("Query result: User found");
                console.log("User ID:", user.id);
                console.log("User email:", user.email);
                console.log("Auth provider:", user.authProvider);
            }
            else {
                console.log("Query result: No user found");
            }
            console.log("===============================");
            return user || undefined;
        }
        catch (error) {
            console.error("Error in getUserByLdapId:", error);
            console.log("===============================");
            throw error;
        }
    }
    async createUser(insertUser) {
        const [user] = await db_1.db
            .insert(schema_1.users)
            .values(insertUser)
            .returning();
        return user;
    }
    async getAllUsers() {
        return await db_1.db.select().from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.isActive, true)).orderBy((0, drizzle_orm_1.desc)(schema_1.users.createdAt));
    }
    async updateUser(id, user) {
        const [updatedUser] = await db_1.db
            .update(schema_1.users)
            .set(user)
            .where((0, drizzle_orm_1.eq)(schema_1.users.id, id))
            .returning();
        return updatedUser || undefined;
    }
    // User settings management
    async getUserSettings(userId) {
        const [settings] = await db_1.db.select().from(schema_1.userSettings).where((0, drizzle_orm_1.eq)(schema_1.userSettings.userId, userId));
        return settings || undefined;
    }
    async createUserSettings(settings) {
        const [newSettings] = await db_1.db
            .insert(schema_1.userSettings)
            .values({ ...settings, updatedAt: new Date() })
            .returning();
        return newSettings;
    }
    async updateUserSettings(userId, settings) {
        const [updatedSettings] = await db_1.db
            .update(schema_1.userSettings)
            .set({ ...settings, updatedAt: new Date() })
            .where((0, drizzle_orm_1.eq)(schema_1.userSettings.userId, userId))
            .returning();
        return updatedSettings || undefined;
    }
    // Client management
    async getAllClients() {
        return await db_1.db.select().from(schema_1.clients)
            .where((0, drizzle_orm_1.isNull)(schema_1.clients.deletedAt))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.clients.createdAt));
    }
    async getClientsWithStats() {
        // Return all active (non-archived) clients with aggregated relationship counts
        const results = await db_1.db.execute((0, drizzle_orm_1.sql) `
      SELECT
        c.*, 
        (
          SELECT COUNT(*)
          FROM ${schema_1.contracts} ct
          WHERE ct."clientId" = c.id AND ct."status" <> 'archived'
        ) AS "contractsCount",
        (
          SELECT COUNT(*)
          FROM ${schema_1.serviceScopes} ss
          JOIN ${schema_1.contracts} ct2 ON ct2.id = ss."contract_id"
          WHERE ct2."clientId" = c.id
        ) AS "servicesCount",
        (
          SELECT COUNT(*)
          FROM ${schema_1.clientLicenses} cl
          WHERE cl."client_id" = c.id
        ) AS "licensesCount"
      FROM ${schema_1.clients} c
      WHERE c."deletedAt" IS NULL
      ORDER BY c."createdAt" DESC;
    `).then(r => r.rows);
        return results;
    }
    async getClient(id) {
        const [client] = await db_1.db.select().from(schema_1.clients)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.clients.id, id), (0, drizzle_orm_1.isNull)(schema_1.clients.deletedAt)));
        return client || undefined;
    }
    async createClient(client) {
        const [newClient] = await db_1.db
            .insert(schema_1.clients)
            .values({ ...client, updatedAt: new Date() })
            .returning();
        return newClient;
    }
    async updateClient(id, client) {
        const [updatedClient] = await db_1.db
            .update(schema_1.clients)
            .set({ ...client, updatedAt: new Date() })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.clients.id, id), (0, drizzle_orm_1.isNull)(schema_1.clients.deletedAt)))
            .returning();
        return updatedClient || undefined;
    }
    async deleteClient(id) {
        // Soft delete by setting deletedAt timestamp and status to archived
        const [deletedClient] = await db_1.db
            .update(schema_1.clients)
            .set({
            deletedAt: new Date(),
            status: 'archived',
            updatedAt: new Date()
        })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.clients.id, id), (0, drizzle_orm_1.isNull)(schema_1.clients.deletedAt)))
            .returning();
        return !!deletedClient;
    }
    async archiveClient(id) {
        // Same as delete but explicit method for clarity
        const [archivedClient] = await db_1.db
            .update(schema_1.clients)
            .set({
            deletedAt: new Date(),
            status: 'archived',
            updatedAt: new Date()
        })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.clients.id, id), (0, drizzle_orm_1.isNull)(schema_1.clients.deletedAt)))
            .returning();
        return archivedClient || undefined;
    }
    async restoreClient(id) {
        // Restore a soft-deleted client
        const [restoredClient] = await db_1.db
            .update(schema_1.clients)
            .set({
            deletedAt: null,
            status: 'active', // Default to active when restored
            updatedAt: new Date()
        })
            .where((0, drizzle_orm_1.eq)(schema_1.clients.id, id))
            .returning();
        return restoredClient || undefined;
    }
    async getArchivedClients() {
        // Get all archived/deleted clients
        return await db_1.db.select().from(schema_1.clients)
            .where((0, drizzle_orm_1.isNotNull)(schema_1.clients.deletedAt))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.clients.deletedAt));
    }
    async getClientDeletionImpact(id) {
        // Check what would prevent deletion (for validation)
        const [contractCount] = await db_1.db.select({ count: (0, drizzle_orm_1.sql) `count(*)` }).from(schema_1.contracts)
            .where((0, drizzle_orm_1.eq)(schema_1.contracts.clientId, id));
        const [documentCount] = await db_1.db.select({ count: (0, drizzle_orm_1.sql) `count(*)` }).from(schema_1.documents)
            .where((0, drizzle_orm_1.eq)(schema_1.documents.clientId, id));
        const [licenseCount] = await db_1.db.select({ count: (0, drizzle_orm_1.sql) `count(*)` }).from(schema_1.clientLicenses)
            .where((0, drizzle_orm_1.eq)(schema_1.clientLicenses.clientId, id));
        const [hardwareCount] = await db_1.db.select({ count: (0, drizzle_orm_1.sql) `count(*)` }).from(schema_1.clientHardwareAssignments)
            .where((0, drizzle_orm_1.eq)(schema_1.clientHardwareAssignments.clientId, id));
        const [teamCount] = await db_1.db.select({ count: (0, drizzle_orm_1.sql) `count(*)` }).from(schema_1.clientTeamAssignments)
            .where((0, drizzle_orm_1.eq)(schema_1.clientTeamAssignments.clientId, id));
        const [financialCount] = await db_1.db.select({ count: (0, drizzle_orm_1.sql) `count(*)` }).from(schema_1.financialTransactions)
            .where((0, drizzle_orm_1.eq)(schema_1.financialTransactions.clientId, id));
        const dependencies = {
            contracts: contractCount.count,
            documents: documentCount.count,
            licenses: licenseCount.count,
            hardwareAssignments: hardwareCount.count,
            teamAssignments: teamCount.count,
            financialTransactions: financialCount.count,
        };
        const blockers = [];
        // Check for active contracts
        if (dependencies.contracts > 0) {
            const [activeContracts] = await db_1.db.select({ count: (0, drizzle_orm_1.sql) `count(*)` }).from(schema_1.contracts)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.contracts.clientId, id), (0, drizzle_orm_1.eq)(schema_1.contracts.status, 'active')));
            if (activeContracts.count > 0) {
                blockers.push(`${activeContracts.count} active contract(s) must be closed first`);
            }
        }
        // Check for pending financial transactions
        if (dependencies.financialTransactions > 0) {
            const [pendingTransactions] = await db_1.db.select({ count: (0, drizzle_orm_1.sql) `count(*)` }).from(schema_1.financialTransactions)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.financialTransactions.clientId, id), (0, drizzle_orm_1.ne)(schema_1.financialTransactions.status, 'completed')));
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
    async searchClients(query) {
        return await db_1.db
            .select()
            .from(schema_1.clients)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.isNull)(schema_1.clients.deletedAt), // Filter out deleted clients
        (0, drizzle_orm_1.or)((0, drizzle_orm_1.like)(schema_1.clients.name, `%${query}%`), (0, drizzle_orm_1.like)(schema_1.clients.shortName, `%${query}%`), (0, drizzle_orm_1.like)(schema_1.clients.domain, `%${query}%`), (0, drizzle_orm_1.like)(schema_1.clients.industry, `%${query}%`), (0, drizzle_orm_1.like)(schema_1.clients.address, `%${query}%`))))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.clients.createdAt));
    }
    // Client contacts
    async getClientContacts(clientId) {
        return await db_1.db
            .select()
            .from(schema_1.clientContacts)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.clientContacts.clientId, clientId), (0, drizzle_orm_1.eq)(schema_1.clientContacts.isActive, true)))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.clientContacts.isPrimary), (0, drizzle_orm_1.desc)(schema_1.clientContacts.createdAt));
    }
    async createClientContact(contact) {
        const [newContact] = await db_1.db
            .insert(schema_1.clientContacts)
            .values(contact)
            .returning();
        return newContact;
    }
    async updateClientContact(id, contact) {
        const [updatedContact] = await db_1.db
            .update(schema_1.clientContacts)
            .set(contact)
            .where((0, drizzle_orm_1.eq)(schema_1.clientContacts.id, id))
            .returning();
        return updatedContact || undefined;
    }
    async deleteClientContact(id) {
        const [updatedContact] = await db_1.db
            .update(schema_1.clientContacts)
            .set({ isActive: false })
            .where((0, drizzle_orm_1.eq)(schema_1.clientContacts.id, id))
            .returning();
        return !!updatedContact;
    }
    // Services
    async getAllServices() {
        return await db_1.db
            .select()
            .from(schema_1.services)
            .where((0, drizzle_orm_1.eq)(schema_1.services.isActive, true))
            .orderBy(schema_1.services.category, schema_1.services.name);
    }
    async getService(id) {
        const [service] = await db_1.db.select().from(schema_1.services).where((0, drizzle_orm_1.eq)(schema_1.services.id, id));
        return service || undefined;
    }
    async getServiceScopeDefinitionTemplate(id) {
        const [service] = await db_1.db.select().from(schema_1.services).where((0, drizzle_orm_1.eq)(schema_1.services.id, id));
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
    async createService(service) {
        const [newService] = await db_1.db
            .insert(schema_1.services)
            .values(service)
            .returning();
        return newService;
    }
    async updateService(id, service) {
        const [updatedService] = await db_1.db
            .update(schema_1.services)
            .set(service)
            .where((0, drizzle_orm_1.eq)(schema_1.services.id, id))
            .returning();
        return updatedService || undefined;
    }
    async deleteService(id) {
        const [updatedService] = await db_1.db
            .update(schema_1.services)
            .set({ isActive: false })
            .where((0, drizzle_orm_1.eq)(schema_1.services.id, id))
            .returning();
        return !!updatedService;
    }
    // Contracts
    async getAllContracts() {
        try {
            return await db_1.db.select().from(schema_1.contracts).orderBy((0, drizzle_orm_1.desc)(schema_1.contracts.createdAt));
        }
        catch (err) {
            console.error('⚠️ getAllContracts DB error, returning empty list:', err);
            return [];
        }
    }
    async getContract(id) {
        const [contract] = await db_1.db.select().from(schema_1.contracts).where((0, drizzle_orm_1.eq)(schema_1.contracts.id, id));
        return contract || undefined;
    }
    async getClientContracts(clientId) {
        return await db_1.db
            .select()
            .from(schema_1.contracts)
            .where((0, drizzle_orm_1.eq)(schema_1.contracts.clientId, clientId))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.contracts.createdAt));
    }
    async createContract(contract) {
        const [newContract] = await db_1.db
            .insert(schema_1.contracts)
            .values({ ...contract, updatedAt: new Date() })
            .returning();
        return newContract;
    }
    async updateContract(id, contract) {
        const [updatedContract] = await db_1.db
            .update(schema_1.contracts)
            .set({ ...contract, updatedAt: new Date() })
            .where((0, drizzle_orm_1.eq)(schema_1.contracts.id, id))
            .returning();
        return updatedContract || undefined;
    }
    async deleteContract(id) {
        const result = await db_1.db.delete(schema_1.contracts).where((0, drizzle_orm_1.eq)(schema_1.contracts.id, id));
        return (result.rowCount ?? 0) > 0;
    }
    // Service scopes
    async getContractServiceScopes(contractId) {
        return await db_1.db
            .select()
            .from(schema_1.serviceScopes)
            .where((0, drizzle_orm_1.eq)(schema_1.serviceScopes.contractId, contractId))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.serviceScopes.createdAt));
    }
    async getServiceScopesByClientId(clientId) {
        // Use a proper drizzle join instead of manual SQL construction
        return await db_1.db
            .select({
            id: schema_1.serviceScopes.id,
            contractId: schema_1.serviceScopes.contractId,
            serviceId: schema_1.serviceScopes.serviceId,
            scopeDefinition: schema_1.serviceScopes.scopeDefinition,
            safDocumentUrl: schema_1.serviceScopes.safDocumentUrl,
            safStartDate: schema_1.serviceScopes.safStartDate,
            safEndDate: schema_1.serviceScopes.safEndDate,
            safStatus: schema_1.serviceScopes.safStatus,
            startDate: schema_1.serviceScopes.startDate,
            endDate: schema_1.serviceScopes.endDate,
            status: schema_1.serviceScopes.status,
            monthlyValue: schema_1.serviceScopes.monthlyValue,
            description: schema_1.serviceScopes.description,
            notes: schema_1.serviceScopes.notes,
            eps: schema_1.serviceScopes.eps,
            endpoints: schema_1.serviceScopes.endpoints,
            dataVolumeGb: schema_1.serviceScopes.dataVolumeGb,
            logSources: schema_1.serviceScopes.logSources,
            firewallDevices: schema_1.serviceScopes.firewallDevices,
            pamUsers: schema_1.serviceScopes.pamUsers,
            responseTimeMinutes: schema_1.serviceScopes.responseTimeMinutes,
            coverageHours: schema_1.serviceScopes.coverageHours,
            serviceTier: schema_1.serviceScopes.serviceTier,
            safId: schema_1.serviceScopes.safId,
            createdAt: schema_1.serviceScopes.createdAt,
            updatedAt: schema_1.serviceScopes.updatedAt
        })
            .from(schema_1.serviceScopes)
            .innerJoin(schema_1.contracts, (0, drizzle_orm_1.eq)(schema_1.serviceScopes.contractId, schema_1.contracts.id))
            .where((0, drizzle_orm_1.eq)(schema_1.contracts.clientId, clientId))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.serviceScopes.createdAt));
    }
    async createServiceScope(serviceScope) {
        const [createdScope] = await db_1.db
            .insert(schema_1.serviceScopes)
            .values(serviceScope)
            .returning({
            id: schema_1.serviceScopes.id,
            contractId: schema_1.serviceScopes.contractId,
            serviceId: schema_1.serviceScopes.serviceId,
            scopeDefinition: schema_1.serviceScopes.scopeDefinition,
            safDocumentUrl: schema_1.serviceScopes.safDocumentUrl,
            safStartDate: schema_1.serviceScopes.safStartDate,
            safEndDate: schema_1.serviceScopes.safEndDate,
            safStatus: schema_1.serviceScopes.safStatus,
            startDate: schema_1.serviceScopes.startDate,
            endDate: schema_1.serviceScopes.endDate,
            status: schema_1.serviceScopes.status,
            monthlyValue: schema_1.serviceScopes.monthlyValue,
            description: schema_1.serviceScopes.description,
            notes: schema_1.serviceScopes.notes,
            eps: schema_1.serviceScopes.eps,
            endpoints: schema_1.serviceScopes.endpoints,
            dataVolumeGb: schema_1.serviceScopes.dataVolumeGb,
            logSources: schema_1.serviceScopes.logSources,
            firewallDevices: schema_1.serviceScopes.firewallDevices,
            pamUsers: schema_1.serviceScopes.pamUsers,
            responseTimeMinutes: schema_1.serviceScopes.responseTimeMinutes,
            coverageHours: schema_1.serviceScopes.coverageHours,
            serviceTier: schema_1.serviceScopes.serviceTier,
            safId: schema_1.serviceScopes.safId,
            createdAt: schema_1.serviceScopes.createdAt,
            updatedAt: schema_1.serviceScopes.updatedAt
        });
        if (!createdScope) {
            throw new Error('Failed to create service scope');
        }
        return createdScope;
    }
    async updateServiceScope(id, serviceScope) {
        const [updatedServiceScope] = await db_1.db
            .update(schema_1.serviceScopes)
            .set(serviceScope)
            .where((0, drizzle_orm_1.eq)(schema_1.serviceScopes.id, id))
            .returning();
        return updatedServiceScope || undefined;
    }
    async deleteServiceScope(id) {
        const result = await db_1.db.delete(schema_1.serviceScopes).where((0, drizzle_orm_1.eq)(schema_1.serviceScopes.id, id));
        return (result.rowCount ?? 0) > 0;
    }
    async restoreServiceScopeVersion(scopeId, versionId) {
        // Implement the logic to restore a specific version of a service scope
        // This is a placeholder implementation
        return undefined;
    }
    // Proposals
    async getContractProposals(contractId) {
        return await db_1.db
            .select()
            .from(schema_1.proposals)
            .where((0, drizzle_orm_1.eq)(schema_1.proposals.contractId, contractId))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.proposals.createdAt));
    }
    async createProposal(proposal) {
        const [newProposal] = await db_1.db
            .insert(schema_1.proposals)
            .values({ ...proposal, updatedAt: new Date() })
            .returning();
        return newProposal;
    }
    async updateProposal(id, proposal) {
        const [updatedProposal] = await db_1.db
            .update(schema_1.proposals)
            .set({ ...proposal, updatedAt: new Date() })
            .where((0, drizzle_orm_1.eq)(schema_1.proposals.id, id))
            .returning();
        return updatedProposal || undefined;
    }
    async deleteProposal(id) {
        const result = await db_1.db.delete(schema_1.proposals).where((0, drizzle_orm_1.eq)(schema_1.proposals.id, id));
        return (result.rowCount ?? 0) > 0;
    }
    // License management
    async getAllLicensePools() {
        return await db_1.db
            .select()
            .from(schema_1.licensePools)
            .where((0, drizzle_orm_1.eq)(schema_1.licensePools.isActive, true))
            .orderBy(schema_1.licensePools.vendor, schema_1.licensePools.productName);
    }
    async getLicensePool(id) {
        const [licensePool] = await db_1.db.select().from(schema_1.licensePools).where((0, drizzle_orm_1.eq)(schema_1.licensePools.id, id));
        return licensePool || undefined;
    }
    // Helper function to calculate available licenses for a license pool
    async calculateAvailableLicenses(licensePoolId, totalLicenses) {
        // Get sum of all assigned licenses for this pool
        const result = await db_1.db
            .select({
            totalAssigned: (0, drizzle_orm_1.sql) `coalesce(sum(${schema_1.clientLicenses.assignedLicenses}), 0)`
        })
            .from(schema_1.clientLicenses)
            .where((0, drizzle_orm_1.eq)(schema_1.clientLicenses.licensePoolId, licensePoolId));
        const totalAssigned = result[0]?.totalAssigned || 0;
        return Math.max(0, totalLicenses - totalAssigned);
    }
    async createLicensePool(licensePool) {
        // Create the license pool first
        const [newLicensePool] = await db_1.db
            .insert(schema_1.licensePools)
            .values({
            ...licensePool,
            availableLicenses: licensePool.totalLicenses || 0, // Initially all licenses are available
        })
            .returning();
        return newLicensePool;
    }
    async updateLicensePool(id, licensePool) {
        // Allow adding availableLicenses even though it isn\'t in InsertLicensePool
        let updateData = { ...licensePool };
        if (licensePool.totalLicenses !== undefined) {
            const availableLicenses = await this.calculateAvailableLicenses(id, licensePool.totalLicenses);
            updateData.availableLicenses = availableLicenses;
        }
        const [updatedLicensePool] = await db_1.db
            .update(schema_1.licensePools)
            .set(updateData)
            .where((0, drizzle_orm_1.eq)(schema_1.licensePools.id, id))
            .returning();
        return updatedLicensePool || undefined;
    }
    async deleteLicensePool(id) {
        const result = await db_1.db.delete(schema_1.licensePools).where((0, drizzle_orm_1.eq)(schema_1.licensePools.id, id));
        return (result.rowCount ?? 0) > 0;
    }
    async getClientLicenses(clientId) {
        return await db_1.db
            .select()
            .from(schema_1.clientLicenses)
            .where((0, drizzle_orm_1.eq)(schema_1.clientLicenses.clientId, clientId))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.clientLicenses.assignedDate));
    }
    async getLicensePoolAllocations(licensePoolId) {
        return await db_1.db
            .select({
            id: schema_1.clientLicenses.id,
            clientId: schema_1.clientLicenses.clientId,
            licensePoolId: schema_1.clientLicenses.licensePoolId,
            serviceScopeId: schema_1.clientLicenses.serviceScopeId,
            assignedLicenses: schema_1.clientLicenses.assignedLicenses,
            assignedDate: schema_1.clientLicenses.assignedDate,
            notes: schema_1.clientLicenses.notes,
            clientName: schema_1.clients.name,
        })
            .from(schema_1.clientLicenses)
            .innerJoin(schema_1.clients, (0, drizzle_orm_1.eq)(schema_1.clientLicenses.clientId, schema_1.clients.id))
            .where((0, drizzle_orm_1.eq)(schema_1.clientLicenses.licensePoolId, licensePoolId))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.clientLicenses.assignedDate));
    }
    async getAllLicensePoolAllocations() {
        const allAllocations = await db_1.db
            .select({
            id: schema_1.clientLicenses.id,
            clientId: schema_1.clientLicenses.clientId,
            licensePoolId: schema_1.clientLicenses.licensePoolId,
            serviceScopeId: schema_1.clientLicenses.serviceScopeId,
            assignedLicenses: schema_1.clientLicenses.assignedLicenses,
            assignedDate: schema_1.clientLicenses.assignedDate,
            notes: schema_1.clientLicenses.notes,
            clientName: schema_1.clients.name,
        })
            .from(schema_1.clientLicenses)
            .innerJoin(schema_1.clients, (0, drizzle_orm_1.eq)(schema_1.clientLicenses.clientId, schema_1.clients.id))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.clientLicenses.assignedDate));
        // Group by license pool ID
        const groupedAllocations = {};
        allAllocations.forEach(allocation => {
            if (!groupedAllocations[allocation.licensePoolId]) {
                groupedAllocations[allocation.licensePoolId] = [];
            }
            groupedAllocations[allocation.licensePoolId].push(allocation);
        });
        return groupedAllocations;
    }
    async createClientLicense(clientLicense) {
        // Create the client license assignment
        const [newClientLicense] = await db_1.db
            .insert(schema_1.clientLicenses)
            .values(clientLicense)
            .returning();
        // Update the license pool's available licenses
        await this.updateLicensePoolAvailability(clientLicense.licensePoolId);
        return newClientLicense;
    }
    async updateClientLicense(id, clientLicense) {
        // Get the current license to know which pool to update
        const [currentLicense] = await db_1.db
            .select()
            .from(schema_1.clientLicenses)
            .where((0, drizzle_orm_1.eq)(schema_1.clientLicenses.id, id));
        if (!currentLicense) {
            return undefined;
        }
        const [updatedClientLicense] = await db_1.db
            .update(schema_1.clientLicenses)
            .set(clientLicense)
            .where((0, drizzle_orm_1.eq)(schema_1.clientLicenses.id, id))
            .returning();
        // Update availability for the affected license pool(s)
        await this.updateLicensePoolAvailability(currentLicense.licensePoolId);
        // If license pool changed, update the new pool too
        if (clientLicense.licensePoolId && clientLicense.licensePoolId !== currentLicense.licensePoolId) {
            await this.updateLicensePoolAvailability(clientLicense.licensePoolId);
        }
        return updatedClientLicense || undefined;
    }
    async deleteClientLicense(id) {
        // Get the license to know which pool to update
        const [license] = await db_1.db
            .select()
            .from(schema_1.clientLicenses)
            .where((0, drizzle_orm_1.eq)(schema_1.clientLicenses.id, id));
        if (!license) {
            return false;
        }
        const result = await db_1.db.delete(schema_1.clientLicenses).where((0, drizzle_orm_1.eq)(schema_1.clientLicenses.id, id));
        const deleted = (result.rowCount ?? 0) > 0;
        // Update the license pool availability if deletion was successful
        if (deleted) {
            await this.updateLicensePoolAvailability(license.licensePoolId);
        }
        return deleted;
    }
    // Helper function to update a license pool's available licenses
    async updateLicensePoolAvailability(licensePoolId) {
        // Get the current license pool
        const [licensePool] = await db_1.db
            .select()
            .from(schema_1.licensePools)
            .where((0, drizzle_orm_1.eq)(schema_1.licensePools.id, licensePoolId));
        if (!licensePool) {
            return;
        }
        // Calculate new available licenses
        const availableLicenses = await this.calculateAvailableLicenses(licensePoolId, licensePool.totalLicenses);
        // Update the license pool
        await db_1.db
            .update(schema_1.licensePools)
            .set({ availableLicenses })
            .where((0, drizzle_orm_1.eq)(schema_1.licensePools.id, licensePoolId));
    }
    // Individual license management
    async getAllIndividualLicenses() {
        return await db_1.db
            .select()
            .from(schema_1.individualLicenses)
            .orderBy(schema_1.individualLicenses.name);
    }
    async getIndividualLicense(id) {
        const [license] = await db_1.db
            .select()
            .from(schema_1.individualLicenses)
            .where((0, drizzle_orm_1.eq)(schema_1.individualLicenses.id, id));
        return license || undefined;
    }
    async getClientIndividualLicenses(clientId) {
        return await db_1.db
            .select()
            .from(schema_1.individualLicenses)
            .where((0, drizzle_orm_1.eq)(schema_1.individualLicenses.clientId, clientId))
            .orderBy(schema_1.individualLicenses.name);
    }
    async createIndividualLicense(license) {
        const [newLicense] = await db_1.db
            .insert(schema_1.individualLicenses)
            .values(license)
            .returning();
        return newLicense;
    }
    async updateIndividualLicense(id, license) {
        const [updatedLicense] = await db_1.db
            .update(schema_1.individualLicenses)
            .set(license)
            .where((0, drizzle_orm_1.eq)(schema_1.individualLicenses.id, id))
            .returning();
        return updatedLicense || undefined;
    }
    async deleteIndividualLicense(id) {
        const result = await db_1.db.delete(schema_1.individualLicenses).where((0, drizzle_orm_1.eq)(schema_1.individualLicenses.id, id));
        return (result.rowCount ?? 0) > 0;
    }
    // Service Authorization Forms (SAF)
    async getAllServiceAuthorizationForms() {
        return await db_1.db
            .select()
            .from(schema_1.serviceAuthorizationForms)
            .orderBy(schema_1.serviceAuthorizationForms.title);
    }
    async getServiceAuthorizationForm(id) {
        const [saf] = await db_1.db
            .select()
            .from(schema_1.serviceAuthorizationForms)
            .where((0, drizzle_orm_1.eq)(schema_1.serviceAuthorizationForms.id, id));
        return saf || undefined;
    }
    async getClientServiceAuthorizationForms(clientId) {
        return await db_1.db
            .select()
            .from(schema_1.serviceAuthorizationForms)
            .where((0, drizzle_orm_1.eq)(schema_1.serviceAuthorizationForms.clientId, clientId))
            .orderBy(schema_1.serviceAuthorizationForms.createdAt);
    }
    async createServiceAuthorizationForm(saf) {
        const [newSaf] = await db_1.db
            .insert(schema_1.serviceAuthorizationForms)
            .values(saf)
            .returning();
        return newSaf;
    }
    async updateServiceAuthorizationForm(id, saf) {
        const [updatedSaf] = await db_1.db
            .update(schema_1.serviceAuthorizationForms)
            .set(saf)
            .where((0, drizzle_orm_1.eq)(schema_1.serviceAuthorizationForms.id, id))
            .returning();
        return updatedSaf || undefined;
    }
    async deleteServiceAuthorizationForm(id) {
        const result = await db_1.db.delete(schema_1.serviceAuthorizationForms).where((0, drizzle_orm_1.eq)(schema_1.serviceAuthorizationForms.id, id));
        return (result.rowCount ?? 0) > 0;
    }
    async getServiceAuthorizationFormsByClientId(clientId) {
        return await db_1.db
            .select()
            .from(schema_1.serviceAuthorizationForms)
            .where((0, drizzle_orm_1.eq)(schema_1.serviceAuthorizationForms.clientId, clientId))
            .orderBy(schema_1.serviceAuthorizationForms.createdAt);
    }
    // Certificate of Compliance (COC)
    async getAllCertificatesOfCompliance() {
        return await db_1.db
            .select()
            .from(schema_1.certificatesOfCompliance)
            .orderBy(schema_1.certificatesOfCompliance.title);
    }
    async getCertificateOfCompliance(id) {
        const [coc] = await db_1.db
            .select()
            .from(schema_1.certificatesOfCompliance)
            .where((0, drizzle_orm_1.eq)(schema_1.certificatesOfCompliance.id, id));
        return coc || undefined;
    }
    async getClientCertificatesOfCompliance(clientId) {
        return await db_1.db
            .select()
            .from(schema_1.certificatesOfCompliance)
            .where((0, drizzle_orm_1.eq)(schema_1.certificatesOfCompliance.clientId, clientId))
            .orderBy(schema_1.certificatesOfCompliance.title);
    }
    async createCertificateOfCompliance(coc) {
        const [newCoc] = await db_1.db
            .insert(schema_1.certificatesOfCompliance)
            .values(coc)
            .returning();
        return newCoc;
    }
    async updateCertificateOfCompliance(id, coc) {
        const [updatedCoc] = await db_1.db
            .update(schema_1.certificatesOfCompliance)
            .set(coc)
            .where((0, drizzle_orm_1.eq)(schema_1.certificatesOfCompliance.id, id))
            .returning();
        return updatedCoc || undefined;
    }
    async deleteCertificateOfCompliance(id) {
        const result = await db_1.db.delete(schema_1.certificatesOfCompliance).where((0, drizzle_orm_1.eq)(schema_1.certificatesOfCompliance.id, id));
        return (result.rowCount ?? 0) > 0;
    }
    // Hardware management
    async getAllHardwareAssets() {
        return await db_1.db
            .select()
            .from(schema_1.hardwareAssets)
            .orderBy(schema_1.hardwareAssets.category, schema_1.hardwareAssets.name);
    }
    async getHardwareAsset(id) {
        const [asset] = await db_1.db.select().from(schema_1.hardwareAssets).where((0, drizzle_orm_1.eq)(schema_1.hardwareAssets.id, id));
        return asset || undefined;
    }
    async createHardwareAsset(asset) {
        const [newAsset] = await db_1.db
            .insert(schema_1.hardwareAssets)
            .values(asset)
            .returning();
        return newAsset;
    }
    async updateHardwareAsset(id, asset) {
        const [updatedAsset] = await db_1.db
            .update(schema_1.hardwareAssets)
            .set(asset)
            .where((0, drizzle_orm_1.eq)(schema_1.hardwareAssets.id, id))
            .returning();
        return updatedAsset || undefined;
    }
    async deleteHardwareAsset(id) {
        const result = await db_1.db.delete(schema_1.hardwareAssets).where((0, drizzle_orm_1.eq)(schema_1.hardwareAssets.id, id));
        return (result.rowCount ?? 0) > 0;
    }
    async getClientHardwareAssignments(clientId) {
        return await db_1.db
            .select()
            .from(schema_1.clientHardwareAssignments)
            .where((0, drizzle_orm_1.eq)(schema_1.clientHardwareAssignments.clientId, clientId))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.clientHardwareAssignments.assignedDate));
    }
    async createClientHardwareAssignment(assignment) {
        const [newAssignment] = await db_1.db
            .insert(schema_1.clientHardwareAssignments)
            .values(assignment)
            .returning();
        return newAssignment;
    }
    async updateClientHardwareAssignment(id, assignment) {
        const [updatedAssignment] = await db_1.db
            .update(schema_1.clientHardwareAssignments)
            .set(assignment)
            .where((0, drizzle_orm_1.eq)(schema_1.clientHardwareAssignments.id, id))
            .returning();
        return updatedAssignment || undefined;
    }
    // Financial transactions
    async getAllFinancialTransactions() {
        return await db_1.db
            .select()
            .from(schema_1.financialTransactions)
            .orderBy((0, drizzle_orm_1.desc)(schema_1.financialTransactions.transactionDate));
    }
    async getClientFinancialTransactions(clientId) {
        return await db_1.db
            .select()
            .from(schema_1.financialTransactions)
            .where((0, drizzle_orm_1.eq)(schema_1.financialTransactions.clientId, clientId))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.financialTransactions.transactionDate));
    }
    async createFinancialTransaction(transaction) {
        const [newTransaction] = await db_1.db
            .insert(schema_1.financialTransactions)
            .values(transaction)
            .returning();
        return newTransaction;
    }
    // Team assignments
    async getClientTeamAssignments(clientId) {
        return await db_1.db
            .select()
            .from(schema_1.clientTeamAssignments)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.clientTeamAssignments.clientId, clientId), (0, drizzle_orm_1.eq)(schema_1.clientTeamAssignments.isActive, true)))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.clientTeamAssignments.assignedDate));
    }
    async getUserTeamAssignments(userId) {
        return await db_1.db
            .select()
            .from(schema_1.clientTeamAssignments)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.clientTeamAssignments.userId, userId), (0, drizzle_orm_1.eq)(schema_1.clientTeamAssignments.isActive, true)))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.clientTeamAssignments.assignedDate));
    }
    async createClientTeamAssignment(assignment) {
        const [newAssignment] = await db_1.db
            .insert(schema_1.clientTeamAssignments)
            .values(assignment)
            .returning();
        return newAssignment;
    }
    async updateClientTeamAssignment(id, assignment) {
        const [updatedAssignment] = await db_1.db
            .update(schema_1.clientTeamAssignments)
            .set(assignment)
            .where((0, drizzle_orm_1.eq)(schema_1.clientTeamAssignments.id, id))
            .returning();
        return updatedAssignment || undefined;
    }
    async deleteClientTeamAssignment(id) {
        const [updatedAssignment] = await db_1.db
            .update(schema_1.clientTeamAssignments)
            .set({ isActive: false })
            .where((0, drizzle_orm_1.eq)(schema_1.clientTeamAssignments.id, id))
            .returning();
        return !!updatedAssignment;
    }
    // Custom fields
    async getCustomFields(entityType) {
        return await db_1.db
            .select()
            .from(schema_1.customFields)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.customFields.entityType, entityType), (0, drizzle_orm_1.eq)(schema_1.customFields.isActive, true)))
            .orderBy(schema_1.customFields.fieldName);
    }
    async createCustomField(customField) {
        const [newCustomField] = await db_1.db
            .insert(schema_1.customFields)
            .values(customField)
            .returning();
        return newCustomField;
    }
    async updateCustomField(id, customField) {
        const [updatedCustomField] = await db_1.db
            .update(schema_1.customFields)
            .set(customField)
            .where((0, drizzle_orm_1.eq)(schema_1.customFields.id, id))
            .returning();
        return updatedCustomField || undefined;
    }
    async getCustomFieldValues(customFieldId, entityId) {
        const [value] = await db_1.db
            .select()
            .from(schema_1.customFieldValues)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.customFieldValues.customFieldId, customFieldId), (0, drizzle_orm_1.eq)(schema_1.customFieldValues.entityId, entityId)));
        return value || undefined;
    }
    async createOrUpdateCustomFieldValue(customFieldValue) {
        const existing = await this.getCustomFieldValues(customFieldValue.customFieldId, customFieldValue.entityId);
        if (existing) {
            const [updatedValue] = await db_1.db
                .update(schema_1.customFieldValues)
                .set({ ...customFieldValue, updatedAt: new Date() })
                .where((0, drizzle_orm_1.eq)(schema_1.customFieldValues.id, existing.id))
                .returning();
            return updatedValue;
        }
        else {
            const [newValue] = await db_1.db
                .insert(schema_1.customFieldValues)
                .values({ ...customFieldValue, updatedAt: new Date() })
                .returning();
            return newValue;
        }
    }
    // Document management
    async getDocuments(clientId, documentType) {
        const conditions = [(0, drizzle_orm_1.eq)(schema_1.documents.isActive, true)];
        if (clientId) {
            conditions.push((0, drizzle_orm_1.eq)(schema_1.documents.clientId, clientId));
        }
        if (documentType) {
            conditions.push((0, drizzle_orm_1.eq)(schema_1.documents.documentType, documentType));
        }
        return db_1.db
            .select()
            .from(schema_1.documents)
            .where((0, drizzle_orm_1.and)(...conditions))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.documents.createdAt));
    }
    async getDocument(id) {
        const [document] = await db_1.db
            .select()
            .from(schema_1.documents)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.documents.id, id), (0, drizzle_orm_1.eq)(schema_1.documents.isActive, true)));
        return document || undefined;
    }
    async createDocument(document) {
        const [newDocument] = await db_1.db
            .insert(schema_1.documents)
            .values({
            ...document,
            updatedAt: new Date()
        })
            .returning();
        return newDocument;
    }
    async updateDocument(id, document) {
        const [updatedDocument] = await db_1.db
            .update(schema_1.documents)
            .set({
            ...document,
            updatedAt: new Date()
        })
            .where((0, drizzle_orm_1.eq)(schema_1.documents.id, id))
            .returning();
        return updatedDocument || undefined;
    }
    async deleteDocument(id) {
        const [result] = await db_1.db
            .update(schema_1.documents)
            .set({ isActive: false })
            .where((0, drizzle_orm_1.eq)(schema_1.documents.id, id))
            .returning();
        return !!result;
    }
    async getDocumentVersions(documentId) {
        return db_1.db
            .select()
            .from(schema_1.documentVersions)
            .where((0, drizzle_orm_1.eq)(schema_1.documentVersions.documentId, documentId))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.documentVersions.version));
    }
    async createDocumentVersion(version) {
        const [newVersion] = await db_1.db
            .insert(schema_1.documentVersions)
            .values(version)
            .returning();
        return newVersion;
    }
    async getDocumentAccess(documentId) {
        return db_1.db
            .select()
            .from(schema_1.documentAccess)
            .where((0, drizzle_orm_1.eq)(schema_1.documentAccess.documentId, documentId));
    }
    async createDocumentAccess(access) {
        const [newAccess] = await db_1.db
            .insert(schema_1.documentAccess)
            .values(access)
            .returning();
        return newAccess;
    }
    async deleteDocumentAccess(id) {
        const result = await db_1.db
            .delete(schema_1.documentAccess)
            .where((0, drizzle_orm_1.eq)(schema_1.documentAccess.id, id));
        return (result.rowCount || 0) > 0;
    }
    // Service helper methods
    async getClientByName(name) {
        const result = await db_1.db.select().from(schema_1.clients).where((0, drizzle_orm_1.eq)(schema_1.clients.name, name)).limit(1);
        return result[0];
    }
    async getServiceByName(name) {
        const result = await db_1.db.select().from(schema_1.services).where((0, drizzle_orm_1.eq)(schema_1.services.name, name)).limit(1);
        return result[0];
    }
    async getContractByClientAndName(clientId, name) {
        const result = await db_1.db.select().from(schema_1.contracts)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.contracts.clientId, clientId), (0, drizzle_orm_1.eq)(schema_1.contracts.name, name)))
            .limit(1);
        return result[0];
    }
    async getServiceScopeByContractAndDescription(contractId, description) {
        const result = await db_1.db.select().from(schema_1.serviceScopes)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.serviceScopes.contractId, contractId), (0, drizzle_orm_1.like)(schema_1.serviceScopes.description, `%${description}%`)))
            .limit(1);
        return result[0];
    }
    async getSAFByNumber(safNumber) {
        const result = await db_1.db.select().from(schema_1.serviceAuthorizationForms)
            .where((0, drizzle_orm_1.eq)(schema_1.serviceAuthorizationForms.safNumber, safNumber))
            .limit(1);
        return result[0];
    }
    async getCOCByNumber(cocNumber) {
        const result = await db_1.db.select().from(schema_1.certificatesOfCompliance)
            .where((0, drizzle_orm_1.eq)(schema_1.certificatesOfCompliance.cocNumber, cocNumber))
            .limit(1);
        return result[0];
    }
    async createSAF(data) {
        const [saf] = await db_1.db.insert(schema_1.serviceAuthorizationForms).values({
            clientId: data.client_id,
            safNumber: data.saf_number,
            title: data.title,
            description: data.description,
            startDate: data.start_date,
            endDate: data.end_date,
            value: data.value,
            status: data.status,
            notes: data.notes
        }).returning();
        return saf;
    }
    async createCOC(data) {
        const [coc] = await db_1.db.insert(schema_1.certificatesOfCompliance).values({
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
    async createServiceBulk(data) {
        const [service] = await db_1.db.insert(schema_1.services).values({
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
    async createAuditLog(auditLog) {
        const [newAuditLog] = await db_1.db
            .insert(schema_1.auditLogs)
            .values(auditLog)
            .returning();
        return newAuditLog;
    }
    // Service scope fields (new table-based approach)
    async getServiceScopeFields(serviceId) {
        return await db_1.db
            .select()
            .from(schema_1.serviceScopeFields)
            .where((0, drizzle_orm_1.eq)(schema_1.serviceScopeFields.serviceId, serviceId))
            .orderBy(schema_1.serviceScopeFields.id);
    }
    async createServiceScopeField(field) {
        const [newField] = await db_1.db
            .insert(schema_1.serviceScopeFields)
            .values(field)
            .returning();
        return newField;
    }
    async updateServiceScopeField(fieldId, field) {
        const [updatedField] = await db_1.db
            .update(schema_1.serviceScopeFields)
            .set(field)
            .where((0, drizzle_orm_1.eq)(schema_1.serviceScopeFields.id, fieldId))
            .returning();
        return updatedField;
    }
    async deleteServiceScopeField(fieldId) {
        const [deletedField] = await db_1.db
            .delete(schema_1.serviceScopeFields)
            .where((0, drizzle_orm_1.eq)(schema_1.serviceScopeFields.id, fieldId))
            .returning();
        return !!deletedField;
    }
    // Service scopes
    async getServiceScopes() {
        return await db_1.db
            .select()
            .from(schema_1.serviceScopes)
            .orderBy(schema_1.serviceScopes.createdAt);
    }
    // User Dashboard Settings Management
    async getUserDashboardSettings(userId) {
        try {
            const settings = await db_1.db
                .select()
                .from(schema_1.userDashboardSettings)
                .where((0, drizzle_orm_1.eq)(schema_1.userDashboardSettings.userId, userId))
                .orderBy((0, drizzle_orm_1.asc)(schema_1.userDashboardSettings.position));
            return settings;
        }
        catch (error) {
            console.error('Error fetching user dashboard settings:', error);
            throw error;
        }
    }
    async saveUserDashboardSettings(userId, cards) {
        try {
            await db_1.db.transaction(async (tx) => {
                // Delete existing settings
                await tx
                    .delete(schema_1.userDashboardSettings)
                    .where((0, drizzle_orm_1.eq)(schema_1.userDashboardSettings.userId, userId));
                // Insert new settings
                if (cards.length > 0) {
                    const insertData = cards.map((card, index) => ({
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
                    await tx.insert(schema_1.userDashboardSettings).values(insertData);
                }
            });
        }
        catch (error) {
            console.error('Error saving user dashboard settings:', error);
            throw error;
        }
    }
    async updateUserDashboardCard(userId, cardId, updates) {
        try {
            const updateData = {
                ...updates,
                updatedAt: new Date(),
            };
            // Remove fields that shouldn't be updated via this method
            delete updateData.id;
            delete updateData.userId;
            delete updateData.cardId;
            delete updateData.createdAt;
            await db_1.db
                .update(schema_1.userDashboardSettings)
                .set(updateData)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.userDashboardSettings.userId, userId), (0, drizzle_orm_1.eq)(schema_1.userDashboardSettings.cardId, cardId)));
        }
        catch (error) {
            console.error('Error updating dashboard card:', error);
            throw error;
        }
    }
    async removeUserDashboardCard(userId, cardId) {
        try {
            const result = await db_1.db
                .delete(schema_1.userDashboardSettings)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.userDashboardSettings.userId, userId), (0, drizzle_orm_1.eq)(schema_1.userDashboardSettings.cardId, cardId)))
                .returning();
            if (result.length === 0) {
                throw new Error(`Dashboard card '${cardId}' not found or not removable`);
            }
        }
        catch (error) {
            console.error('Error removing dashboard card:', error);
            throw error;
        }
    }
    async resetUserDashboardSettings(userId) {
        try {
            // Delete all existing settings
            await db_1.db
                .delete(schema_1.userDashboardSettings)
                .where((0, drizzle_orm_1.eq)(schema_1.userDashboardSettings.userId, userId));
            // Create default settings
            await this.createDefaultDashboardSettings(userId);
        }
        catch (error) {
            console.error('Error resetting dashboard settings:', error);
            throw error;
        }
    }
    async createDefaultDashboardSettings(userId) {
        const defaultCards = [
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
            await db_1.db.insert(schema_1.userDashboardSettings).values(defaultCards);
        }
        catch (error) {
            console.error('Error creating default dashboard settings:', error);
            throw error;
        }
    }
    // Field visibility
    async getFieldVisibilityConfigs() {
        try {
            const result = await db_1.db.execute((0, drizzle_orm_1.sql) `
        SELECT table_name, field_name, is_visible, context, created_at, updated_at
        FROM field_visibility_config
        ORDER BY table_name, field_name, context
      `);
            return result.rows;
        }
        catch (error) {
            console.error('Error fetching field visibility configs:', error);
            return [];
        }
    }
    async getFieldVisibilityForTable(tableName, context = 'form') {
        try {
            const result = await db_1.db.execute((0, drizzle_orm_1.sql) `
        SELECT field_name, is_visible
        FROM field_visibility_config
        WHERE table_name = ${tableName} AND context = ${context}
      `);
            const config = {};
            result.rows.forEach((row) => {
                config[row.field_name] = row.is_visible;
            });
            return config;
        }
        catch (error) {
            console.error(`Error fetching field visibility for table ${tableName}:`, error);
            return {};
        }
    }
    async setFieldVisibility(tableName, fieldName, isVisible, context = 'form') {
        try {
            const result = await db_1.db.execute((0, drizzle_orm_1.sql) `
        INSERT INTO field_visibility_config (table_name, field_name, is_visible, context, created_at, updated_at)
        VALUES (${tableName}, ${fieldName}, ${isVisible}, ${context}, NOW(), NOW())
        ON CONFLICT (table_name, field_name, context)
        DO UPDATE SET
          is_visible = ${isVisible},
          updated_at = NOW()
        RETURNING *
      `);
            return result.rows[0];
        }
        catch (error) {
            console.error('Error setting field visibility:', error);
            throw error;
        }
    }
    async resetFieldVisibility(tableName, fieldName, context = 'form') {
        try {
            await db_1.db.execute((0, drizzle_orm_1.sql) `
        DELETE FROM field_visibility_config
        WHERE table_name = ${tableName} AND field_name = ${fieldName} AND context = ${context}
      `);
        }
        catch (error) {
            console.error('Error resetting field visibility:', error);
            throw error;
        }
    }
    async isFieldVisible(tableName, fieldName, context = 'form') {
        try {
            const result = await db_1.db.execute((0, drizzle_orm_1.sql) `
        SELECT is_visible
        FROM field_visibility_config
        WHERE table_name = ${tableName} AND field_name = ${fieldName} AND context = ${context}
      `);
            // If no configuration exists, default to visible
            return result.rows.length > 0 ? result.rows[0].is_visible : true;
        }
        catch (error) {
            console.error('Error checking field visibility:', error);
            return true; // Default to visible on error
        }
    }
    // Custom widgets management
    async getUserCustomWidgets(userId, placement) {
        try {
            const conditions = [(0, drizzle_orm_1.eq)(schema_1.customWidgets.userId, userId), (0, drizzle_orm_1.eq)(schema_1.customWidgets.isActive, true)];
            if (placement) {
                conditions.push((0, drizzle_orm_1.eq)(schema_1.customWidgets.placement, placement));
            }
            return await db_1.db
                .select()
                .from(schema_1.customWidgets)
                .where((0, drizzle_orm_1.and)(...conditions))
                .orderBy(schema_1.customWidgets.createdAt);
        }
        catch (error) {
            console.error('Error fetching user custom widgets:', error);
            return [];
        }
    }
    async createCustomWidget(widget) {
        const [newWidget] = await db_1.db
            .insert(schema_1.customWidgets)
            .values({ ...widget, updatedAt: new Date() })
            .returning();
        return newWidget;
    }
    async updateCustomWidget(id, widget) {
        const [updatedWidget] = await db_1.db
            .update(schema_1.customWidgets)
            .set({ ...widget, updatedAt: new Date() })
            .where((0, drizzle_orm_1.eq)(schema_1.customWidgets.id, id))
            .returning();
        return updatedWidget || undefined;
    }
    async deleteCustomWidget(id, userId) {
        // Soft delete by setting isActive to false, but also verify ownership
        const [deletedWidget] = await db_1.db
            .update(schema_1.customWidgets)
            .set({ isActive: false, updatedAt: new Date() })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.customWidgets.id, id), (0, drizzle_orm_1.eq)(schema_1.customWidgets.userId, userId)))
            .returning();
        return !!deletedWidget;
    }
    // User preferences management
    async getUserPreference(userId, preferenceType, preferenceKey) {
        try {
            const conditions = [
                (0, drizzle_orm_1.eq)(schema_1.userPreferences.userId, userId),
                (0, drizzle_orm_1.eq)(schema_1.userPreferences.preferenceType, preferenceType)
            ];
            if (preferenceKey) {
                conditions.push((0, drizzle_orm_1.eq)(schema_1.userPreferences.preferenceKey, preferenceKey));
            }
            return await db_1.db
                .select()
                .from(schema_1.userPreferences)
                .where((0, drizzle_orm_1.and)(...conditions))
                .orderBy(schema_1.userPreferences.preferenceKey);
        }
        catch (error) {
            console.error('Error fetching user preferences:', error);
            return [];
        }
    }
    async setUserPreference(userId, preferenceType, preferenceKey, preferenceValue) {
        try {
            // Use INSERT ... ON CONFLICT to handle upsert
            const [preference] = await db_1.db
                .insert(schema_1.userPreferences)
                .values({
                userId,
                preferenceType,
                preferenceKey,
                preferenceValue: preferenceValue,
                updatedAt: new Date()
            })
                .onConflictDoUpdate({
                target: [schema_1.userPreferences.userId, schema_1.userPreferences.preferenceType, schema_1.userPreferences.preferenceKey],
                set: {
                    preferenceValue: preferenceValue,
                    updatedAt: new Date()
                }
            })
                .returning();
            return preference;
        }
        catch (error) {
            console.error('Error setting user preference:', error);
            throw error;
        }
    }
    async deleteUserPreference(userId, preferenceType, preferenceKey) {
        try {
            const conditions = [
                (0, drizzle_orm_1.eq)(schema_1.userPreferences.userId, userId),
                (0, drizzle_orm_1.eq)(schema_1.userPreferences.preferenceType, preferenceType)
            ];
            if (preferenceKey) {
                conditions.push((0, drizzle_orm_1.eq)(schema_1.userPreferences.preferenceKey, preferenceKey));
            }
            const result = await db_1.db
                .delete(schema_1.userPreferences)
                .where((0, drizzle_orm_1.and)(...conditions));
            return (result.rowCount || 0) > 0;
        }
        catch (error) {
            console.error('Error deleting user preference:', error);
            return false;
        }
    }
}
exports.DatabaseStorage = DatabaseStorage;
exports.storage = new DatabaseStorage();
// Export individual functions for LDAP integration
const getUserByLdapId = (ldapId) => exports.storage.getUserByLdapId(ldapId);
exports.getUserByLdapId = getUserByLdapId;
const getUserByEmail = (email) => exports.storage.getUserByEmail(email);
exports.getUserByEmail = getUserByEmail;
const createUser = (user) => exports.storage.createUser(user);
exports.createUser = createUser;
const findOrCreateLdapUser = async (ldapUser) => {
    // This function will be implemented in the LDAP strategy
    throw new Error("findOrCreateLdapUser should be called from LDAP strategy");
};
exports.findOrCreateLdapUser = findOrCreateLdapUser;
