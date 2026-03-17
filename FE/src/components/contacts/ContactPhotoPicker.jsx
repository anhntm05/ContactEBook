import { getDisplayInitials } from "../../utils/contactDisplay";

const ContactPhotoPicker = ({
  imageUrl,
  displayName,
  fileName,
  error,
  onFileChange,
  onRemove,
  actionsLayout = "stack",
}) => {
  const initials = getDisplayInitials({ displayName });
  const isSplitActions = actionsLayout === "split";

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-col items-start gap-4">
        <div className="flex flex-col items-start gap-4">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={displayName || "Contact"}
              className="w-full h-full rounded-2xl border border-slate-200 object-cover shadow-sm"
            />
          ) : (
            <div className="flex h-72 w-72 items-center justify-center rounded-2xl bg-blue-600 text-2xl font-semibold text-white shadow-sm">
              {initials}
            </div>
          )}

          {/* <div className="space-y-1">
            <p className="text-sm font-semibold text-slate-800">Contact Photo</p>
            <p className="text-sm text-slate-500">
              Upload a JPG, PNG, or other image up to 5MB.
            </p>
            {fileName && <p className="text-xs text-slate-500">{fileName}</p>}
          </div> */}
        </div>

        <div
          className={
            isSplitActions
              ? "grid w-full max-w-[18rem] grid-cols-2 gap-3"
              : "flex flex-col items-start gap-3"
          }
        >
          <label
            className={`inline-flex cursor-pointer items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 ${
              isSplitActions ? (imageUrl ? "w-full" : "col-span-2 w-full") : ""
            }`}
          >
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={onFileChange}
            />
            Upload Image
          </label>

          {imageUrl && (
            <button
              type="button"
              onClick={onRemove}
              className={`inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-100 ${
                isSplitActions ? "w-full" : ""
              }`}
            >
              Remove Photo
            </button>
          )}
        </div>
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </div>
  );
};

export default ContactPhotoPicker;
