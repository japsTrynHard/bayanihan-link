import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  BellRing,
  Briefcase,
  CalendarDays,
  CheckCircle,
  ClipboardList,
  Clock,
  Filter,
  MapPin,
  MessageSquare,
  Search,
  ShieldCheck,
  Users,
} from "lucide-react";
import ResidentLayout from "../../components/ResidentLayout";
import Card, { CardContent } from "../../components/Card";
import Badge from "../../components/Badge";
import Button from "../../components/Button";
import { useApp } from "../../context/AppContext";
import { useAuth } from "../../context/AuthContext";
import { formatRecordAge } from "../../utils/timeDisplay";
import { getLostFoundCaseLabel, isMissingPersonCase } from "../../utils/lostFoundCases";
import { getLostFoundIncidentBarangay, getLostFoundRouteText } from "../../utils/lostFoundMatching";
import { getJobRouteLabel, getJobWorkBarangay } from "../../utils/jobMatching";
import "../../styles/pages/MyPosts.css";

const normalize = (value) => String(value || "").trim().toLowerCase();

const getIdentityKeys = (account = {}) => [
  account.id,
  account.uid,
  account.userId,
  account.authorId,
  account.email,
].filter(Boolean).map((item) => normalize(item));

const sameOwner = (record = {}, user = {}) => {
  const userKeys = new Set(getIdentityKeys(user));
  const recordKeys = getIdentityKeys(record.author || record).concat([
    record.authorId,
    record.userId,
    record.uid,
    record.email,
    record.authorEmail,
  ].filter(Boolean).map((item) => normalize(item)));
  return recordKeys.some((key) => userKeys.has(key));
};

const statusVariant = (status = "") => {
  const value = normalize(status);
  if (["resolved", "returned", "reunited", "completed", "ready for pickup", "information verified", "approved"].includes(value)) return "success";
  if (["pending", "under review", "responding", "rescheduled", "missing requirements", "claimed"].includes(value)) return "warning";
  if (["removed", "closed", "cancelled", "false report", "invalid", "rejected"].includes(value)) return "danger";
  return "secondary";
};

const getPostKind = (post = {}) => {
  if (post.type === "job") return "Job";
  if (["lost", "found"].includes(post.type)) return getLostFoundCaseLabel(post);
  return "Post";
};

const getPostRouteText = (post = {}) => {
  if (post.type === "job") return getJobRouteLabel(post);
  if (["lost", "found"].includes(post.type)) return getLostFoundRouteText(post);
  return post.barangay || "Barangay not specified";
};

const getPostLocationLabel = (post = {}) => {
  if (post.type === "job") return getJobWorkBarangay(post) || post.barangay || "Not specified";
  if (["lost", "found"].includes(post.type)) return getLostFoundIncidentBarangay(post) || post.barangay || "Not specified";
  return post.barangay || "Not specified";
};

const getRecordTime = (record = {}) => {
  const raw = record.updatedAt || record.updatedAtIso || record.lastResponseAt || record.createdAt || record.requestedAtIso || record.preferredDate || 0;
  const time = new Date(raw).getTime();
  return Number.isFinite(time) ? time : 0;
};

function MyPostsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    allPosts,
    emergencies,
    appointments,
    getOrCreateChat,
  } = useApp();

  const [activeTab, setActiveTab] = useState("all");
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState("");

  const ownedPosts = useMemo(
    () => (allPosts || []).filter((post) => sameOwner(post, user)),
    [allPosts, user],
  );

  const ownedEmergencies = useMemo(
    () => (emergencies || []).filter((item) => sameOwner(item, user)),
    [emergencies, user],
  );

  const ownedAppointments = useMemo(
    () => (appointments || []).filter((item) => sameOwner(item, user)),
    [appointments, user],
  );

  const ownerItems = useMemo(() => {
    const postItems = ownedPosts.map((post) => ({
      id: `post-${post.id}`,
      rawId: post.id,
      group: post.type === "job" ? "jobs" : ["lost", "found"].includes(post.type) ? "lost-found" : "posts",
      title: post.title || "Untitled post",
      subtitle: post.description || "No description provided.",
      typeLabel: getPostKind(post),
      status: post.status || "Active",
      barangay: getPostLocationLabel(post),
      routeText: getPostRouteText(post),
      responses: Array.isArray(post.responses) ? post.responses : [],
      responseCount: Array.isArray(post.responses) ? post.responses.length : Number(post.interests || 0),
      updatedAt: post.lastResponseAt || post.updatedAt || post.createdAt,
      priority: isMissingPersonCase(post) ? "high" : post.responses?.length ? "medium" : "normal",
      nextAction: post.responses?.length
        ? "Review responses and chat with the right resident."
        : post.type === "job"
          ? "Wait for applicants or update the job status."
          : "Monitor tips, proofs, and case status.",
      viewPath: `/post/${post.id}?source=my-posts`,
      record: post,
    }));

    const emergencyItems = ownedEmergencies.map((item) => ({
      id: `emergency-${item.id}`,
      rawId: item.id,
      group: "emergency",
      title: item.title || item.emergencyType || "Emergency report",
      subtitle: item.description || item.details || item.exactLocation || "Emergency case submitted to barangay.",
      typeLabel: "Emergency",
      status: item.status || "Needs Review",
      barangay: item.incidentBarangay || item.handlerBarangay || item.barangay || "Not specified",
      routeText: item.isCrossBarangay
        ? `${item.reporterHomeBarangay || item.homeBarangay || "Home barangay"} → ${item.incidentBarangay || item.handlerBarangay || item.barangay || "Incident barangay"}`
        : item.barangay || "Same barangay",
      responses: [],
      responseCount: 0,
      updatedAt: item.updatedAt || item.createdAt || item.timestamp,
      priority: ["Needs Review", "Responding", "Ongoing"].includes(item.status) ? "high" : "normal",
      nextAction: "Open the case to check barangay status updates and instructions.",
      viewPath: `/emergency?from=my-posts&emergency=${item.id}`,
      record: item,
    }));

    const appointmentItems = ownedAppointments.map((item) => ({
      id: `appointment-${item.id}`,
      rawId: item.id,
      group: "appointments",
      title: item.serviceType || item.serviceName || "Barangay appointment",
      subtitle: `${item.preferredDate || item.scheduledDate || "Date pending"} • ${item.preferredTime || item.scheduledTime || "Time pending"}`,
      typeLabel: "Appointment",
      status: item.status || "Pending",
      barangay: item.barangay || user?.barangay || "Not specified",
      routeText: item.referenceNumber || item.trackingNumber || "Tracking number pending",
      responses: [],
      responseCount: 0,
      updatedAt: item.updatedAt || item.requestedAtIso || item.createdAt || item.preferredDate,
      priority: ["Pending", "Missing Requirements", "Rescheduled", "Ready for Pickup"].includes(item.status) ? "medium" : "normal",
      nextAction: item.status === "Missing Requirements"
        ? "Open the request and check what requirement is missing."
        : "Track schedule, check-in code, and barangay remarks.",
      viewPath: `/appointment-request?from=my-posts&appointment=${item.id}`,
      record: item,
    }));

    return [...postItems, ...emergencyItems, ...appointmentItems]
      .sort((a, b) => getRecordTime(b) - getRecordTime(a));
  }, [ownedPosts, ownedEmergencies, ownedAppointments, user]);

  const filteredItems = useMemo(() => {
    const search = normalize(query);
    return ownerItems.filter((item) => {
      const matchesTab = activeTab === "all" || item.group === activeTab;
      const text = normalize(`${item.title} ${item.subtitle} ${item.typeLabel} ${item.status} ${item.barangay}`);
      return matchesTab && (!search || text.includes(search));
    });
  }, [ownerItems, activeTab, query]);

  const attentionItems = useMemo(
    () => ownerItems.filter((item) => item.priority !== "normal" || item.responseCount > 0).slice(0, 6),
    [ownerItems],
  );

  const counts = useMemo(() => ({
    all: ownerItems.length,
    "lost-found": ownerItems.filter((item) => item.group === "lost-found").length,
    jobs: ownerItems.filter((item) => item.group === "jobs").length,
    emergency: ownerItems.filter((item) => item.group === "emergency").length,
    appointments: ownerItems.filter((item) => item.group === "appointments").length,
    responses: ownerItems.reduce((sum, item) => sum + Number(item.responseCount || 0), 0),
  }), [ownerItems]);

  const tabs = [
    { value: "all", label: "All", icon: ClipboardList },
    { value: "lost-found", label: "Lost & Found", icon: MapPin },
    { value: "jobs", label: "Jobs", icon: Briefcase },
    { value: "emergency", label: "Emergency", icon: AlertCircle },
    { value: "appointments", label: "Appointments", icon: CalendarDays },
  ];

  const handleChatResponse = async (item, response) => {
    if (!user?.id || !response?.userId) return;
    const otherUser = {
      id: response.userId,
      uid: response.userId,
      name: response.userName || "Resident",
      barangay: response.barangay || item.barangay || "",
      role: "resident",
    };
    const chat = await getOrCreateChat?.(user, otherUser, {
      relatedPostId: item.rawId,
      relatedPostTitle: item.title,
      relatedPostType: item.typeLabel,
      source: "my_posts_owner_monitor",
    })?.catch((error) => { window.alert(error.message || "Unable to open chat. Please try again."); return null; });
    if (chat?.id) {
      navigate(`/chat?chat=${chat.id}`);
    } else {
      setNotice("Chat is not available for this response yet. Open the case first to review details.");
      window.setTimeout(() => setNotice(""), 3500);
    }
  };

  const handleOpen = (item, response = null) => {
    if (response?.id && item.viewPath.startsWith("/post/")) {
      navigate(`${item.viewPath}&from=my-posts&responseId=${response.id}&actor=${response.userId || ""}`);
      return;
    }
    navigate(item.viewPath);
  };

  return (
    <ResidentLayout>
      <div className="my-posts-page">
        <section className="my-posts-hero">
          <div>
            <span className="my-posts-eyebrow"><ClipboardList size={16} /> Account owner workspace</span>
            <h1>My Posts</h1>
            <p>Monitor everything you personally submitted: Lost & Found, Jobs, Emergency reports, and Appointments. Open details when you need status, proof, responses, or next steps.</p>
          </div>
          <div className="my-posts-hero-actions">
            <Button variant="primary" onClick={() => navigate("/lost-found")}>Post Lost & Found</Button>
            <Button variant="secondary" onClick={() => navigate("/jobs")}>Post / Find Jobs</Button>
            <Button variant="outline" onClick={() => navigate("/appointment-request")}>Request Appointment</Button>
          </div>
        </section>

        {notice ? <div className="my-posts-notice">{notice}</div> : null}

        <section className="my-posts-summary-grid">
          <Card elevated><CardContent><strong>{counts.all}</strong><span>Total owned records</span></CardContent></Card>
          <Card elevated><CardContent><strong>{counts.responses}</strong><span>People responded</span></CardContent></Card>
          <Card elevated><CardContent><strong>{counts["lost-found"]}</strong><span>Lost & Found cases</span></CardContent></Card>
          <Card elevated><CardContent><strong>{counts.appointments}</strong><span>Appointments tracked</span></CardContent></Card>
        </section>

        {attentionItems.length ? (
          <section className="my-posts-attention-panel">
            <div className="section-heading-row">
              <div>
                <h2><BellRing size={20} /> Needs your attention</h2>
                <p>These records have responses, active status, or important monitoring tasks.</p>
              </div>
            </div>
            <div className="my-posts-attention-grid">
              {attentionItems.map((item) => {
                const firstResponse = item.responses?.[0];
                return (
                  <Card key={`attention-${item.id}`} elevated className="my-posts-attention-card">
                    <CardContent>
                      <div className="my-posts-card-topline">
                        <Badge variant={item.priority === "high" ? "danger" : "warning"}>{item.typeLabel}</Badge>
                        <Badge variant={statusVariant(item.status)}>{item.status}</Badge>
                      </div>
                      <h3>{item.title}</h3>
                      <p>{item.nextAction}</p>
                      <div className="my-posts-card-actions">
                        <Button size="sm" variant="primary" onClick={() => handleOpen(item, firstResponse)}>View Details</Button>
                        {firstResponse ? (
                          <Button size="sm" variant="secondary" onClick={() => handleChatResponse(item, firstResponse)}>
                            <MessageSquare size={14} /> Chat Now
                          </Button>
                        ) : null}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>
        ) : null}

        <section className="my-posts-controls">
          <div className="my-posts-search">
            <Search size={18} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search your posts, cases, appointments..." />
          </div>
          <div className="my-posts-filter-tabs" aria-label="My posts filters">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const countKey = tab.value;
              const count = counts[countKey] || 0;
              return (
                <button key={tab.value} className={activeTab === tab.value ? "active" : ""} onClick={() => setActiveTab(tab.value)}>
                  <Icon size={16} /> {tab.label} <span>{count}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="my-posts-list-section">
          <div className="section-heading-row">
            <div>
              <h2><Filter size={20} /> Owner monitoring list</h2>
              <p>Every card shows the purpose, current status, route, and the smartest next action.</p>
            </div>
          </div>

          {filteredItems.length ? (
            <div className="my-posts-list">
              {filteredItems.map((item) => {
                const Icon = item.group === "jobs" ? Briefcase : item.group === "emergency" ? AlertCircle : item.group === "appointments" ? CalendarDays : MapPin;
                const latestResponse = item.responses?.[0];
                return (
                  <Card key={item.id} elevated className={`my-posts-record-card my-posts-record-card--${item.group}`}>
                    <CardContent>
                      <div className="my-posts-record-main">
                        <div className="my-posts-record-icon"><Icon size={22} /></div>
                        <div className="my-posts-record-content">
                          <div className="my-posts-card-topline">
                            <Badge variant="secondary">{item.typeLabel}</Badge>
                            <Badge variant={statusVariant(item.status)}>{item.status}</Badge>
                            {item.priority === "high" ? <Badge variant="danger">Priority</Badge> : null}
                          </div>
                          <h3>{item.title}</h3>
                          <p>{item.subtitle}</p>
                          <div className="my-posts-meta-row">
                            <span><MapPin size={14} /> {item.barangay}</span>
                            <span><ShieldCheck size={14} /> {item.routeText}</span>
                            <span><Clock size={14} /> {formatRecordAge(item.record)}</span>
                            {item.responseCount ? <span><Users size={14} /> {item.responseCount} response(s)</span> : null}
                          </div>
                          <div className="my-posts-next-step">
                            <strong>Next step:</strong> {item.nextAction}
                          </div>
                          {latestResponse ? (
                            <div className="my-posts-response-preview">
                              <div>
                                <strong>{latestResponse.userName || "Resident"}</strong>
                                <span>{latestResponse.barangay || "Barangay not specified"} • {latestResponse.timestamp || "Recent response"}</span>
                                <p>{latestResponse.responseType || "Opened a response for this post."}</p>
                              </div>

                            </div>
                          ) : null}
                        </div>
                        <div className="my-posts-record-actions">
                          <Button variant="primary" onClick={() => handleOpen(item, latestResponse)}>View Details</Button>
                          {latestResponse ? (
                            <Button variant="secondary" onClick={() => handleChatResponse(item, latestResponse)}>
                              <MessageSquare size={16} /> Chat Now
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card elevated className="my-posts-empty-card">
              <CardContent>
                <ClipboardList size={48} />
                <h3>No owned records found</h3>
                <p>Create a Lost & Found case, job post, emergency report, or appointment request. Once created, it will appear here automatically for monitoring.</p>
                <div className="my-posts-empty-actions">
                  <Button variant="primary" onClick={() => navigate("/lost-found")}>Start Lost & Found</Button>
                  <Button variant="secondary" onClick={() => navigate("/jobs")}>Open Jobs</Button>
                  <Button variant="outline" onClick={() => navigate("/appointment-request")}>Request Appointment</Button>
                </div>
              </CardContent>
            </Card>
          )}
        </section>
      </div>
    </ResidentLayout>
  );
}

export default MyPostsPage;
