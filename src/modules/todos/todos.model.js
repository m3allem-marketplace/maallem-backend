const mongoose = require("mongoose");

const todoSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Todo must belong to a user"],
    },
    title: {
      type: String,
      required: [true, "Todo title is required"],
      trim: true,
      maxlength: [200, "Title cannot be more than 200 characters"],
    },
    description: {
      type: String,
      trim: true,
    },
    category: {
      type: String,
      trim: true,
    },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High", "Urgent"],
      default: "Medium",
    },
    location: {
      type: String,
      trim: true,
    },
    quantity: {
      target: { type: Number, required: true, default: 1 },
      completed: { type: Number, default: 0 },
      unit: { type: String, required: true, default: "unit" },
    },
    workers: [
      {
        name: { type: String, required: true },
        source: {
          type: String,
          enum: ["Internal", "External"],
          default: "Internal",
        },
        role: { type: String },
        dailyRate: { type: Number },
        assignedQuantity: { type: Number },
      },
    ],
    timeline: {
      expectedStartDate: { type: Date },
      expectedEndDate: { type: Date },
      actualStartDate: { type: Date },
      actualEndDate: { type: Date },
    },
    status: {
      type: String,
      enum: [
        "Pending",
        "In Progress",
        "Paused",
        "Completed",
        "Under Inspection",
      ],
      default: "Pending",
    },
    inspection: {
      isApproved: { type: Boolean, default: false },
      approvedBy: { type: String },
      notes: { type: String },
    },
    attachments: [
      {
        url: { type: String },
        type: {
          type: String,
          enum: ["Before", "During", "After"],
        },
      },
    ],
    progressLogs: [
      {
        updatedBy: { type: String },
        date: { type: Date, default: Date.now },
        addedQuantity: { type: Number },
        note: { type: String },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Indexes to improve query performance
todoSchema.index({ user: 1, status: 1 });
todoSchema.index({ "timeline.expectedEndDate": 1 });

const Todo = mongoose.model("Todo", todoSchema);

module.exports = Todo;
