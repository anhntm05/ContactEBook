import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../common/Button";
import { exportContactsToCSV, exportContactsToVCard } from "../../utils/contactExport";
import { getPrimaryEmail, getPrimaryPhone } from "../../utils/contactDisplay";

const ContactRowActions = ({ contact, onDelete, onToggleFavorite }) => {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const contactId = contact?._id || contact?.id;
  const primaryPhone = useMemo(() => getPrimaryPhone(contact), [contact]);
  const primaryEmail = useMemo(() => getPrimaryEmail(contact), [contact]);

  const handleCopy = async (value) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // no-op fallback for unsupported clipboard environments
    }
    setMenuOpen(false);
  };

  return (
    <div className="relative flex items-center justify-end gap-2">
      <Button variant="outline" onClick={() => navigate(`/contacts/${contactId}`)} className="px-3 py-1 text-sm">
        View
      </Button>
      <Button variant="outline" onClick={() => navigate(`/contacts/${contactId}`)} className="px-3 py-1 text-sm">
        Edit
      </Button>
      <Button variant="danger" onClick={() => onDelete(contactId)} className="px-3 py-1 text-sm">
        Delete
      </Button>

      <button
        type="button"
        onClick={() => onToggleFavorite(contactId)}
        className={`p-2 rounded-lg border ${
          contact.favorite ? "text-amber-500 border-amber-200 bg-amber-50" : "text-gray-500 border-gray-300"
        }`}
        aria-label={contact.favorite ? "Unfavorite" : "Favorite"}
        title={contact.favorite ? "Unfavorite" : "Favorite"}
      >
        ★
      </button>

      <button
        type="button"
        onClick={() => setMenuOpen((prev) => !prev)}
        className="p-2 rounded-lg border border-gray-300 text-gray-600"
        aria-label="More actions"
      >
        ⋯
      </button>

      {menuOpen && (
        <div className="absolute right-0 top-11 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-30">
          <button
            type="button"
            onClick={() => {
              exportContactsToVCard([contact], "contact");
              setMenuOpen(false);
            }}
            className="w-full px-4 py-2 text-sm text-left hover:bg-gray-50"
          >
            Export as vCard
          </button>
          <button
            type="button"
            onClick={() => {
              exportContactsToCSV([contact], "contact");
              setMenuOpen(false);
            }}
            className="w-full px-4 py-2 text-sm text-left hover:bg-gray-50"
          >
            Export as CSV row
          </button>
          <button
            type="button"
            onClick={() => handleCopy(primaryPhone)}
            disabled={!primaryPhone}
            className="w-full px-4 py-2 text-sm text-left hover:bg-gray-50 disabled:text-gray-400"
          >
            Copy phone number
          </button>
          <button
            type="button"
            onClick={() => handleCopy(primaryEmail)}
            disabled={!primaryEmail}
            className="w-full px-4 py-2 text-sm text-left hover:bg-gray-50 disabled:text-gray-400"
          >
            Copy email
          </button>
          <button
            type="button"
            onClick={() => {
              if (contact.website) window.open(contact.website, "_blank", "noopener,noreferrer");
              setMenuOpen(false);
            }}
            disabled={!contact.website}
            className="w-full px-4 py-2 text-sm text-left hover:bg-gray-50 disabled:text-gray-400"
          >
            Open website
          </button>
        </div>
      )}
    </div>
  );
};

export default ContactRowActions;
