const Joi = require("joi");
const catchAsync = require("../../utils/catchAsync");
const { sendResponse } = require("../../utils/apiResponse");
const AppError = require("../../utils/AppError");
const aiService = require("./ai.service");

const analyzeSchema = Joi.object({
  serviceType: Joi.string()
    .valid(
      "demolition_alteration",
      "masonry_building",
      "painting",
      "plumbing",
      "electrical",
      "carpentry"
    )
    .required()
    .messages({
      "any.only": "serviceType must be one of the 6 authorized construction trades: demolition_alteration, masonry_building, painting, plumbing, electrical, carpentry",
      "any.required": "serviceType is required",
    }),
  description: Joi.string().trim().min(5).max(2000).required().messages({
    "string.min": "description must be at least 5 characters",
    "string.max": "description must not exceed 2000 characters",
    "any.required": "description is required",
  }),
});

const validate = (schema, data) => {
  const { error, value } = schema.validate(data, { abortEarly: false });
  if (error) {
    throw new AppError(error.details.map((d) => d.message).join(", "), 422);
  }
  return value;
};

const analyze = catchAsync(async (req, res) => {
  const { serviceType, description } = validate(analyzeSchema, req.body);
  const userId = req.user?.id || null;

  const result = await aiService.analyzeAndEstimate({
    serviceType,
    description,
    userId,
  });

  sendResponse(res, 200, result, "Engineering Estimation and Localization completed successfully");
});

const getHistory = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const history = await aiService.getHistory(userId);
  sendResponse(res, 200, history, "AI interaction history retrieved successfully");
});

module.exports = {
  analyze,
  getHistory,
};