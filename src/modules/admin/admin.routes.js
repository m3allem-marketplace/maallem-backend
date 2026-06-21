const express = require("express");
const { protect, authorize } = require("../auth/auth.middleware");
const adminController = require("./admin.controller");

const router = express.Router();

// Apply auth middleware to all admin routes
router.use(protect);
router.use(authorize("admin"));

// ─── 1. Users & Providers Management ──────────────────────────────────────────
router.put("/workers/:id/approve", adminController.approveWorker);
router.put("/users/:id/status", adminController.updateUserStatus);
router.put("/users/:id/verify", adminController.verifyUser);

// ─── 2. Finances & Payments ──────────────────────────────────────────────────
router.get("/payments/payouts", adminController.getPayouts);
router.put("/payments/payouts/:id/status", adminController.updatePayoutStatus);

// ─── 3. Dispute Resolution ───────────────────────────────────────────────────
router.put("/bookings/:id/resolve", adminController.resolveBookingDispute);

// ─── 4. Services Categories ──────────────────────────────────────────────────
router.post("/services", adminController.createService);
router.put("/services/:id", adminController.updateService);

// ─── 5. Reviews Moderation ───────────────────────────────────────────────────
router.put("/reviews/:id/moderate", adminController.moderateReview);

// ─── 6. System Notifications ─────────────────────────────────────────────────
router.post("/notifications/broadcast", adminController.broadcastNotification);

// ─── 7. Dashboard & Analytics ────────────────────────────────────────────────
router.get("/dashboard/stats", adminController.getDashboardStats);

module.exports = router;
