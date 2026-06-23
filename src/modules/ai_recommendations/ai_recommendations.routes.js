const express = require("express");
const aiRecommendationsController = require("./ai_recommendations.controller");
const { protect } = require("../auth/auth.middleware");

const router = express.Router();

// Route to get AI recommendations based on user story.
// Public route so guest users can also search and view recommended workers.
router.post("/", aiRecommendationsController.getRecommendations);

module.exports = router;
