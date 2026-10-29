import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  FileText,
  Info,
  LocateFixed,
  MapPin,
  Shield as ShieldAlert,
  UserCheck,
  Users,
} from "lucide-react";
import ResidentLayout from "../../components/ResidentLayout";
import Card, { CardContent } from "../../components/Card";
import Badge from "../../components/Badge";
import Button from "../../components/Button";
import Modal from "../../components/Modal";
import Input from "../../components/Input";
import ImageUploader from "../../components/ImageUploader";
import { CLOUDINARY_FOLDERS } from "../../services/cloudinaryService";
import { useApp } from "../../context/AppContext";
import { useAuth } from "../../context/AuthContext";
import { BARANGAYS, EMERGENCY_STATUS, EMERGENCY_TYPES, cleanEmergencyContacts } from "../../utils/storage";
import {
  SERVICE_AREA_STATUS,
  SAN_MIGUEL_SERVICE_AREA_LABEL,
  buildOpenStreetMapUrl,
  buildServiceAreaPayload,
  formatAccuracy,
  getPublicEmergencyLocationLabel,
  getServiceAreaStatus,
  hasExactCoordinates,
} from "../../utils/locationApi";
import SmartMediaImage from "../../components/SmartMediaImage";
import "../../styles/pages/Emergency.css";

const REPORTER_ROLE_OPTIONS = [
  {
    value: "self",
    label: "I need help",
    description: "Use this if you are the person who needs assistance.",
    icon: UserCheck,
  },
  {
    value: "other_person",
    label: "Someone else needs help",
    description: "Use this if you are helping another person.",
    icon: Users,
  },
  {
    value: "witness",
    label: "I am only reporting what I saw",
    description: "Use this if you saw an incident and want to notify the barangay.",
    icon: AlertCircle,
  },
];

const REPORTER_ROLE_LABELS = {
  self: "Reporter needs help",
  other_person: "Someone else needs help",
  witness: "Witness report",
};

const STATUS_LABELS = {
  [EMERGENCY_STATUS.NEW]: "Sent to barangay",
  [EMERGENCY_STATUS.VERIFIED]: "Verified",
  [EMERGENCY_STATUS.ONGOING]: "Responding",
  [EMERGENCY_STATUS.RESPONDED]: "Assistance sent",
  [EMERGENCY_STATUS.RESOLVED]: "Resolved",
  [EMERGENCY_STATUS.FALSE_REPORT]: "Closed / Invalid",
};

const STATUS_EXPLANATIONS = {
  [EMERGENCY_STATUS.NEW]: "Your report was sent to the assigned barangay admin for checking.",
  [EMERGENCY_STATUS.VERIFIED]: "Barangay admin confirmed that this needs attention.",
  [EMERGENCY_STATUS.ONGOING]: "Barangay responders are handling this report.",
  [EMERGENCY_STATUS.RESPONDED]: "Assistance was already sent or coordinated.",
  [EMERGENCY_STATUS.RESOLVED]: "The barangay marked this emergency as resolved.",
  [EMERGENCY_STATUS.FALSE_REPORT]: "The barangay closed this report after review.",
};

const sanMiguelBarangays = BARANGAYS.filter((barangay) => barangay.id !== 0 && barangay.name !== "Select Barangay");

const initialForm = (barangay = "") => ({
  emergencyType: "Accident",
  reporterRole: "witness",
  victimName: "",
  victimCondition: "",
  incidentLocationMode: "home",
  incidentBarangay: barangay,
  landmark: "",
  description: "",
  image: "",
  exactLocation: null,
  lat: "",
  lng: "",
  accuracy: "",
  locationSource: "manual-landmark",
  locationCapturedAt: "",
  locationStatus: SERVICE_AREA_STATUS.NOT_VERIFIED,
  serviceArea: {
    municipality: "San Miguel",
    province: "Bulacan",
    isWithinServiceArea: false,
    verificationMethod: "manual_landmark",
    locationStatus: SERVICE_AREA_STATUS.NOT_VERIFIED,
    label: "Location not verified",
  },
  publicAreaText: barangay ? `Barangay ${barangay}` : "",
});

