import {
  arrayUnion,
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import {
  uploadImageToCloudinary,
  CLOUDINARY_FOLDERS,
} from "./cloudinaryService";
import { displayDate } from "../utils/storage";

const CHATS_COLLECTION = "chats";

const nowIso = () => new Date().toISOString();

const toIso = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value?.toDate === "function") return value.toDate().toISOString();
  if (typeof value?.seconds === "number")
    return new Date(value.seconds * 1000).toISOString();
  return String(value);
};

const removeUndefined = (value) => {
  if (Array.isArray(value))
    return value.map(removeUndefined).filter((item) => item !== undefined);
  if (value && typeof value === "object" && !(value instanceof Date)) {
    return Object.entries(value).reduce((acc, [key, item]) => {
      const cleaned = removeUndefined(item);
      if (cleaned !== undefined) acc[key] = cleaned;
      return acc;
    }, {});
  }
  return value === undefined ? undefined : value;
};

const publicUser = (user = {}) => ({
  id: user.id || user.uid || "",
  uid: user.uid || user.id || "",
  name:
    user.name ||
    `${user.firstName || ""} ${user.lastName || ""}`.trim() ||
    user.email ||
    "Resident",
  firstName: user.firstName || "",
  lastName: user.lastName || "",
  avatar: user.avatar || "",
  profilePicture: user.profilePicture || user.avatarUrl || "",
  avatarUrl: user.avatarUrl || user.profilePicture || "",
  phone: user.phone || "",
  barangay: user.barangay || "",
  role: user.role || "resident",
  status: user.status || "Active",
});

const getUserId = (user = {}) => {
  return user.id || user.uid || user.userId || user.email || "";
};

const uniqueList = (...groups) => [
  ...new Set(
    groups
      .flat()
      .filter(Boolean)
      .map((item) => String(item)),
  ),
];

const getUserKeys = (user = {}) =>
  uniqueList(user.id, user.uid, user.userId, user.email, user.name).filter(
    Boolean,
  );

const chatContainsUser = (chat = {}, user = {}) => {
  const userKeys = new Set(getUserKeys(user));
  const chatKeys = uniqueList(
    chat.participants || [],
    chat.participantKeys || [],
    (chat.participantProfiles || []).flatMap(getUserKeys),
  );
  return chatKeys.some((key) => userKeys.has(String(key)));
};

export const normalizeFirestoreChat = (id, data = {}) => {
  const messages = Array.isArray(data.messages) ? data.messages : [];
  const createdAt = toIso(data.createdAt) || data.createdAtIso || nowIso();
  const lastMessageAt =
    toIso(data.lastMessageAt) || data.lastMessageAtIso || createdAt;

  const sortedMessages = [...messages].sort((a, b) => {
    const at = new Date(a.createdAt || a.timestamp || 0).getTime();
    const bt = new Date(b.createdAt || b.timestamp || 0).getTime();
    return (Number.isNaN(at) ? 0 : at) - (Number.isNaN(bt) ? 0 : bt);
  });

  return {
    messages: sortedMessages,
    participants: Array.isArray(data.participants) ? data.participants : [],
    participantKeys: Array.isArray(data.participantKeys)
      ? data.participantKeys
      : [],
    participantProfiles: Array.isArray(data.participantProfiles)
      ? data.participantProfiles
      : [],
    relatedPosts: Array.isArray(data.relatedPosts) ? data.relatedPosts : [],
    ...data,
    id,
    uid: id,
    createdAt,
    lastMessageAt,
    lastMessageTime: data.lastMessageTime || displayDate(lastMessageAt),
    lastMessage:
      data.lastMessage ||
      (sortedMessages.length
        ? sortedMessages[sortedMessages.length - 1]?.text || "Image message"
        : "Conversation started"),
  };
};

const sortChats = (items = []) =>
  [...items].sort((a, b) => {
    const at = new Date(a.lastMessageAt || a.createdAt || 0).getTime();
    const bt = new Date(b.lastMessageAt || b.createdAt || 0).getTime();
    return bt - at;
  });

const buildRelatedPost = (context = {}) => {
  if (!context.relatedPostId) return null;
  return {
    id: context.relatedPostId,
    title: context.relatedPostTitle || "Community post",
    type: context.relatedPostType || "post",
    source: context.source || "post_interaction",
    createdAt: nowIso(),
  };
};

