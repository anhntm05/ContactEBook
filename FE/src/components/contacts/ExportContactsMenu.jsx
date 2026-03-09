import { useState } from "react";
import Button from "../common/Button";

const ExportContactsMenu = ({
  label = "Export",
  exporting,
  disabled = false,
  onExportCSV,
  onExportExcel,
  onExportVCard,
}) => {
  const [open, setOpen] = useState(false);

  const handleExport = async (handler) => {
    if (typeof handler !== "function") return;
    setOpen(false);
    await handler();
  };

  return (
    <div className="relative">
      <Button
        type="button"
        variant="outline"
        onClick={() => setOpen((prev) => !prev)}
        loading={exporting}
        disabled={disabled}
        aria-expanded={open}
      >
        {label}
      </Button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
          {typeof onExportExcel === "function" && (
            <button
              type="button"
              onClick={() => handleExport(onExportExcel)}
              className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50"
              title="Export selected contacts to an Excel file (.xlsx) for spreadsheet editing."
            >
              Export to Excel (.xlsx)
            </button>
          )}

          {typeof onExportCSV === "function" && (
            <button
              type="button"
              onClick={() => handleExport(onExportCSV)}
              className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50"
              title="Export selected contacts to a CSV file (.csv) for sharing or importing."
            >
              Export to CSV (.csv)
            </button>
          )}

          {typeof onExportVCard === "function" && (
            <button
              type="button"
              onClick={() => handleExport(onExportVCard)}
              className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50"
              title="Export selected contacts to vCard (.vcf), which can be dragged directly into Apple Contacts."
            >
              Export to Apple Contacts (.vcf)
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ExportContactsMenu;
