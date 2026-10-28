import React, { useMemo, useState } from "react";
import { Search, MapPin, MessageSquare, Shield, Trash2, CheckCircle, Eye, Route } from "lucide-react";
import Card, { CardContent } from "../../components/Card";
import Badge from "../../components/Badge";
import Button from "../../components/Button";
import Input from "../../components/Input";
import AdminLayout from "../../components/AdminLayout";
import { useNavigate } from "react-router-dom";
import { useApp } from "../../context/AppContext";
import { useAuth } from "../../context/AuthContext";
import { getJobAdminRole, getJobHomeBarangay, getJobRouteLabel, getJobWorkBarangay } from "../../utils/jobMatching";
import "../../styles/pages/Skeleton.css";

const jobTypeLabel = (type) => (type === "seeking" ? "Job Seeking" : "Job Hiring");

const statusVariant = (status) => {
  if (status === "Flagged") return "warning";
  if (status === "Removed") return "danger";
  if (status === "Closed") return "secondary";
  return "success";
};

function JobMonitoringPage() {
  const { allPosts, updatePost, removePostByAdmin, reports } = useApp();
  const { user } = useAuth();
  const navigate = useNavigate();

  // useState: Search/filter keyword para sa admin job monitoring.
  const [search, setSearch] = useState("");
  // useState: Status filter para makita ng admin ang active, flagged, closed, removed.
  const [statusFilter, setStatusFilter] = useState("all");
  // useState: Type filter para sa Job Hiring at Job Seeking.
  const [typeFilter, setTypeFilter] = useState("all");
  // useState: Admin role filter para makita ang primary vs support cross-barangay jobs.
  const [roleFilter, setRoleFilter] = useState("all");

  const jobPosts = useMemo(() => allPosts.filter((post) => {
    if (post.type !== "job") return false;
    const workBarangay = getJobWorkBarangay(post);
    const homeBarangay = getJobHomeBarangay(post);
    const supportBarangays = Array.isArray(post.supportBarangays) ? post.supportBarangays : [];
    return workBarangay === user?.barangay || homeBarangay === user?.barangay || supportBarangays.includes(user?.barangay);
  }), [allPosts, user?.barangay]);

  const jobReports = reports.filter(
    (report) =>
      (report.handlerBarangay || report.incidentBarangay || report.barangay) === user?.barangay &&
      ["job_post", "post"].includes(report.targetType),
  );

  const primaryJobs = jobPosts.filter((post) => getJobAdminRole(post, user).canModerate);
  const supportJobs = jobPosts.filter((post) => !getJobAdminRole(post, user).canModerate && post.isCrossBarangay);

  const filteredJobs = useMemo(() => {
    const query = search.toLowerCase();

    return jobPosts.filter((post) => {
      const adminRole = getJobAdminRole(post, user);
      const matchesRole =
        roleFilter === "all" ||
        (roleFilter === "primary" && adminRole.canModerate) ||
        (roleFilter === "support" && !adminRole.canModerate && post.isCrossBarangay);
      const matchesStatus = statusFilter === "all" || post.status === statusFilter;
      const matchesType =
        typeFilter === "all" || post.opportunityType === typeFilter || !post.opportunityType;
      const matchesSearch =
        !query ||
        (post.title || "").toLowerCase().includes(query) ||
        (post.description || "").toLowerCase().includes(query) ||
        (post.author?.name || "").toLowerCase().includes(query) ||
        (post.category || "").toLowerCase().includes(query) ||
        getJobRouteLabel(post).toLowerCase().includes(query);

      return matchesRole && matchesStatus && matchesType && matchesSearch;
    });
  }, [jobPosts, search, statusFilter, typeFilter, roleFilter, user]);

  const getReportCount = (postId) => jobReports.filter((report) => report.targetId === postId).length;

  const handleRemove = (post) => {
    if (!getJobAdminRole(post, user).canModerate) {
      window.alert("Support barangay can monitor this job only. The work-location barangay handles removal.");
      return;
    }
    const note =
      window.prompt(
        "Admin removal note:",
        "Removed due to suspicious or inappropriate job post details.",
      ) || "Removed by barangay admin after review.";
    removePostByAdmin(post.id, user, note);
  };

  const handleFlag = (post) => {
    if (!getJobAdminRole(post, user).canModerate) {
      window.alert("Support barangay can monitor this job only. The work-location barangay handles flagging.");
      return;
    }
    const note =
      window.prompt(
        "Admin flag note:",
        "Flagged for barangay admin review.",
      ) || "Flagged for barangay admin review.";
    updatePost(post.id, {
      status: "Flagged",
      moderationNote: note,
      moderatedBy: user?.id,
      moderatedAt: new Date().toISOString(),
      notificationTitle: "Job Post Flagged",
      notificationMessage: `Your job post "${post.title}" was flagged by the barangay admin. Reason: ${note}`,
      notificationPriority: "medium",
    });
  };

  const handleClose = (post) => {
    if (!getJobAdminRole(post, user).canModerate) {
      window.alert("Support barangay can monitor this job only. The work-location barangay handles closing.");
      return;
    }
    updatePost(post.id, {
      status: "Closed",
      moderationNote: "Closed by barangay admin.",
      moderatedBy: user?.id,
      moderatedAt: new Date().toISOString(),
      notificationTitle: "Job Post Closed",
      notificationMessage: `Your job post "${post.title}" was closed by the barangay admin.`,
      notificationPriority: "medium",
    });
  };

  const handleKeepActive = (post) => {
    if (!getJobAdminRole(post, user).canModerate) {
      window.alert("Support barangay can monitor this job only. The work-location barangay handles moderation actions.");
      return;
    }
    updatePost(post.id, {
      status: "Active",
      moderationNote: "",
      moderatedBy: user?.id,
      moderatedAt: new Date().toISOString(),
      notificationTitle: "Job Post Kept Active",
      notificationMessage: `Your job post "${post.title}" was reviewed and kept active by the barangay admin.`,
    });
  };

  return (
    <AdminLayout
      title="Job Monitoring"
      subtitle="Review job posts by work location. Cross-barangay jobs show Primary Handler or Support Visibility so admins know exactly what to do."
    >
      <div className="metric-grid">
        <Card className="metric-card" elevated>
          <p className="metric-label">Visible Job Posts</p>
          <p className="metric-value">{jobPosts.length}</p>
        </Card>
        <Card className="metric-card" elevated>
          <p className="metric-label">Primary Handler</p>
          <p className="metric-value">{primaryJobs.length}</p>
        </Card>
        <Card className="metric-card" elevated>
          <p className="metric-label">Support Visibility</p>
          <p className="metric-value">{supportJobs.length}</p>
        </Card>
        <Card className="metric-card" elevated>
          <p className="metric-label">Resident Responses</p>
          <p className="metric-value">{jobPosts.reduce((sum, post) => sum + ((post.responses || []).length || 0), 0)}</p>
        </Card>
      </div>

      <Card elevated style={{ marginBottom: "1rem" }}>
        <CardContent>
          <div className="toolbar-row" style={{ alignItems: "flex-start", marginBottom: "0.85rem" }}>
            <div>
              <h3 style={{ marginBottom: "0.25rem" }}>Admin action guide</h3>
              <p style={{ margin: 0, color: "var(--foreground-muted)" }}>
                Primary Handler can keep active, flag, close, or remove. Support Visibility can monitor resident activity only.
              </p>
            </div>
            <Badge variant="job">Cross-barangay aware</Badge>
          </div>
          <div className="filters-row">
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search job title, author, category, barangay, or description" icon={Search} />
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="all">All types</option>
              <option value="hiring">Job Hiring</option>
              <option value="seeking">Job Seeking</option>
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All statuses</option>
              <option value="Active">Active</option>
              <option value="Flagged">Flagged</option>
              <option value="Closed">Closed</option>
              <option value="Removed">Removed</option>
            </select>
            <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
              <option value="all">All admin roles</option>
              <option value="primary">Primary Handler</option>
              <option value="support">Support Visibility</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <div className="list-stack">
        {filteredJobs.length > 0 ? (
          filteredJobs.map((post) => {
            const reportCount = getReportCount(post.id);
            const adminRole = getJobAdminRole(post, user);
            const workBarangay = getJobWorkBarangay(post);
            const homeBarangay = getJobHomeBarangay(post);

            return (
              <Card key={post.id} elevated>
                <CardContent>
                  <div className="toolbar-row" style={{ alignItems: "flex-start" }}>
                    <div>
                      <div className="pill-row" style={{ marginBottom: "0.5rem" }}>
                        <Badge variant="job">{jobTypeLabel(post.opportunityType)}</Badge>
                        <Badge variant="secondary">{post.category || "General"}</Badge>
                        <Badge variant={statusVariant(post.status)}>{post.status || "Active"}</Badge>
                        <Badge variant={adminRole.variant}>{adminRole.label}</Badge>
                        {post.isCrossBarangay ? <Badge variant="warning">Cross-barangay</Badge> : null}
                        {reportCount > 0 ? <Badge variant="danger">{reportCount} report(s)</Badge> : null}
                      </div>
                      <h3 style={{ marginBottom: "0.25rem" }}>{post.title}</h3>
                      <p style={{ marginBottom: 0 }}>{post.description}</p>
                    </div>
                    {post.salary ? <Badge variant="success">{post.salary}</Badge> : null}
                  </div>

                  <div className="meta-row" style={{ marginBottom: "1rem", marginTop: "1rem" }}>
                    <span><MapPin size={14} style={{ verticalAlign: "middle" }} /> Work area: {workBarangay || post.barangay}</span>
                    {post.isCrossBarangay ? <span><Route size={14} style={{ verticalAlign: "middle" }} /> {homeBarangay} → {workBarangay}</span> : null}
                    <span>{post.author?.name || "Resident"}</span>
                    <span>{post.contactPreference || "Chat"}</span>
                    <span><MessageSquare size={14} style={{ verticalAlign: "middle" }} /> {(post.responses || []).length} response(s)</span>
                  </div>

                  <div style={{ padding: "0.85rem", borderRadius: "14px", background: "var(--surface-soft)", marginBottom: "1rem" }}>
                    <strong>{adminRole.label}</strong>
                    <p style={{ margin: "0.25rem 0 0", color: "var(--foreground-muted)" }}>{adminRole.helper}</p>
                  </div>

                  {post.moderationNote ? (
                    <div style={{ padding: "0.85rem", borderRadius: "14px", background: "var(--surface-soft)", marginBottom: "1rem" }}>
                      <strong>Moderation note:</strong> {post.moderationNote}
                    </div>
                  ) : null}

                  {(post.responses || []).length > 0 ? (
                    <div style={{ padding: "0.85rem", borderRadius: "14px", background: "var(--surface-soft)", marginBottom: "1rem" }}>
                      <strong>Resident responses</strong>
                      <div className="meta-row" style={{ marginTop: "0.5rem" }}>
                        {post.responses.slice(0, 4).map((response) => (
                          <span key={response.id}>{response.userName} • {response.barangay || "No barangay"} • {response.timestamp}</span>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <div className="inline-actions">
                    <Button size="sm" variant="secondary" onClick={() => navigate(`/admin/post/${post.id}`)}>
                      <Eye size={16} /> View Details
                    </Button>
                    <Button size="sm" variant="success" onClick={() => handleKeepActive(post)} disabled={!adminRole.canModerate}>
                      <CheckCircle size={16} /> Keep Active
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleFlag(post)} disabled={!adminRole.canModerate}>
                      <Shield size={16} /> Flag
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleClose(post)} disabled={!adminRole.canModerate}>
                      Close
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => handleRemove(post)} disabled={!adminRole.canModerate}>
                      <Trash2 size={16} /> Remove
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <Card elevated>
            <div className="empty-state">No job posts match the current admin filters.</div>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}

export default JobMonitoringPage;
