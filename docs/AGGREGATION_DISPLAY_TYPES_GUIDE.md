# Aggregation-Aware Display Types Guide

## Overview

The widget system now includes **aggregation-aware display types** that are specifically designed to show aggregated data beautifully. These display types work with aggregation functions like `count`, `sum`, `avg`, `min`, and `max` to provide meaningful visualizations for different types of aggregated data.

## Available Display Types

### Raw Data Displays

#### 1. **Table**
- **Best for**: Displaying detailed raw data in tabular format
- **Aggregation compatibility**: Works with all aggregations
- **Use case**: When you need to see individual records and details

#### 2. **List**
- **Best for**: Simple key-value pairs and basic data lists
- **Aggregation compatibility**: Works with all aggregations
- **Use case**: When you need a clean, simple list format

#### 3. **Raw Query Results**
- **Best for**: Debugging and seeing exactly what the query returns
- **Aggregation compatibility**: Shows raw aggregation results
- **Use case**: Development and troubleshooting

### Chart Displays

#### 4. **Chart**
- **Best for**: Visual patterns and trends
- **Aggregation compatibility**: Excellent with count, sum, avg
- **Chart types**: Bar, Line, Pie, Area
- **Use case**: When you need visual representation of data trends

### Aggregation-Specific Displays

#### 5. **Number Display** 📊
- **Symbol**: # (Hash icon)
- **Best for**: Count and Sum aggregations
- **Features**:
  - Large, prominent number display
  - Automatic number formatting with commas
  - Clear labeling (Total Count, Total Sum, etc.)
- **Example use cases**:
  - Total number of Jira issues
  - Sum of financial values
  - Count of users, tickets, etc.

#### 6. **Percentage Display** 🟢
- **Symbol**: % (Percent icon)
- **Best for**: Average aggregations and completion rates
- **Features**:
  - Displays values as percentages with % symbol
  - Color-coded based on value ranges
  - Perfect for averages, rates, and completion metrics
- **Color coding**:
  - Green (90%+): Excellent
  - Blue (70-89%): Good
  - Yellow (50-69%): Fair
  - Red (<50%): Needs attention

#### 7. **Progress Bar** 📈
- **Symbol**: Activity icon
- **Best for**: Showing completion or progress toward a goal
- **Features**:
  - Animated progress bar with percentage
  - Color-coded based on completion
  - Shows current value / maximum value
- **Use cases**:
  - Project completion rates
  - Goal achievement tracking
  - Capacity utilization

#### 8. **Gauge/Meter** ⚡
- **Symbol**: Gauge icon
- **Best for**: Values within a specific range
- **Features**:
  - Circular gauge display
  - Color-coded based on thresholds
  - Shows percentage and actual values
- **Use cases**:
  - Performance metrics
  - System utilization
  - Score-based metrics

#### 9. **Trend Indicator** 📈📉
- **Symbol**: Trending up/down arrows
- **Best for**: Showing change over time
- **Features**:
  - Up/down arrows based on trend direction
  - Color-coded (green=up, red=down, gray=neutral)
  - Shows percentage change
  - Displays current vs previous values
- **Use cases**:
  - Month-over-month changes
  - Performance improvements/degradations
  - Growth metrics

#### 10. **Statistic Card** 📋
- **Symbol**: Bar chart icon
- **Best for**: Min, Max, Average aggregations
- **Features**:
  - Four-panel layout showing Min, Max, Average, Count
  - Color-coded panels
  - Perfect for statistical summaries
- **Use cases**:
  - Response time statistics
  - Performance metrics overview
  - Data quality summaries

#### 11. **Summary Card** 📄
- **Symbol**: Eye icon
- **Best for**: Multiple metrics in one view
- **Features**:
  - Key-value pair display
  - Shows up to 6 different metrics
  - Clean, organized layout
- **Use cases**:
  - Dashboard overviews
  - System status summaries
  - Multi-metric displays

## Aggregation Function Compatibility

### Count Aggregation
**Best display types**:
- **Number Display**: Shows total count with hash icon
- **Progress Bar**: For completion tracking
- **Percentage**: For completion rates

### Sum Aggregation
**Best display types**:
- **Number Display**: Shows total sum with proper formatting
- **Progress Bar**: For goal tracking
- **Trend**: For period-over-period changes

### Average Aggregation
**Best display types**:
- **Percentage Display**: Perfect for averages as percentages
- **Gauge**: For performance averages
- **Statistic Card**: Shows average alongside min/max

### Min/Max Aggregations
**Best display types**:
- **Statistic Card**: Shows all statistics together
- **Number Display**: For highlighting specific min/max values
- **Trend**: For tracking min/max changes

## Display Type Selection Guide

### When to use each display type:

| Data Type | Aggregation | Recommended Display | Why |
|-----------|-------------|-------------------|-----|
| Issue counts | Count | Number Display | Clean, prominent count with proper formatting |
| Completion rates | Count/Total | Percentage | Shows rate with color coding |
| Financial totals | Sum | Number Display | Large, formatted monetary values |
| Performance metrics | Average | Gauge or Percentage | Visual representation of performance |
| Goal tracking | Current/Target | Progress Bar | Shows completion toward goal |
| Period comparison | Any | Trend | Shows change direction and magnitude |
| Statistical overview | Min/Max/Avg | Statistic Card | All stats in one organized view |
| Multi-metric view | Various | Summary Card | Multiple KPIs together |

## Implementation Examples

### Example 1: Jira Issue Count
```
Aggregation: count
Field: (not required for count)
Display Type: Number Display
Result: Large "27,905" with "Total Count" label
```

### Example 2: Average Response Time
```
Aggregation: avg
Field: response_time
Display Type: Percentage
Result: "85%" with color coding (blue for good)
```

### Example 3: Goal Achievement
```
Aggregation: sum
Field: completed_tasks
Display Type: Progress Bar
Result: Progress bar showing "75/100" with 75% completion
```

### Example 4: Performance Statistics
```
Aggregation: (automatic calculation)
Field: response_times
Display Type: Statistic Card
Result: Four panels showing Min, Max, Average, Count
```

## Configuration Tips

1. **Match aggregation to display type**: Use Number Display for counts/sums, Percentage for averages
2. **Consider your audience**: Use Progress Bar for management dashboards, Statistic Card for technical teams
3. **Color coding**: Leverage the automatic color coding in Percentage and Progress displays
4. **Size appropriately**: Use larger sizes for Number displays, smaller for Summary cards
5. **Update frequency**: Set appropriate refresh intervals based on data volatility

## Migration from Legacy Types

If you're upgrading existing widgets:
- **metric** → Use **Number Display** for better formatting
- **gauge** → Keep gauge for ranges, use **Percentage** for simple percentages
- Raw displays work as before but consider new aggregation-specific types

## Best Practices

1. **Choose the right display for your data type**
2. **Use aggregation functions that match your display type**
3. **Set appropriate refresh intervals**
4. **Consider mobile responsiveness with size settings**
5. **Use consistent color schemes across dashboards**
6. **Test with real data to ensure proper formatting**

---

*This guide covers the enhanced widget display system that provides better visualization for aggregated data across all supported external systems (Jira, Splunk, Grafana, etc.)* 