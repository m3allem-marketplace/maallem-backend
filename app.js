const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const { errorHandler, notFound } = require("./src/middlewares/error.middleware");
const authRoutes = require("./src/modules/auth/auth.routes");
const profilesRoutes = require("./src/modules/profiles/profiles.routes");
const projectsRoutes = require("./src/modules/projects/projects.routes");
const proposalsRoutes = require("./src/modules/proposals/proposals.routes");
const chatRoutes = require("./src/modules/chat/chat.routes");
const { buildSwaggerSpec } = require("./src/docs/swagger");
const { getSwaggerHtml } = require("./src/docs/swaggerPage");
const notificationsRoutes = require("./src/modules/notifications/notifications.routes");


const app = express();

// ─── Security Middlewares ─────────────────────────────────────────────────────
app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: false,
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Rate Limiting ────────────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 دقيقة
  max: 100,
  message: { success: false, message: "Too many requests, please try again later" },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, 
  message: { success: false, message: "Too many auth attempts, please try again later" },
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
app.use("/api/chat", chatRoutes);

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

// ─── Error Handling ───────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

module.exports = app;