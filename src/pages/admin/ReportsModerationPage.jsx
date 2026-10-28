import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Search,
  Shield,
  CheckCircle,
  XCircle,
  Eye,
  Trash2,
  UserX,
  AlertTriangle,
  Flag,
  MessageSquare,
  FileText,
  UserRound,
  Clock,
  RefreshCcw,
  SlidersHorizontal,
  Info,
  Check,
  Ban,
} from "lucide-react";
import Card, { CardContent } from "../../components/Card";
import Badge from "../../components/Badge";
import Button from "../../components/Button";
import Input from "../../components/Input";
import AdminLayout from "../../components/AdminLayout";
import Modal from "../../components/Modal";
import SmartMediaImage from "../../components/SmartMediaImage";
import { useApp } from "../../context/AppContext";
import { useAuth } from "../../context/AuthContext";
import { getPriorityLabel, getReportRiskScore } from "../../utils/adminDecisionSupport";
import {
  USER_STATUS,
  addUserWarning as storageAddUserWarning,
  getChats,
  getPosts,
  getReports,
  getUsers,
  setUserStatus as storageSetUserStatus,
  updatePost as storageUpdatePost,
  updateReport as storageUpdateReport,
} from "../../utils/storage";
import "../../styles/pages/Dashboard.css";
import "../../styles/pages/AdminReports.css";

const reportReasonOptions = [
  "All reasons",
  "Fake post",
  "Scam",
  "Inappropriate content",
  "Wrong information",
  "Harassment",
  "Suspicious or misleading post/chat",
  "Fake claim or fake owner",
  "Spam or scam behavior",
  "Other",
];

const statusVariant = (status) => {
  if (status === "Resolved") return "success";
  if (status === "Dismissed") return "secondary";
  if (status === "Under Review") return "warning";
  if (status === "Needs Evidence") return "warning";
  return "danger";
};

const statusTone = (status) => {
  if (status === "Resolved") return "resolved";
  if (status === "Dismissed") return "dismissed";
  if (status === "Under Review") return "review";
  if (status === "Needs Evidence") return "review";
  return "pending";
};

const targetLabel = (type) => {
  if (type === "job_post") return "Job post report";
  if (type === "lost_found_post") return "Lost & found report";
  if (type === "user") return "Resident account report";
  if (type === "chat_conversation") return "Chat conversation report";
  return "Post / content report";
};

const getReportKind = (report = {}) => {
  if (report.targetType === "chat_conversation" || report.relatedChat || report.chatSnapshot) return "chat";
  if (["job_post", "lost_found_post", "post"].includes(report.targetType)) return "post";
  if (["user", "resident", "account"].includes(report.targetType)) return "account";
  return "general";
};

const kindDetails = {
  post: {
    label: "Post content",
    icon: FileText,
    description: "Review the reported post first, then flag or remove only if the concern is valid.",
  },
  chat: {
    label: "Conversation",
    icon: MessageSquare,
    description: "Open the chat evidence before warning or suspending a resident.",
  },
  account: {
    label: "Resident account",
    icon: UserRound,
    description: "Check the resident profile and report history before applying account penalties.",
  },
  general: {
    label: "General report",
    icon: Shield,
    description: "Review the details and record the correct status for this complaint.",
  },
};

const getRecordTime = (item = {}) => {
  const raw = item.updatedAtIso || item.updatedAt || item.resolvedAt || item.reviewedAt || item.createdAtIso || item.createdAt || item.timestamp || 0;
  const time = new Date(raw).getTime();
  return Number.isNaN(time) ? 0 : time;
};

const mergeById = (...groups) => {
  const map = new Map();
  groups.flat().filter(Boolean).forEach((item) => {
    if (!item?.id) return;
    const key = String(item.id);
    const existing = map.get(key);
    if (!existing || getRecordTime(item) >= getRecordTime(existing)) {
      map.set(key, { ...(existing || {}), ...item });
    }
  });
  return [...map.values()];
};

const safeDate = (value) => {
  const time = new Date(value || 0).getTime();
  return Number.isNaN(time) ? 0 : time;
};

const sortNewestFirst = (items) => [...items].sort((a, b) => getRecordTime(b) - getRecordTime(a));

