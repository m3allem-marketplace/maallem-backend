const Booking = require("./bookings.model");
const User = require("../auth/auth.model");
const Release = require("./releases.model");
const AppError = require("../../utils/AppError");
const { notifyBookingStatusChanged } = require("../notifications/notifications.service");

// ─── Create Booking ──────────────────────────────────────────────────────────
const createBooking = async (clientId, data) => {
  const { providerId, price, projectId, proposalId, serviceId } = data;

  // Verify provider exists
  const provider = await User.findById(providerId);
  if (!provider) {
    throw new AppError("Provider not found", 404);
  }
  if (provider.role !== "worker" && provider.role !== "company") {
    throw new AppError("Recipient user must be a worker or company", 400);
  }

  const booking = await Booking.create({
    client: clientId,
    provider: providerId,
    project: projectId || null,
    proposal: proposalId || null,
    service: serviceId || null,
    price,
    status: "pending_payment",
  });

  return booking;
};

// ─── Pay Booking (Hold money in escrow) ──────────────────────────────────────
const payBooking = async (bookingId, clientId) => {
  const booking = await Booking.findOne({ _id: bookingId, client: clientId });
  if (!booking) {
    throw new AppError("Booking not found", 404);
  }

  if (booking.status !== "pending_payment") {
    throw new AppError(`Cannot pay for a booking with status ${booking.status}`, 400);
  }

  // Update status to paid and hold escrow
  booking.status = "paid";
  booking.escrowAmount = booking.price;
  await booking.save();

  // Notify provider that payment is received & held in escrow
  try {
    await notifyBookingStatusChanged(booking.provider, "paid", booking._id);
  } catch (err) {
    console.error("Failed to send paid notification:", err.message);
  }

  return booking;
};

// ─── Deliver Work (By Provider) ──────────────────────────────────────────────
const deliverBooking = async (bookingId, providerId) => {
  const booking = await Booking.findOne({ _id: bookingId, provider: providerId });
  if (!booking) {
    throw new AppError("Booking not found", 404);
  }

  // Check if booking uses releases
  const releaseCount = await Release.countDocuments({ booking: bookingId });
  if (releaseCount > 0) {
    throw new AppError("This booking uses releases. Please deliver releases individually.", 400);
  }

  if (booking.status !== "paid") {
    throw new AppError("Work can only be delivered after the booking is paid", 400);
  }

  booking.status = "delivered";
  await booking.save();

  // Notify client
  try {
    await notifyBookingStatusChanged(booking.client, "delivered", booking._id);
  } catch (err) {
    console.error("Failed to send delivered notification:", err.message);
  }

  return booking;
};

// ─── Approve Delivery & Release Funds (By Client) ────────────────────────────
const approveBooking = async (bookingId, clientId) => {
  const booking = await Booking.findOne({ _id: bookingId, client: clientId });
  if (!booking) {
    throw new AppError("Booking not found", 404);
  }

  // Check if booking uses releases
  const releaseCount = await Release.countDocuments({ booking: bookingId });
  if (releaseCount > 0) {
    throw new AppError("This booking uses releases. Please approve releases individually.", 400);
  }

  if (booking.status !== "delivered") {
    throw new AppError("Booking is not in delivered status", 400);
  }

  const commissionPercent = 0.10; // 10% Platform Commission
  const commission = booking.price * commissionPercent;
  const netEarnings = booking.price - commission;

  booking.commissionAmount = commission;
  booking.escrowAmount = 0;
  booking.status = "completed";
  await booking.save();

  // Add earnings to provider balance
  await User.findByIdAndUpdate(booking.provider, {
    $inc: { balance: netEarnings },
  });

  // Notify provider
  try {
    await notifyBookingStatusChanged(booking.provider, "completed", booking._id);
  } catch (err) {
    console.error("Failed to send completed notification:", err.message);
  }

  return booking;
};

