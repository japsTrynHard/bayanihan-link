const STORAGE_KEY = "bayanihan_notification_delete_state_v1";

const normalize = (value = "") => String(value || "").trim().toLowerCase();

export const getNotificationDeleteUserKeys = (user = {}) => [
  user?.id,
  user?.uid,
  user?.userId,
  user?.email ? normalize(user.email) : "",
]
  .filter(Boolean)
  .map((item) => String(item));

const readMap = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

const writeMap = (map) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map || {}));
  window.dispatchEvent(new Event("notification-delete-refresh"));
};

export const getLocalDeletedIdsForUser = (user = {}) => {
  const map = readMap();
  const keys = getNotificationDeleteUserKeys(user);
  const ids = new Set();

  keys.forEach((key) => {
    (map[key] || []).forEach((id) => ids.add(String(id)));
  });

  return ids;
};

export const markLocalNotificationDeleted = (notificationId, user = {}) => {
  if (!notificationId) return false;
  const keys = getNotificationDeleteUserKeys(user);
  if (!keys.length) return false;

  const map = readMap();
  keys.forEach((key) => {
    map[key] = Array.from(new Set([...(map[key] || []), String(notificationId)]));
  });
  writeMap(map);
  return true;
};

export const markLocalNotificationsDeleted = (notificationIds = [], user = {}) => {
  const ids = notificationIds.filter(Boolean).map((id) => String(id));
  if (!ids.length) return false;
  const keys = getNotificationDeleteUserKeys(user);
  if (!keys.length) return false;

  const map = readMap();
  keys.forEach((key) => {
    map[key] = Array.from(new Set([...(map[key] || []), ...ids]));
  });
  writeMap(map);
  return true;
};

export const applyLocalNotificationDeleteState = (notifications = [], user = {}) => {
  const localDeletedIds = getLocalDeletedIdsForUser(user);
  const userKeys = getNotificationDeleteUserKeys(user);

  return notifications
    .map((notification) => {
      const deletedBy = Array.isArray(notification.deletedBy)
        ? notification.deletedBy.map((item) => String(item))
        : [];
      const locallyDeleted = localDeletedIds.has(String(notification.id));
      const remotelyDeleted = userKeys.some((key) => deletedBy.includes(String(key)));

      if (!locallyDeleted && !remotelyDeleted) return notification;

      return {
        ...notification,
        deletedBy: Array.from(new Set([...deletedBy, ...userKeys].filter(Boolean))),
      };
    })
    .filter((notification) => {
      const deletedBy = Array.isArray(notification.deletedBy)
        ? notification.deletedBy.map((item) => String(item))
        : [];
      return !userKeys.some((key) => deletedBy.includes(String(key)));
    });
};
