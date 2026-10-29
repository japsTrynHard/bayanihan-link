import React, { useEffect } from "react";
import { act, create } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ listener: null, login: vi.fn(), logout: vi.fn(), ensure: vi.fn(), users: [], profileListener: null }));
vi.mock("../src/utils/storage", () => ({ initializeStorage: vi.fn(), getUsers: () => mocks.users, updateUser: vi.fn(), USER_STATUS: { ACTIVE: "Active" }, getInitials: () => "RU" }));
vi.mock("../src/utils/accountModeration", () => ({ applyModerationToUser: (user) => user }));
vi.mock("../src/services/authService", () => ({
  listenToAuthChanges: (callback) => { mocks.listener = callback; return vi.fn(); },
  loginWithEmail: (...args) => mocks.login(...args), logoutFirebaseUser: () => mocks.logout(),
  registerResidentAccount: vi.fn(), updateFirebaseAuthEmail: vi.fn(), updateFirebaseAuthPassword: vi.fn(), updateFirebaseAuthProfile: vi.fn(),
}));
vi.mock("../src/services/userService", () => ({
  ensureUserProfile: (...args) => mocks.ensure(...args),
  subscribeUserProfile: (_uid, callback) => { mocks.profileListener = callback; return vi.fn(); },
  updateUserProfile: vi.fn(),
}));
import { AuthProvider, useAuth } from "../src/context/AuthContext";

const resident = { id: "resident", uid: "resident", name: "Resident", email: "resident@example.com", barangay: "Pinambaran", role: "resident" };
let renderer, current, mounts;
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
function Consumer() { current = useAuth(); useEffect(() => { mounts++; }, []); return <span>{current.user?.role || "signed out"}</span>; }
const mount = async () => { await act(async () => { renderer = create(<AuthProvider><Consumer /></AuthProvider>); }); };

describe("authentication lifecycle", () => {
  beforeEach(() => {
    vi.clearAllMocks(); current = null; mounts = 0; mocks.users = []; mocks.logout.mockResolvedValue(true);
    const data = new Map();
    vi.stubGlobal("localStorage", { getItem: (key) => data.get(key) ?? null, setItem: (key, value) => data.set(key, String(value)), removeItem: (key) => data.delete(key) });
    vi.stubGlobal("window", Object.assign(new EventTarget(), { setInterval, clearInterval }));
  });
  afterEach(() => { act(() => renderer?.unmount()); vi.unstubAllGlobals(); });
  it("rejects a forged local fallback admin when Firebase has no session", async () => {
    localStorage.setItem("currentUser", JSON.stringify({ role: "barangay_admin", isAdminFallbackSession: true }));
    await mount(); await act(async () => mocks.listener(null));
    expect(current.isAuthenticated).toBe(false);
    expect(localStorage.getItem("currentUser")).toBeNull();
  });
  it("keeps the login form mounted while submitting and after a failed sign in", async () => {
    await mount(); await act(async () => mocks.listener(null));
    const request = deferred(); mocks.login.mockReturnValue(request.promise);
    let result;
    await act(async () => { result = current.login("resident@example.com", "wrong"); });
    expect(current.isSubmitting).toBe(true);
    expect(mounts).toBe(1);
    await act(async () => { request.reject({ code: "auth/invalid-credential" }); await result; });
    expect(await result).toHaveProperty("error");
    expect(current.isSubmitting).toBe(false);
    expect(mounts).toBe(1);
  });
  it("uses the remote resident role even if the cached account was an admin", async () => {
    mocks.users = [{ ...resident, role: "barangay_admin" }];
    mocks.ensure.mockResolvedValue(resident);
    await mount(); await act(async () => mocks.listener({ uid: "resident" }));
    expect(current.user.role).toBe("resident");
  });
  it("does not restore a stale profile after logout", async () => {
    await mount(); await act(async () => mocks.listener(null));
    const request = deferred(); mocks.ensure.mockReturnValue(request.promise);
    let restore;
    await act(async () => { restore = mocks.listener({ uid: "resident" }); });
    await act(async () => { await current.logout(); });
    await act(async () => { request.resolve(resident); await restore; });
    expect(current.user).toBeNull();
    expect(current.isAuthenticated).toBe(false);
    expect(localStorage.getItem("currentUser")).toBeNull();
  });
  it("clears the session if its live profile is deleted", async () => {
    mocks.ensure.mockResolvedValue(resident);
    await mount(); await act(async () => mocks.listener({ uid: "resident" }));
    await act(async () => mocks.profileListener(null));
    expect(current.isAuthenticated).toBe(false);
    expect(current.user).toBeNull();
  });
  it("does not complete an old login after logout", async () => {
    await mount(); await act(async () => mocks.listener(null));
    const request = deferred(); mocks.login.mockReturnValue(request.promise);
    let login;
    await act(async () => { login = current.login("resident@example.com", "password123"); });
    await act(async () => { await current.logout(); });
    await act(async () => { request.resolve(resident); await login; });
    expect(current.user).toBeNull();
    expect(current.isAuthenticated).toBe(false);
    expect(current.isSubmitting).toBe(false);
    expect(localStorage.getItem("currentUser")).toBeNull();
  });
  it("revokes the session if the live profile changes to an unsupported role", async () => {
    mocks.ensure.mockResolvedValue(resident);
    await mount(); await act(async () => mocks.listener({ uid: "resident" }));
    await act(async () => mocks.profileListener({ ...resident, role: "invalid-role" }));
    expect(current.isAuthenticated).toBe(false);
    expect(current.user).toBeNull();
  });
});
