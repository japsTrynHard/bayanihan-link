import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import { BARANGAYS, getInitials, USER_STATUS } from "../utils/storage";
import { getSanMiguelBarangaysForAdmin } from "./barangayService";

const ADMIN_EMAIL_DOMAIN = "bayanihanlink.app";
const ADMIN_SEED_FLAG = "bayanihan_admin_accounts_seeded_psgc_api_v1";
const ADMIN_SEED_SIGNATURE_KEY = "bayanihan_admin_accounts_seed_signature";

// Disable automatic admin seeding when this flag is set to "true" in env.
const AUTO_SEED_DISABLED =
  import.meta.env.VITE_DISABLE_AUTO_ADMIN_SEED === "true";

const normalizeForMatch = (value = "") =>
  String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
const normalizePasswordForMatch = (value = "") => normalizeForMatch(value);
const toSlug = (value = "") => normalizeForMatch(value) || "barangay";
const toTitleNoSpaces = (value = "") =>
  String(value).replace(/[^a-zA-Z0-9]/g, "");

const getAcceptedAdminPasswords = (credential) => {
  if (!credential) return [];

  const compactBarangay = toTitleNoSpaces(credential.barangay);
  const normalizedBarangay = normalizeForMatch(credential.barangay);

  return Array.from(
    new Set(
      [
        credential.password,
        `${compactBarangay}123`,
        `${normalizedBarangay}123`,
        `${credential.barangay}123`,
      ].filter(Boolean),
    ),
  );
};

export const getBarangayAdminCredentials = (barangayList = BARANGAYS) => {
  return barangayList
    .filter((barangay) => barangay.name !== "Select Barangay")
    .map((barangay) => {
      const compactName = toTitleNoSpaces(barangay.name);
      const slug = toSlug(barangay.name);

      return {
        barangayId: barangay.id,
        barangay: barangay.name,
        username: `${compactName}admin`,
        usernameWithSpace: `${barangay.name}admin`,
        password: `${compactName}123`,
        email: `${slug}.admin@${ADMIN_EMAIL_DOMAIN}`,
        firstName: barangay.name,
        lastName: "Admin",
        name: `${barangay.name} Admin`,
      };
    });
};

export const resolveBarangayAdminCredential = async (identifier = "") => {
  const text = String(identifier || "").trim();
  if (!text) return null;

  const barangayList = await getSanMiguelBarangaysForAdmin();
  const normalized = normalizeForMatch(text);
  const normalizedEmail = text.toLowerCase();

  return (
    getBarangayAdminCredentials(barangayList).find((credential) => {
      const acceptedIdentifiers = [
        credential.email,
        credential.username,
        credential.usernameWithSpace,
        `${credential.barangay} admin`,
        `${credential.barangay}-admin`,
        `${credential.barangay}_admin`,
        `${normalizeForMatch(credential.barangay)}admin`,
        `${toSlug(credential.barangay)}.admin@${ADMIN_EMAIL_DOMAIN}`,
      ];

      return acceptedIdentifiers.some((item) => {
        const candidate = String(item || "").trim();
        if (!candidate) return false;
        return (
          candidate.toLowerCase() === normalizedEmail ||
          normalizeForMatch(candidate) === normalized
        );
      });
    }) || null
  );
};

export const isValidBarangayAdminPassword = (credential, password = "") => {
  const normalizedInput = normalizePasswordForMatch(password);
  if (!credential || !normalizedInput) return false;

  return getAcceptedAdminPasswords(credential).some(
    (acceptedPassword) =>
      normalizePasswordForMatch(acceptedPassword) === normalizedInput,
  );
};

const getLocalAdminMirror = (credential, uid) => {
  if (typeof localStorage === "undefined" || !credential) return {};

  try {
    const users = JSON.parse(localStorage.getItem("users") || "[]");
    if (!Array.isArray(users)) return {};

    const targetUid = String(
      uid || `admin_${toSlug(credential.barangay)}`,
    ).toLowerCase();
    const targetEmail = String(credential.email || "").toLowerCase();
    const targetBarangay = String(credential.barangay || "").toLowerCase();

    return (
      users.find((record = {}) => {
        const keys = [record.id, record.uid, record.userId, record.email]
          .filter(Boolean)
          .map((item) => String(item).toLowerCase());

        return (
          keys.includes(targetUid) ||
          keys.includes(targetEmail) ||
          (record.role === "barangay_admin" &&
            String(record.barangay || "").toLowerCase() === targetBarangay)
        );
      }) || {}
    );
  } catch (error) {
    console.warn("Unable to read saved local admin profile mirror.", error);
    return {};
  }
};

export const createBarangayAdminFallbackProfile = (credential) => {
  if (!credential) return null;

  const uid = `admin_${toSlug(credential.barangay)}`;
  const existing = getLocalAdminMirror(credential, uid);
  const preservedName = existing.name || credential.name;
  const profilePicture = existing.profilePicture || existing.avatarUrl || "";

  return {
    uid: existing.uid || existing.id || uid,
    id: existing.id || existing.uid || uid,
    email: existing.email || credential.email,
    username: existing.username || credential.username,
    name: preservedName,
    firstName: existing.firstName || credential.firstName,
    lastName: existing.lastName || credential.lastName,
    phone: existing.phone || "",
    barangay: credential.barangay,
    role: "barangay_admin",
    avatar: existing.avatar || getInitials(preservedName),
    avatarUrl: existing.avatarUrl || profilePicture,
    avatarPublicId: existing.avatarPublicId || "",
    profilePicture,
    bio:
      existing.bio ||
      `Official administrator account for Barangay ${credential.barangay}.`,
    notificationPreferences: existing.notificationPreferences || {},
    joinedDate: existing.joinedDate || new Date().toISOString().split("T")[0],
    status: existing.status || USER_STATUS.ACTIVE,
    warnings: Array.isArray(existing.warnings) ? existing.warnings : [],
    isAdminFallbackSession: true,
  };
};

