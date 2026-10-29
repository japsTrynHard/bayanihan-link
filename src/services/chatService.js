import { removeUndefined, toIso } from "../utils/firestoreData";
import {
  arrayUnion,
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  query,
  runTransaction,
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
  uniqueList(user.id, user.uid, user.userId, user.email).filter(
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
    ...data,
    messages: sortedMessages,
    participants: Array.isArray(data.participants) ? data.participants : [],
    participantKeys: Array.isArray(data.participantKeys)
      ? data.participantKeys
      : [],
    participantProfiles: Array.isArray(data.participantProfiles)
      ? data.participantProfiles
      : [],
    relatedPosts: Array.isArray(data.relatedPosts) ? data.relatedPosts : [],
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

  const sources = new Map();
  const unsubscribers = [];
  const makeListener = (chatQuery) => onSnapshot(chatQuery, (snapshot) => {
    sources.set(chatQuery, snapshot.docs.map((item) => normalizeFirestoreChat(item.id, item.data())));
    const merged = new Map();
    sources.forEach((records) => records.forEach((chat) => {
      if (chatContainsUser(chat, currentUser)) merged.set(chat.id, chat);
    }));
    callback(sortChats([...merged.values()]));
  }, (error) => { onError?.(error); });

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

export const createOrGetChatInFirestore = async ({ currentUser, otherUser, context = {} }) => {
  const currentId = currentUser?.uid || currentUser?.id;
  const otherId = otherUser?.uid || otherUser?.id;
  if (!currentId || !otherId || currentId === otherId) throw new Error("Two different account IDs are required to start a chat.");
  const snapshot = await getDocs(query(collection(db, CHATS_COLLECTION), where("participants", "array-contains", currentId)));
  const existing = snapshot.docs.find((item) => {
    const chat = normalizeFirestoreChat(item.id, item.data());
    return chatContainsUser(chat, currentUser) && chatContainsUser(chat, otherUser);
  });
  // Both participants choose the same ID even when they open a chat at once.
  const chatId = existing?.id || "chat-" + encodeURIComponent(JSON.stringify([currentId, otherId].sort()));
  const chatRef = doc(db, CHATS_COLLECTION, chatId);
  const relatedPost = buildRelatedPost(context);
  return runTransaction(db, async (transaction) => {
    const latest = await transaction.get(chatRef);
    const stamp = nowIso();
    const payload = latest.exists() ? latest.data() : {
      id: chatId, participants: [currentId, otherId],
      participantKeys: uniqueList(getUserKeys(currentUser), getUserKeys(otherUser)),
      participantProfiles: [publicUser(currentUser), publicUser(otherUser)],
      messages: [], relatedPosts: [],
      lastMessage: relatedPost ? "Conversation started about " + relatedPost.title : "Conversation started",
      lastMessageAt: serverTimestamp(), lastMessageAtIso: stamp,
      createdAt: serverTimestamp(), createdAtIso: stamp,
    };
    const updates = { updatedAt: serverTimestamp(), updatedAtIso: stamp };
    if (relatedPost) {
      Object.assign(updates, {
        relatedPostId: relatedPost.id, relatedPostTitle: relatedPost.title,
        relatedPostType: relatedPost.type, lastContextAt: stamp,
        relatedPosts: [relatedPost, ...(payload.relatedPosts || []).filter((item) => item.id !== relatedPost.id)].slice(0, 5),
      });
    }
    transaction.set(chatRef, removeUndefined(latest.exists() ? updates : { ...payload, ...updates }), { merge: true });
    return normalizeFirestoreChat(chatId, { ...payload, ...updates });
  });
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

  await updateDoc(doc(db, CHATS_COLLECTION, chatId), payload);

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

const transformChatMessages = (chatId, transform) => runTransaction(db, async (transaction) => {
  const chatRef = doc(db, CHATS_COLLECTION, chatId);
  const snapshot = await transaction.get(chatRef);
  if (!snapshot.exists()) throw new Error("Conversation no longer exists.");
  const chat = normalizeFirestoreChat(snapshot.id, snapshot.data());
  const messages = transform(chat.messages);
  transaction.update(chatRef, { messages: removeUndefined(messages), updatedAt: serverTimestamp(), updatedAtIso: nowIso() });
  return normalizeFirestoreChat(chatId, { ...chat, messages });
});

export const markChatReadInFirestore = async (chatId, userId, currentChat = null) => {
  if (!chatId || !userId || !currentChat) return null;
  // Acknowledge only messages actually displayed, not messages arriving later.
  const seenIds = new Set((currentChat.messages || []).map((message) => message.id));
  return transformChatMessages(chatId, (messages) => messages.map((message) => seenIds.has(message.id)
    ? { ...message, readBy: [...new Set([...(message.readBy || []), userId])] }
    : message));
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
  return transformChatMessages(chatId, (messages) => messages.map((message) => {
    if (message.id !== messageId) return message;
    return typeof updater === "function" ? updater(message) : { ...message, ...updater };
  }));
};
