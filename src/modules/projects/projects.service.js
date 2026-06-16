const Project = require("./projects.model");
const Proposal = require("../proposals/proposals.model");
const { PROJECT_STATUS } = require("../../constants/status");
const AppError = require("../../utils/AppError");

const USER_PUBLIC_FIELDS = "name email role phone";

const findProjectOrFail = async (id) => {
  const project = await Project.findById(id).populate(
    "user",
    USER_PUBLIC_FIELDS,
  );
  if (!project) {
    throw new AppError("Project not found", 404);
  }
  return project;
};

const assertOwner = (project, userId) => {
  if (project.user._id?.toString() !== userId && project.user.toString() !== userId) {
    throw new AppError("You can only manage your own projects", 403);
  }
};

const listProjects = async (query = {}) => {
  const filter = {};
  if (query.status) filter.status = query.status;
  if (query.city) filter["location.city"] = new RegExp(query.city, "i");
  if (query.category) filter.category = new RegExp(query.category, "i");

  return Project.find(filter)
    .populate("user", USER_PUBLIC_FIELDS)
    .sort({ createdAt: -1 });
};

const getProjectById = async (id) => findProjectOrFail(id);

const createProject = async (userId, data) => {
  const project = await Project.create({
    user: userId,
    title: data.title,
    description: data.description || "",
    category: data.category || "",
    location: data.location || { address: "", city: "" },
    budget: data.budget ?? 0,
    status: data.status || PROJECT_STATUS.OPEN,
  });

  return project.populate("user", USER_PUBLIC_FIELDS);
};

const updateProject = async (userId, id, data) => {
  const project = await findProjectOrFail(id);
  assertOwner(project, userId);

  if (data.title !== undefined) project.title = data.title;
  if (data.description !== undefined) project.description = data.description;
  if (data.category !== undefined) project.category = data.category;
  if (data.location !== undefined) project.location = data.location;
  if (data.budget !== undefined) project.budget = data.budget;

  await project.save();
  return project.populate("user", USER_PUBLIC_FIELDS);
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
  assertOwner(project, userId);
  project.status = status;
  await project.save();
  return project.populate("user", USER_PUBLIC_FIELDS);
};

module.exports = {
  listProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  updateProjectStatus,
  findProjectOrFail,
  assertOwner,
};
