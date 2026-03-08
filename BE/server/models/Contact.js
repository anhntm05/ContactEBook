import mongoose from "mongoose";

const phoneSchema = new mongoose.Schema(
  {
    label: {
      type: String,
      trim: true,
      default: "mobile",
    },
    value: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
    },
    isPrimary: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

const emailSchema = new mongoose.Schema(
  {
    label: {
      type: String,
      trim: true,
      default: "personal",
    },
    value: {
      type: String,
      required: [true, "Email address is required"],
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Please add a valid email"],
    },
    isPrimary: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

const addressSchema = new mongoose.Schema(
  {
    label: { type: String, trim: true, default: "home" },
    street: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    postalCode: { type: String, trim: true },
    country: { type: String, trim: true },
  },
  { _id: false }
);

const socialLinkSchema = new mongoose.Schema(
  {
    platform: {
      type: String,
      trim: true,
      required: [true, "Social platform is required"],
    },
    url: {
      type: String,
      trim: true,
      required: [true, "Social profile URL is required"],
    },
  },
  { _id: false }
);

const ContactSchema = new mongoose.Schema(
  {
    displayName: { type: String, required: [true, "Display name is required"], trim: true },
    firstName: { type: String, trim: true },
    lastName: { type: String, trim: true },
    middleName: { type: String, trim: true },
    nickname: { type: String, trim: true },
    photoUrl: { type: String, trim: true },
    phones: { type: [phoneSchema], default: [] },
    emails: { type: [emailSchema], default: [] },
    company: { type: String, trim: true },
    jobTitle: { type: String, trim: true },
    department: { type: String, trim: true },
    addresses: { type: [addressSchema], default: [] },
    website: { type: String, trim: true },
    socialLinks: { type: [socialLinkSchema], default: [] },
    birthday: { type: Date },
    notes: { type: String, trim: true },
    tags: { type: [String], default: [] },
    groupIds: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Group" }],
      default: [],
    },
    favorite: { type: Boolean, default: false },
    source: { type: String, trim: true, default: "manual" },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Created by user is required"],
    },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

ContactSchema.index({ createdBy: 1, displayName: 1 });
ContactSchema.index({ createdBy: 1, favorite: 1 });

const Contact = mongoose.model("Contact", ContactSchema);

export default Contact;
