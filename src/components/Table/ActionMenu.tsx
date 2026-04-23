import { useState, useRef, useEffect } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import { createPortal } from "react-dom";
import { MoreVertical } from "lucide-react";

interface Action {
  label: string;
  onClick: () => void;
}

export default function ActionMenu({ actions }: { actions: Action[] }) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const handleOpen = (e: ReactMouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();

    if (!buttonRef.current) return;

    const rect = buttonRef.current.getBoundingClientRect();

    setPosition({
      top: rect.bottom + window.scrollY + 6,
      left: rect.right + window.scrollX - 180,
    });

    setOpen((prev) => !prev);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        !buttonRef.current?.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="ml-[40%]">
      <button ref={buttonRef} onClick={handleOpen}>
        <MoreVertical size={18} color="#003975"/>
      </button>

      {open &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: "absolute",
              top: position.top,
              left: position.left,
            }}
            className="z-[9999] w-44 rounded-md border bg-white shadow-xl animate-in fade-in zoom-in-95"
          >
            {actions.map((a, i) => (
              <button
                key={i}
                onClick={() => {
                  a.onClick();
                  setOpen(false);
                }}
                className="block w-full px-4 py-2 text-left text-sm hover:bg-gray-100 cursor-pointer"
              >
                {a.label}
              </button>
            ))}
          </div>,
          document.body
        )}
    </div>
  );
}
