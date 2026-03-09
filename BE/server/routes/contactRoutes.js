import express from "express";
import validateCreateContact from "../middleware/validateCreateContact.js";
import {
  createContact,
  getContacts,
  searchContacts,
} from "../controllers/contactController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

router.get("/", protect, getContacts);
router.get("/search", protect, searchContacts);
router.post("/", protect, validateCreateContact, createContact);

export default router;
