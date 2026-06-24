const User = require("../auth/auth.model");
const WorkerProfile = require("./worker.model");
const CompanyProfile = require("./company.model");
const Review = require("../reviews/reviews.model");
const {
  uploadFile,
  uploadMany,
  deleteByUrl,
  deleteManyByUrl,
  requireCloudinary,
} = require("../../utils/cloudinaryUpload");
const {
  parseArrayField,
  normalizeLocation,
} = require("./profiles.validation");

const USER_PUBLIC_FIELDS = "name email role";

const assertRole = (userRole, expected) => {
  if (userRole !== expected) {
    const error = new Error(`This action is only for ${expected} accounts`);
    error.statusCode = 403;
    throw error;
  }
};

const getProfileByUser = async (userId, role) => {
  if (role === "worker") {
    const profile = await WorkerProfile.findOne({ user: userId })
      .populate("user", USER_PUBLIC_FIELDS)
      .lean();
      
    if (profile) {
      const reviews = await Review.find({ reviewee: userId, isHidden: false })
        .populate("reviewer", "name avatar role")
        .sort("-createdAt")
        .limit(10);
      profile.recentReviews = reviews;
    }
    
    return profile;
  }
  if (role === "company") {
    return CompanyProfile.findOne({ user: userId }).populate(
      "user",
      USER_PUBLIC_FIELDS,
    );
  }
  const error = new Error("Invalid profile type");
  error.statusCode = 400;
  throw error;
};

// ─── Worker (public read) ─────────────────────────────────────────────────────

const listWorkers = async (query = {}) => {
  const filter = {};
  if (query.city) filter["location.city"] = new RegExp(query.city, "i");
  if (query.specialization) {
    filter.specializations = new RegExp(query.specialization, "i");
  }

  // البحث بالقرب لو الـ client بعت lat/lng
  if (query.lat && query.lng) {
    filter["location.coordinates"] = {
      $near: {
        $geometry: {
          type: "Point",
          coordinates: [parseFloat(query.lng), parseFloat(query.lat)],
        },
        $maxDistance: parseInt(query.radius) || 10000, // default 10km
      },
    };
  }

  return WorkerProfile.find(filter)
    .populate("user", USER_PUBLIC_FIELDS)
    .sort({ createdAt: -1 });
};

const getWorkerById = async (id) => {
  const profile = await WorkerProfile.findById(id).populate(
    "user",
    USER_PUBLIC_FIELDS,
  ).lean();
  
  if (!profile) {
    const error = new Error("Worker profile not found");
    error.statusCode = 404;
    throw error;
  }

  // Fetch recent reviews
  const reviews = await Review.find({ reviewee: profile.user._id, isHidden: false })
    .populate("reviewer", "name avatar role")
    .sort("-createdAt")
    .limit(10);
    
  profile.recentReviews = reviews;

  return profile;
};

const createWorkerProfile = async (userId, body, files) => {
  const user = await User.findById(userId);
  assertRole(user?.role, "worker");

  const existing = await WorkerProfile.findOne({ user: userId });
  if (existing) {
    const error = new Error("Worker profile already exists. Use update instead.");
    error.statusCode = 409;
    throw error;
  }

  requireCloudinary();
  const idCard = files?.idCard?.[0]
    ? await uploadFile(files.idCard[0], "workers/idcards")
    : null;

  if (!idCard) {
    const error = new Error("ID card is required to create a worker profile");
    error.statusCode = 400;
    throw error;
  }

  const avatar = files?.avatar?.[0]
    ? await uploadFile(files.avatar[0], "workers/avatars")
    : "";
  const portfolioImages = await uploadMany(
    files?.portfolioImages,
    "workers/portfolio",
  );

  const profile = await WorkerProfile.create({
    user: userId,
    avatar,
    bio: body.bio || "",
    experience: body.experience || "",
    specializations: parseArrayField(body.specializations) || [],
    location: normalizeLocation(body.location) || { address: "", city: "" },
    phone: body.phone || "",
    knownWorkerName: body.knownWorkerName || "",
    idCard,
    portfolioImages,
  });

  await User.findByIdAndUpdate(userId, { workerProfile: profile._id });
  return profile.populate("user", USER_PUBLIC_FIELDS);
};

const updateWorkerProfile = async (userId, body, files) => {
  const profile = await WorkerProfile.findOne({ user: userId });
  if (!profile) {
    const error = new Error("Worker profile not found. Create one first.");
    error.statusCode = 404;
    throw error;
  }

  if (files?.avatar?.[0]) {
    requireCloudinary();
    if (profile.avatar) await deleteByUrl(profile.avatar);
    profile.avatar = await uploadFile(files.avatar[0], "workers/avatars");
  }

  if (files?.idCard?.[0]) {
    requireCloudinary();
    if (profile.idCard) await deleteByUrl(profile.idCard);
    profile.idCard = await uploadFile(files.idCard[0], "workers/idcards");
  }

  if (files?.portfolioImages?.length) {
    requireCloudinary();
    const newImages = await uploadMany(
      files.portfolioImages,
      "workers/portfolio",
    );
    profile.portfolioImages.push(...newImages);
  }

  const toRemove = parseArrayField(body.removePortfolioImages);
  if (toRemove?.length) {
    profile.portfolioImages = profile.portfolioImages.filter(
      (url) => !toRemove.includes(url),
    );
    await deleteManyByUrl(toRemove);
  }

  if (body.bio !== undefined) profile.bio = body.bio;
  if (body.experience !== undefined) profile.experience = body.experience;
  if (body.specializations !== undefined) {
    profile.specializations = parseArrayField(body.specializations) || [];
  }
  if (body.location !== undefined) {
    profile.location = normalizeLocation(body.location);
  }
  if (body.phone !== undefined) profile.phone = body.phone;
  if (body.knownWorkerName !== undefined) profile.knownWorkerName = body.knownWorkerName;

  await profile.save();
  return profile.populate("user", USER_PUBLIC_FIELDS);
};

