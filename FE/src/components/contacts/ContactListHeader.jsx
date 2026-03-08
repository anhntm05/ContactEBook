import { useNavigate } from "react-router-dom";
import Button from "../common/Button";
import ExportContactsMenu from "./ExportContactsMenu";

const ContactListHeader = ({
  totalCount,
  exporting,
  onExportCSV,
  onExportExcel,
  onExportVCard,
  hasSelected,
  selectedCount,
  onBulkDelete,
}) => {
  const navigate = useNavigate();

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Contacts</h1>
          <p className="text-gray-600 mt-1">Manage and organize your contacts</p>
          <p className="text-sm text-gray-500 mt-2">
            {totalCount} {totalCount === 1 ? "contact" : "contacts"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 justify-start lg:justify-end">
          <ExportContactsMenu
            exporting={exporting}
            onExportCSV={onExportCSV}
            onExportExcel={onExportExcel}
            onExportVCard={onExportVCard}
            label={hasSelected ? `Export Selected (${selectedCount})` : "Export Contacts"}
          />

          {hasSelected && (
            <Button variant="danger" onClick={onBulkDelete} className="whitespace-nowrap">
              Delete Selected
            </Button>
          )}

          <Button variant="primary" onClick={() => navigate("/contacts/new")} className="whitespace-nowrap">
            Add Contact
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ContactListHeader;
