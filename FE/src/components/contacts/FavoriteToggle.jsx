const FavoriteToggle = ({ checked, onChange, disabled = false }) => (
  <label
    className={`group flex items-center justify-between gap-4 rounded-xl border px-4 py-3 transition ${
      checked
        ? "border-purple-500 bg-purple-500 shadow-sm"
        : "border-slate-300 bg-white"
    } ${
      disabled
        ? "cursor-not-allowed opacity-70"
        : "cursor-pointer hover:border-purple-300 hover:bg-purple-50"
    }`}
  >
    <div className="space-y-1">
      <div
        className={`text-sm font-semibold ${
          checked
            ? "text-white"
            : `text-slate-800 ${disabled ? "" : "group-hover:text-purple-700"}`
        }`}
      >
        Favorite
      </div>
      <div
        className={`text-xs ${
          checked
            ? "text-purple-100"
            : `text-slate-500 ${disabled ? "" : "group-hover:text-purple-600"}`
        }`}
      >
        Highlight this contact for faster access.
      </div>
    </div>
    <div className="relative shrink-0">
      <input
        type="checkbox"
        className="peer sr-only"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <div
        className={`flex h-12 w-12 items-center justify-center rounded-2xl border-2 transition ${
          checked
            ? "border-purple-200 bg-purple-200 text-purple-600"
            : "border-slate-300 bg-slate-100 text-transparent group-hover:border-purple-300 group-hover:bg-purple-50 group-hover:text-purple-600"
        } peer-focus-visible:ring-2 peer-focus-visible:ring-purple-300 peer-focus-visible:ring-offset-2`}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-6 w-6"
          aria-hidden="true"
        >
          <path d="M5 13l4 4L19 7" />
        </svg>
      </div>
    </div>
  </label>
);

export default FavoriteToggle;
