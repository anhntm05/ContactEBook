import express from "express";
import validateCreateContact from "../middleware/validateCreateContact.js";
import { createContact } from "../controllers/contactController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

router.post("/", protect, validateCreateContact, createContact);

export default router;
