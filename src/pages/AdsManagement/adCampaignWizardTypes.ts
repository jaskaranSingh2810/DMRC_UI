import type { Ad } from "@/types";

export type WizardStep = 1 | 2 | 3 | 4;

export interface DeviceOption {
  id: string;
  name: string;
}

export interface LocationOption {
  id: string;
  name: string;
  devices: DeviceOption[];
}

export interface CampaignMediaState {
  name: string;
  mediaFile: File | null;
  previewUrl: string;
  fileName: string;
  durationSeconds: number;
  sizeLabel: string;
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
