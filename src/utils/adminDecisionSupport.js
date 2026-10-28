const safeTime = (value) => {
  const time = new Date(value || 0).getTime();
  return Number.isNaN(time) ? 0 : time;
};

const hoursAgo = (value) => {
  const time = safeTime(value);
  if (!time) return 0;
  return Math.max((Date.now() - time) / (1000 * 60 * 60), 0);
};

const typeWeight = {
  emergency: 100000,
  report: 2000,
  appointment: 1200,
  post: 500,
};

export const ACTION_QUEUE_FILTERS = [
  { value: "all", label: "All actions" },
  { value: "emergency", label: "Emergencies" },
  { value: "appointment", label: "Appointments" },
  { value: "report", label: "Reports" },
  { value: "post", label: "Flagged posts" },
];

export const getPriorityLabel = (score = 0) => {
  if (score >= 90) return { label: "Critical", variant: "danger" };
  if (score >= 70) return { label: "High", variant: "warning" };
  if (score >= 45) return { label: "Medium", variant: "secondary" };
  return { label: "Low", variant: "success" };
};

const emergencyRank = (status = "") => {
  const normalized = String(status).toLowerCase();
  if (normalized === "new") return 4;
  if (normalized === "verified") return 3;
  if (normalized === "ongoing") return 2;
  if (normalized === "responded") return 1;
  return 0;
};

export const isUnresolvedEmergency = (item = {}) =>
  !["Resolved", "False Report", "Removed"].includes(item.status);

export const buildAdminActionQueue = ({ emergencies = [], appointments = [], reports = [], posts = [] } = {}) => {
  const emergencyItems = emergencies
    .filter(isUnresolvedEmergency)
    .map((item) => {
      const ageHours = hoursAgo(item.createdAt || item.timestamp);
      const severity = String(item.severity || "").toLowerCase();
      const duplicateBonus = item.possibleDuplicate || item.duplicateWarning ? 12 : 0;
      const newStatusBonus = emergencyRank(item.status) * 7;
      const ageBonus = Math.min(ageHours * 3, 30);
      const score = Math.min(
        100,
        62 +
          (severity === "critical" ? 28 : severity === "high" ? 18 : 10) +
          newStatusBonus +
          ageBonus +
          duplicateBonus,
      );

      return {
        id: `emergency-${item.id}`,
        queueType: "emergency",
        type: "Emergency",
        title: item.title || "Emergency report",
        description: item.description || item.locationDetails || "Review emergency details.",
        score,
        sortBucket: typeWeight.emergency + emergencyRank(item.status) * 5000 + Math.min(ageHours * 100, 3500),
        to: "/admin/emergencies",
        status: item.status || "New",
        createdAt: item.createdAt || item.timestamp,
        recommendedAction:
          item.status === "New"
            ? "Verify immediately and dispatch barangay response"
            : item.status === "Ongoing"
              ? "Keep updating response timeline until resolved"
              : "Update response timeline and close only when verified resolved",
      };
    });

  const appointmentItems = appointments
    .filter((item) => ["Pending", "Rescheduled", "Missing Requirements"].includes(item.status))
    .map((item) => {
      const ageHours = hoursAgo(item.createdAt || item.requestedAtIso);
      const score = Math.min(100, item.status === "Pending" ? 56 + Math.min(ageHours, 22) : 44 + Math.min(ageHours, 18));
      return {
        id: `appointment-${item.id}`,
        queueType: "appointment",
        type: "Appointment",
        title: item.serviceType || "Service request",
        description: `${item.userName || "Resident"} • ${item.trackingNumber || "No tracking number"}`,
        score,
        sortBucket: typeWeight.appointment + Math.min(ageHours * 40, 800),
        to: "/admin/appointments",
        status: item.status || "Pending",
        createdAt: item.createdAt || item.requestedAtIso,
        recommendedAction: item.status === "Missing Requirements" ? "Review requirements note" : "Approve, reschedule, or request requirements",
      };
    });

  const reportItems = reports
    .filter((item) => ["Pending", "Under Review"].includes(item.status))
    .map((item) => {
      const category = `${item.category || ""} ${item.reason || ""}`.toLowerCase();
      const serious = /scam|fake|harass|threat|emergency|suspicious|fraud/.test(category);
      const ageHours = hoursAgo(item.createdAt || item.timestamp);
      const score = Math.min(100, 48 + (serious ? 24 : 10) + Math.min(ageHours, 18));
      return {
        id: `report-${item.id}`,
        queueType: "report",
        type: "Report",
        title: item.reason || item.category || "Resident report",
        description: item.details || item.targetTitle || "Review submitted report.",
        score,
        sortBucket: typeWeight.report + (serious ? 1000 : 0) + Math.min(ageHours * 45, 900),
        to: "/admin/reports",
        status: item.status || "Pending",
        createdAt: item.createdAt || item.timestamp,
        recommendedAction: serious ? "Prioritize moderation review" : "Review and resolve/dismiss",
      };
    });

  const flaggedPostItems = posts
    .filter((item) => ["Flagged", "Removed"].includes(item.status) || (item.reports || 0) > 0)
    .map((item) => ({
      id: `post-${item.id}`,
      queueType: "post",
      type: item.type === "job" ? "Job Post" : "Community Post",
      title: item.title || "Flagged post",
      description: item.description || "Review post details.",
      score: item.status === "Flagged" ? 58 : 38,
      sortBucket: typeWeight.post + (item.status === "Flagged" ? 400 : 0),
      to: item.type === "job" ? "/admin/jobs" : "/admin/lost-found",
      status: item.status || "Flagged",
      createdAt: item.updatedAt || item.createdAt,
      recommendedAction: "Check post content and resident behavior",
    }));

  return [...emergencyItems, ...reportItems, ...appointmentItems, ...flaggedPostItems]
    .sort((a, b) =>
      (b.sortBucket - a.sortBucket) ||
      (b.score - a.score) ||
      (safeTime(a.createdAt) - safeTime(b.createdAt)),
    );
};

