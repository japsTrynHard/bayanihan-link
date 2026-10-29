import { removeUndefined, toIso } from "../utils/firestoreData";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  runTransaction,
  setDoc,
  updateDoc,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import {
  JOB_POST_STATUS,
  LOST_FOUND_STATUS,
  normalizePost,
} from "../utils/storage";
import { normalizeImageList } from "../utils/postImages";

const POSTS_COLLECTION = "posts";
const POST_RESPONSES_COLLECTION = "postResponses";

const nowIso = () => new Date().toISOString();


const displayDate = (value) => {
  const iso = toIso(value) || nowIso();
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};


const normalizeImage = (image) => normalizeImageList(image)[0] || "";

export const normalizeFirestorePost = (id, data = {}) => {
  const createdAt = toIso(data.createdAt) || data.createdAtIso || nowIso();
  const updatedAt = toIso(data.updatedAt) || data.updatedAtIso || createdAt;
  const images = normalizeImageList([
    data.images,
    data.image,
    data.imageUrl,
    data.photo,
    data.photoUrl,
    data.uploadedImages,
    data.itemImages,
    data.jobImages,
    data.attachments,
    data.media,
  ]);
  const author = data.author || {
    id: data.authorId || data.userId || "",
    uid: data.authorId || data.userId || "",
    name: data.authorName || "Resident",
    firstName: data.authorFirstName || "",
    lastName: data.authorLastName || "",
    barangay: data.barangay || "",
    avatar: data.authorAvatar || "",
    profilePicture: data.authorAvatarUrl || data.authorProfilePicture || "",
    avatarUrl: data.authorAvatarUrl || data.authorProfilePicture || "",
  };

  return normalizePost({
    ...data,
    id,
    uid: id,
    author,
    authorId: data.authorId || author.id || author.uid || "",
    authorName: data.authorName || author.name || "Resident",
    images,
    createdAt,
    updatedAt,
    postedDate: data.postedDate || displayDate(createdAt),
    responses: Array.isArray(data.responses) ? data.responses : [],
    interestedUserIds: Array.isArray(data.interestedUserIds)
      ? data.interestedUserIds
      : [],
    status:
      data.status ||
      (["lost", "found"].includes(data.type)
        ? LOST_FOUND_STATUS.ACTIVE
        : JOB_POST_STATUS.ACTIVE),
  });
};

