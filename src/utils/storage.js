// BAYANIHAN LINK local storage helpers and demo seed data

// 49 official barangays of San Miguel, Bulacan (PSGC/PSA)
export const BARANGAYS = [
  { id: 0, name: "Select Barangay" },
  { id: 1, name: "Bagong Silang" },
  { id: 2, name: "Balaong" },
  { id: 3, name: "Balite" },
  { id: 4, name: "Bantog" },
  { id: 5, name: "Bardias" },
  { id: 6, name: "Baritan" },
  { id: 7, name: "Batasan Bata" },
  { id: 8, name: "Batasan Matanda" },
  { id: 9, name: "Biak-na-Bato" },
  { id: 10, name: "Biclat" },
  { id: 11, name: "Buga" },
  { id: 12, name: "Buliran" },
  { id: 13, name: "Bulualto" },
  { id: 14, name: "Calumpang" },
  { id: 15, name: "Cambio" },
  { id: 16, name: "Camias" },
  { id: 17, name: "Ilog-Bulo" },
  { id: 18, name: "King Kabayo" },
  { id: 19, name: "Labne" },
  { id: 20, name: "Lambakin" },
  { id: 21, name: "Magmarale" },
  { id: 22, name: "Malibay" },
  { id: 23, name: "Mandile" },
  { id: 24, name: "Masalipit" },
  { id: 25, name: "Pacalag" },
  { id: 26, name: "Paliwasan" },
  { id: 27, name: "Partida" },
  { id: 28, name: "Pinambaran" },
  { id: 29, name: "Poblacion" },
  { id: 30, name: "Pulong Bayabas" },
  { id: 31, name: "Sacdalan" },
  { id: 32, name: "Salacot" },
  { id: 33, name: "Salangan" },
  { id: 34, name: "San Agustin" },
  { id: 35, name: "San Jose" },
  { id: 36, name: "San Juan" },
  { id: 37, name: "San Vicente" },
  { id: 38, name: "Santa Ines" },
  { id: 39, name: "Santa Lucia" },
  { id: 40, name: "Santa Rita Bata" },
  { id: 41, name: "Santa Rita Matanda" },
  { id: 42, name: "Sapang" },
  { id: 43, name: "Sibul" },
  { id: 44, name: "Tartaro" },
  { id: 45, name: "Tibagan" },
  { id: 46, name: "Bagong Pag-asa" },
  { id: 47, name: "Pulong Duhat" },
  { id: 48, name: "Maligaya" },
  { id: 49, name: "Tigpalas" },
];

const nowIso = () => new Date().toISOString();

export const USER_STATUS = {
  ACTIVE: "Active",
  WARNED: "Warned",
  SUSPENDED: "Suspended",
};

export const JOB_POST_STATUS = {
  ACTIVE: "Active",
  CLOSED: "Closed",
  FLAGGED: "Flagged",
  REMOVED: "Removed",
};

export const LOST_FOUND_STATUS = {
  ACTIVE: "Active",
  CLAIMED: "Claimed",
  RETURNED: "Returned",
  REUNITED: "Reunited",
  INFORMATION_VERIFIED: "Information Verified",
  CLOSED: "Closed",
};

export const EMERGENCY_STATUS = {
  NEW: "New",
  VERIFIED: "Verified",
  ONGOING: "Ongoing",
  RESPONDED: "Responded",
  RESOLVED: "Resolved",
  FALSE_REPORT: "False Report",
};

export const APPOINTMENT_STATUS = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  RESCHEDULED: "Rescheduled",
  RESCHEDULE_REQUESTED: "Reschedule Requested",
  MISSING_REQUIREMENTS: "Missing Requirements",
  READY_FOR_PICKUP: "Ready for Pickup",
  CHECKED_IN: "Checked-in",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  NO_SHOW: "No-show",
};

export const REPORT_STATUS = {
  PENDING: "Pending",
  UNDER_REVIEW: "Under Review",
  NEEDS_EVIDENCE: "Needs Evidence",
  RESOLVED: "Resolved",
  DISMISSED: "Dismissed",
};

export const JOB_STATUS_OPTIONS = Object.values(JOB_POST_STATUS);
export const LOST_FOUND_STATUS_OPTIONS = Object.values(LOST_FOUND_STATUS);
export const EMERGENCY_STATUS_OPTIONS = [
  EMERGENCY_STATUS.NEW,
  EMERGENCY_STATUS.VERIFIED,
  EMERGENCY_STATUS.ONGOING,
  EMERGENCY_STATUS.RESPONDED,
  EMERGENCY_STATUS.RESOLVED,
  EMERGENCY_STATUS.FALSE_REPORT,
];
export const APPOINTMENT_STATUS_OPTIONS = Object.values(APPOINTMENT_STATUS);
export const REPORT_STATUS_OPTIONS = Object.values(REPORT_STATUS);

export const EMERGENCY_TYPES = [
  "Accident",
  "Fire",
  "Medical Emergency",
  "Flood",
  "Theft/Robbery",
  "Missing Person",
  "Other Critical Incident",
];

export const EMERGENCY_SEVERITY_OPTIONS = ["High", "Critical"];

const normalizeStatus = (value, allowedStatuses, fallback) => {
  if (!value) return fallback;
  const text = String(value).trim();
  const exact = allowedStatuses.find(
    (status) => status.toLowerCase() === text.toLowerCase(),
  );
  if (exact) return exact;

  const legacyMap = {
    open: fallback,
    active: fallback,
    new: EMERGENCY_STATUS.NEW,
    ongoing: EMERGENCY_STATUS.ONGOING,
    responded: EMERGENCY_STATUS.RESPONDED,
    resolved: EMERGENCY_STATUS.RESOLVED,
    pending: APPOINTMENT_STATUS.PENDING,
    approved: APPOINTMENT_STATUS.APPROVED,
    rejected: APPOINTMENT_STATUS.REJECTED,
    rescheduled: APPOINTMENT_STATUS.RESCHEDULED,
    "reschedule requested": APPOINTMENT_STATUS.RESCHEDULE_REQUESTED,
    "reschedule_request": APPOINTMENT_STATUS.RESCHEDULE_REQUESTED,
    "reschedule_requested": APPOINTMENT_STATUS.RESCHEDULE_REQUESTED,
    "missing requirements": APPOINTMENT_STATUS.MISSING_REQUIREMENTS,
    "ready for pickup": APPOINTMENT_STATUS.READY_FOR_PICKUP,
    "checked in": APPOINTMENT_STATUS.CHECKED_IN,
    "checked-in": APPOINTMENT_STATUS.CHECKED_IN,
    checked_in: APPOINTMENT_STATUS.CHECKED_IN,
    verified: EMERGENCY_STATUS.VERIFIED,
    "false report": EMERGENCY_STATUS.FALSE_REPORT,
    completed: APPOINTMENT_STATUS.COMPLETED,
    cancelled: APPOINTMENT_STATUS.CANCELLED,
    canceled: APPOINTMENT_STATUS.CANCELLED,
    "no show": APPOINTMENT_STATUS.NO_SHOW,
    "no-show": APPOINTMENT_STATUS.NO_SHOW,
    no_show: APPOINTMENT_STATUS.NO_SHOW,
    claimed: LOST_FOUND_STATUS.CLAIMED,
    returned: LOST_FOUND_STATUS.RETURNED,
    closed: JOB_POST_STATUS.CLOSED,
    flagged: JOB_POST_STATUS.FLAGGED,
    removed: JOB_POST_STATUS.REMOVED,
    warned: USER_STATUS.WARNED,
    suspended: USER_STATUS.SUSPENDED,
    dismissed: REPORT_STATUS.DISMISSED,
    "under review": REPORT_STATUS.UNDER_REVIEW,
    "needs evidence": REPORT_STATUS.NEEDS_EVIDENCE,
    needs_evidence: REPORT_STATUS.NEEDS_EVIDENCE,
  };

  const mapped = legacyMap[text.toLowerCase()];
  return allowedStatuses.includes(mapped) ? mapped : fallback;
};

const normalizeEmergencyContacts = (contacts = []) => {
  if (!Array.isArray(contacts)) return [];

  return contacts
    .slice(0, 3)
    .map((contact, index) => ({
      id: contact.id || `emergency-contact-${index + 1}`,
      name: String(contact.name || "").trim(),
      relationship: String(contact.relationship || "").trim(),
      phone: String(contact.phone || "").trim(),
      priority: contact.priority || (index === 0 ? "Primary" : "Backup"),
      consent: contact.consent !== false,
    }))
    .filter((contact) => contact.name || contact.phone);
};

export const cleanEmergencyContacts = normalizeEmergencyContacts;

export const normalizeUser = (user = {}) => ({
  ...user,
  status: normalizeStatus(
    user.status,
    Object.values(USER_STATUS),
    USER_STATUS.ACTIVE,
  ),
  emergencyContacts: normalizeEmergencyContacts(user.emergencyContacts),
  warnings: Array.isArray(user.warnings) ? user.warnings : [],
});

