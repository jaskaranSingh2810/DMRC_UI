import type { DeviceLocation } from "@/types";

type DeviceFilters = Record<string, string | undefined>;

type DeviceStatFilter =
  | "all"
  | "active"
  | "inactive"
  | "not_working"
  | "unRegistered";

type SortState = {
  key: string;
  direction: "ASC" | "DESC";
};

export interface DeviceSortCriteria {
  field: string;
  direction: "ASC" | "DESC";
}

export interface DeviceListRequest {
  page: number;
  size: number;
  locationIds: number[];
  deviceCode?: string;
  brand?: string;
  model?: string;
  landmark?: string;
  status?: string;
  orientation?: string;
  deviceSize?: number;
  createdBy?: string;
  createdAt?: string;
  sortCriteria?: DeviceSortCriteria[];
}

export function getApiDeviceStatus(status: string): string {
  const normalizedStatus = status.toLowerCase();

  if (normalizedStatus === "active") {
    return "Active";
  }

  if (normalizedStatus === "inactive") {
    return "Inactive";
  }

  if (normalizedStatus === "error" || normalizedStatus === "not working") {
    return "Not Working";
  }

  return status;
}

export function getRequestLocationIds(
  selectedLocationId: string,
  locationList: DeviceLocation[],
): number[] {
  if (selectedLocationId) {
    return [Number(selectedLocationId)];
  }

  return locationList
    .map((location) => Number(location.locationId))
    .filter((locationId) => Number.isFinite(locationId));
}

export function buildDeviceListRequest({
  filters,
  locationList,
  pageNumber,
  pageSize,
  selectedLocationId,
  selectedStatFilter,
  sortState,
}: {
  filters: DeviceFilters;
  locationList: DeviceLocation[];
  pageNumber: number;
  pageSize: number;
  selectedLocationId: string;
  selectedStatFilter: DeviceStatFilter;
  sortState: SortState | null;
}): DeviceListRequest {
  const normalizedCreatedAt = filters.createdAt?.trim();
  const normalizedStatusFilter = filters.status?.trim();
  const normalizedSizeFilter = filters.deviceSize?.trim();
  const locationIds = getRequestLocationIds(selectedLocationId, locationList);

  return {
    page: pageNumber - 1,
    size: pageSize || 10,
    locationIds,
    ...(filters.deviceCode?.trim()
      ? { deviceCode: filters.deviceCode.trim() }
      : {}),
    ...(filters.brand?.trim() ? { brand: filters.brand.trim() } : {}),
    ...(filters.model?.trim() ? { model: filters.model.trim() } : {}),
    ...(filters.landmark?.trim() ? { landmark: filters.landmark.trim() } : {}),
    ...(selectedStatFilter !== "all"
      ? {
          status: getApiDeviceStatus(selectedStatFilter),
        }
      : normalizedStatusFilter
        ? { status: getApiDeviceStatus(normalizedStatusFilter) }
        : {}),
    ...(filters.orientation?.trim()
      ? { orientation: filters.orientation.trim() }
      : {}),
    ...(normalizedSizeFilter && !Number.isNaN(Number(normalizedSizeFilter))
      ? { deviceSize: Number(normalizedSizeFilter) }
      : {}),
    ...(filters.createdBy?.trim()
      ? { createdBy: filters.createdBy.trim() }
      : {}),
    ...(normalizedCreatedAt ? { createdAt: normalizedCreatedAt } : {}),
    ...(sortState
      ? {
          sortCriteria: [
            {
              field: sortState.key === "locations" ? "locationId" : sortState.key,
              direction: sortState.direction,
            },
          ],
        }
      : {}),
  };
}