const preparePostPayload = (postData = {}) => {
  const id =
    postData.id ||
    `post-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const createdAtIso = postData.createdAt || nowIso();
  const updatedAtIso = nowIso();
  const author = postData.author || {};
  const authorId = postData.authorId || author.id || author.uid || "";
  const authorName = postData.authorName || author.name || "Resident";
  const images = normalizeImageList([
    postData.images,
    postData.image,
    postData.imageUrl,
    postData.photo,
    postData.photoUrl,
    postData.uploadedImages,
    postData.itemImages,
    postData.jobImages,
    postData.attachments,
    postData.media,
  ]);

  const payload = {
    ...postData,
    id,
    type: postData.type || "job",
    title: String(postData.title || "").trim(),
    description: String(postData.description || "").trim(),
    category: postData.category || "General",
    barangay: postData.barangay || author.barangay || "",
    author: {
      id: authorId,
      uid: author.uid || authorId,
      name: authorName,
      firstName: author.firstName || "",
      lastName: author.lastName || "",
      email: author.email || "",
      barangay: author.barangay || postData.barangay || "",
      role: author.role || "resident",
      avatar: author.avatar || "",
      profilePicture: author.profilePicture || author.avatarUrl || "",
      avatarUrl: author.avatarUrl || author.profilePicture || "",
    },
    authorId,
    authorName,
    authorFirstName: author.firstName || "",
    authorLastName: author.lastName || "",
    authorAvatar: author.avatar || "",
    authorAvatarUrl: author.avatarUrl || author.profilePicture || "",
    images,
    responses: Array.isArray(postData.responses) ? postData.responses : [],
    interestedUserIds: Array.isArray(postData.interestedUserIds)
      ? postData.interestedUserIds
      : [],
    interests: postData.interests || 0,
    comments: postData.comments || 0,
    status:
      postData.status ||
      (["lost", "found"].includes(postData.type)
        ? LOST_FOUND_STATUS.ACTIVE
        : JOB_POST_STATUS.ACTIVE),
    createdAtIso,
    updatedAtIso,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  return removeUndefined(payload);
};

const sortPosts = (posts) => {
  return [...posts].sort((a, b) => {
    const aTime = new Date(
      a.createdAtIso || a.createdAt || a.updatedAtIso || a.updatedAt || 0,
    ).getTime();
    const bTime = new Date(
      b.createdAtIso || b.createdAt || b.updatedAtIso || b.updatedAt || 0,
    ).getTime();
    return (
      (Number.isNaN(bTime) ? 0 : bTime) - (Number.isNaN(aTime) ? 0 : aTime)
    );
  });
};

export const subscribePostsForUser = (
  currentUser,
  barangayFilterMode,
  callback,
  onError,
) => {
  if (!currentUser) {
    callback([]);
    return () => {};
  }

  const postsRef = collection(db, POSTS_COLLECTION);
  const currentBarangay = currentUser.barangay || "";
  const currentUid = currentUser.uid || currentUser.id || "";

  const mergeAndEmit = (groups = {}) => {
    const merged = new Map();
    Object.values(groups)
      .flat()
      .filter(Boolean)
      .forEach((post) => {
        merged.set(post.id, { ...(merged.get(post.id) || {}), ...post });
      });
    callback(sortPosts([...merged.values()]));
  };

  // Residents need to see: items routed to their barangay, their own cross-barangay posts,
  // posts from their home barangay, and community-wide posts (isAllBarangays).
  if (currentUser.role === "resident" && barangayFilterMode !== "all") {
    const buckets = {};
    const queries = [
      ["routed", query(postsRef, where("barangay", "==", currentBarangay))],
      ["home", query(postsRef, where("homeBarangay", "==", currentBarangay))],
      ["allBarangays", query(postsRef, where("isAllBarangays", "==", true))],
      currentUid
        ? ["mine", query(postsRef, where("authorId", "==", currentUid))]
        : null,
    ].filter(Boolean);

    const unsubscribers = queries.map(([key, postsQuery]) =>
      onSnapshot(
        postsQuery,
        (snapshot) => {
          buckets[key] = snapshot.docs.map((item) =>
            normalizeFirestorePost(item.id, item.data()),
          );
          mergeAndEmit(buckets);
        },
        (error) => {
          console.error(`Firestore posts listener failed (${key}).`, error);
          if (onError) onError(error);
        },
      ),
    );

    return () => unsubscribers.forEach((unsubscribe) => unsubscribe?.());
  }

  // Barangay admins need both actionable incident cases and home-barangay reference records.
  // This lets Pinambaran admin see a Pinambaran resident's item even if it was routed to Poblacion,
  // while the incident barangay remains the only admin with final action controls.
  if (currentUser.role === "barangay_admin" && currentBarangay) {
    const buckets = {};
    const queries = [
      ["incident", query(postsRef, where("barangay", "==", currentBarangay))],
      [
        "homeReference",
        query(postsRef, where("homeBarangay", "==", currentBarangay)),
      ],
    ];

    const unsubscribers = queries.map(([key, postsQuery]) =>
      onSnapshot(
        postsQuery,
        (snapshot) => {
          buckets[key] = snapshot.docs.map((item) =>
            normalizeFirestorePost(item.id, item.data()),
          );
          mergeAndEmit(buckets);
        },
        (error) => {
          console.error(`Firestore posts listener failed (${key}).`, error);
          if (onError) onError(error);
        },
      ),
    );

    return () => unsubscribers.forEach((unsubscribe) => unsubscribe?.());
  }

  const shouldReadAll =
    currentUser.role === "resident" && barangayFilterMode === "all";
  const postsQuery = shouldReadAll
    ? query(postsRef)
    : query(postsRef, where("barangay", "==", currentBarangay));

  return onSnapshot(
    postsQuery,
    (snapshot) => {
      const posts = snapshot.docs.map((item) =>
        normalizeFirestorePost(item.id, item.data()),
      );
      callback(sortPosts(posts));
    },
    (error) => {
      console.error("Firestore posts listener failed.", error);
      if (onError) onError(error);
    },
  );
};

export const createPostInFirestore = async (postData = {}) => {
  const payload = preparePostPayload(postData);
  await setDoc(doc(db, POSTS_COLLECTION, payload.id), payload, { merge: true });

  // Return immediately after the write. Waiting for a follow-up read can make the
  // UI stay on "Creating post..." when Firestore is slow, offline, or rules are still propagating.
  return normalizeFirestorePost(payload.id, {
    ...payload,
    createdAt: payload.createdAtIso,
    updatedAt: payload.updatedAtIso,
  });
};

export const updatePostInFirestore = async (postId, updates = {}) => {
  if (!postId) throw new Error("Missing post ID.");
  const safeUpdates = removeUndefined({
    ...updates,
    updatedAt: serverTimestamp(),
    updatedAtIso: nowIso(),
  });
  delete safeUpdates.id;
  delete safeUpdates.uid;
  await setDoc(doc(db, POSTS_COLLECTION, postId), safeUpdates, { merge: true });
  return getPostFromFirestore(postId);
};

export const deletePostFromFirestore = async (postId) => {
  if (!postId) throw new Error("Missing post ID.");
  await deleteDoc(doc(db, POSTS_COLLECTION, postId));
  return true;
};

export const getPostFromFirestore = async (postId) => {
  if (!postId) return null;
  const snapshot = await getDoc(doc(db, POSTS_COLLECTION, postId));
  if (!snapshot.exists()) return null;
  return normalizeFirestorePost(snapshot.id, snapshot.data());
};

export const createPostResponseInFirestore = async (postId, response = {}) => {
  if (!postId) throw new Error("Missing post ID.");
  const responseId =
    response.id ||
    `response-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const payload = removeUndefined({
    ...response,
    id: responseId,
    postId,
    createdAtIso: response.createdAt || nowIso(),
    createdAt: serverTimestamp(),
  });
  await setDoc(doc(db, POST_RESPONSES_COLLECTION, responseId), payload, {
    merge: true,
  });
  return payload;
};

