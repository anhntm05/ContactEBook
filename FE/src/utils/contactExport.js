import { getPrimaryEmail, getPrimaryPhone } from "./contactDisplay";
import * as XLSX from "xlsx";

const today = () => new Date().toISOString().slice(0, 10);

const csvEscape = (value) => {
  const str = `${value ?? ""}`;
  if (str.includes(",") || str.includes("\n") || str.includes('"')) {
    return `"${str.replaceAll('"', '""')}"`;
  }
  return str;
};

const flattenContact = (contact) => ({
  "Display Name": contact.displayName || "",
  "First Name": contact.firstName || "",
  "Last Name": contact.lastName || "",
  Nickname: contact.nickname || "",
  "Primary Phone": getPrimaryPhone(contact),
  "Primary Email": getPrimaryEmail(contact),
  Company: contact.company || "",
  "Job Title": contact.jobTitle || "",
  Tags: Array.isArray(contact.tags) ? contact.tags.join(" | ") : "",
  Favorite: contact.favorite ? "Yes" : "No",
  Notes: contact.notes || "",
});

const downloadBlob = (blob, fileName) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
};

export const exportContactsToCSV = (contacts, filePrefix = "contacts") => {
  const rows = contacts.map(flattenContact);
  if (!rows.length) return;

  const headers = Object.keys(rows[0]);
  const csvLines = [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(",")),
  ];

  const csvContent = csvLines.join("\n");
  downloadBlob(new Blob([csvContent], { type: "text/csv;charset=utf-8" }), `${filePrefix}-${today()}.csv`);
};

export const exportContactsToExcel = (contacts, filePrefix = "contacts") => {
  const rows = contacts.map(flattenContact);
  if (!rows.length) return;

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Contacts");

  const workbookBytes = XLSX.write(workbook, {
    bookType: "xlsx",
    type: "array",
  });

  downloadBlob(
    new Blob([workbookBytes], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    `${filePrefix}-${today()}.xlsx`
  );
};

const trimValue = (value) => {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return `${value}`.trim();
  return "";
};
const ensureArray = (value) => (Array.isArray(value) ? value : []);

const escapeVCardText = (value = "") =>
  `${value}`
    .replaceAll("\\", "\\\\")
    .replaceAll(";", "\\;")
    .replaceAll(",", "\\,")
    .replaceAll("\r\n", "\n")
    .replaceAll("\r", "\n")
    .replaceAll("\n", "\\n");

const sanitizeUriValue = (value = "") => trimValue(value).replace(/\r?\n/g, "").trim();

const sanitizeTypeToken = (value = "") =>
  trimValue(value)
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, "");

const formatDateForVCard = (value) => {
  if (!value) return "";
  const raw = trimValue(value);
  if (/^\d{8}$/.test(raw)) return raw;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw.replaceAll("-", "");

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10).replaceAll("-", "");
};

const getFullName = (contact) => {
  const firstName = trimValue(contact?.firstName);
  const middleName = trimValue(contact?.middleName);
  const lastName = trimValue(contact?.lastName);

  return (
    trimValue(contact?.displayName) ||
    [firstName, middleName, lastName].filter(Boolean).join(" ") ||
    trimValue(contact?.name) ||
    "Unnamed Contact"
  );
};

const resolvePhoneLabel = (label) => {
  const raw = trimValue(label).toLowerCase();
  if (!raw) return { type: "CELL", customLabel: "" };
  if (["cell", "mobile", "iphone", "main phone"].includes(raw)) return { type: "CELL", customLabel: "" };
  if (["home", "residence", "house"].includes(raw)) return { type: "HOME", customLabel: "" };
  if (["work", "office", "business", "company"].includes(raw)) return { type: "WORK", customLabel: "" };
  if (raw.includes("fax")) return { type: "FAX", customLabel: "" };
  if (raw === "pager") return { type: "PAGER", customLabel: "" };
  if (raw === "main") return { type: "MAIN", customLabel: "" };
  if (["other", "personal", "default"].includes(raw)) return { type: "OTHER", customLabel: "" };
  return { type: "OTHER", customLabel: trimValue(label) };
};

const resolveEmailLabel = (label) => {
  const raw = trimValue(label).toLowerCase();
  if (!raw) return { types: ["INTERNET", "OTHER"], customLabel: "" };
  if (["work", "office", "business", "company"].includes(raw)) {
    return { types: ["INTERNET", "WORK"], customLabel: "" };
  }
  if (["home", "personal"].includes(raw)) {
    return { types: ["INTERNET", "HOME"], customLabel: "" };
  }
  if (raw === "school") return { types: ["INTERNET", "SCHOOL"], customLabel: "" };
  if (raw === "other") return { types: ["INTERNET", "OTHER"], customLabel: "" };
  return { types: ["INTERNET", "OTHER"], customLabel: trimValue(label) };
};

