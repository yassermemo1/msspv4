# Custom Query Widget Guide

## Overview

The Custom Query Widget is a new widget type that allows you to display raw query results from any connected plugin system. This widget is perfect for debugging, data exploration, and displaying structured JSON responses.

## Features

### 🔍 **Raw Query Display**
- Shows the actual query being executed
- Displays raw JSON response data
- Provides formatted output with syntax highlighting

### 📊 **Query Statistics**
- Shows total record count for arrays
- Displays field count for objects
- Shows last update timestamp

### 🛠 **Interactive Features**
- Copy JSON data to clipboard
- Auto-refresh at configurable intervals
- Supports both custom and default queries

## How to Add a Custom Query Widget

### Step 1: Access Widget Manager
1. Navigate to the **Widget Manager** page in your application
2. Click the **"Create Widget"** button

### Step 2: Configure Basic Information
- **Widget Name**: Give your widget a descriptive name (e.g., "Jira Issues Query")
- **Description**: Describe what the widget displays
- **Plugin**: Select the data source (Jira, Splunk, QRadar, etc.)
- **Instance**: Choose the specific plugin instance
- **Refresh Interval**: Set how often data refreshes (seconds)

### Step 3: Configure Query
Choose your query type:

#### Option A: Default Query
- Select "Use Default Query"
- Choose from pre-configured queries for your plugin

#### Option B: Custom Query
- Select "Write Custom Query" 
- Write your custom query using the plugin's query language:

**Examples by Plugin:**

**Jira (JQL):**
```jql
project = "${clientShortName}" AND status != Done ORDER BY created DESC
```

**Splunk (SPL):**
```spl
index=main client="${clientShortName}" | stats count by sourcetype
```

**QRadar (AQL):**
```aql
SELECT * FROM events WHERE "Client Name" = '${clientName}' LAST 24 HOURS
```

**Elasticsearch (Query DSL):**
```json
{
  "query": {
    "match": {
      "client.short_name": "${clientShortName}"
    }
  }
}
```

### Step 4: Select Display Type
- Choose **"Raw Query Results"** from the Display Type dropdown
- This will show the query response in a formatted, readable way

### Step 5: Configure Display Options
- **Width**: Choose how wide the widget should be
- **Height**: Set the widget height (small/medium/large)
- **Show Border**: Toggle widget border
- **Show Header**: Toggle widget title bar

### Step 6: Test and Save
1. Click **"Test Query"** to preview results
2. Review the formatted output
3. Click **"Save Widget"** when satisfied

## Widget Display Features

### Query Information Panel
- Shows whether it's a custom or default query
- Displays HTTP method (GET, POST, etc.)
- Shows result count/type

### Query Code Display
- Shows the actual query being executed
- Formatted with syntax highlighting
- Easy to copy for debugging

### Results Panel
- JSON response formatted for readability
- Scrollable for large datasets
- Copy button for easy data export

### Statistics Dashboard
- **Total Records**: Count of returned items
- **Fields**: Number of fields per record
- **Last Updated**: Timestamp of last refresh

## Use Cases

### 🔧 **Development & Debugging**
- Test new queries before implementing them
- Debug query syntax and parameters
- Explore API responses

### 📈 **Data Exploration**
- Examine raw data structure
- Understand field naming conventions
- Analyze response formats

### 🎯 **Custom Monitoring**
- Display specific API responses
- Monitor custom metrics
- Show specialized data views

## Tips and Best Practices

### Variable Usage
Use template variables in your queries:
- `${clientShortName}` - Client's short identifier
- `${clientName}` - Full client name  
- `${clientDomain}` - Client domain (if available)

### Performance
- Set reasonable refresh intervals (30+ seconds)
- Limit result sets for large queries
- Use pagination when available

### Security
- Avoid exposing sensitive data in queries
- Use parameterized queries when possible
- Test queries in safe environments first

## Example Widgets

### Jira Issues Summary
**Query Type**: Custom  
**Query**:
```jql
project = "${clientShortName}" AND created >= -7d ORDER BY created DESC
```
**Purpose**: Shows recent issues for a client

### Security Event Count
**Query Type**: Custom  
**Query**:
```spl
index=security client="${clientShortName}" earliest=-24h | stats count by severity
```
**Purpose**: Shows security events by severity

### System Health Check
**Query Type**: Default  
**Query**: Server Status Query  
**Purpose**: Shows raw system health response

## Troubleshooting

### Common Issues

**Query Fails to Execute**
- Check query syntax for your plugin type
- Verify plugin instance is active
- Ensure required parameters are provided

