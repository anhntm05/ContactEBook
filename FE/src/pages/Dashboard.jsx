import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import ContactList from "../components/contacts/ContactList";
import ExportContactsMenu from "../components/contacts/ExportContactsMenu";
import Button from "../components/common/Button";
import api from "../utils/api";
import {
  exportContactsToCSV,
  exportContactsToExcel,
  exportContactsToVCard,
} from "../utils/contactExport";
import {
  loadContactMetaMap,
  removeContactMeta,
  upsertContactMeta,
} from "../utils/contactMeta";

const getId = (contact) => contact?._id || contact?.id;

const normalizeContacts = (items) => {
  const metaMap = loadContactMetaMap();

  return items.map((contact) => {
    const id = getId(contact);
    const meta = metaMap[id] || {};

    const phoneNumbers =
      meta.phoneNumbers ||
      contact.phoneNumbers ||
      contact.phones ||
      (contact.phone ? [{ number: contact.phone, label: "Primary" }] : []);

    const emails =
      meta.emails ||
      contact.emails ||
      (contact.email ? [{ email: contact.email, label: "Primary" }] : []);

    const fallbackName =
      contact.name ||
      contact.displayName ||
      `${contact.firstName || ""} ${contact.lastName || ""}`.trim();

    return {
      ...contact,
      id,
      name:
        meta.firstName || meta.lastName
          ? `${meta.firstName || ""} ${meta.lastName || ""}`.trim()
          : fallbackName || "Unnamed Contact",
      company: meta.company ?? contact.company ?? "",
      jobTitle: meta.jobTitle ?? contact.jobTitle ?? "",
      phoneNumbers,
      emails,
      tags: meta.tags || contact.tags || [],
      favorite:
        typeof meta.favorite === "boolean" ? meta.favorite : !!contact.favorite,
      createdAt: contact.createdAt || meta.createdAt,
      updatedAt: contact.updatedAt || meta.updatedAt,
    };
  });
};

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [successMessage, setSuccessMessage] = useState("");
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("contacts");

  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("recent");
  const [favoriteFilter, setFavoriteFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [selectedIds, setSelectedIds] = useState(new Set());

  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    ids: [],
    label: "",
  });
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [exporting, setExporting] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);

  const resetSearchSortAndFilter = () => {
    setQuery("");
    setSortBy("recent");
    setFavoriteFilter("all");
    setPage(1);
  };

  const fetchContacts = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/contacts");
      const rawContacts = Array.isArray(response?.data?.data)
        ? response.data.data
        : [];

      setContacts(normalizeContacts(rawContacts));
    } catch (fetchError) {
      setError(
        fetchError?.response?.data?.message || "Failed to load contacts.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, []);

  useEffect(() => {
    const routeMessage = location.state?.successMessage || location.state?.message;
    const shouldRefreshContacts = !!location.state?.refreshContacts;

    if (shouldRefreshContacts) {
      fetchContacts();
    }

    if (routeMessage) {
      setSuccessMessage(routeMessage);
    }

    if (!routeMessage && !shouldRefreshContacts) return;

    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, location.state, navigate]);

  const filteredContacts = useMemo(() => {
    const lowered = query.trim().toLowerCase();

    let data = contacts.filter((contact) => {
      if (!lowered) return true;

      const phones = (contact.phoneNumbers || [])
        .map((item) => (item.number || item).toString().toLowerCase())
        .join(" ");

      const emailValues = (contact.emails || [])
        .map((item) => (item.email || item).toString().toLowerCase())
        .join(" ");

      return [contact.name, contact.company, contact.jobTitle, phones, emailValues]
        .join(" ")
        .toLowerCase()
        .includes(lowered);
    });

    if (favoriteFilter === "favorites") {
      data = data.filter((contact) => !!contact.favorite);
    }

    if (favoriteFilter === "non_favorites") {
      data = data.filter((contact) => !contact.favorite);
    }

    data = [...data].sort((a, b) => {
      if (sortBy === "recent") {
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      }
      if (sortBy === "name_desc") {
        return (b.name || "").localeCompare(a.name || "");
      }
      if (sortBy === "company") {
        return (a.company || "").localeCompare(b.company || "");
      }
      return (a.name || "").localeCompare(b.name || "");
    });

    return data;
  }, [contacts, favoriteFilter, query, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredContacts.length / perPage));
  const currentPage = Math.min(page, totalPages);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  useEffect(() => {
    const validIds = new Set(contacts.map((contact) => getId(contact)).filter(Boolean));
    setSelectedIds((prev) => {
      const next = new Set([...prev].filter((id) => validIds.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [contacts]);

  const visibleContacts = useMemo(() => {
    const start = (currentPage - 1) * perPage;
    return filteredContacts.slice(start, start + perPage);
  }, [filteredContacts, currentPage, perPage]);

  const stats = useMemo(() => {
    const recentThreshold = new Date();
    recentThreshold.setDate(recentThreshold.getDate() - 7);

    const activeThreshold = new Date();
    activeThreshold.setDate(activeThreshold.getDate() - 30);

    const favorites = contacts.filter(
      (item) => item.favorite || (item.tags || []).includes("Favorite"),
    ).length;

    const recentlyAdded = contacts.filter(
      (item) => item.createdAt && new Date(item.createdAt) > recentThreshold,
    ).length;

    const activeContacts = contacts.filter((item) => {
      const source = item.updatedAt || item.lastInteractedAt || item.createdAt;
      return source && new Date(source) > activeThreshold;
    }).length;

    return {
      total: contacts.length,
      favorites,
      recentlyAdded,
      activeContacts,
    };
  }, [contacts]);

  const handleToggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggleSelectAll = (checked) => {
    const visibleIds = visibleContacts.map((contact) => getId(contact)).filter(Boolean);

    setSelectedIds((prev) => {
      const next = new Set(prev);
      visibleIds.forEach((id) => {
        if (checked) next.add(id);
        else next.delete(id);
      });
      return next;
    });
  };

  const askDelete = (ids, label) => {
    if (!ids.length) return;
    setDeleteError("");
    setDeleteDialog({ open: true, ids, label });
  };

  const confirmDelete = async () => {
    if (!deleteDialog.ids.length) {
      setDeleteDialog({ open: false, ids: [], label: "" });
      return;
    }

    setDeleteLoading(true);
    setDeleteError("");

    try {
      await Promise.all(deleteDialog.ids.map((id) => api.delete(`/contacts/${id}`)));
      deleteDialog.ids.forEach((id) => removeContactMeta(id));

      setSelectedIds(new Set());
      setDeleteDialog({ open: false, ids: [], label: "" });
      setSuccessMessage(
        deleteDialog.ids.length > 1
          ? "Contacts deleted successfully."
          : "Contact deleted successfully.",
      );

      await fetchContacts();
    } catch (deleteRequestError) {
      setDeleteError(
        deleteRequestError?.response?.data?.message ||
          "Failed to delete selected contacts.",
      );
    } finally {
      setDeleteLoading(false);
    }
  };

  const getSelectedContacts = () =>
    contacts.filter((item) => selectedIds.has(item.id || getId(item)));

  const markSelectedAsFavorite = async () => {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;

    setFavoriteLoading(true);
    setError("");

    try {
      await Promise.all(ids.map((id) => api.put(`/contacts/${id}`, { favorite: true })));
      ids.forEach((id) => upsertContactMeta(id, { favorite: true }));

      setSelectedIds(new Set());
      setSuccessMessage(
        ids.length > 1
          ? "Selected contacts marked as favorite."
          : "Contact marked as favorite.",
      );

      await fetchContacts();
    } catch (favoriteRequestError) {
      setError(
        favoriteRequestError?.response?.data?.message ||
          "Failed to mark selected contacts as favorite.",
      );
    } finally {
      setFavoriteLoading(false);
    }
  };

  const mapContactForExport = (contact) => {
    const phones = (contact.phoneNumbers || contact.phones || [])
      .map((item) => ({
        label: item?.label || "Primary",
        value: item?.value || item?.number || "",
        isPrimary: !!item?.isPrimary,
      }))
      .filter((item) => item.value);

    const emails = (contact.emails || [])
      .map((item) => ({
        label: item?.label || "Primary",
        value: item?.value || item?.email || "",
        isPrimary: !!item?.isPrimary,
      }))
      .filter((item) => item.value);

    return {
      displayName:
        contact.displayName ||
        contact.name ||
        `${contact.firstName || ""} ${contact.lastName || ""}`.trim() ||
        "Unnamed Contact",
      firstName: contact.firstName || "",
      middleName: contact.middleName || "",
      lastName: contact.lastName || "",
      nickname: contact.nickname || "",
      photoUrl: contact.photoUrl || "",
      phones,
      emails,
      company: contact.company || "",
      jobTitle: contact.jobTitle || "",
      department: contact.department || "",
      addresses: Array.isArray(contact.addresses) ? contact.addresses : [],
      website: contact.website || "",
      socialLinks: Array.isArray(contact.socialLinks) ? contact.socialLinks : [],
      birthday: contact.birthday || "",
      anniversary: contact.anniversary || "",
      spouseName: contact.spouseName || "",
      tags: Array.isArray(contact.tags) ? contact.tags : [],
      favorite: !!contact.favorite,
      notes: contact.notes || "",
    };
  };

  const runExport = async (format) => {
    const selectedContacts = getSelectedContacts();
    if (!selectedContacts.length) return;

    const exportData = selectedContacts.map(mapContactForExport);

    setExporting(true);
    try {
      if (format === "excel") {
        exportContactsToExcel(exportData, "contacts-export");
        return;
      }

      if (format === "vcf") {
        exportContactsToVCard(exportData, "contacts-export");
        return;
      }

      exportContactsToCSV(exportData, "contacts-export");
    } finally {
      setExporting(false);
    }
  };

  const statCards = [
    {
      label: "Total Contacts",
      value: stats.total,
      helper: "All saved contacts",
      accent: "bg-blue-50 text-blue-700",
      icon: "TC",
    },
    {
      label: "Recently Added",
      value: stats.recentlyAdded,
      helper: "Added in the last 7 days",
      accent: "bg-indigo-50 text-indigo-700",
      icon: "RA",
    },
    {
      label: "Favorites",
      value: stats.favorites,
      helper: "Starred contacts",
      accent: "bg-amber-50 text-amber-700",
      icon: "FV",
    },
    {
      label: "Active Contacts",
      value: stats.activeContacts,
      helper: "Updated in the last 30 days",
      accent: "bg-emerald-50 text-emerald-700",
      icon: "AC",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto max-w-7xl px-4 py-8 space-y-6">
        <section className="rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 p-6 md:p-8 text-white shadow-lg">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-medium text-blue-100">Dashboard Overview</p>
              <h1 className="text-3xl font-bold mt-1">
                Welcome back, {user?.username || "User"}
              </h1>
              <p className="text-blue-100 mt-2">
                Track your contacts, discover important updates, and manage everything in one
                place.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="primary"
                onClick={() => navigate("/contacts/new")}
                className="bg-white !text-blue-700 hover:!bg-blue-50"
              >
                Add New Contact
              </Button>

              <div className="rounded-lg bg-white/15 px-4 py-2 text-sm backdrop-blur-sm">
                Signed in as <span className="font-semibold">{user?.email || "Profile"}</span>
              </div>
            </div>
          </div>
        </section>

        {successMessage && (
          <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-green-700">
            {successMessage}
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">
            {error}
          </div>
        )}

        <section className="rounded-2xl bg-white shadow-sm border border-slate-200 p-2">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("contacts")}
              className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                activeTab === "contacts"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              Contact List
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("statistics")}
              className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                activeTab === "statistics"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              Statistics
            </button>
          </div>
        </section>

        {activeTab === "statistics" ? (
          <section className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {statCards.map((card) => (
              <article
                key={card.label}
                className="rounded-xl bg-white shadow-sm border border-slate-200 p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-slate-500">{card.label}</p>
                    <p className="mt-2 text-3xl font-bold text-slate-800">{card.value}</p>
                    <p className="mt-1 text-xs text-slate-500">{card.helper}</p>
                  </div>
                  <span className={`rounded-lg px-2.5 py-1 text-base ${card.accent}`}>
                    {card.icon}
                  </span>
                </div>
              </article>
            ))}
          </section>
        ) : (
          <section className="rounded-2xl bg-white shadow-md border border-slate-200 p-4 md:p-5 space-y-4">
            <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto_auto_auto] lg:items-end">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-600">
                  Search Contacts
                </span>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search by name, phone, email, company..."
                  className="w-full rounded-lg border border-slate-300 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-600">Sort by</span>
                <select
                  value={sortBy}
                  onChange={(e) => {
                    setSortBy(e.target.value);
                    setPage(1);
                  }}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="name_asc">Name (A-Z)</option>
                  <option value="name_desc">Name (Z-A)</option>
                  <option value="recent">Recently Added</option>
                  <option value="company">Company</option>
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-600">Filter</span>
                <select
                  value={favoriteFilter}
                  onChange={(e) => {
                    setFavoriteFilter(e.target.value);
                    setPage(1);
                  }}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Contacts</option>
                  <option value="favorites">Favorites Only</option>
                  <option value="non_favorites">Non-favorites</option>
                </select>
              </label>

              <Button
                variant="outline"
                onClick={resetSearchSortAndFilter}
                className="h-[42px] border-slate-300 text-slate-700 hover:!border-slate-400 hover:!bg-slate-100"
              >
                Reset
              </Button>

              <div className="text-sm text-slate-600 rounded-lg bg-slate-100 px-3 py-2.5">
                Showing <span className="font-semibold text-slate-800">{filteredContacts.length}</span>{" "}
                result{filteredContacts.length === 1 ? "" : "s"}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
              <div className="text-sm text-slate-600">
                {selectedIds.size > 0 ? (
                  <span>
                    <span className="font-semibold text-slate-800">{selectedIds.size}</span>{" "}
                    selected
                  </span>
                ) : (
                  "Select contacts to bulk-delete or export"
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  className="border-purple-600 text-purple-600 hover:!bg-purple-600 hover:!text-white hover:!border-purple-600"
                  disabled={selectedIds.size === 0 || favoriteLoading}
                  loading={favoriteLoading}
                  onClick={markSelectedAsFavorite}
                >
                  Favorite Selected
                </Button>

                <Button
                  variant="outline"
                  className="border-red-600 text-red-600 hover:!bg-red-600 hover:!text-white hover:!border-red-600"
                  disabled={selectedIds.size === 0}
                  onClick={() =>
                    askDelete(Array.from(selectedIds), `${selectedIds.size} selected contacts`)
                  }
                >
                  Delete Selected
                </Button>

                <ExportContactsMenu
                  label="Export"
                  exporting={exporting}
                  disabled={selectedIds.size === 0}
                  onExportCSV={() => runExport("csv")}
                  onExportExcel={() => runExport("excel")}
                  onExportVCard={() => runExport("vcf")}
                  buttonClassName="hover:!bg-blue-600 hover:!text-white hover:!border-blue-600"
                />
              </div>
            </div>

            <ContactList
              loading={loading}
              contacts={visibleContacts}
              selectedIds={selectedIds}
              onToggleSelect={handleToggleSelect}
              onToggleSelectAll={handleToggleSelectAll}
              onView={(contact) => navigate(`/contacts/${contact.id || getId(contact)}`)}
              onEdit={(contact) =>
                navigate(`/contacts/${contact.id || getId(contact)}`, {
                  state: { startEdit: true },
                })
              }
              onDelete={(contact) =>
                askDelete([contact.id || getId(contact)], contact.name || "this contact")
              }
              page={currentPage}
              total={filteredContacts.length}
              perPage={perPage}
              onPageChange={setPage}
              onPerPageChange={(value) => {
                setPerPage(value);
                setPage(1);
              }}
            />
          </section>
        )}
      </div>

      {deleteDialog.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 className="text-xl font-bold text-gray-800 mb-2">Confirm Delete</h2>
            <p className="text-gray-600 mb-4">
              Delete {deleteDialog.label}? This action cannot be undone.
            </p>

            {deleteError && (
              <div className="rounded border border-red-300 bg-red-100 px-3 py-2 text-red-700 mb-3">
                {deleteError}
              </div>
            )}

            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                disabled={deleteLoading}
                onClick={() => setDeleteDialog({ open: false, ids: [], label: "" })}
              >
                Cancel
              </Button>

              <Button variant="danger" loading={deleteLoading} onClick={confirmDelete}>
                Confirm Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
