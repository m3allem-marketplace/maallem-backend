// Async error handler wrapper - catches both sync and async errors
const catchAsync = (fn) => {
  return (req, res, next) => {
    // Wrap in try-catch for synchronous 
    try {
      // Call the function and handle any promise rejections
      const result = fn(req, res, next);
      if (result && typeof result.catch === "function") {
        result.catch(next);
      }
    } catch (err) {
      // Catch synchronous errors
      next(err);
    }
  };
};

module.exports = catchAsync;
