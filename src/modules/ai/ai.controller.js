const Joi = require("joi");
const catchAsync = require("../../utils/catchAsync");
const { sendResponse } = require("../../utils/apiResponse");
const AppError = require("../../utils/AppError");
const aiService = require("./ai.service");

const analyzeSchema = Joi.object({
  serviceType: Joi.string()
    .valid("painting", "ceramic", "plumbing")
    .required()
    .messages({
      "any.only": "serviceType must be one of: painting, ceramic, plumbing",
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

  sendResponse(res, 200, result, "Estimation completed successfully");
});

module.exports = {
  analyze,
};
