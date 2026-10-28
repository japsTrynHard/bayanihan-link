const MAPS_API_KEY = import.meta?.env?.VITE_GOOGLE_MAPS_API_KEY || "";

const SAN_MIGUEL_CENTER = {
  lat: 15.1447,
  lng: 120.9797,
};

export const SAN_MIGUEL_SERVICE_AREA_LABEL = "San Miguel, Bulacan";

export const SERVICE_AREA_STATUS = {
  VERIFIED: "verified_within_area",
  NOT_VERIFIED: "not_verified",
  OUTSIDE: "outside_service_area",
};

// Free/offline geofence guard. This uses the municipal bounding box to block
// reports that are clearly outside San Miguel, Bulacan without calling a paid map API.
export const SAN_MIGUEL_BOUNDS = {
  minLat: 15.042439,
  minLng: 120.870401,
  maxLat: 15.267923,
  maxLng: 121.315918,
};

const toNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

export const normalizeCoordinates = (record = {}) => {
  const safeRecord = record || {};
  const source = safeRecord.exactLocation || safeRecord.locationPin || safeRecord.location || {};
  const lat = toNumber(safeRecord.lat ?? safeRecord.latitude ?? source.lat ?? source.latitude);
  const lng = toNumber(safeRecord.lng ?? safeRecord.longitude ?? source.lng ?? source.longitude);

  if (lat === null || lng === null) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;

  return {
    lat,
    lng,
    accuracy: toNumber(safeRecord.accuracy ?? source.accuracy),
    capturedAt: safeRecord.locationCapturedAt || source.capturedAt || "",
    source: safeRecord.locationSource || source.source || "saved-location",
  };
};

export const hasExactCoordinates = (record = {}) => Boolean(normalizeCoordinates(record));

export const isWithinSanMiguelServiceArea = (coordsOrRecord = {}) => {
  const safeRecord = coordsOrRecord || {};
  const coords = "lat" in safeRecord || "lng" in safeRecord
    ? normalizeCoordinates(safeRecord)
    : normalizeCoordinates(safeRecord || {});

  if (!coords) return false;

  return (
    coords.lat >= SAN_MIGUEL_BOUNDS.minLat &&
    coords.lat <= SAN_MIGUEL_BOUNDS.maxLat &&
    coords.lng >= SAN_MIGUEL_BOUNDS.minLng &&
    coords.lng <= SAN_MIGUEL_BOUNDS.maxLng
  );
};

export const getServiceAreaStatus = (coordsOrRecord = {}) => {
  const coords = normalizeCoordinates(coordsOrRecord);
  if (!coords) {
    return {
      status: SERVICE_AREA_STATUS.NOT_VERIFIED,
      isWithinServiceArea: false,
      canSubmitEmergency: true,
      label: "Location not verified",
      message: "No GPS pin was verified. The barangay admin must check the typed landmark before making it public.",
    };
  }

  const inside = isWithinSanMiguelServiceArea(coords);
  return {
    status: inside ? SERVICE_AREA_STATUS.VERIFIED : SERVICE_AREA_STATUS.OUTSIDE,
    isWithinServiceArea: inside,
    canSubmitEmergency: inside,
    label: inside ? `Within ${SAN_MIGUEL_SERVICE_AREA_LABEL}` : `Outside ${SAN_MIGUEL_SERVICE_AREA_LABEL}`,
    message: inside
      ? `Location verified within ${SAN_MIGUEL_SERVICE_AREA_LABEL}.`
      : `This GPS location appears outside ${SAN_MIGUEL_SERVICE_AREA_LABEL}. Bayanihan Link emergency reports are limited to San Miguel incidents only.`,
  };
};

export const buildServiceAreaPayload = (record = {}) => {
  const serviceArea = getServiceAreaStatus(record);
  return {
    municipality: "San Miguel",
    province: "Bulacan",
    isWithinServiceArea: serviceArea.isWithinServiceArea,
    verificationMethod: normalizeCoordinates(record) ? "gps" : "manual_landmark",
    locationStatus: serviceArea.status,
    label: serviceArea.label,
    checkedAt: new Date().toISOString(),
  };
};

