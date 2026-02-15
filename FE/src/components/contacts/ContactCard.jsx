import { useNavigate } from "react-router-dom";
import { getInitials } from "../../utils/helpers";

const ContactCard = ({ contact }) => {
  const navigate = useNavigate();
  const contactId = contact?._id || contact?.id;

  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow duration-200">
      <div className="flex items-center space-x-4">
        <div className="w-16 h-16 bg-blue-500 text-white rounded-full flex items-center justify-center text-xl font-bold">
          {getInitials(contact.name)}
        </div>

        <div className="flex-1">
          <h3 className="text-xl font-semibold text-gray-800">{contact.name}</h3>

          {contact.email && (
            <p className="text-gray-600 text-sm flex items-center mt-1">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
              {contact.email}
            </p>
          )}

          {contact.phone && (
            <p className="text-gray-600 text-sm flex items-center mt-1">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                />
              </svg>
              {contact.phone}
            </p>
          )}

          {contact.address && (
            <p className="text-gray-600 text-sm flex items-center mt-1">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              {contact.address}
            </p>
          )}
        </div>

        <div className="flex flex-col space-y-2">
          <button
            type="button"
            onClick={() => navigate(`/contacts/${contactId}`)}
            disabled={!contactId}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium disabled:text-gray-400 disabled:cursor-not-allowed"
          >
            View Details
          </button>
        </div>
      </div>
    </div>
  );
};

export default ContactCard;
