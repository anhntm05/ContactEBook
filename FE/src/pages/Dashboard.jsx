import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import ContactList from "../components/contacts/ContactList";
import Button from "../components/common/Button";
import api from "../utils/api";
import { loadContactMetaMap, removeContactMeta } from "../utils/contactMeta";

const getId = (contact) => contact?._id || contact?.id;

const normalizeContacts = (items) => {
  const metaMap = loadContactMetaMap();
  return items.map((contact) => {
    const id = getId(contact);
    const meta = metaMap[id] || {};
    const phoneNumbers = meta.phoneNumbers || contact.phoneNumbers || contact.phones || (contact.phone ? [{ number: contact.phone, label: "Primary" }] : []);
    const emails = meta.emails || contact.emails || (contact.email ? [{ email: contact.email, label: "Primary" }] : []);
    return {
      ...contact,
      id,
      name: meta.firstName || meta.lastName ? `${meta.firstName || ""} ${meta.lastName || ""}`.trim() : contact.name,
      company: meta.company ?? contact.company ?? "",
      jobTitle: meta.jobTitle ?? contact.jobTitle ?? "",
      phoneNumbers,
      emails,
      tags: meta.tags || contact.tags || [],
      favorite: typeof meta.favorite === "boolean" ? meta.favorite : !!contact.favorite,
      createdAt: contact.createdAt || meta.createdAt,
      updatedAt: contact.updatedAt || meta.updatedAt,
    };
  });
};


