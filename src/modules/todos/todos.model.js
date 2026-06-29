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
    status: {
      type: String,
      enum: ["pending", "scheduled", "completed"],
      default: "pending",
    },
    scheduledDate: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes to improve query performance
todoSchema.index({ user: 1, status: 1 });
todoSchema.index({ user: 1, scheduledDate: 1 });

const Todo = mongoose.model("Todo", todoSchema);

module.exports = Todo;
