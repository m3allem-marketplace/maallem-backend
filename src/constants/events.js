const CHAT_EVENTS = {
  NEW_MESSAGE: "new-message",
  MESSAGE_READ: "message-read",
};

const CHAT_CHANNELS = {
  conversation: (conversationId) => `private-conversation-${conversationId}`,
};

module.exports = { CHAT_EVENTS, CHAT_CHANNELS };