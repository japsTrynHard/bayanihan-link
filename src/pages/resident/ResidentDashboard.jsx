import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  Bell,
  Briefcase,
  CalendarDays,
  ChevronRight,
  FileText,
  MapPin,
  MessageSquare,
  Megaphone,
  Plus,
  Search,
  Shield as ShieldCheck,
  User,
  Users,
} from "lucide-react";
import ResidentLayout from "../../components/ResidentLayout";
import Card, { CardContent, CardHeader } from "../../components/Card";
import Button from "../../components/Button";
import Badge from "../../components/Badge";
import Avatar from "../../components/Avatar";
import Modal from "../../components/Modal";
import Input from "../../components/Input";
import ImageUploader from "../../components/ImageUploader";
import { getPostCoverImage } from "../../utils/postImages";
import { formatRecordAge } from "../../utils/timeDisplay";
import SmartMediaImage from "../../components/SmartMediaImage";
import { useAuth } from "../../context/AuthContext";
import { useApp } from "../../context/AppContext";
import { getFirstName } from "../../utils/userDisplay";
import "../../styles/pages/Dashboard.css";
import "../../styles/pages/Skeleton.css";
import "../../styles/pages/PostCreate.css";

const getTime = (item = {}) => {
  const raw = item.createdAtIso || item.createdAt || item.requestedAtIso || item.updatedAtIso || item.updatedAt || item.timestamp || item.lastMessageAt || item.postedDate || 0;
  const time = new Date(raw).getTime();
  return Number.isNaN(time) ? 0 : time;
};

const newest = (items = []) => [...items].sort((a, b) => getTime(b) - getTime(a));

const getRemainingSlots = (post = {}) => {
  const total = Number(post.slots || post.availableSlots || post.maxApplicants || 1);
  const interested = Array.isArray(post.interestedUserIds) ? post.interestedUserIds.length : 0;
  const responses = Array.isArray(post.responses) ? post.responses.length : 0;
  const filled = Math.max(interested, responses, Number(post.filledSlots || 0));
  return Math.max((Number.isFinite(total) && total > 0 ? total : 1) - filled, 0);
};

const isOpenJob = (post = {}) => post.type === "job" && post.status !== "Closed" && post.status !== "Removed" && getRemainingSlots(post) > 0;

const badgeForStatus = (status = "") => {
  const value = status.toLowerCase();
  if (["active", "approved", "responded", "resolved", "completed", "returned"].includes(value)) return "success";
  if (["pending", "ongoing", "rescheduled", "claimed"].includes(value)) return "warning";
  if (["new", "rejected", "removed", "flagged"].includes(value)) return "danger";
  return "secondary";
};

const displayDate = (dateString) => {
  if (!dateString) return "No date";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
};