const actionCopy = {
  start_review: {
    title: "Start reviewing this report?",
    button: "Start review",
    defaultNote: "Admin started reviewing this report.",
    impact: ["Status will become Under Review.", "The report stays visible in the review queue.", "A moderation note will be saved for audit trail."],
  },
  resolve: {
    title: "Mark this report as resolved?",
    button: "Resolve report",
    defaultNote: "Report resolved after admin verification.",
    impact: ["Status will become Resolved.", "The action will be recorded as handled by the barangay admin.", "Resident notification can use this status later when Firebase is connected."],
  },
  dismiss: {
    title: "Dismiss this report?",
    button: "Dismiss report",
    defaultNote: "Dismissed because the report was not supported after review.",
    impact: ["Status will become Dismissed.", "No content or resident penalty will be applied.", "The reason will remain in the report history."],
  },
  needs_evidence: {
    title: "Request more evidence for this report?",
    button: "Request evidence",
    defaultNote: "More evidence is needed before the barangay admin can decide.",
    impact: ["Status will become Needs Evidence.", "The report remains active instead of being dismissed early.", "Future duplicate submissions from the same reporter will be merged back into this case."],
  },
  flag_post: {
    title: "Flag the reported post?",
    button: "Flag post",
    defaultNote: "Post flagged because it needs barangay review.",
    impact: ["The post status will become Flagged.", "The report will be marked Resolved after the content action.", "Use this when the post should stay visible only after further checking."],
  },
  remove_post: {
    title: "Remove the reported post?",
    button: "Remove post",
    defaultNote: "Post removed because it violated barangay community guidelines.",
    impact: ["The post status will become Removed.", "The report will be marked Resolved.", "Use this only for verified false, scam, abusive, or unsafe content."],
    danger: true,
  },
  warn_user: {
    title: "Warn this resident?",
    button: "Warn resident",
    defaultNote: "Resident warned because of a verified report.",
    impact: ["The resident account will be marked Warned.", "A warning record will be saved in the resident profile.", "The report will be marked Resolved after the warning."],
  },
  suspend_user: {
    title: "Suspend this resident account?",
    button: "Suspend resident",
    defaultNote: "Resident suspended because of a serious verified report.",
    impact: ["The resident account status will become Suspended.", "The report will be marked Resolved.", "Use this only for serious or repeated confirmed violations."],
    danger: true,
  },
};

