import { getContactContextLine, getDisplayInitials, getPrimaryEmail, getPrimaryPhone, getVisibleTags } from "../../utils/contactDisplay";
import ContactCard from "./ContactCard";
import ContactRowActions from "./ContactRowActions";

const ContactTable = ({ contacts, selectedIds, onSelect, onSelectAllVisible, onDelete, onToggleFavorite }) => {
  const allVisibleSelected =
    contacts.length > 0 && contacts.every((contact) => selectedIds.has(contact._id || contact.id));

  return (
    <>
      <div className="hidden md:block bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-4 py-3 text-left w-10">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={onSelectAllVisible}
                  aria-label="Select all visible contacts"
                />
              </th>
              <th className="px-4 py-3 text-left">Contact</th>
              <th className="px-4 py-3 text-left">Context</th>
              <th className="px-4 py-3 text-left">Primary Contact</th>
              <th className="px-4 py-3 text-left">Tags</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {contacts.map((contact) => {
              const contactId = contact._id || contact.id;
              const primaryPhone = getPrimaryPhone(contact);
              const primaryEmail = getPrimaryEmail(contact);
              const contextLine = getContactContextLine(contact);
              const { visibleTags, remainingCount } = getVisibleTags(contact);

              return (
                <tr key={contactId} className="border-t border-gray-100 hover:bg-blue-50/40 align-top">
                  <td className="px-4 py-4">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(contactId)}
                      onChange={() => onSelect(contactId)}
                      aria-label={`Select ${contact.displayName}`}
                    />
                  </td>

                  <td className="px-4 py-4 max-w-xs">
                    <div className="flex items-center gap-3">
                      {contact.photoUrl ? (
                        <img
                          src={contact.photoUrl}
                          alt={contact.displayName}
                          className="w-11 h-11 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold">
                          {getDisplayInitials(contact)}
                        </div>
                      )}

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-gray-900 truncate">{contact.displayName}</p>
                          {contact.favorite && <span title="Favorite">⭐</span>}
                        </div>
                        <p className="text-xs text-gray-500 truncate">{contact.company || "No company"}</p>
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-4 text-gray-700 max-w-xs truncate" title={contextLine}>
                    {contextLine}
                  </td>

                  <td className="px-4 py-4 text-gray-700 max-w-xs">
                    <p className="truncate">{primaryPhone || "No phone"}</p>
                    <p className="truncate text-gray-500">{primaryEmail || "No email"}</p>
                  </td>

                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-1.5 max-w-[180px]">
                      {visibleTags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex px-2 py-0.5 rounded-full text-xs bg-blue-50 text-blue-700 border border-blue-100"
                        >
                          {tag}
                        </span>
                      ))}
                      {remainingCount > 0 && (
                        <span className="inline-flex px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600">
                          +{remainingCount} more
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="px-4 py-4">
                    <ContactRowActions
                      contact={contact}
                      onDelete={onDelete}
                      onToggleFavorite={onToggleFavorite}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="md:hidden space-y-3">
        <div className="bg-white rounded-xl border border-gray-200 px-4 py-3">
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={allVisibleSelected} onChange={onSelectAllVisible} />
            Select all visible
          </label>
        </div>

        {contacts.map((contact) => (
          <ContactCard
            key={contact._id || contact.id}
            contact={contact}
            selected={selectedIds.has(contact._id || contact.id)}
            onSelect={onSelect}
            onDelete={onDelete}
            onToggleFavorite={onToggleFavorite}
          />
        ))}
      </div>
    </>
  );
};

export default ContactTable;
