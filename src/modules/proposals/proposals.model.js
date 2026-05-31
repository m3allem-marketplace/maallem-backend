const mongoose = require("mongoose");
const {
  PROPOSAL_STATUS,
  PROPOSAL_STATUS_VALUES,
} = require("../../constants/status");

const proposalSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },
    worker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    message: { type: String, trim: true, maxlength: 3000, default: "" },
    price: { type: Number, min: 0, required: true },
    estimatedDuration: { type: String, trim: true, maxlength: 200, default: "" },
    status: {
      type: String,
      enum: PROPOSAL_STATUS_VALUES,
      default: PROPOSAL_STATUS.PENDING,
      index: true,
    },
  },
  { timestamps: true },
);

proposalSchema.index({ project: 1, worker: 1 }, { unique: true });

module.exports = mongoose.model("Proposal", proposalSchema);
