import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import { normalizeReport } from "../utils/storage";

const REPORTS_COLLECTION = "reports";

const nowIso = () => new Date().toISOString();

const toIso = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value?.toDate === "function") return value.toDate().toISOString();
  if (typeof value?.seconds === "number") return new Date(value.seconds * 1000).toISOString();
  return String(value);
};

const removeUndefined = (value) => {
  if (Array.isArray(value)) return value.map(removeUndefined).filter((item) => item !== undefined);
  if (value && typeof value === "object" && !(value instanceof Date)) {
    return Object.entries(value).reduce((acc, [key, item]) => {
      const cleaned = removeUndefined(item);
      if (cleaned !== undefined) acc[key] = cleaned;
      return acc;
    }, {});
  }
  return value === undefined ? undefined : value;
};

export const normalizeFirestoreReport = (id, data = {}) => normalizeReport({
  ...data,
  id,
  createdAt: toIso(data.createdAt) || data.createdAtIso || nowIso(),
  updatedAt: toIso(data.updatedAt) || data.updatedAtIso || "",
  reviewedAt: toIso(data.reviewedAt) || data.reviewedAtIso || data.reviewedAt || "",
  resolvedAt: toIso(data.resolvedAt) || data.resolvedAtIso || data.resolvedAt || "",
});

const sortReports = (items = []) => [...items].sort((a, b) => {
  const at = new Date(a.createdAt || a.updatedAt || 0).getTime();
  const bt = new Date(b.createdAt || b.updatedAt || 0).getTime();
  return bt - at;
});

export const subscribeReportsForUser = (currentUser, callback, onError) => {
  if (!currentUser?.barangay) {
    callback([]);
    return () => {};
  }

  const reportsQuery = query(collection(db, REPORTS_COLLECTION), where("barangay", "==", currentUser.barangay));

  return onSnapshot(
    reportsQuery,
    (snapshot) => {
      const reports = snapshot.docs.map((item) => normalizeFirestoreReport(item.id, item.data()));
      callback(sortReports(reports));
    },
    (error) => {
      console.error("Firestore reports listener failed:", error);
      onError?.(error);
    },
  );
};

export const createReportInFirestore = async (reportData = {}) => {
  const id = reportData.id || `report-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const createdAtIso = reportData.createdAt || nowIso();
  const payload = removeUndefined({
    ...reportData,
    id,
    status: reportData.status || "Pending",
    createdAt: serverTimestamp(),
    createdAtIso,
    updatedAt: serverTimestamp(),
    updatedAtIso: createdAtIso,
  });
  await setDoc(doc(db, REPORTS_COLLECTION, id), payload, { merge: true });
  return getReportFromFirestore(id);
};

export const updateReportInFirestore = async (reportId, updates = {}) => {
  if (!reportId) throw new Error("Missing report ID.");
  const payload = removeUndefined({
    ...updates,
    updatedAt: serverTimestamp(),
    updatedAtIso: nowIso(),
  });
  delete payload.id;
  await setDoc(doc(db, REPORTS_COLLECTION, reportId), payload, { merge: true });
  return getReportFromFirestore(reportId);
};

export const getReportFromFirestore = async (reportId) => {
  if (!reportId) return null;
  const snapshot = await getDoc(doc(db, REPORTS_COLLECTION, reportId));
  if (!snapshot.exists()) return null;
  return normalizeFirestoreReport(snapshot.id, snapshot.data());
};
