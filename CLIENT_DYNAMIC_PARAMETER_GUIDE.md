# Client Widget Dynamic Parameter System Guide

## Overview
The MSSP portal now features an advanced dynamic parameter system that allows widgets to automatically adapt their queries based on the current page context, particularly for client-specific data filtering. This system enables widgets to show different data depending on which client page you're viewing, without requiring manual configuration.

## How It Works

### 1. Context Extraction
When a widget is rendered on a client page, the system automatically extracts context from:
- **URL Parameters**: Client ID from `/clients/:id` routes
- **Component Props**: Client data passed from parent components
- **Page State**: Current user, session, and navigation context

### 2. Parameter Resolution
The server resolves parameters based on three sources:

#### 🔧 Static Parameters
Fixed values defined in widget configuration:
```json
{
  "source": "static",
  "value": "Critical,High"
}
```

#### 📍 Context Parameters  
Dynamic values from current page context:
```json
{
  "source": "context",
  "contextVar": "clientShortName"
}
```

#### 🗄️ Database Parameters
Values fetched from database tables:
```json
{
  "source": "database", 
  "dbTable": "clients",
  "dbColumn": "domain"
}
```

### 3. Query Processing
- Query templates use placeholder syntax: `${parameterName}`
- Server-side resolution replaces placeholders with actual values
- Final query is executed against the plugin API (Jira, etc.)

## Available Context Variables

### Client Context (from `/clients/:id` pages)
- `clientId`: Database ID of the current client
- `clientShortName`: Client's short identifier (e.g., "ACME")
- `clientName`: Full client name
- `clientDomain`: Client's domain name (if available)

### Contract Context (from `/contracts/:id` pages)
- `contractId`: Database ID of the current contract
- `clientId`: Associated client ID

### User Context (always available)
- `userId`: Current logged-in user ID
- `userRole`: User's role (admin, user, etc.)

## Example Widget Configurations

### 1. Simple Context-Based Widget
Shows issues filtered by client short name:
```json
{
  "name": "Client Issues (Dynamic)",
  "query": "project in (\"DEP\", \"MD\") AND labels ~ ${clientShortName}",
  "parameters": {
    "clientShortName": {
      "source": "context",
      "contextVar": "clientShortName"
    }
  }
}
```

### 2. Database-Linked Widget
Fetches client domain from database and filters by reporter domain:
```json
{
  "name": "Issues by Client Domain", 
  "query": "project in (\"DEP\", \"MD\") AND \"Reporter Domain\" ~ ${clientDomain}",
  "parameters": {
    "clientDomain": {
      "source": "database",
      "dbTable": "clients", 
      "dbColumn": "domain"
    }
  }
}
```

### 3. Multi-Parameter Widget
Combines multiple parameter types:
```json
{
  "name": "Client Security Overview",
  "query": "project in (\"DEP\", \"MD\") AND labels ~ ${clientPrefix} AND created >= ${timeRange} AND \"Reporter Domain\" ~ ${clientDomain}",
  "parameters": {
    "clientPrefix": {
      "source": "context",
      "contextVar": "clientShortName"
    },
    "timeRange": {
      "source": "static",
      "value": "-30d"
    },
    "clientDomain": {
      "source": "database",
      "dbTable": "clients",
      "dbColumn": "domain"
    }
  }
}
```

## Widget Implementation Details

### Client Component Integration
The `GlobalClientWidgets` component automatically:
1. Extracts client context from props (`clientId`, `clientShortName`, `clientDomain`)
2. Passes context to `DynamicWidgetRenderer`
3. Handles widget refresh and error states

### Dynamic Widget Renderer Enhancement
The `DynamicWidgetRenderer` component:
1. Extracts additional context from URL
2. Combines URL context with component props
3. Sends complete context to server for parameter resolution
4. Handles authentication and error states

### Server-Side Processing
The plugin system (`server/plugins-routes.ts`):
1. Receives widget queries with parameter configurations
2. Resolves each parameter based on its source type
3. Substitutes placeholders in query templates
4. Executes final query against plugin APIs
5. Returns results with metadata about parameter resolution

## Current Widget Examples

The system includes 5 example widgets demonstrating different parameter types:

1. **Client Issues (Dynamic)** (ID: 20)
   - Context parameter: clientShortName
   - Shows issues labeled with client's short name

2. **Issues by Client Domain** (ID: 21)
   - Database parameter: client domain from database
   - Filters issues by reporter domain

3. **Client Security Overview** (ID: 22)
   - Multi-parameter: context + static + database
   - Comprehensive security view with time filters

4. **High Priority Client Issues** (ID: 23)
   - Mixed parameters: dynamic client + static priority
   - Shows critical/high priority issues for current client

5. **Recent Client Activity** (ID: 24)
   - Time-based: recent activity for current client
   - Shows activity in last 7 days

## Usage Instructions

### For End Users
1. Navigate to any client detail page (e.g., `/clients/1`)
2. Widgets automatically adapt to show data for that specific client
3. No manual configuration required
4. Widgets refresh automatically at configured intervals

### For Administrators
1. Use Widget Builder to create widgets with parameter configurations
2. Choose parameter source types based on data requirements
3. Test widgets on different client pages to verify behavior
4. Monitor widget performance and adjust refresh intervals

### For Developers
1. Client context is automatically extracted from URL patterns
2. Additional context can be passed via component props
3. Server handles all parameter resolution for security
4. Widget renderer handles authentication and error states

## Security Considerations

### Server-Side Resolution
- All parameter resolution happens server-side
- No sensitive data exposed to client-side
- Database queries are secure and validated

### Authentication
- Widget requests include session authentication
- Plugin API calls are authenticated automatically
- Proper error handling for authentication failures

### Access Control
- Widgets respect user permissions
- Client data filtered based on user access rights
- Plugin APIs enforce their own security models

## Troubleshooting

### Common Issues

#### Widget Shows No Data
1. Check if client has associated data in the filtered system
2. Verify parameter resolution in browser dev tools
3. Check widget query syntax and parameter names

#### Authentication Errors
1. Ensure user is logged in
2. Check session timeout settings
3. Verify widget permissions

#### Parameter Resolution Failures
1. Check parameter configuration syntax
2. Verify database column names for database parameters
3. Ensure context variables are available on current page

### Debug Information
The system provides detailed logging:
- Parameter resolution results in server logs
- Query transformation details in API responses
- Client-side context extraction in browser console

## Best Practices

### Widget Design
1. Use descriptive parameter names
2. Provide fallback values for optional parameters
3. Test widgets across different client pages
4. Use appropriate refresh intervals

### Performance
1. Avoid complex database parameter queries
2. Use static parameters for frequently used values
3. Consider caching for expensive operations
4. Monitor widget loading times

### Maintenance
1. Document custom parameter configurations
2. Test widgets after system updates
3. Monitor error rates and performance metrics
4. Keep widget descriptions up to date

## Future Enhancements

### Planned Features
1. **Advanced Context Variables**: User preferences, team assignments
2. **Parameter Validation**: Input validation and type checking
3. **Conditional Parameters**: Parameters based on other parameter values
4. **Parameter Templates**: Reusable parameter configurations

### Enhancement Opportunities
1. **Real-time Updates**: Live parameter changes without page refresh
2. **Parameter Dependencies**: Complex parameter relationships
3. **Custom Context Providers**: Plugin-specific context extraction
4. **Parameter Caching**: Improved performance for database parameters

---

**Note**: This dynamic parameter system is fully functional and ready for production use. All widgets automatically adapt to client context without requiring manual configuration. The system provides secure, server-side parameter resolution with comprehensive error handling and debugging capabilities. 