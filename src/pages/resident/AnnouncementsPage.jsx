import React, { useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Bell,
  CalendarClock,
  CheckCircle2,
  ExternalLink,
  Filter,
  MapPin,
  Megaphone,
  Pin,
  Search,
  ShieldCheck,
  Target,
  Users,
} from "lucide-react";
import ResidentLayout from "../../components/ResidentLayout";
import Card, { CardContent } from "../../components/Card";
import Badge from "../../components/Badge";
import Button from "../../components/Button";
import { useApp } from "../../context/AppContext";
import { useAuth } from "../../context/AuthContext";
import { formatRecordAge } from "../../utils/timeDisplay";
import "../../styles/pages/Announcements.css";

const normalize = (value) => String(value || "").trim().toLowerCase();

const priorityVariant = (priority = "") => {
  const value = normalize(priority);
  if (value === "high") return "danger";
  if (value === "medium") return "warning";
  return "secondary";
};

const getTargetLabel = (announcement = {}, user = {}) => {
  if (announcement.targetMode === "all") return "All San Miguel residents";
  if (announcement.targetMode === "specific") {
    const targets = Array.isArray(announcement.targetBarangays) ? announcement.targetBarangays : [];
    if (targets.length === 1) return targets[0];
    if (targets.length > 1) return `${targets.length} selected barangays`;
    return "Selected barangays";
  }
  return announcement.barangay || user?.barangay || "Your barangay";
};

const isExpired = (announcement = {}) => {
  if (!announcement.expiresAt) return false;
  const time = new Date(announcement.expiresAt).getTime();
  return Number.isFinite(time) && time < Date.now();
};

