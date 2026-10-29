import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { assertFails, assertSucceeds, initializeTestEnvironment } from "@firebase/rules-unit-testing";
import { collection, deleteDoc, deleteField, doc, getDoc, getDocs, query, setDoc, Timestamp, updateDoc, where } from "firebase/firestore";

const serviceDb = vi.hoisted(() => ({ current: null }));
vi.mock("../src/firebase/firebaseConfig", () => ({ get db() { return serviceDb.current; } }));
import { createPostInFirestore, respondToPostInFirestore } from "../src/services/postService";
import { createEmergencyInFirestore, createNotificationInFirestore, markNotificationReadInFirestore } from "../src/services/coreService";
import { addMessageToChatInFirestore, createOrGetChatInFirestore, markChatReadInFirestore, updateChatMessageInFirestore } from "../src/services/chatService";
import { subscribeReportsForUser } from "../src/services/reportService";
import { updateUserProfile } from "../src/services/userService";

const resident = { id: "resident", uid: "resident", email: "resident@example.com", role: "resident", name: "Same Name", barangay: "Pinambaran", status: "Active", warnings: [] };
const other = { ...resident, id: "other", uid: "other", email: "other@example.com", barangay: "Poblacion" };
let env;
const dbFor = (id) => env.authenticatedContext(id, { email: `${id}@example.com` }).firestore();
const seed = (records) => env.withSecurityRulesDisabled(async (context) => {
  await Promise.all(Object.entries(records).map(([path, data]) => setDoc(doc(context.firestore(), path), data)));
});

