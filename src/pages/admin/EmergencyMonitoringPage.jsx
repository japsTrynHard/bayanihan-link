import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  Check as CheckCircle2,
  Clock as Clock3,
  Eye,
  ExternalLink,
  Info,
  MapPin,
  MessageSquare as MessageSquareText,
  PhoneCall,
  RefreshCcw,
  Shield as ShieldAlert,
  AlertCircle as Siren,
  User as UserRound,
  Users,
  XCircle,
} from "lucide-react";
import Card, { CardContent } from "../../components/Card";
import Badge from "../../components/Badge";
import Button from "../../components/Button";
import Modal from "../../components/Modal";
import AdminLayout from "../../components/AdminLayout";
import { useApp } from "../../context/AppContext";
import { useAuth } from "../../context/AuthContext";
import { EMERGENCY_STATUS } from "../../utils/storage";
import {
  SERVICE_AREA_STATUS,
  SAN_MIGUEL_SERVICE_AREA_LABEL,
  buildOpenStreetMapEmbedUrl,
  buildOpenStreetMapUrl,
  formatAccuracy,
  getLocationConfidence,
  getPublicEmergencyLocationLabel,
  normalizeCoordinates,
} from "../../utils/locationApi";
import SmartMediaImage from "../../components/SmartMediaImage";
import "../../styles/pages/Emergency.css";

const REPORTER_ROLE_LABELS = {
  self: "Reporter needs help",
  other_person: "Someone else needs help",
  witness: "Witness report",
};

const STATUS_LABELS = {
  [EMERGENCY_STATUS.NEW]: "Needs Review",
  [EMERGENCY_STATUS.VERIFIED]: "Verified",
  [EMERGENCY_STATUS.ONGOING]: "Responding",
  [EMERGENCY_STATUS.RESPONDED]: "Assistance Sent",
  [EMERGENCY_STATUS.RESOLVED]: "Resolved",
  [EMERGENCY_STATUS.FALSE_REPORT]: "False Report",
};

const STATUS_GUIDE = [
  [EMERGENCY_STATUS.NEW, "New private report. Check who needs help, incident barangay, landmark, and exact pin if available."],
  [EMERGENCY_STATUS.VERIFIED, "Confirmed by the primary handler barangay. This remains private to the reporter and admins."],
  [EMERGENCY_STATUS.ONGOING, "Barangay responder is handling the case. Reporter receives a private update."],
  [EMERGENCY_STATUS.RESOLVED, "Emergency response is complete."],
  [EMERGENCY_STATUS.FALSE_REPORT, "Invalid, prank, duplicate, outside service area, or not an emergency."],
];

const getStatusVariant = (status) => {
  if (status === EMERGENCY_STATUS.RESOLVED) return "success";
  if (status === EMERGENCY_STATUS.ONGOING || status === EMERGENCY_STATUS.RESPONDED) return "job";
  if (status === EMERGENCY_STATUS.VERIFIED) return "warning";
  if (status === EMERGENCY_STATUS.FALSE_REPORT) return "secondary";
  return "danger";
};

const getLocationStatusVariant = (status) => {
  if (status === SERVICE_AREA_STATUS.VERIFIED) return "success";
  if (status === SERVICE_AREA_STATUS.OUTSIDE) return "danger";
  return "warning";
};

const getStatusLabel = (status) => STATUS_LABELS[status] || status || "Needs Review";

const getEmergencyHandlerBarangay = (emergency = {}) => emergency.handlerBarangay || emergency.incidentBarangay || emergency.barangay || "Assigned barangay";
const getEmergencyHomeBarangay = (emergency = {}) => emergency.reporterHomeBarangay || emergency.homeBarangay || emergency.author?.barangay || "Reporter barangay";
const getSupportBarangays = (emergency = {}) => Array.from(new Set([
  ...(Array.isArray(emergency.supportBarangays) ? emergency.supportBarangays : []),
  ...(emergency.isCrossBarangay && getEmergencyHomeBarangay(emergency) ? [getEmergencyHomeBarangay(emergency)] : []),
].filter(Boolean)));

