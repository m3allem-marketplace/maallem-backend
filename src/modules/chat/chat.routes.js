const express = require("express");
const router = express.Router();
const chatController = require("./chat.controller");
const { protect, authorize } = require("../auth/auth.middleware");
const { upload } = require("../../middlewares/upload");

// all chat routes require authentication
router.use(protect);
router.post("/pusher/auth", chatController.authenticatePusher);

// ─── Conversations ────────────────────────────────────────────────────────────

// only clients can start a conversation
router.post(
  "/conversations",
  authorize("user"),
  chatController.startConversation,
);

// both clients and workers can list their conversations
router.get(
  "/conversations",
  authorize("user", "worker"),
  chatController.getMyConversations,
);

// ─── Messages ─────────────────────────────────────────────────────────────────

router.get(
  "/conversations/:id/messages",
  authorize("user", "worker"),
  chatController.getMessages,
);

router.post(
  "/conversations/:id/messages",
  authorize("user", "worker"),
  upload.single("file"),          // handles both images and files
  chatController.sendMessage,
);

router.patch(
  "/conversations/:id/read",
  authorize("user", "worker"),
  chatController.markAsRead,
);

module.exports = router;