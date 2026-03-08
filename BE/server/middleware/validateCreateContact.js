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

const isValidUrl = (value) => {
  if (typeof value !== "string" || value.length === 0) return false;

  try {
    const parsed = new URL(value);
    return ["http:", "https:"].includes(parsed.protocol);
  } catch {
    return false;
  }
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

const validatePhoneEntries = (phones, errors) => {
  if (phones === undefined) return;

  if (!Array.isArray(phones)) {
    addError(errors, "phones must be an array when provided");
    return;
  }

  phones.forEach((phone, index) => {
    if (!isObject(phone)) {
      addError(errors, `phones[${index}] must be an object`);
      return;
    }

    if (phone.value === undefined || phone.value === null || isBlankString(phone.value)) {
      addError(errors, `phones[${index}].value is required`);
    } else if (typeof phone.value !== "string") {
      addError(errors, `phones[${index}].value must be a string`);
    }

    if (phone.label !== undefined && phone.label !== null && typeof phone.label !== "string") {
      addError(errors, `phones[${index}].label must be a string`);
    }

    if (phone.isPrimary !== undefined && typeof phone.isPrimary !== "boolean") {
      addError(errors, `phones[${index}].isPrimary must be a boolean`);
    }
  });
};

const validateEmailEntries = (emails, errors) => {
  if (emails === undefined) return;

  if (!Array.isArray(emails)) {
    addError(errors, "emails must be an array when provided");
    return;
  }

  emails.forEach((email, index) => {
    if (!isObject(email)) {
      addError(errors, `emails[${index}] must be an object`);
      return;
    }

    if (email.value === undefined || email.value === null || isBlankString(email.value)) {
      addError(errors, `emails[${index}].value is required`);
    } else if (typeof email.value !== "string") {
      addError(errors, `emails[${index}].value must be a string`);
    } else if (!EMAIL_REGEX.test(email.value)) {
      addError(errors, `emails[${index}].value must be a valid email`);
    }

    if (email.label !== undefined && email.label !== null && typeof email.label !== "string") {
      addError(errors, `emails[${index}].label must be a string`);
    }

    if (email.isPrimary !== undefined && typeof email.isPrimary !== "boolean") {
      addError(errors, `emails[${index}].isPrimary must be a boolean`);
    }
  });
};

const validateSocialLinks = (socialLinks, errors) => {
  if (socialLinks === undefined) return;

  if (!Array.isArray(socialLinks)) {
    addError(errors, "socialLinks must be an array when provided");
    return;
  }

  socialLinks.forEach((item, index) => {
    if (!isObject(item)) {
      addError(errors, `socialLinks[${index}] must be an object`);
      return;
    }

    if (item.platform !== undefined && item.platform !== null && typeof item.platform !== "string") {
      addError(errors, `socialLinks[${index}].platform must be a string`);
    }

    if (item.url !== undefined && item.url !== null) {
      if (typeof item.url !== "string" || !isValidUrl(item.url)) {
        addError(errors, `socialLinks[${index}].url must be a valid URL`);
      }
    }
  });
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

  if (payload.photoUrl !== undefined && payload.photoUrl !== null) {
    if (typeof payload.photoUrl !== "string" || !isValidUrl(payload.photoUrl)) {
      addError(errors, "photoUrl must be a valid URL");
    }
  }

  if (payload.website !== undefined && payload.website !== null) {
    if (typeof payload.website !== "string" || !isValidUrl(payload.website)) {
      addError(errors, "website must be a valid URL");
    }
  }

  validatePhoneEntries(payload.phones, errors);
  validateEmailEntries(payload.emails, errors);
  validateSocialLinks(payload.socialLinks, errors);

  if (payload.tags !== undefined && !Array.isArray(payload.tags)) {
    addError(errors, "tags must be an array when provided");
  }

  if (Array.isArray(payload.tags)) {
    payload.tags.forEach((tag, index) => {
      if (typeof tag !== "string" || isBlankString(tag)) {
        addError(errors, `tags[${index}] must be a non-empty string`);
      }
    });
  }

  if (payload.groupIds !== undefined && !Array.isArray(payload.groupIds)) {
    addError(errors, "groupIds must be an array when provided");
  }

  if (Array.isArray(payload.groupIds)) {
    payload.groupIds.forEach((groupId, index) => {
      if (!isValidObjectId(groupId)) {
        addError(errors, `groupIds[${index}] must be a valid ObjectId string`);
      }
    });
  }

  if (payload.favorite !== undefined && typeof payload.favorite !== "boolean") {
    addError(errors, "favorite must be a boolean when provided");
  }

  if (payload.birthday !== undefined && payload.birthday !== null) {
    const date = new Date(payload.birthday);

    if (Number.isNaN(date.getTime())) {
      addError(errors, "birthday must be a valid date");
    } else {
      payload.birthday = date;
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
export { trimStringDeep, isBlankString, isValidUrl };
