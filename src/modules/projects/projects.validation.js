const Joi = require("joi");
const { PROJECT_STATUS_VALUES } = require("../../constants/status");

const locationSchema = Joi.object({
  address: Joi.string().max(300).allow(""),
  city: Joi.string().max(100).allow(""),
});

const createProjectSchema = Joi.object({
  title: Joi.string().min(3).max(200).required(),
  description: Joi.string().max(5000).allow(""),
  category: Joi.string().max(100).allow(""),
  location: Joi.alternatives().try(locationSchema, Joi.string()).optional(),
  budget: Joi.number().min(0).optional(),
  status: Joi.string()
    .valid(...PROJECT_STATUS_VALUES)
    .optional(),
  workerId: Joi.string().hex().length(24).optional(),
});

const updateProjectSchema = Joi.object({
  title: Joi.string().min(3).max(200),
  description: Joi.string().max(5000).allow(""),
  category: Joi.string().max(100).allow(""),
  location: Joi.alternatives().try(locationSchema, Joi.string()).optional(),
  budget: Joi.number().min(0),
}).min(1);

const patchProjectStatusSchema = Joi.object({
  status: Joi.string()
    .valid(...PROJECT_STATUS_VALUES)
    .required(),
});

const normalizeLocation = (location) => {
  if (!location) return undefined;
  if (typeof location === "string") {
    return { address: location, city: "" };
  }
  return location;
};

module.exports = {
  createProjectSchema,
  updateProjectSchema,
  patchProjectStatusSchema,
  normalizeLocation,
};
