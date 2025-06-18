"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const plugin_manager_1 = require("./plugin-manager");
const plugin_utils_1 = require("./plugin-utils");
const node_fetch_1 = __importDefault(require("node-fetch"));
// Plugin Configuration - Self-Contained
const jiraConfig = {
    instances: [
        {
            id: 'jira-main',
            name: 'Main Jira Instance',
            baseUrl: process.env.JIRA_URL || 'https://your-company.atlassian.net',
            authType: 'basic',
            authConfig: {
                username: process.env.JIRA_USERNAME || 'your-email@company.com',
                password: process.env.JIRA_API_TOKEN || 'your-api-token'
            },
            isActive: true,
            tags: ['tickets', 'project-management'],
            sslConfig: {
                rejectUnauthorized: true,
                allowSelfSigned: false,
                timeout: 30000
            }
        }
    ],
    defaultRefreshInterval: 60,
    rateLimiting: {
        requestsPerMinute: 100,
        burstSize: 20
    }
};
const jiraPlugin = {
    systemName: 'jira',
    config: jiraConfig,
    async executeQuery(query, method, instanceId) {
        const instance = this.getInstance(instanceId);
        if (!instance) {
            throw new Error(`Jira instance '${instanceId}' not found`);
        }
        if (!instance.isActive) {
            throw new Error(`Jira instance '${instanceId}' is not active`);
        }
        const base = instance.baseUrl.replace(/\/$/, '');
        // Handle special health check query
        if (query === '__health_check__') {
            const url = `${base}/rest/api/2/serverInfo`;
            const headers = (0, plugin_utils_1.buildBasicHeaders)(instance);
            const fetchOptions = (0, plugin_utils_1.buildFetchOptions)(instance, headers);
            console.log(`🏥 Jira Health Check: ${url}`);
            const res = await (0, node_fetch_1.default)(url, fetchOptions);
            if (!res.ok) {
                const errorText = await res.text();
                console.error(`❌ Jira Health Check Failed ${res.status}: ${errorText}`);
                throw new Error(`Jira Health Check Failed ${res.status}: ${res.statusText}`);
            }
            const serverInfo = await res.json();
            console.log(`✅ Jira Health Check Success: ${serverInfo.serverTitle || 'Jira Server'}`);
            return {
                status: 'healthy',
                serverInfo: {
                    version: serverInfo.version,
                    title: serverInfo.serverTitle,
                    baseUrl: serverInfo.baseUrl
                },
                timestamp: new Date().toISOString()
            };
        }
        // Regular JQL query
        const url = `${base}/rest/api/2/search?jql=${encodeURIComponent(query)}`;
        const headers = (0, plugin_utils_1.buildBasicHeaders)(instance);
        const fetchOptions = (0, plugin_utils_1.buildFetchOptions)(instance, headers);
        console.log(`🔍 Jira API Request: ${url}`);
        const res = await (0, node_fetch_1.default)(url, fetchOptions);
        if (!res.ok) {
            const errorText = await res.text();
            console.error(`❌ Jira API Error ${res.status}: ${errorText}`);
            throw new Error(`Jira API ${res.status}: ${res.statusText} - ${errorText}`);
        }
        const data = await res.json();
        return data;
    },
    getInstances() {
        return this.config.instances;
    },
    getInstance(instanceId) {
        return this.config.instances.find(instance => instance.id === instanceId);
    },
    defaultQueries: [
        { id: 'healthCheck', method: 'GET', path: '__health_check__', description: 'Server health check' },
        { id: 'recentIssues', method: 'GET', path: 'created >= -1w ORDER BY created DESC', description: 'Issues created in the last week' },
        { id: 'openBugs', method: 'GET', path: 'type = Bug AND resolution = Unresolved', description: 'Open bug tickets' },
        { id: 'myIssues', method: 'GET', path: 'assignee = currentUser() AND resolution = Unresolved', description: 'My open issues' },
        { id: 'recentlyUpdated', method: 'GET', path: 'updated >= -3d ORDER BY updated DESC', description: 'Recently updated issues' }
    ]
};
(0, plugin_manager_1.registerPlugin)(jiraPlugin);
