import { useMemo, useState } from "react";
import ContactFilters from "../components/contacts/ContactFilters";
import ContactListHeader from "../components/contacts/ContactListHeader";
import ContactTable from "../components/contacts/ContactTable";
import {
  exportContactsToCSV,
  exportContactsToExcel,
  exportContactsToVCard,
} from "../utils/contactExport";
import { useContacts } from "../hooks/useContacts";

const ContactListPage = () => {
  const {
    visibleContacts,
    loading,
    error,
    query,
    setQuery,
    filterKey,
    setFilterKey,
    sortKey,
    setSortKey,
    selectedIds,
    selectedContacts,
    toggleSelect,
    toggleSelectAllVisible,
    toggleFavorite,
    removeContact,
  } = useContacts();

  const [exporting, setExporting] = useState(false);

  const exportTarget = useMemo(() => {
    if (selectedContacts.length > 0) return selectedContacts;
    return visibleContacts;
  }, [selectedContacts, visibleContacts]);

  const runExport = async (handler) => {
    setExporting(true);
    try {
      handler(exportTarget);
    } finally {
      setExporting(false);
    }
  };

  const hasSelected = selectedIds.size > 0;

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;

    const confirmed = window.confirm(`Delete ${ids.length} selected contacts?`);
    if (!confirmed) return;

    await Promise.all(ids.map((id) => removeContact(id)));
  };

  const showNoContactsYet = !loading && !visibleContacts.length && !query.trim() && filterKey === "all";
  const showNoSearchResults = !loading && !visibleContacts.length && Boolean(query.trim());
  const showNoFilterResults = !loading && !visibleContacts.length && !query.trim() && filterKey !== "all";

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="container mx-auto max-w-7xl">
        <ContactListHeader
          totalCount={visibleContacts.length}
          exporting={exporting}
          onExportCSV={() => runExport(exportContactsToCSV)}
          onExportExcel={() => runExport(exportContactsToExcel)}
          onExportVCard={() => runExport(exportContactsToVCard)}
          hasSelected={hasSelected}
          selectedCount={selectedIds.size}
          onBulkDelete={handleBulkDelete}
        />

        <ContactFilters
          query={query}
          setQuery={setQuery}
          filterKey={filterKey}
          setFilterKey={setFilterKey}
          sortKey={sortKey}
          setSortKey={setSortKey}
        />

        {error && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 text-amber-700 px-4 py-3">
            {error}
          </div>
        )}

        {loading ? (
          <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
            <div className="inline-block h-10 w-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
            <p className="mt-3 text-gray-600">Loading contacts...</p>
          </div>
        ) : null}

        {!loading && visibleContacts.length > 0 ? (
          <ContactTable
            contacts={visibleContacts}
            selectedIds={selectedIds}
            onSelect={toggleSelect}
            onSelectAllVisible={toggleSelectAllVisible}
            onDelete={removeContact}
            onToggleFavorite={toggleFavorite}
          />
        ) : null}

        {showNoContactsYet && (
          <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
            <p className="text-2xl">👋</p>
            <h3 className="text-xl font-semibold text-gray-800 mt-2">No contacts yet</h3>
            <p className="text-gray-600 mt-1">Start building your network by adding your first contact.</p>
          </div>
        )}

        {showNoSearchResults && (
          <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
            <h3 className="text-xl font-semibold text-gray-800">No search results</h3>
            <p className="text-gray-600 mt-1">
              Try a different name, phone number, email, company, or tag.
            </p>
          </div>
        )}

        {showNoFilterResults && (
          <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
            <h3 className="text-xl font-semibold text-gray-800">No contacts in this filter</h3>
            <p className="text-gray-600 mt-1">Switch filters or add more contacts.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ContactListPage;
