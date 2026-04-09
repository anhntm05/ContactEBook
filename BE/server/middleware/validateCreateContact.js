const EMAIL_REGEX = /^\S+@\S+\.\S+$/;
const DISALLOWED_FIELDS = ["createdAt", "updatedAt", "deletedAt", "createdBy"];
const ALLOWED_FIELDS = new Set([
  "displayName",
  "firstName",
  "lastName",
  "middleName",
  "nickname",
  "photoUrl",
  "phones",
  "emails",
  "company",
  "jobTitle",
  "department",
  "addresses",
  "website",
  "socialLinks",
  "birthday",
  "notes",
  "tags",
  "groupIds",
  "favorite",
  "source",
]);

const isObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const isBlankString = (value) =>
  typeof value === "string" && value.trim().length === 0;

const trimStringDeep = (value) => {
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value)) return value.map(trimStringDeep);

  if (isObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, trimStringDeep(item)])
    );
  }

  return value;
};

const isValidObjectId = (value) =>
  typeof value === "string" && /^[a-fA-F0-9]{24}$/.test(value);

const addError = (errors, message) => errors.push(message);

const hasAtLeastOneContactMethod = (phones = [], emails = []) => {
  const hasPhone =
    Array.isArray(phones) &&
    phones.some((phone) => isObject(phone) && typeof phone.value === "string" && phone.value.trim());

  const hasEmail =
    Array.isArray(emails) &&
    emails.some((email) => isObject(email) && typeof email.value === "string" && email.value.trim());

  return hasPhone || hasEmail;
};

const normalizeOptionalString = (value) =>
  typeof value === "string" ? value.trim() : "";

const normalizePhoneEntries = (phones) => {
  if (!Array.isArray(phones)) return [];

  return phones
    .filter(isObject)
    .map((phone) => ({
      label: normalizeOptionalString(phone.label) || "mobile",
      value: normalizeOptionalString(phone.value || phone.number),
      isPrimary: !!phone.isPrimary,
    }))
    .filter((phone) => phone.value);
};

const normalizeEmailEntries = (emails) => {
  if (!Array.isArray(emails)) return [];

  return emails
    .filter(isObject)
    .map((email) => ({
      label: normalizeOptionalString(email.label) || "personal",
      value: normalizeOptionalString(email.value || email.email).toLowerCase(),
      isPrimary: !!email.isPrimary,
    }))
    .filter((email) => EMAIL_REGEX.test(email.value));
};

const normalizeAddressEntries = (addresses) => {
  if (!Array.isArray(addresses)) return [];

  return addresses
    .filter(isObject)
    .map((address) => ({
      label: normalizeOptionalString(address.label) || "home",
      fullAddress: normalizeOptionalString(address.fullAddress),
      postalCode: normalizeOptionalString(address.postalCode),
    }))
    .filter((address) => address.fullAddress || address.postalCode);
};

const normalizeSocialLinks = (socialLinks) => {
  if (!Array.isArray(socialLinks)) return [];

  return socialLinks
    .filter(isObject)
    .map((item) => ({
      platform: normalizeOptionalString(item.platform),
      url: normalizeOptionalString(item.url),
    }))
    .filter((item) => item.platform && item.url);
};

const normalizeTags = (tags) => {
  if (Array.isArray(tags)) {
    return tags.filter((tag) => typeof tag === "string" && !isBlankString(tag));
  }

  if (typeof tags === "string" && !isBlankString(tags)) {
    return tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
  }

  return [];
};

const normalizeGroupIds = (groupIds) => {
  if (!Array.isArray(groupIds)) return [];
  return groupIds.filter(isValidObjectId);
};

const validateCreateContact = (req, res, next) => {
  const payload = trimStringDeep(req.body || {});
  const errors = [];

  req.body = payload;

  DISALLOWED_FIELDS.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(payload, field)) {
      addError(errors, `${field} cannot be set manually`);
    }
  });

  Object.keys(payload).forEach((field) => {
    if (!ALLOWED_FIELDS.has(field)) {
      addError(errors, `${field} is not allowed`);
    }
  });

  if (
    payload.displayName === undefined ||
    payload.displayName === null ||
    isBlankString(payload.displayName)
  ) {
    addError(errors, "displayName is required");
  } else if (typeof payload.displayName !== "string") {
    addError(errors, "displayName must be a string");
  }

  if ("photoUrl" in payload) {
    payload.photoUrl = normalizeOptionalString(payload.photoUrl);
  }

  if ("website" in payload) {
    payload.website = normalizeOptionalString(payload.website);
  }

  if ("phones" in payload) {
    payload.phones = normalizePhoneEntries(payload.phones);
  }

  if ("emails" in payload) {
    payload.emails = normalizeEmailEntries(payload.emails);
  }

  if ("addresses" in payload) {
    payload.addresses = normalizeAddressEntries(payload.addresses);
  }

  if ("socialLinks" in payload) {
    payload.socialLinks = normalizeSocialLinks(payload.socialLinks);
  }

  if ("tags" in payload) {
    payload.tags = normalizeTags(payload.tags);
  }

  if ("groupIds" in payload) {
    payload.groupIds = normalizeGroupIds(payload.groupIds);
  }

  if ("favorite" in payload) {
    payload.favorite = !!payload.favorite;
  }

  if ("birthday" in payload) {
    if (!payload.birthday) {
      delete payload.birthday;
    } else {
      const date = new Date(payload.birthday);
      if (Number.isNaN(date.getTime())) {
        delete payload.birthday;
      } else {
        payload.birthday = date;
      }
    }
  }

  if (!hasAtLeastOneContactMethod(payload.phones, payload.emails)) {
    addError(
      errors,
      "At least one contact method is required: provide at least one phone number or one email"
    );
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors,
    });
  }

  req.validatedContactData = payload;
  return next();
};

export default validateCreateContact;
export { trimStringDeep, isBlankString };
