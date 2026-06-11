const express = require("express");
const router = express.Router();
const bookingsController = require("./bookings.controller");
const { protect, authorize } = require("../auth/auth.middleware");

// All routes require authentication
router.use(protect);

router.post("/", authorize("user"), bookingsController.create);
router.get("/", bookingsController.list);
router.get("/:id", bookingsController.getById);

router.post("/:id/pay", authorize("user"), bookingsController.pay);
router.post("/:id/deliver", authorize("worker", "company"), bookingsController.deliver);
router.post("/:id/approve", authorize("user"), bookingsController.approve);
router.post("/:id/dispute", bookingsController.dispute);
router.post("/:id/resolve-dispute", authorize("admin"), bookingsController.resolve);

module.exports = router;
