import { isUnresolvedEmergency } from "./adminDecisionSupport";

const safeTime = (value) => {
  const time = new Date(value || 0).getTime();
  return Number.isNaN(time) ? 0 : time;
};

const hoursBetween = (start, end) => {
  const startTime = safeTime(start);
  const endTime = safeTime(end);
  if (!startTime || !endTime || endTime < startTime) return null;
  return (endTime - startTime) / (1000 * 60 * 60);
};

const countBy = (items = [], getter) =>
  items.reduce((acc, item) => {
    const key = getter(item) || "Unspecified";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

const topEntries = (object = {}, limit = 5) =>
  Object.entries(object)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([label, value]) => ({ label, value }));

export const getAverageEmergencyResponseHours = (emergencies = []) => {
  const values = emergencies
    .map((item) => {
      const resolvedAt = item.resolvedAt || item.respondedAt || item.updatedAt || item.updatedAtIso;
      if (!["Resolved", "Responded"].includes(item.status)) return null;
      return hoursBetween(item.createdAt || item.timestamp, resolvedAt);
    })
    .filter((value) => Number.isFinite(value));

  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

export const buildBarangayAnalytics = ({ users = [], emergencies = [], appointments = [], posts = [], reports = [], notifications = [] } = {}) => {
  const unresolvedEmergencies = emergencies.filter(isUnresolvedEmergency);
  const pendingAppointments = appointments.filter((item) => ["Pending", "Rescheduled", "Missing Requirements"].includes(item.status));
  const pendingReports = reports.filter((item) => ["Pending", "Under Review"].includes(item.status));
  const activePosts = posts.filter((item) => item.status === "Active");
  const warnedUsers = users.filter((item) => item.status === "Warned");
  const suspendedUsers = users.filter((item) => item.status === "Suspended");
  const averageEmergencyHours = getAverageEmergencyResponseHours(emergencies);

  const issueTypes = topEntries({
    ...countBy(emergencies, (item) => `Emergency: ${item.emergencyType || item.severity || "General"}`),
    ...countBy(reports, (item) => `Report: ${item.category || item.reason || "General"}`),
  });

  const appointmentDemand = topEntries(countBy(appointments, (item) => item.serviceType));
  const notificationDemand = topEntries(countBy(notifications, (item) => item.type));

  const workloadScore = Math.min(
    100,
    unresolvedEmergencies.length * 18 + pendingReports.length * 9 + pendingAppointments.length * 5 + warnedUsers.length * 3 + suspendedUsers.length * 5,
  );

  const health = workloadScore >= 75
    ? { label: "High workload", variant: "danger", recommendation: "Prioritize emergency response and report moderation before routine requests." }
    : workloadScore >= 40
      ? { label: "Moderate workload", variant: "warning", recommendation: "Resolve pending reports and appointments before they age further." }
      : { label: "Stable", variant: "success", recommendation: "Barangay workload is manageable. Continue monitoring emergency and report queues." };

  return {
    metrics: {
      residents: users.length,
      activePosts: activePosts.length,
      unresolvedEmergencies: unresolvedEmergencies.length,
      pendingAppointments: pendingAppointments.length,
      pendingReports: pendingReports.length,
      warnedUsers: warnedUsers.length,
      suspendedUsers: suspendedUsers.length,
      averageEmergencyHours,
      workloadScore,
    },
    issueTypes,
    appointmentDemand,
    notificationDemand,
    health,
    recommendations: [
      unresolvedEmergencies.length ? "Emergency reports must stay at the top until resolved." : "No unresolved emergency currently needs escalation.",
      pendingAppointments.length >= 3 ? "Consider batching appointment approvals by service type." : "Appointment queue is manageable.",
      pendingReports.length ? "Review reports with repeated user/post patterns first." : "No pending moderation reports.",
      warnedUsers.length || suspendedUsers.length ? "Monitor warned/suspended residents in chat and posting flows." : "No active account restriction signals.",
    ],
  };
};
