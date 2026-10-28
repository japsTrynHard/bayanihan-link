import { BARANGAYS } from "../utils/storage";

export const SAN_MIGUEL_PSGC_CODE = "0301421000";
export const SAN_MIGUEL_PSGC_CORRESPONDENCE_CODE = "031421000";

const BARANGAY_CACHE_KEY = "bayanihan_san_miguel_barangays_psgc_cache_v1";
const BARANGAY_STORAGE_KEY = "barangays";

const normalizeBarangayName = (value = "") => String(value || "").trim().replace(/\s+/g, " ");

const FALLBACK_BARANGAYS = BARANGAYS.filter((item) => item.name !== "Select Barangay");

const endpointCandidates = [
  `https://psgc.cloud/api/v1/cities-municipalities/${SAN_MIGUEL_PSGC_CODE}/barangays`,
  `https://psgc.cloud/api/cities-municipalities/${SAN_MIGUEL_PSGC_CODE}/barangays`,
  `https://psgc.cloud/api/v2/cities-municipalities/${SAN_MIGUEL_PSGC_CODE}/barangays`,
  `https://psgc.cloud/api/v1/municipalities/${SAN_MIGUEL_PSGC_CODE}/barangays`,
];

const getArrayPayload = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.barangays)) return payload.barangays;
  return [];
};

const readJson = (key, fallback = null) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    console.warn(`Unable to read ${key}.`, error);
    return fallback;
  }
};

const writeJson = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`Unable to write ${key}.`, error);
  }
};

export const normalizePsgcBarangays = (items = []) => {
  const seen = new Set();
  const normalized = items
    .map((item, index) => {
      const name = normalizeBarangayName(
        item.name ||
        item.brgy_name ||
        item.barangay_name ||
        item.barangay ||
        item.description ||
        item.psgc_name ||
        "",
      );

      if (!name || seen.has(name.toLowerCase())) return null;
      seen.add(name.toLowerCase());

      return {
        id: item.code || item.psgc_code || item.psgcCode || item.id || index + 1,
        name,
        code: item.code || item.psgc_code || item.psgcCode || item.id || "",
        urbanRural: item.urbanRural || item.urban_rural || item.classification || "",
        population: item.population || item.population_2024 || item.popcen2024 || "",
      };
    })
    .filter(Boolean)
    .sort((first, second) => first.name.localeCompare(second.name));

  return [
    { id: 0, name: "Select Barangay", code: "" },
    ...normalized.map((item, index) => ({ ...item, id: item.id || index + 1 })),
  ];
};

const saveBarangayList = (barangays, source = "psgc-api") => {
  const normalized = normalizePsgcBarangays(barangays);
  if (normalized.length <= 1) return null;

  const payload = {
    source,
    municipalityCode: SAN_MIGUEL_PSGC_CODE,
    fetchedAt: new Date().toISOString(),
    count: normalized.length - 1,
    barangays: normalized,
  };

  writeJson(BARANGAY_CACHE_KEY, payload);
  writeJson(BARANGAY_STORAGE_KEY, normalized);
  window.dispatchEvent(new Event("barangays-refresh"));
  window.dispatchEvent(new Event("app-data-refresh"));
  return payload;
};

export const getCachedSanMiguelBarangays = () => {
  const cached = readJson(BARANGAY_CACHE_KEY, null);
  if (Array.isArray(cached?.barangays) && cached.barangays.length > 1) return cached;

  const stored = readJson(BARANGAY_STORAGE_KEY, null);
  if (Array.isArray(stored) && stored.length > 1) {
    return {
      source: "local-storage",
      municipalityCode: SAN_MIGUEL_PSGC_CODE,
      fetchedAt: "",
      count: stored.filter((item) => item.name !== "Select Barangay").length,
      barangays: stored,
    };
  }

  return {
    source: "fallback-static",
    municipalityCode: SAN_MIGUEL_PSGC_CODE,
    fetchedAt: "",
    count: FALLBACK_BARANGAYS.length,
    barangays: BARANGAYS,
  };
};

export const fetchSanMiguelBarangays = async ({ allowFallback = true } = {}) => {
  let lastError = null;

  for (const endpoint of endpointCandidates) {
    try {
      const response = await fetch(endpoint, {
        method: "GET",
        headers: { Accept: "application/json" },
      });

      if (!response.ok) throw new Error(`PSGC endpoint returned ${response.status}`);

      const payload = await response.json();
      const items = getArrayPayload(payload);
      const saved = saveBarangayList(items, endpoint);
      if (saved?.barangays?.length > 1) return saved;
      throw new Error("PSGC endpoint returned an empty barangay list.");
    } catch (error) {
      lastError = error;
      console.warn(`Unable to load barangays from PSGC API: ${endpoint}`, error);
    }
  }

  if (!allowFallback) throw lastError || new Error("Unable to load PSGC barangays.");

  const fallback = getCachedSanMiguelBarangays();
  writeJson(BARANGAY_STORAGE_KEY, fallback.barangays);
  return {
    ...fallback,
    error: lastError?.message || "PSGC API unavailable. Used cached/fallback barangay list.",
  };
};

export const getSanMiguelBarangaysForAdmin = async () => {
  const payload = await fetchSanMiguelBarangays({ allowFallback: true });
  return payload.barangays || BARANGAYS;
};
