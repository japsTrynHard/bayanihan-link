import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Briefcase,
  Check,
  Edit3,
  Flag,
  ImagePlus,
  Info,
  LogOut,
  MapPin,
  MessageSquare,
  Paperclip,
  Search,
  Send,
  X,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import ResidentLayout from "../../components/ResidentLayout";
import Avatar from "../../components/Avatar";
import Input from "../../components/Input";
import Button from "../../components/Button";
import Badge from "../../components/Badge";
import Modal from "../../components/Modal";
import {
  CLOUDINARY_FOLDERS,
  uploadImageToCloudinary,
} from "../../services/cloudinaryService";
import { useApp } from "../../context/AppContext";
import { useAuth } from "../../context/AuthContext";
import { USER_STATUS, getUsers } from "../../utils/storage";
import {
  formatSuspensionUntil,
  getAccountStatusInfo,
  getWarningExpiryText,
} from "../../utils/accountModeration";
import SmartMediaImage from "../../components/SmartMediaImage";
import "../../styles/pages/Chat.css";

const uniqueKeys = (...groups) => [
  ...new Set(
    groups
      .flat()
      .filter(Boolean)
      .map((item) => String(item)),
  ),
];

function getUserKeys(user = {}) {
  const safeUser = user || {};
  return uniqueKeys(safeUser.id, safeUser.uid, safeUser.userId, safeUser.email);
}

function chatBelongsToUser(chat = {}, currentUser = {}) {
  if (!currentUser) return false;
  const userKeys = new Set(getUserKeys(currentUser));
  const chatKeys = uniqueKeys(
    chat.participants || [],
    chat.participantKeys || [],
    (chat.participantProfiles || []).flatMap(getUserKeys),
  );
  return chatKeys.some((key) => userKeys.has(key));
}

function getOtherParticipant(chat = {}, currentUser = {}) {
  const currentKeys = new Set(getUserKeys(currentUser || {}));

  // Auto-heal: Hanapin ang ID ng kabilang tao mula sa participants array
  const otherParticipantId =
    (chat.participants || []).find((id) => !currentKeys.has(String(id))) ||
    chat.participantId ||
    "";

  const fallback = {
    id: otherParticipantId,
    uid: otherParticipantId || chat.participantUid || "",
    email: chat.participantEmail || "",
    name: chat.participantName || "Conversation",
    avatar: chat.participantAvatar || "U",
    profilePicture: chat.participantProfilePicture || "",
    barangay: chat.barangay || "",
    status: chat.participantStatus || "Active",
    statusReason: chat.participantStatusReason || "",
  };

  if (!Array.isArray(chat.participantProfiles)) return fallback;
  const foundProfile = chat.participantProfiles.find(
    (profile) => !getUserKeys(profile).some((key) => currentKeys.has(key)),
  );
  return foundProfile || fallback;
}

function getProfileMatches(profile = {}, directory = []) {
  const keys = new Set(
    getUserKeys(profile).map((key) => String(key).toLowerCase()),
  );
  const email = String(profile.email || "")
    .trim()
    .toLowerCase();

  return (Array.isArray(directory) ? directory : []).filter((candidate) => {
    if (!candidate || typeof candidate !== "object") return false;
    const candidateKeys = getUserKeys(candidate).map((key) =>
      String(key).toLowerCase(),
    );
    if (candidateKeys.some((key) => keys.has(key))) return true;
    if (
      email &&
      String(candidate.email || "")
        .trim()
        .toLowerCase() === email
    )
      return true;
    return false;
  });
}

function resolveProfile(profile = {}, directory = []) {
  const matches = getProfileMatches(profile, directory);
  const merged = matches.reduce(
    (acc, candidate) => ({ ...acc, ...candidate }),
    { ...(profile || {}) },
  );
  const photoCandidate =
    matches.find(
      (candidate) => candidate.profilePicture || candidate.photoURL,
    ) || {};
  return {
    ...merged,
    id: merged.id || merged.uid || merged.email || "",
    uid: merged.uid || merged.id || "",
    name: merged.name || "Resident",
    email: merged.email || "",
    avatar: merged.avatar || getInitialsFromName(merged.name || "Resident"),
    profilePicture:
      photoCandidate.profilePicture ||
      photoCandidate.photoURL ||
      merged.profilePicture ||
      merged.photoURL ||
      "",
    barangay: merged.barangay || "",
  };
}

function getInitialsFromName(name = "") {
  return (
    String(name)
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "U"
  );
}

function getChatAvatarSrc(profile = {}) {
  const safeProfile = profile || {};
  if (safeProfile.profilePicture || safeProfile.photoURL)
    return safeProfile.profilePicture || safeProfile.photoURL;
  const seed = encodeURIComponent(
    safeProfile.email || safeProfile.name || safeProfile.id || "resident",
  );
  return `https://api.dicebear.com/7.x/initials/svg?seed=${seed}&backgroundColor=60a5fa,2563eb,0f172a&textColor=ffffff`;
}

