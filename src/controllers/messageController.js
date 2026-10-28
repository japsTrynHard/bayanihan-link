// Message Controller
// Handles conversations, messages, and notifications

import { CONVERSATIONS, NOTIFICATIONS } from "../models/mockData";

export const messageController = {
  getConversations: (userId) => {
    return CONVERSATIONS.filter((conv) =>
      conv.participants.includes(userId),
    ).sort((a, b) => new Date(b.lastMessageTime) - new Date(a.lastMessageTime));
  },

  getConversation: (conversationId) => {
    return CONVERSATIONS.find((c) => c.id === conversationId);
  },

  sendMessage: (conversationId, senderId, text, imageData = null) => {
    const conversation = CONVERSATIONS.find((c) => c.id === conversationId);
    if (!conversation) {
      return { success: false, error: "Conversation not found" };
    }

    const newMessage = {
      id: `msg-${Date.now()}`,
      senderId,
      text,
      timestamp: new Date().toISOString(),
      image: imageData,
      read: false,
    };

    conversation.messages.push(newMessage);
    conversation.lastMessage = text;
    conversation.lastMessageTime = newMessage.timestamp;

    return { success: true, message: newMessage };
  },

  startConversation: (userId1, userId2) => {
    // Check if conversation exists
    let conversation = CONVERSATIONS.find(
      (c) =>
        c.participants.includes(userId1) && c.participants.includes(userId2),
    );

    if (!conversation) {
      conversation = {
        id: `conv-${Date.now()}`,
        participants: [userId1, userId2],
        lastMessage: "",
        lastMessageTime: new Date().toISOString(),
        messages: [],
      };
      CONVERSATIONS.push(conversation);
    }

    return conversation;
  },

  markMessageAsRead: (conversationId, messageId) => {
    const conversation = CONVERSATIONS.find((c) => c.id === conversationId);
    if (conversation) {
      const message = conversation.messages.find((m) => m.id === messageId);
      if (message) {
        message.read = true;
        return { success: true };
      }
    }
    return { success: false, error: "Message not found" };
  },

  // Notifications
  getNotifications: (userId) => {
    return NOTIFICATIONS.filter((n) => n.userId === userId).sort(
      (a, b) => new Date(b.timestamp) - new Date(a.timestamp),
    );
  },

  createNotification: (userId, type, title, message) => {
    const notification = {
      id: `notif-${Date.now()}`,
      userId,
      type,
      title,
      message,
      read: false,
      timestamp: new Date().toISOString(),
    };
    NOTIFICATIONS.push(notification);
    return notification;
  },

  markNotificationAsRead: (notificationId) => {
    const notification = NOTIFICATIONS.find((n) => n.id === notificationId);
    if (notification) {
      notification.read = true;
      return { success: true };
    }
    return { success: false, error: "Notification not found" };
  },

  getUnreadCount: (userId) => {
    return NOTIFICATIONS.filter((n) => n.userId === userId && !n.read).length;
  },
};

export default messageController;
