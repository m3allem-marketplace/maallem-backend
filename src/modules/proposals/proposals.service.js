const Proposal = require("./proposals.model");
const Project = require("../projects/projects.model");
const AppError = require("../../utils/AppError");
const { PROJECT_STATUS, PROPOSAL_STATUS } = require("../../constants/status");
const {
  findProjectOrFail,
  assertOwner,
  getWorkerIdFromProject,
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
  const workerId =
    proposal.worker._id?.toString() ?? proposal.worker.toString();
  if (workerId !== userId) {
    throw new AppError("You can only manage your own proposals", 403);
  }
};

// ─── Create ───────────────────────────────────────────────────────────────────

const createProposal = async (workerId, projectId, data) => {
  const project = await findProjectOrFail(projectId);
  const assignedWorkerId = getWorkerIdFromProject(project);

  if (assignedWorkerId) {
    if (assignedWorkerId !== workerId) {
      throw new AppError("This project is assigned to another worker", 403);
    }
    if (
      project.status !== PROJECT_STATUS.OPEN &&
      project.status !== PROJECT_STATUS.IN_PROGRESS
    ) {
      throw new AppError(
        "Proposals cannot be submitted on closed projects",
        400,
      );
    }
  } else if (project.status !== PROJECT_STATUS.OPEN) {
    throw new AppError("Proposals can only be submitted on open projects", 400);
  }

  const existing = await Proposal.findOne({
    project: projectId,
    worker: workerId,
  });
  if (existing) {
    throw new AppError(
      "You already submitted a proposal for this project",
      409,
    );
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
      throw new AppError(
        "You already submitted a proposal for this project",
        409,
      );
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

const PROJECT_WITH_CLIENT = {
  path: "project",
  populate: [
    { path: "client", select: USER_PUBLIC_FIELDS },
    { path: "worker", select: USER_PUBLIC_FIELDS },
  ],
};

const formatHistoryProject = (project) => ({
  _id: project._id,
  title: project.title,
  description: project.description,
  category: project.category,
  budget: project.budget,
  status: project.status,
  location: project.location,
  isDirect: Boolean(project.worker),
  createdAt: project.createdAt,
  updatedAt: project.updatedAt,
});

const formatHistoryProposal = (proposal) => ({
  _id: proposal._id,
  price: proposal.price,
  message: proposal.message,
  status: proposal.status,
  estimatedDuration: proposal.estimatedDuration,
  createdAt: proposal.createdAt,
  updatedAt: proposal.updatedAt,
});

const matchesHistoryStatus = (status, filter) => {
  if (!filter) return true;
  return status === filter;
};

const getWorkerOfferHistory = async (workerId, query = {}) => {
  const proposals = await Proposal.find({ worker: workerId })
    .populate(PROJECT_WITH_CLIENT)
    .sort({ updatedAt: -1 });

  const proposalByProjectId = new Map(
    proposals.map((p) => [p.project._id.toString(), p]),
  );

  const directFilter = { worker: workerId };
  if (query.clientId) directFilter.client = query.clientId;

  const directProjects = await Project.find(directFilter)
    .populate("client", USER_PUBLIC_FIELDS)
    .populate("worker", USER_PUBLIC_FIELDS)
    .sort({ createdAt: -1 });

  const history = [];

  for (const project of directProjects) {
    const existingProposal = proposalByProjectId.get(project._id.toString());
    if (existingProposal) continue;

    const item = {
      id: project._id,
      kind: "direct_request",
      status: "awaiting_proposal",
      isDirect: true,
      client: project.client,
      project: formatHistoryProject(project),
      proposal: null,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    };

    if (matchesHistoryStatus(item.status, query.status)) {
      history.push(item);
    }
  }

  for (const proposal of proposals) {
    const project = proposal.project;

    if (query.clientId) {
      const clientId =
        project.client._id?.toString() ?? project.client.toString();
      if (clientId !== query.clientId) continue;
    }

    const item = {
      id: proposal._id,
      kind: "proposal",
      status: proposal.status,
      isDirect: Boolean(project.worker),
      client: project.client,
      project: formatHistoryProject(project),
      proposal: formatHistoryProposal(proposal),
      createdAt: proposal.createdAt,
      updatedAt: proposal.updatedAt,
    };

    if (matchesHistoryStatus(item.status, query.status)) {
      history.push(item);
    }
  }

  history.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );

  return {
    history,
    count: history.length,
    summary: {
      total: history.length,
      awaitingProposal: history.filter((h) => h.status === "awaiting_proposal")
        .length,
      pending: history.filter((h) => h.status === PROPOSAL_STATUS.PENDING)
        .length,
      accepted: history.filter((h) => h.status === PROPOSAL_STATUS.ACCEPTED)
        .length,
      rejected: history.filter((h) => h.status === PROPOSAL_STATUS.REJECTED)
        .length,
      withdrawn: history.filter((h) => h.status === PROPOSAL_STATUS.WITHDRAWN)
        .length,
    },
  };
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
    throw new AppError(
      "Only pending proposals can be accepted or rejected",
      400,
    );
  }

  proposal.status = status;
  await proposal.save();

  if (status === PROPOSAL_STATUS.ACCEPTED) {
    // set project to in-progress
    await Project.findByIdAndUpdate(project._id, {
      status: PROJECT_STATUS.IN_PROGRESS,
    });
    const otherProposals = await Proposal.find({
      project: project._id,
      _id: { $ne: proposal._id },
      status: PROPOSAL_STATUS.PENDING,
    }).populate("worker", "_id");
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
  getWorkerOfferHistory,
  updateProposal,
  deleteProposal,
  updateProposalStatus,
};
