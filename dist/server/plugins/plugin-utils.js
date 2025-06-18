"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildHttpsAgent = buildHttpsAgent;
exports.buildFetchOptions = buildFetchOptions;
exports.buildBasicHeaders = buildBasicHeaders;
const https_1 = __importDefault(require("https"));
function buildHttpsAgent(instance) {
    const sslConfig = instance.sslConfig || {};
    if (sslConfig.rejectUnauthorized === false || sslConfig.allowSelfSigned === true) {
        return new https_1.default.Agent({
            rejectUnauthorized: false
        });
    }
    return undefined;
}
function buildFetchOptions(instance, headers) {
    const options = { headers };
    // Configure SSL/TLS options
    const agent = buildHttpsAgent(instance);
    if (agent) {
        options.agent = agent;
    }
    // Set timeout if specified
    const sslConfig = instance.sslConfig || {};
    if (sslConfig.timeout) {
        options.timeout = sslConfig.timeout;
    }
    else {
        options.timeout = 30000; // Default 30 second timeout
    }
    return options;
}
function buildBasicHeaders(instance, additionalHeaders) {
    const headers = { 'Accept': 'application/json', ...additionalHeaders };
    const cfg = instance.authConfig || {};
    if (instance.authType === 'basic' && cfg.username && cfg.password) {
        headers['Authorization'] = 'Basic ' + Buffer.from(`${cfg.username}:${cfg.password}`).toString('base64');
    }
    else if (instance.authType === 'bearer' && cfg.token) {
        headers['Authorization'] = `Bearer ${cfg.token}`;
    }
    else if (instance.authType === 'api_key' && cfg.key) {
        const headerName = cfg.header || 'Authorization';
        headers[headerName] = cfg.key;
    }
    return headers;
}
