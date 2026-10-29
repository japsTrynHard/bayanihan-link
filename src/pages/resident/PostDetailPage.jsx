import React from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  MapPin,
  Users,
  MessageSquare,
  Shield,
  Trash2,
  Briefcase,
  Clock,
  User,
  Calendar,
  Flag,
  CheckCircle,
} from "lucide-react";
import ResidentLayout from "../../components/ResidentLayout";
import AdminLayout from "../../components/AdminLayout";
import Card, { CardContent, CardHeader } from "../../components/Card";
import Badge from "../../components/Badge";
import Avatar from "../../components/Avatar";
import Button from "../../components/Button";
import { useApp } from "../../context/AppContext";
import { useAuth } from "../../context/AuthContext";
import { getPostImages } from "../../utils/postImages";
import { formatRecordAge } from "../../utils/timeDisplay";
import { getReports } from "../../utils/storage";
import { getLostFoundHomeBarangay, getLostFoundIncidentBarangay, getLostFoundRouteText, isCrossBarangayPost } from "../../utils/lostFoundMatching";
import { getJobHomeBarangay, getJobRouteLabel, getJobWorkBarangay } from "../../utils/jobMatching";
import {
  getLostFoundCaseLabel,
  getLostFoundPrimaryActionLabel,
  getLostFoundResponseText,
  getLostFoundResolvedStatus,
  getLostFoundStatusOptions,
} from "../../utils/lostFoundCases";
import SmartMediaImage from "../../components/SmartMediaImage";
import "../../styles/pages/PostDetail.css";

const jobTypeLabel = (type) => (type === "seeking" ? "Job Seeking" : "Job Hiring");
const itemTypeLabel = (post) => getLostFoundCaseLabel(post);

const statusVariant = (status) => {
  if (status === "Flagged") return "warning";
  if (status === "Removed") return "danger";
  if (status === "Closed" || status === "Slots Full") return "secondary";
  if (["Returned", "Reunited", "Information Verified"].includes(status)) return "success";
  if (status === "Claimed") return "warning";
  return "success";
};

const getItemDate = (post) => {
  if (post.itemDateDisplay) return post.itemDateDisplay;
  if (post.type === "found") return post.dateFound || post.itemDate || "Not specified";
  return post.dateLost || post.itemDate || "Not specified";
};

const getItemPlace = (post) => {
  if (post.type === "found") return post.placeFound || post.itemPlace || post.barangay;
  return post.placeLost || post.itemPlace || post.barangay;
};

const getFilledSlots = (post = {}) => {
  const interested = Array.isArray(post.interestedUserIds) ? post.interestedUserIds.length : 0;
  const responses = Array.isArray(post.responses) ? post.responses.length : 0;
  return Math.max(interested, responses, Number(post.filledSlots || 0));
};

const getTotalSlots = (post = {}) => {
  const total = Number(post.slots || post.availableSlots || post.maxApplicants || 1);
  return Number.isFinite(total) && total > 0 ? total : 1;
};

const getRemainingSlots = (post = {}) => Math.max(getTotalSlots(post) - getFilledSlots(post), 0);
const isSlotsFull = (post = {}) => post.type === "job" && getRemainingSlots(post) <= 0;

const reportTargetsPost = (report, postId) => {
  if (!report || !postId) return false;
  const postKeys = [
    report.targetId,
    report.relatedPost,
    report.postId,
    report.linkedPostId,
  ]
    .filter(Boolean)
    .map((value) => String(value));

  return postKeys.includes(String(postId));
};

const getAdminPostSourceLabel = (source) => {
  if (source === "reports") return "Reports & Complaints";
  if (source === "jobs") return "Job Monitoring";
  if (source === "lost-found") return "Lost & Found Monitoring";
  if (source === "dashboard") return "Admin Dashboard";
  if (source === "emergency") return "Emergency Monitoring";
  return "Admin workspace";
};

function PostDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const {
    getPost,
    respondToJobPost,
    respondToLostFoundPost,
    setJobPostStatus,
    markLostFoundStatus,
    updatePost,
    createReport,
    startChatFromPost,
    getOrCreateChat,
    deletePost,
    removePostByAdmin,
    reports = [],
  } = useApp();
  const post = getPost(id);
  const isAdmin = user?.role === "barangay_admin";
  const source = searchParams.get("source") || "";
  const reportId = searchParams.get("reportId") || "";
  const availableReports = Array.from(
    new Map(
      [
        ...(Array.isArray(reports) ? reports : []),
        ...getReports(),
      ]
        .filter(Boolean)
        .map((report) => [String(report.id), report]),
    ).values(),
  );
  const linkedReport = reportId
    ? availableReports.find((report) => String(report.id) === String(reportId) && reportTargetsPost(report, id))
    : null;
  const isReportReview = Boolean(isAdmin && source === "reports" && reportId && linkedReport && post && reportTargetsPost(linkedReport, post.id));
  const adminSourceLabel = getAdminPostSourceLabel(source);
  const adminBackPath = isReportReview ? "/admin/reports" : -1;

  const renderWithLayout = (children, title = "Post Details", subtitle = "Review the selected community post.") => {
    if (isAdmin) {
      return <AdminLayout title={title} subtitle={subtitle}>{children}</AdminLayout>;
    }
    return <ResidentLayout>{children}</ResidentLayout>;
  };

  if (!post) {
    return renderWithLayout(
      <div className="post-detail-page">
        <div className="container">
          <Card>
            <CardContent>
              <div className="empty-state">
                <Shield size={32} />
                <h3>Post not found</h3>
                <p>The selected post may have been removed or is no longer available.</p>
                <Button variant="outline" onClick={() => navigate(isAdmin ? (source === "reports" ? "/admin/reports" : "/admin/dashboard") : "/dashboard")}>Go Back</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>,
      isAdmin && source === "reports" ? "Reported Post Review" : "Post Details",
      isAdmin && source === "reports" ? "The selected report target is not available." : "The selected post is not available.",
    );
  }

  const postImages = getPostImages(post);
  const isOwnPost = post.author?.id === user?.id;
  const isJobPost = post.type === "job";
  const isLostFoundPost = ["lost", "found"].includes(post.type);
  const isClosed = ["Closed", "Returned", "Reunited", "Information Verified", "Removed"].includes(post.status);
  const slotsFull = isSlotsFull(post);
  const smartStatus = isJobPost && slotsFull && !isClosed ? "Slots Full" : post.status || "Active";
  const isActive = (post.status || "Active") === "Active" && !slotsFull;
  const alreadyResponded = (post.interestedUserIds || []).includes(user?.id);
  const totalSlots = getTotalSlots(post);
  const remainingSlots = getRemainingSlots(post);
  const fromNotifications = searchParams.get("from") === "notifications";
  const highlightResponseId = searchParams.get("responseId") || "";
  const notificationActorId = searchParams.get("actor") || "";
  const highlightedResponse = (post.responses || []).find((response) =>
    String(response.id || "") === String(highlightResponseId) ||
    (notificationActorId && String(response.userId || response.uid || "") === String(notificationActorId)),
  );

  const handleShowInterest = async () => {
    if (isAdmin || isOwnPost || isClosed) return;

    if (isJobPost) {
      const result = await respondToJobPost(post.id, user, "interested").catch((error) => { window.alert(error.message || "Unable to save response."); return null; });
      if (!result || alreadyResponded) window.alert("You already responded to this job post.");
      return;
    }

    if (isLostFoundPost) {
      const result = await respondToLostFoundPost(
        post.id,
        user,
        getLostFoundResponseText(post),
      ).catch((error) => { window.alert(error.message || "Unable to save response."); return null; });
      if (!result || alreadyResponded) window.alert("You already responded to this case.");
    }
  };

  const handleContactUser = async () => {
    if (isAdmin || !user || !post.author || isOwnPost || isClosed) return;
    if (isJobPost) {
      await respondToJobPost(post.id, user, "chat").catch((error) => { window.alert(error.message || "Unable to save response."); return null; });
    }
    if (isLostFoundPost) {
      await respondToLostFoundPost(post.id, user, "Chat started").catch((error) => { window.alert(error.message || "Unable to save response."); return null; });
    }
    const chat = await startChatFromPost(user, post, isJobPost ? "job_detail_chat" : "lost_found_detail_chat")?.catch((error) => { window.alert(error.message || "Unable to open chat. Please try again."); return null; });
    if (chat) navigate(`/chat?chat=${chat.id}`);
  };

  const handleChatWithResponse = async (response) => {
    if (!user || isAdmin || !response?.userId || response.userId === user.id) return;
    const otherUser = {
      id: response.userId,
      uid: response.userId,
      name: response.userName || "Resident",
      barangay: response.barangay || post.barangay || "",
      role: "resident",
    };
    const chat = await getOrCreateChat?.(user, otherUser, {
      relatedPostId: post.id,
      relatedPostTitle: post.title,
      relatedPostType: isJobPost ? "Job Post" : isLostFoundPost ? getLostFoundCaseLabel(post) : "Community Post",
      source: fromNotifications ? "notification_response_detail" : "post_response_detail",
    })?.catch((error) => { window.alert(error.message || "Unable to open chat. Please try again."); return null; });
    if (chat?.id) navigate(`/chat?chat=${chat.id}`);
  };

  const handleReportPost = () => {
    if (!user || isAdmin || isOwnPost) return;
    const reason =
      window.prompt(
        "Reason for reporting this post:",
        isJobPost
          ? "Suspicious or misleading job details"
          : "Possible fake or suspicious lost/found listing",
      ) || "User-submitted post review";

    const reportResult = createReport({
      reportedBy: user.name,
      reportedById: user.id,
      targetType: isJobPost ? "job_post" : "lost_found_post",
      targetId: post.id,
      targetTitle: post.title,
      targetUserId: post.author?.id,
      targetUserName: post.author?.name,
      category: isJobPost ? "Scam" : "Fake post",
      reason,
      details: `Report submitted for post: ${post.title}`,
      barangay: isJobPost ? getJobWorkBarangay(post) || post.barangay || user.barangay : user.barangay,
      handlerBarangay: isJobPost ? getJobWorkBarangay(post) || post.barangay || user.barangay : undefined,
      incidentBarangay: isJobPost ? getJobWorkBarangay(post) || post.barangay || user.barangay : undefined,
      homeBarangay: isJobPost ? getJobHomeBarangay(post) || post.author?.barangay || post.barangay : undefined,
      status: "Pending",
    });

    window.alert(reportResult?.isDuplicateUpdate
      ? "You already have an active report for this post. Your new details were added to the existing case."
      : "Report submitted to the barangay admin.");
  };

  const handleReportUser = () => {
    if (!user || isAdmin || isOwnPost || !post.author?.id) return;
    const reason =
      window.prompt(
        `Reason for reporting ${post.author?.name || "this resident"}:`,
        "Harassment or suspicious resident behavior",
      ) || "Resident account review requested";

    const reportResult = createReport({
      reportedBy: user.name,
      reportedById: user.id,
      targetType: "user",
      targetId: post.author.id,
      targetTitle: post.author?.name || "Resident account",
      targetUserId: post.author.id,
      targetUserName: post.author?.name,
      category: "Harassment",
      reason,
      details: `Resident requested admin review for ${post.author?.name || "this user"} from post: ${post.title}`,
      barangay: user.barangay,
      status: "Pending",
    });

    window.alert(reportResult?.isDuplicateUpdate
      ? "You already have an active report for this resident. Your new details were added to the existing case."
      : "User report submitted to the barangay admin.");
  };

  const handleDeletePost = () => {
    if (!window.confirm(`Delete post: ${post.title}?`)) return;
    deletePost(post.id);
    navigate(isLostFoundPost ? "/lost-found" : "/dashboard");
  };

  const handleToggleStatus = () => {
    setJobPostStatus(post.id, post.status === "Closed" ? "Active" : "Closed");
  };

  const handleLostFoundStatus = (status) => {
    markLostFoundStatus(post.id, status);
  };

  const handleAdminFlagPost = () => {
    updatePost(post.id, {
      status: "Flagged",
      moderationNote: isReportReview
        ? "Flagged from reported post review by barangay admin."
        : "Flagged from admin post inspection by barangay admin.",
      reviewedBy: user?.id,
      reviewedAt: new Date().toISOString(),
    });
  };

  const handleAdminRemovePost = () => {
    if (!window.confirm(`Remove post: ${post.title}?`)) return;
    const defaultNote = isReportReview ? "Removed after admin report review." : "Removed after admin post inspection.";
    const note = window.prompt("Reason for removing this post:", defaultNote) || defaultNote;
    removePostByAdmin(post.id, user, note) || updatePost(post.id, {
      status: "Removed",
      moderationNote: note,
      reviewedBy: user?.id,
      reviewedAt: new Date().toISOString(),
    });
  };

  const responseLabel = isJobPost
    ? alreadyResponded
      ? "Already Responded"
      : "Show Interest"
    : alreadyResponded
      ? "Responded"
      : getLostFoundPrimaryActionLabel(post, alreadyResponded);

  const pageBody = (
    <div className="post-detail-page">
      <div className="container">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={20} /> Back
        </button>

        {isAdmin ? (
          <Card elevated style={{ marginBottom: "1rem" }}>
            <CardContent>
              <div className="toolbar-row" style={{ marginBottom: 0 }}>
                <div>
                  <div className="pill-row" style={{ marginBottom: "0.5rem" }}>
                    <Badge variant={isReportReview ? "warning" : "secondary"}>
                      {isReportReview ? "Reported Post Review" : "Post Inspector"}
                    </Badge>
                    <Badge variant="secondary">{post.barangay}</Badge>
                    {source ? <Badge variant="secondary">From {adminSourceLabel}</Badge> : null}
                  </div>
                  <h3 style={{ marginBottom: "0.25rem" }}>
                    {isReportReview ? "Reported Post Preview" : "Admin Post Inspector"}
                  </h3>
                  <p style={{ marginBottom: 0, color: "var(--foreground-muted)" }}>
                    {isReportReview
                      ? "Use this page to verify the resident report and inspect the linked post before taking moderation action."
                      : "Inspect the post details, resident responses, and current status without treating it as a report case."}
                  </p>
                  {isReportReview ? (
                    <div className="meta-row" style={{ marginTop: "0.75rem" }}>
                      <span><Shield size={14} style={{ verticalAlign: "middle" }} /> Report: {linkedReport?.reason || linkedReport?.category || "Resident report"}</span>
                      <span><User size={14} style={{ verticalAlign: "middle" }} /> Reported by {linkedReport?.reportedBy || "Resident"}</span>
                      <span><Clock size={14} style={{ verticalAlign: "middle" }} /> Status: {linkedReport?.status || "Pending"}</span>
                    </div>
                  ) : null}
                </div>
                <Button variant="outline" onClick={() => (adminBackPath === -1 ? navigate(-1) : navigate(adminBackPath))}>
                  {isReportReview ? "Back to Reports" : "Back"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {fromNotifications ? (
          <Card elevated className="notification-context-card" style={{ marginBottom: "1rem" }}>
            <CardContent>
              <div className="toolbar-row" style={{ marginBottom: 0 }}>
                <div>
                  <div className="pill-row" style={{ marginBottom: "0.5rem" }}>
                    <Badge variant="job">Opened from notification</Badge>
                    {highlightedResponse ? <Badge variant="success">Exact response found</Badge> : <Badge variant="warning">Related case opened</Badge>}
                  </div>
                  <h3 style={{ marginBottom: "0.35rem" }}>
                    {highlightedResponse
                      ? `${highlightedResponse.userName || "Resident"} responded to this ${isJobPost ? "job" : isLostFoundPost ? getLostFoundCaseLabel(post).toLowerCase() : "post"}`
                      : "This is the exact post connected to your notification"}
                  </h3>
                  <p style={{ marginBottom: 0, color: "var(--foreground-muted)" }}>
                    {highlightedResponse
                      ? highlightedResponse.responseType || "Open the response record below, then use Chat Now if you need direct coordination."
                      : "The notification did not include a specific response ID, so the full post details are shown."}
                  </p>
                  {highlightedResponse ? (
                    <div className="meta-row" style={{ marginTop: "0.75rem" }}>
                      <span><User size={14} style={{ verticalAlign: "middle" }} /> {highlightedResponse.userName || "Resident"}</span>
                      <span><MapPin size={14} style={{ verticalAlign: "middle" }} /> {highlightedResponse.barangay || "Barangay not specified"}</span>
                      <span><Clock size={14} style={{ verticalAlign: "middle" }} /> {highlightedResponse.timestamp || "Recent"}</span>
                    </div>
                  ) : null}
                </div>
                {highlightedResponse && isOwnPost ? (
                  <Button variant="secondary" onClick={() => handleChatWithResponse(highlightedResponse)}>
                    <MessageSquare size={16} /> Chat Now
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>
        ) : null}

        <Card elevated className="detail-card">
          {postImages.length ? (
            <div className="post-detail-gallery">
              {postImages.map((image, index) => (
                <figure key={`${post.id}-${index}`} className="post-detail-image-frame">
                  <SmartMediaImage
                    src={image}
                    alt={`${post.title} ${index + 1}`}
                    className="post-detail-image"
                    size="detail"
                    loading="lazy"
                    onError={(event) => {
                      event.currentTarget.closest(".post-detail-image-frame")?.classList.add("is-broken");
                    }}
                  />
                  <figcaption>Photo {index + 1}</figcaption>
                </figure>
              ))}
            </div>
          ) : null}

          <CardHeader>
            <div className="detail-header">
              <div className="pill-row">
                <Badge variant={post.type}>
                  {isJobPost ? jobTypeLabel(post.opportunityType) : itemTypeLabel(post)}
                </Badge>
                <Badge variant={statusVariant(smartStatus)}>{smartStatus}</Badge>
                {post.category ? <Badge variant="secondary">{post.category}</Badge> : null}
                {isJobPost && post.isCrossBarangay ? <Badge variant="warning">Cross-barangay</Badge> : null}
              </div>
              <div className="author-section">
                <Avatar initials={post.author?.avatar} src={post.author?.profilePicture} alt={post.author?.name} size="md" />
                <div>
                  <p className="author-name">{post.author?.name || "Resident"}</p>
                  <p className="post-date">Posted {formatRecordAge(post)}</p>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <h1 className="detail-title">{post.title}</h1>
            <p className="detail-description">{post.description}</p>

            {post.salary ? (
              <div className="highlight-badge">
                <Badge variant="success" size="lg">{post.salary}</Badge>
              </div>
            ) : null}
            {post.reward ? (
              <div className="highlight-badge">
                <Badge variant="warning" size="lg">{isLostFoundPost && post.type === "found" ? "Claim note" : "Reward"}: {post.reward}</Badge>
              </div>
            ) : null}

            <div className="detail-meta">
              <div className="meta-item">
                <MapPin size={20} />
                <div>
                  <p className="meta-label">{isJobPost ? "Work Barangay" : "Barangay"}</p>
                  <p className="meta-value">{isJobPost ? getJobWorkBarangay(post) || post.barangay : post.barangay}</p>
                </div>
              </div>
              <div className="meta-item">
                <Users size={20} />
                <div>
                  <p className="meta-label">Interested / Responses</p>
                  <p className="meta-value">{post.interests || 0} people</p>
                </div>
              </div>
              <div className="meta-item">
                <MessageSquare size={20} />
                <div>
                  <p className="meta-label">Response Records</p>
                  <p className="meta-value">{(post.responses || []).length} response(s)</p>
                </div>
              </div>
            </div>

            {isJobPost ? (
              <Card elevated style={{ margin: "1rem 0" }}>
                <CardContent>
                  <div className="metric-grid" style={{ margin: 0 }}>
                    <div>
                      <p className="metric-label">Available Slots</p>
                      <p className="metric-value" style={{ fontSize: "1rem" }}>{remainingSlots}/{totalSlots} open</p>
                    </div>
                    <div>
                      <p className="metric-label">Contact Preference</p>
                      <p className="metric-value" style={{ fontSize: "1rem" }}>{post.contactPreference || "Chat"}</p>
                    </div>
                    <div>
                      <p className="metric-label">Route</p>
                      <p className="metric-value" style={{ fontSize: "1rem" }}>{getJobRouteLabel(post)}</p>
                    </div>
                    <div>
                      <p className="metric-label">Schedule</p>
                      <p className="metric-value" style={{ fontSize: "1rem" }}>{post.workSchedule || "Not specified"}</p>
                    </div>
                    <div>
                      <p className="metric-label">Requirements</p>
                      <p className="metric-value" style={{ fontSize: "1rem" }}>{post.requirements || "Not specified"}</p>
                    </div>
                  </div>

                  {post.isCrossBarangay ? (
                    <div className="meta-row" style={{ marginTop: "1rem" }}>
                      <span><MapPin size={14} style={{ verticalAlign: "middle" }} /> Home barangay: {getJobHomeBarangay(post) || "Not specified"}</span>
                      <span><MapPin size={14} style={{ verticalAlign: "middle" }} /> Work barangay: {getJobWorkBarangay(post) || post.barangay || "Not specified"}</span>
                    </div>
                  ) : null}

                  {post.author?.phone && ["Phone", "Both"].includes(post.contactPreference) ? (
                    <div className="meta-row" style={{ marginTop: "1rem" }}>
                      <span><User size={14} style={{ verticalAlign: "middle" }} /> Contact number: {post.author.phone}</span>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            ) : null}

            {isLostFoundPost ? (
              <Card elevated style={{ margin: "1rem 0" }}>
                <CardContent>
                  <h3 style={{ marginBottom: "0.75rem" }}>Item Details</h3>
                  <div className="metric-grid" style={{ margin: 0 }}>
                    <div>
                      <p className="metric-label">{post.type === "found" ? "Date Found" : "Date Lost"}</p>
                      <p className="metric-value" style={{ fontSize: "1rem" }}><Calendar size={14} style={{ verticalAlign: "middle" }} /> {getItemDate(post)}</p>
                    </div>
                    <div>
                      <p className="metric-label">{post.type === "found" ? "Place Found" : "Place Lost"}</p>
                      <p className="metric-value" style={{ fontSize: "1rem" }}><MapPin size={14} style={{ verticalAlign: "middle" }} /> {getItemPlace(post)}</p>
                    </div>
                    <div>
                      <p className="metric-label">Incident Barangay</p>
                      <p className="metric-value" style={{ fontSize: "1rem" }}>{getLostFoundIncidentBarangay(post) || post.barangay || "Not specified"}</p>
                    </div>
                    <div>
                      <p className="metric-label">Reporter Barangay</p>
                      <p className="metric-value" style={{ fontSize: "1rem" }}>{getLostFoundHomeBarangay(post) || "Not specified"}</p>
                    </div>
                    <div>
                      <p className="metric-label">Current Status</p>
                      <p className="metric-value" style={{ fontSize: "1rem" }}>{post.status || "Active"}</p>
                    </div>
                    <div>
                      <p className="metric-label">Color</p>
                      <p className="metric-value" style={{ fontSize: "1rem" }}>{post.color || "Not specified"}</p>
                    </div>
                    <div>
                      <p className="metric-label">Brand / Model</p>
                      <p className="metric-value" style={{ fontSize: "1rem" }}>{post.brand || "Not specified"}</p>
                    </div>
                    <div>
                      <p className="metric-label">Proof Rule</p>
                      <p className="metric-value" style={{ fontSize: "1rem" }}>{post.requiresProof ? "Proof required" : "Not required"}</p>
                    </div>
                  </div>
                  <div className="meta-row" style={{ marginTop: "1rem" }}>
                    <span><MapPin size={14} style={{ verticalAlign: "middle" }} /> Route: {getLostFoundRouteText(post)}{isCrossBarangayPost(post) ? " • Primary handler is the incident barangay admin." : ""}</span>
                  </div>
                  {post.uniqueDetails ? (
                    <div className="meta-row" style={{ marginTop: "1rem" }}>
                      <span><Shield size={14} style={{ verticalAlign: "middle" }} /> Verification detail: {post.uniqueDetails}</span>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            ) : null}

            {(isOwnPost || isAdmin) && (post.responses || []).length > 0 ? (
              <Card elevated style={{ margin: "1rem 0" }}>
                <CardContent>
                  <h3 style={{ marginBottom: "0.75rem" }}>
                    Resident Responses ({(post.responses || []).length})
                  </h3>
                  <div className="list-stack">
                    {post.responses.map((response) => {
                      const isHighlighted = highlightedResponse && String(highlightedResponse.id) === String(response.id);
                      return (
                        <div
                          key={response.id}
                          style={{
                            padding: "0.85rem",
                            borderRadius: "14px",
                            background: isHighlighted ? "rgba(37, 99, 235, 0.1)" : "var(--surface-soft)",
                            border: isHighlighted ? "1px solid rgba(37, 99, 235, 0.35)" : "1px solid transparent",
                          }}
                        >
                          <div className="toolbar-row" style={{ marginBottom: 0 }}>
                            <div>
                              <strong>{response.userName}</strong>
                              {isHighlighted ? <Badge variant="job" size="sm" style={{ marginLeft: "0.5rem" }}>From notification</Badge> : null}
                            </div>
                            {isOwnPost && !isAdmin ? (
                              <Button variant="outline" size="sm" onClick={() => handleChatWithResponse(response)}>
                                <MessageSquare size={14} /> Chat Now
                              </Button>
                            ) : null}
                          </div>
                          <div className="meta-row" style={{ marginTop: "0.25rem" }}>
                            <span><MapPin size={14} style={{ verticalAlign: "middle" }} /> {response.barangay}</span>
                            <span><Clock size={14} style={{ verticalAlign: "middle" }} /> {response.timestamp}</span>
                          </div>
                          <p style={{ margin: "0.5rem 0 0", color: "var(--foreground-muted)" }}>{response.responseType}</p>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ) : null}

            <div className="action-buttons">
              {isAdmin ? (
                <>
                  {isJobPost ? (
                    <>
                      <Button variant={post.status === "Active" ? "secondary" : "success"} size="lg" fullWidth onClick={() => setJobPostStatus(post.id, "Active")}>
                        <CheckCircle size={18} /> Keep Active
                      </Button>
                      <Button variant="secondary" size="lg" fullWidth onClick={() => setJobPostStatus(post.id, "Closed")}>
                        <Briefcase size={18} /> Close Post
                      </Button>
                    </>
                  ) : null}
                  {isLostFoundPost ? (
                    <>
                      <Button variant="primary" size="lg" fullWidth onClick={() => handleLostFoundStatus("Active")}>Mark Active</Button>
                      {getLostFoundStatusOptions(post).filter((status) => !["Active", "Closed", "Flagged"].includes(status)).map((status) => (
                        <Button key={status} variant="secondary" size="lg" fullWidth onClick={() => handleLostFoundStatus(status)}>Mark {status}</Button>
                      ))}
                      <Button variant="outline" size="lg" fullWidth onClick={() => handleLostFoundStatus("Closed")}>Close Case</Button>
                    </>
                  ) : null}
                  <Button variant="outline" size="lg" fullWidth onClick={handleAdminFlagPost}>
                    <Flag size={18} /> Flag Post
                  </Button>
                  <Button variant="danger" size="lg" fullWidth onClick={handleAdminRemovePost}>
                    <Trash2 size={18} /> Remove Post
                  </Button>
                </>
              ) : isOwnPost ? (
                <>
                  {isJobPost ? (
                    <Button variant={post.status === "Closed" ? "success" : "secondary"} size="lg" fullWidth onClick={handleToggleStatus}>
                      <Briefcase size={18} /> {post.status === "Closed" ? "Reopen Job Post" : "Close Job Post"}
                    </Button>
                  ) : null}
                  {isLostFoundPost ? (
                    <>
                      <Button variant="primary" size="lg" fullWidth onClick={() => handleLostFoundStatus("Active")}>Mark Active</Button>
                      {getLostFoundStatusOptions(post).filter((status) => !["Active", "Closed", "Flagged"].includes(status)).map((status) => (
                        <Button key={status} variant="secondary" size="lg" fullWidth onClick={() => handleLostFoundStatus(status)}>Mark {status}</Button>
                      ))}
                      <Button variant="outline" size="lg" fullWidth onClick={() => handleLostFoundStatus("Closed")}>Close Case</Button>
                    </>
                  ) : null}
                  <Button variant="danger" size="lg" fullWidth onClick={handleDeletePost}>
                    <Trash2 size={18} /> Delete Post
                  </Button>
                </>
              ) : isLostFoundPost ? (
                <>
                  <Button variant="primary" size="lg" fullWidth onClick={handleContactUser} disabled={!isActive}>
                    <MessageSquare size={18} /> Chat Now
                  </Button>
                  <Button variant="ghost" size="lg" fullWidth onClick={handleReportPost}>
                    <Shield size={18} /> Report Post
                  </Button>
                  <Button variant="ghost" size="lg" fullWidth onClick={handleReportUser}>
                    <User size={18} /> Report User
                  </Button>
                </>
              ) : (
                <>
                  <Button variant={alreadyResponded ? "outline" : "primary"} size="lg" fullWidth onClick={handleShowInterest} disabled={!isActive || alreadyResponded}>
                    {slotsFull ? "Slots Full" : responseLabel}
                  </Button>
                  <Button variant="secondary" size="lg" fullWidth onClick={handleContactUser} disabled={!isActive}>
                    <MessageSquare size={18} /> Chat Now
                  </Button>
                  <Button variant="ghost" size="lg" fullWidth onClick={handleReportPost}>
                    <Shield size={18} /> Report Post
                  </Button>
                  <Button variant="ghost" size="lg" fullWidth onClick={handleReportUser}>
                    <User size={18} /> Report User
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  return renderWithLayout(
    pageBody,
    isAdmin ? (isReportReview ? "Reported Post Review" : "Post Inspector") : "Post Details",
    isAdmin
      ? isReportReview
        ? "Inspect the exact post connected to a resident report before taking moderation action."
        : "Inspect the selected post without creating or opening a report case."
      : "Review the selected community post.",
  );
}

export default PostDetail;