function getUnreadCount(chat, currentUser) {
  const currentKeys = new Set(getUserKeys(currentUser));
  if (!currentKeys.size) return 0;

  return (chat.messages || []).filter((message) => {
    const senderIsCurrentUser = currentKeys.has(String(message.senderId));
    const readBy = (message.readBy || []).map((item) => String(item));
    const alreadyRead = [...currentKeys].some((key) => readBy.includes(key));
    return !senderIsCurrentUser && !alreadyRead;
  }).length;
}

function getMessageSender(chat, message, currentUser) {
  if (getUserKeys(currentUser).includes(String(message.senderId))) return "You";
  const sender = (chat.participantProfiles || []).find((profile) =>
    getUserKeys(profile).includes(String(message.senderId)),
  );
  return sender?.name || message.senderName || "Resident";
}

function getMessageSenderProfile(
  chat,
  message,
  currentUser,
  fallbackParticipant,
) {
  if (getUserKeys(currentUser).includes(String(message.senderId)))
    return currentUser;
  return (
    (chat.participantProfiles || []).find((profile) =>
      getUserKeys(profile).includes(String(message.senderId)),
    ) ||
    fallbackParticipant || {
      name: message.senderName || "Resident",
      avatar: "R",
    }
  );
}

function sortMessagesFIFO(messages = []) {
  return [...messages].sort((a, b) => {
    const aTime = new Date(a.createdAt || a.timestamp || 0).getTime();
    const bTime = new Date(b.createdAt || b.timestamp || 0).getTime();
    return (
      (Number.isNaN(aTime) ? 0 : aTime) - (Number.isNaN(bTime) ? 0 : bTime)
    );
  });
}

function getSortedChats(chats) {
  return [...chats].sort((a, b) => {
    const dateA = new Date(
      a.lastMessageAt || a.lastContextAt || a.updatedAt || a.createdAt || 0,
    ).getTime();
    const dateB = new Date(
      b.lastMessageAt || b.lastContextAt || b.updatedAt || b.createdAt || 0,
    ).getTime();
    return (
      (Number.isNaN(dateB) ? 0 : dateB) - (Number.isNaN(dateA) ? 0 : dateA)
    );
  });
}

function getRelatedPosts(chat = {}) {
  return chat?.relatedPosts?.length
    ? chat.relatedPosts
    : chat?.relatedPostId
      ? [
          {
            id: chat.relatedPostId,
            title: chat.relatedPostTitle || "Related post",
            type: chat.relatedPostType || "Post",
            source: chat.source || "post_interaction",
          },
        ]
      : [];
}

function getChatContextSummary(
  chat = {},
  currentUser = {},
  otherParticipant = {},
) {
  const firstRelated = getRelatedPosts(chat)[0];
  const type = String(
    firstRelated?.type || chat.relatedPostType || "",
  ).toLowerCase();
  const title =
    firstRelated?.title || chat.relatedPostTitle || "this conversation";

  if (type.includes("job")) {
    return {
      label: "Job conversation",
      summary: `This chat started from the job post: ${title}. Use it to discuss availability, requirements, pay, and next steps.`,
      reportHint:
        "Report this if the job seems fake, misleading, unsafe, or asks for suspicious payments.",
    };
  }

  if (type.includes("lost") || type.includes("found")) {
    return {
      label: "Lost & Found claim conversation",
      summary: `This chat started from the lost/found post: ${title}. Use it to verify ownership, return details, and proof before claiming.`,
      reportHint:
        "Report this if the claim seems fake, the user is pretending to own an item, or the listing is suspicious.",
    };
  }

  return {
    label: "Community conversation",
    summary: firstRelated
      ? `This chat started from the community post: ${title}.`
      : `This is a direct conversation with ${otherParticipant?.name || "a resident"}.`,
    reportHint:
      "Report this conversation if the user is harassing, scamming, or violating barangay guidelines.",
  };
}

function getConversationTypeMeta(chat = {}) {
  const related = getRelatedPosts(chat)[0] || {};
  const typeText =
    `${related.type || ""} ${chat.relatedPostType || ""} ${related.title || ""} ${chat.relatedPostTitle || ""}`.toLowerCase();
  if (typeText.includes("missing person")) {
    return {
      label: "Missing-person case",
      filter: "priority",
      className: "priority",
      hint: "Share verified sightings, locations, and admin-safe details only.",
    };
  }
  if (typeText.includes("lost") || typeText.includes("found")) {
    return {
      label: "Lost & Found",
      filter: "cases",
      className: "case",
      hint: "Verify proof, location, and handover details before meeting.",
    };
  }
  if (typeText.includes("job")) {
    return {
      label: "Job inquiry",
      filter: "cases",
      className: "job",
      hint: "Clarify schedule, pay, location, and next steps.",
    };
  }
  if (typeText.includes("emergency") || typeText.includes("report")) {
    return {
      label: "Priority conversation",
      filter: "priority",
      className: "priority",
      hint: "Keep details factual and action-focused.",
    };
  }
  return {
    label: related.id ? "Case chat" : "Direct chat",
    filter: related.id ? "cases" : "direct",
    className: related.id ? "case" : "direct",
    hint: related.id
      ? "This conversation is connected to a system record."
      : "General resident conversation.",
  };
}

