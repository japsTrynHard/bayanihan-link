import { USER_STATUS } from "./storage";

const STORAGE_KEY = "bayanihan_account_moderation_v2";
const WARNING_DURATION_MS = 24 * 60 * 60 * 1000;

export const WARNING_SEVERITY_OPTIONS = [
  { value: "minor", label: "Minor warning", hours: 12, description: "Light reminder. Clears within the day." },
  { value: "moderate", label: "Moderate warning", hours: 24, description: "Repeated small issue. Clears after one day." },
  { value: "serious", label: "Serious warning", hours: 72, description: "Verified concern. Clears after three days." },
  { value: "critical", label: "Critical warning", hours: 168, description: "High-risk behavior. Clears after seven days." },
  { value: "custom", label: "Custom duration", hours: 24, description: "Admin chooses the duration." },
];

export const getWarningSeverityOption = (value = "minor") =>
  WARNING_SEVERITY_OPTIONS.find((item) => item.value === value) || WARNING_SEVERITY_OPTIONS[0];


const normalize = (value = "") => String(value || "").trim().toLowerCase();

export const getAccountIdentityKeys = (account = {}) => {
  const name = normalize(account?.name || account?.displayName || `${account?.firstName || ""} ${account?.lastName || ""}`.trim());
  const email = normalize(account?.email || "");

  return [
    account?.id,
    account?.uid,
    account?.userId,
    account?.authorId,
    account?.participantId,
    email,
    email ? `email:${email}` : "",
    name ? `name:${name}` : "",
  ]
    .filter(Boolean)
    .map((item) => String(item));
};

const readModerationMap = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

const writeModerationMap = (map) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map || {}));
  window.dispatchEvent(new Event("account-moderation-refresh"));
  window.dispatchEvent(new Event("app-data-refresh"));
};

const isFutureDate = (value) => {
  if (!value) return true;
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return true;
  return time > Date.now();
};

const getWarningExpiry = (warning = {}, fallbackUpdatedAt = "") => {
  const explicitExpiry = new Date(warning.warningExpiresAt || warning.expiresAt || "").getTime();
  if (!Number.isNaN(explicitExpiry)) return explicitExpiry;

  const startTime = new Date(warning.createdAt || fallbackUpdatedAt || 0).getTime();
  if (Number.isNaN(startTime) || startTime <= 0) return Date.now() + WARNING_DURATION_MS;
  return startTime + WARNING_DURATION_MS;
};

const getActiveWarnings = (warnings = [], fallbackUpdatedAt = "") => warnings.filter((warning) => warning?.active !== false && getWarningExpiry(warning, fallbackUpdatedAt) > Date.now());

const normalizeRecord = (record = {}) => {
  if (!record || typeof record !== "object") return null;

  const normalized = {
    ...record,
    warnings: Array.isArray(record.warnings) ? record.warnings : [],
    updatedAt: record.updatedAt || record.createdAt || new Date().toISOString(),
  };

  if (normalized.status === USER_STATUS.SUSPENDED && !isFutureDate(normalized.suspensionEndsAt)) {
    return {
      ...normalized,
      status: USER_STATUS.ACTIVE,
      previousStatus: USER_STATUS.SUSPENDED,
      suspensionExpired: true,
      statusReason: "",
      suspensionSeverity: "",
      suspensionDurationDays: "",
      suspensionStartedAt: "",
      suspensionEndsAt: "",
      lastRestoreReason: "Suspension period has ended.",
      lastRestoredAt: new Date().toISOString(),
    };
  }

  if (normalized.status === USER_STATUS.WARNED) {
    const activeWarnings = getActiveWarnings(normalized.warnings, normalized.updatedAt);
    if (!activeWarnings.length) {
      return {
        ...normalized,
        status: USER_STATUS.ACTIVE,
        previousStatus: USER_STATUS.WARNED,
        warningExpired: true,
        statusReason: "",
        latestWarning: null,
        warningExpiresAt: "",
        lastWarningExpiredAt: new Date().toISOString(),
      };
    }

    const latestActiveWarning = activeWarnings[activeWarnings.length - 1];
    return {
      ...normalized,
      warnings: activeWarnings,
      latestWarning: latestActiveWarning,
      statusReason: latestActiveWarning?.message || latestActiveWarning?.reason || normalized.statusReason || "Barangay admin warning.",
      warningExpiresAt: new Date(getWarningExpiry(latestActiveWarning, normalized.updatedAt)).toISOString(),
    };
  }

  if (normalized.status === USER_STATUS.ACTIVE) {
    return {
      ...normalized,
      statusReason: "",
      suspensionSeverity: "",
      suspensionDurationDays: "",
      suspensionStartedAt: "",
      suspensionEndsAt: "",
      latestWarning: null,
      warningExpiresAt: "",
    };
  }

  return normalized;
};

const pickNewestRecord = (records = []) => {
  const validRecords = records.map(normalizeRecord).filter(Boolean);
  if (!validRecords.length) return null;

  return validRecords.sort((a, b) => {
    const aTime = new Date(a.updatedAt || 0).getTime();
    const bTime = new Date(b.updatedAt || 0).getTime();
    return (Number.isNaN(bTime) ? 0 : bTime) - (Number.isNaN(aTime) ? 0 : aTime);
  })[0];
};

