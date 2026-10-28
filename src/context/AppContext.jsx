// AppContext.jsx - FULL REAL-TIME VERSION
import React, { createContext, useState, useContext, useEffect } from "react";
import { useAuth } from "./AuthContext";
import {
  getUsers,
  getPosts,
  getChats,
  addMessage as storageAddMessage,
  getNotifications,
  addNotification as storageAddNotification,
  markNotificationRead as storageMarkNotificationRead,
  markManyNotificationsRead as storageMarkManyNotificationsRead,
  deleteNotificationForTargets as storageDeleteNotificationForTargets,
  deleteManyNotificationsForTargets as storageDeleteManyNotificationsForTargets,
  getEmergencies,
  createEmergency as storageCreateEmergency,
  updateEmergency as storageUpdateEmergency,
  getBarangays,
  getAppointments,
  createAppointment as storageCreateAppointment,
  updateAppointment as storageUpdateAppointment,
  getAnnouncements,
  createAnnouncement as storageCreateAnnouncement,
  updateAnnouncement as storageUpdateAnnouncement,
  deleteAnnouncement as storageDeleteAnnouncement,
  getReports,
  createReport as storageCreateReport,
  updateReport as storageUpdateReport,
  upsertReport as storageUpsertReport,
  addUserWarning as storageAddUserWarning,
  setUserStatus as storageSetUserStatus,
  createChat as storageCreateChat,
  getOrCreateChat as storageGetOrCreateChat,
  updateChat as storageUpdateChat,
  updateChatMessage as storageUpdateChatMessage,
  markChatRead as storageMarkChatRead,
  resetStorageToDemo,
  initializeStorage,
  USER_STATUS,
  JOB_POST_STATUS,
  LOST_FOUND_STATUS,
  LOST_FOUND_STATUS_OPTIONS,
  EMERGENCY_STATUS,
  EMERGENCY_STATUS_OPTIONS,
  APPOINTMENT_STATUS,
  APPOINTMENT_STATUS_OPTIONS,
  REPORT_STATUS,
  appendReportEvidence,
  findActiveDuplicateReport,
  normalizeEmergency,
  normalizeAppointment,
  normalizeReport,
} from "../utils/storage";
import {
  fetchSanMiguelBarangays,
  getCachedSanMiguelBarangays,
} from "../services/barangayService";
import {
  createPostInFirestore,
  createPostResponseInFirestore,
  deletePostFromFirestore,
  normalizeFirestorePost,
  subscribePostsForUser,
  updatePostInFirestore,
} from "../services/postService";

import {
  createAnnouncementInFirestore,
  createAppointmentInFirestore,
  createEmergencyInFirestore,
  createNotificationInFirestore,
  deleteAnnouncementFromFirestore,
  markManyNotificationsReadInFirestore,
  markNotificationReadInFirestore,
  deleteNotificationForUserInFirestore,
  deleteManyNotificationsForUserInFirestore,
  subscribeAnnouncementsForUser,
  subscribeAppointmentsForUser,
  subscribeEmergenciesForUser,
  subscribeNotificationsForUser,
  updateAnnouncementInFirestore,
  updateAppointmentInFirestore,
  updateEmergencyInFirestore,
} from "../services/coreService";

import {
  addMessageToChatInFirestore,
  createChatInFirestore,
  createOrGetChatInFirestore,
  markChatReadInFirestore,
  subscribeChatsForUser,
  updateChatInFirestore,
  updateChatMessageInFirestore,
} from "../services/chatService";

import {
  createReportInFirestore,
  subscribeReportsForUser,
  updateReportInFirestore,
} from "../services/reportService";

import {
  addUserWarningInFirestore,
  subscribeUsersByBarangay,
  updateUserStatus as updateUserStatusInFirestore,
} from "../services/userService";
import {
  CLOUDINARY_FOLDERS,
  uploadImageToCloudinary,
} from "../services/cloudinaryService";
import { safeCreateAuditLog } from "../services/auditLogService";
import {
  RESTRICTED_RESIDENT_ACTIONS,
  assertUserCanPerformResidentAction,
  canUserPerformResidentAction,
} from "../utils/accessControl";
import {
  applyModerationToUser,
  applyModerationToUsers,
  createActivationRecord,
  createSuspensionRecord,
  createWarningRecord,
  createWarningRemovalRecord,
  formatSuspensionUntil,
  getAccountIdentityKeys,
  saveLocalModerationRecord,
} from "../utils/accountModeration";
import {
  applyLocalNotificationReadState,
  markLocalNotificationRead,
  markLocalNotificationsRead,
} from "../utils/notificationReadState";
import {
  applyLocalNotificationDeleteState,
  markLocalNotificationDeleted,
  markLocalNotificationsDeleted,
} from "../utils/notificationDeleteState";
import {
  findPotentialDuplicateEmergencies,
  scoreEmergencySeverity,
} from "../utils/emergencyIntelligence";
import {
  getLostFoundHomeBarangay,
  getLostFoundIncidentBarangay,
  getTopLostFoundMatches,
} from "../utils/lostFoundMatching";
import {
  getLostFoundCaseLabel,
  getLostFoundCaseType,
  isMissingPersonCase,
} from "../utils/lostFoundCases";
import {
  buildSmartNotificationPayload,
  isNotificationExpired,
  sortNotificationsSmart,
} from "../utils/notificationAutomation";
import {
  buildAppointmentReference,
  buildCheckInCode,
  DEFAULT_BARANGAY_SCHEDULE,
  findDuplicateActiveAppointment,
  getServiceById,
  validateAppointmentRequest,
} from "../utils/appointmentLogic";

const AppContext = createContext();

// ----- Helper functions (unchanged) -----
const getUserTargetIds = (account = {}) => {
  return [
    account.id,
    account.uid,
    account.userId,
    account.authorId,
    account.email,
  ]
    .filter(Boolean)
    .map((item) => String(item));
};

const uniqueTargets = (...groups) => [
  ...new Set(
    groups
      .flat()
      .filter(Boolean)
      .map((item) => String(item)),
  ),
];

const mergeRecordsById = (...groups) => {
  const map = new Map();
  groups
    .flat()
    .filter(Boolean)
    .forEach((record) => {
      const key =
        record?.id || record?.uid || record?.email || `record-${map.size}`;
      const existing = map.get(key) || {};
      const existingTime = new Date(
        existing.updatedAtIso ||
          existing.updatedAt ||
          existing.createdAtIso ||
          existing.createdAt ||
          0,
      ).getTime();
      const recordTime = new Date(
        record.updatedAtIso ||
          record.updatedAt ||
          record.createdAtIso ||
          record.createdAt ||
          0,
      ).getTime();
      map.set(
        key,
        Number.isFinite(recordTime) &&
          recordTime >= (Number.isFinite(existingTime) ? existingTime : 0)
          ? { ...existing, ...record }
          : { ...record, ...existing },
      );
    });
  return [...map.values()];
};

const getRecordTime = (record = {}) => {
  const raw =
    record.createdAtIso ||
    record.createdAt ||
    record.requestedAtIso ||
    record.updatedAtIso ||
    record.updatedAt ||
    record.timestamp ||
    record.lastMessageAt ||
    0;
  const time = new Date(raw).getTime();
  return Number.isNaN(time) ? 0 : time;
};

const sortNewestFirst = (items = []) =>
  [...items].sort((a, b) => getRecordTime(b) - getRecordTime(a));
const sortOldestFirst = (items = []) =>
  [...items].sort((a, b) => getRecordTime(a) - getRecordTime(b));
const sortRecentActivity = (items = []) =>
  [...items].sort((a, b) => {
    const aTime = new Date(
      a.lastMessageAt || a.lastContextAt || a.updatedAt || a.createdAt || 0,
    ).getTime();
    const bTime = new Date(
      b.lastMessageAt || b.lastContextAt || b.updatedAt || b.createdAt || 0,
    ).getTime();
    return (
      (Number.isNaN(bTime) ? 0 : bTime) - (Number.isNaN(aTime) ? 0 : aTime)
    );
  });
const sortMessagesFIFO = (messages = []) => sortOldestFirst(messages);

const withOperationTimeout = (promise, message, timeoutMs = 20000) => {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
};

const normalizeChatForState = (chat = {}) => ({
  ...chat,
  messages: sortMessagesFIFO(Array.isArray(chat.messages) ? chat.messages : []),
});
const normalizeChatListForState = (items = []) =>
  sortRecentActivity(items.map(normalizeChatForState));
const getIdentityKeys = (account = {}) =>
  uniqueTargets(getUserTargetIds(account), [
    account.uid,
    account.id,
    account.email,
  ]);

const chatHasParticipant = (chat = {}, account = {}) => {
  const keys = new Set(getIdentityKeys(account));
  const chatKeys = uniqueTargets(
    chat.participants || [],
    chat.participantKeys || [],
    (chat.participantProfiles || []).flatMap((profile) =>
      getIdentityKeys(profile),
    ),
  );
  return chatKeys.some((key) => keys.has(String(key)));
};

const chatHasBothParticipants = (chat = {}, first = {}, second = {}) =>
  chatHasParticipant(chat, first) && chatHasParticipant(chat, second);

const notificationVisibleToUser = (notification, currentUser) => {
  if (!currentUser) return false;
  const hasUserTargets =
    Array.isArray(notification.targetUserIds) &&
    notification.targetUserIds.length > 0;
  const currentTargets = getUserTargetIds(currentUser);
  const userDirectMatch = hasUserTargets
    ? notification.targetUserIds
        .map((item) => String(item))
        .some((target) => currentTargets.includes(target))
    : false;
  const deletedTargets = Array.isArray(notification.deletedBy)
    ? notification.deletedBy.map((item) => String(item))
    : [];
  const userDeleted = currentTargets.some((target) =>
    deletedTargets.includes(target),
  );
  if (userDeleted) return false;
  const roleMatch = notification.targetRole
    ? notification.targetRole === currentUser.role
    : true;
  if (hasUserTargets) return userDirectMatch && roleMatch;
  const targetBarangays = Array.isArray(notification.targetBarangays)
    ? notification.targetBarangays.filter(Boolean)
    : [];
  const barangayMatch = targetBarangays.length
    ? targetBarangays.includes(currentUser.barangay)
    : notification.targetBarangay
      ? notification.targetBarangay === currentUser.barangay
      : true;
  return roleMatch && barangayMatch;
};

const announcementVisibleToUser = (announcement = {}, currentUser = {}) => {
  if (!currentUser) return false;
  const status = String(announcement.status || "Published").toLowerCase();
  const expiresAt = announcement.expiresAt
    ? new Date(announcement.expiresAt).getTime()
    : 0;
  const expired =
    expiresAt && !Number.isNaN(expiresAt) && expiresAt < Date.now();
  if (
    currentUser.role === "barangay_admin" &&
    (announcement.createdById === currentUser.id ||
      announcement.barangay === currentUser.barangay)
  )
    return true;
  if (
    currentUser.role !== "barangay_admin" &&
    (status === "draft" || status === "archived" || expired)
  )
    return false;
  const targetMode = announcement.targetMode || "barangay";
  const targetBarangays = Array.isArray(announcement.targetBarangays)
    ? announcement.targetBarangays.filter(Boolean)
    : [];
  if (targetMode === "all") return true;
  if (targetMode === "specific")
    return targetBarangays.includes(currentUser.barangay);
  return (
    (announcement.barangay || targetBarangays[0] || "") === currentUser.barangay
  );
};

const normalizeNotificationList = (items = [], currentUser = null) => {
  const baseItems = Array.isArray(items) ? items : [];
  const locallyDeletedFiltered = applyLocalNotificationDeleteState(
    baseItems,
    currentUser,
  );
  return sortNotificationsSmart(
    applyLocalNotificationReadState(locallyDeletedFiltered, currentUser),
  );
};

