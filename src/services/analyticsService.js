const isValidArray = (value) => Array.isArray(value) ? value : [];

const getRecordDateValue = (item = {}) =>
  item.createdAt ||
  item.createdAtIso ||
  item.timestamp ||
  item.requestedAtIso ||
  item.requestedDate ||
  item.updatedAt ||
  item.updatedAtIso ||
  item.date ||
  null;

const safeDate = (value) => {
  if (!value) return null;
  if (typeof value?.toDate === "function") {
    const firebaseDate = value.toDate();
    return Number.isNaN(firebaseDate.getTime()) ? null : firebaseDate;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const getStartOfToday = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
};

const getStartDateForRange = (days = 30) => {
  const safeDays = Math.max(Number(days) || 30, 1);
  const startDate = getStartOfToday();
  startDate.setDate(startDate.getDate() - (safeDays - 1));
  return startDate;
};

const calculateTrend = (current, previous) => {
  if (!previous) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
};

const isInDateRange = (item, startDate, endDate = new Date()) => {
  const itemDate = safeDate(getRecordDateValue(item));
  if (!itemDate) return false;
  return itemDate >= startDate && itemDate <= endDate;
};

export const filterRecordsByDays = (items = [], days = 30) => {
  const startDate = getStartDateForRange(days);
  return isValidArray(items).filter((item) => isInDateRange(item, startDate));
};

export const getTimeSeriesMetrics = (
  items = [],
  days = 30,
  getter = () => 1,
) => {
  const safeDays = Math.max(Number(days) || 30, 1);
  const startDate = getStartDateForRange(safeDays);
  const grouped = {};

  for (let index = 0; index < safeDays; index += 1) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + index);
    grouped[date.toISOString().split("T")[0]] = 0;
  }

  isValidArray(items).forEach((item) => {
    const itemDate = safeDate(getRecordDateValue(item));
    if (!itemDate) return;

    const key = itemDate.toISOString().split("T")[0];
    if (Object.prototype.hasOwnProperty.call(grouped, key)) {
      const addValue = Number(getter(item));
      grouped[key] += Number.isFinite(addValue) ? addValue : 1;
    }
  });

  return Object.entries(grouped).map(([date, value]) => ({
    date,
    value,
    label: new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
  }));
};

