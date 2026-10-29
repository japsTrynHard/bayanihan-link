import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Clock,
  FileText,
  HelpCircle,
  Info,
  ListChecks,
  MapPin,
  Plus,
  QrCode,
  Search,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import ResidentLayout from "../../components/ResidentLayout";
import Card, { CardContent } from "../../components/Card";
import Badge from "../../components/Badge";
import Button from "../../components/Button";
import Input from "../../components/Input";
import Modal from "../../components/Modal";
import { useApp } from "../../context/AppContext";
import { useAuth } from "../../context/AuthContext";
import { APPOINTMENT_STATUS } from "../../utils/storage";
import {
  APPOINTMENT_SERVICES,
  DEFAULT_BARANGAY_SCHEDULE,
  findDuplicateActiveAppointment,
  formatDateLabel,
  formatTimeLabel,
  generateAppointmentSlots,
  getAppointmentProgressSteps,
  getResidentAllowedAppointmentActions,
  getServiceById,
  getStatusMeta,
  getTodayIsoDate,
} from "../../utils/appointmentLogic";
import "../../styles/pages/Skeleton.css";

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
    <div className="appointment-progress" aria-label="Appointment progress">
      {steps.map((step, index) => {
        const meta = getStatusMeta(step);
        const done = index <= currentIndex;
        return (
          <div key={step} className={`appointment-progress-step ${done ? "is-done" : ""}`}>
            <span className="appointment-progress-dot">{done ? <CheckCircle size={14} /> : index + 1}</span>
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

function AppointmentCard({ appointment, onDetails, onAction }) {
  const service = getServiceById(appointment.serviceId || appointment.serviceType);
  const allowedActions = getResidentAllowedAppointmentActions(appointment.status);
  const meta = getStatusMeta(appointment.status);

  return (
    <Card elevated className="appointment-record-card">
      <CardContent>
        <div className="toolbar-row" style={{ marginBottom: "0.75rem" }}>
          <div>
            <div className="eyebrow-row">
              <Badge variant="secondary">{service.category}</Badge>
              <small>{appointment.referenceNumber || appointment.trackingNumber}</small>
            </div>
            <h3 style={{ marginBottom: "0.25rem" }}>{appointment.serviceType}</h3>
            <p style={{ marginBottom: "0.35rem" }}>{appointment.purpose}</p>
            <small>{meta.helper}</small>
          </div>
          <StatusBadge status={appointment.status} />
        </div>

        <div className="meta-row">
          <span>
            <CalendarDays size={14} style={{ verticalAlign: "middle" }} /> {formatDateLabel(appointment.preferredDate)}
          </span>
          <span>
            <Clock size={14} style={{ verticalAlign: "middle" }} /> {formatTimeLabel(appointment.preferredTime)}
          </span>
          <span>
            <MapPin size={14} style={{ verticalAlign: "middle" }} /> {appointment.barangay}
          </span>
        </div>

        {appointment.adminNotes ? (
          <div className="smart-alert" style={{ marginTop: "1rem" }}>
            <Info size={16} />
            <span>{appointment.adminNotes}</span>
          </div>
        ) : null}

        <div className="toolbar-row" style={{ marginTop: "1rem", marginBottom: 0 }}>
          <div className="pill-row">
            {(appointment.requirements || service.requirements || []).slice(0, 3).map((item) => (
              <Badge key={item} variant="secondary">
                {item}
              </Badge>
            ))}
          </div>
          <div className="inline-actions">
            {allowedActions.includes("acceptReschedule") ? (
              <Button size="sm" variant="success" onClick={() => onAction(appointment, "acceptReschedule")}>
                Accept Schedule
              </Button>
            ) : null}
            {allowedActions.includes("cancel") ? (
              <Button size="sm" variant="ghost" onClick={() => onAction(appointment, "cancel")}>
                Cancel
              </Button>
            ) : null}
            <Button size="sm" variant="outline" onClick={() => onDetails(appointment)}>
              View Details
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AppointmentRequestPage() {
  const { appointments, createAppointment, updateAppointment } = useApp();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [activeView, setActiveView] = useState("book");
  const [bookingStep, setBookingStep] = useState(1);
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [submitError, setSubmitError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [formData, setFormData] = useState({
    serviceId: APPOINTMENT_SERVICES[0].id,
    preferredDate: getTodayIsoDate(),
    preferredTime: "",
    purpose: "",
    notes: "",
  });

  const userAppointments = useMemo(() => {
    return appointments
      .filter((appointment) => {
        const ids = [user?.id, user?.uid, user?.email].filter(Boolean).map(String);
        const recordIds = [appointment.userId, appointment.uid, appointment.email].filter(Boolean).map(String);
        return ids.some((id) => recordIds.includes(id));
      })
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }, [appointments, user?.email, user?.id, user?.uid]);

  const currentService = getServiceById(formData.serviceId);
  const activeDuplicate = findDuplicateActiveAppointment(userAppointments, {
    userId: user?.id,
    uid: user?.uid,
    email: user?.email,
    serviceId: currentService.id,
  });

  const availableSlots = useMemo(
    () =>
      generateAppointmentSlots({
        date: formData.preferredDate,
        serviceId: currentService.id,
        barangay: user?.barangay || "",
        appointments,
        schedule: DEFAULT_BARANGAY_SCHEDULE,
      }),
    [appointments, currentService.id, formData.preferredDate, user?.barangay],
  );

  const selectedSlot = availableSlots.find((slot) => slot.time === formData.preferredTime);


  useEffect(() => {
    const requestedAppointmentId = searchParams.get("appointment");
    if (!requestedAppointmentId) return;
    const match = userAppointments.find((appointment) => String(appointment.id) === String(requestedAppointmentId));
    if (match) setSelectedAppointment(match);
  }, [searchParams, userAppointments]);

  const filteredAppointments = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return userAppointments.filter((appointment) => {
      const statusMatch = filter === "all" || appointment.status === filter;
      const searchMatch =
        !query ||
        appointment.serviceType?.toLowerCase().includes(query) ||
        appointment.purpose?.toLowerCase().includes(query) ||
        appointment.trackingNumber?.toLowerCase().includes(query) ||
        appointment.referenceNumber?.toLowerCase().includes(query);

      return statusMatch && searchMatch;
    });
  }, [filter, searchTerm, userAppointments]);

  const latestAppointment = userAppointments[0];
  const pendingCount = userAppointments.filter((item) => item.status === APPOINTMENT_STATUS.PENDING).length;
  const approvedCount = userAppointments.filter((item) => [APPOINTMENT_STATUS.APPROVED, APPOINTMENT_STATUS.RESCHEDULE_REQUESTED, APPOINTMENT_STATUS.CHECKED_IN].includes(item.status)).length;
  const completedCount = userAppointments.filter((item) => item.status === APPOINTMENT_STATUS.COMPLETED).length;

  const updateForm = (patch) => {
    setSubmitError("");
    setSuccessMessage("");
    setFormData((current) => ({ ...current, ...patch }));
  };

  const resetForm = () => {
    setBookingStep(1);
    setFormData({
      serviceId: APPOINTMENT_SERVICES[0].id,
      preferredDate: getTodayIsoDate(),
      preferredTime: "",
      purpose: "",
      notes: "",
    });
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError("");
    setSuccessMessage("");

    if (!user || isSubmitting) return;
    if (activeDuplicate) {
      setSubmitError(`You already have an active ${currentService.name} appointment. Track or cancel it before creating another one.`);
      return;
    }
    if (!formData.preferredDate || !formData.preferredTime || !formData.purpose.trim()) {
      setSubmitError("Complete the service, schedule, and purpose before submitting.");
      return;
    }

    try {
      setIsSubmitting(true);
      const newAppointment = await createAppointment({
        ...formData,
        serviceType: currentService.name,
        serviceName: currentService.name,
        purpose: formData.purpose.trim(),
        notes: formData.notes.trim(),
        requirements: currentService.requirements,
        userId: user.id || user.uid,
        uid: user.uid,
        email: user.email,
        userName: user.name,
        userPhotoURL: user.photoURL || user.profilePicture || "",
        barangay: user.barangay,
        adminNotes: "",
      });

      setSuccessMessage("Appointment submitted. Wait for barangay admin approval and check notifications for updates.");
      setSelectedAppointment(newAppointment);
      setActiveView("appointments");
      resetForm();
    } catch (error) {
      setSubmitError(error.message || "Unable to submit appointment. Please try another slot.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResidentAction = async (appointment, action) => {
    try {
      if (action === "acceptReschedule") {
        const updated = await updateAppointment(
          appointment.id,
          {
            status: APPOINTMENT_STATUS.APPROVED,
            note: "Resident accepted the proposed reschedule.",
            action: "resident_accepted_reschedule",
          },
          user,
        );
        setSelectedAppointment(updated || appointment);
        setSuccessMessage("New schedule accepted. Please arrive on time.");
      }

      if (action === "cancel") {
        const updated = await updateAppointment(
          appointment.id,
          {
            status: APPOINTMENT_STATUS.CANCELLED,
            note: "Resident cancelled the appointment.",
            action: "resident_cancelled",
          },
          user,
        );
        setSelectedAppointment(updated || appointment);
        setSuccessMessage("Appointment cancelled and admin has been notified.");
      }
    } catch (error) {
      setSubmitError(error.message || "Unable to update appointment.");
    }
  };

  const canGoNext =
    (bookingStep === 1 && currentService) ||
    (bookingStep === 2 && formData.preferredDate && formData.preferredTime && selectedSlot && !selectedSlot.disabled) ||
    (bookingStep === 3 && formData.purpose.trim());

  return (
    <ResidentLayout>
      <div className="container appointments-page">
        <div className="page-hero appointment-hero-panel">
          <div className="hero-text">
            <Badge variant="job">Smart Barangay Appointment</Badge>
            <h1>Book Barangay Appointment</h1>
            <p>Choose a service, select a valid slot, prepare requirements, and track every update without asking the admin manually.</p>
          </div>
          <div className="hero-actions">
            <Button variant="primary" onClick={() => { setActiveView("book"); setBookingStep(1); }}>
              <Plus size={18} /> Book Appointment
            </Button>
            <Button variant="outline" onClick={() => setActiveView("appointments")}>
              <ListChecks size={18} /> My Appointments
            </Button>
          </div>
        </div>

        <div className="quick-action-grid">
          <button className={`quick-action-card ${activeView === "book" ? "active" : ""}`} onClick={() => setActiveView("book")} type="button">
            <ClipboardCheck size={24} />
            <span>Book Appointment</span>
            <small>Guided step-by-step scheduling</small>
          </button>
          <button className={`quick-action-card ${activeView === "appointments" ? "active" : ""}`} onClick={() => setActiveView("appointments")} type="button">
            <CalendarDays size={24} />
            <span>My Appointments</span>
            <small>Status timeline and check-in code</small>
          </button>
          <button className={`quick-action-card ${activeView === "guide" ? "active" : ""}`} onClick={() => setActiveView("guide")} type="button">
            <HelpCircle size={24} />
            <span>Requirements Guide</span>
            <small>Know what to bring before booking</small>
          </button>
        </div>

        <div className="metric-grid">
          <Card className="metric-card" elevated>
            <p className="metric-label">All Requests</p>
            <p className="metric-value">{userAppointments.length}</p>
          </Card>
          <Card className="metric-card" elevated>
            <p className="metric-label">Pending Review</p>
            <p className="metric-value">{pendingCount}</p>
          </Card>
          <Card className="metric-card" elevated>
            <p className="metric-label">Approved / Active</p>
            <p className="metric-value">{approvedCount}</p>
          </Card>
          <Card className="metric-card" elevated>
            <p className="metric-label">Completed</p>
            <p className="metric-value">{completedCount}</p>
          </Card>
        </div>

        {successMessage ? (
          <div className="smart-alert smart-alert-success">
            <CheckCircle size={18} />
            <span>{successMessage}</span>
          </div>
        ) : null}
        {submitError ? (
          <div className="smart-alert smart-alert-danger">
            <AlertCircle size={18} />
            <span>{submitError}</span>
          </div>
        ) : null}

        {latestAppointment && activeView !== "book" ? (
          <Card elevated className="latest-appointment-card">
            <CardContent>
              <div className="toolbar-row" style={{ marginBottom: "0.75rem" }}>
                <div>
                  <p className="metric-label" style={{ marginBottom: "0.25rem" }}>Latest appointment status</p>
                  <h3 style={{ marginBottom: "0.25rem" }}>{latestAppointment.serviceType}</h3>
                  <p style={{ marginBottom: 0 }}>{latestAppointment.purpose}</p>
                </div>
                <StatusBadge status={latestAppointment.status} />
              </div>
              <ProgressTimeline status={latestAppointment.status} />
            </CardContent>
          </Card>
        ) : null}

        {activeView === "book" ? (
          <form onSubmit={handleSubmit} className="appointment-wizard-grid">
            <Card elevated className="appointment-wizard-main">
              <CardContent>
                <div className="wizard-header">
                  <div>
                    <p className="metric-label">Step {bookingStep} of 4</p>
                    <h2>
                      {bookingStep === 1 && "Select Service"}
                      {bookingStep === 2 && "Choose Available Schedule"}
                      {bookingStep === 3 && "Add Purpose"}
                      {bookingStep === 4 && "Review and Submit"}
                    </h2>
                  </div>
                  <div className="wizard-steps">
                    {[1, 2, 3, 4].map((step) => (
                      <span key={step} className={step <= bookingStep ? "active" : ""}>{step}</span>
                    ))}
                  </div>
                </div>

                {bookingStep === 1 ? (
                  <div className="service-card-grid">
                    {APPOINTMENT_SERVICES.map((service) => (
                      <button
                        key={service.id}
                        type="button"
                        className={`service-choice-card ${formData.serviceId === service.id ? "selected" : ""}`}
                        onClick={() => updateForm({ serviceId: service.id, preferredTime: "" })}
                      >
                        <div className="service-choice-top">
                          <Badge variant="secondary">{service.category}</Badge>
                          <span>{service.estimatedDuration} min</span>
                        </div>
                        <h3>{service.name}</h3>
                        <p>{service.description}</p>
                        <small>{service.recommendedNotice}</small>
                      </button>
                    ))}
                  </div>
                ) : null}

                {bookingStep === 2 ? (
                  <div className="form-grid">
                    <Input
                      label="Preferred Date"
                      type="date"
                      min={getTodayIsoDate()}
                      value={formData.preferredDate}
                      onChange={(e) => updateForm({ preferredDate: e.target.value, preferredTime: "" })}
                      required
                    />
                    <div>
                      <label className="input-label">Barangay</label>
                      <input value={user?.barangay || ""} disabled readOnly />
                    </div>

                    <div className="full-span">
                      <label className="input-label">Available Slots</label>
                      <div className="slot-grid">
                        {availableSlots.length > 0 ? (
                          availableSlots.map((slot) => (
                            <button
                              key={slot.id}
                              type="button"
                              className={`slot-card ${formData.preferredTime === slot.time ? "selected" : ""}`}
                              disabled={slot.disabled}
                              onClick={() => updateForm({ preferredTime: slot.time })}
                            >
                              <strong>{slot.label}</strong>
                              <small>{slot.reason}</small>
                              {slot.isRecommended ? <Badge variant="success" size="sm">Recommended</Badge> : null}
                            </button>
                          ))
                        ) : (
                          <div className="empty-state">Select a valid date to view available slots.</div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : null}

                {bookingStep === 3 ? (
                  <div className="form-grid">
                    <Input
                      label="Purpose"
                      value={formData.purpose}
                      onChange={(e) => updateForm({ purpose: e.target.value })}
                      placeholder="Employment, school requirement, personal record, mediation, etc."
                      required
                    />
                    <div>
                      <label className="input-label">Selected Service</label>
                      <div className="note-box">
                        <strong>{currentService.name}</strong>
                        <p style={{ marginBottom: 0 }}>{currentService.description}</p>
                      </div>
                    </div>
                    <div className="full-span">
                      <label className="input-label">Additional Notes</label>
                      <textarea
                        rows="4"
                        value={formData.notes}
                        onChange={(e) => updateForm({ notes: e.target.value })}
                        placeholder="Add extra details if the barangay should know something before approving."
                      />
                    </div>
                  </div>
                ) : null}

                {bookingStep === 4 ? (
                  <div className="review-grid">
                    <div className="review-item">
                      <small>Service</small>
                      <strong>{currentService.name}</strong>
                      <span>{currentService.category} • {currentService.estimatedDuration} minutes</span>
                    </div>
                    <div className="review-item">
                      <small>Schedule</small>
                      <strong>{formatDateLabel(formData.preferredDate)}</strong>
                      <span>{formatTimeLabel(formData.preferredTime)} • {selectedSlot?.left ?? ""} slot(s) left</span>
                    </div>
                    <div className="review-item">
                      <small>Barangay</small>
                      <strong>{user?.barangay}</strong>
                      <span>Bring requirements before visiting the barangay office.</span>
                    </div>
                    <div className="review-item">
                      <small>Purpose</small>
                      <strong>{formData.purpose || "No purpose added"}</strong>
                      <span>{formData.notes || "No extra notes."}</span>
                    </div>
                  </div>
                ) : null}

                <div className="wizard-footer">
                  <Button
                    variant="ghost"
                    disabled={bookingStep === 1}
                    onClick={() => setBookingStep((step) => Math.max(step - 1, 1))}
                  >
                    <ChevronLeft size={16} /> Back
                  </Button>
                  {bookingStep < 4 ? (
                    <Button
                      variant="primary"
                      disabled={!canGoNext}
                      onClick={() => setBookingStep((step) => Math.min(step + 1, 4))}
                    >
                      Next <ChevronRight size={16} />
                    </Button>
                  ) : (
                    <Button type="submit" isLoading={isSubmitting} variant="success" disabled={!formData.purpose.trim() || !formData.preferredTime || Boolean(activeDuplicate)}>
                      <ShieldCheck size={16} /> Submit Appointment
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="appointment-wizard-side">
              <Card elevated>
                <CardContent>
                  <h3 className="card-section-title">Smart Requirement Preview</h3>
                  <div className="list-stack">
                    {currentService.requirements.map((item) => (
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
                  <h3 className="card-section-title">Booking Guardrails</h3>
                  <div className="list-stack">
                    <div className="requirement-row">
                      <Clock size={16} />
                      <span>{DEFAULT_BARANGAY_SCHEDULE.officeStart}–{DEFAULT_BARANGAY_SCHEDULE.officeEnd}, Mon–Fri only</span>
                    </div>
                    <div className="requirement-row">
                      <AlertCircle size={16} />
                      <span>Lunch break slots are automatically blocked.</span>
                    </div>
                    <div className="requirement-row">
                      <ShieldCheck size={16} />
                      <span>Duplicate active requests for the same service are prevented.</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {activeDuplicate ? (
                <div className="smart-alert smart-alert-warning">
                  <AlertCircle size={18} />
                  <span>You already have an active {currentService.name} appointment. Track or cancel it before booking again.</span>
                </div>
              ) : null}
            </div>
          </form>
        ) : null}

        {activeView === "appointments" ? (
          <>
            <Card elevated style={{ marginBottom: "1rem" }}>
              <CardContent>
                <div className="toolbar-row" style={{ marginBottom: 0 }}>
                  <div className="filters-row">
                    <div style={{ minWidth: "260px" }}>
                      <Input
                        icon={Search}
                        placeholder="Search service, purpose, or reference no."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                    <select value={filter} onChange={(e) => setFilter(e.target.value)}>
                      <option value="all">All statuses</option>
                      {Object.values(APPOINTMENT_STATUS).map((status) => (
                        <option key={status} value={status}>{getStatusMeta(status).label}</option>
                      ))}
                    </select>
                  </div>
                  <Button variant="primary" onClick={() => setActiveView("book")}>
                    <Plus size={16} /> New Appointment
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="list-stack">
              {filteredAppointments.length > 0 ? (
                filteredAppointments.map((appointment) => (
                  <AppointmentCard
                    key={appointment.id}
                    appointment={appointment}
                    onDetails={setSelectedAppointment}
                    onAction={handleResidentAction}
                  />
                ))
              ) : (
                <Card elevated>
                  <div className="empty-state">
                    No appointment records found. Book your first barangay appointment to see status updates here.
                  </div>
                </Card>
              )}
            </div>
          </>
        ) : null}

        {activeView === "guide" ? (
          <div className="service-guide-grid">
            {APPOINTMENT_SERVICES.map((service) => (
              <Card key={service.id} elevated>
                <CardContent>
                  <div className="toolbar-row" style={{ marginBottom: "0.75rem" }}>
                    <div>
                      <Badge variant="secondary">{service.category}</Badge>
                      <h3 style={{ marginTop: "0.5rem" }}>{service.name}</h3>
                    </div>
                    <Badge variant="job">{service.estimatedDuration} min</Badge>
                  </div>
                  <p>{service.description}</p>
                  <div className="list-stack">
                    {service.requirements.map((item) => (
                      <div key={item} className="requirement-row">
                        <CheckCircle size={16} />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : null}
      </div>

      <Modal
        isOpen={Boolean(selectedAppointment)}
        onClose={() => setSelectedAppointment(null)}
        title="Appointment Details"
        subtitle={selectedAppointment?.referenceNumber || selectedAppointment?.trackingNumber}
        size="lg"
      >
        {selectedAppointment ? (
          <div className="list-stack">
            <Card elevated>
              <CardContent>
                <div className="toolbar-row" style={{ marginBottom: "0.75rem" }}>
                  <div>
                    <h3>{selectedAppointment.serviceType}</h3>
                    <p>{selectedAppointment.purpose}</p>
                  </div>
                  <StatusBadge status={selectedAppointment.status} />
                </div>
                <div className="meta-row">
                  <span>Requested: {selectedAppointment.requestedAt}</span>
                  <span>Schedule: {formatDateLabel(selectedAppointment.preferredDate)}</span>
                  <span>Time: {formatTimeLabel(selectedAppointment.preferredTime)}</span>
                  <span>Barangay: {selectedAppointment.barangay}</span>
                </div>
                <ProgressTimeline status={selectedAppointment.status} />
              </CardContent>
            </Card>

            <div className="split-grid">
              <Card elevated>
                <CardContent>
                  <h3 className="card-section-title">Check-in Reference</h3>
                  <div className="qr-reference-box">
                    <QrCode size={46} />
                    <div>
                      <small>Show this at the barangay office</small>
                      <strong>{selectedAppointment.checkInCode}</strong>
                      <span>{selectedAppointment.referenceNumber || selectedAppointment.trackingNumber}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card elevated>
                <CardContent>
                  <h3 className="card-section-title">Resident</h3>
                  <div className="resident-mini-profile">
                    <span className="avatar-lite">{getInitials(selectedAppointment.userName)}</span>
                    <div>
                      <strong>{selectedAppointment.userName}</strong>
                      <small>{selectedAppointment.barangay}</small>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card elevated>
              <CardContent>
                <h3 className="card-section-title">Requirements</h3>
                <div className="pill-row">
                  {(selectedAppointment.requirements || getServiceById(selectedAppointment.serviceId || selectedAppointment.serviceType).requirements).map((item) => (
                    <Badge key={item} variant="secondary">
                      {item}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {selectedAppointment.notes || selectedAppointment.adminNotes ? (
              <Card elevated>
                <CardContent>
                  <h3 className="card-section-title">Notes</h3>
                  {selectedAppointment.notes ? (
                    <div className="note-box" style={{ marginBottom: "0.75rem" }}>
                      <strong>Your notes:</strong> {selectedAppointment.notes}
                    </div>
                  ) : null}
                  {selectedAppointment.adminNotes ? (
                    <div className="note-box">
                      <strong>Admin instruction:</strong> {selectedAppointment.adminNotes}
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

            <div className="modal-actions">
              {getResidentAllowedAppointmentActions(selectedAppointment.status).includes("acceptReschedule") ? (
                <Button variant="success" onClick={() => handleResidentAction(selectedAppointment, "acceptReschedule")}>
                  <CheckCircle size={16} /> Accept Proposed Schedule
                </Button>
              ) : null}
              {getResidentAllowedAppointmentActions(selectedAppointment.status).includes("cancel") ? (
                <Button variant="danger" onClick={() => handleResidentAction(selectedAppointment, "cancel")}>
                  <XCircle size={16} /> Cancel Appointment
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}
      </Modal>
    </ResidentLayout>
  );
}

export default AppointmentRequestPage;
