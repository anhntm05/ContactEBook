import { useState } from "react";
import Button from "../common/Button";

const ExportContactsMenu = ({
  label = "Export",
  exporting,
  onExportCSV,
  onExportExcel,
  onExportVCard,
}) => {
  const [open, setOpen] = useState(false);

  const handleExport = async (handler) => {
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
        aria-expanded={open}
      >
        {label}
      </Button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
          <button
            type="button"
            onClick={() => handleExport(onExportExcel)}
            className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50"
          >
            Export to Excel (.xlsx)
          </button>
          <button
            type="button"
            onClick={() => handleExport(onExportCSV)}
            className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50"
          >
            Export to CSV (.csv)
          </button>
          <button
            type="button"
            onClick={() => handleExport(onExportVCard)}
            className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50"
          >
            Export to vCard (.vcf)
          </button>
        </div>
      )}
    </div>
  );
};

export default ExportContactsMenu;
