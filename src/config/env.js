require("dotenv").config();

module.exports = {
  PORT: process.env.PORT || 3000,
  MONGO_URI: process.env.MONGODB_URI || "mongodb://localhost:27017/maallem",
  NODE_ENV: process.env.NODE_ENV || "development",
  JWT_SECRET: process.env.JWT_SECRET || "your_jwt_secret",
  JWT_REFRESH_SECRET:
    process.env.JWT_REFRESH_SECRET || "your_jwt_refresh_secret",
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "15m",
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
  VERCEL_URL: process.env.VERCEL_URL,
  PUSHER_APP_ID: process.env.PUSHER_APP_ID,
  PUSHER_KEY: process.env.PUSHER_KEY,
  PUSHER_SECRET: process.env.PUSHER_SECRET,
  PUSHER_CLUSTER: process.env.PUSHER_CLUSTER || "eu",
  API_BASE_URL:
    process.env.API_BASE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null),
};
