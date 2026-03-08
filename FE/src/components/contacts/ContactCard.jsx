import { getContactContextLine, getDisplayInitials, getPrimaryEmail, getPrimaryPhone, getVisibleTags } from "../../utils/contactDisplay";
import ContactRowActions from "./ContactRowActions";

const ContactCard = ({ contact, selected, onSelect, onDelete, onToggleFavorite }) => {
  const primaryPhone = getPrimaryPhone(contact);
  const primaryEmail = getPrimaryEmail(contact);
  const contextLine = getContactContextLine(contact);
  const { visibleTags, remainingCount } = getVisibleTags(contact);

  return (
    <article className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onSelect(contact._id || contact.id)}
          className="mt-1 h-4 w-4"
          aria-label={`Select ${contact.displayName}`}
        />

        {contact.photoUrl ? (
          <img src={contact.photoUrl} alt={contact.displayName} className="w-12 h-12 rounded-full object-cover" />
        ) : (
          <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold">
            {getDisplayInitials(contact)}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900 truncate">{contact.displayName}</h3>
            {contact.favorite && <span title="Favorite">⭐</span>}
          </div>
          <p className="text-sm text-gray-600 truncate">{contextLine}</p>
          <p className="text-sm text-gray-700 mt-1 truncate">{primaryPhone || primaryEmail || "No primary contact method"}</p>

          <div className="flex flex-wrap gap-2 mt-2">
            {visibleTags.map((tag) => (
              <span key={tag} className="px-2 py-0.5 rounded-full text-xs bg-blue-50 text-blue-700 border border-blue-100">
                {tag}
              </span>
            ))}
            {remainingCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600">+{remainingCount} more</span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-gray-100">
        <ContactRowActions
          contact={contact}
          onDelete={onDelete}
          onToggleFavorite={onToggleFavorite}
        />
      </div>
    </article>
  );
};

export default ContactCard;
