const express = require("express");
const router = express.Router();
const projectsController = require("./projects.controller");
const proposalsController = require("../proposals/proposals.controller");
const { protect, authorize, optionalProtect } = require("../auth/auth.middleware");

// ─── Public ───────────────────────────────────────────────────────────────────
router.get("/", projectsController.list);

// ─── Worker (assigned projects) ───────────────────────────────────────────────
router.get(
  "/assigned/me",
  protect,
  authorize("worker"),
  projectsController.listAssigned,
);

// ─── Client (user) ────────────────────────────────────────────────────────────
router.post("/", protect, authorize("user"), projectsController.create);

// ─── Proposals nested under project (before /:id) ─────────────────────────────
router.get(
  "/:id/proposals",
  protect,
  authorize("user"),
  proposalsController.listByProject,
);
router.post(
  "/:id/proposals",
  protect,
  authorize("worker"),
  proposalsController.create,
);

router.patch(
  "/:id/status",
  protect,
  authorize("user", "worker"),
  projectsController.patchStatus,
);
router.get("/:id", optionalProtect, projectsController.getById);
router.put("/:id", protect, authorize("user"), projectsController.update);
router.delete("/:id", protect, authorize("user"), projectsController.remove);

module.exports = router;
