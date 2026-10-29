import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  AlertCircle,
  CalendarDays,
  Check,
  CheckCircle,
  ClipboardCheck,
  Clock,
  FileText,
  ListChecks,
  PackageCheck,
  QrCode,
  RefreshCw,
  Search,
  ShieldCheck,
  UserCheck,
  UserX,
  XCircle,
} from "lucide-react";
import Avatar from "../../components/Avatar";
import Card, { CardContent } from "../../components/Card";
import Badge from "../../components/Badge";
import Button from "../../components/Button";
import Input from "../../components/Input";
import Modal from "../../components/Modal";
import AdminLayout from "../../components/AdminLayout";
import { useApp } from "../../context/AppContext";
import { useAuth } from "../../context/AuthContext";
import { APPOINTMENT_STATUS } from "../../utils/storage";
import {
  APPOINTMENT_SERVICES,
  DEFAULT_BARANGAY_SCHEDULE,
  formatDateLabel,
  formatTimeLabel,
  generateAppointmentSlots,
  getAdminAllowedAppointmentActions,
  getAppointmentProgressSteps,
  getServiceById,
  getStatusMeta,
  getTodayIsoDate,
  summarizeAppointmentWorkload,
} from "../../utils/appointmentLogic";
import "../../styles/pages/Skeleton.css";

const ACTION_CONFIG = {
  approve: {
    title: "Approve Appointment",
    status: APPOINTMENT_STATUS.APPROVED,
    defaultNote: "Approved. Please arrive 10 minutes before your schedule and bring all required documents.",
    button: "Approve Request",
    variant: "success",
    icon: Check,
  },
  reschedule: {
    title: "Suggest New Schedule",
    status: APPOINTMENT_STATUS.RESCHEDULE_REQUESTED,
    defaultNote: "The barangay office suggested a new schedule. Please confirm this schedule in your appointment page.",
    button: "Send Reschedule Request",
    variant: "primary",
    icon: RefreshCw,
  },
  missing: {
    title: "Request Missing Requirements",
    status: APPOINTMENT_STATUS.MISSING_REQUIREMENTS,
    defaultNote: "Some requirements are missing. Please prepare the required documents before visiting the barangay office.",
    button: "Mark Missing Requirements",
    variant: "warning",
    icon: AlertCircle,
  },
  ready: {
    title: "Mark Ready for Pickup",
    status: APPOINTMENT_STATUS.READY_FOR_PICKUP,
    defaultNote: "Your requested document/service is ready for pickup. Please visit the barangay office and bring a valid ID.",
    button: "Mark Ready",
    variant: "success",
    icon: PackageCheck,
  },
  checkin: {
    title: "Check-in Resident",
    status: APPOINTMENT_STATUS.CHECKED_IN,
    defaultNote: "Resident has checked in and is now being assisted by the barangay office.",
    button: "Mark Checked-in",
    variant: "primary",
    icon: UserCheck,
  },
  complete: {
    title: "Complete Appointment",
    status: APPOINTMENT_STATUS.COMPLETED,
    defaultNote: "Appointment has been completed by the barangay office.",
    button: "Mark Completed",
    variant: "success",
    icon: CheckCircle,
  },
  reject: {
    title: "Reject Appointment",
    status: APPOINTMENT_STATUS.REJECTED,
    defaultNote: "Rejected. Please review the requirements and submit a complete request again.",
    button: "Reject Request",
    variant: "danger",
    icon: XCircle,
  },
  cancel: {
    title: "Cancel Appointment",
    status: APPOINTMENT_STATUS.CANCELLED,
    defaultNote: "Cancelled by the barangay office. Please submit a new appointment request if you still need this service.",
    button: "Cancel Appointment",
    variant: "danger",
    icon: XCircle,
  },
  noshow: {
    title: "Mark No-show",
    status: APPOINTMENT_STATUS.NO_SHOW,
    defaultNote: "Resident did not arrive during the approved schedule.",
    button: "Mark No-show",
    variant: "danger",
    icon: UserX,
  },
};

