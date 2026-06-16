const jwt = require("jsonwebtoken");
const User = require("./auth.model");
const { JWT_SECRET } = require("../../config/env");

// ─── Protect: التحقق من الـ JWT ───────────────────────────────────────────────

const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "No token provided, authorization denied",
      });
    }

    const token = authHeader.split(" ")[1];

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return res.status(401).json({
        success: false,
        message:
          err.name === "TokenExpiredError" ? "Token expired" : "Invalid token",
      });
    }

    const user = await User.findById(decoded.id);

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: "User no longer exists or is inactive",
      });
    }

    req.user = { id: user._id.toString(), role: user.role };
    next();
  } catch (err) {
    // Pass error to error handler middleware
    next(err);
  }
};

// ─── OptionalProtect: attach user when token is present ───────────────────────

const optionalProtect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next();
    }

    const token = authHeader.split(" ")[1];

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return next();
    }

    const user = await User.findById(decoded.id);

    if (user && user.isActive) {
      req.user = { id: user._id.toString(), role: user.role };
    }

    next();
  } catch (err) {
    next(err);
  }
};

// ─── Authorize: التحقق من الـ Role ───────────────────────────────────────────

const authorize = (...roles) => {
  return (req, res, next) => {
    try {
      if (!roles.includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: `Access denied. This route is for: ${roles.join(", ")}`,
        });
      }
      next();
    } catch (err) {
      next(err);
    }
  };
};

module.exports = { protect, optionalProtect, authorize };
