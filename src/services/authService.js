import {
  createUserWithEmailAndPassword,
  deleteUser,
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
import { resolveBarangayAdminCredential } from "./adminSeedService";

// Auth fires as soon as the Auth account is created. Hold observers until its
// complete resident profile is saved, so no empty-barangay profile can win a race.
let pendingRegistration = null;
export const listenToAuthChanges = (callback) => onAuthStateChanged(auth, async (user) => {
  if (user && pendingRegistration) await pendingRegistration;
  if (auth.currentUser?.uid === user?.uid || (!auth.currentUser && !user)) callback(user);
});

export const registerResidentAccount = async (formData) => {
  const barangay = String(formData.barangay || "").trim();
  if (!barangay) throw new Error("Barangay is required for registration.");
  const email = String(formData.email || "").trim().toLowerCase();
  const firstName = String(formData.firstName || "").trim();
  const lastName = String(formData.lastName || "").trim();
  const name = String(formData.name || `${firstName} ${lastName}`).trim();
  let finishRegistration;
  pendingRegistration = new Promise((resolve) => { finishRegistration = resolve; });
  let firebaseUser;
  try {
    const credential = await createUserWithEmailAndPassword(auth, email, formData.password);
    firebaseUser = credential.user;
    await updateFirebaseProfile(firebaseUser, { displayName: name, photoURL: formData.profilePicture || "" });
    return await createUserProfile(firebaseUser.uid, {
      ...formData, firstName, lastName, name, email, barangay, role: "resident",
    });
  } catch (error) {
    if (firebaseUser) {
      try { await deleteUser(firebaseUser); }
      catch { await signOut(auth); }
    }
    throw error;
  } finally {
    finishRegistration();
    pendingRegistration = null;
  }
};

export const loginWithEmail = async (identifier, password) => {
  const rawIdentifier = String(identifier || "").trim();
  // Usernames map to an email only. Authentication and role assignment always
  // come from Firebase, including when a default password has been changed.
  const adminCredential = rawIdentifier.includes("@")
    ? null
    : await resolveBarangayAdminCredential(rawIdentifier);
  const email = adminCredential?.email || rawIdentifier.toLowerCase();
  if (!email.includes("@")) {
    const error = new Error("No administrator account was found for those credentials.");
    error.code = "ADMIN_USERNAME_NOT_FOUND";
    throw error;
  }
  const credential = await signInWithEmailAndPassword(auth, email, password);
  try {
    return await ensureUserProfile(credential.user);
  } catch (error) {
    await signOut(auth);
    throw error;
  }
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
    photoURL: profilePicture ?? auth.currentUser.photoURL ?? "",
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