const getStatusVariant = (status) => {
  if (status === EMERGENCY_STATUS.RESOLVED) return "success";
  if (status === EMERGENCY_STATUS.RESPONDED || status === EMERGENCY_STATUS.ONGOING) return "job";
  if (status === EMERGENCY_STATUS.VERIFIED) return "warning";
  if (status === EMERGENCY_STATUS.FALSE_REPORT) return "secondary";
  return "danger";
};

const getLocationStatusVariant = (status) => {
  if (status === SERVICE_AREA_STATUS.VERIFIED) return "success";
  if (status === SERVICE_AREA_STATUS.OUTSIDE) return "danger";
  return "warning";
};

const getStatusLabel = (status) => STATUS_LABELS[status] || status || "Sent to barangay";

const isOwnEmergency = (emergency = {}, userId = "", userUid = "") => (
  Boolean(userId || userUid)
  && (
    emergency.authorId === userId
    || emergency.userId === userId
    || emergency.author?.id === userId
    || emergency.author?.uid === userUid
    || emergency.authorId === userUid
    || emergency.userId === userUid
  )
);

const getEmergencyHandlerBarangay = (emergency = {}) => emergency.handlerBarangay || emergency.incidentBarangay || emergency.barangay || "Assigned barangay";
const getEmergencyHomeBarangay = (emergency = {}) => emergency.reporterHomeBarangay || emergency.homeBarangay || emergency.author?.barangay || "Home barangay";
const isCrossBarangayEmergency = (emergency = {}) => Boolean(
  emergency.isCrossBarangay
  || (getEmergencyHomeBarangay(emergency) && getEmergencyHandlerBarangay(emergency) && getEmergencyHomeBarangay(emergency) !== getEmergencyHandlerBarangay(emergency)),
);

