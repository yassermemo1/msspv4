import { registerPlugin, QueryPlugin } from './plugin-manager';

const systems = [
  'jira',
  'qradar',
  'splunk',
  'elastic',
  'grafana',
  'fortigate',
  'paloalto',
  'carbonblack',
  'sysdig',
  'vmware',
  'veeam',
  'confluence'
];

for (const name of systems) {
  const plugin: QueryPlugin = {
    systemName: name,
    async executeQuery() {
      throw new Error(`${name} plugin not implemented yet`);
    }
  };
  registerPlugin(plugin);
} 