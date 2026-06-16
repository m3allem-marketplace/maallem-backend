const AppError = require("../../utils/AppError");
const pusher = require("../../config/pusher");
const { Conversation } = require("./chat.model");

const authorizePusherChannel = async (userId, socketId, channelName) => {
  if (channelName === `private-user-${userId}`) {
    return pusher.authorizeChannel(socketId, channelName);
  }

  if (channelName.startsWith("private-conversation-")) {
    const conversationId = channelName.replace("private-conversation-", "");
    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
      throw new AppError("Conversation not found", 404);
    }

    const isParticipant =
      conversation.client.toString() === userId || 
      conversation.worker.toString() === userId;

    if (!isParticipant) {
      throw new AppError("Forbidden", 403);
    }

    return pusher.authorizeChannel(socketId, channelName);
  }

  throw new AppError("Forbidden", 403);
};

module.exports = { authorizePusherChannel };
