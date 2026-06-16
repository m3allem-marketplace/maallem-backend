const catchAsync = require("../../utils/catchAsync");
const proposalsService = require("./proposals.service");
const {
  createProposalSchema,
  updateProposalSchema,
  patchProposalStatusSchema,
} = require("./proposals.validation");
const { sendResponse } = require("../../utils/apiResponse");


const validate = (schema, data) => {
  const { error, value } = schema.validate(data, { abortEarly: false });
  if (error) {
    throw new AppError(error.details.map((d) => d.message).join(", "), 422);

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
  sendResponse(res, 201, { proposal }, "Proposal submitted");
});

const listByProject = catchAsync(async (req, res) => {
  const proposals = await proposalsService.listProposalsByProject(
    req.user.id,
    req.params.id,
  );
  sendResponse(res, 200, { proposals }, "Proposals fetched");
});

const listMy = catchAsync(async (req, res) => {
  const proposals = await proposalsService.listMyProposals(req.user.id);
  sendResponse(res, 200, { proposals }, "Proposals fetched");
});

const listMyHistory = catchAsync(async (req, res) => {
  const result = await proposalsService.getWorkerOfferHistory(
    req.user.id,
    req.query,
  );
  sendResponse(res, 200, result, "Offer history fetched");
});

const update = catchAsync(async (req, res) => {
  const data = validate(updateProposalSchema, req.body);
  const proposal = await proposalsService.updateProposal(
    req.user.id,
    req.params.id,
    data,
  );
  sendResponse(res, 200, { proposal }, "Proposal updated");
});

const remove = catchAsync(async (req, res) => {
  await proposalsService.deleteProposal(req.user.id, req.params.id);
  sendResponse(res, 200, null, "Proposal withdrawn");
});

const patchStatus = catchAsync(async (req, res) => {
  const { status } = validate(patchProposalStatusSchema, req.body);
  const proposal = await proposalsService.updateProposalStatus(
    req.user.id,
    req.params.id,
    status,
  );
  sendResponse(res, 200, { proposal }, `Proposal ${status}`);
});

module.exports = {
  create,
  listByProject,
  listMy,
  listMyHistory,
  update,
  remove,
  patchStatus,
};
