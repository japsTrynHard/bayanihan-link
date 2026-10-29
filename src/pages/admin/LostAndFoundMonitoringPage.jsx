import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Eye,
  Filter,
  Flag,
  MapPin,
  PackageCheck,
  Search,
  Shield,
  Sparkles,
  Trash2,
  Users,
} from "lucide-react";
import Card, { CardContent } from "../../components/Card";
import Badge from "../../components/Badge";
import Button from "../../components/Button";
import Input from "../../components/Input";
import AdminLayout from "../../components/AdminLayout";
import { useApp } from "../../context/AppContext";
import { useAuth } from "../../context/AuthContext";
import { getPostCoverImage } from "../../utils/postImages";
import {
  getLostFoundCompleteness,
  getLostFoundHomeBarangay,
  getLostFoundIncidentBarangay,
  getLostFoundQualityTips,
  getLostFoundRouteText,
  getTopLostFoundMatches,
  isCrossBarangayPost,
} from "../../utils/lostFoundMatching";
import {
  getLostFoundAdminPrimaryVerb,
  getLostFoundCaseLabel,
  getLostFoundCaseOption,
  getLostFoundCaseType,
  getLostFoundResolvedStatus,
  isMissingPersonCase,
} from "../../utils/lostFoundCases";
import SmartMediaImage from "../../components/SmartMediaImage";
import "../../styles/pages/LostAndFound.css";

const statusVariant = (status) => {
  if (["Returned", "Reunited", "Information Verified"].includes(status))
    return "success";
  if (status === "Claimed") return "warning";
  if (status === "Closed") return "secondary";
  if (status === "Flagged") return "warning";
  if (status === "Removed") return "danger";
  return "success";
};

const getItemDate = (post) => {
  if (post.itemDateDisplay) return post.itemDateDisplay;
  if (post.type === "found")
    return post.dateFound || post.itemDate || "Not specified";
  return post.dateLost || post.itemDate || "Not specified";
};

const getItemPlace = (post) => {
  if (post.type === "found")
    return post.placeFound || post.itemPlace || post.barangay;
  return post.placeLost || post.itemPlace || post.barangay;
};

const needsAdminReview = (post, tips = [], matches = []) => {
  const hasClaim =
    (post.responses || []).length > 0 &&
    ["Active", "Claimed"].includes(post.status || "Active");
  const isPriorityPerson =
    isMissingPersonCase(post) &&
    !["Closed", "Information Verified", "Reunited", "Removed"].includes(
      post.status || "Active",
    );
  return (
    isPriorityPerson ||
    hasClaim ||
    tips.length > 0 ||
    matches.some((match) => match.percentage >= 65)
  );
};

const getCaseRole = (post, adminBarangay) => {
  const incidentBarangay = getLostFoundIncidentBarangay(post);
  const homeBarangay = getLostFoundHomeBarangay(post);
  const handlesIncident = incidentBarangay === adminBarangay;
  const ownsResident = homeBarangay === adminBarangay;

  if (handlesIncident && ownsResident) {
    return {
      key: "full_owner",
      label: "Primary + Resident Barangay",
      description:
        "This case happened in your barangay and also belongs to one of your residents.",
      canManageIncident: true,
    };
  }

  if (handlesIncident) {
    return {
      key: "primary",
      label: "Primary Handler",
      description: `This case happened in ${incidentBarangay}. Your barangay is responsible for verification and return updates.`,
      canManageIncident: true,
    };
  }

  if (ownsResident) {
    return {
      key: "support",
      label: "Home Barangay Support",
      description: `This resident belongs to your barangay, but ${incidentBarangay} handles the official case workflow.`,
      canManageIncident: false,
    };
  }

  return {
    key: "reference",
    label: "Reference Only",
    description:
      "You can view this record, but it is outside your administrative scope.",
    canManageIncident: false,
  };
};

