import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const REDIRECT_DELAY_MS = 5000;

const AuthFailed = () => {
  const navigate = useNavigate();
  const [timeLeftMs, setTimeLeftMs] = useState(REDIRECT_DELAY_MS);

  useEffect(() => {
    const start = Date.now();
    const timer = setInterval(() => {
      const elapsed = Date.now() - start;
      const nextLeft = Math.max(0, REDIRECT_DELAY_MS - elapsed);
      setTimeLeftMs(nextLeft);

      if (nextLeft === 0) {
        clearInterval(timer);
        navigate("/login", {
          replace: true,
          state: {
            expiredMessage: "Your session has expired. Please login again.",
          },
        });
      }
    }, 100);

    return () => clearInterval(timer);
  }, [navigate]);

  const progressPercent = useMemo(
    () => (timeLeftMs / REDIRECT_DELAY_MS) * 100,
    [timeLeftMs]
  );
  const secondsLeft = Math.max(0, Math.ceil(timeLeftMs / 1000));

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white shadow-sm p-8">
        <h1 className="text-3xl font-bold text-slate-800">
          Authentication Failed
        </h1>
        <p className="mt-3 text-slate-600">
          Your login session expired, so we could not authorize this request.
          You will be redirected to login in {secondsLeft} second
          {secondsLeft === 1 ? "" : "s"}.
        </p>

        <div className="mt-6">
          <div className="h-3 w-full rounded-full bg-slate-200 overflow-hidden">
            <div
              className="h-full bg-red-500 transition-[width] duration-100 ease-linear"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthFailed;
