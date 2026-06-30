const Release = require("./releases.model");
const Booking = require("./bookings.model");
const User = require("../auth/auth.model");
const AppError = require("../../utils/AppError");
const { notifyBookingStatusChanged } = require("../notifications/notifications.service");

// ─── Create Releases ────────────────────────────────────────────────────────
const createReleases = async (bookingId, userId, releasesData) => {
  const booking = await Booking.findById(bookingId);
  if (!booking) {
    throw new AppError("Booking not found", 404);
  }

  // Only provider or client can create releases
  if (booking.client.toString() !== userId && booking.provider.toString() !== userId) {
    throw new AppError("Not authorized to manage releases for this booking", 403);
  }

  // Find existing releases to calculate remaining allowed amount
  const existingReleases = await Release.find({ booking: bookingId });
  const existingSum = existingReleases.reduce((sum, r) => sum + r.amount, 0);

  // Validate total amount
  const newReleasesAmount = releasesData.reduce((sum, r) => sum + r.amount, 0);
  if (existingSum + newReleasesAmount > booking.price) {
    throw new AppError(`Total releases amount cannot exceed the booking price. Remaining allowed: ${booking.price - existingSum}`, 400);
  }

  const releasesToCreate = releasesData.map((r) => ({
    ...r,
    booking: bookingId,
    status: "pending",
  }));

  const createdReleases = await Release.insertMany(releasesToCreate);
  return createdReleases;
};

// ─── Deliver Release ────────────────────────────────────────────────────────
const deliverRelease = async (bookingId, releaseId, providerId) => {
  const booking = await Booking.findOne({ _id: bookingId, provider: providerId });
  if (!booking) {
    throw new AppError("Booking not found or you are not the provider", 404);
  }

  if (booking.status !== "paid" && booking.status !== "in_progress") {
    throw new AppError("Releases can only be delivered when booking is paid or in progress", 400);
  }

  const release = await Release.findOne({ _id: releaseId, booking: bookingId });
  if (!release) {
    throw new AppError("Release not found", 404);
  }

  if (release.status !== "pending") {
    throw new AppError("Only pending releases can be delivered", 400);
  }

  release.status = "delivered";
  await release.save();

  // Notify client
  try {
    // Reusing the same notification function but might want a specific release notification later
    await notifyBookingStatusChanged(booking.client, "delivered", booking._id);
  } catch (err) {
    console.error("Failed to send release delivered notification:", err.message);
  }

  return release;
};

// ─── Approve Release ────────────────────────────────────────────────────────
const approveRelease = async (bookingId, releaseId, clientId) => {
  const booking = await Booking.findOne({ _id: bookingId, client: clientId });
  if (!booking) {
    throw new AppError("Booking not found or you are not the client", 404);
  }

  const release = await Release.findOne({ _id: releaseId, booking: bookingId });
  if (!release) {
    throw new AppError("Release not found", 404);
  }

  if (release.status !== "delivered") {
    throw new AppError("Only delivered releases can be approved", 400);
  }

  if (booking.escrowAmount < release.amount) {
    throw new AppError("Insufficient escrow amount for this release", 400);
  }

  // Calculate commission proportionally
  const commissionPercent = 0.10; // 10% Platform Commission
  const releaseCommission = release.amount * commissionPercent;
  const netEarnings = release.amount - releaseCommission;

  // Update Release
  release.status = "approved";
  await release.save();

  // Update Booking
  booking.escrowAmount -= release.amount;
  booking.commissionAmount += releaseCommission;
  
  // Check if all releases are approved
  const pendingReleases = await Release.countDocuments({ 
    booking: bookingId, 
    status: { $ne: "approved" } 
  });

  if (booking.escrowAmount <= 0 && pendingReleases === 0) {
    booking.status = "completed";
  } else {
    booking.status = "in_progress";
  }
  
  await booking.save();

  // Add earnings to provider balance
  await User.findByIdAndUpdate(booking.provider, {
    $inc: { balance: netEarnings },
  });

  // Notify provider
  try {
    await notifyBookingStatusChanged(booking.provider, booking.status === "completed" ? "completed" : "in_progress", booking._id);
  } catch (err) {
    console.error("Failed to send release approved notification:", err.message);
  }

  return { release, booking };
};

// ─── Get Releases ───────────────────────────────────────────────────────────
const getReleases = async (bookingId, userId, userRole) => {
  const booking = await Booking.findById(bookingId);
  if (!booking) {
    throw new AppError("Booking not found", 404);
  }

  // Access check
  if (
    booking.client.toString() !== userId &&
    booking.provider.toString() !== userId &&
    userRole !== "admin"
  ) {
    throw new AppError("Not authorized to view releases for this booking", 403);
  }

  const releases = await Release.find({ booking: bookingId }).sort({ createdAt: 1 });
  return releases;
};

module.exports = {
  createReleases,
  deliverRelease,
  approveRelease,
  getReleases,
};
