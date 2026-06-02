const authService = require("./auth.service");
const catchAsync = require("../../utils/catchAsync");
const AppError = require("../../utils/AppError");
const { sendResponse } = require("../../utils/apiResponse");

const {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
} = require("./auth.validation");

// ─── Helper ───────────────────────────────────────────────────────────────────

const validate = (schema, data) => {
  const { error, value } = schema.validate(data, { abortEarly: false });
  if (error) {
    const messages = error.details.map((d) => d.message);
    //using AppError to handle the errors
    throw new AppError(messages.join(", "), 422);
  }
  return value;
};

// ─── Controllers ─────────────────────────────────────────────────────────────

const register = catchAsync(async (req, res) => {
  const data = validate(registerSchema, req.body);
  const { user, accessToken, refreshToken } = await authService.register(data);

  sendResponse(
    res,
    201,
    { user, accessToken, refreshToken },
    "Registered successfully",
  );
});

const login = catchAsync(async (req, res) => {
  const data = validate(loginSchema, req.body);
  const { user, accessToken, refreshToken } = await authService.login(data);

  sendResponse(
    res,
    200,
    { user, accessToken, refreshToken },
    "Logged in successfully",
  );
});

const refreshToken = catchAsync(async (req, res) => {
  const { refreshToken } = validate(refreshTokenSchema, req.body);
  const { accessToken, user } =
    await authService.refreshAccessToken(refreshToken);

 sendResponse(res, 200, { accessToken, user }, "Token refreshed");

});

const logout = catchAsync(async (req, res) => {
  const { refreshToken } = req.body;
  await authService.logout(req.user.id, refreshToken);

  sendResponse(res, 200, null, "Logged out successfully");

});

const logoutAll = catchAsync(async (req, res) => {
  await authService.logoutAll(req.user.id);

  sendResponse(res, 200, null, "Logged out from all devices")
});

const getMe = catchAsync(async (req, res) => {
  const user = await authService.getMe(req.user.id);

  sendResponse(res, 200, { user });
});

module.exports = { register, login, refreshToken, logout, logoutAll, getMe };
