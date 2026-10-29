import { APPOINTMENT_STATUS } from "./storage";

export const APPOINTMENT_SERVICES = [
  {
    id: "barangay-clearance",
    name: "Barangay Clearance",
    category: "Document",
    description: "For employment, school, travel, and personal requirements.",
    requirements: ["Valid ID", "Proof of residency", "Purpose of request"],
    estimatedDuration: 30,
    availableDays: [1, 2, 3, 4, 5],
    recommendedNotice: "Prepare one valid ID and confirm your purpose before visiting.",
  },
  {
    id: "certificate-residency",
    name: "Certificate of Residency",
    category: "Document",
    description: "Proof that the resident lives in the selected barangay.",
    requirements: ["Valid ID", "Proof of address", "Purpose of request"],
    estimatedDuration: 30,
    availableDays: [1, 2, 3, 4, 5],
    recommendedNotice: "Use this for school, employment, or address verification needs.",
  },
  {
    id: "certificate-indigency",
    name: "Certificate of Indigency",
    category: "Assistance",
    description: "Used for assistance requests, school, medical, or other social services.",
    requirements: ["Valid ID", "Interview or verification if needed", "Purpose of request"],
    estimatedDuration: 45,
    availableDays: [1, 2, 3, 4, 5],
    recommendedNotice: "Admin may ask for extra verification depending on the purpose.",
  },
  {
    id: "cedula",
    name: "Cedula",
    category: "Document",
    description: "Community tax certificate processing or follow-up.",
    requirements: ["Valid ID", "Payment fee", "Personal information"],
    estimatedDuration: 20,
    availableDays: [1, 2, 3, 4, 5],
    recommendedNotice: "Fastest service when information and payment are ready.",
  },
  {
    id: "barangay-id",
    name: "Barangay ID",
    category: "Identification",
    description: "Barangay identification application, renewal, or follow-up.",
    requirements: ["Valid ID", "1x1 or 2x2 photo if required", "Proof of residency"],
    estimatedDuration: 45,
    availableDays: [1, 2, 3, 4, 5],
    recommendedNotice: "Bring a photo if your barangay still requires printed pictures.",
  },
  {
    id: "business-clearance",
    name: "Business Clearance",
    category: "Business",
    description: "Assistance or processing for barangay business clearance.",
    requirements: ["Valid ID", "Business name", "Business address", "Supporting permit if available"],
    estimatedDuration: 60,
    availableDays: [1, 2, 3, 4, 5],
    recommendedNotice: "Choose this when the concern is related to a store, stall, or home business.",
  },
  {
    id: "complaint-mediation",
    name: "Complaint / Mediation Schedule",
    category: "Mediation",
    description: "Schedule a barangay mediation, blotter follow-up, or complaint discussion.",
    requirements: ["Valid ID", "Incident details", "Available contact number"],
    estimatedDuration: 60,
    availableDays: [1, 2, 3, 4, 5],
    recommendedNotice: "Keep the incident summary short, factual, and complete.",
  },
  {
    id: "other-service",
    name: "Other Barangay Service",
    category: "General",
    description: "For concerns that do not match the listed services.",
    requirements: ["Valid ID", "Supporting documents if needed", "Clear purpose or concern"],
    estimatedDuration: 30,
    availableDays: [1, 2, 3, 4, 5],
    recommendedNotice: "Use this only when the requested service is not listed.",
  },
];

export const DEFAULT_BARANGAY_SCHEDULE = {
  officeDays: [1, 2, 3, 4, 5],
  officeStart: "08:00",
  officeEnd: "17:00",
  lunchStart: "12:00",
  lunchEnd: "13:00",
  slotIntervalMinutes: 30,
  maxAppointmentsPerSlot: 5,
  blockedDates: [],
};