export const normalizePost = (post = {}) => {
  const isLostFound = ["lost", "found"].includes(post.type);
  const isJobPost = post.type === "job";
  const allowedStatuses = isLostFound
    ? [...LOST_FOUND_STATUS_OPTIONS, JOB_POST_STATUS.FLAGGED, JOB_POST_STATUS.REMOVED]
    : JOB_STATUS_OPTIONS;
  const fallback = isLostFound ? LOST_FOUND_STATUS.ACTIVE : JOB_POST_STATUS.ACTIVE;
  const createdAt = post.createdAt || nowIso();
  const homeBarangay = isLostFound
    ? post.homeBarangay || post.authorBarangay || post.author?.barangay || post.userBarangay || post.residentBarangay || post.barangay || ""
    : isJobPost
      ? post.homeBarangay || post.authorBarangay || post.author?.barangay || post.userBarangay || post.residentBarangay || post.barangay || ""
      : post.homeBarangay;
  const incidentBarangay = isLostFound
    ? post.incidentBarangay || post.itemBarangay || post.locationBarangay || post.barangay || homeBarangay || ""
    : post.incidentBarangay;
  const workBarangay = isJobPost
    ? post.workBarangay || post.jobBarangay || post.serviceBarangay || post.handlerBarangay || post.locationBarangay || post.barangay || homeBarangay || ""
    : post.workBarangay;
  const jobCoverageBarangays = isJobPost
    ? Array.from(new Set([...(Array.isArray(post.coverageBarangays) ? post.coverageBarangays : []), workBarangay].filter(Boolean)))
    : post.coverageBarangays;
  const itemDate = post.itemDate || post.dateLost || post.dateFound || "";
  const itemPlace = post.itemPlace || post.placeLost || post.placeFound || post.location || incidentBarangay || post.barangay || "";
  const isCrossBarangay = Boolean(
    (isLostFound && homeBarangay && incidentBarangay && homeBarangay !== incidentBarangay) ||
      (isJobPost && homeBarangay && workBarangay && homeBarangay !== workBarangay),
  );
  const rawCaseType = String(post.caseType || post.lostFoundCaseType || post.subjectType || "").toLowerCase();
  const caseBlob = `${post.category || ""} ${post.title || ""} ${post.description || ""}`.toLowerCase();
  const caseType = isLostFound
    ? ["item", "pet", "person"].includes(rawCaseType)
      ? rawCaseType
      : /missing person|person sighting|sighting|senior|child|kid|bata|matanda|tao|person/.test(caseBlob)
        ? "person"
        : /pet|dog|cat|puppy|kitten|aso|pusa|animal/.test(caseBlob)
          ? "pet"
          : "item"
    : post.caseType;

  return {
    comments: 0,
    interests: 0,
    images: [],
    responses: [],
    interestedUserIds: [],
    ...post,
    barangay: isLostFound ? incidentBarangay : isJobPost ? workBarangay : post.barangay,
    homeBarangay,
    incidentBarangay,
    workBarangay,
    jobBarangay: isJobPost ? workBarangay : post.jobBarangay,
    serviceBarangay: isJobPost ? workBarangay : post.serviceBarangay,
    handlerBarangay: isLostFound ? incidentBarangay : isJobPost ? workBarangay : post.handlerBarangay,
    coverageBarangays: jobCoverageBarangays,
    supportBarangays: (isLostFound || isJobPost) && isCrossBarangay ? Array.from(new Set([...(Array.isArray(post.supportBarangays) ? post.supportBarangays : []), homeBarangay].filter(Boolean))) : post.supportBarangays,
    caseType,
    lostFoundCaseType: isLostFound ? caseType : post.lostFoundCaseType,
    itemBarangay: isLostFound ? incidentBarangay : post.itemBarangay,
    isCrossBarangay,
    itemDate,
    itemPlace,
    dateLost: post.type === "lost" ? post.dateLost || itemDate : post.dateLost || "",
    placeLost: post.type === "lost" ? post.placeLost || itemPlace : post.placeLost || "",
    dateFound: post.type === "found" ? post.dateFound || itemDate : post.dateFound || "",
    placeFound: post.type === "found" ? post.placeFound || itemPlace : post.placeFound || "",
    responses: Array.isArray(post.responses) ? post.responses : [],
    interestedUserIds: Array.isArray(post.interestedUserIds)
      ? post.interestedUserIds
      : [],
    status: normalizeStatus(post.status, allowedStatuses, fallback),
    createdAt,
    postedDate: post.postedDate || displayDate(createdAt),
  };
};

export const normalizeEmergency = (emergency = {}) => {
  const createdAt = emergency.createdAt || nowIso();
  const emergencyType = EMERGENCY_TYPES.includes(emergency.emergencyType)
    ? emergency.emergencyType
    : "Other Critical Incident";
  const normalizedSeverity = String(emergency.severity || "High").toLowerCase() === "critical"
    ? "Critical"
    : "High";
  const lat = Number(emergency.lat ?? emergency.latitude ?? emergency.exactLocation?.lat ?? emergency.locationPin?.lat);
  const lng = Number(emergency.lng ?? emergency.longitude ?? emergency.exactLocation?.lng ?? emergency.locationPin?.lng);
  const hasCoordinates = Number.isFinite(lat) && Number.isFinite(lng);
  const rawLocation = typeof emergency.location === "string" ? emergency.location : "";
  const reporterHomeBarangay = emergency.reporterHomeBarangay || emergency.homeBarangay || emergency.author?.barangay || emergency.userBarangay || emergency.barangay || "";
  const incidentBarangay = emergency.incidentBarangay || emergency.handlerBarangay || emergency.locationBarangay || emergency.barangay || reporterHomeBarangay || "";
  const handlerBarangay = emergency.handlerBarangay || incidentBarangay;
  const isCrossBarangay = Boolean(reporterHomeBarangay && incidentBarangay && reporterHomeBarangay !== incidentBarangay);
  const supportBarangays = Array.from(new Set([
    ...(Array.isArray(emergency.supportBarangays) ? emergency.supportBarangays : []),
    ...(isCrossBarangay ? [reporterHomeBarangay] : []),
  ].filter(Boolean)));
  const landmark = emergency.landmark || emergency.locationDetails || emergency.locationText || rawLocation || "";
  const publicAreaText =
    emergency.publicAreaText ||
    (landmark && incidentBarangay ? `${landmark}, ${incidentBarangay}` : "") ||
    incidentBarangay ||
    "";

  return {
    responses: 0,
    adminNotes: [],
    statusHistory: [],
    visibility: {
      showToPublic: false,
      exactPinAdminOnly: true,
    },
    ...emergency,
    emergencyType,
    severity: normalizedSeverity,
    reporterRole: emergency.reporterRole || emergency.whoNeedsHelp || "witness",
    victimName: emergency.victimName || "",
    victimCondition: emergency.victimCondition || "",
    reporterHomeBarangay,
    homeBarangay: reporterHomeBarangay,
    incidentBarangay,
    handlerBarangay,
    supportBarangays,
    barangay: handlerBarangay,
    isCrossBarangay,
    emergencyContactsSnapshot: normalizeEmergencyContacts(emergency.emergencyContactsSnapshot),
    serviceArea: {
      municipality: "San Miguel",
      province: "Bulacan",
      isWithinServiceArea: Boolean(emergency.serviceArea?.isWithinServiceArea),
      verificationMethod: emergency.serviceArea?.verificationMethod || emergency.locationSource || "manual_landmark",
      locationStatus: emergency.serviceArea?.locationStatus || emergency.locationStatus || "not_verified",
      label: emergency.serviceArea?.label || emergency.locationStatusLabel || "Location not verified",
      checkedAt: emergency.serviceArea?.checkedAt || emergency.locationCapturedAt || createdAt,
      ...(emergency.serviceArea || {}),
    },
    locationStatus: emergency.locationStatus || emergency.serviceArea?.locationStatus || "not_verified",
    landmark,
    publicAreaText,
    locationDetails: landmark || rawLocation || incidentBarangay || "",
    exactLocation: hasCoordinates
      ? {
          lat,
          lng,
          accuracy: Number(emergency.accuracy ?? emergency.exactLocation?.accuracy ?? emergency.locationPin?.accuracy) || null,
          capturedAt: emergency.locationCapturedAt || emergency.exactLocation?.capturedAt || createdAt,
          source: emergency.locationSource || emergency.exactLocation?.source || "resident-browser",
        }
      : emergency.exactLocation || emergency.locationPin || null,
    lat: hasCoordinates ? lat : emergency.lat,
    lng: hasCoordinates ? lng : emergency.lng,
    image: emergency.image || (Array.isArray(emergency.images) ? emergency.images[0] || "" : ""),
    status: normalizeStatus(
      emergency.status,
      EMERGENCY_STATUS_OPTIONS,
      EMERGENCY_STATUS.NEW,
    ),
    visibility: {
      ...(emergency.visibility || {}),
      showToPublic: false,
      exactPinAdminOnly: emergency.visibility?.exactPinAdminOnly !== false,
    },
    createdAt,
    timestamp: emergency.timestamp || displayDate(createdAt),
    adminNotes: Array.isArray(emergency.adminNotes) ? emergency.adminNotes : [],
    statusHistory: Array.isArray(emergency.statusHistory) ? emergency.statusHistory : [],
  };
};