const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("name_asc");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [selectedIds, setSelectedIds] = useState(new Set());

  const [deleteDialog, setDeleteDialog] = useState({ open: false, ids: [], label: "" });
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const fetchContacts = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get("/contacts");
      const rawContacts = response.data?.data || [];
      setContacts(normalizeContacts(rawContacts));
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load contacts.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchContacts(); }, []);

  useEffect(() => {
    const routeMessage = location.state?.successMessage || location.state?.message;
    if (routeMessage) {
      setSuccessMessage(routeMessage);
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.pathname, location.state, navigate]);

  const filteredContacts = useMemo(() => {
    const lowered = query.trim().toLowerCase();
    let data = contacts.filter((contact) => {
      if (!lowered) return true;
      const phones = (contact.phoneNumbers || []).map((item) => (item.number || item).toString().toLowerCase()).join(" ");
      const emails = (contact.emails || []).map((item) => (item.email || item).toString().toLowerCase()).join(" ");
      return [contact.name, contact.company, contact.jobTitle, phones, emails].join(" ").toLowerCase().includes(lowered);
    });

    data = [...data].sort((a, b) => {
      if (sortBy === "recent") return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      if (sortBy === "company") return (a.company || "").localeCompare(b.company || "");
      return (a.name || "").localeCompare(b.name || "");
    });

    return data;
  }, [contacts, query, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredContacts.length / perPage));
  const currentPage = Math.min(page, totalPages);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pagedContacts = useMemo(() => {
    const start = (currentPage - 1) * perPage;
    return filteredContacts.slice(start, start + perPage);
  }, [filteredContacts, currentPage, perPage]);

  const stats = useMemo(() => {
    const recentThreshold = new Date();
    recentThreshold.setDate(recentThreshold.getDate() - 7);

    const activeThreshold = new Date();
    activeThreshold.setDate(activeThreshold.getDate() - 30);

    const favorites = contacts.filter((item) => item.favorite || (item.tags || []).includes("Favorite")).length;
    const recentlyAdded = contacts.filter((item) => item.createdAt && new Date(item.createdAt) > recentThreshold).length;
    const activeContacts = contacts.filter((item) => {
      const source = item.updatedAt || item.lastInteractedAt || item.createdAt;
      return source && new Date(source) > activeThreshold;
    }).length;

    return { total: contacts.length, recentlyAdded, favorites, activeContacts };
  }, [contacts]);

  const handleToggleSelect = (id) => {
    if (!id) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggleSelectAll = (checked) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      pagedContacts.forEach((contact) => {
        const id = getId(contact);
        if (!id) return;
        if (checked) next.add(id);
        else next.delete(id);
      });
      return next;
    });
  };

  const askDelete = (ids, label) => {
    setDeleteError("");
    setDeleteDialog({ open: true, ids, label });
  };

  const confirmDelete = async () => {
    setDeleteLoading(true);
    setDeleteError("");
    try {
      await Promise.all(deleteDialog.ids.map((id) => api.delete(`/contacts/${id}`)));
      deleteDialog.ids.forEach((id) => removeContactMeta(id));
      setSelectedIds(new Set());
      setDeleteDialog({ open: false, ids: [], label: "" });
      setSuccessMessage(deleteDialog.ids.length > 1 ? "Contacts deleted successfully." : "Contact deleted successfully.");
      fetchContacts();
    } catch (err) {
      setDeleteError(err.response?.data?.message || "Failed to delete selected contacts.");
    } finally {
      setDeleteLoading(false);
    }
  };

  const exportSelected = () => {
    const rows = contacts.filter((item) => selectedIds.has(item.id));
    if (!rows.length) return;
    const csv = ["Name,Company,Primary Phone,Primary Email"]
      .concat(rows.map((row) => `${JSON.stringify(row.name || "")},${JSON.stringify(row.company || "")},${JSON.stringify(row.phoneNumbers?.[0]?.number || "")},${JSON.stringify(row.emails?.[0]?.email || "")}`))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "contacts-export.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 space-y-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Contact Dashboard</h1>
              <p className="text-gray-600 mt-1">Welcome back, {user?.username || "User"}</p>
            </div>
            <div className="flex items-center gap-3">
              <input type="text" value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} placeholder="Search name, phone, email, company..." className="w-full lg:w-96 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <div className="px-3 py-2 rounded-lg bg-blue-50 text-blue-700 text-sm font-medium">{user?.email || "Profile"}</div>
            </div>
          </div>
        </div>

        {successMessage && <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">{successMessage}</div>}
        {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">{error}</div>}

        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-sm p-5"><p className="text-sm text-gray-500">Total Contacts</p><p className="text-3xl font-bold text-gray-800 mt-1">{stats.total}</p></div>
          <div className="bg-white rounded-lg shadow-sm p-5"><p className="text-sm text-gray-500">Recently Added</p><p className="text-3xl font-bold text-gray-800 mt-1">{stats.recentlyAdded}</p></div>
          <div className="bg-white rounded-lg shadow-sm p-5"><p className="text-sm text-gray-500">Favorites</p><p className="text-3xl font-bold text-gray-800 mt-1">{stats.favorites}</p></div>
          <div className="bg-white rounded-lg shadow-sm p-5"><p className="text-sm text-gray-500">Active Contacts</p><p className="text-3xl font-bold text-gray-800 mt-1">{stats.activeContacts}</p></div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="name_asc">Name (A-Z)</option>
                <option value="recent">Recently Added</option>
                <option value="company">Company</option>
              </select>
              <Button variant="outline" disabled={selectedIds.size === 0} onClick={() => askDelete(Array.from(selectedIds), `${selectedIds.size} selected contacts`)}>Delete Selected</Button>
              <Button variant="outline" disabled={selectedIds.size === 0} onClick={exportSelected}>Export CSV</Button>
            </div>
            <Button variant="primary" onClick={() => navigate("/contact/new")}>Add New Contact</Button>
          </div>

          <ContactList
            loading={loading}
            contacts={pagedContacts}
            selectedIds={selectedIds}
            onToggleSelect={handleToggleSelect}
            onToggleSelectAll={handleToggleSelectAll}
            onView={(contact) => navigate(`/contact/${contact.id || getId(contact)}`)}
            onEdit={(contact) => navigate(`/contact/${contact.id || getId(contact)}`, { state: { startEdit: true } })}
            onDelete={(contact) => askDelete([contact.id || getId(contact)], contact.name || "this contact")}
            page={currentPage}
            total={filteredContacts.length}
            perPage={perPage}
            onPageChange={setPage}
            onPerPageChange={(value) => { setPerPage(value); setPage(1); }}
          />
        </div>
      </div>

      {deleteDialog.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 px-4">
          <div className="w-full max-w-md bg-white rounded-lg shadow-xl p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-2">Confirm Delete</h2>
            <p className="text-gray-600 mb-4">Delete {deleteDialog.label}? This action cannot be undone.</p>
            {deleteError && <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded mb-3">{deleteError}</div>}
            <div className="flex justify-end gap-3">
              <Button variant="outline" disabled={deleteLoading} onClick={() => setDeleteDialog({ open: false, ids: [], label: "" })}>Cancel</Button>
              <Button variant="danger" loading={deleteLoading} onClick={confirmDelete}>Confirm Delete</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;

