const User = require("../auth/auth.model");
const Project = require("../projects/projects.model");
const Proposal = require("../proposals/proposals.model");
const chatService = require("../chat/chat.service");
const {
  PROJECT_STATUS,
  PROPOSAL_STATUS,
} = require("../../constants/status");

const USER_PUBLIC_FIELDS = "name email role phone";

const countByStatus = (items, status) =>
  items.filter((item) => item.status === status).length;

const getClientDashboard = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  const [projects, conversations] = await Promise.all([
    Project.find({ user: userId }).sort({ createdAt: -1 }),
    chatService.getMyConversations(userId, "user"),
  ]);

  const projectIds = projects.map((p) => p._id);
  const projectMap = new Map(
    projects.map((p) => [p._id.toString(), p]),
  );

  const proposals =
    projectIds.length > 0
      ? await Proposal.find({ project: { $in: projectIds } })
          .populate("worker", USER_PUBLIC_FIELDS)
          .sort({ createdAt: -1 })
      : [];

  const proposalsByProject = new Map();
  for (const proposal of proposals) {
    const key = proposal.project.toString();
    if (!proposalsByProject.has(key)) proposalsByProject.set(key, []);
    proposalsByProject.get(key).push(proposal);
  }

  const enrichedProjects = projects.map((project) => {
    const projectProposals = proposalsByProject.get(project._id.toString()) || [];
    const pending = projectProposals.filter(
      (p) => p.status === PROPOSAL_STATUS.PENDING,
    );
    const accepted =
      projectProposals.find((p) => p.status === PROPOSAL_STATUS.ACCEPTED) ||
      null;

    return {
      ...project.toJSON(),
      proposals: {
        pending,
        accepted,
        counts: {
          pending: pending.length,
          accepted: accepted ? 1 : 0,
          rejected: countByStatus(projectProposals, PROPOSAL_STATUS.REJECTED),
          withdrawn: countByStatus(projectProposals, PROPOSAL_STATUS.WITHDRAWN),
          total: projectProposals.length,
        },
      },
    };
  });

  const pendingProposals = proposals
    .filter((p) => p.status === PROPOSAL_STATUS.PENDING)
    .map((proposal) => {
      const project = projectMap.get(proposal.project.toString());
      return {
        ...proposal.toJSON(),
        project: project
          ? {
              _id: project._id,
              title: project.title,
              status: project.status,
              category: project.category,
            }
          : null,
      };
    });

  const summary = {
    projects: {
      total: projects.length,
      open: countByStatus(projects, PROJECT_STATUS.OPEN),
      inProgress: countByStatus(projects, PROJECT_STATUS.IN_PROGRESS),
      closed: countByStatus(projects, PROJECT_STATUS.CLOSED),
    },
    pendingProposals: pendingProposals.length,
    unreadMessages: conversations.reduce(
      (sum, c) => sum + (c.unreadCount?.user || 0),
      0,
    ),
  };

  return {
    user,
    summary,
    projects: enrichedProjects,
    pendingProposals,
    conversations,
  };
};

module.exports = { getClientDashboard };