function EmergencyAssistance() {
  const { emergencies, createEmergency } = useApp();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const currentBarangay = user?.barangay || "";
  const currentUserId = user?.id || user?.uid || "";
  const currentUserUid = user?.uid || "";

  const myEmergencies = useMemo(() => {
    const items = Array.isArray(emergencies) ? emergencies : [];
    return items
      .filter((emergency) => isOwnEmergency(emergency, currentUserId, currentUserUid))
      .sort((a, b) => new Date(b.createdAt || b.updatedAt || 0) - new Date(a.createdAt || a.updatedAt || 0));
  }, [emergencies, currentUserId, currentUserUid]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState(initialForm(currentBarangay));
  const [selectedEmergencyId, setSelectedEmergencyId] = useState(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [locationNotice, setLocationNotice] = useState("");
  const [locationNoticeType, setLocationNoticeType] = useState("info");
  const [formError, setFormError] = useState("");

  const selectedEmergency = myEmergencies.find((emergency) => emergency.id === selectedEmergencyId);

  useEffect(() => {
    const requestedEmergencyId = searchParams.get("emergency");
    if (requestedEmergencyId && myEmergencies.some((emergency) => String(emergency.id) === String(requestedEmergencyId))) {
      setSelectedEmergencyId(requestedEmergencyId);
    }
  }, [myEmergencies, searchParams]);
  const myReportsCount = myEmergencies.length;
  const activeReportsCount = myEmergencies.filter((emergency) => ![EMERGENCY_STATUS.RESOLVED, EMERGENCY_STATUS.FALSE_REPORT].includes(emergency.status)).length;
  const crossBarangayCount = myEmergencies.filter(isCrossBarangayEmergency).length;
  const savedEmergencyContacts = cleanEmergencyContacts(user?.emergencyContacts);

  const openReportModal = () => {
    setFormData(initialForm(currentBarangay));
    setLocationNotice("");
    setLocationNoticeType("info");
    setFormError("");
    setIsModalOpen(true);
  };

  const updateForm = (updates) => setFormData((current) => ({ ...current, ...updates }));

  const getSelectedIncidentBarangay = (data = formData) => (
    data.incidentLocationMode === "home"
      ? currentBarangay
      : data.incidentBarangay
  );

  const handleUseCurrentLocation = () => {
    setFormError("");
    setLocationNotice("");
    setLocationNoticeType("info");

    if (!navigator?.geolocation) {
      setLocationNotice("Location is not available on this browser. You can still type the area or landmark. The barangay admin must verify it before responding.");
      setLocationNoticeType("warning");
      updateForm({ locationStatus: SERVICE_AREA_STATUS.NOT_VERIFIED, serviceArea: buildServiceAreaPayload({}) });
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        const capturedAt = new Date().toISOString();
        const locationRecord = {
          lat: latitude,
          lng: longitude,
          accuracy,
          locationCapturedAt: capturedAt,
          locationSource: "resident-browser",
        };
        const serviceAreaStatus = getServiceAreaStatus(locationRecord);
        const serviceAreaPayload = buildServiceAreaPayload(locationRecord);
        const incidentBarangay = getSelectedIncidentBarangay();
        const publicAreaText = incidentBarangay
          ? `Barangay ${incidentBarangay}${formData.landmark ? `, near ${formData.landmark}` : ""}`
          : formData.landmark || "Location sent to barangay admin";

        if (serviceAreaStatus.status === SERVICE_AREA_STATUS.OUTSIDE) {
          updateForm({
            exactLocation: null,
            lat: "",
            lng: "",
            accuracy: "",
            locationSource: "outside-service-area",
            locationCapturedAt: capturedAt,
            locationStatus: SERVICE_AREA_STATUS.OUTSIDE,
            serviceArea: serviceAreaPayload,
          });
          setLocationNotice(`${serviceAreaStatus.message} This report will not be submitted as a San Miguel barangay emergency. Please contact the nearest local authority.`);
          setLocationNoticeType("danger");
          setIsLocating(false);
          return;
        }

        updateForm({
          exactLocation: { lat: latitude, lng: longitude, accuracy, capturedAt, source: "resident-browser" },
          lat: latitude,
          lng: longitude,
          accuracy,
          locationSource: "resident-browser",
          locationCapturedAt: capturedAt,
          locationStatus: serviceAreaStatus.status,
          serviceArea: serviceAreaPayload,
          publicAreaText,
        });
        setLocationNotice(`${serviceAreaStatus.message} ${formatAccuracy(accuracy)}. Exact pin will be visible to barangay admins only.`);
        setLocationNoticeType("success");
        setIsLocating(false);
      },
      () => {
        const serviceAreaPayload = buildServiceAreaPayload({});
        updateForm({ locationStatus: SERVICE_AREA_STATUS.NOT_VERIFIED, serviceArea: serviceAreaPayload });
        setLocationNotice(`Location permission was not allowed. You can still report by typing a San Miguel area or landmark, but barangay admin must verify it first.`);
        setLocationNoticeType("warning");
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 },
    );
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setFormError("");

    const landmark = formData.landmark.trim();
    const description = formData.description.trim();
    const victimName = formData.victimName.trim();
    const victimCondition = formData.victimCondition.trim();
    const incidentBarangay = getSelectedIncidentBarangay();
    const hasLocation = landmark || formData.exactLocation;

    if (!incidentBarangay) {
      setFormError("Please select the barangay where the emergency is happening.");
      return;
    }

    if (formData.locationStatus === SERVICE_AREA_STATUS.OUTSIDE) {
      setFormError(`This GPS location is outside ${SAN_MIGUEL_SERVICE_AREA_LABEL}. The report cannot be submitted as a barangay emergency.`);
      return;
    }

    if (!hasLocation) {
      setFormError("Please use your current location or type a nearby San Miguel landmark before submitting.");
      return;
    }

    const isCrossBarangay = Boolean(currentBarangay && incidentBarangay && currentBarangay !== incidentBarangay);
    const areaText = landmark
      ? `Near ${landmark}, ${incidentBarangay}`
      : `Barangay ${incidentBarangay}`;

    const roleLabel = REPORTER_ROLE_LABELS[formData.reporterRole] || "Witness report";
    const contactSnapshot = formData.reporterRole === "self" ? savedEmergencyContacts : [];
    setIsSubmitting(true);
    try {
    const created = await createEmergency({
      emergencyType: formData.emergencyType,
      reporterRole: formData.reporterRole,
      victimName: formData.reporterRole === "self" ? user?.name || "Resident" : victimName,
      victimCondition,
      title: `${formData.emergencyType} report${landmark ? ` near ${landmark}` : ""}`,
      description: description || `${roleLabel}. No additional description provided. Barangay admin should verify the report.`,
      severity: "High",
      landmark,
      locationDetails: landmark || incidentBarangay,
      publicAreaText: areaText,
      image: formData.image,
      exactLocation: formData.exactLocation,
      lat: formData.lat,
      lng: formData.lng,
      accuracy: formData.accuracy,
      locationSource: formData.locationSource,
      locationCapturedAt: formData.locationCapturedAt,
      locationStatus: formData.locationStatus,
      serviceArea: formData.serviceArea,
      emergencyContactsSnapshot: contactSnapshot,
      visibility: { showToPublic: false, exactPinAdminOnly: true },
      author: user,
      authorId: user?.id || user?.uid,
      userId: user?.id || user?.uid,
      reporterHomeBarangay: currentBarangay,
      homeBarangay: currentBarangay,
      incidentBarangay,
      handlerBarangay: incidentBarangay,
      supportBarangays: isCrossBarangay ? [currentBarangay] : [],
      barangay: incidentBarangay,
      isCrossBarangay,
    });

    setFormData(initialForm(currentBarangay));
    setIsModalOpen(false);
    setSelectedEmergencyId(created?.id || null);
    } catch (error) {
      setFormError(error.message || "Emergency report was not saved. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ResidentLayout>
      <div className="emergency-page">
        <div className="container">
          <section className="emergency-header emergency-header-streamlined">
            <div className="header-content">
              <AlertCircle size={40} className="alert-icon" />
              <div>
                <h1>Emergency Assistance</h1>
                <p>Submit an emergency to the correct barangay admin and privately track your own report status.</p>
              </div>
            </div>
            <div className="header-actions">
              <Button variant="danger" onClick={openReportModal}><AlertCircle size={20} /> Report Emergency</Button>
            </div>
          </section>

          <section className="emergency-privacy-note">
            <Info size={18} />
            <span>Emergency reports are private case records. Other residents cannot see your submitted emergency, exact location, or evidence photo.</span>
          </section>

          <section className="emergency-summary-grid">
            <Card elevated><CardContent className="emergency-summary-card"><ShieldAlert size={24} /><div><strong>{activeReportsCount}</strong><span>Active private cases</span></div></CardContent></Card>
            <Card elevated><CardContent className="emergency-summary-card"><CheckCircle2 size={24} /><div><strong>{crossBarangayCount}</strong><span>Cross-barangay reports</span></div></CardContent></Card>
            <Card elevated><CardContent className="emergency-summary-card"><FileText size={24} /><div><strong>{myReportsCount}</strong><span>Reports you sent</span></div></CardContent></Card>
          </section>

          <section className="emergency-section-heading"><div><h2>My Emergency Reports</h2><p>Only your submitted reports are shown here. Barangay-wide public alerts should come from official announcements.</p></div></section>

          <section className="emergencies-list">
            {myEmergencies.length > 0 ? (
              myEmergencies.map((emergency) => {
                const locationStatus = emergency.serviceArea?.locationStatus || emergency.locationStatus || SERVICE_AREA_STATUS.NOT_VERIFIED;
                const handlerBarangay = getEmergencyHandlerBarangay(emergency);
                const homeBarangay = getEmergencyHomeBarangay(emergency);
                const isCrossBarangay = isCrossBarangayEmergency(emergency);
                return (
                  <Card key={emergency.id || `${emergency.title}-${emergency.createdAt}`} elevated>
                    {emergency.image ? <SmartMediaImage src={emergency.image} alt={emergency.title || "Emergency evidence"} className="emergency-cover-image" size="cover" /> : null}
                    <CardContent>
                      <div className="emerg-header">
                        <div className="emerg-badge-row">
                          <Badge variant="secondary">Your report</Badge>
                          {isCrossBarangay ? <Badge variant="warning">Cross-barangay</Badge> : null}
                          <Badge variant="secondary">{emergency.emergencyType || "Emergency"}</Badge>
                          <Badge variant={getStatusVariant(emergency.status)}>{getStatusLabel(emergency.status)}</Badge>
                          <Badge variant={getLocationStatusVariant(locationStatus)}>{emergency.serviceArea?.label || "Location not verified"}</Badge>
                        </div>
                        <span className="emerg-time">{emergency.timestamp || "Date unavailable"}</span>
                      </div>
                      <h3 className="emerg-title">{emergency.title || "Emergency report"}</h3>
                      <p className="emerg-desc">{emergency.description || "No additional details provided."}</p>
                      <div className="emerg-meta">
                        <span><MapPin size={16} /> Handler: {handlerBarangay}</span>
                        {isCrossBarangay ? <span><ShieldAlert size={16} /> Home barangay support: {homeBarangay}</span> : null}
                        <span><Clock size={16} /> {STATUS_EXPLANATIONS[emergency.status] || "Waiting for barangay update."}</span>
                        <span><UserCheck size={16} /> {REPORTER_ROLE_LABELS[emergency.reporterRole] || "Witness report"}</span>
                      </div>
                      {hasExactCoordinates(emergency) ? <div className="admin-response-strip compact"><ShieldAlert size={16} /><span>Exact pin was sent to authorized barangay admins only.</span></div> : null}
                      {Array.isArray(emergency.adminNotes) && emergency.adminNotes.length > 0 ? <div className="admin-response-strip compact"><Info size={16} /><span>{emergency.adminNotes[emergency.adminNotes.length - 1]?.note || "Barangay update available."}</span></div> : null}
                      <div className="emerg-actions"><Button variant="secondary" onClick={() => setSelectedEmergencyId(emergency.id)}>View Update</Button></div>
                    </CardContent>
                  </Card>
                );
              })
            ) : (
              <Card elevated><div className="empty-state"><strong>No emergency reports yet.</strong><span>Use Report Emergency only for urgent incidents that need barangay action.</span></div></Card>
            )}
          </section>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Report Emergency" subtitle={`For incidents within ${SAN_MIGUEL_SERVICE_AREA_LABEL} only.`} size="lg">
        <form onSubmit={handleSubmit} className="emergency-form">
          <div className="emergency-fast-tip"><strong>Fastest way:</strong> choose type, choose who needs help, select incident barangay, tap current location, then submit.</div>
          {formError ? <div className="form-alert danger">{formError}</div> : null}

          <div className="form-group">
            <label className="input-label">What happened?</label>
            <div className="emergency-type-grid">
              {EMERGENCY_TYPES.map((type) => <button type="button" key={type} className={`emergency-type-button ${formData.emergencyType === type ? "active" : ""}`} onClick={() => updateForm({ emergencyType: type })}>{type}</button>)}
            </div>
          </div>

          <div className="form-group">
            <label className="input-label">Who needs help?</label>
            <div className="emergency-role-grid">
              {REPORTER_ROLE_OPTIONS.map((option) => {
                const Icon = option.icon;
                return (
                  <button type="button" key={option.value} className={`emergency-role-button ${formData.reporterRole === option.value ? "active" : ""}`} onClick={() => updateForm({ reporterRole: option.value })}>
                    <Icon size={18} />
                    <strong>{option.label}</strong>
                    <span>{option.description}</span>
                  </button>
                );
              })}
            </div>
            {formData.reporterRole === "self" ? (
              <div className="note-box">
                <Info size={16} style={{ verticalAlign: "middle" }} /> Your saved emergency contacts will be visible to barangay admin for manual call if needed. Manual call only.
              </div>
            ) : null}
          </div>

          {formData.reporterRole !== "self" ? (
            <div className="two-column-form-row">
              <Input label="Victim name" value={formData.victimName} onChange={(e) => updateForm({ victimName: e.target.value })} placeholder="Optional if known" />
              <Input label="Victim condition" value={formData.victimCondition} onChange={(e) => updateForm({ victimCondition: e.target.value })} placeholder="Example: injured, unconscious, safe" />
            </div>
          ) : null}

          <div className="form-group">
            <label className="input-label">Where is the emergency happening?</label>
            <div className="emergency-location-choice-grid">
              <button type="button" className={`emergency-location-choice ${formData.incidentLocationMode === "home" ? "active" : ""}`} onClick={() => updateForm({ incidentLocationMode: "home", incidentBarangay: currentBarangay, publicAreaText: currentBarangay ? `Barangay ${currentBarangay}` : "" })}>
                <strong>My registered barangay</strong>
                <span>{currentBarangay || "No barangay saved in profile"}</span>
              </button>
              <button type="button" className={`emergency-location-choice ${formData.incidentLocationMode === "other" ? "active" : ""}`} onClick={() => updateForm({ incidentLocationMode: "other", incidentBarangay: "", publicAreaText: "" })}>
                <strong>Another San Miguel barangay</strong>
                <span>Route the case to the incident barangay admin.</span>
              </button>
            </div>
          </div>

          {formData.incidentLocationMode === "other" ? (
            <div className="form-group">
              <label className="input-label" htmlFor="incidentBarangay">Incident barangay</label>
              <select id="incidentBarangay" value={formData.incidentBarangay} onChange={(e) => updateForm({ incidentBarangay: e.target.value, publicAreaText: e.target.value ? `Barangay ${e.target.value}` : "" })}>
                <option value="">Select incident barangay</option>
                {sanMiguelBarangays.map((barangay) => <option key={barangay.id} value={barangay.name}>{barangay.name}</option>)}
              </select>
            </div>
          ) : null}

          <div className="emergency-location-panel">
            <div><strong>Exact location for admin response</strong><p>Use current location when possible. The exact pin is private and not shown to other residents.</p></div>
            <Button variant="primary" type="button" onClick={handleUseCurrentLocation} disabled={isLocating}><LocateFixed size={16} /> {isLocating ? "Getting location..." : "Use My Current Location"}</Button>
          </div>
          {locationNotice ? <div className={`form-alert ${locationNoticeType === "danger" ? "danger" : locationNoticeType === "warning" ? "warning" : "success"}`}>{locationNotice}{formData.exactLocation ? <a href={buildOpenStreetMapUrl(formData)} target="_blank" rel="noreferrer">Open captured pin</a> : null}</div> : null}
          <Input label="Area or Landmark" value={formData.landmark} onChange={(e) => {
            const landmark = e.target.value;
            const incidentBarangay = getSelectedIncidentBarangay({ ...formData, landmark });
            if (formData.locationStatus === SERVICE_AREA_STATUS.OUTSIDE) {
              setLocationNotice("GPS was outside San Miguel. This manual landmark will be submitted as location not verified and must be checked by barangay admin.");
              setLocationNoticeType("warning");
            }
            updateForm({
              landmark,
              locationDetails: landmark,
              publicAreaText: incidentBarangay ? `Barangay ${incidentBarangay}${landmark ? `, near ${landmark}` : ""}` : landmark,
              ...(formData.locationStatus === SERVICE_AREA_STATUS.OUTSIDE
                ? {
                    exactLocation: null,
                    lat: "",
                    lng: "",
                    accuracy: "",
                    locationStatus: SERVICE_AREA_STATUS.NOT_VERIFIED,
                    serviceArea: buildServiceAreaPayload({}),
                  }
                : {}),
            });
          }} placeholder="Example: near covered court, school, chapel, main road" hint="The selected incident barangay admin will handle this report." />
          <div className="locked-barangay-box">Primary handler: <strong>{getSelectedIncidentBarangay() || "Select incident barangay"}</strong>{getSelectedIncidentBarangay() && currentBarangay && getSelectedIncidentBarangay() !== currentBarangay ? <span> • Your home barangay gets support visibility only.</span> : null}</div>
          <div className="form-group">
            <label className="input-label">What help is needed? <span className="optional-label">Optional but recommended</span></label>
            <textarea className="input" rows="4" value={formData.description} onChange={(e) => updateForm({ description: e.target.value })} placeholder="Example: May nasugatan. Need first aid and traffic assistance." />
          </div>
          <div className="form-group">
            <label className="input-label">Photo Evidence <span className="optional-label">Optional</span></label>
            <ImageUploader onImageSelect={(imageValue) => updateForm({ image: Array.isArray(imageValue) ? imageValue[0] || "" : imageValue || "" })} multiple={false} initialImages={formData.image ? [formData.image] : []} cloudinaryFolder={CLOUDINARY_FOLDERS.EMERGENCIES} onUploadStateChange={setIsUploadingImage} />
          </div>
          <div className="emergency-submit-note">After submitting, only you and authorized barangay admins can track this emergency case. It will not appear as a public resident feed post.</div>
          <div className="modal-actions">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button variant="danger" type="submit" isLoading={isSubmitting} disabled={isUploadingImage || isLocating || formData.locationStatus === SERVICE_AREA_STATUS.OUTSIDE}>{isUploadingImage ? "Uploading photo..." : "Submit Emergency Report"}</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={Boolean(selectedEmergency)} onClose={() => setSelectedEmergencyId(null)} title={selectedEmergency?.title || "Emergency Details"} subtitle={selectedEmergency ? `Assigned to ${getEmergencyHandlerBarangay(selectedEmergency)}` : "Private emergency case"} size="lg">
        {selectedEmergency ? (
          <div className="emergency-detail-modal">
            {selectedEmergency.image ? <SmartMediaImage src={selectedEmergency.image} alt={selectedEmergency.title || "Emergency evidence"} className="emergency-detail-image" size="detail" /> : null}
            <div className="emerg-badge-row"><Badge variant="secondary">{selectedEmergency.emergencyType || "Emergency"}</Badge><Badge variant={getStatusVariant(selectedEmergency.status)}>{getStatusLabel(selectedEmergency.status)}</Badge><Badge variant={getLocationStatusVariant(selectedEmergency.serviceArea?.locationStatus || selectedEmergency.locationStatus)}>{selectedEmergency.serviceArea?.label || "Location not verified"}</Badge>{isCrossBarangayEmergency(selectedEmergency) ? <Badge variant="warning">Cross-barangay</Badge> : null}</div>
            <p>{selectedEmergency.description || "No additional details provided."}</p>
            <div className="emergency-detail-grid">
              <div><span>Primary handler</span><strong>{getEmergencyHandlerBarangay(selectedEmergency)}</strong></div>
              <div><span>Reporter home barangay</span><strong>{getEmergencyHomeBarangay(selectedEmergency)}</strong></div>
              <div><span>Incident area</span><strong>{getPublicEmergencyLocationLabel(selectedEmergency)}</strong></div>
              <div><span>Exact pin</span><strong>{hasExactCoordinates(selectedEmergency) ? "Sent to barangay admins only" : "Not provided"}</strong></div>
              <div><span>Who needs help</span><strong>{REPORTER_ROLE_LABELS[selectedEmergency.reporterRole] || "Witness report"}</strong></div>
              <div><span>Reported at</span><strong>{selectedEmergency.timestamp || "Date unavailable"}</strong></div>
              <div><span>Status meaning</span><strong>{STATUS_EXPLANATIONS[selectedEmergency.status] || "Waiting for barangay update."}</strong></div>
            </div>
            <div className="emergency-timeline">
              <h4>Barangay Response Updates</h4>
              {Array.isArray(selectedEmergency.statusHistory) && selectedEmergency.statusHistory.length > 0 ? selectedEmergency.statusHistory.map((entry, index) => (
                <div className="timeline-item" key={`${entry.createdAt || "history"}-${entry.status || index}`}>
                  <Badge variant={getStatusVariant(entry.status)} size="sm">{getStatusLabel(entry.status)}</Badge>
                  <div><strong>{entry.note || "Status updated."}</strong><span>{entry.updatedBy || "Barangay Admin"} • {entry.createdAt ? new Date(entry.createdAt).toLocaleString() : "Just now"}</span></div>
                </div>
              )) : <p className="muted-text">No barangay update yet.</p>}
            </div>
          </div>
        ) : null}
      </Modal>
    </ResidentLayout>
  );
}

export default EmergencyAssistance;
