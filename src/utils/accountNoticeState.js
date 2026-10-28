import { USER_STATUS } from './storage';

const STORAGE_KEY = 'bayanihan_dismissed_account_notices_v1';
const WARNING_NOTICE_MAX_AGE_MS = 15 * 60 * 1000;
const SUSPENSION_NOTICE_MAX_AGE_MS = 30 * 60 * 1000;

const safeRead = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

const safeWrite = (value) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value || {}));
  } catch {
    // localStorage can fail in private mode; the notice will still auto-hide in memory.
  }
};

const normalizeStatus = (value = '') => String(value || USER_STATUS.ACTIVE).trim();

const getLatestWarningKeyPart = (user = {}) => {
  const warnings = Array.isArray(user.warnings) ? user.warnings : [];
  const latest = warnings[warnings.length - 1] || user.latestWarning || {};
  return latest.id || latest.createdAt || latest.message || '';
};

const getStatusTimestamp = (user = {}) =>
  user.moderationUpdatedAt ||
  user.updatedAt ||
  user.lastRestoredAt ||
  user.suspensionStartedAt ||
  getLatestWarningKeyPart(user) ||
  '';

export const getAccountNoticeKey = (user = {}) => {
  if (!user) return '';
  const identity = user.uid || user.id || user.email || 'resident';
  const status = normalizeStatus(user.status);
  const source = status === USER_STATUS.WARNED ? getLatestWarningKeyPart(user) || getStatusTimestamp(user) : getStatusTimestamp(user);
  const reason = user.statusReason || user.lastRestoreReason || '';
  return [identity, status, source, reason].filter(Boolean).join('::');
};

export const getAccountNoticeAgeMs = (user = {}) => {
  const raw = getStatusTimestamp(user);
  if (!raw) return Number.POSITIVE_INFINITY;
  const time = new Date(raw).getTime();
  if (Number.isNaN(time)) return Number.POSITIVE_INFINITY;
  return Date.now() - time;
};

export const shouldShowAccountNotice = (user = {}) => {
  const status = normalizeStatus(user?.status);
  if (![USER_STATUS.WARNED, USER_STATUS.SUSPENDED].includes(status)) return false;

  const key = getAccountNoticeKey(user);
  if (!key) return false;

  const dismissed = safeRead();
  if (dismissed[key]) return false;

  const age = getAccountNoticeAgeMs(user);
  const maxAge = status === USER_STATUS.SUSPENDED ? SUSPENSION_NOTICE_MAX_AGE_MS : WARNING_NOTICE_MAX_AGE_MS;
  return age <= maxAge;
};

export const dismissAccountNotice = (user = {}) => {
  const key = getAccountNoticeKey(user);
  if (!key) return;
  const dismissed = safeRead();
  dismissed[key] = new Date().toISOString();
  safeWrite(dismissed);
};

export const getAccountNoticeAutoHideMs = (user = {}) =>
  normalizeStatus(user?.status) === USER_STATUS.SUSPENDED ? 20000 : 12000;
