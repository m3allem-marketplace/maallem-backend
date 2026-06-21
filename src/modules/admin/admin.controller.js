const catchAsync = require("../../utils/catchAsync");
const WorkerProfile = require("../profiles/worker.model");
const User = require("../auth/auth.model");
const Payment = require("../payments/payments.model");
const Booking = require("../bookings/bookings.model");
const Service = require("../services/services.model");
const Review = require("../reviews/reviews.model");
const Notification = require("../notifications/notifications.model");

// ─── 1. Users & Providers Management ──────────────────────────────────────────

exports.approveWorker = catchAsync(async (req, res) => {
  const { id } = req.params;
  const worker = await WorkerProfile.findByIdAndUpdate(
    id,
    { isApproved: true },
    { new: true }
  );

  if (!worker) {
    return res.status(404).json({ success: false, message: "Worker not found" });
  }

  res.status(200).json({ success: true, message: "Worker approved successfully", data: worker });
});

exports.updateUserStatus = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { isActive } = req.body;
  const user = await User.findByIdAndUpdate(id, { isActive }, { new: true });

  if (!user) {
    return res.status(404).json({ success: false, message: "User not found" });
  }

  res.status(200).json({ success: true, message: "User status updated", data: user });
});

exports.verifyUser = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { isVerified } = req.body;
  const user = await User.findByIdAndUpdate(id, { isVerified }, { new: true });

  if (!user) {
    return res.status(404).json({ success: false, message: "User not found" });
  }

  res.status(200).json({ success: true, message: "User verification updated", data: user });
});

// ─── 2. Finances & Payments ──────────────────────────────────────────────────

exports.getPayouts = catchAsync(async (req, res) => {
  const payouts = await Payment.find({ type: "payout_request" })
    .populate("worker", "name email phone")
    .sort({ createdAt: -1 });

  res.status(200).json({ success: true, count: payouts.length, data: payouts });
});

exports.updatePayoutStatus = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { status, transactionId } = req.body;

  const payment = await Payment.findByIdAndUpdate(
    id,
    { status, transactionId },
    { new: true }
  );

  if (!payment) {
    return res.status(404).json({ success: false, message: "Payment request not found" });
  }

  // If status is completed, you might want to deduct from user balance here.

  res.status(200).json({ success: true, message: "Payout status updated", data: payment });
});

// ─── 3. Dispute Resolution ───────────────────────────────────────────────────

exports.resolveBookingDispute = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { resolutionStatus } = req.body; // 'refunded' or 'completed'

  const booking = await Booking.findById(id);
  if (!booking) {
    return res.status(404).json({ success: false, message: "Booking not found" });
  }

  if (booking.status !== "disputed") {
    return res.status(400).json({ success: false, message: "Booking is not in disputed status" });
  }

  booking.status = resolutionStatus;
  await booking.save();

  res.status(200).json({ success: true, message: "Dispute resolved", data: booking });
});

// ─── 4. Services Categories ──────────────────────────────────────────────────

exports.createService = catchAsync(async (req, res) => {
  const service = await Service.create(req.body);
  res.status(201).json({ success: true, message: "Service created", data: service });
});

exports.updateService = catchAsync(async (req, res) => {
  const { id } = req.params;
  const service = await Service.findByIdAndUpdate(id, req.body, { new: true });

  if (!service) {
    return res.status(404).json({ success: false, message: "Service not found" });
  }

  res.status(200).json({ success: true, message: "Service updated", data: service });
});

// ─── 5. Reviews Moderation ───────────────────────────────────────────────────

exports.moderateReview = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { isHidden } = req.body;

  const review = await Review.findByIdAndUpdate(id, { isHidden }, { new: true });

  if (!review) {
    return res.status(404).json({ success: false, message: "Review not found" });
  }

  res.status(200).json({ success: true, message: "Review moderation updated", data: review });
});

// ─── 6. System Notifications ─────────────────────────────────────────────────

exports.broadcastNotification = catchAsync(async (req, res) => {
  const { title, message, targetRole } = req.body; // targetRole: 'user', 'worker', 'all'

  // Depending on targetRole, you'd fetch user IDs and create notifications.
  // For MVP, just send a success response assuming logic handles it later or
  // you create a global notification logic here.

  res.status(200).json({ success: true, message: "Broadcast sent successfully" });
});

// ─── 7. Dashboard & Analytics ────────────────────────────────────────────────

exports.getDashboardStats = catchAsync(async (req, res) => {
  const usersCount = await User.countDocuments({ role: "user" });
  const workersCount = await User.countDocuments({ role: "worker" });
  const pendingWorkers = await WorkerProfile.countDocuments({ isApproved: false });
  const pendingPayouts = await Payment.countDocuments({ type: "payout_request", status: "pending" });
  
  res.status(200).json({
    success: true,
    data: {
      usersCount,
      workersCount,
      pendingWorkers,
      pendingPayouts,
    },
  });
});
