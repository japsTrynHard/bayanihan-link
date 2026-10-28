import React, { useMemo, useState } from "react";
import {
  Award,
  Calendar,
  Check,
  ChevronRight,
  Clock,
  Eye,
  Filter,
  HeartHandshake,
  Info,
  MapPin,
  MessageSquare,
  PackageCheck,
  Search,
  ShieldAlert,
  Sparkles,
  Trash2,
  UserCheck,
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
import { getPostCoverImage, getPostImages } from "../../utils/postImages";
import { formatRecordAge } from "../../utils/timeDisplay";
import {
  getLostFoundCompleteness,
  getLostFoundHomeBarangay,
  getLostFoundIncidentBarangay,
  getLostFoundQualityTips,
  getLostFoundRouteText,
  getTopLostFoundMatches,
  isCrossBarangayPost,
} from "../../utils/lostFoundMatching";
import SmartMediaImage from "../../components/SmartMediaImage";
import { BARANGAYS } from "../../utils/storage";
import {
  LOST_FOUND_CASE_TYPES,
  LOST_FOUND_CASE_TYPE_OPTIONS,
  getLostFoundCaseLabel,
  getLostFoundCaseOption,
  getLostFoundCaseType,
  getLostFoundResponseText,
  getLostFoundSafetyNotice,
  getLostFoundStatusOptions,
  isMissingPersonCase,
} from "../../utils/lostFoundCases";
import "../../styles/pages/LostAndFound.css";
import "../../styles/pages/PostCreate.css";

const CASE_CATEGORIES = {
  item: [
    "Phone / Gadget",
    "Wallet / Purse",
    "ID / Document",
    "Bag / Pouch",
    "Keys",
    "School Item",
    "Clothing",
    "Money / Valuables",
    "Others",
  ],
  pet: ["Dog", "Cat", "Bird", "Rabbit", "Other Pet / Animal"],
  person: [
    "Child",
    "Senior Citizen",
    "Adult",
    "Student",
    "Person Sighting / Information",
  ],
};

const COMMON_COLORS = [
  "Black",
  "White",
  "Blue",
  "Red",
  "Green",
  "Gray",
  "Brown",
  "Pink",
  "Yellow",
  "Mixed",
  "Not sure",
];

const typeLabel = (post) => getLostFoundCaseLabel(post);

const statusVariant = (status) => {
  if (["Returned", "Reunited", "Information Verified"].includes(status))
    return "success";
  if (status === "Claimed") return "warning";
  if (status === "Flagged") return "warning";
  if (status === "Removed") return "danger";
  if (status === "Closed") return "secondary";
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
  if (!date) return "Not specified";
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const formatDateTime = (date, time) =>
  [formatDate(date), formatTime(time)].filter(Boolean).join(" • ");

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

const getSmartImageTags = (post = {}) =>
  [
    post.category,
    post.color,
    post.brand,
    ...String(post.title || "")
      .split(/\s+/)
      .slice(0, 4),
  ]
    .filter(Boolean)
    .map((tag) => String(tag).toLowerCase());

const getTodayDateInput = () => new Date().toISOString().slice(0, 10);

const cleanText = (value) => String(value || "").trim();

const createDefaultForm = (
  type = "lost",
  caseType = LOST_FOUND_CASE_TYPES.ITEM,
) => ({
  type,
  caseType,
  category: "",
  title: "",
  color: "",
  brand: "",
  uniqueDetails: "",
  eventDate: getTodayDateInput(),
  eventTime: "",
  locationMode: "home",
  incidentBarangay: "",
  eventPlace: "",
  description: "",
  reward: "",
  hasReward: false,
  requiresProof: true,
  contactMethods: {
    Chat: true,
    Phone: false,
  },
});

const buildSmartItemTitle = (formData = {}) => {
  const directTitle = cleanText(formData.title);
  if (directTitle) return directTitle;

  const color = cleanText(formData.color);
  const category = cleanText(formData.category);
  const caseOption = getLostFoundCaseOption(formData);
  const brand = cleanText(formData.brand);
  const parts = [color !== "Not sure" ? color : "", brand, category].filter(
    Boolean,
  );
  if (parts.length) return parts.join(" ");

  const descriptionWords = cleanText(formData.description)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 6);
  if (descriptionWords.length) return descriptionWords.join(" ");

  return formData.type === "found"
    ? caseOption.foundLabel
    : caseOption.lostLabel;
};

const buildSmartDescription = (formData = {}, incidentBarangay = "") => {
  const description = cleanText(formData.description);
  if (description) return description;

  const caseOption = getLostFoundCaseOption(formData);
  const typePhrase =
    formData.type === "found"
      ? caseOption.foundLabel.toLowerCase()
      : caseOption.lostLabel.toLowerCase();
  const title = buildSmartItemTitle(formData);
  const place =
    cleanText(formData.eventPlace) || incidentBarangay || "barangay area";
  const color = cleanText(formData.color);
  const category = cleanText(formData.category);
  const details = [
    category,
    color && color !== "Not sure" ? color : "",
    cleanText(formData.brand),
  ]
    .filter(Boolean)
    .join(", ");
  return `${title} was reported as a ${typePhrase} near ${place}${details ? `. Details: ${details}.` : "."}`;
};

const normalizeDraftText = (value = "") =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9ñ\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

const hasSimilarDraftText = (first = "", second = "") => {
  const firstClean = normalizeDraftText(first);
  const secondClean = normalizeDraftText(second);
  if (!firstClean || !secondClean) return false;
  if (
    firstClean === secondClean ||
    firstClean.includes(secondClean) ||
    secondClean.includes(firstClean)
  )
    return true;

  const firstWords = new Set(
    firstClean.split(" ").filter((word) => word.length >= 3),
  );
  const secondWords = secondClean.split(" ").filter((word) => word.length >= 3);
  const shared = secondWords.filter((word) => firstWords.has(word));
  return shared.length >= 2;
};

const findDuplicateLostFoundPost = ({
  posts = [],
  user,
  formData,
  title,
  place,
  incidentBarangay,
}) => {
  const activeSimilar = posts.filter((post) => {
    if (!post || !["lost", "found"].includes(post.type)) return false;
    if (post.type !== formData.type) return false;
    if (getLostFoundCaseType(post) !== formData.caseType) return false;
    if (post.author?.id !== user?.id) return false;
    if (!["Active", "Claimed"].includes(post.status || "Active")) return false;
    if (getLostFoundIncidentBarangay(post) !== incidentBarangay) return false;
    return true;
  });

  const exact = activeSimilar.find(
    (post) =>
      hasSimilarDraftText(post.title, title) &&
      hasSimilarDraftText(
        post.itemPlace || post.placeLost || post.placeFound || "",
        place,
      ),
  );

  if (exact) return { level: "exact", post: exact };

  const possible = activeSimilar.find((post) => {
    const sameCategory =
      formData.category && post.category === formData.category;
    const sameColor = formData.color && post.color === formData.color;
    const similarTitle = hasSimilarDraftText(post.title, title);
    const similarPlace = hasSimilarDraftText(
      post.itemPlace || post.placeLost || post.placeFound || "",
      place,
    );
    return (
      (sameCategory && similarPlace) ||
      (similarTitle && (sameColor || similarPlace))
    );
  });

  return possible ? { level: "possible", post: possible } : null;
};

function LostAndFound() {
  const {
    allPosts,
    createPost,
    createReport,
    respondToLostFoundPost,
    startChatFromPost,
    markLostFoundStatus,
    deletePost,
    barangays = BARANGAYS,
  } = useApp();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeView, setActiveView] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("Active");
  const [uploadedImages, setUploadedImages] = useState([]);
  const [isCreatingPost, setIsCreatingPost] = useState(false);
  const [submitNotice, setSubmitNotice] = useState({ type: "", message: "" });
  const [claimPost, setClaimPost] = useState(null);
  const [claimProof, setClaimProof] = useState("");
  const [formData, setFormData] = useState(createDefaultForm("lost"));

  const barangayOptions = useMemo(() => {
    const source =
      Array.isArray(barangays) && barangays.length ? barangays : BARANGAYS;
    return source
      .map((item) => (typeof item === "string" ? item : item?.name))
      .filter((name) => name && name !== "Select Barangay")
      .sort((first, second) => first.localeCompare(second));
  }, [barangays]);

  const visibleLostFoundPosts = useMemo(() => {
    const posts = allPosts.filter(
      (post) =>
        ["lost", "found"].includes(post.type) && post.status !== "Removed",
    );
    if (!user?.barangay) return posts;

    return posts.filter((post) => {
      const incidentBarangay = getLostFoundIncidentBarangay(post);
      const homeBarangay = getLostFoundHomeBarangay(post);
      const isMine = post.author?.id === user?.id;
      return (
        isMine ||
        incidentBarangay === user.barangay ||
        homeBarangay === user.barangay
      );
    });
  }, [allPosts, user?.barangay, user?.id]);

  const lostFoundPosts = visibleLostFoundPosts;

  const activePosts = lostFoundPosts.filter(
    (post) => (post.status || "Active") === "Active",
  );
  const myPosts = lostFoundPosts.filter((post) => post.author?.id === user?.id);

  const smartMatchMap = useMemo(() => {
    const map = {};
    lostFoundPosts.forEach((post) => {
      map[post.id] = getTopLostFoundMatches(post, lostFoundPosts, 3);
    });
    return map;
  }, [lostFoundPosts]);

  const smartMatchPosts = lostFoundPosts.filter(
    (post) => (smartMatchMap[post.id] || []).length > 0,
  );

  const filtered = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return lostFoundPosts.filter((post) => {
      const matchesView =
        activeView === "lost"
          ? post.type === "lost"
          : activeView === "found"
            ? post.type === "found"
            : activeView === "mine"
              ? post.author?.id === user?.id
              : activeView === "matches"
                ? (smartMatchMap[post.id] || []).length > 0
                : activeView === "pets"
                  ? getLostFoundCaseType(post) === "pet"
                  : activeView === "person"
                    ? getLostFoundCaseType(post) === "person"
                    : activeView === "cross"
                      ? isCrossBarangayPost(post)
                      : true;
      const matchesStatus = filterStatus
        ? (post.status || "Active") === filterStatus
        : true;
      const matchesSearch = query
        ? [
            post.title,
            post.description,
            post.caseType,
            post.lostFoundCaseType,
            post.reward,
            post.category,
            post.color,
            post.brand,
            post.uniqueDetails,
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
      return matchesView && matchesStatus && matchesSearch;
    });
  }, [
    lostFoundPosts,
    activeView,
    filterStatus,
    searchTerm,
    smartMatchMap,
    user?.id,
  ]);

  const draftIncidentBarangay =
    formData.locationMode === "home"
      ? user?.barangay
      : formData.incidentBarangay;
  const draftSmartDate = formData.eventDate || getTodayDateInput();
  const draftSmartPlace =
    cleanText(formData.eventPlace) ||
    `${draftIncidentBarangay || user?.barangay || "Barangay"} area`;

  const draftPost = {
    id: "draft-preview",
    ...formData,
    caseType: formData.caseType,
    lostFoundCaseType: formData.caseType,
    title: buildSmartItemTitle(formData),
    description: buildSmartDescription(formData, draftIncidentBarangay),
    author: user,
    status: "Active",
    homeBarangay: user?.barangay,
    incidentBarangay: draftIncidentBarangay,
    itemBarangay: draftIncidentBarangay,
    barangay: draftIncidentBarangay,
    itemDate: draftSmartDate,
    itemPlace: draftSmartPlace,
    dateLost: formData.type === "lost" ? draftSmartDate : "",
    dateFound: formData.type === "found" ? draftSmartDate : "",
    placeLost: formData.type === "lost" ? draftSmartPlace : "",
    placeFound: formData.type === "found" ? draftSmartPlace : "",
    images: uploadedImages,
    imageTags: getSmartImageTags(formData),
  };

  const draftTips = getLostFoundQualityTips(draftPost, lostFoundPosts);
  const draftCompleteness = getLostFoundCompleteness(draftPost);
  const draftMatches = getTopLostFoundMatches(draftPost, lostFoundPosts, 3);

  const resetForm = (
    type = "lost",
    caseType = formData.caseType || LOST_FOUND_CASE_TYPES.ITEM,
  ) => {
    setFormData(createDefaultForm(type, caseType));
    setUploadedImages([]);
    setIsCreatingPost(false);
  };

  const openComposer = (
    type = "lost",
    caseType = LOST_FOUND_CASE_TYPES.ITEM,
  ) => {
    resetForm(type, caseType);
    setSubmitNotice({ type: "", message: "" });
    setIsModalOpen(true);
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

  const buildContactPreference = () => {
    const selected = Object.entries(formData.contactMethods || {})
      .filter(([, checked]) => checked)
      .map(([method]) => method);
    return selected.length ? selected.join(" + ") : "Chat";
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (isCreatingPost) return;

    setSubmitNotice({ type: "", message: "" });

    const incidentBarangay =
      formData.locationMode === "home"
        ? user?.barangay
        : formData.incidentBarangay;

    if (!incidentBarangay) {
      setSubmitNotice({
        type: "error",
        message:
          "Choose the barangay where it happened. This routes the case to the correct admin.",
      });
      return;
    }

    const smartTitle = buildSmartItemTitle(formData);
    const smartDescription = buildSmartDescription(formData, incidentBarangay);
    const smartDate = formData.eventDate || getTodayDateInput();
    const smartPlace =
      cleanText(formData.eventPlace) || `${incidentBarangay} area`;
    const hasEnoughItemIdentity = Boolean(
      cleanText(formData.title) ||
      cleanText(formData.category) ||
      cleanText(formData.description) ||
      cleanText(formData.brand) ||
      (cleanText(formData.color) && cleanText(formData.color) !== "Not sure"),
    );

    if (!hasEnoughItemIdentity) {
      setSubmitNotice({
        type: "error",
        message: `Add at least the ${formData.caseType === "person" ? "person name/description" : formData.caseType === "pet" ? "pet name/description" : "item name"} or choose a category. The rest can stay optional.`,
      });
      return;
    }

    const duplicateCheck = findDuplicateLostFoundPost({
      posts: lostFoundPosts,
      user,
      formData,
      title: smartTitle,
      place: smartPlace,
      incidentBarangay,
    });

    if (duplicateCheck?.level === "exact") {
      setSubmitNotice({
        type: "error",
        message: `Duplicate blocked: you already have an active ${formData.type} post for "${duplicateCheck.post.title}" in ${incidentBarangay}. Update the existing post instead of creating another one.`,
      });
      setActiveView("mine");
      return;
    }

    if (
      duplicateCheck?.level === "possible" &&
      !window.confirm(
        `Possible duplicate found: "${duplicateCheck.post.title}". Continue only if this is a different item.`,
      )
    ) {
      setSubmitNotice({
        type: "info",
        message: "Post cancelled to avoid duplicate Lost & Found records.",
      });
      return;
    }

    if (
      !window.confirm(
        `Publish this ${getLostFoundCaseLabel({ ...formData }).toLowerCase()} and route it to ${incidentBarangay}?`,
      )
    ) {
      setSubmitNotice({
        type: "info",
        message: "Publishing cancelled. No duplicate record was created.",
      });
      return;
    }

    const isFound = formData.type === "found";
    const isCrossBarangay = Boolean(
      user?.barangay && incidentBarangay && user.barangay !== incidentBarangay,
    );
    const itemDateDisplay = formatDateTime(smartDate, formData.eventTime);
    const rewardText =
      formData.hasReward && formData.reward.trim()
        ? formData.reward.trim()
        : formData.requiresProof
          ? "Owner must provide proof before claiming."
          : "";

    setIsCreatingPost(true);

    try {
      const createdPost = await createPost({
        type: formData.type,
        caseType: formData.caseType,
        lostFoundCaseType: formData.caseType,
        category: formData.category,
        color: formData.color,
        brand: formData.brand.trim(),
        uniqueDetails: formData.uniqueDetails.trim(),
        title: smartTitle,
        description: smartDescription,
        reward: rewardText,
        hasReward: formData.hasReward,
        requiresProof: formData.requiresProof,
        contactPreference: buildContactPreference(),
        author: user,
        images: uploadedImages,
        imageTags: getSmartImageTags(formData),
        status: "Active",
        homeBarangay: user?.barangay,
        incidentBarangay,
        handlerBarangay: incidentBarangay,
        supportBarangays: isCrossBarangay
          ? [user?.barangay].filter(Boolean)
          : [],
        itemBarangay: incidentBarangay,
        isCrossBarangay,
        privacySensitivity:
          formData.caseType === LOST_FOUND_CASE_TYPES.PERSON
            ? "High"
            : "Normal",
        adminPriority:
          formData.caseType === LOST_FOUND_CASE_TYPES.PERSON
            ? "high"
            : "normal",
        itemDate: smartDate,
        itemTime: formData.eventTime,
        itemDateDisplay,
        itemPlace: smartPlace,
        dateLost: isFound ? "" : smartDate,
        placeLost: isFound ? "" : smartPlace,
        dateFound: isFound ? smartDate : "",
        placeFound: isFound ? smartPlace : "",
        responses: [],
        interestedUserIds: [],
        barangay: incidentBarangay,
      });

      const matches = getTopLostFoundMatches(createdPost, lostFoundPosts, 3);
      resetForm(formData.type);
      setSubmitNotice({
        type: "success",
        message: matches.length
          ? `${getLostFoundCaseLabel(createdPost)} published. ${matches.length} possible match${matches.length > 1 ? "es" : ""} found — open Possible Matches to review.`
          : isCrossBarangay
            ? `${getLostFoundCaseLabel(createdPost)} published and routed to ${incidentBarangay}. Your home barangay can still see it as support record.`
            : `${getLostFoundCaseLabel(createdPost)} published successfully. It now appears in your barangay Lost & Found list.`,
      });
      setActiveView(matches.length ? "matches" : "mine");
      setIsModalOpen(false);
    } catch (error) {
      console.error("Unable to create lost/found post.", error);
      setSubmitNotice({
        type: "error",
        message: error.message || "Post was not created. Please try again.",
      });
    } finally {
      setIsCreatingPost(false);
    }
  };

  const handleQuickResponse = (post) => {
    if (post.author?.id === user?.id || (post.status || "Active") !== "Active")
      return;
    if (
      isMissingPersonCase(post) ||
      post.type === "found" ||
      post.requiresProof
    ) {
      setClaimPost(post);
      setClaimProof("");
      return;
    }

    if (
      !window.confirm(
        `Send a response to "${post.title}"? Duplicate responses are blocked automatically.`,
      )
    )
      return;

    const updated = respondToLostFoundPost(
      post.id,
      user,
      getLostFoundResponseText(post),
    );
    if (!updated) {
      setSubmitNotice({
        type: "info",
        message: "You already responded to this item post.",
      });
    } else {
      setSubmitNotice({
        type: "success",
        message:
          "Response sent. You can now use Chat Now for direct coordination.",
      });
    }
  };

  const handleClaimSubmit = (e) => {
    e.preventDefault();
    if (!claimPost) return;
    const proof = claimProof.trim();
    if (
      (claimPost.requiresProof || isMissingPersonCase(claimPost)) &&
      proof.length < 10
    ) {
      setSubmitNotice({
        type: "error",
        message: isMissingPersonCase(claimPost)
          ? "Please add a clear sighting/information detail before sending."
          : "Please add a short proof detail before claiming this case.",
      });
      return;
    }

    if (
      !window.confirm(
        `Submit this proof/response for "${claimPost.title}"? You can only submit once to avoid duplicate claims.`,
      )
    )
      return;

    const responseLabel = getLostFoundResponseText(claimPost, proof);
    const updated = respondToLostFoundPost(claimPost.id, user, responseLabel);
    if (!updated) {
      setSubmitNotice({
        type: "info",
        message: "You already responded to this item post.",
      });
    } else {
      setSubmitNotice({
        type: "success",
        message: isMissingPersonCase(claimPost)
          ? "Information sent. Use Chat Now only for verified coordination and avoid posting private details publicly."
          : "Response/proof sent. Wait for the owner or barangay admin to verify it.",
      });
    }
    setClaimPost(null);
    setClaimProof("");
  };

  const handleChat = (post) => {
    if (
      !user ||
      !post.author ||
      post.author.id === user.id ||
      (post.status || "Active") !== "Active"
    )
      return;
    const alreadyResponded = (post.interestedUserIds || []).includes(user?.id);
    if (
      !alreadyResponded &&
      !window.confirm(
        `Start chat for "${post.title}"? This also records one response so duplicate claims are prevented.`,
      )
    )
      return;
    respondToLostFoundPost(post.id, user, "Chat started");
    const chat = startChatFromPost(user, post, "lost_found_chat");
    if (chat) navigate(`/chat?chat=${chat.id}`);
  };

  const handleReport = (post) => {
    const reason = window.prompt(
      "Reason for reporting this lost/found post:",
      "Possible fake or suspicious lost/found listing",
    );
    const reportResult = createReport({
      reportedBy: user.name,
      reportedById: user.id,
      targetType: "lost_found_post",
      targetId: post.id,
      targetTitle: post.title,
      targetUserId: post.author?.id,
      targetUserName: post.author?.name,
      category: "Fake post",
      reason: reason || "Lost and found post review requested",
      details: `Resident requested a review for ${getLostFoundCaseLabel(post)}: ${post.title}`,
      barangay: getLostFoundIncidentBarangay(post) || user.barangay,
      status: "Pending",
    });
    setSubmitNotice({
      type: "success",
      message: reportResult?.isDuplicateUpdate
        ? "You already have an active report for this post. Your new details were added to the existing case."
        : "Report submitted to the barangay admin.",
    });
  };

  const handleDelete = (post) => {
    if (
      !window.confirm(
        `Delete your Lost & Found post: ${post.title}? This cannot be duplicated automatically and removes it from matching.`,
      )
    )
      return;
    deletePost(post.id);
    setSubmitNotice({
      type: "success",
      message: "Your Lost & Found post was deleted.",
    });
  };

  const handleOwnerStatusChange = (post, nextStatus) => {
    if ((post.status || "Active") === nextStatus) {
      setSubmitNotice({
        type: "info",
        message: `This post is already marked as ${nextStatus}.`,
      });
      return;
    }
    const confirmation =
      nextStatus === "Returned"
        ? `Mark "${post.title}" as Returned? Only confirm after the item has actually been returned.`
        : `Change "${post.title}" status to ${nextStatus}?`;
    if (!window.confirm(confirmation)) return;

    markLostFoundStatus(post.id, nextStatus);
    setSubmitNotice({
      type: "success",
      message: `Post status updated to ${nextStatus}. Duplicate status updates are blocked.`,
    });
  };

  const activeCount = activePosts.length;
  const returnedCount = lostFoundPosts.filter((post) =>
    ["Returned", "Reunited", "Information Verified"].includes(post.status),
  ).length;
  const matchCount = smartMatchPosts.length;
  const crossBarangayCount = lostFoundPosts.filter((post) =>
    isCrossBarangayPost(post),
  ).length;

  const viewTabs = [
    { key: "all", label: "All", count: lostFoundPosts.length },
    {
      key: "lost",
      label: "Lost",
      count: lostFoundPosts.filter((p) => p.type === "lost").length,
    },
    {
      key: "found",
      label: "Found",
      count: lostFoundPosts.filter((p) => p.type === "found").length,
    },
    {
      key: "pets",
      label: "Pets",
      count: lostFoundPosts.filter((p) => getLostFoundCaseType(p) === "pet")
        .length,
    },
    {
      key: "person",
      label: "Persons",
      count: lostFoundPosts.filter((p) => getLostFoundCaseType(p) === "person")
        .length,
    },
    { key: "matches", label: "Possible Matches", count: matchCount },
    { key: "cross", label: "Cross-Barangay", count: crossBarangayCount },
    { key: "mine", label: "My Posts", count: myPosts.length },
  ];

  return (
    <ResidentLayout>
      <div className="lost-found-shell">
        <section className="lf-hero-panel">
          <div className="lf-hero-copy">
            <p className="section-kicker">Community item recovery</p>
            <h1>Lost &amp; Found Center</h1>
            <p>
              Report items, pets, or missing-person information with correct
              barangay routing, safe proof checks, and direct Chat Now
              coordination.
            </p>
            <div className="lf-hero-actions">
              <Button
                variant="primary"
                onClick={() => openComposer("lost", LOST_FOUND_CASE_TYPES.ITEM)}
              >
                {" "}
                <Search size={18} /> Lost Item
              </Button>
              <Button
                variant="secondary"
                onClick={() => openComposer("lost", LOST_FOUND_CASE_TYPES.PET)}
              >
                {" "}
                <HeartHandshake size={18} /> Missing Pet
              </Button>
              <Button
                variant="danger"
                onClick={() =>
                  openComposer("lost", LOST_FOUND_CASE_TYPES.PERSON)
                }
              >
                {" "}
                <ShieldAlert size={18} /> Missing Person
              </Button>
            </div>
          </div>
          <div className="lf-hero-guide" aria-label="Lost and found flow">
            <div>
              <span>1</span>
              <strong>Choose route</strong>
              <small>Own barangay or another barangay</small>
            </div>
            <ChevronRight size={18} />
            <div>
              <span>2</span>
              <strong>Review matches</strong>
              <small>Smart score + reasons</small>
            </div>
            <ChevronRight size={18} />
            <div>
              <span>3</span>
              <strong>Verify & return</strong>
              <small>Proof before claim</small>
            </div>
          </div>
        </section>

        <section className="lf-intent-grid">
          <button
            type="button"
            className="lf-intent-card lost"
            onClick={() => openComposer("lost", LOST_FOUND_CASE_TYPES.ITEM)}
          >
            <div className="lf-intent-icon">
              <Search size={24} />
            </div>
            <div>
              <strong>Lost Item</strong>
              <span>Wallet, phone, ID, bag, keys, or valuables.</span>
            </div>
          </button>
          <button
            type="button"
            className="lf-intent-card found"
            onClick={() => openComposer("found", LOST_FOUND_CASE_TYPES.ITEM)}
          >
            <div className="lf-intent-icon">
              <PackageCheck size={24} />
            </div>
            <div>
              <strong>Found Item</strong>
              <span>Require proof before handover and use Chat Now.</span>
            </div>
          </button>
          <button
            type="button"
            className="lf-intent-card found"
            onClick={() => openComposer("lost", LOST_FOUND_CASE_TYPES.PET)}
          >
            <div className="lf-intent-icon">
              <HeartHandshake size={24} />
            </div>
            <div>
              <strong>Missing / Found Pet</strong>
              <span>Add last-seen place, markings, and reunite safely.</span>
            </div>
          </button>
          <button
            type="button"
            className="lf-intent-card lost"
            onClick={() => openComposer("lost", LOST_FOUND_CASE_TYPES.PERSON)}
          >
            <div className="lf-intent-icon">
              <ShieldAlert size={24} />
            </div>
            <div>
              <strong>Missing Person</strong>
              <span>
                Priority admin case with privacy-safe information only.
              </span>
            </div>
          </button>
        </section>

        <section className="lost-found-stats lf-stats-modern">
          <Card elevated>
            <CardContent>
              <strong>{activeCount}</strong>
              <span>Active cases</span>
            </CardContent>
          </Card>
          <Card elevated>
            <CardContent>
              <strong>{matchCount}</strong>
              <span>With possible matches</span>
            </CardContent>
          </Card>
          <Card elevated>
            <CardContent>
              <strong>{crossBarangayCount}</strong>
              <span>Cross-barangay routed</span>
            </CardContent>
          </Card>
          <Card elevated>
            <CardContent>
              <strong>{returnedCount}</strong>
              <span>Resolved / returned</span>
            </CardContent>
          </Card>
        </section>

        {submitNotice.message ? (
          <div
            className={`smart-form-notice smart-form-notice--${submitNotice.type || "info"}`}
          >
            {submitNotice.message}
          </div>
        ) : null}

        <section className="lf-control-panel">
          <div
            className="lf-tabs"
            role="tablist"
            aria-label="Lost and found filters"
          >
            {viewTabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={`lf-tab ${activeView === tab.key ? "active" : ""}`}
                onClick={() => setActiveView(tab.key)}
              >
                {tab.label}
                <span>{tab.count}</span>
              </button>
            ))}
          </div>
          <div className="lf-filter-grid">
            <Input
              label="Search case"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by item, pet, person, category, color, place, or description"
              icon={Search}
            />
            <div className="form-group compact-filter">
              <label className="input-label">
                <Filter size={14} /> Status
              </label>
              <select
                className="input"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="Active">Available / Active</option>
                <option value="">All Statuses</option>
                <option value="Claimed">Claimed</option>
                <option value="Returned">Returned</option>
                <option value="Closed">Closed</option>
                <option value="Flagged">Flagged</option>
              </select>
            </div>
          </div>
        </section>

        <section className="items-grid lf-items-grid">
          {filtered.length > 0 ? (
            filtered.map((post) => {
              const isOwnPost = post.author?.id === user?.id;
              const alreadyResponded = (post.interestedUserIds || []).includes(
                user?.id,
              );
              const isActive = (post.status || "Active") === "Active";
              const postImages = getPostImages(post);
              const coverImage = getPostCoverImage(post);
              const matches = smartMatchMap[post.id] || [];
              const bestMatch = matches[0];
              const completeness = getLostFoundCompleteness(post);
              const description = String(post.description || "");

              return (
                <Card key={post.id} elevated hoverable className="lf-item-card">
                  <div className={`lf-card-status-stripe ${post.type}`} />
                  {coverImage ? (
                    <div className="item-image lf-item-image">
                      <SmartMediaImage
                        src={coverImage}
                        alt={post.title}
                        size="cover"
                        showHint={true}
                        overlay={
                          postImages.length > 1 ? (
                            <div className="image-count">
                              +{postImages.length - 1}
                            </div>
                          ) : null
                        }
                      />
                    </div>
                  ) : (
                    <div className="lf-no-image">
                      <PackageCheck size={32} />
                      <span>No photo attached</span>
                    </div>
                  )}
                  <CardContent>
                    <div className="item-header lf-card-badges">
                      <Badge variant={post.type}>{typeLabel(post)}</Badge>
                      <Badge variant={statusVariant(post.status)}>
                        {post.status || "Active"}
                      </Badge>
                      <Badge variant="secondary">
                        {getLostFoundCaseOption(post).label}
                      </Badge>
                      {bestMatch ? (
                        <Badge variant={bestMatch.variant}>
                          {bestMatch.percentage}% {bestMatch.label}
                        </Badge>
                      ) : null}
                    </div>

                    <div className="lf-item-title-row">
                      <h3 className="item-title">{post.title}</h3>
                      {post.requiresProof ? (
                        <span className="lf-proof-chip">
                          <ShieldAlert size={13} /> Proof required
                        </span>
                      ) : null}
                    </div>

                    <div className="lf-attribute-row">
                      {post.category ? <span>{post.category}</span> : null}
                      {post.color ? <span>{post.color}</span> : null}
                      {post.brand ? <span>{post.brand}</span> : null}
                      {isCrossBarangayPost(post) ? (
                        <span>Cross-barangay</span>
                      ) : null}
                    </div>

                    <div className="lf-route-chip">
                      <MapPin size={14} /> {getLostFoundRouteText(post)}
                    </div>

                    <p className="item-description">
                      {description.substring(0, 135)}
                      {description.length > 135 ? "..." : ""}
                    </p>
                    {post.reward ? (
                      <p className="reward-text">
                        <Award size={15} /> {post.reward}
                      </p>
                    ) : null}

                    <div className="item-meta lf-item-meta">
                      <span>
                        <MapPin size={14} /> {getItemPlace(post)} •{" "}
                        {getLostFoundIncidentBarangay(post) || post.barangay}
                      </span>
                      <span>
                        <Calendar size={14} />{" "}
                        {post.type === "found" ? "Found" : "Lost"}:{" "}
                        {getItemDate(post)}
                      </span>
                      <span>
                        <Clock size={14} /> Posted {formatRecordAge(post)}
                      </span>
                      <span>
                        <HeartHandshake size={14} />{" "}
                        {post.contactPreference || "Chat"}
                      </span>
                    </div>

                    <div className="lf-quality-meter" title="Post completeness">
                      <span style={{ width: `${completeness}%` }} />
                    </div>

                    {bestMatch ? (
                      <div className="smart-match-card lf-smart-match-card">
                        <div>
                          <strong>
                            {bestMatch.percentage}% {bestMatch.label}
                          </strong>
                          <span>{bestMatch.candidate.title}</span>
                          <small>{bestMatch.reasons.join(" • ")}</small>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            navigate(`/post/${bestMatch.candidate.id}`)
                          }
                        >
                          <Eye size={15} /> Review
                        </Button>
                      </div>
                    ) : null}

                    {(post.responses || []).length > 0 ? (
                      <div className="lf-response-chip">
                        <UserCheck size={14} /> {(post.responses || []).length}{" "}
                        response(s) waiting for review
                      </div>
                    ) : null}

                    {isOwnPost ? (
                      <div className="status-control-row lf-owner-status">
                        <label>Status</label>
                        <select
                          className="input"
                          value={post.status || "Active"}
                          onChange={(e) =>
                            handleOwnerStatusChange(post, e.target.value)
                          }
                        >
                          {getLostFoundStatusOptions(post).map(
                            (statusOption) => (
                              <option key={statusOption} value={statusOption}>
                                {statusOption}
                              </option>
                            ),
                          )}
                        </select>
                      </div>
                    ) : null}

                    <div className="item-actions lf-item-actions">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(`/post/${post.id}`)}
                      >
                        <Eye size={16} /> Details
                      </Button>
                      {isOwnPost ? (
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => handleDelete(post)}
                        >
                          <Trash2 size={16} /> Delete
                        </Button>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="primary"
                            disabled={!isActive}
                            onClick={() => handleChat(post)}
                          >
                            <MessageSquare size={16} /> Chat Now
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleReport(post)}
                          >
                            <ShieldAlert size={16} /> Report
                          </Button>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <Card className="lf-empty-card">
              <CardContent>
                <Sparkles size={32} />
                <h3>No items found</h3>
                <p>
                  No lost/found items match your current filters. Try clearing
                  search or create a new post.
                </p>
                <div className="lf-empty-actions">
                  <Button
                    variant="primary"
                    onClick={() =>
                      openComposer("lost", LOST_FOUND_CASE_TYPES.ITEM)
                    }
                  >
                    Post Lost Item
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() =>
                      openComposer("found", LOST_FOUND_CASE_TYPES.ITEM)
                    }
                  >
                    Post Found Item
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </section>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={getLostFoundCaseLabel(formData)}
        subtitle="Fast form: subject + route first, optional details only when needed."
        size="xl"
      >
        <form
          onSubmit={handleCreatePost}
          className="smart-post-form lf-smart-form lf-quick-form"
        >
          {submitNotice.message ? (
            <div
              className={`smart-form-notice smart-form-notice--${submitNotice.type || "info"}`}
            >
              {submitNotice.message}
            </div>
          ) : null}

          <div className="lf-quick-header">
            <div>
              <span className="lf-step-pill">Quick post</span>
              <h3>{getLostFoundCaseLabel(formData)}</h3>
              <p>
                Choose if this is an item, pet, or person case. The incident
                barangay becomes the main handler.
              </p>
            </div>
            <div className="lf-quick-ready" aria-label="Post readiness">
              <strong>{draftCompleteness}%</strong>
              <span>smart ready</span>
              <div className="lf-quality-meter large">
                <span style={{ width: `${draftCompleteness}%` }} />
              </div>
            </div>
          </div>

          <div className="lf-case-type-grid" aria-label="Choose case type">
            {LOST_FOUND_CASE_TYPE_OPTIONS.map((option) => (
              <button
                key={option.key}
                type="button"
                className={`lf-case-type-card ${formData.caseType === option.key ? "active" : ""}`}
                onClick={() =>
                  setFormData({
                    ...createDefaultForm(formData.type, option.key),
                    locationMode: formData.locationMode,
                    incidentBarangay: formData.incidentBarangay,
                    eventDate: formData.eventDate,
                    eventPlace: formData.eventPlace,
                  })
                }
              >
                <strong>{option.label}</strong>
                <span>
                  {formData.type === "found"
                    ? option.foundHint
                    : option.lostHint}
                </span>
              </button>
            ))}
          </div>

          <div
            className={`lf-safety-note ${formData.caseType === LOST_FOUND_CASE_TYPES.PERSON ? "danger" : ""}`}
          >
            <ShieldAlert size={17} />{" "}
            {getLostFoundSafetyNotice(formData.caseType)}
          </div>

          <div
            className="lf-quick-choice-row"
            aria-label="Choose lost or found"
          >
            <button
              type="button"
              className={`lf-big-choice ${formData.type === "lost" ? "active" : ""}`}
              onClick={() => setFormData({ ...formData, type: "lost" })}
            >
              <Search size={22} />
              <span>
                <strong>{getLostFoundCaseOption(formData).lostAction}</strong>
                <small>System will search relevant matching records</small>
              </span>
            </button>
            <button
              type="button"
              className={`lf-big-choice ${formData.type === "found" ? "active" : ""}`}
              onClick={() =>
                setFormData({ ...formData, type: "found", requiresProof: true })
              }
            >
              <PackageCheck size={22} />
              <span>
                <strong>{getLostFoundCaseOption(formData).foundAction}</strong>
                <small>
                  {formData.caseType === LOST_FOUND_CASE_TYPES.PERSON
                    ? "Send info to admin/reporter safely"
                    : "Owner must prove before return"}
                </small>
              </span>
            </button>
          </div>

          <div className="lf-quick-main-grid">
            <section className="lf-quick-card">
              <div className="lf-quick-card-title">
                <span>1</span>
                <div>
                  <strong>
                    {formData.caseType === LOST_FOUND_CASE_TYPES.PERSON
                      ? "Who / what information?"
                      : formData.caseType === LOST_FOUND_CASE_TYPES.PET
                        ? "What pet?"
                        : "What item?"}
                  </strong>
                  <small>
                    Name/description or category is enough to start.
                  </small>
                </div>
              </div>

              <Input
                label={
                  formData.caseType === LOST_FOUND_CASE_TYPES.PERSON
                    ? "Person name / safe identifier"
                    : formData.caseType === LOST_FOUND_CASE_TYPES.PET
                      ? "Pet name / description"
                      : "Item name"
                }
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder={
                  formData.caseType === LOST_FOUND_CASE_TYPES.PERSON
                    ? "e.g., missing senior, student with blue shirt"
                    : formData.caseType === LOST_FOUND_CASE_TYPES.PET
                      ? "e.g., brown aspin, white cat with collar"
                      : "e.g., black wallet, Vivo phone, school ID"
                }
              />

              <div className="smart-grid two lf-form-grid">
                <div className="form-group">
                  <label className="input-label">Category</label>
                  <select
                    className="input"
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value })
                    }
                  >
                    <option value="">Auto / Not sure</option>
                    {(
                      CASE_CATEGORIES[formData.caseType] || CASE_CATEGORIES.item
                    ).map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="input-label">Color</label>
                  <select
                    className="input"
                    value={formData.color}
                    onChange={(e) =>
                      setFormData({ ...formData, color: e.target.value })
                    }
                  >
                    <option value="">Not sure</option>
                    {COMMON_COLORS.map((color) => (
                      <option key={color} value={color}>
                        {color}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="smart-section flush">
                <label className="input-label">Optional note</label>
                <textarea
                  className="input"
                  rows="3"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder={
                    formData.caseType === LOST_FOUND_CASE_TYPES.PERSON
                      ? "Privacy-safe details only. Example: last seen near public landmark wearing a blue shirt. Avoid exact home address/private IDs."
                      : formData.caseType === LOST_FOUND_CASE_TYPES.PET
                        ? "Example: last seen near market, brown aspin, red collar, friendly. Add safe landmarks."
                        : formData.type === "found"
                          ? "Safe public detail only. Example: found near gate, black case. Do not expose full ID numbers."
                          : "Example: last seen near market, black wallet, has zipper. Keep private details out."
                  }
                />
              </div>
            </section>

            <section className="lf-quick-card">
              <div className="lf-quick-card-title">
                <span>2</span>
                <div>
                  <strong>Where should we route it?</strong>
                  <small>Admin of this barangay becomes the handler.</small>
                </div>
              </div>

              <div className="lf-route-toggle">
                <button
                  type="button"
                  className={formData.locationMode === "home" ? "active" : ""}
                  onClick={() =>
                    setFormData({
                      ...formData,
                      locationMode: "home",
                      incidentBarangay: "",
                    })
                  }
                >
                  <MapPin size={17} /> My barangay{" "}
                  <small>{user?.barangay || "Registered barangay"}</small>
                </button>
                <button
                  type="button"
                  className={formData.locationMode === "other" ? "active" : ""}
                  onClick={() =>
                    setFormData({
                      ...formData,
                      locationMode: "other",
                      incidentBarangay: formData.incidentBarangay || "",
                    })
                  }
                >
                  <MapPin size={17} /> Other barangay{" "}
                  <small>Lost/found elsewhere</small>
                </button>
              </div>

              {formData.locationMode === "other" ? (
                <div className="form-group lf-incident-select">
                  <label className="input-label">
                    Barangay where it happened
                  </label>
                  <select
                    className="input"
                    value={formData.incidentBarangay}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        incidentBarangay: e.target.value,
                      })
                    }
                  >
                    <option value="">Select barangay</option>
                    {barangayOptions.map((barangay) => (
                      <option key={barangay} value={barangay}>
                        {barangay}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              <Input
                label="Place / landmark"
                value={formData.eventPlace}
                onChange={(e) =>
                  setFormData({ ...formData, eventPlace: e.target.value })
                }
                placeholder="e.g., plaza, school gate, terminal, market"
              />

              <Input
                label={
                  formData.caseType === LOST_FOUND_CASE_TYPES.PERSON
                    ? formData.type === "found"
                      ? "Date of sighting/information"
                      : "Date last seen"
                    : formData.type === "found"
                      ? "Date found"
                      : "Date lost"
                }
                type="date"
                value={formData.eventDate}
                onChange={(e) =>
                  setFormData({ ...formData, eventDate: e.target.value })
                }
              />
            </section>
          </div>

          <details className="lf-advanced-details">
            <summary>
              <Sparkles size={17} /> Optional smart details for stronger
              matching
              <small>
                Brand, private proof, time, reward, contact, and photos
              </small>
            </summary>
            <div className="lf-advanced-body">
              <div className="smart-grid three lf-form-grid">
                <Input
                  label="Brand / model / label"
                  value={formData.brand}
                  onChange={(e) =>
                    setFormData({ ...formData, brand: e.target.value })
                  }
                  placeholder="e.g., Samsung, Nike, National ID"
                />
                <Input
                  label="Private proof detail"
                  value={formData.uniqueDetails}
                  onChange={(e) =>
                    setFormData({ ...formData, uniqueDetails: e.target.value })
                  }
                  placeholder="e.g., sticker, initials, lockscreen hint"
                />
                <Input
                  label="Approx. time"
                  type="time"
                  value={formData.eventTime}
                  onChange={(e) =>
                    setFormData({ ...formData, eventTime: e.target.value })
                  }
                />
              </div>

              <div className="lf-form-assist-grid compact">
                <div className="smart-section flush">
                  <label className="input-label">Claim / contact</label>
                  <div className="checkbox-stack">
                    <label className="simple-checkbox">
                      <input
                        type="checkbox"
                        checked={formData.requiresProof}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            requiresProof: e.target.checked,
                          })
                        }
                      />
                      <span>Require proof before claiming</span>
                    </label>
                    <label className="simple-checkbox">
                      <input
                        type="checkbox"
                        checked={formData.hasReward}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            hasReward: e.target.checked,
                          })
                        }
                      />
                      <span>
                        {formData.caseType === LOST_FOUND_CASE_TYPES.PERSON
                          ? "Add admin note"
                          : formData.type === "lost"
                            ? "Add reward"
                            : "Add special claim note"}
                      </span>
                    </label>
                  </div>
                  {formData.hasReward ? (
                    <Input
                      value={formData.reward}
                      onChange={(e) =>
                        setFormData({ ...formData, reward: e.target.value })
                      }
                      placeholder={
                        formData.type === "lost"
                          ? "e.g., ₱500 reward"
                          : "e.g., Owner must describe lock screen"
                      }
                    />
                  ) : null}
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

                <div className="lf-smart-advice-card compact">
                  <div className="lf-advice-title">
                    <Info size={18} /> Smart checks
                  </div>
                  {draftTips.length ? (
                    <ul>
                      {draftTips.slice(0, 4).map((tip) => (
                        <li key={tip}>{tip}</li>
                      ))}
                    </ul>
                  ) : (
                    <p>Enough details for smart routing and matching.</p>
                  )}
                  {draftMatches.length ? (
                    <div className="lf-draft-matches">
                      <strong>
                        {draftMatches.length} possible match
                        {draftMatches.length > 1 ? "es" : ""}
                      </strong>
                      {draftMatches.map((match) => (
                        <span key={match.candidateId}>
                          {match.percentage}% • {match.candidate.title}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="smart-section flush">
                <label className="input-label">Photos</label>
                <ImageUploader
                  onImageSelect={(images) =>
                    setUploadedImages(
                      Array.isArray(images) ? images : images ? [images] : [],
                    )
                  }
                  deferUpload
                  multiple={true}
                  initialImages={uploadedImages}
                  cloudinaryFolder={CLOUDINARY_FOLDERS.POSTS}
                />
                <small className="helper-text">
                  Optional, but photos improve trust and recognition.
                </small>
              </div>
            </div>
          </details>

          <div className="lf-publish-preview">
            <Check size={18} />
            <span>
              System will publish as{" "}
              <strong>
                {getLostFoundCaseLabel(formData)}:{" "}
                {buildSmartItemTitle(formData)}
              </strong>
              , route to{" "}
              <strong>
                {draftIncidentBarangay || user?.barangay || "selected barangay"}
              </strong>
              , then look for safe relevant matches.
            </span>
          </div>

          <div className="modal-actions lf-modal-actions">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              disabled={isCreatingPost}
              isLoading={isCreatingPost}
            >
              <Check size={16} />{" "}
              {isCreatingPost ? "Creating..." : "Publish Post"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={Boolean(claimPost)}
        onClose={() => setClaimPost(null)}
        title={
          claimPost
            ? isMissingPersonCase(claimPost)
              ? "Send Information"
              : claimPost.type === "found"
                ? "Submit Proof"
                : "Send Details"
            : "Respond"
        }
        subtitle="Add safe details so the owner or barangay admin can verify before the next action."
        size="md"
      >
        <form className="lf-claim-form" onSubmit={handleClaimSubmit}>
          <div className="lf-claim-summary">
            <Badge variant={claimPost?.type}>
              {claimPost ? typeLabel(claimPost) : "Case"}
            </Badge>
            <strong>{claimPost?.title}</strong>
            <span>{claimPost ? getItemPlace(claimPost) : ""}</span>
          </div>
          <div className="smart-section">
            <label className="input-label">Proof / Detail</label>
            <textarea
              className="input"
              rows="4"
              value={claimProof}
              onChange={(e) => setClaimProof(e.target.value)}
              placeholder={
                claimPost && isMissingPersonCase(claimPost)
                  ? "Example: safe sighting details, public landmark, time, and how admin can verify. Do not post private information."
                  : claimPost?.type === "found"
                    ? "Example: describe hidden mark, item contents, lockscreen, initials, collar mark, or receipt detail."
                    : "Example: where you found/saw it, current condition, or safe detail only the owner can confirm."
              }
            />
          </div>
          <div className="modal-actions">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setClaimPost(null)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              <UserCheck size={16} />{" "}
              {claimPost && isMissingPersonCase(claimPost)
                ? "Send Information"
                : "Send for Verification"}
            </Button>
          </div>
        </form>
      </Modal>
    </ResidentLayout>
  );
}

export default LostAndFound;
