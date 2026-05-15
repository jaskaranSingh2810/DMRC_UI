import type { Ad, DeviceRecord } from "@/types";
import type {
  CampaignMediaState,
  LocationOption,
  ScheduleEntry,
} from "./adCampaignWizardTypes";
import { getDraftMediaType } from "./adCampaignWizardHelpers";

export interface ContentListLocationResponse {
  id: string | number;
  name: string;
}

export interface ContentListItemResponse {
  contentId: string | number;
  contentName: string;
  contentType: string;
  createdBy: string;
  publishedOn?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  status: string;
  isPublish: boolean;
  locations: ContentListLocationResponse[];
}

export interface ContentListSummaryResponse {
  totalContents: number;
  liveContents: number;
  expiredContents: number;
}

export interface ContentListResponse {
  summary: ContentListSummaryResponse;
  content: ContentListItemResponse[];
  currentPage: number;
  totalPages: number;
  totalElements: number;
  pageSize: number;
  first: boolean;
  last: boolean;
}

export interface MappedContentListResponse {
  summary: ContentListSummaryResponse;
  content: Ad[];
  currentPage: number;
  totalPages: number;
  totalElements: number;
  pageSize: number;
  isFirst: boolean;
  isLast: boolean;
}

interface AssignableScreen {
  id: number;
  deviceCode: string;
  brand: string;
  model: string;
  status: string;
  orientation: string;
  landmark?: string | null;
}

interface AssignScreensPayload {
  contentId: string | number;
  terminals: Array<{
    locationId: string | number;
    screens: {
      portraitScreens: AssignableScreen[];
      landscapeScreens: AssignableScreen[];
    };
  }>;
}

interface ForecastPayload {
  contentId: string | number;
  terminals: Array<{
    locationId: string | number;
    targetPlays: number;
    startDate: string;
    endDate: string;
    startTime: string;
    endTime: string;
    selectedScreens: number;
  }>;
}

interface InventoryForecastTerminalResponse {
  locationId: string | number;
  locationName: string;
  selectedScreens: string | number;
  capacityHours: string | number;
  availableHours: string | number;
  requiredHours: string | number;
  utilizationPercentage: string | number;
  pacingIntervalSeconds: string | number;
  allowed: boolean;
}

interface InventoryForecastResponseLike {
  overallUtilization: string | number;
  totalRequiredHours: string | number;
  totalScreens: string | number;
  terminals: InventoryForecastTerminalResponse[];
}

interface SchedulePayload {
  contentId: string | number;
  publish: boolean;
  terminals: Array<{
    locationId: string | number;
    targetPlays: number;
    priority: number;
    startDate: string;
    endDate: string;
    startTime: string;
    endTime: string;
  }>;
}

function toApiTime(value: string): string {
  if (!value) {
    return value;
  }

  return /^\d{2}:\d{2}:\d{2}$/.test(value) ? value : `${value}:00`;
}