function chatMatchesFilter(chat = {}, filter = "all", currentUser = {}) {
  if (filter === "all") return true;
  if (filter === "unread") return getUnreadCount(chat, currentUser) > 0;
  const meta = getConversationTypeMeta(chat);
  if (filter === "priority")
    return meta.filter === "priority" || getUnreadCount(chat, currentUser) >= 2;
  if (filter === "cases") return getRelatedPosts(chat).length > 0;
  if (filter === "direct") return getRelatedPosts(chat).length === 0;
  return true;
}

function hasLikedMessage(message = {}, currentUser = {}) {
  const userKeys = new Set(getUserKeys(currentUser));
  const likes = (message.reactions?.like || []).map((item) => String(item));
  return likes.some((item) => userKeys.has(item));
}

function likeCount(message = {}) {
  return Array.isArray(message.reactions?.like)
    ? message.reactions.like.length
    : 0;
}

function Chat() {
  const {
    chats,
    users,
    allPosts,
    addMessage,
    markChatRead,
    editChatMessage,
    toggleMessageReaction,
    endChat,
    createReport,
  } = useApp() || {};
  const { user } = useAuth() || {};
  const safeUser = user || {};
  const safeChats = Array.isArray(chats) ? chats : [];
  const safeUsers = Array.isArray(users) ? users : [];
  const safePosts = Array.isArray(allPosts) ? allPosts : [];
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedChatId = searchParams.get("chat");
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const [selectedChatId, setSelectedChatId] = useState(requestedChatId || null);
  const [messageText, setMessageText] = useState("");
  const [messageFile, setMessageFile] = useState(null);
  const [messageImagePreview, setMessageImagePreview] = useState("");
  const [conversationSearch, setConversationSearch] = useState("");
  const [conversationFilter, setConversationFilter] = useState("all");
  const [isSending, setIsSending] = useState(false);
  const [chatError, setChatError] = useState("");
  const [moderationRefreshKey, setModerationRefreshKey] = useState(0);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isEndModalOpen, setIsEndModalOpen] = useState(false);
  const [reportCategory, setReportCategory] = useState(
    "Suspicious or misleading post/chat",
  );
  const [reportReason, setReportReason] = useState("");
  const [endReason, setEndReason] = useState("");
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editingText, setEditingText] = useState("");

  useEffect(() => {
    const refresh = () => setModerationRefreshKey((key) => key + 1);
    window.addEventListener("account-moderation-refresh", refresh);
    window.addEventListener("app-data-refresh", refresh);
    const timer = window.setInterval(refresh, 60 * 1000);
    return () => {
      window.removeEventListener("account-moderation-refresh", refresh);
      window.removeEventListener("app-data-refresh", refresh);
      window.clearInterval(timer);
    };
  }, []);

  const visibleChats = useMemo(() => {
    const ownedChats = safeChats.filter((chat) =>
      chatBelongsToUser(chat, safeUser),
    );
    const query = conversationSearch.trim().toLowerCase();
    const filtered = ownedChats.filter((chat) => {
      if (!chatMatchesFilter(chat, conversationFilter, safeUser)) return false;
      if (!query) return true;
      const otherParticipant = getOtherParticipant(chat, safeUser);
      const relatedTitles = (chat.relatedPosts || [])
        .map((post) => post.title)
        .join(" ");
      const meta = getConversationTypeMeta(chat);
      return `${otherParticipant.name || ""} ${chat.lastMessage || ""} ${chat.relatedPostTitle || ""} ${relatedTitles} ${meta.label}`
        .toLowerCase()
        .includes(query);
    });

    return getSortedChats(
      filtered.map((chat) => ({
        ...chat,
        messages: sortMessagesFIFO(chat.messages || []),
      })),
    );
  }, [safeChats, conversationSearch, conversationFilter, safeUser]);

  useEffect(() => {
    if (requestedChatId) {
      setSelectedChatId(requestedChatId);
      return;
    }

    if (!visibleChats.find((chat) => chat.id === selectedChatId)) {
      setSelectedChatId(visibleChats[0]?.id || null);
    }
  }, [requestedChatId, selectedChatId, visibleChats]);

  const accountDirectory = useMemo(() => {
    let localUsers;
    try {
      localUsers = getUsers();
    } catch {
      localUsers = [];
    }
    const postAuthors = safePosts.map((post) => post.author).filter(Boolean);
    const chatProfiles = safeChats
      .flatMap((chat) => chat.participantProfiles || [])
      .filter(Boolean);
    const seen = new Set();
    return [
      ...safeUsers,
      ...localUsers,
      ...postAuthors,
      ...chatProfiles,
    ].filter((item) => {
      if (!item || typeof item !== "object") return false;
      const key = String(
        item.id || item.uid || item.email || item.name || Math.random(),
      ).toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [safeUsers, safePosts, safeChats, moderationRefreshKey]);

  const selectedChat =
    visibleChats.find((chat) => chat.id === selectedChatId) || null;
  const rawOtherParticipant = selectedChat
    ? getOtherParticipant(selectedChat, safeUser)
    : null;
  const otherParticipant = rawOtherParticipant
    ? resolveProfile(rawOtherParticipant, accountDirectory)
    : null;
  const otherStatus = otherParticipant
    ? getAccountStatusInfo(otherParticipant, accountDirectory)
    : null;
  const unreadTotal = visibleChats.reduce(
    (sum, chat) => sum + getUnreadCount(chat, safeUser),
    0,
  );
  const conversationSummary = useMemo(() => {
    const ownedChats = safeChats.filter((chat) =>
      chatBelongsToUser(chat, safeUser),
    );
    return {
      all: ownedChats.length,
      unread: ownedChats.filter((chat) => getUnreadCount(chat, safeUser) > 0)
        .length,
      cases: ownedChats.filter((chat) => getRelatedPosts(chat).length > 0)
        .length,
      priority: ownedChats.filter((chat) =>
        chatMatchesFilter(chat, "priority", safeUser),
      ).length,
    };
  }, [safeChats, safeUser]);
  const isAccountSuspended = safeUser?.status === USER_STATUS.SUSPENDED;
  const isChatEnded = selectedChat?.status === "ended";
  const relatedPosts = selectedChat ? getRelatedPosts(selectedChat) : [];
  const chatContext = selectedChat
    ? getChatContextSummary(selectedChat, safeUser, otherParticipant)
    : null;

  useEffect(() => {
    if (!selectedChat || !safeUser?.id) return;

    const currentKeys = getUserKeys(safeUser);
    const hasUnreadMessages = (selectedChat.messages || []).some((message) => {
      const senderIsCurrentUser = currentKeys.includes(
        String(message.senderId),
      );
      const readBy = (message.readBy || []).map((item) => String(item));
      const alreadyRead = currentKeys.some((key) => readBy.includes(key));
      return !senderIsCurrentUser && !alreadyRead;
    });

    if (hasUnreadMessages && typeof markChatRead === "function")
      markChatRead(selectedChat.id, safeUser.id);
  }, [markChatRead, selectedChat, safeUser?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedChat?.messages?.length, selectedChatId]);

  useEffect(
    () => () => {
      if (messageImagePreview) URL.revokeObjectURL(messageImagePreview);
    },
    [messageImagePreview],
  );

  const handleSelectChat = (chatId) => {
    setSelectedChatId(chatId);
    navigate(`/chat?chat=${chatId}`, { replace: true });
  };

  const clearAttachment = () => {
    if (messageImagePreview) URL.revokeObjectURL(messageImagePreview);
    setMessageImagePreview("");
    setMessageFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleAttachFile = (e) => {
    const file = e.target.files?.[0];
    setChatError("");
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setChatError("Please attach an image file only.");
      e.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setChatError("Image must be 5MB or smaller.");
      e.target.value = "";
      return;
    }

    if (messageImagePreview) URL.revokeObjectURL(messageImagePreview);
    setMessageFile(file);
    setMessageImagePreview(URL.createObjectURL(file));
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (isAccountSuspended) {
      setChatError(
        safeUser?.statusReason ||
          "Your account is suspended. Chat messages are temporarily restricted.",
      );
      return;
    }
    if (isChatEnded) {
      setChatError(
        "This chat has ended. Start from the related post if a new conversation is needed.",
      );
      return;
    }

    if (
      !selectedChat ||
      (!messageText.trim() && !messageFile) ||
      !safeUser?.id ||
      isSending
    )
      return;

    setIsSending(true);
    setChatError("");

    try {
      let uploadedImage = "";
      let uploadedPublicId = "";

      if (messageFile) {
        const image = await uploadImageToCloudinary(
          messageFile,
          CLOUDINARY_FOLDERS.CHATS,
        );
        uploadedImage = image.url;
        uploadedPublicId = image.publicId;
      }

      if (typeof addMessage !== "function")
        throw new Error("Chat service is not ready.");
      await addMessage(selectedChat.id, {
        id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        senderId: safeUser.id,
        senderName: safeUser.name,
        text: messageText.trim(),
        image: uploadedImage,
        imagePublicId: uploadedPublicId,
        timestamp: new Date().toLocaleString([], {
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        }),
        createdAt: new Date().toISOString(),
        readBy: [safeUser.id, safeUser.uid, safeUser.email].filter(Boolean),
      });

      setMessageText("");
      clearAttachment();
    } catch (error) {
      console.error("Unable to send chat message.", error);
      setChatError(error.message || "Message was not sent. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  const startEditMessage = (message) => {
    setEditingMessageId(message.id);
    setEditingText(message.text || "");
  };

  const saveEditedMessage = () => {
    if (!selectedChat || !editingMessageId) return;
    const clean = editingText.trim();
    if (!clean) {
      setChatError("Message cannot be empty.");
      return;
    }
    try {
      if (typeof editChatMessage !== "function")
        throw new Error("Edit message is not available.");
      editChatMessage(selectedChat.id, editingMessageId, clean, safeUser);
      setEditingMessageId(null);
      setEditingText("");
      setChatError("");
    } catch (error) {
      setChatError(error.message || "Unable to edit message.");
    }
  };

  const handleToggleLike = (messageId) => {
    if (!selectedChat || !messageId) return;
    if (typeof toggleMessageReaction === "function")
      toggleMessageReaction(selectedChat.id, messageId, "like", safeUser);
  };

  const handleSubmitReport = (event) => {
    event.preventDefault();
    if (!selectedChat || !otherParticipant) return;
    const cleanReason = reportReason.trim();
    if (!cleanReason) {
      setChatError("Please provide a reason for the report.");
      return;
    }

    const relatedPost = relatedPosts[0];
    if (typeof createReport !== "function") {
      setChatError("Report service is not ready.");
      return;
    }
    const reportResult = createReport({
      reportedBy: safeUser.name,
      reportedById: safeUser.id,
      targetType: "chat_conversation",
      targetId: selectedChat.id,
      targetTitle: `Chat with ${otherParticipant.name || "Resident"}`,
      targetUserId:
        otherParticipant.id || otherParticipant.uid || otherParticipant.email,
      targetUserName: otherParticipant.name || "Resident",
      category: reportCategory,
      reason: cleanReason,
      details: `${chatContext?.summary || "Chat report submitted."}\nRelated post: ${relatedPost?.title || "None"}\nReporter note: ${cleanReason}`,
      barangay: safeUser.barangay || otherParticipant.barangay,
      status: "Pending",
      relatedChat: selectedChat.id,
      relatedPost: relatedPost?.id || selectedChat.relatedPostId || "",
      chatSnapshot: {
        id: selectedChat.id,
        participants: selectedChat.participants || [],
        participantKeys: selectedChat.participantKeys || [],
        participantProfiles: (selectedChat.participantProfiles || []).map(
          (profile) => resolveProfile(profile, accountDirectory),
        ),
        relatedPostId: selectedChat.relatedPostId || relatedPost?.id || "",
        relatedPostTitle:
          selectedChat.relatedPostTitle || relatedPost?.title || "",
        relatedPostType:
          selectedChat.relatedPostType || relatedPost?.type || "",
        source: selectedChat.source || "chat_report",
        messages: selectedChat.messages || [],
        status: selectedChat.status || "active",
        lastMessage: selectedChat.lastMessage || "",
        createdAt: selectedChat.createdAt || "",
        updatedAt: selectedChat.updatedAt || "",
      },
    });

    setIsReportModalOpen(false);
    setReportReason("");
    setReportCategory("Suspicious or misleading post/chat");
    setChatError(
      reportResult?.isDuplicateUpdate
        ? "You already have an active report for this conversation. Your new details were added to the existing case."
        : "Report submitted to barangay admin for review.",
    );
  };

  const handleEndChat = (event) => {
    event.preventDefault();
    if (!selectedChat) return;
    const cleanReason = endReason.trim();
    if (!cleanReason) {
      setChatError("Please provide a reason before ending this chat.");
      return;
    }
    if (
      !window.confirm(
        "End this chat? You will not be able to send more messages in this conversation.",
      )
    )
      return;
    if (typeof endChat === "function")
      endChat(selectedChat.id, cleanReason, safeUser);
    setIsEndModalOpen(false);
    setEndReason("");
    setChatError("");
  };

  return (
    <ResidentLayout>
      <div className="chat-page messenger-page">
        <div className="chat-container messenger-container">
          <aside className="conversations-list messenger-sidebar">
            <div className="list-header messenger-list-header">
              <div>
                <span className="chat-eyebrow">Messages</span>
                <h2>Inbox</h2>
                <p className="messenger-list-subtitle">
                  Case chats, job inquiries, and direct messages in one smart
                  inbox.
                </p>
              </div>
              {unreadTotal > 0 ? (
                <Badge variant="danger">{unreadTotal}</Badge>
              ) : null}
            </div>

            <div
              className="messenger-filter-pills"
              aria-label="Conversation filters"
            >
              {[
                ["all", `All ${conversationSummary.all}`],
                ["unread", `Unread ${conversationSummary.unread}`],
                ["priority", `Priority ${conversationSummary.priority}`],
                ["cases", `Cases ${conversationSummary.cases}`],
                ["direct", "Direct"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={conversationFilter === value ? "active" : ""}
                  onClick={() => setConversationFilter(value)}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="conversation-search messenger-search">
              <Search size={16} />
              <input
                value={conversationSearch}
                onChange={(e) => setConversationSearch(e.target.value)}
                placeholder="Search Messenger"
              />
            </div>

            <div className="conversation-scroll-area messenger-thread-list">
              {visibleChats.length > 0 ? (
                visibleChats.map((chat) => {
                  const participant = resolveProfile(
                    getOtherParticipant(chat, safeUser),
                    accountDirectory,
                  );
                  const unreadCount = getUnreadCount(chat, safeUser);
                  const participantStatus = getAccountStatusInfo(
                    participant,
                    accountDirectory,
                  );
                  return (
                    <button
                      key={chat.id}
                      className={`conversation-item messenger-thread ${selectedChat?.id === chat.id ? "active" : ""}`}
                      onClick={() => handleSelectChat(chat.id)}
                    >
                      <Avatar
                        initials={participant.avatar}
                        src={getChatAvatarSrc(participant)}
                        alt={participant.name}
                        size="md"
                      />
                      <div className="conv-info">
                        <div className="conv-title-row">
                          <p className="conv-name">{participant.name}</p>
                          {unreadCount > 0 ? (
                            <span className="unread-dot">{unreadCount}</span>
                          ) : null}
                        </div>
                        <span
                          className={`messenger-thread-type messenger-thread-type--${getConversationTypeMeta(chat).className}`}
                        >
                          {getConversationTypeMeta(chat).label}
                        </span>
                        <p className="conv-preview">
                          {chat.status === "ended"
                            ? "Chat ended"
                            : chat.lastMessage || "No messages yet"}
                        </p>
                        {participantStatus?.isSuspended ? (
                          <p className="conv-context safety">
                            Suspended account
                          </p>
                        ) : participantStatus?.isWarned ? (
                          <p className="conv-context safety warning">
                            Warned account
                          </p>
                        ) : chat.relatedPostTitle ? (
                          <p className="conv-context">
                            {chat.relatedPostTitle}
                          </p>
                        ) : null}
                      </div>
                      <span className="conv-time">{chat.lastMessageTime}</span>
                    </button>
                  );
                })
              ) : (
                <div className="empty-conversation-list">
                  <MessageSquare size={34} />
                  <p>No conversations yet.</p>
                </div>
              )}
            </div>
          </aside>

          <div className="chat-window messenger-window">
            {selectedChat ? (
              <>
                <div className="chat-header messenger-header">
                  <div className="chat-header-main">
                    <button
                      type="button"
                      className="chat-avatar-button"
                      onClick={() => setIsProfileModalOpen(true)}
                      title="View chat profile"
                    >
                      <Avatar
                        initials={otherParticipant?.avatar}
                        src={getChatAvatarSrc(otherParticipant)}
                        alt={otherParticipant?.name}
                        size="md"
                      />
                    </button>
                    <div>
                      <div className="chat-title-with-status">
                        <h3>{otherParticipant?.name}</h3>
                        {otherStatus?.isSuspended ? (
                          <Badge variant="danger">Suspended</Badge>
                        ) : otherStatus?.isWarned ? (
                          <Badge variant="warning">Warned</Badge>
                        ) : null}
                        {isChatEnded ? (
                          <Badge variant="secondary">Ended</Badge>
                        ) : null}
                      </div>
                      <p>
                        <MapPin size={14} />{" "}
                        {otherParticipant?.barangay || "Barangay resident"}
                      </p>
                    </div>
                  </div>
                  <div className="chat-header-actions">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsProfileModalOpen(true)}
                    >
                      <Info size={16} /> Info
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsReportModalOpen(true)}
                    >
                      <Flag size={16} /> Report
                    </Button>
                    {!isChatEnded ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setIsEndModalOpen(true)}
                      >
                        <LogOut size={16} /> End
                      </Button>
                    ) : null}
                  </div>
                </div>

                {otherStatus?.isWarned ? (
                  <div className="chat-safety-notice chat-safety-notice--warning">
                    <strong>This user has an active warning.</strong>
                    <span>
                      {otherStatus.statusReason ||
                        "Barangay guidelines warning."}{" "}
                      {getWarningExpiryText(otherStatus.warningExpiresAt)}.
                    </span>
                  </div>
                ) : null}

                {otherStatus?.isSuspended ? (
                  <div className="chat-safety-notice chat-safety-notice--danger">
                    <strong>This account is currently suspended.</strong>
                    <span>
                      {otherStatus.statusReason ||
                        "Suspended by barangay admin."}{" "}
                      Restricted{" "}
                      {formatSuspensionUntil(otherStatus.suspensionEndsAt)}.
                    </span>
                  </div>
                ) : null}

                {isChatEnded ? (
                  <div className="chat-safety-notice chat-safety-notice--ended">
                    <strong>
                      Chat ended by{" "}
                      {selectedChat.endedByName || "a participant"}.
                    </strong>
                    <span>
                      Reason: {selectedChat.endReason || "Conversation ended."}
                    </span>
                  </div>
                ) : null}

                {relatedPosts.length > 0 ? (
                  <div className="messenger-context-chip messenger-context-chip--smart">
                    <span>
                      <Briefcase size={14} /> {chatContext?.label}:{" "}
                      <strong>{relatedPosts[0].title}</strong> —{" "}
                      {getConversationTypeMeta(selectedChat).hint}
                    </span>
                    {relatedPosts[0].id ? (
                      <button
                        type="button"
                        onClick={() => navigate(`/post/${relatedPosts[0].id}`)}
                      >
                        Open Post
                      </button>
                    ) : null}
                  </div>
                ) : null}

                <div className="messages-area messenger-messages">
                  {(selectedChat.messages || []).length > 0 ? (
                    sortMessagesFIFO(selectedChat.messages || []).map((msg) => {
                      const isSent = getUserKeys(safeUser).includes(
                        String(msg.senderId),
                      );
                      const liked = hasLikedMessage(msg, safeUser);
                      const count = likeCount(msg);
                      const isEditing = editingMessageId === msg.id;
                      const senderProfile = resolveProfile(
                        getMessageSenderProfile(
                          selectedChat,
                          msg,
                          safeUser,
                          otherParticipant,
                        ),
                        accountDirectory,
                      );
                      return (
                        <div
                          key={msg.id}
                          className={`message messenger-message ${isSent ? "sent" : "received"}`}
                        >
                          {!isSent ? (
                            <button
                              type="button"
                              className="message-avatar-button"
                              onClick={() => setIsProfileModalOpen(true)}
                              title={`View ${senderProfile?.name || "resident"} profile`}
                            >
                              <Avatar
                                initials={senderProfile?.avatar}
                                src={getChatAvatarSrc(senderProfile)}
                                alt={senderProfile?.name}
                                size="sm"
                              />
                            </button>
                          ) : null}
                          <div className="message-bubble-wrap">
                            {!isSent ? (
                              <span className="message-sender">
                                {getMessageSender(selectedChat, msg, safeUser)}
                              </span>
                            ) : null}
                            <div className="message-bubble-shell">
                              <div className="message-content messenger-bubble">
                                {msg.image ? (
                                  <SmartMediaImage
                                    src={msg.image}
                                    alt="Shared in chat"
                                    className="message-image"
                                    size="chat"
                                  />
                                ) : null}
                                {isEditing ? (
                                  <div className="message-edit-box">
                                    <input
                                      value={editingText}
                                      onChange={(event) =>
                                        setEditingText(event.target.value)
                                      }
                                      autoFocus
                                    />
                                    <button
                                      type="button"
                                      onClick={saveEditedMessage}
                                    >
                                      Save
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingMessageId(null);
                                        setEditingText("");
                                      }}
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                ) : msg.text ? (
                                  <p>{msg.text}</p>
                                ) : null}
                                <span className="message-time">
                                  {msg.timestamp}
                                  {msg.edited ? " • edited" : ""}
                                  {isSent ? <Check size={12} /> : null}
                                </span>
                              </div>

                              <div
                                className="message-hover-actions"
                                aria-label="Message actions"
                              >
                                <button
                                  type="button"
                                  className={liked ? "active" : ""}
                                  onClick={() => handleToggleLike(msg.id)}
                                  title={liked ? "Remove like" : "Like message"}
                                >
                                  👍
                                </button>
                                {isSent && msg.text && !isChatEnded ? (
                                  <button
                                    type="button"
                                    onClick={() => startEditMessage(msg)}
                                    title="Edit message"
                                  >
                                    <Edit3 size={13} />
                                  </button>
                                ) : null}
                              </div>

                              {count > 0 ? (
                                <button
                                  type="button"
                                  className={`message-reaction-chip ${liked ? "active" : ""}`}
                                  onClick={() => handleToggleLike(msg.id)}
                                  title={liked ? "Remove like" : "Like message"}
                                >
                                  <span>👍</span>
                                  {count > 1 ? <strong>{count}</strong> : null}
                                </button>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="empty-chat inner-empty-chat">
                      <MessageSquare size={48} />
                      <p>Start the conversation about this post.</p>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {messageImagePreview ? (
                  <div className="messenger-attachment-preview">
                    <img src={messageImagePreview} alt="Attachment preview" />
                    <span>{messageFile?.name || "Image attachment"}</span>
                    <button
                      type="button"
                      onClick={clearAttachment}
                      aria-label="Remove attachment"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : null}

                {chatError ? (
                  <div className="messenger-error">{chatError}</div>
                ) : null}

                <form
                  onSubmit={handleSendMessage}
                  className="message-input-form messenger-composer"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    onChange={handleAttachFile}
                    hidden
                  />
                  <button
                    type="button"
                    className="messenger-icon-button"
                    onClick={() => fileInputRef.current?.click()}
                    title={
                      isAccountSuspended
                        ? "Suspended accounts cannot send attachments"
                        : isChatEnded
                          ? "Ended chats cannot accept attachments"
                          : "Attach image"
                    }
                    disabled={isAccountSuspended || isChatEnded}
                  >
                    <Paperclip size={19} />
                  </button>
                  <div className="messenger-input-shell">
                    <Input
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      placeholder={
                        isAccountSuspended
                          ? "Account suspended — messaging is restricted"
                          : isChatEnded
                            ? "This chat has ended"
                            : getConversationTypeMeta(selectedChat).filter ===
                                "priority"
                              ? "Send verified details, location, or next action..."
                              : getConversationTypeMeta(selectedChat).filter ===
                                  "cases"
                                ? "Send proof, schedule, location, or next step..."
                                : "Type a message..."
                      }
                      className="message-input messenger-input"
                      disabled={isAccountSuspended || isChatEnded}
                    />
                    {messageFile ? <ImagePlus size={16} /> : null}
                  </div>
                  <Button
                    variant="primary"
                    type="submit"
                    size="sm"
                    disabled={
                      isAccountSuspended ||
                      isChatEnded ||
                      isSending ||
                      (!messageText.trim() && !messageFile)
                    }
                  >
                    <Send size={18} /> {isSending ? "Sending" : "Send"}
                  </Button>
                </form>
              </>
            ) : (
              <div className="empty-chat">
                <MessageSquare size={48} />
                <p>
                  Select a conversation or open a chat from a job/lost-and-found
                  post.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <Modal
        isOpen={isProfileModalOpen && Boolean(selectedChat)}
        onClose={() => setIsProfileModalOpen(false)}
        title={otherParticipant?.name || "Chat profile"}
        subtitle="Conversation context and safety information"
        size="md"
      >
        <div className="chat-profile-modal">
          <div className="chat-profile-main">
            <Avatar
              initials={otherParticipant?.avatar}
              src={getChatAvatarSrc(otherParticipant)}
              alt={otherParticipant?.name}
              size="lg"
            />
            <div>
              <h3>{otherParticipant?.name}</h3>
              <p>{otherParticipant?.barangay || "Barangay resident"}</p>
              {otherStatus?.isSuspended ? (
                <Badge variant="danger">Suspended</Badge>
              ) : otherStatus?.isWarned ? (
                <Badge variant="warning">Warned</Badge>
              ) : (
                <Badge variant="success">Active</Badge>
              )}
            </div>
          </div>
          <div className="chat-profile-card">
            <strong>{chatContext?.label}</strong>
            <p>{chatContext?.summary}</p>
            {relatedPosts[0]?.id ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/post/${relatedPosts[0].id}`)}
              >
                Open related post
              </Button>
            ) : null}
          </div>
          {otherStatus?.isWarned || otherStatus?.isSuspended ? (
            <div className="chat-profile-card chat-profile-card--warning">
              <strong>Safety status</strong>
              <p>
                {otherStatus.statusReason ||
                  "This account has an active barangay moderation status."}
              </p>
            </div>
          ) : null}
          <div className="chat-profile-actions">
            <Button
              variant="outline"
              onClick={() => setIsReportModalOpen(true)}
            >
              <Flag size={16} /> Report conversation
            </Button>
            {!isChatEnded ? (
              <Button
                variant="secondary"
                onClick={() => setIsEndModalOpen(true)}
              >
                <LogOut size={16} /> End chat
              </Button>
            ) : null}
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isReportModalOpen && Boolean(selectedChat)}
        onClose={() => setIsReportModalOpen(false)}
        title="Report conversation"
        subtitle="Send this chat to barangay admin for review."
        size="md"
      >
        <form onSubmit={handleSubmitReport} className="chat-report-form">
          <div className="chat-profile-card chat-profile-card--info">
            <AlertTriangle size={18} />
            <p>
              {chatContext?.reportHint ||
                "Admins will review the conversation, related post, and your reason."}
            </p>
          </div>
          <div className="form-group">
            <label className="input-label">Report type</label>
            <select
              className="input"
              value={reportCategory}
              onChange={(event) => setReportCategory(event.target.value)}
            >
              <option>Suspicious or misleading post/chat</option>
              <option>Fake claim or fake owner</option>
              <option>Harassment or abusive message</option>
              <option>Unsafe job request</option>
              <option>Spam or scam behavior</option>
              <option>Other</option>
            </select>
          </div>
          <div className="form-group">
            <label className="input-label">Reason</label>
            <textarea
              className="input"
              rows="4"
              value={reportReason}
              onChange={(event) => setReportReason(event.target.value)}
              placeholder="Explain what happened so the barangay admin can judge the severity."
              required
            />
          </div>
          <div className="modal-actions">
            <Button
              variant="secondary"
              type="button"
              onClick={() => setIsReportModalOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="danger" type="submit">
              <Flag size={16} /> Submit report
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isEndModalOpen && Boolean(selectedChat)}
        onClose={() => setIsEndModalOpen(false)}
        title="End chat"
        subtitle="End this conversation with a reason."
        size="md"
      >
        <form onSubmit={handleEndChat} className="chat-report-form">
          <div className="chat-profile-card chat-profile-card--info">
            <Info size={18} />
            <p>
              Ending this chat will stop new messages in this conversation. The
              reason will be visible in the chat for transparency.
            </p>
          </div>
          <div className="form-group">
            <label className="input-label">Reason for ending chat</label>
            <select
              className="input"
              value={endReason}
              onChange={(event) => setEndReason(event.target.value)}
              required
            >
              <option value="">Select reason</option>
              <option value="Issue resolved">Issue resolved</option>
              <option value="Item already claimed or returned">
                Item already claimed or returned
              </option>
              <option value="Job discussion finished">
                Job discussion finished
              </option>
              <option value="No longer interested">No longer interested</option>
              <option value="Unsafe or uncomfortable conversation">
                Unsafe or uncomfortable conversation
              </option>
              <option value="Other reason">Other reason</option>
            </select>
          </div>
          <div className="modal-actions">
            <Button
              variant="secondary"
              type="button"
              onClick={() => setIsEndModalOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="danger" type="submit">
              <LogOut size={16} /> End chat
            </Button>
          </div>
        </form>
      </Modal>
    </ResidentLayout>
  );
}

export default Chat;
