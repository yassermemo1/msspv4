"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const plugin_manager_1 = require("./plugin-manager");
// Plugin Configuration - Self-Contained
const elasticConfig = {
    instances: [
        {
            id: 'elastic-main',
            name: 'Main Elasticsearch Cluster',
            baseUrl: process.env.ELASTICSEARCH_URL || 'https://elasticsearch.company.com:9200',
            authType: 'basic',
            authConfig: {
                username: process.env.ELASTICSEARCH_USERNAME || 'elastic',
                password: process.env.ELASTICSEARCH_PASSWORD || 'changeme'
            },
            isActive: false, // Disabled by default
            tags: ['search', 'logs', 'analytics']
        }
    ],
    defaultRefreshInterval: 30,
    rateLimiting: {
        requestsPerMinute: 60,
        burstSize: 10
    }
};
const elasticPlugin = {
    systemName: 'elasticsearch',
    config: elasticConfig,
    async executeQuery(query, _method, instanceId) {
        const instance = this.getInstance(instanceId);
        if (!instance) {
            throw new Error(`Elasticsearch instance '${instanceId}' not found`);
        }
        if (!instance.isActive) {
            throw new Error(`Elasticsearch instance '${instanceId}' is not active`);
        }
        // Placeholder - would need actual Elasticsearch API implementation
        return { message: 'Elasticsearch plugin not fully implemented', query, instanceId };
    },
    getInstances() {
        return this.config.instances;
    },
    getInstance(instanceId) {
        return this.config.instances.find(instance => instance.id === instanceId);
    },
    defaultQueries: [
        { id: 'clusterHealth', method: 'GET', path: '_cluster/health', description: 'Cluster health status' },
        { id: 'indexStats', method: 'GET', path: '_stats', description: 'Index statistics' },
        { id: 'recentLogs', method: 'GET', path: 'logs-*/_search?size=100', description: 'Recent log entries' }
    ]
};
(0, plugin_manager_1.registerPlugin)(elasticPlugin);
