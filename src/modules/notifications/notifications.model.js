const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: [
        "new_proposal",
        "proposal_accepted",
        "proposal_rejected",
        "new_message",
        "payment_received",
        "new_review",
        "booking_status_changed",
      ],
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    // flexible metadata — store related IDs for deep linking
    data: {
      projectId: { type: mongoose.Schema.Types.ObjectId, default: null },
      proposalId: { type: mongoose.Schema.Types.ObjectId, default: null },
      conversationId: { type: mongoose.Schema.Types.ObjectId, default: null },
      paymentId: { type: mongoose.Schema.Types.ObjectId, default: null },
      reviewId: { type: mongoose.Schema.Types.ObjectId, default: null },
      bookingId: { type: mongoose.Schema.Types.ObjectId, default: null },
    },
  },
  { timestamps: true },
);

// index for fast querying by recipient + read status
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

const Notification = mongoose.model("Notification", notificationSchema);

module.exports = Notification;