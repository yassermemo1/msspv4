# Plugin System API Documentation

## Overview

The MSSP Client Manager has migrated from the legacy external systems architecture to a modern plugin-based system. This document provides comprehensive API documentation for the new plugin architecture.

## Migration from External Systems

### Deprecated Endpoints

All external system endpoints have been deprecated and return HTTP 410 (Gone) with migration guidance:

- `GET /api/external-systems` → `GET /api/plugins`
- `POST /api/external-systems` → Plugin configuration files
- `PUT /api/external-systems/:id` → Plugin configuration files
- `DELETE /api/external-systems/:id` → Plugin configuration files
- `POST /api/external-systems/:id/test-connection` → `POST /api/integration-engine-widgets/:pluginName/:instanceId/test`
- `POST /api/external-systems/query` → `POST /api/integration-engine-widgets/:pluginName/:instanceId/execute-query`

### Migration Benefits

- **Better Performance**: Built-in caching and optimized query execution
- **Improved Reliability**: Connection pooling and error handling
- **Enhanced Security**: Instance-level authentication and rate limiting
- **Easier Management**: Configuration files instead of database entries
- **Better Scalability**: Plugin-specific optimizations and resource management

## Core Plugin API

### Get All Plugins

```http
GET /api/plugins
```

**Response:**
```json
{
  "plugins": [
    {
      "systemName": "fortigate",
      "instanceCount": 2,
      "defaultQueries": 10,
      "refreshInterval": 30,
      "rateLimiting": {
        "requestsPerMinute": 60,
        "burstSize": 10
      }
    }
  ]
}
```

### Get Plugin Details

```http
GET /api/plugins/:pluginName
```

**Response:**
```json
{
  "systemName": "fortigate",
  "instances": [
    {
      "id": "primary",
      "name": "FortiGate Primary",
      "baseUrl": "https://fortigate.example.com",
      "isActive": true,
      "tags": ["firewall", "security"]
    }
  ],
  "defaultQueries": [
    {
      "id": "system_status",
      "description": "Get system status",
      "method": "GET",
      "path": "/api/v2/monitor/system/status"
    }
  ]
}
```

## Integration Engine Widget API

### Test Plugin Connection

```http
GET /api/integration-engine-widgets/:pluginName/:instanceId/test
```

**Parameters:**
- `pluginName`: Plugin identifier (e.g., "fortigate", "jira")
- `instanceId`: Instance identifier (e.g., "primary", "secondary")

**Response:**
```json
{
  "success": true,
  "message": "Connection successful",
  "responseTime": 245
}
```

### Get Available Widgets

```http
GET /api/integration-engine-widgets/:pluginName/:instanceId/widgets
```

**Response:**
```json
{
  "pluginName": "fortigate",
  "instanceId": "primary",
  "instanceName": "FortiGate Primary",
  "widgets": [
    {
      "id": "system_status",
      "name": "Get system status",
      "description": "Widget for Get system status",
      "type": "data",
      "component": "generic-data-widget",
      "config": {
        "query": "system_status",
        "method": "GET",
        "path": "/api/v2/monitor/system/status"
      },
      "dataSource": "fortigate",
      "apiEndpoint": "/api/v2/monitor/system/status",
      "metadata": {
        "author": "Plugin System",
        "version": "1.0.0",
        "category": "fortigate",
        "tags": ["fortigate", "auto-generated"]
      }
    }
  ],
  "count": 1,
  "timestamp": "2024-06-15T10:30:00.000Z"
}
```

### Get Widget Data

```http
GET /api/integration-engine-widgets/:pluginName/:instanceId/widgets/:widgetId/data
```

