import { USER_STATUS } from "./storage";
import { getAccountIdentityKeys, getAccountStatusInfo } from "./accountModeration";

const normalizeText = (value = "") => String(value || "").trim().toLowerCase();

export const ROLES = {
  RESIDENT: "resident",
  BARANGAY_ADMIN: "barangay_admin",
};

export const RESTRICTED_RESIDENT_ACTIONS = {
  CREATE_POST: "create_post",
  RESPOND_TO_POST: "respond_to_post",
  CREATE_CHAT: "create_chat",
  SEND_MESSAGE: "send_message",
  CREATE_APPOINTMENT: "create_appointment",
  CREATE_REPORT: "create_report",
};

export const ACTION_LABELS = {
  [RESTRICTED_RESIDENT_ACTIONS.CREATE_POST]: "create community posts",
  [RESTRICTED_RESIDENT_ACTIONS.RESPOND_TO_POST]: "respond to posts",
  [RESTRICTED_RESIDENT_ACTIONS.CREATE_CHAT]: "start chats",
  [RESTRICTED_RESIDENT_ACTIONS.SEND_MESSAGE]: "send chat messages",
  [RESTRICTED_RESIDENT_ACTIONS.CREATE_APPOINTMENT]: "request appointments",
  [RESTRICTED_RESIDENT_ACTIONS.CREATE_REPORT]: "submit reports",
};

export const SUSPENSION_BLOCKED_FEATURES = [
  { label: "Create community posts", detail: "Jobs, lost items, found items, and normal feed posts are locked." },
  { label: "Respond to posts", detail: "Interested/claim/job response actions are blocked." },
  { label: "Start or send chats", detail: "Existing conversations stay visible for review, but sending is disabled." },
  { label: "Request appointments", detail: "New barangay service requests are paused while suspended." },
  { label: "Submit normal reports", detail: "Report abuse is restricted until the account is restored." },
];

export const SUSPENSION_ALLOWED_FEATURES = [
  { label: "View notices and profile", detail: "You can still read barangay updates and your account status." },
  { label: "Emergency reporting", detail: "Critical emergency reporting remains available, but abuse is logged." },
  { label: "Receive restoration updates", detail: "You will be notified when the barangay admin restores access." },
];

export const getUserId = (user = {}) => user?.id || user?.uid || user?.userId || "";
export const getIdentityKeys = getAccountIdentityKeys;

export const uniqueTargets = (...groups) => [
  ...new Set(groups.flat().filter(Boolean).map((item) => String(item))),
];

export const isResident = (user = {}) => user?.role === ROLES.RESIDENT;
export const isBarangayAdmin = (user = {}) => user?.role === ROLES.BARANGAY_ADMIN;

export const isSuspendedStatus = (status) =>
  normalizeText(status) === normalizeText(USER_STATUS.SUSPENDED);

export const isWarnedStatus = (status) =>
  normalizeText(status) === normalizeText(USER_STATUS.WARNED);

export const isActiveStatus = (status) =>
  !status || normalizeText(status) === normalizeText(USER_STATUS.ACTIVE);

export const isSuspendedAccount = (account = {}, latestUsers = []) =>
  getAccountStatusInfo(account, latestUsers).isSuspended;

export const buildRestrictionMessage = (action, account = {}) => {
  const label = ACTION_LABELS[action] || action || "perform this action";
  const reason = account.statusReason ? ` Reason: ${account.statusReason}` : "";
  return `Your account is suspended, so you cannot ${label}. Blocked features: posts, post responses, chats, appointments, and normal reports. Emergency reporting remains available for real emergencies only. Please contact your barangay admin.${reason}`;
};

export const getSuspensionFeatureSummary = () => ({
  blocked: SUSPENSION_BLOCKED_FEATURES,
  allowed: SUSPENSION_ALLOWED_FEATURES,
});

export const canUserPerformResidentAction = (user, action, latestUsers = []) => {
  if (!user) {
    return { allowed: false, reason: "Please sign in before continuing." };
  }

  const statusInfo = getAccountStatusInfo(user, latestUsers);
  if (statusInfo.isSuspended) {
    return { allowed: false, reason: buildRestrictionMessage(action, statusInfo), statusInfo };
  }

  return { allowed: true, reason: "", statusInfo };
};

export const assertUserCanPerformResidentAction = (user, action, latestUsers = []) => {
  const decision = canUserPerformResidentAction(user, action, latestUsers);
  if (!decision.allowed) throw new Error(decision.reason);
  return true;
};

export const isSameBarangay = (item = {}, user = {}) =>
  Boolean(item?.barangay && user?.barangay && item.barangay === user.barangay);

export const canManageBarangayItem = (item = {}, user = {}) => {
  if (!item || !user) return false;

  if (isBarangayAdmin(user)) {
    return isSameBarangay(item, user);
  }

  const currentKeys = new Set(getIdentityKeys(user));
  const ownerKeys = uniqueTargets(
    getIdentityKeys(item?.author || {}),
    [item?.authorId, item?.userId, item?.createdById],
  );

  return ownerKeys.some((key) => currentKeys.has(String(key)));
};

export const lockBarangayForResident = (payload = {}, user = {}) => {
  if (!user) return payload;

  if (isResident(user)) {
    return { ...payload, barangay: user.barangay || payload.barangay || "" };
  }

  return { ...payload, barangay: payload.barangay || user.barangay || "" };
};

export const filterByBarangayScope = (items = [], user = {}, scope = "self") => {
  if (!Array.isArray(items) || !user) return [];
  if (isResident(user) && scope === "all") return items;
  return items.filter((item) => item?.barangay === user.barangay);
};
