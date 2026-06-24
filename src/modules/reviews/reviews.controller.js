const catchAsync = require("../../utils/catchAsync");
const AppError = require("../../utils/AppError");
const Review = require("./reviews.model");
const WorkerProfile = require("../profiles/worker.model");

exports.createReview = catchAsync(async (req, res, next) => {
  const { workerId } = req.params;
  const { rating, comment, booking, project } = req.body;
  const reviewerId = req.user.id;

  // 1. Validate that the worker exists and has a profile
  const workerProfile = await WorkerProfile.findOne({ user: workerId });
  if (!workerProfile) {
    return next(new AppError("Worker not found or doesn't have a profile.", 404));
  }

  // 2. Prevent user from reviewing themselves
  if (workerId === reviewerId) {
    return next(new AppError("You cannot review yourself.", 400));
  }

  // 3. Create the review
  const review = await Review.create({
    reviewer: reviewerId,
    reviewee: workerId,
    rating,
    comment,
    booking,
    project,
  });

  // 4. Calculate new average rating and total reviews
  const reviewsStats = await Review.aggregate([
    { $match: { reviewee: workerProfile.user } },
    {
      $group: {
        _id: "$reviewee",
        averageRating: { $avg: "$rating" },
        totalReviews: { $sum: 1 },
      },
    },
  ]);

  if (reviewsStats.length > 0) {
    workerProfile.averageRating = Math.round(reviewsStats[0].averageRating * 10) / 10; // Round to 1 decimal place
    workerProfile.totalReviews = reviewsStats[0].totalReviews;
    await workerProfile.save();
  }

  res.status(201).json({
    success: true,
    message: "Review added successfully",
    data: review,
  });
});

exports.getWorkerReviews = catchAsync(async (req, res, next) => {
  const { workerId } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  // Fetch reviews for this worker
  const reviews = await Review.find({ reviewee: workerId, isHidden: false })
    .populate({
      path: "reviewer",
      select: "name avatar role",
    })
    .sort("-createdAt")
    .skip(skip)
    .limit(limit);

  const total = await Review.countDocuments({ reviewee: workerId, isHidden: false });

  res.status(200).json({
    success: true,
    data: reviews,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
});
