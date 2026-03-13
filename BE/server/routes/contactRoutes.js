import express from "express";
import parseContactPayload from "../middleware/parseContactPayload.js";
import { uploadContactPhoto } from "../middleware/uploadContactPhoto.js";
import validateCreateContact from "../middleware/validateCreateContact.js";
import {
  createContact,
  getContactById,
  getContacts,
  searchContacts,
  updateContact,
} from "../controllers/contactController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

// Enforce authentication middleware for every contact API in this router.
router.use(protect);

router.get("/", getContacts);
router.get("/search", searchContacts);
router.get("/:id", getContactById);
router.put("/:id", uploadContactPhoto, parseContactPayload, updateContact);
router.post(
  "/",
  uploadContactPhoto,
  parseContactPayload,
  validateCreateContact,
  createContact,
);

export default router;
