"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fortigateDefaultQueries = void 0;
const plugin_manager_1 = require("./plugin-manager");
const plugin_utils_1 = require("./plugin-utils");
const node_fetch_1 = __importDefault(require("node-fetch"));
function buildUrl(base, path) {
    if (path.startsWith('http'))
        return path;
    return `${base.replace(/\/$/, '')}${path.startsWith('/') ? '' : '/'}${path}`;
}
exports.fortigateDefaultQueries = [
    { id: 'systemStatus', method: 'GET', path: '/api/v2/monitor/system/status', description: 'System status and version' },
    { id: 'listPolicies', method: 'GET', path: '/api/v2/monitor/firewall/policy', description: 'Firewall policies' },
    { id: 'listAddresses', method: 'GET', path: '/api/v2/monitor/firewall/address', description: 'Address objects' },
    { id: 'listInterfaces', method: 'GET', path: '/api/v2/cmdb/system/interface', description: 'Network interfaces' },
    { id: 'ipsecStatus', method: 'GET', path: '/api/v2/monitor/system/vpn/ipsec', description: 'IPsec VPN status' },
    { id: 'haStatus', method: 'GET', path: '/api/v2/monitor/system/ha/status', description: 'High Availability status' },
    { id: 'routeTable', method: 'GET', path: '/api/v2/monitor/router/ipv4', description: 'Routing table (IPv4)' },
    { id: 'sessionCount', method: 'GET', path: '/api/v2/monitor/firewall/session', description: 'Current session count' },
    { id: 'topSessions', method: 'GET', path: '/api/v2/monitor/firewall/top/sessions', description: 'Top bandwidth sessions' },
    { id: 'licenseInfo', method: 'GET', path: '/api/v2/monitor/system/license/status', description: 'License information' },
];
// Plugin Configuration - Self-Contained
const fortigateConfig = {
    instances: [
        {
            id: 'fortigate-prod',
            name: 'Production FortiGate',
            baseUrl: process.env.FORTIGATE_PROD_URL || 'https://192.168.1.1',
            authType: 'api_key',
            authConfig: {
                key: process.env.FORTIGATE_PROD_KEY || 'your-api-key-here',
                header: 'Authorization'
            },
            isActive: true,
            tags: ['production', 'firewall'],
            sslConfig: {
                rejectUnauthorized: true,
                allowSelfSigned: false,
                timeout: 30000
            }
        },
        {
            id: 'fortigate-test',
            name: 'Test FortiGate',
            baseUrl: process.env.FORTIGATE_TEST_URL || 'https://192.168.1.10',
            authType: 'api_key',
            authConfig: {
                key: process.env.FORTIGATE_TEST_KEY || 'your-test-api-key-here',
                header: 'Authorization'
            },
            isActive: true,
            tags: ['test', 'firewall'],
            sslConfig: {
                rejectUnauthorized: true,
                allowSelfSigned: false,
                timeout: 30000
            }
        }
    ],
    defaultRefreshInterval: 30,
    rateLimiting: {
        requestsPerMinute: 60,
        burstSize: 10
    }
};
// ---------------------------------------------------------
const fortigatePlugin = {
    systemName: 'fortigate',
    config: fortigateConfig,
    async executeQuery(query, method = 'GET', instanceId, opts) {
        const instance = this.getInstance(instanceId);
        if (!instance) {
            throw new Error(`FortiGate instance '${instanceId}' not found`);
        }
        if (!instance.isActive) {
            throw new Error(`FortiGate instance '${instanceId}' is not active`);
        }
        const url = buildUrl(instance.baseUrl, query);
        const headers = (0, plugin_utils_1.buildBasicHeaders)(instance, { 'Content-Type': 'application/json' });
        const fetchOptions = (0, plugin_utils_1.buildFetchOptions)(instance, headers);
        // Add method and body to fetch options
        fetchOptions.method = method.toUpperCase();
        if (opts?.body) {
            fetchOptions.body = JSON.stringify(opts.body);
        }
        const res = await (0, node_fetch_1.default)(url, fetchOptions);
        const contentType = res.headers.get('content-type') || '';
        const data = contentType.includes('application/json') ? await res.json() : await res.text();
        if (!res.ok) {
            throw new Error(`FortiGate API ${res.status}: ${typeof data === 'string' ? data.slice(0, 200) : JSON.stringify(data).slice(0, 200)}`);
        }
        return data;
    },
    getInstances() {
        return this.config.instances;
    },
    getInstance(instanceId) {
        return this.config.instances.find(instance => instance.id === instanceId);
    },
    defaultQueries: exports.fortigateDefaultQueries
};
(0, plugin_manager_1.registerPlugin)(fortigatePlugin);
