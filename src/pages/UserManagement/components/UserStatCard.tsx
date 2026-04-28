interface UserStatCardProps {
  label: string;
  value: string;
  icon: string;
  accent: "violet" | "green" | "slate";
  isActive: boolean;
  onClick: () => void;
}

export default function UserStatCard({
  label,
  value,
  icon,
  accent,
  isActive,
  onClick,
}: UserStatCardProps) {
  const accentStyles = {
    violet: "border-[#A74DCD] bg-[#FAF5FF]",
    green: "border-[#D3F2D7] bg-[#F3FFF4]",
    slate: "border-[#E4E7EC] bg-white",
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
        <p className="text-[15px] font-medium text-[#344054]">{label}</p>
        <p className="mt-2 text-[30px] font-semibold leading-none text-[#101828]">
          {value}
        </p>
      </div>
      <img src={icon} alt={label} className="h-12 w-12" />
    </button>
  );
}
