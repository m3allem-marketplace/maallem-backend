const Joi = require("joi");
const catchAsync = require("../../utils/catchAsync");
const { sendResponse } = require("../../utils/apiResponse");
const AppError = require("../../utils/AppError");
const aiRecommendationsService = require("./ai_recommendations.service");

const recommendSchema = Joi.object({
  story: Joi.string().trim().min(5).max(3000).required().messages({
    "string.min": "story must be at least 5 characters",
    "string.max": "story must not exceed 3000 characters",
    "any.required": "story is required",
  }),
});

const validate = (schema, data) => {
  const { error, value } = schema.validate(data, { abortEarly: false });
  if (error) {
    throw new AppError(error.details.map((d) => d.message).join(", "), 422);
  }
  return value;
};

const getRecommendations = catchAsync(async (req, res) => {
  const { story } = validate(recommendSchema, req.body);

  const result = await aiRecommendationsService.analyzeStoryAndRecommend({
    story,
  });

  sendResponse(res, 200, result, "Recommendations generated successfully");
});

module.exports = {
  getRecommendations,
};
