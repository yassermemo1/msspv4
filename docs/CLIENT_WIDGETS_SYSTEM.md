# Client Widgets System

## Overview

The Client Widgets System provides a comprehensive solution for creating, managing, and displaying custom plugin-based widgets on client detail pages. This system allows users to dynamically create widgets that can query any available plugin (Jira, Fortigate, Splunk, etc.) and display client-specific data with automatic variable injection.

## Key Features

### 🎛️ **Toggle Enable/Disable Functionality**
- Each widget can be individually enabled or disabled
- Disabled widgets are hidden from the client detail page but preserved in configuration
- Visual indicators show widget status (enabled/disabled)
- Bulk enable/disable operations available

### 🔗 **Client Variable Integration**
- Automatic injection of client context variables into queries
- Available variables: `clientShortName`, `clientName`, `clientDomain`
- Variables are automatically passed to both default and custom queries
- Real-time preview with actual client data during widget creation

### 📊 **Multiple Display Types**
- **Table**: Tabular data display with automatic column detection
- **Chart**: Bar, Line, Pie, and Area charts with automatic data formatting
- **Metric**: Single value display with formatting options
- **List**: Bulleted list format for array data
- **Gauge**: Progress/percentage display with color coding

### 🔌 **Plugin Integration**
- Works with all registered plugins (Jira, Fortigate, Splunk, Elasticsearch, QRadar, Grafana)
- Support for both default plugin queries and custom queries
- Instance selection for multi-instance plugins
- Query parameter configuration with client context

## System Components

### 1. ClientWidgetsManager
**Location**: `client/src/components/widgets/client-widgets-manager.tsx`

The main management interface for client widgets with the following features:

#### Features:
- **Search & Filter**: Search by name, description, or plugin; filter by plugin type and status
- **Grid/List View**: Toggle between grid and list display modes
- **Widget Cards**: Each widget shows:
  - Enable/disable toggle with visual status indicators
  - Plugin badge with color coding
  - Display type and refresh interval
  - Live preview (for enabled widgets)
  - Action buttons (view, edit, duplicate, delete)
  - Creation and update timestamps

#### Client Context Display:
```typescript
// Shows available client variables
clientShortName = "ABC123"
clientName = "Acme Corporation"
clientDomain = "acme.com"
```

### 2. DynamicWidgetBuilder
**Location**: `client/src/components/widgets/dynamic-widget-builder.tsx`

Enhanced widget creation interface with client context support:

#### New Features:
- **Client Context Alert**: Shows available variables during widget creation
- **Variable Integration**: Automatically injects client variables into test queries
- **Real-time Testing**: Test queries with actual client data
- **Placement Awareness**: Automatically sets placement to 'client-details'

#### Client Context Integration:
```typescript
interface ClientContext {
  clientShortName: string;
  clientName: string;
  clientDomain?: string;
}
```

### 3. DynamicWidgetRenderer
**Location**: `client/src/components/widgets/dynamic-widget-renderer.tsx`

Updated to support enabled/disabled state and enhanced client variable passing:

#### Enhancements:
- **Enabled State**: Only renders if widget is enabled
- **Client Variables**: Automatically passes client context to queries
- **Error Handling**: Better error display for disabled or misconfigured widgets

### 4. ClientCustomWidgets (Updated)
**Location**: `client/src/pages/client-detail-page.tsx` (component within file)

Updated to only display enabled widgets:

```typescript
// Filter widgets for client-details placement and only show enabled widgets
const clientWidgets = allWidgets.filter((widget: any) => 
  widget.placement === 'client-details' && widget.enabled !== false
);
```

## Usage Guide

### Creating a Client Widget

1. **Navigate to Client Details Page**
   - Go to any client's detail page
   - Scroll to the "Custom Widgets" section

2. **Open Widget Manager**
   - Click "Manage Widgets" button
   - This opens the comprehensive ClientWidgetsManager

3. **Create New Widget**
   - Click "Create Widget" button
   - Fill in the 4-tab configuration:

#### Tab 1: Basic Info
- **Widget Name**: Descriptive name (e.g., "Client Security Alerts")
- **Description**: What the widget displays
- **Plugin**: Select from available plugins (Jira, Fortigate, etc.)
- **Instance**: Choose specific plugin instance
- **Refresh Interval**: How often to update data (10-3600 seconds)

#### Tab 2: Query Config
- **Client Context Alert**: Shows available variables for this client
- **Query Type**: 
  - **Default Query**: Use pre-built plugin queries
  - **Custom Query**: Write custom queries with client variables
- **Parameters**: Add query parameters (client variables auto-injected)

#### Tab 3: Display Options
- **Display Type**: Table, Chart, Metric, List, or Gauge
- **Chart Type**: Bar, Line, Pie, Area (if chart selected)
- **Styling**: Width, height, borders, headers
- **Aggregation**: Count, sum, average, min, max functions

#### Tab 4: Preview & Test
- **Live Testing**: Test query with actual client data
- **Preview**: See how widget will look
- **Validation**: Ensure configuration is correct

### Managing Widgets

#### Enable/Disable Widgets
- Use the toggle switch on each widget card
- Enabled widgets show with green power icon
- Disabled widgets are grayed out with red power-off icon
- Changes take effect immediately

#### Search and Filter
- **Search Box**: Search by widget name, description, or plugin
- **Plugin Filter**: Filter by specific plugin type
- **Status Filter**: Show all, enabled only, or disabled only

#### Widget Actions
- **👁️ View**: Full-screen preview of widget
- **✏️ Edit**: Modify widget configuration
- **📋 Copy**: Duplicate widget with "(Copy)" suffix
- **🗑️ Delete**: Remove widget permanently

