import { getDisplayInitials } from "../../utils/contactDisplay";

const ContactPhotoPicker = ({
  imageUrl,
  displayName,
  fileName,
  error,
  onFileChange,
  onRemove,
}) => {
  const initials = getDisplayInitials({ displayName });

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={displayName || "Contact"}
              className="h-24 w-24 rounded-2xl border border-slate-200 object-cover shadow-sm"
            />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-blue-600 text-2xl font-semibold text-white shadow-sm">
              {initials}
            </div>
          )}

          <div className="space-y-1">
            <p className="text-sm font-semibold text-slate-800">Contact Photo</p>
            <p className="text-sm text-slate-500">
              Upload a JPG, PNG, or other image up to 5MB.
            </p>
            {fileName && <p className="text-xs text-slate-500">{fileName}</p>}
          </div>
        </div>

        <div className="flex flex-wrap gap-3 justify-start sm:justify-end">
          <label className="inline-flex cursor-pointer items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700">
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
              className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-100"
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