// ─── Dispute Booking (By Client or Provider) ─────────────────────────────────
const disputeBooking = async (bookingId, userId) => {
  const booking = await Booking.findById(bookingId);
  if (!booking) {
    throw new AppError("Booking not found", 404);
  }

  // Only client or provider can open a dispute
  if (booking.client.toString() !== userId && booking.provider.toString() !== userId) {
    throw new AppError("Not authorized to dispute this booking", 403);
  }

  // Can only dispute if paid or delivered
  if (booking.status !== "paid" && booking.status !== "delivered") {
    throw new AppError("Can only open a dispute on paid or delivered bookings", 400);
  }

  booking.status = "disputed";
  await booking.save();

  // Notify both parties
  try {
    await notifyBookingStatusChanged(booking.client, "disputed", booking._id);
    await notifyBookingStatusChanged(booking.provider, "disputed", booking._id);
  } catch (err) {
    console.error("Failed to send dispute notifications:", err.message);
  }

  return booking;
};

// ─── Resolve Dispute (By Admin) ──────────────────────────────────────────────
const resolveDispute = async (bookingId, adminId, resolution) => {
  const booking = await Booking.findById(bookingId);
  if (!booking) {
    throw new AppError("Booking not found", 404);
  }

  if (booking.status !== "disputed") {
    throw new AppError("Booking is not in disputed status", 400);
  }

  if (resolution === "refund") {
    // Return all escrowed funds to client
    booking.escrowAmount = 0;
    booking.status = "refunded";
    await booking.save();

    await User.findByIdAndUpdate(booking.client, {
      $inc: { balance: booking.price },
    });

    // Notify both
    try {
      await notifyBookingStatusChanged(booking.client, "refunded", booking._id);
      await notifyBookingStatusChanged(booking.provider, "refunded", booking._id);
    } catch (err) {
      console.error("Failed to send refund notifications:", err.message);
    }
  } else if (resolution === "release") {
    // Release funds to provider after platform commission
    const commissionPercent = 0.10;
    const commission = booking.price * commissionPercent;
    const netEarnings = booking.price - commission;

    booking.commissionAmount = commission;
    booking.escrowAmount = 0;
    booking.status = "completed";
    await booking.save();

    await User.findByIdAndUpdate(booking.provider, {
      $inc: { balance: netEarnings },
    });

    // Notify both
    try {
      await notifyBookingStatusChanged(booking.client, "completed", booking._id);
      await notifyBookingStatusChanged(booking.provider, "completed", booking._id);
    } catch (err) {
      console.error("Failed to send release notifications:", err.message);
    }
  } else {
    throw new AppError("Invalid dispute resolution", 400);
  }

  return booking;
};

// ─── Get Booking By ID ───────────────────────────────────────────────────────
const getBookingById = async (bookingId, userId, userRole) => {
  const booking = await Booking.findById(bookingId)
    .populate("client", "name email phone")
    .populate("provider", "name email phone")
    .populate("project")
    .populate("proposal");

  if (!booking) {
    throw new AppError("Booking not found", 404);
  }

  // Access check: must be client, provider, or admin
  if (
    booking.client._id.toString() !== userId &&
    booking.provider._id.toString() !== userId &&
    userRole !== "admin"
  ) {
    throw new AppError("Not authorized to view this booking", 403);
  }

  return booking;
};

// ─── List Bookings ───────────────────────────────────────────────────────────
const getBookings = async (userId, userRole, query) => {
  const filter = {};

  // If not admin, restrict to user's own bookings
  if (userRole !== "admin") {
    if (userRole === "user") {
      filter.client = userId;
    } else {
      filter.provider = userId;
    }
  } else {
    // Admin can filter by client/provider/status if provided
    if (query.clientId) filter.client = query.clientId;
    if (query.providerId) filter.provider = query.providerId;
  }

  if (query.status) {
    filter.status = query.status;
  }

  const page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || 20;
  const skip = (page - 1) * limit;

  const bookings = await Booking.find(filter)
    .populate("client", "name email phone")
    .populate("provider", "name email phone")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await Booking.countDocuments(filter);

  return {
    bookings,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

module.exports = {
  createBooking,
  payBooking,
  deliverBooking,
  approveBooking,
  disputeBooking,
  resolveDispute,
  getBookingById,
  getBookings,
};