export const normalizeAppointment = (appointment = {}) => {
  const createdAt = appointment.createdAt || nowIso();
  const preferredDate = appointment.preferredDate || appointment.scheduledDate || appointment.rescheduledDate || "";
  const preferredTime = appointment.preferredTime || appointment.scheduledTime || appointment.rescheduledTime || "";

  return {
    adminNotes: "",
    notes: "",
    statusHistory: [],
    appointmentLogs: [],
    requirements: [],
    requirementsStatus: "Not checked",
    checkInCode: "",
    qrCodeValue: "",
    referenceNumber: "",
    ...appointment,
    serviceId: appointment.serviceId || "",
    serviceType: appointment.serviceType || appointment.serviceName || "Barangay Clearance",
    preferredDate,
    preferredTime,
    scheduledDate: appointment.scheduledDate || preferredDate,
    scheduledTime: appointment.scheduledTime || preferredTime,
    rescheduledDate: appointment.rescheduledDate || "",
    rescheduledTime: appointment.rescheduledTime || "",
    status: normalizeStatus(
      appointment.status,
      APPOINTMENT_STATUS_OPTIONS,
      APPOINTMENT_STATUS.PENDING,
    ),
    statusHistory: Array.isArray(appointment.statusHistory)
      ? appointment.statusHistory
      : [],
    requirements: Array.isArray(appointment.requirements)
      ? appointment.requirements
      : [],
    createdAt,
    requestedAt: appointment.requestedAt || displayDate(createdAt),
    appointmentLogs: Array.isArray(appointment.appointmentLogs)
      ? appointment.appointmentLogs
      : Array.isArray(appointment.logs)
        ? appointment.logs
        : [],
    trackingNumber:
      appointment.trackingNumber ||
      appointment.referenceNumber ||
      `BL-${String(appointment.id || Date.now()).replace(/[^0-9]/g, "").slice(-6).padStart(6, "0")}`,
    referenceNumber:
      appointment.referenceNumber ||
      appointment.trackingNumber ||
      `BL-${String(appointment.id || Date.now()).replace(/[^0-9]/g, "").slice(-6).padStart(6, "0")}`,
    checkInCode:
      appointment.checkInCode ||
      `CHK-${String(appointment.id || Date.now()).replace(/[^0-9]/g, "").slice(-6).padStart(6, "0")}`,
    qrCodeValue:
      appointment.qrCodeValue ||
      appointment.checkInCode ||
      appointment.referenceNumber ||
      appointment.trackingNumber ||
      "",
  };
};

export const normalizeReport = (report = {}) => {
  const createdAt = report.createdAt || nowIso();
  const targetType = report.targetType || "post";
  const status = normalizeStatus(
    report.status,
    REPORT_STATUS_OPTIONS,
    REPORT_STATUS.PENDING,
  );

  return {
    category: report.category || "Other",
    details: report.details || "No additional details provided.",
    evidence: report.evidence || "",
    targetType,
    targetId: report.targetId || "",
    targetTitle: report.targetTitle || report.postTitle || report.userName || "Target record",
    targetUserId: report.targetUserId || report.reportedUserId || "",
    targetUserName: report.targetUserName || report.reportedUserName || "",
    reporterBarangay: report.reporterBarangay || report.reportedByBarangay || "",
    handlerBarangay: report.handlerBarangay || report.barangay || "",
    incidentBarangay: report.incidentBarangay || report.handlerBarangay || report.barangay || "",
    duplicateOf: report.duplicateOf || "",
    duplicateCount: Number(report.duplicateCount || 0),
    additionalEvidence: Array.isArray(report.additionalEvidence) ? report.additionalEvidence : [],
    actionTaken: report.actionTaken || "",
    actionNote: report.actionNote || "",
    reviewedBy: report.reviewedBy || "",
    reviewedAt: report.reviewedAt || "",
    resolvedBy: report.resolvedBy || "",
    resolvedAt: report.resolvedAt || "",
    statusHistory: Array.isArray(report.statusHistory) ? report.statusHistory : [],
    ...report,
    status,
    createdAt,
    timestamp: report.timestamp || displayDate(createdAt),
  };
};

export const displayDate = (dateString = nowIso()) =>
  new Date(dateString).toLocaleString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

export const getInitials = (name = "") => {
  return name.split(" ").filter(Boolean).map((part) => part[0]).join("").toUpperCase().slice(0, 2) || "U";
};

const publicUser = (user) => ({
  id: user.id,
  uid: user.uid || user.id,
  name: user.name,
  firstName: user.firstName || "",
  lastName: user.lastName || "",
  avatar: user.avatar || getInitials(user.name || ""),
  profilePicture: user.profilePicture || user.avatarUrl || "",
  avatarUrl: user.avatarUrl || user.profilePicture || "",
  phone: user.phone || "",
  barangay: user.barangay,
  role: user.role,
  status: user.status || USER_STATUS.ACTIVE,
});

const getLocalUserKeys = (user = {}) => [
  user.id,
  user.uid,
  user.userId,
  user.email,
]
  .filter(Boolean)
  .map((item) => String(item));

const uniqueLocalKeys = (...groups) => [
  ...new Set(groups.flat().filter(Boolean).map((item) => String(item))),
];

export const SAMPLE_ACCOUNTS = [
  {
    id: "user-resident-1",
    name: "Juan Santos",
    email: "juan@example.com",
    password: "password123",
    phone: "+63 9171234567",
    emergencyContacts: [
      { id: "juan-ec-1", name: "Ana Santos", relationship: "Mother", phone: "+63 9170000001", priority: "Primary", consent: true },
    ],
    barangay: "Poblacion",
    avatar: "JS",
    profilePicture: "https://api.dicebear.com/7.x/avataaars/svg?seed=juan",
    bio: "Community volunteer helping other residents.",
    joinedDate: "2026-03-01",
    role: "resident",
    status: USER_STATUS.ACTIVE,
    warnings: [],
  },
  {
    id: "user-resident-2",
    name: "Maria Garcia",
    email: "maria@example.com",
    password: "password123",
    phone: "+63 9172345678",
    emergencyContacts: [
      { id: "maria-ec-1", name: "Pedro Garcia", relationship: "Father", phone: "+63 9170000002", priority: "Primary", consent: true },
    ],
    barangay: "Poblacion",
    avatar: "MG",
    profilePicture: "https://api.dicebear.com/7.x/avataaars/svg?seed=maria",
    bio: "Looking for opportunities and helpful local connections.",
    joinedDate: "2026-03-05",
    role: "resident",
    status: USER_STATUS.ACTIVE,
    warnings: [],
  },
  {
    id: "user-admin-1",
    name: "Barangay Admin",
    email: "admin@example.com",
    password: "admin123",
    phone: "+63 9173456789",
    barangay: "Poblacion",
    avatar: "BA",
    profilePicture: "https://api.dicebear.com/7.x/avataaars/svg?seed=admin",
    bio: "Assigned barangay official for local requests and monitoring.",
    joinedDate: "2026-02-20",
    role: "barangay_admin",
    status: USER_STATUS.ACTIVE,
    warnings: [],
  },
];

const residentJuan = publicUser(SAMPLE_ACCOUNTS[0]);
const residentMaria = publicUser(SAMPLE_ACCOUNTS[1]);
const adminUser = publicUser(SAMPLE_ACCOUNTS[2]);

const samplePostDates = {
  one: "2026-04-06T08:15:00",
  two: "2026-04-06T11:40:00",
  three: "2026-04-07T06:30:00",
};

const makePost = (data) => normalizePost(data);

const makeChat = (data) => ({
  messages: [],
  participants: [],
  participantProfiles: [],
  createdAt: data.createdAt || nowIso(),
  ...data,
});

const resolveNotificationType = (data = {}) => {
  if (data.type) return data.type;
  if (data.relatedEmergency) return "emergency";
  if (data.relatedAppointment) return "appointment";
  if (data.relatedChat) return "chat";
  if (data.relatedAnnouncement) return "announcement";
  if (data.relatedReport) return "report";
  if (data.relatedPost) return "post";
  return "system";
};

const resolveNotificationPriority = (data = {}) => {
  if (data.priority) return data.priority;
  const type = resolveNotificationType(data);
  if (type === "emergency") return "high";
  if (type === "report" || type === "moderation") return "medium";
  return "normal";
};

const resolveNotificationActionPath = (data = {}) => {
  if (data.actionPath) return data.actionPath;
  if (data.relatedEmergency) return data.targetRole === "barangay_admin" ? "/admin/emergencies" : "/emergency";
  if (data.relatedAppointment) return data.targetRole === "barangay_admin" ? "/admin/appointments" : "/appointment-request";
  if (data.relatedChat) return `/chat?chat=${data.relatedChat}`;
  if (data.relatedAnnouncement) return data.targetRole === "barangay_admin" ? "/admin/announcements" : "/dashboard";
  if (data.relatedReport) return "/admin/reports";
  if (data.relatedPost) return data.targetRole === "barangay_admin" ? "/admin/dashboard" : `/post/${data.relatedPost}`;
  return data.targetRole === "barangay_admin" ? "/admin/dashboard" : "/dashboard";
};