const isCrossBarangayEmergency = (emergency = {}) => Boolean(
  emergency.isCrossBarangay
  || (getEmergencyHomeBarangay(emergency) && getEmergencyHandlerBarangay(emergency) && getEmergencyHomeBarangay(emergency) !== getEmergencyHandlerBarangay(emergency)),
);

const getAdminEmergencyRole = (emergency = {}, adminBarangay = "") => {
  if (!adminBarangay) return "primary";
  const handlerBarangay = getEmergencyHandlerBarangay(emergency);
  const homeBarangay = getEmergencyHomeBarangay(emergency);
  const supportBarangays = getSupportBarangays(emergency);

  if (handlerBarangay === adminBarangay) return "primary";
  if (homeBarangay === adminBarangay || supportBarangays.includes(adminBarangay)) return "support";
  return "hidden";
};

const getRoleBadge = (role) => {
  if (role === "support") return { label: "Support Barangay", variant: "warning" };
  return { label: "Primary Handler", variant: "success" };
};

const isCriticalEmergency = (emergency = {}) => {
  if ([EMERGENCY_STATUS.RESOLVED, EMERGENCY_STATUS.FALSE_REPORT].includes(emergency.status)) return false;
  return String(emergency.severity || "").toLowerCase() === "critical" || Number(emergency.smartSeverityScore || 0) >= 70;
};

const getNextAction = (emergency = {}, role = "primary") => {
  if (role !== "primary") return null;
  switch (emergency.status) {
    case EMERGENCY_STATUS.NEW:
      return { label: "Verify Report", status: EMERGENCY_STATUS.VERIFIED, note: "Primary barangay admin verified this emergency report.", variant: "primary" };
    case EMERGENCY_STATUS.VERIFIED:
      return { label: "Mark Responding", status: EMERGENCY_STATUS.ONGOING, note: "Barangay responder is on the way or currently handling the emergency.", variant: "danger" };
    case EMERGENCY_STATUS.ONGOING:
    case EMERGENCY_STATUS.RESPONDED:
      return { label: "Mark Resolved", status: EMERGENCY_STATUS.RESOLVED, note: "Barangay response was completed and the emergency has been resolved.", variant: "success" };
    default:
      return null;
  }
};

const normalizePhoneHref = (phone = "") => {
  const clean = String(phone || "").replace(/[^0-9+]/g, "");
  return clean ? `tel:${clean}` : "";
};

const getReporterDisplayName = (emergency = {}) => (
  emergency.author?.name ||
  emergency.reporterName ||
  emergency.userName ||
  emergency.authorName ||
  "Resident"
);

const getReporterLookupValue = (emergency = {}) => (
  emergency.authorId ||
  emergency.userId ||
  emergency.author?.id ||
  emergency.author?.uid ||
  emergency.author?.email ||
  emergency.reporterEmail ||
  getReporterDisplayName(emergency)
);

const buildProfileReviewUrl = (emergency = {}) => {
  const params = new URLSearchParams();
  const searchValue = getReporterLookupValue(emergency);
  if (searchValue) params.set("search", searchValue);
  if (emergency.id) params.set("emergencyId", emergency.id);
  params.set("review", "false-report");
  return `/admin/users?${params.toString()}`;
};

const getStatusConfirmationMessage = (emergency = {}, nextStatus, note = "") => {
  const reporter = getReporterDisplayName(emergency);
  const title = emergency.title || "this emergency report";

  if (nextStatus === EMERGENCY_STATUS.FALSE_REPORT) {
    return [
      `Mark "${title}" as False Report?`,
      "This keeps it in admin records only and closes the private response case.",
      `After confirming, review ${reporter}'s profile before giving a warning or suspension.`,
      note ? `Admin note: ${note}` : "",
    ].filter(Boolean).join("\n\n");
  }

  if (nextStatus === EMERGENCY_STATUS.ONGOING) {
    return `Mark "${title}" as Responding?\n\nThe reporter will receive a private notification that barangay responders are handling the case.`;
  }

  if (nextStatus === EMERGENCY_STATUS.RESOLVED) {
    return `Mark "${title}" as Resolved?\n\nUse this only after the barangay response is complete.`;
  }

  if (nextStatus === EMERGENCY_STATUS.VERIFIED) {
    return `Verify "${title}"?\n\nOnly the primary handler barangay should verify a valid emergency case.`;
  }

  return `Update emergency status to ${getStatusLabel(nextStatus)}?`;
};

