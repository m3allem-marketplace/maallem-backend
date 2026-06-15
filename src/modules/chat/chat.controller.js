const chatService = require("./chat.service");
const catchAsync = require("../../utils/catchAsync");
const AppError = require("../../utils/AppError");
const { sendResponse } = require("../../utils/apiResponse");
const pusher = require("../../config/pusher");

// ─── Start or get conversation ────────────────────────────────────────────────
const startConversation = catchAsync(async (req, res) => {
  const clientId = req.user.id;
  const { workerId, projectId } = req.body;

  if (!workerId) throw new AppError("workerId is required", 400);

  const conversation = await chatService.getOrCreateConversation(
    clientId,
    workerId,
    projectId,
  );

  sendResponse(res, 200, { conversation }, "Conversation ready");
});

const authenticatePusher = catchAsync(async (req, res) => {
  const socketId = req.body.socket_id;
  const channel = req.body.channel_name;

  // Basic validation: Ensure the user is actually part of the conversation they are trying to join.
  // E.g., if channel is 'private-conversation-123', verify req.user.id is in conversation 123.

  const authResponse = pusher.authorizeChannel(socketId, channel);
  res.send(authResponse);
});
// ─── Get my conversations ─────────────────────────────────────────────────────
const getMyConversations = catchAsync(async (req, res) => {
  const conversations = await chatService.getMyConversations(
    req.user.id,
    req.user.role,
  );

  sendResponse(res, 200, { conversations }, "Conversations fetched");
});

// ─── Get messages ─────────────────────────────────────────────────────────────
const getMessages = catchAsync(async (req, res) => {
  const { id } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 30;

  const result = await chatService.getMessages(id, req.user.id, page, limit);

  sendResponse(res, 200, result, "Messages fetched");
});

// ─── Send message ─────────────────────────────────────────────────────────────
const sendMessage = catchAsync(async (req, res) => {
  const { id } = req.params;
  const file = req.file || null;

  const message = await chatService.sendMessage(
    id,
    req.user.id,
    req.user.role,
    req.body,
    file,
  );

  sendResponse(res, 201, { message }, "Message sent");
});

// ─── Mark as read ─────────────────────────────────────────────────────────────
const markAsRead = catchAsync(async (req, res) => {
  const { id } = req.params;

  await chatService.markAsRead(id, req.user.id, req.user.role);

  sendResponse(res, 200, null, "Messages marked as read");
});

module.exports = {
  startConversation,
  getMyConversations,
  getMessages,
  sendMessage,
  markAsRead,
  authenticatePusher
};
