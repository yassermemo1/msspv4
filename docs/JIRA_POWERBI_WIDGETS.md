# Jira PowerBI Widgets Documentation

## Overview

This document describes the Jira widgets that have been created for the PowerBI dashboard. These widgets provide real-time insights into your Jira issue tracking system.

## Available Widgets

### 1. Open Issues
- **Description**: Shows the total count of open Jira issues (not closed or resolved)
- **Type**: Metric widget
- **Color**: Red
- **Icon**: AlertCircle
- **Query**: `status not in (Closed, Resolved) ORDER BY created DESC`
- **Refresh**: 1-minute rate limiting

### 2. Issues by Priority
- **Description**: Pie chart showing distribution of issues by priority level
- **Type**: Chart widget (Pie)
- **Color**: Blue scheme
- **Query**: `project = MD ORDER BY priority ASC`
- **Grouping**: By priority.name
- **Refresh**: 1-minute rate limiting

### 3. This Week's Issues
- **Description**: Count of issues created in the current week
- **Type**: Metric widget
- **Color**: Blue
- **Icon**: TrendingUp
- **Query**: `created >= startOfWeek() ORDER BY created DESC`
- **Refresh**: 1-minute rate limiting

### 4. Critical & High Priority
- **Description**: Count of critical and high priority open issues
- **Type**: Metric widget
- **Color**: Orange
- **Icon**: AlertTriangle
- **Query**: `priority in (Critical, High) AND status not in (Closed, Resolved)`
- **Refresh**: 1-minute rate limiting

### 5. Issues by Status
- **Description**: Bar chart showing distribution of issues by status
- **Type**: Chart widget (Bar)
- **Color**: Multi-color scheme
- **Query**: `project = MD ORDER BY status ASC`
- **Grouping**: By status.name
- **Refresh**: 1-minute rate limiting

## Configuration

All Jira widgets are configured to:
- Use the Jira plugin with bearer token authentication
- Connect to https://sd.sic.sitco.sa
- Respect 1-minute rate limiting between refreshes
- Display on the PowerBI dashboard
- Support show/hide functionality

## Authentication

The widgets use the following authentication:
- **Username**: yalmohammed
- **Token**: Configured via JIRA_API_TOKEN environment variable
- **Auth Type**: Bearer token

## Usage

1. Navigate to the PowerBI Dashboard
2. Jira widgets will automatically load alongside SQL-based widgets
3. Use the "Show/Hide Widgets" button to toggle visibility
4. Click refresh on individual widgets (respects rate limiting)
5. Click on metric widgets to see detailed information

## Rate Limiting

All widgets implement a 1-minute rate limit to prevent API overload:
- Manual refresh is disabled for 60 seconds after each request
- Countdown timer shows time until next refresh is available
- Automatic refresh is disabled to respect rate limits

## Troubleshooting

If widgets fail to load:
1. Check Jira connectivity and authentication
2. Verify JIRA_API_TOKEN environment variable is set
3. Check browser console for specific error messages
4. Ensure you have access to the specified Jira projects 