function EmergencyMonitoringPage() {
  const { emergencies, updateEmergency, reloadAppData, getVisibleNotifications } = useApp();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [selectedEmergencyId, setSelectedEmergencyId] = useState(null);
  const [adminNote, setAdminNote] = useState("");
  const [actionNotice, setActionNotice] = useState(null);
  const [listFilter, setListFilter] = useState("needs_review");

  const adminBarangay = user?.barangay || "";

  const scopedEmergencies = useMemo(() => {
    const items = Array.isArray(emergencies) ? emergencies : [];
    return items
      .filter((emergency) => getAdminEmergencyRole(emergency, adminBarangay) !== "hidden")
      .sort((a, b) => new Date(b.createdAt || b.updatedAt || 0) - new Date(a.createdAt || a.updatedAt || 0));
  }, [emergencies, adminBarangay]);

  const emergencyNotifications = useMemo(
    () => (getVisibleNotifications?.(user) || []).filter((notification) => notification.type === "emergency"),
    [getVisibleNotifications, user],
  );

  const selectedEmergency = scopedEmergencies.find((emergency) => emergency.id === selectedEmergencyId);

  useEffect(() => {
    const requestedEmergencyId = searchParams.get("emergency");
    if (requestedEmergencyId && scopedEmergencies.some((emergency) => String(emergency.id) === String(requestedEmergencyId))) {
      setSelectedEmergencyId(requestedEmergencyId);
    }
  }, [scopedEmergencies, searchParams]);
  const selectedRole = selectedEmergency ? getAdminEmergencyRole(selectedEmergency, adminBarangay) : "hidden";
  const selectedCoordinates = normalizeCoordinates(selectedEmergency || {});
  const selectedMapEmbed = buildOpenStreetMapEmbedUrl(selectedEmergency || {});
  const selectedLocationConfidence = getLocationConfidence(selectedEmergency || {});
  const selectedNextAction = getNextAction(selectedEmergency || {}, selectedRole);
  const selectedLocationStatus = selectedEmergency?.serviceArea?.locationStatus || selectedEmergency?.locationStatus || SERVICE_AREA_STATUS.NOT_VERIFIED;
  const selectedContacts = selectedEmergency?.reporterRole === "self" && Array.isArray(selectedEmergency?.emergencyContactsSnapshot)
    ? selectedEmergency.emergencyContactsSnapshot
    : [];

  const needsReviewCount = scopedEmergencies.filter((emergency) => emergency.status === EMERGENCY_STATUS.NEW && getAdminEmergencyRole(emergency, adminBarangay) === "primary").length;
  const criticalCount = scopedEmergencies.filter((emergency) => isCriticalEmergency(emergency) && getAdminEmergencyRole(emergency, adminBarangay) === "primary").length;
  const respondingCount = scopedEmergencies.filter((emergency) => [EMERGENCY_STATUS.VERIFIED, EMERGENCY_STATUS.ONGOING, EMERGENCY_STATUS.RESPONDED].includes(emergency.status) && getAdminEmergencyRole(emergency, adminBarangay) === "primary").length;
  const supportCount = scopedEmergencies.filter((emergency) => getAdminEmergencyRole(emergency, adminBarangay) === "support").length;
  const resolvedCount = scopedEmergencies.filter((emergency) => emergency.status === EMERGENCY_STATUS.RESOLVED).length;
  const invalidCount = scopedEmergencies.filter((emergency) => emergency.status === EMERGENCY_STATUS.FALSE_REPORT).length;

  const filteredEmergencies = useMemo(() => {
    switch (listFilter) {
      case "needs_review":
        return scopedEmergencies.filter((emergency) => emergency.status === EMERGENCY_STATUS.NEW && getAdminEmergencyRole(emergency, adminBarangay) === "primary");
      case "critical":
        return scopedEmergencies.filter((emergency) => isCriticalEmergency(emergency) && getAdminEmergencyRole(emergency, adminBarangay) === "primary");
      case "responding":
        return scopedEmergencies.filter((emergency) => [EMERGENCY_STATUS.VERIFIED, EMERGENCY_STATUS.ONGOING, EMERGENCY_STATUS.RESPONDED].includes(emergency.status) && getAdminEmergencyRole(emergency, adminBarangay) === "primary");
      case "support":
        return scopedEmergencies.filter((emergency) => getAdminEmergencyRole(emergency, adminBarangay) === "support");
      case "resolved":
        return scopedEmergencies.filter((emergency) => emergency.status === EMERGENCY_STATUS.RESOLVED);
      case "invalid":
        return scopedEmergencies.filter((emergency) => emergency.status === EMERGENCY_STATUS.FALSE_REPORT);
      default:
        return scopedEmergencies;
    }
  }, [listFilter, scopedEmergencies, adminBarangay]);

  const filterOptions = [
    { key: "needs_review", label: "Needs review", count: needsReviewCount },
    { key: "critical", label: "Critical", count: criticalCount },
    { key: "responding", label: "Responding", count: respondingCount },
    { key: "support", label: "Cross-barangay support", count: supportCount },
    { key: "resolved", label: "Resolved", count: resolvedCount },
    { key: "invalid", label: "Invalid", count: invalidCount },
    { key: "all", label: "All visible", count: scopedEmergencies.length },
  ];

  const showNotice = (notice) => {
    setActionNotice(notice);
    window.setTimeout(() => setActionNotice(null), 5500);
  };

  const handleStatusUpdate = (emergency, status, noteOverride = "") => {
    if (!emergency?.id) return;
    const role = getAdminEmergencyRole(emergency, adminBarangay);
    if (role !== "primary") {
      showNotice({
        type: "warning",
        message: "Support barangay can view and add support notes only. The incident barangay remains the primary handler.",
      });
      return;
    }

    const note = noteOverride || adminNote.trim();
    const confirmationMessage = getStatusConfirmationMessage(emergency, status, note);
    if (typeof window !== "undefined" && !window.confirm(confirmationMessage)) return;

    const updated = updateEmergency(emergency.id, {
      status,
      adminNote: note,
      updatedBy: user?.name || "Barangay Admin",
      respondedAt: new Date().toISOString(),
    }, user);

    if (updated) {
      const isFalseReport = status === EMERGENCY_STATUS.FALSE_REPORT;
      showNotice({
        type: isFalseReport ? "warning" : "success",
        message: isFalseReport
          ? "Report marked as False Report. Check the resident profile before giving a warning or suspension."
          : `Emergency status updated to ${getStatusLabel(status)}. Reporter notification was queued privately.`,
      });
    }

    setAdminNote("");
  };

  const handleSupportNote = (emergency) => {
    if (!emergency?.id) return;
    const note = adminNote.trim();
    if (!note) {
      showNotice({ type: "warning", message: "Type a support note first before saving." });
      return;
    }
    const updated = updateEmergency(emergency.id, {
      adminNote: `Support note from ${adminBarangay}: ${note}`,
      updatedBy: user?.name || "Support Barangay Admin",
      respondedAt: new Date().toISOString(),
    }, user);
    if (updated) {
      showNotice({ type: "success", message: "Support note saved. The primary handler can review it in the response history." });
      setAdminNote("");
    }
  };

  const openDetails = (emergency) => {
    setSelectedEmergencyId(emergency?.id || null);
    setAdminNote("");
  };

  return (
    <AdminLayout title="Emergency Response Cases" subtitle={`Private emergency queue for ${adminBarangay || "your barangay"}. Primary handlers can update status; support barangays can view and add notes.`} actions={<Button variant="outline" size="sm" onClick={reloadAppData}><RefreshCcw size={16} /> Refresh</Button>}>
      <div className="admin-emergency-page">
        {actionNotice ? (
          <Card elevated>
            <CardContent className={`admin-response-strip compact ${actionNotice.type === "warning" ? "warning-strip" : "success-strip"}`}>
              {actionNotice.type === "warning" ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
              <span>{actionNotice.message}</span>
            </CardContent>
          </Card>
        ) : null}

        <div className="emergency-admin-summary">
          <Card elevated><CardContent className="emergency-summary-card emergency-summary-card--review"><ShieldAlert size={24} /><div><strong>{needsReviewCount}</strong><span>Needs review</span></div></CardContent></Card>
          <Card elevated><CardContent className="emergency-summary-card emergency-summary-card--active"><Siren size={24} /><div><strong>{criticalCount}</strong><span>Critical cases</span></div></CardContent></Card>
          <Card elevated><CardContent className="emergency-summary-card emergency-summary-card--location"><Users size={24} /><div><strong>{supportCount}</strong><span>Support visibility</span></div></CardContent></Card>
          <Card elevated><CardContent className="emergency-summary-card emergency-summary-card--resolved"><CheckCircle2 size={24} /><div><strong>{respondingCount}</strong><span>Responding</span></div></CardContent></Card>
        </div>

        <Card elevated>
          <CardContent className="emergency-admin-guide">
            <div><h3>What to do first</h3><p>Prioritize Needs Review and Critical cases. Only the incident barangay should verify, respond, resolve, or mark invalid.</p></div>
            <div className="emergency-guide-list">
              {STATUS_GUIDE.map(([status, text]) => <span className="emergency-guide-step" key={status}><Badge variant={getStatusVariant(status)} size="sm">{getStatusLabel(status)}</Badge>{text}</span>)}
            </div>
          </CardContent>
        </Card>

        {emergencyNotifications.length > 0 && scopedEmergencies.length === 0 ? (
          <Card elevated>
            <CardContent className="admin-response-strip compact warning-strip">
              <AlertTriangle size={18} />
              <span>There are emergency notifications, but the list is still syncing. Click Refresh. If it stays empty, check Firestore rules/indexes or barangay mismatch.</span>
            </CardContent>
          </Card>
        ) : null}

        <Card elevated>
          <CardContent className="emergency-record-toolbar">
            <div>
              <h3>Emergency case queue</h3>
              <p>Use these tabs so admins know at first sight whether they are primary handler or support barangay.</p>
            </div>
            <div className="emergency-filter-row">
              {filterOptions.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  className={`emergency-filter-chip ${listFilter === option.key ? "active" : ""}`}
                  onClick={() => setListFilter(option.key)}
                >
                  <span>{option.label}</span>
                  <strong>{option.count}</strong>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="emergency-report-list">
          {filteredEmergencies.length > 0 ? filteredEmergencies.map((emergency) => {
            const coordinates = normalizeCoordinates(emergency);
            const locationConfidence = getLocationConfidence(emergency);
            const role = getAdminEmergencyRole(emergency, adminBarangay);
            const roleBadge = getRoleBadge(role);
            const nextAction = getNextAction(emergency, role);
            const locationStatus = emergency.serviceArea?.locationStatus || emergency.locationStatus || SERVICE_AREA_STATUS.NOT_VERIFIED;
            const locationLabel = emergency.serviceArea?.label || (locationStatus === SERVICE_AREA_STATUS.VERIFIED ? `Within ${SAN_MIGUEL_SERVICE_AREA_LABEL}` : "Location not verified");
            const latestAdminNote = Array.isArray(emergency.adminNotes) && emergency.adminNotes.length > 0
              ? emergency.adminNotes[emergency.adminNotes.length - 1]?.note
              : "";
            const handlerBarangay = getEmergencyHandlerBarangay(emergency);
            const homeBarangay = getEmergencyHomeBarangay(emergency);
            return (
              <Card key={emergency.id || `${emergency.title}-${emergency.createdAt}`} elevated className={`emergency-record-card ${locationStatus === SERVICE_AREA_STATUS.OUTSIDE ? "emergency-card-outside" : ""}`}>
                <CardContent className="emergency-record-layout">
                  <div className="emergency-record-content">
                    <div className="emergency-record-header">
                      <div className="emergency-record-title-block">
                        <div className="admin-emergency-title"><Siren size={18} /><h3>{emergency.title || "Emergency report"}</h3></div>
                        <p className="admin-emergency-desc">{emergency.description || "No additional details provided."}</p>
                        <div className="emergency-record-meta-line">
                          <span><UserRound size={14} /> {emergency.author?.name || emergency.reporterName || "Resident"}</span>
                          <span><Users size={14} /> {REPORTER_ROLE_LABELS[emergency.reporterRole] || "Witness report"}</span>
                          <span><Clock3 size={14} /> {emergency.timestamp || "Date unavailable"}</span>
                        </div>
                      </div>
                      <div className="emerg-badge-row emergency-record-status-group">
                        <Badge variant={roleBadge.variant}>{roleBadge.label}</Badge>
                        {isCrossBarangayEmergency(emergency) ? <Badge variant="warning">Cross-barangay</Badge> : null}
                        <Badge variant="secondary">{emergency.emergencyType || "Emergency"}</Badge>
                        <Badge variant={getStatusVariant(emergency.status)}>{getStatusLabel(emergency.status)}</Badge>
                        <Badge variant={getLocationStatusVariant(locationStatus)}>{locationLabel}</Badge>
                      </div>
                    </div>

                    <div className="emergency-record-grid">
                      <div className="emergency-record-item">
                        <span>Primary handler</span>
                        <strong>{handlerBarangay}</strong>
                      </div>
                      <div className="emergency-record-item">
                        <span>Reporter home barangay</span>
                        <strong>{homeBarangay}</strong>
                      </div>
                      <div className="emergency-record-item">
                        <span>Exact pin</span>
                        <strong>{coordinates ? "Available for admin response" : "Not provided"}</strong>
                      </div>
                    </div>

                    <div className="emergency-record-insights">
                      <div className={`location-confidence emergency-record-insight ${locationConfidence.score >= 75 ? "good" : locationConfidence.score >= 45 ? "fair" : "weak"}`}>
                        <Info size={16} />
                        <span><strong>{locationConfidence.label}</strong> — {locationConfidence.reasons.length ? locationConfidence.reasons.join(", ") : "Ask reporter for a clearer location."}</span>
                      </div>
                      {latestAdminNote ? (
                        <div className="admin-response-strip compact emergency-record-note">
                          <MessageSquareText size={16} />
                          <span>{latestAdminNote}</span>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <aside className="emergency-record-actions-panel">
                    <div className="emergency-actions-box">
                      <span className="emergency-panel-label">Recommended action</span>
                      <div className="emergency-panel-actions">
                        {nextAction ? <Button variant={nextAction.variant} size="sm" onClick={() => handleStatusUpdate(emergency, nextAction.status, nextAction.note)}>{nextAction.label}</Button> : null}
                        {role === "primary" && emergency.status !== EMERGENCY_STATUS.FALSE_REPORT ? <Button variant="outline" size="sm" onClick={() => handleStatusUpdate(emergency, EMERGENCY_STATUS.FALSE_REPORT, "Report was reviewed and marked as invalid, outside service area, duplicate, or not an emergency.")}><XCircle size={16} /> Mark Invalid</Button> : null}
                        {role === "support" ? <div className="support-role-note"><Info size={15} /> Support barangay can view only and add notes in details.</div> : null}
                        <Button variant="secondary" size="sm" onClick={() => openDetails(emergency)}><Eye size={16} /> View Details</Button>
                      </div>
                    </div>
                    <div className="emergency-actions-box subtle">
                      <span className="emergency-panel-label">More tools</span>
                      <div className="emergency-panel-links">
                        <a className="btn btn-outline btn-sm" href={buildProfileReviewUrl(emergency)} title="Open resident profile for warning or suspension review"><UserRound size={16} /> Check Profile</a>
                        <a className="btn btn-outline btn-sm" href={buildOpenStreetMapUrl(emergency)} target="_blank" rel="noreferrer" title={locationConfidence.label}><ExternalLink size={16} /> Open Map</a>
                      </div>
                    </div>
                  </aside>
                </CardContent>
              </Card>
            );
          }) : <Card elevated><div className="empty-state"><strong>No emergency cases found for this filter.</strong><span>Try another filter or click Refresh if the latest records have not loaded yet.</span></div></Card>}
        </div>

        <Modal isOpen={Boolean(selectedEmergency)} onClose={() => setSelectedEmergencyId(null)} title={selectedEmergency?.title || "Emergency Details"} subtitle={selectedEmergency ? `${getRoleBadge(selectedRole).label} • Handler: ${getEmergencyHandlerBarangay(selectedEmergency)}` : "Private emergency case"} size="xl" className="admin-emergency-detail-modal-shell" contentClassName="admin-emergency-detail-modal-content">
          {selectedEmergency ? (
            <div className="emergency-detail-modal">
              {selectedEmergency.image ? <SmartMediaImage src={selectedEmergency.image} alt={selectedEmergency.title || "Emergency evidence"} className="emergency-detail-image" size="detail" /> : null}
              <div className="emerg-badge-row"><Badge variant={getRoleBadge(selectedRole).variant}>{getRoleBadge(selectedRole).label}</Badge>{isCrossBarangayEmergency(selectedEmergency) ? <Badge variant="warning">Cross-barangay</Badge> : null}<Badge variant="secondary">{selectedEmergency.emergencyType || "Emergency"}</Badge><Badge variant={getStatusVariant(selectedEmergency.status)}>{getStatusLabel(selectedEmergency.status)}</Badge><Badge variant={getLocationStatusVariant(selectedLocationStatus)}>{selectedEmergency.serviceArea?.label || selectedLocationConfidence.label}</Badge></div>
              <p>{selectedEmergency.description || "No additional details provided."}</p>
              <div className="emergency-detail-grid emergency-detail-overview">
                <div><span>Reported by</span><strong>{selectedEmergency.author?.name || selectedEmergency.reporterName || "Resident"}</strong></div>
                <div><span>Who needs help</span><strong>{REPORTER_ROLE_LABELS[selectedEmergency.reporterRole] || "Witness report"}</strong></div>
                <div><span>Victim details</span><strong>{selectedEmergency.victimName || selectedEmergency.victimCondition ? `${selectedEmergency.victimName || "Name not provided"}${selectedEmergency.victimCondition ? ` — ${selectedEmergency.victimCondition}` : ""}` : "Not provided"}</strong></div>
                <div><span>Primary handler barangay</span><strong>{getEmergencyHandlerBarangay(selectedEmergency)}</strong></div>
                <div><span>Reporter home barangay</span><strong>{getEmergencyHomeBarangay(selectedEmergency)}</strong></div>
                <div><span>Incident area</span><strong>{getPublicEmergencyLocationLabel(selectedEmergency)}</strong></div>
                <div><span>Exact pin for admins</span><strong>{selectedCoordinates ? `${selectedCoordinates.lat.toFixed(6)}, ${selectedCoordinates.lng.toFixed(6)}` : "Not provided"}</strong></div>
                <div><span>Location accuracy</span><strong>{selectedCoordinates ? formatAccuracy(selectedCoordinates.accuracy) : "Use landmark / ask reporter"}</strong></div>
                <div><span>Reported at</span><strong>{selectedEmergency.timestamp || "Date unavailable"}</strong></div>
                <div><span>Status</span><strong>{getStatusLabel(selectedEmergency.status)}</strong></div>
              </div>

              <div className="emergency-moderation-panel">
                <div>
                  <h4>{selectedRole === "support" ? "Support Barangay Mode" : "Primary Handler Mode"}</h4>
                  <p>{selectedRole === "support" ? "You can view the case and add support notes because the reporter belongs to your barangay. The incident barangay controls status actions." : "You can verify, respond, resolve, or mark invalid because the incident is assigned to your barangay."}</p>
                </div>
                <a className="btn btn-outline btn-sm" href={buildProfileReviewUrl(selectedEmergency)}><UserRound size={16} /> Check Profile</a>
              </div>

              <div className="emergency-contact-panel emergency-detail-section">
                <h4>Emergency Contact Rule</h4>
                {selectedEmergency.reporterRole === "self" ? (
                  selectedContacts.length ? (
                    <div className="emergency-contact-list">
                      {selectedContacts.map((contact, index) => {
                        const phoneHref = normalizePhoneHref(contact.phone);
                        return (
                          <div className="emergency-contact-card" key={contact.id || `${contact.phone}-${index}`}>
                            <div><strong>{contact.name || "Emergency contact"}</strong><span>{contact.relationship || contact.priority || "Contact person"}</span><small>{contact.phone || "No phone saved"}</small></div>
                            {phoneHref ? <a className="btn btn-outline btn-sm" href={phoneHref}><PhoneCall size={16} /> Call</a> : null}
                          </div>
                        );
                      })}
                    </div>
                  ) : <p className="muted-text">Reporter selected “I need help,” but no emergency contacts are saved in the profile.</p>
                ) : (
                  <p className="muted-text">Emergency contacts are not shown because the reporter is a witness or reporting for someone else.</p>
                )}
              </div>

              <div className="admin-map-panel emergency-detail-section">
                <div className="admin-map-header"><div><h4>Exact Location</h4><p>{selectedCoordinates ? "Use this pin for barangay response only." : "No exact pin was captured. Use the typed landmark or contact the reporter."}</p></div><div className="inline-actions"><a className="btn btn-outline btn-sm" href={buildOpenStreetMapUrl(selectedEmergency)} target="_blank" rel="noreferrer"><ExternalLink size={16} /> Open in OpenStreetMap</a></div></div>
                {selectedMapEmbed ? <iframe className="admin-osm-map" src={selectedMapEmbed} title="Emergency exact map pin" loading="lazy" /> : <div className="map-fallback-box">Map preview is not available because no exact pin was saved. Incident area: {getPublicEmergencyLocationLabel(selectedEmergency)}.</div>}
              </div>
              <div className="form-group emergency-detail-section"><label className="input-label">Barangay Update Note <span className="optional-label">Optional</span></label><textarea className="input" rows="4" value={adminNote} onChange={(e) => setAdminNote(e.target.value)} placeholder={selectedRole === "support" ? "Example: Reporter belongs to our barangay. We can help contact the family." : "Example: Barangay responder is on the way. Please avoid the area."} /></div>
              <div className="inline-actions status-action-row">
                {selectedRole === "primary" ? (
                  <>
                    {selectedNextAction ? <Button variant={selectedNextAction.variant} onClick={() => handleStatusUpdate(selectedEmergency, selectedNextAction.status, adminNote.trim() || selectedNextAction.note)}>{selectedNextAction.label}</Button> : null}
                    <Button variant="outline" onClick={() => handleStatusUpdate(selectedEmergency, EMERGENCY_STATUS.VERIFIED, adminNote.trim() || "Primary barangay admin verified this emergency report.")} disabled={selectedEmergency.status === EMERGENCY_STATUS.VERIFIED}>Verify</Button>
                    <Button variant="outline" onClick={() => handleStatusUpdate(selectedEmergency, EMERGENCY_STATUS.ONGOING, adminNote.trim() || "Barangay responder is handling the emergency.")} disabled={selectedEmergency.status === EMERGENCY_STATUS.ONGOING}>Responding</Button>
                    <Button variant="outline" onClick={() => handleStatusUpdate(selectedEmergency, EMERGENCY_STATUS.RESOLVED, adminNote.trim() || "Barangay response was completed and the emergency has been resolved.")} disabled={selectedEmergency.status === EMERGENCY_STATUS.RESOLVED}>Resolved</Button>
                    <Button variant="secondary" onClick={() => handleStatusUpdate(selectedEmergency, EMERGENCY_STATUS.FALSE_REPORT, adminNote.trim() || "Report was reviewed and marked as invalid, outside service area, duplicate, or not an emergency.")} disabled={selectedEmergency.status === EMERGENCY_STATUS.FALSE_REPORT}>False Report</Button>
                  </>
                ) : (
                  <Button variant="primary" onClick={() => handleSupportNote(selectedEmergency)}>Save Support Note</Button>
                )}
              </div>
              <div className="emergency-timeline"><h4>Response History</h4>{Array.isArray(selectedEmergency.statusHistory) && selectedEmergency.statusHistory.length > 0 ? selectedEmergency.statusHistory.map((entry, index) => <div className="timeline-item" key={`${entry.createdAt || "history"}-${entry.status || index}`}><Badge variant={getStatusVariant(entry.status)} size="sm">{getStatusLabel(entry.status)}</Badge><div><strong>{entry.note || "Status updated."}</strong><span>{entry.updatedBy || "Barangay Admin"} • {entry.createdAt ? new Date(entry.createdAt).toLocaleString() : "Just now"}</span></div></div>) : <p className="muted-text">No response history yet.</p>}</div>
            </div>
          ) : null}
        </Modal>
      </div>
    </AdminLayout>
  );
}

export default EmergencyMonitoringPage;
