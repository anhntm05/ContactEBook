import path from "path";
import multer from "multer";
import {
  contactUploadDir,
  getStoredContactPhotoUrl,
} from "../utils/contactPhotoStorage.js";

const MAX_CONTACT_PHOTO_SIZE = 5 * 1024 * 1024;

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    callback(null, contactUploadDir);
  },
  filename: (_req, file, callback) => {
    const extension = path.extname(file.originalname || "").toLowerCase();
    const safeBaseName = (path.basename(file.originalname, extension) || "photo")
      .replace(/[^a-zA-Z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40);

    callback(
      null,
      `${Date.now()}-${Math.round(Math.random() * 1e9)}-${
        safeBaseName || "photo"
      }${extension}`,
    );
  },
});

const fileFilter = (_req, file, callback) => {
  if (file.mimetype?.startsWith("image/")) {
    callback(null, true);
    return;
  }

  const error = new Error("Contact photo must be an image file.");
  error.statusCode = 400;
  callback(error);
};

const multerInstance = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_CONTACT_PHOTO_SIZE,
  },
});

const uploadContactPhoto = multerInstance.single("photo");

const getUploadedPhotoUrl = (file) =>
  file?.filename ? getStoredContactPhotoUrl(file.filename) : "";

export {
  MAX_CONTACT_PHOTO_SIZE,
  getUploadedPhotoUrl,
  uploadContactPhoto,
};
