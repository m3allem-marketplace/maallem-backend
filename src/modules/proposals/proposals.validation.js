const Joi = require("joi");
const { PROPOSAL_STATUS_VALUES } = require("../../constants/status");

const createProposalSchema = Joi.object({
  message: Joi.string().max(3000).allow(""),
  price: Joi.number().min(0).required(),
  estimatedDuration: Joi.string().max(200).allow(""),
});

const updateProposalSchema = Joi.object({
  message: Joi.string().max(3000).allow(""),
  price: Joi.number().min(0),
  estimatedDuration: Joi.string().max(200).allow(""),
}).min(1);

const patchProposalStatusSchema = Joi.object({
  status: Joi.string().valid("accepted", "rejected").required(),
});

module.exports = {
  createProposalSchema,
  updateProposalSchema,
  patchProposalStatusSchema,
};