export const subscribeChatsForUser = (currentUser, callback, onError) => {
  const uid = currentUser.uid || currentUser.id;
  const email = currentUser.email;

  if (!uid && !email) {
    callback([]);
    return () => {};
  }

  const merged = new Map();
  const emit = () => callback(sortChats([...merged.values()]));
  const unsubscribers = [];

  const makeListener = (chatQuery) =>
    onSnapshot(
      chatQuery,
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          const chat = normalizeFirestoreChat(change.doc.id, change.doc.data());
          if (chatContainsUser(chat, currentUser)) {
            if (change.type === "removed") merged.delete(change.doc.id);
            else merged.set(change.doc.id, chat);
          }
        });
        emit();
      },
      (error) => {
        console.warn(
          "Firestore chat listener failed (Rules restriction):",
          error.message,
        );
        if (onError) onError(error);
      },
    );

  // Safe Query 1: by exact UID to satisfy rules
  if (uid) {
    const participantQuery = query(
      collection(db, CHATS_COLLECTION),
      where("participants", "array-contains", uid),
    );
    unsubscribers.push(makeListener(participantQuery));
  }

  // Safe Query 2: by exact Email to satisfy rules
  if (email) {
    const emailQuery = query(
      collection(db, CHATS_COLLECTION),
      where("participantKeys", "array-contains", email),
    );
    unsubscribers.push(makeListener(emailQuery));
  }

  return () => unsubscribers.forEach((unsub) => unsub?.());
};

export const createOrGetChatInFirestore = async ({
  currentUser,
  otherUser,
  context = {},
}) => {
  const currentUserId = currentUser.uid || currentUser.id || "";
  const otherUserId = otherUser.uid || otherUser.id || "";
  const email = currentUser.email;

  if (!currentUserId || !otherUserId) {
    throw new Error(
      "Cannot create chat: missing user ID for one or both participants.",
    );
  }

  let existingDoc = null;

  try {
    const queries = [];
    if (currentUserId)
      queries.push(
        getDocs(
          query(
            collection(db, CHATS_COLLECTION),
            where("participants", "array-contains", currentUserId),
          ),
        ),
      );
    if (email)
      queries.push(
        getDocs(
          query(
            collection(db, CHATS_COLLECTION),
            where("participantKeys", "array-contains", email),
          ),
        ),
      );

    const snapshots = await Promise.all(queries);
    const candidateDocs = snapshots.flatMap((snap) => snap.docs);

    const currentKeys = getUserKeys(currentUser);
    const otherKeys = getUserKeys(otherUser);
    const seenDocs = new Set();

    existingDoc = candidateDocs.find((item) => {
      if (seenDocs.has(item.id)) return false;
      seenDocs.add(item.id);
      const chat = normalizeFirestoreChat(item.id, item.data());
      const keys = new Set(
        uniqueList(
          chat.participants || [],
          chat.participantKeys || [],
          (chat.participantProfiles || []).flatMap(getUserKeys),
        ),
      );
      return (
        currentKeys.some((key) => keys.has(key)) &&
        otherKeys.some((key) => keys.has(key))
      );
    });
  } catch (error) {
    console.warn(
      "Error querying existing chats. Proceeding to create new chat.",
      error.message,
    );
  }

  const relatedPost = buildRelatedPost(context);

  if (existingDoc) {
    const chat = normalizeFirestoreChat(existingDoc.id, existingDoc.data());
    const updates = { updatedAt: serverTimestamp(), updatedAtIso: nowIso() };

    if (relatedPost) {
      updates.relatedPostId = relatedPost.id;
      updates.relatedPostTitle = relatedPost.title;
      updates.relatedPostType = relatedPost.type;
      updates.lastContextAt = nowIso();
      const existingPosts = Array.isArray(chat.relatedPosts)
        ? chat.relatedPosts
        : [];
      updates.relatedPosts = existingPosts.some(
        (item) => item.id === relatedPost.id,
      )
        ? existingPosts.map((item) =>
            item.id === relatedPost.id ? { ...item, ...relatedPost } : item,
          )
        : [relatedPost, ...existingPosts].slice(0, 5);
    }
    await updateDoc(
      doc(db, CHATS_COLLECTION, chat.id),
      removeUndefined(updates),
    );
    return normalizeFirestoreChat(chat.id, { ...chat, ...updates });
  }

  const chatId = `chat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const createdAtIso = nowIso();
  const payload = removeUndefined({
    id: chatId,
    participants: [currentUserId, otherUserId],
    participantKeys: uniqueList(
      getUserKeys(currentUser),
      getUserKeys(otherUser),
    ),
    participantProfiles: [publicUser(currentUser), publicUser(otherUser)],
    relatedPostId: relatedPost?.id || "",
    relatedPostTitle: relatedPost?.title || "",
    relatedPostType: relatedPost?.type || "",
    relatedPosts: relatedPost ? [relatedPost] : [],
    lastMessage: relatedPost
      ? `Conversation started about ${relatedPost.title}`
      : "Conversation started",
    lastMessageAt: serverTimestamp(),
    lastMessageAtIso: createdAtIso,
    lastMessageTime: displayDate(createdAtIso),
    messages: [],
    createdAt: serverTimestamp(),
    createdAtIso,
    updatedAt: serverTimestamp(),
    updatedAtIso: createdAtIso,
  });

  await setDoc(doc(db, CHATS_COLLECTION, chatId), payload, { merge: true });
  return normalizeFirestoreChat(chatId, payload);
};

export const createChatInFirestore = async (chatData = {}) => {
  const chatId =
    chatData.id ||
    `chat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const createdAtIso = chatData.createdAt || nowIso();
  const payload = removeUndefined({
    messages: [],
    participants: [],
    participantKeys:
      chatData.participantKeys ||
      uniqueList(
        chatData.participants || [],
        (chatData.participantProfiles || []).flatMap(getUserKeys),
      ),
    participantProfiles: [],
    ...chatData,
    id: chatId,
    createdAt: serverTimestamp(),
    createdAtIso,
    updatedAt: serverTimestamp(),
    updatedAtIso: nowIso(),
  });
  await setDoc(doc(db, CHATS_COLLECTION, chatId), payload, { merge: true });
  return normalizeFirestoreChat(chatId, payload);
};

