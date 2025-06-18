"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const plugin_manager_1 = require("./plugin-manager");
// Plugin Configuration - Self-Contained
const grafanaConfig = {
    instances: [
        {
            id: 'grafana-main',
            name: 'Main Grafana Instance',
            baseUrl: process.env.GRAFANA_URL || 'https://grafana.company.com',
            authType: 'bearer',
            authConfig: {
                token: process.env.GRAFANA_TOKEN || 'your-service-account-token'
            },
            isActive: false, // Disabled by default
            tags: ['monitoring', 'dashboards', 'metrics']
        }
    ],
    defaultRefreshInterval: 30,
    rateLimiting: {
        requestsPerMinute: 60,
        burstSize: 10
    }
};
const grafanaPlugin = {
    systemName: 'grafana',
    config: grafanaConfig,
    async executeQuery(query, _method, instanceId) {
        const instance = this.getInstance(instanceId);
        if (!instance) {
            throw new Error(`Grafana instance '${instanceId}' not found`);
        }
        if (!instance.isActive) {
            throw new Error(`Grafana instance '${instanceId}' is not active`);
        }
        // Placeholder - would need actual Grafana API implementation
        return { message: 'Grafana plugin not fully implemented', query, instanceId };
    },
    getInstances() {
        return this.config.instances;
    },
    getInstance(instanceId) {
        return this.config.instances.find(instance => instance.id === instanceId);
    },
    defaultQueries: [
        { id: 'dashboards', method: 'GET', path: '/api/search?type=dash-db', description: 'List all dashboards' },
        { id: 'datasources', method: 'GET', path: '/api/datasources', description: 'List all data sources' },
        { id: 'health', method: 'GET', path: '/api/health', description: 'Health check' }
    ]
};
(0, plugin_manager_1.registerPlugin)(grafanaPlugin);
