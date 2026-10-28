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
import {
  resolveBarangayAdminCredential,
  upsertBarangayAdminProfile,
} from "./adminSeedService";

const USERS_COLLECTION = "users";

const toIso = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value?.toDate === "function") return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  return String(value);
};

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
    id: data.id || uid,
    uid: data.uid || uid,
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
  console.log("[createUserProfile] ===== CREATING USER PROFILE =====");
  console.log("[createUserProfile] Input data:", data);
  console.log("[createUserProfile] Barangay from input:", data.barangay);

  if (!data.barangay) {
    console.warn(
      "[createUserProfile] WARNING: Barangay is missing from input data!",
    );
  }

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
    role: data.role || "resident",
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

  console.log(
    "[createUserProfile] Profile object BEFORE Firestore save:",
    JSON.stringify(profile, null, 2),
  );
  console.log(
    "[createUserProfile] Barangay value in profile object:",
    profile.barangay,
  );
  try {
    console.log("[createUserProfile] Calling setDoc with merge=true...");
    await setDoc(doc(db, USERS_COLLECTION, uid), profile, { merge: true });
    console.log(
      "[createUserProfile] ✓ Successfully saved profile to Firestore",
    );
    console.log(
      "[createUserProfile] Barangay saved to Firestore:",
      profile.barangay,
    );
  } catch (firestoreError) {
    console.error(
      "[createUserProfile] ✗ FIRESTORE ERROR saving profile:",
      firestoreError,
    );
    console.error("[createUserProfile] Error code:", firestoreError.code);
    console.error("[createUserProfile] Error message:", firestoreError.message);
    throw firestoreError;
  }
  const normalized = normalizeUserProfile(uid, profile);
  console.log(
    "[createUserProfile] Normalized profile:",
    JSON.stringify(normalized, null, 2),
  );
  console.log(
    "[createUserProfile] Barangay in normalized profile:",
    normalized.barangay,
  );
  console.log(
    "[createUserProfile] ===== USER PROFILE CREATED SUCCESSFULLY =====",
  );
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

  // If this auth user was just created, the registration flow may still be
  // writing the Firestore profile. Wait briefly and re-check to avoid
  // creating a placeholder profile that lacks `barangay` or proper name.
  try {
    const createdAt = firebaseUser?.metadata?.creationTime;
    if (createdAt) {
      const ageMs = Date.now() - new Date(createdAt).getTime();
      if (ageMs >= 0 && ageMs < 5000) {
        console.log(
          "[ensureUserProfile] Freshly-created auth user detected; delaying profile creation to avoid race.",
        );
        await new Promise((r) => setTimeout(r, 1600));
        const recheck = await getUserProfile(firebaseUser.uid);
        if (recheck) return recheck;
      }
    }
  } catch (err) {
    // ignore timing errors
  }

  // If a user record already exists in Firestore for this email (for example
  // seeded admin profiles), prefer that record to avoid creating a resident
  // placeholder that would overwrite admin data.
  try {
    const email = String(firebaseUser.email || "")
      .trim()
      .toLowerCase();
    if (email) {
      const usersByEmailQuery = query(
        collection(db, USERS_COLLECTION),
        where("email", "==", email),
      );
      const snapshot = await getDocs(usersByEmailQuery);
      if (!snapshot.empty) {
        const docSnap = snapshot.docs[0];
        return normalizeUserProfile(docSnap.id, docSnap.data());
      }
    }
  } catch (queryErr) {
    // ignore query errors and continue
  }

  // If this email is one of the seeded barangay admin credentials,
  // upsert an admin profile to ensure `role: "barangay_admin"` is set.
  try {
    const adminCred = await resolveBarangayAdminCredential(
      firebaseUser.email || "",
    );
    if (adminCred) {
      try {
        const adminProfile = await upsertBarangayAdminProfile(
          firebaseUser.uid,
          adminCred,
        );
        return normalizeUserProfile(firebaseUser.uid, adminProfile || {});
      } catch (adminErr) {
        console.warn(
          "[ensureUserProfile] upsert admin failed, falling back:",
          adminErr,
        );
      }
    }
  } catch (err) {
    // ignore resolver failures
  }

  return createUserProfile(firebaseUser.uid, {
    name: firebaseUser.displayName || fallbackData.name || firebaseUser.email,
    firstName:
      fallbackData.firstName ||
      splitName(firebaseUser.displayName || fallbackData.name || "").firstName,
    lastName:
      fallbackData.lastName ||
      splitName(firebaseUser.displayName || fallbackData.name || "").lastName,
    email: firebaseUser.email || fallbackData.email,
    phone: fallbackData.phone || "",
    barangay: fallbackData.barangay || "",
    role: fallbackData.role || "resident",
    profilePicture: fallbackData.profilePicture || firebaseUser.photoURL || "",
    bio: fallbackData.bio || "",
  });
};

const removeUndefined = (value) => {
  if (Array.isArray(value)) {
    return value
      .map((item) => removeUndefined(item))
      .filter((item) => item !== undefined);
  }

  if (value && typeof value === "object" && !(value instanceof Date)) {
    return Object.entries(value).reduce((acc, [key, item]) => {
      const cleaned = removeUndefined(item);
      if (cleaned !== undefined) acc[key] = cleaned;
      return acc;
    }, {});
  }

  return value === undefined ? undefined : value;
};

export const updateUserProfile = async (uid, updates = {}) => {
  if (!uid) throw new Error("Missing user ID.");

  const existing = await getUserProfile(uid);
  const safeUpdates = { ...updates };
  delete safeUpdates.uid;
  delete safeUpdates.id;
  delete safeUpdates.role;
  delete safeUpdates.status;
  delete safeUpdates.warnings;
  delete safeUpdates.createdAt;

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
    ...(existing
      ? {}
      : {
          uid,
          id: uid,
          role: updates.role || "resident",
          status: updates.status || USER_STATUS.ACTIVE,
          createdAt: serverTimestamp(),
        }),
    ...safeUpdates,
    updatedAt: serverTimestamp(),
  });

  await setDoc(doc(db, USERS_COLLECTION, uid), payload, { merge: true });
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
