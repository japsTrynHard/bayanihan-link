import { removeUndefined, toIso } from "../utils/firestoreData";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  getDocs,
  onSnapshot,
  arrayUnion,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import { getInitials, USER_STATUS } from "../utils/storage";
import {
  CLOUDINARY_FOLDERS,
  uploadImageToCloudinary,
} from "./cloudinaryService";

const USERS_COLLECTION = "users";


const splitName = (name = "") => {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return {
    firstName: parts[0] || "",
    lastName: parts.slice(1).join(" "),
  };
};

const buildFullName = (data = {}) => {
  const firstName = String(data.firstName || "").trim();
  const lastName = String(data.lastName || "").trim();
  const combined = `${firstName} ${lastName}`.trim();
  return (
    combined || data.name || data.displayName || data.email || "Bayanihan User"
  );
};

const normalizeEmergencyContacts = (contacts = []) => {
  if (!Array.isArray(contacts)) return [];
  return contacts
    .slice(0, 3)
    .map((contact, index) => ({
      id: contact.id || `emergency-contact-${index + 1}`,
      name: String(contact.name || "").trim(),
      relationship: String(contact.relationship || "").trim(),
      phone: String(contact.phone || "").trim(),
      priority: contact.priority || (index === 0 ? "Primary" : "Backup"),
      consent: contact.consent !== false,
    }))
    .filter((contact) => contact.name || contact.phone);
};

export const normalizeUserProfile = (uid, data = {}) => {
  const name = buildFullName(data);
  const derived = splitName(name);
  const firstName = String(data.firstName || derived.firstName || "").trim();
  const lastName = String(data.lastName || derived.lastName || "").trim();
  const avatar = data.avatar || getInitials(name);
  const profilePicture = data.profilePicture || data.avatarUrl || "";

  return {
    id: uid,
    uid,
    name,
    firstName,
    lastName,
    email: data.email || "",
    phone: data.phone || "",
    barangay: data.barangay || "",
    role: data.role || "resident",
    avatar,
    avatarUrl: data.avatarUrl || profilePicture,
    avatarPublicId: data.avatarPublicId || "",
    profilePicture,
    bio: data.bio || "",
    emergencyContacts: normalizeEmergencyContacts(data.emergencyContacts),
    joinedDate:
      data.joinedDate ||
      toIso(data.createdAt)?.split("T")[0] ||
      new Date().toISOString().split("T")[0],
    status: data.status || USER_STATUS.ACTIVE,
    warnings: Array.isArray(data.warnings) ? data.warnings : [],
    statusReason: data.statusReason || "",
    latestWarning: data.latestWarning || null,
    warningExpiresAt: toIso(data.warningExpiresAt),
    warningSeverity: data.warningSeverity || "",
    warningDurationHours: data.warningDurationHours || "",
    lastWarningRemovalReason: data.lastWarningRemovalReason || "",
    lastWarningRemovedAt: toIso(data.lastWarningRemovedAt),
    suspensionSeverity: data.suspensionSeverity || "",
    suspensionStartedAt: toIso(data.suspensionStartedAt),
    suspensionEndsAt: toIso(data.suspensionEndsAt),
    suspensionDurationDays: data.suspensionDurationDays || "",
    moderationUpdatedAt: toIso(data.moderationUpdatedAt),
    moderationUpdatedBy: data.moderationUpdatedBy || "",
    lastRestoreReason: data.lastRestoreReason || "",
    lastRestoredAt: toIso(data.lastRestoredAt),
    notificationPreferences: data.notificationPreferences || {},
    securityPreferences: data.securityPreferences || {},
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
  };
};

