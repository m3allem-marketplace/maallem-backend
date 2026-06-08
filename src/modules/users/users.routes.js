const express = require("express");
const router = express.Router();
const usersController = require("./users.controller");
const { protect, authorize } = require("../auth/auth.middleware");

router.use(protect);

router.get(
  "/me/dashboard",
  authorize("user"),
  usersController.getDashboard,
);

module.exports = router;
