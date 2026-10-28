// AuthContext.jsx - REAL-TIME READY with loading screen
import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useCallback,
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

  const shouldPreserveAdminMirror =
    existing &&
    (existing.role === "barangay_admin" ||
      sessionUser.role === "barangay_admin");
  const preservedProfilePicture =
    sessionUser.profilePicture ||
    sessionUser.avatarUrl ||
    existing?.profilePicture ||
    existing?.avatarUrl ||
    "";
  const preservedName = sessionUser.name || existing?.name || "Bayanihan User";
  const forceRole =
    sessionUser.role === "barangay_admin" || existing?.role === "barangay_admin"
      ? "barangay_admin"
      : sessionUser.role;

  const mergedSessionUser = normalizeSessionUser({
    ...(existing || {}),
    ...sessionUser,
    ...(shouldPreserveAdminMirror
      ? {
          name: preservedName,
          firstName: sessionUser.firstName || existing?.firstName || "",
          lastName: sessionUser.lastName || existing?.lastName || "",
          phone: sessionUser.phone || existing?.phone || "",
          bio: sessionUser.bio || existing?.bio || "",
          profilePicture: preservedProfilePicture,
          avatarUrl: sessionUser.avatarUrl || preservedProfilePicture,
          avatarPublicId:
            sessionUser.avatarPublicId || existing?.avatarPublicId || "",
          notificationPreferences: Object.keys(
            sessionUser.notificationPreferences || {},
          ).length
            ? sessionUser.notificationPreferences
            : existing?.notificationPreferences || {},
        }
      : {}),
    id: sessionUser.id,
    uid: sessionUser.uid,
    role: forceRole,
    joinedDate:
      sessionUser.joinedDate ||
      existing?.joinedDate ||
      new Date().toISOString().split("T")[0],
  });

  const localUser = {
    ...(existing || {}),
    ...mergedSessionUser,
    role:
      sessionUser.role === "barangay_admin" ||
      existing?.role === "barangay_admin"
        ? "barangay_admin"
        : mergedSessionUser.role,
  };

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

  // Restore Firebase session on mount
  useEffect(() => {
    initializeStorage();
    const unsubscribe = listenToAuthChanges(async (firebaseUser) => {
      setIsLoading(true);

      try {
        if (!firebaseUser) {
          const savedUser = JSON.parse(
            localStorage.getItem("currentUser") || "null",
          );

          if (
            savedUser?.role === "barangay_admin" &&
            savedUser?.isAdminFallbackSession
          ) {
            const sessionUser = upsertLocalUserMirror(savedUser);
            setUser(sessionUser);
            setIsAuthenticated(Boolean(sessionUser));
          } else {
            setUser(null);
            setIsAuthenticated(false);
            localStorage.removeItem("currentUser");
          }

          setIsLoading(false);
          return;
        }

        const profile = await ensureUserProfile(firebaseUser);
        const sessionUser = upsertLocalUserMirror(profile);

        setUser(sessionUser);
        setIsAuthenticated(Boolean(sessionUser));
      } catch (error) {
        console.warn("Unable to restore Firebase session.", error);
        setUser(null);
        setIsAuthenticated(false);
        localStorage.removeItem("currentUser");
      } finally {
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
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

    const unsubscribe = subscribeUserProfile(
      user.uid,
      (profile) => {
        if (!profile) return;
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

    return () => unsubscribe?.();
  }, [user?.uid, user?.isAdminFallbackSession]);

  // Login function
  const login = useCallback(async (email, password) => {
    setIsLoading(true);

    try {
      const profile = await loginWithEmail(email, password);
      const sessionUser = upsertLocalUserMirror(profile);
      setUser(sessionUser);
      setIsAuthenticated(true);
      return sessionUser;
    } catch (error) {
      setUser(null);
      setIsAuthenticated(false);
      localStorage.removeItem("currentUser");
      return { error: getFriendlyFirebaseError(error) };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Logout function
  const logout = useCallback(async () => {
    setIsLoading(true);
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
    setIsLoading(true);
    console.log(
      "[AuthContext.register] ===== STARTING REGISTRATION FLOW =====",
    );
    console.log("[AuthContext.register] Form data:", formData);
    console.log("[AuthContext.register] Barangay value:", formData.barangay);

    try {
      console.log("[AuthContext.register] Calling registerResidentAccount...");
      const profile = await registerResidentAccount({
        ...formData,
        email: String(formData.email || "")
          .trim()
          .toLowerCase(),
      });
      console.log(
        "[AuthContext.register] ★ registerResidentAccount returned profile",
      );
      console.log("[AuthContext.register] Profile object:", profile);
      console.log(
        "[AuthContext.register] Barangay in returned profile:",
        profile.barangay,
      );

      console.log("[AuthContext.register] Calling upsertLocalUserMirror...");
      const sessionUser = upsertLocalUserMirror(profile);
      console.log(
        "[AuthContext.register] ★ upsertLocalUserMirror returned sessionUser",
      );
      console.log("[AuthContext.register] Session user object:", sessionUser);
      console.log(
        "[AuthContext.register] Barangay in session user:",
        sessionUser.barangay,
      );

      console.log("[AuthContext.register] Setting user state...");
      setUser(sessionUser);
      setIsAuthenticated(true);
      console.log("[AuthContext.register] ===== REGISTRATION COMPLETE =====");
      return sessionUser;
    } catch (error) {
      console.error(
        "[AuthContext.register] ✗ ERROR during registration:",
        error,
      );
      console.error("[AuthContext.register] Error message:", error.message);
      return { error: getFriendlyFirebaseError(error) };
    } finally {
      setIsLoading(false);
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
          ...normalizedUpdates,
          uid: updatedProfile?.uid || user.uid || user.id,
          id: updatedProfile?.id || user.id || user.uid,
          role: user.role,
          status: user.status,
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
