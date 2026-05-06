import { useState } from "react";
import { ChevronDown, ChevronUp, X } from "lucide-react";
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
  const allLocationIds = locations.map((location) => location.id);
  const isAllSelected =
    locations.length > 0 &&
    allLocationIds.every((locationId) =>
      selectedLocationIds.includes(locationId),
    );

  const syncAssignment = (nextIds: number[], enabled = assignment.enabled) => {
    const uniqueIds = Array.from(new Set(nextIds));
    const nextLocationIds = uniqueIds.sort((left, right) => left - right);

    onChange({
      ...assignment,
      enabled,
      locationIds: nextLocationIds,
    });
  };

  const handleToggleModule = () => {
    if (assignment.enabled) {
      syncAssignment([], false);
      setOpen(false);
      return;
    }

    syncAssignment(
      selectedLocationIds.length > 0 ? selectedLocationIds : allLocationIds,
      true,
    );
  };

  const handleToggleLocation = (locationId: number) => {
    const nextIds = selectedLocationIds.includes(locationId)
      ? selectedLocationIds.filter((selectedId) => selectedId !== locationId)
      : [...selectedLocationIds, locationId];

    syncAssignment(nextIds, nextIds.length > 0);
  };

  const handleToggleAllLocations = () => {
    syncAssignment(isAllSelected ? [] : allLocationIds, !isAllSelected);
  };

  const handleRemoveLocation = (locationId: number) => {
    const nextIds = selectedLocationIds.filter(
      (selectedId) => selectedId !== locationId,
    );

    syncAssignment(nextIds, nextIds.length > 0);
  };

  const selectedLocations = assignment.locationIds
    .map(
      (locationId) =>
        ({
          id: locationId,
          name:
            locations.find((location) => location.id === locationId)?.name ??
            `Location ${locationId}`,
        }) satisfies UserLocationOption,
    )
    .sort((left, right) => left.name.localeCompare(right.name));

  return (
    <div
      className={`rounded-[8px] border border-[#D1D5DC] p-[12px] bg-white`}
    >
      <div className="flex justify-between gap-4 border-b border-[#E2E4EA] pb-3">
        <div className="flex gap-2">
          <input
            type="checkbox"
            checked={assignment.enabled}
            onChange={handleToggleModule}
            className="mt-0.5 h-4 w-4 accent-[#5E1B7F] cursor-pointer"
          />
          <p
            className={`text-[16px] font-medium ${
              assignment.enabled ? "text-[#333333]" : "text-[#98A2B3]"
            }`}
          >
            {assignment.moduleName}
          </p>
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setOpen((current) => !current)}
            disabled={!assignment.enabled}
            className="flex min-w-[160px] items-center justify-between rounded-[8px] border border-[#D0D5DD] px-3 py-2 text-[12px] font-medium text-[#333333] disabled:cursor-not-allowed disabled:bg-[#F0F0F0] disabled:text-[#A0A0A0]"
          >
            <span>Select Locations</span>
            {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {open ? (
            <div className="absolute right-0 top-[calc(100%+8px)] z-20 min-w-[160px] rounded-[10px] border border-[#EAECF0] bg-white p-2 shadow-lg">
              <label className="flex cursor-pointer items-center gap-2 rounded-[8px] px-2 py-2 text-[12px] font-medium text-[#344054] hover:bg-[#F9FAFB]">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={handleToggleAllLocations}
                  className="h-3.5 w-3.5 accent-[#5E1B7F]"
                />
                <span className="text-[#333333] font-medium text-[14px] hover:bg-[#F9FAFB]">
                  Select All
                </span>
              </label>
              {locations.map((location) => {
                const isChecked = assignment.locationIds.includes(location.id);

                return (
                  <label
                    key={location.id}
                    className="flex cursor-pointer items-center gap-2 rounded-[8px] px-2 py-2 font-medium text-[14px] text-[#333333] hover:bg-[#F9FAFB]"
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
        {assignment.enabled && selectedLocations.length ? (
          selectedLocations.map((location) => (
            <span
              key={`${assignment.moduleId}-${location.id}`}
              className="inline-flex items-center gap-2 rounded-[6px] bg-[#F2EAF6] px-[6px] py-[4px] text-[12px] font-medium text-[#333333] border-[#D4C4DA]"
            >
              <span>{location.name}</span>
              <button
                type="button"
                onClick={() => handleRemoveLocation(location.id)}
                className="rounded-full text-[#FFFFFF] bg-[#5E1B7F] transition hover:bg-[#781ea5] p-[1px]"
                aria-label={`Remove ${location.name}`}
              >
                <span><X size={10}  strokeWidth={'3px'}/></span>
              </button>
            </span>
          ))
        ) : (
          <span className="text-[12px] text-[#98A2B3]">
            No locations selected
          </span>
        )}
      </div>
    </div>
  );
}