export const normalizeNotification = (notification = {}) => {
  const createdAt = notification.createdAt || nowIso();
  const type = resolveNotificationType(notification);
  const title = notification.title || {
    emergency: "Emergency Alert",
    appointment: "Appointment Update",
    chat: "New Message",
    announcement: "Barangay Announcement",
    report: "Report Update",
    moderation: "Moderation Notice",
    post: "Community Post Update",
    system: "System Notification",
  }[type] || "Notification";

  return {
    ...notification,
    id: notification.id || `notif-${Date.now()}`,
    read: Boolean(notification.read),
    createdAt,
    timestamp: notification.timestamp || displayDate(createdAt),
    targetUserIds: Array.isArray(notification.targetUserIds) ? notification.targetUserIds : [],
    targetRole: notification.targetRole || null,
    targetBarangay: notification.targetBarangay || null,
    targetBarangays: Array.isArray(notification.targetBarangays)
      ? notification.targetBarangays.filter(Boolean)
      : [],
    actionChatUserId: notification.actionChatUserId || notification.actorUserId || "",
    actionChatUserName: notification.actionChatUserName || notification.actorUserName || "",
    actionLabel: notification.actionLabel || (notification.actionChatUserId || notification.actorUserId ? "Chat Now" : "Open"),
    readBy: Array.isArray(notification.readBy) ? notification.readBy : [],
    deletedBy: Array.isArray(notification.deletedBy) ? notification.deletedBy : [],
    type,
    title,
    priority: resolveNotificationPriority(notification),
    actionPath: resolveNotificationActionPath(notification),
  };
};

const makeNotification = (data) => normalizeNotification({
  id: `notif-seed-${Math.random().toString(36).slice(2, 8)}`,
  read: false,
  createdAt: data.createdAt || nowIso(),
  timestamp: data.timestamp || displayDate(data.createdAt || nowIso()),
  targetUserIds: data.targetUserIds || [],
  targetRole: data.targetRole || null,
  targetBarangay: data.targetBarangay || null,
  ...data,
});

const makeEmergency = (data) => normalizeEmergency(data);

const makeAppointment = (data) => normalizeAppointment(data);

export const normalizeAnnouncement = (announcement = {}) => {
  const rawTargets = Array.isArray(announcement.targetBarangays)
    ? announcement.targetBarangays.filter(Boolean)
    : [];
  const barangay = announcement.barangay || rawTargets[0] || "Poblacion";
  const targetMode = announcement.targetMode || (rawTargets.length > 1 ? "specific" : "barangay");
  const targetBarangays = targetMode === "all"
    ? []
    : targetMode === "specific"
      ? rawTargets
      : [barangay].filter(Boolean);

  return {
    ...announcement,
    barangay,
    priority: announcement.priority || "medium",
    category: announcement.category || "General Notice",
    targetMode,
    targetBarangays,
    actionLabel: announcement.actionLabel || "Read Announcement",
    actionPath: announcement.actionPath || "",
    expiresAt: announcement.expiresAt || "",
    isPinned: Boolean(announcement.isPinned),
    audience: announcement.audience || (targetMode === "all" ? "All San Miguel residents" : targetMode === "specific" ? "Selected barangays" : "Residents"),
    status: announcement.status || "Published",
    readBy: Array.isArray(announcement.readBy) ? announcement.readBy : [],
    createdAt: announcement.createdAt || nowIso(),
  };
};

const makeAnnouncement = (data) => normalizeAnnouncement({
  priority: "medium",
  isPinned: false,
  audience: "Residents",
  status: "Published",
  createdAt: data.createdAt || nowIso(),
  ...data,
});

const makeReport = (data) => normalizeReport(data);

const SAMPLE_POSTS = [
  makePost({
    id: "post-1",
    type: "job",
    opportunityType: "hiring",
    category: "Household",
    title: "Need part-time helper this weekend",
    description:
      "Looking for a resident who can help clean our store area for two days. Prefer someone from Poblacion.",
    salary: "₱700 / day",
    barangay: "Poblacion",
    contactPreference: "Chat",
    workSchedule: "Saturday to Sunday, 8:00 AM - 4:00 PM",
    requirements: "Can help with light cleaning and organizing.",
    author: residentJuan,
    comments: 2,
    interests: 1,
    interestedUserIds: [residentMaria.id],
    responses: [
      {
        id: "job-response-demo-1",
        userId: residentMaria.id,
        userName: residentMaria.name,
        barangay: residentMaria.barangay,
        responseType: "interested",
        timestamp: "Apr 6, 2026, 12:10 PM",
        createdAt: "2026-04-06T12:10:00",
        status: "Active",
      },
    ],
    createdAt: samplePostDates.one,
  }),
  makePost({
    id: "post-2",
    type: "lost",
    title: "Lost black wallet near barangay hall",
    description:
      "Lost a black wallet with school ID and small cash. Last seen near the waiting shed.",
    category: "Wallet / Purse",
    color: "Black",
    brand: "School ID inside",
    uniqueDetails: "Owner can describe the ID name and wallet contents.",
    reward: "₱500 reward",
    requiresProof: true,
    barangay: "Poblacion",
    homeBarangay: "Poblacion",
    incidentBarangay: "Poblacion",
    itemBarangay: "Poblacion",
    dateLost: "2026-04-06",
    placeLost: "Waiting shed near barangay hall",
    itemDate: "2026-04-06",
    itemDateDisplay: "Apr 6, 2026",
    itemPlace: "Waiting shed near barangay hall",
    author: residentMaria,
    comments: 1,
    interests: 1,
    interestedUserIds: [residentJuan.id],
    responses: [
      {
        id: "lost-found-response-demo-1",
        userId: residentJuan.id,
        userName: residentJuan.name,
        barangay: residentJuan.barangay,
        responseType: "Chat request for this lost item case",
        timestamp: "Apr 6, 2026, 12:45 PM",
        createdAt: "2026-04-06T12:45:00",
        status: "Active",
      },
    ],
    createdAt: samplePostDates.two,
  }),
  makePost({
    id: "post-3",
    type: "found",
    title: "Found phone charger at covered court",
    description:
      "White fast charger found after the youth meeting. Owner may message to claim it.",
    category: "Phone / Gadget",
    color: "White",
    brand: "Fast charger",
    uniqueDetails: "Owner should describe the cable or plug mark.",
    requiresProof: true,
    barangay: "Poblacion",
    homeBarangay: "Poblacion",
    incidentBarangay: "Poblacion",
    itemBarangay: "Poblacion",
    dateFound: "2026-04-07",
    placeFound: "Covered court bleachers",
    itemDate: "2026-04-07",
    itemDateDisplay: "Apr 7, 2026",
    itemPlace: "Covered court bleachers",
    author: residentJuan,
    comments: 0,
    interests: 0,
    createdAt: samplePostDates.three,
  }),
  makePost({
    id: "post-4",
    type: "found",
    title: "Found black wallet near barangay hall waiting shed",
    description:
      "Black wallet found near the barangay hall waiting shed. Owner must describe the ID and contents before claiming.",
    category: "Wallet / Purse",
    color: "Black",
    brand: "School ID inside",
    uniqueDetails: "Owner must describe the visible ID name and wallet contents.",
    reward: "Owner must provide proof before claiming.",
    requiresProof: true,
    barangay: "Poblacion",
    homeBarangay: "Poblacion",
    incidentBarangay: "Poblacion",
    itemBarangay: "Poblacion",
    dateFound: "2026-04-06",
    placeFound: "Waiting shed near barangay hall",
    itemDate: "2026-04-06",
    itemDateDisplay: "Apr 6, 2026",
    itemPlace: "Waiting shed near barangay hall",
    author: residentJuan,
    comments: 0,
    interests: 0,
    responses: [],
    interestedUserIds: [],
    createdAt: samplePostDates.three,
  }),
];

const SAMPLE_CHATS = [
  makeChat({
    id: "chat-1",
    participants: [residentJuan.id, residentMaria.id],
    participantProfiles: [residentJuan, residentMaria],
    messages: [
      {
        id: "msg-1",
        senderId: residentMaria.id,
        text: "Hello, nakita ko yung lost item post mo.",
        timestamp: "7:58 AM",
        readBy: [residentMaria.id, residentJuan.id],
      },
      {
        id: "msg-2",
        senderId: residentJuan.id,
        text: "Salamat, iche-check ko yung post mo.",
        timestamp: "8:10 AM",
        readBy: [residentJuan.id],
      },
    ],
    lastMessage: "Salamat, iche-check ko yung post mo.",
    lastMessageTime: "8:10 AM",
  }),
];

