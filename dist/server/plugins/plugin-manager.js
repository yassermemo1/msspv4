"use strict";
// Plugin registry for external query connectors - Self-Contained Architecture
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.savePluginConfig = savePluginConfig;
exports.registerPlugin = registerPlugin;
exports.getPlugin = getPlugin;
exports.listPlugins = listPlugins;
exports.getAllInstances = getAllInstances;
exports.updatePluginConfig = updatePluginConfig;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const registry = new Map();
const CONFIG_DIR = path_1.default.join(process.cwd(), 'server', 'plugins', 'configs');
// Ensure configuration directory exists
function ensureConfigDir() {
    if (!fs_1.default.existsSync(CONFIG_DIR)) {
        fs_1.default.mkdirSync(CONFIG_DIR, { recursive: true });
        console.log(`📁 Created plugin config directory: ${CONFIG_DIR}`);
    }
}
// Load plugin configuration from file
function loadPluginConfig(pluginName) {
    try {
        const configPath = path_1.default.join(CONFIG_DIR, `${pluginName}.json`);
        if (fs_1.default.existsSync(configPath)) {
            const configData = fs_1.default.readFileSync(configPath, 'utf8');
            const config = JSON.parse(configData);
            console.log(`📋 Loaded config for plugin: ${pluginName}`);
            return config;
        }
    }
    catch (error) {
        console.warn(`⚠️ Failed to load config for plugin ${pluginName}:`, error);
    }
    return null;
}
// Save plugin configuration to file
function savePluginConfig(pluginName, config) {
    try {
        ensureConfigDir();
        const configPath = path_1.default.join(CONFIG_DIR, `${pluginName}.json`);
        const configData = JSON.stringify(config, null, 2);
        fs_1.default.writeFileSync(configPath, configData, 'utf8');
        console.log(`💾 Saved config for plugin: ${pluginName}`);
    }
    catch (error) {
        console.error(`❌ Failed to save config for plugin ${pluginName}:`, error);
        throw error;
    }
}
function registerPlugin(plugin) {
    // Ensure plugin has proper config structure
    if (!plugin.config) {
        plugin.config = { instances: [] };
    }
    if (!plugin.config.instances) {
        plugin.config.instances = [];
    }
    // Try to load saved configuration
    const savedConfig = loadPluginConfig(plugin.systemName);
    if (savedConfig) {
        // Merge saved config with default config, preserving saved instances
        plugin.config = {
            ...plugin.config,
            ...savedConfig,
            instances: savedConfig.instances || []
        };
    }
    registry.set(plugin.systemName.toLowerCase(), plugin);
    const instanceCount = plugin.config.instances.length;
    console.log(`🔌 Registered plugin: ${plugin.systemName} with ${instanceCount} instances`);
}
function getPlugin(systemName) {
    return registry.get(systemName.toLowerCase());
}
function listPlugins() {
    return Array.from(registry.values());
}
function getAllInstances() {
    const allInstances = [];
    for (const plugin of registry.values()) {
        const instances = plugin.config?.instances || [];
        for (const instance of instances) {
            allInstances.push({
                pluginName: plugin.systemName,
                instance
            });
        }
    }
    return allInstances;
}
// Update plugin configuration and persist to file
function updatePluginConfig(pluginName, config) {
    const plugin = getPlugin(pluginName);
    if (!plugin) {
        throw new Error(`Plugin '${pluginName}' not found`);
    }
    // Update in-memory configuration
    plugin.config = config;
    // Persist to file
    savePluginConfig(pluginName, config);
}