describe.skipIf(!process.env.FIRESTORE_EMULATOR_HOST)("Firestore workflows and permissions", () => {
  beforeAll(async () => {
    const [host, port] = process.env.FIRESTORE_EMULATOR_HOST.split(":");
    env = await initializeTestEnvironment({ projectId: "demo-bayanihan", firestore: { host, port: Number(port), rules: readFileSync("src/firebase/firestore.rules", "utf8") } });
  });
  beforeEach(async () => {
    await env.clearFirestore();
    await seed({
      "users/resident": resident,
      "users/other": other,
      "users/admin": { ...resident, id: "admin", uid: "admin", role: "barangay_admin" },
      "users/incidentAdmin": { ...other, id: "incidentAdmin", uid: "incidentAdmin", role: "barangay_admin" },
    });
    serviceDb.current = dbFor("resident");
  });
  afterAll(async () => env?.cleanup());

  it("allows resident registration but rejects self-provisioned administrators", async () => {
    const db = dbFor("new");
    await assertFails(setDoc(doc(db, "users/new"), { ...resident, id: "new", uid: "new", role: "barangay_admin" }));
    await assertSucceeds(setDoc(doc(db, "users/new"), { ...resident, id: "new", uid: "new" }));
  });
  it("blocks added/deleted privilege fields and admin jurisdiction changes", async () => {
    const ref = doc(dbFor("resident"), "users/resident");
    await assertFails(updateDoc(ref, { moderationUpdatedBy: "forged" }));
    await assertFails(updateDoc(ref, { role: deleteField() }));
    await assertFails(updateDoc(doc(dbFor("admin"), "users/admin"), { barangay: "Poblacion" }));
    await assertFails(updateDoc(doc(dbFor("admin"), "users/resident"), { role: "barangay_admin" }));
    await assertSucceeds(updateDoc(doc(dbFor("admin"), "users/resident"), { status: "Warned" }));
  });
  it("saves editable profile fields without reflecting caller-supplied moderation or role fields", async () => {
    const profile = await updateUserProfile("resident", { bio: "Updated profile", role: "barangay_admin", status: "Suspended", moderationUpdatedBy: "forged", profilePicture: "" });
    expect(profile).toMatchObject({ bio: "Updated profile", role: "resident", status: "Active", profilePicture: "" });
    await expect(updateUserProfile("missing", { name: "Missing" })).rejects.toBeDefined();
  });
  it("persists real timestamps and per-user notification array transforms", async () => {
    await createPostInFirestore({ id: "post", authorId: "resident", type: "job", barangay: "Pinambaran", title: "Job" });
    const post = (await getDoc(doc(serviceDb.current, "posts/post"))).data();
    expect(post.createdAt).toBeInstanceOf(Timestamp);
    await createNotificationInFirestore({ id: "notification", barangay: "Pinambaran", targetUserIds: ["resident"] });
    await markNotificationReadInFirestore("notification", resident);
    const notification = (await getDoc(doc(serviceDb.current, "notifications/notification"))).data();
    expect(notification.readBy).toContain("resident");
    expect(notification.read).toBe(false);
    expect(notification.updatedAt).toBeInstanceOf(Timestamp);
  });
  it("allows cross-barangay community browsing and keeps final action with incident admins", async () => {
    await createPostInFirestore({ id: "cross", authorId: "resident", type: "lost", homeBarangay: "Pinambaran", barangay: "Poblacion" });
    await assertSucceeds(getDocs(collection(dbFor("resident"), "posts")));
    await assertSucceeds(getDoc(doc(dbFor("admin"), "posts/cross")));
    await assertFails(updateDoc(doc(dbFor("admin"), "posts/cross"), { status: "Closed" }));
    await assertSucceeds(updateDoc(doc(dbFor("incidentAdmin"), "posts/cross"), { status: "Closed" }));
  });
  it("allows the original reporter to read their routed report without exposing other reports", async () => {
    await seed({ "reports/mine": { reportedById: "resident", barangay: "Poblacion" }, "reports/other": { reportedById: "other", barangay: "Pinambaran" } });
    await assertSucceeds(getDoc(doc(dbFor("resident"), "reports/mine")));
    await assertFails(getDoc(doc(dbFor("resident"), "reports/other")));
    const records = await new Promise((resolve, reject) => {
      let unsubscribe;
      unsubscribe = subscribeReportsForUser(resident, (records) => { unsubscribe?.(); resolve(records); }, reject);
    });
    expect(records.map((record) => record.id)).toEqual(["mine"]);
  });
  it("lets assigned administrators delete announcements", async () => {
    await seed({ "announcements/announcement": { barangay: "Pinambaran", targetMode: "barangay" } });
    await assertFails(deleteDoc(doc(dbFor("incidentAdmin"), "announcements/announcement")));
    await assertSucceeds(deleteDoc(doc(dbFor("admin"), "announcements/announcement")));
  });
  it("allows reporter evidence updates while reserving final moderation decisions for admins", async () => {
    await seed({ "reports/evidence": { reportedById: "resident", barangay: "Poblacion", status: "Needs Evidence" } });
    const ref = doc(serviceDb.current, "reports/evidence");
    await assertSucceeds(updateDoc(ref, { status: "Under Review", additionalEvidence: [{ details: "Additional details" }], duplicateCount: 1, actionTaken: "Additional evidence merged", isDuplicateUpdate: true }));
    await assertFails(updateDoc(ref, { status: "Resolved" }));
  });
  it("prevents residents from approving their own pending appointments", async () => {
    await seed({ "appointments/request": { userId: "resident", barangay: "Pinambaran", status: "Pending", preferredDate: "2027-01-04", preferredTime: "09:00" } });
    const ref = doc(serviceDb.current, "appointments/request");
    await assertFails(updateDoc(ref, { status: "Approved" }));
    await assertSucceeds(updateDoc(ref, { status: "Cancelled" }));
  });
  it("preserves emergency reporting during suspension and protects exact coordinates", async () => {
    await seed({ "users/resident": { ...resident, status: "Suspended" } });
    await createEmergencyInFirestore({ id: "emergency", userId: "resident", barangay: "Poblacion", homeBarangay: "Pinambaran", lat: 15.14, lng: 121.08, visibility: { showToPublic: true } });
    const publicRecord = (await getDoc(doc(serviceDb.current, "emergencies/emergency"))).data();
    expect(publicRecord).not.toHaveProperty("lat");
    await assertFails(getDoc(doc(dbFor("admin"), "emergencyLocations/emergency")));
    const location = await assertSucceeds(getDoc(doc(dbFor("incidentAdmin"), "emergencyLocations/emergency")));
    expect(location.data().lat).toBe(15.14);
    await assertFails(getDoc(doc(serviceDb.current, "emergencyLocations/emergency")));
  });
  it("does not invent an exact pin for blank coordinates", async () => {
    await createEmergencyInFirestore({ id: "no-pin", userId: "resident", barangay: "Pinambaran", lat: "", lng: null });
    await env.withSecurityRulesDisabled(async (context) => {
      const location = await getDoc(doc(context.firestore(), "emergencyLocations/no-pin"));
      expect(location.exists()).toBe(false);
    });
  });
  it("reuses one conversation for simultaneous requests without matching display names", async () => {
    const [first, second] = await Promise.all([
      createOrGetChatInFirestore({ currentUser: resident, otherUser: other }),
      createOrGetChatInFirestore({ currentUser: resident, otherUser: other }),
    ]);
    expect(first.id).toBe(second.id);
    expect((await getDocs(query(collection(serviceDb.current, "chats"), where("participants", "array-contains", "resident")))).size).toBe(1);
    await assertFails(updateDoc(doc(serviceDb.current, "chats", first.id), { participants: ["resident", "intruder"] }));
  });
  it("preserves messages arriving after a stale read/edit snapshot", async () => {
    const chat = await createOrGetChatInFirestore({ currentUser: resident, otherUser: other });
    await addMessageToChatInFirestore(chat.id, { id: "first", senderId: "other", text: "First" });
    const stale = { ...chat, messages: [{ id: "first", senderId: "other", text: "First", readBy: ["other"] }] };
    await addMessageToChatInFirestore(chat.id, { id: "second", senderId: "other", text: "Second" });
    await markChatReadInFirestore(chat.id, "resident", stale);
    await updateChatMessageInFirestore(chat.id, stale, "first", { text: "Edited" });
    const messages = (await getDoc(doc(serviceDb.current, "chats", chat.id))).data().messages;
    expect(messages).toHaveLength(2);
    expect(messages.find((message) => message.id === "first")).toMatchObject({ text: "Edited", readBy: ["other", "resident"] });
    expect(messages.find((message) => message.id === "second").readBy).not.toContain("resident");
  });
  it("saves post responses and counts together, once per resident", async () => {
    await seed({ "posts/opportunity": { id: "opportunity", type: "job", title: "Job", authorId: "other", barangay: "Poblacion", status: "Active", responses: [], interestedUserIds: [], interests: 0 } });
    const results = await Promise.all([
      respondToPostInFirestore("opportunity", { userId: "resident", userName: "Resident", responseType: "interested" }),
      respondToPostInFirestore("opportunity", { userId: "resident", userName: "Resident", responseType: "interested" }),
    ]);
    expect(results.filter((result) => result.created)).toHaveLength(1);
    const post = (await getDoc(doc(serviceDb.current, "posts/opportunity"))).data();
    expect(post.responses).toHaveLength(1);
    expect(post.interestedUserIds).toEqual(["resident"]);
    expect(post.interests).toBe(1);
    await assertFails(updateDoc(doc(serviceDb.current, "posts/opportunity"), { title: "Hijacked" }));
  });
});
