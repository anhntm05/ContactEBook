const CONTACT_META_KEY = "contact_meta_v1";

const parseMeta = (value) => {
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

export const loadContactMetaMap = () => {
  if (typeof window === "undefined") return {};
  const raw = window.localStorage.getItem(CONTACT_META_KEY);
  if (!raw) return {};
  return parseMeta(raw);
};

export const getContactMeta = (contactId) => {
  if (!contactId) return null;
  const map = loadContactMetaMap();
  return map[contactId] || null;
};

export const upsertContactMeta = (contactId, meta) => {
  if (!contactId || typeof window === "undefined") return;
  const map = loadContactMetaMap();
  map[contactId] = {
    ...(map[contactId] || {}),
    ...meta,
    updatedAt: new Date().toISOString(),
  };
  window.localStorage.setItem(CONTACT_META_KEY, JSON.stringify(map));
};

export const removeContactMeta = (contactId) => {
  if (!contactId || typeof window === "undefined") return;
  const map = loadContactMetaMap();
  delete map[contactId];
  window.localStorage.setItem(CONTACT_META_KEY, JSON.stringify(map));
};
