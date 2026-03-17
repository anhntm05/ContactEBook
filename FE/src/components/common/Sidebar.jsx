import { useEffect, useState } from "react";

const TRANSITION_MS = 500;

const Sidebar = ({
  open,
  title,
  items = [],
  activeKey,
  onSelect,
  onClose,
}) => {
  const [rendered, setRendered] = useState(open);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let frameId;
    let timeoutId;

    if (open) {
      setRendered(true);
      frameId = window.requestAnimationFrame(() => {
        setVisible(true);
      });
    } else {
      setVisible(false);
      timeoutId = window.setTimeout(() => {
        setRendered(false);
      }, TRANSITION_MS);
    }

    return () => {
      if (frameId) window.cancelAnimationFrame(frameId);
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [open]);

  if (!rendered) return null;

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Close sidebar overlay"
        className={`absolute inset-0 bg-slate-950/40 backdrop-blur-[1px] transition-opacity duration-500 ${
          visible ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
      />

      <aside
        className={`absolute left-0 top-0 flex h-full w-full max-w-xs flex-col border-r border-slate-200 bg-white shadow-2xl transition-transform duration-500 ${
          visible ? "translate-x-0" : "-translate-x-full"
        }`}
      >
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
                    ? "border-blue-200 bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-sm"
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