// Keep the response and its summary in one transaction. Concurrent responders
// must not replace each other's arrays or inflate the count when they retry.
export const respondToPostInFirestore = async (postId, response = {}) => {
  if (!postId || !response.userId) throw new Error("Post and responder IDs are required.");
  const postRef = doc(db, POSTS_COLLECTION, postId);
  const responseId = response.id || `${postId}-${response.userId}`;
  const responseRef = doc(db, POST_RESPONSES_COLLECTION, responseId);
  const database = db;
  for (let attempt = 0; ; attempt++) {
    let observedIds = [];
    try {
      return await runTransaction(database, async (transaction) => {
    const snapshot = await transaction.get(postRef);
    if (!snapshot.exists()) throw new Error("This post is no longer available.");
    const post = normalizeFirestorePost(snapshot.id, snapshot.data());
    observedIds = post.interestedUserIds;
    if (post.authorId === response.userId) throw new Error("You cannot respond to your own post.");
    if (post.status !== "Active") throw new Error("This post is no longer accepting responses.");
    if (post.interestedUserIds.includes(response.userId)) return { post, created: false };
    await transaction.get(responseRef);
    const record = removeUndefined({ ...response, id: responseId, createdAt: response.createdAt || nowIso() });
    const updates = {
      responses: [...post.responses, record],
      interestedUserIds: [...post.interestedUserIds, response.userId],
      interests: post.interestedUserIds.length + 1,
      lastResponseAt: record.createdAt,
      updatedAt: serverTimestamp(), updatedAtIso: nowIso(),
    };
    transaction.update(postRef, updates);
    transaction.set(responseRef, {
      ...record, postId, postType: post.type,
      responderId: response.userId, responderName: response.userName || "Resident",
      createdAtIso: record.createdAt, createdAt: serverTimestamp(),
    });
    return { post: normalizeFirestorePost(postId, { ...post, ...updates }), response: record, created: true };
      });
    } catch (error) {
      if (error.code !== "permission-denied" || attempt >= 3) throw error;
      // Rules can reject a stale append before Firestore reports a conflict.
      // Retry only if another response changed the record we just read.
      const latest = await getDoc(postRef);
      if (!latest.exists()) throw error;
      const post = normalizeFirestorePost(latest.id, latest.data());
      if (post.interestedUserIds.includes(response.userId)) return { post, created: false };
      if (JSON.stringify(post.interestedUserIds) === JSON.stringify(observedIds)) throw error;
    }
  }
};
