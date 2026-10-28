import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Bell,
  CheckCircle2,
  Clock,
  Edit2,
  Eye,
  Megaphone,
  MapPin as Pin,
  Plus,
  Search,
  Send,
  Target,
  Trash2,
  Users,
} from "lucide-react";
import Card, { CardContent } from "../../components/Card";
import Badge from "../../components/Badge";
import Button from "../../components/Button";
import Modal from "../../components/Modal";
import Input from "../../components/Input";
import AdminLayout from "../../components/AdminLayout";
import { useApp } from "../../context/AppContext";
import { useAuth } from "../../context/AuthContext";

const ANNOUNCEMENT_CATEGORIES = [
  "General Notice",
  "Emergency Advisory",
  "Service Reminder",
  "Lost & Found Bulletin",
  "Job Announcement",
  "Community Event",
];

const ACTION_OPTIONS = [
  { value: "Read Announcement", path: "", label: "Read only" },
  { value: "Open Notifications", path: "/notifications", label: "Open notification center" },
  { value: "View Jobs", path: "/jobs", label: "Go to Jobs" },
  { value: "Open Lost & Found", path: "/lost-found", label: "Go to Lost & Found" },
  { value: "Request Appointment", path: "/appointment-request", label: "Request appointment" },
  { value: "Report Emergency", path: "/emergency", label: "Open emergency page" },
];

const emptyForm = {
  title: "",
  body: "",
  priority: "medium",
  category: "General Notice",
  targetMode: "barangay",
  targetBarangays: [],
  expiresAt: "",
  actionLabel: "Read Announcement",
  actionPath: "",
  isPinned: false,
  audience: "Residents",
  status: "Published",
};

