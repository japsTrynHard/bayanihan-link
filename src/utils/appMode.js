export const APP_ENV = import.meta.env.MODE || "development";

export const APP_MODES = {
  DEMO: "demo",
  FIREBASE: "firebase",
};

export const isTruthyEnv = (value) => ["1", "true", "yes", "on"].includes(String(value || "").trim().toLowerCase());

export const getAppMode = () => {
  const rawMode = import.meta.env.VITE_APP_MODE || import.meta.env.REACT_APP_MODE || APP_MODES.FIREBASE;
  const mode = String(rawMode || "").trim().toLowerCase();
  return Object.values(APP_MODES).includes(mode) ? mode : APP_MODES.FIREBASE;
};

export const isDemoMode = () => getAppMode() === APP_MODES.DEMO;
export const isFirebaseMode = () => getAppMode() === APP_MODES.FIREBASE;

export const isProductionBuild = () => APP_ENV === "production";

export const isLocalModuleResetEnabled = () => isTruthyEnv(import.meta.env.VITE_ENABLE_LOCAL_MODULE_RESET) || isDemoMode();

export const isFirestoreRulesNoticeEnabled = () => !isProductionBuild() || isTruthyEnv(import.meta.env.VITE_SHOW_FIRESTORE_RULES_NOTICE);

export const getBuildLabel = () => import.meta.env.VITE_APP_BUILD_LABEL || "Phase 1 Foundation Build";

export const getDeploymentReadinessItems = () => [
  { label: "Firebase Auth and Firestore configured", env: "VITE_FIREBASE_PROJECT_ID" },
  { label: "Cloudinary unsigned preset configured", env: "VITE_CLOUDINARY_UPLOAD_PRESET" },
  { label: "App mode configured", done: Boolean(getAppMode()) },
  { label: "Local module reset hidden unless demo mode or explicitly enabled", done: !isLocalModuleResetEnabled() || isDemoMode() },
  { label: "Theme supports light, dark, and system modes", done: true },
  { label: "Suspended users are blocked from posting, chatting, appointments, and reports", done: true },
  { label: "Admin scope is locked to assigned barangay", done: true },
  { label: "Admin audit log foundation is available", done: true },
].map((item) => ({
  ...item,
  done: typeof item.done === "boolean" ? item.done : Boolean(import.meta.env[item.env]),
}));