const resolveAddressLabel = (label) => {
  const raw = trimValue(label).toLowerCase();
  if (!raw) return { type: "HOME", customLabel: "" };
  if (raw === "work" || raw === "office") return { type: "WORK", customLabel: "" };
  if (raw === "home") return { type: "HOME", customLabel: "" };
  if (raw === "other") return { type: "OTHER", customLabel: "" };
  return { type: "OTHER", customLabel: trimValue(label) };
};

const isInstantMessagingUri = (value = "") => /^(xmpp|sip|skype|im|sms):/i.test(trimValue(value));

const dedupeEntries = (entries, keyBuilder) => {
  const seen = new Set();
  return entries.filter((entry) => {
    const key = keyBuilder(entry);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const collectPhones = (contact) =>
  dedupeEntries(
    [
      ...ensureArray(contact?.phones).map((item) => ({
        value: trimValue(item?.value || item?.number || item),
        label: trimValue(item?.label),
        isPrimary: !!item?.isPrimary,
      })),
      ...ensureArray(contact?.phoneNumbers).map((item) => ({
        value: trimValue(item?.number || item?.value || item),
        label: trimValue(item?.label),
        isPrimary: !!item?.isPrimary,
      })),
      trimValue(contact?.phone)
        ? { value: trimValue(contact?.phone), label: "mobile", isPrimary: true }
        : null,
    ].filter(Boolean),
    (entry) => `${entry.value}|${entry.label.toLowerCase()}`
  );

const collectEmails = (contact) =>
  dedupeEntries(
    [
      ...ensureArray(contact?.emails).map((item) => ({
        value: trimValue(item?.value || item?.email || item),
        label: trimValue(item?.label),
        isPrimary: !!item?.isPrimary,
      })),
      trimValue(contact?.email)
        ? { value: trimValue(contact?.email), label: "personal", isPrimary: true }
        : null,
    ].filter(Boolean),
    (entry) => `${entry.value.toLowerCase()}|${entry.label.toLowerCase()}`
  );

const collectAddresses = (contact) => {
  const fromAddresses = ensureArray(contact?.addresses).map((item) => ({
    label: trimValue(item?.label),
    street: trimValue(item?.street),
    city: trimValue(item?.city),
    state: trimValue(item?.state),
    postalCode: trimValue(item?.postalCode || item?.zip),
    country: trimValue(item?.country),
  }));

  const legacyAddress =
    typeof contact?.address === "string"
      ? {
          label: "home",
          street: trimValue(contact.address),
          city: "",
          state: "",
          postalCode: "",
          country: "",
        }
      : contact?.address && typeof contact.address === "object"
        ? {
            label: trimValue(contact.address?.label) || "home",
            street: trimValue(contact.address?.street),
            city: trimValue(contact.address?.city),
            state: trimValue(contact.address?.state),
            postalCode: trimValue(contact.address?.postalCode || contact.address?.zip),
            country: trimValue(contact.address?.country),
          }
        : null;

  return dedupeEntries(
    [...fromAddresses, legacyAddress].filter((item) =>
      item && [item.street, item.city, item.state, item.postalCode, item.country].some(Boolean)
    ),
    (entry) =>
      [entry.label, entry.street, entry.city, entry.state, entry.postalCode, entry.country]
        .map((part) => part.toLowerCase())
        .join("|")
  );
};

const collectRelatedPeople = (contact) =>
  dedupeEntries(
    [
      trimValue(contact?.spouseName) ? { type: "spouse", value: trimValue(contact.spouseName) } : null,
      ...ensureArray(contact?.related).map((item) =>
        typeof item === "string"
          ? { type: "other", value: trimValue(item) }
          : {
              type: trimValue(item?.type || item?.label || "other"),
              value: trimValue(item?.value || item?.name),
            }
      ),
      contact?.related && !Array.isArray(contact.related) && typeof contact.related === "object"
        ? {
            type: trimValue(contact.related?.type || contact.related?.label || "other"),
            value: trimValue(contact.related?.value || contact.related?.name),
          }
        : null,
    ].filter((item) => item && item.value),
    (entry) => `${entry.type.toLowerCase()}|${entry.value.toLowerCase()}`
  );

const collectContactUris = (contact) =>
  dedupeEntries(
    [
      trimValue(contact?.website)
        ? { property: "URL", value: trimValue(contact.website), customLabel: "" }
        : null,
      ...ensureArray(contact?.socialLinks).map((item) => {
        const url = trimValue(item?.url || item?.value);
        if (!url) return null;
        return {
          property: isInstantMessagingUri(url) ? "IMPP" : "URL",
          value: url,
          customLabel: trimValue(item?.platform || item?.label),
        };
      }),
    ].filter(Boolean),
    (entry) => `${entry.property}|${entry.value.toLowerCase()}`
  );

const pushGroupedProperty = (state, { property, value, types = [], customLabel = "", isUri = false }) => {
  const normalizedValue = isUri ? sanitizeUriValue(value) : trimValue(value);
  if (!normalizedValue) return;

  const uniqueTypes = [...new Set(types.map(sanitizeTypeToken).filter(Boolean))];
  const typePart = uniqueTypes.length ? `;TYPE=${uniqueTypes.join(",")}` : "";
  const serializedValue = isUri ? normalizedValue : escapeVCardText(normalizedValue);

  if (customLabel) {
    const group = `item${state.itemIndex}`;
    state.itemIndex += 1;
    state.lines.push(`${group}.${property}${typePart}:${serializedValue}`);
    state.lines.push(`${group}.X-ABLabel:${escapeVCardText(customLabel)}`);
    return;
  }

  state.lines.push(`${property}${typePart}:${serializedValue}`);
};

const buildVCard = (contact) => {
  const firstName = trimValue(contact?.firstName);
  const middleName = trimValue(contact?.middleName);
  const lastName = trimValue(contact?.lastName);
  const fullName = getFullName(contact);

  const state = {
    lines: [
      "BEGIN:VCARD",
      "VERSION:3.0",
      `FN:${escapeVCardText(fullName)}`,
      `N:${escapeVCardText(lastName)};${escapeVCardText(firstName)};${escapeVCardText(middleName)};;`,
    ],
    itemIndex: 1,
  };

  const nickname = trimValue(contact?.nickname);
  if (nickname) state.lines.push(`NICKNAME:${escapeVCardText(nickname)}`);

  const photoUrl = sanitizeUriValue(contact?.photoUrl || "");
  if (photoUrl) state.lines.push(`PHOTO;VALUE=URI:${photoUrl}`);

  collectPhones(contact).forEach((phone) => {
    const { type, customLabel } = resolvePhoneLabel(phone.label);
    pushGroupedProperty(state, {
      property: "TEL",
      value: phone.value,
      types: [type, phone.isPrimary ? "PREF" : ""],
      customLabel,
    });
  });

  collectEmails(contact).forEach((email) => {
    const { types, customLabel } = resolveEmailLabel(email.label);
    pushGroupedProperty(state, {
      property: "EMAIL",
      value: email.value,
      types: [...types, email.isPrimary ? "PREF" : ""],
      customLabel,
    });
  });

  const company = trimValue(contact?.company);
  const department = trimValue(contact?.department);
  if (company || department) {
    const orgValue = company && department ? `${escapeVCardText(company)};${escapeVCardText(department)}` : escapeVCardText(company || department);
    state.lines.push(`ORG:${orgValue}`);
  }

  const jobTitle = trimValue(contact?.jobTitle);
  if (jobTitle) state.lines.push(`TITLE:${escapeVCardText(jobTitle)}`);

  collectAddresses(contact).forEach((address) => {
    const { type, customLabel } = resolveAddressLabel(address.label);
    const addressValue = [
      "",
      "",
      escapeVCardText(address.street),
      escapeVCardText(address.city),
      escapeVCardText(address.state),
      escapeVCardText(address.postalCode),
      escapeVCardText(address.country),
    ].join(";");

    if (customLabel) {
      const group = `item${state.itemIndex}`;
      state.itemIndex += 1;
      state.lines.push(`${group}.ADR;TYPE=${sanitizeTypeToken(type)}:${addressValue}`);
      state.lines.push(`${group}.X-ABLabel:${escapeVCardText(customLabel)}`);
    } else {
      state.lines.push(`ADR;TYPE=${sanitizeTypeToken(type)}:${addressValue}`);
    }
  });

  collectContactUris(contact).forEach((entry) => {
    pushGroupedProperty(state, {
      property: entry.property,
      value: entry.value,
      types: [entry.property === "IMPP" ? "OTHER" : ""],
      customLabel: entry.customLabel,
      isUri: true,
    });
  });

  const birthday = formatDateForVCard(contact?.birthday);
  if (birthday) state.lines.push(`BDAY:${birthday}`);

  const anniversary = formatDateForVCard(contact?.anniversary);
  if (anniversary) state.lines.push(`ANNIVERSARY:${anniversary}`);

  collectRelatedPeople(contact).forEach((person) => {
    const relationType = sanitizeTypeToken(person.type) || "OTHER";
    state.lines.push(`RELATED;TYPE=${relationType}:${escapeVCardText(person.value)}`);
  });

  const tags = ensureArray(contact?.tags).map(trimValue).filter(Boolean);
  if (tags.length) state.lines.push(`CATEGORIES:${tags.map(escapeVCardText).join(",")}`);

  const note = trimValue(contact?.notes);
  if (note) state.lines.push(`NOTE:${escapeVCardText(note)}`);

  state.lines.push("END:VCARD");
  return state.lines.join("\r\n");
};

export const exportContactsToVCard = (contacts, filePrefix = "contacts") => {
  if (!Array.isArray(contacts) || !contacts.length) return;
  const vcfContent = contacts.map(buildVCard).join("\r\n");
  downloadBlob(new Blob([vcfContent], { type: "text/vcard;charset=utf-8" }), `${filePrefix}-${today()}.vcf`);
};
