const express = require("express");
const router = express.Router();
const proposalsController = require("./proposals.controller");
const { protect, authorize } = require("../auth/auth.middleware");

router.get("/my", protect, authorize("worker"), proposalsController.listMy);
router.get(
  "/my/history",
  protect,
  authorize("worker"),
  proposalsController.listMyHistory,
);

router.put("/:id", protect, authorize("worker"), proposalsController.update);
router.delete("/:id", protect, authorize("worker"), proposalsController.remove);
router.patch(
  "/:id/status",
  protect,
  authorize("user"),
  proposalsController.patchStatus,
);

module.exports = router;
