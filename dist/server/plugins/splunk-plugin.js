"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const plugin_manager_1 = require("./plugin-manager");
// Plugin Configuration - Self-Contained
const splunkConfig = {
    instances: [
        {
            id: 'splunk-main',
            name: 'Main Splunk Enterprise',
            baseUrl: process.env.SPLUNK_URL || 'https://splunk.company.com:8089',
            authType: 'basic',
            authConfig: {
                username: process.env.SPLUNK_USERNAME || 'admin',
                password: process.env.SPLUNK_PASSWORD || 'changeme'
            },
            isActive: false, // Disabled by default
            tags: ['siem', 'logs', 'analytics']
        }
    ],
    defaultRefreshInterval: 30,
    rateLimiting: {
        requestsPerMinute: 30,
        burstSize: 5
    }
};
const splunkPlugin = {
    systemName: 'splunk',
    config: splunkConfig,
    async executeQuery(query, _method, instanceId) {
        const instance = this.getInstance(instanceId);
        if (!instance) {
            throw new Error(`Splunk instance '${instanceId}' not found`);
        }
        if (!instance.isActive) {
            throw new Error(`Splunk instance '${instanceId}' is not active`);
        }
        // Placeholder - would need actual Splunk REST API implementation
        return { message: 'Splunk plugin not fully implemented', query, instanceId };
    },
    getInstances() {
        return this.config.instances;
    },
    getInstance(instanceId) {
        return this.config.instances.find(instance => instance.id === instanceId);
    },
    defaultQueries: [
        { id: 'recentEvents', method: 'GET', path: 'search index=main earliest=-1h', description: 'Recent events from last hour' },
        { id: 'errorCount', method: 'GET', path: 'search index=main error | stats count', description: 'Count of error events' }
    ]
};
(0, plugin_manager_1.registerPlugin)(splunkPlugin);