export const APPOINTMENT_STATUS_META = {
  [APPOINTMENT_STATUS.PENDING]: {
    label: "Pending Review",
    variant: "warning",
    helper: "Waiting for barangay admin approval.",
  },
  [APPOINTMENT_STATUS.APPROVED]: {
    label: "Approved",
    variant: "success",
    helper: "Schedule confirmed. Arrive 10 minutes early.",
  },
  [APPOINTMENT_STATUS.RESCHEDULE_REQUESTED]: {
    label: "Reschedule Requested",
    variant: "secondary",
    helper: "Barangay suggested a new schedule. Resident must accept or cancel.",
  },
  [APPOINTMENT_STATUS.MISSING_REQUIREMENTS]: {
    label: "Missing Requirements",
    variant: "warning",
    helper: "Resident must prepare or update missing requirements.",
  },
  [APPOINTMENT_STATUS.READY_FOR_PICKUP]: {
    label: "Ready for Pickup",
    variant: "success",
    helper: "Document or service output is ready at the barangay office.",
  },
  [APPOINTMENT_STATUS.CHECKED_IN]: {
    label: "Checked-in",
    variant: "job",
    helper: "Resident has arrived and is being assisted.",
  },
  [APPOINTMENT_STATUS.COMPLETED]: {
    label: "Completed",
    variant: "job",
    helper: "Appointment has been completed.",
  },
  [APPOINTMENT_STATUS.REJECTED]: {
    label: "Rejected",
    variant: "danger",
    helper: "Request was declined by the barangay office.",
  },
  [APPOINTMENT_STATUS.CANCELLED]: {
    label: "Cancelled",
    variant: "secondary",
    helper: "Appointment was cancelled.",
  },
  [APPOINTMENT_STATUS.NO_SHOW]: {
    label: "No-show",
    variant: "danger",
    helper: "Resident did not arrive for the approved schedule.",
  },
};

export const TERMINAL_APPOINTMENT_STATUSES = [
  APPOINTMENT_STATUS.COMPLETED,
  APPOINTMENT_STATUS.REJECTED,
  APPOINTMENT_STATUS.CANCELLED,
  APPOINTMENT_STATUS.NO_SHOW,
];

export const ACTIVE_APPOINTMENT_STATUSES = [
  APPOINTMENT_STATUS.PENDING,
  APPOINTMENT_STATUS.APPROVED,
  APPOINTMENT_STATUS.RESCHEDULED,
  APPOINTMENT_STATUS.RESCHEDULE_REQUESTED,
  APPOINTMENT_STATUS.MISSING_REQUIREMENTS,
  APPOINTMENT_STATUS.READY_FOR_PICKUP,
  APPOINTMENT_STATUS.CHECKED_IN,
];

const pad = (number) => String(number).padStart(2, "0");

export const getTodayIsoDate = () => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date());
  const get = (type) => parts.find((part) => part.type === type).value;
  return `${get("year")}-${get("month")}-${get("day")}`;
};

export const getServiceById = (serviceIdOrName) => {
  const value = String(serviceIdOrName || "").trim().toLowerCase();
  return (
    APPOINTMENT_SERVICES.find(
      (service) => service.id === value || service.name.toLowerCase() === value,
    ) || APPOINTMENT_SERVICES[0]
  );
};

export const getStatusMeta = (status) =>
  APPOINTMENT_STATUS_META[status] || {
    label: status || "Unknown",
    variant: "secondary",
    helper: "Status information is being updated.",
  };

export const timeToMinutes = (time = "00:00") => {
  const [hours = "0", minutes = "0"] = String(time).split(":");
  return Number(hours) * 60 + Number(minutes);
};

export const minutesToTime = (minutes = 0) => {
  const safe = Math.max(0, Number(minutes) || 0);
  return `${pad(Math.floor(safe / 60))}:${pad(safe % 60)}`;
};

export const formatTimeLabel = (time = "") => {
  if (!time) return "No time";
  const [rawHour, rawMinute] = time.split(":");
  const hour = Number(rawHour);
  const minute = Number(rawMinute || 0);
  if (!Number.isFinite(hour)) return time;
  const suffix = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${pad(minute)} ${suffix}`;
};

export const formatDateLabel = (dateString = "") => {
  if (!dateString) return "No date";
  const date = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
    weekday: "short",
  });
};

export const getDateDayIndex = (dateString = "") => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return -1;
  const date = new Date(`${dateString}T00:00:00Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== dateString
    ? -1 : date.getUTCDay();
};

export const isPastDate = (dateString = "") => {
  if (!dateString) return false;
  return dateString < getTodayIsoDate();
};

export const isLunchTime = (time, schedule = DEFAULT_BARANGAY_SCHEDULE) => {
  const current = timeToMinutes(time);
  return current >= timeToMinutes(schedule.lunchStart) && current < timeToMinutes(schedule.lunchEnd);
};

export const isOfficeDate = (dateString, serviceId, schedule = DEFAULT_BARANGAY_SCHEDULE) => {
  if (!dateString) return false;
  if (isPastDate(dateString)) return false;
  if ((schedule.blockedDates || []).includes(dateString)) return false;

  const day = getDateDayIndex(dateString);
  const service = getServiceById(serviceId);
  return (schedule.officeDays || []).includes(day) && service.availableDays.includes(day);
};

export const getAppointmentSlotKey = (appointment = {}) =>
  [appointment.barangay || "", appointment.preferredDate || appointment.scheduledDate || "", appointment.preferredTime || appointment.scheduledTime || ""]
    .map((item) => String(item).trim())
    .join("|");