**No Data Displayed**
- Verify the query returns results
- Check if filters are too restrictive
- Confirm client context variables are available

**Widget Displays Error**
- Review query permissions
- Check plugin connectivity
- Verify query method (GET/POST)

### Getting Help
- Test queries using the "Test Query" button
- Check plugin documentation for syntax
- Review example queries for your plugin type
- Use browser developer tools to debug API calls

## JQL Query Formatting Guide

### ⚠️ Common JQL Mistakes & Fixes

Your error message indicates three main issues with your JQL queries:

1. **"The value 'DEP' does not exist for the field 'project'"**
2. **"The value 'MD' does not exist for the field 'project'"**  
3. **"Not able to sort using field 'priority'"**

### 🔧 **How to Fix These Issues**

#### **Issue 1 & 2: Invalid Project Keys**

**❌ Problem:**
```jql
project = DEP
project = MD
```

**✅ Solutions:**

**Option A: Check Your Actual Project Keys**
1. Go to your Jira instance: `https://sd.sic.sitco.sa/rest/api/2/project`
2. Find the real project keys (they might be different)
3. Use the actual keys in your query

**Option B: Use Correct Syntax**
```jql
project = "YOUR_ACTUAL_PROJECT_KEY"
project in ("KEY1", "KEY2", "KEY3")
```

#### **Issue 3: Invalid Sort Field**

**❌ Problem:**
```jql
ORDER BY priority DESC
```

**✅ Solution:**
```jql
ORDER BY created DESC
ORDER BY updated DESC  
ORDER BY key ASC
ORDER BY status DESC
```

### 📝 **Complete Fixed Query Examples**

**Before (Broken):**
```jql
Project = DEP AND Project = MD ORDER BY priority
```

**After (Fixed):**
```jql
project in ("YOUR_PROJECT_1", "YOUR_PROJECT_2") ORDER BY created DESC
```

### 🎯 **JQL Best Practices for Custom Widgets**

#### **1. Field Names**
- ✅ **Correct:** `project`, `status`, `assignee`, `reporter`
- ❌ **Wrong:** `Project`, `Status`, `Assignee`, `Reporter`

#### **2. String Values** 
- ✅ **Correct:** `project = "MYPROJECT"`
- ❌ **Wrong:** `project = MYPROJECT`

#### **3. Multiple Values**
- ✅ **Correct:** `project in ("PROJ1", "PROJ2")`
- ❌ **Wrong:** `project in (PROJ1, PROJ2)`

#### **4. Valid Sort Fields**
- ✅ **Valid:** `created`, `updated`, `key`, `status`, `assignee`
- ❌ **Invalid:** `priority` (use `created` instead)

#### **5. Combining Conditions**
- ✅ **Correct:** `project = "MYPROJ" AND status != "Done"`
- ❌ **Wrong:** `project = MYPROJ AND status != Done`

### 🛠 **Testing Your Queries**

Before creating widgets, test your JQL queries:

1. **In Jira Web Interface:**
   - Go to Issues → Search for Issues
   - Switch to "Advanced" search
   - Test your JQL there first

2. **Using API Testing:**
   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" \
        "https://sd.sic.sitco.sa/rest/api/2/search?jql=YOUR_ENCODED_QUERY"
   ```

3. **Widget Test Button:**
   - Use the "Test Query" button in the widget builder
   - Check the validation warnings and suggestions

### 📋 **Common Query Templates**

#### **Recent Issues by Project:**
```jql
project = "YOUR_PROJECT_KEY" AND created >= -7d ORDER BY created DESC
```

#### **Open Issues for Current User:**
```jql
assignee = currentUser() AND resolution = Unresolved ORDER BY updated DESC
```

#### **Issues by Status:**
```jql
project = "YOUR_PROJECT_KEY" AND status in ("To Do", "In Progress") ORDER BY created DESC
```

#### **Multiple Projects:**
```jql
project in ("PROJ1", "PROJ2", "PROJ3") AND status != "Done" ORDER BY updated DESC
```

### 🔍 **Finding Your Project Keys**

If you don't know your project keys:

1. **Via Jira Web Interface:**
   - Go to Projects → View All Projects
   - The project key is shown next to each project name

2. **Via API:**
   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" \
        "https://sd.sic.sitco.sa/rest/api/2/project" | jq '.[] | {key: .key, name: .name}'
   ```

3. **Ask Your Jira Administrator** for the list of available project keys

---

**Note**: The Custom Query Widget is designed for technical users who need to access raw data. For standard reporting needs, consider using Table, Chart, or Metric widget types instead. 