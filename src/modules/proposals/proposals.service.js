const Proposal = require("./proposals.model");
const Project = require("../projects/projects.model");
const AppError = require("../../utils/AppError");
const {
  PROJECT_STATUS,
  PROPOSAL_STATUS,
} = require("../../constants/status");
const {
  findProjectOrFail,
  assertOwner,
} = require("../projects/projects.service");
const {
  notifyNewProposal,
  notifyProposalAccepted,
  notifyProposalRejected,
} = require("../notifications/notifications.service");

const USER_PUBLIC_FIELDS = "name email role phone";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const findProposalOrFail = async (id) => {
  const proposal = await Proposal.findById(id)
    .populate("worker", USER_PUBLIC_FIELDS)
    .populate({
      path: "project",
      populate: { path: "client", select: USER_PUBLIC_FIELDS },
    });

  if (!proposal) throw new AppError("Proposal not found", 404);
  return proposal;
};

const assertWorker = (proposal, userId) => {
  // safe whether worker is populated object or raw ObjectId
  const workerId = proposal.worker._id?.toString() ?? proposal.worker.toString();
  if (workerId !== userId) {
    throw new AppError("You can only manage your own proposals", 403);
  }
};

// ─── Create ───────────────────────────────────────────────────────────────────

const createProposal = async (workerId, projectId, data) => {
  const project = await findProjectOrFail(projectId);

  if (project.status !== PROJECT_STATUS.OPEN) {
    throw new AppError("Proposals can only be submitted on open projects", 400);
  }

  const existing = await Proposal.findOne({ project: projectId, worker: workerId });
  if (existing) {
    throw new AppError("You already submitted a proposal for this project", 409);
  }

  let proposal;
  try {
    proposal = await Proposal.create({
      project: projectId,
      worker: workerId,
      message: data.message || "",
      price: data.price,
      estimatedDuration: data.estimatedDuration || "",
    });
  } catch (err) {
    // double safety for race condition on unique index
    if (err.code === 11000) {
      throw new AppError("You already submitted a proposal for this project", 409);
    }
    throw err;
  }

  await proposal.populate("worker", USER_PUBLIC_FIELDS);
  await proposal.populate({
    path: "project",
    populate: { path: "client", select: USER_PUBLIC_FIELDS },
  });

  // notify client about new proposal — non-blocking
  notifyNewProposal(
    proposal.project.client._id,
    proposal.worker.name,
    proposal.project.title,
    projectId,
    proposal._id,
  ).catch((err) => console.error("Notification error:", err.message));

  return proposal;
};

// ─── List ─────────────────────────────────────────────────────────────────────

const listProposalsByProject = async (clientId, projectId) => {
  const project = await findProjectOrFail(projectId);
  assertOwner(project, clientId);

  return Proposal.find({ project: projectId })
    .populate("worker", USER_PUBLIC_FIELDS)
    .sort({ createdAt: -1 });
};

const listMyProposals = async (workerId) => {
  return Proposal.find({ worker: workerId })
    .populate({
      path: "project",
      populate: { path: "client", select: USER_PUBLIC_FIELDS },
    })
    .sort({ createdAt: -1 });
};

// ─── Update ───────────────────────────────────────────────────────────────────

const updateProposal = async (workerId, id, data) => {
  const proposal = await findProposalOrFail(id);
  assertWorker(proposal, workerId);

  if (proposal.status !== PROPOSAL_STATUS.PENDING) {
    throw new AppError("Only pending proposals can be updated", 400);
  }

  if (data.message !== undefined) proposal.message = data.message;
  if (data.price !== undefined) proposal.price = data.price;
  if (data.estimatedDuration !== undefined) {
    proposal.estimatedDuration = data.estimatedDuration;
  }

  await proposal.save();
  return proposal;
};

// ─── Delete (withdraw) ────────────────────────────────────────────────────────

const deleteProposal = async (workerId, id) => {
  // populate worker so assertWorker can safely compare IDs
  const proposal = await Proposal.findById(id).populate("worker", "_id");

  if (!proposal) throw new AppError("Proposal not found", 404);

  assertWorker(proposal, workerId);

  if (proposal.status !== PROPOSAL_STATUS.PENDING) {
    throw new AppError("Only pending proposals can be withdrawn", 400);
  }

  await Proposal.findByIdAndDelete(id);
};

// ─── Update status (accept / reject) ─────────────────────────────────────────

const updateProposalStatus = async (clientId, id, status) => {
  const proposal = await findProposalOrFail(id);
  const project = proposal.project;

  assertOwner(project, clientId);

  if (proposal.status !== PROPOSAL_STATUS.PENDING) {
    throw new AppError("Only pending proposals can be accepted or rejected", 400);
  }

  proposal.status = status;
  await proposal.save();

  if (status === PROPOSAL_STATUS.ACCEPTED) {
    // set project to in-progress
    await Project.findByIdAndUpdate(project._id, {
      status: PROJECT_STATUS.IN_PROGRESS,
    });

    // reject all other pending proposals
    await Proposal.updateMany(
      {
        project: project._id,
        _id: { $ne: proposal._id },
        status: PROPOSAL_STATUS.PENDING,
      },
      { status: PROPOSAL_STATUS.REJECTED },
    );

    // notify worker — non-blocking
    notifyProposalAccepted(
      proposal.worker._id,
      project.title,
      project._id,
      proposal._id,
    ).catch((err) => console.error("Notification error:", err.message));

  } else if (status === PROPOSAL_STATUS.REJECTED) {
    // notify worker — non-blocking
    notifyProposalRejected(
      proposal.worker._id,
      project.title,
      project._id,
      proposal._id,
    ).catch((err) => console.error("Notification error:", err.message));
  }

  return proposal;
};

module.exports = {
  createProposal,
  listProposalsByProject,
  listMyProposals,
  updateProposal,
  deleteProposal,
  updateProposalStatus,
};