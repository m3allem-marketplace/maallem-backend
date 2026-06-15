// ─── Chat Events and Channels ───────────────────────────────────────────────
const CHAT_EVENTS = {
  NEW_MESSAGE: "new-message",
  MESSAGE_READ: "message-read",
};

const CHAT_CHANNELS = {
  conversation: (conversationId) => `private-conversation-${conversationId}`,
};


// ─── Notifications ────────────────────────────────────────────────────────────
const NOTIFICATION_EVENTS = {
  NEW_NOTIFICATION: "new-notification",
};

const NOTIFICATION_CHANNELS = {
  user: (userId) => `private-user-${userId.toString()}`,
};

module.exports = {
  CHAT_EVENTS,
  CHAT_CHANNELS,
  NOTIFICATION_EVENTS,
  NOTIFICATION_CHANNELS,
};
