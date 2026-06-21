const multer = require("multer");
const AppError = require("../utils/AppError");

const storage = multer.memoryStorage();

const imageFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new AppError("Only image files are allowed", 400), false);
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: imageFilter,
});

const workerUpload = upload.fields([
  { name: "avatar", maxCount: 1 },
  { name: "portfolioImages", maxCount: 10 },
  { name: "idCard", maxCount: 1 },
]);

const companyUpload = upload.fields([
  { name: "logo", maxCount: 1 },
  { name: "projectImages", maxCount: 10 },
]);

module.exports = { upload, workerUpload, companyUpload };
