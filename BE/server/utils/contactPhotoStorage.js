import fs from "fs";
import fsPromises from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const backendRootDir = path.resolve(currentDir, "..", "..");

const uploadsRootDir = path.join(backendRootDir, "uploads");
const contactUploadDir = path.join(uploadsRootDir, "contacts");
const CONTACT_PHOTO_PUBLIC_BASE = "/uploads/contacts";

fs.mkdirSync(contactUploadDir, { recursive: true });

const isAbsoluteAssetUrl = (value = "") =>
  /^(?:https?:|data:|blob:)/i.test(value);

const normalizeStoredRelativePath = (photoUrl = "") => {
  if (typeof photoUrl !== "string" || !photoUrl.startsWith("/")) {
    return "";
  }

  return photoUrl.replace(/^\/+/, "").replace(/\//g, path.sep);
};

export const getStoredContactPhotoUrl = (fileName = "") =>
  `${CONTACT_PHOTO_PUBLIC_BASE}/${fileName}`;

export const isStoredContactPhoto = (photoUrl = "") =>
  typeof photoUrl === "string" &&
  photoUrl.startsWith(`${CONTACT_PHOTO_PUBLIC_BASE}/`);

export const resolveContactPhotoUrl = (req, photoUrl = "") => {
  if (!photoUrl) return "";
  if (isAbsoluteAssetUrl(photoUrl)) return photoUrl;
  if (!photoUrl.startsWith("/")) return photoUrl;

  const origin = `${req.protocol}://${req.get("host")}`;
  return new URL(photoUrl, origin).toString();
};

export const deleteStoredContactPhoto = async (photoUrl = "") => {
  if (!isStoredContactPhoto(photoUrl)) return;

  const relativePath = normalizeStoredRelativePath(photoUrl);
  const absolutePath = path.resolve(backendRootDir, relativePath);
  const relativeToUploadDir = path.relative(contactUploadDir, absolutePath);

  if (
    relativeToUploadDir.startsWith("..") ||
    path.isAbsolute(relativeToUploadDir)
  ) {
    return;
  }

  try {
    await fsPromises.unlink(absolutePath);
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }
};

export { CONTACT_PHOTO_PUBLIC_BASE, contactUploadDir, uploadsRootDir };