function Dashboard() {
  const { user } = useAuth();
  const {
    allPosts,
    appointments,
    announcements,
    emergencies,
    createPost,
    getVisibleNotifications,
    getUnreadCount,
    getUnreadChats,
    getNotificationPath,
    markNotificationRead,
  } = useApp();

  // useState: Controls kung bukas o sarado ang quick post modal.
  const [isModalOpen, setIsModalOpen] = useState(false);
  // useState: Hawak ang values ng quick post form sa dashboard.
  const [formData, setFormData] = useState({
    type: "job",
    title: "",
    description: "",
    rateAmount: "",
    ratePeriod: "day",
    slots: 1,
    images: [],
  });
  const [isCreatingPost, setIsCreatingPost] = useState(false);
  const [createNotice, setCreateNotice] = useState({ type: "", message: "" });

  const data = useMemo(() => {
    const sameBarangay = (item) => item?.barangay === user?.barangay;
    const visiblePosts = allPosts.filter((post) => sameBarangay(post) && post.status !== "Removed");
    const myAppointments = newest(appointments.filter((item) => item.userId === user?.id));
    const activeEmergencies = newest(emergencies.filter((item) =>
      (item.userId === user?.id || item.authorId === user?.id || item.author?.id === user?.id) && item.status !== "Resolved"
    ));
    const announcementVisible = (item) => {
      if (!item) return false;
      if (item.targetMode === "all") return true;
      if (item.targetMode === "specific") return Array.isArray(item.targetBarangays) && item.targetBarangays.includes(user?.barangay);
      return sameBarangay(item);
    };
    const residentAnnouncements = newest(announcements.filter(announcementVisible)).sort(
      (a, b) => Number(Boolean(b.isPinned)) - Number(Boolean(a.isPinned)),
    );
    const visibleNotifications = newest(getVisibleNotifications(user));

    return {
      latestJobs: newest(visiblePosts.filter(isOpenJob)).slice(0, 3),
      latestLostFound: newest(visiblePosts.filter((post) => ["lost", "found"].includes(post.type))).slice(0, 3),
      activeEmergencies: activeEmergencies.slice(0, 3),
      latestAppointment: myAppointments[0],
      notifications: visibleNotifications.slice(0, 4),
      announcements: residentAnnouncements.slice(0, 3),
      stats: {
        pendingAppointments: myAppointments.filter((item) => item.status === "Pending").length,
        unreadNotifications: getUnreadCount(user),
        unreadChats: getUnreadChats(user),
        activeAlerts: activeEmergencies.length,
      },
    };
  }, [allPosts, appointments, announcements, emergencies, getUnreadChats, getUnreadCount, getVisibleNotifications, user]);

  const dashboardFirstName = getFirstName(user, "Resident");

  const resetForm = () => setFormData({ type: "job", title: "", description: "", rateAmount: "", ratePeriod: "day", slots: 1, images: [] });

  const buildQuickRate = () => {
    const amount = Number(formData.rateAmount);
    if (!Number.isFinite(amount) || amount <= 0) return "Rate negotiable";
    const period = formData.ratePeriod === "week" ? "per week" : formData.ratePeriod === "project" ? "per project" : "per day";
    return `₱${amount.toLocaleString("en-PH")} ${period} • negotiable`;
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (isCreatingPost) return;
    setCreateNotice({ type: "", message: "" });
    if (!formData.title || !formData.description) {
      setCreateNotice({ type: "error", message: "Please add a title and description before publishing." });
      return;
    }

    setIsCreatingPost(true);
    try {
      await createPost({
        ...formData,
        salary: formData.type === "job" ? buildQuickRate() : "",
        rateAmount: Number(formData.rateAmount) || 0,
        rateMode: "negotiable",
        availableSlots: Math.max(1, Number(formData.slots) || 1),
        slots: Math.max(1, Number(formData.slots) || 1),
        barangay: user?.barangay,
        author: user,
      });
      resetForm();
      setCreateNotice({ type: "success", message: "Post published successfully and moved to the top of the feed." });
      setIsModalOpen(false);
    } catch (error) {
      console.error("Unable to create dashboard post.", error);
      setCreateNotice({ type: "error", message: error.message || "Post was not created. Please try again." });
    } finally {
      setIsCreatingPost(false);
    }
  };


  return (
    <ResidentLayout>
      <div className="container resident-dashboard-container">
        <section className="welcome-section resident-welcome-section">
          <div className="welcome-content">
            <Avatar initials={user?.avatar || "U"} src={user?.profilePicture} alt={user?.name || "Resident"} size="lg" />
            <div className="welcome-text">
              <span className="welcome-eyebrow"><ShieldCheck size={16} /> Resident Portal</span>
              <h1>Welcome back, {dashboardFirstName}</h1>
              <p className="welcome-subtitle">{user?.barangay} • Member since {user?.joinedDate}</p>
            </div>
          </div>
          <div className="welcome-actions">
            <Button variant="secondary" onClick={() => setIsModalOpen(true)}><Plus size={18} /> Create Post</Button>
            <Link to="/emergency" className="dashboard-danger-link"><AlertCircle size={18} /> Report Emergency</Link>
          </div>
        </section>

        {createNotice.message ? (
          <div className={`smart-form-notice smart-form-notice--${createNotice.type || "info"}`}>
            {createNotice.message}
          </div>
        ) : null}


        <section className="quick-actions-section">
          <div className="section-header compact-section-header">
            <div><h2>Quick Actions</h2><p className="section-subtitle">Access the main barangay services in one click.</p></div>
          </div>
          <div className="quick-actions-grid quick-actions-grid--resident resident-service-grid">
            <Link to="/emergency" className="quick-action-card resident-service-card danger-action">
              <span className="resident-service-icon"><AlertCircle size={24} /></span>
              <div className="resident-service-copy"><strong>Emergency</strong><span>Send an urgent report to your barangay.</span></div>
            </Link>
            <Link to="/jobs" className="quick-action-card resident-service-card">
              <span className="resident-service-icon"><Briefcase size={24} /></span>
              <div className="resident-service-copy"><strong>Jobs</strong><span>Find work, hire workers, or manage job requests.</span></div>
            </Link>
            <Link to="/lost-found" className="quick-action-card resident-service-card">
              <span className="resident-service-icon"><Search size={24} /></span>
              <div className="resident-service-copy"><strong>Lost & Found</strong><span>Post, search, or monitor lost items, pets, and cases.</span></div>
            </Link>
            <Link to="/appointment-request" className="quick-action-card resident-service-card">
              <span className="resident-service-icon"><CalendarDays size={24} /></span>
              <div className="resident-service-copy"><strong>Appointment</strong><span>Request documents and track your schedule.</span></div>
            </Link>
            <Link to="/announcements" className="quick-action-card resident-service-card">
              <span className="resident-service-icon"><Megaphone size={24} /></span>
              <div className="resident-service-copy"><strong>Announcements</strong><span>Read official barangay updates and advisories.</span></div>
            </Link>
            <Link to="/chat" className="quick-action-card resident-service-card">
              <span className="resident-service-icon"><MessageSquare size={24} /></span>
              <div className="resident-service-copy"><strong>Messages</strong><span>Open case chats and resident conversations.</span></div>
            </Link>
            <Link to="/profile" className="quick-action-card resident-service-card">
              <span className="resident-service-icon"><User size={24} /></span>
              <div className="resident-service-copy"><strong>Profile</strong><span>Manage your account and personal information.</span></div>
            </Link>
          </div>
        </section>

        <section className="stats-section">
          <Card elevated>
            <div className="stats-grid resident-stats-grid">
              <div className="stat-item"><div className="stat-value">{data.stats.pendingAppointments}</div><div className="stat-label">Pending Appointments</div></div>
              <div className="stat-item"><div className="stat-value">{data.stats.unreadNotifications}</div><div className="stat-label">Unread Notifications</div></div>
              <div className="stat-item"><div className="stat-value">{data.stats.unreadChats}</div><div className="stat-label">Unread Messages</div></div>
              <div className="stat-item"><div className="stat-value">{data.stats.activeAlerts}</div><div className="stat-label">Active Alerts</div></div>
            </div>
          </Card>
        </section>

        <section className="dashboard-overview-grid">
          <Card elevated className="dashboard-panel emergency-alert-panel">
            <CardHeader><div className="panel-title-row"><div><h2>My Emergency Reports</h2><p className="section-subtitle">Private emergency cases you submitted and need to monitor.</p></div><Link to="/emergency" className="panel-link">View all <ChevronRight size={16} /></Link></div></CardHeader>
            <CardContent>
              {data.activeEmergencies.length ? <div className="dashboard-list">{data.activeEmergencies.map((item) => (
                <Link to="/emergency" className="dashboard-list-item emergency-list-item" key={item.id}>
                  <span className="list-icon danger-icon"><AlertCircle size={18} /></span>
                  <div className="list-main"><strong>{item.title}</strong><span>{item.description}</span><small><MapPin size={13} /> {item.barangay} • {item.timestamp || formatRecordAge(item)}</small></div>
                  <Badge variant={badgeForStatus(item.status)} size="sm">{item.status}</Badge>
                </Link>
              ))}</div> : <div className="dashboard-empty-state"><AlertCircle size={28} /><p>No active emergency reports from your account.</p></div>}
            </CardContent>
          </Card>

          <Card elevated className="dashboard-panel appointment-status-panel">
            <CardHeader><div className="panel-title-row"><div><h2>Appointment Status</h2><p className="section-subtitle">Track your latest document request.</p></div><Link to="/appointment-request" className="panel-link">Open <ChevronRight size={16} /></Link></div></CardHeader>
            <CardContent>
              {data.latestAppointment ? (
                <div className="appointment-summary-card">
                  <div className="appointment-summary-card__top"><FileText size={22} /><Badge variant={badgeForStatus(data.latestAppointment.status)}>{data.latestAppointment.status}</Badge></div>
                  <h3>{data.latestAppointment.serviceType}</h3>
                  <p>{data.latestAppointment.purpose || "No purpose added."}</p>
                  <div className="appointment-meta-grid"><span><CalendarDays size={14} /> {displayDate(data.latestAppointment.preferredDate)}</span><span>{data.latestAppointment.preferredTime || "No time"}</span></div>
                  {data.latestAppointment.adminNotes ? <small className="admin-note">Admin note: {data.latestAppointment.adminNotes}</small> : null}
                </div>
              ) : <div className="dashboard-empty-state"><CalendarDays size={28} /><p>No appointment request yet.</p><Link to="/appointment-request">Request now</Link></div>}
            </CardContent>
          </Card>
        </section>

        <section className="dashboard-overview-grid equal-panels">
          <DashboardPanel title="Recent Notifications" subtitle="Latest updates connected to your account." link="/notifications" linkText="View all">
            {data.notifications.length ? <div className="dashboard-list compact-list">{data.notifications.map((item) => (
              <Link
                to={getNotificationPath?.(item, user) || "/notifications"}
                onClick={() => markNotificationRead?.(item.id, user)}
                className={`notification-preview ${item.read ? "is-read" : "is-unread"}`}
                key={item.id}
              >
                <Bell size={16} /><div><strong>{item.title || item.message}</strong><span>{item.message}</span><small>{item.timestamp || formatRecordAge(item)}</small></div>
              </Link>
            ))}</div> : <div className="dashboard-empty-state"><Bell size={28} /><p>No notifications yet.</p></div>}
          </DashboardPanel>

          <DashboardPanel title="Barangay Announcements" subtitle="Official posts from your barangay admin." link="/announcements" linkText="Open">
            {data.announcements.length ? <div className="dashboard-list compact-list">{data.announcements.map((item) => (
              <Link to={`/announcements/${item.id}?from=dashboard`} className="announcement-preview" key={item.id}>
                <div className="announcement-preview__top"><strong>{item.title}</strong>{item.isPinned ? <Badge variant="warning" size="sm">Pinned</Badge> : null}</div>
                <p>{item.body}</p><small>{item.category || "Announcement"} • {formatRecordAge(item)} • {item.createdBy}</small>
              </Link>
            ))}</div> : <div className="dashboard-empty-state"><Megaphone size={28} /><p>No announcements yet.</p></div>}
          </DashboardPanel>
        </section>

        <section className="dashboard-overview-grid equal-panels">
          <DashboardPanel title="Latest Job Posts" subtitle="Work opportunities in your barangay." link="/jobs" linkText="Jobs">
            {data.latestJobs.length ? <PostPreviewList posts={data.latestJobs} type="job" /> : <div className="dashboard-empty-state"><Briefcase size={28} /><p>No job posts yet.</p></div>}
          </DashboardPanel>
          <DashboardPanel title="Latest Lost & Found" subtitle="Lost and found concerns near you." link="/lost-found" linkText="Open">
            {data.latestLostFound.length ? <PostPreviewList posts={data.latestLostFound} type="lostFound" /> : <div className="dashboard-empty-state"><Search size={28} /><p>No lost and found posts yet.</p></div>}
          </DashboardPanel>
        </section>

      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create New Post" size="lg">
        <form onSubmit={handleCreatePost} className="create-post-form">
          {createNotice.message ? (
            <div className={`smart-form-notice smart-form-notice--${createNotice.type || "info"}`}>
              {createNotice.message}
            </div>
          ) : null}
          <div className="form-group"><label className="input-label">Post Type</label><select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })} className="input"><option value="job">Job Opportunity</option><option value="help">Help Request</option><option value="lost">Lost Item</option><option value="found">Found Item</option></select></div>
          <Input label="Title" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required />
          <div className="form-group"><label className="input-label">Description</label><textarea className="input" rows="5" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} required /></div>
          <div className="form-group"><label className="input-label">Upload Pictures</label><ImageUploader onImageSelect={(images) => setFormData({ ...formData, images: Array.isArray(images) ? images : images ? [images] : [] })} multiple initialImages={formData.images} /></div>
          {formData.type === "job" && (
            <div className="smart-grid three">
              <Input label="Rate Amount" type="number" min="0" value={formData.rateAmount} onChange={(e) => setFormData({ ...formData, rateAmount: e.target.value })} placeholder="700" />
              <div className="form-group"><label className="input-label">Rate Period</label><select className="input" value={formData.ratePeriod} onChange={(e) => setFormData({ ...formData, ratePeriod: e.target.value })}><option value="day">per day</option><option value="week">per week</option><option value="project">per project</option></select></div>
              <Input label="Slots" type="number" min="1" value={formData.slots} onChange={(e) => setFormData({ ...formData, slots: e.target.value })} />
            </div>
          )}
          <div className="form-group barangay-lock-field"><label className="input-label">Barangay</label><div className="locked-barangay-display"><MapPin size={16} /> {user?.barangay || "Your barangay"}</div><small>Resident posts are locked to the logged-in resident barangay.</small></div>
          <div className="modal-actions"><Button variant="secondary" onClick={() => setIsModalOpen(false)} disabled={isCreatingPost}>Cancel</Button><Button variant="primary" type="submit" disabled={isCreatingPost} isLoading={isCreatingPost}>{isCreatingPost ? "Publishing..." : "Publish Post"}</Button></div>
        </form>
      </Modal>
    </ResidentLayout>
  );
}

