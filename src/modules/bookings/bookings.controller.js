const catchAsync = require("../../utils/catchAsync");
const bookingsService = require("./bookings.service");
const { createBookingSchema, resolveDisputeSchema } = require("./bookings.validation");
const { sendResponse } = require("../../utils/apiResponse");
const AppError = require("../../utils/AppError");

const validate = (schema, data) => {
  const { error, value } = schema.validate(data, { abortEarly: false });
  if (error) {
    throw new AppError(error.details.map((d) => d.message).join(", "), 422);
  }
  return value;
};

const create = catchAsync(async (req, res) => {
  const data = validate(createBookingSchema, req.body);
  const booking = await bookingsService.createBooking(req.user.id, data);
  sendResponse(res, 201, { booking }, "Booking created");
});

const pay = catchAsync(async (req, res) => {
  const booking = await bookingsService.payBooking(req.params.id, req.user.id);
  sendResponse(res, 200, { booking }, "Payment successful");
});

const deliver = catchAsync(async (req, res) => {
  const booking = await bookingsService.deliverBooking(req.params.id, req.user.id);
  sendResponse(res, 200, { booking }, "Work delivered successfully");
});

const approve = catchAsync(async (req, res) => {
  const booking = await bookingsService.approveBooking(req.params.id, req.user.id);
  sendResponse(res, 200, { booking }, "Delivery approved and funds released");
});

const dispute = catchAsync(async (req, res) => {
  const booking = await bookingsService.disputeBooking(req.params.id, req.user.id);
  sendResponse(res, 200, { booking }, "Dispute opened successfully");
});

const resolve = catchAsync(async (req, res) => {
  const { resolution } = validate(resolveDisputeSchema, req.body);
  const booking = await bookingsService.resolveDispute(req.params.id, req.user.id, resolution);
  sendResponse(res, 200, { booking }, `Dispute resolved with: ${resolution}`);
});

const getById = catchAsync(async (req, res) => {
  const booking = await bookingsService.getBookingById(req.params.id, req.user.id, req.user.role);
  sendResponse(res, 200, { booking }, "Booking fetched");
});

const list = catchAsync(async (req, res) => {
  const result = await bookingsService.getBookings(req.user.id, req.user.role, req.query);
  sendResponse(res, 200, result, "Bookings fetched");
});

module.exports = {
  create,
  pay,
  deliver,
  approve,
  dispute,
  resolve,
  getById,
  list,
};
