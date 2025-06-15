import { registerPlugin, QueryPlugin, PluginInstance, PluginConfig } from './plugin-manager';

const systems = [
  // Implemented in Phase 2 (real plugins)
  // 'jira', 'qradar', 'splunk', 'elastic', 'grafana',
  'fortigate',
  'paloalto',
  'carbonblack',
  'sysdig',
  'vmware',
  'veeam',
  'confluence'
];

for (const name of systems) {
  const config: PluginConfig = {
    instances: [
      {
        id: `${name}-stub`,
        name: `${name} Stub Instance`,
        baseUrl: `https://${name}.company.com`,
        authType: 'none',
        isActive: false,
        tags: ['stub', 'not-implemented']
      }
    ],
    defaultRefreshInterval: 60
  };

  const plugin: QueryPlugin = {
    systemName: name,
    config,
    async executeQuery() {
      throw new Error(`${name} plugin not implemented yet`);
    },
    getInstances(): PluginInstance[] {
      return this.config.instances;
    },
    getInstance(instanceId: string): PluginInstance | undefined {
      return this.config.instances.find(instance => instance.id === instanceId);
    }
  };
  
  registerPlugin(plugin);
} 