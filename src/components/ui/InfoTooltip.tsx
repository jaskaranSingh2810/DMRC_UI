import { Info } from "lucide-react";
import { useState } from "react";

export default function InfoTooltip({ description }: { description?: string }) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="relative inline-flex items-center">
      <div
        className="cursor-pointer"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <Info className="h-4 w-4 bg-[#F0B100] border border-white overflow-hidden rounded-full text-white" />
      </div>

      {showTooltip && description && (
        <div className="absolute left-6 top-1/2 z-50 w-56 -translate-y-1/2 rounded-md bg-black px-3 py-2 text-[12px] text-white shadow-lg">
          {description}
        </div>
      )}
    </div>
  );
}
