import { removeUndefined, toIso } from "../utils/firestoreData";
import {
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import {
  normalizeAnnouncement,
  normalizeAppointment,
  normalizeEmergency,
  normalizeNotification,
} from "../utils/storage";

const COLLECTIONS = {
  emergencies: "emergencies",
  emergencyLocations: "emergencyLocations",
  appointments: "appointments",
  announcements: "announcements",
  notifications: "notifications",
};

const nowIso = () => new Date().toISOString();



const normalizeDateFields = (data = {}) => {
  const createdAt = toIso(data.createdAt) || data.createdAtIso || nowIso();
  const updatedAt = toIso(data.updatedAt) || data.updatedAtIso || createdAt;
  return { ...data, createdAt, updatedAt };
};

const EXACT_LOCATION_KEYS = [
  "exactLocation",
  "lat",
  "lng",
  "latitude",
  "longitude",
  "accuracy",
  "locationSource",
  "locationCapturedAt",
];

const stripExactLocationFields = (data = {}) => {
  const clean = { ...data };
  EXACT_LOCATION_KEYS.forEach((key) => {
    delete clean[key];
  });
  return clean;
};

const getExactLocationPayload = (data = {}, id = data.id) => {
  const source = data.exactLocation || {};
  const rawLat = data.lat ?? data.latitude ?? source.lat ?? source.latitude;
  const rawLng = data.lng ?? data.longitude ?? source.lng ?? source.longitude;
  if (rawLat == null || rawLng == null || String(rawLat).trim() === "" || String(rawLng).trim() === "") return null;
  const lat = Number(rawLat);
  const lng = Number(rawLng);

  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;

  return {
    id,
    emergencyId: id,
    barangay: data.barangay || "",
    homeBarangay: data.homeBarangay || data.reporterHomeBarangay || "",
    authorId: data.authorId || data.userId || "",
    userId: data.userId || data.authorId || "",
    exactLocation: {
      lat,
      lng,
      accuracy: Number(data.accuracy ?? source.accuracy) || null,
      capturedAt: data.locationCapturedAt || source.capturedAt || data.createdAt || nowIso(),
      source: data.locationSource || source.source || "resident-browser",
    },
    lat,
    lng,
    accuracy: Number(data.accuracy ?? source.accuracy) || null,
    locationSource: data.locationSource || source.source || "resident-browser",
    locationCapturedAt: data.locationCapturedAt || source.capturedAt || data.createdAt || nowIso(),
    publicAreaText: data.publicAreaText || data.locationDetails || data.barangay || "",
  };
};

const sortFIFO = (items) => {
  return [...items].sort((a, b) => {
    const aTime = new Date(a.createdAtIso || a.createdAt || a.updatedAtIso || a.updatedAt || 0).getTime();
    const bTime = new Date(b.createdAtIso || b.createdAt || b.updatedAtIso || b.updatedAt || 0).getTime();
    return (Number.isNaN(bTime) ? 0 : bTime) - (Number.isNaN(aTime) ? 0 : aTime);
  });
};

const getUserTargetIds = (user = {}) => {
  return [user.id, user.uid, user.userId, user.email]
    .filter(Boolean)
    .map((item) => String(item));
};

const notificationVisibleToUser = (notification, currentUser) => {
  if (!currentUser) return false;

  const currentTargets = getUserTargetIds(currentUser);
  const targetUserIds = Array.isArray(notification.targetUserIds)
    ? notification.targetUserIds.map((item) => String(item))
    : [];

  const deletedTargets = Array.isArray(notification.deletedBy)
    ? notification.deletedBy.map((item) => String(item))
    : [];
  const userDeleted = currentTargets.some((target) => deletedTargets.includes(target));
  if (userDeleted) return false;

  const userDirectMatch = targetUserIds.length
    ? targetUserIds.some((target) => currentTargets.includes(target))
    : false;
  const roleMatch = notification.targetRole
    ? notification.targetRole === currentUser.role
    : true;

  // Direct user notifications are allowed across barangays. The exact resident
  // targets keep the record private while still supporting cross-barangay flows.
  if (targetUserIds.length) return userDirectMatch && roleMatch;

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
  const expiresAt = announcement.expiresAt ? new Date(announcement.expiresAt).getTime() : 0;
  const expired = expiresAt && !Number.isNaN(expiresAt) && expiresAt < Date.now();
  if (currentUser.role === "barangay_admin" && (announcement.createdById === currentUser.id || announcement.barangay === currentUser.barangay)) return true;
  if (currentUser.role !== "barangay_admin" && (status === "draft" || status === "archived" || expired)) return false;

  const targetMode = announcement.targetMode || "barangay";
  const targetBarangays = Array.isArray(announcement.targetBarangays)
    ? announcement.targetBarangays.filter(Boolean)
    : [];

  if (targetMode === "all") return true;
  if (targetMode === "specific") return targetBarangays.includes(currentUser.barangay);
  return (announcement.barangay || targetBarangays[0] || "") === currentUser.barangay;
};

const normalizeReadState = (data = {}, currentUser = null) => {
  if (!currentUser) return Boolean(data.read);
  const readTargets = Array.isArray(data.readBy)
    ? data.readBy.map((item) => String(item))
    : [];
  const currentTargets = getUserTargetIds(currentUser);
  return Boolean(data.read) || currentTargets.some((target) => readTargets.includes(target));
};

export const normalizeFirestoreEmergency = (id, data = {}) => {
  return normalizeEmergency({
    ...normalizeDateFields(data),
    id,
    uid: id,
  });
};

export const normalizeFirestoreAppointment = (id, data = {}) => {
  return normalizeAppointment({
    ...normalizeDateFields(data),
    id,
    uid: id,
  });
};

export const normalizeFirestoreAnnouncement = (id, data = {}) => {
  return normalizeAnnouncement({
    ...normalizeDateFields(data),
    id,
    uid: id,
  });
};

export const normalizeFirestoreNotification = (id, data = {}, currentUser = null) => {
  return normalizeNotification({
    ...normalizeDateFields(data),
    id,
    uid: id,
    read: normalizeReadState(data, currentUser),
  });
};

const withWriteTimestamps = (payload = {}, isCreate = false) => {
  const cleanPayload = removeUndefined({
    ...payload,
    updatedAtIso: nowIso(),
    updatedAt: serverTimestamp(),
    ...(isCreate
      ? {
          createdAtIso: payload.createdAt || nowIso(),
          createdAt: serverTimestamp(),
        }
      : {}),
  });

  delete cleanPayload.uid;
  return cleanPayload;
};

export const subscribeEmergenciesForUser = (currentUser, barangayFilterMode, callback, onError) => {
  if (!currentUser) {
    callback([]);
    return () => {};
  }

  const shouldReadAll = currentUser.role === "resident" && barangayFilterMode === "all";
  const recordsRef = collection(db, COLLECTIONS.emergencies);
  const recordsQuery = shouldReadAll
    ? query(recordsRef, where("visibility.showToPublic", "==", true))
    : query(recordsRef, where("barangay", "==", currentUser.barangay || ""));

  if (currentUser.role !== "barangay_admin") {
    if (shouldReadAll) {
      return onSnapshot(
        recordsQuery,
        (snapshot) => {
          const records = snapshot.docs.map((item) => normalizeFirestoreEmergency(item.id, item.data()));
          callback(sortFIFO(records));
        },
        (error) => {
          console.error("Firestore public emergency listener failed:", error);
          onError?.(error);
        },
      );
    }

    let publicRecords = [];
    let ownRecords = [];
    const emitResidentRecords = () => {
      const merged = [...publicRecords, ...ownRecords].reduce((acc, record) => {
        if (record?.id) acc[record.id] = record;
        return acc;
      }, {});
      callback(sortFIFO(Object.values(merged)));
    };

    const publicQuery = query(
      recordsRef,
      where("barangay", "==", currentUser.barangay || ""),
      where("visibility.showToPublic", "==", true),
    );
    const ownQuery = query(
      recordsRef,
      where("authorId", "==", currentUser.id || currentUser.uid || ""),
    );

    const unsubscribePublic = onSnapshot(
      publicQuery,
      (snapshot) => {
        publicRecords = snapshot.docs.map((item) => normalizeFirestoreEmergency(item.id, item.data()));
        emitResidentRecords();
      },
      (error) => {
        console.error("Firestore public emergency listener failed:", error);
        onError?.(error);
      },
    );

    const unsubscribeOwn = onSnapshot(
      ownQuery,
      (snapshot) => {
        ownRecords = snapshot.docs.map((item) => normalizeFirestoreEmergency(item.id, item.data()));
        emitResidentRecords();
      },
      (error) => {
        console.error("Firestore own emergency listener failed:", error);
        onError?.(error);
      },
    );

    return () => {
      unsubscribePublic();
      unsubscribeOwn();
    };
  }

  let emergencyRecords = [];
  let locationRecords = {};
  const emitMergedRecords = () => {
    const merged = emergencyRecords.map((record) => ({
      ...record,
      ...(locationRecords[record.id] || {}),
    }));
    callback(sortFIFO(merged));
  };

  const unsubscribeEmergencies = onSnapshot(
    recordsQuery,
    (snapshot) => {
      emergencyRecords = snapshot.docs.map((item) => normalizeFirestoreEmergency(item.id, item.data()));
      emitMergedRecords();
    },
    (error) => {
      console.error("Firestore emergency listener failed:", error);
      onError?.(error);
    },
  );

  const locationQuery = query(
    collection(db, COLLECTIONS.emergencyLocations),
    where("barangay", "==", currentUser.barangay || ""),
  );

  const unsubscribeLocations = onSnapshot(
    locationQuery,
    (snapshot) => {
      locationRecords = snapshot.docs.reduce((acc, item) => {
        const data = normalizeDateFields(item.data());
        const emergencyId = data.emergencyId || item.id;
        acc[emergencyId] = data;
        return acc;
      }, {});
      emitMergedRecords();
    },
    (error) => {
      console.error("Firestore emergency location listener failed:", error);
      onError?.(error);
    },
  );

  return () => {
    unsubscribeEmergencies();
    unsubscribeLocations();
  };
};

export const createEmergencyInFirestore = async (emergencyData = {}) => {
  const id = emergencyData.id || `emerg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const privateLocation = getExactLocationPayload(emergencyData, id);
  const publicPayload = withWriteTimestamps(
    {
      ...stripExactLocationFields(emergencyData),
      id,
      userId: emergencyData.userId || emergencyData.authorId || "",
      authorId: emergencyData.authorId || emergencyData.userId || "",
    },
    true,
  );

  const batch = writeBatch(db);
  batch.set(doc(db, COLLECTIONS.emergencies, id), publicPayload, { merge: true });

  if (privateLocation) {
    batch.set(
      doc(db, COLLECTIONS.emergencyLocations, id),
      withWriteTimestamps(privateLocation, true),
      { merge: true },
    );
  }

  await batch.commit();

  return getEmergencyFromFirestore(id);
};

export const updateEmergencyInFirestore = async (emergencyId, updates = {}) => {
  if (!emergencyId) throw new Error("Missing emergency ID.");
  const privateLocation = getExactLocationPayload(updates, emergencyId);
  await setDoc(
    doc(db, COLLECTIONS.emergencies, emergencyId),
    withWriteTimestamps(stripExactLocationFields(updates)),
    { merge: true },
  );

  if (privateLocation) {
    await setDoc(
      doc(db, COLLECTIONS.emergencyLocations, emergencyId),
      withWriteTimestamps(privateLocation),
      { merge: true },
    );
  }

  return getEmergencyFromFirestore(emergencyId);
};

export const getEmergencyFromFirestore = async (emergencyId) => {
  if (!emergencyId) return null;
  const snapshot = await getDoc(doc(db, COLLECTIONS.emergencies, emergencyId));
  if (!snapshot.exists()) return null;
  return normalizeFirestoreEmergency(snapshot.id, snapshot.data());
};

export const subscribeAppointmentsForUser = (currentUser, callback, onError) => {
  if (!currentUser) {
    callback([]);
    return () => {};
  }

  const recordsRef = collection(db, COLLECTIONS.appointments);
  const recordsQuery = currentUser.role === "barangay_admin"
    ? query(recordsRef, where("barangay", "==", currentUser.barangay || ""))
    : query(recordsRef, where("userId", "==", currentUser.id || currentUser.uid || ""));

  return onSnapshot(
    recordsQuery,
    (snapshot) => {
      const records = snapshot.docs.map((item) => normalizeFirestoreAppointment(item.id, item.data()));
      callback(sortFIFO(records));
    },
    (error) => {
      console.error("Firestore appointment listener failed:", error);
      onError?.(error);
    },
  );
};

export const createAppointmentInFirestore = async (appointmentData = {}) => {
  const id = appointmentData.id || `appt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const payload = withWriteTimestamps({ ...appointmentData, id }, true);
  await setDoc(doc(db, COLLECTIONS.appointments, id), payload, { merge: true });
  return getAppointmentFromFirestore(id);
};

export const updateAppointmentInFirestore = async (appointmentId, updates = {}) => {
  if (!appointmentId) throw new Error("Missing appointment ID.");
  await setDoc(doc(db, COLLECTIONS.appointments, appointmentId), withWriteTimestamps(updates), { merge: true });
  return getAppointmentFromFirestore(appointmentId);
};

export const getAppointmentFromFirestore = async (appointmentId) => {
  if (!appointmentId) return null;
  const snapshot = await getDoc(doc(db, COLLECTIONS.appointments, appointmentId));
  if (!snapshot.exists()) return null;
  return normalizeFirestoreAppointment(snapshot.id, snapshot.data());
};

export const subscribeAnnouncementsForUser = (currentUser, callback, onError) => {
  if (!currentUser) {
    callback([]);
    return () => {};
  }

  const recordsRef = collection(db, COLLECTIONS.announcements);
  const barangay = currentUser.barangay || "";
  const listenerQueries = [
    query(recordsRef, where("targetMode", "==", "all")),
    barangay ? query(recordsRef, where("barangay", "==", barangay)) : null,
    barangay ? query(recordsRef, where("targetBarangay", "==", barangay)) : null,
    barangay ? query(recordsRef, where("targetBarangays", "array-contains", barangay)) : null,
  ].filter(Boolean);

  const sourceMaps = new Map();
  const emit = () => {
    const merged = new Map();
    sourceMaps.forEach((sourceMap) => {
      sourceMap.forEach((record, id) => merged.set(id, record));
    });
    callback(sortFIFO([...merged.values()].filter((announcement) => announcementVisibleToUser(announcement, currentUser))));
  };

  const unsubscribers = listenerQueries.map((recordsQuery, index) => onSnapshot(
    recordsQuery,
    (snapshot) => {
      const nextMap = new Map();
      snapshot.docs.forEach((item) => {
        nextMap.set(item.id, normalizeFirestoreAnnouncement(item.id, item.data()));
      });
      sourceMaps.set(index, nextMap);
      emit();
    },
    (error) => {
      console.error("Firestore announcement listener failed:", error);
      onError?.(error);
    },
  ));

  return () => unsubscribers.forEach((unsubscribe) => unsubscribe?.());
};

export const createAnnouncementInFirestore = async (announcementData = {}) => {
  const id = announcementData.id || `ann-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const payload = withWriteTimestamps({ ...announcementData, id }, true);
  await setDoc(doc(db, COLLECTIONS.announcements, id), payload, { merge: true });
  return getAnnouncementFromFirestore(id);
};

export const updateAnnouncementInFirestore = async (announcementId, updates = {}) => {
  if (!announcementId) throw new Error("Missing announcement ID.");
  await setDoc(doc(db, COLLECTIONS.announcements, announcementId), withWriteTimestamps(updates), { merge: true });
  return getAnnouncementFromFirestore(announcementId);
};

export const deleteAnnouncementFromFirestore = async (announcementId) => {
  if (!announcementId) throw new Error("Missing announcement ID.");
  await deleteDoc(doc(db, COLLECTIONS.announcements, announcementId));
  return true;
};

export const getAnnouncementFromFirestore = async (announcementId) => {
  if (!announcementId) return null;
  const snapshot = await getDoc(doc(db, COLLECTIONS.announcements, announcementId));
  if (!snapshot.exists()) return null;
  return normalizeFirestoreAnnouncement(snapshot.id, snapshot.data());
};

export const subscribeNotificationsForUser = (currentUser, callback, onError) => {
  if (!currentUser) {
    callback([]);
    return () => {};
  }

  const recordsRef = collection(db, COLLECTIONS.notifications);
  const aliases = getUserTargetIds(currentUser);
  const barangay = currentUser.barangay || "";
  const listenerQueries = [
    ...aliases.map((alias) => query(recordsRef, where("targetUserIds", "array-contains", alias))),
    barangay ? query(recordsRef, where("targetBarangay", "==", barangay)) : null,
    barangay ? query(recordsRef, where("targetBarangays", "array-contains", barangay)) : null,
    barangay ? query(recordsRef, where("barangay", "==", barangay)) : null,
  ].filter(Boolean);

  const sourceMaps = new Map();
  const emit = () => {
    const merged = new Map();
    sourceMaps.forEach((sourceMap) => {
      sourceMap.forEach((record, id) => merged.set(id, record));
    });
    callback(sortFIFO([...merged.values()].filter((notification) => notificationVisibleToUser(notification, currentUser))));
  };

  const unsubscribers = listenerQueries.map((recordsQuery, index) => onSnapshot(
    recordsQuery,
    (snapshot) => {
      const nextMap = new Map();
      snapshot.docs.forEach((item) => {
        nextMap.set(item.id, normalizeFirestoreNotification(item.id, item.data(), currentUser));
      });
      sourceMaps.set(index, nextMap);
      emit();
    },
    (error) => {
      console.error("Firestore notification listener failed:", error);
      onError?.(error);
    },
  ));

  return () => unsubscribers.forEach((unsubscribe) => unsubscribe?.());
};

export const createNotificationInFirestore = async (notificationData = {}) => {
  const id = notificationData.id || `notif-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const payload = withWriteTimestamps(
    {
      ...notificationData,
      id,
      barangay: notificationData.barangay || notificationData.targetBarangay || "",
      targetBarangay: Array.isArray(notificationData.targetBarangays) && notificationData.targetBarangays.length
        ? ""
        : Object.prototype.hasOwnProperty.call(notificationData, "targetBarangay")
          ? notificationData.targetBarangay
          : notificationData.barangay || "",
      targetBarangays: Array.isArray(notificationData.targetBarangays) ? notificationData.targetBarangays : [],
      read: false,
      readBy: Array.isArray(notificationData.readBy) ? notificationData.readBy : [],
    },
    true,
  );
  await setDoc(doc(db, COLLECTIONS.notifications, id), payload, { merge: true });
  return getNotificationFromFirestore(id);
};

export const markNotificationReadInFirestore = async (notificationId, currentUser = {}) => {
  if (!notificationId) throw new Error("Missing notification ID.");
  const readTargets = getUserTargetIds(currentUser);
  const payload = readTargets.length > 0
    ? { readBy: arrayUnion(...readTargets) }
    : { read: true };

  await updateDoc(
    doc(db, COLLECTIONS.notifications, notificationId),
    removeUndefined({
      ...payload,
      updatedAt: serverTimestamp(),
      updatedAtIso: nowIso(),
    }),
  );
  return true;
};

export const markManyNotificationsReadInFirestore = async (notificationIds = [], currentUser = {}) => {
  await Promise.all(notificationIds.map((id) => markNotificationReadInFirestore(id, currentUser)));
  return true;
};

export const deleteNotificationForUserInFirestore = async (notificationId, currentUser = {}) => {
  if (!notificationId) throw new Error("Missing notification ID.");
  const deleteTargets = getUserTargetIds(currentUser);
  const payload = deleteTargets.length > 0
    ? { deletedBy: arrayUnion(...deleteTargets) }
    : { deleted: true };

  await updateDoc(
    doc(db, COLLECTIONS.notifications, notificationId),
    removeUndefined({
      ...payload,
      deletedAtIso: nowIso(),
      updatedAt: serverTimestamp(),
      updatedAtIso: nowIso(),
    }),
  );
  return true;
};

export const deleteManyNotificationsForUserInFirestore = async (notificationIds = [], currentUser = {}) => {
  await Promise.all(notificationIds.map((id) => deleteNotificationForUserInFirestore(id, currentUser)));
  return true;
};

export const getNotificationFromFirestore = async (notificationId) => {
  if (!notificationId) return null;
  const snapshot = await getDoc(doc(db, COLLECTIONS.notifications, notificationId));
  if (!snapshot.exists()) return null;
  return normalizeFirestoreNotification(snapshot.id, snapshot.data());
};
