const catchAsync = require("../../utils/catchAsync");
const { sendResponse } = require("../../utils/apiResponse");
const usersService = require("./users.service");

const getDashboard = catchAsync(async (req, res) => {
  const dashboard = await usersService.getClientDashboard(req.user.id);

  sendResponse(res, 200, dashboard, "Dashboard fetched");
});

module.exports = { getDashboard };
