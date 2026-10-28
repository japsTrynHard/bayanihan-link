import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  CalendarDays,
  Users,
  Briefcase,
  Search as PackageSearch,
  Shield as ShieldAlert,
  Megaphone,
  Clock as Activity,
  FileText as ClipboardCheck,
  Clock,
  FileText as FileWarning,
  ArrowRight,
  MapPin,
  Check as CheckCircle2,
} from "lucide-react";
import Card, { CardContent } from "../../components/Card";
import Button from "../../components/Button";
import Badge from "../../components/Badge";
import AdminLayout from "../../components/AdminLayout";
import { useApp } from "../../context/AppContext";
import { useAuth } from "../../context/AuthContext";
import "../../styles/pages/Skeleton.css";
import {
  ACTION_QUEUE_FILTERS,
  buildAdminActionQueue,
  filterAdminActionQueue,
  getAdminHealthSummary,
  getPriorityLabel,
  getQueueCounts,
} from "../../utils/adminDecisionSupport";
import "../../styles/pages/Dashboard.css";

const formatDateTime = (value) => {
  if (!value) return "No date yet";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const getStatusVariant = (status = "") => {
  const normalized = status.toLowerCase();
  if (["new", "pending", "under review"].includes(normalized)) return "warning";
  if (["ongoing", "responded", "approved", "rescheduled"].includes(normalized)) return "default";
  if (["resolved", "completed", "active"].includes(normalized)) return "success";
  if (["rejected", "removed", "flagged", "suspended"].includes(normalized)) return "danger";
  return "secondary";
};

const emptyCopy = {
  emergencies: "No emergency reports to review.",
  appointments: "No appointment requests to review.",
  activity: "No recent barangay activity yet.",
};

function AdminDashboard() {
  const { users, emergencies, appointments, allPosts, reports, announcements } = useApp();
  const { user } = useAuth();
  const [queueFilter, setQueueFilter] = useState("all");
  const adminBarangay = user?.barangay || "your assigned barangay";

  const scopedUsers = users.filter(
    (item) => item.role === "resident" && item.barangay === user?.barangay,
  );
  const scopedEmergencies = emergencies.filter((item) => item.barangay === user?.barangay);
  const scopedAppointments = appointments.filter((item) => item.barangay === user?.barangay);
  const scopedReports = reports.filter((item) => (item.handlerBarangay || item.barangay) === user?.barangay);
  const scopedAnnouncements = announcements.filter((item) => item.barangay === user?.barangay);
  const scopedPosts = allPosts.filter((post) => post.barangay === user?.barangay);
  const jobPosts = scopedPosts.filter((post) => post.type === "job");
  const lostFoundPosts = scopedPosts.filter((post) => ["lost", "found"].includes(post.type));

  const adminHealth = getAdminHealthSummary({
    users: scopedUsers,
    emergencies: scopedEmergencies,
    appointments: scopedAppointments,
    reports: scopedReports,
    posts: scopedPosts,
  });

  const allActionQueue = useMemo(() => buildAdminActionQueue({
    emergencies: scopedEmergencies,
    appointments: scopedAppointments,
    reports: scopedReports,
    posts: scopedPosts,
  }), [scopedEmergencies, scopedAppointments, scopedReports, scopedPosts]);

  const queueCounts = getQueueCounts(allActionQueue);
  const actionQueue = filterAdminActionQueue(allActionQueue, queueFilter);
  const unresolvedEmergencyQueue = allActionQueue.filter((item) => item.queueType === "emergency");

  const activeEmergencyStatuses = ["New", "Ongoing", "Responded"];
  const pendingAppointmentStatuses = ["Pending", "Rescheduled"];
  const attentionReportStatuses = ["Pending", "Under Review"];

  const activeEmergencies = scopedEmergencies.filter((item) =>
    activeEmergencyStatuses.includes(item.status),
  );
  const pendingAppointments = scopedAppointments.filter((item) =>
    pendingAppointmentStatuses.includes(item.status),
  );
  const activeJobPosts = jobPosts.filter((post) => post.status === "Active");
  const activeLostFoundPosts = lostFoundPosts.filter((post) => post.status === "Active");
  const pendingReports = scopedReports.filter((item) =>
    attentionReportStatuses.includes(item.status),
  );

  const latestEmergencies = [...scopedEmergencies]
    .sort((a, b) => new Date(b.createdAt || b.timestamp) - new Date(a.createdAt || a.timestamp))
    .slice(0, 4);

  const latestAppointments = [...scopedAppointments]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 4);

  const latestReports = [...scopedReports]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 3);

  const latestAnnouncements = [...scopedAnnouncements]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 2);

  const recentActivity = [
    ...scopedEmergencies.map((item) => ({
      id: `activity-emergency-${item.id}`,
      type: "Emergency",
      title: item.title,
      description: item.description,
      status: item.status,
      createdAt: item.createdAt || item.timestamp,
      to: "/admin/emergencies",
      icon: AlertTriangle,
    })),
    ...scopedAppointments.map((item) => ({
      id: `activity-appointment-${item.id}`,
      type: "Appointment",
      title: item.serviceType,
      description: `${item.userName || "Resident"} requested ${item.serviceType}`,
      status: item.status,
      createdAt: item.createdAt,
      to: "/admin/appointments",
      icon: CalendarDays,
    })),
    ...scopedPosts.map((post) => ({
      id: `activity-post-${post.id}`,
      type: post.type === "job" ? "Job Post" : "Lost & Found",
      title: post.title,
      description: post.description,
      status: post.status,
      createdAt: post.createdAt,
      to: `/admin/post/${post.id}`,
      icon: post.type === "job" ? Briefcase : PackageSearch,
    })),
    ...scopedReports.map((item) => ({
      id: `activity-report-${item.id}`,
      type: "Report",
      title: item.reason,
      description: item.details || "New report submitted for moderation.",
      status: item.status,
      createdAt: item.createdAt,
      to: "/admin/reports",
      icon: ShieldAlert,
    })),
    ...scopedAnnouncements.map((item) => ({
      id: `activity-announcement-${item.id}`,
      type: "Announcement",
      title: item.title,
      description: item.body,
      status: item.priority || "medium",
      createdAt: item.createdAt,
      to: "/admin/announcements",
      icon: Megaphone,
    })),
  ]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 7);

  const summaryCards = [
    {
      label: "Registered Residents",
      value: scopedUsers.length,
      detail: "Residents in your assigned barangay",
      icon: Users,
      to: "/admin/users",
      variant: "default",
    },
    {
      label: "Emergency Reports",
      value: scopedEmergencies.length,
      detail: `${activeEmergencies.length} active / needs monitoring`,
      icon: AlertTriangle,
      to: "/admin/emergencies",
      variant: activeEmergencies.length ? "danger" : "success",
    },
    {
      label: "Pending Appointments",
      value: pendingAppointments.length,
      detail: `${scopedAppointments.length} total service requests`,
      icon: CalendarDays,
      to: "/admin/appointments",
      variant: pendingAppointments.length ? "warning" : "success",
    },
    {
      label: "Active Job Posts",
      value: activeJobPosts.length,
      detail: `${jobPosts.length} total job posts monitored`,
      icon: Briefcase,
      to: "/admin/jobs",
      variant: "default",
    },
    {
      label: "Active Lost & Found",
      value: activeLostFoundPosts.length,
      detail: `${lostFoundPosts.length} total lost/found posts`,
      icon: PackageSearch,
      to: "/admin/lost-found",
      variant: "default",
    },
    {
      label: "Reported Content",
      value: pendingReports.length,
      detail: `${scopedReports.length} total reports received`,
      icon: ShieldAlert,
      to: "/admin/reports",
      variant: pendingReports.length ? "danger" : "success",
    },
  ];

  const quickLinks = [
    {
      to: "/admin/emergencies",
      label: "Monitor Emergencies",
      description: "Review urgent reports and update response status.",
      icon: AlertTriangle,
      count: activeEmergencies.length,
      badge: "Active",
      variant: activeEmergencies.length ? "danger" : "success",
    },
    {
      to: "/admin/appointments",
      label: "Manage Appointments",
      description: "Approve, reject, reschedule, or complete requests.",
      icon: CalendarDays,
      count: pendingAppointments.length,
      badge: "Pending",
      variant: pendingAppointments.length ? "warning" : "success",
    },
    {
      to: "/admin/users",
      label: "User Management",
      description: "Monitor resident accounts, warnings, and status.",
      icon: Users,
      count: scopedUsers.length,
      badge: "Residents",
      variant: "secondary",
    },
    {
      to: "/admin/jobs",
      label: "Job Monitoring",
      description: "Review job seeking and hiring posts in your barangay.",
      icon: Briefcase,
      count: activeJobPosts.length,
      badge: "Active",
      variant: "secondary",
    },
    {
      to: "/admin/lost-found",
      label: "Lost & Found Monitoring",
      description: "Moderate lost item and found item listings.",
      icon: PackageSearch,
      count: activeLostFoundPosts.length,
      badge: "Active",
      variant: "secondary",
    },
    {
      to: "/admin/reports",
      label: "Reports and Complaints",
      description: "Review reported posts or suspicious activity.",
      icon: ShieldAlert,
      count: pendingReports.length,
      badge: "Needs Review",
      variant: pendingReports.length ? "danger" : "success",
    },
    {
      to: "/admin/announcements",
      label: "Announcements",
      description: "Post official notices for residents.",
      icon: Megaphone,
      count: scopedAnnouncements.length,
      badge: "Posted",
      variant: "secondary",
    },
  ];

  return (
    <AdminLayout
      title="Admin Dashboard"
      subtitle={`Barangay activity and pending actions for ${adminBarangay}.`}
      actions={
        <Link to="/admin/announcements">
          <Button size="sm">
            <Megaphone size={16} />
            New Announcement
          </Button>
        </Link>
      }
    >
      <div className="admin-dashboard-page">
        <section className="admin-command-hero">
          <div>
            <span className="admin-command-hero__eyebrow">
              <ShieldAlert size={16} /> Official barangay command center
            </span>
            <h2>{adminBarangay} Operations Overview</h2>
            <p>
              Monitor emergency reports, service appointments, community posts, reports, and announcements from one dashboard.
            </p>
          </div>
          <div className="admin-command-hero__badges">
            <Badge variant="secondary"><MapPin size={14} /> {adminBarangay}</Badge>
            <Badge variant={activeEmergencies.length ? "danger" : "success"}>
              {activeEmergencies.length} active alerts
            </Badge>
            <Badge variant={unresolvedEmergencyQueue.length ? "danger" : "secondary"}>
              Emergency-first queue
            </Badge>
          </div>
        </section>

        <div className="admin-summary-grid">
          {summaryCards.map((item) => {
            const Icon = item.icon;
            return (
              <Link to={item.to} key={item.label} className="admin-summary-card">
                <div className={`admin-summary-card__icon admin-summary-card__icon--${item.variant}`}>
                  <Icon size={21} />
                </div>
                <div>
                  <p>{item.label}</p>
                  <strong>{item.value}</strong>
                  <span>{item.detail}</span>
                </div>
              </Link>
            );
          })}
        </div>

        <section className="admin-command-queue-section">
          <Card elevated className="dashboard-panel admin-command-queue-card">
            <CardContent>
              <div className="panel-title-row">
                <div>
                  <h2>Smart Action Queue</h2>
                  <p className="section-subtitle">Emergency-first queue. Unresolved and older emergency reports stay above lower-priority admin work until resolved.</p>
                </div>
                <Badge variant={adminHealth.healthVariant}>{adminHealth.healthLabel}</Badge>
              </div>

              <div className="admin-queue-filter-row">
                {ACTION_QUEUE_FILTERS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={queueFilter === option.value ? "active" : ""}
                    onClick={() => setQueueFilter(option.value)}
                  >
                    {option.label}
                    <span>{queueCounts[option.value] || 0}</span>
                  </button>
                ))}
              </div>

              {unresolvedEmergencyQueue.length ? (
                <div className="admin-queue-priority-note">
                  <AlertTriangle size={16} />
                  <span>{unresolvedEmergencyQueue.length} unresolved emergency report{unresolvedEmergencyQueue.length === 1 ? "" : "s"} remain locked as top priority.</span>
                </div>
              ) : null}

              {actionQueue.length ? (
                <div className="admin-action-queue">
                  {actionQueue.slice(0, 8).map((item) => {
                    const priority = getPriorityLabel(item.score);
                    return (
                      <Link to={item.to} key={item.id} className="admin-action-queue__item">
                        <div className="admin-action-queue__score">
                          <strong>{Math.round(item.score)}</strong>
                          <span>priority</span>
                        </div>
                        <div className="admin-action-queue__main">
                          <div className="pill-row">
                            <Badge variant={priority.variant}>{priority.label}</Badge>
                            <Badge variant="secondary">{item.type}</Badge>
                            <Badge variant={getStatusVariant(item.status)}>{item.status}</Badge>
                          </div>
                          <strong>{item.title}</strong>
                          <span>{item.description}</span>
                          <small>Recommended: {item.recommendedAction}</small>
                        </div>
                        <ArrowRight size={18} />
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="dashboard-empty-state">
                  <CheckCircle2 size={24} />
                  <span>No urgent admin actions right now.</span>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="admin-health-strip">
            <Card elevated><CardContent><strong>{adminHealth.pendingReports}</strong><span>reports need review</span></CardContent></Card>
            <Card elevated><CardContent><strong>{adminHealth.activeEmergencies}</strong><span>active emergencies</span></CardContent></Card>
            <Card elevated><CardContent><strong>{adminHealth.pendingAppointments}</strong><span>appointments pending</span></CardContent></Card>
            <Card elevated><CardContent><strong>{adminHealth.warned}</strong><span>warned residents</span></CardContent></Card>
            <Card elevated><CardContent><strong>{adminHealth.suspended}</strong><span>suspended residents</span></CardContent></Card>
          </div>
        </section>

        <section className="admin-dashboard-grid admin-dashboard-grid--main">
          <Card elevated className="dashboard-panel">
            <CardContent>
              <div className="panel-title-row">
                <div>
                  <h2>Latest Emergency Reports</h2>
                  <p className="section-subtitle">Urgent cases and response status in your barangay.</p>
                </div>
                <Link to="/admin/emergencies" className="panel-link">
                  View all <ArrowRight size={15} />
                </Link>
              </div>

              <div className="dashboard-list compact-list admin-preview-list">
                {latestEmergencies.length ? latestEmergencies.map((item) => (
                  <Link to="/admin/emergencies" key={item.id} className="dashboard-list-item emergency-list-item admin-preview-item">
                    <span className="list-icon danger-icon"><AlertTriangle size={18} /></span>
                    <span className="list-main">
                      <strong>{item.title}</strong>
                      <span>{item.description}</span>
                      <small><Clock size={13} /> {formatDateTime(item.createdAt || item.timestamp)}</small>
                    </span>
                    <Badge variant={getStatusVariant(item.status)}>{item.status}</Badge>
                  </Link>
                )) : (
                  <div className="dashboard-empty-state">
                    <CheckCircle2 size={24} />
                    <span>{emptyCopy.emergencies}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card elevated className="dashboard-panel">
            <CardContent>
              <div className="panel-title-row">
                <div>
                  <h2>Appointment Requests</h2>
                  <p className="section-subtitle">Resident document and barangay service requests.</p>
                </div>
                <Link to="/admin/appointments" className="panel-link">
                  Manage <ArrowRight size={15} />
                </Link>
              </div>

              <div className="dashboard-list compact-list admin-preview-list">
                {latestAppointments.length ? latestAppointments.map((item) => (
                  <Link to="/admin/appointments" key={item.id} className="dashboard-list-item admin-preview-item">
                    <span className="list-icon"><ClipboardCheck size={18} /></span>
                    <span className="list-main">
                      <strong>{item.serviceType}</strong>
                      <span>{item.userName || "Resident"} • {item.purpose || "No purpose provided"}</span>
                      <small><Clock size={13} /> {item.preferredDate || "No date"} {item.preferredTime || ""}</small>
                    </span>
                    <Badge variant={getStatusVariant(item.status)}>{item.status}</Badge>
                  </Link>
                )) : (
                  <div className="dashboard-empty-state">
                    <CheckCircle2 size={24} />
                    <span>{emptyCopy.appointments}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="admin-dashboard-grid admin-dashboard-grid--activity">
          <Card elevated className="dashboard-panel">
            <CardContent>
              <div className="panel-title-row">
                <div>
                  <h2>Recent Barangay Activity</h2>
                  <p className="section-subtitle">Latest emergencies, posts, appointments, reports, and announcements.</p>
                </div>
                <Badge variant="secondary"><Activity size={14} /> {recentActivity.length} latest</Badge>
              </div>

              <div className="admin-activity-timeline">
                {recentActivity.length ? recentActivity.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link to={item.to} key={item.id} className="admin-activity-item">
                      <span className="admin-activity-item__icon"><Icon size={17} /></span>
                      <span className="admin-activity-item__content">
                        <small>{item.type} • {formatDateTime(item.createdAt)}</small>
                        <strong>{item.title}</strong>
                        <span>{item.description}</span>
                      </span>
                      <Badge variant={getStatusVariant(item.status)} size="sm">{item.status}</Badge>
                    </Link>
                  );
                }) : (
                  <div className="dashboard-empty-state">
                    <Activity size={24} />
                    <span>{emptyCopy.activity}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="admin-side-stack">
            <Card elevated className="dashboard-panel">
              <CardContent>
                <div className="panel-title-row">
                  <div>
                    <h2>Reports Needing Review</h2>
                    <p className="section-subtitle">Complaints and suspicious activity submitted by residents.</p>
                  </div>
                  <Link to="/admin/reports" className="panel-link">
                    Open <ArrowRight size={15} />
                  </Link>
                </div>

                <div className="dashboard-list compact-list">
                  {latestReports.length ? latestReports.map((item) => (
                    <Link to="/admin/reports" key={item.id} className="notification-preview is-unread">
                      <FileWarning size={18} />
                      <span>
                        <strong>{item.reason}</strong>
                        <small>{item.details || "Report details pending."}</small>
                        <Badge variant={getStatusVariant(item.status)} size="sm">{item.status}</Badge>
                      </span>
                    </Link>
                  )) : (
                    <div className="dashboard-empty-state">
                      <CheckCircle2 size={22} />
                      <span>No pending reports.</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card elevated className="dashboard-panel">
              <CardContent>
                <div className="panel-title-row">
                  <div>
                    <h2>Barangay Announcements</h2>
                    <p className="section-subtitle">Recently posted official notices.</p>
                  </div>
                  <Link to="/admin/announcements" className="panel-link">
                    Manage <ArrowRight size={15} />
                  </Link>
                </div>

                <div className="dashboard-list compact-list">
                  {latestAnnouncements.length ? latestAnnouncements.map((announcement) => (
                    <div key={announcement.id} className="announcement-preview admin-announcement-preview">
                      <div className="announcement-preview__top">
                        <strong>{announcement.title}</strong>
                        <Badge variant={announcement.priority === "high" ? "danger" : "secondary"} size="sm">
                          {announcement.priority}
                        </Badge>
                      </div>
                      <p>{announcement.body}</p>
                      <small>{formatDateTime(announcement.createdAt)} • {announcement.createdBy || "Barangay Admin"}</small>
                    </div>
                  )) : (
                    <div className="dashboard-empty-state">
                      <Megaphone size={22} />
                      <span>No announcements posted yet.</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <Card elevated>
          <CardContent>
            <div className="panel-title-row">
              <div>
                <h2>Quick Admin Actions</h2>
                <p className="section-subtitle">Open the main admin modules based on what needs attention.</p>
              </div>
            </div>

            <div className="admin-action-grid">
              {quickLinks.map((item) => {
                const Icon = item.icon;
                return (
                  <Link to={item.to} key={item.to} className="admin-action-card">
                    <div className="admin-action-card__top">
                      <span className={`admin-action-card__icon admin-summary-card__icon--${item.variant}`}><Icon size={20} /></span>
                      <Badge variant={item.variant} size="sm">{item.count} {item.badge}</Badge>
                    </div>
                    <strong>{item.label}</strong>
                    <span>{item.description}</span>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

export default AdminDashboard;