export const getMapsApiStatus = () => ({
  hasKey: Boolean(MAPS_API_KEY),
  provider: MAPS_API_KEY ? "Google Maps Platform" : "OpenStreetMap",
  mode: MAPS_API_KEY
    ? "Google Maps key detected"
    : "Free map mode / no API key required",
  envName: "VITE_GOOGLE_MAPS_API_KEY",
});

export const getRecordLocationLabel = (record = {}) => {
  const label =
    record.publicAreaText ||
    record.landmark ||
    record.locationDetails ||
    record.locationText ||
    record.location ||
    record.itemPlace ||
    record.placeLost ||
    record.placeFound ||
    record.barangay ||
    "San Miguel, Bulacan";

  return typeof label === "string" ? label : "San Miguel, Bulacan";
};

export const getPublicEmergencyLocationLabel = (record = {}) => {
  if (record.publicAreaText) return record.publicAreaText;
  if (record.landmark && record.barangay) return `${record.landmark}, ${record.barangay}`;
  if (record.locationDetails) return record.locationDetails;
  if (record.barangay) return `Barangay ${record.barangay}`;
  return "General area provided to barangay admin";
};

export const buildBarangayMapQuery = (record = {}) => {
  const coords = normalizeCoordinates(record);
  if (coords) return `${coords.lat},${coords.lng}`;

  const label = getRecordLocationLabel(record);
  const barangay = record.barangay ? `Barangay ${record.barangay}` : "San Miguel";
  return `${label}, ${barangay}, Bulacan, Philippines`;
};

export const buildGoogleMapsSearchUrl = (record = {}) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(buildBarangayMapQuery(record))}`;

export const buildGoogleMapsDirectionsUrl = (record = {}) =>
  `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(buildBarangayMapQuery(record))}`;

export const buildOpenStreetMapUrl = (record = {}) => {
  const coords = normalizeCoordinates(record);
  if (coords) {
    return `https://www.openstreetmap.org/?mlat=${coords.lat}&mlon=${coords.lng}#map=17/${coords.lat}/${coords.lng}`;
  }
  return `https://www.openstreetmap.org/search?query=${encodeURIComponent(buildBarangayMapQuery(record))}`;
};

export const buildOpenStreetMapEmbedUrl = (record = {}) => {
  const coords = normalizeCoordinates(record);
  if (!coords) return "";

  const boxSize = 0.004;
  const minLng = coords.lng - boxSize;
  const minLat = coords.lat - boxSize;
  const maxLng = coords.lng + boxSize;
  const maxLat = coords.lat + boxSize;

  return `https://www.openstreetmap.org/export/embed.html?bbox=${minLng}%2C${minLat}%2C${maxLng}%2C${maxLat}&layer=mapnik&marker=${coords.lat}%2C${coords.lng}`;
};

export const buildStaticMapPreviewUrl = (record = {}) => {
  if (!MAPS_API_KEY) return "";
  return `https://maps.googleapis.com/maps/api/staticmap?center=${encodeURIComponent(buildBarangayMapQuery(record))}&zoom=15&size=640x320&markers=color:red%7C${encodeURIComponent(buildBarangayMapQuery(record))}&key=${MAPS_API_KEY}`;
};

export const formatAccuracy = (accuracy) => {
  const value = toNumber(accuracy);
  if (value === null) return "Accuracy not available";
  if (value < 1000) return `Around ${Math.round(value)} meters`;
  return `Around ${(value / 1000).toFixed(1)} km`;
};

export const getLocationConfidence = (record = {}) => {
  let score = 0;
  const reasons = [];
  const coords = normalizeCoordinates(record);

  if (record.barangay) {
    score += 20;
    reasons.push("barangay provided");
  }
  if (record.publicAreaText || record.landmark || record.locationDetails || record.locationText || record.itemPlace || record.placeLost || record.placeFound) {
    score += 30;
    reasons.push("area or landmark provided");
  }
  if (record.address || record.street) {
    score += 15;
    reasons.push("address details provided");
  }
  if (coords) {
    score += coords.accuracy && coords.accuracy <= 100 ? 35 : 25;
    reasons.push("exact pin available for admin");
  }

  const finalScore = Math.min(score, 100);

  return {
    score: finalScore,
    label:
      finalScore >= 75
        ? "Clear location"
        : finalScore >= 45
          ? "Usable location"
          : "Needs clearer location",
    reasons,
  };
};

export { SAN_MIGUEL_CENTER };
