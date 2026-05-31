const catchAsync = require("../../utils/catchAsync");
const proposalsService = require("./proposals.service");
const {
  createProposalSchema,
  updateProposalSchema,
  patchProposalStatusSchema,
} = require("./proposals.validation");

const validate = (schema, data) => {
  const { error, value } = schema.validate(data, { abortEarly: false });
  if (error) {
    const err = new Error(error.details.map((d) => d.message).join(", "));
    err.statusCode = 422;
    throw err;
  }
  return value;
};

const create = catchAsync(async (req, res) => {
  const data = validate(createProposalSchema, req.body);
  const proposal = await proposalsService.createProposal(
    req.user.id,
    req.params.id,
    data,
  );
  res.status(201).json({
    success: true,
    message: "Proposal submitted",
    data: { proposal },
  });
});

const listByProject = catchAsync(async (req, res) => {
  const proposals = await proposalsService.listProposalsByProject(
    req.user.id,
    req.params.id,
  );
  res.status(200).json({
    success: true,
    count: proposals.length,
    data: { proposals },
  });
});

const listMy = catchAsync(async (req, res) => {
  const proposals = await proposalsService.listMyProposals(req.user.id);
  res.status(200).json({
    success: true,
    count: proposals.length,
    data: { proposals },
  });
});

const update = catchAsync(async (req, res) => {
  const data = validate(updateProposalSchema, req.body);
  const proposal = await proposalsService.updateProposal(
    req.user.id,
    req.params.id,
    data,
  );
  res.status(200).json({
    success: true,
    message: "Proposal updated",
    data: { proposal },
  });
});

const remove = catchAsync(async (req, res) => {
  await proposalsService.deleteProposal(req.user.id, req.params.id);
  res.status(200).json({ success: true, message: "Proposal withdrawn" });
});

const patchStatus = catchAsync(async (req, res) => {
  const { status } = validate(patchProposalStatusSchema, req.body);
  const proposal = await proposalsService.updateProposalStatus(
    req.user.id,
    req.params.id,
    status,
  );
  res.status(200).json({
    success: true,
    message: `Proposal ${status}`,
    data: { proposal },
  });
});

module.exports = { create, listByProject, listMy, update, remove, patchStatus };
