const express = require("express");
const router = express.Router();
const notificationsController = require("./notifications.controller");
const { protect } = require("../auth/auth.middleware");

// all routes require authentication
router.use(protect);

router.get("/", notificationsController.getMyNotifications);
router.get("/unread-count", notificationsController.getUnreadCount);
router.patch("/read-all", notificationsController.markAllAsRead);
router.patch("/:id/read", notificationsController.markAsRead);
router.delete("/:id", notificationsController.deleteNotification);

module.exports = router;