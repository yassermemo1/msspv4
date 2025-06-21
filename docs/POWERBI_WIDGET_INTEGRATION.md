# PowerBI Dashboard Widget Integration Guide

This guide explains how to create widgets through the Widget Manager that will appear on the PowerBI dashboard with the same beautiful styling.

## Overview

The PowerBI dashboard at http://10.252.1.89/powerbi-dashboard can display both hardcoded widgets and dynamic widgets created through the Widget Manager system. Dynamic widgets will automatically receive PowerBI styling including gradients, icons, and hover effects.

## Creating PowerBI Widgets

### 1. Access the Widget Manager

- Navigate to http://10.252.1.89/powerbi-dashboard
- Click the **"Manage Widgets"** button in the top-right action bar
- This opens the Global Widget Manager

### 2. Create a New Widget

Click **"Create Widget"** and configure:

#### Basic Info Tab:
- **Name**: Give your widget a descriptive name (e.g., "Active Incidents")
- **Description**: Explain what the metric shows
- **Plugin**: Select the plugin to use:
  - **SQL Plugin** - For database queries (recommended for metrics)
  - **Jira Plugin** - For Jira issue counts
  - **Generic API** - For external API calls
- **Instance**: Usually select "main" instance

#### Query Configuration Tab:
- **Query Type**: Select "Custom Query"
- **Display Type**: Choose **"metric"** for PowerBI-style cards
- **SQL Query Example**:

```sql
-- Example: Count active incidents
SELECT 
    COUNT(*) as value,
    'Active Incidents' as label
FROM incidents 
WHERE status = 'active'

-- Example with trend data:
SELECT 
    COUNT(*) as value,
    'Total Revenue' as label,
    (SELECT COUNT(*) FROM contracts WHERE created_at > NOW() - INTERVAL '30 days') as previous_value
FROM contracts 
WHERE status = 'active'
```

**Important**: Your SQL query MUST return these fields:
- `value` (required) - The numeric metric value
- `label` (required) - The display label
- `previous_value` (optional) - For trend calculation

#### Display Options Tab:
- **Display Type**: Select "metric"
- **Refresh Interval**: 60-300 seconds recommended
- **Placement**: Set to **"powerbi-dashboard"**

### 3. Widget Styling

PowerBI widgets automatically receive:
- **Color Schemes**: Based on the plugin type
  - SQL queries → Green gradient
  - Jira → Blue gradient
  - API → Indigo gradient
- **Icons**: Automatically assigned based on plugin
- **Animations**: Hover effects and transitions
- **Rate Limiting**: 1 request per minute per widget

## Examples

### Example 1: Client Count Widget

```sql
SELECT 
    COUNT(*) as value,
    'Active Clients' as label
FROM clients 
WHERE "isActive" = true
```

### Example 2: Revenue Metric with Trend

```sql
WITH current_revenue AS (
    SELECT COALESCE(SUM(CAST("totalValue" AS NUMERIC)), 0) as current_value
    FROM contracts 
    WHERE status = 'active'
),
previous_revenue AS (
    SELECT COALESCE(SUM(CAST("totalValue" AS NUMERIC)), 0) as previous_value
    FROM contracts 
    WHERE status = 'active' 
    AND "createdAt" < NOW() - INTERVAL '30 days'
)
SELECT 
    current_value as value,
    'Monthly Revenue' as label,
    previous_value as previous_value
FROM current_revenue, previous_revenue
```

### Example 3: Jira Issues Count

For Jira plugin, use JQL query:
```
project = "MD" AND status != Closed
```

## Widget Features

### Automatic Features:
1. **PowerBI Styling**: Gradient backgrounds, white icon containers
2. **Trend Indicators**: Shows ↑/↓ with percentage when previous_value provided
3. **Click Navigation**: Set `drilldownUrl` in display config
4. **Error Handling**: Graceful error display
5. **Loading States**: Skeleton animation while loading
6. **Rate Limiting**: Prevents API overload

### Managing Widgets:
- **Enable/Disable**: Use the toggle in Widget Manager
- **Edit**: Click edit icon to modify configuration
- **Delete**: Remove widgets you no longer need
- **Visibility**: Use Show/Hide manager on dashboard

## Best Practices

1. **Keep Queries Simple**: Complex queries can timeout
2. **Use Proper Indexes**: Ensure your database queries are optimized
3. **Test First**: Use the Preview tab before saving
4. **Meaningful Names**: Use clear, descriptive widget names
5. **Set Appropriate Refresh**: Balance between real-time and performance

## Troubleshooting

### Widget Not Appearing:
- Ensure widget is **active** in Widget Manager
- Check placement is set to "powerbi-dashboard"
- Verify query returns data in correct format

### Query Errors:
- Test query directly in database first
- Ensure column names match exactly (case-sensitive)
- Check for proper quotes around column names with capital letters

### Styling Issues:
- Widget type must be "metric" for PowerBI card style
- Clear browser cache if styles don't update

## Advanced Configuration

### Custom Widget Placement

To make widgets appear on PowerBI dashboard, when creating/editing:

1. In the widget configuration, ensure the placement field is set
2. The system will filter widgets where `placement === 'powerbi-dashboard'`
3. Only active widgets (`isActive: true`) will be displayed

### Integration with Existing System

The PowerBI dashboard integrates with the existing widget system:
- Uses the same `/api/widgets/manage` endpoints
- Shares the same database storage
- Leverages existing plugin infrastructure
- Maintains consistent authentication/authorization

## API Reference

### Create PowerBI Widget via API

```bash
POST /api/widgets/manage
Content-Type: application/json

{
  "name": "Active Contracts",
  "description": "Number of currently active contracts",
  "pluginName": "sql",
  "widgetType": "metric",
  "query": "SELECT COUNT(*) as value, 'Active Contracts' as label FROM contracts WHERE status = 'active'",
  "method": "POST",
  "parameters": {},
  "displayConfig": {
    "drilldownUrl": "/contracts"
  },
  "refreshInterval": 300,
  "isGlobal": false,
  "placement": "powerbi-dashboard",
  "isActive": true
}
```

### Widget Response Format

```json
{
  "id": "123",
  "name": "Active Contracts",
  "widgetType": "metric",
  "query": "SELECT ...",
  "isActive": true,
  "placement": "powerbi-dashboard",
  "displayConfig": {
    "drilldownUrl": "/contracts"
  }
}
```

This integration allows you to leverage the full power of the plugin system while maintaining the beautiful PowerBI-inspired design aesthetic. 