const SAMPLE_NOTIFICATIONS = [
  makeNotification({
    id: "notif-1",
    message: "Your lost item post received a new response.",
    relatedPost: "post-2",
    read: false,
    targetUserIds: [residentMaria.id],
    targetBarangay: "Poblacion",
    createdAt: "2026-04-07T08:00:00",
  }),
  makeNotification({
    id: "notif-2",
    message: "Barangay announcement: office schedule updated for this week.",
    read: true,
    targetRole: "resident",
    targetBarangay: "Poblacion",
    createdAt: "2026-04-06T15:00:00",
  }),
  makeNotification({
    id: "notif-3",
    message: "New appointment request submitted by Juan Santos.",
    read: false,
    targetRole: "barangay_admin",
    targetBarangay: "Poblacion",
    createdAt: "2026-04-07T08:05:00",
  }),
];

const SAMPLE_EMERGENCIES = [
  makeEmergency({
    id: "emerg-1",
    title: "Minor road accident near Poblacion plaza",
    description:
      "Residents reported a motorcycle collision. Assistance already dispatched.",
    emergencyType: "Accident",
    severity: "Critical",
    locationDetails: "Poblacion plaza main road",
    landmark: "Poblacion plaza main road",
    publicAreaText: "Near Poblacion plaza, Poblacion",
    lat: 15.1429,
    lng: 120.9756,
    accuracy: 35,
    locationSource: "demo-pin",
    visibility: { showToPublic: true, exactPinAdminOnly: true },
    barangay: "Poblacion",
    author: residentJuan,
    authorId: residentJuan.id,
    responses: 4,
    status: EMERGENCY_STATUS.RESPONDED,
    adminNotes: [
      {
        id: "enote-demo-1",
        note: "Barangay responder already checked the area and coordinated assistance.",
        createdBy: "Barangay Admin",
        createdAt: "2026-04-07T07:50:00",
      },
    ],
    statusHistory: [
      {
        status: EMERGENCY_STATUS.NEW,
        note: "Emergency report submitted by resident.",
        updatedBy: residentJuan.name,
        createdAt: "2026-04-07T07:40:00",
      },
      {
        status: EMERGENCY_STATUS.RESPONDED,
        note: "Barangay responder already checked the area and coordinated assistance.",
        updatedBy: "Barangay Admin",
        createdAt: "2026-04-07T07:50:00",
      },
    ],
    createdAt: "2026-04-07T07:40:00",
  }),
];

const SAMPLE_APPOINTMENTS = [
  makeAppointment({
    id: "appt-1",
    userId: residentJuan.id,
    userName: residentJuan.name,
    barangay: residentJuan.barangay,
    serviceType: "Barangay Clearance",
    preferredDate: "2026-04-09",
    preferredTime: "09:00",
    purpose: "Employment requirement",
    notes: "Will bring two valid IDs.",
    adminNotes: "Please proceed to Window 2.",
    requirements: ["Valid ID", "Cedula if available", "Purpose of request"],
    scheduledDate: "2026-04-09",
    scheduledTime: "09:00",
    requestedAt: "Apr 7, 2026, 7:15 AM",
    trackingNumber: "BL-000001",
    status: "Pending",
    statusHistory: [
      {
        status: "Pending",
        note: "Appointment request submitted by resident.",
        createdAt: "2026-04-07T07:15:00",
        updatedBy: residentJuan.name,
      },
    ],
    createdAt: "2026-04-07T07:15:00",
  }),
];

const SAMPLE_ANNOUNCEMENTS = [
  makeAnnouncement({
    id: "ann-1",
    title: "Document requests schedule",
    body:
      "Barangay document requests will be processed from 8:00 AM to 3:00 PM this week.",
    barangay: adminUser.barangay,
    createdBy: adminUser.name,
    priority: "high",
    isPinned: true,
    createdAt: "2026-04-07T06:50:00",
  }),
];

const SAMPLE_REPORTS = [
  makeReport({
    id: "report-1",
    reportedBy: residentMaria.name,
    reportedById: residentMaria.id,
    targetType: "job_post",
    targetId: "post-1",
    targetTitle: "Need part-time helper this weekend",
    targetUserId: residentJuan.id,
    targetUserName: residentJuan.name,
    category: "Wrong information",
    reason: "Possible misleading rate",
    details: "Please review the payment details written in the job post.",
    barangay: "Poblacion",
    status: "Pending",
    createdAt: "2026-04-07T08:05:00",
    statusHistory: [
      {
        status: "Pending",
        note: "Report submitted by resident.",
        updatedBy: residentMaria.name,
        createdAt: "2026-04-07T08:05:00",
      },
    ],
  }),
];

const STORAGE_KEYS = {
  users: "users",
  posts: "posts",
  chats: "chats",
  notifications: "notifications",
  emergencies: "emergencies",
  barangays: "barangays",
  appointments: "appointments",
  announcements: "announcements",
  reports: "reports",
  history: "history",
};

const seedIfMissing = (key, value) => {
  if (!localStorage.getItem(key)) {
    localStorage.setItem(key, JSON.stringify(value));
  }
};

const read = (key, fallback = []) => {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch (error) {
    console.warn(`BAYANIHAN LINK storage reset for key: ${key}`, error);
    localStorage.removeItem(key);
    return fallback;
  }
};

const emitAppDataRefresh = (key) => {
  if (typeof window === "undefined") return;
  window.setTimeout(() => {
    window.dispatchEvent(new CustomEvent("app-data-refresh", { detail: { key } }));
  }, 0);
};

const write = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value));
  emitAppDataRefresh(key);
  return value;
};

export const resetStorageToDemo = () => {
  write(STORAGE_KEYS.users, SAMPLE_ACCOUNTS);
  write(STORAGE_KEYS.posts, SAMPLE_POSTS);
  write(STORAGE_KEYS.chats, SAMPLE_CHATS);
  write(STORAGE_KEYS.notifications, SAMPLE_NOTIFICATIONS);
  write(STORAGE_KEYS.emergencies, SAMPLE_EMERGENCIES);
  write(STORAGE_KEYS.barangays, BARANGAYS);
  write(STORAGE_KEYS.appointments, SAMPLE_APPOINTMENTS);
  write(STORAGE_KEYS.announcements, SAMPLE_ANNOUNCEMENTS);
  write(STORAGE_KEYS.reports, SAMPLE_REPORTS);
  write(STORAGE_KEYS.history, []);
};

// Initialize localStorage with sample accounts and demo data
export const initializeStorage = () => {
  seedIfMissing(STORAGE_KEYS.users, SAMPLE_ACCOUNTS);
  seedIfMissing(STORAGE_KEYS.posts, SAMPLE_POSTS);
  seedIfMissing(STORAGE_KEYS.chats, SAMPLE_CHATS);
  seedIfMissing(STORAGE_KEYS.notifications, SAMPLE_NOTIFICATIONS);
  seedIfMissing(STORAGE_KEYS.emergencies, SAMPLE_EMERGENCIES);
  seedIfMissing(STORAGE_KEYS.barangays, BARANGAYS);
  // Always refresh barangay options so older cached demo data cannot keep an incomplete list.
  write(STORAGE_KEYS.barangays, BARANGAYS);
  seedIfMissing(STORAGE_KEYS.appointments, SAMPLE_APPOINTMENTS);
  seedIfMissing(STORAGE_KEYS.announcements, SAMPLE_ANNOUNCEMENTS);
  seedIfMissing(STORAGE_KEYS.reports, SAMPLE_REPORTS);
  seedIfMissing(STORAGE_KEYS.history, []);

  // Phase 1 migration: normalize old demo/localStorage values like
  // active/open/flagged/removed into the official system status labels.
  write(STORAGE_KEYS.users, getUsers().map(normalizeUser));
  write(STORAGE_KEYS.posts, getPosts().map(normalizePost));
  write(STORAGE_KEYS.emergencies, getEmergencies().map(normalizeEmergency));
  write(STORAGE_KEYS.appointments, getAppointments().map(normalizeAppointment));
  write(STORAGE_KEYS.announcements, getAnnouncements().map(normalizeAnnouncement));
  write(STORAGE_KEYS.notifications, getNotifications().map(normalizeNotification));
  write(STORAGE_KEYS.reports, getReports().map(normalizeReport));
};

// User operations
export const getUsers = () => read(STORAGE_KEYS.users, SAMPLE_ACCOUNTS).map(normalizeUser);

export const findUserByEmail = (email) => {
  const users = getUsers();
  return users.find((u) => u.email.toLowerCase() === email.toLowerCase());
};

