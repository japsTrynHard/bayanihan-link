const PRIORITY_WEIGHT = {
  critical: 100,
  high: 80,
  medium: 55,
  normal: 30,
  low: 10,
};

const TYPE_LABELS = {
  emergency: "Emergency",
  appointment: "Appointment",
  chat: "Message",
  announcement: "Announcement",
  post: "Community Post",
  moderation: "Account / Moderation",
  report: "Report",
  system: "System",
};

export const normalizePriority = (priority = "normal") => {
  const value = String(priority || "normal").toLowerCase();
  if (value === "urgent") return "critical";
  if (["critical", "high", "medium", "normal", "low"].includes(value)) return value;
  return "normal";
};

export const getNotificationPriorityWeight = (notification = {}) =>
  PRIORITY_WEIGHT[normalizePriority(notification.priority)] || PRIORITY_WEIGHT.normal;

export const getNotificationTypeLabel = (type = "system") =>
  TYPE_LABELS[type] || "System";

export const getNotificationBadgeVariant = (notification = {}) => {
  const priority = normalizePriority(notification.priority);
  if (priority === "critical" || priority === "high") return "danger";
  if (priority === "medium") return "warning";
  if (!notification.read) return "job";
  return "secondary";
};

export const getNotificationPriorityLabel = (notification = {}) => {
  const priority = normalizePriority(notification.priority);
  return priority === "normal" ? "Update" : priority[0].toUpperCase() + priority.slice(1);
};

const hoursFromNow = (hours) => {
  if (!Number.isFinite(Number(hours)) || Number(hours) <= 0) return null;
  return new Date(Date.now() + Number(hours) * 60 * 60 * 1000).toISOString();
};

export const buildSmartNotificationPayload = (notification = {}) => {
  const type = notification.type || "system";
  const priority = normalizePriority(notification.priority || (type === "emergency" ? "high" : "normal"));
  const createdAtIso = notification.createdAtIso || notification.createdAt || new Date().toISOString();
  const expiresAt = notification.expiresAt || hoursFromNow(notification.expiresAfterHours);
  return {
    ...notification,
    type,
    priority,
    category: notification.category || getNotificationTypeLabel(type),
    createdAtIso,
    createdAt: notification.createdAt || createdAtIso,
    expiresAt,
    automationSource: notification.automationSource || "bayanihan-link-smart-notification-engine",
  };
};

export const isNotificationExpired = (notification = {}) => {
  if (!notification.expiresAt) return false;
  const time = new Date(notification.expiresAt).getTime();
  return Number.isFinite(time) && time <= Date.now();
};

export const sortNotificationsSmart = (items = []) =>
  [...items]
    .filter((item) => !isNotificationExpired(item))
    .sort((a, b) => {
      const unreadWeight = Number(!b.read) - Number(!a.read);
      if (unreadWeight !== 0) return unreadWeight;
      const priorityDelta = getNotificationPriorityWeight(b) - getNotificationPriorityWeight(a);
      if (priorityDelta !== 0) return priorityDelta;
      const aTime = new Date(a.createdAtIso || a.createdAt || a.updatedAtIso || a.updatedAt || a.timestamp || 0).getTime();
      const bTime = new Date(b.createdAtIso || b.createdAt || b.updatedAtIso || b.updatedAt || b.timestamp || 0).getTime();
      return (Number.isNaN(bTime) ? 0 : bTime) - (Number.isNaN(aTime) ? 0 : aTime);
    });

export const getNotificationSummary = (items = []) => {
  const active = items.filter((item) => !isNotificationExpired(item));
  return active.reduce(
    (summary, item) => {
      const priority = normalizePriority(item.priority);
      const type = item.type || "system";
      return {
        total: summary.total + 1,
        unread: summary.unread + (!item.read ? 1 : 0),
        urgent: summary.urgent + (!item.read && ["critical", "high"].includes(priority) ? 1 : 0),
        byType: {
          ...summary.byType,
          [type]: (summary.byType[type] || 0) + 1,
        },
      };
    },
    { total: 0, unread: 0, urgent: 0, byType: {} },
  );
};
