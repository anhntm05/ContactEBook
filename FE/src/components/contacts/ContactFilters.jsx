const FILTERS = [
  { key: "all", label: "All Contacts" },
  { key: "favorites", label: "Favorites" },
  { key: "has-phone", label: "Has Phone" },
  { key: "has-email", label: "Has Email" },
  { key: "has-company", label: "Has Company" },
  { key: "recent", label: "Recent" },
];

const SORTS = [
  { key: "name-asc", label: "Name A-Z" },
  { key: "name-desc", label: "Name Z-A" },
];

const ContactFilters = ({ query, setQuery, filterKey, setFilterKey, sortKey, setSortKey }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6 space-y-4">
      <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
        <div className="w-full md:flex-1">
          <label htmlFor="contactSearch" className="sr-only">
            Search contacts
          </label>
          <input
            id="contactSearch"
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name, number, email, company, or tag"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Search contacts"
          />
        </div>

        <div className="flex items-center gap-2 md:shrink-0">
          <label htmlFor="sortKey" className="text-sm text-gray-600 whitespace-nowrap">
            Sort
          </label>
          <select
            id="sortKey"
            value={sortKey}
            onChange={(event) => setSortKey(event.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {SORTS.map((sort) => (
              <option key={sort.key} value={sort.key}>
                {sort.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((filter) => (
          <button
            key={filter.key}
            type="button"
            onClick={() => setFilterKey(filter.key)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              filterKey === filter.key
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-gray-700 border-gray-300 hover:border-blue-400"
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default ContactFilters;
