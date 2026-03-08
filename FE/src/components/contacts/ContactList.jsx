import { getInitials } from "../../utils/helpers";

const pageOptions = [10, 25, 50];

const getId = (contact) => contact?._id || contact?.id;

const getPhones = (contact) => {
  if (Array.isArray(contact.phoneNumbers) && contact.phoneNumbers.length) {
    return contact.phoneNumbers
      .map((item) => ({ number: item?.number || item, label: item?.label || "Mobile" }))
      .filter((item) => item.number);
  }
  if (Array.isArray(contact.phones) && contact.phones.length) {
    return contact.phones
      .map((item) => ({ number: item?.number || item, label: item?.label || "Mobile" }))
      .filter((item) => item.number);
  }
  if (contact.phone) {
    return [{ number: contact.phone, label: "Primary" }];
  }
  return [];
};

const getEmails = (contact) => {
  if (Array.isArray(contact.emails) && contact.emails.length) {
    return contact.emails.filter((item) => item?.email);
  }
  if (contact.email) return [{ email: contact.email, label: "Primary" }];
  return [];
};

const getTags = (contact) => {
  const tags = Array.isArray(contact.tags) ? contact.tags : [];
  return contact.favorite && !tags.includes("Favorite") ? ["Favorite", ...tags] : tags;
};

const buildPageNumbers = (page, pageCount) => {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, i) => i + 1);
  if (page <= 3) return [1, 2, 3, 4, "...", pageCount];
  if (page >= pageCount - 2) return [1, "...", pageCount - 3, pageCount - 2, pageCount - 1, pageCount];
  return [1, "...", page - 1, page, page + 1, "...", pageCount];
};

const ContactList = ({
  loading,
  contacts,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onView,
  onEdit,
  onDelete,
  page,
  total,
  perPage,
  onPageChange,
  onPerPageChange,
}) => {
  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        <p className="mt-4 text-gray-600">Loading contacts...</p>
      </div>
    );
  }

  if (!contacts.length) {
    return (
      <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
        <p className="text-xl font-semibold text-gray-700">No contacts found</p>
        <p className="mt-2 text-gray-500">Try adjusting your filters or add a new contact.</p>
      </div>
    );
  }

  const pageCount = Math.max(1, Math.ceil(total / perPage));
  const start = (page - 1) * perPage + 1;
  const end = Math.min(page * perPage, total);
  const allSelected = contacts.length > 0 && contacts.every((contact) => selectedIds.has(getId(contact)));
  const pageNumbers = buildPageNumbers(page, pageCount);

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto bg-white rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left">
                <input type="checkbox" checked={allSelected} onChange={(e) => onToggleSelectAll(e.target.checked)} />
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Contact</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Company</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Phones</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Email</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Tags</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {contacts.map((contact) => {
              const id = getId(contact);
              const phones = getPhones(contact);
              const emails = getEmails(contact);
              const tags = getTags(contact);
              const primaryPhone = phones[0]?.number || "Not provided";
              const morePhoneCount = Math.max(0, phones.length - 1);

              return (
                <tr key={id} className="hover:bg-gray-50">
                  <td className="px-4 py-4 align-top">
                    <input type="checkbox" checked={selectedIds.has(id)} onChange={() => onToggleSelect(id)} />
                  </td>
                  <td className="px-4 py-4 align-top">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center font-semibold">
                        {getInitials(contact.name || `${contact.firstName || ""} ${contact.lastName || ""}`)}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800">{contact.name || `${contact.firstName || ""} ${contact.lastName || ""}`.trim() || "Unnamed"}</p>
                        <p className="text-sm text-gray-500">{contact.jobTitle || "No title"}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 align-top text-sm text-gray-700">{contact.company || "-"}</td>
                  <td className="px-4 py-4 align-top">
                    <p className="text-sm text-gray-700">Primary: {primaryPhone}</p>
                    {morePhoneCount > 0 && <span className="inline-block mt-1 text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">+{morePhoneCount} more</span>}
                  </td>
                  <td className="px-4 py-4 align-top text-sm text-gray-700">{emails[0]?.email || "-"}</td>
                  <td className="px-4 py-4 align-top">
                    <div className="flex flex-wrap gap-1">
                      {tags.length ? tags.slice(0, 3).map((tag) => (
                        <span key={`${id}-${tag}`} className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">{tag}</span>
                      )) : <span className="text-sm text-gray-400">-</span>}
                    </div>
                  </td>
                  <td className="px-4 py-4 align-top text-right">
                    <div className="inline-flex items-center gap-2">
                      <button type="button" onClick={() => onView(contact)} className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 text-sm hover:bg-gray-100">View</button>
                      <button type="button" onClick={() => onEdit(contact)} className="px-3 py-1.5 rounded-lg border border-blue-200 text-blue-700 text-sm hover:bg-blue-50">Edit</button>
                      <button type="button" onClick={() => onDelete(contact)} className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-sm hover:bg-red-700">Delete</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <p className="text-sm text-gray-600">Showing {start}-{end} of {total} contacts</p>
        <div className="flex items-center gap-3">
          <select value={perPage} onChange={(e) => onPerPageChange(Number(e.target.value))} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            {pageOptions.map((option) => <option key={option} value={option}>{option} / page</option>)}
          </select>
          <div className="flex items-center gap-1">
            <button type="button" disabled={page === 1} onClick={() => onPageChange(page - 1)} className="px-3 py-2 rounded-lg border border-gray-300 text-sm disabled:opacity-50">Previous</button>
            {pageNumbers.map((item, idx) => (
              <button
                key={`${item}-${idx}`}
                type="button"
                disabled={item === "..."}
                onClick={() => item !== "..." && onPageChange(item)}
                className={`px-3 py-2 rounded-lg text-sm border ${item === page ? "bg-blue-600 text-white border-blue-600" : "border-gray-300 text-gray-700"} ${item === "..." ? "cursor-default" : "hover:bg-gray-100"}`}
              >
                {item}
              </button>
            ))}
            <button type="button" disabled={page === pageCount} onClick={() => onPageChange(page + 1)} className="px-3 py-2 rounded-lg border border-gray-300 text-sm disabled:opacity-50">Next</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactList;
