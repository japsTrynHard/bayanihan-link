import { removeUndefined, toIso } from "../utils/firestoreData";
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

  const reportsQuery = currentUser.role === "barangay_admin"
    ? query(collection(db, REPORTS_COLLECTION), where("barangay", "==", currentUser.barangay))
    : query(collection(db, REPORTS_COLLECTION), where("reportedById", "==", currentUser.uid || currentUser.id));

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
