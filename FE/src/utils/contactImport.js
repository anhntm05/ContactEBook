import * as XLSX from "xlsx";

const EMAIL_REGEX = /^\S+@\S+\.\S+$/;

export const CONTACT_IMPORT_ACCEPT =
  ".csv,.xlsx,.xls,.vcf,text/csv,text/vcard,text/x-vcard,application/vcard,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const normalizeString = (value) => `${value ?? ""}`.trim();

const normalizeHeader = (value) =>
  normalizeString(value).toLowerCase().replace(/[^a-z0-9]+/g, "");

const isValidHttpUrl = (value) => {
  if (!value) return false;

  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
};

const isValidEmail = (value) => EMAIL_REGEX.test(normalizeString(value));

const dedupeBy = (items = [], keyBuilder) => {
  const seen = new Set();

  return items.filter((item) => {
    const key = keyBuilder(item);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const splitBySeparators = (value, separators) => {
  const normalizedValue = normalizeString(value);
  if (!normalizedValue) return [];

  const escapedSeparators = separators
    .map((separator) => separator.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("");

  return normalizedValue
    .split(new RegExp(`[${escapedSeparators}]`, "g"))
    .map((item) => item.trim())
    .filter(Boolean);
};

const splitListValues = (value) => {
  const normalizedValue = normalizeString(value);
  if (!normalizedValue) return [];

  return normalizedValue
    .split(/\r?\n|[|;]/)
    .map((item) => item.trim())
    .filter(Boolean);
};

const splitTags = (value) => splitBySeparators(value, [",", ";", "|"]);

const uniqueValues = (items = []) => [...new Set(items.filter(Boolean))];

const buildDisplayName = ({
  displayName,
  firstName,
  lastName,
  nickname,
  company,
  phones,
  emails,
}) =>
  normalizeString(displayName) ||
  [normalizeString(firstName), normalizeString(lastName)].filter(Boolean).join(" ") ||
  normalizeString(nickname) ||
  normalizeString(company) ||
  emails[0]?.value ||
  phones[0]?.value ||
  "";

const parseBoolean = (value) => {
  const normalizedValue = normalizeString(value).toLowerCase();
  if (!normalizedValue) return false;
  return ["true", "yes", "y", "1", "favorite", "starred"].includes(normalizedValue);
};

const parseBirthday = (value) => {
  if (value === undefined || value === null || value === "") return "";

  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) {
      const month = `${parsed.m}`.padStart(2, "0");
      const day = `${parsed.d}`.padStart(2, "0");
      return `${parsed.y}-${month}-${day}`;
    }
  }

  const normalizedValue = normalizeString(value);
  if (!normalizedValue) return "";

  if (/^\d{5,6}$/.test(normalizedValue)) {
    const parsed = XLSX.SSF.parse_date_code(Number(normalizedValue));
    if (parsed) {
      const month = `${parsed.m}`.padStart(2, "0");
      const day = `${parsed.d}`.padStart(2, "0");
      return `${parsed.y}-${month}-${day}`;
    }
  }

  if (/^\d{8}$/.test(normalizedValue)) {
    return `${normalizedValue.slice(0, 4)}-${normalizedValue.slice(4, 6)}-${normalizedValue.slice(6, 8)}`;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(normalizedValue)) {
    return normalizedValue;
  }

  if (/^\d{4}\/\d{2}\/\d{2}$/.test(normalizedValue)) {
    return normalizedValue.replaceAll("/", "-");
  }

  const parsedDate = new Date(normalizedValue);
  if (Number.isNaN(parsedDate.getTime())) return "";

  return parsedDate.toISOString().slice(0, 10);
};

const PHONE_FIELD_SPECS = [
  {
    valueAliases: [
      "primaryphone",
      "phone",
      "phonenumber",
      "mobile",
      "mobilephone",
      "telephone",
      "tel",
    ],
    labelAliases: ["phonelabel", "primaryphonelabel", "mobilelabel"],
    defaultLabel: "mobile",
  },
  {
    valueAliases: ["homephone", "homephonenumber"],
    labelAliases: ["homephonelabel"],
    defaultLabel: "home",
  },
  {
    valueAliases: ["workphone", "businessphone", "officephone"],
    labelAliases: ["workphonelabel", "businessphonelabel"],
    defaultLabel: "work",
  },
  {
    valueAliases: ["otherphone", "secondaryphone", "alternatephone"],
    labelAliases: ["otherphonelabel", "secondaryphonelabel"],
    defaultLabel: "other",
  },
];

const EMAIL_FIELD_SPECS = [
  {
    valueAliases: ["primaryemail", "email", "emailaddress", "mail"],
    labelAliases: ["emaillabel", "primaryemaillabel"],
    defaultLabel: "personal",
  },
  {
    valueAliases: ["workemail", "businessemail", "officeemail"],
    labelAliases: ["workemaillabel", "businessemaillabel"],
    defaultLabel: "work",
  },
  {
    valueAliases: ["homeemail", "personalemail"],
    labelAliases: ["homeemaillabel", "personalemaillabel"],
    defaultLabel: "personal",
  },
  {
    valueAliases: ["otheremail", "secondaryemail", "alternateemail"],
    labelAliases: ["otheremaillabel", "secondaryemaillabel"],
    defaultLabel: "other",
  },
];

const ADDRESS_FIELD_SPECS = [
  {
    valueAliases: ["address", "fulladdress", "streetaddress"],
    postalAliases: ["postalcode", "zipcode", "zip"],
    defaultLabel: "home",
  },
  {
    valueAliases: ["homeaddress", "homestreetaddress"],
    postalAliases: ["homepostalcode", "homezipcode", "homezip"],
    defaultLabel: "home",
  },
  {
    valueAliases: ["workaddress", "officeaddress", "businessaddress"],
    postalAliases: ["workpostalcode", "officepostalcode", "businesspostalcode"],
    defaultLabel: "work",
  },
];

const SOCIAL_FIELD_SPECS = [
  { valueAliases: ["linkedin", "linkedinurl", "linkedinprofile"], platform: "LinkedIn" },
  { valueAliases: ["facebook", "facebookurl", "facebookprofile"], platform: "Facebook" },
  { valueAliases: ["instagram", "instagramurl", "instagramprofile"], platform: "Instagram" },
  { valueAliases: ["twitter", "twitterurl", "twitterprofile", "xprofile"], platform: "X" },
  { valueAliases: ["github", "githuburl", "githubprofile"], platform: "GitHub" },
];

const parseSpreadsheetRow = (row = {}) => {
  const normalizedRow = Object.fromEntries(
    Object.entries(row).map(([key, value]) => [normalizeHeader(key), value]),
  );

  const readValue = (...aliases) => {
    const match = aliases.find((alias) => normalizedRow[alias] !== undefined);
    return match ? normalizedRow[match] : "";
  };

  const collectLabeledValues = (fieldSpecs, fallbackLabel, validator = () => true) =>
    dedupeBy(
      fieldSpecs.flatMap((fieldSpec) => {
        const label =
          normalizeString(readValue(...(fieldSpec.labelAliases || []))) ||
          fieldSpec.defaultLabel ||
          fallbackLabel;

        return uniqueValues(splitListValues(readValue(...fieldSpec.valueAliases)))
          .filter(validator)
          .map((value) => ({
            label,
            value,
          }));
      }),
      (item) => `${item.label.toLowerCase()}|${normalizeString(item.value).toLowerCase()}`,
    ).map((item, index) => ({
      ...item,
      isPrimary: index === 0,
    }));

  const collectAddresses = () =>
    dedupeBy(
      ADDRESS_FIELD_SPECS.map((fieldSpec) => ({
        label: fieldSpec.defaultLabel,
        fullAddress: normalizeString(readValue(...fieldSpec.valueAliases)),
        postalCode: normalizeString(readValue(...fieldSpec.postalAliases)),
      })).filter((item) => item.fullAddress || item.postalCode),
      (item) =>
        `${item.label.toLowerCase()}|${item.fullAddress.toLowerCase()}|${item.postalCode.toLowerCase()}`,
    );

  const collectSocialLinks = () =>
    dedupeBy(
      SOCIAL_FIELD_SPECS.flatMap((fieldSpec) =>
        uniqueValues(splitListValues(readValue(...fieldSpec.valueAliases)))
          .filter(isValidHttpUrl)
          .map((url) => ({
            platform: fieldSpec.platform,
            url,
          })),
      ),
      (item) => `${item.platform.toLowerCase()}|${item.url.toLowerCase()}`,
    );

  const firstName = normalizeString(readValue("firstname", "givenname"));
  const lastName = normalizeString(readValue("lastname", "surname", "familyname"));
  const middleName = normalizeString(readValue("middlename"));
  const nickname = normalizeString(readValue("nickname"));
  const displayName = normalizeString(
    readValue("displayname", "name", "fullname", "contactname", "fullnamedisplay"),
  );
  const phones = collectLabeledValues(PHONE_FIELD_SPECS, "mobile");
  const emails = collectLabeledValues(EMAIL_FIELD_SPECS, "personal", isValidEmail).map(
    (item) => ({
      ...item,
      value: item.value.toLowerCase(),
    }),
  );
  const website = normalizeString(readValue("website", "url", "web", "companywebsite"));
  const tags = uniqueValues(splitTags(readValue("tags", "categories")));

  return {
    displayName,
    firstName,
    lastName,
    middleName,
    nickname,
    photoUrl: normalizeString(readValue("photourl", "photo", "avatar", "imageurl")),
    company: normalizeString(readValue("company", "organization", "org", "businessname")),
    jobTitle: normalizeString(readValue("jobtitle", "title", "position", "role")),
    department: normalizeString(readValue("department", "team")),
    website: isValidHttpUrl(website) ? website : "",
    birthday: parseBirthday(readValue("birthday", "birthdate", "bday", "dob")),
    notes: normalizeString(readValue("notes", "note", "comments", "description")),
    tags,
    favorite: parseBoolean(readValue("favorite", "starred", "isfavorite")),
    phones,
    emails,
    addresses: collectAddresses(),
    socialLinks: collectSocialLinks(),
  };
};

const unescapeVCardText = (value = "") =>
  `${value}`
    .replace(/\\n/gi, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\");

const splitEscaped = (value = "", separator = ";") => {
  const parts = [];
  let current = "";
  let escaped = false;

  for (const character of `${value}`) {
    if (escaped) {
      current += character;
      escaped = false;
      continue;
    }

    if (character === "\\") {
      current += character;
      escaped = true;
      continue;
    }

    if (character === separator) {
      parts.push(current);
      current = "";
      continue;
    }

    current += character;
  }

  parts.push(current);
  return parts;
};

const resolveLabelFromTypes = (types = [], fallback = "") => {
  const normalizedTypes = types.map((type) => normalizeString(type).toUpperCase());
  const customLabel = normalizeString(fallback);

  if (customLabel) return customLabel;
  if (normalizedTypes.includes("CELL")) return "mobile";
  if (normalizedTypes.includes("HOME")) return "home";
  if (normalizedTypes.includes("WORK")) return "work";
  if (normalizedTypes.includes("FAX")) return "fax";
  return "other";
};

const unfoldVCardLines = (content) =>
  content
    .replace(/\r\n/g, "\n")
    .replace(/\n[ \t]/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

const parseVCardBlock = (block) => {
  const lines = unfoldVCardLines(block);
  const groupedLabels = {};
  const pendingPhones = [];
  const pendingEmails = [];
  const pendingUrls = [];
  const pendingAddresses = [];

  const contact = {
    displayName: "",
    firstName: "",
    lastName: "",
    middleName: "",
    nickname: "",
    photoUrl: "",
    company: "",
    jobTitle: "",
    department: "",
    website: "",
    birthday: "",
    notes: "",
    tags: [],
    favorite: false,
    phones: [],
    emails: [],
    addresses: [],
    socialLinks: [],
  };

  lines.forEach((line) => {
    const separatorIndex = line.indexOf(":");
    if (separatorIndex === -1) return;

    const rawLeft = line.slice(0, separatorIndex);
    const rawValue = line.slice(separatorIndex + 1);
    const leftParts = rawLeft.split(";");
    const propertyToken = leftParts[0];
    const propertyParts = propertyToken.split(".");
    const property = propertyParts[propertyParts.length - 1].toUpperCase();
    const group = propertyParts.length > 1 ? propertyParts[0] : "";
    const types = leftParts.slice(1).flatMap((part) => {
      const normalizedPart = normalizeString(part);
      if (!normalizedPart) return [];
      if (normalizedPart.toUpperCase().startsWith("TYPE=")) {
        return normalizedPart
          .slice(5)
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean);
      }
      return [normalizedPart];
    });

    if (property === "X-ABLABEL" && group) {
      groupedLabels[group] = unescapeVCardText(rawValue);
      return;
    }

    if (property === "FN") {
      contact.displayName = unescapeVCardText(rawValue);
      return;
    }

    if (property === "N") {
      const [lastName, firstName, middleName] = splitEscaped(rawValue, ";").map(unescapeVCardText);
      contact.firstName = firstName || contact.firstName;
      contact.lastName = lastName || contact.lastName;
      contact.middleName = middleName || contact.middleName;
      return;
    }

    if (property === "NICKNAME") {
      contact.nickname = unescapeVCardText(rawValue);
      return;
    }

    if (property === "ORG") {
      const [company, department] = splitEscaped(rawValue, ";").map(unescapeVCardText);
      contact.company = company || contact.company;
      contact.department = department || contact.department;
      return;
    }

    if (property === "TITLE") {
      contact.jobTitle = unescapeVCardText(rawValue);
      return;
    }

    if (property === "TEL") {
      pendingPhones.push({ group, types, value: unescapeVCardText(rawValue) });
      return;
    }

    if (property === "EMAIL") {
      pendingEmails.push({ group, types, value: unescapeVCardText(rawValue) });
      return;
    }

    if (property === "PHOTO") {
      const photoUrl = normalizeString(rawValue);
      if (isValidHttpUrl(photoUrl)) {
        contact.photoUrl = photoUrl;
      }
      return;
    }

    if (property === "URL" || property === "IMPP" || property === "X-SOCIALPROFILE") {
      pendingUrls.push({
        group,
        property,
        value: normalizeString(rawValue),
        platform: property === "X-SOCIALPROFILE" ? normalizeString(types[0]) : "",
      });
      return;
    }

    if (property === "ADR") {
      pendingAddresses.push({ group, types, value: rawValue });
      return;
    }

    if (property === "BDAY") {
      contact.birthday = parseBirthday(unescapeVCardText(rawValue));
      return;
    }

    if (property === "NOTE") {
      contact.notes = unescapeVCardText(rawValue);
      return;
    }

    if (property === "CATEGORIES") {
      contact.tags = uniqueValues(
        splitEscaped(rawValue, ",").map(unescapeVCardText).map((item) => item.trim()),
      );
      return;
    }
  });

  contact.phones = pendingPhones
    .map((item, index) => ({
      label: resolveLabelFromTypes(item.types, groupedLabels[item.group]),
      value: normalizeString(item.value),
      isPrimary: index === 0,
    }))
    .filter((item) => item.value);

  contact.emails = pendingEmails
    .map((item, index) => ({
      label: resolveLabelFromTypes(item.types, groupedLabels[item.group]),
      value: normalizeString(item.value).toLowerCase(),
      isPrimary: index === 0,
    }))
    .filter((item) => isValidEmail(item.value));

  pendingUrls.forEach((item) => {
    const value = normalizeString(item.value);
    if (!isValidHttpUrl(value)) return;

    if (!contact.website && item.property === "URL") {
      contact.website = value;
      return;
    }

    contact.socialLinks.push({
      platform:
        normalizeString(groupedLabels[item.group]) ||
        normalizeString(item.platform) ||
        "link",
      url: value,
    });
  });

  contact.addresses = pendingAddresses
    .map((item) => {
      const parts = splitEscaped(item.value, ";").map(unescapeVCardText);
      const fullAddress = [
        parts[2] || "",
        parts[3] || "",
        parts[4] || "",
        parts[6] || "",
      ]
        .map((part) => part.trim())
        .filter(Boolean)
        .join(", ");

      return {
        label: resolveLabelFromTypes(item.types, groupedLabels[item.group]),
        fullAddress,
        postalCode: normalizeString(parts[5]),
      };
    })
    .filter((item) => item.fullAddress || item.postalCode);

  return contact;
};

const buildImportableContact = (rawContact = {}, source) => {
  const phones = uniqueValues(
    (Array.isArray(rawContact.phones) ? rawContact.phones : [])
      .map((item) => ({
        label: normalizeString(item?.label) || "mobile",
        value: normalizeString(item?.value || item?.number),
        isPrimary: !!item?.isPrimary,
      }))
      .filter((item) => item.value)
      .map((item) => `${item.label}|||${item.value}|||${item.isPrimary ? "1" : "0"}`),
  ).map((item, index) => {
    const [label, value, isPrimary] = item.split("|||");
    return {
      label,
      value,
      isPrimary: index === 0 ? true : isPrimary === "1",
    };
  });

  const emails = uniqueValues(
    (Array.isArray(rawContact.emails) ? rawContact.emails : [])
      .map((item) => ({
        label: normalizeString(item?.label) || "personal",
        value: normalizeString(item?.value || item?.email).toLowerCase(),
        isPrimary: !!item?.isPrimary,
      }))
      .filter((item) => isValidEmail(item.value))
      .map((item) => `${item.label}|||${item.value}|||${item.isPrimary ? "1" : "0"}`),
  ).map((item, index) => {
    const [label, value, isPrimary] = item.split("|||");
    return {
      label,
      value,
      isPrimary: index === 0 ? true : isPrimary === "1",
    };
  });

  const tags = uniqueValues(Array.isArray(rawContact.tags) ? rawContact.tags.map(normalizeString) : []);
  const website = isValidHttpUrl(rawContact.website) ? normalizeString(rawContact.website) : "";
  const photoUrl = isValidHttpUrl(rawContact.photoUrl) ? normalizeString(rawContact.photoUrl) : "";
  const displayName = buildDisplayName({
    displayName: rawContact.displayName,
    firstName: rawContact.firstName,
    lastName: rawContact.lastName,
    nickname: rawContact.nickname,
    company: rawContact.company,
    phones,
    emails,
  });

  if (!displayName) {
    return { reason: "Missing display name" };
  }

  if (!phones.length && !emails.length) {
    return { reason: "Missing phone and email" };
  }

  return {
    contact: {
      displayName,
      firstName: normalizeString(rawContact.firstName),
      lastName: normalizeString(rawContact.lastName),
      middleName: normalizeString(rawContact.middleName),
      nickname: normalizeString(rawContact.nickname),
      photoUrl,
      company: normalizeString(rawContact.company),
      jobTitle: normalizeString(rawContact.jobTitle),
      department: normalizeString(rawContact.department),
      website,
      birthday: parseBirthday(rawContact.birthday),
      notes: normalizeString(rawContact.notes),
      tags,
      favorite: !!rawContact.favorite,
      source,
      phones,
      emails,
      addresses: Array.isArray(rawContact.addresses)
        ? rawContact.addresses
            .map((item) => ({
              label: normalizeString(item?.label) || "home",
              fullAddress: normalizeString(item?.fullAddress),
              postalCode: normalizeString(item?.postalCode),
            }))
            .filter((item) => item.fullAddress || item.postalCode)
        : [],
      socialLinks: Array.isArray(rawContact.socialLinks)
        ? rawContact.socialLinks
            .map((item) => ({
              platform: normalizeString(item?.platform) || "link",
              url: normalizeString(item?.url),
            }))
            .filter((item) => isValidHttpUrl(item.url))
        : [],
    },
  };
};

const parseSpreadsheetFile = async (file) => {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, {
    type: "array",
    cellDates: true,
  });

  const contacts = [];
  const skipped = [];

  workbook.SheetNames.forEach((sheetName) => {
    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(worksheet, {
      defval: "",
      raw: false,
    });

    rows.forEach((row, index) => {
      const result = buildImportableContact(parseSpreadsheetRow(row), "import");
      if (result.contact) {
        contacts.push(result.contact);
        return;
      }

      skipped.push({
        source: `${sheetName} row ${index + 2}`,
        reason: result.reason,
      });
    });
  });

  return { contacts, skipped };
};

const parseVCardFile = async (file) => {
  const content = await file.text();
  const blocks = content.match(/BEGIN:VCARD[\s\S]*?END:VCARD/gi) || [];
  const contacts = [];
  const skipped = [];

  blocks.forEach((block, index) => {
    const result = buildImportableContact(parseVCardBlock(block), "import");
    if (result.contact) {
      contacts.push(result.contact);
      return;
    }

    skipped.push({
      source: `vCard ${index + 1}`,
      reason: result.reason,
    });
  });

  return { contacts, skipped };
};

export const parseContactsImportFile = async (file) => {
  const extension = normalizeString(file?.name).split(".").pop()?.toLowerCase();

  if (!file) {
    throw new Error("Please choose a file to import.");
  }

  if (extension === "vcf") {
    return parseVCardFile(file);
  }

  if (["csv", "xlsx", "xls"].includes(extension)) {
    return parseSpreadsheetFile(file);
  }

  throw new Error("Unsupported file type. Please import a CSV, Excel, or vCard file.");
};
