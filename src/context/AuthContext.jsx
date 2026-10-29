// AuthContext.jsx - REAL-TIME READY with loading screen
import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useCallback,
  useRef,
} from "react";
import {
  initializeStorage,
  getUsers,
  updateUser,
  USER_STATUS,
  getInitials,
} from "../utils/storage";
import {
  listenToAuthChanges,
  loginWithEmail,
  logoutFirebaseUser,
  registerResidentAccount,
  updateFirebaseAuthEmail,
  updateFirebaseAuthPassword,
  updateFirebaseAuthProfile,
} from "../services/authService";
import {
  ensureUserProfile,
  subscribeUserProfile,
  updateUserProfile,
} from "../services/userService";
import { getFriendlyFirebaseError } from "../utils/firebaseErrors";
import { applyModerationToUser } from "../utils/accountModeration";

const AuthContext = createContext();

const sanitizeUser = (user) => {
  if (!user) return null;
  const { password: _password, ...userWithoutPassword } = user;
  return userWithoutPassword;
};

const normalizeSessionUser = (profile) => {
  if (!profile) return null;
  if (profile.role && !["resident", "barangay_admin"].includes(profile.role)) {
    throw new Error("Your account has an unsupported role. Please contact your barangay administrator.");
  }
  const name = profile.name || profile.email || "Bayanihan User";
  const nameParts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const firstName = profile.firstName || nameParts[0] || "";
  const lastName = profile.lastName || nameParts.slice(1).join(" ") || "";
  const profilePicture = profile.profilePicture || profile.avatarUrl || "";

  return applyModerationToUser(
    sanitizeUser({
      ...profile,
      id: profile.id || profile.uid,
      uid: profile.uid || profile.id,
      name,
      firstName,
      lastName,
      email: String(profile.email || "")
        .trim()
        .toLowerCase(),
      phone: profile.phone || "",
      barangay: profile.barangay || "",
      role: profile.role || "resident",
      avatar: profile.avatar || getInitials(name),
      profilePicture,
      avatarUrl: profile.avatarUrl || profilePicture,
      bio: profile.bio || "",
      emergencyContacts: Array.isArray(profile.emergencyContacts)
        ? profile.emergencyContacts
        : [],
      status: profile.status || USER_STATUS.ACTIVE,
      warnings: Array.isArray(profile.warnings) ? profile.warnings : [],
      statusReason: profile.statusReason || "",
      latestWarning: profile.latestWarning || null,
      warningExpiresAt: profile.warningExpiresAt || "",
      warningSeverity: profile.warningSeverity || "",
      warningDurationHours: profile.warningDurationHours || "",
      lastWarningRemovalReason: profile.lastWarningRemovalReason || "",
      lastWarningRemovedAt: profile.lastWarningRemovedAt || "",
      suspensionSeverity: profile.suspensionSeverity || "",
      suspensionStartedAt: profile.suspensionStartedAt || "",
      suspensionEndsAt: profile.suspensionEndsAt || "",
      suspensionDurationDays: profile.suspensionDurationDays || "",
      lastRestoreReason: profile.lastRestoreReason || "",
      lastRestoredAt: profile.lastRestoredAt || "",
    }),
  );
};