**Query Parameters:**
- Any query parameters are passed to the underlying plugin query

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "OK",
    "version": "7.0.0",
    "serial": "FGT60F1234567890"
  },
  "widget": "Get system status",
  "timestamp": "2024-06-15T10:30:00.000Z",
  "metadata": {
    "pluginName": "fortigate",
    "instanceId": "primary",
    "queryId": "system_status"
  },
  "cached": false
}
```

### Execute Custom Query

```http
POST /api/integration-engine-widgets/:pluginName/:instanceId/execute-query
```

**Request Body:**
```json
{
  "queryId": "custom_query",
  "method": "GET",
  "parameters": {
    "filter": "status=active"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": [...],
  "executionTime": 150,
  "timestamp": "2024-06-15T10:30:00.000Z"
}
```

### Render Widget HTML

```http
POST /api/integration-engine-widgets/:pluginName/:instanceId/widgets/:widgetId/render
```

**Request Body:**
```json
{
  "config": {
    "theme": "dark",
    "showHeader": true
  }
}
```

**Response:**
```json
{
  "html": "<div class=\"integration-engine-widget\">...</div>",
  "widget": "Get system status",
  "timestamp": "2024-06-15T10:30:00.000Z"
}
```

## Cache Management API

### Get Cache Statistics

```http
GET /api/integration-engine-widgets/cache/stats
```

**Response:**
```json
{
  "cache": {
    "queryCache": {
      "size": 45,
      "max": 1000
    },
    "connectionCache": {
      "size": 12,
      "max": 100
    },
    "metadataCache": {
      "size": 6,
      "max": 50
    }
  },
  "timestamp": "2024-06-15T10:30:00.000Z"
}
```

### Clear Plugin Instance Cache

```http
DELETE /api/integration-engine-widgets/:pluginName/:instanceId/cache
```

**Response:**
```json
{
  "message": "Cache cleared for plugin fortigate:primary",
  "timestamp": "2024-06-15T10:30:00.000Z"
}
```

### Clear Plugin Cache

```http
DELETE /api/integration-engine-widgets/:pluginName/cache
```

**Response:**
```json
{
  "message": "Cache cleared for plugin fortigate",
  "timestamp": "2024-06-15T10:30:00.000Z"
}
```

### Clear All Caches

```http
DELETE /api/integration-engine-widgets/cache/all
```

**Response:**
```json
{
  "message": "All plugin caches cleared",
  "timestamp": "2024-06-15T10:30:00.000Z"
}
```

### Warm Up Cache

```http
POST /api/integration-engine-widgets/:pluginName/:instanceId/cache/warmup
```

**Response:**
```json
{
  "message": "Cache warmed up for plugin fortigate:primary",
  "timestamp": "2024-06-15T10:30:00.000Z"
}
```

## Plugin Configuration

### Configuration File Structure

Plugins are configured using JSON files in the `server/plugins/` directory:

```json
{
  "systemName": "fortigate",
  "config": {
    "instances": [
      {
        "id": "primary",
        "name": "FortiGate Primary",
        "baseUrl": "https://fortigate.example.com",
        "authType": "api_key",
        "authConfig": {
          "key": "your-api-key"
        },
        "isActive": true,
        "tags": ["firewall", "security"]
      }
    ]
  }
}
```

### Supported Authentication Types

- `none`: No authentication
- `basic`: Basic authentication (username/password)
- `bearer`: Bearer token authentication
- `api_key`: API key authentication

### Default Queries

Each plugin defines default queries that can be executed:

```javascript
export const defaultQueries = [
  {
    id: 'system_status',
    description: 'Get system status',
    method: 'GET',
    path: '/api/v2/monitor/system/status'
  }
];
```

## Rate Limiting

Each plugin instance has configurable rate limiting:

- `requestsPerMinute`: Maximum requests per minute
- `burstSize`: Maximum burst requests
- `windowMs`: Time window for rate limiting

## Caching Strategy

### Cache Types

1. **Query Cache**: Stores query results (TTL: 5 minutes)
2. **Connection Cache**: Stores connection status (TTL: 2 minutes)
3. **Metadata Cache**: Stores plugin metadata (TTL: 10 minutes)

### Cache Keys

- Query: `query:pluginName:instanceId:queryId:paramHash`
- Connection: `connection:pluginName:instanceId`
- Metadata: `metadata:pluginName`

### Cache Invalidation

- Automatic TTL expiration
- Manual invalidation via API
- Plugin restart invalidation

## Error Handling

### Standard Error Response

```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "timestamp": "2024-06-15T10:30:00.000Z"
}
```

### Common Error Codes

- `PLUGIN_NOT_FOUND`: Plugin does not exist
- `INSTANCE_NOT_FOUND`: Plugin instance does not exist
- `CONNECTION_FAILED`: Connection to external system failed
- `QUERY_FAILED`: Query execution failed
- `CACHE_ERROR`: Cache operation failed

## Performance Optimizations

### Connection Pooling

- Reuse HTTP connections
- Configurable pool size per plugin
- Automatic connection cleanup

### Query Optimization

- Result caching with TTL
- Query parameter optimization
- Batch query support

### Resource Management

- Memory usage monitoring
- CPU usage optimization
- Network bandwidth management

## Security Features

### Authentication

- Instance-level authentication
- Secure credential storage
- Token refresh handling

### Authorization

- Role-based access control
- Plugin-specific permissions
- Audit logging

### Data Protection

- Encrypted credential storage
- Secure communication (HTTPS)
- Data sanitization

## Monitoring and Logging

### Metrics

- Query execution time
- Cache hit/miss ratios
- Error rates
- Connection status

### Logging

- Query execution logs
- Error logs with stack traces
- Performance metrics
- Security audit logs

## Migration Guide

### Step 1: Identify External Systems

List all external systems currently in use:

```sql
SELECT id, system_name, display_name, base_url FROM external_systems;
```

### Step 2: Create Plugin Configurations

For each external system, create a corresponding plugin configuration file.

### Step 3: Update Client Code

Replace external system API calls with plugin API calls:

```javascript
// Old
const response = await fetch('/api/external-systems/1/test-connection');

// New
const response = await fetch('/api/integration-engine-widgets/fortigate/primary/test');
```

### Step 4: Test and Validate

- Test all plugin connections
- Validate query results
- Check performance metrics
- Verify caching behavior

### Step 5: Clean Up

- Remove external system database entries
- Update documentation
- Remove deprecated code

## Best Practices

### Plugin Development

1. Use descriptive plugin and instance names
2. Implement proper error handling
3. Add comprehensive logging
4. Follow security best practices
5. Document all queries and parameters

### Performance

1. Use caching appropriately
2. Implement rate limiting
3. Monitor resource usage
4. Optimize query parameters
5. Use connection pooling

### Security

1. Store credentials securely
2. Use HTTPS for all connections
3. Implement proper authentication
4. Log security events
5. Regular security audits

## Support and Troubleshooting

### Common Issues

1. **Plugin Not Found**: Check plugin configuration file exists
2. **Connection Failed**: Verify credentials and network connectivity
3. **Cache Issues**: Clear cache and restart if needed
4. **Performance Issues**: Check rate limiting and cache configuration

### Debug Mode

Enable debug logging by setting environment variable:

```bash
DEBUG=plugin:* npm run dev
```

### Health Checks

Monitor plugin health using the test endpoints:

```bash
curl http://localhost:3000/api/integration-engine-widgets/fortigate/primary/test
``` 