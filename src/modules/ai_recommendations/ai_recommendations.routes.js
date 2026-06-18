const express = require("express");
const aiRecommendationsController = require("./ai_recommendations.controller");
const { protect } = require("../auth/auth.middleware");

const router = express.Router();

// Route to get AI recommendations based on user story.
// Applying `protect` middleware assuming only logged-in users can ask for recommendations.
router.post("/", protect, aiRecommendationsController.getRecommendations);

module.exports = router;
