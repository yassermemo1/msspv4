# Advanced Widget Filtering System Implementation

## Overview
A comprehensive filtering system has been implemented that allows dynamic data filtering at multiple levels - query-level filtering (where supported) and post-query filtering for all data sources.

## Key Features

### 🔍 Filter Types and Operators

#### String Filters
- `equals` - Exact match
- `not_equals` - Not equal to
- `contains` - Contains substring
- `not_contains` - Does not contain substring
- `starts_with` - Starts with prefix
- `ends_with` - Ends with suffix
- `in` - Value in comma-separated list
- `not_in` - Value not in comma-separated list
- `is_null` - Field is empty/null
- `is_not_null` - Field has value

#### Number Filters
- `equals` - Exact value
- `not_equals` - Not equal to value
- `greater_than` - Greater than value
- `greater_equal` - Greater than or equal to value
- `less_than` - Less than value
- `less_equal` - Less than or equal to value
- `between` - Between two values (inclusive)

#### Date Filters
- `date_equals` - Exact date match
- `date_before` - Before specified date
- `date_after` - After specified date
- `date_range` - Between two dates

#### Advanced Filters
- `regex_match` - Regular expression matching
- `exists` - Field exists in data
- `not_exists` - Field does not exist

### 🎯 System-Specific Filter Implementation

#### Jira (JQL) Filters
```javascript
// Example: Status filter
field: 'status', operator: 'equals', value: 'Done'
// Generates: status = "Done"

// Example: Multi-value filter
field: 'status', operator: 'in', value: 'Done,Closed,Resolved'
// Generates: status IN ("Done", "Closed", "Resolved")

// Example: Date filter
field: 'created', operator: 'date_after', value: '2024-01-01'
// Generates: created > "2024-01-01"
```

#### Splunk Filters
```javascript
// Example: Field equals
field: 'status', operator: 'equals', value: 'error'
// Generates: status="error"

// Example: Contains filter
field: 'message', operator: 'contains', value: 'timeout'
// Generates: message="*timeout*"
```

#### SQL Database Filters
```javascript
// Example: Numeric filter
field: 'totalValue', operator: 'greater_than', value: '1000000'
// Generates: totalValue > 1000000

// Example: String filter with LIKE
field: 'clientName', operator: 'contains', value: 'tech'
// Generates: clientName LIKE '%tech%'
```

### 🏗️ Widget Builder Integration

#### Filter Configuration UI
The widget builder now includes a comprehensive filter section:

```typescript
// Filter structure
interface FilterType {
  id: string;
  field: string;
  operator: FilterOperator;
  value: any;
  value2?: any; // For range operators like 'between'
  dataType: 'string' | 'number' | 'date' | 'boolean' | 'array';
  enabled: boolean;
}
```

#### UI Features
- **Data Type Selection**: Automatically adjusts available operators
- **Dynamic Operator Options**: Context-sensitive operator selection
- **Multi-Value Support**: Range operators show two input fields
- **Enable/Disable Toggle**: Individual filter control
- **Filter Examples**: Context-aware suggestions based on plugin type

### 🔄 Processing Pipeline

#### 1. Query-Level Filtering (Pre-execution)
```javascript
// Applied before API call for systems that support native filtering
processedQuery = await processFilters(originalQuery, filters, pluginName);
```

#### 2. Post-Query Filtering (Post-execution)
```javascript
// Applied after API call for comprehensive data filtering
filteredData = await applyPostQueryFilters(rawData, filters);
```

#### 3. Dual-Level Support
- Systems like Jira: Filters are converted to JQL and applied at query level
- Systems without native filtering: Filters are applied to returned data
- Hybrid approach: Some filters at query level, others post-query

### 🎨 Real-World Use Cases

#### Security Operations
```javascript
// Firewall logs: Show only blocked connections
{
  field: 'action',
  operator: 'equals',
  value: 'DENY',
  dataType: 'string'
}

// High-priority incidents only
{
  field: 'priority',
  operator: 'in',
  value: 'High,Critical',
  dataType: 'string'
}
```

