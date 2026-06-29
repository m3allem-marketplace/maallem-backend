const express = require("express");
const rateLimit = require("express-rate-limit");
const aiRecommendationsController = require("./ai_recommendations.controller");
const { protect } = require("../auth/auth.middleware");

const router = express.Router();

const aiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 5, // Limit each IP to 5 requests per `window` (here, per minute)
  message: {
    success: false,
    message: "عذراً، لقد تجاوزت الحد المسموح به للطلبات. يرجى الانتظار قليلاً ثم المحاولة مرة أخرى.",
  },
});

// Route to get AI recommendations based on user story.
// Public route so guest users can also search and view recommended workers.
router.post("/", aiLimiter, aiRecommendationsController.getRecommendations);

module.exports = router;