export const updateUser = (userId, updates) => {
  const users = getUsers();
  const target = String(userId || updates?.id || updates?.uid || updates?.email || "").toLowerCase();
  const matchesTarget = (record = {}) => {
    const keys = [record.id, record.uid, record.userId, record.email]
      .filter(Boolean)
      .map((item) => String(item).toLowerCase());
    return keys.includes(target);
  };

  const previousUser = users.find(matchesTarget);
  if (!previousUser) return null;

  const nextUser = normalizeUser({
    ...previousUser,
    ...updates,
    id: previousUser.id || updates.id || updates.uid,
    uid: previousUser.uid || updates.uid || previousUser.id,
    updatedAt: nowIso(),
  });

  if (updates.name && !updates.avatar) {
    nextUser.avatar = getInitials(updates.name);
  }

  const updatedUsers = users.map((u) => (matchesTarget(u) ? nextUser : u));
  write(STORAGE_KEYS.users, updatedUsers);

  const publicProfile = publicUser(nextUser);
  const isSameAuthor = (record = {}) => matchesTarget(record) || matchesTarget(record.author || {});
  write(STORAGE_KEYS.posts, getPosts().map((post) => isSameAuthor(post.author || { id: post.authorId }) ? { ...post, author: { ...(post.author || {}), ...publicProfile }, authorId: post.authorId || nextUser.id } : post));
  write(STORAGE_KEYS.chats, getChats().map((chat) => ({ ...chat, participantProfiles: (chat.participantProfiles || []).map((profile) => matchesTarget(profile) ? { ...profile, ...publicProfile } : profile) })));
  write(STORAGE_KEYS.emergencies, getEmergencies().map((emergency) => matchesTarget({ id: emergency.authorId }) || matchesTarget(emergency.author || {}) ? { ...emergency, authorId: emergency.authorId || nextUser.id, author: { ...(emergency.author || {}), ...publicProfile } } : emergency));
  write(STORAGE_KEYS.appointments, getAppointments().map((appointment) => matchesTarget({ id: appointment.userId, email: appointment.userEmail }) ? { ...appointment, userName: nextUser.name, barangay: nextUser.barangay } : appointment));
  write(STORAGE_KEYS.announcements, getAnnouncements().map((announcement) => matchesTarget({ id: announcement.createdById, email: announcement.createdByEmail }) ? { ...announcement, createdBy: nextUser.name, barangay: nextUser.barangay } : announcement));
  write(STORAGE_KEYS.reports, getReports().map((report) => {
    const reporterMatch = matchesTarget({ id: report.reportedById, email: report.reportedByEmail });
    const targetMatch = matchesTarget({ id: report.targetUserId || report.reportedUserId, email: report.targetUserEmail });
    return reporterMatch || targetMatch
      ? {
          ...report,
          ...(reporterMatch ? { reportedBy: nextUser.name } : {}),
          ...(targetMatch ? { targetUserName: nextUser.name } : {}),
          barangay: report.barangay || nextUser.barangay,
        }
      : report;
  }));

  const currentUserRaw = localStorage.getItem("currentUser");
  if (currentUserRaw) {
    const currentUser = JSON.parse(currentUserRaw);
    const currentKeys = [currentUser.id, currentUser.uid, currentUser.email].filter(Boolean).map((item) => String(item).toLowerCase());
    if (currentKeys.includes(target)) {
      localStorage.setItem("currentUser", JSON.stringify({
        ...currentUser,
        ...nextUser,
        ...publicProfile,
        firstName: nextUser.firstName,
        lastName: nextUser.lastName,
        phone: nextUser.phone,
        bio: nextUser.bio,
        email: nextUser.email,
        profilePicture: nextUser.profilePicture,
        avatarUrl: nextUser.avatarUrl || nextUser.profilePicture,
        avatarPublicId: nextUser.avatarPublicId || "",
      }));
    }
  }

  window.dispatchEvent(new Event("app-data-refresh"));
  return nextUser;
};

export const setUserStatus = (userId, status) => {
  const users = getUsers();
  const nextStatus = normalizeStatus(
    status,
    Object.values(USER_STATUS),
    USER_STATUS.ACTIVE,
  );
  const target = String(userId || "").toLowerCase();
  const updated = users.map((user) => {
    const keys = [user.id, user.uid, user.email].filter(Boolean).map((item) => String(item).toLowerCase());
    return keys.includes(target) ? { ...user, status: nextStatus } : user;
  });
  write(STORAGE_KEYS.users, updated);
  return updated.find((user) => [user.id, user.uid, user.email].filter(Boolean).map((item) => String(item).toLowerCase()).includes(target)) || null;
};

export const addUserWarning = (userId, warning = {}) => {
  const users = getUsers();
  const createdAt = nowIso();
  const nextWarning = {
    id: "warn-" + Date.now(),
    message: warning.message || "Barangay admin issued a warning.",
    reason: warning.reason || "Moderation warning",
    createdAt,
    timestamp: displayDate(createdAt),
  };
  const updated = users.map((user) => {
    const target = String(userId || "").toLowerCase();
    const keys = [user.id, user.uid, user.email].filter(Boolean).map((item) => String(item).toLowerCase());
    if (!keys.includes(target)) return user;
    return {
      ...user,
      status: USER_STATUS.WARNED,
      warnings: [...(user.warnings || []), nextWarning],
    };
  });
  write(STORAGE_KEYS.users, updated);
  const target = String(userId || "").toLowerCase();
  return updated.find((user) => [user.id, user.uid, user.email].filter(Boolean).map((item) => String(item).toLowerCase()).includes(target)) || null;
};

// Posts operations
export const getPosts = () => read(STORAGE_KEYS.posts, SAMPLE_POSTS).map(normalizePost);

export const createPost = (postData) => {
  const posts = getPosts();
  const createdAt = nowIso();
  const postType = postData.type || "job";
  const defaultStatus = ["lost", "found"].includes(postType)
    ? LOST_FOUND_STATUS.ACTIVE
    : JOB_POST_STATUS.ACTIVE;
  const newPost = makePost({
    id: `post-${Date.now()}`,
    ...postData,
    type: postType,
    barangay: postData.author?.barangay || postData.barangay,
    status: postData.status || defaultStatus,
    createdAt,
    postedDate: displayDate(createdAt),
  });
  posts.unshift(newPost);
  write(STORAGE_KEYS.posts, posts);
  return newPost;
};

export const updatePost = (postId, updates) => {
  const posts = getPosts();
  const updated = posts.map((p) => {
    if (p.id !== postId) return p;
    return normalizePost({ ...p, ...updates });
  });
  write(STORAGE_KEYS.posts, updated);
  return updated.find((p) => p.id === postId);
};

export const deletePost = (postId) => {
  const posts = getPosts();
  const filtered = posts.filter((p) => p.id !== postId);
  write(STORAGE_KEYS.posts, filtered);
  return filtered;
};

// Chats operations
export const getChats = () => read(STORAGE_KEYS.chats, SAMPLE_CHATS);

export const createChat = (chatData) => {
  const chats = getChats();
  const newChat = makeChat({
    id: `chat-${Date.now()}`,
    ...chatData,
    messages: chatData.messages || [],
    createdAt: nowIso(),
  });
  chats.unshift(newChat);
  write(STORAGE_KEYS.chats, chats);
  return newChat;
};

export const getOrCreateChat = ({ currentUser, otherUser, context = {} }) => {
  if (!currentUser?.id || !otherUser?.id) return null;

  const chats = getChats();
  const nextRelatedPost = context.relatedPostId
    ? {
        id: context.relatedPostId,
        title: context.relatedPostTitle || "Community post",
        type: context.relatedPostType || "post",
        source: context.source || "post_interaction",
        createdAt: nowIso(),
      }
    : null;

  const currentKeys = getLocalUserKeys(currentUser);
  const otherKeys = getLocalUserKeys(otherUser);
  const existing = chats.find((chat) => {
    const chatKeys = uniqueLocalKeys(
      chat.participants || [],
      chat.participantKeys || [],
      (chat.participantProfiles || []).flatMap(getLocalUserKeys),
    );
    return currentKeys.some((key) => chatKeys.includes(String(key))) &&
      otherKeys.some((key) => chatKeys.includes(String(key)));
  });

  if (existing) {
    if (!nextRelatedPost) return existing;

    const updatedChats = chats.map((chat) => {
      if (chat.id !== existing.id) return chat;
      const currentRelatedPosts = Array.isArray(chat.relatedPosts)
        ? chat.relatedPosts
        : [];
      const relatedPosts = currentRelatedPosts.some(
        (item) => item.id === nextRelatedPost.id,
      )
        ? currentRelatedPosts.map((item) =>
            item.id === nextRelatedPost.id ? { ...item, ...nextRelatedPost } : item,
          )
        : [nextRelatedPost, ...currentRelatedPosts].slice(0, 5);

      return makeChat({
        ...chat,
        relatedPostId: nextRelatedPost.id,
        relatedPostTitle: nextRelatedPost.title,
        relatedPostType: nextRelatedPost.type,
        relatedPosts,
        lastContextAt: nowIso(),
      });
    });

    write(STORAGE_KEYS.chats, updatedChats);
    return updatedChats.find((chat) => chat.id === existing.id);
  }

  const newChat = makeChat({
    id: `chat-${Date.now()}`,
    participants: [currentUser.id, otherUser.id].filter(Boolean),
    participantKeys: uniqueLocalKeys(getLocalUserKeys(currentUser), getLocalUserKeys(otherUser)),
    participantProfiles: [publicUser(currentUser), publicUser(otherUser)],
    relatedPostId: nextRelatedPost?.id || "",
    relatedPostTitle: nextRelatedPost?.title || "",
    relatedPostType: nextRelatedPost?.type || "",
    relatedPosts: nextRelatedPost ? [nextRelatedPost] : [],
    lastMessage: nextRelatedPost
      ? `Conversation started about ${nextRelatedPost.title}`
      : "Conversation started",
    lastMessageTime: displayDate(),
    messages: [],
    createdAt: nowIso(),
  });
  chats.unshift(newChat);
  write(STORAGE_KEYS.chats, chats);
  return newChat;
};