const getActionPlan = (post, intel, adminBarangay) => {
  const caseRole = getCaseRole(post, adminBarangay);
  const responses = post.responses || [];
  const responseCount = responses.length;
  const bestMatch = intel.matches?.[0];
  const status = post.status || "Active";

  if (!caseRole.canManageIncident) {
    return {
      title: "Monitor and guide your resident",
      description: `Visible to you because the resident is from your barangay. Coordinate with the ${getLostFoundIncidentBarangay(post)} admin if follow-up is needed.`,
      primaryAction: null,
      secondaryAction: null,
      openMatch: Boolean(bestMatch && bestMatch.percentage >= 65),
    };
  }

  if (status === "Flagged") {
    return {
      title: "Investigate this flagged case",
      description:
        "Review the item details, claimant activity, and safety notes. Reactivate if the report is valid, or remove it if it is abusive or false.",
      primaryAction: "Active",
      secondaryAction: "Remove",
      openMatch: Boolean(bestMatch && bestMatch.percentage >= 65),
    };
  }

  if (["Returned", "Reunited", "Information Verified"].includes(status)) {
    return {
      title: "Close the case after verification",
      description:
        "The case already has a verified outcome. Close the record so the dashboard stays clean and the case is archived.",
      primaryAction: "Closed",
      secondaryAction: "Active",
      openMatch: false,
    };
  }

  if (status === "Closed") {
    return {
      title: "Case completed",
      description:
        "No further action is needed unless the item return failed and the case must be reopened.",
      primaryAction: "Active",
      secondaryAction: null,
      openMatch: false,
    };
  }

  if (status === "Claimed") {
    const resolvedStatus = getLostFoundResolvedStatus(post);
    return {
      title:
        getLostFoundCaseType(post) === "pet"
          ? "Verify owner and reunite the pet"
          : "Verify owner and complete the return",
      description: responseCount
        ? "Review proof, chat details, and handover evidence before marking the case complete."
        : "Confirm the claimant and complete the official case outcome only after verification.",
      primaryAction: resolvedStatus,
      secondaryAction: "Active",
      openMatch: false,
    };
  }

  if (responseCount > 0) {
    if (isMissingPersonCase(post)) {
      return {
        title: "Verify person information first",
        description: `There ${responseCount === 1 ? "is" : "are"} ${responseCount} information response${responseCount === 1 ? "" : "s"}. Check details privately before public or case status changes.`,
        primaryAction: "Information Verified",
        secondaryAction: "Flagged",
        openMatch: false,
      };
    }
    return {
      title:
        getLostFoundCaseType(post) === "pet"
          ? "Review owner or sighting responses"
          : "Review claim requests first",
      description: `There ${responseCount === 1 ? "is" : "are"} ${responseCount} resident ${responseCount === 1 ? "response" : "responses"}. Review proof or conversations before changing the case status.`,
      primaryAction: "Claimed",
      secondaryAction: "Flagged",
      openMatch: false,
    };
  }

  if (bestMatch && bestMatch.percentage >= 80) {
    return {
      title: "Check the strong smart match",
      description: `The system found a ${bestMatch.percentage}% match with "${bestMatch.candidate.title}". Compare details and contact the involved residents before confirming a claim.`,
      primaryAction: "Claimed",
      secondaryAction: "Active",
      openMatch: true,
    };
  }

  if (bestMatch && bestMatch.percentage >= 65) {
    return {
      title: "Review a possible smart match",
      description: `The system found a ${bestMatch.percentage}% possible match. Keep the case active while you compare location, item details, and claimant proof.`,
      primaryAction: "Active",
      secondaryAction: "Flagged",
      openMatch: true,
    };
  }

  if (isMissingPersonCase(post)) {
    return {
      title: "Keep priority case active",
      description:
        "Missing-person cases should stay active until verified information, reunion, closure, or admin flagging. Keep details privacy-safe.",
      primaryAction: "Active",
      secondaryAction: "Flagged",
      openMatch: false,
    };
  }

  return {
    title: "Keep this case active and visible",
    description:
      "No claim or strong match yet. Keep the listing active, monitor new responses, and only flag it if the details become suspicious.",
    primaryAction: "Active",
    secondaryAction: "Flagged",
    openMatch: false,
  };
};

