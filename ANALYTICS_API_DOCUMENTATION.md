# Advanced Analytics API Documentation

## Overview

The Advanced Analytics Service provides comprehensive barangay analytics with real-time metrics, performance insights, and strategic recommendations for community management.

## API Functions

### Core Functions

#### `buildAdvancedAnalytics(data: Object)`

Builds comprehensive analytics from scoped data including emergencies, appointments, posts, reports, users, and notifications.

**Parameters:**

- `users` (Array): Array of user objects
- `emergencies` (Array): Array of emergency reports
- `appointments` (Array): Array of appointment requests
- `posts` (Array): Array of community posts
- `reports` (Array): Array of reports/complaints
- `notifications` (Array): Array of notifications

**Returns:**

```javascript
{
  summary: {
    totalEmergencies, unresolvedEmergencies,
    totalAppointments, pendingAppointments,
    totalPosts, postsLastWeek,
    totalReports, pendingReports,
    activeUsers, totalUsers,
    notificationCount
  },
  trends: {
    emergencies: Array,      // Time-series data for 30 days
    appointments: Array,     // Time-series data for 30 days
    posts: Array            // Time-series data for 30 days
  },
  distribution: {
    emergencies: Array,      // Category breakdown
    appointments: Array      // Service type breakdown
  },
  performance: {
    emergencyResponse: { average, median, samples, resolutionRate },
    appointmentResponse: { average, median, samples, approvalRate },
    reportMetrics: { closureRate, avgPendingDays }
  },
  growth: {
    emergencies: { weekOverWeek, monthOverMonth, thisWeek, lastWeek, thisMonth, lastMonth },
    appointments: { weekOverWeek, monthOverMonth, thisWeek, lastWeek, thisMonth, lastMonth },
    posts: { weekOverWeek, monthOverMonth, thisWeek, lastWeek, thisMonth, lastMonth }
  },
  topContributors: Array,   // Top 5 community contributors
  heatmap: Object           // Activity heatmap by day/hour
}
```

### Time Series Functions

#### `getTimeSeriesMetrics(items: Array, days: number, getter: Function)`

Creates time-series data for specified number of days.

**Parameters:**

- `items`: Array of items to analyze
- `days`: Number of days to include (default: 30)
- `getter`: Function to extract numeric value from each item

**Returns:**

```javascript
[
  { date: "2024-01-01", value: 5, label: "Jan 1" },
  { date: "2024-01-02", value: 8, label: "Jan 2" },
  // ...
];
```

### Distribution Functions

#### `getDistributionMetrics(items: Array, categorizer: Function)`

Creates distribution breakdown by category.

**Parameters:**

- `items`: Array of items to analyze
- `categorizer`: Function to extract category from each item

**Returns:**

```javascript
[
  { category: "Fire", count: 12, percentage: 35 },
  { category: "Medical", count: 8, percentage: 23 },
  // ...
];
```

### Performance Functions

#### `getPerformanceMetrics(emergencies: Array, appointments: Array, reports: Array)`

Calculates response times and resolution rates.

**Returns:**

```javascript
{
  emergencyResponse: {
    average: 4.5,          // hours
    median: 3.2,           // hours
    samples: 24,           // resolved emergencies
    resolutionRate: 85     // percentage
  },
  appointmentResponse: {
    average: 2.1,
    median: 1.8,
    samples: 45,
    approvalRate: 92
  },
  reportMetrics: {
    closureRate: 78,       // percentage
    avgPendingDays: 3      // average days pending
  }
}
```

### Growth Functions

#### `getGrowthMetrics(items: Array, metrics: Object)`

Calculates week-over-week and month-over-month growth.

**Returns:**

```javascript
{
  weekOverWeek: 15,      // percentage change
  monthOverMonth: -5,    // negative indicates decline
  thisWeek: 42,
  lastWeek: 36,
  thisMonth: 156,
  lastMonth: 164
}
```

### Activity Functions

#### `getActivityHeatmap(items: Array)`

Creates activity distribution by day and hour.

**Returns:**

```javascript
{
  "Mon-09": 5,
  "Mon-10": 8,
  "Tue-09": 3,
  // ... breakdown by day and hour
}
```

### Contributor Functions

#### `getTopContributors(allPosts: Array, limit: number)`

Gets top community contributors by post count.

**Parameters:**

- `allPosts`: Array of all posts
- `limit`: Maximum number of contributors to return (default: 5)

**Returns:**

