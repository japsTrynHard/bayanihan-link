import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { generateAppointmentSlots, getDateDayIndex, getTodayIsoDate, validateAppointmentRequest } from "../src/utils/appointmentLogic";

describe("appointment schedule validation", () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-29T02:00:00Z")); });
  afterEach(() => vi.useRealTimers());
  const slotsFor = (serviceId = "business-clearance", date = "2026-10-29") => generateAppointmentSlots({ date, serviceId });
  it("rejects elapsed times on the current date in Manila", () => {
    expect(slotsFor().find((slot) => slot.time === "10:00").disabled).toBe(true);
    expect(slotsFor().find((slot) => slot.time === "10:30").disabled).toBe(false);
    expect(validateAppointmentRequest({ appointmentData: { serviceId: "cedula", preferredDate: "2026-10-29", preferredTime: "08:00" } }).valid).toBe(false);
  });
  it("requires enough time to finish before lunch and closing", () => {
    const slots = slotsFor();
    expect(slots.find((slot) => slot.time === "11:00").disabled).toBe(false);
    expect(slots.find((slot) => slot.time === "11:30").disabled).toBe(true);
    expect(slots.find((slot) => slot.time === "16:00").disabled).toBe(false);
    expect(slots.find((slot) => slot.time === "16:30").disabled).toBe(true);
  });
  it("uses the barangay date across midnight regardless of the device timezone", () => {
    vi.setSystemTime(new Date("2026-10-28T16:30:00Z"));
    expect(getTodayIsoDate()).toBe("2026-10-29");
  });
  it("rejects rolled-over dates and weekends", () => {
    expect(getDateDayIndex("2026-02-30")).toBe(-1);
    expect(slotsFor("cedula", "2026-10-31").every((slot) => slot.disabled)).toBe(true);
  });
});
