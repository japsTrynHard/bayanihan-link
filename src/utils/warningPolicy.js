import { WARNING_SEVERITY_OPTIONS } from './accountModeration';

const STORAGE_KEY = 'bayanihan_warning_policy_v1';

const defaultPolicy = WARNING_SEVERITY_OPTIONS.reduce((acc, item) => {
  if (item.value !== 'custom') acc[item.value] = item.hours || 24;
  return acc;
}, {});

export const getWarningPolicy = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return { ...defaultPolicy, ...(parsed && typeof parsed === 'object' ? parsed : {}) };
  } catch {
    return { ...defaultPolicy };
  }
};

export const setWarningPolicy = (policy = {}) => {
  const cleaned = Object.entries({ ...defaultPolicy, ...policy }).reduce((acc, [key, value]) => {
    const hours = Number(value);
    acc[key] = Number.isFinite(hours) && hours > 0 ? hours : defaultPolicy[key] || 24;
    return acc;
  }, {});
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
  window.dispatchEvent(new Event('warning-policy-refresh'));
  return cleaned;
};

export const getWarningDurationForSeverity = (severity = 'minor') => {
  const policy = getWarningPolicy();
  const hours = Number(policy[severity]);
  if (Number.isFinite(hours) && hours > 0) return hours;
  return defaultPolicy[severity] || 24;
};

export const getDefaultWarningPolicy = () => ({ ...defaultPolicy });
