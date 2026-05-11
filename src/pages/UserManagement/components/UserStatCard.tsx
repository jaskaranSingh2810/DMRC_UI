import InfoTooltip from "@/components/ui/InfoTooltip";
import { Info } from "lucide-react";

interface UserStatCardProps {
  label: string;
  value: string;
  icon: string;
  accent: "violet" | "green" | "slate";
  isActive: boolean;
  onClick: () => void;
  description?: string;
}

export default function UserStatCard({
  label,
  value,
  icon,
  accent,
  isActive,
  onClick,
  description,
}: UserStatCardProps) {
  const accentStyles = {
    violet: "border-violet-100",
    green: "border-emerald-100",
    slate: "border-slate-200",
  } as const;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={isActive}
      className={`flex items-center justify-between rounded-[10px] border px-5 py-4 text-left shadow-sm transition ${
        isActive
          ? "border-[#5E1B7F] ring-2 ring-[#5E1B7F1F]"
          : accentStyles[accent]
      }`}
    >
      <div>
        <div className="flex gap-1 items-center">
          <p className="text-[15px] font-medium text-[#344054]">{label}</p>
          {description && (
            <InfoTooltip description={description} />
          )}
        </div>
        <p className="mt-2 text-[30px] font-semibold leading-none text-[#101828]">
          {value}
        </p>
      </div>
      <img src={icon} alt={label} className="h-12 w-12" />
    </button>
  );
}
