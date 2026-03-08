export const getPrimaryPhone = (contact) => {
  const phones = Array.isArray(contact?.phones) ? contact.phones : [];
  return phones.find((phone) => phone?.isPrimary)?.value || phones[0]?.value || "";
};

export const getPrimaryEmail = (contact) => {
  const emails = Array.isArray(contact?.emails) ? contact.emails : [];
  return emails.find((email) => email?.isPrimary)?.value || emails[0]?.value || "";
};

export const getDisplayInitials = (contact) => {
  const name = (contact?.displayName || "").trim();
  if (!name) return "?";

  const parts = name.split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() || "").join("");
};

const getNotesPreview = (notes = "", maxLength = 40) => {
  const trimmed = notes.trim();
  if (!trimmed) return "";
  return trimmed.length > maxLength ? `${trimmed.slice(0, maxLength - 1)}…` : trimmed;
};

export const getContactContextLine = (contact) => {
  const title = contact?.jobTitle?.trim();
  const company = contact?.company?.trim();
  const primaryPhone = getPrimaryPhone(contact);
  const primaryEmail = getPrimaryEmail(contact);
  const firstTag = Array.isArray(contact?.tags) ? contact.tags.find((tag) => tag?.trim()) : "";
  const notesPreview = getNotesPreview(contact?.notes || "");

  if (title && company) return `${title} at ${company}`;
  if (company) return company;
  if (primaryPhone) return primaryPhone;
  if (primaryEmail) return primaryEmail;
  if (firstTag) return `#${firstTag}`;
  if (notesPreview) return notesPreview;
  return "No additional info";
};

export const getVisibleTags = (contact, limit = 2) => {
  const tags = Array.isArray(contact?.tags) ? contact.tags.filter((tag) => tag?.trim()) : [];
  return {
    visibleTags: tags.slice(0, limit),
    remainingCount: Math.max(0, tags.length - limit),
  };
};

export const normalizeContact = (contact) => ({
  ...contact,
  displayName: contact?.displayName || [contact?.firstName, contact?.lastName].filter(Boolean).join(" ") || "Unnamed Contact",
  phones: Array.isArray(contact?.phones) ? contact.phones : [],
  emails: Array.isArray(contact?.emails) ? contact.emails : [],
  tags: Array.isArray(contact?.tags) ? contact.tags : [],
});
