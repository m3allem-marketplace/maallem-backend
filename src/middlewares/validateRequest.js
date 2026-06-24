const AppError = require("../utils/appError");

exports.validateRequest = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      allowUnknown: true,
      stripUnknown: true,
    });

    if (error) {
      const errorMessage = error.details.map((details) => details.message).join(", ");
      return next(new AppError(errorMessage, 400));
    }

    req.body = value;
    next();
  };
};