export const getQueueCounts = (items = []) =>
  items.reduce(
    (counts, item) => ({
      ...counts,
      [item.queueType]: (counts[item.queueType] || 0) + 1,
      all: (counts.all || 0) + 1,
    }),
    { all: 0, emergency: 0, appointment: 0, report: 0, post: 0 },
  );

export const filterAdminActionQueue = (items = [], filter = "all") => {
  if (filter === "all") return items;
  return items.filter((item) => item.queueType === filter);
};

export const getAdminHealthSummary = ({ users = [], emergencies = [], appointments = [], reports = [], posts = [] } = {}) => {
  const warned = users.filter((item) => item.status === "warned" || item.status === "Warned").length;
  const suspended = users.filter((item) => item.status === "suspended" || item.status === "Suspended").length;
  const activeEmergencies = emergencies.filter(isUnresolvedEmergency).length;
  const pendingAppointments = appointments.filter((item) => ["Pending", "Rescheduled", "Missing Requirements"].includes(item.status)).length;
  const pendingReports = reports.filter((item) => ["Pending", "Under Review"].includes(item.status)).length;
  const flaggedPosts = posts.filter((item) => ["Flagged", "Removed"].includes(item.status)).length;
  const totalSignals = activeEmergencies * 5 + pendingReports * 2 + pendingAppointments + flaggedPosts + warned + suspended * 2;

  return {
    warned,
    suspended,
    activeEmergencies,
    pendingAppointments,
    pendingReports,
    flaggedPosts,
    totalSignals,
    healthLabel: totalSignals >= 14 ? "Needs attention" : totalSignals >= 6 ? "Moderate activity" : "Stable",
    healthVariant: totalSignals >= 14 ? "danger" : totalSignals >= 6 ? "warning" : "success",
  };
};

export const getReportRiskScore = (report = {}, targetUser = null, targetPost = null) => {
  let score = 30;
  const text = `${report.category || ""} ${report.reason || ""} ${report.details || ""}`.toLowerCase();
  if (/scam|fake|fraud|money|payment|harass|threat|abuse/.test(text)) score += 25;
  if (targetPost?.status === "Flagged") score += 12;
  if (targetUser?.status === "Warned") score += 10;
  if (targetUser?.status === "Suspended") score += 20;
  if (Array.isArray(targetUser?.warnings)) score += Math.min(targetUser.warnings.length * 5, 15);
  if (report.evidence) score += 8;
  return Math.min(score, 100);
};

export const getReportRecommendation = (score = 0, report = {}) => {
  const text = `${report.category || ""} ${report.reason || ""} ${report.details || ""}`.toLowerCase();
  if (score >= 80) return "Prioritize this report. Verify evidence, review the linked post/user, then apply warning, suspension, or removal if confirmed.";
  if (/scam|fake|fraud|harass|threat/.test(text)) return "Review with high attention. Check linked post, chat context, and resident history before deciding.";
  if (score >= 55) return "Review soon and record a clear admin note before resolving or dismissing.";
  return "Standard review. Confirm details, then resolve or dismiss with notes.";
};
