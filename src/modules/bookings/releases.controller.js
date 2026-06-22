const catchAsync = require("../../utils/catchAsync");
const releasesService = require("./releases.service");
const { sendResponse } = require("../../utils/apiResponse");

const createReleases = catchAsync(async (req, res) => {
  const { releases } = req.body;
  const result = await releasesService.createReleases(req.params.id, req.user.id, releases);
  sendResponse(res, 201, { releases: result }, "Releases created successfully");
});

const deliverRelease = catchAsync(async (req, res) => {
  const release = await releasesService.deliverRelease(req.params.id, req.params.releaseId, req.user.id);
  sendResponse(res, 200, { release }, "Release delivered successfully");
});

const approveRelease = catchAsync(async (req, res) => {
  const result = await releasesService.approveRelease(req.params.id, req.params.releaseId, req.user.id);
  sendResponse(res, 200, result, "Release approved and funds released");
});

const getReleases = catchAsync(async (req, res) => {
  const releases = await releasesService.getReleases(req.params.id, req.user.id, req.user.role);
  sendResponse(res, 200, { releases }, "Releases fetched");
});

module.exports = {
  createReleases,
  deliverRelease,
  approveRelease,
  getReleases,
};
