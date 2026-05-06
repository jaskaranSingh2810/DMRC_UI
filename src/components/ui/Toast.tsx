import { useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Info, TriangleAlert, X } from "lucide-react";
import type { ToastItem } from "@/store/slices/uiSlice";

interface ToastProps {
  toast: ToastItem;
  onClose: (id: string) => void;
}

export default function Toast({ toast, onClose }: ToastProps) {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const startedAt = Date.now();
    const duration = 4000;

    const interval = window.setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const nextProgress = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(nextProgress);
    }, 50);

    const timeout = window.setTimeout(() => {
      onClose(toast.id);
    }, duration);

    return () => {
      window.clearInterval(interval);
      window.clearTimeout(timeout);
    };
  }, [onClose, toast.id]);

  const config = useMemo(() => {
    switch (toast.variant) {
      case "success":
        return {
          icon: <CheckCircle2 size={18} />,
          accent: "from-emerald-500 to-green-600",
          iconBg: "bg-emerald-100 text-emerald-700",
        };
      case "error":
        return {
          icon: <AlertCircle size={18} />,
          accent: "from-rose-500 to-red-600",
          iconBg: "bg-rose-100 text-rose-700",
        };
      case "warning":
        return {
          icon: <TriangleAlert size={18} />,
          accent: "from-amber-500 to-orange-500",
          iconBg: "bg-amber-100 text-amber-700",
        };
      default:
        return {
          icon: <Info size={18} />,
          accent: "from-blue-500 to-indigo-600",
          iconBg: "bg-blue-100 text-blue-700",
        };
    }
  }, [toast.variant]);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_22px_50px_rgba(15,23,42,0.16)]">
      <div className="flex items-start gap-3 p-4">
        <div
          className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${config.iconBg}`}
        >
          {config.icon}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900">{toast.title}</p>
          <p className="mt-1 text-sm text-slate-600">{toast.message}</p>
        </div>

        <button
          type="button"
          onClick={() => onClose(toast.id)}
          className="rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-[#333333]"
          aria-label="Close notification"
        >
          <X size={16} />
        </button>
      </div>

      <div className="h-1 w-full bg-slate-100">
        <div
          className={`h-full bg-gradient-to-r ${config.accent} transition-[width] duration-75`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