const authRestRequest = async (endpoint, body) => {
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
  if (!apiKey) throw new Error("Missing VITE_FIREBASE_API_KEY in .env.");

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/${endpoint}?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );

  const data = await response.json();
  if (!response.ok) {
    const error = new Error(
      data?.error?.message || "Firebase admin seed request failed.",
    );
    error.code = data?.error?.message;
    throw error;
  }
  return data;
};

const signUpAdminWithRest = (credential) => {
  return authRestRequest("accounts:signUp", {
    email: credential.email,
    password: credential.password,
    displayName: credential.name,
    returnSecureToken: true,
  });
};

const signInAdminWithRest = (credential) => {
  return authRestRequest("accounts:signInWithPassword", {
    email: credential.email,
    password: credential.password,
    returnSecureToken: true,
  });
};

export const upsertBarangayAdminProfile = async (uid, credential) => {
  if (!uid || !credential) return null;

  const userRef = doc(db, "users", uid);
  let existing = {};
  try {
    const existingSnap = await getDoc(userRef);
    existing = existingSnap.exists() ? existingSnap.data() : {};
  } catch (error) {
    console.warn(
      `Unable to read existing admin profile for ${credential.barangay}; safe defaults will be used.`,
      error,
    );
  }

  const preservedName = existing.name || credential.name;
  const profile = {
    uid,
    id: uid,
    email: credential.email,
    username: credential.username,
    name: preservedName,
    firstName: existing.firstName || credential.firstName,
    lastName: existing.lastName || credential.lastName,
    phone: existing.phone || "",
    barangay: credential.barangay,
    role: "barangay_admin",
    avatar: existing.avatar || getInitials(preservedName),
    avatarUrl: existing.avatarUrl || existing.profilePicture || "",
    avatarPublicId: existing.avatarPublicId || "",
    profilePicture: existing.profilePicture || existing.avatarUrl || "",
    bio:
      existing.bio ||
      `Official administrator account for Barangay ${credential.barangay}.`,
    notificationPreferences: existing.notificationPreferences || {},
    joinedDate: existing.joinedDate || new Date().toISOString().split("T")[0],
    status: existing.status || USER_STATUS.ACTIVE,
    warnings: Array.isArray(existing.warnings) ? existing.warnings : [],
    updatedAt: serverTimestamp(),
  };

  await setDoc(
    userRef,
    {
      ...profile,
      createdAt: existing.createdAt || serverTimestamp(),
    },
    { merge: true },
  );

  return profile;
};

export const ensureBarangayAdminAccount = async (credential) => {
  if (!credential) return null;
  if (AUTO_SEED_DISABLED) {
    console.info(
      `ensureBarangayAdminAccount: automatic admin seeding disabled by VITE_DISABLE_AUTO_ADMIN_SEED; skipping for ${credential.barangay}`,
    );
    return null;
  }

  let result;
  try {
    result = await signUpAdminWithRest(credential);
  } catch (error) {
    if (String(error.code || "").includes("EMAIL_EXISTS")) {
      result = await signInAdminWithRest(credential);
    } else {
      throw error;
    }
  }

  try {
    await upsertBarangayAdminProfile(result.localId, credential);
  } catch (error) {
    // If Firestore rules block unauthenticated setup, login can still continue.
    // authService will write the admin profile again after Firebase Auth sign in.
    console.warn(
      `Admin profile pre-seed skipped for ${credential.barangay}.`,
      error,
    );
  }
  return { uid: result.localId, ...credential };
};

export const ensureBarangayAdminAccounts = async ({ force = false } = {}) => {
  if (AUTO_SEED_DISABLED) {
    console.info(
      "ensureBarangayAdminAccounts: automatic admin seeding disabled by VITE_DISABLE_AUTO_ADMIN_SEED; skipping all seeding.",
    );
    return { skipped: true, created: 0, existing: 0, failed: 0 };
  }
  const barangayList = await getSanMiguelBarangaysForAdmin();
  const credentials = getBarangayAdminCredentials(barangayList);
  const signature = credentials.map((item) => item.barangay).join("|");

  if (
    !force &&
    localStorage.getItem(ADMIN_SEED_FLAG) === "done" &&
    localStorage.getItem(ADMIN_SEED_SIGNATURE_KEY) === signature
  ) {
    return { skipped: true, created: 0, existing: 0, failed: 0 };
  }
  let created = 0;
  let existing = 0;
  let failed = 0;

  for (const credential of credentials) {
    try {
      try {
        const result = await signUpAdminWithRest(credential);
        created += 1;
        await upsertBarangayAdminProfile(result.localId, credential);
      } catch (error) {
        if (String(error.code || "").includes("EMAIL_EXISTS")) {
          const result = await signInAdminWithRest(credential);
          existing += 1;
          await upsertBarangayAdminProfile(result.localId, credential);
        } else {
          throw error;
        }
      }
    } catch (error) {
      failed += 1;
      console.warn(
        `Unable to seed admin account for ${credential.barangay}.`,
        error,
      );
    }
  }

  if (failed === 0) {
    localStorage.setItem(ADMIN_SEED_FLAG, "done");
    localStorage.setItem(ADMIN_SEED_SIGNATURE_KEY, signature);
  }

  return { skipped: false, created, existing, failed };
};

export const getAdminCredentialGuide = async () => {
  const barangayList = await getSanMiguelBarangaysForAdmin();
  return getBarangayAdminCredentials(barangayList).map((credential) => ({
    barangay: credential.barangay,
    username: credential.username,
    password: credential.password,
    email: credential.email,
  }));
};
