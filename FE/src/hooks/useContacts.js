import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../utils/api";
import { normalizeContact } from "../utils/contactDisplay";

const mockContacts = [
  {
    _id: "mock-1",
    displayName: "Avery Johnson",
    firstName: "Avery",
    lastName: "Johnson",
    jobTitle: "Product Manager",
    company: "Orbit Labs",
    phones: [{ label: "mobile", value: "+1 555 0111", isPrimary: true }],
    emails: [{ label: "work", value: "avery@orbitlabs.dev", isPrimary: true }],
    tags: ["partner", "vip"],
    favorite: true,
    notes: "Met at product summit.",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    _id: "mock-2",
    displayName: "Nadia Wu",
    firstName: "Nadia",
    lastName: "Wu",
    company: "Freelance",
    phones: [{ label: "mobile", value: "+1 555 0222", isPrimary: true }],
    emails: [],
    tags: ["designer"],
    favorite: false,
    notes: "UI/UX consultant",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const getTimestamp = (value) => {
  if (!value) return 0;
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
};

const includesIgnoreCase = (haystack, needle) =>
  `${haystack || ""}`.toLowerCase().includes(needle.toLowerCase());

export const useContacts = () => {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [query, setQuery] = useState("");
  const [filterKey, setFilterKey] = useState("all");
  const [sortKey, setSortKey] = useState("name-asc");

  const [selectedIds, setSelectedIds] = useState(new Set());

  const fetchContacts = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/contacts");
      const apiContacts = Array.isArray(response?.data?.data) ? response.data.data : [];
      setContacts(apiContacts.map(normalizeContact));
    } catch (fetchError) {
      setContacts(mockContacts.map(normalizeContact));
      setError(
        fetchError?.response?.data?.message ||
          "Unable to load contacts from API. Showing mock contacts instead."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const visibleContacts = useMemo(() => {
    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

    const searched = contacts.filter((contact) => {
      if (contact.deletedAt) return false;
      if (!query.trim()) return true;

      const needle = query.trim().toLowerCase();
      const phones = (contact.phones || []).map((phone) => phone?.value || "").join(" ");
      const emails = (contact.emails || []).map((email) => email?.value || "").join(" ");
      const tags = (contact.tags || []).join(" ");

      return [
        contact.displayName,
        contact.firstName,
        contact.lastName,
        contact.company,
        phones,
        emails,
        tags,
      ].some((value) => includesIgnoreCase(value, needle));
    });

    const filtered = searched.filter((contact) => {
      if (filterKey === "favorites") return contact.favorite;
      if (filterKey === "has-phone") return (contact.phones || []).length > 0;
      if (filterKey === "has-email") return (contact.emails || []).length > 0;
      if (filterKey === "has-company") return Boolean(contact.company);
      if (filterKey === "recent") return getTimestamp(contact.createdAt) >= thirtyDaysAgo;
      return true;
    });

    return [...filtered].sort((a, b) => {
      if (sortKey === "name-asc") return a.displayName.localeCompare(b.displayName);
      if (sortKey === "name-desc") return b.displayName.localeCompare(a.displayName);
      if (sortKey === "recent-added") return getTimestamp(b.createdAt) - getTimestamp(a.createdAt);
      if (sortKey === "recent-updated") return getTimestamp(b.updatedAt) - getTimestamp(a.updatedAt);
      if (sortKey === "favorites-first") {
        if (a.favorite === b.favorite) return a.displayName.localeCompare(b.displayName);
        return a.favorite ? -1 : 1;
      }
      return 0;
    });
  }, [contacts, filterKey, query, sortKey]);

  const selectedContacts = useMemo(
    () => visibleContacts.filter((contact) => selectedIds.has(contact._id || contact.id)),
    [visibleContacts, selectedIds]
  );

  const toggleSelect = (contactId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(contactId)) next.delete(contactId);
      else next.add(contactId);
      return next;
    });
  };

  const toggleSelectAllVisible = () => {
    const visibleIds = visibleContacts.map((contact) => contact._id || contact.id);
    const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));

    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) visibleIds.forEach((id) => next.delete(id));
      else visibleIds.forEach((id) => next.add(id));
      return next;
    });
  };

  const toggleFavorite = async (contactId) => {
    const target = contacts.find((contact) => (contact._id || contact.id) === contactId);
    if (!target) return;

    const nextFavorite = !target.favorite;

    setContacts((prev) =>
      prev.map((contact) =>
        (contact._id || contact.id) === contactId ? { ...contact, favorite: nextFavorite } : contact
      )
    );

    try {
      await api.patch(`/contacts/${contactId}/favorite`, { favorite: nextFavorite });
    } catch {
      // keep optimistic UI in environments where endpoint is not available yet
    }
  };

  const removeContact = async (contactId) => {
    setContacts((prev) => prev.filter((contact) => (contact._id || contact.id) !== contactId));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(contactId);
      return next;
    });

    try {
      await api.delete(`/contacts/${contactId}`);
    } catch {
      // fallback for mock/incomplete backend
    }
  };

  return {
    contacts,
    visibleContacts,
    loading,
    error,
    query,
    setQuery,
    filterKey,
    setFilterKey,
    sortKey,
    setSortKey,
    fetchContacts,
    selectedIds,
    selectedContacts,
    toggleSelect,
    toggleSelectAllVisible,
    toggleFavorite,
    removeContact,
  };
};
