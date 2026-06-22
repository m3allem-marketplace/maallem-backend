const Joi = require("joi");

const createBookingSchema = Joi.object({
  providerId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      "string.pattern.base": "Invalid providerId format",
      "any.required": "providerId is required",
    }),
  price: Joi.number().min(0).required().messages({
    "number.min": "Price must be a positive number",
    "any.required": "Price is required",
  }),
  projectId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .allow(null, "")
    .messages({
      "string.pattern.base": "Invalid projectId format",
    }),
  proposalId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .allow(null, "")
    .messages({
      "string.pattern.base": "Invalid proposalId format",
    }),
  serviceId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .allow(null, "")
    .messages({
      "string.pattern.base": "Invalid serviceId format",
    }),
});

const resolveDisputeSchema = Joi.object({
  resolution: Joi.string().valid("refund", "release").required().messages({
    "any.only": "Resolution must be either 'refund' or 'release'",
    "any.required": "Resolution is required",
  }),
});

const createReleasesSchema = Joi.object({
  releases: Joi.array().items(
    Joi.object({
      name: Joi.string().required().trim(),
      amount: Joi.number().min(0).required(),
      dueDate: Joi.date().iso().optional(),
    })
  ).min(1).required(),
});

module.exports = {
  createBookingSchema,
  resolveDisputeSchema,
  createReleasesSchema,
};
