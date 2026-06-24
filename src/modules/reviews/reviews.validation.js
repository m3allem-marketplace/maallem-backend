const Joi = require("joi");

exports.createReviewSchema = Joi.object({
  rating: Joi.number().min(1).max(5).required().messages({
    "number.min": "التقييم يجب أن يكون بين 1 و 5",
    "number.max": "التقييم يجب أن يكون بين 1 و 5",
    "any.required": "التقييم مطلوب",
  }),
  comment: Joi.string().trim().max(1000).allow("").optional().messages({
    "string.max": "التعليق يجب ألا يتجاوز 1000 حرف",
  }),
  booking: Joi.string().hex().length(24).optional().messages({
    "string.hex": "رقم الحجز غير صالح",
    "string.length": "رقم الحجز غير صالح",
  }),
  project: Joi.string().hex().length(24).optional().messages({
    "string.hex": "رقم المشروع غير صالح",
    "string.length": "رقم المشروع غير صالح",
  }),
});
