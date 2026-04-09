import { useEffect, useRef, useState } from "react";

const EXIT_TRANSITION_MS = 300;

const variantClasses = {
  success: {
    container:
      "border-green-200 bg-white text-green-800",
    badge: "bg-green-600 text-white",
    progress: "bg-green-500",
    label: "Success",
  },
  error: {
    container:
      "border-red-200 bg-white text-red-800",
    badge: "bg-red-600 text-white",
    progress: "bg-red-500",
    label: "Error",
  },
};

const ToastMessage = ({
  message,
  type = "success",
  duration = 5000,
  onClose,
}) => {
  const [rendered, setRendered] = useState(Boolean(message));
  const [visible, setVisible] = useState(false);
  const [progressActive, setProgressActive] = useState(false);
  const closeHandlerRef = useRef(onClose);

  useEffect(() => {
    closeHandlerRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    let enterFrame;
    let progressFrame;
    let hideTimeout;
    let dismissTimeout;

    if (message) {
      setRendered(true);
      setProgressActive(false);

      enterFrame = window.requestAnimationFrame(() => {
        setVisible(true);
        progressFrame = window.requestAnimationFrame(() => {
          setProgressActive(true);
        });
      });

      dismissTimeout = window.setTimeout(() => {
        closeHandlerRef.current?.();
      }, duration);
    } else {
      setVisible(false);
      setProgressActive(false);
      hideTimeout = window.setTimeout(() => {
        setRendered(false);
      }, EXIT_TRANSITION_MS);
    }

    return () => {
      if (enterFrame) window.cancelAnimationFrame(enterFrame);
      if (progressFrame) window.cancelAnimationFrame(progressFrame);
      if (hideTimeout) window.clearTimeout(hideTimeout);
      if (dismissTimeout) window.clearTimeout(dismissTimeout);
    };
  }, [duration, message]);

  if (!rendered) return null;

  const variant = variantClasses[type] || variantClasses.success;

  return (
    <div className="pointer-events-none fixed right-4 top-24 z-[70] w-full max-w-sm">
      <div
        className={`pointer-events-auto overflow-hidden rounded-2xl border shadow-2xl transition-all duration-300 ${
          variant.container
        } ${
          visible
            ? "translate-y-0 opacity-100"
            : "-translate-y-3 opacity-0"
        }`}
        role="status"
        aria-live="polite"
      >
        <div className="flex items-start gap-3 px-4 py-4">
          <span
            className={`rounded-lg px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${variant.badge}`}
          >
            {variant.label}
          </span>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">{message}</p>
          </div>

          <button
            type="button"
            onClick={() => closeHandlerRef.current?.()}
            className="rounded-lg px-2 py-1 text-xs font-semibold text-current/70 transition hover:bg-white/40 hover:text-current"
          >
            Close
          </button>
        </div>

        <div className="h-1 bg-black/5">
          <div
            className={`h-full origin-left transition-transform ${variant.progress} ${
              progressActive ? "scale-x-0" : "scale-x-100"
            }`}
            style={{ transitionDuration: `${duration}ms` }}
          />
        </div>
      </div>
    </div>
  );
};

export default ToastMessage;