export const getDistributionMetrics = (
  items = [],
  categorizer = (item) => item.type,
) => {
  const counts = {};

  isValidArray(items).forEach((item) => {
    const rawCategory = categorizer(item);
    const category = String(rawCategory || "Unspecified").trim() || "Unspecified";
    counts[category] = (counts[category] || 0) + 1;
  });

  const total = Object.values(counts).reduce((sum, count) => sum + count, 0);

  return Object.entries(counts)
    .map(([category, count]) => ({
      category,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count || a.category.localeCompare(b.category));
};

export const getPerformanceMetrics = (
  emergencies = [],
  appointments = [],
  reports = [],
) => {
  const calculateResponseTime = (item = {}) => {
    const createdDate = safeDate(getRecordDateValue(item));
    const resolvedDate = safeDate(
      item.resolvedAt || item.respondedAt || item.completedAt || item.updatedAt || item.updatedAtIso,
    );

    if (!createdDate || !resolvedDate) return null;

    const createdAt = createdDate.getTime();
    const resolvedAt = resolvedDate.getTime();
    if (resolvedAt < createdAt) return null;

    return (resolvedAt - createdAt) / (1000 * 60 * 60);
  };

  const getAverage = (values) =>
    values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;

  const getMedian = (values) => {
    if (!values.length) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  };

  const emergencyItems = isValidArray(emergencies);
  const appointmentItems = isValidArray(appointments);
  const reportItems = isValidArray(reports);

  const emergencyTimes = emergencyItems
    .filter((item) => ["Resolved", "Responded"].includes(item.status))
    .map(calculateResponseTime)
    .filter((time) => Number.isFinite(time));

  const appointmentTimes = appointmentItems
    .filter((item) => ["Approved", "Completed"].includes(item.status))
    .map(calculateResponseTime)
    .filter((time) => Number.isFinite(time));

  const pendingReports = reportItems.filter((item) =>
    ["Pending", "Under Review"].includes(item.status),
  );

  const pendingReportAges = pendingReports
    .map((item) => {
      const createdDate = safeDate(getRecordDateValue(item));
      if (!createdDate) return null;
      return (Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24);
    })
    .filter((days) => Number.isFinite(days) && days >= 0);

  const emergencyResolutionRate = emergencyItems.length
    ? Math.round((emergencyItems.filter((item) => item.status === "Resolved").length / emergencyItems.length) * 100)
    : 0;

  const appointmentApprovalRate = appointmentItems.length
    ? Math.round((appointmentItems.filter((item) => ["Approved", "Completed"].includes(item.status)).length / appointmentItems.length) * 100)
    : 0;

  const reportClosureRate = reportItems.length
    ? Math.round((reportItems.filter((item) => ["Resolved", "Dismissed"].includes(item.status)).length / reportItems.length) * 100)
    : 0;

  return {
    emergencyResponse: {
      average: getAverage(emergencyTimes),
      median: getMedian(emergencyTimes),
      samples: emergencyTimes.length,
      resolutionRate: emergencyResolutionRate,
    },
    appointmentResponse: {
      average: getAverage(appointmentTimes),
      median: getMedian(appointmentTimes),
      samples: appointmentTimes.length,
      approvalRate: appointmentApprovalRate,
    },
    reportMetrics: {
      closureRate: reportClosureRate,
      pendingCount: pendingReports.length,
      avgPendingDays: pendingReportAges.length ? Math.round(getAverage(pendingReportAges)) : 0,
    },
  };
};

export const getActivityHeatmap = (items = []) => {
  const heatmap = {};
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  isValidArray(items).forEach((item) => {
    const date = safeDate(getRecordDateValue(item));
    if (!date) return;

    const day = days[date.getDay()];
    const hour = String(date.getHours()).padStart(2, "0");
    const key = `${day}-${hour}`;
    heatmap[key] = (heatmap[key] || 0) + 1;
  });

  return heatmap;
};

export const getGrowthMetrics = (items = [], options = {}) => {
  const safeItems = isValidArray(items);
  const days = Math.max(Number(options.days) || 7, 1);
  const now = new Date();

  const currentStart = new Date(now);
  currentStart.setDate(now.getDate() - (days - 1));
  currentStart.setHours(0, 0, 0, 0);

  const previousStart = new Date(currentStart);
  previousStart.setDate(currentStart.getDate() - days);

  const previousEnd = new Date(currentStart);
  previousEnd.setMilliseconds(previousEnd.getMilliseconds() - 1);

  const thisWeekStart = new Date(now);
  thisWeekStart.setDate(now.getDate() - now.getDay());
  thisWeekStart.setHours(0, 0, 0, 0);

  const lastWeekStart = new Date(thisWeekStart);
  lastWeekStart.setDate(thisWeekStart.getDate() - 7);

  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const countBetween = (start, end) =>
    safeItems.filter((item) => isInDateRange(item, start, end)).length;

  const currentPeriod = countBetween(currentStart, now);
  const previousPeriod = countBetween(previousStart, previousEnd);
  const thisWeek = countBetween(thisWeekStart, now);
  const lastWeek = countBetween(lastWeekStart, thisWeekStart);
  const thisMonth = countBetween(thisMonthStart, now);
  const lastMonth = countBetween(lastMonthStart, thisMonthStart);

  return {
    periodChange: calculateTrend(currentPeriod, previousPeriod),
    currentPeriod,
    previousPeriod,
    weekOverWeek: calculateTrend(thisWeek, lastWeek),
    monthOverMonth: calculateTrend(thisMonth, lastMonth),
    thisWeek,
    lastWeek,
    thisMonth,
    lastMonth,
  };
};

export const getTopContributors = (allPosts = [], limit = 5) => {
  const postsByAuthor = {};

  isValidArray(allPosts).forEach((post, index) => {
    const authorId =
      post.author?.id ||
      post.authorId ||
      post.userId ||
      post.createdBy ||
      `anonymous-${index}`;
    const authorName =
      post.author?.name ||
      post.authorName ||
      post.userName ||
      post.createdByName ||
      "Resident";

    if (!postsByAuthor[authorId]) {
      postsByAuthor[authorId] = {
        authorId,
        authorName,
        count: 0,
        status: post.author?.status || post.authorStatus || "active",
      };
    }

    postsByAuthor[authorId].count += 1;
  });

  return Object.values(postsByAuthor)
    .sort((a, b) => b.count - a.count || a.authorName.localeCompare(b.authorName))
    .slice(0, Math.max(Number(limit) || 5, 1));
};

export const buildAdvancedAnalytics = (
  {
    users = [],
    emergencies = [],
    appointments = [],
    posts = [],
    reports = [],
    notifications = [],
  } = {},
  options = {},
) => {
  const days = Math.max(Number(options.days) || 30, 1);
  const safeUsers = isValidArray(users);
  const safeEmergencies = isValidArray(emergencies);
  const safeAppointments = isValidArray(appointments);
  const safePosts = isValidArray(posts);
  const safeReports = isValidArray(reports);
  const safeNotifications = isValidArray(notifications);

  const unresolvedEmergencies = safeEmergencies.filter(
    (item) => !["Resolved", "False Report", "Cancelled"].includes(item.status),
  );
  const pendingAppointments = safeAppointments.filter((item) =>
    ["Pending", "Rescheduled", "Missing Requirements"].includes(item.status),
  );
  const pendingReports = safeReports.filter((item) =>
    ["Pending", "Under Review"].includes(item.status),
  );
  const activeUsers = safeUsers.filter((item) => item.status !== "Suspended");
  const recordsInPeriod = [
    ...safeEmergencies,
    ...safeAppointments,
    ...safePosts,
    ...safeReports,
  ].length;

  const emergencyTrend = getTimeSeriesMetrics(safeEmergencies, days);
  const appointmentTrend = getTimeSeriesMetrics(safeAppointments, days);
  const postTrend = getTimeSeriesMetrics(safePosts, days);

  const emergencyDistribution = getDistributionMetrics(
    safeEmergencies,
    (item) => item.emergencyType || item.severity || "General",
  );
  const appointmentDistribution = getDistributionMetrics(
    safeAppointments,
    (item) => item.serviceType || item.category || "General",
  );

  const performance = getPerformanceMetrics(safeEmergencies, safeAppointments, safeReports);
  const emergencyGrowth = getGrowthMetrics(safeEmergencies, { days });
  const appointmentGrowth = getGrowthMetrics(safeAppointments, { days });
  const postGrowth = getGrowthMetrics(safePosts, { days });
  const topContributors = getTopContributors(safePosts);

  return {
    summary: {
      totalEmergencies: safeEmergencies.length,
      unresolvedEmergencies: unresolvedEmergencies.length,
      totalAppointments: safeAppointments.length,
      pendingAppointments: pendingAppointments.length,
      totalPosts: safePosts.length,
      postsLastWeek: filterRecordsByDays(safePosts, 7).length,
      postsInPeriod: safePosts.length,
      totalReports: safeReports.length,
      pendingReports: pendingReports.length,
      activeUsers: activeUsers.length,
      totalUsers: safeUsers.length,
      notificationCount: safeNotifications.length,
      recordsInPeriod,
    },
    trends: {
      emergencies: emergencyTrend,
      appointments: appointmentTrend,
      posts: postTrend,
    },
    distribution: {
      emergencies: emergencyDistribution,
      appointments: appointmentDistribution,
    },
    performance,
    growth: {
      emergencies: emergencyGrowth,
      appointments: appointmentGrowth,
      posts: postGrowth,
    },
    topContributors,
    heatmap: getActivityHeatmap([
      ...safeEmergencies,
      ...safeAppointments,
      ...safePosts,
    ]),
  };
};

const csvCell = (value) => {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export const exportAnalyticsAsCSV = (analytics = {}, barangay = "Unknown") => {
  const summary = analytics.summary || {};
  const performance = analytics.performance || getPerformanceMetrics();
  const growth = analytics.growth || {
    emergencies: getGrowthMetrics(),
    appointments: getGrowthMetrics(),
    posts: getGrowthMetrics(),
  };

  const rows = [
    [`Barangay Activity Report - ${barangay}`],
    [`Generated`, new Date().toLocaleString()],
    [],
    ["SUMMARY"],
    ["Emergency reports needing action", summary.unresolvedEmergencies || 0],
    ["Pending appointment requests", summary.pendingAppointments || 0],
    ["Reports to review", summary.pendingReports || 0],
    ["Active residents", summary.activeUsers || 0],
    ["Registered residents", summary.totalUsers || 0],
    ["Community posts in selected period", summary.postsInPeriod || summary.totalPosts || 0],
    [],
    ["RESPONSE AND PROCESSING"],
    ["Emergency average response time (hours)", Number(performance.emergencyResponse.average || 0).toFixed(1)],
    ["Emergency resolved (%)", performance.emergencyResponse.resolutionRate || 0],
    ["Appointment approved/completed (%)", performance.appointmentResponse.approvalRate || 0],
    ["Reports closed (%)", performance.reportMetrics.closureRate || 0],
    ["Pending report average age (days)", performance.reportMetrics.avgPendingDays || 0],
    [],
    ["COMPARISON VS PREVIOUS PERIOD"],
    ["Emergency reports change (%)", growth.emergencies.periodChange || 0],
    ["Appointment requests change (%)", growth.appointments.periodChange || 0],
    ["Community posts change (%)", growth.posts.periodChange || 0],
  ];

  return rows.map((row) => row.map(csvCell).join(",")).join("\n");
};

export const getAnalyticsReportData = (analytics, barangay = "Unknown") => ({
  title: `${barangay} Barangay Activity Report`,
  generatedAt: new Date().toLocaleString(),
  ...analytics,
});
