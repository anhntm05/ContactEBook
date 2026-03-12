import Contact from "../models/Contact.js";

// Projection fields for contact list and search endpoints to optimize query performance.
const CONTACT_LIST_PROJECTION = [
  "_id",
  "displayName",
  "firstName",
  "lastName",
  "middleName",
  "nickname",
  "company",
  "jobTitle",
  "department",
  "phones",
  "emails",
  "addresses",
  "website",
  "socialLinks",
  "birthday",
  "tags",
  "favorite",
  "photoUrl",
  "notes",
  "createdAt",
  "updatedAt",
].join(" ");

// Escapes user input so it can be safely used in a RegExp pattern.
const escapeRegex = (value = "") =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Normalizes phone entries and provides both FE-compatible "value" and "number" keys.
const normalizePhones = (phones = []) =>
  (Array.isArray(phones) ? phones : [])
    .map((phone) => ({
      label: phone?.label || "mobile",
      value: phone?.value || "",
      number: phone?.value || "",
      isPrimary: !!phone?.isPrimary,
    }))
    .filter((phone) => phone.value);

// Normalizes email entries and provides both FE-compatible "value" and "email" keys.
const normalizeEmails = (emails = []) =>
  (Array.isArray(emails) ? emails : [])
    .map((email) => ({
      label: email?.label || "personal",
      value: email?.value || "",
      email: email?.value || "",
      isPrimary: !!email?.isPrimary,
    }))
    .filter((email) => email.value);

// Maps a contact document to a response shape used by dashboard/contact list UIs.
const toListItem = (contact) => {
  const phones = normalizePhones(contact?.phones);
  const emails = normalizeEmails(contact?.emails);

  const primaryPhone =
    phones.find((phone) => phone.isPrimary)?.number || phones[0]?.number || "";

  const primaryEmail =
    emails.find((email) => email.isPrimary)?.email || emails[0]?.email || "";

  const name =
    contact?.displayName ||
    [contact?.firstName, contact?.lastName].filter(Boolean).join(" ") ||
    "Unnamed Contact";

  return {
    _id: contact._id,
    id: contact._id,
    name,
    displayName: name,
    firstName: contact?.firstName || "",
    lastName: contact?.lastName || "",
    middleName: contact?.middleName || "",
    nickname: contact?.nickname || "",
    company: contact?.company || "",
    jobTitle: contact?.jobTitle || "",
    department: contact?.department || "",
    phone: primaryPhone,
    email: primaryEmail,
    phones,
    phoneNumbers: phones.map((phone) => ({
      number: phone.number,
      label: phone.label,
      isPrimary: phone.isPrimary,
    })),
    emails,
    tags: Array.isArray(contact?.tags) ? contact.tags : [],
    favorite: !!contact?.favorite,
    photoUrl: contact?.photoUrl || "",
    addresses: Array.isArray(contact?.addresses) ? contact.addresses : [],
    website: contact?.website || "",
    socialLinks: Array.isArray(contact?.socialLinks) ? contact.socialLinks : [],
    birthday: contact?.birthday || null,
    notes: contact?.notes || "",
    createdAt: contact?.createdAt || null,
    updatedAt: contact?.updatedAt || null,
  };
};

// Converts requested sort mode into a MongoDB sort object for search endpoint.
const resolveSearchSort = (sortBy = "name_asc") => {
  switch ((sortBy || "").toLowerCase()) {
    case "name_desc":
    case "name-desc":
      return { displayName: -1, createdAt: -1 };
    case "recent":
    case "recently_added":
    case "recent-added":
      return { createdAt: -1, _id: -1 };
    case "company":
      return { company: 1, displayName: 1, createdAt: -1 };
    case "name_asc":
    case "name-asc":
    default:
      return { displayName: 1, createdAt: -1 };
  }
};

// Returns all current-user contacts sorted by created time (newest first).
const getContacts = async (req, res) => {
  try {
    const createdBy = req?.user?._id;

    if (!createdBy) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: user context is required",
      });
    }

    const contacts = await Contact.find({
      createdBy,
      deletedAt: null,
    })
      .select(CONTACT_LIST_PROJECTION)
      .sort({ createdAt: -1, _id: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: contacts.map(toListItem),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch contacts",
      error: error.message,
    });
  }
};

// Searches current-user contacts across name/phone/email/company with selectable sorting.
const searchContacts = async (req, res) => {
  try {
    const createdBy = req?.user?._id;

    if (!createdBy) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: user context is required",
      });
    }

    const searchTerm = `${req.query?.q || req.query?.query || ""}`.trim();
    const sortBy = `${req.query?.sortBy || req.query?.sort || "name_asc"}`.trim();

    const query = {
      createdBy,
      deletedAt: null,
    };

    if (searchTerm) {
      const regex = new RegExp(escapeRegex(searchTerm), "i");
      query.$or = [
        { displayName: regex },
        { firstName: regex },
        { lastName: regex },
        { company: regex },
        { phones: { $elemMatch: { value: regex } } },
        { emails: { $elemMatch: { value: regex } } },
      ];
    }

    const contacts = await Contact.find(query)
      .select(CONTACT_LIST_PROJECTION)
      .sort(resolveSearchSort(sortBy))
      .collation({ locale: "en", strength: 2 })
      .lean();

    return res.status(200).json({
      success: true,
      data: contacts.map(toListItem),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to search contacts",
      error: error.message,
    });
  }
};

const createContact = async (req, res) => {
  try {
    const createdBy = req?.user?.id;

    if (!createdBy) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: user context is required",
      });
    }

    const contactData = {
      ...req.validatedContactData,
      createdBy,
    };

    const contact = await Contact.create(contactData);

    return res.status(201).json({
      success: true,
      message: "Contact created successfully",
      data: contact,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to create contact",
      error: error.message,
    });
  }
};

export { createContact, getContacts, searchContacts };