const TABS = [
  { id: "today", label: "Today" },
  { id: "pending", label: "Pending" },
  { id: "approved", label: "Approved / Active" },
  { id: "reschedule", label: "Reschedule" },
  { id: "completed", label: "Completed" },
  { id: "closed", label: "Cancelled / No-show" },
  { id: "all", label: "All" },
];

const getInitials = (name = "") =>
  String(name)
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "BL";

const formatDateTime = (dateString) => {
  if (!dateString) return "Not yet updated";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

function StatusBadge({ status }) {
  const meta = getStatusMeta(status);
  return <Badge variant={meta.variant}>{meta.label}</Badge>;
}

function ProgressTimeline({ status }) {
  const steps = getAppointmentProgressSteps(status);
  const currentIndex = Math.max(steps.indexOf(status), 0);

  return (
    <div className="appointment-progress compact" aria-label="Appointment progress">
      {steps.map((step, index) => {
        const meta = getStatusMeta(step);
        const done = index <= currentIndex;
        return (
          <div key={step} className={`appointment-progress-step ${done ? "is-done" : ""}`}>
            <span className="appointment-progress-dot">{done ? <CheckCircle size={13} /> : index + 1}</span>
            <div>
              <strong>{meta.label}</strong>
              <small>{meta.helper}</small>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AppointmentListCard({ appointment, selected, onSelect }) {
  const service = getServiceById(appointment.serviceId || appointment.serviceType);
  const meta = getStatusMeta(appointment.status);

  return (
    <button
      type="button"
      className={`admin-appointment-card ${selected ? "selected" : ""}`}
      onClick={() => onSelect(appointment.id)}
    >
      <div className="resident-mini-profile">
        <Avatar initials={getInitials(appointment.userName)} src={appointment.userPhotoURL || appointment.photoURL || ""} size="md" />
        <div>
          <strong>{appointment.userName || "Resident"}</strong>
          <small>{appointment.referenceNumber || appointment.trackingNumber}</small>
        </div>
      </div>
      <div className="toolbar-row" style={{ margin: "0.75rem 0 0.35rem" }}>
        <div>
          <strong>{appointment.serviceType}</strong>
          <small style={{ display: "block" }}>{service.category}</small>
        </div>
        <StatusBadge status={appointment.status} />
      </div>
      <div className="meta-row">
        <span><CalendarDays size={13} /> {formatDateLabel(appointment.preferredDate)}</span>
        <span><Clock size={13} /> {formatTimeLabel(appointment.preferredTime)}</span>
      </div>
      <p className="appointment-card-note">{meta.helper}</p>
    </button>
  );
}

function AppointmentManagementPage() {
  const { appointments, updateAppointment } = useApp();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const today = getTodayIsoDate();
  const [activeTab, setActiveTab] = useState("today");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAppointmentId, setSelectedAppointmentId] = useState("");
  const [actionState, setActionState] = useState(null);
  const [decisionForm, setDecisionForm] = useState({
    adminNotes: "",
    preferredDate: today,
    preferredTime: "",
  });
  const [notice, setNotice] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [actionSubmitting, setActionSubmitting] = useState(false);

  const scopedAppointments = useMemo(() => {
    return appointments
      .filter((appointment) => appointment.barangay === user?.barangay)
      .sort((a, b) => new Date(`${a.preferredDate || "9999-12-31"}T${a.preferredTime || "23:59"}`) - new Date(`${b.preferredDate || "9999-12-31"}T${b.preferredTime || "23:59"}`));
  }, [appointments, user?.barangay]);

  const workload = summarizeAppointmentWorkload(scopedAppointments, today);
  const todaysSlots = generateAppointmentSlots({
    date: today,
    serviceId: APPOINTMENT_SERVICES[0].id,
    barangay: user?.barangay || "",
    appointments: scopedAppointments,
    schedule: DEFAULT_BARANGAY_SCHEDULE,
  });
  const availableToday = todaysSlots.filter((slot) => !slot.disabled).reduce((sum, slot) => sum + slot.left, 0);

  useEffect(() => {
    if (!notice && !errorMessage) return undefined;
    const timer = window.setTimeout(() => {
      setNotice("");
      setErrorMessage("");
    }, 4500);
    return () => window.clearTimeout(timer);
  }, [notice, errorMessage]);

  const filteredAppointments = useMemo(() => {
    const queryText = searchTerm.trim().toLowerCase();

    return scopedAppointments.filter((appointment) => {
      const status = appointment.status;
      const tabMatch =
        activeTab === "all" ||
        (activeTab === "today" && appointment.preferredDate === today) ||
        (activeTab === "pending" && status === APPOINTMENT_STATUS.PENDING) ||
        (activeTab === "approved" && [APPOINTMENT_STATUS.APPROVED, APPOINTMENT_STATUS.READY_FOR_PICKUP, APPOINTMENT_STATUS.CHECKED_IN].includes(status)) ||
        (activeTab === "reschedule" && [APPOINTMENT_STATUS.RESCHEDULE_REQUESTED, APPOINTMENT_STATUS.MISSING_REQUIREMENTS].includes(status)) ||
        (activeTab === "completed" && status === APPOINTMENT_STATUS.COMPLETED) ||
        (activeTab === "closed" && [APPOINTMENT_STATUS.CANCELLED, APPOINTMENT_STATUS.NO_SHOW, APPOINTMENT_STATUS.REJECTED].includes(status));

      const searchMatch =
        !queryText ||
        appointment.userName?.toLowerCase().includes(queryText) ||
        appointment.serviceType?.toLowerCase().includes(queryText) ||
        appointment.purpose?.toLowerCase().includes(queryText) ||
        appointment.trackingNumber?.toLowerCase().includes(queryText) ||
        appointment.referenceNumber?.toLowerCase().includes(queryText);

      return tabMatch && searchMatch;
    });
  }, [activeTab, scopedAppointments, searchTerm, today]);

  const selectedAppointment =
    scopedAppointments.find((item) => item.id === selectedAppointmentId) ||
    filteredAppointments[0] ||
    scopedAppointments[0] ||
    null;

  useEffect(() => {
    const requestedAppointmentId = searchParams.get("appointment");
    if (requestedAppointmentId && scopedAppointments.some((item) => String(item.id) === String(requestedAppointmentId))) {
      setSelectedAppointmentId(requestedAppointmentId);
    }
  }, [scopedAppointments, searchParams]);

  const decisionSlots = useMemo(() => {
    const appointment = actionState?.appointment;
    return generateAppointmentSlots({
      date: decisionForm.preferredDate,
      serviceId: appointment?.serviceId || appointment?.serviceType || APPOINTMENT_SERVICES[0].id,
      barangay: user?.barangay || "",
      appointments: scopedAppointments,
      schedule: DEFAULT_BARANGAY_SCHEDULE,
      excludeId: appointment?.id || "",
    });
  }, [actionState?.appointment, decisionForm.preferredDate, scopedAppointments, user?.barangay]);

  const openAction = (appointment, action) => {
    const liveAppointment = scopedAppointments.find((item) => item.id === appointment.id) || appointment;
    const config = ACTION_CONFIG[action];
    const allowed = getAdminAllowedAppointmentActions(liveAppointment.status);
    setNotice("");
    setErrorMessage("");
    setActionSubmitting(false);

    if (!config || !allowed.includes(action)) {
      setErrorMessage(`Action blocked. This appointment is already ${getStatusMeta(liveAppointment.status).label}.`);
      setSelectedAppointmentId(liveAppointment.id);
      return;
    }

    if (config.status === liveAppointment.status && action !== "reschedule") {
      setNotice(`Already marked: ${liveAppointment.serviceType} is already ${getStatusMeta(liveAppointment.status).label}.`);
      setSelectedAppointmentId(liveAppointment.id);
      return;
    }

    setActionState({ appointment: liveAppointment, action });
    setDecisionForm({
      adminNotes: config.defaultNote,
      preferredDate: liveAppointment.preferredDate || today,
      preferredTime: liveAppointment.preferredTime || "",
    });
  };

  const closeAction = () => {
    setActionState(null);
    setActionSubmitting(false);
    setDecisionForm({ adminNotes: "", preferredDate: today, preferredTime: "" });
  };

  const handleDecisionSubmit = async (e) => {
    e.preventDefault();
    if (!actionState || actionSubmitting) return;

    const { appointment, action } = actionState;
    const config = ACTION_CONFIG[action];
    const liveAppointment = scopedAppointments.find((item) => item.id === appointment.id) || appointment;
    const allowed = getAdminAllowedAppointmentActions(liveAppointment.status);

    if (!config || !allowed.includes(action)) {
      setErrorMessage(`Action blocked. ${liveAppointment.serviceType} is already ${getStatusMeta(liveAppointment.status).label}.`);
      setSelectedAppointmentId(liveAppointment.id);
      setActionState(null);
      return;
    }

    if (config.status === liveAppointment.status && action !== "reschedule") {
      setNotice(`No duplicate action made. ${liveAppointment.serviceType} is already ${getStatusMeta(liveAppointment.status).label}.`);
      setSelectedAppointmentId(liveAppointment.id);
      setActionState(null);
      return;
    }

    const payload = {
      status: config.status,
      adminNotes: decisionForm.adminNotes.trim() || config.defaultNote,
      action,
    };

    if (action === "reschedule") {
      if (!decisionForm.preferredDate || !decisionForm.preferredTime) {
        setErrorMessage("Select an available date and time before sending a reschedule request.");
        return;
      }
      payload.preferredDate = decisionForm.preferredDate;
      payload.preferredTime = decisionForm.preferredTime;
      payload.rescheduledDate = decisionForm.preferredDate;
      payload.rescheduledTime = decisionForm.preferredTime;
    }

    try {
      setActionSubmitting(true);
      const updated = await updateAppointment(liveAppointment.id, payload, user);
      setSelectedAppointmentId(updated?.id || liveAppointment.id);
      setNotice(`${config.button} successful. Resident notification was sent once.`);
      closeAction();
    } catch (error) {
      setErrorMessage(error.message || "Unable to update appointment. Please choose another slot.");
      setActionSubmitting(false);
    }
  };

  const renderActions = (appointment) => {
    if (!appointment) return null;
    const allowed = getAdminAllowedAppointmentActions(appointment.status);
    if (!allowed.length) {
      return <div className="smart-alert"><InfoMessage status={appointment.status} /></div>;
    }

    return (
      <div className="inline-actions action-grid-tight">
        {allowed.includes("approve") ? (
          <Button size="sm" variant="success" onClick={() => openAction(appointment, "approve")}>
            <Check size={15} /> Approve
          </Button>
        ) : null}
        {allowed.includes("checkin") ? (
          <Button size="sm" variant="primary" onClick={() => openAction(appointment, "checkin")}>
            <UserCheck size={15} /> Check-in
          </Button>
        ) : null}
        {allowed.includes("complete") ? (
          <Button size="sm" variant="success" onClick={() => openAction(appointment, "complete")}>
            <CheckCircle size={15} /> Complete
          </Button>
        ) : null}
        {allowed.includes("reschedule") ? (
          <Button size="sm" variant="outline" onClick={() => openAction(appointment, "reschedule")}>
            <RefreshCw size={15} /> Reschedule
          </Button>
        ) : null}
        {allowed.includes("missing") ? (
          <Button size="sm" variant="warning" onClick={() => openAction(appointment, "missing")}>
            <AlertCircle size={15} /> Missing Req.
          </Button>
        ) : null}
        {allowed.includes("ready") ? (
          <Button size="sm" variant="success" onClick={() => openAction(appointment, "ready")}>
            <PackageCheck size={15} /> Ready
          </Button>
        ) : null}
        {allowed.includes("noshow") ? (
          <Button size="sm" variant="danger" onClick={() => openAction(appointment, "noshow")}>
            <UserX size={15} /> No-show
          </Button>
        ) : null}
        {allowed.includes("reject") ? (
          <Button size="sm" variant="danger" onClick={() => openAction(appointment, "reject")}>
            <XCircle size={15} /> Reject
          </Button>
        ) : null}
        {allowed.includes("cancel") ? (
          <Button size="sm" variant="ghost" onClick={() => openAction(appointment, "cancel")}>
            <XCircle size={15} /> Cancel
          </Button>
        ) : null}
      </div>
    );
  };

  const actionConfig = actionState ? ACTION_CONFIG[actionState.action] : null;
  const ActionIcon = actionConfig?.icon || FileText;

  return (
    <AdminLayout
      title="Appointment Management"
      subtitle="Smart queue, slot control, resident check-in, no-show tracking, and appointment history for your barangay."
    >
      <div className="appointment-management-page">
      <div className="appointment-command-hero">
        <div>
          <Badge variant="job">Smart Barangay Appointment Desk</Badge>
          <h2>Today’s appointment queue is ready for action.</h2>
          <p>Review requests, prevent overbooking, guide residents, and keep every decision visible through status timelines and notifications.</p>
        </div>
        <div className="policy-card-mini">
          <Clock size={18} />
          <span>{DEFAULT_BARANGAY_SCHEDULE.officeStart}–{DEFAULT_BARANGAY_SCHEDULE.officeEnd}</span>
          <small>Mon–Fri • Lunch blocked • {DEFAULT_BARANGAY_SCHEDULE.maxAppointmentsPerSlot} per slot</small>
        </div>
      </div>

      <div className="metric-grid">
        <Card className="metric-card" elevated>
          <p className="metric-label">Today’s Appointments</p>
          <p className="metric-value">{workload.today}</p>
        </Card>
        <Card className="metric-card" elevated>
          <p className="metric-label">Pending Requests</p>
          <p className="metric-value">{workload.pending}</p>
        </Card>
        <Card className="metric-card" elevated>
          <p className="metric-label">Available Slots Today</p>
          <p className="metric-value">{availableToday}</p>
        </Card>
        <Card className="metric-card" elevated>
          <p className="metric-label">No-shows</p>
          <p className="metric-value">{workload.noShow}</p>
        </Card>
      </div>

      {(notice || errorMessage) ? (
        <div className="appointment-toast-stack" aria-live="polite">
          {notice ? (
            <div className="appointment-toast success">
              <CheckCircle size={19} />
              <div>
                <strong>Action completed</strong>
                <small>{notice}</small>
              </div>
            </div>
          ) : null}
          {errorMessage ? (
            <div className="appointment-toast danger">
              <AlertCircle size={19} />
              <div>
                <strong>Action blocked</strong>
                <small>{errorMessage}</small>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}


      <Card elevated style={{ marginBottom: "1rem" }}>
        <CardContent>
          <div className="admin-tab-row">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`admin-tab-button ${activeTab === tab.id ? "active" : ""}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="toolbar-row" style={{ marginBottom: 0 }}>
            <div className="filters-row">
              <div style={{ minWidth: "280px" }}>
                <Input
                  icon={Search}
                  placeholder="Search resident, service, purpose, or reference no."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <Badge variant="secondary">Barangay: {user?.barangay}</Badge>
          </div>
        </CardContent>
      </Card>

      <div className="appointment-admin-grid">
        <div className="list-stack">
          {filteredAppointments.length > 0 ? (
            filteredAppointments.map((appointment) => (
              <AppointmentListCard
                key={appointment.id}
                appointment={appointment}
                selected={selectedAppointment?.id === appointment.id}
                onSelect={setSelectedAppointmentId}
              />
            ))
          ) : (
            <Card elevated>
              <div className="empty-state">No appointment requests found for this view.</div>
            </Card>
          )}
        </div>

        <div className="appointment-details-panel">
          {selectedAppointment ? (
            <>
              <Card elevated>
                <CardContent>
                  <div className="toolbar-row" style={{ marginBottom: "0.75rem" }}>
                    <div className="resident-mini-profile">
                      <Avatar initials={getInitials(selectedAppointment.userName)} src={selectedAppointment.userPhotoURL || ""} size="lg" />
                      <div>
                        <p className="metric-label" style={{ marginBottom: "0.2rem" }}>Selected resident</p>
                        <h3 style={{ marginBottom: "0.2rem" }}>{selectedAppointment.userName || "Resident"}</h3>
                        <small>{selectedAppointment.referenceNumber || selectedAppointment.trackingNumber}</small>
                      </div>
                    </div>
                    <StatusBadge status={selectedAppointment.status} />
                  </div>

                  <div className="appointment-summary-grid">
                    <div>
                      <small>Service</small>
                      <strong>{selectedAppointment.serviceType}</strong>
                      <span>{getServiceById(selectedAppointment.serviceId || selectedAppointment.serviceType).category}</span>
                    </div>
                    <div>
                      <small>Schedule</small>
                      <strong>{formatDateLabel(selectedAppointment.preferredDate)}</strong>
                      <span>{formatTimeLabel(selectedAppointment.preferredTime)}</span>
                    </div>
                    <div>
                      <small>Check-in Code</small>
                      <strong>{selectedAppointment.checkInCode}</strong>
                      <span>Show at barangay desk</span>
                    </div>
                    <div>
                      <small>Purpose</small>
                      <strong>{selectedAppointment.purpose || "No purpose"}</strong>
                      <span>{selectedAppointment.notes || "No resident notes."}</span>
                    </div>
                  </div>

                  <ProgressTimeline status={selectedAppointment.status} />
                </CardContent>
              </Card>

              <Card elevated>
                <CardContent>
                  <h3 className="card-section-title">Admin Actions</h3>
                  {renderActions(selectedAppointment)}
                  <p className="admin-action-hint">After an action is saved, it is removed from this panel if it is no longer valid to prevent duplicate resident notifications.</p>
                </CardContent>
              </Card>

              <div className="split-grid">
                <Card elevated>
                  <CardContent>
                    <h3 className="card-section-title">Required Documents</h3>
                    <div className="list-stack">
                      {(selectedAppointment.requirements || getServiceById(selectedAppointment.serviceId || selectedAppointment.serviceType).requirements).map((item) => (
                        <div key={item} className="requirement-row">
                          <CheckCircle size={16} />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card elevated>
                  <CardContent>
                    <h3 className="card-section-title">Reference</h3>
                    <div className="qr-reference-box compact">
                      <QrCode size={42} />
                      <div>
                        <small>{selectedAppointment.referenceNumber || selectedAppointment.trackingNumber}</small>
                        <strong>{selectedAppointment.checkInCode}</strong>
                        <span>{selectedAppointment.barangay}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {selectedAppointment.adminNotes || selectedAppointment.notes ? (
                <Card elevated>
                  <CardContent>
                    <h3 className="card-section-title">Notes</h3>
                    {selectedAppointment.notes ? (
                      <div className="note-box" style={{ marginBottom: "0.75rem" }}>
                        <strong>Resident notes:</strong> {selectedAppointment.notes}
                      </div>
                    ) : null}
                    {selectedAppointment.adminNotes ? (
                      <div className="note-box">
                        <strong>Latest admin note:</strong> {selectedAppointment.adminNotes}
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              ) : null}

              <Card elevated>
                <CardContent>
                  <h3 className="card-section-title">Status Timeline</h3>
                  <div className="list-stack">
                    {(selectedAppointment.statusHistory || []).length > 0 ? (
                      selectedAppointment.statusHistory.map((entry, index) => (
                        <div key={`${entry.createdAt}-${index}`} className="note-box">
                          <div className="toolbar-row" style={{ marginBottom: "0.35rem" }}>
                            <strong>{entry.status}</strong>
                            <small>{formatDateTime(entry.createdAt)}</small>
                          </div>
                          <p style={{ marginBottom: "0.25rem" }}>{entry.note}</p>
                          <small>Updated by {entry.updatedBy}</small>
                        </div>
                      ))
                    ) : (
                      <p>No timeline updates yet.</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card elevated>
              <div className="empty-state">Select an appointment to view details.</div>
            </Card>
          )}
        </div>
      </div>

      </div>

      <Modal
        isOpen={Boolean(actionState)}
        onClose={closeAction}
        title={actionConfig?.title || "Update Appointment"}
        subtitle={actionState?.appointment?.referenceNumber || actionState?.appointment?.trackingNumber}
        size="lg"
      >
        {actionState ? (
          <form onSubmit={handleDecisionSubmit} className="form-grid">
            <div className="full-span note-box">
              <div className="toolbar-row" style={{ marginBottom: "0.5rem" }}>
                <div>
                  <h3 style={{ marginBottom: "0.25rem" }}>{actionState.appointment.serviceType}</h3>
                  <p style={{ marginBottom: 0 }}>{actionState.appointment.purpose}</p>
                </div>
                <StatusBadge status={actionState.appointment.status} />
              </div>
              <div className="meta-row">
                <span>Resident: {actionState.appointment.userName}</span>
                <span>Date: {formatDateLabel(actionState.appointment.preferredDate)}</span>
                <span>Time: {formatTimeLabel(actionState.appointment.preferredTime)}</span>
              </div>
            </div>

            {actionState.action === "reschedule" ? (
              <>
                <Input
                  label="New Date"
                  type="date"
                  min={today}
                  value={decisionForm.preferredDate}
                  onChange={(e) => setDecisionForm({ ...decisionForm, preferredDate: e.target.value, preferredTime: "" })}
                  required
                />
                <div>
                  <label className="input-label">Available Slots</label>
                  <div className="slot-grid compact">
                    {decisionSlots.map((slot) => (
                      <button
                        key={slot.id}
                        type="button"
                        className={`slot-card ${decisionForm.preferredTime === slot.time ? "selected" : ""}`}
                        disabled={slot.disabled}
                        onClick={() => setDecisionForm({ ...decisionForm, preferredTime: slot.time })}
                      >
                        <strong>{slot.label}</strong>
                        <small>{slot.reason}</small>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            ) : null}

            <div className="full-span">
              <label className="input-label">Admin Note / Instruction</label>
              <textarea
                rows="4"
                value={decisionForm.adminNotes}
                onChange={(e) => setDecisionForm({ ...decisionForm, adminNotes: e.target.value })}
                placeholder="Add clear instructions for the resident."
              />
            </div>

            {errorMessage ? (
              <div className="full-span smart-alert smart-alert-danger">
                <AlertCircle size={18} />
                <span>{errorMessage}</span>
              </div>
            ) : null}

            <div className="full-span modal-actions">
              <Button variant="ghost" onClick={closeAction} disabled={actionSubmitting}>Cancel</Button>
              <Button type="submit" variant={actionConfig?.variant || "primary"} disabled={actionSubmitting}>
                <ActionIcon size={16} /> {actionSubmitting ? "Saving..." : (actionConfig?.button || "Save Update")}
              </Button>
            </div>
          </form>
        ) : null}
      </Modal>
    </AdminLayout>
  );
}

function InfoMessage({ status }) {
  const meta = getStatusMeta(status);
  return (
    <>
      <ShieldCheck size={17} />
      <span>{meta.helper} No further action is required right now.</span>
    </>
  );
}

export default AppointmentManagementPage;