export const getLocalModerationRecord = (account = {}) => {
  const keys = getAccountIdentityKeys(account);
  if (!keys.length) return null;

  const map = readModerationMap();
  return pickNewestRecord(keys.map((key) => map[key]).filter(Boolean));
};

export const applyModerationToUser = (account = {}) => {
  if (!account) return account;

  const sourceRecord = normalizeRecord(account) || account;
  const localRecord = getLocalModerationRecord(sourceRecord);
  const record = localRecord || sourceRecord;

  return {
    ...account,
    ...record,
    status: record.status || account.status || USER_STATUS.ACTIVE,
    warnings: record.warnings?.length ? record.warnings : Array.isArray(account.warnings) ? account.warnings : [],
    statusReason: record.statusReason || "",
    latestWarning: record.latestWarning || null,
    warningExpiresAt: record.warningExpiresAt || "",
    warningSeverity: record.warningSeverity || "",
    warningDurationHours: record.warningDurationHours || "",
    lastWarningRemovalReason: record.lastWarningRemovalReason || account.lastWarningRemovalReason || "",
    lastWarningRemovedAt: record.lastWarningRemovedAt || account.lastWarningRemovedAt || "",
    suspensionSeverity: record.suspensionSeverity || account.suspensionSeverity || "",
    suspensionStartedAt: record.suspensionStartedAt || account.suspensionStartedAt || "",
    suspensionEndsAt: record.suspensionEndsAt || account.suspensionEndsAt || "",
    suspensionDurationDays: record.suspensionDurationDays ?? account.suspensionDurationDays ?? "",
    moderationUpdatedAt: record.updatedAt || account.moderationUpdatedAt || "",
    moderationUpdatedBy: record.updatedBy || account.moderationUpdatedBy || "",
    lastRestoreReason: record.lastRestoreReason || account.lastRestoreReason || "",
    lastRestoredAt: record.lastRestoredAt || account.lastRestoredAt || "",
  };
};

export const applyModerationToUsers = (users = []) => users.map((user) => applyModerationToUser(user));

export const saveLocalModerationRecord = (targetUser = {}, updates = {}) => {
  const keys = getAccountIdentityKeys({ ...targetUser, ...updates });
  if (!keys.length) return null;

  const currentRecord = getLocalModerationRecord(targetUser) || {};
  const record = normalizeRecord({
    ...currentRecord,
    id: updates.id || targetUser.id || targetUser.uid || currentRecord.id || "",
    uid: updates.uid || targetUser.uid || targetUser.id || currentRecord.uid || "",
    email: normalize(updates.email || targetUser.email || currentRecord.email || ""),
    name: updates.name || targetUser.name || currentRecord.name || "Resident",
    barangay: updates.barangay || targetUser.barangay || currentRecord.barangay || "",
    role: updates.role || targetUser.role || currentRecord.role || "resident",
    ...updates,
    warnings: Array.isArray(updates.warnings)
      ? updates.warnings
      : Array.isArray(currentRecord.warnings)
        ? currentRecord.warnings
        : Array.isArray(targetUser.warnings)
          ? targetUser.warnings
          : [],
    updatedAt: new Date().toISOString(),
  });

  const map = readModerationMap();
  keys.forEach((key) => {
    map[key] = record;
  });
  writeModerationMap(map);
  return record;
};

