const { Conversation, Message } = require("./chat.model");
const pusher = require("../../config/pusher");
const cloudinary = require("../../config/cloudinary");
const AppError = require("../../utils/AppError");
const { CHAT_EVENTS, CHAT_CHANNELS } = require("../../constants/events");
const { notifyNewMessage } = require("../notifications/notifications.service");

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
    // FIX 1: fetch with populate after create
    const created = await Conversation.create({
      client: clientId,
      worker: workerId,
      project: projectId || null,
    });

    conversation = await Conversation.findById(created._id)
      .populate("client", "name email")
      .populate("worker", "name email");
  }

  return conversation;
};

// ─── Get my conversations ─────────────────────────────────────────────────────
const getMyConversations = async (userId, userRole) => {
  const filter =
    userRole === "worker" ? { worker: userId } : { client: userId };

  const otherParticipantId =
    userRole === "user"
      ? conversation.worker.toString()
      : conversation.client.toString();

  pusher
    .trigger(
      NOTIFICATION_CHANNELS.user(otherParticipantId),
      NOTIFICATION_EVENTS.MESSAGE_READ, // add this event to your constants
      { conversationId },
    )
    .catch((err) => console.error("Pusher read event error:", err.message));
  return Conversation.find(filter)
    .populate("client", "name email")
    .populate("worker", "name email")
    .populate("lastMessage")
    .sort({ lastMessageAt: -1 });
};

// ─── Get messages ─────────────────────────────────────────────────────────────
const getMessages = async (conversationId, userId, page = 1, limit = 30) => {
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

  const skip = (page - 1) * limit;

  // FIX 6 from earlier review: sort ascending directly, no reverse needed
  const messages = await Message.find({ conversation: conversationId })
    .populate("sender", "name email")
    .sort({ createdAt: 1 })
    .skip(skip)
    .limit(limit);

  const total = await Message.countDocuments({ conversation: conversationId });

  return {
    messages,
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

  if (file) {
    const isImage = file.mimetype.startsWith("image/");
    type = isImage ? "image" : "file";
    fileName = file.originalname;

    const uploadResult = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: "maallem/chat", resource_type: isImage ? "image" : "raw" },
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

  // FIX 2: single clean declaration
  const senderName = message.sender?.name || "Someone";

  // FIX 4: flat field names matching updated model
  const isClient = conversation.client.toString() === senderId;
  const unreadField = isClient ? "unreadCount.worker" : "unreadCount.client";
  const recipientId = isClient ? conversation.worker : conversation.client;

  await Conversation.findByIdAndUpdate(conversationId, {
    lastMessage: message._id,
    lastMessageAt: new Date(),
    $inc: { [unreadField]: 1 },
  });

  // Pusher — non-blocking
  try {
    await pusher.trigger(
      CHAT_CHANNELS.conversation(conversationId),
      CHAT_EVENTS.NEW_MESSAGE,
      { message, conversationId },
    );
  } catch (e) {
    console.error("Pusher trigger failed:", e.message);
  }

  // FIX 3: use named import directly, fire-and-forget
  notifyNewMessage(recipientId, senderName, conversationId).catch((err) =>
    console.error("Notification error:", err.message),
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

  await Message.updateMany(
    { conversation: conversationId, sender: { $ne: userId }, isRead: false },
    { isRead: true },
  );

  // FIX 4: flat field names
  const unreadField =
    userRole === "user" ? "unreadCount.client" : "unreadCount.worker";
  await Conversation.findByIdAndUpdate(conversationId, {
    [unreadField]: 0,
  });

  try {
    await pusher.trigger(
      CHAT_CHANNELS.conversation(conversationId),
      CHAT_EVENTS.MESSAGE_READ,
      { conversationId, readBy: userId },
    );
  } catch (e) {
    console.error("Pusher read trigger failed:", e.message);
  }

  return { success: true };
};

module.exports = {
  getOrCreateConversation,
  getMyConversations,
  getMessages,
  sendMessage,
  markAsRead,
};