export const addMessage = (chatId, message) => {
  const chats = getChats();
  let changedChat = null;
  const updated = chats.map((c) => {
    if (c.id === chatId) {
      const nextMessage = {
        ...message,
        id: message.id || `msg-${Date.now()}`,
        timestamp: message.timestamp || displayDate(),
        createdAt: message.createdAt || nowIso(),
        readBy: message.readBy || [message.senderId],
      };
      const messages = [...(Array.isArray(c.messages) ? c.messages : []), nextMessage];
      changedChat = {
        ...c,
        messages,
        lastMessage: nextMessage.text || (nextMessage.image ? "Image message" : "New message"),
        lastMessageTime: nextMessage.timestamp,
        lastMessageAt: nextMessage.createdAt,
      };
      return changedChat;
    }
    return c;
  });

  const ordered = changedChat
    ? [changedChat, ...updated.filter((chat) => chat.id !== chatId)]
    : updated;
  write(STORAGE_KEYS.chats, ordered);
  return changedChat;
};

export const markChatRead = (chatId, userId) => {
  const chats = getChats();
  const updated = chats.map((chat) => {
    if (chat.id !== chatId) return chat;
    return {
      ...chat,
      messages: (chat.messages || []).map((message) => ({
        ...message,
        readBy: Array.from(new Set([...(message.readBy || []), userId])),
      })),
    };
  });
  write(STORAGE_KEYS.chats, updated);
  return updated.find((chat) => chat.id === chatId);
};

export const updateChat = (chatId, updates = {}) => {
  const chats = getChats();
  let changedChat = null;
  const now = nowIso();
  const updated = chats.map((chat) => {
    if (chat.id !== chatId) return chat;
    changedChat = makeChat({
      ...chat,
      ...updates,
      updatedAt: now,
      updatedAtIso: now,
    });
    return changedChat;
  });
  write(STORAGE_KEYS.chats, updated);
  return changedChat;
};

export const updateChatMessage = (chatId, messageId, updater) => {
  const chats = getChats();
  let changedChat = null;
  const updated = chats.map((chat) => {
    if (chat.id !== chatId) return chat;
    const messages = (chat.messages || []).map((message) => {
      if (message.id !== messageId) return message;
      return typeof updater === "function" ? updater(message) : { ...message, ...updater };
    });
    changedChat = makeChat({
      ...chat,
      messages,
      updatedAt: nowIso(),
      updatedAtIso: nowIso(),
    });
    return changedChat;
  });
  write(STORAGE_KEYS.chats, updated);
  return changedChat;
};

// Notifications operations
export const getNotifications = () =>
  read(STORAGE_KEYS.notifications, SAMPLE_NOTIFICATIONS).map(normalizeNotification);

export const addNotification = (notificationData) => {
  const notifs = getNotifications();
  const createdAt = nowIso();
  const newNotif = makeNotification({
    id: `notif-${Date.now()}`,
    ...notificationData,
    read: false,
    createdAt,
    timestamp: displayDate(createdAt),
  });
  notifs.unshift(newNotif);
  write(STORAGE_KEYS.notifications, notifs);
  return newNotif;
};

export const markNotificationRead = (notifId) => {
  const notifs = getNotifications();
  const updated = notifs.map((n) => (n.id === notifId ? { ...n, read: true } : n));
  write(STORAGE_KEYS.notifications, updated);
  return updated.find((n) => n.id === notifId);
};

export const markManyNotificationsRead = (notifIds = []) => {
  const ids = new Set(notifIds);
  const notifs = getNotifications();
  const updated = notifs.map((n) => (ids.has(n.id) ? { ...n, read: true } : n));
  write(STORAGE_KEYS.notifications, updated);
  return updated;
};

export const deleteNotificationForTargets = (notifId, targetIds = []) => {
  if (!notifId) return null;
  const deleteTargets = [...new Set((targetIds || []).filter(Boolean).map((item) => String(item)))];
  const notifs = getNotifications();
  const updated = notifs.map((n) => {
    if (n.id !== notifId) return n;
    return {
      ...n,
      deletedBy: Array.from(new Set([...(n.deletedBy || []), ...deleteTargets])),
      deletedAt: nowIso(),
    };
  });
  write(STORAGE_KEYS.notifications, updated);
  return updated.find((n) => n.id === notifId) || null;
};

export const deleteManyNotificationsForTargets = (notifIds = [], targetIds = []) => {
  const ids = new Set((notifIds || []).filter(Boolean));
  const deleteTargets = [...new Set((targetIds || []).filter(Boolean).map((item) => String(item)))];
  const notifs = getNotifications();
  const updated = notifs.map((n) => {
    if (!ids.has(n.id)) return n;
    return {
      ...n,
      deletedBy: Array.from(new Set([...(n.deletedBy || []), ...deleteTargets])),
      deletedAt: nowIso(),
    };
  });
  write(STORAGE_KEYS.notifications, updated);
  return updated;
};

// Emergencies operations
export const getEmergencies = () => read(STORAGE_KEYS.emergencies, SAMPLE_EMERGENCIES).map(normalizeEmergency);

export const createEmergency = (emergencyData) => {
  const emergencies = getEmergencies();
  const createdAt = nowIso();
  const newEmerg = makeEmergency({
    id: `emerg-${Date.now()}`,
    ...emergencyData,
    createdAt,
    timestamp: displayDate(createdAt),
    status: emergencyData.status || EMERGENCY_STATUS.NEW,
  });
  emergencies.unshift(newEmerg);
  write(STORAGE_KEYS.emergencies, emergencies);
  return newEmerg;
};

export const updateEmergency = (emergencyId, updates) => {
  const emergencies = getEmergencies();
  const updated = emergencies.map((emerg) =>
    emerg.id === emergencyId ? normalizeEmergency({ ...emerg, ...updates }) : emerg,
  );
  write(STORAGE_KEYS.emergencies, updated);
  return updated.find((emerg) => emerg.id === emergencyId);
};

// Appointment operations
export const getAppointments = () =>
  read(STORAGE_KEYS.appointments, SAMPLE_APPOINTMENTS).map(normalizeAppointment);

export const createAppointment = (appointmentData) => {
  const appointments = getAppointments();
  const newAppointment = makeAppointment({
    id: `appt-${Date.now()}`,
    ...appointmentData,
    createdAt: nowIso(),
  });
  appointments.unshift(newAppointment);
  write(STORAGE_KEYS.appointments, appointments);
  return newAppointment;
};

export const updateAppointment = (appointmentId, updates) => {
  const appointments = getAppointments();
  const updated = appointments.map((item) =>
    item.id === appointmentId ? normalizeAppointment({ ...item, ...updates }) : item,
  );
  write(STORAGE_KEYS.appointments, updated);
  return updated.find((item) => item.id === appointmentId);
};

// Announcement operations
export const getAnnouncements = () =>
  read(STORAGE_KEYS.announcements, SAMPLE_ANNOUNCEMENTS).map(normalizeAnnouncement);

export const createAnnouncement = (announcementData) => {
  const announcements = getAnnouncements();
  const newAnnouncement = makeAnnouncement({
    id: `ann-${Date.now()}`,
    ...announcementData,
    createdAt: nowIso(),
  });
  announcements.unshift(newAnnouncement);
  write(STORAGE_KEYS.announcements, announcements);
  return newAnnouncement;
};

export const updateAnnouncement = (announcementId, updates) => {
  const announcements = getAnnouncements();
  const updated = announcements.map((item) =>
    item.id === announcementId ? normalizeAnnouncement({ ...item, ...updates }) : item,
  );
  write(STORAGE_KEYS.announcements, updated);
  return updated.find((item) => item.id === announcementId);
};

export const deleteAnnouncement = (announcementId) => {
  const announcements = getAnnouncements();
  const filtered = announcements.filter((item) => item.id !== announcementId);
  write(STORAGE_KEYS.announcements, filtered);
  return filtered;
};

// Report operations
export const ACTIVE_REPORT_REVIEW_STATUSES = [
  REPORT_STATUS.PENDING,
  REPORT_STATUS.UNDER_REVIEW,
  REPORT_STATUS.NEEDS_EVIDENCE,
];

const reportKeySet = (...values) => new Set(
  values.flat().filter(Boolean).map((item) => String(item).trim().toLowerCase()).filter(Boolean),
);