const deleteWorkerProfile = async (userId) => {
  const profile = await WorkerProfile.findOne({ user: userId });
  if (!profile) {
    const error = new Error("Worker profile not found");
    error.statusCode = 404;
    throw error;
  }

  if (profile.avatar) await deleteByUrl(profile.avatar);
  if (profile.idCard) await deleteByUrl(profile.idCard);
  if (profile.portfolioImages?.length) {
    await deleteManyByUrl(profile.portfolioImages);
  }

  await WorkerProfile.findByIdAndDelete(profile._id);
  await User.findByIdAndUpdate(userId, { $unset: { workerProfile: 1 } });
};

// ─── Company (public read) ────────────────────────────────────────────────────

const listCompanies = async (query = {}) => {
  const filter = {};
  if (query.city) filter["location.city"] = new RegExp(query.city, "i");
  if (query.name) filter.companyName = new RegExp(query.name, "i");

  return CompanyProfile.find(filter)
    .populate("user", USER_PUBLIC_FIELDS)
    .sort({ createdAt: -1 });
};

const getCompanyById = async (id) => {
  const profile = await CompanyProfile.findById(id).populate(
    "user",
    USER_PUBLIC_FIELDS,
  );
  if (!profile) {
    const error = new Error("Company profile not found");
    error.statusCode = 404;
    throw error;
  }
  return profile;
};

const createCompanyProfile = async (userId, body, files) => {
  const user = await User.findById(userId);
  assertRole(user?.role, "company");

  const existing = await CompanyProfile.findOne({ user: userId });
  if (existing) {
    const error = new Error(
      "Company profile already exists. Use update instead.",
    );
    error.statusCode = 409;
    throw error;
  }

  requireCloudinary();
  const logo = files?.logo?.[0]
    ? await uploadFile(files.logo[0], "companies/logos")
    : "";
  const projectImages = await uploadMany(
    files?.projectImages,
    "companies/projects",
  );

  const profile = await CompanyProfile.create({
    user: userId,
    logo,
    companyName: body.companyName || user.name,
    bio: body.bio || "",
    employeeCount: Number(body.employeeCount) || 0,
    location: normalizeLocation(body.location) || { address: "", city: "" },
    contactPhones: parseArrayField(body.contactPhones) || [],
    projectImages,
  });

  await User.findByIdAndUpdate(userId, { companyProfile: profile._id });
  return profile.populate("user", USER_PUBLIC_FIELDS);
};

const updateCompanyProfile = async (userId, body, files) => {
  const profile = await CompanyProfile.findOne({ user: userId });
  if (!profile) {
    const error = new Error("Company profile not found. Create one first.");
    error.statusCode = 404;
    throw error;
  }

  if (files?.logo?.[0]) {
    requireCloudinary();
    if (profile.logo) await deleteByUrl(profile.logo);
    profile.logo = await uploadFile(files.logo[0], "companies/logos");
  }

  if (files?.projectImages?.length) {
    requireCloudinary();
    const newImages = await uploadMany(
      files.projectImages,
      "companies/projects",
    );
    profile.projectImages.push(...newImages);
  }

  const toRemove = parseArrayField(body.removeProjectImages);
  if (toRemove?.length) {
    profile.projectImages = profile.projectImages.filter(
      (url) => !toRemove.includes(url),
    );
    await deleteManyByUrl(toRemove);
  }

  if (body.companyName !== undefined) profile.companyName = body.companyName;
  if (body.bio !== undefined) profile.bio = body.bio;
  if (body.employeeCount !== undefined) {
    profile.employeeCount = Number(body.employeeCount);
  }
  if (body.location !== undefined) {
    profile.location = normalizeLocation(body.location);
  }
  if (body.contactPhones !== undefined) {
    profile.contactPhones = parseArrayField(body.contactPhones) || [];
  }

  await profile.save();
  return profile.populate("user", USER_PUBLIC_FIELDS);
};

const deleteCompanyProfile = async (userId) => {
  const profile = await CompanyProfile.findOne({ user: userId });
  if (!profile) {
    const error = new Error("Company profile not found");
    error.statusCode = 404;
    throw error;
  }

  if (profile.logo) await deleteByUrl(profile.logo);
  if (profile.projectImages?.length) {
    await deleteManyByUrl(profile.projectImages);
  }

  await CompanyProfile.findByIdAndDelete(profile._id);
  await User.findByIdAndUpdate(userId, { $unset: { companyProfile: 1 } });
};

module.exports = {
  getProfileByUser,
  listWorkers,
  getWorkerById,
  createWorkerProfile,
  updateWorkerProfile,
  deleteWorkerProfile,
  listCompanies,
  getCompanyById,
  createCompanyProfile,
  updateCompanyProfile,
  deleteCompanyProfile,
};
