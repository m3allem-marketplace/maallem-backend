const Project = require("./projects.model");
const Proposal = require("../proposals/proposals.model");
const User = require("../auth/auth.model");
const WorkerProfile = require("../profiles/worker.model");
const { PROJECT_STATUS } = require("../../constants/status");
const AppError = require("../../utils/AppError");
const { notifyProjectInvitation } = require("../notifications/notifications.service");


const USER_PUBLIC_FIELDS = "name email role phone";

const populateProject = (query) =>
  query.populate("client", USER_PUBLIC_FIELDS).populate("worker", USER_PUBLIC_FIELDS);

const resolveWorkerUserId = async (workerId) => {
  const user = await User.findOne({ _id: workerId, role: "worker" });
  if (user) return user._id;

  const profile = await WorkerProfile.findById(workerId);
  if (profile) return profile.user;

  throw new AppError("Worker not found", 404);
};

const findProjectOrFail = async (id) => {
  const project = await populateProject(Project.findById(id));
  if (!project) {
    throw new AppError("Project not found", 404);
  }
  return project;
};

const assertOwner = (project, userId) => {
  if (project.client._id?.toString() !== userId && project.client.toString() !== userId) {
    throw new AppError("You can only manage your own projects", 403);
  }
};

const getWorkerIdFromProject = (project) => {
  if (!project.worker) return null;
  return project.worker._id?.toString() ?? project.worker.toString();
};

const isAssignedWorker = (project, userId) => {
  const workerId = getWorkerIdFromProject(project);
  return Boolean(workerId && workerId === userId);
};

const assertAssignedWorker = (project, userId) => {
  if (!isAssignedWorker(project, userId)) {
    throw new AppError("You are not assigned to this project", 403);
  }
};

const isDirectProject = (project) => Boolean(getWorkerIdFromProject(project));

const toProjectResponse = (project) => {
  const data = project.toJSON ? project.toJSON() : project;
  return { ...data, isDirect: isDirectProject(project) };
};

const assertCanViewProject = (project, requesterId, requesterRole) => {
  if (!isDirectProject(project)) return;

  if (!requesterId) {
    throw new AppError("Project not found", 404);
  }

  const isClient =
    project.client._id?.toString() === requesterId ||
    project.client.toString() === requesterId;

  if (isClient || isAssignedWorker(project, requesterId) || requesterRole === "admin") {
    return;
  }

  throw new AppError("Project not found", 404);
};

const listProjects = async (query = {}) => {
  const filter = { worker: null };
  if (query.status) filter.status = query.status;
  if (query.city) filter["location.city"] = new RegExp(query.city, "i");
  if (query.category) filter.category = new RegExp(query.category, "i");

  const projects = await populateProject(
    Project.find(filter).sort({ createdAt: -1 }),
  );

  return projects.map(toProjectResponse);
};

const getProjectById = async (id, requesterId = null, requesterRole = null) => {
  const project = await findProjectOrFail(id);
  assertCanViewProject(project, requesterId, requesterRole);
  return toProjectResponse(project);
};

const listAssignedProjects = async (workerId, query = {}) => {
  const filter = { worker: workerId };
  if (query.status) filter.status = query.status;

  const projects = await populateProject(
    Project.find(filter).sort({ createdAt: -1 }),
  );

  const projectIds = projects.map((p) => p._id);
  const proposals =
    projectIds.length > 0
      ? await Proposal.find({ project: { $in: projectIds }, worker: workerId })
      : [];

  const proposalMap = new Map(
    proposals.map((p) => [p.project.toString(), p]),
  );

  const enriched = projects.map((project) => ({
    ...toProjectResponse(project),
    myProposal: proposalMap.get(project._id.toString()) || null,
  }));

  return {
    projects: enriched,
    count: enriched.length,
    summary: {
      total: enriched.length,
      open: enriched.filter((p) => p.status === PROJECT_STATUS.OPEN).length,
      inProgress: enriched.filter((p) => p.status === PROJECT_STATUS.IN_PROGRESS).length,
      closed: enriched.filter((p) => p.status === PROJECT_STATUS.CLOSED).length,
    },
  };
};

const createProject = async (userId, data) => {
  let workerUserId = null;
  if (data.workerId) {
    workerUserId = await resolveWorkerUserId(data.workerId);
  }

  const project = await Project.create({
    client: userId,
    worker: workerUserId,
    title: data.title,
    description: data.description || "",
    category: data.category || "",
    location: data.location || { address: "", city: "" },
    budget: data.budget ?? 0,
    invoiceImage: data.invoiceImage || "",
    status: data.status || PROJECT_STATUS.OPEN,
  });

  const populated = await populateProject(Project.findById(project._id));

  if (workerUserId) {
    const client = await User.findById(userId).select("name");
    notifyProjectInvitation(
      workerUserId,
      client?.name || "A client",
      populated.title,
      populated._id,
    ).catch((err) => console.error("Notification error:", err.message));
  }

  return toProjectResponse(populated);
};

const updateProject = async (userId, id, data) => {
  const project = await findProjectOrFail(id);
  assertOwner(project, userId);

  if (data.title !== undefined) project.title = data.title;
  if (data.description !== undefined) project.description = data.description;
  if (data.category !== undefined) project.category = data.category;
  if (data.location !== undefined) project.location = data.location;
  if (data.budget !== undefined) project.budget = data.budget;
  if (data.invoiceImage !== undefined) project.invoiceImage = data.invoiceImage;

  await project.save();
  return toProjectResponse(await populateProject(Project.findById(project._id)));
};

const deleteProject = async (userId, id) => {
  const project = await Project.findById(id);
  if (!project) {
    throw new AppError("Project not found", 404);
  }
  assertOwner(project, userId);
  await Proposal.deleteMany({ project: id });
  await Project.findByIdAndDelete(id);
};

const updateProjectStatus = async (userId, id, status) => {
  const project = await findProjectOrFail(id);

  const isClient =
    project.client._id?.toString() === userId ||
    project.client.toString() === userId;

  if (!isClient && !isAssignedWorker(project, userId)) {
    throw new AppError(
      "You can only update status for your own or assigned projects",
      403,
    );
  }

  project.status = status;
  await project.save();
  return toProjectResponse(await populateProject(Project.findById(project._id)));
};

module.exports = {
  listProjects,
  listAssignedProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  updateProjectStatus,
  findProjectOrFail,
  assertOwner,
  assertAssignedWorker,
  assertCanViewProject,
  isAssignedWorker,
  isDirectProject,
  getWorkerIdFromProject,
  toProjectResponse,
};