export const isActiveAppointment = (appointment = {}) =>
  ACTIVE_APPOINTMENT_STATUSES.includes(appointment.status || APPOINTMENT_STATUS.PENDING);

export const buildAppointmentReference = (dateString = getTodayIsoDate(), count = 0) => {
  const compactDate = String(dateString || getTodayIsoDate()).replace(/[^0-9]/g, "");
  const unique = `${Date.now()}${count}`.slice(-4);
  return `BL-APT-${compactDate}-${unique}`;
};

export const buildCheckInCode = (reference = "") => {
  const source = String(reference || `BL-APT-${Date.now()}`);
  const digits = source.replace(/[^0-9]/g, "");
  return `CHK-${digits.slice(-6).padStart(6, "0")}`;
};

export const getSlotUsage = (appointments = [], criteria = {}, schedule = DEFAULT_BARANGAY_SCHEDULE) => {
  const targetKey = getAppointmentSlotKey(criteria);
  const used = appointments.filter((appointment) => {
    if (!isActiveAppointment(appointment)) return false;
    if (criteria.excludeId && appointment.id === criteria.excludeId) return false;
    return getAppointmentSlotKey(appointment) === targetKey;
  }).length;

  const capacity = Number(schedule.maxAppointmentsPerSlot) || DEFAULT_BARANGAY_SCHEDULE.maxAppointmentsPerSlot;
  return {
    used,
    capacity,
    left: Math.max(capacity - used, 0),
    isFull: used >= capacity,
  };
};

export const generateAppointmentSlots = ({
  date,
  serviceId,
  barangay = "",
  appointments = [],
  schedule = DEFAULT_BARANGAY_SCHEDULE,
  excludeId = "",
} = {}) => {
  if (!date) return [];

  const service = getServiceById(serviceId);
  const slots = [];
  const start = timeToMinutes(schedule.officeStart);
  const end = timeToMinutes(schedule.officeEnd);
  const configuredInterval = Number(schedule.slotIntervalMinutes);
  const interval = Number.isFinite(configuredInterval) && configuredInterval > 0
    ? configuredInterval : DEFAULT_BARANGAY_SCHEDULE.slotIntervalMinutes;
  const officeDate = isOfficeDate(date, service.id, schedule);

  for (let minute = start; minute < end; minute += interval) {
    const time = minutesToTime(minute);
    const usage = getSlotUsage(
      appointments,
      { barangay, preferredDate: date, preferredTime: time, excludeId },
      schedule,
    );
    const finish = minute + service.estimatedDuration;
    const lunch = minute < timeToMinutes(schedule.lunchEnd) && finish > timeToMinutes(schedule.lunchStart);
    const overClosing = finish > end;
    const elapsed = new Date(`${date}T${time}:00+08:00`).getTime() <= Date.now();
    const disabled = !officeDate || lunch || overClosing || elapsed || usage.isFull;
    const reason = !officeDate
      ? "Closed"
      : lunch
        ? "Lunch break"
        : overClosing
          ? "Insufficient time before closing"
          : elapsed
            ? "Time has passed"
            : usage.isFull
              ? "Full"
              : `${usage.left} slot${usage.left === 1 ? "" : "s"} left`;

    slots.push({
      id: `${date}-${time}`,
      time,
      label: formatTimeLabel(time),
      used: usage.used,
      capacity: usage.capacity,
      left: usage.left,
      disabled,
      reason,
      isRecommended: !disabled && slots.filter((slot) => !slot.disabled).length < 3,
      estimatedDuration: service.estimatedDuration,
    });
  }

  return slots;
};

export const findDuplicateActiveAppointment = (appointments = [], appointmentData = {}) => {
  const service = getServiceById(appointmentData.serviceId || appointmentData.serviceType);
  const ownerIds = [appointmentData.userId, appointmentData.uid, appointmentData.email]
    .filter(Boolean)
    .map((item) => String(item));

  return appointments.find((appointment) => {
    if (!isActiveAppointment(appointment)) return false;
    if (appointmentData.excludeId && appointment.id === appointmentData.excludeId) return false;

    const sameOwner = ownerIds.some((id) => [appointment.userId, appointment.uid, appointment.email].filter(Boolean).map(String).includes(id));
    const sameService = getServiceById(appointment.serviceId || appointment.serviceType).id === service.id;
    return sameOwner && sameService;
  });
};

