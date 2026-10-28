import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile as updateFirebaseProfile,
  updateEmail,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from "firebase/auth";
import { auth } from "../firebase/firebaseConfig";
import {
  createUserProfile,
  ensureUserProfile,
  getUserProfile,
} from "./userService";
import {
  createBarangayAdminFallbackProfile,
  ensureBarangayAdminAccount,
  isValidBarangayAdminPassword,
  resolveBarangayAdminCredential,
  upsertBarangayAdminProfile,
} from "./adminSeedService";

export const listenToAuthChanges = (callback) => {
  return onAuthStateChanged(auth, callback);
};

export const registerResidentAccount = async (formData) => {
  console.log(
    "[registerResidentAccount] ===== STARTING RESIDENT ACCOUNT REGISTRATION =====",
  );
  console.log("[registerResidentAccount] Received formData:", formData);
  console.log(
    "[registerResidentAccount] Barangay in formData:",
    formData.barangay,
  );

  if (!formData.barangay) {
    console.error(
      "[registerResidentAccount] ERROR: Barangay is missing or empty!",
      {
        barangay: formData.barangay,
        type: typeof formData.barangay,
        keys: Object.keys(formData),
      },
    );
    throw new Error("Barangay is required for registration");
  }

  const email = String(formData.email || "")
    .trim()
    .toLowerCase();
  const firstName = String(formData.firstName || "").trim();
  const lastName = String(formData.lastName || "").trim();
  const name = formData.name || `${firstName} ${lastName}`.trim();
  const credential = await createUserWithEmailAndPassword(
    auth,
    email,
    formData.password,
  );

  console.log(
    "[registerResidentAccount] Firebase user created with UID:",
    credential.user.uid,
  );

  await updateFirebaseProfile(credential.user, {
    displayName: name,
    photoURL: formData.profilePicture || "",
  });

  const profileData = {
    ...formData,
    firstName,
    lastName,
    name,
    email,
    role: "resident",
    profilePicture: formData.profilePicture || "",
    barangay: formData.barangay, // EXPLICITLY SET BARANGAY
  };
  console.log(
    "[registerResidentAccount] Profile data before createUserProfile:",
    profileData,
  );
  console.log(
    "[registerResidentAccount] Barangay value:",
    profileData.barangay,
  );

  const profile = await createUserProfile(credential.user.uid, profileData);

  console.log(
    "[registerResidentAccount] Profile returned from createUserProfile:",
    profile,
  );
  console.log(
    "[registerResidentAccount] Barangay in returned profile:",
    profile.barangay,
  );
  console.log(
    "[registerResidentAccount] ===== RESIDENT ACCOUNT REGISTRATION COMPLETE =====",
  );
  return profile;
};

const RECOVERABLE_ADMIN_AUTH_CODES = [
  "auth/invalid-credential",
  "auth/wrong-password",
  "auth/user-not-found",
  "INVALID_LOGIN_CREDENTIALS",
  "INVALID_PASSWORD",
  "EMAIL_NOT_FOUND",
  "OPERATION_NOT_ALLOWED",
  "auth/operation-not-allowed",
  "auth/network-request-failed",
];

const isRecoverableAdminAuthError = (error) => {
  const code = String(error?.code || error?.message || "");
  return RECOVERABLE_ADMIN_AUTH_CODES.some((item) => code.includes(item));
};

const buildSignedInAdminProfile = async (firebaseUser, adminCredential) => {
  try {
    // Do not call createUserProfile here. Admin accounts already have seeded profiles,
    // and createUserProfile rewrites profilePicture/name with the default credential data.
    // upsertBarangayAdminProfile preserves the admin's saved photo, name, phone, bio,
    // notification preferences, and status across logout/login.
    return await upsertBarangayAdminProfile(firebaseUser.uid, adminCredential);
  } catch (profileError) {
    console.warn(
      `Admin signed in, but Firestore profile sync failed for ${adminCredential.barangay}. Using local profile for now.`,
      profileError,
    );
    return {
      ...createBarangayAdminFallbackProfile(adminCredential),
      uid: firebaseUser.uid,
      id: firebaseUser.uid,
      isAdminFallbackSession: false,
    };
  }
};