```javascript
[
  { authorId: "user1", authorName: "John Doe", count: 15, status: "active" },
  { authorId: "user2", authorName: "Jane Smith", count: 12, status: "active" },
  // ...
];
```

## Export Functions

### `exportAnalyticsAsCSV(analytics: Object, barangay: string)`

Exports analytics data as CSV format.

**Parameters:**

- `analytics`: Advanced analytics object from `buildAdvancedAnalytics()`
- `barangay`: Barangay name for report header

**Returns:** CSV string ready for file download

### `getAnalyticsReportData(analytics: Object, barangay: string)`

Prepares analytics for PDF report generation.

**Parameters:**

- `analytics`: Advanced analytics object
- `barangay`: Barangay name

**Returns:** Report data object with metadata

## Usage Examples

### Basic Setup

```javascript
import {
  buildAdvancedAnalytics,
  getPerformanceMetrics,
} from "../../services/analyticsService";

// In your component
const analytics = buildAdvancedAnalytics({
  users,
  emergencies,
  appointments,
  posts,
  reports,
  notifications,
});

// Access metrics
console.log(analytics.summary.unresolvedEmergencies);
console.log(analytics.performance.emergencyResponse.average);
```

### Time Series Display

```javascript
import { TrendChart } from "../../components/AdminAnalyticsPage";

<TrendChart
  title="Emergency Reports (30d)"
  data={analytics.trends.emergencies}
  height={250}
/>;
```

### Performance Analysis

```javascript
const performance = getPerformanceMetrics(emergencies, appointments, reports);

// Check emergency response efficiency
if (performance.emergencyResponse.average > 5) {
  console.warn("Emergency response time is slow");
}

// Check resolution rates
if (performance.emergencyResponse.resolutionRate < 70) {
  console.warn("Low emergency resolution rate");
}
```

### Growth Tracking

```javascript
const emergencyGrowth = getGrowthMetrics(emergencies);

if (emergencyGrowth.weekOverWeek > 20) {
  console.alert("High increase in emergency reports this week");
}
```

### Export Analytics

```javascript
const handleExport = () => {
  const csv = exportAnalyticsAsCSV(analytics, user?.barangay);
  // Download CSV file
  const blob = new Blob([csv], { type: "text/csv" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `analytics-${barangay}.csv`;
  a.click();
};
```

## Caching Strategy

The analytics service uses a 5-minute cache to avoid redundant calculations:

```javascript
// Cache is automatically managed
// Data is recalculated every 5 minutes
// Call same functions within 5 minutes to use cached results
```

## Integration with Admin Dashboard

The analytics service integrates with:

- **AdminLayout**: For navigation and admin context
- **AdminDashboard**: For basic workload metrics
- **Card Components**: For data presentation
- **Badge Components**: For status indicators
- **Firebase**: For data persistence

## Performance Considerations

- Analytics calculations are memoized using React.useMemo
- Time series data is limited to 30 days for performance
- Top contributors are limited to 5 by default
- Map-ready records are limited to 8 for display
- Activity heatmap only processes new data within analysis period

## Future Enhancements

- [ ] Real-time analytics updates using Firebase listeners
- [ ] Custom date range selection
- [ ] Advanced filtering options
- [ ] Predictive analytics
- [ ] Custom report generation
- [ ] Scheduled report emails
- [ ] Analytics comparison (period vs period)
- [ ] Custom metric creation

## Troubleshooting

### Empty Analytics Data

**Issue:** All metrics show zero or "No data"

**Solution:**

1. Verify data is properly scoped to user's barangay
2. Check that data objects have required fields (createdAt, timestamp, status)
3. Ensure timestamps are valid ISO strings or Date objects

### Slow Performance

**Issue:** Analytics page loads slowly

**Solution:**

1. Check browser console for errors
2. Verify data set size isn't too large (>10,000 records)
3. Use React DevTools Profiler to identify bottlenecks
4. Consider implementing pagination for large datasets

### Incorrect Metrics

**Issue:** Numbers seem off or inconsistent

**Solution:**

1. Verify data filtering logic in component
2. Check categorizer functions for custom metrics
3. Validate date/time calculations
4. Review performance metric calculation logic

## Support

For issues or questions about the analytics service, refer to:

- Component: `src/pages/admin/AdminAnalyticsPage.jsx`
- Service: `src/services/analyticsService.js`
- Utils: `src/utils/communityAnalytics.js`
- Styles: `src/styles/pages/AdminAnalytics.css`
