const Joi = require("joi");

const locationSchema = Joi.object({
  address: Joi.string().max(300).allow(""),
  city: Joi.string().max(100).allow(""),
  coordinates: Joi.object({
    type: Joi.string().valid("Point").default("Point"),
    coordinates: Joi.array().items(Joi.number()).length(2).optional(),
  }).optional(),
});

const parseJsonField = (value) => {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

const parseArrayField = (value) => {
  if (value === undefined || value === null || value === "") return undefined;
  if (Array.isArray(value)) return value;
  const parsed = parseJsonField(value);
  if (Array.isArray(parsed)) return parsed;
  if (typeof value === "string") {
    return value
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [String(value)];
};

const workerProfileSchema = Joi.object({
  bio: Joi.string().max(2000).allow(""),
  experience: Joi.string().max(1000).allow(""),
  specializations: Joi.alternatives()
    .try(Joi.array().items(Joi.string().max(100)), Joi.string())
    .optional(),
  location: Joi.alternatives().try(locationSchema, Joi.string()).optional(),
  phone: Joi.string()
    .pattern(/^[0-9+\-\s]{8,20}$/)
    .allow("")
    .messages({
      "string.pattern.base": "Please enter a valid phone number",
    }),
  removePortfolioImages: Joi.alternatives()
    .try(Joi.array().items(Joi.string().uri()), Joi.string())
    .optional(),
}).min(1);

const companyProfileSchema = Joi.object({
  companyName: Joi.string().min(2).max(150),
  bio: Joi.string().max(2000).allow(""),
  employeeCount: Joi.number().integer().min(0),
  location: Joi.alternatives().try(locationSchema, Joi.string()).optional(),
  contactPhones: Joi.alternatives()
    .try(
      Joi.array().items(
        Joi.string()
          .pattern(/^[0-9+\-\s]{8,20}$/)
          .messages({ "string.pattern.base": "Invalid phone number" }),
      ),
      Joi.string(),
    )
    .optional(),
  removeProjectImages: Joi.alternatives()
    .try(Joi.array().items(Joi.string().uri()), Joi.string())
    .optional(),
}).min(1);

const normalizeLocation = (location) => {
  if (!location) return undefined;
  if (typeof location === "string") {
    return { address: location, city: "" };
  }
  if (location.lng !== undefined && location.lat !== undefined) {
    return {
      address: location.address || "",
      city: location.city || "",
      coordinates: {
        type: "Point",
        coordinates: [parseFloat(location.lng), parseFloat(location.lat)],
      },
    };
  }
  return location;
};

module.exports = {
  workerProfileSchema,
  companyProfileSchema,
  parseArrayField,
  normalizeLocation,
};