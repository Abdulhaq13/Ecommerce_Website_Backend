import multer from "multer";
import path from "path";
import ApiError from "../utils/ApiError.js";
// Receive files from users.

// Store file temporarily on local disk before uploading to Cloudinary
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/temp");
  },
  //This decides what the uploaded file will be named.
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9); //This prevents duplicate names.
    cb(null, uniqueSuffix + path.extname(file.originalname)); //Gets the file extension.
  },
});

// Restrict to image files only
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new ApiError(400, "Only image files are allowed"), false);
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, //5MB max
  },
});
