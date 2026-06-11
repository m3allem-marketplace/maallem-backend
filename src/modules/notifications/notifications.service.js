const Notification = require("./notifications.model");
const pusher = require("../../config/pusher");
const AppError = require("../../utils/AppError");
const { NOTIFICATION_EVENTS, NOTIFICATION_CHANNELS } = require("../../constants/events");

// ─── Core create ──────────────────────────────────────────────────────────────
const createNotification = async ({ recipient, type, title, message, data = {} }) => {
  const notification = await Notification.create({
    recipient,
    type,
    title,
    message,
    data,
  });

  pusher
    .trigger(
      NOTIFICATION_CHANNELS.user(recipient.toString()),
      NOTIFICATION_EVENTS.NEW_NOTIFICATION,
      { notification },
    )
    .catch((err) => console.error("Pusher notification error:", err.message));

  return notification;
};

// ─── Get my notifications ─────────────────────────────────────────────────────
const getMyNotifications = async (userId, page = 1, limit = 20) => {
  const skip = (page - 1) * limit;

  // FIX 3: parallel DB calls instead of sequential
  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find({ recipient: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Notification.countDocuments({ recipient: userId }),
    Notification.countDocuments({ recipient: userId, isRead: false }),
  ]);

  return {
    notifications,
    unreadCount,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

// ─── Get unread count ─────────────────────────────────────────────────────────
const getUnreadCount = async (userId) => {
  const count = await Notification.countDocuments({
    recipient: userId,
    isRead: false,
  });
  return { unreadCount: count };
};

// ─── Mark one as read ─────────────────────────────────────────────────────────
const markAsRead = async (notificationId, userId) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, recipient: userId },
    { isRead: true },
    { new: true },
  );

  if (!notification) throw new AppError("Notification not found", 404);
  return notification;
};

// ─── Mark all as read ─────────────────────────────────────────────────────────
const markAllAsRead = async (userId) => {
  await Notification.updateMany(
    { recipient: userId, isRead: false },
    { isRead: true },
  );
  return { success: true };
};

// ─── Delete one ───────────────────────────────────────────────────────────────
const deleteNotification = async (notificationId, userId) => {
  const notification = await Notification.findOneAndDelete({
    _id: notificationId,
    recipient: userId,
  });

  if (!notification) throw new AppError("Notification not found", 404);
  return { success: true };
};

// ─── Factory helpers — self-contained error handling (FIX 5) ─────────────────

const notifyNewProposal = async (clientId, workerName, projectTitle, projectId, proposalId) => {
  try {
    return await createNotification({
      recipient: clientId,
      type: "new_proposal",
      title: "New Proposal Received",
      message: `${workerName} submitted a proposal on your project "${projectTitle}"`,
      data: { projectId, proposalId },
    });
  } catch (err) { console.error("notifyNewProposal error:", err.message); }
};

const notifyProposalAccepted = async (workerId, projectTitle, projectId, proposalId) => {
  try {
    return await createNotification({
      recipient: workerId,
      type: "proposal_accepted",
      title: "Proposal Accepted 🎉",
      message: `Your proposal on "${projectTitle}" has been accepted`,
      data: { projectId, proposalId },
    });
  } catch (err) { console.error("notifyProposalAccepted error:", err.message); }
};

const notifyProposalRejected = async (workerId, projectTitle, projectId, proposalId) => {
  try {
    return await createNotification({
      recipient: workerId,
      type: "proposal_rejected",
      title: "Proposal Rejected",
      message: `Your proposal on "${projectTitle}" has been rejected`,
      data: { projectId, proposalId },
    });
  } catch (err) { console.error("notifyProposalRejected error:", err.message); }
};

const notifyNewMessage = async (recipientId, senderName, conversationId) => {
  try {
    return await createNotification({
      recipient: recipientId,
      type: "new_message",
      title: "New Message",
      message: `${senderName} sent you a message`,
      data: { conversationId },
    });
  } catch (err) { console.error("notifyNewMessage error:", err.message); }
};

const notifyPaymentReceived = async (workerId, amount, paymentId) => {
  try {
    return await createNotification({
      recipient: workerId,
      type: "payment_received",
      title: "Payment Received 💰",
      message: `You received a payment of ${amount} EGP`,
      data: { paymentId },
    });
  } catch (err) { console.error("notifyPaymentReceived error:", err.message); }
};

const notifyNewReview = async (workerId, clientName, reviewId) => {
  try {
    return await createNotification({
      recipient: workerId,
      type: "new_review",
      title: "New Review",
      message: `${clientName} left you a review`,
      data: { reviewId },
    });
  } catch (err) { console.error("notifyNewReview error:", err.message); }
};

const notifyBookingStatusChanged = async (clientId, status, bookingId) => {
  try {
    return await createNotification({
      recipient: clientId,
      type: "booking_status_changed",
      title: "Booking Update",
      message: `Your booking status has been updated to "${status}"`,
      data: { bookingId },
    });
  } catch (err) { console.error("notifyBookingStatusChanged error:", err.message); }
};

module.exports = {
  createNotification,
  getMyNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  notifyNewProposal,
  notifyProposalAccepted,
  notifyProposalRejected,
  notifyNewMessage,
  notifyPaymentReceived,
  notifyNewReview,
  notifyBookingStatusChanged,
};