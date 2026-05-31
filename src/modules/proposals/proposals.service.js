const Proposal = require("./proposals.model");
const Project = require("../projects/projects.model");
const {
  PROJECT_STATUS,
  PROPOSAL_STATUS,
} = require("../../constants/status");
const {
  findProjectOrFail,
  assertOwner,
} = require("../projects/projects.service");

const USER_PUBLIC_FIELDS = "name email role phone";

const findProposalOrFail = async (id) => {
  const proposal = await Proposal.findById(id)
    .populate("worker", USER_PUBLIC_FIELDS)
    .populate({
      path: "project",
      populate: { path: "client", select: USER_PUBLIC_FIELDS },
    });
  if (!proposal) {
    const error = new Error("Proposal not found");
    error.statusCode = 404;
    throw error;
  }
  return proposal;
};

const assertWorker = (proposal, userId) => {
  const workerId = proposal.worker._id?.toString() || proposal.worker.toString();
  if (workerId !== userId) {
    const error = new Error("You can only manage your own proposals");
    error.statusCode = 403;
    throw error;
  }
};

const createProposal = async (workerId, projectId, data) => {
  const project = await findProjectOrFail(projectId);

  if (project.status !== PROJECT_STATUS.OPEN) {
    const error = new Error("Proposals can only be submitted on open projects");
    error.statusCode = 400;
    throw error;
  }

  const existing = await Proposal.findOne({ project: projectId, worker: workerId });
  if (existing) {
    const error = new Error("You already submitted a proposal for this project");
    error.statusCode = 409;
    throw error;
  }

  try {
    const proposal = await Proposal.create({
      project: projectId,
      worker: workerId,
      message: data.message || "",
      price: data.price,
      estimatedDuration: data.estimatedDuration || "",
    });
    await proposal.populate("worker", USER_PUBLIC_FIELDS);
    await proposal.populate({
      path: "project",
      populate: { path: "client", select: USER_PUBLIC_FIELDS },
    });
    return proposal;
  } catch (err) {
    if (err.code === 11000) {
      const error = new Error("You already submitted a proposal for this project");
      error.statusCode = 409;
      throw error;
    }
    throw err;
  }
};

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

const updateProposal = async (workerId, id, data) => {
  const proposal = await findProposalOrFail(id);
  assertWorker(proposal, workerId);

  if (proposal.status !== PROPOSAL_STATUS.PENDING) {
    const error = new Error("Only pending proposals can be updated");
    error.statusCode = 400;
    throw error;
  }

  if (data.message !== undefined) proposal.message = data.message;
  if (data.price !== undefined) proposal.price = data.price;
  if (data.estimatedDuration !== undefined) {
    proposal.estimatedDuration = data.estimatedDuration;
  }

  await proposal.save();
  return proposal;
};

const deleteProposal = async (workerId, id) => {
  const proposal = await Proposal.findById(id);
  if (!proposal) {
    const error = new Error("Proposal not found");
    error.statusCode = 404;
    throw error;
  }
  assertWorker(proposal, workerId);

  if (proposal.status !== PROPOSAL_STATUS.PENDING) {
    const error = new Error("Only pending proposals can be withdrawn");
    error.statusCode = 400;
    throw error;
  }

  await Proposal.findByIdAndDelete(id);
};

const updateProposalStatus = async (clientId, id, status) => {
  const proposal = await findProposalOrFail(id);
  const project = proposal.project;

  assertOwner(project, clientId);

  if (proposal.status !== PROPOSAL_STATUS.PENDING) {
    const error = new Error("Only pending proposals can be accepted or rejected");
    error.statusCode = 400;
    throw error;
  }

  proposal.status = status;
  await proposal.save();

  if (status === PROPOSAL_STATUS.ACCEPTED) {
    await Project.findByIdAndUpdate(project._id, {
      status: PROJECT_STATUS.IN_PROGRESS,
    });
    await Proposal.updateMany(
      {
        project: project._id,
        _id: { $ne: proposal._id },
        status: PROPOSAL_STATUS.PENDING,
      },
      { status: PROPOSAL_STATUS.REJECTED },
    );
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
