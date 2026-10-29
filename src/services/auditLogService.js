import { removeUndefined, toIso } from "../utils/firestoreData";
import {
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";

const AUDIT_LOGS_COLLECTION = "auditLogs";

const nowIso = () => new Date().toISOString();



export const normalizeAuditLog = (id, data = {}) => ({
  ...data,
  id,
  createdAt: toIso(data.createdAt) || data.createdAtIso || nowIso(),
});

export const createAuditLog = async ({
  action,
  adminUser = {},
  targetType = "record",
  targetId = "",
  barangay = "",
  notes = "",
  metadata = {},
} = {}) => {
  if (!action) return null;

  const createdAtIso = nowIso();
  const id = `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const payload = removeUndefined({
    id,
    action,
    adminId: adminUser.id || adminUser.uid || "system",
    adminName: adminUser.name || adminUser.email || "System",
    adminRole: adminUser.role || "system",
    barangay: barangay || adminUser.barangay || "",
    targetType,
    targetId,
    notes,
    metadata,
    createdAt: serverTimestamp(),
    createdAtIso,
  });

  await setDoc(doc(db, AUDIT_LOGS_COLLECTION, id), payload, { merge: true });
  return normalizeAuditLog(id, payload);
};

export const safeCreateAuditLog = async (payload = {}) => {
  try {
    return await createAuditLog(payload);
  } catch (error) {
    console.warn("Audit log was not saved.", error);
    return null;
  }
};

export const subscribeAuditLogsByBarangay = (barangay, callback, onError) => {
  if (!barangay) {
    callback([]);
    return () => {};
  }

  const logsQuery = query(
    collection(db, AUDIT_LOGS_COLLECTION),
    where("barangay", "==", barangay),
  );

  return onSnapshot(
    logsQuery,
    (snapshot) => {
      const logs = snapshot.docs
        .map((item) => normalizeAuditLog(item.id, item.data()))
        .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      callback(logs);
    },
    (error) => {
      console.error("Firestore audit log listener failed:", error);
      onError?.(error);
    },
  );
};
