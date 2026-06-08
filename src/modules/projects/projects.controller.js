const catchAsync = require("../../utils/catchAsync");
const projectsService = require("./projects.service");
const {
  createProjectSchema,
  updateProjectSchema,
  patchProjectStatusSchema,
  normalizeLocation,
} = require("./projects.validation");

const validate = (schema, data) => {
  const { error, value } = schema.validate(data, { abortEarly: false });
  if (error) {
    const AppError = require("../../utils/AppError");
    throw new AppError(error.details.map((d) => d.message).join(", "), 422);
  }
  return value;
};

const list = catchAsync(async (req, res) => {
  const projects = await projectsService.listProjects(req.query);
  sendResponse(res, 200, { projects, count: projects.length }, "Projects fetched");
});

const getById = catchAsync(async (req, res) => {
  const project = await projectsService.getProjectById(req.params.id);
  sendResponse(res, 200, { project }, "Project fetched");
});

const create = catchAsync(async (req, res) => {
  const data = validate(createProjectSchema, req.body);
  if (data.location) data.location = normalizeLocation(data.location);
  const project = await projectsService.createProject(req.user.id, data);
  sendResponse(res, 201, { project }, "Project created");
});

const update = catchAsync(async (req, res) => {
  const data = validate(updateProjectSchema, req.body);
  if (data.location) data.location = normalizeLocation(data.location);
  const project = await projectsService.updateProject(
    req.user.id,
    req.params.id,
    data,
  );
  sendResponse(res, 200, { project }, "Project updated");
});

const remove = catchAsync(async (req, res) => {
  await projectsService.deleteProject(req.user.id, req.params.id);
  sendResponse(res, 200, null, "Project deleted");
});

const patchStatus = catchAsync(async (req, res) => {
  const { status } = validate(patchProjectStatusSchema, req.body);
  const project = await projectsService.updateProjectStatus(
    req.user.id,
    req.params.id,
    status,
  );
  sendResponse(res, 200, { project }, "Project status updated");
});

module.exports = { list, getById, create, update, remove, patchStatus };
