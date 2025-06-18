"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLdapStrategy = createLdapStrategy;
const passport_ldapauth_1 = require("passport-ldapauth");
const storage_1 = require("../storage");
const db_1 = require("../db");
const schema_1 = require("@shared/schema");
// Create LDAP configuration from environment variables (fallback to database)
async function createLdapConfig() {
    try {
        // First try environment variables
        if (process.env.LDAP_ENABLED === 'true' && process.env.LDAP_URL && process.env.LDAP_SEARCH_BASE) {
            console.log("Using LDAP configuration from environment variables");
            const config = {
                server: {
                    url: process.env.LDAP_URL,
                    searchBase: process.env.LDAP_SEARCH_BASE,
                    searchFilter: process.env.LDAP_SEARCH_FILTER || "(uid={{username}})",
                    searchAttributes: [
                        process.env.LDAP_USERNAME_FIELD || 'uid',
                        process.env.LDAP_EMAIL_FIELD || 'mail',
                        process.env.LDAP_FIRST_NAME_FIELD || 'givenName',
                        process.env.LDAP_LAST_NAME_FIELD || 'sn',
                        'cn', 'dn'
                    ],
                    timeout: 10000,
                    connectTimeout: 5000,
                    tlsOptions: {
                        rejectUnauthorized: false
                    }
                }
            };
            // Add bind credentials if provided
            if (process.env.LDAP_BIND_DN) {
                config.server.bindDN = process.env.LDAP_BIND_DN;
                if (process.env.LDAP_BIND_PASSWORD) {
                    config.server.bindCredentials = process.env.LDAP_BIND_PASSWORD;
                }
            }
            console.log("=== LDAP STRATEGY CONFIGURATION ===");
            console.log("LDAP URL:", config.server.url);
            console.log("Search Base:", config.server.searchBase);
            console.log("Search Filter:", config.server.searchFilter);
            console.log("Search Attributes:", config.server.searchAttributes);
            console.log("===================================");
            return config;
        }
        // Fallback to database configuration
        const settings = await db_1.db.select().from(schema_1.companySettings).limit(1);
        if (settings.length === 0 || !settings[0].ldapEnabled) {
            console.log("LDAP is not enabled in company settings");
            return null;
        }
        const ldapSettings = settings[0];
        if (!ldapSettings.ldapUrl || !ldapSettings.ldapSearchBase) {
            console.log("LDAP URL or Search Base not configured");
            return null;
        }
        console.log("=== LDAP STRATEGY CONFIGURATION ===");
        console.log("LDAP URL:", ldapSettings.ldapUrl);
        console.log("Search Base:", ldapSettings.ldapSearchBase);
        console.log("Search Filter:", ldapSettings.ldapSearchFilter);
        console.log("Search Attributes:", [
            ldapSettings.ldapUsernameAttribute || 'uid',
            ldapSettings.ldapEmailAttribute || 'mail',
            ldapSettings.ldapFirstNameAttribute || 'givenName',
            ldapSettings.ldapLastNameAttribute || 'sn',
            'cn', 'dn'
        ]);
        console.log("===================================");
        const config = {
            server: {
                url: ldapSettings.ldapUrl,
                searchBase: ldapSettings.ldapSearchBase,
                searchFilter: ldapSettings.ldapSearchFilter || "(uid={{username}})",
                searchAttributes: [
                    ldapSettings.ldapUsernameAttribute || 'uid',
                    ldapSettings.ldapEmailAttribute || 'mail',
                    ldapSettings.ldapFirstNameAttribute || 'givenName',
                    ldapSettings.ldapLastNameAttribute || 'sn',
                    'cn', 'dn'
                ],
                timeout: ldapSettings.ldapSearchTimeout || 10000,
                connectTimeout: ldapSettings.ldapConnectionTimeout || 5000,
                tlsOptions: {
                    rejectUnauthorized: ldapSettings.ldapCertificateVerification !== false
                }
            }
        };
        // Add bind credentials if provided
        if (ldapSettings.ldapBindDn) {
            config.server.bindDN = ldapSettings.ldapBindDn;
            if (ldapSettings.ldapBindPassword) {
                config.server.bindCredentials = ldapSettings.ldapBindPassword;
            }
        }
        return config;
    }
    catch (error) {
        console.error("Error creating LDAP config:", error);
        return null;
    }
}
// Find or create LDAP user in local database
async function findOrCreateLdapUser(ldapUser) {
    try {
        // Get field mappings from environment variables or database
        let usernameAttr, emailAttr, firstNameAttr, lastNameAttr, defaultRole;
        if (process.env.LDAP_ENABLED === 'true') {
            // Use environment variables
            usernameAttr = process.env.LDAP_USERNAME_FIELD || 'uid';
            emailAttr = process.env.LDAP_EMAIL_FIELD || 'mail';
            firstNameAttr = process.env.LDAP_FIRST_NAME_FIELD || 'givenName';
            lastNameAttr = process.env.LDAP_LAST_NAME_FIELD || 'sn';
            defaultRole = process.env.LDAP_DEFAULT_ROLE || 'user';
        }
        else {
            // Fallback to database settings
            const settings = await db_1.db.select().from(schema_1.companySettings).limit(1);
            const ldapSettings = settings[0];
            usernameAttr = ldapSettings?.ldapUsernameAttribute || 'uid';
            emailAttr = ldapSettings?.ldapEmailAttribute || 'mail';
            firstNameAttr = ldapSettings?.ldapFirstNameAttribute || 'givenName';
            lastNameAttr = ldapSettings?.ldapLastNameAttribute || 'sn';
            defaultRole = ldapSettings?.ldapDefaultRole || 'user';
        }
        console.log("=== LDAP USER PROVISIONING ===");
        console.log("LDAP User Profile:", JSON.stringify(ldapUser, null, 2));
        const username = ldapUser[usernameAttr] || ldapUser.uid;
        const email = ldapUser[emailAttr] || ldapUser.mail;
        const firstName = ldapUser[firstNameAttr] || ldapUser.givenName || '';
        const lastName = ldapUser[lastNameAttr] || ldapUser.sn || '';
        const ldapId = ldapUser.dn;
        console.log("Mapped fields:", { username, email, firstName, lastName, ldapId, defaultRole });
        if (!username || !email) {
            throw new Error(`Missing required LDAP attributes: username (${usernameAttr}) or email (${emailAttr})`);
        }
        // Check if user already exists by LDAP ID
        console.log("Checking for existing user by LDAP ID:", ldapId);
        let existingUser = await (0, storage_1.getUserByLdapId)(ldapId);
        if (existingUser) {
            console.log("Found existing LDAP user:", existingUser.email);
            // Remove password from response for security
            const { password, ...userWithoutPassword } = existingUser;
            console.log("===============================");
            return userWithoutPassword;
        }
        // Check if user exists by email (potential conflict)
        console.log("Checking for existing user by email:", email);
        const existingEmailUser = await (0, storage_1.getUserByEmail)(email);
        if (existingEmailUser && existingEmailUser.authProvider === 'local') {
            throw new Error(`A local user with email ${email} already exists. Cannot create LDAP user with the same email.`);
        }
        // Create new LDAP user
        console.log("Creating new LDAP user");
        const newUser = await (0, storage_1.createUser)({
            username,
            email,
            firstName: firstName,
            lastName: lastName,
            role: defaultRole,
            authProvider: 'ldap',
            ldapId,
            password: null, // LDAP users don't have local passwords
            isActive: true
        });
        console.log("Created new LDAP user:", newUser.email);
        // Remove password from response for security
        const { password, ...userWithoutPassword } = newUser;
        console.log("===============================");
        return userWithoutPassword;
    }
    catch (error) {
        console.error("Error in findOrCreateLdapUser:", error);
        throw error;
    }
}
// Create and configure the LDAP strategy
async function createLdapStrategy() {
    try {
        const ldapConfig = await createLdapConfig();
        if (!ldapConfig) {
            console.log("LDAP strategy not created - configuration not available or disabled");
            return null;
        }
        return new passport_ldapauth_1.Strategy(ldapConfig, async (ldapUser, done) => {
            try {
                console.log("=== LDAP AUTHENTICATION ===");
                console.log("LDAP user authenticated:", ldapUser.dn);
                const user = await findOrCreateLdapUser(ldapUser);
                console.log("User provisioned successfully:", user.email);
                console.log("==========================");
                return done(null, user);
            }
            catch (error) {
                console.error("LDAP user provisioning failed:", error);
                return done(error, null);
            }
        });
    }
    catch (error) {
        console.error("Error creating LDAP strategy:", error);
        return null;
    }
}
