const notificationsService = require("./notifications.service");
const catchAsync = require("../../utils/catchAsync");
const { sendResponse } = require("../../utils/apiResponse");

const getMyNotifications = catchAsync(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;

  const result = await notificationsService.getMyNotifications(
    req.user.id,
    page,
    limit,
  );

  sendResponse(res, 200, result, "Notifications fetched");
});

const getUnreadCount = catchAsync(async (req, res) => {
  const result = await notificationsService.getUnreadCount(req.user.id);
  sendResponse(res, 200, result, "Unread count fetched");
});

const markAsRead = catchAsync(async (req, res) => {
  const notification = await notificationsService.markAsRead(
    req.params.id,
    req.user.id,
  );
  sendResponse(res, 200, { notification }, "Notification marked as read");
});

const markAllAsRead = catchAsync(async (req, res) => {
  await notificationsService.markAllAsRead(req.user.id);
  sendResponse(res, 200, null, "All notifications marked as read");
});

const deleteNotification = catchAsync(async (req, res) => {
  await notificationsService.deleteNotification(req.params.id, req.user.id);
  sendResponse(res, 200, null, "Notification deleted");
});

module.exports = {
  getMyNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
};