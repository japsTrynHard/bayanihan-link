import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { applyModerationToUser, getAccountIdentityKeys, getAccountStatusInfo } from "../src/utils/accountModeration";
import { normalizeCoordinates } from "../src/utils/locationApi";

describe("account identity and moderation", () => {
  beforeEach(() => vi.stubGlobal("localStorage", { getItem: () => "{}" }));
  afterEach(() => vi.unstubAllGlobals());
  it("keeps accounts with the same display name separate", () => {
    const first = { id: "first", name: "Juan Cruz", status: "Active" };
    const second = { id: "second", name: "Juan Cruz", status: "Suspended" };
    expect(getAccountIdentityKeys(first)).not.toContain("name:juan cruz");
    expect(getAccountStatusInfo(first, [second]).isSuspended).toBe(false);
  });
  it("lets a newer remote restoration replace a stale cached suspension", () => {
    vi.stubGlobal("localStorage", { getItem: () => JSON.stringify({ resident: { id: "resident", status: "Suspended", updatedAt: "2026-10-28T01:00:00Z" } }) });
    expect(applyModerationToUser({ id: "resident", status: "Active", moderationUpdatedAt: "2026-10-29T01:00:00Z" }).status).toBe("Active");
  });
  it("does not turn absent location fields into a zero coordinate", () => {
    expect(normalizeCoordinates({ lat: "", lng: null })).toBeNull();
    expect(normalizeCoordinates({ lat: 0, lng: 0 })).toMatchObject({ lat: 0, lng: 0 });
  });
});