function ReportsModerationPage() {
  const app = useApp() || {};
  const {
    reports,
    allPosts,
    users,
    chats,
    updatePost,
    updateReport,
    moderateReport,
    removePostByAdmin,
    warnUser,
    suspendUser,
    addNotification,
    reloadAppData,
  } = app;
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const focusedReportId = searchParams.get("report") || searchParams.get("reportId") || "";

  const safeReports = Array.isArray(reports) ? reports : [];
  const safePosts = Array.isArray(allPosts) ? allPosts : [];
  const safeUsers = Array.isArray(users) ? users : [];
  const safeChats = Array.isArray(chats) ? chats : [];

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("action");
  const [typeFilter, setTypeFilter] = useState("all");
  const [reasonFilter, setReasonFilter] = useState("All reasons");
  const [selectedChatReport, setSelectedChatReport] = useState(null);
  const [pendingAction, setPendingAction] = useState(null);
  const [actionNote, setActionNote] = useState("");
  const [toast, setToast] = useState(null);
  const [isActionSaving, setIsActionSaving] = useState(false);
  const [localReports, setLocalReports] = useState(() => sortNewestFirst(getReports()));
  const [localPosts, setLocalPosts] = useState(() => sortNewestFirst(getPosts()));
  const [localUsers, setLocalUsers] = useState(() => getUsers());
  const [localChats, setLocalChats] = useState(() => getChats());

  const refreshLocalData = () => {
    setLocalReports(sortNewestFirst(getReports()));
    setLocalPosts(sortNewestFirst(getPosts()));
    setLocalUsers(getUsers());
    setLocalChats(getChats());
  };

  useEffect(() => {
    setLocalReports((current) => sortNewestFirst(mergeById(safeReports, getReports(), current)));
  }, [safeReports]);

  useEffect(() => {
    const refresh = () => refreshLocalData();
    window.addEventListener("storage", refresh);
    window.addEventListener("app-data-refresh", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("app-data-refresh", refresh);
    };
  }, []);

  const availableReports = useMemo(
    () => sortNewestFirst(mergeById(localReports, safeReports, getReports())),
    [localReports, safeReports],
  );

  const availablePosts = useMemo(
    () => sortNewestFirst(mergeById(localPosts, safePosts, getPosts())),
    [localPosts, safePosts],
  );

  const availableUsers = useMemo(
    () => mergeById(localUsers, safeUsers, getUsers()),
    [localUsers, safeUsers],
  );

  const availableChats = useMemo(
    () => mergeById(localChats, safeChats, getChats()),
    [localChats, safeChats],
  );

  const getTargetPost = (report) => {
    if (!report) return null;
    return availablePosts.find((post) => post.id === report.targetId || post.id === report.relatedPost || post.id === report.postId) || null;
  };

  const getTargetChat = (report) => {
    if (!report) return null;
    const chatId = report.relatedChat || report.chatId || (report.targetType === "chat_conversation" ? report.targetId : "");
    const liveChat = chatId ? availableChats.find((chat) => chat.id === chatId) : null;
    if (liveChat) return liveChat;
    if (report.chatSnapshot?.id || Array.isArray(report.chatSnapshot?.messages)) return report.chatSnapshot;
    if (getReportKind(report) === "chat") {
      return {
        id: chatId || report.targetId || report.id,
        participantProfiles: report.chatSnapshot?.participantProfiles || [],
        relatedPostTitle: report.targetTitle || report.relatedPostTitle || "Reported chat",
        messages: report.chatSnapshot?.messages || [],
        status: "reported",
      };
    }
    return null;
  };

  const getTargetUser = (report) => {
    const targetPost = getTargetPost(report);
    const targetChat = getTargetChat(report);
    const residentList = mergeById(
      availableUsers,
      availablePosts.map((post) => post.author).filter(Boolean),
      report?.chatSnapshot?.participantProfiles || [],
      targetChat?.participantProfiles || [],
      availableChats.flatMap((chat) => chat.participantProfiles || []).filter(Boolean),
    );
    const ids = [
      report?.targetUserId,
      report?.reportedUserId,
      report?.suspectUserId,
      targetPost?.author?.id,
      targetPost?.authorId,
    ].filter(Boolean).map((item) => String(item).toLowerCase());
    const names = [report?.targetUserName, report?.reportedUserName].filter(Boolean).map((item) => String(item).toLowerCase());
    return residentList.find((resident) => {
      const keys = [resident.id, resident.uid, resident.userId, resident.email].filter(Boolean).map((item) => String(item).toLowerCase());
      if (ids.some((id) => keys.includes(id))) return true;
      if (names.length && names.includes(String(resident.name || "").toLowerCase())) return true;
      return false;
    }) || null;
  };

  const scopedAllReports = useMemo(
    () => availableReports.filter((report) => {
      const handlerBarangay = report.handlerBarangay || report.barangay || "";
      return !user?.barangay || !handlerBarangay || handlerBarangay === user?.barangay;
    }),
    [availableReports, user?.barangay],
  );

  const scopedReports = useMemo(() => {
    const query = search.trim().toLowerCase();
    return scopedAllReports
      .filter((report) => {
        const targetPost = getTargetPost(report);
        const targetUser = getTargetUser(report);
        const targetChat = getTargetChat(report);
        const reportKind = getReportKind(report);
        const matchesSearch = !query
          ? true
          : [
              report.reason,
              report.category,
              report.details,
              report.reportedBy,
              report.targetTitle,
              report.targetUserName,
              targetPost?.title,
              targetPost?.description,
              targetUser?.name,
              targetUser?.email,
              targetChat?.relatedPostTitle,
              report.actionTaken,
            ].filter(Boolean).join(" ").toLowerCase().includes(query);
        const matchesStatus =
          statusFilter === "all" ||
          (statusFilter === "action" && ["Pending", "Under Review", "Needs Evidence"].includes(report.status)) ||
          report.status === statusFilter;
        const matchesType = typeFilter === "all" || report.targetType === typeFilter || reportKind === typeFilter;
        const reasonText = `${report.category || ""} ${report.reason || ""}`.toLowerCase();
        const matchesReason = reasonFilter === "All reasons" || reasonText.includes(reasonFilter.toLowerCase());
        return matchesSearch && matchesStatus && matchesType && matchesReason;
      })
      .sort((a, b) => safeDate(b.createdAt || b.timestamp) - safeDate(a.createdAt || a.timestamp));
  }, [scopedAllReports, search, statusFilter, typeFilter, reasonFilter, availablePosts, availableUsers, availableChats]);

  const counts = useMemo(() => {
    const needsAction = scopedAllReports.filter((report) => ["Pending", "Under Review", "Needs Evidence"].includes(report.status));
    return {
      total: scopedAllReports.length,
      needsAction: needsAction.length,
      pending: scopedAllReports.filter((report) => report.status === "Pending").length,
      review: scopedAllReports.filter((report) => report.status === "Under Review").length,
      needsEvidence: scopedAllReports.filter((report) => report.status === "Needs Evidence").length,
      resolved: scopedAllReports.filter((report) => report.status === "Resolved").length,
      dismissed: scopedAllReports.filter((report) => report.status === "Dismissed").length,
      chat: scopedAllReports.filter((report) => getReportKind(report) === "chat").length,
      post: scopedAllReports.filter((report) => getReportKind(report) === "post").length,
      account: scopedAllReports.filter((report) => getReportKind(report) === "account").length,
    };
  }, [scopedAllReports]);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    window.clearTimeout(showToast.timeoutId);
    showToast.timeoutId = window.setTimeout(() => setToast(null), 4200);
  };

  const notifyReporterFallback = (report, updates) => {
    const targetUserIds = [report?.reportedById, report?.reporterId, report?.reportedByUid, report?.reportedByEmail]
      .filter(Boolean)
      .map((item) => String(item));

    if (!targetUserIds.length || typeof addNotification !== "function") return;

    addNotification({
      type: "report",
      title: "Report Status Updated",
      message: `Your report "${report.reason || report.category || "Report"}" is now ${updates.status}${updates.actionTaken ? ` — ${updates.actionTaken}` : ""}.`,
      priority: updates.status === "Dismissed" ? "normal" : "medium",
      actionPath: "/notifications",
      targetUserIds,
      targetBarangay: report.handlerBarangay || report.barangay,
      relatedReport: report.id,
    });
  };

  const upsertLocalReport = (reportRecord) => {
    if (!reportRecord?.id) return;
    setLocalReports((items) => sortNewestFirst(mergeById(items, [reportRecord], getReports())));
    window.dispatchEvent(new Event("app-data-refresh"));
  };

  const commitReportUpdate = async (report, updates, successMessage) => {
    if (!report?.id) {
      showToast("Report record is missing. Refresh the page and try again.", "error");
      return null;
    }

    const now = new Date().toISOString();
    const payload = {
      ...updates,
      reviewedBy: updates.reviewedBy || user?.name || "Barangay Admin",
      reviewedAt: updates.reviewedAt || now,
      updatedAt: now,
      updatedAtIso: now,
    };

    let nextReport = null;
    let usedContextUpdate = false;

    try {
      if (typeof updateReport === "function") {
        nextReport = await Promise.resolve(updateReport(report.id, payload));
        usedContextUpdate = Boolean(nextReport);
      }

      if (!nextReport) {
        nextReport = storageUpdateReport(report.id, payload) || { ...report, ...payload };
        notifyReporterFallback(report, payload);
      }

      upsertLocalReport(nextReport);

      if (["Resolved", "Dismissed"].includes(nextReport.status) && statusFilter === "action") {
        setStatusFilter("all");
      }

      showToast(successMessage || "Report updated successfully.");
      if (!usedContextUpdate) {
        window.setTimeout(() => refreshLocalData(), 120);
      }
      return nextReport;
    } catch (error) {
      console.error("Report update failed.", error);

      try {
        nextReport = storageUpdateReport(report.id, payload) || { ...report, ...payload };
        notifyReporterFallback(report, payload);
        upsertLocalReport(nextReport);
        showToast("Report saved locally. Firestore sync failed, but the admin action was kept.", "info");
        return nextReport;
      } catch (fallbackError) {
        console.error("Fallback report update failed.", fallbackError);
        showToast("Report action failed. Nothing was changed; please try Refresh and repeat the action.", "error");
        return null;
      }
    }
  };

  const updateReportedPost = async (targetPost, updates, actionNoteText) => {
    if (!targetPost?.id) return null;
    let changedPost = null;

    try {
      if (updates.status === "Removed" && typeof removePostByAdmin === "function") {
        changedPost = await Promise.resolve(removePostByAdmin(targetPost.id, user, actionNoteText));
      }
      if (!changedPost && typeof updatePost === "function") {
        changedPost = await Promise.resolve(updatePost(targetPost.id, updates));
      }
      if (!changedPost) {
        changedPost = storageUpdatePost(targetPost.id, updates);
      }
    } catch (error) {
      console.warn("Context post update failed. Falling back to local storage.", error);
      changedPost = storageUpdatePost(targetPost.id, updates);
    }

    if (changedPost) {
      setLocalPosts((items) => sortNewestFirst(mergeById(items, [changedPost])));
      window.dispatchEvent(new Event("app-data-refresh"));
    }

    return changedPost;
  };

  const updateReportedUser = async (targetUser, action, actionNoteText) => {
    if (!targetUser?.id && !targetUser?.uid && !targetUser?.email) return null;
    const targetId = targetUser.id || targetUser.uid || targetUser.email;
    let changedUser = null;

    try {
      if (action === "suspend" && typeof suspendUser === "function") {
        changedUser = await Promise.resolve(suspendUser(targetId, actionNoteText, user));
      }
      if (action === "warn" && typeof warnUser === "function") {
        changedUser = await Promise.resolve(warnUser(targetId, actionNoteText, user));
      }
    } catch (error) {
      console.warn("Context resident moderation failed. Falling back to local storage.", error);
    }

    if (!changedUser) {
      changedUser = action === "suspend"
        ? storageSetUserStatus(targetId, USER_STATUS.SUSPENDED)
        : storageAddUserWarning(targetId, { reason: actionNoteText, message: actionNoteText, createdBy: user?.name || "Barangay Admin" });
    }

    if (changedUser) {
      setLocalUsers((items) => mergeById(items, [changedUser]));
      window.dispatchEvent(new Event("app-data-refresh"));
    }

    return changedUser;
  };

  const openAction = (actionType, report, extra = {}) => {
    const copy = actionCopy[actionType];
    setPendingAction({ type: actionType, report, ...extra, ...copy });
    setActionNote(copy.defaultNote);
  };

  const closeAction = () => {
    setPendingAction(null);
    setActionNote("");
  };

  const handleConfirmAction = async () => {
    if (!pendingAction?.report || isActionSaving) return;
    const report = pendingAction.report;
    const note = actionNote.trim() || pendingAction.defaultNote;

    setIsActionSaving(true);
    try {
      if (pendingAction.type === "start_review") {
        await commitReportUpdate(report, {
        status: "Under Review",
        actionTaken: "Review started",
        actionNote: note,
        }, "Report moved to Under Review.");
        closeAction();
        return;
      }

      if (pendingAction.type === "resolve") {
        await commitReportUpdate(report, {
        status: "Resolved",
        actionTaken: "Report resolved",
        actionNote: note,
        resolvedBy: user?.name || "Barangay Admin",
        }, "Report marked as Resolved.");
        closeAction();
        return;
      }

      if (pendingAction.type === "dismiss") {
        await commitReportUpdate(report, {
        status: "Dismissed",
        actionTaken: "Report dismissed",
        actionNote: note,
        resolvedBy: user?.name || "Barangay Admin",
        }, "Report dismissed with note.");
        closeAction();
        return;
      }

      if (pendingAction.type === "needs_evidence") {
        await commitReportUpdate(report, {
        status: "Needs Evidence",
        actionTaken: "More evidence requested",
        actionNote: note,
        }, "Report marked as Needs Evidence.");
        closeAction();
        return;
      }

      if (pendingAction.type === "flag_post" || pendingAction.type === "remove_post") {
      const targetPost = pendingAction.targetPost || getTargetPost(report);
      if (!targetPost?.id) {
        showToast("No linked post was found for this report. The report was not changed.", "error");
        closeAction();
        return;
      }

      const isRemove = pendingAction.type === "remove_post";
        const changedPost = await updateReportedPost(targetPost, {
        status: isRemove ? "Removed" : "Flagged",
        moderationNote: note,
        flaggedBy: user?.id || user?.uid || user?.email || "admin",
        flaggedAt: new Date().toISOString(),
        removedBy: isRemove ? user?.id || user?.uid || user?.email || "admin" : undefined,
        removedAt: isRemove ? new Date().toISOString() : undefined,
        notifyOwner: false,
      }, note);

        if (!changedPost) {
          showToast("Post action failed. Check if the linked post still exists.", "error");
          closeAction();
          return;
        }

        await commitReportUpdate(report, {
        status: "Resolved",
        actionTaken: isRemove ? "Reported post removed" : "Reported post flagged",
        actionNote: note,
        resolvedBy: user?.name || "Barangay Admin",
        }, isRemove ? "Reported post removed and report resolved." : "Reported post flagged and report resolved.");
        closeAction();
        return;
      }

      if (pendingAction.type === "warn_user" || pendingAction.type === "suspend_user") {
      const targetUser = pendingAction.targetUser || getTargetUser(report);
      if (!targetUser) {
        showToast("No linked resident account was found for this report. The report was not changed.", "error");
        closeAction();
        return;
      }

      const isSuspend = pendingAction.type === "suspend_user";
        const changedUser = await updateReportedUser(targetUser, isSuspend ? "suspend" : "warn", note);

        if (!changedUser) {
          showToast("Resident action failed. The resident may be outside this admin barangay or missing from records.", "error");
          closeAction();
          return;
        }

        await commitReportUpdate(report, {
        status: "Resolved",
        actionTaken: isSuspend
          ? `Resident suspended: ${targetUser.name || targetUser.email || "Resident"}`
          : `Warning issued: ${targetUser.name || targetUser.email || "Resident"}`,
        actionNote: note,
        resolvedBy: user?.name || "Barangay Admin",
        }, isSuspend ? "Resident suspended and report resolved." : "Warning issued and report resolved.");
        closeAction();
      }
    } finally {
      setIsActionSaving(false);
    }
  };

  const handleViewReportedPost = (report, postId) => {
    if (!postId) {
      showToast("This report has no linked post to open.", "error");
      return;
    }

    const params = new URLSearchParams({ source: "reports" });
    if (report?.id) params.set("reportId", report.id);

    navigate(`/admin/post/${postId}?${params.toString()}`);
  };

  const handleViewChatDetails = (report, chat) => {
    const targetChat = chat || getTargetChat(report);
    setSelectedChatReport({
      report,
      chat: targetChat || {
        id: report.targetId || report.relatedChat || report.id,
        participantProfiles: report.chatSnapshot?.participantProfiles || [],
        messages: report.chatSnapshot?.messages || [],
        relatedPostTitle: report.targetTitle || report.relatedPostTitle || "Reported chat",
      },
    });
  };

  const resetFilters = () => {
    setSearch("");
    setStatusFilter("action");
    setTypeFilter("all");
    setReasonFilter("All reasons");
  };

  const refreshPageData = () => {
    refreshLocalData();
    if (typeof reloadAppData === "function") reloadAppData();
    window.dispatchEvent(new Event("app-data-refresh"));
    showToast("Reports list refreshed.", "info");
  };

  const renderActionPanel = (report, targetPost, targetUser, targetChat) => {
    const kind = getReportKind(report);
    const hasPost = Boolean(targetPost?.id);
    const hasUser = Boolean(targetUser?.id || targetUser?.uid || targetUser?.email);
    const hasChat = Boolean(targetChat || kind === "chat");

    return (
      <div className="admin-report-actions" aria-label="Report actions">
        <div className="admin-report-actions__guide">
          <Info size={16} />
          <span>Choose one clear action. Every action opens a confirmation first.</span>
        </div>

        <div className="admin-report-action-group">
          <span>Report status</span>
          <Button type="button" size="sm" variant="outline" onClick={() => openAction("start_review", report)}>
            <Eye size={15} /> Start review
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => openAction("needs_evidence", report)}>
            <Info size={15} /> Needs evidence
          </Button>
          <Button type="button" size="sm" variant="success" onClick={() => openAction("resolve", report)}>
            <CheckCircle size={15} /> Resolve
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => openAction("dismiss", report)}>
            <XCircle size={15} /> Dismiss
          </Button>
        </div>

        {(kind === "post" || hasPost) ? (
          <div className="admin-report-action-group">
            <span>Post evidence and content</span>
            <Button type="button" size="sm" variant="outline" disabled={!hasPost} onClick={() => handleViewReportedPost(report, targetPost?.id)}>
              <FileText size={15} /> View post
            </Button>
            <Button type="button" size="sm" variant="warning" disabled={!hasPost} onClick={() => openAction("flag_post", report, { targetPost })}>
              <Flag size={15} /> Flag post
            </Button>
            <Button type="button" size="sm" variant="danger" disabled={!hasPost} onClick={() => openAction("remove_post", report, { targetPost })}>
              <Trash2 size={15} /> Remove post
            </Button>
          </div>
        ) : null}

        {kind === "chat" ? (
          <div className="admin-report-action-group">
            <span>Chat evidence</span>
            <Button type="button" size="sm" variant="outline" disabled={!hasChat} onClick={() => handleViewChatDetails(report, targetChat)}>
              <MessageSquare size={15} /> View conversation
            </Button>
            {hasPost ? (
              <Button type="button" size="sm" variant="outline" onClick={() => handleViewReportedPost(report, targetPost.id)}>
                <FileText size={15} /> Related post
              </Button>
            ) : null}
          </div>
        ) : null}

        {(kind === "account" || kind === "post" || kind === "chat") ? (
          <div className="admin-report-action-group">
            <span>Resident penalty</span>
            <Button type="button" size="sm" variant="outline" disabled={!hasUser} onClick={() => openAction("warn_user", report, { targetUser })}>
              <AlertTriangle size={15} /> Warn resident
            </Button>
            <Button type="button" size="sm" variant="danger" disabled={!hasUser} onClick={() => openAction("suspend_user", report, { targetUser })}>
              <UserX size={15} /> Suspend resident
            </Button>
          </div>
        ) : null}

        {!hasUser && (kind === "account" || kind === "post" || kind === "chat") ? (
          <div className="admin-report-action-help">
            <UserRound size={15} /> Resident penalty buttons are disabled because this report has no linked resident record.
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <AdminLayout
      title="Reports & Complaints"
      subtitle="Review resident reports with clear evidence, confirmations, and safe admin actions."
      actions={(
        <Button type="button" variant="outline" size="sm" onClick={refreshPageData}>
          <RefreshCcw size={16} /> Refresh
        </Button>
      )}
    >
      <div className="admin-reports-page">
        {toast ? (
          <div className={`admin-reports-toast admin-reports-toast--${toast.type}`} role="status">
            {toast.type === "error" ? <Ban size={18} /> : <Check size={18} />}
            <span>{toast.message}</span>
          </div>
        ) : null}

        <section className="admin-reports-hero">
          <div>
            <div className="admin-reports-eyebrow"><Shield size={16} /> Moderation command center</div>
            <h2>Handle reports without accidental actions.</h2>
            <p>
              Each card shows what was reported, who is involved, the evidence type, and the safest next action.
              Destructive actions require confirmation before anything changes.
            </p>
          </div>
          <div className="admin-reports-hero__mini">
            <strong>{counts.needsAction}</strong>
            <span>reports need admin action</span>
          </div>
        </section>

        <div className="admin-reports-metrics">
          <Card className="admin-report-metric admin-report-metric--danger" elevated>
            <Clock size={20} />
            <div><span>Needs action</span><strong>{counts.needsAction}</strong><small>{counts.pending} pending • {counts.review} under review • {counts.needsEvidence} needs evidence</small></div>
          </Card>
          <Card className="admin-report-metric admin-report-metric--post" elevated>
            <FileText size={20} />
            <div><span>Post reports</span><strong>{counts.post}</strong><small>Jobs, lost & found, and content concerns</small></div>
          </Card>
          <Card className="admin-report-metric admin-report-metric--chat" elevated>
            <MessageSquare size={20} />
            <div><span>Chat reports</span><strong>{counts.chat}</strong><small>Conversation evidence review</small></div>
          </Card>
          <Card className="admin-report-metric admin-report-metric--success" elevated>
            <CheckCircle size={20} />
            <div><span>Closed reports</span><strong>{counts.resolved + counts.dismissed}</strong><small>{counts.resolved} resolved • {counts.dismissed} dismissed</small></div>
          </Card>
        </div>

        <Card elevated className="admin-reports-filter-card">
          <CardContent>
            <div className="admin-reports-section-title">
              <div>
                <h3>Find the report to handle</h3>
                <p>Default view shows only reports that still need action.</p>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={resetFilters}>
                <SlidersHorizontal size={16} /> Reset filters
              </Button>
            </div>

            <div className="admin-reports-filters">
              <Input value={search} onChange={(e) => setSearch(e.target.value)} icon={Search} placeholder="Search reason, reporter, resident, content, or action note" />
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Filter by status">
                <option value="action">Needs action only</option>
                <option value="all">All statuses</option>
                <option value="Pending">Pending</option>
                <option value="Under Review">Under Review</option>
                <option value="Needs Evidence">Needs Evidence</option>
                <option value="Resolved">Resolved</option>
                <option value="Dismissed">Dismissed</option>
              </select>
              <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} aria-label="Filter by type">
                <option value="all">All report types</option>
                <option value="post">Post reports</option>
                <option value="chat">Chat reports</option>
                <option value="account">Account reports</option>
                <option value="job_post">Job posts</option>
                <option value="lost_found_post">Lost & Found posts</option>
              </select>
              <select value={reasonFilter} onChange={(e) => setReasonFilter(e.target.value)} aria-label="Filter by reason">
                {reportReasonOptions.map((reason) => <option key={reason} value={reason}>{reason}</option>)}
              </select>
            </div>
          </CardContent>
        </Card>

        <div className="admin-reports-list-head">
          <div>
            <h3>Report queue</h3>
            <p>{scopedReports.length} shown out of {counts.total} report(s) for {user?.barangay || "assigned barangay"}. Closed reports stay visible after an action so the admin can confirm the result.</p>
          </div>
          <Badge variant="secondary">Sorted newest first</Badge>
        </div>


        {focusedReportId ? (
          <div className="admin-report-focus-banner">
            Opened from notification. The exact report is highlighted below when it is available in this barangay queue.
          </div>
        ) : null}
        <div className="admin-reports-list">
          {scopedReports.length > 0 ? scopedReports.map((report) => {
            const targetPost = getTargetPost(report);
            const targetUser = getTargetUser(report);
            const targetChat = getTargetChat(report);
            const kind = getReportKind(report);
            const detail = kindDetails[kind] || kindDetails.general;
            const KindIcon = detail.icon;
            const riskScore = getReportRiskScore(report, targetUser, targetPost);
            const risk = getPriorityLabel(riskScore);
            const isClosed = ["Resolved", "Dismissed"].includes(report.status);

            return (
              <Card key={report.id} elevated className={`admin-report-card admin-report-card--${kind} ${isClosed ? "is-closed" : ""} ${String(report.id) === String(focusedReportId) ? "is-focused" : ""}`}>
                <CardContent>
                  <div className="admin-report-card__top">
                    <div className="admin-report-kind">
                      <span className="admin-report-kind__icon"><KindIcon size={18} /></span>
                      <div>
                        <strong>{targetLabel(report.targetType)}</strong>
                        <small>{detail.description}</small>
                      </div>
                    </div>
                    <div className="admin-report-status-row">
                      <span className={`admin-report-status admin-report-status--${statusTone(report.status)}`}>{report.status || "Pending"}</span>
                      <Badge variant={risk.variant}>{Math.round(riskScore)}% {risk.label} risk</Badge>
                    </div>
                  </div>

                  <div className="admin-report-main-grid">
                    <div className="admin-report-summary">
                      <div className="admin-report-title-row">
                        <h3>{report.reason || report.category || "Resident report"}</h3>
                        {report.category ? <Badge variant="secondary">{report.category}</Badge> : null}
                      </div>
                      <p>{report.details || "No additional details were provided."}</p>
                      <div className="admin-report-meta-line">
                        <span>Reported by <strong>{report.reportedBy || "Resident"}</strong></span>
                        <span>{report.timestamp || report.createdAt || "No date"}</span>
                        <span>Handler: {report.handlerBarangay || report.barangay || user?.barangay || "Barangay not set"}</span>
                      </div>
                    </div>

                    <div className="admin-report-side-panel">
                      <strong>Suggested handling</strong>
                      <p>
                        {riskScore >= 75
                          ? "High priority. Review evidence first, then apply content or resident action only if verified."
                          : riskScore >= 50
                            ? "Check the target content and resident history before closing this report."
                            : "Low risk. Review the details and dismiss if unsupported."}
                      </p>
                    </div>
                  </div>

                  <div className="admin-report-evidence-grid">
                    <div className="admin-report-info-card">
                      <span>Reported content</span>
                      <strong>{targetPost?.title || targetChat?.relatedPostTitle || report.targetTitle || "No linked content record"}</strong>
                      <small>{targetPost?.status ? `Post status: ${targetPost.status}` : detail.label}</small>
                    </div>
                    <div className="admin-report-info-card">
                      <span>Resident involved</span>
                      <strong>{targetUser?.name || report.targetUserName || "No resident linked"}</strong>
                      <small>{targetUser?.email || targetUser?.status || "Penalty actions disabled until linked"}</small>
                    </div>
                    {kind === "chat" ? (
                      <div className="admin-report-info-card">
                        <span>Conversation evidence</span>
                        <strong>{(targetChat?.participantProfiles || []).map((profile) => profile.name).filter(Boolean).join(" and ") || "Reported chat"}</strong>
                        <small>{(targetChat?.messages || []).length} message(s) available</small>
                      </div>
                    ) : null}
                    {report.evidence ? (
                      <div className="admin-report-info-card">
                        <span>Extra evidence</span>
                        <strong>{report.evidence}</strong>
                        <small>Provided by reporter</small>
                      </div>
                    ) : null}
                    {Array.isArray(report.additionalEvidence) && report.additionalEvidence.length ? (
                      <div className="admin-report-info-card">
                        <span>Merged duplicate evidence</span>
                        <strong>{report.additionalEvidence.length} added update(s)</strong>
                        <small>Same reporter + same target were merged, not duplicated</small>
                      </div>
                    ) : null}
                  </div>

                  {report.actionTaken || report.actionNote ? (
                    <div className="admin-report-last-action">
                      <strong>Last admin action:</strong>
                      <span>{report.actionTaken || "Action recorded"}</span>
                      {report.actionNote ? <p>{report.actionNote}</p> : null}
                    </div>
                  ) : null}

                  {renderActionPanel(report, targetPost, targetUser, targetChat)}
                </CardContent>
              </Card>
            );
          }) : (
            <Card elevated className="admin-report-empty-card">
              <CardContent>
                <div className="empty-state">
                  <Shield size={40} />
                  <h3>{counts.total ? "No reports match the current filters." : "No reports are stored for this barangay yet."}</h3>
                  <p>{counts.total ? "Try resetting filters, selecting All statuses, or click Refresh. Resolved and dismissed reports are saved under closed reports." : "Once a resident sends a report or complaint, it will appear here for admin review."}</p>
                  <Button type="button" variant="outline" onClick={resetFilters}>Reset filters</Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Modal isOpen={Boolean(pendingAction)} onClose={closeAction} title={pendingAction?.title || "Confirm action"} subtitle="Review this carefully before applying the admin action." size="lg">
        {pendingAction ? (
          <div className="admin-report-confirm">
            <div className={`admin-report-confirm__summary ${pendingAction.danger ? "is-danger" : ""}`}>
              {pendingAction.danger ? <AlertTriangle size={22} /> : <Shield size={22} />}
              <div>
                <strong>{pendingAction.button}</strong>
                <p>{pendingAction.report.reason || pendingAction.report.category || "Resident report"}</p>
              </div>
            </div>

            <div className="admin-report-confirm__impact">
              <strong>What will happen</strong>
              <ul>
                {(pendingAction.impact || []).map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>

            <label className="admin-report-note-field">
              <span>Admin note / reason</span>
              <textarea
                value={actionNote}
                onChange={(event) => setActionNote(event.target.value)}
                rows={4}
                placeholder="Write the reason for this action."
              />
            </label>

            <div className="admin-report-confirm__actions">
              <Button type="button" variant="ghost" onClick={closeAction}>Cancel</Button>
              <Button type="button" variant={pendingAction.danger ? "danger" : "primary"} onClick={handleConfirmAction} disabled={isActionSaving} isLoading={isActionSaving}>
                {isActionSaving ? "Saving..." : pendingAction.button}
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal isOpen={Boolean(selectedChatReport)} onClose={() => setSelectedChatReport(null)} title="Reported chat conversation" subtitle={selectedChatReport?.report?.reason || "Conversation report review"} size="xl">
        {selectedChatReport ? (
          <div className="admin-report-chat-review">
            <div className="admin-report-info-card">
              <span>Participants</span>
              <strong>{(selectedChatReport.chat.participantProfiles || []).map((profile) => `${profile.name || "Resident"} (${profile.barangay || "barangay not set"})`).join(" • ") || "Participant data not available"}</strong>
              <small>Related post: {selectedChatReport.chat.relatedPostTitle || selectedChatReport.report.relatedPost || "None"}</small>
            </div>
            <div className="admin-report-chat-reason">
              <strong>Reporter reason</strong>
              <p>{selectedChatReport.report.details || selectedChatReport.report.reason}</p>
            </div>
            <div className="admin-report-chat-messages">
              {(selectedChatReport.chat.messages || []).length ? (selectedChatReport.chat.messages || []).map((message) => {
                const likes = Array.isArray(message.reactions?.like) ? message.reactions.like.length : 0;
                return (
                  <div key={message.id || `${message.senderId}-${message.timestamp}`} className="admin-report-chat-message">
                    <strong>{message.senderName || "Resident"}</strong>
                    {message.image ? <div className="admin-report-chat-image"><SmartMediaImage src={message.image} alt="Reported chat attachment" size="chat" /></div> : null}
                    <p>{message.text || (message.image ? "Image message" : "No text")}</p>
                    <small>{message.timestamp}{message.edited ? " • edited" : ""}{likes ? ` • 👍 ${likes}` : ""}</small>
                  </div>
                );
              }) : <div className="empty-state"><MessageSquare size={32} /><p>No messages were found in this conversation snapshot.</p></div>}
            </div>
          </div>
        ) : null}
      </Modal>
    </AdminLayout>
  );
}

export default ReportsModerationPage;
