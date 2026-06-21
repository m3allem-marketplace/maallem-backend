const mongoose = require("mongoose");

const workerProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    avatar: { type: String, default: "" },
    bio: { type: String, trim: true, maxlength: 2000, default: "" },
    experience: { type: String, trim: true, maxlength: 1000, default: "" },
    specializations: [{ type: String, trim: true }],
    location: {
      address: { type: String, trim: true, default: "" },
      city: { type: String, trim: true, default: "" },
      coordinates: {
        type: {
          type: String,
          enum: ["Point"],
          default: "Point",
        },
        coordinates: {
          type: [Number], // [longitude, latitude]
          default: undefined,
        },
      },
    },
    phone: { type: String, trim: true, default: "" },
    portfolioImages: [{ type: String }],
    isProfileComplete: { type: Boolean, default: false },
    isApproved: { type: Boolean, default: false },
  },
  { timestamps: true },
);

workerProfileSchema.index({ "location.city": 1 });
workerProfileSchema.index({ specializations: 1 });
workerProfileSchema.index({ "location.coordinates": "2dsphere" }); // للبحث الجغرافي

workerProfileSchema.methods.checkComplete = function () {
  return Boolean(
    this.avatar &&
      this.bio &&
      this.experience &&
      this.specializations?.length &&
      (this.location?.city || this.location?.address) &&
      this.phone,
  );
};

workerProfileSchema.pre("save", function () {
  this.isProfileComplete = this.checkComplete();
});

const WorkerProfile = mongoose.model("Worker", workerProfileSchema);

module.exports = WorkerProfile;