const formatDate = (value) => {
  if (!value) return "No expiry";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const getSmartInstruction = (announcement = {}) => {
  const category = normalize(announcement.category);
  if (category.includes("emergency")) return "Read the advisory carefully, avoid risky areas, and follow the barangay instruction before taking action.";
  if (category.includes("lost")) return "Review the details first, then open the related Lost & Found page only if you have useful information.";
  if (category.includes("job")) return "Check the announcement details, then open Jobs if you want to apply, post, or contact a worker.";
  if (category.includes("service") || category.includes("document")) return "Check the schedule, requirements, and deadline before visiting the barangay office.";
  return "Read the full notice, check who it applies to, and follow the action button only when it matches your concern.";
};

const getActionPath = (announcement = {}) => {
  if (announcement.actionPath) return announcement.actionPath;
  const category = normalize(announcement.category);
  if (category.includes("lost")) return "/lost-found";
  if (category.includes("job")) return "/jobs";
  if (category.includes("emergency")) return "/emergency";
  if (category.includes("service") || category.includes("document")) return "/appointment-request";
  return "";
};

function AnnouncementsPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { getVisibleAnnouncements } = useApp();
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");

  const visibleAnnouncements = useMemo(
    () => (getVisibleAnnouncements?.(user) || []).sort((a, b) => {
      const pinned = Number(Boolean(b.isPinned)) - Number(Boolean(a.isPinned));
      if (pinned) return pinned;
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    }),
    [getVisibleAnnouncements, user],
  );

  const focusedId = id || searchParams.get("announcement") || "";
  const selectedAnnouncement = useMemo(
    () => visibleAnnouncements.find((item) => String(item.id) === String(focusedId)),
    [focusedId, visibleAnnouncements],
  );

  const counts = useMemo(() => ({
    total: visibleAnnouncements.length,
    pinned: visibleAnnouncements.filter((item) => item.isPinned).length,
    urgent: visibleAnnouncements.filter((item) => item.priority === "high").length,
    active: visibleAnnouncements.filter((item) => !isExpired(item) && normalize(item.status || "Published") === "published").length,
  }), [visibleAnnouncements]);

  const filteredAnnouncements = useMemo(() => {
    const search = normalize(query);
    return visibleAnnouncements.filter((item) => {
      const expired = isExpired(item);
      const matchesFilter =
        activeFilter === "all" ||
        (activeFilter === "urgent" && item.priority === "high") ||
        (activeFilter === "pinned" && item.isPinned) ||
        (activeFilter === "active" && !expired) ||
        (activeFilter === "expired" && expired);
      const text = normalize(`${item.title} ${item.body} ${item.category} ${item.createdBy} ${getTargetLabel(item, user)}`);
      return matchesFilter && (!search || text.includes(search));
    });
  }, [activeFilter, query, user, visibleAnnouncements]);

  const openAction = (announcement) => {
    const path = getActionPath(announcement);
    if (path) navigate(path);
  };

  const renderAnnouncementCard = (announcement, compact = false) => {
    const expired = isExpired(announcement);
    const actionPath = getActionPath(announcement);
    return (
      <Card key={announcement.id} elevated hoverable className={`announcement-card ${announcement.isPinned ? "announcement-card--pinned" : ""} ${expired ? "announcement-card--expired" : ""}`}>
        <CardContent>
          <div className="announcement-card__layout">
            <div className="announcement-card__icon"><Megaphone size={22} /></div>
            <div className="announcement-card__content">
              <div className="announcement-card__badges">
                <Badge variant={priorityVariant(announcement.priority)}>{announcement.priority || "medium"}</Badge>
                <Badge variant="secondary">{announcement.category || "General Notice"}</Badge>
                {announcement.isPinned ? <Badge variant="warning"><Pin size={12} /> Pinned</Badge> : null}
                {expired ? <Badge variant="danger">Expired</Badge> : <Badge variant="success">Active</Badge>}
              </div>
              <h2>{announcement.title}</h2>
              <p>{compact ? `${announcement.body || ""}`.slice(0, 160) + ((announcement.body || "").length > 160 ? "..." : "") : announcement.body}</p>
              <div className="announcement-meta-grid">
                <span><MapPin size={14} /> {getTargetLabel(announcement, user)}</span>
                <span><Users size={14} /> {announcement.audience || "Residents"}</span>
                <span><CalendarClock size={14} /> {formatRecordAge(announcement)}</span>
                {announcement.expiresAt ? <span><Bell size={14} /> Expires {formatDate(announcement.expiresAt)}</span> : null}
              </div>
              {!compact ? (
                <div className="announcement-next-step">
                  <strong>What should I do?</strong>
                  <span>{getSmartInstruction(announcement)}</span>
                </div>
              ) : null}
            </div>
            <div className="announcement-card__actions">
              {compact ? (
                <Button variant="primary" onClick={() => navigate(`/announcements/${announcement.id}?from=list`)}>
                  View Details
                </Button>
              ) : (
                <>
                  {actionPath ? (
                    <Button variant="primary" onClick={() => openAction(announcement)}>
                      <ExternalLink size={16} /> {announcement.actionLabel || "Open Action"}
                    </Button>
                  ) : null}
                  <Button variant="outline" onClick={() => navigate("/announcements")}>Back to list</Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <ResidentLayout>
      <div className="announcements-page">
        <section className="announcements-hero">
          <div>
            <span className="announcements-eyebrow"><Megaphone size={16} /> Barangay announcement center</span>
            <h1>{selectedAnnouncement ? "Announcement Details" : "Barangay Announcements"}</h1>
            <p>{selectedAnnouncement ? "Read the exact announcement from your notification and see the next action clearly." : "Official notices from your barangay and selected San Miguel announcements in one organized page."}</p>
          </div>
          <div className="announcements-hero__stats">
            <Badge variant="secondary">{counts.total} total</Badge>
            <Badge variant={counts.urgent ? "danger" : "secondary"}>{counts.urgent} urgent</Badge>
            <Badge variant="warning">{counts.pinned} pinned</Badge>
          </div>
        </section>

        {selectedAnnouncement ? (
          <>
            <button className="announcement-back-button" type="button" onClick={() => navigate("/announcements")}>
              <ArrowLeft size={16} /> Back to all announcements
            </button>
            {renderAnnouncementCard(selectedAnnouncement, false)}
          </>
        ) : (
          <>
            <section className="announcement-summary-grid">
              <Card elevated><CardContent><strong>{counts.active}</strong><span>Active notices</span></CardContent></Card>
              <Card elevated><CardContent><strong>{counts.urgent}</strong><span>Urgent notices</span></CardContent></Card>
              <Card elevated><CardContent><strong>{counts.pinned}</strong><span>Pinned notices</span></CardContent></Card>
              <Card elevated><CardContent><strong>{counts.total}</strong><span>Visible to you</span></CardContent></Card>
            </section>

            <section className="announcement-controls">
              <div className="announcement-search">
                <Search size={18} />
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search title, content, category, or barangay..." />
              </div>
              <div className="announcement-filter-row" aria-label="Announcement filters">
                {[
                  ["all", "All"],
                  ["urgent", "Urgent"],
                  ["pinned", "Pinned"],
                  ["active", "Active"],
                  ["expired", "Expired"],
                ].map(([value, label]) => (
                  <button key={value} className={activeFilter === value ? "active" : ""} type="button" onClick={() => setActiveFilter(value)}>
                    {value === "all" ? <Filter size={15} /> : value === "urgent" ? <Bell size={15} /> : value === "pinned" ? <Pin size={15} /> : <CheckCircle2 size={15} />}
                    {label}
                  </button>
                ))}
              </div>
            </section>

            <section className="announcement-guidance-card">
              <ShieldCheck size={20} />
              <div>
                <strong>One sight guide:</strong>
                <span>Check priority first, confirm if it targets your barangay, read the details, then use the action button only when needed.</span>
              </div>
            </section>

            <section className="announcement-list">
              {filteredAnnouncements.length ? filteredAnnouncements.map((announcement) => renderAnnouncementCard(announcement, true)) : (
                <Card elevated>
                  <CardContent>
                    <div className="announcement-empty">
                      <Megaphone size={44} />
                      <h3>No announcements found</h3>
                      <p>No official notices match your current search or filter.</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </section>
          </>
        )}
      </div>
    </ResidentLayout>
  );
}

export default AnnouncementsPage;
