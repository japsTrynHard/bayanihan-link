import React from "react";
import { act, create } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ emergency: vi.fn(), appointment: vi.fn(), user: { id: "resident", uid: "resident", role: "resident", name: "Resident", barangay: "Pinambaran", status: "Active" } }));
vi.mock("../src/context/AuthContext", () => ({ useAuth: () => ({ user: mocks.user }) }));
vi.mock("../src/firebase/firebaseConfig", () => ({ db: null }));
vi.mock("../src/services/barangayService", () => ({ fetchSanMiguelBarangays: async () => ({ barangays: [] }), getCachedSanMiguelBarangays: () => ({ barangays: [] }) }));
vi.mock("../src/services/coreService", async (importOriginal) => {
  const original = await importOriginal();
  return {
    ...Object.fromEntries(Object.keys(original).map((name) => [name, name.startsWith("subscribe") ? () => () => {} : vi.fn()])),
    createEmergencyInFirestore: (...args) => mocks.emergency(...args),
    createAppointmentInFirestore: (...args) => mocks.appointment(...args),
  };
});
vi.mock("../src/services/postService", async (importOriginal) => ({ ...await importOriginal(), subscribePostsForUser: () => () => {} }));
vi.mock("../src/services/chatService", async (importOriginal) => ({ ...await importOriginal(), subscribeChatsForUser: () => () => {} }));
vi.mock("../src/services/reportService", async (importOriginal) => ({ ...await importOriginal(), subscribeReportsForUser: () => () => {} }));
import { AppProvider, useApp } from "../src/context/AppContext";

let renderer, app;
function Consumer() { app = useApp(); return null; }
describe("failed creation does not produce a saved local record", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const data = new Map();
    vi.stubGlobal("localStorage", { getItem: (key) => data.get(key) ?? null, setItem: (key, value) => data.set(key, String(value)), removeItem: (key) => data.delete(key) });
    vi.stubGlobal("window", Object.assign(new EventTarget(), { setInterval, clearInterval, setTimeout, clearTimeout }));
    await act(async () => { renderer = create(<AppProvider><Consumer /></AppProvider>); });
  });
  afterEach(async () => {
    act(() => renderer?.unmount());
    await new Promise((resolve) => setTimeout(resolve, 0));
    vi.unstubAllGlobals();
  });
  it("propagates emergency persistence failure and removes the unsaved cache entry", async () => {
    mocks.emergency.mockRejectedValue(new Error("Emergency save failed"));
    const before = JSON.parse(localStorage.getItem("emergencies")).length;
    await act(async () => {
      await expect(app.createEmergency({ author: mocks.user, userId: "resident", barangay: "Pinambaran", emergencyType: "Fire", title: "Emergency" })).rejects.toThrow("Emergency save failed");
    });
    expect(app.emergencies).toHaveLength(0);
    expect(JSON.parse(localStorage.getItem("emergencies"))).toHaveLength(before);
  });
  it("propagates appointment persistence failure and removes the unsaved cache entry", async () => {
    mocks.appointment.mockRejectedValue(new Error("Appointment save failed"));
    const before = JSON.parse(localStorage.getItem("appointments")).length;
    // A future weekday avoids coupling this failure test to today's office hours.
    const date = new Date(); date.setFullYear(date.getFullYear() + 1); while ([0, 6].includes(date.getDay())) date.setDate(date.getDate() + 1);
    const preferredDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    await act(async () => {
      await expect(app.createAppointment({ userId: "resident", serviceId: "cedula", preferredDate, preferredTime: "09:00", purpose: "Request", barangay: "Pinambaran" })).rejects.toThrow("Appointment save failed");
    });
    expect(app.appointments).toHaveLength(0);
    expect(JSON.parse(localStorage.getItem("appointments"))).toHaveLength(before);
  });
});
