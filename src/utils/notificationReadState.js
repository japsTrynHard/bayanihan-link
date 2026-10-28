const STORAGE_KEY = "bayanihan_notification_read_state_v1";

const normalize = (value = "") => String(value || "").trim().toLowerCase();

export const getNotificationUserKeys = (user = {}) => [
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
  window.dispatchEvent(new Event("notification-read-refresh"));
};

export const getLocalReadIdsForUser = (user = {}) => {
  const map = readMap();
  const keys = getNotificationUserKeys(user);
  const ids = new Set();

  keys.forEach((key) => {
    (map[key] || []).forEach((id) => ids.add(String(id)));
  });

  return ids;
};

export const markLocalNotificationRead = (notificationId, user = {}) => {
  if (!notificationId) return false;
  const keys = getNotificationUserKeys(user);
  if (!keys.length) return false;

  const map = readMap();
  keys.forEach((key) => {
    map[key] = Array.from(new Set([...(map[key] || []), String(notificationId)]));
  });
  writeMap(map);
  return true;
};

export const markLocalNotificationsRead = (notificationIds = [], user = {}) => {
  const ids = notificationIds.filter(Boolean).map((id) => String(id));
  if (!ids.length) return false;
  const keys = getNotificationUserKeys(user);
  if (!keys.length) return false;

  const map = readMap();
  keys.forEach((key) => {
    map[key] = Array.from(new Set([...(map[key] || []), ...ids]));
  });
  writeMap(map);
  return true;
};

export const applyLocalNotificationReadState = (notifications = [], user = {}) => {
  const localReadIds = getLocalReadIdsForUser(user);
  const userKeys = getNotificationUserKeys(user);

  return notifications.map((notification) => {
    const readBy = Array.isArray(notification.readBy)
      ? notification.readBy.map((item) => String(item))
      : [];
    const locallyRead = localReadIds.has(String(notification.id));
    const remotelyRead = userKeys.some((key) => readBy.includes(String(key)));

    if (!locallyRead && !remotelyRead && !notification.read) return notification;

    return {
      ...notification,
      read: true,
      readBy: Array.from(new Set([...readBy, ...userKeys].filter(Boolean))),
    };
  });
};