### Client Variable Usage

Client variables are automatically available in all queries:

#### In Default Queries
Variables are passed as parameters to the plugin's default query endpoints.

#### In Custom Queries
Use variables directly in your custom queries:

**Example Jira Query:**
```sql
project = "${clientShortName}" AND status != "Done"
```

**Example API Query:**
```javascript
/api/alerts?client=${clientShortName}&domain=${clientDomain}
```

#### Available Variables
- `clientShortName`: Client's short identifier (e.g., "ABC123")
- `clientName`: Full client name (e.g., "Acme Corporation")
- `clientDomain`: Client's domain (e.g., "acme.com") - if available

## Widget Examples

### 1. Jira Tickets Widget
```typescript
{
  name: "Open Jira Tickets",
  description: "Shows open tickets for this client",
  pluginName: "jira",
  queryType: "default",
  queryId: "open-tickets",
  displayType: "metric",
  // clientShortName automatically passed
}
```

### 2. Fortigate Security Events
```typescript
{
  name: "Security Events",
  description: "Recent security events from Fortigate",
  pluginName: "fortigate",
  queryType: "custom",
  customQuery: "SELECT * FROM events WHERE client_id = '${clientShortName}' AND severity >= 'HIGH'",
  displayType: "table",
}
```

### 3. Splunk Alert Summary
```typescript
{
  name: "Alert Summary",
  description: "24-hour alert summary",
  pluginName: "splunk",
  queryType: "default",
  queryId: "alert-summary",
  displayType: "chart",
  chartType: "pie",
  queryParameters: {
    timeRange: "24h",
    // clientShortName automatically added
  }
}
```

## Technical Implementation

### Data Storage
Widgets are currently stored in localStorage with the following structure:

```typescript
interface CustomWidget {
  id: string;
  name: string;
  description: string;
  pluginName: string;
  instanceId: string;
  queryType: 'default' | 'custom';
  queryId?: string;
  customQuery?: string;
  queryMethod: string;
  queryParameters: Record<string, any>;
  displayType: 'table' | 'chart' | 'metric' | 'list' | 'gauge';
  chartType?: 'bar' | 'line' | 'pie' | 'area';
  refreshInterval: number;
  placement: 'client-details' | 'global-dashboard' | 'custom';
  styling: {
    width: 'full' | 'half' | 'third' | 'quarter';
    height: 'small' | 'medium' | 'large';
    showBorder: boolean;
    showHeader: boolean;
  };
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}
```

### API Integration
Widgets make requests to plugin endpoints with client context:

```typescript
// Default Query Endpoint
POST /api/plugins/{pluginName}/instances/{instanceId}/default-query/{queryId}
Body: { parameters: { clientShortName, clientName, clientDomain, ...otherParams } }

// Custom Query Endpoint  
POST /api/plugins/{pluginName}/instances/{instanceId}/custom-query
Body: { 
  query: "custom query string", 
  method: "GET|POST", 
  parameters: { clientShortName, clientName, clientDomain, ...otherParams } 
}
```

### Client Context Injection
Client variables are automatically injected at multiple levels:

1. **Widget Builder**: During query testing
2. **Widget Renderer**: During data fetching
3. **Query Parameters**: Merged with user-defined parameters
4. **Custom Queries**: Available for string interpolation

## Best Practices

### Widget Design
1. **Descriptive Names**: Use clear, descriptive widget names
2. **Appropriate Refresh**: Set reasonable refresh intervals (30s+ for most use cases)
3. **Error Handling**: Test widgets thoroughly before enabling
4. **Performance**: Avoid overly complex queries that might slow down the page

### Client Variables
1. **Validation**: Always validate that client variables exist before using
2. **Fallbacks**: Provide fallback values for optional variables like clientDomain
3. **Security**: Client variables are automatically escaped in API calls

### Management
1. **Organization**: Use consistent naming conventions
2. **Documentation**: Add meaningful descriptions to widgets
3. **Cleanup**: Regularly review and remove unused widgets
4. **Testing**: Test widgets after plugin updates or configuration changes

## Troubleshooting

### Common Issues

#### Widget Not Displaying
1. Check if widget is enabled
2. Verify plugin and instance are active
3. Test query in widget builder
4. Check browser console for errors

#### No Data Returned
1. Verify client variables are correct
2. Test query with manual parameters
3. Check plugin connectivity
4. Review query syntax

#### Performance Issues
1. Reduce refresh interval
2. Optimize query complexity
3. Limit data returned
4. Consider using aggregation

### Debug Mode
Enable debug mode by adding `?debug=widgets` to the client detail page URL to see:
- Widget loading states
- Query parameters being sent
- API response data
- Client context variables

## Future Enhancements

### Planned Features
1. **Database Storage**: Move from localStorage to database storage
2. **Widget Templates**: Pre-built widget templates for common use cases
3. **Advanced Filtering**: More sophisticated data filtering options
4. **Export/Import**: Widget configuration export/import functionality
5. **Scheduling**: Scheduled widget updates and reports
6. **Alerts**: Widget-based alerting and notifications

### API Improvements
1. **Batch Queries**: Support for multiple queries in single request
2. **Caching**: Intelligent caching for frequently accessed data
3. **Real-time Updates**: WebSocket support for real-time data updates
4. **Query Optimization**: Automatic query optimization suggestions

## Conclusion

The Client Widgets System provides a powerful, flexible way to display client-specific data from any integrated plugin. With toggle enable/disable functionality and automatic client variable injection, users can create highly customized dashboards that show exactly the information they need for each client.

The system is designed to be extensible and will continue to evolve with additional features and improvements based on user feedback and requirements. 