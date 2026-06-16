const mongoose = require("mongoose");
const { PROJECT_STATUS, PROJECT_STATUS_VALUES } = require("../../constants/status");

const projectSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 5000, default: "" },
    category: { type: String, trim: true, maxlength: 100, default: "" },
    location: {
      address: { type: String, trim: true, default: "" },
      city: { type: String, trim: true, default: "" },
    },
    budget: { type: Number, min: 0, default: 0 },
    status: {
      type: String,
      enum: PROJECT_STATUS_VALUES,
      default: PROJECT_STATUS.OPEN,
      index: true,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Project", projectSchema);
