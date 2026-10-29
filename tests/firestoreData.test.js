import { describe, expect, it } from "vitest";
import { arrayUnion, GeoPoint, serverTimestamp, Timestamp } from "firebase/firestore";
import { removeUndefined, toIso } from "../src/utils/firestoreData";

describe("Firestore payload serialization", () => {
  it("preserves SDK values while removing undefined nested data", () => {
    const values = [serverTimestamp(), arrayUnion("resident"), Timestamp.now(), new GeoPoint(15, 121), new Date()];
    const result = removeUndefined({ values, missing: undefined, nested: { keep: null, remove: undefined } });
    values.forEach((value, index) => expect(result.values[index]).toBe(value));
    expect(result).not.toHaveProperty("missing");
    expect(result.nested).toEqual({ keep: null });
  });
  it("uses the ISO fallback for pending or previously corrupted timestamps", () => {
    expect(toIso(serverTimestamp())).toBe("");
    expect(toIso({ _methodName: "serverTimestamp" })).toBe("");
    expect(toIso("invalid")).toBe("");
    expect(toIso(Timestamp.fromDate(new Date("2026-10-29T01:00:00Z")))).toBe("2026-10-29T01:00:00.000Z");
    expect(toIso({ seconds: 0, nanoseconds: 500000000 })).toBe("1970-01-01T00:00:00.500Z");
  });
});