const upsertLocalUserMirror = (profile) => {
  const sessionUser = normalizeSessionUser(profile);
  if (!sessionUser) return null;

  const users = getUsers();
  const existing = users.find(
    (item) =>
      item.id === sessionUser.id ||
      item.uid === sessionUser.uid ||
      item.email === sessionUser.email,
  );

  const mergedSessionUser = normalizeSessionUser({
    ...sessionUser,
    // A cached role must never override the role supplied by Firestore.
    role: sessionUser.role,
  });
  const localUser = { ...mergedSessionUser };

  const nextUsers = existing
    ? users.map((item) =>
        item.id === existing.id ||
        item.uid === existing.uid ||
        item.email === existing.email
          ? { ...item, ...localUser }
          : item,
      )
    : [...users, localUser];

  localStorage.setItem("users", JSON.stringify(nextUsers));
  localStorage.setItem("currentUser", JSON.stringify(mergedSessionUser));
  window.dispatchEvent(new Event("app-data-refresh"));

  return mergedSessionUser;
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const authMutation = useRef(false);
  const sessionVersion = useRef(0);

  // Restore Firebase session on mount
  useEffect(() => {
    initializeStorage();
    let disposed = false;
    const unsubscribe = listenToAuthChanges(async (firebaseUser) => {
      if (authMutation.current) return;
      const version = ++sessionVersion.current;
      const isCurrent = () => !disposed && version === sessionVersion.current && !authMutation.current;
      try {
        if (!firebaseUser) {
          if (!isCurrent()) return;
          setUser(null);
          setIsAuthenticated(false);
          localStorage.removeItem("currentUser");
          return;
        }
        const profile = await ensureUserProfile(firebaseUser);
        if (!isCurrent()) return;
        const sessionUser = upsertLocalUserMirror(profile);
        setUser(sessionUser);
        setIsAuthenticated(Boolean(sessionUser));
      } catch (error) {
        if (!isCurrent()) return;
        console.warn("Unable to restore Firebase session.", error);
        setUser(null);
        setIsAuthenticated(false);
        localStorage.removeItem("currentUser");
      } finally {
        if (isCurrent()) setIsLoading(false);
      }
    });
    return () => { disposed = true; ++sessionVersion.current; unsubscribe(); };

  }, []);

  // Auto-refresh moderation state (warnings/suspensions)
  useEffect(() => {
    const refreshModerationState = () => {
      setUser((current) => {
        if (!current) return current;
        const refreshed = applyModerationToUser(current);
        localStorage.setItem("currentUser", JSON.stringify(refreshed));
        return refreshed;
      });
    };

    window.addEventListener(
      "account-moderation-refresh",
      refreshModerationState,
    );
    const interval = window.setInterval(refreshModerationState, 60 * 1000);
    return () => {
      window.removeEventListener(
        "account-moderation-refresh",
        refreshModerationState,
      );
      window.clearInterval(interval);
    };
  }, []);

  // Live sync of user profile from Firestore (real-time)
  useEffect(() => {
    if (!user?.uid || user?.isAdminFallbackSession) return undefined;
    let disposed = false;
    const version = sessionVersion.current;
    const unsubscribe = subscribeUserProfile(
      user.uid,
      (profile) => {
        if (disposed || sessionVersion.current !== version || authMutation.current) return;
        if (!profile || !["resident", "barangay_admin"].includes(profile.role || "resident")) {
          setUser(null);
          setIsAuthenticated(false);
          localStorage.removeItem("currentUser");
          return;
        }
        const sessionUser = upsertLocalUserMirror(profile);
        setUser(sessionUser);
        setIsAuthenticated(Boolean(sessionUser));
      },
      (error) => {
        console.warn(
          "Unable to keep the current user profile live-synced.",
          error,
        );
      },
    );

    return () => { disposed = true; unsubscribe?.(); };
  }, [user?.uid, user?.isAdminFallbackSession]);

  // Login function
  const login = useCallback(async (email, password) => {
    authMutation.current = true;
    const version = ++sessionVersion.current;
    setIsSubmitting(true);

    try {
      const profile = await loginWithEmail(email, password);
      if (version !== sessionVersion.current) return { error: "Sign in was cancelled. Please sign in again." };
      const sessionUser = upsertLocalUserMirror(profile);
      setUser(sessionUser);
      setIsAuthenticated(true);
      return sessionUser;
    } catch (error) {
      if (version === sessionVersion.current) {
        setUser(null);
        setIsAuthenticated(false);
        localStorage.removeItem("currentUser");
      }
      return { error: getFriendlyFirebaseError(error) };
    } finally {
      if (version === sessionVersion.current) {
        authMutation.current = false;
        setIsSubmitting(false);
      }
    }
  }, []);

  // Logout function
  const logout = useCallback(async () => {
    ++sessionVersion.current;
    authMutation.current = false;
    setIsSubmitting(false);
    localStorage.removeItem("currentUser");

    try {
      await logoutFirebaseUser();
    } catch (error) {
      console.warn(
        "Firebase logout failed, clearing local session anyway.",
        error,
      );
    } finally {
      setUser(null);
      setIsAuthenticated(false);
      setIsLoading(false);
    }

    return true;
  }, []);

  // Admin preview is removed
  const loginAsAdminPreview = useCallback(async () => {
    return {
      error:
        "Admin preview has been removed. Please sign in through the unified login page using your assigned account.",
    };
  }, []);

  // Resident registration
  const register = useCallback(async (formData) => {
    authMutation.current = true;
    const version = ++sessionVersion.current;
    setIsSubmitting(true);
    try {
      const profile = await registerResidentAccount(formData);
      if (version !== sessionVersion.current) return { error: "Registration session was cancelled. Please sign in to continue." };
      const sessionUser = upsertLocalUserMirror(profile);
      setUser(sessionUser);
      setIsAuthenticated(true);
      return sessionUser;
    } catch (error) {
      if (version === sessionVersion.current) {
        setUser(null);
        setIsAuthenticated(false);
        localStorage.removeItem("currentUser");
      }
      return { error: getFriendlyFirebaseError(error) };
    } finally {
      if (version === sessionVersion.current) {
        authMutation.current = false;
        setIsSubmitting(false);
      }
    }
  }, []);

  // Update profile (both local and Firestore)
  const updateProfile = useCallback(
    async (updates) => {
      if (!user) return { error: "No active account found." };

      const normalizedUpdates = { ...updates };

      if (
        normalizedUpdates.profilePicture &&
        typeof normalizedUpdates.profilePicture === "object"
      ) {
        normalizedUpdates.avatarPublicId =
          normalizedUpdates.profilePicture.publicId ||
          normalizedUpdates.profilePicture.public_id ||
          normalizedUpdates.avatarPublicId ||
          "";
        normalizedUpdates.profilePicture =
          normalizedUpdates.profilePicture.url ||
          normalizedUpdates.profilePicture.secure_url ||
          "";
      }

      if (
        Object.prototype.hasOwnProperty.call(normalizedUpdates, "firstName") ||
        Object.prototype.hasOwnProperty.call(normalizedUpdates, "lastName")
      ) {
        const firstName = String(
          normalizedUpdates.firstName ?? user.firstName ?? "",
        ).trim();
        const lastName = String(
          normalizedUpdates.lastName ?? user.lastName ?? "",
        ).trim();
        normalizedUpdates.name =
          `${firstName} ${lastName}`.trim() || user.name || "Bayanihan User";
      }

      if (Object.prototype.hasOwnProperty.call(normalizedUpdates, "email")) {
        const normalizedEmail = String(normalizedUpdates.email || "")
          .trim()
          .toLowerCase();
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailPattern.test(normalizedEmail)) {
          return { error: "Please enter a valid email address." };
        }

        normalizedUpdates.email = normalizedEmail;
      }

      try {
        if (user.isAdminFallbackSession) {
          const sessionUser = upsertLocalUserMirror({
            ...user,
            ...normalizedUpdates,
          });
          updateUser(sessionUser.id, sessionUser);
          setUser(sessionUser);
          return sessionUser;
        }

        await updateFirebaseAuthProfile({
          name: normalizedUpdates.name || user.name,
          profilePicture: Object.prototype.hasOwnProperty.call(
            normalizedUpdates,
            "profilePicture",
          )
            ? normalizedUpdates.profilePicture || ""
            : user.profilePicture || user.avatarUrl || "",
        });

        const canUpdateFirebaseCredentials =
          !user.isAdminFallbackSession && user.role !== "barangay_admin";

        if (normalizedUpdates.email && normalizedUpdates.email !== user.email) {
          if (!canUpdateFirebaseCredentials) {
            return {
              error:
                "Official barangay administrator credentials are locked for security.",
            };
          }
          await updateFirebaseAuthEmail(normalizedUpdates.email);
        }

        const updatedProfile = await updateUserProfile(user.uid || user.id, {
          ...normalizedUpdates,
          role: user.role,
          status: user.status,
        });
        const sessionUser = upsertLocalUserMirror({
          ...updatedProfile,
          uid: updatedProfile?.uid || user.uid || user.id,
          id: updatedProfile?.id || user.id || user.uid,
        });

        updateUser(
          sessionUser.id || sessionUser.uid || sessionUser.email,
          sessionUser,
        );

        setUser(sessionUser);
        return sessionUser;
      } catch (error) {
        return { error: getFriendlyFirebaseError(error) };
      }
    },
    [user],
  );

  // Change password
  const changePassword = useCallback(
    async ({ currentPassword, newPassword, confirmPassword }) => {
      if (!user) return { error: "No active account found." };
      if (user.isAdminFallbackSession) {
        return {
          error:
            "This local fallback admin session cannot change password. Sign in with the deployed Firebase admin account to update the password.",
        };
      }
      if (!currentPassword)
        return { error: "Please enter your current password." };
      if (!newPassword || newPassword.length < 8)
        return { error: "New password must be at least 8 characters." };
      if (newPassword !== confirmPassword)
        return { error: "New password and confirmation do not match." };

      try {
        await updateFirebaseAuthPassword({ currentPassword, newPassword });
        return { success: true, message: "Password updated successfully." };
      } catch (error) {
        return { error: getFriendlyFirebaseError(error) };
      }
    },
    [user],
  );

  // --- CRITICAL: Show loading screen until session is fully restored ---
  if (isLoading) {
    return (
      <div
        className="auth-loading-screen"
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          fontSize: "1.2rem",
          backgroundColor: "var(--background)",
          color: "var(--foreground)",
        }}
      >
        Loading your account...
      </div>
    );
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        isSubmitting,
        login,
        loginAsAdminPreview,
        logout,
        register,
        updateProfile,
        changePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