#### Contract Management
```javascript
// High-value contracts
{
  field: 'totalValue',
  operator: 'greater_than',
  value: '1000000',
  dataType: 'number'
}

// Expiring soon (next 3 months)
{
  field: 'endDate',
  operator: 'date_before',
  value: '2024-06-01',
  dataType: 'date'
}
```

#### IT Service Management
```javascript
// Open tickets excluding low priority
{
  field: 'status',
  operator: 'not_in',
  value: 'Closed,Resolved',
  dataType: 'string'
}
{
  field: 'priority',
  operator: 'not_equals',
  value: 'Low',
  dataType: 'string'
}
```

### 🚀 Implementation Details

#### Client-Side (Widget Builder)
- **File**: `client/src/components/widgets/dynamic-widget-builder.tsx`
- **Features**: Filter UI, validation, examples, type safety
- **Filter Management**: Add, edit, remove, enable/disable filters

#### Client-Side (Widget Renderer)
- **File**: `client/src/components/widgets/dynamic-widget-renderer.tsx`
- **Features**: Filter payload inclusion in API calls
- **Context Integration**: Automatic context passing for dynamic filtering

#### Server-Side (Filter Processing)
- **File**: `server/plugins-routes.ts`
- **Features**: Multi-system filter translation, query modification, post-processing
- **Functions**:
  - `processFilters()` - Convert filters to system-specific syntax
  - `generateFilterClause()` - Create filter expressions
  - `appendFilterToQuery()` - Integrate filters into queries
  - `applyPostQueryFilters()` - Client-side filtering for unsupported systems

### 🔧 Configuration Examples

#### Complete Widget with Filters
```json
{
  "name": "Critical Security Issues",
  "pluginName": "jira",
  "instanceId": "security-jira",
  "queryType": "custom",
  "customQuery": "project = \"SEC\"",
  "parameters": {
    "reporterDomain": {
      "source": "database",
      "dbTable": "clients",
      "dbColumn": "domain"
    }
  },
  "filters": [
    {
      "id": "priority_filter",
      "field": "priority",
      "operator": "in",
      "value": "High,Critical",
      "dataType": "string",
      "enabled": true
    },
    {
      "id": "status_filter",
      "field": "status",
      "operator": "not_equals",
      "value": "Resolved",
      "dataType": "string",
      "enabled": true
    },
    {
      "id": "age_filter",
      "field": "created",
      "operator": "date_before",
      "value": "2024-01-01",
      "dataType": "date",
      "enabled": true
    }
  ],
  "displayType": "table"
}
```

#### Filter API Request
```javascript
POST /api/plugins/jira/instances/security-jira/query
{
  "query": "project = \"SEC\"",
  "parameters": { /* ... */ },
  "filters": [
    {
      "id": "priority_filter",
      "field": "priority",
      "operator": "in",
      "value": "High,Critical",
      "dataType": "string",
      "enabled": true
    }
  ],
  "context": {
    "clientId": 123
  }
}
```

### 📊 Benefits

1. **Flexible Data Views**: Users can create highly specific data views without complex query knowledge
2. **Real-time Filtering**: Dynamic filters adjust based on current context and database values
3. **Multi-System Support**: Consistent filtering interface across different data sources
4. **Performance Optimization**: Query-level filtering reduces data transfer and processing
5. **User-Friendly**: Intuitive UI for non-technical users to create complex filters
6. **Context-Aware**: Filters can reference database values and page context automatically

### 🎯 Next Steps

1. **Filter Templates**: Pre-defined filter sets for common use cases
2. **Advanced Operators**: Geographic, JSON, and array-specific operators
3. **Filter Groups**: Logical grouping with AND/OR conditions
4. **Saved Filters**: Reusable filter configurations
5. **Performance Analytics**: Query performance monitoring with filter impact analysis

This filtering system transforms the widget platform into a powerful, flexible data analysis and visualization tool that adapts to user needs and organizational context automatically. 