export const createUserProfile = async (uid, data = {}) => {

  if (!uid || !String(data.barangay || "").trim()) throw new Error("User ID and barangay are required.");

  const name = buildFullName(data);
  const derived = splitName(name);
  const firstName = String(data.firstName || derived.firstName || "").trim();
  const lastName = String(data.lastName || derived.lastName || "").trim();
  const profile = {
    uid,
    id: uid,
    name,
    firstName,
    lastName,
    email: String(data.email || "")
      .trim()
      .toLowerCase(),
    phone: data.phone || "",
    barangay: String(data.barangay || "").trim(), // ENSURE BARANGAY IS STRING AND TRIMMED
    role: "resident",
    avatar: data.avatar || getInitials(name || data.email || "User"),
    avatarUrl: data.avatarUrl || data.profilePicture || "",
    avatarPublicId: data.avatarPublicId || "",
    profilePicture: data.profilePicture || data.avatarUrl || "",
    bio: data.bio || "",
    emergencyContacts: normalizeEmergencyContacts(data.emergencyContacts),
    joinedDate: data.joinedDate || new Date().toISOString().split("T")[0],
    status: data.status || USER_STATUS.ACTIVE,
    warnings: Array.isArray(data.warnings) ? data.warnings : [],
    statusReason: data.statusReason || "",
    latestWarning: data.latestWarning || null,
    warningExpiresAt: toIso(data.warningExpiresAt),
    warningSeverity: data.warningSeverity || "",
    warningDurationHours: data.warningDurationHours || "",
    lastWarningRemovalReason: data.lastWarningRemovalReason || "",
    lastWarningRemovedAt: toIso(data.lastWarningRemovedAt),
    suspensionSeverity: data.suspensionSeverity || "",
    suspensionStartedAt: toIso(data.suspensionStartedAt),
    suspensionEndsAt: toIso(data.suspensionEndsAt),
    suspensionDurationDays: data.suspensionDurationDays || "",
    moderationUpdatedAt: toIso(data.moderationUpdatedAt),
    moderationUpdatedBy: data.moderationUpdatedBy || "",
    lastRestoreReason: data.lastRestoreReason || "",
    lastRestoredAt: toIso(data.lastRestoredAt),
    notificationPreferences: data.notificationPreferences || {},
    securityPreferences: data.securityPreferences || {},
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(doc(db, USERS_COLLECTION, uid), profile);
  const normalized = normalizeUserProfile(uid, profile);
  return normalized;
};

export const getUserProfile = async (uid) => {
  if (!uid) return null;
  const snapshot = await getDoc(doc(db, USERS_COLLECTION, uid));
  if (!snapshot.exists()) return null;
  return normalizeUserProfile(uid, snapshot.data());
};

export const ensureUserProfile = async (firebaseUser, fallbackData = {}) => {
  if (!firebaseUser?.uid) return null;
  const existing = await getUserProfile(firebaseUser.uid);
  if (existing) return existing;

  if (!String(fallbackData.barangay || "").trim()) {
    const error = new Error("Your account profile is incomplete. Please contact your barangay administrator to restore it.");
    error.code = "PROFILE_INCOMPLETE";
    throw error;
  }
  return createUserProfile(firebaseUser.uid, {
    ...fallbackData,
    name: firebaseUser.displayName || fallbackData.name || firebaseUser.email,
    email: firebaseUser.email || fallbackData.email,
    role: "resident",
    profilePicture: fallbackData.profilePicture || firebaseUser.photoURL || "",
  });
};


export const updateUserProfile = async (uid, updates = {}) => {
  if (!uid) throw new Error("Missing user ID.");

  const existing = await getUserProfile(uid);
  if (!existing) throw new Error("Your account profile no longer exists. Please contact your barangay administrator.");
  const editableFields = new Set([
    "name", "firstName", "lastName", "email", "phone", "barangay", "avatar",
    "avatarUrl", "avatarPublicId", "profilePicture", "bio", "emergencyContacts",
    "notificationPreferences", "securityPreferences",
  ]);
  const safeUpdates = Object.fromEntries(Object.entries(updates).filter(([key]) => editableFields.has(key)));

  if (safeUpdates.name) {
    safeUpdates.avatar = safeUpdates.avatar || getInitials(safeUpdates.name);
    const derived = splitName(safeUpdates.name);
    safeUpdates.firstName = safeUpdates.firstName || derived.firstName;
    safeUpdates.lastName = safeUpdates.lastName || derived.lastName;
  }

  if (
    Object.prototype.hasOwnProperty.call(safeUpdates, "firstName") ||
    Object.prototype.hasOwnProperty.call(safeUpdates, "lastName")
  ) {
    const firstName = String(
      safeUpdates.firstName ?? existing?.firstName ?? "",
    ).trim();
    const lastName = String(
      safeUpdates.lastName ?? existing?.lastName ?? "",
    ).trim();
    safeUpdates.name =
      `${firstName} ${lastName}`.trim() ||
      safeUpdates.name ||
      existing?.name ||
      "Bayanihan User";
    safeUpdates.avatar = safeUpdates.avatar || getInitials(safeUpdates.name);
  }

  if (Object.prototype.hasOwnProperty.call(safeUpdates, "email")) {
    safeUpdates.email = String(safeUpdates.email || "")
      .trim()
      .toLowerCase();
  }

  if (Object.prototype.hasOwnProperty.call(safeUpdates, "profilePicture")) {
    safeUpdates.avatarUrl = safeUpdates.profilePicture || "";
  }

  const payload = removeUndefined({
    ...safeUpdates,
    updatedAt: serverTimestamp(),
  });

  await updateDoc(doc(db, USERS_COLLECTION, uid), payload);
  return getUserProfile(uid);
};

export const updateUserAvatar = async (uid, file) => {
  const uploaded = await uploadImageToCloudinary(
    file,
    CLOUDINARY_FOLDERS.PROFILES,
  );
  await updateDoc(doc(db, USERS_COLLECTION, uid), {
    profilePicture: uploaded.url,
    avatarUrl: uploaded.url,
    avatarPublicId: uploaded.publicId,
    updatedAt: serverTimestamp(),
  });
  return getUserProfile(uid);
};

export const getUsersByBarangay = async (barangay) => {
  const usersQuery = query(
    collection(db, USERS_COLLECTION),
    where("barangay", "==", barangay),
  );
  const snapshot = await getDocs(usersQuery);
  return snapshot.docs.map((item) =>
    normalizeUserProfile(item.id, item.data()),
  );
};

export const subscribeUsersByBarangay = (barangay, callback, onError) => {
  if (!barangay) {
    callback([]);
    return () => {};
  }

  const usersQuery = query(
    collection(db, USERS_COLLECTION),
    where("barangay", "==", barangay),
  );

  return onSnapshot(
    usersQuery,
    (snapshot) => {
      callback(
        snapshot.docs.map((item) => normalizeUserProfile(item.id, item.data())),
      );
    },
    (error) => {
      console.error("Firestore users listener failed:", error);
      onError?.(error);
    },
  );
};

export const subscribeUserProfile = (uid, callback, onError) => {
  if (!uid) {
    callback(null);
    return () => {};
  }

  return onSnapshot(
    doc(db, USERS_COLLECTION, uid),
    (snapshot) => {
      callback(
        snapshot.exists()
          ? normalizeUserProfile(snapshot.id, snapshot.data())
          : null,
      );
    },
    (error) => {
      console.error("Firestore user profile listener failed:", error);
      onError?.(error);
    },
  );
};

export const addUserWarningInFirestore = async (uid, warning = {}) => {
  if (!uid) throw new Error("Missing user ID.");
  const warningRecord = {
    id: warning.id || `warning-${Date.now()}`,
    reason:
      warning.reason || warning.message || "Barangay admin issued a warning.",
    message:
      warning.message || warning.reason || "Barangay admin issued a warning.",
    severity: warning.severity || "minor",
    severityLabel: warning.severityLabel || "Minor warning",
    durationHours: warning.durationHours || 24,
    createdAt: warning.createdAt || new Date().toISOString(),
    warningExpiresAt:
      warning.warningExpiresAt ||
      warning.expiresAt ||
      new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    expiresAt:
      warning.expiresAt ||
      warning.warningExpiresAt ||
      new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    createdBy: warning.createdBy || "Barangay Admin",
    active: warning.active !== false,
  };

  await updateDoc(doc(db, USERS_COLLECTION, uid), {
    status: USER_STATUS.WARNED,
    statusReason: warningRecord.message,
    latestWarning: warningRecord,
    warningExpiresAt: warningRecord.warningExpiresAt,
    warningSeverity: warningRecord.severity,
    warningDurationHours: warningRecord.durationHours,
    warnings: arrayUnion(warningRecord),
    moderationUpdatedBy: warningRecord.createdBy,
    moderationUpdatedAt: new Date().toISOString(),
    updatedAt: serverTimestamp(),
  });

  return getUserProfile(uid);
};

export const updateUserStatus = async (uid, status, metadata = {}) => {
  if (!uid) throw new Error("Missing user ID.");

  const payload = removeUndefined({
    status,
    statusReason: metadata.reason || metadata.statusReason || "",
    latestWarning: metadata.latestWarning ?? undefined,
    warningExpiresAt: metadata.warningExpiresAt || "",
    warningSeverity: metadata.warningSeverity || "",
    warningDurationHours: metadata.warningDurationHours || "",
    lastWarningRemovalReason: metadata.lastWarningRemovalReason || "",
    lastWarningRemovedAt: metadata.lastWarningRemovedAt || "",
    suspensionSeverity: metadata.severity || metadata.suspensionSeverity || "",
    suspensionDurationDays:
      metadata.durationDays ?? metadata.suspensionDurationDays ?? "",
    suspensionStartedAt: metadata.suspensionStartedAt || "",
    suspensionEndsAt: metadata.suspensionEndsAt || "",
    lastRestoreReason: metadata.lastRestoreReason || "",
    lastRestoredAt: metadata.lastRestoredAt || "",
    moderationUpdatedBy: metadata.updatedBy || metadata.adminName || "",
    moderationUpdatedAt: new Date().toISOString(),
    updatedAt: serverTimestamp(),
  });

  if (status === USER_STATUS.ACTIVE) {
    payload.statusReason = "";
    payload.latestWarning = null;
    payload.warningExpiresAt = "";
    payload.warningSeverity = "";
    payload.warningDurationHours = "";
    payload.suspensionSeverity = "";
    payload.suspensionDurationDays = "";
    payload.suspensionStartedAt = "";
    payload.suspensionEndsAt = "";
    payload.lastRestoreReason =
      metadata.reason ||
      metadata.lastRestoreReason ||
      "Account restored by barangay admin.";
    payload.lastRestoredAt = new Date().toISOString();
  }

  await updateDoc(doc(db, USERS_COLLECTION, uid), payload);
  return getUserProfile(uid);
};
