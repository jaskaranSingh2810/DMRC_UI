import type {
  CampaignMediaSlotState,
  CampaignMediaState,
  MediaMode,
} from "./adCampaignWizardTypes";

export function createEmptyMediaSlot(
  id: string,
  label: string = "Upload Portrait Ad",
): CampaignMediaSlotState {
  return {
    id,
    label,
    file: null,
    previewUrl: "",
    fileName: "",
    sizeLabel: "",
    durationSeconds: 0,
    status: "empty",
    remoteFilePath: null,
  };
}

export function formatBytes(file: File): string {
  return formatBytesFromSize(file.size);
}

export function formatBytesFromSize(size: number): string {
  const mb = size / (1024 * 1024);
  return `${mb.toFixed(1)} mb`;
}

export function getUploadedMedia(
  campaign: CampaignMediaState,
): CampaignMediaSlotState[] {
  return campaign.uploadedMedia.filter((media) => Boolean(media.fileName));
}

export function getDraftMediaType(campaign: CampaignMediaState): MediaMode {
  return getUploadedMedia(campaign).length > 1 ? "CUSTOM" : "AUTO_FIT";
}

export function isStepOneReady(campaign: CampaignMediaState): boolean {
  return Boolean(campaign.name.trim() && getUploadedMedia(campaign).length > 0);
}

export function getStepOneValidationMessage(
  campaign: CampaignMediaState,
): string | null {
  if (!campaign.name.trim()) {
    return "Enter a campaign name to continue.";
  }

  if (getUploadedMedia(campaign).length === 0) {
    return "Upload at least one media file to continue.";
  }

  return null;
}

export function buildDraftUploadFormData(campaign: CampaignMediaState): FormData {
  const formData = new FormData();
  const uploadedMedia = getUploadedMedia(campaign);
  const request = {
    contentName: campaign.name.trim(),
    contentType: "VIDEO",
    mediaType: getDraftMediaType(campaign),
    isDraft: true,
  };

  formData.append(
    "request",
    new Blob([JSON.stringify(request)], { type: "application/json" }),
  );

  uploadedMedia.forEach((media) => {
    if (media.file) {
      formData.append("files", media.file);
    }
  });

  return formData;
}

export function buildMediaPreviewUrl(filePath: string): string {
  const contentBaseUrl =
    import.meta.env.VITE_CONTENT_API_URL ?? "http://localhost:8085";

  return `${contentBaseUrl}${filePath.replace(/\\/g, "/")}`;
}
