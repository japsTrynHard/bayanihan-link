import React, { useMemo, useState } from "react";
import {
  Search,
  Plus,
  Briefcase,
  MapPin,
  MessageSquare,
  Heart,
  Shield,
  Trash2,
  Clock,
  User,
  Check,
  Users,
  Target,
  Globe,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import ResidentLayout from "../../components/ResidentLayout";
import Card, { CardContent } from "../../components/Card";
import Badge from "../../components/Badge";
import Button from "../../components/Button";
import Input from "../../components/Input";
import Modal from "../../components/Modal";
import ImageUploader from "../../components/ImageUploader";
import { useApp } from "../../context/AppContext";
import { useAuth } from "../../context/AuthContext";
import { CLOUDINARY_FOLDERS } from "../../services/cloudinaryService";
import { getPostCoverImage } from "../../utils/postImages";
import { formatRecordAge } from "../../utils/timeDisplay";
import {
  getJobCoverageBarangays,
  getJobFitScore,
  getJobHomeBarangay,
  getJobRouteLabel,
  getJobWorkBarangay,
  getTopJobMatches,
} from "../../utils/jobMatching";
import SmartMediaImage from "../../components/SmartMediaImage";
import "../../styles/pages/Skeleton.css";
import "../../styles/pages/PostCreate.css";

const JOB_CATEGORIES = [
  "General",
  "Construction",
  "Household",
  "Transport",
  "Tutoring",
  "Cleaning",
  "Store Helper",
  "Delivery",
  "Event Help",
];

const REQUIREMENT_OPTIONS = [
  "Valid ID",
  "Own tools",
  "Experience preferred",
  "Available ASAP",
  "No experience needed",
];

const jobTypeLabel = (type) =>
  type === "seeking" ? "Job Seeking" : "Job Hiring";

const statusVariant = (status) => {
  if (status === "Flagged") return "warning";
  if (status === "Removed") return "danger";
  if (status === "Closed" || status === "Slots Full") return "secondary";
  return "success";
};

const formatTime = (time) => {
  if (!time) return "";
  const [hourRaw, minute = "00"] = time.split(":");
  const hour = Number(hourRaw);
  if (Number.isNaN(hour)) return time;
  const suffix = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minute} ${suffix}`;
};

const formatDate = (date) => {
  if (!date) return "";
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const RATE_PERIODS = [
  { value: "hour", label: "per hour" },
  { value: "day", label: "per day" },
  { value: "week", label: "per week" },
  { value: "project", label: "per project" },
  { value: "total", label: "total budget" },
];

const RATE_MODES = [
  { value: "fixed", label: "Fixed rate" },
  { value: "starting", label: "Starting rate" },
  { value: "negotiable", label: "Negotiable" },
];

const getRatePeriodLabel = (value) =>
  RATE_PERIODS.find((item) => item.value === value)?.label || "per day";
const getRateModeLabel = (value) =>
  RATE_MODES.find((item) => item.value === value)?.label || "Negotiable";

const getFilledSlots = (post = {}) => {
  const interested = Array.isArray(post.interestedUserIds)
    ? post.interestedUserIds.length
    : 0;
  const responses = Array.isArray(post.responses) ? post.responses.length : 0;
  return Math.max(interested, responses, Number(post.filledSlots || 0));
};

const getTotalSlots = (post = {}) => {
  const total = Number(
    post.slots || post.availableSlots || post.maxApplicants || 1,
  );
  return Number.isFinite(total) && total > 0 ? total : 1;
};

const getRemainingSlots = (post = {}) =>
  Math.max(getTotalSlots(post) - getFilledSlots(post), 0);
const isSlotsFull = (post = {}) => getRemainingSlots(post) <= 0;
const isVisibleOpenJob = (post = {}) =>
  (post.status || "Active") !== "Closed" && !isSlotsFull(post);
const getSmartJobStatus = (post = {}) => {
  if ((post.status || "Active") === "Closed") return "Closed";
  if (isSlotsFull(post)) return "Slots Full";
  return post.status || "Active";
};

const buildDefaultFormData = (user, allBarangays = []) => ({
  title: "",
  description: "",
  opportunityType: "hiring",
  category: "General",
  rateAmount: "",
  ratePeriod: "day",
  rateMode: "negotiable",
  slots: 1,
  workDate: "",
  startTime: "",
  endTime: "",
  flexibleSchedule: true,
  requirements: ["No experience needed"],
  customRequirement: "",
  contactMethods: {
    Chat: true,
    Phone: false,
  },
  workLocationMode: "own", // "own" or "all"
  // workBarangay: pag "own" = user.barangay, pag "all" = "all"
  workBarangay: user?.barangay || "",
  coverageBarangays: user?.barangay ? [user.barangay] : [],
  images: [],
});

function JobsPage() {
  const {
    allPosts,
    barangays,
    createPost,
    createReport,
    startChatFromPost,
    filterByBarangay,
    barangayFilterMode,
    setBarangayFilterMode,
    deletePost,
    closePost,
    setJobPostStatus,
    respondToJobPost,
  } = useApp();
  const { user } = useAuth();
  const navigate = useNavigate();

  const barangayOptions = useMemo(() => {
    const list = Array.isArray(barangays) ? barangays : [];
    return list
      .map((item) =>
        typeof item === "object" && item !== null ? item.name : item,
      )
      .filter((item) => item && !/^select barangay$/i.test(String(item)));
  }, [barangays]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("open");
  const [quickIntent, setQuickIntent] = useState("all");
  const [isCreatingPost, setIsCreatingPost] = useState(false);
  const [submitNotice, setSubmitNotice] = useState({ type: "", message: "" });
  const [formData, setFormData] = useState(() =>
    buildDefaultFormData(user, barangayOptions),
  );

  // Update formData when user or barangayOptions change
  React.useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      workBarangay:
        prev.workLocationMode === "own" ? user?.barangay || "" : "all",
      coverageBarangays:
        prev.workLocationMode === "own" && user?.barangay
          ? [user.barangay]
          : prev.workLocationMode === "all"
            ? [...barangayOptions]
            : prev.coverageBarangays,
    }));
  }, [user?.barangay, barangayOptions]);

  const jobPosts = allPosts.filter(
    (post) => post.type === "job" && post.status !== "Removed",
  );
  const filteredJobPosts = filterByBarangay(jobPosts, user);

  const filteredJobs = useMemo(() => {
    return filteredJobPosts.filter((post) => {
      const matchesIntent =
        quickIntent === "all" ||
        (quickIntent === "findWorker" && post.opportunityType === "seeking") ||
        (quickIntent === "findJob" &&
          (post.opportunityType || "hiring") === "hiring") ||
        (quickIntent === "myArea" &&
          getJobCoverageBarangays(post).includes(user?.barangay));
      const matchesFilter =
        filter === "all" ||
        post.opportunityType === filter ||
        !post.opportunityType;
      const smartStatus = getSmartJobStatus(post);
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "open" && isVisibleOpenJob(post)) ||
        (statusFilter === "filled" && smartStatus === "Slots Full") ||
        post.status === statusFilter ||
        smartStatus === statusFilter;
      const query = search.toLowerCase();
      const matchesSearch =
        !query ||
        (post.title || "").toLowerCase().includes(query) ||
        (post.description || "").toLowerCase().includes(query) ||
        (post.category || "").toLowerCase().includes(query) ||
        (post.author?.name || "").toLowerCase().includes(query) ||
        getJobRouteLabel(post).toLowerCase().includes(query);

      return matchesIntent && matchesFilter && matchesStatus && matchesSearch;
    });
  }, [
    filteredJobPosts,
    filter,
    statusFilter,
    search,
    quickIntent,
    user?.barangay,
  ]);

  const topJobMatches = useMemo(
    () => getTopJobMatches(filteredJobPosts, user, 3),
    [filteredJobPosts, user],
  );

  const resetForm = () => {
    setFormData(buildDefaultFormData(user, barangayOptions));
  };

  const setOpportunityType = (opportunityType) => {
    setFormData((current) => ({
      ...current,
      opportunityType,
      slots: opportunityType === "seeking" ? 1 : current.slots || 1,
    }));
  };

  // Updated: "own" or "all" modes
  const updateWorkLocationMode = (mode) => {
    setFormData((current) => {
      if (mode === "own") {
        const ownBarangay = user?.barangay || "";
        return {
          ...current,
          workLocationMode: mode,
          workBarangay: ownBarangay,
          coverageBarangays: [ownBarangay],
        };
      } else if (mode === "all") {
        // All San Miguel barangays
        return {
          ...current,
          workLocationMode: mode,
          workBarangay: "all",
          coverageBarangays: [...barangayOptions], // all barangays
        };
      }
      return current;
    });
  };

  const toggleRequirement = (requirement) => {
    setFormData((current) => {
      const currentList = current.requirements || [];
      const exists = currentList.includes(requirement);
      return {
        ...current,
        requirements: exists
          ? currentList.filter((item) => item !== requirement)
          : [...currentList, requirement],
      };
    });
  };

  const toggleContactMethod = (method) => {
    setFormData((current) => {
      const nextContactMethods = {
        ...current.contactMethods,
        [method]: !current.contactMethods?.[method],
      };
      const hasAnyMethod = Object.values(nextContactMethods).some(Boolean);
      return {
        ...current,
        contactMethods: hasAnyMethod
          ? nextContactMethods
          : { ...nextContactMethods, Chat: true },
      };
    });
  };

  const buildWorkSchedule = () => {
    if (formData.flexibleSchedule) return "Flexible schedule";
    const dateText = formatDate(formData.workDate);
    const start = formatTime(formData.startTime);
    const end = formatTime(formData.endTime);
    const timeText = start && end ? `${start} - ${end}` : start || end;
    return (
      [dateText, timeText].filter(Boolean).join(", ") ||
      "Schedule to be discussed"
    );
  };

  const buildRequirements = () => {
    const selected = Array.isArray(formData.requirements)
      ? [...formData.requirements]
      : [];
    const custom = formData.customRequirement.trim();
    if (custom) selected.push(custom);
    return selected.join(", ");
  };

  const buildContactPreference = () => {
    const selected = Object.entries(formData.contactMethods || {})
      .filter(([, checked]) => checked)
      .map(([method]) => method);
    return selected.length ? selected.join(" + ") : "Chat";
  };

  const buildRateDisplay = () => {
    const amount = Number(formData.rateAmount);
    const periodLabel = getRatePeriodLabel(formData.ratePeriod);
    const modeLabel = getRateModeLabel(formData.rateMode);

    if (!Number.isFinite(amount) || amount <= 0) {
      return formData.rateMode === "negotiable"
        ? "Rate negotiable"
        : "Rate to be discussed";
    }

    const peso = `₱${amount.toLocaleString("en-PH")}`;
    if (formData.rateMode === "fixed") return `${peso} ${periodLabel}`;
    if (formData.rateMode === "starting")
      return `${peso} starting ${periodLabel}`;
    return `${peso} ${periodLabel} • ${modeLabel.toLowerCase()}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isCreatingPost) return;

    setSubmitNotice({ type: "", message: "" });

    if (!formData.title.trim() || !formData.description.trim()) {
      setSubmitNotice({
        type: "error",
        message: "Please add a title and short description for the job post.",
      });
      return;
    }

    const slotCount = Number(formData.slots);
    if (!Number.isFinite(slotCount) || slotCount < 1) {
      setSubmitNotice({
        type: "error",
        message: "Please enter at least 1 available slot.",
      });
      return;
    }

    const homeBarangay = user?.barangay || "";
    let workBarangay;
    let isAllBarangays = false;

    if (formData.workLocationMode === "own") {
      workBarangay = homeBarangay;
      isAllBarangays = false;
    } else if (formData.workLocationMode === "all") {
      workBarangay = "all"; // special value
      isAllBarangays = true;
    } else {
      workBarangay = homeBarangay;
    }

    if (!workBarangay) {
      setSubmitNotice({
        type: "error",
        message: "Please choose where the job is located.",
      });
      return;
    }

    setIsCreatingPost(true);

    try {
      const isCrossBarangay =
        !isAllBarangays &&
        homeBarangay &&
        workBarangay &&
        homeBarangay !== workBarangay;
      const coverageBarangays = isAllBarangays
        ? [...barangayOptions]
        : Array.from(
            new Set(
              [...(formData.coverageBarangays || []), workBarangay].filter(
                Boolean,
              ),
            ),
          );

      await createPost({
        type: "job",
        title: formData.title.trim(),
        description: formData.description.trim(),
        opportunityType: formData.opportunityType,
        category: formData.category,
        salary: buildRateDisplay(),
        rateAmount: Number(formData.rateAmount) || 0,
        ratePeriod: formData.ratePeriod,
        rateMode: formData.rateMode,
        rateLabel: buildRateDisplay(),
        slots: Math.max(1, Number(formData.slots) || 1),
        availableSlots: Math.max(1, Number(formData.slots) || 1),
        filledSlots: 0,
        workSchedule: buildWorkSchedule(),
        workDate: formData.workDate,
        startTime: formData.startTime,
        endTime: formData.endTime,
        flexibleSchedule: formData.flexibleSchedule,
        requirements: buildRequirements(),
        contactPreference: buildContactPreference(),
        homeBarangay,
        workBarangay,
        jobBarangay: workBarangay,
        serviceBarangay: workBarangay,
        handlerBarangay: workBarangay,
        barangay: isAllBarangays ? "all" : workBarangay,
        coverageBarangays,
        supportBarangays:
          isCrossBarangay && !isAllBarangays ? [homeBarangay] : [],
        isCrossBarangay,
        isAllBarangays, // new flag for community-wide posts
        images: formData.images,
        author: user,
        status: "Active",
        responses: [],
        interestedUserIds: [],
      });

      resetForm();
      setSubmitNotice({
        type: "success",
        message:
          "Job post published successfully. It is now visible to all barangays in San Miguel.",
      });
      setIsModalOpen(false);
    } catch (error) {
      console.error("Unable to create job post.", error);
      setSubmitNotice({
        type: "error",
        message: error.message || "Post was not created. Please try again.",
      });
    } finally {
      setIsCreatingPost(false);
    }
  };

  const handleInterest = (post) => {
    if (
      post.author?.id === user?.id ||
      post.status === "Closed" ||
      isSlotsFull(post)
    )
      return;
    const alreadyResponded = (post.interestedUserIds || []).includes(user?.id);
    respondToJobPost(post.id, user, "interested");
    if (alreadyResponded) {
      window.alert("You already responded to this job post.");
    }
  };

  const handleChat = (post) => {
    if (
      !user ||
      !post.author ||
      post.author.id === user.id ||
      post.status === "Closed" ||
      isSlotsFull(post)
    )
      return;
    respondToJobPost(post.id, user, "chat");
    const chat = startChatFromPost(user, post, "job_chat");
    if (chat) navigate(`/chat?chat=${chat.id}`);
  };

  const handleReport = (post) => {
    const reason =
      window.prompt(
        "Reason for reporting this job post:",
        "Suspicious or misleading job details",
      ) || "Job post review requested";

    const handlerBarangay =
      getJobWorkBarangay(post) === "all"
        ? user?.barangay
        : getJobWorkBarangay(post) || post.barangay || user.barangay;
    const reportResult = createReport({
      reportedBy: user.name,
      reportedById: user.id,
      targetType: "job_post",
      targetId: post.id,
      targetTitle: post.title,
      targetUserId: post.author?.id,
      targetUserName: post.author?.name,
      category: "Scam",
      reason,
      details: `Resident requested a review for job post: ${post.title}`,
      barangay: handlerBarangay,
      handlerBarangay,
      incidentBarangay: handlerBarangay,
      homeBarangay:
        getJobHomeBarangay(post) || post.author?.barangay || post.barangay,
      status: "Pending",
    });

    window.alert(
      reportResult?.isDuplicateUpdate
        ? "You already have an active report for this post. Your new details were added to the existing case."
        : "Report submitted to the barangay admin handling this job location.",
    );
  };

  const handleDelete = (post) => {
    if (!window.confirm(`Delete post: ${post.title}?`)) return;
    deletePost(post.id);
  };

  const handleTogglePostStatus = (post) => {
    if (post.status === "Closed") {
      setJobPostStatus(post.id, "Active");
      return;
    }
    closePost(post.id);
  };

  const openCreateModalFor = (opportunityType) => {
    setOpportunityType(opportunityType);
    setIsModalOpen(true);
  };

  return (
    <ResidentLayout>
      <div className="container">
        <div
          className="page-hero"
          style={{ gap: "1rem", alignItems: "flex-start" }}
        >
          <div className="hero-text">
            <h1>Job Finding and Hiring</h1>
            <p>
              Choose what you need first: hire someone, find work, post a
              service, or browse opportunities across all San Miguel barangays.
            </p>
          </div>
          <div
            className="hero-actions"
            style={{ display: "grid", gap: "0.75rem" }}
          >
            <div
              className="view-mode-pillset"
              style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}
            >
              <Button
                size="sm"
                variant={barangayFilterMode === "self" ? "primary" : "outline"}
                onClick={() => setBarangayFilterMode("self")}
              >
                My Area
              </Button>
              <Button
                size="sm"
                variant={barangayFilterMode === "all" ? "primary" : "outline"}
                onClick={() => setBarangayFilterMode("all")}
              >
                All San Miguel
              </Button>
            </div>
            <Button
              variant="primary"
              onClick={() => openCreateModalFor("hiring")}
            >
              <Plus size={18} /> Create Job Post
            </Button>
          </div>
        </div>

        {/* Same smart insight card, metrics, filters as before, unchanged except wording */}
        <Card
          elevated
          className="smart-insight-card"
          style={{ marginBottom: "1rem" }}
        >
          <CardContent>
            <div
              className="toolbar-row"
              style={{ marginBottom: "0.85rem", alignItems: "flex-start" }}
            >
              <div>
                <p
                  className="section-kicker"
                  style={{ marginBottom: "0.25rem" }}
                >
                  Start here
                </p>
                <h3 style={{ marginBottom: "0.25rem" }}>
                  What do you need today?
                </h3>
                <p style={{ margin: 0, color: "var(--foreground-muted)" }}>
                  Tap one action and the page will guide your next step.
                </p>
              </div>
              <Badge variant="job">Community-wide jobs</Badge>
            </div>
            <div className="choice-card-grid">
              <button
                type="button"
                className={`choice-card ${quickIntent === "findWorker" ? "active" : ""}`}
                onClick={() => {
                  setQuickIntent("findWorker");
                  setFilter("seeking");
                }}
              >
                <Users size={20} />
                <strong>Find a Worker</strong>
                <span>
                  See residents offering services you can contact now.
                </span>
              </button>
              <button
                type="button"
                className={`choice-card ${quickIntent === "findJob" ? "active" : ""}`}
                onClick={() => {
                  setQuickIntent("findJob");
                  setFilter("hiring");
                }}
              >
                <Briefcase size={20} />
                <strong>Find a Job</strong>
                <span>Browse open hiring posts and apply or chat.</span>
              </button>
              <button
                type="button"
                className="choice-card"
                onClick={() => openCreateModalFor("hiring")}
              >
                <Plus size={20} />
                <strong>Post a Job Request</strong>
                <span>Need help? Post to all barangays.</span>
              </button>
              <button
                type="button"
                className="choice-card"
                onClick={() => openCreateModalFor("seeking")}
              >
                <User size={20} />
                <strong>Offer Your Service</strong>
                <span>Tell the whole San Miguel what work you can do.</span>
              </button>
            </div>
          </CardContent>
        </Card>

        <div className="metric-grid">
          <Card className="metric-card" elevated>
            <p className="metric-label">Visible Job Posts</p>
            <p className="metric-value">{filteredJobPosts.length}</p>
          </Card>
          <Card className="metric-card" elevated>
            <p className="metric-label">Hiring Posts</p>
            <p className="metric-value">
              {
                filteredJobPosts.filter(
                  (post) => post.opportunityType === "hiring",
                ).length
              }
            </p>
          </Card>
          <Card className="metric-card" elevated>
            <p className="metric-label">Job Seeking Posts</p>
            <p className="metric-value">
              {
                filteredJobPosts.filter(
                  (post) => post.opportunityType === "seeking",
                ).length
              }
            </p>
          </Card>
          <Card className="metric-card" elevated>
            <p className="metric-label">Community-wide</p>
            <p className="metric-value">
              {filteredJobPosts.filter((post) => post.isAllBarangays).length}
            </p>
          </Card>
        </div>

        <div className="toolbar-row">
          <div className="filters-row">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title, category, author, barangay, or description"
              icon={Search}
            />
            <select value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="all">All job posts</option>
              <option value="hiring">Job Hiring</option>
              <option value="seeking">Job Seeking</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="open">Open / Available</option>
              <option value="filled">Slots Full</option>
              <option value="all">All statuses</option>
              <option value="Active">Active</option>
              <option value="Flagged">Flagged</option>
              <option value="Closed">Closed</option>
            </select>
            <select
              value={quickIntent}
              onChange={(e) => setQuickIntent(e.target.value)}
            >
              <option value="all">All intents</option>
              <option value="findWorker">Find a Worker</option>
              <option value="findJob">Find a Job</option>
              <option value="myArea">My Area Matches</option>
            </select>
          </div>
        </div>

        {submitNotice.message ? (
          <div
            className={`smart-form-notice smart-form-notice--${submitNotice.type || "info"}`}
          >
            {submitNotice.message}
          </div>
        ) : null}

        {topJobMatches.length > 0 ? (
          <Card elevated className="smart-insight-card">
            <CardContent>
              <div className="toolbar-row" style={{ marginBottom: "0.75rem" }}>
                <div>
                  <p
                    className="section-kicker"
                    style={{ marginBottom: "0.25rem" }}
                  >
                    Smart job suggestions
                  </p>
                  <h3 style={{ marginBottom: 0 }}>Best matches for you</h3>
                </div>
                <Badge variant="job">Rule-based matching</Badge>
              </div>
              <div className="smart-suggestion-list">
                {topJobMatches.map(({ job, fit }) => (
                  <button
                    key={job.id}
                    type="button"
                    onClick={() => navigate(`/post/${job.id}`)}
                    className="smart-suggestion-item"
                  >
                    <strong>
                      {fit.percentage}% {fit.label}
                    </strong>
                    <span>{job.title}</span>
                    <small>
                      {fit.reasons.join(" • ")} • {getJobRouteLabel(job)}
                    </small>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : null}

        <div className="list-stack">
          {filteredJobs.length > 0 ? (
            filteredJobs.map((post) => {
              const isOwnPost = post.author?.id === user?.id;
              const alreadyResponded = (post.interestedUserIds || []).includes(
                user?.id,
              );
              const smartStatus = getSmartJobStatus(post);
              const isClosed = post.status === "Closed";
              const slotsFull = isSlotsFull(post);
              const remainingSlots = getRemainingSlots(post);
              const totalSlots = getTotalSlots(post);
              const coverImage = getPostCoverImage(post);
              const jobFit = getJobFitScore(post, user, filteredJobPosts);
              const workBarangay = getJobWorkBarangay(post);
              const homeBarangay = getJobHomeBarangay(post);
              const isAllBarangays = post.isAllBarangays === true;

              return (
                <Card key={post.id} elevated className="job-feed-card">
                  <CardContent>
                    <div
                      className="toolbar-row"
                      style={{ marginBottom: "0.75rem" }}
                    >
                      <div className="pill-row">
                        <Badge variant="job">
                          {jobTypeLabel(post.opportunityType)}
                        </Badge>
                        <Badge variant="secondary">
                          {post.category || "General"}
                        </Badge>
                        <Badge variant={statusVariant(smartStatus)}>
                          {smartStatus}
                        </Badge>
                        {isAllBarangays ? (
                          <Badge variant="success">🌍 All San Miguel</Badge>
                        ) : post.isCrossBarangay ? (
                          <Badge variant="warning">Cross-barangay</Badge>
                        ) : null}
                      </div>
                      {post.salary ? (
                        <Badge variant="success">{post.salary}</Badge>
                      ) : null}
                    </div>

                    <h3 className="job-feed-title">{post.title}</h3>
                    <p className="job-feed-description">{post.description}</p>

                    {coverImage ? (
                      <SmartMediaImage
                        src={coverImage}
                        alt={post.title}
                        size="cover"
                        className="post-cover-image job-feed-media"
                      />
                    ) : null}

                    <div className="meta-row" style={{ marginBottom: "1rem" }}>
                      <span>
                        <MapPin size={14} style={{ verticalAlign: "middle" }} />{" "}
                        {isAllBarangays
                          ? "📍 All San Miguel"
                          : `Work area: ${workBarangay || post.barangay}`}
                      </span>
                      {post.isCrossBarangay && !isAllBarangays ? (
                        <span>
                          <Globe
                            size={14}
                            style={{ verticalAlign: "middle" }}
                          />{" "}
                          {homeBarangay} → {workBarangay}
                        </span>
                      ) : null}
                      <span>
                        <User size={14} style={{ verticalAlign: "middle" }} />{" "}
                        {post.author?.name || "Resident"}
                      </span>
                      <span>
                        <Clock size={14} style={{ verticalAlign: "middle" }} />{" "}
                        Posted {formatRecordAge(post)}
                      </span>
                      <span>
                        <Briefcase
                          size={14}
                          style={{ verticalAlign: "middle" }}
                        />{" "}
                        {remainingSlots}/{totalSlots} slot
                        {totalSlots === 1 ? "" : "s"} left
                      </span>
                      <span>
                        <MessageSquare
                          size={14}
                          style={{ verticalAlign: "middle" }}
                        />{" "}
                        {post.contactPreference || "Chat"}
                      </span>
                      <span>
                        <Heart size={14} style={{ verticalAlign: "middle" }} />{" "}
                        {post.interests || 0} interested
                      </span>
                    </div>

                    {(post.workSchedule || post.requirements) && (
                      <div
                        style={{
                          display: "grid",
                          gap: "0.5rem",
                          marginBottom: "1rem",
                          color: "var(--foreground-muted)",
                        }}
                      >
                        {post.workSchedule ? (
                          <span>
                            <Clock
                              size={14}
                              style={{ verticalAlign: "middle" }}
                            />{" "}
                            Schedule: {post.workSchedule}
                          </span>
                        ) : null}
                        {post.requirements ? (
                          <span>Requirements: {post.requirements}</span>
                        ) : null}
                      </div>
                    )}

                    {jobFit ? (
                      <div className="smart-match-card job-fit-card">
                        <strong>
                          {jobFit.percentage}% {jobFit.label}
                        </strong>
                        <small>{jobFit.reasons.join(" • ")}</small>
                      </div>
                    ) : null}

                    {isOwnPost && (post.responses || []).length > 0 ? (
                      <div
                        style={{
                          padding: "0.85rem",
                          borderRadius: "14px",
                          background: "var(--surface-soft)",
                          marginBottom: "1rem",
                        }}
                      >
                        <strong>
                          {post.responses.length} resident response(s)
                        </strong>
                        <div
                          className="meta-row"
                          style={{ marginTop: "0.5rem" }}
                        >
                          {post.responses.slice(0, 3).map((response) => (
                            <span key={response.id}>
                              {response.userName} • {response.timestamp}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    <div className="inline-actions">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(`/post/${post.id}`)}
                      >
                        View Details
                      </Button>

                      {isOwnPost ? (
                        <>
                          <Button
                            size="sm"
                            variant={isClosed ? "success" : "outline"}
                            onClick={() => handleTogglePostStatus(post)}
                          >
                            {isClosed ? "Reopen Post" : "Close Post"}
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => handleDelete(post)}
                          >
                            <Trash2 size={16} /> Delete Post
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant={alreadyResponded ? "outline" : "primary"}
                            onClick={() => handleInterest(post)}
                            disabled={isClosed || slotsFull}
                          >
                            <Heart size={16} />{" "}
                            {slotsFull
                              ? "Slots Full"
                              : alreadyResponded
                                ? "Responded"
                                : "Interested"}
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleChat(post)}
                            disabled={isClosed || slotsFull}
                          >
                            <MessageSquare size={16} /> Chat Now
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleReport(post)}
                          >
                            <Shield size={16} /> Report
                          </Button>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <Card elevated>
              <div className="empty-state">
                No matching job posts yet. Choose another action, change the
                barangay scope, or create a post.
              </div>
            </Card>
          )}
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create Job Post"
        subtitle="Choose the purpose, schedule, rate, and where to post. 'All San Miguel' makes your post visible to every barangay."
        size="lg"
      >
        <form onSubmit={handleSubmit} className="smart-post-form">
          {submitNotice.message ? (
            <div
              className={`smart-form-notice smart-form-notice--${submitNotice.type || "info"}`}
            >
              {submitNotice.message}
            </div>
          ) : null}

          <div className="smart-section">
            <label className="input-label">What do you want to post?</label>
            <div className="choice-card-grid">
              <button
                type="button"
                className={`choice-card ${formData.opportunityType === "hiring" ? "active" : ""}`}
                onClick={() => setOpportunityType("hiring")}
              >
                <Briefcase size={20} />
                <strong>I need a worker</strong>
                <span>Job hiring</span>
              </button>
              <button
                type="button"
                className={`choice-card ${formData.opportunityType === "seeking" ? "active" : ""}`}
                onClick={() => setOpportunityType("seeking")}
              >
                <User size={20} />
                <strong>I am looking for work</strong>
                <span>Job seeking / service offer</span>
              </button>
            </div>
          </div>

          <div className="smart-section">
            <label className="input-label">
              Where should this post be visible?
            </label>
            <div className="choice-card-grid">
              <button
                type="button"
                className={`choice-card ${formData.workLocationMode === "own" ? "active" : ""}`}
                onClick={() => updateWorkLocationMode("own")}
              >
                <MapPin size={20} />
                <strong>My barangay only</strong>
                <span>{user?.barangay || "Your registered barangay"}</span>
              </button>
              <button
                type="button"
                className={`choice-card ${formData.workLocationMode === "all" ? "active" : ""}`}
                onClick={() => updateWorkLocationMode("all")}
              >
                <Globe size={20} />
                <strong>All San Miguel barangays</strong>
                <span>Visible to every resident in San Miguel</span>
              </button>
            </div>
            {formData.workLocationMode === "all" && (
              <small className="helper-text">
                Your post will appear in the feed of all 42 barangays. Admins
                from every barangay can view it, but only the primary admin of
                your home barangay can moderate if needed.
              </small>
            )}
          </div>

          {/* Rest of the form remains the same (category, title, slots, rate, schedule, requirements, description, contact, photos, buttons) */}
          <div className="smart-section">
            <label className="input-label">Category</label>
            <div className="chip-check-grid compact">
              {JOB_CATEGORIES.map((category) => (
                <label
                  key={category}
                  className={`chip-check ${formData.category === category ? "active" : ""}`}
                >
                  <input
                    type="radio"
                    name="job-category"
                    value={category}
                    checked={formData.category === category}
                    onChange={() => setFormData({ ...formData, category })}
                  />
                  <span>{category}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="smart-grid two">
            <Input
              label="Post Title"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              placeholder="Example: Need carpenter for small repair"
              required
            />
            <Input
              label="Available Slots"
              type="number"
              min="1"
              step="1"
              value={formData.slots}
              onChange={(e) =>
                setFormData({ ...formData, slots: e.target.value })
              }
              placeholder="1"
              required
            />
          </div>

          <div className="smart-section">
            <label className="input-label">Rate / Salary</label>
            <div className="smart-grid three">
              <Input
                label="Amount"
                type="number"
                min="0"
                step="1"
                value={formData.rateAmount}
                onChange={(e) =>
                  setFormData({ ...formData, rateAmount: e.target.value })
                }
                placeholder="700"
              />
              <div className="form-group">
                <label className="input-label">Period</label>
                <select
                  className="input"
                  value={formData.ratePeriod}
                  onChange={(e) =>
                    setFormData({ ...formData, ratePeriod: e.target.value })
                  }
                >
                  {RATE_PERIODS.map((period) => (
                    <option key={period.value} value={period.value}>
                      {period.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="input-label">Rate Type</label>
                <select
                  className="input"
                  value={formData.rateMode}
                  onChange={(e) =>
                    setFormData({ ...formData, rateMode: e.target.value })
                  }
                >
                  {RATE_MODES.map((mode) => (
                    <option key={mode.value} value={mode.value}>
                      {mode.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <small className="helper-text">Preview: {buildRateDisplay()}</small>
          </div>

          <div className="smart-section">
            <label className="input-label">Schedule</label>
            <label className="simple-checkbox schedule-toggle">
              <input
                type="checkbox"
                checked={formData.flexibleSchedule}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    flexibleSchedule: e.target.checked,
                  })
                }
              />
              <span>Flexible / to be discussed</span>
            </label>
            {!formData.flexibleSchedule && (
              <div className="smart-grid three">
                <Input
                  label="Date"
                  type="date"
                  value={formData.workDate}
                  onChange={(e) =>
                    setFormData({ ...formData, workDate: e.target.value })
                  }
                />
                <Input
                  label="Start Time"
                  type="time"
                  value={formData.startTime}
                  onChange={(e) =>
                    setFormData({ ...formData, startTime: e.target.value })
                  }
                />
                <Input
                  label="End Time"
                  type="time"
                  value={formData.endTime}
                  onChange={(e) =>
                    setFormData({ ...formData, endTime: e.target.value })
                  }
                />
              </div>
            )}
          </div>

          <div className="smart-section">
            <label className="input-label">Requirements / notes</label>
            <div className="chip-check-grid">
              {REQUIREMENT_OPTIONS.map((requirement) => (
                <label
                  key={requirement}
                  className={`chip-check ${formData.requirements.includes(requirement) ? "active" : ""}`}
                >
                  <input
                    type="checkbox"
                    checked={formData.requirements.includes(requirement)}
                    onChange={() => toggleRequirement(requirement)}
                  />
                  <span>{requirement}</span>
                </label>
              ))}
            </div>
            <Input
              value={formData.customRequirement}
              onChange={(e) =>
                setFormData({ ...formData, customRequirement: e.target.value })
              }
              placeholder="Optional custom note, e.g., bring cleaning supplies"
            />
          </div>

          <div className="smart-section">
            <label className="input-label">Short Description</label>
            <textarea
              rows="4"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Add only the important details: task, location, and instructions."
              required
            />
          </div>

          <div className="smart-grid two">
            <div className="smart-section flush">
              <label className="input-label">Contact Options</label>
              <div className="chip-check-grid compact">
                {Object.keys(formData.contactMethods).map((method) => (
                  <label
                    key={method}
                    className={`chip-check ${formData.contactMethods[method] ? "active" : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={formData.contactMethods[method]}
                      onChange={() => toggleContactMethod(method)}
                    />
                    <span>{method}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="smart-section flush">
              <label className="input-label">Routing Summary</label>
              <div className="smart-match-card">
                <strong>
                  <Target size={14} style={{ verticalAlign: "middle" }} />{" "}
                  {formData.workLocationMode === "all"
                    ? "All San Miguel"
                    : formData.workBarangay || user?.barangay || "No barangay"}
                </strong>
                <small>
                  {formData.workLocationMode === "all"
                    ? "Visible to all barangays. Any resident can see and respond."
                    : `Only residents of ${user?.barangay || "your barangay"} will see this.`}
                </small>
              </div>
            </div>
          </div>

          <div className="smart-section">
            <label className="input-label">Photos</label>
            <ImageUploader
              onImageSelect={(images) =>
                setFormData({
                  ...formData,
                  images: Array.isArray(images)
                    ? images
                    : images
                      ? [images]
                      : [],
                })
              }
              deferUpload
              multiple
              initialImages={formData.images}
              cloudinaryFolder={CLOUDINARY_FOLDERS.POSTS}
            />
            <small className="helper-text">
              Photos will be attached to your post and saved securely.
            </small>
          </div>

          <div className="modal-actions">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isCreatingPost}
              isLoading={isCreatingPost}
            >
              <Check size={16} />{" "}
              {isCreatingPost ? "Creating post..." : "Publish Job Post"}
            </Button>
          </div>
        </form>
      </Modal>
    </ResidentLayout>
  );
}

export default JobsPage;