function LostAndFoundMonitoringPage() {
  const { allPosts, updatePost, removePostByAdmin } = useApp();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [typeFilter, setTypeFilter] = useState("");
  const [caseFilter, setCaseFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [scopeFilter, setScopeFilter] = useState("all_scoped");
  const [viewFilter, setViewFilter] = useState("needs_review");
  const [searchTerm, setSearchTerm] = useState("");
  const [actionNotice, setActionNotice] = useState({ type: "", message: "" });

  const allLostFoundPosts = useMemo(
    () =>
      allPosts.filter(
        (post) =>
          ["lost", "found"].includes(post.type) && post.status !== "Removed",
      ),
    [allPosts],
  );

  const scopedLostFoundPosts = useMemo(() => {
    if (!user?.barangay) return [];
    return allLostFoundPosts.filter((post) => {
      const incidentBarangay = getLostFoundIncidentBarangay(post);
      const homeBarangay = getLostFoundHomeBarangay(post);
      return (
        incidentBarangay === user.barangay || homeBarangay === user.barangay
      );
    });
  }, [allLostFoundPosts, user?.barangay]);

  const localIncidentPosts = useMemo(
    () =>
      scopedLostFoundPosts.filter(
        (post) => getLostFoundIncidentBarangay(post) === user?.barangay,
      ),
    [scopedLostFoundPosts, user?.barangay],
  );

  const residentSupportPosts = useMemo(
    () =>
      scopedLostFoundPosts.filter(
        (post) =>
          getLostFoundHomeBarangay(post) === user?.barangay &&
          getLostFoundIncidentBarangay(post) !== user?.barangay,
      ),
    [scopedLostFoundPosts, user?.barangay],
  );

  const lostFoundPosts = useMemo(() => {
    if (scopeFilter === "outgoing") return residentSupportPosts;
    if (scopeFilter === "incident") return localIncidentPosts;
    return scopedLostFoundPosts;
  }, [
    localIncidentPosts,
    residentSupportPosts,
    scopedLostFoundPosts,
    scopeFilter,
  ]);

  const intelligenceMap = useMemo(() => {
    const map = {};
    lostFoundPosts.forEach((post) => {
      const matches = getTopLostFoundMatches(post, allLostFoundPosts, 3);
      const tips = getLostFoundQualityTips(post, lostFoundPosts);
      map[post.id] = {
        matches,
        tips,
        completeness: getLostFoundCompleteness(post),
        needsReview: needsAdminReview(post, tips, matches),
      };
    });
    return map;
  }, [lostFoundPosts, allLostFoundPosts]);

  const filteredPosts = lostFoundPosts.filter((post) => {
    const intel = intelligenceMap[post.id] || {
      matches: [],
      tips: [],
      needsReview: false,
    };
    const matchesType = typeFilter ? post.type === typeFilter : true;
    const matchesCase = caseFilter
      ? getLostFoundCaseType(post) === caseFilter
      : true;
    const matchesStatus = statusFilter
      ? (post.status || "Active") === statusFilter
      : true;
    const matchesView =
      viewFilter === "matches"
        ? intel.matches.length > 0
        : viewFilter === "claims"
          ? (post.responses || []).length > 0
          : viewFilter === "flagged"
            ? post.status === "Flagged"
            : viewFilter === "person"
              ? getLostFoundCaseType(post) === "person"
              : viewFilter === "cross"
                ? isCrossBarangayPost(post)
                : viewFilter === "needs_review"
                  ? intel.needsReview
                  : true;
    const query = searchTerm.trim().toLowerCase();
    const matchesSearch = query
      ? [
          post.title,
          post.description,
          post.caseType,
          post.lostFoundCaseType,
          post.category,
          post.color,
          post.brand,
          post.author?.name,
          post.placeLost,
          post.placeFound,
          post.itemPlace,
          post.barangay,
          post.homeBarangay,
          post.incidentBarangay,
          post.itemBarangay,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(query)
      : true;
    return (
      matchesType &&
      matchesCase &&
      matchesStatus &&
      matchesView &&
      matchesSearch
    );
  });

  const updateStatus = (post, status) => {
    if (getLostFoundIncidentBarangay(post) !== user?.barangay) {
      setActionNotice({
        type: "info",
        message: `Support visibility only: ${getLostFoundIncidentBarangay(post)} admin still handles the official case actions.`,
      });
      return;
    }
    if ((post.status || "Active") === status) {
      setActionNotice({
        type: "info",
        message: `No duplicate action: "${post.title}" is already marked as ${status}.`,
      });
      return;
    }

    updatePost(post.id, {
      status,
      moderatedBy: user?.id,
      moderatedAt: new Date().toISOString(),
      notificationTitle: "Lost & Found Status Updated",
      notificationMessage: `Your ${getLostFoundCaseLabel(post).toLowerCase()} post "${post.title}" was marked as ${status} by the barangay admin.`,
      notificationPriority: ["Closed", "Flagged"].includes(status)
        ? "medium"
        : "normal",
    });
    setActionNotice({
      type: "success",
      message: `Action saved: ${post.title} was marked as ${status}. Resident was notified.`,
    });
  };

  const handleFlag = (post) => {
    if (getLostFoundIncidentBarangay(post) !== user?.barangay) {
      setActionNotice({
        type: "info",
        message: `Support visibility only: ${getLostFoundIncidentBarangay(post)} admin still handles official flagging and status updates.`,
      });
      return;
    }
    if (post.status === "Flagged") {
      setActionNotice({
        type: "info",
        message: `No duplicate action: "${post.title}" is already flagged.`,
      });
      return;
    }

    const note = "Flagged by barangay admin for review.";
    updatePost(post.id, {
      status: "Flagged",
      moderationNote: note,
      flaggedBy: user?.id,
      flaggedAt: new Date().toISOString(),
      notificationTitle: "Lost & Found Post Flagged",
      notificationMessage: `Your ${getLostFoundCaseLabel(post).toLowerCase()} post "${post.title}" was flagged by the barangay admin.`,
      notificationPriority: "medium",
    });
    setActionNotice({
      type: "success",
      message: `Post flagged: ${post.title}. Resident was notified.`,
    });
  };

  const handleRemove = (post) => {
    if (getLostFoundIncidentBarangay(post) !== user?.barangay) {
      setActionNotice({
        type: "info",
        message: `Support visibility only: ${getLostFoundIncidentBarangay(post)} admin handles official removal.`,
      });
      return;
    }
    if (post.status === "Removed") {
      setActionNotice({
        type: "info",
        message: `No duplicate action: "${post.title}" is already removed.`,
      });
      return;
    }
    if (!window.confirm(`Remove lost/found post: ${post.title}?`)) return;
    removePostByAdmin(
      post.id,
      user,
      "Removed from Lost & Found monitoring after admin review.",
    );
    setActionNotice({
      type: "success",
      message: `Post removed: ${post.title}.`,
    });
  };

  const totalFlagged = lostFoundPosts.filter(
    (post) => post.status === "Flagged",
  ).length;
  const totalReturned = lostFoundPosts.filter((post) =>
    ["Returned", "Reunited", "Information Verified"].includes(post.status),
  ).length;
  const totalPersonCases = lostFoundPosts.filter(
    (post) => getLostFoundCaseType(post) === "person",
  ).length;
  const totalResponses = lostFoundPosts.reduce(
    (sum, post) => sum + (post.responses || []).length,
    0,
  );
  const totalMatches = lostFoundPosts.filter(
    (post) => (intelligenceMap[post.id]?.matches || []).length > 0,
  ).length;
  const totalNeedsReview = lostFoundPosts.filter(
    (post) => intelligenceMap[post.id]?.needsReview,
  ).length;
  const totalCrossBarangay = lostFoundPosts.filter((post) =>
    isCrossBarangayPost(post),
  ).length;

  const viewTabs = [
    { key: "needs_review", label: "Needs Review", count: totalNeedsReview },
    { key: "matches", label: "Smart Matches", count: totalMatches },
    { key: "claims", label: "Responses / Info", count: totalResponses },
    { key: "person", label: "Missing Persons", count: totalPersonCases },
    { key: "cross", label: "Cross-Barangay", count: totalCrossBarangay },
    { key: "flagged", label: "Flagged", count: totalFlagged },
    { key: "all", label: "All Records", count: lostFoundPosts.length },
  ];

  return (
    <AdminLayout
      title="Lost and Found Command Center"
      subtitle="See both cases in your barangay and records filed by your residents elsewhere. The screen now highlights what to do next for every case."
    >
      <div className="lf-admin-shell">
        <div className="metric-grid lf-admin-metrics">
          <Card elevated>
            <CardContent>
              <p className="metric-label">Visible Cases</p>
              <p className="metric-value">{lostFoundPosts.length}</p>
            </CardContent>
          </Card>
          <Card elevated>
            <CardContent>
              <p className="metric-label">Primary Cases</p>
              <p className="metric-value">{localIncidentPosts.length}</p>
            </CardContent>
          </Card>
          <Card elevated>
            <CardContent>
              <p className="metric-label">My Residents Elsewhere</p>
              <p className="metric-value">{residentSupportPosts.length}</p>
            </CardContent>
          </Card>
          <Card elevated>
            <CardContent>
              <p className="metric-label">Needs Review</p>
              <p className="metric-value">{totalNeedsReview}</p>
            </CardContent>
          </Card>
          <Card elevated>
            <CardContent>
              <p className="metric-label">Claim Requests</p>
              <p className="metric-value">{totalResponses}</p>
            </CardContent>
          </Card>
          <Card elevated>
            <CardContent>
              <p className="metric-label">Resolved / Returned</p>
              <p className="metric-value">{totalReturned}</p>
            </CardContent>
          </Card>
        </div>

        {actionNotice.message ? (
          <div
            className={`smart-form-notice smart-form-notice--${actionNotice.type || "info"}`}
          >
            {actionNotice.message}
          </div>
        ) : null}

        <Card elevated className="lf-admin-controls">
          <CardContent>
            <div className="lf-admin-overview-strip">
              <div>
                <strong>Smart admin routing</strong>
                <span>
                  Primary cases happened in your barangay. Support cases are
                  your residents’ reports in another barangay. Person cases are
                  priority and privacy-sensitive.
                </span>
              </div>
              <div className="lf-admin-overview-pills">
                <span>
                  <MapPin size={14} /> Primary handler = incident barangay admin
                </span>
                <span>
                  <Users size={14} /> Home barangay admin = support visibility
                </span>
              </div>
            </div>
            <div
              className="lf-tabs admin"
              role="tablist"
              aria-label="Admin lost and found views"
            >
              {viewTabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  className={`lf-tab ${viewFilter === tab.key ? "active" : ""}`}
                  onClick={() => setViewFilter(tab.key)}
                >
                  {tab.label}
                  <span>{tab.count}</span>
                </button>
              ))}
            </div>
            <div className="lf-filter-grid admin">
              <Input
                label="Search listings"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by title, place, author, category, or description"
                icon={Search}
              />
              <div className="form-group">
                <label className="input-label">
                  <Filter size={14} /> Direction
                </label>
                <select
                  className="input"
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                >
                  <option value="">Lost + Found</option>
                  <option value="lost">Lost / Missing</option>
                  <option value="found">Found / Sighting</option>
                </select>
              </div>
              <div className="form-group">
                <label className="input-label">Case Type</label>
                <select
                  className="input"
                  value={caseFilter}
                  onChange={(e) => setCaseFilter(e.target.value)}
                >
                  <option value="">All Case Types</option>
                  <option value="item">Items</option>
                  <option value="pet">Pets</option>
                  <option value="person">Missing Persons / Sightings</option>
                </select>
              </div>
              <div className="form-group">
                <label className="input-label">Scope</label>
                <select
                  className="input"
                  value={scopeFilter}
                  onChange={(e) => setScopeFilter(e.target.value)}
                >
                  <option value="all_scoped">All Visible Cases</option>
                  <option value="incident">Primary Cases in My Barangay</option>
                  <option value="outgoing">
                    My Residents in Another Barangay
                  </option>
                </select>
              </div>
              <div className="form-group">
                <label className="input-label">Status</label>
                <select
                  className="input"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="">All Statuses</option>
                  <option value="Active">Active</option>
                  <option value="Claimed">Claimed</option>
                  <option value="Returned">Returned</option>
                  <option value="Closed">Closed</option>
                  <option value="Flagged">Flagged</option>
                  <option value="Removed">Removed</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="lf-admin-list">
          {filteredPosts.length > 0 ? (
            filteredPosts.map((post) => {
              const intel = intelligenceMap[post.id] || {
                matches: [],
                tips: [],
                completeness: 0,
                needsReview: false,
              };
              const bestMatch = intel.matches[0];
              const coverImage = getPostCoverImage(post);
              const responses = post.responses || [];
              const incidentBarangay = getLostFoundIncidentBarangay(post);
              const caseRole = getCaseRole(post, user?.barangay);
              const plan = getActionPlan(post, intel, user?.barangay);

              return (
                <Card key={post.id} elevated className="lf-admin-card">
                  <CardContent>
                    <div className="lf-admin-card-grid">
                      <div className="lf-admin-media">
                        {coverImage ? (
                          <SmartMediaImage
                            src={coverImage}
                            alt={post.title}
                            loading="lazy"
                            size="thumb"
                            showHint={false}
                          />
                        ) : (
                          <div className="lf-admin-no-image">
                            <PackageCheck size={24} />
                            <span>No photo</span>
                          </div>
                        )}
                      </div>

                      <div className="lf-admin-info">
                        <div className="pill-row lf-admin-pills">
                          <Badge variant={post.type}>
                            {getLostFoundCaseLabel(post)}
                          </Badge>
                          <Badge variant={statusVariant(post.status)}>
                            {post.status || "Active"}
                          </Badge>
                          <Badge variant="secondary">
                            {getLostFoundCaseOption(post).label}
                          </Badge>
                          {intel.needsReview ? (
                            <Badge variant="warning">Needs Review</Badge>
                          ) : null}
                          {isCrossBarangayPost(post) ? (
                            <Badge variant="secondary">Cross-Barangay</Badge>
                          ) : null}
                          <Badge
                            variant={
                              caseRole.canManageIncident
                                ? "success"
                                : "secondary"
                            }
                          >
                            {caseRole.label}
                          </Badge>
                          {bestMatch ? (
                            <Badge variant={bestMatch.variant}>
                              {bestMatch.percentage}% Match
                            </Badge>
                          ) : null}
                        </div>
                        <h3>{post.title}</h3>
                        <p>{post.description}</p>
                        <div className="lf-attribute-row admin">
                          {post.category ? <span>{post.category}</span> : null}
                          {post.color ? <span>{post.color}</span> : null}
                          {post.brand ? <span>{post.brand}</span> : null}
                          {post.requiresProof ? (
                            <span>Proof required</span>
                          ) : null}
                          {isMissingPersonCase(post) ? (
                            <span>Privacy-sensitive</span>
                          ) : null}
                        </div>

                        <div className="lf-route-chip admin">
                          <MapPin size={14} /> {getLostFoundRouteText(post)}
                        </div>

                        <div className="meta-row lf-admin-meta">
                          <span>
                            <MapPin size={14} /> {getItemPlace(post)} •{" "}
                            {incidentBarangay}
                          </span>
                          <span>
                            <Calendar size={14} /> {getItemDate(post)}
                          </span>
                          <span>
                            <Users size={14} /> {responses.length} response(s)
                          </span>
                          <span>{post.author?.name || "Resident"}</span>
                          <span>{post.postedDate}</span>
                        </div>

                        <div
                          className="lf-quality-meter admin"
                          title="Post completeness"
                        >
                          <span style={{ width: `${intel.completeness}%` }} />
                        </div>

                        <div
                          className={`lf-admin-plan ${caseRole.canManageIncident ? "" : "support"}`}
                        >
                          <span className="lf-admin-plan-kicker">
                            {caseRole.canManageIncident
                              ? "Recommended next step"
                              : "Support visibility"}
                          </span>
                          <strong>{plan.title}</strong>
                          <span>{plan.description}</span>
                        </div>

                        {!caseRole.canManageIncident ? (
                          <div className="lf-admin-insight warning">
                            <AlertTriangle size={16} />
                            <div>
                              <strong>
                                Visible to the home barangay admin
                              </strong>
                              <span>{caseRole.description}</span>
                            </div>
                          </div>
                        ) : null}

                        {bestMatch ? (
                          <div className="lf-admin-insight match">
                            <Sparkles size={16} />
                            <div>
                              <strong>
                                {bestMatch.percentage}% {bestMatch.label}:{" "}
                                {bestMatch.candidate.title}
                              </strong>
                              <span>{bestMatch.reasons.join(" • ")}</span>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                navigate(
                                  `/admin/post/${bestMatch.candidate.id}`,
                                )
                              }
                            >
                              Open Match
                            </Button>
                          </div>
                        ) : null}

                        {intel.tips.length ? (
                          <div className="lf-admin-insight warning">
                            <AlertTriangle size={16} />
                            <div>
                              <strong>Quality / safety notes</strong>
                              <span>{intel.tips.join(" • ")}</span>
                            </div>
                          </div>
                        ) : null}

                        {responses.length > 0 ? (
                          <div className="lf-admin-responses">
                            <strong>
                              Recent claim / sighting / response activity
                            </strong>
                            {responses.slice(0, 3).map((response) => (
                              <div
                                key={response.id}
                                className="lf-admin-response-row"
                              >
                                <span>{response.userName}</span>
                                <small>{response.responseType}</small>
                                <small>{response.timestamp}</small>
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>

                      <div className="lf-admin-actions">
                        <Button
                          size="sm"
                          variant="secondary"
                          fullWidth
                          onClick={() => navigate(`/admin/post/${post.id}`)}
                        >
                          <Eye size={16} /> Open Case
                        </Button>

                        {caseRole.canManageIncident ? (
                          <>
                            {plan.openMatch && bestMatch ? (
                              <Button
                                size="sm"
                                variant="outline"
                                fullWidth
                                onClick={() =>
                                  navigate(
                                    `/admin/post/${bestMatch.candidate.id}`,
                                  )
                                }
                              >
                                <Sparkles size={16} /> Review Match
                              </Button>
                            ) : null}

                            {plan.primaryAction === "Claimed" ? (
                              <Button
                                size="sm"
                                variant="primary"
                                fullWidth
                                disabled={
                                  (post.status || "Active") === "Claimed"
                                }
                                onClick={() => updateStatus(post, "Claimed")}
                              >
                                <CheckCircle2 size={16} /> Mark as Claimed
                              </Button>
                            ) : null}

                            {[
                              "Returned",
                              "Reunited",
                              "Information Verified",
                            ].includes(plan.primaryAction) ? (
                              <Button
                                size="sm"
                                variant="primary"
                                fullWidth
                                disabled={
                                  (post.status || "Active") ===
                                  plan.primaryAction
                                }
                                onClick={() =>
                                  updateStatus(post, plan.primaryAction)
                                }
                              >
                                <CheckCircle2 size={16} />{" "}
                                {getLostFoundAdminPrimaryVerb(post)}
                              </Button>
                            ) : null}

                            {plan.primaryAction === "Closed" ? (
                              <Button
                                size="sm"
                                variant="primary"
                                fullWidth
                                disabled={
                                  (post.status || "Active") === "Closed"
                                }
                                onClick={() => updateStatus(post, "Closed")}
                              >
                                <CheckCircle2 size={16} /> Close Case
                              </Button>
                            ) : null}

                            {plan.primaryAction === "Active" ? (
                              <Button
                                size="sm"
                                variant="primary"
                                fullWidth
                                disabled={
                                  (post.status || "Active") === "Active"
                                }
                                onClick={() => updateStatus(post, "Active")}
                              >
                                <CheckCircle2 size={16} /> Keep / Mark Active
                              </Button>
                            ) : null}

                            {plan.secondaryAction === "Flagged" ? (
                              <Button
                                size="sm"
                                variant="outline"
                                fullWidth
                                disabled={post.status === "Flagged"}
                                onClick={() => handleFlag(post)}
                              >
                                <Flag size={16} /> Flag for Review
                              </Button>
                            ) : null}

                            {plan.secondaryAction === "Active" ? (
                              <Button
                                size="sm"
                                variant="outline"
                                fullWidth
                                disabled={
                                  (post.status || "Active") === "Active"
                                }
                                onClick={() => updateStatus(post, "Active")}
                              >
                                <ArrowRight size={16} /> Reopen Active
                              </Button>
                            ) : null}

                            {plan.secondaryAction === "Remove" ? (
                              <Button
                                size="sm"
                                variant="danger"
                                fullWidth
                                onClick={() => handleRemove(post)}
                              >
                                <Trash2 size={16} /> Remove Case
                              </Button>
                            ) : null}

                            {!plan.secondaryAction && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  fullWidth
                                  disabled={post.status === "Flagged"}
                                  onClick={() => handleFlag(post)}
                                >
                                  <Shield size={16} />{" "}
                                  {post.status === "Flagged"
                                    ? "Already Flagged"
                                    : "Flag Case"}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="danger"
                                  fullWidth
                                  onClick={() => handleRemove(post)}
                                >
                                  <Trash2 size={16} /> Remove Case
                                </Button>
                              </>
                            )}
                          </>
                        ) : (
                          <div className="lf-admin-support-actions">
                            <strong>Support mode only</strong>
                            <span>
                              You can monitor this resident’s case and guide
                              them, but only the incident barangay admin can
                              update the official status.
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <Card className="lf-empty-card">
              <CardContent>
                <PackageCheck size={32} />
                <h3>No records found</h3>
                <p>
                  No lost/found listings match the selected admin view and
                  filters.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

export default LostAndFoundMonitoringPage;
