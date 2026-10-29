import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  auth: { currentUser: null }, create: vi.fn(), remove: vi.fn(), signIn: vi.fn(),
  signOut: vi.fn(), observer: null, createProfile: vi.fn(), ensureProfile: vi.fn(), resolveAdmin: vi.fn(),
}));
vi.mock("../src/firebase/firebaseConfig", () => ({ auth: mocks.auth }));
vi.mock("firebase/auth", () => ({
  createUserWithEmailAndPassword: (...args) => mocks.create(...args), deleteUser: (...args) => mocks.remove(...args),
  signInWithEmailAndPassword: (...args) => mocks.signIn(...args), signOut: () => mocks.signOut(),
  onAuthStateChanged: (_auth, callback) => { mocks.observer = callback; return vi.fn(); },
  updateProfile: vi.fn(), updateEmail: vi.fn(), updatePassword: vi.fn(), reauthenticateWithCredential: vi.fn(), EmailAuthProvider: {},
}));
vi.mock("../src/services/userService", () => ({ createUserProfile: (...args) => mocks.createProfile(...args), ensureUserProfile: (...args) => mocks.ensureProfile(...args), getUserProfile: vi.fn() }));
vi.mock("../src/services/adminSeedService", () => ({ resolveBarangayAdminCredential: (...args) => mocks.resolveAdmin(...args) }));
import { listenToAuthChanges, loginWithEmail, registerResidentAccount } from "../src/services/authService";

describe("Firebase authentication service", () => {
  beforeEach(() => { vi.resetAllMocks(); mocks.auth.currentUser = null; });
  it("propagates Firebase login failures without granting a local admin session", async () => {
    mocks.resolveAdmin.mockResolvedValue({ email: "pinambaran.admin@bayanihanlink.app" });
    mocks.signIn.mockRejectedValue({ code: "auth/network-request-failed" });
    await expect(loginWithEmail("Pinambaranadmin", "Pinambaran123")).rejects.toMatchObject({ code: "auth/network-request-failed" });
  });
  it("loads the saved role after an admin username authenticates", async () => {
    mocks.resolveAdmin.mockResolvedValue({ email: "pinambaran.admin@bayanihanlink.app" });
    mocks.signIn.mockResolvedValue({ user: { uid: "assigned" } });
    mocks.ensureProfile.mockResolvedValue({ uid: "assigned", role: "resident" });
    expect((await loginWithEmail("Pinambaranadmin", "changed-password")).role).toBe("resident");
  });
  it("waits for the completed registration profile before notifying auth observers", async () => {
    const user = { uid: "new" };
    mocks.create.mockImplementation(async () => { mocks.auth.currentUser = user; return { user }; });
    let saveProfile;
    mocks.createProfile.mockReturnValue(new Promise((resolve) => { saveProfile = resolve; }));
    const callback = vi.fn(); listenToAuthChanges(callback);
    const registration = registerResidentAccount({ email: "resident@example.com", password: "password123", barangay: "Pinambaran", firstName: "Juan", lastName: "Cruz" });
    const observed = mocks.observer(user);
    await vi.waitFor(() => expect(mocks.createProfile).toHaveBeenCalled());
    expect(callback).not.toHaveBeenCalled();
    saveProfile({ uid: "new", barangay: "Pinambaran" });
    await registration; await observed;
    expect(callback).toHaveBeenCalledWith(user);
    expect(mocks.createProfile.mock.calls[0][1].role).toBe("resident");
  });
  it("removes the new Auth account when its profile cannot be saved", async () => {
    const user = { uid: "new" };
    mocks.create.mockResolvedValue({ user });
    mocks.createProfile.mockRejectedValue(new Error("Save failed"));
    await expect(registerResidentAccount({ email: "resident@example.com", password: "password123", barangay: "Pinambaran" })).rejects.toThrow("Save failed");
    expect(mocks.remove).toHaveBeenCalledWith(user);
  });
});
