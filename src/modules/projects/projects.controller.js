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
    const err = new Error(error.details.map((d) => d.message).join(", "));
    err.statusCode = 422;
    throw err;
  }
  return value;
};

const list = catchAsync(async (req, res) => {
  const projects = await projectsService.listProjects(req.query);
  res.status(200).json({
    success: true,
    count: projects.length,
    data: { projects },
  });
});

const getById = catchAsync(async (req, res) => {
  const project = await projectsService.getProjectById(req.params.id);
  res.status(200).json({ success: true, data: { project } });
});

const create = catchAsync(async (req, res) => {
  const data = validate(createProjectSchema, req.body);
  if (data.location) data.location = normalizeLocation(data.location);
  const project = await projectsService.createProject(req.user.id, data);
  res.status(201).json({
    success: true,
    message: "Project created",
    data: { project },
  });
});

const update = catchAsync(async (req, res) => {
  const data = validate(updateProjectSchema, req.body);
  if (data.location) data.location = normalizeLocation(data.location);
  const project = await projectsService.updateProject(
    req.user.id,
    req.params.id,
    data,
  );
  res.status(200).json({
    success: true,
    message: "Project updated",
    data: { project },
  });
});

const remove = catchAsync(async (req, res) => {
  await projectsService.deleteProject(req.user.id, req.params.id);
  res.status(200).json({ success: true, message: "Project deleted" });
});

const patchStatus = catchAsync(async (req, res) => {
  const { status } = validate(patchProjectStatusSchema, req.body);
  const project = await projectsService.updateProjectStatus(
    req.user.id,
    req.params.id,
    status,
  );
  res.status(200).json({
    success: true,
    message: "Project status updated",
    data: { project },
  });
});

module.exports = { list, getById, create, update, remove, patchStatus };
