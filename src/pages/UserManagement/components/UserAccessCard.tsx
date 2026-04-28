import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, MapPin } from "lucide-react";
import type { UserAccessAssignment, UserLocationOption } from "@/types";

interface UserAccessCardProps {
  assignment: UserAccessAssignment;
  locations: UserLocationOption[];
  onChange: (assignment: UserAccessAssignment) => void;
}

export default function UserAccessCard({
  assignment,
  locations,
  onChange,
}: UserAccessCardProps) {
  const [open, setOpen] = useState(false);
  const selectedLocationIds = assignment.locationIds;
  const allLocationIds = useMemo(
    () => locations.filter((location) => location.id !== "all").map((location) => location.id),
    [locations],
  );

  const syncAssignment = (nextIds: string[]) => {
    const uniqueIds = Array.from(new Set(nextIds));
    const nextLocationIds = uniqueIds.includes("all")
      ? ["all"]
      : uniqueIds.filter((locationId) => locationId !== "all");
    const nextLocationNames = nextLocationIds.map(
      (locationId) =>
        locations.find((location) => location.id === locationId)?.name ?? locationId,
    );

    onChange({
      ...assignment,
      locationIds: nextLocationIds,
      locationNames: nextLocationNames,
    });
  };

  const handleToggleLocation = (locationId: string) => {
    if (locationId === "all") {
      syncAssignment(["all"]);
      return;
    }

    const withoutAll = selectedLocationIds.filter((selectedId) => selectedId !== "all");
    const nextIds = withoutAll.includes(locationId)
      ? withoutAll.filter((selectedId) => selectedId !== locationId)
      : [...withoutAll, locationId];

    if (nextIds.length === allLocationIds.length) {
      syncAssignment(["all"]);
      return;
    }

    syncAssignment(nextIds);
  };

  const selectedLabels =
    assignment.locationIds[0] === "all" ? ["All Locations"] : assignment.locationNames;

  return (
    <div className="rounded-[12px] border border-[#EAECF0] bg-white p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full border border-[#98A2B3] text-[#003975]">
            <MapPin size={12} />
          </span>
          <p className="text-[15px] font-semibold text-[#344054]">
            {assignment.moduleName}
          </p>
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setOpen((current) => !current)}
            className="flex min-w-[160px] items-center justify-between rounded-[8px] border border-[#D0D5DD] px-3 py-2 text-[12px] font-medium text-[#344054]"
          >
            <span>Select Locations</span>
            {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {open ? (
            <div className="absolute right-0 top-[calc(100%+8px)] z-20 min-w-[160px] rounded-[10px] border border-[#EAECF0] bg-white p-2 shadow-lg">
              {locations.map((location) => {
                const isChecked =
                  location.id === "all"
                    ? assignment.locationIds[0] === "all"
                    : assignment.locationIds.includes(location.id);

                return (
                  <label
                    key={location.id}
                    className="flex cursor-pointer items-center gap-2 rounded-[8px] px-2 py-2 text-[12px] text-[#344054] hover:bg-[#F9FAFB]"
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleToggleLocation(location.id)}
                      className="h-3.5 w-3.5 accent-[#5E1B7F]"
                    />
                    <span>{location.name}</span>
                  </label>
                );
              })}
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {selectedLabels.length ? (
          selectedLabels.map((label) => (
            <span
              key={`${assignment.moduleId}-${label}`}
              className="inline-flex items-center rounded-[6px] bg-[#F4ECFA] px-2.5 py-1 text-[11px] font-medium text-[#4F1D75]"
            >
              {label}
            </span>
          ))
        ) : (
          <span className="text-[12px] text-[#98A2B3]">No locations selected</span>
        )}
      </div>
    </div>
  );
}
