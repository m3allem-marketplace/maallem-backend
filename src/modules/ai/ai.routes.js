const express = require("express");
const aiController = require("./ai.controller");
const { optionalProtect, protect } = require("../auth/auth.middleware");

const router = express.Router();

router.post("/analyze", optionalProtect, aiController.analyze);
router.get("/history", protect, aiController.getHistory);

module.exports = router;