export const addMessageToChatInFirestore = async (
  chatId,
  message = {},
  currentChat = null,
) => {
  if (!chatId) throw new Error("Missing chat ID.");
  const createdAtIso = message.createdAt || nowIso();
  const nextMessage = removeUndefined({
    id:
      message.id ||
      `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    senderId: message.senderId || "",
    senderName: message.senderName || "Resident",
    text: String(message.text || "").trim(),
    image: message.image || "",
    imagePublicId: message.imagePublicId || "",
    readBy: Array.isArray(message.readBy)
      ? message.readBy
      : [message.senderId].filter(Boolean),
    timestamp: message.timestamp || displayDate(createdAtIso),
    createdAt: createdAtIso,
  });

  const payload = {
    messages: arrayUnion(nextMessage),
    lastMessage:
      nextMessage.text || (nextMessage.image ? "Image message" : "New message"),
    lastMessageAt: serverTimestamp(),
    lastMessageAtIso: createdAtIso,
    lastMessageTime: nextMessage.timestamp,
    updatedAt: serverTimestamp(),
    updatedAtIso: createdAtIso,
  };

  // Prevent NOT_FOUND errors and satisfy Security Rules during race conditions
  if (currentChat?.participants) {
    payload.participants = currentChat.participants;
    payload.participantKeys = currentChat.participantKeys || [];
    payload.participantProfiles = currentChat.participantProfiles || [];
  }

  // Changed updateDoc to setDoc with merge: true to avoid document missing errors
  await setDoc(doc(db, CHATS_COLLECTION, chatId), payload, { merge: true });

  return nextMessage;
};

export const sendImageMessageToChatInFirestore = async (
  chatId,
  file,
  baseMessage = {},
) => {
  const image = await uploadImageToCloudinary(file, CLOUDINARY_FOLDERS.CHATS);
  return addMessageToChatInFirestore(chatId, {
    ...baseMessage,
    image: image.url,
    imagePublicId: image.publicId,
  });
};

export const markChatReadInFirestore = async (
  chatId,
  userId,
  currentChat = null,
) => {
  if (!chatId || !userId || !currentChat) return null;
  const messages = (currentChat.messages || []).map((message) => ({
    ...message,
    readBy: Array.from(new Set([...(message.readBy || []), userId])),
  }));

  await setDoc(
    doc(db, CHATS_COLLECTION, chatId),
    {
      messages,
      updatedAt: serverTimestamp(),
      updatedAtIso: nowIso(),
    },
    { merge: true },
  );

  return normalizeFirestoreChat(chatId, { ...currentChat, messages });
};

export const updateChatInFirestore = async (chatId, updates = {}) => {
  if (!chatId) throw new Error("Missing chat ID.");
  const payload = removeUndefined({
    ...updates,
    updatedAt: serverTimestamp(),
    updatedAtIso: nowIso(),
  });
  await setDoc(doc(db, CHATS_COLLECTION, chatId), payload, { merge: true });
  return payload;
};

export const updateChatMessageInFirestore = async (
  chatId,
  currentChat = null,
  messageId,
  updater,
) => {
  if (!chatId || !currentChat || !messageId) return null;
  const messages = (currentChat.messages || []).map((message) => {
    if (message.id !== messageId) return message;
    return typeof updater === "function"
      ? updater(message)
      : { ...message, ...updater };
  });
  await setDoc(
    doc(db, CHATS_COLLECTION, chatId),
    {
      messages,
      updatedAt: serverTimestamp(),
      updatedAtIso: nowIso(),
    },
    { merge: true },
  );
  return normalizeFirestoreChat(chatId, { ...currentChat, messages });
};
