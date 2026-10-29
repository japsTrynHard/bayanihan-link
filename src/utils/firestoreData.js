// Only walk plain data. Firestore FieldValue, Timestamp, GeoPoint and reference
// instances must retain their prototypes for the SDK to serialize them correctly.
export const removeUndefined = (value) => {
  if (Array.isArray(value)) {
    return value.map(removeUndefined).filter((item) => item !== undefined);
  }
  if (value && typeof value === "object") {
    const prototype = Object.getPrototypeOf(value);
    if (prototype === Object.prototype || prototype === null) {
      return Object.fromEntries(
        Object.entries(value)
          .filter(([, item]) => item !== undefined)
          .map(([key, item]) => [key, removeUndefined(item)]),
      );
    }
  }
  return value;
};

export const toIso = (value) => {
  if (value === null || value === undefined || value === "") return "";
  try {
    const candidate = typeof value?.toDate === "function"
      ? value.toDate()
      : typeof value?.seconds === "number"
        ? new Date(value.seconds * 1000 + (value.nanoseconds || 0) / 1e6)
        : value;
    if (!["string", "number"].includes(typeof candidate) && !(candidate instanceof Date)) return "";
    const date = new Date(candidate);
    return Number.isNaN(date.getTime()) ? "" : date.toISOString();
  } catch {
    return "";
  }
};
