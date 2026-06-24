const express = require("express");
const aiController = require("./ai.controller");
const aiRecommendationsRouter = require("../ai_recommendations/ai_recommendations.routes");
const { protect } = require("../auth/auth.middleware");

const router = express.Router();

router.post("/analyze", aiController.analyze);
router.get("/history", protect, aiController.getHistory);

// Mount the recommendations sub-router under /recommendations
router.use("/recommendations", aiRecommendationsRouter);

module.exports = router;