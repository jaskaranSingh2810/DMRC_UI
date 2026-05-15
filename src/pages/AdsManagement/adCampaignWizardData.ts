import type {
  CampaignMediaState,
  CampaignWizardState,
  MediaOrientation,
  MediaMode,
  ScheduleEntry,
} from "./adCampaignWizardTypes";
import type { Ad } from "@/types";
import {
  createEmptyMediaSlot,
  formatBytesFromSize,
} from "./adCampaignWizardHelpers";

export const WIZARD_STEPS = [
  { id: 1, label: "Upload Media" },
  { id: 2, label: "Location & Screens" },
  { id: 3, label: "Schedule & Target Plays" },
  { id: 4, label: "Submit" },
] as const;

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
    selectedDevices[locationId] = [];
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
              orientation: "LANDSCAPE",
            },
          ],
        }
      : {
          ...DEFAULT_MEDIA_STATE,
          uploadedMedia: [...DEFAULT_MEDIA_STATE.uploadedMedia],
        },
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
    orientation?: MediaOrientation;
  }>,
  buildPreviewUrl: (filePath: string) => string,
) {
  const mappedSlots = media.map((item, index) => ({
    ...(index === 0
      ? createEmptyMediaSlot(
          "primary",
          media.length > 1 ? "Upload Portrait Ad" : "Upload Media",
        )
      : createEmptyMediaSlot("secondary", "Upload Landscape Ad")),
    previewUrl: buildPreviewUrl(item.filePath),
    fileName: item.fileName,
    sizeLabel: formatBytesFromSize(item.fileSize),
    durationSeconds: item.duration,
    status: "uploaded" as const,
    remoteFilePath: item.filePath,
    orientation: item.orientation ?? "UNKNOWN",
  }));

  return media.length > 1
    ? mappedSlots.sort((left, right) => {
        if (left.orientation === right.orientation) {
          return 0;
        }

        if (left.orientation === "PORTRAIT") {
          return -1;
        }

        if (right.orientation === "PORTRAIT") {
          return 1;
        }

        return 0;
      })
    : mappedSlots;
}
