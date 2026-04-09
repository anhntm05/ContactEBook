import fs from "fs";
import fsPromises from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

// Resolve stable filesystem paths relative to this utility file so uploads work
// regardless of the process working directory.
const currentDir = path.dirname(fileURLToPath(import.meta.url));
const backendRootDir = path.resolve(currentDir, "..", "..");

// Keep upload storage paths and the public URL base in one place.
const uploadsRootDir = path.join(backendRootDir, "uploads");
const contactUploadDir = path.join(uploadsRootDir, "contacts");
const CONTACT_PHOTO_PUBLIC_BASE = "/uploads/contacts";

// Ensure the contact photo directory exists before upload code tries to write into it.
fs.mkdirSync(contactUploadDir, { recursive: true });

// Treat fully qualified URLs and browser-generated asset URLs as already usable.
const isAbsoluteAssetUrl = (value = "") =>
  /^(?:https?:|data:|blob:)/i.test(value);

// Convert a stored public URL like "/uploads/contacts/a.png" into a safe
// filesystem-relative path using the current OS path separator.
const normalizeStoredRelativePath = (photoUrl = "") => {
  if (typeof photoUrl !== "string" || !photoUrl.startsWith("/")) {
    return "";
  }

  return photoUrl.replace(/^\/+/, "").replace(/\//g, path.sep);
};

// Build the public URL that gets stored in the database after an upload succeeds.
export const getStoredContactPhotoUrl = (fileName = "") =>
  `${CONTACT_PHOTO_PUBLIC_BASE}/${fileName}`;

// Identify photos that are managed by this backend so delete logic only touches
// files inside the app's own upload directory.
export const isStoredContactPhoto = (photoUrl = "") =>
  typeof photoUrl === "string" &&
  photoUrl.startsWith(`${CONTACT_PHOTO_PUBLIC_BASE}/`);

// Convert stored relative asset URLs into absolute URLs for API responses, while
// leaving external URLs or data/blob URLs unchanged.
export const resolveContactPhotoUrl = (req, photoUrl = "") => {
  if (!photoUrl) return "";
  if (isAbsoluteAssetUrl(photoUrl)) return photoUrl;
  if (!photoUrl.startsWith("/")) return photoUrl;

  const origin = `${req.protocol}://${req.get("host")}`;
  return new URL(photoUrl, origin).toString();
};

// Delete a previously stored contact photo, but only if the resolved file still
// stays inside the expected contact upload directory.
export const deleteStoredContactPhoto = async (photoUrl = "") => {
  if (!isStoredContactPhoto(photoUrl)) return;

  const relativePath = normalizeStoredRelativePath(photoUrl);
  const absolutePath = path.resolve(backendRootDir, relativePath);
  const relativeToUploadDir = path.relative(contactUploadDir, absolutePath);

  // Guard against path traversal or unexpected absolute paths before unlinking.
  if (
    relativeToUploadDir.startsWith("..") ||
    path.isAbsolute(relativeToUploadDir)
  ) {
    return;
  }

  try {
    await fsPromises.unlink(absolutePath);
  } catch (error) {
    // Missing files are harmless here; anything else should still fail loudly.
    if (error.code !== "ENOENT") {
      throw error;
    }
  }
};

// Export shared constants for upload middleware and other contact-photo helpers.
export { CONTACT_PHOTO_PUBLIC_BASE, contactUploadDir, uploadsRootDir };
