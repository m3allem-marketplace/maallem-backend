const mongoose = require("mongoose");

const materialPriceSchema = new mongoose.Schema(
  {
    sku: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    unit: {
      type: String,
      required: true,
      trim: true,
    },
    baseUnitPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    handlingFeePerFloor: {
      type: Number,
      default: 0,
      min: 0,
    },
    category: {
      type: String,
      required: true,
      enum: [
        "demolition_alteration",
        "masonry_building",
        "painting",
        "plumbing",
        "electrical",
        "carpentry"
      ],
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { timestamps: true },
);

const aiEstimationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    serviceType: {
      type: String,
      required: true,
      enum: [
        "demolition_alteration",
        "masonry_building",
        "painting",
        "plumbing",
        "electrical",
        "carpentry"
      ],
    },
    description: {
      type: String,
      required: true,
    },
    extractedData: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    estimation: {
      type: mongoose.Schema.Types.Mixed,
      required: false,
      default: {},
    },
    boq: {
      type: mongoose.Schema.Types.Mixed,
      required: false,
      default: {},
    },
    result: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
  },
  { timestamps: true },
);

const MaterialPrice = mongoose.model("MaterialPrice", materialPriceSchema);
const AiEstimation = mongoose.model("AiEstimation", aiEstimationSchema);

module.exports = { MaterialPrice, AiEstimation };