const reportSetsIntersect = (left, right) => {
  if (!left.size || !right.size) return false;
  return [...left].some((item) => right.has(item));
};

export const getReportReporterKeys = (report = {}) => reportKeySet(
  report.reportedById,
  report.reportedByUid,
  report.reporterId,
  report.reportedByEmail,
  report.reporterEmail,
  report.reportedBy,
);

export const getReportKindKey = (report = {}) => {
  const value = String(report.targetType || "general").trim().toLowerCase();
  if (["job_post", "lost_found_post", "post"].includes(value)) return "post";
  if (["chat_conversation", "chat"].includes(value)) return "chat";
  if (["user", "resident", "account"].includes(value)) return "account";
  return value || "general";
};

export const getReportTargetKeys = (report = {}) => {
  const kind = getReportKindKey(report);
  if (kind === "chat") return reportKeySet(report.targetId, report.relatedChat, report.chatId);
  if (kind === "account") return reportKeySet(report.targetId, report.targetUserId, report.reportedUserId);
  if (kind === "post") return reportKeySet(report.targetId, report.relatedPost, report.relatedPostId, report.postId, report.linkedPostId);
  return reportKeySet(report.targetId, report.relatedPost, report.relatedChat, report.targetUserId, report.reportedUserId);
};



export const findActiveDuplicateReport = (candidate = {}, reportList = getReports()) => {
  const candidateReporterKeys = getReportReporterKeys(candidate);
  const candidateTargetKeys = getReportTargetKeys(candidate);
  const candidateKind = getReportKindKey(candidate);

  if (!candidateReporterKeys.size || !candidateTargetKeys.size) return null;

  return (Array.isArray(reportList) ? reportList : [])
    .map(normalizeReport)
    .find((report) => {
      if (!ACTIVE_REPORT_REVIEW_STATUSES.includes(report.status)) return false;
      if (candidate.id && String(report.id) === String(candidate.id)) return false;
      if (getReportKindKey(report) !== candidateKind) return false;
      return reportSetsIntersect(candidateReporterKeys, getReportReporterKeys(report)) && reportSetsIntersect(candidateTargetKeys, getReportTargetKeys(report));
    }) || null;
};

export const appendReportEvidence = (reportId, evidenceData = {}) => {
  const reports = getReports();
  const existing = reports.find((item) => item.id === reportId);
  if (!existing) return null;

  const updatedAt = nowIso();
  const evidenceEntry = {
    id: `evidence-${Date.now()}`,
    category: evidenceData.category || existing.category || "Other",
    reason: evidenceData.reason || "Additional report evidence",
    details: evidenceData.details || "Additional details were merged into this existing report.",
    evidence: evidenceData.evidence || "",
    submittedBy: evidenceData.reportedBy || evidenceData.submittedBy || "Resident",
    submittedById: evidenceData.reportedById || evidenceData.submittedById || "",
    submittedAt: updatedAt,
  };

  const nextStatus = existing.status === REPORT_STATUS.NEEDS_EVIDENCE ? REPORT_STATUS.UNDER_REVIEW : existing.status;
  const payload = {
    ...existing,
    reason: existing.reason || evidenceEntry.reason,
    details: [existing.details, evidenceEntry.details].filter(Boolean).join("\n\nAdditional evidence: "),
    evidence: existing.evidence || evidenceEntry.evidence,
    category: existing.category || evidenceEntry.category,
    status: nextStatus,
    duplicateCount: Number(existing.duplicateCount || 0) + 1,
    additionalEvidence: [
      ...(Array.isArray(existing.additionalEvidence) ? existing.additionalEvidence : []),
      evidenceEntry,
    ],
    actionTaken: "Additional evidence merged",
    actionNote: "A duplicate report from the same resident and target was merged into this active report.",
    updatedAt,
    updatedAtIso: updatedAt,
    statusHistory: [
      ...(Array.isArray(existing.statusHistory) ? existing.statusHistory : []),
      {
        status: nextStatus,
        note: "Duplicate report prevented; additional evidence merged into the existing active case.",
        updatedBy: evidenceEntry.submittedBy,
        createdAt: updatedAt,
      },
    ],
  };

  const updated = reports.map((item) => item.id === reportId ? normalizeReport(payload) : item);
  write(STORAGE_KEYS.reports, updated);
  window.dispatchEvent(new Event("app-data-refresh"));
  return normalizeReport(payload);
};

export const getReports = () => read(STORAGE_KEYS.reports, SAMPLE_REPORTS).map(normalizeReport);

export const createReport = (reportData) => {
  const reports = getReports();
  const duplicate = findActiveDuplicateReport(reportData, reports);
  if (duplicate) {
    const merged = appendReportEvidence(duplicate.id, reportData);
    return normalizeReport({
      ...merged,
      duplicateOf: duplicate.id,
      isDuplicateUpdate: true,
    });
  }

  const createdAt = nowIso();
  const handlerBarangay = reportData.handlerBarangay || reportData.incidentBarangay || reportData.barangay || reportData.reporterBarangay || "";
  const newReport = makeReport({
    id: `report-${Date.now()}`,
    ...reportData,
    barangay: handlerBarangay,
    handlerBarangay,
    reporterBarangay: reportData.reporterBarangay || reportData.reportedByBarangay || reportData.barangay || "",
    incidentBarangay: reportData.incidentBarangay || handlerBarangay,
    status: reportData.status || REPORT_STATUS.PENDING,
    createdAt,
    statusHistory: [
      ...(Array.isArray(reportData.statusHistory) ? reportData.statusHistory : []),
      {
        status: reportData.status || REPORT_STATUS.PENDING,
        note: "Report submitted by resident.",
        updatedBy: reportData.reportedBy || "Resident",
        createdAt,
      },
    ],
  });
  reports.unshift(newReport);
  write(STORAGE_KEYS.reports, reports);
  return newReport;
};

export const upsertReport = (reportData = {}) => {
  const reports = getReports();
  const id = reportData.id || `report-${Date.now()}`;
  const normalized = normalizeReport({
    ...reportData,
    id,
    updatedAt: reportData.updatedAt || nowIso(),
    updatedAtIso: reportData.updatedAtIso || reportData.updatedAt || nowIso(),
  });

  const exists = reports.some((item) => item.id === id);
  const nextReports = exists
    ? reports.map((item) => (item.id === id ? normalizeReport({ ...item, ...normalized }) : item))
    : [normalized, ...reports];

  write(STORAGE_KEYS.reports, nextReports);
  window.dispatchEvent(new Event("app-data-refresh"));
  return normalized;
};

export const updateReport = (reportId, updates) => {
  const reports = getReports();
  const updatedAt = nowIso();
  const updated = reports.map((item) => {
    if (item.id !== reportId) return item;

    const nextStatus = updates.status || item.status;
    const statusChanged = Boolean(updates.status && updates.status !== item.status);
    const shouldAppendHistory = statusChanged || updates.actionTaken || updates.actionNote || updates.reviewedBy || updates.resolvedBy;
    const nextHistory = shouldAppendHistory
      ? [
          ...(Array.isArray(item.statusHistory) ? item.statusHistory : []),
          {
            status: nextStatus,
            note: updates.actionNote || updates.actionTaken || `Report marked as ${nextStatus}.`,
            updatedBy: updates.resolvedBy || updates.reviewedBy || "Barangay Admin",
            createdAt: updatedAt,
          },
        ]
      : item.statusHistory;

    return normalizeReport({
      ...item,
      ...updates,
      status: nextStatus,
      statusHistory: nextHistory,
      reviewedAt: updates.reviewedAt || (updates.reviewedBy ? updatedAt : item.reviewedAt),
      resolvedAt: updates.resolvedAt || ([REPORT_STATUS.RESOLVED, REPORT_STATUS.DISMISSED].includes(nextStatus) ? updatedAt : item.resolvedAt),
      updatedAt,
      updatedAtIso: updatedAt,
    });
  });
  write(STORAGE_KEYS.reports, updated);
  window.dispatchEvent(new Event("app-data-refresh"));
  return updated.find((item) => item.id === reportId);
};

// Barangays operations
export const getBarangays = () => read(STORAGE_KEYS.barangays, BARANGAYS);

export const setBarangays = (barangays = BARANGAYS) => {
  const cleanList = Array.isArray(barangays) && barangays.length ? barangays : BARANGAYS;
  return write(STORAGE_KEYS.barangays, cleanList);
};

// History & Audit Trail
export const getHistory = () => read(STORAGE_KEYS.history, []);

export const addHistory = (userId, action, details = {}) => {
  const history = getHistory();
  const newRecord = {
    id: `hist-${Date.now()}`,
    userId,
    action,
    details,
    timestamp: nowIso(),
  };
  history.push(newRecord);
  write(STORAGE_KEYS.history, history);
  return newRecord;
};

export const getUserHistory = (userId) => {
  const history = getHistory();
  return history.filter((h) => h.userId === userId);
};

// Theme Management
export const getTheme = () => localStorage.getItem("theme") || "system";

export const setTheme = (theme) => {
  localStorage.setItem("theme", theme);
  return theme;
};
