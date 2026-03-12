import { useEffect, useRef, useState } from "react";
import Button from "../common/Button";

const ExportContactsMenu = ({
  label = "Export",
  exporting,
  disabled = false,
  onExportCSV,
  onExportExcel,
  onExportVCard,
  buttonClassName = "",
}) => {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!open) return;

    const handleOutsideClick = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("touchstart", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("touchstart", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  const handleExport = async (handler) => {
    if (typeof handler !== "function") return;
    setOpen(false);
    await handler();
  };

  const handleBlur = (event) => {
    if (menuRef.current && !menuRef.current.contains(event.relatedTarget)) {
      setOpen(false);
    }
  };

  const exportButtonClass = open
    ? "border-blue-600 bg-blue-600 text-white hover:bg-blue-700 hover:text-white"
    : "hover:bg-white-100 hover:border-blue-700 hover:text-blue-700";

  return (
    <div ref={menuRef} className="relative">
      <Button
        type="button"
        variant="outline"
        onClick={() => setOpen((prev) => !prev)}
        onBlur={handleBlur}
        loading={exporting}
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`${exportButtonClass} ${buttonClassName}`.trim()}
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