function toNumber(value: string | number | null | undefined): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    if (value.trim().toLowerCase() === "nan") {
      return 0;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function normalizeOrientation(value: string): "PORTRAIT" | "LANDSCAPE" | "UNKNOWN" {
  const normalized = value.toUpperCase();

  if (normalized === "PORTRAIT") {
    return "PORTRAIT";
  }

  if (normalized === "LANDSCAPE") {
    return "LANDSCAPE";
  }

  return "UNKNOWN";
}

function toAssignableScreen(device: DeviceRecord): AssignableScreen {
  return {
    id: Number(device.id),
    deviceCode: device.deviceCode,
    brand: device.brand,
    model: device.model,
    status: device.status,
    orientation: device.orientation,
    landmark: device.landmark ?? null,
  };
}

export function buildUploadRequest(
  campaign: CampaignMediaState,
  isDraft: boolean,
) {
  return {
    contentName: campaign.name.trim(),
    contentType: "VIDEO",
    mediaType: getDraftMediaType(campaign),
    isDraft,
  };
}

export function mapContentListResponse(
  response: ContentListResponse,
): MappedContentListResponse {
  const contentMap = new Map<string, Ad>();

  response.content.forEach((item) => {
    const key = String(item.contentId);
    const nextLocations = item.locations.map((location) => ({
      locationId: location.id,
      locationName: location.name,
    }));
    const existing = contentMap.get(key);

    if (!existing) {
      contentMap.set(key, {
        contentId: item.contentId,
        contentName: item.contentName,
        createdBy: item.createdBy,
        publishedOn: item.publishedOn ?? null,
        startDate: item.startDate ?? null,
        endDate: item.endDate ?? null,
        startTime: item.startTime ?? null,
        endTime: item.endTime ?? null,
        status: item.status,
        locations: nextLocations,
      });
      return;
    }

    const locationMap = new Map(
      (existing.locations ?? []).map((location) => [
        String(location.locationId),
        location,
      ]),
    );

    nextLocations.forEach((location) => {
      locationMap.set(String(location.locationId), location);
    });

    existing.locations = Array.from(locationMap.values());
  });

  return {
    summary: response.summary,
    content: Array.from(contentMap.values()),
    currentPage: response.currentPage,
    totalPages: response.totalPages,
    totalElements: response.totalElements,
    pageSize: response.pageSize,
    isFirst: response.first,
    isLast: response.last,
  };
}

export function buildAssignScreensPayload(
  contentId: string | number,
  locations: LocationOption[],
  selectedDevices: Record<string, string[]>,
): AssignScreensPayload {
  return {
    contentId,
    terminals: locations
      .filter((location) => selectedDevices[location.id]?.length)
      .map((location) => {
        const selectedIds = new Set(selectedDevices[location.id]);
        const selectedLocationDevices = location.devices.filter((device) =>
          selectedIds.has(String(device.id)),
        );

        return {
          locationId: location.apiLocationId ?? location.id,
          screens: {
            portraitScreens: selectedLocationDevices
              .filter(
                (device) =>
                  normalizeOrientation(device.orientation) === "PORTRAIT",
              )
              .map(toAssignableScreen),
            landscapeScreens: selectedLocationDevices
              .filter(
                (device) =>
                  normalizeOrientation(device.orientation) === "LANDSCAPE",
              )
              .map(toAssignableScreen),
          },
        };
      }),
  };
}

export function buildForecastPayload(
  contentId: string | number,
  locations: LocationOption[],
  schedule: Record<string, ScheduleEntry>,
  selectedDevices: Record<string, string[]>,
): ForecastPayload {
  return {
    contentId,
    terminals: locations
      .filter((location) => schedule[location.id])
      .map((location) => ({
        locationId: location.apiLocationId ?? location.id,
        targetPlays: schedule[location.id].targetPlays,
        startDate: schedule[location.id].startDate,
        endDate: schedule[location.id].endDate,
        startTime: toApiTime(schedule[location.id].startTime),
        endTime: toApiTime(schedule[location.id].endTime),
        selectedScreens: selectedDevices[location.id]?.length ?? 0,
      })),
  };
}

export function buildSchedulePayload(
  contentId: string | number,
  locations: LocationOption[],
  schedule: Record<string, ScheduleEntry>,
  publish: boolean,
): SchedulePayload {
  return {
    contentId,
    publish,
    terminals: locations
      .filter((location) => schedule[location.id])
      .map((location) => ({
        locationId: location.apiLocationId ?? location.id,
        targetPlays: schedule[location.id].targetPlays,
        priority: schedule[location.id].priority,
        startDate: schedule[location.id].startDate,
        endDate: schedule[location.id].endDate,
        startTime: toApiTime(schedule[location.id].startTime),
        endTime: toApiTime(schedule[location.id].endTime),
      })),
  };
}

export function normalizeInventoryForecastResponse(
  response: InventoryForecastResponseLike,
) {
  return {
    overallUtilization: toNumber(response.overallUtilization),
    totalRequiredHours: toNumber(response.totalRequiredHours),
    totalScreens: toNumber(response.totalScreens),
    terminals: response.terminals.map((terminal) => ({
      locationId: terminal.locationId,
      locationName: terminal.locationName,
      selectedScreens: toNumber(terminal.selectedScreens),
      capacityHours: toNumber(terminal.capacityHours),
      availableHours: toNumber(terminal.availableHours),
      requiredHours: toNumber(terminal.requiredHours),
      utilizationPercentage: toNumber(terminal.utilizationPercentage),
      pacingIntervalSeconds: toNumber(terminal.pacingIntervalSeconds),
      allowed: terminal.allowed,
    })),
  };
}

export function safeFixed(
  value: string | number | null | undefined,
  digits: number,
): string {
  return toNumber(value).toFixed(digits);
}
