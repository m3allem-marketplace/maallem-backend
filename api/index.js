const app = require("../app");
const connectDB = require("../src/config/db");

let isConnected = false;

module.exports = async (req, res) => {
  if (!isConnected) {
    try {
      await connectDB();
      isConnected = true;
    } catch (err) {
      console.error("MongoDB connection error:", err.message);
      return res.status(500).json({ message: "Database connection failed" });
    }
  }

  return app(req, res);
};