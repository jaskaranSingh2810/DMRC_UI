import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

interface ModalProps {
  title?: string;
  children: ReactNode;
  onClose: () => void;
  className?: string;
}

export default function Modal({
  title,
  children,
  onClose,
  className = "",
}: ModalProps) {
  const contentRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-slate-950/55 px-3 py-3 backdrop-blur-sm sm:items-center sm:px-4 sm:py-8"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={contentRef}
        className={`relative my-auto flex max-h-[calc(100vh-2rem)] w-full flex-col overflow-hidden rounded-[28px] bg-white shadow-2xl ${className}`}
      >
        {title ? (
          <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
            <div>
              <h2 className="text-xl font-bold text-slate-900">{title}</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
              aria-label="Close modal"
            >
              <X size={18} />
            </button>
          </div>
        ) : null}
        {children}
      </div>
    </div>,
    document.body
  );
}