export function AppProvider({ children }) {
  const { user: currentUser } = useAuth();
  // All state variables start empty
  const [users, setUsers] = useState([]);
  const [allPosts, setAllPosts] = useState([]);
  const [chats, setChats] = useState([]);
  const [allNotifications, setAllNotifications] = useState([]);
  const [emergencies, setEmergencies] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [reports, setReports] = useState([]);
  const [barangays, setBarangays] = useState(
    () => getCachedSanMiguelBarangays().barangays || getBarangays(),
  );
  const [barangaySource, setBarangaySource] = useState(
    () => getCachedSanMiguelBarangays().source || "fallback-static",
  );
  const [selectedBarangay, setSelectedBarangay] = useState("");
  const [barangayFilterMode, setBarangayFilterMode] = useState("self");
  const [searchQuery, setSearchQuery] = useState("");

  // ----- Helper functions (unchanged) -----
  const getUserBarangay = (currentUser) => currentUser?.barangay || "";
  const resolveBarangayScope = (currentUser, overrideMode) => {
    if (!currentUser) return null;
    const mode = overrideMode !== undefined ? overrideMode : barangayFilterMode;
    if (currentUser.role === "resident")
      return mode === "all" ? "all" : getUserBarangay(currentUser);
    return getUserBarangay(currentUser);
  };

  const filterByBarangay = (items, currentUser, options = {}) => {
    if (!Array.isArray(items) || !currentUser) return [];
    const scope = resolveBarangayScope(currentUser, options.barangayFilterMode);
    if (scope === "all") return items;
    return items.filter((item) => {
      // Community-wide posts should always be visible regardless of scope
      if (item.isAllBarangays === true) return true;
      if (["lost", "found"].includes(item?.type)) {
        const incidentBarangay = getLostFoundIncidentBarangay(item);
        const homeBarangay = getLostFoundHomeBarangay(item);
        const isOwnItem =
          item?.author?.id &&
          currentUser?.id &&
          item.author.id === currentUser.id;
        return (
          isOwnItem || incidentBarangay === scope || homeBarangay === scope
        );
      }
      if (item?.type === "job") {
        const workBarangay =
          item.workBarangay ||
          item.jobBarangay ||
          item.serviceBarangay ||
          item.handlerBarangay ||
          item.barangay;
        const homeBarangay =
          item.homeBarangay ||
          item.author?.barangay ||
          item.authorBarangay ||
          item.barangay;
        const coverageBarangays = Array.isArray(item.coverageBarangays)
          ? item.coverageBarangays
          : [];
        const supportBarangays = Array.isArray(item.supportBarangays)
          ? item.supportBarangays
          : [];
        const isOwnJob =
          item?.author?.id &&
          currentUser?.id &&
          item.author.id === currentUser.id;
        return (
          isOwnJob ||
          workBarangay === scope ||
          homeBarangay === scope ||
          coverageBarangays.includes(scope) ||
          supportBarangays.includes(scope)
        );
      }
      if (
        item?.emergencyType ||
        item?.handlerBarangay ||
        item?.incidentBarangay
      ) {
        const incidentBarangay =
          item.handlerBarangay || item.incidentBarangay || item.barangay;
        const homeBarangay =
          item.reporterHomeBarangay ||
          item.homeBarangay ||
          item.author?.barangay;
        const supportBarangays = Array.isArray(item.supportBarangays)
          ? item.supportBarangays
          : [];
        const isOwnEmergency =
          item?.authorId === currentUser?.id ||
          item?.userId === currentUser?.id ||
          item?.author?.id === currentUser?.id ||
          item?.author?.uid === currentUser?.uid;
        return (
          isOwnEmergency ||
          incidentBarangay === scope ||
          homeBarangay === scope ||
          supportBarangays.includes(scope)
        );
      }
      return item?.barangay === scope;
    });
  };

  const isSameBarangay = (item, currentUser) =>
    Boolean(
      item?.barangay &&
      currentUser?.barangay &&
      item.barangay === currentUser.barangay,
    );

  const lockBarangayForResident = (payload, currentUser) => {
    if (!currentUser) return payload;
    const isLostFoundPost = ["lost", "found"].includes(payload.type);
    const isEmergencyReport = Boolean(
      payload.emergencyType ||
      payload.reporterRole ||
      payload.exactLocation ||
      payload.emergencyContactsSnapshot,
    );
    if (currentUser.role === "resident") {
      if (isLostFoundPost) {
        const homeBarangay = currentUser.barangay || payload.homeBarangay || "";
        const incidentBarangay =
          payload.incidentBarangay ||
          payload.itemBarangay ||
          payload.locationBarangay ||
          payload.barangay ||
          homeBarangay;
        return {
          ...payload,
          homeBarangay,
          incidentBarangay,
          itemBarangay: incidentBarangay,
          barangay: incidentBarangay,
          isCrossBarangay: Boolean(
            homeBarangay &&
            incidentBarangay &&
            homeBarangay !== incidentBarangay,
          ),
        };
      }
      if (isEmergencyReport) {
        const reporterHomeBarangay =
          currentUser.barangay ||
          payload.reporterHomeBarangay ||
          payload.homeBarangay ||
          "";
        const incidentBarangay =
          payload.incidentBarangay ||
          payload.handlerBarangay ||
          payload.locationBarangay ||
          payload.barangay ||
          reporterHomeBarangay;
        const isCrossBarangay = Boolean(
          reporterHomeBarangay &&
          incidentBarangay &&
          reporterHomeBarangay !== incidentBarangay,
        );
        return {
          ...payload,
          reporterHomeBarangay,
          homeBarangay: reporterHomeBarangay,
          incidentBarangay,
          handlerBarangay: incidentBarangay,
          barangay: incidentBarangay,
          supportBarangays: Array.from(
            new Set(
              [
                ...(Array.isArray(payload.supportBarangays)
                  ? payload.supportBarangays
                  : []),
                ...(isCrossBarangay ? [reporterHomeBarangay] : []),
              ].filter(Boolean),
            ),
          ),
          isCrossBarangay,
        };
      }
      if (payload.type === "job") {
        const homeBarangay =
          currentUser.barangay ||
          payload.homeBarangay ||
          payload.author?.barangay ||
          "";
        const isAllBarangays = payload.isAllBarangays === true;
        let workBarangay = payload.workBarangay;
        if (isAllBarangays) {
          workBarangay = "all";
        } else {
          workBarangay =
            payload.workBarangay ||
            payload.jobBarangay ||
            payload.serviceBarangay ||
            payload.locationBarangay ||
            payload.barangay ||
            homeBarangay;
        }
        const coverageBarangays = isAllBarangays
          ? payload.coverageBarangays || []
          : Array.from(
              new Set(
                [
                  ...(Array.isArray(payload.coverageBarangays)
                    ? payload.coverageBarangays
                    : []),
                  workBarangay,
                ].filter(Boolean),
              ),
            );
        const isCrossBarangay =
          !isAllBarangays &&
          homeBarangay &&
          workBarangay &&
          homeBarangay !== workBarangay;
        return {
          ...payload,
          homeBarangay,
          workBarangay,
          jobBarangay: workBarangay,
          serviceBarangay: workBarangay,
          handlerBarangay: workBarangay,
          barangay: workBarangay,
          coverageBarangays,
          supportBarangays: Array.from(
            new Set(
              [
                ...(Array.isArray(payload.supportBarangays)
                  ? payload.supportBarangays
                  : []),
                ...(isCrossBarangay ? [homeBarangay] : []),
              ].filter(Boolean),
            ),
          ),
          isCrossBarangay,
          isAllBarangays,
        };
      }
      return { ...payload, barangay: currentUser.barangay };
    }
    if (isLostFoundPost) {
      const homeBarangay =
        payload.homeBarangay ||
        payload.author?.barangay ||
        payload.barangay ||
        currentUser.barangay ||
        "";
      const incidentBarangay =
        payload.incidentBarangay ||
        payload.itemBarangay ||
        payload.barangay ||
        currentUser.barangay;
      return {
        ...payload,
        homeBarangay,
        incidentBarangay,
        itemBarangay: incidentBarangay,
        barangay: incidentBarangay,
        isCrossBarangay: Boolean(
          homeBarangay && incidentBarangay && homeBarangay !== incidentBarangay,
        ),
      };
    }
    if (isEmergencyReport) {
      const reporterHomeBarangay =
        payload.reporterHomeBarangay ||
        payload.homeBarangay ||
        payload.author?.barangay ||
        currentUser.barangay ||
        "";
      const incidentBarangay =
        payload.incidentBarangay ||
        payload.handlerBarangay ||
        payload.barangay ||
        currentUser.barangay;
      const isCrossBarangay = Boolean(
        reporterHomeBarangay &&
        incidentBarangay &&
        reporterHomeBarangay !== incidentBarangay,
      );
      return {
        ...payload,
        reporterHomeBarangay,
        homeBarangay: reporterHomeBarangay,
        incidentBarangay,
        handlerBarangay: incidentBarangay,
        barangay: incidentBarangay,
        supportBarangays: Array.from(
          new Set(
            [
              ...(Array.isArray(payload.supportBarangays)
                ? payload.supportBarangays
                : []),
              ...(isCrossBarangay ? [reporterHomeBarangay] : []),
            ].filter(Boolean),
          ),
        ),
        isCrossBarangay,
      };
    }
    if (payload.type === "job") {
      const homeBarangay =
        payload.homeBarangay ||
        payload.author?.barangay ||
        currentUser.barangay ||
        "";
      const workBarangay =
        payload.workBarangay ||
        payload.jobBarangay ||
        payload.serviceBarangay ||
        payload.barangay ||
        currentUser.barangay;
      const coverageBarangays = Array.from(
        new Set(
          [
            ...(Array.isArray(payload.coverageBarangays)
              ? payload.coverageBarangays
              : []),
            workBarangay,
          ].filter(Boolean),
        ),
      );
      const isCrossBarangay = Boolean(
        homeBarangay && workBarangay && homeBarangay !== workBarangay,
      );
      return {
        ...payload,
        homeBarangay,
        workBarangay,
        jobBarangay: workBarangay,
        serviceBarangay: workBarangay,
        handlerBarangay: workBarangay,
        barangay: workBarangay,
        coverageBarangays,
        supportBarangays: Array.from(
          new Set(
            [
              ...(Array.isArray(payload.supportBarangays)
                ? payload.supportBarangays
                : []),
              ...(isCrossBarangay ? [homeBarangay] : []),
            ].filter(Boolean),
          ),
        ),
        isCrossBarangay,
      };
    }
    return { ...payload, barangay: payload.barangay || currentUser.barangay };
  };

  const canManageBarangayItem = (item, currentUser) => {
    if (!currentUser) return false;
    if (currentUser.role === "barangay_admin")
      return isSameBarangay(item, currentUser);
    const currentKeys = new Set(getIdentityKeys(currentUser));
    const ownerKeys = uniqueTargets(getUserTargetIds(item?.author || {}), [
      item?.authorId,
      item?.userId,
    ]);
    return ownerKeys.some((key) => currentKeys.has(String(key)));
  };

  const isSuspendedAccount = (account = {}) => {
    const restriction = canUserPerformResidentAction(
      account,
      RESTRICTED_RESIDENT_ACTIONS.CREATE_POST,
      getLatestUserRecords(),
    );
    return !restriction.allowed;
  };

  const findUserRecord = (userId) => {
    const raw = String(userId || "")
      .trim()
      .toLowerCase();
    if (!raw) return null;
    const directory = [
      ...users,
      ...getUsers(),
      ...allPosts.map((post) => post.author).filter(Boolean),
      ...chats
        .flatMap((chat) => chat.participantProfiles || [])
        .filter(Boolean),
    ];
    const match = directory.find((item) => {
      const keys = getAccountIdentityKeys(item).map((key) =>
        String(key).toLowerCase(),
      );
      if (keys.includes(raw)) return true;
      if (
        String(item?.name || "")
          .trim()
          .toLowerCase() === raw
      )
        return true;
      return false;
    });
    return match ? applyModerationToUser(match) : null;
  };

  const getLatestUserRecords = () =>
    applyModerationToUsers([...users, ...getUsers()]);

  const getActionRestriction = (account, action) =>
    canUserPerformResidentAction(account, action, getLatestUserRecords());

  const assertResidentCanCreate = (
    account,
    action = RESTRICTED_RESIDENT_ACTIONS.CREATE_POST,
  ) => {
    assertUserCanPerformResidentAction(account, action, getLatestUserRecords());
  };

  const recordAudit = (payload = {}) => safeCreateAuditLog(payload);

  // ----- REAL-TIME SUBSCRIPTIONS (no localStorage fallback) -----
  useEffect(() => {
    initializeStorage();
    let isMounted = true;
    fetchSanMiguelBarangays({ allowFallback: true })
      .then((payload) => {
        if (!isMounted) return;
        setBarangays(payload.barangays || getBarangays());
        setBarangaySource(payload.source || "psgc-api");
      })
      .catch((error) => {
        console.warn(
          "Unable to refresh San Miguel barangays from PSGC API.",
          error,
        );
        const cached = getCachedSanMiguelBarangays();
        if (isMounted) {
          setBarangays(cached.barangays || getBarangays());
          setBarangaySource(cached.source || "fallback-static");
        }
      });
    const handleBarangayRefresh = () => {
      const cached = getCachedSanMiguelBarangays();
      setBarangays(cached.barangays || getBarangays());
      setBarangaySource(cached.source || "local-storage");
    };
    window.addEventListener("barangays-refresh", handleBarangayRefresh);
    return () => {
      isMounted = false;
      window.removeEventListener("barangays-refresh", handleBarangayRefresh);
    };
  }, []);

  // Users
  useEffect(() => {
    if (!currentUser?.barangay) {
      setUsers([]);
      return undefined;
    }
    const unsubscribe = subscribeUsersByBarangay(
      currentUser.barangay,
      (remoteUsers) => setUsers(applyModerationToUsers(remoteUsers)),
      (error) => {
        console.error("User subscription error:", error);
        setUsers([]);
      },
    );
    return () => unsubscribe?.();
  }, [currentUser?.barangay]);

  // Chats
  // Chats
  // Chats
  useEffect(() => {
    if (!currentUser || (!currentUser.id && !currentUser.uid)) {
      setChats([]);
      return undefined;
    }

    const localChats = getChats();
    setChats(normalizeChatListForState(localChats));

    const unsubscribe = subscribeChatsForUser(
      currentUser,
      (remoteChats) => {
        const merged = mergeRecordsById(remoteChats, getChats());
        setChats(normalizeChatListForState(merged));
      },
      (error) => {
        console.error("Chat subscription error:", error);
        setChats(normalizeChatListForState(getChats()));
      },
    );
    return () => unsubscribe?.();
  }, [currentUser?.id, currentUser?.uid, currentUser?.email, users]);

  // Reports
  useEffect(() => {
    if (!currentUser) {
      setReports([]);
      return undefined;
    }
    const unsubscribe = subscribeReportsForUser(
      currentUser,
      (remoteReports) => setReports(sortNewestFirst(remoteReports)),
      (error) => {
        console.error("Report subscription error:", error);
        setReports([]);
      },
    );
    return () => unsubscribe?.();
  }, [
    currentUser?.id,
    currentUser?.uid,
    currentUser?.barangay,
    currentUser?.role,
  ]);

  // Posts
  useEffect(() => {
    if (!currentUser) {
      setAllPosts([]);
      return undefined;
    }
    const unsubscribe = subscribePostsForUser(
      currentUser,
      barangayFilterMode,
      (remotePosts) => setAllPosts(sortNewestFirst(remotePosts)),
      (error) => {
        console.error("Post subscription error:", error);
        setAllPosts([]);
      },
    );
    return () => unsubscribe?.();
  }, [
    currentUser?.id,
    currentUser?.uid,
    currentUser?.barangay,
    currentUser?.role,
    barangayFilterMode,
  ]);

  // Emergencies
  useEffect(() => {
    if (!currentUser) {
      setEmergencies([]);
      return undefined;
    }
    const unsubscribe = subscribeEmergenciesForUser(
      currentUser,
      barangayFilterMode,
      (remoteEmergencies) => setEmergencies(sortNewestFirst(remoteEmergencies)),
      (error) => {
        console.error("Emergency subscription error:", error);
        setEmergencies([]);
      },
    );
    return () => unsubscribe?.();
  }, [
    currentUser?.id,
    currentUser?.uid,
    currentUser?.barangay,
    currentUser?.role,
    barangayFilterMode,
  ]);

  // Appointments
  useEffect(() => {
    if (!currentUser) {
      setAppointments([]);
      return undefined;
    }
    const unsubscribe = subscribeAppointmentsForUser(
      currentUser,
      (remoteAppointments) =>
        setAppointments(sortNewestFirst(remoteAppointments)),
      (error) => {
        console.error("Appointment subscription error:", error);
        setAppointments([]);
      },
    );
    return () => unsubscribe?.();
  }, [
    currentUser?.id,
    currentUser?.uid,
    currentUser?.barangay,
    currentUser?.role,
  ]);

  // Announcements
  useEffect(() => {
    if (!currentUser) {
      setAnnouncements([]);
      return undefined;
    }
    const unsubscribe = subscribeAnnouncementsForUser(
      currentUser,
      (remoteAnnouncements) =>
        setAnnouncements(sortNewestFirst(remoteAnnouncements)),
      (error) => {
        console.error("Announcement subscription error:", error);
        setAnnouncements([]);
      },
    );
    return () => unsubscribe?.();
  }, [
    currentUser?.id,
    currentUser?.uid,
    currentUser?.barangay,
    currentUser?.role,
  ]);

  // Notifications
  useEffect(() => {
    if (!currentUser) {
      setAllNotifications([]);
      return undefined;
    }
    const unsubscribe = subscribeNotificationsForUser(
      currentUser,
      (remoteNotifications) =>
        setAllNotifications(
          normalizeNotificationList(remoteNotifications, currentUser),
        ),
      (error) => {
        console.error("Notification subscription error:", error);
        setAllNotifications([]);
      },
    );
    return () => unsubscribe?.();
  }, [
    currentUser?.id,
    currentUser?.uid,
    currentUser?.email,
    currentUser?.barangay,
    currentUser?.role,
  ]);

  // ----- No loadAllData() function -----
  const reloadAppData = () => {
    console.log(
      "Manual refresh triggered, but real-time subscriptions already keep data fresh.",
    );
  };

  const resetDemoData = () => {
    resetStorageToDemo();
    window.location.reload();
  };

  // ----- Helper for building client post ID -----
  const buildClientPostId = (type = "post") =>
    `${type || "post"}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const findPostById = (postId) => allPosts.find((post) => post.id === postId);

  const persistPostUpdate = (postId, updates, rollbackPost = null) => {
    updatePostInFirestore(postId, updates).catch((error) => {
      console.error("Unable to update Firestore post.", error);
      if (rollbackPost)
        setAllPosts((posts) =>
          posts.map((post) => (post.id === postId ? rollbackPost : post)),
        );
    });
  };

  const createNotificationRecord = (notification) => {
    const hasTargetBarangay = Object.prototype.hasOwnProperty.call(
      notification,
      "targetBarangay",
    );
    const hasTargetBarangays =
      Array.isArray(notification.targetBarangays) &&
      notification.targetBarangays.length > 0;
    const smartPayload = buildSmartNotificationPayload({
      ...notification,
      barangay:
        notification.barangay ||
        notification.targetBarangay ||
        currentUser?.barangay ||
        "",
      targetBarangay: hasTargetBarangays
        ? ""
        : hasTargetBarangay
          ? notification.targetBarangay
          : notification.barangay || currentUser?.barangay || "",
      targetBarangays: Array.isArray(notification.targetBarangays)
        ? notification.targetBarangays
        : [],
      homeBarangay:
        notification.homeBarangay ||
        notification.sourceBarangay ||
        currentUser?.barangay ||
        "",
    });
    if (smartPayload.dedupeKey) {
      const existing = getNotifications().find(
        (item) => item.dedupeKey === smartPayload.dedupeKey,
      );
      if (existing) return existing;
    }
    const created = storageAddNotification(smartPayload);
    setAllNotifications((items) =>
      normalizeNotificationList(
        [...items.filter((item) => item.id !== created.id), created],
        currentUser,
      ),
    );
    createNotificationInFirestore(created).catch((error) =>
      console.warn("Unable to save Firestore notification.", error),
    );
    return created;
  };

  // ----- Post functions -----
  const uploadPendingPostImages = async (images = [], postType = "post") => {
    const imageList = Array.isArray(images) ? images : [images].filter(Boolean);
    const folder = CLOUDINARY_FOLDERS.POSTS;
    const uploaded = await Promise.all(
      imageList.map(async (image) => {
        const file =
          image?.file ||
          (typeof File !== "undefined" && image instanceof File ? image : null);
        if (file) {
          const result = await uploadImageToCloudinary(file, folder);
          return { url: result.url, publicId: result.publicId, type: postType };
        }
        if (typeof image === "string") return image;
        if (image?.url)
          return { url: image.url, publicId: image.publicId || "" };
        return image;
      }),
    );
    return uploaded.filter(Boolean);
  };

  const createPost = async (postData) => {
    assertResidentCanCreate(
      postData.author || currentUser,
      RESTRICTED_RESIDENT_ACTIONS.CREATE_POST,
    );
    const uploadedImages = await withOperationTimeout(
      uploadPendingPostImages(postData.images || [], postData.type || "post"),
      "Image upload is taking too long. Please check your connection or try posting without large images.",
      25000,
    );
    const payload = lockBarangayForResident(
      { ...postData, images: uploadedImages },
      postData.author,
    );
    const postId = payload.id || buildClientPostId(payload.type || "post");
    const createdAt = new Date().toISOString();
    const newPost = normalizeFirestorePost(postId, {
      ...payload,
      id: postId,
      createdAt,
      updatedAt: createdAt,
      status: payload.status || "Active",
    });
    setAllPosts((posts) =>
      sortNewestFirst([newPost, ...posts.filter((post) => post.id !== postId)]),
    );
    try {
      await withOperationTimeout(
        createPostInFirestore(newPost),
        "Saving the post is taking too long.",
        20000,
      );
    } catch (error) {
      console.error("Unable to create Firestore post.", error);
      setAllPosts((posts) => posts.filter((post) => post.id !== postId));
      throw new Error(error.message || "Post was not created.");
    }
    if (["lost", "found"].includes(newPost.type)) {
      const possibleMatches = getTopLostFoundMatches(newPost, allPosts, 3);
      if (possibleMatches.length) {
        const smartMatches = possibleMatches.map((match) => ({
          postId: match.candidate.id,
          title: match.candidate.title,
          percentage: match.percentage,
          reasons: match.reasons,
        }));
        setAllPosts((posts) =>
          sortNewestFirst(
            posts.map((post) =>
              post.id === newPost.id
                ? {
                    ...post,
                    smartMatches,
                    bestMatchPercentage: smartMatches[0]?.percentage || 0,
                  }
                : post,
            ),
          ),
        );
        persistPostUpdate(
          newPost.id,
          {
            smartMatches,
            bestMatchPercentage: smartMatches[0]?.percentage || 0,
          },
          newPost,
        );
        createNotificationRecord({
          type: "post",
          title: "Possible Lost & Found Match",
          message: `${possibleMatches.length} possible match${possibleMatches.length > 1 ? "es" : ""} found for your ${getLostFoundCaseLabel(newPost).toLowerCase()}: ${newPost.title}.`,
          priority: isMissingPersonCase(newPost) ? "high" : "medium",
          actionPath: `/post/${newPost.id}`,
          targetUserIds: getAccountIdentityKeys(
            newPost.author || payload.author || {},
          ),
          targetBarangay: newPost.barangay,
          relatedPost: newPost.id,
          relatedPostType: "lost_found",
          actionChatUserId: possibleMatches[0]?.candidate?.author?.id || "",
          actionChatUserName:
            possibleMatches[0]?.candidate?.author?.name || "Matched resident",
        });
        possibleMatches.forEach((match) => {
          const candidateOwnerIds = getAccountIdentityKeys(
            match.candidate.author || {},
          );
          if (!candidateOwnerIds.length) return;
          createNotificationRecord({
            type: "post",
            title: "Possible Lost & Found Match",
            message: `${match.percentage}% match: ${newPost.title} may relate to your post "${match.candidate.title}".`,
            priority: isMissingPersonCase(newPost) ? "high" : "medium",
            actionPath: `/post/${newPost.id}`,
            targetUserIds: candidateOwnerIds,
            targetBarangay: newPost.barangay,
            relatedPost: newPost.id,
            relatedPostType: "lost_found",
            actionChatUserId: newPost.author?.id || "",
            actionChatUserName: newPost.author?.name || "Matched resident",
          });
        });
      }
    }
    if (payload.author) {
      createNotificationRecord({
        type: "post",
        title: ["lost", "found"].includes(newPost.type)
          ? isMissingPersonCase(newPost)
            ? "Priority Missing-Person Case"
            : `New ${getLostFoundCaseLabel(newPost)}`
          : newPost.type === "job"
            ? `New ${newPost.opportunityType === "seeking" ? "Job Seeking" : "Job Hiring"} Post`
            : "New Community Post",
        message: ["lost", "found"].includes(newPost.type)
          ? `${getLostFoundCaseLabel(newPost)} created by ${payload.author.name}. Handler barangay: ${newPost.barangay}.`
          : newPost.type === "job"
            ? `${payload.author.name} posted ${newPost.opportunityType === "seeking" ? "a job seeking offer" : "a hiring request"} for ${newPost.barangay || "your barangay"}${newPost.isCrossBarangay ? ` while registered in ${newPost.homeBarangay}.` : "."}`
            : `New ${payload.type || "community"} post created by ${payload.author.name}.`,
        priority: isMissingPersonCase(newPost) ? "high" : "normal",
        actionPath:
          payload.type === "job"
            ? "/admin/jobs"
            : ["lost", "found"].includes(payload.type)
              ? "/admin/lost-found"
              : "/admin/dashboard",
        targetRole: "barangay_admin",
        targetBarangay: newPost.barangay || payload.author.barangay,
        homeBarangay: newPost.homeBarangay || payload.author.barangay,
        relatedPost: newPost.id,
        relatedPostType: ["lost", "found"].includes(newPost.type)
          ? "lost_found"
          : newPost.type,
      });
      if (
        ["lost", "found"].includes(newPost.type) &&
        newPost.isCrossBarangay &&
        newPost.homeBarangay &&
        newPost.homeBarangay !== newPost.barangay
      ) {
        createNotificationRecord({
          type: "post",
          title: `Support Visibility: ${getLostFoundCaseLabel(newPost)}`,
          message: `${payload.author.name} is from your barangay, but the case happened in ${newPost.barangay}. You can monitor and guide the resident; the incident barangay handles official status changes.`,
          priority: isMissingPersonCase(newPost) ? "high" : "normal",
          actionPath: "/admin/lost-found",
          targetRole: "barangay_admin",
          targetBarangay: newPost.homeBarangay,
          homeBarangay: newPost.homeBarangay,
          relatedPost: newPost.id,
          relatedPostType: "lost_found",
          dedupeKey: `lost-found-support-${newPost.id}-${newPost.homeBarangay}`,
        });
      }
      if (
        newPost.type === "job" &&
        newPost.isCrossBarangay &&
        newPost.homeBarangay &&
        newPost.homeBarangay !== newPost.barangay
      ) {
        createNotificationRecord({
          type: "post",
          title: "Support Visibility: Cross-Barangay Job",
          message: `${payload.author.name} is from your barangay, but the job is routed to ${newPost.barangay}. You can monitor the resident while the work-location barangay handles moderation.`,
          priority: "normal",
          actionPath: "/admin/jobs",
          targetRole: "barangay_admin",
          targetBarangay: newPost.homeBarangay,
          homeBarangay: newPost.homeBarangay,
          relatedPost: newPost.id,
          relatedPostType: "job",
          dedupeKey: `job-support-${newPost.id}-${newPost.homeBarangay}`,
        });
      }
    }
    return newPost;
  };

  const getPostOwnerTargetIds = (post) =>
    uniqueTargets(getUserTargetIds(post?.author || {}), [
      post?.authorId,
      post?.userId,
      post?.authorEmail,
    ]);

  const addPostOwnerNotification = (post, notification) => {
    const targetUserIds = getPostOwnerTargetIds(post);
    if (!post || targetUserIds.length === 0) return null;
    const created = createNotificationRecord({
      type: "moderation",
      priority: "normal",
      actionPath: `/post/${post.id}`,
      targetBarangay: post.barangay,
      relatedPost: post.id,
      ...notification,
      targetUserIds,
    });
    return created;
  };

  const updatePost = (postId, updates = {}) => {
    const previousPost = findPostById(postId);
    if (!previousPost) return null;
    const {
      notifyOwner = true,
      notificationTitle,
      notificationMessage,
      notificationPriority,
      notificationActionPath,
      ...postUpdates
    } = updates || {};
    const updated = normalizeFirestorePost(postId, {
      ...previousPost,
      ...postUpdates,
      updatedAt: new Date().toISOString(),
    });
    setAllPosts((posts) =>
      sortNewestFirst(
        posts.map((post) => (post.id === postId ? updated : post)),
      ),
    );
    persistPostUpdate(postId, postUpdates, previousPost);
    if (notifyOwner && postUpdates.status && previousPost?.author) {
      const statusLabel = postUpdates.status;
      addPostOwnerNotification(updated, {
        type: "moderation",
        title: notificationTitle || "Post Status Updated",
        message:
          notificationMessage ||
          `Your post "${updated.title}" was marked as ${statusLabel} by the barangay admin.`,
        priority:
          notificationPriority ||
          (["Removed", "Flagged", "Closed"].includes(statusLabel)
            ? "medium"
            : "normal"),
        actionPath:
          notificationActionPath ||
          (statusLabel === "Removed" ? "/dashboard" : `/post/${updated.id}`),
      });
    }
    return updated;
  };

  const respondToJobPost = (
    postId,
    currentUser,
    responseType = "interested",
  ) => {
    const post = findPostById(postId);
    if (
      !post ||
      post.type !== "job" ||
      !currentUser ||
      post.author?.id === currentUser.id
    )
      return null;
    if (isSuspendedAccount(currentUser))
      return {
        ...post,
        error:
          getActionRestriction(
            currentUser,
            RESTRICTED_RESIDENT_ACTIONS.RESPOND_TO_POST,
          ).reason || "Suspended accounts cannot respond.",
      };
    if ([JOB_POST_STATUS.CLOSED, JOB_POST_STATUS.REMOVED].includes(post.status))
      return post;
    const existingResponderIds = Array.isArray(post.interestedUserIds)
      ? post.interestedUserIds
      : [];
    const alreadyResponded = existingResponderIds.includes(currentUser.id);
    const now = new Date();
    const nextResponse = {
      id: `job-response-${Date.now()}`,
      userId: currentUser.id,
      userName: currentUser.name,
      barangay: currentUser.barangay,
      responseType,
      createdAt: now.toISOString(),
      timestamp: now.toLocaleString([], {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }),
      status: "Active",
    };
    const updates = {
      interests: alreadyResponded
        ? post.interests || 0
        : (post.interests || 0) + 1,
      interestedUserIds: alreadyResponded
        ? existingResponderIds
        : [...existingResponderIds, currentUser.id],
      responses: alreadyResponded
        ? post.responses || []
        : [...(post.responses || []), nextResponse],
      lastResponseAt: now.toISOString(),
    };
    const updated = normalizeFirestorePost(postId, {
      ...post,
      ...updates,
      updatedAt: now.toISOString(),
    });
    setAllPosts((posts) =>
      posts.map((item) => (item.id === postId ? updated : item)),
    );
    persistPostUpdate(postId, updates, post);
    if (!alreadyResponded) {
      createPostResponseInFirestore(postId, {
        ...nextResponse,
        postType: "job",
        responderId: currentUser.id,
        responderName: currentUser.name,
      }).catch((error) => console.warn("Unable to save job response.", error));
    }
    if (!alreadyResponded && post.author?.id) {
      createNotificationRecord({
        type: "post",
        title: "Job Post Response",
        message: `${currentUser.name} responded to your job post: ${post.title}. Open the notification to view the response, or use Chat Now to coordinate directly.`,
        priority: "normal",
        actionPath: `/post/${post.id}`,
        targetUserIds: getAccountIdentityKeys(
          post.author || { id: post.author.id },
        ),
        targetBarangay: post.barangay,
        homeBarangay: currentUser.barangay,
        sourceBarangay: currentUser.barangay,
        relatedPost: post.id,
        relatedPostType: "job",
        relatedResponse: nextResponse.id,
        responsePreview: nextResponse.responseType,
        actorUserId: currentUser.id || currentUser.uid,
        actorUserName: currentUser.name,
        actorBarangay: currentUser.barangay,
        actionChatUserId: currentUser.id || currentUser.uid,
        actionChatUserName: currentUser.name || "Interested resident",
        actionLabel: "Chat Now",
        dedupeKey: `job-response-${post.id}-${currentUser.id || currentUser.uid}`,
      });
    }
    return updated;
  };

  const setJobPostStatus = (postId, status) => {
    const nextStatus = Object.values(JOB_POST_STATUS).includes(status)
      ? status
      : JOB_POST_STATUS.ACTIVE;
    return updatePost(postId, { status: nextStatus, notifyOwner: false });
  };

  const respondToLostFoundPost = (
    postId,
    currentUser,
    responseType = "responded",
  ) => {
    const post = findPostById(postId);
    if (
      !post ||
      !["lost", "found"].includes(post.type) ||
      !currentUser ||
      post.author?.id === currentUser.id
    )
      return null;
    if (isSuspendedAccount(currentUser))
      return {
        ...post,
        error:
          getActionRestriction(
            currentUser,
            RESTRICTED_RESIDENT_ACTIONS.RESPOND_TO_POST,
          ).reason || "Suspended accounts cannot respond.",
      };
    if (post.status !== LOST_FOUND_STATUS.ACTIVE) return post;
    const existingResponderIds = Array.isArray(post.interestedUserIds)
      ? post.interestedUserIds
      : [];
    const alreadyResponded = existingResponderIds.includes(currentUser.id);
    if (alreadyResponded) return null;
    const now = new Date();
    const nextResponse = {
      id: `lost-found-response-${Date.now()}`,
      userId: currentUser.id,
      userName: currentUser.name,
      barangay: currentUser.barangay,
      responseType,
      createdAt: now.toISOString(),
      timestamp: now.toLocaleString([], {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }),
      status: "Active",
    };
    const updates = {
      interests: (post.interests || 0) + 1,
      interestedUserIds: [...existingResponderIds, currentUser.id],
      responses: [
        ...(Array.isArray(post.responses) ? post.responses : []),
        nextResponse,
      ],
      lastResponseAt: now.toISOString(),
    };
    const updated = normalizeFirestorePost(postId, {
      ...post,
      ...updates,
      updatedAt: now.toISOString(),
    });
    setAllPosts((posts) =>
      posts.map((item) => (item.id === postId ? updated : item)),
    );
    persistPostUpdate(postId, updates, post);
    createPostResponseInFirestore(postId, {
      ...nextResponse,
      postType: post.type,
      responderId: currentUser.id,
      responderName: currentUser.name,
    }).catch((error) =>
      console.warn("Unable to save lost/found response.", error),
    );
    if (post.author?.id) {
      createNotificationRecord({
        type: "post",
        title: isMissingPersonCase(post)
          ? "Missing-Person Information Received"
          : "Lost & Found Response",
        message: `${currentUser.name} responded to your ${getLostFoundCaseLabel(post).toLowerCase()}: ${post.title}. Open the notification to view the responder, barangay, and proof/details; use Chat Now for direct coordination.`,
        priority: isMissingPersonCase(post) ? "high" : "normal",
        actionPath: `/post/${post.id}`,
        targetUserIds: getAccountIdentityKeys(
          post.author || { id: post.author.id },
        ),
        targetBarangay: post.barangay,
        homeBarangay: currentUser.barangay,
        sourceBarangay: currentUser.barangay,
        relatedPost: post.id,
        relatedPostType: "lost_found",
        relatedCaseType: getLostFoundCaseLabel(post),
        relatedResponse: nextResponse.id,
        responsePreview: nextResponse.responseType,
        evidenceSummary: nextResponse.responseType,
        actorUserId: currentUser.id || currentUser.uid,
        actorUserName: currentUser.name,
        actorBarangay: currentUser.barangay,
        actionChatUserId: currentUser.id || currentUser.uid,
        actionChatUserName: currentUser.name,
        actionLabel: "Chat Now",
        dedupeKey: `lost-found-response-${post.id}-${currentUser.id || currentUser.uid}`,
      });
    }
    return updated;
  };

  const deletePost = (postId) => {
    const previousPost = findPostById(postId);
    setAllPosts((posts) => posts.filter((post) => post.id !== postId));
    deletePostFromFirestore(postId).catch((error) => {
      console.error("Unable to delete Firestore post.", error);
      if (previousPost)
        setAllPosts((posts) => [
          previousPost,
          ...posts.filter((post) => post.id !== postId),
        ]);
    });
  };

  const closePost = (postId) =>
    setJobPostStatus(postId, JOB_POST_STATUS.CLOSED);
  const markLostFoundStatus = (postId, status) => {
    const nextStatus = LOST_FOUND_STATUS_OPTIONS.includes(status)
      ? status
      : LOST_FOUND_STATUS.ACTIVE;
    return updatePost(postId, { status: nextStatus, notifyOwner: false });
  };

  const removePostByAdmin = (
    postId,
    adminUser,
    note = "Removed by barangay admin after review.",
  ) => {
    const post = findPostById(postId);
    if (!post || !canManageBarangayItem(post, adminUser)) return null;
    const updated = updatePost(postId, {
      status: JOB_POST_STATUS.REMOVED,
      moderationNote: note,
      removedBy: adminUser?.id,
      removedAt: new Date().toISOString(),
      notifyOwner: false,
    });
    addPostOwnerNotification(post, {
      type: "moderation",
      title: "Post Removed",
      message: `Your post "${post.title}" was removed by the barangay admin. Reason: ${note}`,
      priority: "medium",
      actionPath: "/dashboard",
    });
    recordAudit({
      action: "remove_post",
      adminUser,
      targetType: "post",
      targetId: postId,
      barangay: post.barangay,
      notes: note,
      metadata: {
        title: post.title,
        authorId: post.authorId || post.author?.id || "",
      },
    });
    return updated;
  };

  // ----- User moderation functions (unchanged but ensure no loadAllData) -----
  const getUserFirestoreId = (account = {}) => account.uid || account.id || "";
  const replaceUserEverywhere = (nextUser) => {
    const targetKeys = new Set(
      getAccountIdentityKeys(nextUser).map((key) => String(key).toLowerCase()),
    );
    const mergeIfMatch = (item) => {
      const itemKeys = getAccountIdentityKeys(item).map((key) =>
        String(key).toLowerCase(),
      );
      return itemKeys.some((key) => targetKeys.has(key))
        ? { ...item, ...nextUser }
        : item;
    };
    setUsers((items) => applyModerationToUsers(items.map(mergeIfMatch)));
    setChats((items) =>
      normalizeChatListForState(
        items.map((chat) => ({
          ...chat,
          participantProfiles: Array.isArray(chat.participantProfiles)
            ? chat.participantProfiles.map(mergeIfMatch)
            : [],
        })),
      ),
    );
  };

  const warnUser = (userId, reason, adminUser, options = {}) => {
    const targetUser = findUserRecord(userId);
    if (!targetUser || !isSameBarangay(targetUser, adminUser)) return null;
    const warningRecord = createWarningRecord(
      targetUser,
      reason,
      adminUser,
      options,
    );
    const savedMirror = saveLocalModerationRecord(targetUser, warningRecord);
    const updated = applyModerationToUser({
      ...targetUser,
      ...warningRecord,
      ...savedMirror,
    });
    replaceUserEverywhere(updated);
    const warningPayload = updated.latestWarning || {
      reason,
      message: reason || "Barangay admin issued a warning.",
      createdBy: adminUser?.name || "Barangay Admin",
    };
    const firestoreId = getUserFirestoreId(targetUser);
    if (firestoreId)
      addUserWarningInFirestore(firestoreId, warningPayload).catch((error) =>
        console.warn("Unable to save Firestore user warning.", error),
      );
    const targetIds = getAccountIdentityKeys(targetUser);
    createNotificationRecord({
      type: "moderation",
      title: "Account Warning",
      message: `${reason || "Barangay admin issued a warning for your account."} This warning automatically expires ${warningPayload.warningExpiresAt ? new Date(warningPayload.warningExpiresAt).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "within the day"}.`,
      priority: "medium",
      actionPath: "/profile",
      targetUserIds: targetIds,
      targetBarangay: targetUser.barangay,
    });
    recordAudit({
      action: "warn_user",
      adminUser,
      targetType: "user",
      targetId: firestoreId || userId,
      barangay: targetUser.barangay,
      notes: reason || "Barangay admin issued a warning.",
      metadata: {
        targetUserName: targetUser.name || targetUser.email || "Resident",
      },
    });
    return updated;
  };

  const removeUserWarning = (
    userId,
    reason = "Warning removed by barangay admin.",
    adminUser = null,
  ) => {
    const targetUser = findUserRecord(userId);
    if (!targetUser || !isSameBarangay(targetUser, adminUser)) return null;
    const removalRecord = createWarningRemovalRecord(
      targetUser,
      reason,
      adminUser,
    );
    const savedMirror = saveLocalModerationRecord(targetUser, removalRecord);
    const updated = applyModerationToUser({
      ...targetUser,
      ...removalRecord,
      ...savedMirror,
    });
    replaceUserEverywhere(updated);
    const firestoreId = getUserFirestoreId(targetUser);
    if (firestoreId) {
      updateUserStatusInFirestore(firestoreId, USER_STATUS.ACTIVE, {
        reason: "",
        statusReason: "",
        latestWarning: null,
        warningExpiresAt: "",
        lastWarningRemovalReason: reason,
        lastWarningRemovedAt: updated.lastWarningRemovedAt,
        updatedBy: adminUser?.name || "Barangay Admin",
      }).catch((error) =>
        console.warn("Unable to save Firestore warning removal.", error),
      );
    }
    const targetIds = getAccountIdentityKeys(targetUser);
    createNotificationRecord({
      type: "moderation",
      title: "Account Warning Removed",
      message: `${reason || "Your barangay warning was removed."} Your account is no longer marked as warned.`,
      priority: "normal",
      actionPath: "/profile",
      targetUserIds: targetIds,
      targetBarangay: targetUser.barangay,
    });
    recordAudit({
      action: "remove_user_warning",
      adminUser,
      targetType: "user",
      targetId: firestoreId || userId,
      barangay: targetUser.barangay,
      notes: reason || "Warning removed by barangay admin.",
      metadata: {
        targetUserName: targetUser.name || targetUser.email || "Resident",
      },
    });
    return updated;
  };

  const suspendUser = (userId, reason, adminUser, options = {}) => {
    const targetUser = findUserRecord(userId);
    if (!targetUser || !isSameBarangay(targetUser, adminUser)) return null;
    const suspensionRecord = createSuspensionRecord(
      targetUser,
      reason,
      adminUser,
      options,
    );
    const savedMirror = saveLocalModerationRecord(targetUser, suspensionRecord);
    const updated = applyModerationToUser({
      ...targetUser,
      ...suspensionRecord,
      ...savedMirror,
    });
    replaceUserEverywhere(updated);
    const firestoreId = getUserFirestoreId(targetUser);
    if (firestoreId) {
      updateUserStatusInFirestore(firestoreId, USER_STATUS.SUSPENDED, {
        reason: updated.statusReason,
        severity: updated.suspensionSeverity,
        durationDays: updated.suspensionDurationDays,
        suspensionStartedAt: updated.suspensionStartedAt,
        suspensionEndsAt: updated.suspensionEndsAt,
        updatedBy: adminUser?.name || "Barangay Admin",
      }).catch((error) =>
        console.warn("Unable to save Firestore user suspension.", error),
      );
    }
    const targetIds = getAccountIdentityKeys(targetUser);
    createNotificationRecord({
      type: "moderation",
      title: "Account Suspended",
      message: `${updated.statusReason || "Your account was suspended by the barangay admin."} Access is restricted ${formatSuspensionUntil(updated.suspensionEndsAt)}.`,
      priority: "high",
      actionPath: "/profile",
      targetUserIds: targetIds,
      targetBarangay: targetUser.barangay,
    });
    recordAudit({
      action: "suspend_user",
      adminUser,
      targetType: "user",
      targetId: firestoreId || userId,
      barangay: targetUser.barangay,
      notes: updated.statusReason || "Account suspended by barangay admin.",
      metadata: {
        targetUserName: targetUser.name || targetUser.email || "Resident",
        severity: updated.suspensionSeverity,
        durationDays: updated.suspensionDurationDays,
        suspensionEndsAt: updated.suspensionEndsAt,
      },
    });
    return updated;
  };

  const activateUser = async (
    userId,
    reason = "Account restored by barangay admin.",
    adminUser = null,
  ) => {
    // 1. Find the user in the current users state
    const existingUser = users.find((user) =>
      getAccountIdentityKeys(user).some(
        (key) => String(key).toLowerCase() === String(userId).toLowerCase(),
      ),
    );

    if (!existingUser) {
      console.warn("activateUser: User not found in state", userId);
      return null;
    }

    if (!isSameBarangay(existingUser, adminUser)) {
      console.warn("activateUser: Cannot restore user from different barangay");
      return null;
    }

    // 2. Build the restored user object (clears suspension fields)
    const activationRecord = createActivationRecord(
      existingUser,
      reason,
      adminUser,
    );
    const savedMirror = saveLocalModerationRecord(
      existingUser,
      activationRecord,
    );
    const restored = applyModerationToUser({
      ...existingUser,
      ...activationRecord,
      ...savedMirror,
    });

    // 3. Determine Firestore document ID (prefer uid, fallback to id)
    const firestoreId = existingUser.uid || existingUser.id;
    if (!firestoreId) {
      console.error(
        "activateUser: No Firestore ID (uid or id) for user",
        existingUser,
      );
      return null;
    }

    // 4. Prepare the update payload – ensure ALL suspension fields are cleared
    const updatePayload = {
      status: USER_STATUS.ACTIVE,
      statusReason: reason,
      suspensionEndsAt: null,
      suspensionSeverity: null,
      suspensionDurationDays: null,
      suspensionStartedAt: null,
      latestWarning: null,
      warningExpiresAt: null,
      lastRestoreReason: reason,
      updatedBy: adminUser?.name || "Barangay Admin",
      updatedAt: new Date().toISOString(),
    };

    console.log(`Activating user ${firestoreId} with payload:`, updatePayload);

    // 5. Update Firestore – await to ensure it completes before local updates
    try {
      await updateUserStatusInFirestore(
        firestoreId,
        USER_STATUS.ACTIVE,
        updatePayload,
      );
      console.log("Firestore user activation succeeded");
    } catch (error) {
      console.error("Firestore user activation failed:", error);
      // Optionally show error to admin via a flash message
      return null;
    }

    // 6. Update local users state
    setUsers((prevUsers) =>
      applyModerationToUsers(
        prevUsers.map((user) =>
          getAccountIdentityKeys(user).some(
            (key) => String(key).toLowerCase() === String(userId).toLowerCase(),
          )
            ? restored
            : user,
        ),
      ),
    );

    // 7. Update participant profiles in chats
    setChats((prevChats) =>
      normalizeChatListForState(
        prevChats.map((chat) => ({
          ...chat,
          participantProfiles: Array.isArray(chat.participantProfiles)
            ? chat.participantProfiles.map((profile) =>
                getAccountIdentityKeys(profile).some(
                  (key) =>
                    String(key).toLowerCase() === String(userId).toLowerCase(),
                )
                  ? restored
                  : profile,
              )
            : [],
        })),
      ),
    );

    // 8. Notify the restored user
    const targetIds = getAccountIdentityKeys(existingUser);
    createNotificationRecord({
      type: "moderation",
      title: "Account Restored",
      message: `${reason || "Your account was restored by the barangay admin."} You can now create posts, respond, chat, request appointments, and submit reports again.`,
      priority: "normal",
      actionPath: "/profile",
      targetUserIds: targetIds,
      targetBarangay: existingUser.barangay,
    });

    // 9. Create audit log
    recordAudit({
      action: "activate_user",
      adminUser,
      targetType: "user",
      targetId: firestoreId,
      barangay: existingUser.barangay,
      notes: reason,
      metadata: {
        targetUserName: existingUser.name || existingUser.email || "Resident",
      },
    });

    return restored;
  };

  const notifyBarangayResidents = (barangay, notification, options = {}) => {
    const excludedIds = new Set(
      (options.excludeUserIds || [])
        .filter(Boolean)
        .map((item) => String(item)),
    );
    const residentDirectory = mergeRecordsById(users, getUsers());
    const targetUserIds = residentDirectory
      .filter(
        (item) =>
          item.role === "resident" &&
          item.barangay === barangay &&
          item.status !== USER_STATUS.SUSPENDED &&
          !getUserTargetIds(item).some((target) =>
            excludedIds.has(String(target)),
          ),
      )
      .flatMap((item) => getUserTargetIds(item));
    const uniqueTargetIds = uniqueTargets(targetUserIds);
    if (uniqueTargetIds.length === 0) return null;
    return createNotificationRecord({
      ...notification,
      targetRole: "resident",
      barangay,
      targetBarangay: barangay,
      targetUserIds: uniqueTargetIds,
    });
  };

  const getPost = (postId) => allPosts.find((p) => p.id === postId);
  const getFilteredPosts = (filters = {}) => {
    let filtered = allPosts;
    if (filters.type)
      filtered = filtered.filter((p) => p.type === filters.type);
    if (filters.barangay)
      filtered = filtered.filter((p) => p.barangay === filters.barangay);
    if (filters.search) {
      const query = filters.search.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.title.toLowerCase().includes(query) ||
          p.description.toLowerCase().includes(query),
      );
    }
    return sortNewestFirst(filtered);
  };

  // ----- Chat functions (unchanged except no loadAllData) -----
  const createChat = (chatData) => {
    assertResidentCanCreate(
      chatData.currentUser || chatData.author || currentUser,
      RESTRICTED_RESIDENT_ACTIONS.CREATE_CHAT,
    );
    const chat = storageCreateChat(chatData);
    setChats((items) =>
      normalizeChatListForState([
        chat,
        ...items.filter((item) => item.id !== chat.id),
      ]),
    );
    createChatInFirestore(chat).catch((error) =>
      console.warn("Unable to save Firestore chat.", error),
    );
    return chat;
  };

  const getOrCreateChat = (currentUser, otherUser, context = {}) => {
    assertResidentCanCreate(
      currentUser,
      RESTRICTED_RESIDENT_ACTIONS.CREATE_CHAT,
    );
    const chat = storageGetOrCreateChat({ currentUser, otherUser, context });
    if (chat) {
      setChats((items) =>
        normalizeChatListForState([
          chat,
          ...items.filter((item) => item.id !== chat.id),
        ]),
      );
      createOrGetChatInFirestore({ currentUser, otherUser, context })
        .then((remoteChat) => {
          if (remoteChat)
            setChats((items) =>
              normalizeChatListForState([
                remoteChat,
                ...items.filter((item) => item.id !== remoteChat.id),
              ]),
            );
        })
        .catch((error) =>
          console.warn("Unable to sync Firestore chat.", error),
        );
    }
    return chat;
  };

  const startChatFromPost = (
    currentUser,
    post,
    source = "post_interaction",
  ) => {
    if (
      !currentUser?.id ||
      !post?.author?.id ||
      post.author.id === currentUser.id
    )
      return null;
    if (isSuspendedAccount(currentUser)) return null;
    const existingChat =
      chats.find((chat) =>
        chatHasBothParticipants(chat, currentUser, post.author),
      ) ||
      getChats().find((chat) =>
        chatHasBothParticipants(chat, currentUser, post.author),
      );
    const alreadyLinkedToPost = Boolean(
      existingChat?.relatedPostId === post.id ||
      (existingChat?.relatedPosts || []).some((item) => item.id === post.id),
    );
    const chatContext = {
      relatedPostId: post.id,
      relatedPostTitle: post.title,
      relatedPostType:
        post.type === "job"
          ? "Job Post"
          : ["lost", "found"].includes(post.type)
            ? getLostFoundCaseLabel(post)
            : "Community Post",
      source,
    };
    const chat = storageGetOrCreateChat({
      currentUser,
      otherUser: post.author,
      context: chatContext,
    });
    if (chat) {
      setChats((items) =>
        normalizeChatListForState([
          chat,
          ...items.filter((item) => item.id !== chat.id),
        ]),
      );
      createOrGetChatInFirestore({
        currentUser,
        otherUser: post.author,
        context: chatContext,
      })
        .then((remoteChat) => {
          if (remoteChat)
            setChats((items) =>
              normalizeChatListForState([
                remoteChat,
                ...items.filter((item) => item.id !== remoteChat.id),
              ]),
            );
        })
        .catch((error) =>
          console.warn("Unable to sync post chat to Firestore.", error),
        );
    }
    const directResponseChat = [
      "job_detail_chat",
      "lost_found_detail_chat",
    ].includes(source);
    if (
      chat &&
      !directResponseChat &&
      (!existingChat || !alreadyLinkedToPost)
    ) {
      createNotificationRecord({
        type: "chat",
        title: "Chat Started About Your Post",
        message: `${currentUser.name} opened a chat about: ${post.title}`,
        priority: "normal",
        actionPath: `/chat?chat=${chat.id}`,
        relatedChat: chat.id,
        relatedPost: post.id,
        targetUserIds: [post.author.id],
        targetBarangay: post.barangay,
      });
    }
    return chat;
  };

  const startChatFromNotification = (currentUser, notification = {}) => {
    if (!currentUser?.id) return null;
    if (notification?.relatedChat) {
      const existingChat =
        chats.find((chat) => chat.id === notification.relatedChat) ||
        getChats().find((chat) => chat.id === notification.relatedChat);
      if (existingChat && chatHasParticipant(existingChat, currentUser)) {
        setChats((items) =>
          normalizeChatListForState([
            existingChat,
            ...items.filter((item) => item.id !== existingChat.id),
          ]),
        );
        return existingChat;
      }
    }
    if (!notification?.actionChatUserId) return null;
    const directory = mergeRecordsById(users, getUsers());
    const targetId = String(notification.actionChatUserId);
    const post = notification.relatedPost
      ? findPostById(notification.relatedPost) ||
        getPosts().find((item) => item.id === notification.relatedPost)
      : null;
    const responseActor = (post?.responses || []).find((response) =>
      [response.userId, response.uid, response.email]
        .filter(Boolean)
        .map((item) => String(item))
        .includes(targetId),
    );
    const otherUser =
      directory.find((item) =>
        getUserTargetIds(item)
          .map((key) => String(key))
          .includes(targetId),
      ) ||
      (responseActor
        ? {
            id: responseActor.userId || notification.actionChatUserId,
            uid: responseActor.userId || notification.actionChatUserId,
            name:
              responseActor.userName ||
              notification.actionChatUserName ||
              notification.actorUserName ||
              "Resident",
            role: "resident",
            barangay:
              responseActor.barangay ||
              notification.actorBarangay ||
              notification.sourceBarangay ||
              notification.targetBarangay ||
              notification.barangay ||
              "",
          }
        : {
            id: notification.actionChatUserId,
            uid: notification.actionChatUserId,
            name:
              notification.actionChatUserName ||
              notification.actorUserName ||
              "Resident",
            role: "resident",
            barangay:
              notification.actorBarangay ||
              notification.sourceBarangay ||
              notification.targetBarangay ||
              notification.barangay ||
              "",
          });
    if (!otherUser?.id || otherUser.id === currentUser.id) return null;
    const context = {
      relatedPostId: notification.relatedPost || "",
      relatedPostTitle: post?.title || notification.title || "Notification",
      relatedPostType: post
        ? ["lost", "found"].includes(post.type)
          ? getLostFoundCaseLabel(post)
          : post.type
        : notification.relatedPostType || "Notification",
      source: "notification_chat_now",
    };
    return getOrCreateChat(currentUser, otherUser, context);
  };

  const addMessage = (chatId, message) => {
    const messageAccess = getActionRestriction(
      currentUser,
      RESTRICTED_RESIDENT_ACTIONS.SEND_MESSAGE,
    );
    if (!messageAccess.allowed)
      throw new Error(
        messageAccess.reason ||
          "Message send skipped because the current account is restricted.",
      );
    const chatBeforeUpdate =
      chats.find((chat) => chat.id === chatId) ||
      getChats().find((chat) => chat.id === chatId);
    if (!chatBeforeUpdate) {
      console.warn("Message send skipped because chat was not found:", chatId);
      return null;
    }
    const createdAt = message.createdAt || new Date().toISOString();
    const nextMessage = {
      ...message,
      id:
        message.id ||
        `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      text: String(message.text || "").trim(),
      timestamp:
        message.timestamp ||
        new Date(createdAt).toLocaleString([], {
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        }),
      createdAt,
      readBy: Array.from(
        new Set([...(message.readBy || []), message.senderId].filter(Boolean)),
      ),
    };
    const localChat = storageAddMessage(chatId, nextMessage);
    const optimisticChat = normalizeChatForState(
      localChat || {
        ...chatBeforeUpdate,
        messages: [...(chatBeforeUpdate.messages || []), nextMessage],
        lastMessage:
          nextMessage.text ||
          (nextMessage.image ? "Image message" : "New message"),
        lastMessageTime: nextMessage.timestamp,
        lastMessageAt: nextMessage.createdAt,
        updatedAt: nextMessage.createdAt,
      },
    );
    setChats((items) =>
      normalizeChatListForState([
        optimisticChat,
        ...items.filter((item) => item.id !== optimisticChat.id),
      ]),
    );
    const senderKeys = new Set([
      String(nextMessage.senderId),
      ...getIdentityKeys({ id: nextMessage.senderId }),
    ]);
    const profileTargets = (chatBeforeUpdate.participantProfiles || [])
      .filter(
        (profile) =>
          !getIdentityKeys(profile).some((key) => senderKeys.has(String(key))),
      )
      .flatMap((profile) => getIdentityKeys(profile));
    const participantTargets = (chatBeforeUpdate.participants || []).filter(
      (participantId) => !senderKeys.has(String(participantId)),
    );
    const otherParticipants = uniqueTargets(profileTargets, participantTargets);
    if (otherParticipants.length > 0) {
      createNotificationRecord({
        type: "chat",
        title: "New Message",
        message: `${nextMessage.senderName || "A resident"} sent you a message.`,
        priority: "normal",
        actionPath: `/chat?chat=${chatId}`,
        relatedChat: chatId,
        actionChatUserId: nextMessage.senderId,
        actionChatUserName: nextMessage.senderName || "Resident",
        actionLabel: "Reply",
        targetUserIds: otherParticipants,
        targetBarangay:
          chatBeforeUpdate?.participantProfiles?.find(
            (p) =>
              !getIdentityKeys(p).some((key) => senderKeys.has(String(key))),
          )?.barangay ||
          chatBeforeUpdate.barangay ||
          null,
      });
    }
    addMessageToChatInFirestore(chatId, nextMessage, chatBeforeUpdate).catch(
      (error) => console.warn("Unable to save Firestore chat message.", error),
    );
    return optimisticChat;
  };

  const markChatRead = (chatId, userId) => {
    const localChat = storageMarkChatRead(chatId, userId);
    if (localChat)
      setChats((items) =>
        normalizeChatListForState(
          items.map((item) => (item.id === chatId ? localChat : item)),
        ),
      );
    const currentChat = chats.find((chat) => chat.id === chatId) || localChat;
    markChatReadInFirestore(chatId, userId, currentChat).catch((error) =>
      console.warn("Unable to mark Firestore chat as read.", error),
    );
  };

  const getChat = (chatId) =>
    normalizeChatForState(chats.find((c) => c.id === chatId) || {});
  const updateChatRecord = (chatId, updates = {}) => {
    const previous =
      chats.find((chat) => chat.id === chatId) ||
      getChats().find((chat) => chat.id === chatId);
    if (!previous) return null;
    const updated = normalizeChatForState({
      ...previous,
      ...updates,
      updatedAt: new Date().toISOString(),
      updatedAtIso: new Date().toISOString(),
    });
    storageUpdateChat(chatId, updated);
    setChats((items) =>
      normalizeChatListForState([
        updated,
        ...items.filter((item) => item.id !== chatId),
      ]),
    );
    updateChatInFirestore(chatId, updates).catch((error) =>
      console.warn("Unable to update Firestore chat.", error),
    );
    return updated;
  };

  const updateChatMessage = (chatId, messageId, updater) => {
    const previous =
      chats.find((chat) => chat.id === chatId) ||
      getChats().find((chat) => chat.id === chatId);
    if (!previous) return null;
    const messages = (previous.messages || []).map((message) =>
      message.id !== messageId
        ? message
        : typeof updater === "function"
          ? updater(message)
          : { ...message, ...updater },
    );
    const updated = normalizeChatForState({
      ...previous,
      messages,
      updatedAt: new Date().toISOString(),
      updatedAtIso: new Date().toISOString(),
    });
    storageUpdateChatMessage(chatId, messageId, updater);
    setChats((items) =>
      normalizeChatListForState([
        updated,
        ...items.filter((item) => item.id !== chatId),
      ]),
    );
    updateChatMessageInFirestore(chatId, previous, messageId, updater).catch(
      (error) =>
        console.warn("Unable to update Firestore chat message.", error),
    );
    return updated;
  };

  const editChatMessage = (
    chatId,
    messageId,
    text,
    editorUser = currentUser,
  ) => {
    const cleanText = String(text || "").trim();
    if (!cleanText) throw new Error("Edited message cannot be empty.");
    return updateChatMessage(chatId, messageId, (message) => ({
      ...message,
      text: cleanText,
      edited: true,
      editedAt: new Date().toISOString(),
      editedBy: editorUser?.id || editorUser?.uid || "",
    }));
  };

  const toggleMessageReaction = (
    chatId,
    messageId,
    reaction = "like",
    reactingUser = currentUser,
  ) => {
    const actorKeys = getIdentityKeys(reactingUser);
    const actorKey =
      actorKeys[0] ||
      reactingUser?.id ||
      reactingUser?.uid ||
      reactingUser?.email;
    if (!actorKey) return null;
    const chatBeforeUpdate =
      chats.find((chat) => chat.id === chatId) ||
      getChats().find((chat) => chat.id === chatId);
    const originalMessage = (chatBeforeUpdate?.messages || []).find(
      (message) => message.id === messageId,
    );
    let didAddReaction = false;
    const updated = updateChatMessage(chatId, messageId, (message) => {
      const reactions = { ...(message.reactions || {}) };
      const current = new Set(
        (reactions[reaction] || []).map((item) => String(item)),
      );
      if (current.has(String(actorKey))) {
        current.delete(String(actorKey));
        didAddReaction = false;
      } else {
        current.add(String(actorKey));
        didAddReaction = true;
      }
      reactions[reaction] = [...current];
      return { ...message, reactions, reactedAt: new Date().toISOString() };
    });
    if (didAddReaction && originalMessage) {
      const senderKey = String(originalMessage.senderId || "");
      const senderProfile = (chatBeforeUpdate?.participantProfiles || []).find(
        (profile) =>
          getIdentityKeys(profile).some((key) => String(key) === senderKey),
      );
      const targetIds = uniqueTargets(
        [originalMessage.senderId],
        senderProfile ? getIdentityKeys(senderProfile) : [],
      ).filter((key) => !actorKeys.map(String).includes(String(key)));
      if (targetIds.length) {
        createNotificationRecord({
          type: "chat",
          title: "Message Reaction",
          message: `${reactingUser?.name || "A resident"} reacted 👍 to your message.`,
          priority: "low",
          actionPath: `/chat?chat=${chatId}`,
          relatedChat: chatId,
          targetUserIds: targetIds,
          targetBarangay:
            senderProfile?.barangay ||
            chatBeforeUpdate?.barangay ||
            reactingUser?.barangay ||
            "",
        });
      }
    }
    return updated;
  };

  const endChat = (chatId, reason, actorUser = currentUser) => {
    const cleanReason =
      String(reason || "").trim() || "Conversation ended by a participant.";
    const actorName = actorUser?.name || actorUser?.email || "Resident";
    const now = new Date().toISOString();
    const updates = {
      status: "ended",
      endedAt: now,
      endedBy: actorUser?.id || actorUser?.uid || actorUser?.email || "",
      endedByName: actorName,
      endReason: cleanReason,
      lastMessage: `Chat ended by ${actorName}`,
      lastMessageAt: now,
      lastMessageTime: new Date(now).toLocaleString([], {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }),
    };
    const updated = updateChatRecord(chatId, updates);
    if (updated) {
      const actorKeys = new Set(getIdentityKeys(actorUser));
      const targetIds = uniqueTargets(
        updated.participants || [],
        updated.participantKeys || [],
        (updated.participantProfiles || [])
          .filter(
            (profile) =>
              !getIdentityKeys(profile).some((key) =>
                actorKeys.has(String(key)),
              ),
          )
          .flatMap((profile) => getIdentityKeys(profile)),
      );
      if (targetIds.length) {
        createNotificationRecord({
          type: "chat",
          title: "Chat Ended",
          message: `${actorName} ended the conversation. Reason: ${cleanReason}`,
          priority: "normal",
          actionPath: `/chat?chat=${chatId}`,
          relatedChat: chatId,
          targetUserIds: targetIds,
          targetBarangay: updated.barangay || actorUser?.barangay || "",
        });
      }
    }
    return updated;
  };

  // ----- Notification functions (unchanged) -----
  const addNotification = (notification) => {
    const newNotification = createNotificationRecord(notification);
    return newNotification;
  };

  const markNotificationRead = (notificationId) => {
    if (!notificationId) return;
    storageMarkNotificationRead(notificationId);
    markLocalNotificationRead(notificationId, currentUser);
    const currentKeys = getIdentityKeys(currentUser);
    setAllNotifications((items) =>
      normalizeNotificationList(
        items.map((notification) =>
          notification.id === notificationId
            ? {
                ...notification,
                read: true,
                readBy: Array.from(
                  new Set(
                    [...(notification.readBy || []), ...currentKeys].filter(
                      Boolean,
                    ),
                  ),
                ),
              }
            : notification,
        ),
        currentUser,
      ),
    );
    markNotificationReadInFirestore(notificationId, currentUser).catch(
      (error) =>
        console.warn("Unable to mark Firestore notification as read.", error),
    );
  };

  const getVisibleNotifications = (currentUser) =>
    normalizeNotificationList(allNotifications, currentUser).filter(
      (notification) =>
        !isNotificationExpired(notification) &&
        notificationVisibleToUser(notification, currentUser),
    );

  const markAllVisibleNotificationsRead = (currentUser) => {
    const visibleIds = getVisibleNotifications(currentUser).map(
      (notification) => notification.id,
    );
    if (!visibleIds.length) return;
    storageMarkManyNotificationsRead(visibleIds);
    markLocalNotificationsRead(visibleIds, currentUser);
    const idSet = new Set(visibleIds);
    const currentKeys = getIdentityKeys(currentUser);
    setAllNotifications((items) =>
      normalizeNotificationList(
        items.map((notification) =>
          idSet.has(notification.id)
            ? {
                ...notification,
                read: true,
                readBy: Array.from(
                  new Set(
                    [...(notification.readBy || []), ...currentKeys].filter(
                      Boolean,
                    ),
                  ),
                ),
              }
            : notification,
        ),
        currentUser,
      ),
    );
    markManyNotificationsReadInFirestore(visibleIds, currentUser).catch(
      (error) =>
        console.warn("Unable to mark Firestore notifications as read.", error),
    );
  };

  const getCurrentUserDeleteKeys = (currentUser) =>
    getIdentityKeys(currentUser);
  const deleteNotificationsByIds = (notificationIds = [], currentUser) => {
    const ids = [
      ...new Set(
        (notificationIds || []).filter(Boolean).map((id) => String(id)),
      ),
    ];
    if (!ids.length) return 0;
    const deleteKeys = getCurrentUserDeleteKeys(currentUser);
    const idSet = new Set(ids);
    markLocalNotificationsDeleted(ids, currentUser);
    storageDeleteManyNotificationsForTargets(ids, deleteKeys);
    setAllNotifications((items) =>
      normalizeNotificationList(
        items.map((notification) =>
          idSet.has(String(notification.id))
            ? {
                ...notification,
                deletedBy: Array.from(
                  new Set(
                    [...(notification.deletedBy || []), ...deleteKeys].filter(
                      Boolean,
                    ),
                  ),
                ),
                deletedAtIso: new Date().toISOString(),
              }
            : notification,
        ),
        currentUser,
      ),
    );
    deleteManyNotificationsForUserInFirestore(ids, currentUser).catch((error) =>
      console.warn("Unable to delete Firestore notifications.", error),
    );
    return ids.length;
  };

  const deleteNotification = (notificationId, currentUser) => {
    if (!notificationId) return 0;
    markLocalNotificationDeleted(notificationId, currentUser);
    return deleteNotificationsByIds([notificationId], currentUser);
  };

  const deleteVisibleNotifications = (currentUser, options = {}) => {
    const { onlyRead = false, onlyUnread = false, type = "all" } = options;
    const visible = getVisibleNotifications(currentUser).filter(
      (notification) => {
        const matchesType = type === "all" || notification.type === type;
        const matchesRead = onlyRead ? notification.read : true;
        const matchesUnread = onlyUnread ? !notification.read : true;
        return matchesType && matchesRead && matchesUnread;
      },
    );
    const visibleIds = visible
      .map((notification) => notification.id)
      .filter(Boolean);
    return deleteNotificationsByIds(visibleIds, currentUser);
  };

  const getNotificationPath = (notification, currentUser) => {
    if (!notification)
      return currentUser?.role === "barangay_admin"
        ? "/admin/dashboard"
        : "/dashboard";
    const buildQuery = (extra = {}) => {
      const params = new URLSearchParams();
      params.set("from", "notifications");
      if (notification.id) params.set("notif", notification.id);
      if (notification.relatedResponse)
        params.set("responseId", notification.relatedResponse);
      if (notification.actorUserId)
        params.set("actor", notification.actorUserId);
      if (notification.relatedCaseType)
        params.set("case", notification.relatedCaseType);
      Object.entries(extra).forEach(([key, value]) => {
        if (value) params.set(key, value);
      });
      const query = params.toString();
      return query ? `?${query}` : "";
    };
    if (notification.relatedChat)
      return `/chat?chat=${notification.relatedChat}&from=notifications${notification.id ? `&notif=${notification.id}` : ""}`;
    if (notification.relatedPost) {
      const relatedType = notification.relatedPostType || "post";
      const source =
        relatedType === "lost_found"
          ? "lost-found"
          : relatedType === "job"
            ? "jobs"
            : "notifications";
      if (currentUser?.role === "barangay_admin")
        return `/admin/post/${notification.relatedPost}${buildQuery({ source })}`;
      return `/post/${notification.relatedPost}${buildQuery()}`;
    }
    if (notification.relatedEmergency)
      return currentUser?.role === "barangay_admin"
        ? `/admin/emergencies${buildQuery({ emergency: notification.relatedEmergency })}`
        : `/emergency${buildQuery({ emergency: notification.relatedEmergency })}`;
    if (notification.relatedAppointment)
      return currentUser?.role === "barangay_admin"
        ? `/admin/appointments${buildQuery({ appointment: notification.relatedAppointment })}`
        : `/appointment-request${buildQuery({ appointment: notification.relatedAppointment })}`;
    if (notification.relatedAnnouncement)
      return currentUser?.role === "barangay_admin"
        ? `/admin/announcements${buildQuery({ announcement: notification.relatedAnnouncement })}`
        : `/announcements/${notification.relatedAnnouncement}${buildQuery({ announcement: notification.relatedAnnouncement })}`;
    if (notification.relatedReport)
      return `/admin/reports${buildQuery({ report: notification.relatedReport })}`;
    if (notification.actionPath) return notification.actionPath;
    return currentUser?.role === "barangay_admin"
      ? "/admin/dashboard"
      : "/dashboard";
  };

  // ----- Emergency functions (modified: removed loadAllData) -----
  const createEmergency = (emergencyData) => {
    const payload = lockBarangayForResident(
      emergencyData,
      emergencyData.author,
    );
    const severityInsight = scoreEmergencySeverity(payload);
    const duplicateMatches = findPotentialDuplicateEmergencies(
      payload,
      emergencies,
    );
    const newEmergency = storageCreateEmergency({
      ...payload,
      severity: severityInsight.suggestedSeverity,
      smartSeverityScore: severityInsight.score,
      smartSeverityReasons: severityInsight.reasons,
      possibleDuplicateEmergencyIds: duplicateMatches.map(
        (item) => item.emergency.id,
      ),
      duplicateWarning: duplicateMatches.length
        ? `Possible duplicate of ${duplicateMatches[0].emergency.title}`
        : "",
      status: EMERGENCY_STATUS.NEW,
      emergencyType: payload.emergencyType || "Other Critical Incident",
      userId:
        payload.userId ||
        payload.authorId ||
        payload.author?.id ||
        payload.author?.uid ||
        "",
      authorId:
        payload.authorId ||
        payload.userId ||
        payload.author?.id ||
        payload.author?.uid ||
        "",
      visibility: {
        showToPublic: false,
        exactPinAdminOnly: true,
        ...(payload.visibility || {}),
      },
      adminNotes: [],
      statusHistory: [
        {
          status: EMERGENCY_STATUS.NEW,
          note: "Emergency report submitted by resident.",
          createdAt: new Date().toISOString(),
          updatedBy: payload.author?.name || "Resident",
        },
      ],
    });
    setEmergencies((items) => [
      newEmergency,
      ...items.filter((item) => item.id !== newEmergency.id),
    ]);
    createEmergencyInFirestore(newEmergency).catch((error) =>
      console.warn("Unable to save Firestore emergency report.", error),
    );
    createNotificationRecord({
      type: "emergency",
      title: "New Emergency Report",
      message: `New private ${newEmergency.emergencyType || "emergency"} report assigned to ${newEmergency.handlerBarangay || newEmergency.incidentBarangay || newEmergency.barangay}: ${newEmergency.title}. ${newEmergency.reporterRole === "self" ? "Reporter says they need help." : newEmergency.reporterRole === "other_person" ? "Reporter is helping someone else." : "Reporter is a witness."}${newEmergency.isCrossBarangay ? ` Reporter home barangay: ${newEmergency.reporterHomeBarangay}.` : ""}${newEmergency.duplicateWarning ? ` (${newEmergency.duplicateWarning})` : ""}`,
      priority:
        String(newEmergency.severity || "").toLowerCase() === "critical"
          ? "critical"
          : "high",
      actionPath: "/admin/emergencies",
      targetRole: "barangay_admin",
      barangay:
        newEmergency.handlerBarangay ||
        newEmergency.incidentBarangay ||
        newEmergency.barangay,
      targetBarangay:
        newEmergency.handlerBarangay ||
        newEmergency.incidentBarangay ||
        newEmergency.barangay,
      relatedEmergency: newEmergency.id,
    });
    if (newEmergency.isCrossBarangay && newEmergency.reporterHomeBarangay) {
      createNotificationRecord({
        type: "emergency",
        title: "Cross-Barangay Emergency Support",
        message: `Your resident submitted an emergency report in ${newEmergency.handlerBarangay || newEmergency.incidentBarangay}. You have support visibility only; the incident barangay handles the main response.`,
        priority: "high",
        actionPath: "/admin/emergencies",
        targetRole: "barangay_admin",
        barangay: newEmergency.reporterHomeBarangay,
        targetBarangay: newEmergency.reporterHomeBarangay,
        relatedEmergency: newEmergency.id,
      });
    }
    return newEmergency;
  };

  const updateEmergency = (emergencyId, updates = {}, adminUser = null) => {
    const previous =
      emergencies.find((emergency) => emergency.id === emergencyId) ||
      getEmergencies().find((emergency) => emergency.id === emergencyId);
    if (!previous) {
      console.warn(
        "Emergency status update skipped because the record was not found:",
        emergencyId,
      );
      return null;
    }
    const nextStatus = updates.status
      ? EMERGENCY_STATUS_OPTIONS.find(
          (status) =>
            status.toLowerCase() === String(updates.status).toLowerCase(),
        ) || previous.status
      : previous.status;
    const updateNote = updates.adminNote || updates.note || "";
    const shouldAppendHistory =
      updates.status || updateNote || updates.responseBy || updates.respondedAt;
    const nextHistory = shouldAppendHistory
      ? [
          ...(Array.isArray(previous.statusHistory)
            ? previous.statusHistory
            : []),
          {
            status: nextStatus,
            note: updateNote || `Status updated to ${nextStatus}.`,
            createdAt: new Date().toISOString(),
            updatedBy: adminUser?.name || updates.updatedBy || "Barangay Admin",
          },
        ]
      : previous.statusHistory;
    const nextAdminNotes = updateNote
      ? [
          ...(Array.isArray(previous.adminNotes) ? previous.adminNotes : []),
          {
            id: `enote-${Date.now()}`,
            note: updateNote,
            createdAt: new Date().toISOString(),
            createdBy: adminUser?.name || updates.updatedBy || "Barangay Admin",
          },
        ]
      : previous.adminNotes;
    const timestamp = new Date().toISOString();
    const shouldShowPublicEmergency = false;
    const emergencyHandlerBarangay =
      previous.handlerBarangay ||
      previous.incidentBarangay ||
      previous.barangay;
    const emergencySupportBarangays = Array.from(
      new Set(
        [
          ...(Array.isArray(previous.supportBarangays)
            ? previous.supportBarangays
            : []),
          ...(previous.isCrossBarangay && previous.reporterHomeBarangay
            ? [previous.reporterHomeBarangay]
            : []),
        ].filter(Boolean),
      ),
    );
    const updatePayload = {
      ...updates,
      status: nextStatus,
      visibility: {
        ...(previous.visibility || {}),
        ...(updates.visibility || {}),
        showToPublic: false,
        exactPinAdminOnly: true,
      },
      adminNotes: nextAdminNotes,
      statusHistory: nextHistory,
      lastUpdatedAt: timestamp,
      lastUpdatedBy:
        adminUser?.name || updates.updatedBy || previous.lastUpdatedBy,
    };
    const updated = normalizeEmergency({
      ...previous,
      ...updatePayload,
      updatedAt: timestamp,
    });
    setEmergencies((items) =>
      items.map((item) => (item.id === emergencyId ? updated : item)),
    );
    try {
      storageUpdateEmergency(emergencyId, updatePayload);
    } catch (error) {
      console.warn("Unable to update local emergency cache.", error);
    }
    updateEmergencyInFirestore(emergencyId, updatePayload).catch((error) =>
      console.warn("Unable to update Firestore emergency report.", error),
    );
    if (adminUser && (updates.status || updateNote)) {
      recordAudit({
        action: "update_emergency",
        adminUser,
        targetType: "emergency",
        targetId: emergencyId,
        barangay: emergencyHandlerBarangay,
        notes: updateNote || `Emergency status updated to ${nextStatus}.`,
        metadata: {
          previousStatus: previous.status,
          nextStatus,
          title: previous.title,
        },
      });
    }
    const reporterTargets = uniqueTargets(
      previous.authorId,
      previous.userId,
      previous.author?.id,
      previous.author?.uid,
      previous.author?.email,
    );
    if ((updates.status || updateNote) && reporterTargets.length) {
      const isFalseReport = nextStatus === EMERGENCY_STATUS.FALSE_REPORT;
      const statusTitle =
        nextStatus === EMERGENCY_STATUS.ONGOING
          ? "Barangay Responding"
          : nextStatus === EMERGENCY_STATUS.RESOLVED
            ? "Emergency Resolved"
            : isFalseReport
              ? "Emergency Report Closed"
              : "Emergency Status Update";
      const safeReporterMessage = isFalseReport
        ? "Your emergency report was closed after barangay review. It will not be shown in the resident emergency feed."
        : `Emergency update: "${previous.title}" is now ${nextStatus}${updateNote ? ` — ${updateNote}` : ""}.`;
      createNotificationRecord({
        type: "emergency",
        title: statusTitle,
        message: safeReporterMessage,
        priority:
          nextStatus === EMERGENCY_STATUS.RESOLVED || isFalseReport
            ? "normal"
            : "high",
        actionPath: "/emergency",
        targetUserIds: reporterTargets,
        barangay: emergencyHandlerBarangay,
        targetBarangay: emergencyHandlerBarangay,
        relatedEmergency: isFalseReport ? "" : previous.id,
      });
    }
    if ((updates.status || updateNote) && emergencySupportBarangays.length) {
      emergencySupportBarangays.forEach((supportBarangay) => {
        if (!supportBarangay || supportBarangay === emergencyHandlerBarangay)
          return;
        createNotificationRecord({
          type: "emergency",
          title: "Cross-Barangay Emergency Updated",
          message: `Support visibility update: "${previous.title}" is now ${nextStatus}${updateNote ? ` — ${updateNote}` : ""}. The incident barangay remains the primary handler.`,
          priority:
            nextStatus === EMERGENCY_STATUS.RESOLVED ||
            nextStatus === EMERGENCY_STATUS.FALSE_REPORT
              ? "normal"
              : "high",
          actionPath: "/admin/emergencies",
          targetRole: "barangay_admin",
          barangay: supportBarangay,
          targetBarangay: supportBarangay,
          relatedEmergency: previous.id,
        });
      });
    }
    if (shouldShowPublicEmergency) {
    }
    return updated;
  };

  // ----- Appointment functions (modified: removed loadAllData) -----
  const createAppointment = (appointmentData) => {
    const actor = currentUser || {
      id: appointmentData.userId,
      uid: appointmentData.uid,
      email: appointmentData.email,
      barangay: appointmentData.barangay,
      role: "resident",
    };
    assertResidentCanCreate(
      actor,
      RESTRICTED_RESIDENT_ACTIONS.CREATE_APPOINTMENT,
    );
    const payload = lockBarangayForResident(appointmentData, actor);
    const service = getServiceById(payload.serviceId || payload.serviceType);
    const allAppointmentRecords = mergeRecordsById(
      appointments,
      getAppointments(),
    );
    const duplicate = findDuplicateActiveAppointment(allAppointmentRecords, {
      ...payload,
      userId: payload.userId || actor.id || actor.uid,
      uid: actor.uid,
      email: actor.email,
      serviceId: service.id,
    });
    if (duplicate) {
      const error = new Error(
        `You already have an active ${service.name} appointment (${duplicate.status}).`,
      );
      error.code = "DUPLICATE_APPOINTMENT";
      error.appointment = duplicate;
      throw error;
    }
    const validation = validateAppointmentRequest({
      appointmentData: {
        ...payload,
        serviceId: service.id,
        serviceType: service.name,
      },
      appointments: allAppointmentRecords,
      schedule: DEFAULT_BARANGAY_SCHEDULE,
    });
    if (!validation.valid) {
      const error = new Error(validation.message);
      error.code = "INVALID_APPOINTMENT_SLOT";
      throw error;
    }
    const now = new Date();
    const referenceNumber =
      payload.referenceNumber ||
      payload.trackingNumber ||
      buildAppointmentReference(
        payload.preferredDate,
        allAppointmentRecords.length,
      );
    const checkInCode =
      payload.checkInCode || buildCheckInCode(referenceNumber);
    const newAppointment = storageCreateAppointment({
      ...payload,
      userId: payload.userId || actor.id || actor.uid,
      userName: payload.userName || actor.name || "Resident",
      userPhotoURL:
        payload.userPhotoURL || actor.photoURL || actor.profilePicture || "",
      serviceId: service.id,
      serviceType: service.name,
      serviceName: service.name,
      category: service.category,
      estimatedDuration: service.estimatedDuration,
      requirements: service.requirements,
      requirementsStatus: payload.requirementsStatus || "For checking",
      status: APPOINTMENT_STATUS.PENDING,
      scheduledDate: payload.preferredDate,
      scheduledTime: payload.preferredTime,
      referenceNumber,
      trackingNumber: referenceNumber,
      checkInCode,
      qrCodeValue: `${referenceNumber}|${checkInCode}`,
      requestedAt: now.toLocaleString([], {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }),
      appointmentLogs: [
        {
          action: "submitted",
          status: APPOINTMENT_STATUS.PENDING,
          note: "Appointment request submitted by resident.",
          createdAt: now.toISOString(),
          updatedBy: payload.userName || actor.name || "Resident",
          actorRole: "resident",
        },
      ],
      statusHistory: [
        {
          status: APPOINTMENT_STATUS.PENDING,
          note: "Appointment request submitted by resident.",
          createdAt: now.toISOString(),
          updatedBy: payload.userName || actor.name || "Resident",
        },
      ],
    });
    setAppointments((items) =>
      sortNewestFirst([
        newAppointment,
        ...items.filter((item) => item.id !== newAppointment.id),
      ]),
    );
    createAppointmentInFirestore(newAppointment).catch((error) =>
      console.warn("Unable to save Firestore appointment request.", error),
    );
    createNotificationRecord({
      type: "appointment",
      title: "New Appointment Request",
      message: `${newAppointment.userName} requested ${newAppointment.serviceType} on ${newAppointment.preferredDate} at ${newAppointment.preferredTime}.`,
      priority: "medium",
      actionPath: "/admin/appointments",
      targetRole: "barangay_admin",
      targetBarangay: newAppointment.barangay,
      relatedAppointment: newAppointment.id,
      dedupeKey: `appointment-created-${newAppointment.id}`,
    });
    recordAudit({
      action: "create_appointment",
      adminUser: actor,
      targetType: "appointment",
      targetId: newAppointment.id,
      barangay: newAppointment.barangay,
      notes: `${newAppointment.serviceType} appointment submitted.`,
      metadata: {
        serviceType: newAppointment.serviceType,
        schedule: `${newAppointment.preferredDate} ${newAppointment.preferredTime}`,
      },
    });
    return newAppointment;
  };

  const updateAppointment = (appointmentId, updates = {}, actorUser = null) => {
    const previous =
      appointments.find((appointment) => appointment.id === appointmentId) ||
      getAppointments().find((appointment) => appointment.id === appointmentId);
    if (!previous) {
      console.warn(
        "Appointment status update skipped because the record was not found:",
        appointmentId,
      );
      return null;
    }
    const nextStatus = updates.status
      ? APPOINTMENT_STATUS_OPTIONS.find(
          (status) =>
            status.toLowerCase() === String(updates.status).toLowerCase(),
        ) || previous.status
      : previous.status;
    const now = new Date();
    const note = updates.adminNotes || updates.note || "";
    const scheduleChanged = Boolean(
      updates.preferredDate || updates.preferredTime,
    );
    const nextPreferredDate = updates.preferredDate || previous.preferredDate;
    const nextPreferredTime = updates.preferredTime || previous.preferredTime;
    const service = getServiceById(previous.serviceId || previous.serviceType);
    if (updates.status && previous.status === nextStatus && !scheduleChanged) {
      const error = new Error(
        `This appointment is already marked as ${nextStatus}.`,
      );
      error.code = "DUPLICATE_APPOINTMENT_ACTION";
      throw error;
    }
    if (
      scheduleChanged ||
      [APPOINTMENT_STATUS.RESCHEDULE_REQUESTED].includes(nextStatus)
    ) {
      const allAppointmentRecords = mergeRecordsById(
        appointments,
        getAppointments(),
      );
      const validation = validateAppointmentRequest({
        appointmentData: {
          ...previous,
          ...updates,
          serviceId: service.id,
          serviceType: service.name,
          preferredDate: nextPreferredDate,
          preferredTime: nextPreferredTime,
        },
        appointments: allAppointmentRecords,
        schedule: DEFAULT_BARANGAY_SCHEDULE,
        excludeId: appointmentId,
      });
      if (!validation.valid) {
        const error = new Error(validation.message);
        error.code = "INVALID_APPOINTMENT_SLOT";
        throw error;
      }
    }
    const actorName =
      actorUser?.name ||
      updates.updatedBy ||
      (actorUser?.role === "resident" ? "Resident" : "Barangay Admin");
    const actorRole = actorUser?.role || updates.actorRole || "barangay_admin";
    const historyEntry = {
      status: nextStatus,
      note:
        note ||
        (scheduleChanged
          ? `Schedule changed to ${nextPreferredDate} ${nextPreferredTime}.`
          : `Status updated to ${nextStatus}.`),
      createdAt: now.toISOString(),
      updatedBy: actorName,
      actorRole,
    };
    const logEntry = {
      action: updates.action || "status_update",
      status: nextStatus,
      note: historyEntry.note,
      createdAt: now.toISOString(),
      updatedBy: actorName,
      actorRole,
    };
    const updatePayload = {
      ...updates,
      status: nextStatus,
      preferredDate: nextPreferredDate,
      preferredTime: nextPreferredTime,
      scheduledDate: nextPreferredDate,
      scheduledTime: nextPreferredTime,
      rescheduledDate: [
        APPOINTMENT_STATUS.RESCHEDULED,
        APPOINTMENT_STATUS.RESCHEDULE_REQUESTED,
      ].includes(nextStatus)
        ? nextPreferredDate
        : updates.rescheduledDate || previous.rescheduledDate,
      rescheduledTime: [
        APPOINTMENT_STATUS.RESCHEDULED,
        APPOINTMENT_STATUS.RESCHEDULE_REQUESTED,
      ].includes(nextStatus)
        ? nextPreferredTime
        : updates.rescheduledTime || previous.rescheduledTime,
      adminNotes: note || previous.adminNotes || "",
      lastUpdatedAt: now.toISOString(),
      lastUpdatedBy: actorName,
      lastActorRole: actorRole,
      lastAppointmentAction:
        updates.action || previous.lastAppointmentAction || "status_update",
      statusHistory: [
        ...(Array.isArray(previous.statusHistory)
          ? previous.statusHistory
          : []),
        historyEntry,
      ],
      appointmentLogs: [
        ...(Array.isArray(previous.appointmentLogs)
          ? previous.appointmentLogs
          : []),
        logEntry,
      ],
    };
    const updated = normalizeAppointment({
      ...previous,
      ...updatePayload,
      updatedAt: now.toISOString(),
    });
    setAppointments((items) =>
      sortNewestFirst(
        items.map((item) => (item.id === appointmentId ? updated : item)),
      ),
    );
    try {
      storageUpdateAppointment(appointmentId, updatePayload);
    } catch (error) {
      console.warn("Unable to update local appointment cache.", error);
    }
    updateAppointmentInFirestore(appointmentId, updatePayload).catch((error) =>
      console.warn("Unable to update Firestore appointment request.", error),
    );
    if (actorUser && (updates.status || note || scheduleChanged)) {
      recordAudit({
        action:
          actorRole === "resident"
            ? "resident_update_appointment"
            : "update_appointment",
        adminUser: actorUser,
        targetType: "appointment",
        targetId: appointmentId,
        barangay: previous.barangay,
        notes: note || `Appointment status updated to ${nextStatus}.`,
        metadata: {
          previousStatus: previous.status,
          nextStatus,
          serviceType: previous.serviceType,
          scheduleChanged,
        },
      });
    }
    const scheduleText = scheduleChanged
      ? ` New schedule: ${nextPreferredDate} at ${nextPreferredTime}.`
      : "";
    if (actorRole === "barangay_admin" && previous?.userId) {
      createNotificationRecord({
        type: "appointment",
        title: "Appointment Status Updated",
        message: `Your appointment for ${previous.serviceType} is now ${nextStatus}.${scheduleText}${note ? ` Note: ${note}` : ""}`,
        priority: [
          APPOINTMENT_STATUS.REJECTED,
          APPOINTMENT_STATUS.CANCELLED,
          APPOINTMENT_STATUS.NO_SHOW,
        ].includes(nextStatus)
          ? "medium"
          : "normal",
        actionPath: "/appointment-request",
        targetUserIds: [previous.userId],
        targetBarangay: previous.barangay,
        relatedAppointment: previous.id,
        dedupeKey: `appointment-user-update-${previous.id}-${updates.action || "status"}-${nextStatus}-${nextPreferredDate}-${nextPreferredTime}`,
      });
    }
    if (actorRole === "resident") {
      createNotificationRecord({
        type: "appointment",
        title: "Resident Appointment Response",
        message: `${previous.userName || "Resident"} updated ${previous.serviceType} to ${nextStatus}.${note ? ` Note: ${note}` : ""}`,
        priority: "medium",
        actionPath: "/admin/appointments",
        targetRole: "barangay_admin",
        targetBarangay: previous.barangay,
        relatedAppointment: previous.id,
        dedupeKey: `appointment-admin-update-${previous.id}-${updates.action || "status"}-${nextStatus}-${nextPreferredDate}-${nextPreferredTime}`,
      });
    }
    return updated;
  };

  // ----- Announcement functions (unchanged) -----
  const createAnnouncement = (announcementData) => {
    const targetMode = announcementData.targetMode || "barangay";
    const targetBarangays = Array.isArray(announcementData.targetBarangays)
      ? announcementData.targetBarangays.filter(Boolean)
      : [];
    const newAnnouncement = storageCreateAnnouncement({
      ...announcementData,
      targetMode,
      targetBarangays,
      barangay: announcementData.barangay || currentUser?.barangay,
      createdBy:
        announcementData.createdBy || currentUser?.name || "Barangay Admin",
      createdById: announcementData.createdById || currentUser?.id || "",
      status: announcementData.status || "Published",
      audience:
        announcementData.audience ||
        (targetMode === "all"
          ? "All San Miguel residents"
          : targetMode === "specific"
            ? "Selected barangays"
            : "Residents"),
    });
    setAnnouncements((items) =>
      sortNewestFirst([
        newAnnouncement,
        ...items.filter((item) => item.id !== newAnnouncement.id),
      ]),
    );
    createAnnouncementInFirestore(newAnnouncement).catch((error) =>
      console.warn("Unable to save Firestore announcement.", error),
    );
    recordAudit({
      action: "create_announcement",
      adminUser: currentUser,
      targetType: "announcement",
      targetId: newAnnouncement.id,
      barangay: newAnnouncement.barangay,
      notes: `Announcement created: ${newAnnouncement.title}`,
      metadata: {
        priority: newAnnouncement.priority,
        status: newAnnouncement.status,
        targetMode: newAnnouncement.targetMode,
        targetBarangays: newAnnouncement.targetBarangays,
        category: newAnnouncement.category,
      },
    });
    createNotificationRecord({
      type: "announcement",
      title:
        newAnnouncement.priority === "high"
          ? "Urgent Barangay Announcement"
          : "New Barangay Announcement",
      message: `${newAnnouncement.category || "Announcement"}: ${newAnnouncement.title}`,
      priority: newAnnouncement.priority === "high" ? "high" : "normal",
      actionPath:
        newAnnouncement.actionPath || `/announcements/${newAnnouncement.id}`,
      actionLabel: newAnnouncement.actionLabel || "Read Announcement",
      targetRole: "resident",
      targetBarangay:
        newAnnouncement.targetMode === "barangay"
          ? newAnnouncement.barangay
          : "",
      targetBarangays:
        newAnnouncement.targetMode === "specific"
          ? newAnnouncement.targetBarangays
          : [],
      audience: newAnnouncement.audience,
      relatedAnnouncement: newAnnouncement.id,
      dedupeKey: `announcement-created-${newAnnouncement.id}`,
    });
    return newAnnouncement;
  };

  const updateAnnouncement = (announcementId, updates) => {
    const previous = getAnnouncements().find(
      (item) => item.id === announcementId,
    );
    const updated = storageUpdateAnnouncement(announcementId, updates);
    if (updated) {
      setAnnouncements((items) =>
        items.map((item) => (item.id === announcementId ? updated : item)),
      );
      const { announceUpdate, ...firestoreUpdates } = updates;
      updateAnnouncementInFirestore(announcementId, firestoreUpdates).catch(
        (error) =>
          console.warn("Unable to update Firestore announcement.", error),
      );
      recordAudit({
        action: "update_announcement",
        adminUser: currentUser,
        targetType: "announcement",
        targetId: announcementId,
        barangay: updated.barangay,
        notes: `Announcement updated: ${updated.title}`,
        metadata: {
          announceUpdate: Boolean(updates.announceUpdate),
          changedFields: Object.keys(updates || {}),
        },
      });
    }
    if (updated && updates.announceUpdate) {
      createNotificationRecord({
        type: "announcement",
        title: "Barangay Announcement Updated",
        message: `Barangay announcement updated: ${updated.title}`,
        priority: updated.priority === "high" ? "high" : "normal",
        actionPath: `/announcements/${updated.id}`,
        targetRole: "resident",
        targetBarangay:
          updated.targetMode === "barangay" ? updated.barangay : "",
        targetBarangays:
          updated.targetMode === "specific"
            ? updated.targetBarangays || []
            : [],
        actionLabel: updated.actionLabel || "Read Announcement",
        relatedAnnouncement: updated.id,
      });
    }
    return updated || previous;
  };

  const deleteAnnouncement = (announcementId) => {
    const previous =
      announcements.find((item) => item.id === announcementId) ||
      getAnnouncements().find((item) => item.id === announcementId);
    storageDeleteAnnouncement(announcementId);
    setAnnouncements((items) =>
      items.filter((item) => item.id !== announcementId),
    );
    deleteAnnouncementFromFirestore(announcementId).catch((error) =>
      console.warn("Unable to delete Firestore announcement.", error),
    );
    recordAudit({
      action: "delete_announcement",
      adminUser: currentUser,
      targetType: "announcement",
      targetId: announcementId,
      barangay: previous?.barangay || currentUser?.barangay || "",
      notes: previous?.title
        ? `Announcement deleted: ${previous.title}`
        : "Announcement deleted.",
    });
  };

  // ----- Report functions (unchanged) -----
  const getReportTarget = (report) => {
    if (!report) return { post: null, targetUser: null };
    const postKeys = [
      report.targetId,
      report.relatedPost,
      report.relatedPostId,
      report.postId,
      report.linkedPostId,
    ]
      .filter(Boolean)
      .map((item) => String(item));
    const post = postKeys.length
      ? allPosts.find((item) => postKeys.includes(String(item.id)))
      : null;
    const targetUserId =
      report.targetUserId || report.reportedUserId || post?.author?.id || "";
    const targetUser = targetUserId ? findUserRecord(targetUserId) : null;
    return { post, targetUser };
  };
  const resolveReportHandlerBarangay = (
    reportData = {},
    targetPost = null,
    targetUser = null,
  ) => {
    const reporterBarangay =
      reportData.reporterBarangay ||
      reportData.reportedByBarangay ||
      currentUser?.barangay ||
      reportData.barangay ||
      "";
    return (
      reportData.handlerBarangay ||
      reportData.incidentBarangay ||
      targetPost?.incidentBarangay ||
      targetPost?.handlerBarangay ||
      targetPost?.barangay ||
      targetUser?.barangay ||
      reportData.barangay ||
      reporterBarangay ||
      ""
    );
  };

  const createReport = (reportData) => {
    assertResidentCanCreate(
      currentUser,
      RESTRICTED_RESIDENT_ACTIONS.CREATE_REPORT,
    );
    const targetPostKeys = [
      reportData.targetId,
      reportData.relatedPost,
      reportData.relatedPostId,
      reportData.postId,
      reportData.linkedPostId,
    ]
      .filter(Boolean)
      .map((item) => String(item));
    const targetPost = targetPostKeys.length
      ? allPosts.find((item) => targetPostKeys.includes(String(item.id)))
      : null;
    const targetUser = reportData.targetUserId
      ? findUserRecord(reportData.targetUserId)
      : targetPost?.author?.id
        ? findUserRecord(targetPost.author.id)
        : null;
    const handlerBarangay = resolveReportHandlerBarangay(
      reportData,
      targetPost,
      targetUser,
    );
    const reporterBarangay =
      reportData.reporterBarangay ||
      reportData.reportedByBarangay ||
      currentUser?.barangay ||
      "";
    const normalizedReportData = {
      ...reportData,
      reportedBy: reportData.reportedBy || currentUser?.name || "Resident",
      reportedById:
        reportData.reportedById ||
        currentUser?.uid ||
        currentUser?.id ||
        currentUser?.email ||
        "",
      reportedByUid:
        reportData.reportedByUid || currentUser?.uid || currentUser?.id || "",
      reportedByEmail: reportData.reportedByEmail || currentUser?.email || "",
      reporterBarangay,
      barangay: handlerBarangay,
      handlerBarangay,
      incidentBarangay:
        reportData.incidentBarangay ||
        targetPost?.incidentBarangay ||
        handlerBarangay,
      targetTitle:
        reportData.targetTitle ||
        targetPost?.title ||
        targetUser?.name ||
        "Reported record",
      targetUserId:
        reportData.targetUserId ||
        targetUser?.id ||
        targetPost?.author?.id ||
        "",
      targetUserName:
        reportData.targetUserName ||
        targetUser?.name ||
        targetPost?.author?.name ||
        "",
      category: reportData.category || "Other",
      status: reportData.status || REPORT_STATUS.PENDING,
    };
    const duplicateReport = findActiveDuplicateReport(normalizedReportData, [
      ...(Array.isArray(reports) ? reports : []),
      ...getReports(),
    ]);
    if (duplicateReport) {
      const mergedReport = appendReportEvidence(
        duplicateReport.id,
        normalizedReportData,
      );
      const now = new Date().toISOString();
      const evidenceEntry = {
        id: `evidence-${Date.now()}`,
        category: normalizedReportData.category || "Other",
        reason: normalizedReportData.reason || "Additional report evidence",
        details:
          normalizedReportData.details ||
          "Additional details were merged into this report.",
        evidence: normalizedReportData.evidence || "",
        submittedBy: normalizedReportData.reportedBy || "Resident",
        submittedById: normalizedReportData.reportedById || "",
        submittedAt: now,
      };
      const duplicateUpdate = normalizeReport({
        ...(mergedReport || duplicateReport),
        status:
          duplicateReport.status === REPORT_STATUS.NEEDS_EVIDENCE
            ? REPORT_STATUS.UNDER_REVIEW
            : duplicateReport.status,
        duplicateOf: duplicateReport.id,
        duplicateCount:
          Number((mergedReport || duplicateReport).duplicateCount || 0) +
          (mergedReport ? 0 : 1),
        additionalEvidence: mergedReport?.additionalEvidence || [
          ...(Array.isArray(duplicateReport.additionalEvidence)
            ? duplicateReport.additionalEvidence
            : []),
          evidenceEntry,
        ],
        actionTaken: "Additional evidence merged",
        actionNote:
          "A duplicate report from the same resident and target was merged into this active report.",
        updatedAt: now,
        updatedAtIso: now,
        statusHistory: mergedReport?.statusHistory || [
          ...(Array.isArray(duplicateReport.statusHistory)
            ? duplicateReport.statusHistory
            : []),
          {
            status:
              duplicateReport.status === REPORT_STATUS.NEEDS_EVIDENCE
                ? REPORT_STATUS.UNDER_REVIEW
                : duplicateReport.status,
            note: "Duplicate report prevented; additional evidence merged into the existing active case.",
            updatedBy: normalizedReportData.reportedBy || "Resident",
            createdAt: now,
          },
        ],
        isDuplicateUpdate: true,
      });
      setReports((items) =>
        sortNewestFirst(mergeRecordsById(items, [duplicateUpdate])),
      );
      updateReportInFirestore(duplicateReport.id, duplicateUpdate).catch(
        (error) =>
          console.warn("Unable to sync duplicate report evidence.", error),
      );
      createNotificationRecord({
        type: "report",
        title: "Report Evidence Updated",
        message: `A duplicate ${duplicateUpdate.targetType || "content"} report was merged with an existing active case: ${duplicateUpdate.reason}`,
        priority: "medium",
        actionPath: "/admin/reports",
        targetRole: "barangay_admin",
        targetBarangay:
          duplicateUpdate.handlerBarangay || duplicateUpdate.barangay,
        relatedReport: duplicateUpdate.id,
      });
      return duplicateUpdate;
    }
    const newReport = storageCreateReport(normalizedReportData);
    setReports((items) => [
      newReport,
      ...items.filter((item) => item.id !== newReport.id),
    ]);
    createReportInFirestore(newReport).catch((error) =>
      console.warn("Unable to save Firestore report.", error),
    );
    createNotificationRecord({
      type: "report",
      title: "New Report Submitted",
      message: `New ${newReport.targetType || "content"} report submitted for review: ${newReport.reason}`,
      priority: "medium",
      actionPath: "/admin/reports",
      targetRole: "barangay_admin",
      targetBarangay: newReport.handlerBarangay || newReport.barangay,
      relatedReport: newReport.id,
    });
    return newReport;
  };

  const updateReport = (reportId, updates = {}) => {
    if (!reportId) return null;
    const previous =
      reports.find((item) => item.id === reportId) ||
      getReports().find((item) => item.id === reportId);
    const now = new Date().toISOString();
    const reviewedBy =
      updates.reviewedBy ||
      currentUser?.name ||
      updates.resolvedBy ||
      "Barangay Admin";
    const payload = {
      ...updates,
      reviewedBy,
      reviewedAt: updates.reviewedAt || previous?.reviewedAt || now,
      updatedAt: now,
      updatedAtIso: now,
      resolvedAt:
        updates.resolvedAt ||
        ([REPORT_STATUS.RESOLVED, REPORT_STATUS.DISMISSED].includes(
          updates.status,
        )
          ? now
          : previous?.resolvedAt || ""),
    };
    const localUpdated = storageUpdateReport(reportId, payload);
    const updated =
      localUpdated ||
      storageUpsertReport(
        normalizeReport({
          ...(previous || {}),
          id: reportId,
          barangay:
            previous?.barangay ||
            currentUser?.barangay ||
            updates.barangay ||
            "",
          targetTitle:
            previous?.targetTitle || updates.targetTitle || "Reported record",
          ...payload,
          statusHistory: [
            ...(Array.isArray(previous?.statusHistory)
              ? previous.statusHistory
              : []),
            {
              status:
                payload.status || previous?.status || REPORT_STATUS.PENDING,
              note:
                payload.actionNote ||
                payload.actionTaken ||
                `Report marked as ${payload.status || previous?.status || REPORT_STATUS.PENDING}.`,
              updatedBy:
                payload.resolvedBy || payload.reviewedBy || "Barangay Admin",
              createdAt: now,
            },
          ],
        }),
      );
    setReports((items) => sortNewestFirst(mergeRecordsById(items, [updated])));
    updateReportInFirestore(reportId, { ...updated, ...payload }).catch(
      (error) => console.warn("Unable to update Firestore report.", error),
    );
    if (
      currentUser?.role === "barangay_admin" &&
      (updates.status || updates.actionTaken)
    ) {
      recordAudit({
        action: "update_report",
        adminUser: currentUser,
        targetType: "report",
        targetId: reportId,
        barangay: updated.barangay || currentUser?.barangay || "",
        notes:
          updates.actionNote ||
          updates.actionTaken ||
          `Report status updated to ${updates.status || updated.status}.`,
        metadata: {
          previousStatus: previous?.status,
          nextStatus: updated.status,
        },
      });
    }
    const reporterTargets = uniqueTargets(
      updated?.reportedById,
      updated?.reporterId,
      updated?.reportedByUid,
      updated?.reportedByEmail,
    ).filter(Boolean);
    if (
      reporterTargets.length &&
      updates.status &&
      previous?.status !== updated.status
    ) {
      createNotificationRecord({
        type: "report",
        title: "Report Status Updated",
        message: `Your report "${updated.reason || updated.category || "Report"}" is now ${updated.status}${updates.actionTaken ? ` — ${updates.actionTaken}` : ""}.`,
        priority:
          updated.status === REPORT_STATUS.DISMISSED ? "normal" : "medium",
        actionPath: "/notifications",
        targetUserIds: reporterTargets,
        targetBarangay: updated.barangay,
        relatedReport: updated.id,
      });
    }
    return updated;
  };

  const moderateReport = (reportId, action, adminUser, note = "") => {
    const report =
      reports.find((item) => item.id === reportId) ||
      getReports().find((item) => item.id === reportId);
    const handlerBarangay = report?.handlerBarangay || report?.barangay || "";
    if (!report || !adminUser || handlerBarangay !== adminUser.barangay)
      return null;
    const { post, targetUser } = getReportTarget(report);
    const actionNote = note || "Moderation action recorded by barangay admin.";
    const baseUpdates = {
      reviewedBy: adminUser.name,
      actionNote,
      reviewedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      updatedAtIso: new Date().toISOString(),
    };
    const saveModeratedReport = (updates) => {
      const now = new Date().toISOString();
      const payload = {
        ...updates,
        updatedAt: now,
        updatedAtIso: now,
        resolvedAt:
          updates.resolvedAt ||
          ([REPORT_STATUS.RESOLVED, REPORT_STATUS.DISMISSED].includes(
            updates.status,
          )
            ? now
            : report.resolvedAt || ""),
      };
      return (
        storageUpdateReport(reportId, payload) ||
        storageUpsertReport(
          normalizeReport({
            ...report,
            ...payload,
            id: reportId,
            statusHistory: [
              ...(Array.isArray(report.statusHistory)
                ? report.statusHistory
                : []),
              {
                status:
                  payload.status || report.status || REPORT_STATUS.PENDING,
                note:
                  payload.actionNote ||
                  payload.actionTaken ||
                  `Report marked as ${payload.status || report.status || REPORT_STATUS.PENDING}.`,
                updatedBy:
                  payload.resolvedBy || payload.reviewedBy || "Barangay Admin",
                createdAt: now,
              },
            ],
          }),
        )
      );
    };
    let updatedReport = null;
    if (action === "review")
      updatedReport = saveModeratedReport({
        ...baseUpdates,
        status: REPORT_STATUS.UNDER_REVIEW,
        actionTaken: "Report moved to review queue",
      });
    if (action === "dismiss")
      updatedReport = saveModeratedReport({
        ...baseUpdates,
        status: REPORT_STATUS.DISMISSED,
        resolvedBy: adminUser.name,
        actionTaken: "Report dismissed",
      });
    if (action === "resolve")
      updatedReport = saveModeratedReport({
        ...baseUpdates,
        status: REPORT_STATUS.RESOLVED,
        resolvedBy: adminUser.name,
        actionTaken: "Report resolved without additional account action",
      });
    if (action === "flag_post" && post) {
      updatePost(post.id, {
        status: JOB_POST_STATUS.FLAGGED,
        moderationNote: actionNote,
        flaggedBy: adminUser.id,
        flaggedAt: new Date().toISOString(),
      });
      updatedReport = saveModeratedReport({
        ...baseUpdates,
        status: REPORT_STATUS.RESOLVED,
        resolvedBy: adminUser.name,
        actionTaken: "Reported post flagged",
      });
    }
    if (action === "remove_post" && post) {
      removePostByAdmin(post.id, adminUser, actionNote);
      updatedReport = saveModeratedReport({
        ...baseUpdates,
        status: REPORT_STATUS.RESOLVED,
        resolvedBy: adminUser.name,
        actionTaken: "Reported post removed",
      });
    }
    if (action === "warn_user" && targetUser) {
      warnUser(targetUser.id, actionNote, adminUser);
      updatedReport = saveModeratedReport({
        ...baseUpdates,
        status: REPORT_STATUS.RESOLVED,
        resolvedBy: adminUser.name,
        actionTaken: `Warning issued to ${targetUser.name}`,
      });
    }
    if (action === "suspend_user" && targetUser) {
      suspendUser(targetUser.id, actionNote, adminUser);
      updatedReport = saveModeratedReport({
        ...baseUpdates,
        status: REPORT_STATUS.RESOLVED,
        resolvedBy: adminUser.name,
        actionTaken: `${targetUser.name} suspended`,
      });
    }
    if (updatedReport) {
      setReports((items) =>
        sortNewestFirst(mergeRecordsById(items, [updatedReport])),
      );
      window.dispatchEvent(new Event("app-data-refresh"));
      updateReportInFirestore(reportId, updatedReport).catch((error) =>
        console.warn(
          "Unable to persist Firestore moderation report update.",
          error,
        ),
      );
      recordAudit({
        action: `moderate_report_${action}`,
        adminUser,
        targetType: "report",
        targetId: reportId,
        barangay: updatedReport.handlerBarangay || updatedReport.barangay,
        notes: updatedReport.actionTaken || actionNote,
        metadata: {
          targetPostId: post?.id || "",
          targetUserId: targetUser?.id || "",
          status: updatedReport.status,
        },
      });
    }
    if (updatedReport?.reportedById) {
      createNotificationRecord({
        type: "report",
        title: "Report Moderation Update",
        message: `Your report "${updatedReport.reason}" was updated: ${updatedReport.actionTaken || updatedReport.status}.`,
        priority: ["remove_post", "warn_user", "suspend_user"].includes(action)
          ? "medium"
          : "normal",
        actionPath: "/notifications",
        targetUserIds: [updatedReport.reportedById],
        targetBarangay: updatedReport.handlerBarangay || updatedReport.barangay,
        relatedReport: updatedReport.id,
      });
    }
    if (["flag_post", "remove_post"].includes(action) && post?.author?.id) {
      createNotificationRecord({
        type: "moderation",
        title:
          action === "remove_post"
            ? "Post Removed After Report"
            : "Post Flagged After Report",
        message:
          action === "remove_post"
            ? `Your post "${post.title}" was removed after admin review.`
            : `Your post "${post.title}" was flagged for admin review.`,
        priority: "medium",
        actionPath:
          action === "remove_post" ? "/dashboard" : `/post/${post.id}`,
        targetUserIds: [post.author.id],
        targetBarangay: post.barangay,
        relatedPost: post.id,
      });
    }
    return updatedReport;
  };

  const getUnreadCount = (currentUser) =>
    getVisibleNotifications(currentUser).filter(
      (notification) => !notification.read,
    ).length;

  const getUnreadChats = (currentUser) => {
    if (!currentUser) return 0;
    const currentKeys = new Set(getIdentityKeys(currentUser));
    return chats.filter((chat) => {
      if (!chatHasParticipant(chat, currentUser)) return false;
      return (chat.messages || []).some((message) => {
        const senderIsCurrentUser = currentKeys.has(String(message.senderId));
        const readBy = (message.readBy || []).map((item) => String(item));
        const alreadyRead = [...currentKeys].some((key) =>
          readBy.includes(key),
        );
        return !senderIsCurrentUser && !alreadyRead;
      });
    }).length;
  };

  const getVisibleAnnouncements = (targetUser = currentUser) =>
    sortNewestFirst(
      (announcements.length ? announcements : []).filter((item) =>
        announcementVisibleToUser(item, targetUser),
      ),
    );

  // ----- Context value -----
  const value = {
    users,
    allPosts,
    chats,
    allNotifications,
    emergencies,
    appointments,
    announcements,
    reports,
    selectedBarangay,
    barangayFilterMode,
    setSelectedBarangay,
    setBarangayFilterMode,
    searchQuery,
    setSearchQuery,
    filterByBarangay,
    getUserBarangay,
    resolveBarangayScope,
    isSameBarangay,
    lockBarangayForResident,
    canManageBarangayItem,
    getActionRestriction,
    createPost,
    updatePost,
    respondToJobPost,
    setJobPostStatus,
    respondToLostFoundPost,
    deletePost,
    closePost,
    markLostFoundStatus,
    removePostByAdmin,
    warnUser,
    suspendUser,
    activateUser,
    removeUserWarning,
    notifyBarangayResidents,
    getPost,
    getFilteredPosts,
    createChat,
    getOrCreateChat,
    startChatFromPost,
    startChatFromNotification,
    addMessage,
    markChatRead,
    getChat,
    updateChatRecord,
    updateChatMessage,
    editChatMessage,
    toggleMessageReaction,
    endChat,
    addNotification,
    markNotificationRead,
    markAllVisibleNotificationsRead,
    deleteNotification,
    deleteVisibleNotifications,
    deleteNotificationsByIds,
    getVisibleNotifications,
    getVisibleAnnouncements,
    getNotificationPath,
    createEmergency,
    updateEmergency,
    createAppointment,
    updateAppointment,
    createAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
    createReport,
    updateReport,
    moderateReport,
    getUnreadCount,
    getUnreadChats,
    barangays,
    barangaySource,
    reloadAppData,
    resetDemoData,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within AppProvider");
  return context;
}