export const loginWithEmail = async (email, password) => {
  const rawIdentifier = String(email || "").trim();
  const adminCredential = await resolveBarangayAdminCredential(rawIdentifier);

  if (adminCredential) {
    const enteredPassword = String(password || "");
    const defaultPasswordMatch = isValidBarangayAdminPassword(
      adminCredential,
      enteredPassword,
    );

    try {
      // If the admin is still using the generated barangay password, make sure the Firebase account exists first.
      // If the password was already changed in Firebase, skip seeding and try the entered password directly.
      if (defaultPasswordMatch) {
        try {
          await ensureBarangayAdminAccount(adminCredential);
        } catch (seedError) {
          console.warn(
            `Admin seed skipped or failed for ${adminCredential.barangay}. Login will still try Firebase/fallback.`,
            seedError,
          );
        }
      }

      const credential = await signInWithEmailAndPassword(
        auth,
        adminCredential.email,
        enteredPassword,
      );

      return buildSignedInAdminProfile(credential.user, adminCredential);
    } catch (error) {
      if (defaultPasswordMatch && isRecoverableAdminAuthError(error)) {
        console.warn(
          `Firebase admin account for ${adminCredential.barangay} could not be signed in. Using prepared admin session fallback.`,
          error,
        );
        return createBarangayAdminFallbackProfile(adminCredential);
      }

      const wrongPasswordError = new Error(
        "Wrong admin password for this barangay account.",
      );
      wrongPasswordError.code = "ADMIN_WRONG_PASSWORD";
      throw wrongPasswordError;
    }
  }

  if (!rawIdentifier.includes("@")) {
    const error = new Error(
      "No administrator account was found for those credentials.",
    );
    error.code = "ADMIN_USERNAME_NOT_FOUND";
    throw error;
  }

  const loginEmail = rawIdentifier.toLowerCase();

  const credential = await signInWithEmailAndPassword(
    auth,
    loginEmail,
    password,
  );

  return ensureUserProfile(credential.user);
};

export const logoutFirebaseUser = () => signOut(auth);

export const getCurrentUserProfile = async () => {
  if (!auth.currentUser) return null;
  return getUserProfile(auth.currentUser.uid);
};

export const updateFirebaseAuthProfile = async ({ name, profilePicture }) => {
  if (!auth.currentUser) return;
  await updateFirebaseProfile(auth.currentUser, {
    displayName: name || auth.currentUser.displayName || "",
    photoURL: profilePicture || auth.currentUser.photoURL || "",
  });
};

export const updateFirebaseAuthEmail = async (email) => {
  if (!auth.currentUser) return;
  const normalizedEmail = String(email || "")
    .trim()
    .toLowerCase();
  if (normalizedEmail && normalizedEmail !== auth.currentUser.email) {
    await updateEmail(auth.currentUser, normalizedEmail);
  }
};

export const updateFirebaseAuthPassword = async ({
  currentPassword,
  newPassword,
}) => {
  const currentUser = auth.currentUser;
  if (!currentUser?.email) {
    const error = new Error(
      "No active Firebase account was found for password update.",
    );
    error.code = "AUTH_NO_ACTIVE_USER";
    throw error;
  }

  const password = String(newPassword || "");
  if (password.length < 8) {
    const error = new Error("New password must be at least 8 characters.");
    error.code = "AUTH_WEAK_LOCAL_PASSWORD";
    throw error;
  }

  const credential = EmailAuthProvider.credential(
    currentUser.email,
    String(currentPassword || ""),
  );

  await reauthenticateWithCredential(currentUser, credential);
  await updatePassword(currentUser, password);
};