const formatDate = (value) => {
  if (!value) return "No date";
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

const getTargetLabel = (announcement = {}) => {
  if (announcement.targetMode === "all") return "All San Miguel residents";
  if (announcement.targetMode === "specific") {
    const count = announcement.targetBarangays?.length || 0;
    return count ? `${count} selected barangay${count === 1 ? "" : "s"}` : "Selected barangays";
  }
  return announcement.barangay || "My barangay";
};

const isExpired = (announcement = {}) => {
  if (!announcement.expiresAt) return false;
  const expires = new Date(announcement.expiresAt).getTime();
  return !Number.isNaN(expires) && expires < Date.now();
};

function AnnouncementManagementPage() {
  const { announcements, barangays, createAnnouncement, updateAnnouncement, deleteAnnouncement } = useApp();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const focusedAnnouncementId = searchParams.get("announcement") || "";
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [formData, setFormData] = useState(emptyForm);

  useEffect(() => {
    if (focusedAnnouncementId) setPriorityFilter("all");
  }, [focusedAnnouncementId]);

  const barangayOptions = useMemo(
    () => (Array.isArray(barangays) ? barangays : [])
      .map((item) => (typeof item === "string" ? item : item?.name))
      .filter((name) => name && name !== "Select Barangay"),
    [barangays],
  );

  const scopedAnnouncements = useMemo(
    () => announcements
      .filter((announcement) => announcement.createdById === user?.id || announcement.barangay === user?.barangay)
      .sort((a, b) => {
        const pinnedDiff = Number(Boolean(b.isPinned)) - Number(Boolean(a.isPinned));
        if (pinnedDiff) return pinnedDiff;
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      }),
    [announcements, user?.barangay, user?.id],
  );

  const filteredAnnouncements = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return scopedAnnouncements.filter((announcement) => {
      const matchesPriority = priorityFilter === "all" || announcement.priority === priorityFilter || (priorityFilter === "expired" && isExpired(announcement));
      const searchable = `${announcement.title || ""} ${announcement.body || ""} ${announcement.category || ""} ${getTargetLabel(announcement)}`.toLowerCase();
      return matchesPriority && (!query || searchable.includes(query));
    });
  }, [priorityFilter, scopedAnnouncements, searchQuery]);

  const stats = useMemo(() => ({
    total: scopedAnnouncements.length,
    active: scopedAnnouncements.filter((item) => item.status === "Published" && !isExpired(item)).length,
    pinned: scopedAnnouncements.filter((item) => item.isPinned).length,
    high: scopedAnnouncements.filter((item) => item.priority === "high").length,
    targeted: scopedAnnouncements.filter((item) => item.targetMode === "specific" || item.targetMode === "all").length,
  }), [scopedAnnouncements]);

  const openCreateModal = () => {
    setEditingAnnouncement(null);
    setFormData({ ...emptyForm, targetBarangays: [user?.barangay].filter(Boolean) });
    setIsModalOpen(true);
  };

  const openEditModal = (announcement) => {
    setEditingAnnouncement(announcement);
    setFormData({
      title: announcement.title || "",
      body: announcement.body || "",
      priority: announcement.priority || "medium",
      category: announcement.category || "General Notice",
      targetMode: announcement.targetMode || "barangay",
      targetBarangays: announcement.targetBarangays?.length ? announcement.targetBarangays : [announcement.barangay || user?.barangay].filter(Boolean),
      expiresAt: announcement.expiresAt || "",
      actionLabel: announcement.actionLabel || "Read Announcement",
      actionPath: announcement.actionPath || "",
      isPinned: Boolean(announcement.isPinned),
      audience: announcement.audience || "Residents",
      status: announcement.status || "Published",
    });
    setIsModalOpen(true);
  };

  const handleTargetModeChange = (targetMode) => {
    setFormData((data) => ({
      ...data,
      targetMode,
      targetBarangays: targetMode === "specific" ? data.targetBarangays : [user?.barangay].filter(Boolean),
    }));
  };

  const toggleTargetBarangay = (barangay) => {
    setFormData((data) => {
      const current = new Set(data.targetBarangays || []);
      if (current.has(barangay)) current.delete(barangay);
      else current.add(barangay);
      return { ...data, targetBarangays: [...current] };
    });
  };

  const handleActionChange = (actionLabel) => {
    const selected = ACTION_OPTIONS.find((item) => item.value === actionLabel);
    setFormData((data) => ({ ...data, actionLabel, actionPath: selected?.path || "" }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.body.trim()) return;
    if (formData.targetMode === "specific" && !formData.targetBarangays.length) return;

    const targetBarangays = formData.targetMode === "specific"
      ? formData.targetBarangays
      : formData.targetMode === "barangay"
        ? [user?.barangay].filter(Boolean)
        : [];

    const payload = {
      ...formData,
      targetBarangays,
      title: formData.title.trim(),
      body: formData.body.trim(),
      barangay: user?.barangay || "Poblacion",
      createdBy: user?.name || "Barangay Admin",
      createdById: user?.id || "user-admin-1",
      audience: formData.targetMode === "all"
        ? "All San Miguel residents"
        : formData.targetMode === "specific"
          ? `${targetBarangays.length} selected barangay${targetBarangays.length === 1 ? "" : "s"}`
          : "Residents",
    };

    if (editingAnnouncement) {
      updateAnnouncement(editingAnnouncement.id, {
        ...payload,
        announceUpdate: true,
      });
    } else {
      createAnnouncement(payload);
    }

    setFormData(emptyForm);
    setEditingAnnouncement(null);
    setIsModalOpen(false);
  };

  const handleTogglePin = (announcement) => {
    updateAnnouncement(announcement.id, {
      isPinned: !announcement.isPinned,
      announceUpdate: false,
    });
  };

  const handleDelete = (announcement) => {
    if (window.confirm(`Delete announcement: ${announcement.title}?`)) {
      deleteAnnouncement(announcement.id);
    }
  };

  return (
    <AdminLayout
      title="Announcement Management"
      subtitle="Create targeted official notices with clear resident actions, priority, expiry, and barangay scope."
      actions={<Button variant="primary" onClick={openCreateModal}><Plus size={18} /> New Smart Announcement</Button>}
    >
      <section className="smart-announcement-brief" style={{ marginBottom: "1.25rem" }}>
        <Card elevated>
          <CardContent>
            <div className="toolbar-row">
              <div>
                <Badge variant="job">Smart communication</Badge>
                <h3 style={{ margin: "0.5rem 0 0.25rem" }}>One announcement, clear audience, clear action.</h3>
                <p style={{ margin: 0 }}>Choose who receives it, what type it is, when it expires, and what residents should do after reading.</p>
              </div>
              <div className="inline-actions">
                <Badge variant="secondary"><Target size={13} /> Barangay / Selected / All</Badge>
                <Badge variant="warning"><Clock size={13} /> Expiry aware</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="stats-section" style={{ marginBottom: "1.25rem" }}>
        <Card elevated>
          <div className="stats-grid resident-stats-grid">
            <div className="stat-item"><div className="stat-value">{stats.total}</div><div className="stat-label">Total</div></div>
            <div className="stat-item"><div className="stat-value">{stats.active}</div><div className="stat-label">Active</div></div>
            <div className="stat-item"><div className="stat-value">{stats.pinned}</div><div className="stat-label">Pinned</div></div>
            <div className="stat-item"><div className="stat-value">{stats.targeted}</div><div className="stat-label">Targeted</div></div>
            <div className="stat-item"><div className="stat-value">{stats.high}</div><div className="stat-label">High Priority</div></div>
          </div>
        </Card>
      </section>

      <section className="notification-controls admin-notification-controls" style={{ marginBottom: "1.25rem" }}>
        <div className="notification-search">
          <Search size={18} />
          <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search title, category, target, or body..." />
        </div>
        <div className="notification-filter-row">
          {["all", "high", "medium", "low", "expired"].map((priority) => (
            <button key={priority} className={priorityFilter === priority ? "active" : ""} onClick={() => setPriorityFilter(priority)}>
              {priority === "all" ? "All" : priority}
            </button>
          ))}
        </div>
      </section>

      <div className="list-stack">
        {focusedAnnouncementId ? (
          <div className="admin-announcement-focus-banner">
            Opened from notification. The exact announcement is highlighted below when it belongs to your barangay workspace.
          </div>
        ) : null}

        {filteredAnnouncements.length ? filteredAnnouncements.map((announcement) => (
          <Card key={announcement.id} elevated className={String(announcement.id) === String(focusedAnnouncementId) ? "admin-announcement-card is-focused" : "admin-announcement-card"}>
            <CardContent>
              <div className="toolbar-row">
                <div>
                  <div className="pill-row" style={{ marginBottom: "0.5rem" }}>
                    <Badge variant={announcement.priority === "high" ? "danger" : announcement.priority === "medium" ? "warning" : "secondary"}>{announcement.priority}</Badge>
                    <Badge variant="secondary">{announcement.category || "General Notice"}</Badge>
                    {announcement.isPinned ? <Badge variant="job">Pinned</Badge> : null}
                    {isExpired(announcement) ? <Badge variant="danger">Expired</Badge> : <Badge variant="secondary">{announcement.status || "Published"}</Badge>}
                  </div>
                  <h3 style={{ marginBottom: "0.25rem" }}>{announcement.title}</h3>
                  <p style={{ marginBottom: 0 }}>{announcement.body}</p>
                </div>
                <div className="inline-actions">
                  <Button size="sm" variant="outline" onClick={() => handleTogglePin(announcement)}><Pin size={14} /> {announcement.isPinned ? "Unpin" : "Pin"}</Button>
                  <Button size="sm" variant="secondary" onClick={() => openEditModal(announcement)}><Edit2 size={14} /> Edit</Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(announcement)}><Trash2 size={14} /> Delete</Button>
                </div>
              </div>

              <div className="meta-row">
                <span><Users size={13} /> {getTargetLabel(announcement)}</span>
                <span><Send size={13} /> {announcement.actionLabel || "Read Announcement"}</span>
                <span>By {announcement.createdBy}</span>
                <span>{formatDate(announcement.createdAt)}</span>
                {announcement.expiresAt ? <span><Clock size={13} /> Expires {formatDate(announcement.expiresAt)}</span> : null}
              </div>
            </CardContent>
          </Card>
        )) : (
          <Card>
            <div className="empty-notif">
              <Megaphone size={48} />
              <p>No announcements found for this filter.</p>
            </div>
          </Card>
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingAnnouncement ? "Edit Smart Announcement" : "Create Smart Announcement"}
        subtitle="Residents should know who it is for, how urgent it is, and what they should do next at first sight."
        size="lg"
      >
        <form onSubmit={handleSubmit} className="form-grid">
          <div className="full-span">
            <Input label="Title" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required />
          </div>
          <div>
            <label className="input-label">Category</label>
            <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })}>
              {ANNOUNCEMENT_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
            </select>
          </div>
          <div>
            <label className="input-label">Priority</label>
            <select value={formData.priority} onChange={(e) => setFormData({ ...formData, priority: e.target.value })}>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          <div>
            <label className="input-label">Target audience</label>
            <select value={formData.targetMode} onChange={(e) => handleTargetModeChange(e.target.value)}>
              <option value="barangay">My barangay only</option>
              <option value="specific">Specific barangays</option>
              <option value="all">All San Miguel residents</option>
            </select>
          </div>
          <div>
            <label className="input-label">Resident action</label>
            <select value={formData.actionLabel} onChange={(e) => handleActionChange(e.target.value)}>
              {ACTION_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </div>
          <div>
            <label className="input-label">Pin to dashboard</label>
            <select value={formData.isPinned ? "yes" : "no"} onChange={(e) => setFormData({ ...formData, isPinned: e.target.value === "yes" })}>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </div>
          <div>
            <label className="input-label">Expires at optional</label>
            <input type="datetime-local" value={formData.expiresAt} onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })} />
          </div>

          {formData.targetMode === "specific" ? (
            <div className="full-span">
              <label className="input-label">Select barangays</label>
              <div className="notification-filter-row" style={{ maxHeight: 180, overflowY: "auto", justifyContent: "flex-start" }}>
                {barangayOptions.map((barangay) => (
                  <button
                    type="button"
                    key={barangay}
                    className={formData.targetBarangays.includes(barangay) ? "active" : ""}
                    onClick={() => toggleTargetBarangay(barangay)}
                  >
                    {formData.targetBarangays.includes(barangay) ? <CheckCircle2 size={14} /> : null}{barangay}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="full-span">
            <label className="input-label">Announcement Body</label>
            <textarea rows="5" value={formData.body} onChange={(e) => setFormData({ ...formData, body: e.target.value })} placeholder="Write the official announcement details here." required />
          </div>

          <div className="full-span">
            <Card>
              <CardContent>
                <div className="meta-row">
                  <span><Eye size={13} /> Preview target: {formData.targetMode === "all" ? "All San Miguel residents" : formData.targetMode === "specific" ? `${formData.targetBarangays.length} selected barangay${formData.targetBarangays.length === 1 ? "" : "s"}` : user?.barangay}</span>
                  <span><Bell size={13} /> Notification action: {formData.actionLabel}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="full-span" style={{ display: "flex", justifyContent: "end", gap: "0.75rem" }}>
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary">{editingAnnouncement ? "Save and Notify" : "Publish Smart Announcement"}</Button>
          </div>
        </form>
      </Modal>
    </AdminLayout>
  );
}

export default AnnouncementManagementPage;