export const createWarningRecord = (targetUser = {}, reason = "", adminUser = null, options = {}) => {
  const createdAt = new Date().toISOString();
  const severityOption = getWarningSeverityOption(options.severity || "minor");
  const durationHours = Number(options.durationHours || options.hours || severityOption.hours || 24);
  const safeDurationHours = Number.isFinite(durationHours) && durationHours > 0 ? durationHours : 24;
  const warningExpiresAt = new Date(Date.now() + safeDurationHours * 60 * 60 * 1000).toISOString();
  const warning = {
    id: `warn-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    reason: reason || "Barangay admin issued a warning.",
    message: reason || "Barangay admin issued a warning.",
    severity: severityOption.value,
    severityLabel: severityOption.label,
    durationHours: safeDurationHours,
    createdAt,
    warningExpiresAt,
    expiresAt: warningExpiresAt,
    createdBy: adminUser?.name || "Barangay Admin",
    createdById: adminUser?.id || adminUser?.uid || "",
    active: true,
  };

  const current = applyModerationToUser(targetUser);
  const warnings = [...(current.warnings || []), warning];
  return {
    ...current,
    status: USER_STATUS.WARNED,
    statusReason: warning.message,
    warnings,
    latestWarning: warning,
    warningExpiresAt,
    warningSeverity: severityOption.value,
    warningDurationHours: safeDurationHours,
    updatedBy: adminUser?.name || "Barangay Admin",
  };
};

export const createWarningRemovalRecord = (targetUser = {}, reason = "", adminUser = null) => {
  const current = applyModerationToUser(targetUser);
  const removedAt = new Date().toISOString();
  const warnings = (current.warnings || []).map((warning) => ({
    ...warning,
    active: false,
    removedAt,
    removedBy: adminUser?.name || "Barangay Admin",
    removalReason: reason || "Warning removed by barangay admin.",
    warningExpiresAt: warning.warningExpiresAt || warning.expiresAt || removedAt,
  }));

  return {
    ...current,
    status: USER_STATUS.ACTIVE,
    statusReason: "",
    warnings,
    latestWarning: null,
    warningExpiresAt: "",
    warningSeverity: "",
    warningDurationHours: "",
    lastWarningRemovedAt: removedAt,
    lastWarningRemovalReason: reason || "Warning removed by barangay admin.",
    updatedBy: adminUser?.name || "Barangay Admin",
  };
};

export const createSuspensionRecord = (targetUser = {}, reason = "", adminUser = null, options = {}) => {
  const createdAt = new Date().toISOString();
  const durationDays = Number(options.durationDays || 0);
  const suspensionEndsAt = durationDays > 0
    ? new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString()
    : "";

  return {
    ...applyModerationToUser(targetUser),
    status: USER_STATUS.SUSPENDED,
    statusReason: reason || "Account suspended by barangay admin.",
    suspensionSeverity: options.severity || "moderate",
    suspensionDurationDays: durationDays || "indefinite",
    suspensionStartedAt: createdAt,
    suspensionEndsAt,
    updatedBy: adminUser?.name || "Barangay Admin",
  };
};

export const createActivationRecord = (targetUser = {}, reason = "", adminUser = null) => ({
  ...applyModerationToUser(targetUser),
  status: USER_STATUS.ACTIVE,
  // Keep the account clean after restore. The restore reason is stored separately and sent as a notification.
  statusReason: "",
  suspensionSeverity: "",
  suspensionDurationDays: "",
  suspensionStartedAt: "",
  suspensionEndsAt: "",
  latestWarning: null,
  warningExpiresAt: "",
  warningSeverity: "",
  warningDurationHours: "",
  lastWarningRemovedAt: new Date().toISOString(),
  lastWarningRemovalReason: reason || "Account restored by barangay admin.",
  lastRestoreReason: reason || "Account restored by barangay admin.",
  lastRestoredAt: new Date().toISOString(),
  updatedBy: adminUser?.name || "Barangay Admin",
});

export const getAccountStatusInfo = (account = {}, latestUsers = []) => {
  const keys = new Set(getAccountIdentityKeys(account).map((key) => String(key).toLowerCase()));
  const normalizedName = normalize(account?.name || account?.displayName || `${account?.firstName || ""} ${account?.lastName || ""}`.trim());
  const normalizedEmail = normalize(account?.email || "");

  const latest = latestUsers.find((item) => {
    const itemKeys = getAccountIdentityKeys(item).map((key) => String(key).toLowerCase());
    const keyMatch = itemKeys.some((key) => keys.has(key));
    if (keyMatch) return true;

    const itemName = normalize(item?.name || item?.displayName || `${item?.firstName || ""} ${item?.lastName || ""}`.trim());
    const itemEmail = normalize(item?.email || "");
    return (normalizedEmail && itemEmail && normalizedEmail === itemEmail) ||
      (normalizedName && itemName && normalizedName === itemName);
  });

  // Latest user records must win over stale participant snapshots from old chats.
  const merged = applyModerationToUser({ ...(account || {}), ...(latest || {}) });
  const status = merged.status || USER_STATUS.ACTIVE;

  return {
    ...merged,
    status,
    isSuspended: status === USER_STATUS.SUSPENDED,
    isWarned: status === USER_STATUS.WARNED,
    isActive: status === USER_STATUS.ACTIVE,
  };
};

export const getWarningExpiryText = (value) => {
  if (!value) return "expires within 24 hours";
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return "expires within 24 hours";
  if (time <= Date.now()) return "warning expired";
  const diffMs = time - Date.now();
  const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  const hours = Math.ceil((diffMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  if (days > 0) return `expires in ${days} day${days > 1 ? "s" : ""}${hours > 0 ? ` ${hours} hr` : ""}`;
  return `expires in ${Math.max(hours, 1)} hour${hours > 1 ? "s" : ""}`;
};

export const formatSuspensionUntil = (value) => {
  if (!value) return "until restored by the barangay admin";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "until restored by the barangay admin";
  return `until ${date.toLocaleString([], { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}`;
};

export const getSuspensionRemainingText = (value) => {
  if (!value) return "Indefinite suspension";
  const end = new Date(value).getTime();
  if (Number.isNaN(end)) return "Indefinite suspension";
  const diffMs = end - Date.now();
  if (diffMs <= 0) return "Suspension ended";
  const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  const hours = Math.ceil((diffMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  if (days > 0) return `${days} day${days > 1 ? "s" : ""} ${hours > 0 ? `${hours} hr` : ""} remaining`;
  return `${hours} hour${hours > 1 ? "s" : ""} remaining`;
};
