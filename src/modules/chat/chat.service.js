const { Conversation, Message } = require("./chat.model");
const pusher = require("../../config/pusher");
const cloudinary = require("../../config/cloudinary");
const AppError = require("../../utils/AppError");
const { CHAT_EVENTS, CHAT_CHANNELS } = require("../../constants/events");
const notificationsService = require("../notifications/notifications.service");

// ─── Start or get existing conversation ──────────────────────────────────────
const getOrCreateConversation = async (
  clientId,
  workerId,
  projectId = null,
) => {
  let conversation = await Conversation.findOne({
    client: clientId,
    worker: workerId,
  })
    .populate("client", "name email")
    .populate("worker", "name email")
    .populate("lastMessage");

  if (!conversation) {
    conversation = await Conversation.create({
      client: clientId,
      worker: workerId,
      project: projectId || null,
    });

    conversation = await conversation.populate([
      { path: "client", select: "name email" },
      { path: "worker", select: "name email" },
    ]);
  }

  return conversation;
};

// ─── Get my conversations ─────────────────────────────────────────────────────
const getMyConversations = async (userId, userRole) => {
  const filter =
    userRole === "worker" ? { worker: userId } : { client: userId };

  const conversations = await Conversation.find(filter)
    .populate("client", "name email")
    .populate("worker", "name email")
    .populate("lastMessage")
    .sort({ lastMessageAt: -1 });

  return conversations;
};

// ─── Get messages in a conversation ──────────────────────────────────────────
const getMessages = async (conversationId, userId, page = 1, limit = 30) => {
  const conversation = await Conversation.findById(conversationId);
  if (!conversation) throw new AppError("Conversation not found", 404);

  // verify user is a participant
  const isParticipant =
    conversation.client.toString() === userId ||
    conversation.worker.toString() === userId;

  if (!isParticipant) {
    throw new AppError(
      "Access denied. You are not part of this conversation",
      403,
    );
  }

  const skip = (page - 1) * limit;

  const messages = await Message.find({ conversation: conversationId })
    .populate("sender", "name email")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await Message.countDocuments({ conversation: conversationId });

  return {
    messages: messages.reverse(), // oldest first
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

// ─── Send a message ───────────────────────────────────────────────────────────
const sendMessage = async (
  conversationId,
  senderId,
  senderRole,
  body,
  file,
) => {
  const conversation = await Conversation.findById(conversationId);
  if (!conversation) throw new AppError("Conversation not found", 404);

  // verify sender is a participant
  const isParticipant =
    conversation.client.toString() === senderId ||
    conversation.worker.toString() === senderId;

  if (!isParticipant) {
    throw new AppError(
      "Access denied. You are not part of this conversation",
      403,
    );
  }

  let type = "text";
  let content = body.content || null;
  let fileUrl = null;
  let fileName = null;

  // handle file/image upload to Cloudinary
  if (file) {
    const isImage = file.mimetype.startsWith("image/");
    type = isImage ? "image" : "file";
    fileName = file.originalname;

    const uploadResult = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: "maallem/chat",
          resource_type: isImage ? "image" : "raw",
        },
        (error, result) => {
          if (error) reject(new AppError("File upload failed", 500));
          else resolve(result);
        },
      );
      uploadStream.end(file.buffer);
    });

    fileUrl = uploadResult.secure_url;
  }

  if (type === "text" && !content) {
    throw new AppError("Message content is required", 400);
  }

  // save message to DB
  const message = await Message.create({
    conversation: conversationId,
    sender: senderId,
    senderRole,
    type,
    content,
    fileUrl,
    fileName,
  });

  await message.populate("sender", "name email");

  // update conversation lastMessage + unread count
  const recipientRole =
    conversation.client.toString() === senderId ? "client" : "worker";

  // increment unread for the OTHER person
  const unreadField =
    recipientRole === "client" ? "unreadCount.worker" : "unreadCount.client";

  await Conversation.findByIdAndUpdate(conversationId, {
    lastMessage: message._id,
    lastMessageAt: new Date(),
    $inc: { [unreadField]: 1 },
  });

  // trigger Pusher event
  await pusher.trigger(
    CHAT_CHANNELS.conversation(conversationId),
    CHAT_EVENTS.NEW_MESSAGE,
    {
      message,
      conversationId,
    },
  );
  const recipientId =
    conversation.client.toString() === senderId
      ? conversation.worker
      : conversation.client;

  const senderName = message.sender?.name || "Someone";

  await notificationsService.notifyNewMessage(
    recipientId,
    senderName,
    conversationId,
  );

  return message;
};

// ─── Mark messages as read ────────────────────────────────────────────────────
const markAsRead = async (conversationId, userId, userRole) => {
  const conversation = await Conversation.findById(conversationId);
  if (!conversation) throw new AppError("Conversation not found", 404);

  const isParticipant =
    conversation.client.toString() === userId ||
    conversation.worker.toString() === userId;

  if (!isParticipant) {
    throw new AppError(
      "Access denied. You are not part of this conversation",
      403,
    );
  }

  // mark all unread messages from the OTHER person as read
  await Message.updateMany(
    {
      conversation: conversationId,
      sender: { $ne: userId },
      isRead: false,
    },
    { isRead: true },
  );

  // reset unread count for this user
  const unreadField =
    userRole === "user" ? "unreadCount.client" : "unreadCount.worker";

  await Conversation.findByIdAndUpdate(conversationId, {
    [unreadField]: 0,
  });

  // notify the other participant via Pusher
  await pusher.trigger(
    CHAT_CHANNELS.conversation(conversationId),
    CHAT_EVENTS.MESSAGE_READ,
    { conversationId, readBy: userId },
  );

  return { success: true };
};

module.exports = {
  getOrCreateConversation,
  getMyConversations,
  getMessages,
  sendMessage,
  markAsRead,
};
// ─── Notify recipient of new message ─────────────────────────────────────────
