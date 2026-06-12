const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const {
  errorHandler,
  notFound,
} = require("./src/middlewares/error.middleware");
const authRoutes = require("./src/modules/auth/auth.routes");
const profilesRoutes = require("./src/modules/profiles/profiles.routes");
const projectsRoutes = require("./src/modules/projects/projects.routes");
const proposalsRoutes = require("./src/modules/proposals/proposals.routes");
const chatRoutes = require("./src/modules/chat/chat.routes");
const usersRoutes = require("./src/modules/users/users.routes");
const { buildSwaggerSpec } = require("./src/docs/swagger");
const { NODE_ENV } = require("./src/config/env");
const { getSwaggerHtml } = require("./src/docs/swaggerPage");
const notificationsRoutes = require("./src/modules/notifications/notifications.routes");
const bookingsRoutes = require("./src/modules/bookings/bookings.routes");
const { protect } = require("./src/modules/auth/auth.middleware");


const app = express();
app.set("trust proxy", 1);

// ─── Security Middlewares ─────────────────────────────────────────────────────
app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: false,
  }),
);
app.use(
  cors({
    origin: "*", // open for local testing only
    credentials: false,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.post("/api/v1/pusher/auth", protect, (req, res) => {
  const { socket_id, channel_name } = req.body;

  // only allow participants to subscribe to their own channels
  // private-conversation-{id} and private-user-{userId}
  const userId = req.user.id;

  // allow user notification channel
  if (channel_name === `private-user-${userId}`) {
    const auth = pusher.authorizeChannel(socket_id, channel_name);
    return res.json(auth);
  }

  // allow conversation channel — backend will verify participation
  if (channel_name.startsWith("private-conversation-")) {
    const auth = pusher.authorizeChannel(socket_id, channel_name);
    return res.json(auth);
  }

  return res.status(403).json({ message: "Forbidden" });
});

// ─── Rate Limiting ────────────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 دقيقة
  max: NODE_ENV === "development" ? 10000 : 1000,
  message: {
    success: false,
    message: "Too many requests, please try again later",
  },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: NODE_ENV === "development" ? 1000 : 100,
  message: {
    success: false,
    message: "Too many auth attempts, please try again later",
  },
});

// ─── Swagger API Docs (CDN — works on Vercel serverless) ─────────────────────
app.get(["/api-docs", "/api-docs/"], (req, res) => {
  res.type("html").send(getSwaggerHtml());
});
app.get("/api-docs.json", (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.json(buildSwaggerSpec(req));
});

app.use(limiter);

// API v1 (الأساسي)
app.use("/api/v1/auth", authLimiter, authRoutes);
app.use("/api/v1/profiles", profilesRoutes);
app.use("/api/v1/projects", projectsRoutes);
app.use("/api/v1/proposals", proposalsRoutes);
app.use("/api/v1/chat", chatRoutes);
app.use("/api/v1/users", usersRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/users", usersRoutes);

// Aliases بدون v1 (لو حد نسيها)
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/profiles", profilesRoutes);
app.use("/api/projects", projectsRoutes);
app.use("/api/proposals", proposalsRoutes);

app.get("/", (req, res) => {
  res.redirect("/api-docs");
});

app.get("/api/v1", (req, res) => {
  res.json({
    success: true,
    message: "Maallem API v1",
    docs: "/api-docs",
    endpoints: {
      auth: "/api/v1/auth",
      profiles: "/api/v1/profiles",
      projects: "/api/v1/projects",
      proposals: "/api/v1/proposals",
      users: "/api/v1/users",
      health: "/health",
    },
  });
});

app.get("/health", (req, res) => {
  const base = req.headers["x-forwarded-host"]
    ? `${req.headers["x-forwarded-proto"] || "https"}://${req.headers["x-forwarded-host"]}`
    : null;
  res.json({
    success: true,
    message: "Server is running 🚀",
    docs: "/api-docs",
    api: "/api/v1",
    baseUrl: base,
  });
});

app.use("/api/v1/notifications", notificationsRoutes);
app.use("/api/notifications", notificationsRoutes); // alias

app.use("/api/v1/bookings", bookingsRoutes);
app.use("/api/bookings", bookingsRoutes); // alias

// ─── Error Handling ───────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

module.exports = app;
