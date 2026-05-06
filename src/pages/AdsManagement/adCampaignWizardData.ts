import type {
  CampaignMediaState,
  CampaignWizardState,
  MediaMode,
  LocationOption,
  ScheduleEntry,
} from "./adCampaignWizardTypes";
import type { Ad } from "@/types";
import {
  createEmptyMediaSlot,
  formatBytesFromSize,
} from "./adCampaignWizardHelpers";

function createDevices(prefix: string, deviceNames: string[]) {
  return deviceNames.map((name, index) => ({
    id: `${prefix}-${index + 1}`,
    name,
  }));
}

export const WIZARD_STEPS = [
  { id: 1, label: "Upload Media" },
  { id: 2, label: "Location & Screens" },
  { id: 3, label: "Schedule & Target Plays" },
  { id: 4, label: "Submit" },
] as const;

export const LOCATION_OPTIONS: LocationOption[] = [
  {
    id: "terminal-1",
    name: "Terminal 1",
    devices: createDevices("t1", [
      "SC1022_LG_70 inch",
      "SC1022_Sony_Vision_55 inch",
      "SC1022_TCL_Smart_75 inch",
      "SC1022_Panasonim_60 inch",
      "SC1022_Philips_65 inch",
      "SC1022_Sharp_Crystal_50 inch",
      "SC1022_Vizio_Ultra_80 inch",
      "SC1022_Hisense_4K_65 inch",
      "SC1022_Samsung_55 inch",
      "SC1022_Roku_Express_65 inch",
      "SC1022_Sanyo_70 inch",
      "SC1022_BenQ_Pro_75 inch",
    ]),
  },
  {
    id: "terminal-2",
    name: "Terminal 2",
    devices: createDevices("t2", [
      "SC2041_LG_65 inch",
      "SC2041_Sony_55 inch",
      "SC2041_TCL_75 inch",
      "SC2041_Panasonic_60 inch",
      "SC2041_Sharp_50 inch",
      "SC2041_Vizio_80 inch",
      "SC2041_Hisense_65 inch",
      "SC2041_Samsung_55 inch",
      "SC2041_Roku_65 inch",
      "SC2041_Sanyo_70 inch",
      "SC2041_BenQ_75 inch",
      "SC2041_Acer_55 inch",
      "SC2041_Optoma_75 inch",
      "SC2041_ViewSonic_65 inch",
      "SC2041_Philips_50 inch",
    ]),
  },
  {
    id: "terminal-3",
    name: "Terminal 3",
    devices: createDevices("t3", [
      "SC3099_LG_70 inch",
      "SC3099_Sony_55 inch",
      "SC3099_TCL_75 inch",
      "SC3099_Panasonic_60 inch",
      "SC3099_Philips_65 inch",
      "SC3099_Sharp_50 inch",
      "SC3099_Vizio_80 inch",
      "SC3099_Hisense_65 inch",
      "SC3099_Samsung_55 inch",
      "SC3099_Roku_65 inch",
      "SC3099_Sanyo_70 inch",
      "SC3099_BenQ_75 inch",
      "SC3099_Acer_55 inch",
      "SC3099_Optoma_75 inch",
      "SC3099_ViewSonic_65 inch",
      "SC3099_Thomson_50 inch",
      "SC3099_Skyworth_70 inch",
      "SC3099_Xiaomi_65 inch",
      "SC3099_BPL_50 inch",
      "SC3099_Mi_55 inch",
    ]),
  },
];

export const DEFAULT_TIME_SLOTS = [
  "07:00 - 10:00",
  "10:00 - 13:00",
  "13:00 - 17:00",
];

export const DEFAULT_MEDIA_STATE: CampaignMediaState = {
  contentId: null,
  name: "",
  mediaMode: "AUTO_FIT",
  uploadedMedia: [createEmptyMediaSlot("primary")],
};

export function createDefaultSchedule(): ScheduleEntry {
  return {
    targetPlays: 100,
    priority: 99,
    startDate: "2026-04-17",
    endDate: "2026-05-28",
    startTime: "07:00",
    endTime: "17:00",
    timeSlots: DEFAULT_TIME_SLOTS,
  };
}

function mapAdLocationsToSelection(ad: Ad | null | undefined) {
  const selectedDevices: Record<string, string[]> = {};

  ad?.locations?.forEach((location) => {
    const locationId = String(location.locationId ?? "");
    const option = LOCATION_OPTIONS.find((item) => item.id === locationId);

    if (!option) {
      return;
    }

    const preferredDeviceCount = Math.min(option.devices.length, 2);
    selectedDevices[locationId] = option.devices
      .slice(0, preferredDeviceCount)
      .map((device) => device.id);
  });

  return selectedDevices;
}

export function createInitialWizardState(
  initialAd?: Ad | null,
): CampaignWizardState {
  const selectedDevices = mapAdLocationsToSelection(initialAd);

  const schedule = Object.keys(selectedDevices).reduce<
    Record<string, ScheduleEntry>
  >((accumulator, locationId) => {
    accumulator[locationId] = {
      ...createDefaultSchedule(),
      startDate: initialAd?.startDate ?? "2026-04-17",
      endDate: initialAd?.endDate ?? "2026-05-28",
      startTime: initialAd?.startTime ?? "07:00",
      endTime: initialAd?.endTime ?? "17:00",
    };
    return accumulator;
  }, {});

  return {
    step: 1,
    isEditMode: Boolean(initialAd),
    campaign: initialAd
      ? {
          contentId: initialAd.contentId,
          name: initialAd.contentName,
          mediaMode: "AUTO_FIT",
          uploadedMedia: [
            {
              ...createEmptyMediaSlot("primary"),
              fileName: "Ad01_kingfisher.mp4",
              sizeLabel: "2.4 mb",
              durationSeconds: 30,
              status: "uploaded",
            },
          ],
        }
      : DEFAULT_MEDIA_STATE,
    locations: {
      selectedDevices,
    },
    schedule,
    published: false,
  };
}

export function createMediaSlots(mode: MediaMode) {
  if (mode === "CUSTOM") {
    return [
      createEmptyMediaSlot("primary"),
      createEmptyMediaSlot("secondary", "Upload Landscape Ad"),
    ];
  }

  return [createEmptyMediaSlot("primary", "Upload Media")];
}

export function mapDraftMediaToSlots(
  media: Array<{
    fileName: string;
    filePath: string;
    fileSize: number;
    duration: number;
  }>,
  buildPreviewUrl: (filePath: string) => string,
) {
  return media.map((item, index) => ({
    ...(index === 0
      ? createEmptyMediaSlot("primary", media.length > 1 ? "Upload Portrait Ad" : "Upload Media")
      : createEmptyMediaSlot("secondary", "Upload Landscape Ad")),
    previewUrl: buildPreviewUrl(item.filePath),
    fileName: item.fileName,
    sizeLabel: formatBytesFromSize(item.fileSize),
    durationSeconds: item.duration,
    status: "uploaded" as const,
    remoteFilePath: item.filePath,
  }));
}
