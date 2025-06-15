# External Systems to Plugins Migration Guide

## Overview

The MSSP platform is migrating from the legacy External Systems architecture to a modern Plugin-based architecture. This guide outlines the migration process and current status.

## Current Status

### ✅ Completed
- [x] Plugin architecture implemented with 6+ active plugins
- [x] Plugin testing and query management system
- [x] Plugin routes and API endpoints
- [x] Removed external systems pages from navigation
- [x] Removed unused external system components

### 🔄 In Progress
- [ ] Migrate Integration Engine to use plugins
- [ ] Update Dashboard Widgets to use plugin data sources
- [ ] Migrate Client External Mappings to plugin system
- [ ] Update Plugins Page to be fully independent

### ⚠️ Dependencies Still Using External Systems

#### Client Components
1. **plugins-page.tsx** - Lines 173, 291
   - Still fetches from `/api/external-systems`
   - Needs to use plugin manager instead

2. **enhanced-dashboard-customizer.tsx** - Lines 200-203
   - Uses external systems for widget configuration
   - Needs plugin-based widget system

3. **enhanced-integration-engine.tsx** - Lines 91-93
   - Core integration functionality
   - Needs complete plugin migration

4. **custom-query-widget.tsx** - Lines 110, 136, 173
   - External system queries
   - Needs plugin query system

#### Server Dependencies
1. **Integration Engine Widgets** - `externalWidgetTemplates` table
2. **Client Mappings** - `clientExternalMappings` table
3. **Dashboard Data Sources** - External system references

## Migration Steps

### Phase 1: Plugin System Enhancement
```bash
# Ensure all plugins are properly registered
npm run dev
# Check console for plugin registration messages
```

### Phase 2: Update Plugins Page
```typescript
// Replace external systems API calls with plugin manager calls
// File: client/src/pages/plugins-page.tsx
const { data: plugins = [] } = useQuery({
  queryKey: ["plugins"],
  queryFn: async () => {
    const res = await fetch("/api/plugins", { credentials: "include" });
    return res.json();
  },
});
```

### Phase 3: Migrate Integration Engine
```typescript
// Update integration engine to use plugin data
// File: client/src/pages/enhanced-integration-engine.tsx
const { data: pluginData = [] } = useQuery({
  queryKey: ['plugin-data'],
  queryFn: async () => {
    const res = await fetch('/api/plugins/instances');
    return res.json();
  },
});
```

### Phase 4: Update Dashboard Widgets
```typescript
// Migrate dashboard widgets to use plugin data sources
// File: client/src/components/dashboard/enhanced-dashboard-customizer.tsx
const { data: pluginSources = [] } = useQuery({
  queryKey: ['plugin-sources'],
  queryFn: async () => {
    const res = await fetch('/api/plugins');
    return res.json();
  },
});
```

### Phase 5: Database Migration
```sql
-- Create migration script to move data from external systems to plugins
-- This should be done carefully with proper backup

-- 1. Export existing external system configurations
-- 2. Map to equivalent plugin configurations  
-- 3. Migrate client mappings to plugin-based system
-- 4. Update widget templates to use plugin data sources
```

## Plugin Architecture Benefits

### ✅ Advantages Over External Systems
1. **Self-Contained**: Each plugin manages its own instances and configuration
2. **Type Safety**: Full TypeScript support with proper interfaces
3. **Testing**: Built-in connection testing and query validation
4. **Flexibility**: Plugin-specific query methods and data transformations
5. **Performance**: Better caching and connection pooling
6. **Maintainability**: Cleaner separation of concerns

### 🔌 Available Plugins
- **FortiGate** - 2 instances, 10 default queries
- **Jira** - 1 instance, 3 default queries  
- **Splunk** - 1 instance, advanced SPL support
- **Elasticsearch** - 1 instance, full-text search
- **QRadar** - 1 instance, security analytics
- **Grafana** - 1 instance, metrics and dashboards

## API Endpoints Comparison

### Legacy External Systems
```
GET /api/external-systems
POST /api/external-systems/:id/test-connection
POST /api/external-systems/query
```

### New Plugin System
```
GET /api/plugins
GET /api/plugins/instances
POST /api/plugins/plugins/:plugin/instances/:id/test-connection
POST /api/plugins/plugins/:plugin/instances/:id/query
GET /api/plugins/plugins/:plugin/queries
```

## Testing the Migration

### 1. Verify Plugin System
```bash
curl http://localhost:3000/api/plugins
curl http://localhost:3000/api/plugins/instances
```

### 2. Test Plugin Functionality
```bash
# Test FortiGate connection
curl -X POST http://localhost:3000/api/plugins/plugins/fortigate/instances/1/test-connection

# Execute default query
curl -X POST http://localhost:3000/api/plugins/plugins/fortigate/instances/1/query \
  -H "Content-Type: application/json" \
  -d '{"query": "system_status", "method": "GET"}'
```

### 3. Verify Data Migration
- Check that all external system data has equivalent plugin representation
- Ensure client mappings are preserved in plugin format
- Validate that dashboard widgets work with plugin data sources

## Rollback Plan

If issues arise during migration:

1. **Keep External System Tables**: Don't drop tables until migration is complete
2. **Feature Flags**: Use environment variables to toggle between systems
3. **Gradual Migration**: Migrate one component at a time
4. **Data Backup**: Full database backup before starting migration

## Timeline

- **Week 1**: Complete plugins page migration
- **Week 2**: Migrate integration engine
- **Week 3**: Update dashboard widgets
- **Week 4**: Database cleanup and final testing

## Support

For migration issues:
1. Check plugin registration in server console
2. Verify API endpoints are responding
3. Test individual plugin connections
4. Review migration logs for errors

---

**Note**: This migration should be done incrementally to avoid breaking existing functionality. The plugin system is fully operational and ready to replace external systems. 