export const validateAppointmentRequest = ({
  appointmentData = {},
  appointments = [],
  schedule = DEFAULT_BARANGAY_SCHEDULE,
  excludeId = "",
} = {}) => {
  const service = getServiceById(appointmentData.serviceId || appointmentData.serviceType);
  const preferredDate = appointmentData.preferredDate || appointmentData.scheduledDate;
  const preferredTime = appointmentData.preferredTime || appointmentData.scheduledTime;

  if (!preferredDate) return { valid: false, message: "Please select an appointment date." };
  if (!preferredTime) return { valid: false, message: "Please select an available time slot." };
  if (isPastDate(preferredDate)) return { valid: false, message: "Past dates cannot be booked." };
  if (!isOfficeDate(preferredDate, service.id, schedule)) {
    return { valid: false, message: "This service is not available on the selected date." };
  }

  const slots = generateAppointmentSlots({
    date: preferredDate,
    serviceId: service.id,
    barangay: appointmentData.barangay,
    appointments,
    schedule,
    excludeId,
  });
  const slot = slots.find((item) => item.time === preferredTime);
  if (!slot) return { valid: false, message: "Selected time is outside barangay office hours." };
  if (slot.disabled) return { valid: false, message: `Selected time is unavailable: ${slot.reason}.` };

  return { valid: true, slot, service };
};

export const getAppointmentProgressSteps = (status) => {
  const base = [
    APPOINTMENT_STATUS.PENDING,
    APPOINTMENT_STATUS.APPROVED,
    APPOINTMENT_STATUS.CHECKED_IN,
    APPOINTMENT_STATUS.COMPLETED,
  ];
  const current = status || APPOINTMENT_STATUS.PENDING;

  if ([APPOINTMENT_STATUS.REJECTED, APPOINTMENT_STATUS.CANCELLED, APPOINTMENT_STATUS.NO_SHOW].includes(current)) {
    return [APPOINTMENT_STATUS.PENDING, current];
  }

  if (current === APPOINTMENT_STATUS.RESCHEDULE_REQUESTED) {
    return [APPOINTMENT_STATUS.PENDING, APPOINTMENT_STATUS.RESCHEDULE_REQUESTED, APPOINTMENT_STATUS.APPROVED, APPOINTMENT_STATUS.CHECKED_IN, APPOINTMENT_STATUS.COMPLETED];
  }

  if (current === APPOINTMENT_STATUS.MISSING_REQUIREMENTS) {
    return [APPOINTMENT_STATUS.PENDING, APPOINTMENT_STATUS.MISSING_REQUIREMENTS, APPOINTMENT_STATUS.APPROVED, APPOINTMENT_STATUS.CHECKED_IN, APPOINTMENT_STATUS.COMPLETED];
  }

  return base;
};

export const getAdminAllowedAppointmentActions = (status) => {
  switch (status) {
    case APPOINTMENT_STATUS.PENDING:
      return ["approve", "reschedule", "missing", "reject"];
    case APPOINTMENT_STATUS.MISSING_REQUIREMENTS:
      return ["approve", "reschedule", "reject"];
    case APPOINTMENT_STATUS.RESCHEDULE_REQUESTED:
      return ["approve", "reschedule", "cancel"];
    case APPOINTMENT_STATUS.APPROVED:
      return ["checkin", "reschedule", "ready", "noshow", "cancel"];
    case APPOINTMENT_STATUS.READY_FOR_PICKUP:
      return ["checkin", "reschedule", "noshow", "cancel"];
    case APPOINTMENT_STATUS.CHECKED_IN:
      return ["complete", "cancel"];
    default:
      return [];
  }
};

export const getResidentAllowedAppointmentActions = (status) => {
  switch (status) {
    case APPOINTMENT_STATUS.RESCHEDULE_REQUESTED:
      return ["acceptReschedule", "cancel"];
    case APPOINTMENT_STATUS.PENDING:
    case APPOINTMENT_STATUS.APPROVED:
      return ["cancel"];
    default:
      return [];
  }
};

export const summarizeAppointmentWorkload = (appointments = [], date = getTodayIsoDate()) => {
  const todayItems = appointments.filter((item) => (item.preferredDate || item.scheduledDate) === date);
  return {
    today: todayItems.length,
    pending: appointments.filter((item) => item.status === APPOINTMENT_STATUS.PENDING).length,
    approved: appointments.filter((item) => [APPOINTMENT_STATUS.APPROVED, APPOINTMENT_STATUS.RESCHEDULE_REQUESTED, APPOINTMENT_STATUS.CHECKED_IN].includes(item.status)).length,
    completed: appointments.filter((item) => item.status === APPOINTMENT_STATUS.COMPLETED).length,
    noShow: appointments.filter((item) => item.status === APPOINTMENT_STATUS.NO_SHOW).length,
  };
};
