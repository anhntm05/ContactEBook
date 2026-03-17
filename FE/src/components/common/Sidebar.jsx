const Sidebar = ({
  open,
  title,
  items = [],
  activeKey,
  onSelect,
  onClose,
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <button
        type="button"
        aria-label="Close sidebar overlay"
        className="flex-1 bg-slate-950/40 backdrop-blur-[1px]"
        onClick={onClose}
      />

      <aside className="flex h-full w-full max-w-xs flex-col border-l border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Navigation
            </p>
            <h2 className="mt-1 text-lg font-semibold text-slate-900">{title}</h2>
          </div>

          <button
            type="button"
            aria-label="Close sidebar"
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        <nav className="flex-1 space-y-2 px-4 py-4">
          {items.map((item) => {
            const active = item.key === activeKey;

            return (
              <button
                key={item.key}
                type="button"
                onClick={() => onSelect(item.key)}
                className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition ${
                  active
                    ? "border-blue-200 bg-blue-600 text-white shadow-sm"
                    : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                }`}
              >
                <span>
                  <span className="block text-sm font-semibold">{item.label}</span>
                  {item.description ? (
                    <span
                      className={`mt-1 block text-xs ${
                        active ? "text-blue-100" : "text-slate-500"
                      }`}
                    >
                      {item.description}
                    </span>
                  ) : null}
                </span>

                <span
                  className={`rounded-lg px-2 py-1 text-xs font-semibold ${
                    active ? "bg-white/15 text-white" : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {item.badge}
                </span>
              </button>
            );
          })}
        </nav>
      </aside>
    </div>
  );
};

export default Sidebar;