function DashboardPanel({ title, subtitle, link, linkText, children }) {
  return (
    <Card elevated className="dashboard-panel">
      <CardHeader><div className="panel-title-row"><div><h2>{title}</h2><p className="section-subtitle">{subtitle}</p></div>{link ? <Link to={link} className="panel-link">{linkText} <ChevronRight size={16} /></Link> : null}</div></CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function PostPreviewList({ posts, type }) {
  return (
    <div className="dashboard-list">
      {posts.map((post) => (
        <Link to={`/post/${post.id}`} className="dashboard-list-item" key={post.id}>
          <span className="list-icon">{type === "job" ? <Briefcase size={18} /> : <Search size={18} />}</span>
          <div className="list-main"><strong>{post.title}</strong><span>{post.description}</span><small>{type === "job" ? <><Users size={13} /> {post.interests || 0} interested • {post.salary || post.contactPreference || "Chat"} • {formatRecordAge(post)}</> : <><MapPin size={13} /> {post.barangay} • {post.reward || `${post.interests || 0} responses`} • {formatRecordAge(post)}</>}</small></div>
          <Badge variant={type === "job" ? "job" : post.type} size="sm">{type === "job" ? "Job" : post.type}</Badge>
        </Link>
      ))}
    </div>
  );
}

export default Dashboard;
