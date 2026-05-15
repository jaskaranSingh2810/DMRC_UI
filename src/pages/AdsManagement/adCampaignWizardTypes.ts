import type { DeviceRecord } from "@/types";
import type { Ad } from "@/types";

export type WizardStep = 1 | 2 | 3 | 4;
export type MediaMode = "AUTO_FIT" | "CUSTOM";
export type UploadStatus = "empty" | "uploaded";
export type MediaOrientation = "PORTRAIT" | "LANDSCAPE" | "UNKNOWN";

export interface DeviceOption extends DeviceRecord {
  id: string | number;
  name: string;
}

export interface LocationOption {
  id: string;
  name: string;
  apiLocationId?: string | number;
  devices: DeviceOption[];
}

export interface CampaignMediaSlotState {
  id: string;
  label: string;
  file: File | null;
  previewUrl: string;
  fileName: string;
  sizeLabel: string;
  durationSeconds: number;
  status: UploadStatus;
  remoteFilePath: string | null;
  orientation: MediaOrientation;
}

export interface CampaignMediaState {
  contentId: string | number | null;
  name: string;
  mediaMode: MediaMode;
  uploadedMedia: CampaignMediaSlotState[];
}

export interface LocationSelectionState {
  selectedDevices: Record<string, string[]>;
}

export interface ScheduleEntry {
  targetPlays: number;
  priority: number;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  timeSlots: string[];
}

export interface CampaignWizardState {
  step: WizardStep;
  isEditMode: boolean;
  campaign: CampaignMediaState;
  locations: LocationSelectionState;
  schedule: Record<string, ScheduleEntry>;
  published: boolean;
}

export interface AdCampaignWizardProps {
  initialAd?: Ad | null;
}

export interface DraftMediaResponse {
  fileName: string;
  filePath: string;
  fileSize: number;
  duration: number;
  orientation?: MediaOrientation;
}

export interface DraftContentResponse {
  contentId: string | number;
  contentName: string;
  contentType: string;
  isDraft: boolean;
  isPublish: boolean;
  status: string;
  createdBy: string | null;
  publishedOn: string | null;
  media: DraftMediaResponse[];
}
